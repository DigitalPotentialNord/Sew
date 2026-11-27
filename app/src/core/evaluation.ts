/**
 * Strenge Bewertungs- & Prüf-Engine (Qualitäts- und Nähbarkeitsbewertung).
 *
 * Reine, deterministische Berechnung ohne React/DOM/Zeit/Zufall.
 * Prinzipien:
 * - Hartes Gate: Jeder Konstruktionsfehler (`errorCount > 0`) sperrt die
 *   Freigabe (`verdict = 'blocked'`, `grade = 'F'`, `score <= 49`).
 * - Keine Schönfärberei: Warnungen, knappe Restmaße, hohe Bund-Auslastung,
 *   Verschnitt oder einseitige Überlastung führen zu nachvollziehbaren
 *   Punktabzügen in fünf gewichteten Kategorien.
 * - Transparenz: Jede Bewertung liefert eine 10-Punkte-Prüfliste mit exakten
 *   Millimeter- und Prozentwerten.
 */
import { clamp } from './geometry';
import { moduleDef } from './modules';
import { LIMITS, PRACTICE } from './practice';
import type { Finding, LocalizedKey, Side } from './types';

export type EvaluationVerdict = 'approved' | 'caution' | 'blocked';
export type EvaluationGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export type CheckStatus = 'pass' | 'warn' | 'fail';
export type CategoryId = 'geometry' | 'sewability' | 'layout' | 'material' | 'readiness';

export interface EvaluationCategory {
  readonly id: CategoryId;
  readonly labelKey: LocalizedKey;
  readonly weight: number;
  readonly score: number;
  readonly status: CheckStatus;
}

export interface EvaluationCheck {
  readonly id: string;
  readonly category: CategoryId;
  readonly status: CheckStatus;
  readonly labelKey: LocalizedKey;
  readonly detailKey: LocalizedKey;
  readonly values: Readonly<Record<string, number | string>>;
}

export interface EvaluationDiagnostics {
  readonly estimatedBulkMm: number;
  readonly requiredSpineMm: number;
  readonly spineWidthMm: number;
  readonly spineUtilizationPct: number;
  readonly leftAreaPct: number;
  readonly rightAreaPct: number;
  readonly leftCount: number;
  readonly rightCount: number;
  readonly maxRowFillPct: number;
  readonly heightFillPct: number;
  readonly fabricUtilizationPct: number;
  readonly blockingCount: number;
  readonly warningCount: number;
  readonly passedChecks: number;
  readonly totalChecks: number;
}

export interface ConstructionEvaluation {
  readonly score: number;
  readonly grade: EvaluationGrade;
  readonly verdict: EvaluationVerdict;
  readonly categories: readonly EvaluationCategory[];
  readonly checklist: readonly EvaluationCheck[];
  readonly diagnostics: EvaluationDiagnostics;
}

/** Minimale Eingabe aus der Konstruktions-Pipeline (zyklenfrei). */
export interface EvaluationInput {
  readonly base: {
    readonly widthMm: number;
    readonly heightMm: number;
    readonly spineWidthMm: number;
    readonly cornerRadiusMm: number;
    readonly hasLining: boolean;
  };
  readonly settings: {
    readonly seamAllowanceMm: number;
    readonly fabricWidthMm: number;
  };
  readonly modules: readonly {
    readonly id: string;
    readonly typeId: Parameters<typeof moduleDef>[0];
    readonly side: Side;
    readonly params: Readonly<Record<string, number | string | boolean>>;
    readonly rect: { readonly w: number; readonly h: number };
    readonly overflows: boolean;
  }[];
  readonly rows: readonly {
    readonly height: number;
    readonly fillLeftPct: number;
    readonly fillRightPct: number;
    readonly fillPct: number;
    readonly overflowLeftMm: number;
    readonly overflowRightMm: number;
  }[];
  readonly totalRowHeightMm: number;
  readonly availHeightMm: number;
  readonly availWidthMm: number;
  readonly fabricPlan: {
    readonly fabricWidthMm: number;
    readonly usedHeightMm: number;
    readonly pieces: readonly { readonly rect: { readonly w: number; readonly h: number } }[];
  };
  readonly findings: readonly Finding[];
  readonly exactMaterialsRatio: number;
  readonly operationCount: number;
}

