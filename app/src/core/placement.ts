/**
 * Strenge Verschiebe-, Platzierungs- & Layout-Optimierungs-Engine.
 *
 * Reine, deterministische Berechnung ohne React/DOM/Zeit/Zufall.
 * Jede Verschiebung, Einfügung und Größenänderung wird gegen die ECHTE
 * `construct()`-Pipeline geprüft — keine Näherungen, keine Abweichung zwischen
 * Drag-Vorschau und Ergebnis.
 */
import { clamp, mm, rect, type Rect } from './geometry';
import { construct, occupied, type Construction, type Instance, type Project } from './construction';
import { findingKey, relocateInModules } from './fixes';
import { moduleDef } from './modules';
import { LIMITS, PRACTICE } from './practice';
import type { Finding, ModuleTypeId, Params, Side } from './types';

export interface PlacementTarget {
  readonly side: Side;
  readonly rowId: string;
  /** 0-basierter Index INNERHALB von `(rowId, side)`. */
  readonly index: number;
}

export type PlacementVerdict = 'optimal' | 'tight' | 'warn' | 'blocked';

export interface ShiftedModule {
  readonly id: string;
  readonly from: Rect;
  readonly to: Rect;
}

export interface SnapGuide {
  readonly axis: 'x' | 'y';
  readonly pos: number;
  readonly kind: 'spine' | 'margin' | 'row' | 'module';
}

export interface PlacementEvaluation {
  readonly verdict: PlacementVerdict;
  /** Im strengen Modus zulässig? `false` bei `verdict === 'blocked'`. */
  readonly allowed: boolean;
  readonly score: number;
  readonly scoreDelta: number;
  readonly errorsBefore: number;
  readonly errorsAfter: number;
  readonly newErrors: readonly Finding[];
  readonly resolvedErrors: readonly Finding[];
  readonly newWarns: readonly Finding[];
  readonly targetFillPct: number;
  readonly targetHeightFillPct: number;
  readonly freeWidthMm: number;
  readonly freeHeightMm: number;
  readonly projectedRect: Rect | null;
  readonly shiftedModules: readonly ShiftedModule[];
  readonly reasonKey: string;
  readonly reasonValues: Readonly<Record<string, number | string>>;
  readonly candidateProject: Project;
  readonly candidateConstruction: Construction;
}

export interface ResolvedDropTarget {
  readonly target: PlacementTarget;
  readonly spineZone: boolean;
  readonly insertionLine: { readonly x: number; readonly y: number; readonly h: number };
  readonly guides: readonly SnapGuide[];
  readonly rowName: string;
}

export interface PlacementCandidate {
  readonly target: PlacementTarget;
  readonly evaluation: PlacementEvaluation;
}

export interface LayoutOptimizationResult {
  readonly changed: boolean;
  readonly project: Project;
  readonly beforeScore: number;
  readonly afterScore: number;
  readonly errorsBefore: number;
  readonly errorsAfter: number;
  readonly movedCount: number;
}

// ─── Atomare Projekt-Transformationen (rein, 1 Undo-Schritt) ─────────────────

/**
 * Verschiebt ein Modul atomar an `(target.side, target.rowId, target.index)`.
 * - Respektiert `locked` (gesperrte Module werden nie bewegt).
 * - Gibt dieselbe Projektreferenz zurück, wenn der Zug ein No-op ist.
 */
export function relocateModule(p: Project, moduleId: string, target: PlacementTarget): Project {
  const inst = p.modules.find((m) => m.id === moduleId);
  if (!inst || inst.locked) return p;
  if (!p.rows.some((r) => r.id === target.rowId)) return p;

  const sameSlot = p.modules.filter((m) => m.rowId === target.rowId && m.side === target.side);
  const currentIdx = sameSlot.findIndex((m) => m.id === moduleId);
  const maxIdx = currentIdx >= 0 ? sameSlot.length - 1 : sameSlot.length;
  const clampedIdx = Math.round(clamp(target.index, 0, Math.max(0, maxIdx)));

  if (inst.rowId === target.rowId && inst.side === target.side && currentIdx === clampedIdx) {
    return p;
  }

  const nextModules = relocateInModules(p.modules, moduleId, target.side, target.rowId, clampedIdx);
  return { ...p, modules: nextModules };
}

