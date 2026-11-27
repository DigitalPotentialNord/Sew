/**
 * 18-Punkte-Invarianten-Audit (src/core/invariants.ts).
 * Garantiert strukturelle, geometrische, Schnittteil-, Material-,
 * Stoffplan-, Bewertungs- und Determinismus-Invarianten über alle
 * Vorlagen, alle 16 Module, alle Rotationen und zufällige Projekte.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { construct, type Instance, type Project } from '../core/construction';
import { mm } from '../core/geometry';
import { assertConstructionInvariants, checkConstructionInvariants } from '../core/invariants';
import { MODULES } from '../core/modules';
import { blankProject, buildTemplate, TEMPLATES } from '../core/project';
import type { Side } from '../core/types';

type Rot = 0 | 90 | 180 | 270;

describe('Invarianten-Auditor: Vorlagen, alle 16 Module & Rotationen', () => {
  it.each(TEMPLATES)('Vorlage "$id" erfüllt alle 18 Konstruktions-Invarianten', (tpl) => {
    const p = buildTemplate(tpl.id);
    const c = construct(p);
    expect(checkConstructionInvariants(p, c)).toEqual([]);
    expect(() => assertConstructionInvariants(p, c)).not.toThrow();
  });

  it('leeres Projekt erfüllt alle Invarianten', () => {
    const p = blankProject('Leer');
    const c = construct(p);
    expect(checkConstructionInvariants(p, c)).toEqual([]);
  });

  it.each(MODULES.map((m) => m.id))('Modul %s erfüllt alle Invarianten auf beiden Seiten & allen 4 Rotationen', (typeId) => {
    const def = MODULES.find((m) => m.id === typeId)!;
    for (const side of ['left', 'right'] as const satisfies readonly Side[]) {
      for (const rotation of [0, 90, 180, 270] as const satisfies readonly Rot[]) {
        const base = blankProject(`Test-${typeId}`);
        const p: Project = {
          ...base,
          base: { ...base.base, widthMm: mm(260), heightMm: mm(300), spineWidthMm: mm(44) },
          modules: [
            {
              id: `m-${typeId}-${side}-${rotation}`,
              typeId,
              rowId: base.rows[0]!.id,
              side,
              rotation,
              locked: false,
              params: { ...def.defaults },
            },
          ],
        };
        const c = construct(p);
        const violations = checkConstructionInvariants(p, c);
        expect(violations, `${typeId} (${side}, ${rotation}°): ${JSON.stringify(violations)}`).toEqual([]);
      }
    }
  });
});

describe('Property-Based Fuzzing: 60 zufällige Projekte verletzen keine einzige Invariante', () => {
  const typeIds = MODULES.map((m) => m.id);

  const arbProject = fc
    .record({
      width: fc.integer({ min: 150, max: 340 }),
      height: fc.integer({ min: 160, max: 360 }),
      spine: fc.integer({ min: 12, max: 60 }),
      corner: fc.integer({ min: 0, max: 35 }),
      hasLining: fc.boolean(),
      sa: fc.integer({ min: 6, max: 16 }),
      fabricWidth: fc.integer({ min: 900, max: 1600 }),
      rowCount: fc.integer({ min: 1, max: 4 }),
      mods: fc.array(
        fc.record({
          typeId: fc.constantFrom(...typeIds),
          rowIdx: fc.integer({ min: 0, max: 3 }),
          side: fc.constantFrom<Side>('left', 'right'),
          rotation: fc.constantFrom<Rot>(0, 90, 180, 270),
        }),
        { minLength: 0, maxLength: 8 },
      ),
    })
    .map((cfg): Project => {
      const empty = blankProject('Fuzz');
      const rows = Array.from({ length: cfg.rowCount }, (_, i) => ({
        id: `row-${i + 1}`,
        name: `Zeile ${i + 1}`,
        heightMm: null,
        gapMm: mm(10),
      }));
      const modules: Instance[] = cfg.mods.map((m, i) => {
        const def = MODULES.find((d) => d.id === m.typeId)!;
        return {
          id: `fuzz-${i}`,
          typeId: m.typeId,
          rowId: rows[m.rowIdx % rows.length]!.id,
          side: m.side,
          rotation: m.rotation,
          locked: false,
          params: { ...def.defaults },
        };
      });
      return {
        ...empty,
        base: {
          ...empty.base,
          widthMm: mm(cfg.width),
          heightMm: mm(cfg.height),
          spineWidthMm: mm(cfg.spine),
          cornerRadiusMm: mm(cfg.corner),
          hasLining: cfg.hasLining,
        },
        settings: {
          ...empty.settings,
          seamAllowanceMm: mm(cfg.sa),
          fabricWidthMm: mm(cfg.fabricWidth),
        },
        rows,
        modules,
      };
    });

  it('alle 18 Invarianten halten für 60 zufällige Projekte', () => {
    fc.assert(
      fc.property(arbProject, (p) => {
        const c = construct(p);
        const violations = checkConstructionInvariants(p, c);
        expect(violations).toEqual([]);
      }),
      { numRuns: 60 },
    );
  });
});