/**
 * Berechnet die physikalisch benötigte Bund-Weite (mm) aus den dicksten
 * Modulen auf der linken und rechten Innenfläche + Panel-Lagen im Falz.
 */
export function computeSpineBulk(
  modules: readonly {
    readonly typeId: Parameters<typeof moduleDef>[0];
    readonly side: Side;
    readonly params: Readonly<Record<string, number | string | boolean>>;
  }[],
  hasLining: boolean,
): { readonly leftBulkMm: number; readonly rightBulkMm: number; readonly estimatedBulkMm: number; readonly requiredSpineMm: number } {
  let leftBulk = 0;
  let rightBulk = 0;
  for (const m of modules) {
    const bulk = moduleDef(m.typeId).bulkMm(m.params);
    if (m.side === 'left') leftBulk = Math.max(leftBulk, bulk);
    else rightBulk = Math.max(rightBulk, bulk);
  }
  const baseLayers = hasLining ? PRACTICE.panelFoldBulkMm : Math.max(2, PRACTICE.panelFoldBulkMm - 2);
  const estimatedBulkMm = modules.length === 0 ? baseLayers : leftBulk + rightBulk + baseLayers;
  // Strenge Mindest-Bundweite: muss mindestens das Innen-Volumen fassen (gedeckelt auf Schema-Max)
  const requiredSpineMm = modules.length === 0 ? 0 : Math.min(LIMITS.spineWidthMm.max, estimatedBulkMm);
  return { leftBulkMm: leftBulk, rightBulkMm: rightBulk, estimatedBulkMm, requiredSpineMm };
}

const GEOMETRY_RULES = new Set([
  'V-G-01',
  'V-G-05',
  'V-G-13',
  'V-G-14',
  'V-G-15',
  'V-G-17',
]);

const SEWABILITY_RULES = new Set([
  'V-G-10',
  'V-G-11',
  'V-G-16',
  'V-G-18',
  'V-G-19',
]);

const MATERIAL_RULES = new Set(['V-G-12', 'V-G-20']);

function statusFromScore(score: number, hasError: boolean, hasWarn: boolean): CheckStatus {
  if (hasError || score < 50) return 'fail';
  if (hasWarn || score < 78) return 'warn';
  return 'pass';
}

function gradeFromScore(score: number, verdict: EvaluationVerdict, warnCount: number): EvaluationGrade {
  if (verdict === 'blocked') return 'F';
  if (verdict === 'caution') {
    if (warnCount === 1 && score >= 80) return 'B';
    if (score >= 68) return 'C';
    return score >= 52 ? 'D' : 'F';
  }
  if (score >= 93) return 'A+';
  if (score >= 86) return 'A';
  if (score >= 76) return 'B';
  if (score >= 64) return 'C';
  return score >= 50 ? 'D' : 'F';
}

