/** #22: Barrierefreiheit, Singular/Plural, deutsche Dezimalkommas — Verträge. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { construct } from '../core/construction';
import { buildTemplate } from '../core/project';
import { de } from '../i18n/de';

const read = (p: string): string => readFileSync(join(__dirname, '..', p), 'utf8');
const WARNINGS = read('ui/Warnings.tsx');
const PROJECTVIEW = read('ui/ProjectView.tsx');
const APP = read('ui/App.tsx');
const MATERIALSVIEW = read('ui/MaterialsView.tsx');
const PATTERNVIEW = read('ui/PatternView.tsx');

const dict = de as unknown as Record<string, string>;

describe('#22.1 Finding-Karten: keine verschachtelten interaktiven Elemente', () => {
  it('die Karte trägt keine role="button"/tabIndex — Aktionen sind echte Buttons', () => {
    expect(WARNINGS).not.toContain('role="button"');
    expect(WARNINGS).not.toContain('tabIndex={0}');
    expect(WARNINGS).toContain("t('canvas.select')");
  });
});

describe('#22.2 Mobile Warnungs-Sheet: genau ein Schließen-Button', () => {
  it('Warnings.tsx rendert kein eigenes Schließen-✕ — das Sheet bringt es mit', () => {
    expect(WARNINGS).not.toContain("t('mobile.close')");
  });
});

describe('#22.3 Papierkorb in „Meine Projekte“ hat einen zugänglichen Namen', () => {
  it('der Lösch-Button trägt ariaLabel/title (proj.confirmDelete)', () => {
    expect(PROJECTVIEW).toMatch(/icon="trash"[^/]*ariaLabel=\{t\('proj\.confirmDelete'\)\}/);
  });
});

describe('#22.4 Topbar: PDF-/Druck-Buttons deaktivieren bei Fehlern wie der SVG-Export', () => {
  it('Druck-Button ist bei errors > 0 disabled', () => {
    expect(APP).toMatch(/variant="accent" icon="printer"[^>]*disabled=\{errors > 0\}/);
  });
  it('PDF-Download-Button ist bei errors > 0 disabled', () => {
    expect(APP).toMatch(/icon="download"\s*\n?\s*onClick=\{\(\) => void doDownloadPdf\(\)\}[\s\S]*?disabled=\{errors > 0 \|\| busy\}/);
  });
});

describe('#22.5 Sprache und Formate', () => {
  it('basis.elastik nutzt deutsche „Schlaufen“ statt „Loops“', () => {
    expect(dict['basis.elastik']).toContain('Schlaufen');
    expect(dict['basis.elastik']).not.toContain('Loops');
  });
  it('Singular-/Pluralformen existieren für Hinweise und Zuschnittteile', () => {
    expect(dict['warn.warnsOne']).toBe('{n} Hinweis');
    expect(dict['warn.warns']).toBe('{n} Hinweise');
    expect(dict['pattern.piece']).toBe('{n} Teil');
    expect(dict['pattern.pieces']).toBe('{n} Teile');
    expect(dict['mat.tab.row']).toBeDefined();
  });
  it('Verbrauchswerte der Materialien nutzen Komma-Dezimalen', () => {
    const c = construct(buildTemplate('schmuck'));
    for (const m of c.materials) {
      if (m.basisValues && typeof m.basisValues.flaeche === 'string') {
        expect(m.basisValues.flaeche).toMatch(/^\d+,\d$/);
      }
      if (m.basisValues && typeof m.basisValues.faktor === 'string') {
        expect(m.basisValues.faktor).toBe('3,4');
      }
    }
    // Garnfaktor mit Komma statt Punkt
    const garn = c.materials.find((m) => m.spec.includes('garn') || m.labelKey.includes('garn'));
    if (garn && typeof garn.basisValues.faktor === 'string') {
      expect(garn.basisValues.faktor).not.toContain('.');
    }
  });
  it('op.final-check enthält keinen Zählplatzhalter mehr', () => {
    expect(dict['op.final-check']).not.toContain('{teile}');
  });
});

describe('#22.5 SVG-Labels im Zuschnittplan', () => {
  it('Labels erscheinen nur, wenn die geschätzte Textbreite ins Rechteck passt', () => {
    expect(MATERIALSVIEW).toContain('p.rect.w >= p.pieceId.length * 4.6 + 10');
    expect(MATERIALSVIEW).toContain('p.rect.h >= 14');
  });
});

describe('#22.5 Komma-Dezimalen in Ansichten', () => {
  it('PatternView: Meter-Anzeige nutzt Komma', () => {
    expect(PATTERNVIEW).toContain(".toFixed(1).replace('.', ',')");
  });
  it('PatternView/ProjectView haben keine nackten toFixed-Ausgaben ohne replace', () => {
    const files = [PATTERNVIEW, PROJECTVIEW, MATERIALSVIEW];
    for (const src of files) {
      const matches = src.match(/toFixed\([0-9]+\)(?!\.replace)/g) ?? [];
      expect(matches).toEqual([]);
    }
  });
});

