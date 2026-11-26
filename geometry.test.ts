/** T-G: Geometrie-Kern. Rundung, Offset, Flächen, Determinismus. */
import { describe, it, expect } from 'vitest';
import {
  mm,
  offsetRect,
  offsetRadius,
  polygonArea,
  polygonPerimeter,
  rect,
  rectsOverlap,
  rectContains,
  intersection,
  bbox,
  roundedRectPath,
  snapTo,
  hashString,
  rectToPolygon,
  NonFiniteError,
  clamp,
  clampMm,
  arcLength,
} from '../core/geometry';

describe('mm() — HALF_UP-Rundung, keine Fließkomma-Reste', () => {
  it('rundet 0.5 weg von Null (HALF_UP, nicht banker\'s)', () => {
    expect(mm(0.5)).toBe(1);
    expect(mm(1.5)).toBe(2);
    expect(mm(2.5)).toBe(3);
    expect(mm(-0.5)).toBe(-1);
    expect(mm(-1.5)).toBe(-2);
  });

  it('rundet 0.4999 auf 0', () => {
    expect(mm(0.4999)).toBe(0);
    expect(mm(-0.4999)).toBe(0);
  });

  it('normalisiert -0 zu 0 (Hash-Stabilität)', () => {
    expect(Object.is(mm(-0.2), 0)).toBe(true);
  });

  it('wirft bei NaN und Infinity', () => {
    expect(() => mm(NaN)).toThrow(NonFiniteError);
    expect(() => mm(Infinity)).toThrow(NonFiniteError);
  });

  it('ist idempotent', () => {
    for (const v of [0, 1, 2.4, 99.5, -7.5, 1234.5678]) {
      expect(mm(mm(v))).toBe(mm(v));
    }
  });
});

describe('offsetRect — exakter Rechteck-Offset (MVP-Verfahren)', () => {
  it('erweitert um d auf allen Seiten', () => {
    const r = offsetRect(rect(0, 0, 100, 50), mm(10));
    expect([r.x, r.y, r.w, r.h]).toEqual([-10, -10, 120, 70]);
  });

  it('bleibt bei d=0 unverändert', () => {
    const r = offsetRect(rect(5, 7, 20, 30), mm(0));
    expect([r.x, r.y, r.w, r.h]).toEqual([5, 7, 20, 30]);
  });

  it('verkleinert bei negativem Offset', () => {
    const r = offsetRect(rect(0, 0, 100, 60), mm(-10));
    expect([r.x, r.y, r.w, r.h]).toEqual([10, 10, 80, 40]);
  });

  it('offsetRadius addiert d (Eckenradius)', () => {
    expect(offsetRadius(mm(20), mm(10))).toBe(30);
  });
});

describe('Flächen und Umfänge', () => {
  it('Rechteckfläche ist exakt', () => {
    expect(polygonArea(rectToPolygon(rect(0, 0, 260, 230)))).toBe(260 * 230);
  });

  it('Rechteckumfang ist exakt', () => {
    expect(polygonPerimeter(rectToPolygon(rect(0, 0, 100, 50)))).toBe(300);
  });

  it('Fläche ist unabhängig von der Umlaufrichtung', () => {
    const pts = rectToPolygon(rect(0, 0, 10, 20));
    expect(polygonArea(pts)).toBe(polygonArea([...pts].reverse()));
  });

  it('Dreieck: 3-4-5', () => {
    expect(polygonArea([{ x: mm(0), y: mm(0) }, { x: mm(40), y: mm(0) }, { x: mm(0), y: mm(30) }])).toBe(600);
  });

  it('arcLength: Halbkreis r=10 ≈ 31.42', () => {
    expect(arcLength(10, 180)).toBeCloseTo(31.4159, 3);
  });
});

describe('Rechteck-Prädikate', () => {
  const a = rect(0, 0, 100, 100);

  it('erkennt Überlappung', () => {
    expect(rectsOverlap(a, rect(50, 50, 100, 100))).toBe(true);
  });

  it('erkennt Berührung als KEINE Überlappung', () => {
    expect(rectsOverlap(a, rect(100, 0, 50, 50))).toBe(false);
  });

  it('rectContains', () => {
    expect(rectContains(a, rect(10, 10, 20, 20))).toBe(true);
    expect(rectContains(a, rect(90, 90, 20, 20))).toBe(false);
  });

  it('intersection liefert den Schnitt oder null', () => {
    const i = intersection(a, rect(50, 50, 100, 100));
    expect(i && [i.x, i.y, i.w, i.h]).toEqual([50, 50, 50, 50]);
    expect(intersection(a, rect(200, 200, 10, 10))).toBeNull();
  });

  it('bbox fasst zusammen', () => {
    const b = bbox([rect(10, 10, 20, 20), rect(50, 5, 10, 40)]);
    expect([b.x, b.y, b.w, b.h]).toEqual([10, 5, 50, 40]);
  });

  it('bbox ohne Eingabe ist leer, nicht NaN', () => {
    const b = bbox([]);
    expect([b.x, b.y, b.w, b.h]).toEqual([0, 0, 0, 0]);
  });
});

describe('snapTo und clamp', () => {
  it('rastet auf Raster', () => {
    expect(snapTo(12.4, 5)).toBe(10);
    expect(snapTo(12.6, 5)).toBe(15);
    expect(snapTo(-3, 5)).toBe(-5);
  });

  it('clamp begrenzt', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clampMm(11.4, 0, 10)).toBe(10);
  });
});

describe('roundedRectPath — SVG-Ausgabe', () => {
  it('erzeugt einen geschlossenen Pfad', () => {
    const d = roundedRectPath(rect(0, 0, 100, 50), 10);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain('A10,10');
  });

  it('Radius 0 ergibt ein reines Rechteck', () => {
    expect(roundedRectPath(rect(0, 0, 100, 50), 0)).toBe('M0,0 H100 V50 H0 Z');
  });

  it('begrenzt den Radius auf die halbe Kante', () => {
    const d = roundedRectPath(rect(0, 0, 20, 20), 40);
    expect(d).toContain('A10,10');
  });
});

describe('Determinismus (T-G-06)', () => {
  it('gleiche Eingabe → gleicher Hash, 100×', () => {
    const input = JSON.stringify({ a: 1, b: [2, 3], c: 'x' });
    const h = hashString(input);
    for (let i = 0; i < 100; i++) expect(hashString(input)).toBe(h);
  });

  it('unterschiedliche Eingabe → unterschiedlicher Hash', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('Hash ist stabil über Aufrufe (kein Zufall, keine Zeit)', () => {
    expect(hashString('organizer')).toBe(hashString('organizer'));
    expect(hashString('')).toHaveLength(8);
  });
});
