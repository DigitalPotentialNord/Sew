/** #15: Zuschnittplan (packFabric) und Stofflängen je Materialart. */
import { describe, expect, it } from 'vitest';
import { construct, packFabric } from '../core/construction';
import { buildTemplate } from '../core/project';
import { PRACTICE } from '../core/practice';
import type { ComputedPiece } from '../core/construction';
import { asMm } from '../core/geometry';

const piece = (id: string, w: number, h: number, material: ComputedPiece['material'] = 'fabric', count = 1): ComputedPiece => ({
  id,
  nameKey: `piece.${id}`,
  kind: 'cut',
  material,
  w: asMm(w),
  h: asMm(h),
  netW: asMm(w),
  netH: asMm(h),
  netRect: { x: asMm(0), y: asMm(0), w: asMm(w), h: asMm(h) },
  cutRect: { x: asMm(0), y: asMm(0), w: asMm(w), h: asMm(h) },
  radius: 0,
  count,
  grain: 'lengthwise',
  certainty: 'exact',
  role: 'module',
  foldEdge: 'none',
});

describe('packFabric — übergroße Teile (Issue #15)', () => {
  it('übergroßes Teil überlappt keine zuvor platzierte Reihe', () => {
    // Drei Teile à 1300×50 mm (in 1400er Stoff passend, aber mit den 900er
    // Einlagemaßen überdie Breite), danach ein übergroßes 1500×100-Teil.
    const pieces = [piece('a', 1300, 50), piece('b', 1300, 50), piece('big', 1500, 100)];
    const plan = packFabric(pieces, 1400, 'fabric');
    const rects = plan.pieces.map((i) => i.rect);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
    }
    // Überlappungs-Check: kein Paar vertikal überlappt, wenn horizontal überlappt
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
        const overlapY = a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlapX && overlapY, `${plan.pieces[i]!.pieceId} überlappt ${plan.pieces[j]!.pieceId}`).toBe(false);
      }
    }
  });

  it('übergroßes Teil direkt am Anfang erzeugt keine Überlappung', () => {
    const pieces = [piece('big', 1500, 100), piece('a', 1300, 50), piece('b', 1300, 50)];
    const plan = packFabric(pieces, 1400, 'fabric');
    const rects = plan.pieces.map((i) => i.rect);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
        const overlapY = a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });
});

describe('Stoffeinkauf — Einlage/Vlies sind schmaler als Meterware (Issue #15)', () => {
  it('interfacingWidthMm ist als Praxiswert definiert (Standard 900 mm)', () => {
    expect(PRACTICE.interfacingWidthMm).toBe(900);
  });

  it('Einlage wird mit 900 mm gerechnet, Außenstoff mit der Projektbreite', () => {
    const c = construct(buildTemplate('schmuck'));
    const fabric = c.materials.find((m) => m.kind === 'fabric');
    const interfacing = c.materials.find((m) => m.kind === 'interfacing');
    expect(fabric?.basisValues?.breite).toBe(1400);
    expect(interfacing?.basisValues?.breite).toBe(PRACTICE.interfacingWidthMm);
  });
});
