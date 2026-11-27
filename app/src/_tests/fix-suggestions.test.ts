/**
 * Issue #17 — Angebotene Auto-Fixes müssen wirklich wirken.
 * Ein Fix, der einen bereits passenden Wert vorschlägt (z. B. "Etui auf 342 mm
 * verbreitern" bei 342 mm Breite), oder auf 0 klemmt und das Finding bestehen
 * lässt, ist schlimmer als kein Fix. Hier wird geprüft, dass der angebotene
 * Fix stets zum Ziel führt — inkl. gedrehter Module (orientFinding).
 */
import { describe, expect, it } from 'vitest';
import { construct, SCHEMA_VERSION, type Project, type Instance } from '../core/construction';
import { applyFix } from '../core/fixes';
import { makeInstance } from '../core/project';

const proj = (mods: Instance[], widthMm: number, heightMm: number, rows: { id: string; name: string }[] = [{ id: 'r1', name: 'Zeile 1' }]): Project => ({
  schemaVersion: SCHEMA_VERSION,
  id: 'p_fix',
  name: 'Fix-Check',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  base: { form: 'book', widthMm, heightMm, spineWidthMm: 32, cornerRadiusMm: 16, hasLining: false },
  rows,
  modules: mods,
  settings: { seamAllowanceMm: 10, fabricWidthMm: 1400, unit: 'mm' },
});

describe('V-G-08: Verbreiterungs-Fix schlägt immer eine echte Verbreiterung vor', () => {
  // availW = 280 − 20 = 260 (widthMm 280)
  it('bei 100 % Zeilenfüllung: toMm > aktuelle Breite und nachher ≤ 95 %', () => {
    const p = proj([makeInstance('M01', 'r1', { breite: 260 })], 280, 200);
    const c = construct(p);
    const f = c.findings.find((x) => x.ruleId === 'V-G-08')!;
    expect(f.values['pct']).toBe(100);
    expect(f.fix).toMatchObject({ kind: 'widenBase' });
    const toMm = (f.fix as { kind: 'widenBase'; toMm: number }).toMm;
    expect(toMm).toBeGreaterThan(280);
    const fixed = construct(applyFix(p, f.fix!));
    expect(fixed.rows[0]!.fillPct).toBeLessThanOrEqual(95);
    expect(fixed.findings.find((x) => x.ruleId === 'V-G-08')).toBeUndefined();
  });

  it('bei 99 % Zeilenfüllung: Verbreiterung statt Verkleinerung', () => {
    const p = proj([makeInstance('M01', 'r1', { breite: 258 })], 280, 200); // 258/260 = 99,2 %
    const c = construct(p);
    const f = c.findings.find((x) => x.ruleId === 'V-G-08')!;
    expect(f.values['pct']).toBe(99);
    const toMm = (f.fix as { kind: 'widenBase'; toMm: number }).toMm;
    expect(toMm).toBeGreaterThan(280);
    const fixed = construct(applyFix(p, f.fix!));
    expect(fixed.rows[0]!.fillPct).toBeLessThanOrEqual(95);
  });

  it('der Fix ändert den projectHash (kein No-op)', () => {
    const p = proj([makeInstance('M01', 'r1', { breite: 260 })], 280, 200);
    const c = construct(p);
    const f = c.findings.find((x) => x.ruleId === 'V-G-08')!;
    const after = construct(applyFix(p, f.fix!));
    expect(after.projectHash).not.toBe(c.projectHash);
  });

  it('bei 98 % oder mehr ist nie eine Verkleinerung das Ziel', () => {
    // Property über die gesamte Breite knapp unter/über der Schwelle
    for (const breite of [256, 258, 260]) {
      const c = construct(proj([makeInstance('M01', 'r1', { breite })], 280, 200));
      const f = c.findings.find((x) => x.ruleId === 'V-G-08');
      if (f) {
        expect((f.fix as { toMm: number }).toMm).toBeGreaterThan(280);
      }
    }
  });
});

