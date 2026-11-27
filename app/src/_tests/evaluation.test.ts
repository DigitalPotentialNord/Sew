/**
 * Strenge Konstruktions- und Qualitätsbewertung (src/core/evaluation.ts).
 * Prüft: Hard-Error-Gate, Spine-Bulk-Physik, 5 gewichtete Kategorien,
 * 10-Punkte-Prüfprotokoll, Determinismus und alle 3 Vorlagen.
 */
import { describe, expect, it } from 'vitest';
import { construct } from '../core/construction';
import { computeSpineBulk } from '../core/evaluation';
import { canExport } from '../core/export';
import { applyFix } from '../core/fixes';
import { mm } from '../core/geometry';
import { blankProject, buildTemplate, TEMPLATES } from '../core/project';

describe('Bewertungs-Engine: Vorlagen & Grundstruktur', () => {
  it.each(TEMPLATES)('Vorlage "$id" ist fehlerfrei, exportbereit und erreicht Note A+/A/B', (tpl) => {
    const p = buildTemplate(tpl.id);
    const c = construct(p);
    expect(c.metrics.errorCount).toBe(0);
    expect(canExport(c).ok).toBe(true);
    expect(c.evaluation.verdict).not.toBe('blocked');
    expect(c.evaluation.score).toBeGreaterThanOrEqual(80);
    expect(['A+', 'A', 'B']).toContain(c.evaluation.grade);
    expect(c.evaluation.categories).toHaveLength(5);
    expect(c.evaluation.checklist).toHaveLength(10);
    const weightSum = c.evaluation.categories.reduce((acc, cat) => acc + cat.weight, 0);
    expect(weightSum).toBeCloseTo(1, 5);
  });

  it('Bewertung ist 100 % deterministisch für identische Eingaben', () => {
    const p = buildTemplate('schmuck');
    const a = construct(p).evaluation;
    const b = construct(p).evaluation;
    expect(a).toEqual(b);
  });

  it('leeres Projekt liefert gültige Kennzahlen ohne Absturz', () => {
    const p = blankProject('Leer');
    const c = construct(p);
    expect(c.evaluation.score).toBeGreaterThanOrEqual(0);
    expect(c.evaluation.score).toBeLessThanOrEqual(100);
    expect(c.evaluation.checklist).toHaveLength(10);
    expect(c.evaluation.diagnostics.leftAreaPct).toBe(0);
    expect(c.evaluation.diagnostics.rightAreaPct).toBe(0);
  });
});

