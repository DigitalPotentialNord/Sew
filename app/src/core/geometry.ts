/**
 * Geometrie-Kern — reine Mathematik, keine Domäne, kein React, kein Rendering.
 * Siehe docs/engineering/geometry-engine.md.
 *
 * Invarianten (verbindlich):
 *  - Einheit ist IMMER Millimeter, ganzzahlig (`Mm`).
 *  - y wächst nach UNTEN (SVG-Konvention).
 *  - Rundung IMMER HALF_UP über `mm()`; nie `toFixed`, nie banker's rounding.
 *  - Keine Funktion hier liest Zeit, Zufall, Locale oder Umgebung.
 */

export type Mm = number & { readonly __mm: unique symbol };

export interface Point {
  readonly x: Mm;
  readonly y: Mm;
}
export interface Rect {
  readonly x: Mm;
  readonly y: Mm;
  readonly w: Mm;
  readonly h: Mm;
}
export interface Size {
  readonly w: Mm;
  readonly h: Mm;
}

export class NonFiniteError extends Error {}

/** HALF_UP-Rundung (0.5 → weg von Null) und Fließkomma-Absicherung. */
export function mm(value: number): Mm {
  if (!Number.isFinite(value)) {
    throw new NonFiniteError(`Nicht-endlicher Wert in der Geometrie: ${value}`);
  }
  const rounded = value < 0 ? -Math.round(-value) : Math.round(value);
  // -0 normalisieren, damit Hashes stabil sind
  return (rounded === 0 ? 0 : rounded) as Mm;
}

export const asMm = (n: number): Mm => n as Mm;
export const mmToPx = (v: Mm, scale: number): number => v * scale;
export const pxToMm = (v: number, scale: number): Mm => mm(v / scale);

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
export function clampMm(value: number, min: number, max: number): Mm {
  return mm(clamp(value, min, max));
}

export const pt = (x: number, y: number): Point => ({ x: mm(x), y: mm(y) });
export const rect = (x: number, y: number, w: number, h: number): Rect => ({
  x: mm(x),
  y: mm(y),
  w: mm(w),
  h: mm(h),
});
export const size = (w: number, h: number): Size => ({ w: mm(w), h: mm(h) });

/** Exakter Offset eines Rechtecks (MVP-Verfahren, siehe geometry-engine §6.1). */
export function offsetRect(r: Rect, d: Mm): Rect {
  return { x: mm(r.x - d), y: mm(r.y - d), w: mm(r.w + 2 * d), h: mm(r.h + 2 * d) };
}

/** Exakter Offset mit Eckenradius: r' = r + d. */
export function offsetRadius(radius: Mm, d: Mm): Mm {
  return mm(radius + d);
}

export function rectRight(r: Rect): Mm {
  return mm(r.x + r.w);
}
export function rectBottom(r: Rect): Mm {
  return mm(r.y + r.h);
}
export function rectCenter(r: Rect): Point {
  return { x: mm(r.x + r.w / 2), y: mm(r.y + r.h / 2) };
}
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}
export function intersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  if (right <= x || bottom <= y) return null;
  return rect(x, y, right - x, bottom - y);
}
export function bbox(rects: readonly Rect[]): Rect {
  if (rects.length === 0) return rect(0, 0, 0, 0);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  return rect(x0, y0, x1 - x0, y1 - y0);
}

/** Shoelace — exakt für Polygone mit ganzzahligen Punkten. */
export function polygonArea(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function polygonPerimeter(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

export function rectToPolygon(r: Rect): readonly Point[] {
  return [pt(r.x, r.y), pt(r.x + r.w, r.y), pt(r.x + r.w, r.y + r.h), pt(r.x, r.y + r.h)];
}

/** Kreisbogen-Länge in mm. */
export function arcLength(radius: number, sweepDeg: number): number {
  return (Math.PI * radius * Math.abs(sweepDeg)) / 180;
}

/**
 * Baut den SVG-Pfad für ein abgerundetes Rechteck (eine der wenigen Stellen,
 * an denen Fließkomma erlaubt ist — Ausgabe, nie Eingabe).
 */
export function roundedRectPath(r: Rect, radius: number): string {
  const rad = Math.max(0, Math.min(radius, Math.min(r.w, r.h) / 2));
  if (rad === 0) return `M${r.x},${r.y} H${r.x + r.w} V${r.y + r.h} H${r.x} Z`;
  const x0 = r.x;
  const y0 = r.y;
  const x1 = r.x + r.w;
  const y1 = r.y + r.h;
  return [
    `M${x0 + rad},${y0}`,
    `H${x1 - rad}`,
    `A${rad},${rad} 0 0 1 ${x1},${y0 + rad}`,
    `V${y1 - rad}`,
    `A${rad},${rad} 0 0 1 ${x1 - rad},${y1}`,
    `H${x0 + rad}`,
    `A${rad},${rad} 0 0 1 ${x0},${y1 - rad}`,
    `V${y0 + rad}`,
    `A${rad},${rad} 0 0 1 ${x0 + rad},${y0}`,
    'Z',
  ].join(' ');
}

/** Rastet einen Wert auf das nächste Vielfache von `step`. */
export function snapTo(value: number, step: number): Mm {
  if (step <= 0) return mm(value);
  return mm(Math.round(value / step) * step);
}

/**
 * Einrasten auf Kandidatenlinien innerhalb einer Toleranz.
 * Gibt den gerasteten Wert und die getroffene Linie zurück (für Hilfslinien-Anzeige).
 */
export function snapToLines(
  value: number,
  candidates: readonly number[],
  tolerance: number,
): { value: Mm; line: number | null } {
  let best: number | null = null;
  let bestDist = tolerance;
  for (const c of candidates) {
    const d = Math.abs(c - value);
    if (d <= bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { value: mm(best ?? value), line: best };
}

/** Deterministischer, stabiler String-Hash (FNV-1a 32 bit, hex). */
export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Sortiert Punkte deterministisch (x, dann y) — für stabile Hashes. */
export function sortPoints(points: readonly Point[]): Point[] {
  return [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
}