/**
 * Fügt eine neue Modul-Instanz atomar an `(target.side, target.rowId, target.index)` ein.
 * Liegt `index` am Ende des Ziel-Slots, wird die Instanz an das Array-Ende angehängt
 * (konsistente Reihenfolge und `modules.at(-1)` ist stets das neue Modul).
 */
export function insertModuleAt(p: Project, inst: Instance, target: PlacementTarget): Project {
  const rowId = p.rows.some((r) => r.id === target.rowId) ? target.rowId : (p.rows[0]?.id ?? target.rowId);
  const placed: Instance = { ...inst, rowId, side: target.side };
  const sameSlotIndices: number[] = [];
  for (let i = 0; i < p.modules.length; i++) {
    const m = p.modules[i]!;
    if (m.rowId === rowId && m.side === target.side) sameSlotIndices.push(i);
  }
  const clamped = Math.round(clamp(target.index, 0, sameSlotIndices.length));
  if (clamped >= sameSlotIndices.length) {
    return { ...p, modules: [...p.modules, placed] };
  }
  const insertAt = sameSlotIndices[clamped]!;
  return {
    ...p,
    modules: [...p.modules.slice(0, insertAt), placed, ...p.modules.slice(insertAt)],
  };
}

// ─── Räumliche Drop-Ziel-Berechnung & magnetische Hilfslinien ────────────────

interface RowBand {
  readonly id: string;
  readonly name: string;
  readonly y0: number;
  readonly y1: number;
  readonly drawY: number;
  readonly drawH: number;
}

/**
 * Berechnet klick- und droppbare Zeilenbänder: leere Zeilen bekommen eine
 * reale Zielhöhe statt 1 mm, sodass sie sauber per Drag & Drop erreichbar sind.
 */
function computeRowBands(p: Project, c: Construction): readonly RowBand[] {
  const availH = Math.max(24, p.base.heightMm - 2 * PRACTICE.edgeMarginMm);
  const minEmptyH = 26;
  const bands: RowBand[] = [];
  let cursor = PRACTICE.edgeMarginMm;

  for (let i = 0; i < c.rows.length; i++) {
    const r = c.rows[i]!;
    const occupiedH = r.usedMm > 0 ? r.rect.h : 0;
    const drawH = occupiedH > 0 ? occupiedH : minEmptyH;
    const isLast = i === c.rows.length - 1;
    const y0 = cursor;
    const y1 = isLast ? Math.max(cursor + drawH, PRACTICE.edgeMarginMm + availH) : cursor + drawH;
    bands.push({
      id: r.id,
      name: r.name,
      y0,
      y1,
      drawY: occupiedH > 0 ? r.rect.y : cursor,
      drawH,
    });
    cursor += occupiedH > 0 ? occupiedH : minEmptyH;
  }
  return bands;
}

