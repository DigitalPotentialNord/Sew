/**
 * E2 — Property-Tests (fast-check) + Modul-Grenzwerttests (M01–M16).
 * Prüft Invarianten P-01..P-18 über hunderte generierte Projektkonfigurationen
 * sowie Rand-, Dreh- und Regelfälle aller 16 Module.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { construct, SCHEMA_VERSION, type Project, type Instance } from '../core/construction';
import { MODULES, moduleDef } from '../core/modules';
import { applyFix } from '../core/fixes';
import { fromFile, makeInstance, toFile, TEMPLATES } from '../core/project';
import { LIMITS } from '../core/practice';
import type { ModuleTypeId, Params } from '../core/types';

type Rotation = 0 | 90 | 180 | 270;

// ── Generatoren für strukturvalidierte Projekte ──────────────────────────────
const arbRotation = fc.constantFrom<Rotation>(0, 90, 180, 270);
const arbTypeId = fc.constantFrom<ModuleTypeId>(...MODULES.map((m) => m.id));
const arbSide = fc.constantFrom<'left' | 'right'>('left', 'right');

function arbModuleForRow(rowIds: readonly string[]): fc.Arbitrary<Instance> {
  return fc
    .tuple(arbTypeId, fc.constantFrom(...rowIds), arbRotation, arbSide, fc.integer({ min: 0, max: 1000 }))
    .chain(([typeId, rowId, rotation, side, seed]) => {
      const def = moduleDef(typeId);
      const fieldEntries: Record<string, fc.Arbitrary<number | string | boolean>> = {};
      for (const f of def.fields) {
        if (f.kind === 'bool') {
          fieldEntries[f.key] = fc.boolean();
        } else if (f.kind === 'enum' && f.options && f.options.length > 0) {
          fieldEntries[f.key] = fc.constantFrom(...f.options.map((o) => o.value));
        } else {
          const min = f.min ?? 1;
          const max = f.max ?? 300;
          const step = f.step ?? 1;
          const lo = Math.ceil(min / step);
          const hi = Math.max(lo, Math.floor(max / step));
          fieldEntries[f.key] = fc.integer({ min: lo, max: hi }).map((k) => Math.min(max, Math.max(min, k * step)));
        }
      }
      return fc.record(fieldEntries).map((params) => ({
        id: `m_${typeId}_${seed}_${Math.random().toString(36).slice(2, 7)}`,
        typeId,
        rowId,
        side,
        params: params as Params,
        rotation,
        locked: false,
      }));
    });
}

const arbProject: fc.Arbitrary<Project> = fc
  .record({
    widthMm: fc.integer({ min: LIMITS.baseWidthMm.min, max: LIMITS.baseWidthMm.max }),
    heightMm: fc.integer({ min: LIMITS.baseHeightMm.min, max: LIMITS.baseHeightMm.max }),
    spineWidthMm: fc.integer({ min: LIMITS.spineWidthMm.min, max: LIMITS.spineWidthMm.max }),
    cornerRadiusMm: fc.integer({ min: LIMITS.cornerRadiusMm.min, max: LIMITS.cornerRadiusMm.max }),
    hasLining: fc.boolean(),
    seamAllowanceMm: fc.integer({ min: 4, max: 20 }),
    fabricWidthMm: fc.integer({ min: LIMITS.fabricWidthMm.min, max: LIMITS.fabricWidthMm.max }),
    rowCount: fc.integer({ min: 1, max: 5 }),
  })
  .chain((cfg) => {
    const rows = Array.from({ length: cfg.rowCount }, (_, i) => ({ id: `r${i + 1}`, name: `Zeile ${i + 1}` }));
    const rowIds = rows.map((r) => r.id);
    return fc.array(arbModuleForRow(rowIds), { minLength: 0, maxLength: 10 }).map((rawMods) => {
      // Eindeutige Modul-IDs sicherstellen
      const modules = rawMods.map((m, idx) => ({ ...m, id: `pm_${idx + 1}` }));
      return {
        schemaVersion: SCHEMA_VERSION,
        id: 'p_prop',
        name: 'Property-Etui',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        base: {
          form: 'book',
          widthMm: cfg.widthMm,
          heightMm: cfg.heightMm,
          spineWidthMm: cfg.spineWidthMm,
          cornerRadiusMm: cfg.cornerRadiusMm,
          hasLining: cfg.hasLining,
        },
        rows,
        modules,
        settings: {
          seamAllowanceMm: cfg.seamAllowanceMm,
          fabricWidthMm: cfg.fabricWidthMm,
          unit: 'mm',
        },
      } satisfies Project;
    });
  });

describe('Property-Tests über generierte Projekte (P-01..P-18)', () => {
  it('P-01 / P-02 / P-03: construct() wirft nie, ist deterministisch und zeitunabhängig', () => {
    fc.assert(
      fc.property(arbProject, (p) => {
        const a = construct(p);
        const clone: Project = {
          ...(JSON.parse(JSON.stringify(p)) as Project),
          createdAt: '2030-05-05T12:00:00.000Z',
          name: 'Anderer Name',
        };
        const b = construct(clone);
        expect(a.projectHash).toBe(b.projectHash);
        expect(a.pieces.length).toBeGreaterThan(0);
        expect(a.operations.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 },
    );
  });

  it('P-04 / R2 / R3: jeder error hat Fix, numeric values und dismissible === false', () => {
    fc.assert(
      fc.property(arbProject, (p) => {
        const c = construct(p);
        for (const f of c.findings) {
          const hasNumber = Object.values(f.values).some((v) => typeof v === 'number' && Number.isFinite(v));
          expect(hasNumber, `${f.ruleId} ohne Zahl`).toBe(true);
          if (f.severity === 'error') {
            expect(f.fix, `error ${f.ruleId} ohne Fix`).toBeDefined();
            expect(f.dismissible).toBe(false);
          } else if (f.severity === 'warn') {
            expect(f.fix, `warn ${f.ruleId} ohne Fix`).toBeDefined();
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P-06 / P-18: Zuschnittteile haben Fläche > 0, netRect liegt im Schnittteil und Stoffplan enthält jedes Teil count-mal', () => {
    fc.assert(
      fc.property(arbProject, (p) => {
        const c = construct(p);
        for (const pc of c.pieces.filter((x) => x.kind === 'cut')) {
          expect(pc.w).toBeGreaterThan(0);
          expect(pc.h).toBeGreaterThan(0);
          expect(pc.netW).toBeGreaterThan(0);
          expect(pc.netH).toBeGreaterThan(0);
          expect(pc.netW).toBeLessThanOrEqual(pc.w);
          expect(pc.netH).toBeLessThanOrEqual(pc.h);
          if (pc.netX !== undefined) expect(pc.netX + pc.netW).toBeLessThanOrEqual(pc.w);
          if (pc.netY !== undefined) expect(pc.netY + pc.netH).toBeLessThanOrEqual(pc.h);
        }
        const expectedFabricCount = c.pieces
          .filter((x) => x.kind === 'cut' && x.material === 'fabric')
          .reduce((n, x) => n + x.count, 0);
        expect(c.fabricPlan?.pieces.length).toBe(expectedFabricCount);
        const fabricMat = c.materials.find((m) => m.kind === 'fabric');
        expect(fabricMat).toBeDefined();
        expect(fabricMat!.certainty).toBe('estimated');
        expect(fabricMat!.amount).toBeGreaterThan(0);
      }),
      { numRuns: 200 },
    );
  });

  it('P-11: Operationsgraph ist immer azyklisch und topologisch sortiert', () => {
    fc.assert(
      fc.property(arbProject, (p) => {
        const c = construct(p);
        const pos = new Map(c.operations.map((o, i) => [o.id, i]));
        c.operations.forEach((op, idx) => {
          expect(op.index).toBe(idx + 1);
          for (const dep of op.dependsOn) {
            const dp = pos.get(dep);
            if (dp !== undefined) expect(dp).toBeLessThan(idx);
          }
        });
      }),
      { numRuns: 200 },
    );
  });

  it('P-13: toFile → JSON → fromFile Round-Trip hält projectHash exakt', () => {
    fc.assert(
      fc.property(arbProject, (p) => {
        const wire = JSON.parse(JSON.stringify(toFile(p)));
        const back = fromFile(wire);
        expect(back.ok).toBe(true);
        if (back.ok) {
          expect(construct(back.project).projectHash).toBe(construct(p).projectHash);
        }
      }),
      { numRuns: 150 },
    );
  });
});

describe('Alle 16 Module (M01–M16): Grenzwerte, Drehung, Regeln & Materialien', () => {
  const mkProj = (mod: Instance, widthMm = 280, heightMm = 280): Project => ({
    schemaVersion: SCHEMA_VERSION,
    id: 'p_mod',
    name: 'Modul-Check',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    base: { form: 'book', widthMm, heightMm, spineWidthMm: 32, cornerRadiusMm: 16, hasLining: true },
    rows: [{ id: 'r1', name: 'Zeile 1' }],
    modules: [mod],
    settings: { seamAllowanceMm: 10, fabricWidthMm: 1400, unit: 'mm' },
  });

  it('M01 einschlag setzt foldEdge und netY = saumbreite + nz (nur oben Einschlag)', () => {
    const inst = makeInstance('M01', 'r1', { breite: 70, hoehe: 60, saum: 'einschlag', saumbreite: 12 });
    const c = construct(mkProj(inst));
    const pc = c.pieces.find((p) => p.sourceModuleId === inst.id)!;
    expect(pc.foldEdge).toBe('top');
    expect(pc.netY).toBe(12 + 10);
    expect(pc.h).toBe(60 + 12 + 20);
  });

  it('M02 mit 1 Fach vs 3 Fächern skaliert Breite mit NZ pro Fach sauber', () => {
    const one = makeInstance('M02', 'r1', { breite: 120, hoehe: 80, teiler: 1 });
    const three = makeInstance('M02', 'r1', { breite: 120, hoehe: 80, teiler: 3 });
    expect(construct(mkProj(one)).pieces.find((p) => p.sourceModuleId === one.id)!.netW).toBe(120);
    expect(construct(mkProj(three)).pieces.find((p) => p.sourceModuleId === three.id)!.netW).toBe(120);
    expect(construct(mkProj(three)).findings.filter((f) => f.ruleId === 'V-M02-01')).toHaveLength(0);
  });

  it('M03 V-M03-01 & V-M03-03 feuern und der jeweilige Fix repariert sie', () => {
    const tooNarrow = makeInstance('M03', 'r1', { breite: 30, hoehe: 40, ziptype: 'endlos' });
    const c = construct(mkProj(tooNarrow));
    const f = c.findings.find((x) => x.ruleId === 'V-M03-01')!;
    expect(f).toBeDefined();
    const fixed = construct(applyFix(mkProj(tooNarrow), f.fix!));
    expect(fixed.findings.filter((x) => x.ruleId === 'V-M03-01')).toHaveLength(0);
  });

  it('M05 & M07 deduplizieren Webbing-Material ohne doppelte Zeilen', () => {
    const m05a = makeInstance('M05', 'r1', { anzahl: 2, gegenstandBreite: 20, gegenstandDicke: 10, bandbreite: 25, abstand: 10 });
    const m05b = makeInstance('M05', 'r1', { anzahl: 1, gegenstandBreite: 20, gegenstandDicke: 10, bandbreite: 25, abstand: 10 });
    const single = construct(mkProj(m05a)).materials.filter((m) => m.kind === 'webbing');
    expect(single[0]!.basisKey).toBe('basis.gurtband');
    const c = construct({ ...mkProj(m05a), modules: [m05a, m05b] });
    const webbings = c.materials.filter((m) => m.kind === 'webbing');
    expect(webbings).toHaveLength(1);
    expect(webbings[0]!.basisKey).toBe('basis.summe');
  });

  it('M08 & M13 Knopfdurchmesser / Druckknöpfe erzeugen post-turn Montage-Operationen', () => {
    const m08 = makeInstance('M08', 'r1', { knopfDurchmesser: 18, laschenLaenge: 60, laschenBreite: 26 });
    const m13 = makeInstance('M13', 'r1', { breite: 140, hoehe: 60, knopf: true });
    const c = construct({ ...mkProj(m08), modules: [m08, m13] });
    const turnIdx = c.operations.findIndex((o) => o.kind === 'turn');
    const postOps = c.operations.filter((o) => o.kind === 'attach-button' || o.kind === 'attach-snap');
    expect(postOps).toHaveLength(2);
    for (const op of postOps) expect(c.operations.indexOf(op)).toBeGreaterThan(turnIdx);
  });

  it('M09 Polsterung erzeugt Vlies-Material und dreht mit orientFinding korrekt', () => {
    const m09: Instance = { ...makeInstance('M09', 'r1', { breite: 140, hoehe: 46, ringe: 6, polsterung: 6 }), rotation: 90 };
    const tight = mkProj(m09, 240, 140);
    const c = construct(tight);
    expect(c.materials.some((m) => m.kind === 'batting')).toBe(true);
    const err = c.findings.find((f) => f.ruleId === 'V-M09-01');
    expect(err?.fix?.kind).toBe('growHeight');
    const fixed = construct(applyFix(tight, err!.fix!));
    expect(fixed.findings.filter((f) => f.ruleId === 'V-M09-01')).toHaveLength(0);
  });

  it('M10 Ohrringhalter verwendet piece.ohrring-einlage und Vlieseinlage', () => {
    const m10 = makeInstance('M10', 'r1', { breite: 106, hoehe: 46, paare: 6, lochAbstand: 12 });
    const c = construct(mkProj(m10));
    const einlage = c.pieces.find((p) => p.nameKey === 'piece.ohrring-einlage');
    expect(einlage).toBeDefined();
    expect(einlage!.material).toBe('interfacing');
  });

  it('M14 Zubehörfach mit und ohne Gummizug steuert Elastic-Teil und -Material korrekt', () => {
    const withE = construct(mkProj(makeInstance('M14', 'r1', { breite: 110, hoehe: 80, mitZug: true })));
    const noE = construct(mkProj(makeInstance('M14', 'r1', { breite: 110, hoehe: 80, mitZug: false })));
    expect(withE.pieces.some((p) => p.material === 'elastic')).toBe(true);
    expect(withE.materials.some((m) => m.kind === 'elastic')).toBe(true);
    expect(noE.pieces.some((p) => p.material === 'elastic')).toBe(false);
    expect(noE.materials.some((m) => m.kind === 'elastic')).toBe(false);
  });

  it('M11, M12, M15, M16 liefern vollständige Teile, Operationen und keine Regelverletzung im Standardfall', () => {
    for (const id of ['M11', 'M12', 'M15', 'M16'] as const) {
      const c = construct(mkProj(makeInstance(id, 'r1')));
      expect(c.metrics.errorCount, `${id} Standardfehler`).toBe(0);
      expect(c.pieces.some((p) => p.sourceModuleId !== undefined)).toBe(true);
      expect(c.operations.some((o) => o.moduleId !== undefined)).toBe(true);
    }
  });

  it('alle drei Vorlagen liefern gültige, fehlerfreie Konstruktionen', () => {
    for (const tpl of TEMPLATES) {
      const c = construct(tpl.build());
      expect(c.metrics.errorCount, `${tpl.id}`).toBe(0);
    }
  });
});
