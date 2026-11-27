/** #12: Platzierung der schwebenden Kontext-Aktionsleiste (.ctx-bar). */
import { describe, expect, it } from 'vitest';
import { chooseContextBarPlacement, CONTEXT_BAR_H, CONTEXT_BAR_MIN, CONTEXT_BAR_W } from '../ui/contextBar';

const anchor = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

describe('chooseContextBarPlacement', () => {
  it('platziert oberhalb, wenn dort Platz ist', () => {
    const p = chooseContextBarPlacement(anchor(100, 200, 120, 60), [], 800);
    expect(p.side).toBe('above');
    expect(p.top).toBe(200 - 8 - CONTEXT_BAR_H);
  });

  it('rückt bei erster Zeile an den oberen Rand, statt in die zweite Zeile zu kippen', () => {
    // Auswahl am oberen Rand: oberhalb wäre abgeschnitten → Klammer auf MIN,
    // aber NICHT unter die Auswahl (verdeckt sonst die Zeile darunter).
    const sel = anchor(300, 52, 60, 40);
    const row2 = anchor(280, 92, 140, 60);
    const p = chooseContextBarPlacement(sel, [row2], 900);
    expect(p.side).toBe('above');
    expect(p.top).toBe(CONTEXT_BAR_MIN);
    // Die Leiste darf das fremde Modul in Zeile 2 nicht überdecken
    const bar = { x: p.left, y: p.top, w: CONTEXT_BAR_W, h: CONTEXT_BAR_H };
    const overlapY = Math.max(0, Math.min(bar.y + bar.h, row2.y + row2.h) - Math.max(bar.y, row2.y));
    expect(overlapY).toBe(0);
  });

  it('wählt unterhalb, wenn oberhalb ein fremdes Modul liegt und unten frei ist', () => {
    const sel = anchor(300, 200, 100, 40);
    const above = anchor(280, 152, 200, 30); // liegt genau in der Oberhalb-Zone
    const p = chooseContextBarPlacement(sel, [above], 900);
    expect(p.side).toBe('below');
    expect(p.top).toBe(200 + 40 + 8);
  });

  it('bleibt bei beidseitiger Kollision oberhalb (kein neues Abweichen nach unten)', () => {
    const sel = anchor(300, 200, 100, 40);
    const above = anchor(280, 152, 200, 30);
    const below = anchor(280, 248, 200, 30);
    const p = chooseContextBarPlacement(sel, [above, below], 900);
    expect(p.side).toBe('above');
  });

  it('zentriert auf die Auswahl und klammert am Canvasrand', () => {
    const p = chooseContextBarPlacement(anchor(0, 100, 40, 40), [], 320);
    expect(p.left).toBe(CONTEXT_BAR_MIN);
    const q = chooseContextBarPlacement(anchor(280, 100, 40, 40), [], 320);
    expect(q.left).toBe(320 - CONTEXT_BAR_W - CONTEXT_BAR_MIN);
  });

  it('die ausgewählte Instanz zählt nicht als „fremdes Modul“', () => {
    // Nur das ausgewählte Modul direkt darüber → oberhalb bleibt gültig.
    const sel = anchor(100, 120, 120, 50);
    const p = chooseContextBarPlacement(sel, [], 800);
    expect(p.side).toBe('above');
  });
});