export function resolveDropTarget(
  p: Project,
  c: Construction,
  worldX: number,
  worldY: number,
  options: {
    readonly excludeModuleId?: string;
    readonly movingDim?: { readonly w: number; readonly h: number };
    readonly snap?: boolean;
  } = {},
): ResolvedDropTarget {
  const spineStart = p.base.widthMm;
  const spineEnd = p.base.widthMm + p.base.spineWidthMm;
  const spineMid = (spineStart + spineEnd) / 2;
  const spineZone = p.base.spineWidthMm > 0 && worldX > spineStart && worldX < spineEnd;
  const side: Side = worldX >= spineMid ? 'right' : 'left';

  const bands = computeRowBands(p, c);
  let chosen = bands[0];
  if (bands.length > 0) {
    for (const b of bands) {
      if (worldY >= b.y0 && worldY <= b.y1) {
        chosen = b;
        break;
      }
    }
    if (!chosen || worldY < bands[0]!.y0) chosen = bands[0]!;
    else if (worldY > bands[bands.length - 1]!.y1) chosen = bands[bands.length - 1]!;
  }

  const rowId = chosen?.id ?? p.rows[0]?.id ?? 'r1';
  const rowName = chosen?.name ?? p.rows[0]?.name ?? '';

  // Nur Geschwister auf DERSELBEN Seite und Zeile betrachten (behebt den
  // alten Mixed-Side-Index-Bug).
  const siblings = c.modules
    .filter((m) => m.rowId === rowId && m.side === side && m.instanceId !== options.excludeModuleId)
    .sort((a, b) => a.rect.x - b.rect.x);

  let index = 0;
  for (const s of siblings) {
    if (worldX > s.rect.x + s.rect.w / 2) index += 1;
  }

  const sideStartX = side === 'right' ? spineEnd + PRACTICE.edgeMarginMm : PRACTICE.edgeMarginMm;
  let lineX = sideStartX;
  if (siblings.length > 0) {
    if (index === 0) lineX = siblings[0]!.rect.x;
    else if (index >= siblings.length) {
      const last = siblings[siblings.length - 1]!;
      lineX = last.rect.x + last.rect.w;
    } else {
      lineX = siblings[index]!.rect.x;
    }
  }

  const lineY = chosen?.drawY ?? PRACTICE.edgeMarginMm;
  const lineH = Math.max(options.movingDim?.h ?? 0, chosen?.drawH ?? 30, 24);

  // Magnetische Ausrichtungs-Hilfslinien (Falz, Nutzränder, Zeilen, Nachbar-Modulkanten)
  const guides: SnapGuide[] = [];
  if (options.snap !== false) {
    const tol = 7;
    const addX = (pos: number, kind: SnapGuide['kind']): void => {
      if (!guides.some((g) => g.axis === 'x' && Math.abs(g.pos - pos) < 0.5)) {
        guides.push({ axis: 'x', pos, kind });
      }
    };
    const addY = (pos: number, kind: SnapGuide['kind']): void => {
      if (!guides.some((g) => g.axis === 'y' && Math.abs(g.pos - pos) < 0.5)) {
        guides.push({ axis: 'y', pos, kind });
      }
    };

    const probeXs = [lineX, worldX];
    if (options.movingDim) probeXs.push(lineX + options.movingDim.w);

    const xCandidates: readonly { readonly pos: number; readonly kind: SnapGuide['kind'] }[] = [
      { pos: spineMid, kind: 'spine' },
      ...(p.base.spineWidthMm > 0
        ? [
            { pos: spineStart, kind: 'spine' as const },
            { pos: spineEnd, kind: 'spine' as const },
          ]
        : []),
      { pos: PRACTICE.edgeMarginMm, kind: 'margin' },
      { pos: p.base.widthMm - PRACTICE.edgeMarginMm, kind: 'margin' },
      { pos: spineEnd + PRACTICE.edgeMarginMm, kind: 'margin' },
      { pos: 2 * p.base.widthMm + p.base.spineWidthMm - PRACTICE.edgeMarginMm, kind: 'margin' },
    ];
    for (const cand of xCandidates) {
      if (probeXs.some((px) => Math.abs(px - cand.pos) < tol)) addX(cand.pos, cand.kind);
    }

    // Echte vertikale Fluchtlinien zu Modulkanten anderer Zeilen derselben Seite
    for (const other of c.modules) {
      if (other.instanceId === options.excludeModuleId || other.rowId === rowId || other.side !== side) continue;
      const edges = [other.rect.x, other.rect.x + other.rect.w, other.rect.x + other.rect.w / 2];
      for (const edge of edges) {
        if (probeXs.some((px) => Math.abs(px - edge) < 4)) addX(edge, 'module');
      }
    }

    // Zeilenkanten
    for (const r of c.rows) {
      if (Math.abs(worldY - r.rect.y) < tol) addY(r.rect.y, 'row');
      if (Math.abs(worldY - (r.rect.y + r.rect.h)) < tol) addY(r.rect.y + r.rect.h, 'row');
    }
  }

  return {
    target: { side, rowId, index },
    spineZone,
    insertionLine: { x: lineX, y: lineY, h: lineH },
    guides,
    rowName,
  };
}

// ─── Strenge Auswertung von Kandidaten-Operationen ───────────────────────────

function diffFindings(
  before: readonly Finding[],
  after: readonly Finding[],
  severity: Finding['severity'],
): { readonly added: readonly Finding[]; readonly resolved: readonly Finding[] } {
  const bKeys = new Set(before.filter((f) => f.severity === severity).map(findingKey));
  const aKeys = new Set(after.filter((f) => f.severity === severity).map(findingKey));
  const added = after.filter((f) => f.severity === severity && !bKeys.has(findingKey(f)));
  const resolved = before.filter((f) => f.severity === severity && !aKeys.has(findingKey(f)));
  return { added, resolved };
}