describe('Höhen-Fix bei voll belegtem Panel (rowRoom === 0) schlägt growHeight statt setParam auf 0 vor', () => {
  const rows = [
    { id: 'r1', name: 'Zeile 1' },
    { id: 'r2', name: 'Zeile 2' },
  ];
  it('M01 (V-M01-03): growHeight, und der Fix wirkt', () => {
    // 80-mm-Etui → availH 60; Zeile 1 belegt mit einem 60-mm-Fach alles → Zeile 2 hat 0 mm Raum
    const p = proj(
      [makeInstance('M01', 'r1', { hoehe: 60 }), makeInstance('M01', 'r2', { hoehe: 50 })],
      280, 80, rows,
    );
    const f = construct(p).findings.find((x) => x.ruleId === 'V-M01-03')!;
    expect(f.fix!.kind).toBe('growHeight');
    const fixed = construct(applyFix(p, f.fix!));
    expect(fixed.findings.find((x) => x.ruleId === 'V-M01-03')).toBeUndefined();
  });

  it('M16 (V-M16-01): growHeight, und der Fix wirkt', () => {
    const p = proj(
      [makeInstance('M01', 'r1', { hoehe: 60 }), makeInstance('M16', 'r2', { laenge: 100 })],
      280, 80, rows,
    );
    const f = construct(p).findings.find((x) => x.ruleId === 'V-M16-01')!;
    expect(f.fix!.kind).toBe('growHeight');
    const fixed = construct(applyFix(p, f.fix!));
    expect(fixed.findings.find((x) => x.ruleId === 'V-M16-01')).toBeUndefined();
  });

  it('M03 (V-M03-03, 90 %-Warnung): growHeight, und der Fix wirkt', () => {
    const p = proj(
      [makeInstance('M01', 'r1', { hoehe: 60 }), makeInstance('M03', 'r2', { hoehe: 60, breite: 90 })],
      280, 80, rows,
    );
    const f = construct(p).findings.find((x) => x.ruleId === 'V-M03-03')!;
    expect(f.fix!.kind).toBe('growHeight');
    const fixed = construct(applyFix(p, f.fix!));
    expect(fixed.findings.find((x) => x.ruleId === 'V-M03-03')).toBeUndefined();
  });
});

describe('orientFinding bei 90°-Drehung: Achsenvertauschung der Fixes', () => {
  it('V-M06-02 (gedreht): growHeight wird zu widenBase — und der Fix wirkt auf V-M06-02', () => {
    // 100-mm-Etui → availW 80 < Kanalhöhe 214 → das längs gedrehte Kanalmodul überragt die Breite
    const inst: Instance = { ...makeInstance('M06', 'r1', { nadellaenge: 200, zugabe: 14 }), rotation: 90 };
    const p = proj([inst], 100, 220);
    const c = construct(p);
    const f = c.findings.find((x) => x.ruleId === 'V-M06-02')!;
    expect(f.fix!.kind).toBe('widenBase');
    const fixed = construct(applyFix(p, f.fix!));
    expect(fixed.findings.find((x) => x.ruleId === 'V-M06-02')).toBeUndefined();
  });

  it('V-G-01 (Panel-Subjekt) wird NICHT umorientiert', () => {
    const inst: Instance = { ...makeInstance('M06', 'r1', { nadellaenge: 200, zugabe: 14 }), rotation: 90 };
    const p = proj([inst], 100, 220);
    const f = construct(p).findings.find((x) => x.ruleId === 'V-G-01')!;
    expect(f.fix!.kind).toBe('widenBase');
  });

  it('V-M01-01 (gedreht): widenBase wird zu growHeight — und der Fix wirkt', () => {
    // 140-mm-Etui → availH 120 < breite 200 des gedrehten Fachs
    const inst: Instance = { ...makeInstance('M01', 'r1', { breite: 200, hoehe: 70 }), rotation: 90 };
    const p = proj([inst], 280, 140);
    const c = construct(p);
    const f = c.findings.find((x) => x.ruleId === 'V-M01-01')!;
    expect(f.fix!.kind).toBe('growHeight');
    const fixed = construct(applyFix(p, f.fix!));
    expect(fixed.findings.find((x) => x.ruleId === 'V-M01-01')).toBeUndefined();
  });

  it('orientFinding lässt unbekannte Fix-Kinds unverändert', () => {
    // setParam-Fälle (z. B. V-M06-01 → widenBase wäre falsch nur bei swap; setParam bleibt stabil)
    const inst: Instance = { ...makeInstance('M06', 'r1', { nadelstaerke: 4, paare: 1, zugabe: 14 }), rotation: 180 };
    const p = proj([inst], 280, 220);
    const c = construct(p);
    // 180° ist keine Achsentauschung: vorhandenes widenBase bleibt widenBase
    for (const f of c.findings) {
      if (f.ruleId === 'V-G-01' || f.ruleId === 'V-M06-01') {
        expect(f.fix!.kind).toBe('widenBase');
      }
    }
  });
});