describe('Bewertungs-Engine: Harte Fehler-Schranke & Spine-Physik', () => {
  it('jeder harte Konstruktionsfehler deckelt den Score auf ≤ 49, Note F, verdict=blocked', () => {
    const base = buildTemplate('schmuck');
    // Basis so schmal machen, dass V-G-01 sicher auslöst
    const broken = { ...base, base: { ...base.base, widthMm: mm(110) } };
    const c = construct(broken);
    expect(c.metrics.errorCount).toBeGreaterThan(0);
    expect(canExport(c).ok).toBe(false);
    expect(c.evaluation.verdict).toBe('blocked');
    expect(c.evaluation.grade).toBe('F');
    expect(c.evaluation.score).toBeLessThanOrEqual(49);
  });

  it('computeSpineBulk summiert Grundkörper-Lagen + dickste Module je Seite physikalisch korrekt', () => {
    const base = buildTemplate('schmuck');
    // Ein Modul auf die rechte Seite legen, um beidseitiges Stapeln zu prüfen
    const twoSided = base.modules.map((m, i) => (i === 0 ? { ...m, side: 'right' as const } : m));
    const bulk = computeSpineBulk(twoSided, base.base.hasLining);
    expect(bulk.leftBulkMm).toBeGreaterThan(0);
    expect(bulk.rightBulkMm).toBeGreaterThan(0);
    expect(bulk.estimatedBulkMm).toBeGreaterThan(bulk.leftBulkMm + bulk.rightBulkMm);
    expect(bulk.requiredSpineMm).toBeGreaterThan(0);
    // Ohne Futter ist die Basisdicke geringer
    const withoutLining = computeSpineBulk(twoSided, false);
    expect(withoutLining.estimatedBulkMm).toBeLessThan(bulk.estimatedBulkMm);
  });

  it('zu schmaler Bund bei voluminösen Modulen löst V-G-16 aus und der Fix repariert ihn', () => {
    const base = buildTemplate('makeup');
    const tight = { ...base, base: { ...base.base, spineWidthMm: mm(12) } };
    const c = construct(tight);
    const v16 = c.findings.find((f) => f.ruleId === 'V-G-16');
    expect(v16, 'V-G-16 erwartet bei 12 mm Bund').toBeDefined();
    expect(v16!.fix?.kind).toBe('setSpineWidth');
    expect(c.evaluation.diagnostics.spineUtilizationPct).toBeGreaterThan(100);

    const fixed = applyFix(tight, v16!.fix!);
    const cFixed = construct(fixed);
    expect(cFixed.findings.some((f) => f.ruleId === 'V-G-16')).toBe(false);
    expect(cFixed.evaluation.score).toBeGreaterThan(c.evaluation.score);
  });

  it('Ecken-Radius-Kollision löst V-G-15 exakt aus und der Fix korrigiert cornerRadiusMm', () => {
    const base = buildTemplate('schmuck');
    const hugeCorner = { ...base, base: { ...base.base, cornerRadiusMm: mm(50) } };
    const c = construct(hugeCorner);
    const v15 = c.findings.find((f) => f.ruleId === 'V-G-15');
    expect(v15, 'V-G-15 erwartet bei 50 mm Eckenradius').toBeDefined();
    expect(v15!.severity).toBe('error');
    expect(v15!.fix?.kind).toBe('setCornerRadius');

    const fixed = applyFix(hugeCorner, v15!.fix!);
    const cFixed = construct(fixed);
    expect(cFixed.findings.some((f) => f.ruleId === 'V-G-15')).toBe(false);
  });

  it('Fadenlauf-Konflikt bei gedrehtem Nadelkanal (M06) löst V-G-11 aus und der Fix dreht zurück', () => {
    const base = buildTemplate('strick');
    const m06 = base.modules.find((m) => m.typeId === 'M06')!;
    const rotated = {
      ...base,
      modules: base.modules.map((m) => (m.id === m06.id ? { ...m, rotation: 90 as const } : m)),
    };
    const c = construct(rotated);
    const v11 = c.findings.find((f) => f.ruleId === 'V-G-11');
    expect(v11, 'V-G-11 erwartet bei gedrehtem M06').toBeDefined();
    expect(v11!.fix?.kind).toBe('setRotation');

    const fixed = applyFix(rotated, v11!.fix!);
    expect(construct(fixed).findings.some((f) => f.ruleId === 'V-G-11')).toBe(false);
  });

  it('starke Links/Rechts-Asymmetrie reduziert den Layout-Score und schlägt im Balance-Check an', () => {
    const base = buildTemplate('schmuck');
    const wideBase = { ...base, base: { ...base.base, widthMm: mm(320), heightMm: mm(340) } };
    const oneSided = {
      ...wideBase,
      modules: wideBase.modules.map((m) => ({ ...m, side: 'left' as const })),
    };
    const balanced = {
      ...wideBase,
      modules: wideBase.modules.map((m, i) => ({ ...m, side: i % 2 === 0 ? ('left' as const) : ('right' as const) })),
    };
    const cOne = construct(oneSided);
    const cBal = construct(balanced);
    const layoutOne = cOne.evaluation.categories.find((cat) => cat.id === 'layout')!;
    const layoutBal = cBal.evaluation.categories.find((cat) => cat.id === 'layout')!;
    expect(layoutOne.score).toBeLessThan(layoutBal.score);
    const chkBalOne = cOne.evaluation.checklist.find((chk) => chk.id === 'chk-balance')!;
    const chkBalBal = cBal.evaluation.checklist.find((chk) => chk.id === 'chk-balance')!;
    expect(chkBalOne.status).not.toBe('pass');
    expect(chkBalBal.status).toBe('pass');
  });

  it('Modul höher als nutzbare Panelhöhe löst V-G-14 aus und der Fix vergrößert die Panelhöhe', () => {
    const base = buildTemplate('schmuck');
    const tall = {
      ...base,
      modules: base.modules.map((m) => (m.typeId === 'M03' ? { ...m, params: { ...m.params, hoehe: 210 } } : m)),
    };
    const c = construct(tall);
    const v14 = c.findings.find((f) => f.ruleId === 'V-G-14');
    expect(v14, 'V-G-14 erwartet bei Modulhöhe > Panel-Nutzhöhe').toBeDefined();
    expect(v14!.severity).toBe('error');
    expect(v14!.fix?.kind).toBe('growHeight');
    const fixed = applyFix(tall, v14!.fix!);
    expect(construct(fixed).findings.some((f) => f.ruleId === 'V-G-14')).toBe(false);
  });
});