function buildEvaluation(
  beforeProject: Project,
  before: Construction,
  candidateProject: Project,
  focusModuleId: string,
  targetSide: Side,
  targetRowId: string,
): PlacementEvaluation {
  const after = candidateProject === beforeProject ? before : construct(candidateProject);
  const errDiff = diffFindings(before.findings, after.findings, 'error');
  const warnDiff = diffFindings(before.findings, after.findings, 'warn');

  const errorsBefore = before.metrics.errorCount;
  const errorsAfter = after.metrics.errorCount;

  // Strenge Zulässigkeit:
  // - Fehlerfreies Projekt darf NIEMALS in einen Fehlerzustand geschoben werden.
  // - Bei bestehenden Fehlern ist der Zug nur erlaubt, wenn er die Fehlerzahl
  //   echt senkt ODER keine neuen Fehler einführt und nicht verschlechtert.
  const introducesBlockingError =
    (errorsBefore === 0 && errorsAfter > 0) ||
    (errDiff.added.length > 0 && errorsAfter >= errorsBefore);

  const availW = candidateProject.base.widthMm - 2 * PRACTICE.edgeMarginMm;
  const availH = candidateProject.base.heightMm - 2 * PRACTICE.edgeMarginMm;
  const targetRow = after.rows.find((r) => r.id === targetRowId);
  const usedSide = targetRow ? (targetSide === 'right' ? targetRow.usedRight : targetRow.usedLeft) : 0;
  const targetFillPct = availW > 0 ? Math.round((usedSide / availW) * 100) : 0;
  const freeWidthMm = Math.round(availW - usedSide);
  const totalH = after.rows.reduce((sum, r) => sum + (r.usedMm > 0 ? r.rect.h : 0), 0);
  const targetHeightFillPct = availH > 0 ? Math.round((totalH / availH) * 100) : 0;
  const freeHeightMm = Math.round(availH - totalH);

  const projected = after.modules.find((m) => m.instanceId === focusModuleId)?.rect ?? null;

  // Reflow-Vorschau: alle anderen Module, deren Position sich ändert
  const beforeRects = new Map(before.modules.map((m) => [m.instanceId, m.rect]));
  const shiftedModules: ShiftedModule[] = [];
  for (const m of after.modules) {
    if (m.instanceId === focusModuleId) continue;
    const prev = beforeRects.get(m.instanceId);
    if (prev && (Math.abs(prev.x - m.rect.x) > 0.5 || Math.abs(prev.y - m.rect.y) > 0.5)) {
      shiftedModules.push({ id: m.instanceId, from: prev, to: m.rect });
    }
  }

  const scoreDelta = after.evaluation.score - before.evaluation.score;

  let verdict: PlacementVerdict;
  let reasonKey: string;
  let reasonValues: Record<string, number | string>;

  if (introducesBlockingError) {
    verdict = 'blocked';
    const firstErr = errDiff.added[0] ?? after.findings.find((f) => f.severity === 'error');
    if (freeWidthMm < 0) {
      reasonKey = 'place.blocked.width';
      reasonValues = { fehlt: Math.abs(freeWidthMm) };
    } else if (freeHeightMm < 0) {
      reasonKey = 'place.blocked.height';
      reasonValues = { fehlt: Math.abs(freeHeightMm) };
    } else if (firstErr?.ruleId === 'V-G-16') {
      reasonKey = 'place.blocked.spine';
      reasonValues = { fehlt: Number(firstErr.values.fehlt ?? 0) };
    } else if (firstErr?.ruleId === 'V-G-15') {
      reasonKey = 'place.blocked.corner';
      reasonValues = { radius: Number(firstErr.values.radius ?? 0) };
    } else if (firstErr?.ruleId === 'V-G-11') {
      reasonKey = 'place.blocked.grain';
      reasonValues = {};
    } else {
      reasonKey = 'place.blocked.generic';
      reasonValues = { n: errDiff.added.length || errorsAfter };
    }
  } else if (warnDiff.added.length > 0 || targetFillPct > LIMITS.channelFillWarnPct) {
    verdict = 'warn';
    reasonKey = targetFillPct > LIMITS.channelFillWarnPct ? 'place.warn.tight' : 'place.warn.generic';
    reasonValues = { pct: targetFillPct, frei: Math.max(0, freeWidthMm) };
  } else if (targetFillPct >= 90 || targetHeightFillPct >= 92) {
    verdict = 'tight';
    reasonKey = 'place.tight';
    reasonValues = { frei: Math.max(0, freeWidthMm), pct: targetFillPct };
  } else {
    verdict = 'optimal';
    reasonKey = errDiff.resolved.length > 0 ? 'place.optimal.fixes' : 'place.optimal';
    reasonValues = {
      frei: Math.max(0, freeWidthMm),
      pct: targetFillPct,
      behoben: errDiff.resolved.length,
    };
  }

  return {
    verdict,
    allowed: verdict !== 'blocked',
    score: after.evaluation.score,
    scoreDelta,
    errorsBefore,
    errorsAfter,
    newErrors: errDiff.added,
    resolvedErrors: errDiff.resolved,
    newWarns: warnDiff.added,
    targetFillPct,
    targetHeightFillPct,
    freeWidthMm,
    freeHeightMm,
    projectedRect: projected,
    shiftedModules,
    reasonKey,
    reasonValues,
    candidateProject,
    candidateConstruction: after,
  };
}

