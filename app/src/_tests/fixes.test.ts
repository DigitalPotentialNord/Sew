/**
 * Fixes — die EINZIGE Stelle, an der ein Finding das Projekt mutiert.
 * Kernversprechen: Idempotenz, Klemmung an die Schemagrenzen und ein
 * stabiler Finding-Key (sonst feuern Ausblenden/Dedup wahllos).
 */
import { describe, expect, it } from 'vitest';
import { applyFix, findingKey } from '../core/fixes';
import { blankProject, makeInstance } from '../core/project';
import { LIMITS } from '../core/practice';
import type { Finding } from '../core/types';

const finding = (over: Partial<Finding> = {}): Finding => ({
  ruleId: 'V-G-01',
  severity: 'error',
  subject: { kind: 'panel' },
  values: { zeile: 'A', belegt: 300 },
  dismissible: false,
  ...over,
});

describe('findingKey', () => {
  it('ist stabil und unterscheidet ruleId, Subjekt und values', () => {
    expect(findingKey(finding())).toBe(findingKey(finding()));
    expect(findingKey(finding())).not.toBe(findingKey(finding({ ruleId: 'V-G-02' })));
    expect(findingKey(finding())).not.toBe(findingKey(finding({ values: { zeile: 'B' } })));
    expect(findingKey(finding({ subject: { kind: 'module', id: 'm1' } }))).not.toBe(findingKey(finding({ subject: { kind: 'module', id: 'm2' } })));
  });

  it('dokumentiert das Format Regel|Kind|ID|Werte (Reihenfolge = Insertion)', () => {
    expect(findingKey(finding())).toBe('V-G-01|panel||{"zeile":"A","belegt":300}');
  });
});

describe('applyFix', () => {
  const base = blankProject('Test');

  it('widenBase klappt an die Obergrenze, nie darüber', () => {
    const next = applyFix(base, { kind: 'widenBase', toMm: 99999 });
    expect(next.base.widthMm).toBe(LIMITS.baseWidthMm.max);
  });

  it('growHeight klappt an die Untergrenze, nie darunter', () => {
    const next = applyFix(base, { kind: 'growHeight', toMm: -50 });
    expect(next.base.heightMm).toBe(LIMITS.baseHeightMm.min);
  });

  it('setFabricWidth klappt in die Stoffgrenzen', () => {
    expect(applyFix(base, { kind: 'setFabricWidth', toMm: 10 }).settings.fabricWidthMm).toBe(LIMITS.fabricWidthMm.min);
    expect(applyFix(base, { kind: 'setFabricWidth', toMm: 99999 }).settings.fabricWidthMm).toBe(LIMITS.fabricWidthMm.max);
  });

  it('setParam auf unbekanntem Modul ändert nichts (Inhalt bleibt gleich)', () => {
    const next = applyFix(base, { kind: 'setParam', moduleId: 'gibts-nicht', key: 'breite', value: 123 });
    expect(next.modules).toEqual(base.modules);
  });

  it('setParam schreibt den Wert in das richtige Modul', () => {
    const inst = makeInstance('M01', 'r1');
    const p = { ...base, modules: [inst] };
    const next = applyFix(p, { kind: 'setParam', moduleId: inst.id, key: 'breite', value: 99 });
    expect(next.modules[0]!.params['breite']).toBe(99);
  });

  it('removeModule entfernt genau das eine Modul', () => {
    const a = makeInstance('M01', 'r1');
    const b = makeInstance('M02', 'r1');
    const p = { ...base, modules: [a, b] };
    expect(applyFix(p, { kind: 'removeModule', moduleId: a.id }).modules.map((m) => m.id)).toEqual([b.id]);
  });

  it('addModule ist ein No-op (Aufrufer erzeugt neue ID)', () => {
    expect(applyFix(base, { kind: 'addModule', typeId: 'M06' })).toEqual(base);
  });

  it('ist idempotent: zweimal denselben Fix wenden ändert nichts mehr', () => {
    const once = applyFix(base, { kind: 'widenBase', toMm: 260 });
    const twice = applyFix(once, { kind: 'widenBase', toMm: 260 });
    expect(twice).toEqual(once);
  });

  it('erfindet kein updatedAt: die Uhr liest der Store, nicht der Kern', () => {
    const next = applyFix(base, { kind: 'widenBase', toMm: 260 });
    expect(next.updatedAt).toBe(base.updatedAt);
  });

  it('klemmt setParam an die Feldgrenzen und ignoriert gefährliche Keys', () => {
    const inst = makeInstance('M01', 'r1');
    const p = { ...base, modules: [inst] };
    const clampedHi = applyFix(p, { kind: 'setParam', moduleId: inst.id, key: 'breite', value: 9999 });
    expect(clampedHi.modules[0]!.params['breite']).toBe(260);
    const clampedLo = applyFix(p, { kind: 'setParam', moduleId: inst.id, key: 'breite', value: 1 });
    expect(clampedLo.modules[0]!.params['breite']).toBe(20);
    const protoSafe = applyFix(p, { kind: 'setParam', moduleId: inst.id, key: '__proto__', value: 123 });
    expect(protoSafe).toBe(p);
  });
});
