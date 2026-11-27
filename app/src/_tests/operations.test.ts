/**
 * Issue #20 — Anleitung: Phasen- und Schrittfolge.
 * „Zuschnitt“ muss vor „Vorbereitung“ stehen, die Schrittnummern müssen über
 * alle Phasen hinweg zusammenhängend sein, und M03s `op.topstitch-zip` gehört
 * zu „Nähreihenfolge“ (nicht „Fertigstellung“), vor der Panelmontage.
 */
import { describe, expect, it } from 'vitest';
import { construct, PHASE_ORDER } from '../core/construction';
import { buildTemplate } from '../core/project';

describe('PHASE_ORDER und Topologische Sortierung (Issue #20)', () => {
  it('PHASE_ORDER beginnt mit cut und endet mit finish', () => {
    expect(PHASE_ORDER[0]).toBe('cut');
    expect(PHASE_ORDER[PHASE_ORDER.length - 1]).toBe('finish');
  });

  it('die Phasen der Operationen sind nicht-absteigend in PHASE_ORDER', () => {
    for (const tpl of ['schmuck', 'makeup', 'strick'] as const) {
      const c = construct(buildTemplate(tpl));
      const rank = c.operations.map((o) => PHASE_ORDER.indexOf(o.phase));
      for (let i = 1; i < rank.length; i++) {
        expect(rank[i]!, `${tpl}: Phase von ${c.operations[i]!.id} steht vor einem früheren Step`).toBeGreaterThanOrEqual(rank[i - 1]!);
      }
    }
  });

  it('Zuschnitt (op-cut) ist Schritt 1', () => {
    const c = construct(buildTemplate('strick'));
    expect(c.operations[0]!.kind).toBe('cut');
    expect(c.operations[0]!.index).toBe(1);
  });

  it('Schnittindex läuft lückenlos von 1 bis n', () => {
    const c = construct(buildTemplate('makeup'));
    c.operations.forEach((op, i) => expect(op.index).toBe(i + 1));
  });

  it('M03: op.topstitch-zip ist Nähreihenfolge und liegt vor der Panelmontage (close-panel)', () => {
    for (const tpl of ['schmuck', 'makeup'] as const) {
      const c = construct(buildTemplate(tpl));
      const zip = c.operations.find((o) => o.titleKey === 'op.topstitch-zip')!;
      expect(zip.phase, `${tpl}: topstitch-zip Phase`).toBe('sew-order');
      const close = c.operations.find((o) => o.kind === 'close-panel')!;
      expect(zip.index, `${tpl}: topstitch-zip vor Montage`).toBeLessThan(close.index);
    }
  });

  it('das Absteppen des Panels (op-topstitch) bleibt in Fertigstellung', () => {
    const c = construct(buildTemplate('makeup'));
    const panel = c.operations.find((o) => o.id === 'op-topstitch')!;
    expect(panel.phase).toBe('finish');
    const close = c.operations.find((o) => o.kind === 'close-panel')!;
    expect(close.phase).toBe('assemble');
  });

  it('Vorbereitungsschritte (fuse/press/mark) kommen nach Zuschnitt und vor Nähreihenfolge', () => {
    const c = construct(buildTemplate('strick'));
    const first = c.operations.findIndex((o) => o.phase === 'prepare');
    const last = c.operations.map((o) => o.phase).lastIndexOf('prepare');
    const firstSew = c.operations.findIndex((o) => o.phase === 'sew-order');
    expect(first).toBeGreaterThan(0); // nach cut
    if (firstSew >= 0) expect(last).toBeLessThan(firstSew);
  });
});