/** Bewertet eine Verschiebung eines bestehenden Moduls streng gegen `construct()`. */
export function evaluateMove(
  p: Project,
  moduleId: string,
  target: PlacementTarget,
  beforeConstruction?: Construction,
): PlacementEvaluation {
  const before = beforeConstruction ?? construct(p);
  const inst = p.modules.find((m) => m.id === moduleId);
  if (!inst || inst.locked) {
    const projected = before.modules.find((m) => m.instanceId === moduleId)?.rect ?? null;
    return {
      verdict: 'blocked',
      allowed: false,
      score: before.evaluation.score,
      scoreDelta: 0,
      errorsBefore: before.metrics.errorCount,
      errorsAfter: before.metrics.errorCount,
      newErrors: [],
      resolvedErrors: [],
      newWarns: [],
      targetFillPct: 0,
      targetHeightFillPct: before.evaluation.diagnostics.heightFillPct,
      freeWidthMm: 0,
      freeHeightMm: 0,
      projectedRect: projected,
      shiftedModules: [],
      reasonKey: 'place.blocked.locked',
      reasonValues: {},
      candidateProject: p,
      candidateConstruction: before,
    };
  }
  const candidate = relocateModule(p, moduleId, target);
  return buildEvaluation(p, before, candidate, moduleId, target.side, target.rowId);
}

/** Bewertet das Einfügen eines neuen Moduls an einem konkreten Ziel-Slot. */
export function evaluateAdd(
  p: Project,
  typeId: ModuleTypeId,
  target: PlacementTarget,
  params?: Params,
  beforeConstruction?: Construction,
): PlacementEvaluation {
  const before = beforeConstruction ?? construct(p);
  const def = moduleDef(typeId);
  const tempId = '__preview_add__';
  const inst: Instance = {
    id: tempId,
    typeId,
    rowId: target.rowId,
    side: target.side,
    params: { ...def.defaults, ...(params ?? {}) },
    rotation: 0,
    locked: false,
  };
  const candidate = insertModuleAt(p, inst, target);
  return buildEvaluation(p, before, candidate, tempId, target.side, target.rowId);
}

/** Bewertet eine Live-Größenänderung (Resize-Griff) streng gegen `construct()`. */
export function evaluateResize(
  p: Project,
  moduleId: string,
  nextParams: Params,
  beforeConstruction?: Construction,
): PlacementEvaluation {
  const before = beforeConstruction ?? construct(p);
  const inst = p.modules.find((m) => m.id === moduleId);
  if (!inst || inst.locked) {
    return evaluateMove(p, moduleId, { side: inst?.side ?? 'left', rowId: inst?.rowId ?? p.rows[0]!.id, index: 0 }, before);
  }
  const candidate: Project = {
    ...p,
    modules: p.modules.map((m) => (m.id === moduleId ? { ...m, params: { ...m.params, ...nextParams } } : m)),
  };
  return buildEvaluation(p, before, candidate, moduleId, inst.side, inst.rowId);
}