export function evaluateConstruction(input: EvaluationInput): ConstructionEvaluation {
  const { base, modules, rows, totalRowHeightMm, availHeightMm, fabricPlan, findings } = input;
  const errors = findings.filter((f) => f.severity === 'error');
  const warns = findings.filter((f) => f.severity === 'warn');

  const hasRule = (id: string, sev?: Finding['severity']): boolean =>
    findings.some((f) => f.ruleId === id && (sev === undefined || f.severity === sev));

  // ── 1. Physikalische Kennzahlen ──────────────────────────────────────────
  const bulk = computeSpineBulk(modules, base.hasLining);
  const spineUtilizationPct =
    base.spineWidthMm > 0
      ? Math.round((bulk.estimatedBulkMm / base.spineWidthMm) * 100)
      : modules.length > 0
        ? 100
        : 0;

  let leftArea = 0;
  let rightArea = 0;
  let leftCount = 0;
  let rightCount = 0;
  for (const m of modules) {
    const area = Math.max(0, m.rect.w * m.rect.h);
    if (m.side === 'left') {
      leftArea += area;
      leftCount += 1;
    } else {
      rightArea += area;
      rightCount += 1;
    }
  }
  const totalModArea = leftArea + rightArea;
  const leftAreaPct = totalModArea > 0 ? Math.round((leftArea / totalModArea) * 100) : 0;
  const rightAreaPct = totalModArea > 0 ? 100 - leftAreaPct : 0;

  const maxRowFillPct = rows.reduce((mx, r) => Math.max(mx, r.fillLeftPct, r.fillRightPct), 0);
  const heightFillPct = availHeightMm > 0 ? Math.round((totalRowHeightMm / availHeightMm) * 100) : 100;

  const cutAreaSum = fabricPlan.pieces.reduce((a, p) => a + p.rect.w * p.rect.h, 0);
  const fabricRectArea = fabricPlan.fabricWidthMm * fabricPlan.usedHeightMm;
  const fabricUtilizationPct = fabricRectArea > 0 ? Math.min(100, Math.round((cutAreaSum / fabricRectArea) * 100)) : 0;

  // ── 2. Kategorie-Scores (streng & gewichtet) ────────────────────────────
  // 2.1 Maßhaltigkeit & Geometrie (30 %)
  const geoErrors = errors.filter((f) => GEOMETRY_RULES.has(f.ruleId) || f.ruleId.startsWith('V-M'));
  const geoWarns = warns.filter((f) => GEOMETRY_RULES.has(f.ruleId));
  let geoScore = 100 - geoErrors.length * 36 - geoWarns.length * 14;
  // Feine Abzüge bei sehr knapper Reserve (< 4 mm vertikal oder > 96 % Breite)
  const heightReserve = availHeightMm - totalRowHeightMm;
  if (heightReserve >= 0 && heightReserve < 4 && modules.length > 0) geoScore -= 6;
  else if (heightReserve >= 4 && heightReserve < 8 && modules.length > 0) geoScore -= 2;
  if (maxRowFillPct > 96 && maxRowFillPct <= 100) geoScore -= Math.round((maxRowFillPct - 96) * 2);
  geoScore = Math.round(clamp(geoScore, 0, 100));

  // 2.2 Nähbarkeit & Konstruktion (25 %)
  const sewErrors = errors.filter(
    (f) => SEWABILITY_RULES.has(f.ruleId) || ['V-M02-01', 'V-M03-01', 'V-M04-01', 'V-M04-05', 'V-M07-01', 'V-M07-05', 'V-M08-01', 'V-M08-04'].includes(f.ruleId),
  );
  const sewWarns = warns.filter((f) => SEWABILITY_RULES.has(f.ruleId) || f.ruleId.startsWith('V-M'));
  let sewScore = 100 - sewErrors.length * 38 - sewWarns.length * 14;
  if (spineUtilizationPct > 100) sewScore -= 20;
  else if (spineUtilizationPct > 85) sewScore -= Math.round((spineUtilizationPct - 85) * 0.6);
  if (!base.hasLining && modules.length > 0) sewScore -= 6;
  sewScore = Math.round(clamp(sewScore, 0, 100));

  // 2.3 Raumaufteilung & Balance (20 %)
  let layoutScore = 100;
  const overflowCount = rows.filter((r) => r.overflowLeftMm > 0 || r.overflowRightMm > 0).length;
  layoutScore -= overflowCount * 35;
  if (hasRule('V-G-08')) layoutScore -= 16;
  if (hasRule('V-G-04')) layoutScore -= 8;
  if (modules.length === 0) {
    layoutScore = 40;
  } else {
    // Leichter Abzug, wenn eine Fläche > 90 % trägt und >= 4 Module im Projekt sind (Balance-Potenzial)
    if (modules.length >= 4 && (leftCount === 0 || rightCount === 0)) {
      layoutScore -= 6;
    }
    if (heightFillPct < 30) layoutScore -= 8;
    else if (heightFillPct > 100) layoutScore -= 30;
  }
  layoutScore = Math.round(clamp(layoutScore, 0, 100));

  // 2.4 Material- & Zuschnitteffizienz (15 %)
  const matErrors = errors.filter((f) => MATERIAL_RULES.has(f.ruleId));
  const matWarns = warns.filter((f) => MATERIAL_RULES.has(f.ruleId));
  let matScore = 100 - matErrors.length * 35 - matWarns.length * 18;
  // Verschnitt-Bewertung (realistische Meterware-Ausnutzung 45–85 %)
  if (modules.length > 0) {
    if (fabricUtilizationPct < 35) matScore -= 16;
    else if (fabricUtilizationPct < 50) matScore -= 8;
    else if (fabricUtilizationPct < 62) matScore -= 3;
  }
  matScore = Math.round(clamp(matScore, 0, 100));

  // 2.5 Fertigungsreife & Vollständigkeit (10 %)
  let readyScore = 100;
  if (modules.length === 0) readyScore -= 60;
  if (hasRule('V-G-10')) readyScore -= 15;
  if (errors.length > 0) readyScore -= Math.min(80, errors.length * 40);
  if (warns.length > 0) readyScore -= Math.min(30, warns.length * 10);
  if (input.operationCount === 0) readyScore -= 30;
  readyScore = Math.round(clamp(readyScore, 0, 100));

  const categories: readonly EvaluationCategory[] = [
    {
      id: 'geometry',
      labelKey: 'eval.cat.geometry',
      weight: 0.3,
      score: geoScore,
      status: statusFromScore(geoScore, geoErrors.length > 0, geoWarns.length > 0),
    },
    {
      id: 'sewability',
      labelKey: 'eval.cat.sewability',
      weight: 0.25,
      score: sewScore,
      status: statusFromScore(sewScore, sewErrors.length > 0, sewWarns.length > 0),
    },
    {
      id: 'layout',
      labelKey: 'eval.cat.layout',
      weight: 0.2,
      score: layoutScore,
      status: statusFromScore(layoutScore, overflowCount > 0 || heightFillPct > 100, hasRule('V-G-08')),
    },
    {
      id: 'material',
      labelKey: 'eval.cat.material',
      weight: 0.15,
      score: matScore,
      status: statusFromScore(matScore, matErrors.length > 0, matWarns.length > 0),
    },
    {
      id: 'readiness',
      labelKey: 'eval.cat.readiness',
      weight: 0.1,
      score: readyScore,
      status: statusFromScore(readyScore, errors.length > 0, warns.length > 0 || modules.length === 0),
    },
  ];

  // ── 3. Gesamtscore + Hartes Gate ─────────────────────────────────────────
  const weighted = categories.reduce((sum, cat) => sum + cat.score * cat.weight, 0);
  const verdict: EvaluationVerdict = errors.length > 0 ? 'blocked' : warns.length > 0 ? 'caution' : 'approved';
  let totalScore = Math.round(weighted);
  if (verdict === 'blocked') {
    // Hartes Gate: ein fehlerhaftes Projekt erreicht NIE ≥ 50 Punkte.
    totalScore = Math.min(49, Math.max(0, totalScore - errors.length * 10));
  } else if (verdict === 'caution') {
    totalScore = Math.min(89, totalScore);
  }
  const grade = gradeFromScore(totalScore, verdict, warns.length);

  // ── 4. 10-Punkte-Ingenieur-Prüfliste ─────────────────────────────────────
  const widthErr = hasRule('V-G-01', 'error') || modules.some((m) => m.overflows);
  const widthWarn = hasRule('V-G-08');
  const heightErr = hasRule('V-G-13', 'error') || hasRule('V-G-14', 'error');
  const heightWarn = hasRule('V-G-17');
  const cornerErr = hasRule('V-G-05', 'error') || hasRule('V-G-15', 'error');
  const spineErr = hasRule('V-G-16', 'error');
  const spineWarn = hasRule('V-G-16', 'warn');
  const grainErr = hasRule('V-G-11', 'error');
  const grainWarn = hasRule('V-G-11', 'warn');
  const closureErr = hasRule('V-M07-05', 'error') || hasRule('V-M08-04', 'error') || hasRule('V-M07-01', 'error') || hasRule('V-M08-01', 'error');
  const closureWarn = hasRule('V-G-10') || hasRule('V-G-19');
  const turnErr = hasRule('V-G-18', 'error') || errors.some((f) => f.ruleId.startsWith('V-M') && !['V-M07-05', 'V-M08-04'].includes(f.ruleId));
  const turnWarn = hasRule('V-G-18', 'warn') || warns.some((f) => f.ruleId.startsWith('V-M'));
  const fabricWarn = hasRule('V-G-12') || hasRule('V-G-20');

  const checklist: readonly EvaluationCheck[] = [
    {
      id: 'chk-width',
      category: 'geometry',
      status: widthErr ? 'fail' : widthWarn ? 'warn' : 'pass',
      labelKey: 'eval.check.width',
      detailKey: widthErr ? 'eval.check.width.fail' : 'eval.check.width.ok',
      values: { pct: maxRowFillPct },
    },
    {
      id: 'chk-height',
      category: 'geometry',
      status: heightErr ? 'fail' : heightWarn ? 'warn' : 'pass',
      labelKey: 'eval.check.height',
      detailKey: heightErr ? 'eval.check.height.fail' : 'eval.check.height.ok',
      values: { ist: Math.round(totalRowHeightMm), max: Math.round(availHeightMm) },
    },
    {
      id: 'chk-corner',
      category: 'geometry',
      status: cornerErr ? 'fail' : 'pass',
      labelKey: 'eval.check.corner',
      detailKey: cornerErr ? 'eval.check.corner.fail' : 'eval.check.corner.ok',
      values: { r: Math.round(base.cornerRadiusMm) },
    },
    {
      id: 'chk-spine',
      category: 'sewability',
      status: spineErr ? 'fail' : spineWarn ? 'warn' : 'pass',
      labelKey: 'eval.check.spine',
      detailKey: spineErr || spineWarn ? 'eval.check.spine.fail' : 'eval.check.spine.ok',
      values: { volumen: bulk.estimatedBulkMm, bund: Math.round(base.spineWidthMm) },
    },
    {
      id: 'chk-grain',
      category: 'sewability',
      status: grainErr ? 'fail' : grainWarn ? 'warn' : 'pass',
      labelKey: 'eval.check.grain',
      detailKey: grainErr || grainWarn ? 'eval.check.grain.fail' : 'eval.check.grain.ok',
      values: { count: findings.filter((f) => f.ruleId === 'V-G-11').length },
    },
    {
      id: 'chk-closure',
      category: 'sewability',
      status: closureErr ? 'fail' : closureWarn ? 'warn' : 'pass',
      labelKey: 'eval.check.closure',
      detailKey: closureErr ? 'eval.check.closure.fail' : closureWarn ? 'eval.check.closure.warn' : 'eval.check.closure.ok',
      values: { count: modules.filter((m) => m.typeId === 'M07' || m.typeId === 'M08').length },
    },
    {
      id: 'chk-sewability',
      category: 'sewability',
      status: turnErr ? 'fail' : turnWarn ? 'warn' : 'pass',
      labelKey: 'eval.check.sewability',
      detailKey: turnErr ? 'eval.check.sewability.fail' : 'eval.check.sewability.ok',
      values: { nz: Math.round(input.settings.seamAllowanceMm) },
    },
    {
      id: 'chk-balance',
      category: 'layout',
      status:
        widthErr || heightErr
          ? 'fail'
          : modules.length === 0 || (modules.length >= 4 && Math.abs(leftAreaPct - rightAreaPct) >= 80)
            ? 'warn'
            : 'pass',
      labelKey: 'eval.check.balance',
      detailKey:
        modules.length >= 4 && Math.abs(leftAreaPct - rightAreaPct) >= 80
          ? 'eval.check.balance.warn'
          : 'eval.check.balance.ok',
      values: { links: leftAreaPct, rechts: rightAreaPct },
    },
    {
      id: 'chk-fabric',
      category: 'material',
      status: fabricWarn ? 'warn' : 'pass',
      labelKey: 'eval.check.fabric',
      detailKey: fabricWarn ? 'eval.check.fabric.warn' : 'eval.check.fabric.ok',
      values: { pct: fabricUtilizationPct, breite: Math.round(input.settings.fabricWidthMm) },
    },
    {
      id: 'chk-export',
      category: 'readiness',
      status: errors.length > 0 ? 'fail' : modules.length === 0 || warns.length > 0 ? 'warn' : 'pass',
      labelKey: 'eval.check.export',
      detailKey: errors.length > 0 ? 'eval.check.export.fail' : 'eval.check.export.ok',
      values: { fehler: errors.length, hinweise: warns.length },
    },
  ];

  const passedChecks = checklist.filter((c) => c.status === 'pass').length;

  return {
    score: totalScore,
    grade,
    verdict,
    categories,
    checklist,
    diagnostics: {
      estimatedBulkMm: bulk.estimatedBulkMm,
      requiredSpineMm: bulk.requiredSpineMm,
      spineWidthMm: Math.round(base.spineWidthMm),
      spineUtilizationPct,
      leftAreaPct,
      rightAreaPct,
      leftCount,
      rightCount,
      maxRowFillPct,
      heightFillPct,
      fabricUtilizationPct,
      blockingCount: errors.length,
      warningCount: warns.length,
      passedChecks,
      totalChecks: checklist.length,
    },
  };
}
