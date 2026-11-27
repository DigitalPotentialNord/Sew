/**
 * Issue #18 — Modulhöhen validieren:
 * Module, deren `height()`-Zeichnung auf den verfügbaren Platz geklemmt wird,
 * während `pieces()` den Rohwert verwendet, MÜSSEN das in `validate()` melden.
 * Sonst erreicht ein Projekt mit überstehendem Schnittteil errorCount === 0
 * und der Export ist freigegeben — obwohl das Teil nicht passt.
 */
import { describe, expect, it } from 'vitest';
import { construct, SCHEMA_VERSION, type Project, type Instance } from '../core/construction';
import { applyFix } from '../core/fixes';
import { makeInstance } from '../core/project';

const at = (mods: Instance[], heightMm = 140): Project => ({
  schemaVersion: SCHEMA_VERSION,
  id: 'p_h',
  name: 'Höhen-Check',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  base: { form: 'book', widthMm: 280, heightMm, spineWidthMm: 32, cornerRadiusMm: 16, hasLining: false },
  rows: [{ id: 'r1', name: 'Zeile 1' }],
  modules: mods,
  settings: { seamAllowanceMm: 10, fabricWidthMm: 1400, unit: 'mm' },
});

/** Überstand gegen verfügbare Höhe (base 140 → availH 120). */
const TALL = 200;

const cases: { id: Parameters<typeof makeInstance>[0]; param: string; ruleId: string }[] = [
  { id: 'M02', param: 'hoehe', ruleId: 'V-M02-03' },
  { id: 'M09', param: 'hoehe', ruleId: 'V-M09-03' },
  { id: 'M10', param: 'hoehe', ruleId: 'V-M10-03' },
  { id: 'M11', param: 'hoehe', ruleId: 'V-M11-03' },
  { id: 'M12', param: 'hoehe', ruleId: 'V-M12-03' },
  { id: 'M14', param: 'hoehe', ruleId: 'V-M14-02' },
  { id: 'M15', param: 'hoehe', ruleId: 'V-M15-02' },
  { id: 'M16', param: 'laenge', ruleId: 'V-M16-01' },
  { id: 'M03', param: 'hoehe', ruleId: 'V-M03-04' },
];

describe('Issue #18: Schnittteil höher als die verfügbare Fläche', () => {
  for (const { id, param, ruleId } of cases) {
    it(`${id} meldet ${ruleId} als error und blockiert den Export`, () => {
      const inst = makeInstance(id, 'r1', { [param]: TALL });
      const c = construct(at([inst]));
      const f = c.findings.find((x) => x.ruleId === ruleId);
      expect(f, `${ruleId} fehlt`).toBeDefined();
      expect(f!.severity).toBe('error');
      expect(f!.dismissible).toBe(false);
      expect(c.metrics.errorCount).toBeGreaterThan(0);
    });

    it(`${id}: der angebotene Fix behebt ${ruleId}`, () => {
      const inst = makeInstance(id, 'r1', { [param]: TALL });
      const c = construct(at([inst]));
      const f = c.findings.find((x) => x.ruleId === ruleId)!;
      expect(f.fix).toBeDefined();
      const fixed = construct(applyFix(at([inst]), f.fix!));
      expect(fixed.findings.find((x) => x.ruleId === ruleId)).toBeUndefined();
    });

    it(`${id}: das Schnittteil wird NICHT stillschweigend beschnitten`, () => {
      const inst = makeInstance(id, 'r1', { [param]: TALL });
      const c = construct(at([inst]));
      const owned = c.pieces.filter((p) => p.sourceModuleId === inst.id && p.kind === 'cut');
      expect(owned.length).toBeGreaterThan(0);
      // Die Nahtzugabe des Rohwerts steckt im Teil — und der Export ist gesperrt.
      expect(owned.some((p) => p.h > 120)).toBe(true);
      expect(c.metrics.errorCount).toBeGreaterThan(0);
    });
  }

  it('M03 meldet bei >90 % zusätzlich die Warnung V-M03-03', () => {
    const inst = makeInstance('M03', 'r1', { hoehe: 120 }); // availH=120, 0.9·120=108 < 120
    const c = construct(at([inst]));
    expect(c.findings.find((x) => x.ruleId === 'V-M03-03')?.severity).toBe('warn');
  });

  it('kein Fehler ohne Not: Defaults aller betroffenen Module bleiben exportfähig', () => {
    // 240-mm-Etui (availH 220) — bewusst über dem größten Modul-Default (M16, 180 mm)
    for (const { id, ruleId } of cases) {
      const c = construct(at([makeInstance(id, 'r1')], 240));
      expect(c.findings.find((x) => x.ruleId === ruleId), `${id} meldet ohne Not`).toBeUndefined();
    }
  });

  it('rowRoom < Feldminimum → growHeight statt setParam auf 0 (M02, zweite Zeile belegt alles)', () => {
    const p: Project = {
      ...at([
        makeInstance('M01', 'r1', { hoehe: 60 }),
        makeInstance('M02', 'r2', { hoehe: 80 }),
      ]),
      base: { form: 'book', widthMm: 280, heightMm: 80, spineWidthMm: 32, cornerRadiusMm: 16, hasLining: false },
      rows: [
        { id: 'r1', name: 'Zeile 1' },
        { id: 'r2', name: 'Zeile 2' },
      ],
    };
    const c = construct(p);
    const f = c.findings.find((x) => x.ruleId === 'V-M02-03');
    expect(f).toBeDefined();
    expect(f!.fix!.kind).toBe('growHeight');
    const fixed = construct(applyFix(p, f!.fix!));
    expect(fixed.findings.find((x) => x.ruleId === 'V-M02-03')).toBeUndefined();
  });

  it('rowRoom ≥ Feldminimum → setParam auf den freien Platz', () => {
    const p = at([makeInstance('M02', 'r1', { hoehe: 200 })]); // rowRoom = 120 ≥ 25
    const f = construct(p).findings.find((x) => x.ruleId === 'V-M02-03')!;
    expect(f.fix).toEqual({ kind: 'setParam', moduleId: f.subject.kind === 'module' ? f.subject.id : '', key: 'hoehe', value: 120 });
  });

  it('Finding ist im values-Record nur Zahlen/Strings (i18n-Vertrag)', () => {
    for (const { id, param, ruleId } of cases) {
      const c = construct(at([makeInstance(id, 'r1', { [param]: TALL })]));
      const f = c.findings.find((x) => x.ruleId === ruleId)!;
      for (const v of Object.values(f.values)) {
        expect(['number', 'string']).toContain(typeof v);
      }
    }
  });
});