/** Berechnet das erwartete Modulmaß (mm) für Vorschau / Drag aus der Bibliothek. */
export function previewModuleDim(p: Project, typeId: ModuleTypeId, params?: Params): { readonly w: number; readonly h: number } {
  const def = moduleDef(typeId);
  const availW = p.base.widthMm - 2 * PRACTICE.edgeMarginMm;
  const availH = Math.max(0, p.base.heightMm - 2 * PRACTICE.edgeMarginMm);
  const inst: Instance = {
    id: '__dim__',
    typeId,
    rowId: p.rows[0]?.id ?? 'r1',
    side: 'left',
    params: { ...def.defaults, ...(params ?? {}) },
    rotation: 0,
    locked: false,
  };
  const dim = occupied(inst, {
    channelFreeMm: mm(availW),
    panelWidthMm: mm(p.base.widthMm),
    panelHeightMm: mm(p.base.heightMm),
    rowHeightMm: mm(availH),
    seamAllowanceMm: mm(p.settings.seamAllowanceMm),
    fabricWidthMm: mm(p.settings.fabricWidthMm),
    spineWidthMm: mm(p.base.spineWidthMm),
  });
  return { w: dim.w, h: dim.h };
}

// ─── Intelligente Best-Slot-Suche & Layout-Optimierung ───────────────────────

function compareCandidates(a: PlacementCandidate, b: PlacementCandidate, preferredSide: Side): number {
  const aValid = a.evaluation.errorsAfter === 0 ? 0 : 1;
  const bValid = b.evaluation.errorsAfter === 0 ? 0 : 1;
  if (aValid !== bValid) return aValid - bValid;
  if (a.evaluation.errorsAfter !== b.evaluation.errorsAfter) {
    return a.evaluation.errorsAfter - b.evaluation.errorsAfter;
  }
  const aWarn = a.evaluation.candidateConstruction.metrics.warnCount;
  const bWarn = b.evaluation.candidateConstruction.metrics.warnCount;
  if (aWarn !== bWarn) return aWarn - bWarn;
  if (a.evaluation.score !== b.evaluation.score) {
    return b.evaluation.score - a.evaluation.score;
  }
  const aPref = a.target.side === preferredSide ? 0 : 1;
  const bPref = b.target.side === preferredSide ? 0 : 1;
  if (aPref !== bPref) return aPref - bPref;
  return a.evaluation.targetFillPct - b.evaluation.targetFillPct;
}

/**
 * Findet den optimalen Ziel-Slot `(side, rowId, index)` für ein neues Modul
 * über alle vorhandenen Zeilen und beide Innenflächen.
 */
export function findBestPlacement(
  p: Project,
  typeId: ModuleTypeId,
  preferredSide: Side = 'left',
  params?: Params,
  beforeConstruction?: Construction,
): PlacementCandidate {
  const before = beforeConstruction ?? construct(p);
  const sides: readonly Side[] = preferredSide === 'left' ? ['left', 'right'] : ['right', 'left'];
  const candidates: PlacementCandidate[] = [];

  for (const side of sides) {
    for (const row of p.rows) {
      const count = p.modules.filter((m) => m.rowId === row.id && m.side === side).length;
      const target: PlacementTarget = { side, rowId: row.id, index: count };
      candidates.push({ target, evaluation: evaluateAdd(p, typeId, target, params, before) });
    }
  }

  candidates.sort((a, b) => compareCandidates(a, b, preferredSide));
  return (
    candidates[0] ?? {
      target: { side: preferredSide, rowId: p.rows[0]?.id ?? 'r1', index: 0 },
      evaluation: evaluateAdd(p, typeId, { side: preferredSide, rowId: p.rows[0]?.id ?? 'r1', index: 0 }, params, before),
    }
  );
}

/**
 * Sucht für ein bestehendes Modul einen besseren, gültigen Platz (z. B. nach
 * einem Überlauf oder einer blockierten Ablage).
 */
