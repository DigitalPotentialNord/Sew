import { describe, expect, it } from 'vitest';
import { clipSegment, wrapText, buildPdf, safe } from '../core/pdf';
import { construct } from '../core/construction';
import { buildTemplate } from '../core/project';

const win = { x: 20, y: 10, w: 100, h: 50 };

describe('clipSegment (Kachelfenster)', () => {
  it('lässt ein Segment innerhalb des Fensters unverändert', () => {
    expect(clipSegment([30, 20], [90, 20], win)).toEqual([[30, 20], [90, 20]]);
  });
  it('kürzt ein Segment, das rechts herausläuft', () => {
    expect(clipSegment([30, 20], [300, 20], win)).toEqual([[30, 20], [120, 20]]);
  });
  it('kürzt ein Segment, das links herausläuft', () => {
    expect(clipSegment([-80, 20], [50, 20], win)).toEqual([[20, 20], [50, 20]]);
  });
  it('kürzt senkrechte Segmente oben und unten', () => {
    expect(clipSegment([50, -40], [50, 200], win)).toEqual([[50, 10], [50, 60]]);
  });
  it('behält die Richtung (a bleibt a)', () => {
    expect(clipSegment([300, 20], [30, 20], win)).toEqual([[120, 20], [30, 20]]);
  });
  it('gibt null zurück, wenn nichts im Fenster liegt', () => {
    expect(clipSegment([200, 20], [300, 20], win)).toBeNull();
    expect(clipSegment([30, 100], [90, 100], win)).toBeNull();
    expect(clipSegment([50, 70], [50, 90], win)).toBeNull();
  });
});

describe('wrapText', () => {
  it('bricht an Wortgrenzen um, ohne Wörter zu zerteilen', () => {
    const lines = wrapText('Nadelkanäle oben rechts annähen', 80, 9);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('Nadelkanäle oben rechts annähen');
    for (const w of ['Nadelkanäle', 'annähen']) {
      expect(lines.some((l) => l.includes(w))).toBe(true);
    }
  });
  it('lässt kurzen Text in einer Zeile', () => {
    expect(wrapText('Kurz', 100, 9)).toEqual(['Kurz']);
  });
  it('trennt ein überlanges Wort hart, ohne Zeichen zu verlieren', () => {
    const long = 'Donaudampfschifffahrtsgesellschaftskapitaen';
    const lines = wrapText(long, 20, 9);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe(long);
  });
  it('behandelt leeren Text als keine Zeile', () => {
    expect(wrapText('   ', 50, 9)).toEqual([]);
  });
});

describe('buildPdf', () => {
  const c = construct(buildTemplate('schmuck'));
  const strings = {
    title: 'Schmuck-Organizer',
    subtitle: 'Organizer Studio',
    calibration: '50 mm Kalibrierquadrat',
    calibrationHint: 'Muss genau 50 mm messen.',
    materials: c.materials.map((m) => ({ label: m.kind, amount: m.display ?? '', certainty: m.certainty })),
    cutList: c.pieces.map((p) => ({ label: p.id, size: `${p.w} x ${p.h} mm`, count: `${p.count}x`, tiles: '1' })),
    instructions: c.operations.map((o) => ({ index: o.index, phase: o.phase, text: 'Test' })),
    footer: 'Fusszeile',
  };

  it('erzeugt ein gültiges PDF mit Deckblatt, Listen und Kacheln', async () => {
    const { bytes, pages } = await buildPdf(c, strings);
    expect(bytes.length).toBeGreaterThan(2000);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(pages).toBeGreaterThan(0);
  });

  it('enthält so viele Seiten wie Kacheln plus vier Listen-Seiten', async () => {
    const { pages } = await buildPdf(c, strings);
    const { tilePiece } = await import('../core/export');
    const tiles = c.pieces.filter((p) => p.kind === 'cut').reduce((n, p) => n + tilePiece(p).length, 0);
    expect(pages).toBe(tiles + 4);
  });

  it('gibt für ein leeres Projekt kein kaputtes PDF zurück', async () => {
    const empty = construct({ ...buildTemplate('schmuck'), modules: [] });
    const { bytes } = await buildPdf(empty, { ...strings, materials: [], cutList: [] });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });
});
describe('safe (WinAnsi)', () => {
  it('lässt cp1252-Zeichen inklusive Umlaute und deutscher Quotes unverändert', () => {
    expect(safe('Nadelkanäle „Maßhaltig“ — 100 %')).toBe('Nadelkanäle „Maßhaltig“ - 100 %');
  });
  it('ersetzt Pfeil und Multiplikation wie dokumentiert', () => {
    expect(safe('a → b × c')).toBe('a -> b x c');
  });
  it('ersetzt Zeichen außerhalb von cp1252 (Emoji, CJK) statt abzustürzen', () => {
    expect(safe('mein Etui ✂✂ 幅')).toBe('mein Etui ?? ?');
  });
  it('normalisiert Steuerzeichen zu Leerzeichen', () => {
    expect(safe('a\nb\tc')).toBe('a b c');
  });
});

describe('2D Liang–Barsky & mehrseitige Anleitung (Regressions)', () => {
  it('schneidet diagonale Segmente exakt am Kachelfenster', () => {
    expect(clipSegment([0, 0], [140, 70], win)).toEqual([[20, 10], [120, 60]]);
    expect(clipSegment([0, 60], [120, 0], win)).toEqual([[20, 50], [100, 10]]);
    expect(clipSegment([0, 0], [10, 5], win)).toBeNull();
  });

  it('bricht lange Anleitungen (> 50 Schritte) ohne Seitenverlust auf Folgeseiten um', async () => {
    const base = buildTemplate('strick');
    const many = {
      ...base,
      modules: Array.from({ length: 24 }, (_, i) => ({
        ...base.modules[i % base.modules.length]!,
        id: `big_${i}`,
      })),
    };
    const c = construct(many);
    const { pages } = await buildPdf(c, {
      title: 'Grosses Projekt',
      subtitle: 'Organizer Studio',
      calibration: '50 mm',
      calibrationHint: 'Messen.',
      materials: c.materials.map((m) => ({ label: m.kind, amount: m.display ?? '', certainty: m.certainty })),
      cutList: c.pieces
        .filter((p) => p.kind === 'cut')
        .map((p) => ({ label: p.id, size: `${p.w} x ${p.h}`, count: `${p.count}x`, tiles: '1' })),
      instructions: c.operations.map((o) => ({ index: o.index, phase: o.phase, text: `Schritt ${o.index}: ${o.titleKey}` })),
      footer: 'Footer',
    });
    const { tilePiece } = await import('../core/export');
    const tileCount = c.pieces.filter((p) => p.kind === 'cut').reduce((n, p) => n + tilePiece(p).length, 0);
    // Erwartet mindestens Cover + Material + Zuschnitt + >=2 Anleitungsseiten + Kacheln
    expect(pages).toBeGreaterThan(tileCount + 4);
  });
});
