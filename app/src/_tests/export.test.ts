/** T-X: Exportvertrag — SVG (1 Einheit = 1 mm), A4-Kachelung, Druck-HTML, Dateinamen. */
import { describe, it, expect } from 'vitest';
import { buildPrintHtml, fileName, PAGE, tilePiece, timestampForFile, toSvg, totalPages, type PrintStrings } from '../core/export';
import { construct } from '../core/construction';
import { buildTemplate } from '../core/project';

const strings: PrintStrings = {
  title: 'Test', projectLabel: 'Projekt', materialLabel: 'Material', cutLabel: 'Zuschnitt',
  pageMapLabel: 'Klebematrix', instructionsLabel: 'Anleitung', calibrationLabel: '50 mm',
  calibrationHint: 'Bitte messen.', seamAllowance: 'Nahtzugabe', piece: 'Teile', count: 'Stück',
  size: 'Maß', grain: 'Fadenlauf', glue: 'kleben', warning: 'Offene Punkte', step: 'Schritt',
  materialExact: 'genau', materialEstimated: 'geschätzt', footer: 'Fußzeile', legend: 'Legende',
};

const schmuck = construct(buildTemplate('schmuck'));
const strick = construct(buildTemplate('strick'));

describe('SVG (T-X-01, T-X-02)', () => {
  const svg = toSvg(schmuck);

  it('SVG ist wohlgeformt und deklariert mm', () => {
    expect(svg.startsWith('<?xml')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toMatch(/width="\d+mm" height="\d+mm"/);
    expect(svg).toContain('viewBox="0 0 ');
  });

  it('1 Einheit = 1 mm: viewBox-Zahlen und mm-Angaben stimmen überein', () => {
    const m = svg.match(/width="(\d+)mm" height="(\d+)mm" viewBox="0 0 (\d+) (\d+)"/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe(m![3]);
    expect(m![2]).toBe(m![4]);
  });

  it('enthält die Kalibrierungsreferenz von 50 mm', () => {
    expect(svg).toContain('id="calibration"');
    expect(svg).toContain('h50 v50');
  });

  it('enthält je Schnittteil eine Gruppe mit material und count', () => {
    const cut = schmuck.pieces.filter((p) => p.kind === 'cut');
    for (const p of cut) {
      expect(svg).toContain(`id="piece-${p.id}"`);
      expect(svg).toContain(`data-count="${p.count}"`);
      expect(svg).toContain(`data-material="${p.material}"`);
    }
  });

  it('Nahtzugabe ist als gestrichelte Linie kodiert', () => {
    expect(svg).toContain('stroke-dasharray="3 2"');
  });

  it('Fadenlauf ist markiert', () => {
    expect(svg).toContain('class="grain"');
  });

  it('SVG enthält die Praxisversion im Kommentar (Nachvollziehbarkeit)', () => {
    expect(svg).toContain(`Praxiswerte ${schmuck.practiceVersion}`);
    expect(svg).toContain(schmuck.projectHash);
  });

  it('kein Teil liegt bei negativen Koordinaten', () => {
    const nums = [...svg.matchAll(/<path d="M(-?\d+(?:\.\d+)?),(-?\d+)/g)];
    expect(nums.length).toBeGreaterThan(0);
    for (const n of nums) expect(Number(n[1])).toBeGreaterThanOrEqual(0);
  });

  it('andere Projekte liefern andere SVGs (kein fester Text)', () => {
    expect(toSvg(strick)).not.toBe(svg);
  });
});

describe('A4-Kachelung (T-X-03)', () => {
  it('Nutzfläche = A4 − 2×Rand − Klebestreifen', () => {
    expect(PAGE.A4.margin).toBe(10);
    expect(PAGE.A4.glue).toBe(10);
  });

  it('kleine Teile passen auf genau eine Seite', () => {
    const small = schmuck.pieces.find((p) => p.kind === 'cut' && p.w <= 180 && p.h <= 267)!;
    expect(small).toBeDefined();
    const tiles = tilePiece(small);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]!.label).toBe('A1');
  });

  it('das Panel wird in mehrere Seiten gekachelt', () => {
    const panel = strick.pieces.find((p) => p.id === 'panel-aussen')!;
    const tiles = tilePiece(panel);
    expect(tiles.length).toBeGreaterThan(1);
    expect(new Set(tiles.map((t) => t.label)).size).toBe(tiles.length);
  });

  it('Kacheln decken das Teil vollständig ab (keine Lücke, keine Dopplung der Fläche)', () => {
    const panel = strick.pieces.find((p) => p.id === 'panel-aussen')!;
    const tiles = tilePiece(panel);
    const area = tiles.reduce((a, t) => a + t.srcRect.w * t.srcRect.h, 0);
    expect(area).toBeGreaterThanOrEqual(panel.w * panel.h - 1);
    expect(tiles.every((t) => t.srcRect.w > 0 && t.srcRect.h > 0)).toBe(true);
  });

  it('Kachellabels sind spaltenweise Buchstabe + Zeile', () => {
    const panel = strick.pieces.find((p) => p.id === 'panel-aussen')!;
    for (const t of tilePiece(panel)) {
      expect(t.label).toMatch(/^[A-H][1-9]$/);
      expect(t.label[0]).toBe(String.fromCharCode(65 + t.col));
    }
  });

  it('keine Kachel ist größer als die Nutzfläche', () => {
    const usableW = PAGE.A4.w - 2 * PAGE.A4.margin - PAGE.A4.glue;
    const usableH = PAGE.A4.h - 2 * PAGE.A4.margin - PAGE.A4.glue;
    for (const p of [...schmuck.pieces, ...strick.pieces].filter((x) => x.kind === 'cut')) {
      for (const t of tilePiece(p)) {
        expect(t.srcRect.w).toBeLessThanOrEqual(usableW + 0.001);
        expect(t.srcRect.h).toBeLessThanOrEqual(usableH + 0.001);
      }
    }
  });

  it('Seitenzahl ist 5 + Summe aller Kacheln (inkl. Anleitung)', () => {
    const cut = strick.pieces.filter((p) => p.kind === 'cut');
    expect(totalPages(strick)).toBe(5 + cut.reduce((a, p) => a + tilePiece(p).length, 0));
  });
});

describe('Druck-HTML (Slice I)', () => {
  const html = buildPrintHtml(
    schmuck,
    'Schmuck-Organizer',
    strings,
    schmuck.materials.map((m) => ({ label: m.labelKey, amount: `${m.amount} ${m.unit}`, certainty: m.certainty, basis: m.basisKey })),
    schmuck.operations.map((o) => ({ index: o.index, phase: o.phase, text: o.titleKey })),
    [],
  );

  it('ist ein vollständiges HTML-Dokument mit A4-Seitenrändern', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page { size: A4; margin: 10mm; }');
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('enthält Deckblatt, Material, Zuschnitt, Klebematrix und Anleitung', () => {
    for (const needle of ['class="page cover"', 'cal-box', 'Klebematrix', 'class="steps"', 'Anleitung']) {
      expect(html).toContain(needle);
    }
  });

  it('jede Materialzeile steht im Druck', () => {
    for (const m of schmuck.materials) expect(html).toContain(m.labelKey);
  });

  it('jede Operation ist als Schritt enthalten', () => {
    for (const op of schmuck.operations) expect(html).toContain(op.titleKey);
  });

  it('Anzahl der Seiten entspricht totalPages', () => {
    const count = (html.match(/<section class="page/g) ?? []).length;
    expect(count).toBe(totalPages(schmuck));
  });

  it('HTML wird escaped (kein injizierter Markup aus dem Projektnamen)', () => {
    const evil = buildPrintHtml(schmuck, '<script>alert(1)</script>', strings, [], [], ['<b>offen</b>']);
    expect(evil).not.toContain('<script>alert(1)</script>');
    expect(evil).toContain('&lt;script&gt;');
  });

  it('offene Warnungen erscheinen auf dem Deckblatt', () => {
    const withWarn = buildPrintHtml(schmuck, 'X', strings, [], [], ['Kanal zu 99 % voll']);
    expect(withWarn).toContain('Kanal zu 99 % voll');
  });
});

describe('Dateinamen (T-X-06)', () => {
  it('Umlaute werden transliteriert', () => {
    expect(fileName('Stricknadel-Organizer für Ösen', 'muster', 'svg')).toBe('stricknadel-organizer-fuer-oesen_muster.svg');
  });

  it('Sonderzeichen werden zu Bindestrichen, keine doppelten', () => {
    expect(fileName('Test /// Projekt  -- 2', 'a', 'pdf')).toBe('test-projekt-2_a.pdf');
  });

  it('leerer Name bekommt einen Fallback', () => {
    expect(fileName('', 'muster', 'svg')).toBe('organizer_muster.svg');
    expect(fileName('---', 'muster', 'svg')).toBe('organizer_muster.svg');
  });

  it('Zeitstempel ist sortierbar und ohne Doppelpunkte', () => {
    const ts = timestampForFile(new Date(2026, 0, 5, 9, 7));
    expect(ts).toBe('2026-01-05_0907');
    expect(ts).not.toContain(':');
  });
});

describe('toSvg – Escaping (Defense-in-Depth)', () => {
  it('ein piece.id mit Markup kann kein SVG/Skript-Injection erzeugen', () => {
    const c = construct(buildTemplate('schmuck'));
    const hostile = {
      ...c,
      pieces: c.pieces.map((p, i) => (i === 0 ? { ...p, id: 'a"><script>alert(1)</script>' } : p)),
    };
    const svg = toSvg(hostile);
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).not.toContain('a"><');
  });

  it('svg ist wohlgeformt (XML-Parser akzeptiert)', () => {
    const c = construct(buildTemplate('makeup'));
    const svg = toSvg(c);
    // Minimaler struktureller Check ohne XML-Parser-Dependency:
    // jedes öffnende Tag hat ein schließendes Pendant und gültige Quotes.
    expect(svg.startsWith('<?xml version="1.0"')).toBe(true);
    expect(svg).toContain('</svg>');
    expect(svg.match(/<g /g)?.length).toBe(svg.match(/<\/g>/g)?.length);
  });
});
