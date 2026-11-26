/**
 * i18n-Vollständigkeit — der Test, den man sonst immer vergisst.
 *
 * Er prüft NICHT einzelne Strings, sondern den VERTRAG zwischen Code und
 * `de.ts`, und das auf zwei Ebenen:
 *   1. Statische `t('key')`-Referenzen im ganzen src-Baum existieren.
 *   2. Dynamische Schlüssel-Familien — Modulnamen, Feld-Labels, Options,
 *      Operations-Titel, Piece-/Grundstücks-, Basis- und Regel-Keys —
 *      werden dadurch geprüft, dass der Motor sie WIRKLICH erzeugt:
 *      pieces/operations/validate werden mit Default-Parametern aufgerufen
 *      und die resultierenden Keys müssen in `de` stehen.
 *
 * Schlägt der Test an, fehlt entweder ein Key im de.ts (Runtime-Anzeige
 * „rohe Schlüssel“ wie `rule.V-G-01.title`) oder der Code baut einen
 * Schlüssel, den niemand übersetzt hat.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { de } from '../i18n/de';
import { MODULES } from '../core/modules';
import { mm } from '../core/geometry';
import type { LayoutContext } from '../core/types';

const dict = de as unknown as Record<string, string>;
const has = (key: string): boolean => typeof dict[key] === 'string' && dict[key].length > 0;

// Sprachregeln: nur was eine t()-Ansage oder ein *Key-Feld wirklich verwendet.
const context: LayoutContext = {
  channelFreeMm: mm(200),
  panelWidthMm: mm(240),
  panelHeightMm: mm(300),
  rowHeightMm: mm(280),
  seamAllowanceMm: mm(10),
  fabricWidthMm: mm(1400),
};

describe('Statische t()-Referenzen im Quellcode', () => {
  const srcRoot = join(__dirname, '..');
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name) && !full.includes('_tests')) files.push(full);
    }
  };
  walk(srcRoot);

  const refs = new Set<string>();
  const pattern = /(?:^|[^A-Za-z0-9_])t\('([a-z0-9][a-z0-9._-]*)'/g;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(src)) !== null) refs.add(m[1]!);
  }

  it('jede statische Referenz ist definiert', () => {
    const missing = [...refs].filter((k) => !has(k));
    expect(missing, `fehlende Keys: ${missing.join(', ')}`).toEqual([]);
    expect(refs.size).toBeGreaterThan(100); // Mut-Check: der Scan fand wirklich referenzen
  });
});

describe('Dynamische Schlüssel-Familien (Engine-Ausgabe)', () => {
  const collect = (): { key: string; where: string }[] => {
    const out: { key: string; where: string }[] = [];
    const push = (key: string | undefined, where: string): void => {
      if (key) out.push({ key, where });
    };
    for (const def of MODULES) {
      push(def.nameKey, `mod.name:${def.id}`);
      push(def.descriptionKey, `mod.desc:${def.id}`);
      for (const f of def.fields) {
        push(f.labelKey, `field.label:${def.id}.${f.key}`);
        push(f.helpKey, `field.help:${def.id}.${f.key}`);
        push(f.groupKey, `field.group:${def.id}.${f.key}`);
        for (const o of f.options ?? []) push(o.labelKey, `field.option:${def.id}.${f.key}`);
      }
      for (const p of def.pieces(def.defaults, context, 'test')) {
        push(p.nameKey, `piece:${def.id}`);
        push(p.noteKey, `note:${def.id}`);
      }
      for (const op of def.operations(def.defaults, context, 'test')) {
        push(op.titleKey, `op:${def.id}`);
      }
      for (const e of def.extraMaterials?.(def.defaults, context) ?? []) {
        push(e.labelKey, `extra.label:${def.id}`);
        push(e.basisKey, `extra.basis:${def.id}`);
        push(e.purchaseHintKey, `extra.hint:${def.id}`);
      }
      for (const finding of def.validate(def.defaults, context, 'test')) {
        push(`rule.${finding.ruleId}.title`, `rule.title:${finding.ruleId}`);
        push(`rule.${finding.ruleId}.detail`, `rule.detail:${finding.ruleId}`);
      }
    }
    return out;
  };

  it('alle von der Engine erzeugten Keys sind in de.ts vorhanden', () => {
    const missing = collect().filter(({ key }) => !has(key));
    expect(missing.map((x) => `${x.key} (${x.where})`), 'fehlende Keys').toEqual([]);
  });

  it('jedes Modul hat Name, Beschreibung und mindestens eine Operation/ein Stück', () => {
    for (const def of MODULES) {
      expect(has(def.nameKey), `${def.id} name`).toBe(true);
      expect(has(def.descriptionKey), `${def.id} description`).toBe(true);
      expect(def.pieces(def.defaults, context, 'test').length).toBeGreaterThan(0);
      expect(def.operations(def.defaults, context, 'test').length).toBeGreaterThan(0);
    }
  });
});

describe('Kern-Regelknoten (Konstruktionsregeln)', () => {
  // ruleId-Literale im Kern → beide Anzeige-Keys müssen existieren.
  const coreFiles = ['construction.ts', 'modules.ts', 'fixes.ts'];
  const ids = new Set<string>();
  for (const name of coreFiles) {
    const src = readFileSync(join(__dirname, '..', 'core', name), 'utf8');
    for (const m of src.matchAll(/ruleId:\s*'([^']+)'/g)) ids.add(m[1]!);
  }

  it('jede im Kern referenzierte ruleId hat title + detail', () => {
    expect(ids.size).toBeGreaterThan(10); // die V-G-Regeln + V-M*-Regeln
    const missing = [...ids].flatMap((id) =>
      [`rule.${id}.title`, `rule.${id}.detail`].filter((k) => !has(k)),
    );
    expect(missing).toEqual([]);
  });

  it('alle Fix-Kinds aus fixes.ts haben einen Anzeige-Key', () => {
    const src = readFileSync(join(__dirname, '..', 'core', 'fixes.ts'), 'utf8');
    const kinds = [...src.matchAll(/case '([a-zA-Z]+)':/g)].map((m) => m[1]!);
    expect(kinds.length).toBeGreaterThan(0);
    const missing = kinds.filter((k) => !has(`fix.${k}`)).map((k) => `fix.${k}`);
    expect(missing).toEqual([]);
  });

  it('Phasen, Materialarten und Einheiten existieren', () => {
    for (const phase of ['prepare', 'cut', 'sew-order', 'assemble', 'finish']) {
      expect(has(`phase.${phase}`), `phase.${phase}`).toBe(true);
    }
    for (const kind of ['fabric', 'lining', 'interfacing', 'batting', 'elastic', 'zipper', 'button', 'snap', 'velcro', 'webbing', 'ring', 'thread']) {
      expect(has(`mat.${kind}`), `mat.${kind}`).toBe(true);
    }
  });
});
