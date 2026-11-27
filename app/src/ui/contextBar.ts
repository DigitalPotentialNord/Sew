/**
 * Reine Platzierungslogik für die schwebende Kontext-Aktionsleiste (.ctx-bar).
 *
 * Regel (Issue #12): es gewinnt die Seite (oberhalb/unterhalb der Auswahl) mit
 * der GERINGEREN Überdeckung FREMDER Module. Die Leiste ist 280 px breit und
 * auf die Auswahl zentriert (am Canvas geklammert) — bei schmalen Modulen
 * überdecken sich Leiste und Nachbarmodule also horizontal gern. Oberhalb der
 * ersten Zeile ist dagegen fast immer Platz. `above` hat — bei Gleichstand oder
 * wenn nichts überdeckt wird — Vorrang, weil oben gelesen wird.
 */
export interface PixelRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface ContextBarPlacement {
  readonly left: number;
  readonly top: number;
  readonly side: 'above' | 'below';
}

export const CONTEXT_BAR_W = 280;
export const CONTEXT_BAR_H = 44;
export const CONTEXT_BAR_GAP = 8;
export const CONTEXT_BAR_MIN = 8;

const intersectionArea = (a: PixelRect, b: PixelRect): number => {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
};

export function chooseContextBarPlacement(
  anchor: PixelRect,
  others: readonly PixelRect[],
  wrapWidth: number,
): ContextBarPlacement {
  const center = anchor.x + anchor.w / 2;
  const left = Math.max(CONTEXT_BAR_MIN, Math.min(wrapWidth - CONTEXT_BAR_W - CONTEXT_BAR_MIN, center - CONTEXT_BAR_W / 2));
  const aboveTop = anchor.y - CONTEXT_BAR_GAP - CONTEXT_BAR_H;
  const belowTop = anchor.y + anchor.h + CONTEXT_BAR_GAP;
  const candidates = (['above', 'below'] as const).map((side) => {
    const top = side === 'above' ? Math.max(CONTEXT_BAR_MIN, aboveTop) : belowTop;
    const bar: PixelRect = { x: left, y: top, w: CONTEXT_BAR_W, h: CONTEXT_BAR_H };
    const overlap = others.reduce((acc, o) => acc + intersectionArea(bar, o), 0);
    return { side, top, overlap };
  });
  const [above, below] = candidates as [(typeof candidates)[number], (typeof candidates)[number]];
  // Überschneidungs-Score entscheidet; Gleichstand → oberhalb.
  if (above.overlap !== below.overlap) {
    return { left, top: (above.overlap < below.overlap ? above : below).top, side: above.overlap < below.overlap ? 'above' : 'below' };
  }
  return { left, top: above.top, side: 'above' };
}
