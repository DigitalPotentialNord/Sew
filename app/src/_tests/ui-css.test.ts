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
const STARTSCREEN = readFileSync(join(__dirname, '..', 'ui', 'StartScreen.tsx'), 'utf8');
const CANVAS = readFileSync(join(__dirname, '..', 'ui', 'Canvas.tsx'), 'utf8');
const APP = readFileSync(join(__dirname, '..', 'ui', 'App.tsx'), 'utf8');
const IS_INTERACTIVE = readFileSync(join(__dirname, '..', 'ui', 'isInteractiveTarget.ts'), 'utf8');

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

describe('Issue #12: Canvas-Labels und Falzüberstand', () => {
  const CANV = readFileSync(join(__dirname, '..', 'ui', 'Canvas.tsx'), 'utf8');

  it('kein ungekliptes Canvas-Top-Label mehr (.mod-label) — Modultexte nur im Clip', () => {
    expect(CANV).not.toContain('mod-label');
    expect(css).not.toContain('.mod-label');
    // Der Summary-Text in Prims wird gekürzt und innerhalb der Box gezeichnet
    expect(CANV).toContain('labelFits');
  });

  it('.mod-overflow markiert den V-G-01-Fall direkt im Canvas (rot, gestrichelt)', () => {
    expect(css).toContain('.mod-overflow');
    const body = ruleBody('.mod-overflow');
    expect(body).toContain('stroke:');
    expect(body).toContain('stroke-dasharray');
    expect(CANV).toContain('overflows');
    expect(CANV).toContain('mod-overflow');
  });

  it('Falz ist beschriftet (.atelier-fold-label) statt nur Linie', () => {
    expect(css).toContain('.atelier-fold-label');
    expect(CANV).toContain("t('canvas.fold')");
  });
});

describe('Issue #19: Starter-Eingaben und Tastaturbedienung', () => {
  it('Größenfelder klemmen NICHT live in onChange (freies Tippen)', () => {
    expect(STARTSCREEN).not.toMatch(/onChange=\{[^}]*LIMITS\.base/);
    expect(STARTSCREEN).toContain('onBlur={() => commitDraft');
    expect(STARTSCREEN).toContain("if (e.key === 'Enter') commitDraft");
  });

  it('.start-option:disabled ist eindeutig deaktiviert (Opacity + cursor + kein Hover)', () => {
    expect(css).toContain('.start-option:disabled');
    const body = ruleBody('.start-option:disabled');
    expect(body).toContain('cursor: not-allowed');
    expect(body).toMatch(/opacity:\s*0\.[0-9]+/);
    // Hover darf für deaktivierte Karten nicht wirken
    expect(css).toContain('.start-option:not(:disabled):hover');
  });

  it('.start-overlay liegt über dem Canvas und clippt den Dialog nicht oben ab', () => {
    const body = ruleBody('.start-overlay');
    expect(body).toContain('position: fixed');
    expect(body).toContain('overflow-y: auto');
    // flex + margin:auto statt place-items:center (Top-Clipping bei 796×734)
    expect(body).not.toContain('place-items: center');
    expect(css).toMatch(/\.start-card \{[^}]*margin: auto/);
    // Sicherheitsabstand über Toasts (60), Sheets (42) und Discard-Dialog (70)
    const z = /z-index:\s*(\d+)/.exec(body);
    expect(z).not.toBeNull();
    expect(Number(z![1])).toBeGreaterThanOrEqual(70);
  });

  it('Space-Panning und globale Kürzel greifen nicht bei interaktiven Zielen/Texteingaben', () => {
    // Die Fokus-Erkennung liegt im geteilten Helfer — Canvas (Space-Pan, #19)
    // und App (Delete/r/Ziffern/Strg+Z) nutzen denselben Vertrag.
    expect(IS_INTERACTIVE).toContain('HTMLInputElement');
    expect(IS_INTERACTIVE).toContain('HTMLTextAreaElement');
    expect(IS_INTERACTIVE).toContain('HTMLSelectElement');
    expect(IS_INTERACTIVE).toContain('HTMLButtonElement');
    expect(IS_INTERACTIVE).toContain('[role="button"]');
    expect(IS_INTERACTIVE).toContain('[role="tab"]');
    expect(IS_INTERACTIVE).toContain('[role="dialog"]');
    expect(CANVAS).toContain('isInteractiveTarget');
    // Während des Starter-Dialogs gar nicht pannen
    expect(CANVAS).toContain('session.startOpen');
    // Die globalen Kürzel der App respektieren denselben Vertrag
    expect(APP).toContain('isInteractiveTarget');
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