export function suggestRepairMove(
  p: Project,
  moduleId: string,
  beforeConstruction?: Construction,
): PlacementCandidate | null {
  const inst = p.modules.find((m) => m.id === moduleId);
  if (!inst || inst.locked) return null;
  const before = beforeConstruction ?? construct(p);
  const candidates: PlacementCandidate[] = [];

  for (const side of ['left', 'right'] as const) {
    for (const row of p.rows) {
      if (side === inst.side && row.id === inst.rowId) continue;
      const count = p.modules.filter((m) => m.rowId === row.id && m.side === side && m.id !== moduleId).length;
      const target: PlacementTarget = { side, rowId: row.id, index: count };
      const evaluation = evaluateMove(p, moduleId, target, before);
      const strictlyBetter =
        evaluation.errorsAfter < evaluation.errorsBefore ||
        (evaluation.errorsAfter === evaluation.errorsBefore &&
          evaluation.newErrors.length === 0 &&
          (evaluation.candidateConstruction.metrics.warnCount < before.metrics.warnCount || evaluation.scoreDelta >= 3));
      if (strictlyBetter) {
        candidates.push({ target, evaluation });
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => compareCandidates(a, b, inst.side));
  return candidates[0] ?? null;
}

/**
 * Deterministischer Layout-Optimierer: verteilt ungesperrte Module gezielt auf
 * beide Innenflächen und Zeilen um, um Fehler zu beheben und den Score zu steigern.
 * Verändert NIEMALS Modulparameter, Anzahl oder gesperrte Module.
 */
export function optimizeLayout(p: Project): LayoutOptimizationResult {
  const initial = construct(p);
  let current = p;
  let currentC = initial;
  const movedIds = new Set<string>();

  // Maximal 2 Runden (konvergiert garantiert schnell und deterministisch).
  for (let pass = 0; pass < 2; pass++) {
    let improvedInPass = false;
    // Problem-Module zuerst (überlaufende Zeilen oder mit eigenem Error-Finding)
    const errModIds = new Set(
      currentC.findings.filter((f) => f.severity === 'error' && f.subject.kind === 'module').map((f) => (f.subject as { id: string }).id),
    );
    const overflowRows = new Set(
      currentC.rows
        .filter((r) => {
          const availW = current.base.widthMm - 2 * PRACTICE.edgeMarginMm;
          return r.usedLeft > availW || r.usedRight > availW;
        })
        .map((r) => r.id),
    );

    const ordered = [...current.modules].sort((a, b) => {
      const aPri = (errModIds.has(a.id) ? 0 : 1) + (overflowRows.has(a.rowId) ? 0 : 2);
      const bPri = (errModIds.has(b.id) ? 0 : 1) + (overflowRows.has(b.rowId) ? 0 : 2);
      return aPri - bPri;
    });

    for (const m of ordered) {
      if (m.locked) continue;
      const best = suggestRepairMove(current, m.id, currentC);
      if (!best) continue;
      const improves =
        best.evaluation.errorsAfter < currentC.metrics.errorCount ||
        (best.evaluation.errorsAfter === currentC.metrics.errorCount &&
          best.evaluation.candidateConstruction.metrics.warnCount < currentC.metrics.warnCount) ||
        (best.evaluation.errorsAfter === currentC.metrics.errorCount &&
          best.evaluation.candidateConstruction.metrics.warnCount === currentC.metrics.warnCount &&
          best.evaluation.score > currentC.evaluation.score + 2);
      if (improves) {
        current = best.evaluation.candidateProject;
        currentC = best.evaluation.candidateConstruction;
        movedIds.add(m.id);
        improvedInPass = true;
      }
    }
    if (!improvedInPass) break;
  }

  const changed =
    movedIds.size > 0 &&
    (currentC.metrics.errorCount < initial.metrics.errorCount ||
      (currentC.metrics.errorCount === initial.metrics.errorCount && currentC.metrics.warnCount < initial.metrics.warnCount) ||
      (currentC.metrics.errorCount === initial.metrics.errorCount &&
        currentC.metrics.warnCount === initial.metrics.warnCount &&
        currentC.evaluation.score > initial.evaluation.score));

  return {
    changed,
    project: changed ? current : p,
    beforeScore: initial.evaluation.score,
    afterScore: changed ? currentC.evaluation.score : initial.evaluation.score,
    errorsBefore: initial.metrics.errorCount,
    errorsAfter: changed ? currentC.metrics.errorCount : initial.metrics.errorCount,
    movedCount: changed ? movedIds.size : 0,
  };
}

/** Hilfsfunktion für Test/UI: leeres Rect-Fallback. */
export const ZERO_RECT: Rect = rect(0, 0, 0, 0);
