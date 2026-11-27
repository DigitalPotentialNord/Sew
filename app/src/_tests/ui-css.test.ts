/**
 * UI/CSS-Verträge (statisch) — Regressiontests für reine Stylesheet-Fehler.
 *
 * Einige UI-Fehler sind reine CSS-Fehler; ohne Browser prüft dieser Test den
 * Regelsatz direkt im Quelltext (Muster wie in i18n.test.ts). Er ersetzt kein
 * Browser-Rendering, hält aber die konkreten Fehler aus den Issues #21/#19 fest.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, '..', 'ui', 'styles.css'), 'utf8');
const LIBRARY = readFileSync(join(__dirname, '..', 'ui', 'Library.tsx'), 'utf8');

/** Extrahiert den Deklarationsblock einer CSS-Regel (erste Trefferstelle). */
const ruleBody = (selector: string): string => {
  const idx = css.indexOf(`${selector} {`);
  expect(idx, `Regel ${selector} fehlt`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf('}', idx);
  return css.slice(idx, end);
};

describe('Issue #21: Modulkarten-Text sichtbar', () => {
  it('.lib-text belegt keine eingeschlossene Höhe (kein flex: 1 1 0)', () => {
    const body = ruleBody('.lib-text');
    expect(body).not.toContain('flex: 1 1 0');
    expect(body).toContain('flex: 0 0 auto');
  });

  it('.lib-text ist nicht vertikal geclippt', () => {
    const body = ruleBody('.lib-text');
    expect(body).not.toMatch(/overflow:\s*hidden/);
  });

  it('die Modulkarte rendert Name, Zusammenfassung und Hinzufügen-Aktion', () => {
    for (const cls of ['lib-name', 'lib-sub', 'lib-card-add']) {
      expect(LIBRARY).toContain(`className="${cls}"`);
      expect(ruleBody(`.${cls}`).length).toBeGreaterThan(0);
    }
  });
});

describe('Issue #21: Kategorietabs vollständig erreichbar', () => {
  it('.lib-cats bricht um statt horizontal zu beschneiden', () => {
    const body = ruleBody('.lib-cats');
    expect(body).toContain('flex-wrap: wrap');
    expect(body).not.toContain('scrollbar-width: none');
    expect(body).not.toContain('overflow-x: auto');
  });
});
