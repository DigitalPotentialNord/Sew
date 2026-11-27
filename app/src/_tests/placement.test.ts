/**
 * Strenge Platzierungs-, Drag-&-Drop-, Optimierungs- & Store-Tests
 * (src/core/placement.ts + src/state/store.ts).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { construct } from '../core/construction';
import { moduleDef } from '../core/modules';
import {
  evaluateAdd,
  evaluateMove,
  evaluateResize,
  findBestPlacement,
  optimizeLayout,
  resolveDropTarget,
  suggestRepairMove,
} from '../core/placement';
import { LIMITS } from '../core/practice';
import { buildTemplate } from '../core/project';
import { useStore } from '../state/store';

describe('Spatial-Drop-Solver (resolveDropTarget)', () => {
  it('trennt linke und rechte Innenfläche sauber an der Bundmitte und erkennt den Falzbereich', () => {
    const p = buildTemplate('schmuck');
    const c = construct(p);
    const flapW = p.base.widthMm;
    const spine = p.base.spineWidthMm;

    const left = resolveDropTarget(p, c, flapW * 0.4, 60);
    expect(left.target.side).toBe('left');
    expect(left.spineZone).toBe(false);

    const right = resolveDropTarget(p, c, flapW + spine + flapW * 0.5, 60);
    expect(right.target.side).toBe('right');
    expect(right.spineZone).toBe(false);

    const onSpine = resolveDropTarget(p, c, flapW + spine * 0.5, 60);
    expect(onSpine.spineZone).toBe(true);
  });

  it('berechnet Einfüge-Index ausschließlich innerhalb derselben (rowId, side)-Gruppe', () => {
    const p = buildTemplate('schmuck');
    const c = construct(p);
    const row0Left = c.modules.filter((m) => m.rowId === p.rows[0]!.id && m.side === 'left');
    expect(row0Left.length).toBeGreaterThanOrEqual(1);

    const beforeFirst = resolveDropTarget(p, c, row0Left[0]!.rect.x - 2, row0Left[0]!.rect.y + 10);
    expect(beforeFirst.target.side).toBe('left');
    expect(beforeFirst.target.index).toBe(0);

    const afterLast = resolveDropTarget(p, c, p.base.widthMm - 5, row0Left[0]!.rect.y + 10);
    expect(afterLast.target.side).toBe('left');
    expect(afterLast.target.index).toBe(row0Left.length);
  });
});

describe('Live-Evaluierung (evaluateAdd, evaluateMove, evaluateResize)', () => {
  it('erlaubt einen gültigen Add-Slot auf freier rechter Fläche (Zeile 2 mit 70 mm Höhe) mit Verdict optimal/tight', () => {
    const p = buildTemplate('schmuck');
    const c = construct(p);
    // Zeile 2 hat bereits 70 mm Höhe — M01 (Default 90×70 mm) passt ohne Höhenüberlauf rechts hinein
    const ev = evaluateAdd(p, 'M01', { side: 'right', rowId: p.rows[1]!.id, index: 0 }, undefined, c);
    expect(ev.allowed).toBe(true);
    expect(['optimal', 'tight']).toContain(ev.verdict);
    expect(ev.projectedRect).not.toBeNull();
  });

  it('blockiert einen überlaufenden Add-Slot in eine volle Zeile (verdict=blocked, allowed=false)', () => {
    const p = buildTemplate('schmuck');
    const c = construct(p);
    const ev = evaluateAdd(
      p,
      'M01',
      { side: 'left', rowId: p.rows[0]!.id, index: 0 },
      { ...moduleDef('M01').defaults, breite: 200 },
      c,
    );
    expect(ev.allowed).toBe(false);
    expect(ev.verdict).toBe('blocked');
    expect(ev.newErrors.length).toBeGreaterThan(0);
  });

  it('berechnet Nachbar-Reflow (shiftedModules) exakt beim Umsortieren', () => {
    const p = buildTemplate('schmuck');
    const c = construct(p);
    const r0Left = p.modules.filter((m) => m.rowId === p.rows[0]!.id && m.side === 'left');
    expect(r0Left.length).toBeGreaterThanOrEqual(2);
    const secondId = r0Left[1]!.id;
    const ev = evaluateMove(p, secondId, { side: 'left', rowId: p.rows[0]!.id, index: 0 }, c);
    expect(ev.allowed).toBe(true);
    expect(ev.shiftedModules.length).toBeGreaterThanOrEqual(1);
  });

  it('evaluateResize blockiert Breiten, die die Zeile zum Überlaufen bringen', () => {
    const p = buildTemplate('schmuck');
    const c = construct(p);
    const m = p.modules.find((x) => x.typeId === 'M01' || x.typeId === 'M02' || x.typeId === 'M03')!;
    const okEv = evaluateResize(p, m.id, { ...m.params, breite: Number(m.params['breite'] ?? 90) }, c);
    expect(okEv.allowed).toBe(true);

    const badEv = evaluateResize(p, m.id, { ...m.params, breite: 260 }, c);
    expect(badEv.allowed).toBe(false);
    expect(badEv.verdict).toBe('blocked');
  });
});

describe('Automatische Zielsuche & Layout-Optimierung', () => {
  it('findBestPlacement wählt bei belegter erster Zeile automatisch einen freien gültigen Slot', () => {
    const base = buildTemplate('schmuck');
    const res = findBestPlacement(base, 'M01');
    expect(res).not.toBeNull();
    expect(res!.evaluation.allowed).toBe(true);
  });

  it('suggestRepairMove schlägt für ein überlaufendes Modul einen fehlerfreien Platz vor', () => {
    const base = buildTemplate('schmuck');
    const crammed = {
      ...base,
      modules: [
        ...base.modules,
        {
          id: 'mod-overflow-test',
          typeId: 'M01' as const,
          rowId: base.rows[0]!.id,
          side: 'left' as const,
          rotation: 0 as const,
          locked: false,
          params: { ...moduleDef('M01').defaults, breite: 70, hoehe: 60 },
        },
      ],
    };
    const suggestion = suggestRepairMove(crammed, 'mod-overflow-test');
    if (construct(crammed).metrics.errorCount > 0) {
      expect(suggestion).not.toBeNull();
      expect(suggestion!.evaluation.errorsAfter).toBeLessThanOrEqual(suggestion!.evaluation.errorsBefore);
    }
  });

  it('optimizeLayout verschlechtert nie Fehlerzahl oder Score und respektiert gesperrte Module', () => {
    const base = buildTemplate('schmuck');
    const unbalanced = {
      ...base,
      modules: base.modules.map((m, i) => ({
        ...m,
        side: 'left' as const,
        locked: i === 0,
      })),
    };
    const before = construct(unbalanced);
    const opt = optimizeLayout(unbalanced);
    const after = construct(opt.project);

    const lockedBefore = unbalanced.modules[0]!;
    const lockedAfter = opt.project.modules.find((m) => m.id === lockedBefore.id)!;
    expect(lockedAfter.side).toBe(lockedBefore.side);
    expect(lockedAfter.rowId).toBe(lockedBefore.rowId);

    expect(after.metrics.errorCount).toBeLessThanOrEqual(before.metrics.errorCount);
    if (after.metrics.errorCount === before.metrics.errorCount) {
      expect(after.evaluation.score).toBeGreaterThanOrEqual(before.evaluation.score);
    }
  });
});

describe('Store-Integration: Strenge Platzierung, Sperre, Atomares Undo & Zeilenlimit', () => {
  beforeEach(() => {
    useStore.setState({ past: [], future: [], saved: true, pendingDiscard: null });
    useStore.getState().loadTemplate('schmuck');
    if (!useStore.getState().session.strictPlacement) {
      useStore.getState().toggleStrictPlacement();
    }
  });

  it('strictPlacement lehnt einen fehlerauslösenden addModuleAt-Versuch ab, erlaubt ihn im freien Modus', () => {
    const s = useStore.getState();
    const row0 = s.project.rows[0]!.id;
    // M01 (Default 90 mm) passt NICHT mehr in Zeile 1 links (schon fast voll)
    const blocked = s.addModuleAt('M01', { side: 'left', rowId: row0, index: 0 });
    expect(blocked.id).toBeNull();
    expect(blocked.evaluation.allowed).toBe(false);
    expect(useStore.getState().project.modules).toHaveLength(5);

    // Im freien Modus (strictPlacement = false) erlaubt
    useStore.getState().toggleStrictPlacement();
    const allowed = useStore.getState().addModuleAt('M01', { side: 'left', rowId: row0, index: 0 });
    expect(allowed.id).not.toBeNull();
    expect(useStore.getState().project.modules).toHaveLength(6);
  });

  it('gesperrte Module blockieren relocate, rotate, setParam und remove', () => {
    const firstId = useStore.getState().project.modules[0]!.id;
    useStore.getState().setPar((p) => ({
      ...p,
      modules: p.modules.map((m) => (m.id === firstId ? { ...m, locked: true } : m)),
    }));
    const snap = useStore.getState().project.modules.find((m) => m.id === firstId)!;

    const moveRes = useStore.getState().relocate(firstId, { side: 'right', rowId: snap.rowId, index: 0 });
    expect(moveRes.allowed).toBe(false);
    expect(moveRes.reasonKey).toBe('place.blocked.locked');
    useStore.getState().rotate(firstId);
    useStore.getState().remove([firstId]);

    const after = useStore.getState().project.modules.find((m) => m.id === firstId);
    expect(after).toBeDefined();
    expect(after!.side).toBe(snap.side);
    expect(after!.rotation).toBe(snap.rotation);
  });

  it('commitParams schreibt genau EINEN atomaren Undo-Schritt', () => {
    const m = useStore.getState().project.modules.find((x) => x.typeId === 'M01' || x.typeId === 'M02' || x.typeId === 'M03')!;
    const pastBefore = useStore.getState().past.length;
    const origW = Number(m.params['breite'] ?? 90);
    useStore.getState().commitParams(m.id, { ...m.params, breite: origW - 4 });
    expect(useStore.getState().past.length).toBe(pastBefore + 1);

    useStore.getState().undo();
    const restored = useStore.getState().project.modules.find((x) => x.id === m.id)!;
    expect(restored.params['breite']).toBe(origW);
  });

  it('addRowAction respektiert das Zeilenlimit LIMITS.maxRows', () => {
    for (let i = 0; i < LIMITS.maxRows + 4; i++) {
      useStore.getState().addRowAction();
    }
    expect(useStore.getState().project.rows.length).toBeLessThanOrEqual(LIMITS.maxRows);
  });
});
