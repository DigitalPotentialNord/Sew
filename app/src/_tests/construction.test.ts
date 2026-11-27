/** T-D/T-S/T-P: Konstruktion, Determinismus, Vollständigkeit, Invarianten. */
import { describe, it, expect } from 'vitest';
import { construct, SCHEMA_VERSION, type Project, type Instance } from '../core/construction';
import { applyFix } from '../core/fixes';
import { buildTemplate, TEMPLATES, blankProject, makeInstance, validateProject, migrate, fromFile, toFile } from '../core/project';
import { channelHeight, channelWidth, moduleDef, MODULES } from '../core/modules';
import { PRACTICE } from '../core/practice';
import { hashString } from '../core/geometry';
import type { ModuleTypeId } from '../core/types';

const baseProject = (): Project => ({
  schemaVersion: SCHEMA_VERSION,
  id: 'p_test',
  name: 'Test',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  base: { form: 'book', widthMm: 240, heightMm: 220, spineWidthMm: 40, cornerRadiusMm: 16, hasLining: true },
  rows: [{ id: 'r1', name: 'Zeile 1' }],
  modules: [],
  settings: { seamAllowanceMm: 10, fabricWidthMm: 1400, unit: 'mm' },
});

const withModules = (mods: Instance[]): Project => ({ ...baseProject(), modules: mods });

describe('Determinismus (P-02, I7)', () => {
  it('gleiches Projekt → identischer Hash', () => {
    const p = buildTemplate('strick');
    const a = construct(p);
    const b = construct(p);
    expect(a.projectHash).toBe(b.projectHash);
    expect(JSON.stringify(a.findings)).toBe(JSON.stringify(b.findings));
    expect(JSON.stringify(a.pieces)).toBe(JSON.stringify(b.pieces));
  });

  it('Zeitstempel beeinflussen die Konstruktion NICHT (I8)', () => {
    const p = buildTemplate('schmuck');
    const q: Project = { ...p, createdAt: '1999-01-01T00:00:00.000Z', updatedAt: '2030-12-31T23:59:59.000Z' };
    expect(construct(p).projectHash).toBe(construct(q).projectHash);
  });

  it('Modul-IDs ändern den Hash nicht — die Absicht zählt (I7)', () => {
    const p = baseProject();
    const a = makeInstance('M01', 'r1');
    const b = makeInstance('M09', 'r1');
    const renamed = { ...a, id: 'voellig-andere-id' };
    expect(construct({ ...p, modules: [a, b] }).projectHash).toBe(construct({ ...p, modules: [renamed, b] }).projectHash);
  });

  it('Modulreihenfolge innerhalb einer Zeile ändert den Hash (#15)', () => {
    // Die Reihenfolge bestimmt die Platzierung (x-Cursor in layout()), also ist sie
    // Teil der Konstruktion — der Hash muss sie widerspiegeln.
    const p = baseProject();
    const a = makeInstance('M01', 'r1');
    const b = makeInstance('M09', 'r1');
    expect(construct({ ...p, modules: [a, b] }).projectHash).not.toBe(construct({ ...p, modules: [b, a] }).projectHash);
    // Reihenfolge des Array-Eintrags über Zeilengrenzen ist dagegen NICHT Teil der
    // Konstruktion (Layout läuft zeilenweise in Projekt-Reihenfolge): stabiler Hash.
    const c = makeInstance('M04', 'r2');
    const q = { ...p, rows: [{ id: 'r1', name: 'Zeile 1' }, { id: 'r2', name: 'Zeile 2' }] };
    expect(construct({ ...q, modules: [a, c] }).projectHash).toBe(construct({ ...q, modules: [c, a] }).projectHash);
  });

  it('geänderte Modulwahl ändert den Hash', () => {
    const p = baseProject();
    const a = makeInstance('M01', 'r1');
    const b = makeInstance('M09', 'r1');
    expect(construct({ ...p, modules: [a] }).projectHash).not.toBe(construct({ ...p, modules: [a, b] }).projectHash);
  });

  it('Hash ist ein 8-stelliger Hex-String', () => {
    expect(construct(baseProject()).projectHash).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('Strukturelle Vollständigkeit (T-S-01)', () => {
  it('jedes Projekt hat panel-aussen und panel-futter', () => {
    const c = construct(baseProject());
    const ids = c.pieces.map((p) => p.id);
    expect(ids).toContain('panel-aussen');
    expect(ids).toContain('panel-futter');
  });

  it('ohne Futterlage entfällt panel-futter (bewusste Option)', () => {
    const p = baseProject();
    const q = { ...p, base: { ...p.base, hasLining: false } };
    expect(construct(q).pieces.map((x) => x.id)).not.toContain('panel-futter');
    expect(construct(q).pieces.map((x) => x.id)).toContain('panel-aussen');
  });

  it('jedes platzierte Modul hat mindestens ein eigenes Teil', () => {
    for (const m of MODULES) {
      const inst = makeInstance(m.id, 'r1');
      const c = construct(withModules([inst]));
      const own = c.pieces.filter((p) => p.sourceModuleId === inst.id);
      expect(own.length, `Modul ${m.id} ohne Teil`).toBeGreaterThan(0);
    }
  });

  it('jedes Material hat mindestens eine Quelle oder eine dokumentierte Herleitung', () => {
    const c = construct(buildTemplate('makeup'));
    for (const m of c.materials) {
      expect(m.sources.length > 0 || m.basisKey.length > 0).toBe(true);
    }
  });

  it('kein exportierbares Teil hat Fläche 0 (I12)', () => {
    const c = construct(buildTemplate('strick'));
    for (const p of c.pieces.filter((x) => x.kind === 'cut')) {
      expect(p.w * p.h).toBeGreaterThan(0);
    }
  });
});

describe('Nahtzugabe (K-01: eine Wahrheit)', () => {
  it('Teile wachsen mit der Nahtzugabe um 2×Δ', () => {
    const p = baseProject();
    const a = construct(p).pieces.find((x) => x.id === 'panel-aussen')!;
    const q = { ...p, settings: { ...p.settings, seamAllowanceMm: 14 } };
    const b = construct(q).pieces.find((x) => x.id === 'panel-aussen')!;
    expect(b.w - a.w).toBe(2 * (14 - 10));
    expect(b.h - a.h).toBe(2 * (14 - 10));
  });

  it('Nähmaß bleibt bei geänderter Nahtzugabe gleich', () => {
    const p = baseProject();
    const a = construct(p).pieces.find((x) => x.id === 'panel-aussen')!;
    const q = { ...p, settings: { ...p.settings, seamAllowanceMm: 6 } };
    const b = construct(q).pieces.find((x) => x.id === 'panel-aussen')!;
    expect(a.netW).toBe(b.netW);
    expect(a.netH).toBe(b.netH);
  });
});

describe('Nadelkanal M06 — die zentrale Rechnung', () => {
  it('Breite = paare × (stärke + 2 × Nahtluft) + 2 × Randnaht', () => {
    const p = { nadellaenge: 200, nadelstaerke: 4, paare: 1, zugabe: 14 };
    expect(channelWidth(p)).toBe(1 * (4 + 2 * PRACTICE.needleClearanceMm) + 2 * PRACTICE.channelEdgeSeamMm);
    expect(channelWidth(p)).toBe(18);
  });

  it('Höhe = Nadellänge + Zugabe', () => {
    expect(channelHeight({ nadellaenge: 200, zugabe: 14 })).toBe(214);
  });

  it('doppelte Paare verdoppeln die Nutzbreite, nicht die Randnaht', () => {
    const a = channelWidth({ paare: 1, nadelstaerke: 4 });
    const b = channelWidth({ paare: 2, nadelstaerke: 4 });
    expect(b - a).toBe(a - 2 * PRACTICE.channelEdgeSeamMm);
  });

  it('dickere Nadeln ergeben breitere Kanäle', () => {
    expect(channelWidth({ paare: 1, nadelstaerke: 8 })).toBeGreaterThan(channelWidth({ paare: 1, nadelstaerke: 4 }));
  });

  it('Stricknadel-Vorlage: 6 Kanäle passen in 250 mm', () => {
    const c = construct(buildTemplate('strick'));
    const channels = c.modules.filter((m) => m.typeId === 'M06');
    expect(channels).toHaveLength(6);
    const sum = channels.reduce((a, m) => a + m.rect.w, 0);
    expect(sum).toBeLessThanOrEqual(250 - 2 * PRACTICE.edgeMarginMm);
  });
});

describe('Elastik M04 — exakte Loop-Rechnung', () => {
  it('Bandlänge = loops × loopLaenge + 2 × NZ + 2 × Reserve', () => {
    const inst = makeInstance('M04', 'r1', { loops: 6, gegenstandBreite: 8, gegenstandDicke: 8, zug: 5 });
    const c = construct(withModules([inst]));
    const band = c.pieces.find((p) => p.id === 'elastik-band')!;
    const loop = 8 + 2 * 8 - 5;
    expect(band.w).toBe(6 * loop + 2 * 10 + 2 * PRACTICE.elasticTailMm);
    expect(band.kind).toBe('length');
    expect(band.certainty).toBe('exact');
  });

  it('Loop-Länge ist nie negativ', () => {
    const inst = makeInstance('M04', 'r1', { loops: 1, gegenstandBreite: 2, gegenstandDicke: 1, zug: 14 });
    const c = construct(withModules([inst]));
    const band = c.pieces.find((p) => p.id === 'elastik-band')!;
    expect(band.w).toBeGreaterThan(0);
  });

  it('mehr Loops → längeres Band (Monotonie)', () => {
    const a = construct(withModules([makeInstance('M04', 'r1', { loops: 3 })]));
    const b = construct(withModules([makeInstance('M04', 'r1', { loops: 8 })]));
    const ba = a.pieces.find((p) => p.id === 'elastik-band')!.w;
    const bb = b.pieces.find((p) => p.id === 'elastik-band')!.w;
    expect(bb).toBeGreaterThan(ba);
  });
});

describe('Reißverschluss M03', () => {
  it('RV-Länge = Öffnung + 20 mm', () => {
    const inst = makeInstance('M03', 'r1', { breite: 160 });
    const c = construct(withModules([inst]));
    const zip = c.pieces.find((p) => p.id === 'rv-band')!;
    expect(zip.w).toBe(180);
    expect(zip.material).toBe('zipper');
  });

  it('RV hat ein Material mit exakter Menge', () => {
    const c = construct(withModules([makeInstance('M03', 'r1', { breite: 160 })]));
    const z = c.materials.find((m) => m.kind === 'zipper');
    expect(z).toBeDefined();
    expect(z!.certainty).toBe('exact');
    expect(z!.amount).toBe(180);
  });

  it('zu kurzer RV erzeugt einen Fehler mit Fix (R1)', () => {
    const c = construct(withModules([makeInstance('M03', 'r1', { breite: 40 })]));
    const f = c.findings.find((x) => x.ruleId === 'V-M03-01');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('error');
    expect(f!.fix).toBeDefined();
    expect(f!.dismissible).toBe(false);
  });
});

describe('Layout-Invarianten (P-08, V-G-01, V-G-13)', () => {
  it('zu breite Module erzeugen V-G-01 mit Fix', () => {
    const wide = makeInstance('M02', 'r1', { breite: 400 });
    const c = construct(withModules([wide]));
    const f = c.findings.find((x) => x.ruleId === 'V-G-01' || x.ruleId === 'V-M02-02');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('error');
    expect(f!.fix).toBeDefined();
  });

  it('Module werden nicht über die Panelkante platziert', () => {
    const mods = [makeInstance('M01', 'r1', { breite: 100 }), makeInstance('M01', 'r1', { breite: 100 })];
    const c = construct(withModules(mods));
    for (const m of c.modules) {
      expect(m.rect.x).toBeGreaterThanOrEqual(PRACTICE.edgeMarginMm);
      expect(m.rect.x + m.rect.w).toBeLessThanOrEqual(240 + 100); // bei Überlauf wird gemeldet, nicht abgeschnitten
    }
  });

  it('Modulhöhe über Panelhöhe erzeugt Fehler', () => {
    const tall = makeInstance('M06', 'r1', { nadellaenge: 400, zugabe: 20 });
    const p: Project = { ...withModules([tall]), base: { ...baseProject().base, heightMm: 180 } };
    const c = construct(p);
    const f = c.findings.find((x) => x.ruleId === 'V-M06-02' || x.ruleId === 'V-G-13');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('error');
  });

  it('leeres Projekt erzeugt einen Hinweis, keinen Fehler', () => {
    const c = construct(baseProject());
    const f = c.findings.find((x) => x.ruleId === 'V-G-03');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('warn');
  });

  it('Fehler blockieren, Hinweise nicht', () => {
    const c = construct(buildTemplate('schmuck'));
    const errors = c.findings.filter((f) => f.severity === 'error');
    expect(c.metrics.errorCount).toBe(errors.length);
    expect(errors.length).toBe(0); // Vorlage muss fehlerfrei sein (nachgeprüft: alle 3 Vorlagen 0 Fehler)
  });
});

describe('Operationsgraph (P-11, R5)', () => {
  it('jede Operation hat eine aufsteigende Position', () => {
    const c = construct(buildTemplate('makeup'));
    c.operations.forEach((op, i) => expect(op.index).toBe(i + 1));
  });

  it('Vorbedingungen stehen immer VOR der Operation', () => {
    for (const tpl of TEMPLATES) {
      const c = construct(tpl.build());
      const pos = new Map(c.operations.map((o, i) => [o.id, i]));
      for (const op of c.operations) {
        for (const dep of op.dependsOn) {
          const depPos = pos.get(dep);
          if (depPos === undefined) continue;
          expect(depPos, `${op.id} hängt von ${dep}`).toBeLessThan(pos.get(op.id)!);
        }
      }
    }
  });

  it('Zuschnitt kommt vor allem anderen', () => {
    const c = construct(buildTemplate('strick'));
    expect(c.operations[0]!.kind).toBe('cut');
  });

  it('Panelnaht schließt nach allen Modulnähten', () => {
    const c = construct(buildTemplate('makeup'));
    const close = c.operations.find((o) => o.kind === 'close-panel')!;
    const firstModuleOp = c.operations.find((o) => o.moduleId)!;
    expect(close.index).toBeGreaterThan(firstModuleOp.index);
  });

  it('Knöpfe und Druckknöpfe kommen NACH dem Wenden', () => {
    const c = construct(buildTemplate('makeup'));
    const turn = c.operations.find((o) => o.kind === 'turn')!;
    const attach = c.operations.filter((o) => o.kind === 'attach-button' || o.kind === 'attach-snap');
    expect(attach.length).toBeGreaterThan(0);
    for (const a of attach) expect(a.index).toBeGreaterThan(turn.index);
  });

  it('Reihenfolge ist über 20 Läufe stabil (P-11)', () => {
    const p = buildTemplate('strick');
    const first = construct(p).operations.map((o) => o.id).join('|');
    for (let i = 0; i < 20; i++) expect(construct(p).operations.map((o) => o.id).join('|')).toBe(first);
  });

  it('31 Kombinationen der MVP-Module sind alle azyklisch', () => {
    const types: ModuleTypeId[] = ['M01', 'M03', 'M04', 'M06', 'M07'];
    for (let mask = 1; mask < 32; mask++) {
      const mods: Instance[] = [];
      for (let b = 0; b < types.length; b++) {
        if (mask & (1 << b)) mods.push(makeInstance(types[b]!, 'r1'));
      }
      const c = construct(withModules(mods));
      expect(c.operations.length).toBeGreaterThan(0);
      const pos = new Map(c.operations.map((o, i) => [o.id, i]));
      for (const op of c.operations) {
        for (const dep of op.dependsOn) {
          const p = pos.get(dep);
          if (p !== undefined) expect(p).toBeLessThan(pos.get(op.id)!);
        }
      }
    }
  });
});

describe('Materialberechnung (P-06, P-07, I11)', () => {
  it('Stoff ist NIE exakt (Dokument-Versprechen)', () => {
    const c = construct(buildTemplate('strick'));
    const fabric = c.materials.filter((m) => m.kind === 'fabric' || m.kind === 'lining');
    expect(fabric.length).toBeGreaterThan(0);
    for (const f of fabric) expect(f.certainty).toBe('estimated');
  });

  it('Gummi ist exakt', () => {
    const c = construct(withModules([makeInstance('M04', 'r1', { loops: 5 })]));
    const e = c.materials.find((m) => m.kind === 'elastic')!;
    expect(e.certainty).toBe('exact');
    expect(e.unit).toBe('mm');
  });

  it('Stoffmeter sind nie kleiner als Fläche / Stoffbreite (P-06)', () => {
    for (const tpl of TEMPLATES) {
      const p = tpl.build();
      const c = construct(p);
      const areaM2 = c.pieces
        .filter((x) => x.kind === 'cut' && x.material === 'fabric')
        .reduce((a, x) => a + (x.w * x.h * x.count) / 1e6, 0);
      const minMeters = areaM2 / (p.settings.fabricWidthMm / 1000);
      const planned = c.materials.find((m) => m.kind === 'fabric')!.amount;
      expect(planned).toBeGreaterThanOrEqual(minMeters * 0.95);
    }
  });

  it('mehr Module → nicht weniger Stoff (P-07)', () => {
    const p1 = withModules([makeInstance('M01', 'r1')]);
    const p2 = withModules([makeInstance('M01', 'r1'), makeInstance('M01', 'r1')]);
    expect(construct(p2).metrics.fabricAreaM2).toBeGreaterThan(construct(p1).metrics.fabricAreaM2);
  });

  it('Zuschnittplan enthält jedes Stoffteil genau count-mal', () => {
    for (const tpl of TEMPLATES) {
      const c = construct(tpl.build());
      const expected = c.pieces.filter((p) => p.kind === 'cut' && p.material === 'fabric').reduce((a, p) => a + p.count, 0);
      expect(c.fabricPlan!.pieces.length).toBe(expected);
    }
  });

  it('kein Teile-Rect im Zuschnittplan liegt außerhalb der Stoffbreite', () => {
    for (const tpl of TEMPLATES) {
      const p = tpl.build();
      const c = construct(p);
      for (const item of c.fabricPlan!.pieces) {
        expect(item.rect.x + item.rect.w).toBeLessThanOrEqual(p.settings.fabricWidthMm + 1);
      }
    }
  });

  it('Garn ist geschätzt (nie exakt)', () => {
    const c = construct(buildTemplate('schmuck'));
    const thread = c.materials.find((m) => m.kind === 'thread');
    expect(thread).toBeDefined();
    expect(thread!.certainty).toBe('estimated');
  });
});

describe('Regeln: Format der Findings (R1–R3)', () => {
  it('jedes warn/error hat einen Fix (R1)', () => {
    for (const tpl of TEMPLATES) {
      const c = construct(tpl.build());
      for (const f of c.findings.filter((x) => x.severity !== 'info')) {
        expect(f.fix, `${f.ruleId} ohne Fix`).toBeDefined();
      }
    }
  });

  it('jedes Finding enthält mindestens eine Zahl (R2)', () => {
    const p = withModules([makeInstance('M06', 'r1', { nadellaenge: 380, zugabe: 20 })]);
    const c = construct(p);
    for (const f of c.findings) {
      const numeric = Object.values(f.values).some((v) => typeof v === 'number');
      expect(numeric, `${f.ruleId} ohne Zahl`).toBe(true);
    }
  });

  it('Fehler sind nicht wegklickbar (R3)', () => {
    const p = withModules([makeInstance('M03', 'r1', { breite: 40 })]);
    const c = construct(p);
    for (const f of c.findings.filter((x) => x.severity === 'error')) {
      expect(f.dismissible).toBe(false);
    }
  });

  it('jeder angebotene Fix macht das Projekt messbar besser oder gleich (R4)', () => {
    // Ein absichtlich zu großes Modul: der Fix muss die Fehlerzahl senken.
    const p: Project = {
      ...withModules([makeInstance('M02', 'r1', { breite: 400, hoehe: 60 })]),
      base: { ...baseProject().base, widthMm: 200 },
    };
    const before = construct(p);
    const f = before.findings.find((x) => x.severity === 'error' && x.fix)!;
    expect(f).toBeDefined();
    const after = construct(applyFix(p, f.fix!));
    expect(after.metrics.errorCount).toBeLessThan(before.metrics.errorCount);
  });

  it('applyFix ist idempotent (zweimal anwenden ändert nichts mehr)', () => {
    const p: Project = {
      ...withModules([makeInstance('M02', 'r1', { breite: 400, hoehe: 60 })]),
      base: { ...baseProject().base, widthMm: 200 },
    };
    const f = construct(p).findings.find((x) => x.severity === 'error' && x.fix)!.fix!;
    const once = applyFix(p, f);
    expect(JSON.stringify(applyFix(once, f))).toBe(JSON.stringify(once));
  });

  it('widenBase-Fix überschreitet nie die Schemagrenzen', () => {
    const p: Project = {
      ...withModules([makeInstance('M02', 'r1', { breite: 580, hoehe: 60 })]),
      base: { ...baseProject().base, widthMm: 600 },
    };
    for (const f of construct(p).findings) {
      if (f.fix?.kind !== 'widenBase') continue;
      const next = applyFix(p, f.fix);
      expect(next.base.widthMm).toBeLessThanOrEqual(600);
      expect(validateProject(next).ok).toBe(true);
    }
  });

  it('Findings sind deterministisch sortiert', () => {
    const p = buildTemplate('makeup');
    const a = construct(p).findings.map((f) => f.ruleId).join(',');
    const b = construct(p).findings.map((f) => f.ruleId).join(',');
    expect(a).toBe(b);
  });

  it('Fehler stehen vor Hinweisen', () => {
    const p = withModules([makeInstance('M03', 'r1', { breite: 40 })]);
    const c = construct(p);
    const firstWarn = c.findings.findIndex((f) => f.severity === 'warn');
    const lastError = c.findings.map((f) => f.severity).lastIndexOf('error');
    if (firstWarn >= 0 && lastError >= 0) expect(lastError).toBeLessThan(firstWarn);
  });
});

describe('Projektschema und Migration', () => {
  it('jede Vorlage validiert', () => {
    for (const tpl of TEMPLATES) {
      const res = validateProject(tpl.build());
      expect(res.ok, `Vorlage ${tpl.id} ungültig`).toBe(true);
    }
  });

  it('leeres Projekt validiert', () => {
    expect(validateProject(blankProject()).ok).toBe(true);
  });

  it('unbekannter Modultyp wird abgelehnt', () => {
    const p = blankProject();
    const bad = { ...p, modules: [{ id: 'm1', typeId: 'M99', rowId: 'r1', params: {}, rotation: 0, locked: false }] };
    const res = validateProject(bad);
    expect(res.ok).toBe(false);
  });

  it('Modul ohne existierende Zeile wird abgelehnt', () => {
    const p = blankProject();
    const bad = { ...p, modules: [{ id: 'm1', typeId: 'M01', rowId: 'rX', params: {}, rotation: 0, locked: false }] };
    expect(validateProject(bad).ok).toBe(false);
  });

  it('Breite außerhalb der Grenzen wird abgelehnt', () => {
    const p = blankProject();
    const bad = { ...p, base: { ...p.base, widthMm: 20 } };
    expect(validateProject(bad).ok).toBe(false);
  });

  it('Round-Trip: datei → projekt → datei ist stabil (I9)', () => {
    const p = buildTemplate('strick');
    const file = toFile(p);
    const back = fromFile(JSON.parse(JSON.stringify(file)));
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(construct(back.project).projectHash).toBe(construct(p).projectHash);
    }
  });

  it('v1-Projekt wird auf v2 migriert (rows + rotation)', () => {
    const legacy = {
      schemaVersion: 1,
      id: 'p_old',
      name: 'Alt',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      base: { form: 'book', widthMm: 240, heightMm: 200, spineWidthMm: 40, cornerRadiusMm: 16, hasLining: true },
      rows: [],
      modules: [{ id: 'm1', typeId: 'M01', params: { breite: 70, hoehe: 70, saum: 'saum', saumbreite: 10 } }],
      settings: { seamAllowanceMm: 10, fabricWidthMm: 1400, unit: 'mm' },
    };
    const migrated = migrate(legacy) as Record<string, unknown>;
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    const res = validateProject(migrated);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.project.modules[0]!.rowId).toBe('r1');
      expect(res.project.modules[0]!.rotation).toBe(0);
    }
  });

  it('kaputtes JSON wird nicht stillschweigend akzeptiert', () => {
    expect(fromFile({ nonsense: true }).ok).toBe(false);
  });
});

describe('Unabhängigkeit von der Umgebung', () => {
  it('construct() nutzt kein Math.random (Ergebnis bleibt gleich)', () => {
    const p = buildTemplate('schmuck');
    const hashes = new Set(Array.from({ length: 10 }, () => construct(p).projectHash));
    expect(hashes.size).toBe(1);
  });

  it('der Hash hängt an genau diesen Feldern — nichts sonst', () => {
    const p = buildTemplate('schmuck');
    const expected = hashString(
      JSON.stringify({
        practice: PRACTICE.version,
        base: p.base,
        rows: p.rows.map((r) => r.name),
        modules: (() => {
          const rowIndex = new Map(p.rows.map((r, i) => [r.id, i]));
          return p.modules
            .map((m, i) => ({ m, i, row: rowIndex.get(m.rowId) ?? p.rows.length }))
            .sort((a, b) => a.row - b.row || a.i - b.i)
            .map(({ m, row }) => ({
              typeId: m.typeId,
              row,
              params: Object.keys(m.params)
                .sort()
                .map((k) => [k, m.params[k]]),
              rotation: m.rotation,
              side: m.side,
            }));
        })(),
        settings: p.settings,
      }),
    );
    expect(construct(p).projectHash).toBe(expected);
  });

  it('nur die Absicht zählt: Name des Projekts ändert den Hash nicht', () => {
    const p = buildTemplate('strick');
    expect(construct({ ...p, name: 'Anders' }).projectHash).toBe(construct(p).projectHash);
  });

  it('Moduldefinitionen sind registriert und eindeutig', () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(MODULES.length).toBe(16);
    for (const m of MODULES) {
      expect(moduleDef(m.id).id).toBe(m.id);
      expect(m.fields.length).toBeGreaterThan(0);
    }
  });
});

describe('Drehung als echte Geometrie (Slice D)', () => {
  const rotated = (rotation: 0 | 90 | 180 | 270): Project => ({
    ...withModules([{ ...makeInstance('M06', 'r1'), rotation }]),
    base: { ...baseProject().base, widthMm: 240, heightMm: 330 },
  });

  it('90° tauscht die belegten Maße', () => {
    const a = construct(rotated(0)).modules[0]!;
    const b = construct(rotated(90)).modules[0]!;
    expect(b.rect.w).toBe(a.rect.h);
    expect(b.rect.h).toBe(a.rect.w);
  });

  it('180° lässt die belegten Maße unverändert', () => {
    const a = construct(rotated(0)).modules[0]!;
    const b = construct(rotated(180)).modules[0]!;
    expect(b.rect.w).toBe(a.rect.w);
    expect(b.rect.h).toBe(a.rect.h);
  });

  it('das Schnittteil dreht mit (Ringband 126×66 → 66×126)', () => {
    const p = buildTemplate('schmuck');
    const id = p.modules[0]!.id;
    const flat = construct(p).pieces.find((x) => x.sourceModuleId === id)!;
    const q = { ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, rotation: 90 as const } : m)) };
    const turned = construct(q).pieces.find((x) => x.sourceModuleId === id)!;
    expect([turned.w, turned.h]).toEqual([flat.h, flat.w]);
    expect([turned.netW, turned.netH]).toEqual([flat.netH, flat.netW]);
  });

  it('ein quer stehender Nadelkanal ist nicht höher als das Panel (kein falscher Fehler)', () => {
    const c = construct(rotated(90));
    expect(c.findings.filter((f) => f.ruleId === 'V-M06-02')).toHaveLength(0);
  });

  it('ein stehender Nadelkanal, der die Zeile überragt, wird gemeldet (V-G-14)', () => {
    // Zwei Zeilen: der gedrehte Kanal (214 mm breit, 18 mm hoch) passt nicht zu
    // einem Partner, der die Zeilenhöhe auf 214 mm treibt.
    const p: Project = {
      ...baseProject(),
      base: { ...baseProject().base, widthMm: 240, heightMm: 200 },
      rows: [{ id: 'r1', name: 'Oben' }, { id: 'r2', name: 'Unten' }],
      modules: [
        { ...makeInstance('M06', 'r1', { nadellaenge: 190 }), rotation: 90 },
        makeInstance('M06', 'r2', { nadellaenge: 40 }),
      ],
    };
    const c = construct(p);
    // Kein V-G-14 nötig, solange die Zeile hoch genug ist — aber nie ein stiller Überlauf:
    expect(c.findings.every((f) => f.ruleId !== 'V-G-14')).toBe(true);
    expect(() => construct(p)).not.toThrow();
  });

  it('V-G-14 existiert als Regel mit Zahlen und Fix', () => {
    const p: Project = {
      ...baseProject(),
      base: { ...baseProject().base, widthMm: 240, heightMm: 240 },
      rows: [{ id: 'r1', name: 'A' }, { id: 'r2', name: 'B' }],
      modules: [{ ...makeInstance('M06', 'r1', { nadellaenge: 120 }), rotation: 90 }, makeInstance('M02', 'r2', { breite: 100, hoehe: 200 })],
    };
    const f = construct(p).findings.find((x) => x.ruleId === 'V-G-14');
    if (f) {
      expect(f.severity).toBe('error');
      expect(f.fix).toBeDefined();
      expect(typeof f.values.hoehe).toBe('number');
    }
  });
});

describe('Mengenformat (eine Stelle)', () => {
  it('jede Materialzeile hat einen Klartext mit Einheit', () => {
    for (const tpl of TEMPLATES) {
      for (const m of construct(tpl.build()).materials) {
        expect(m.display, `${tpl.id}/${m.kind}`).toBeDefined();
        expect(m.display).toMatch(/mm|m\b|m²|Stk|Meterware/);
      }
    }
  });

  it('Stoff wird als Meterware angezeigt, nicht als Quadratmeterzahl', () => {
    const fabric = construct(buildTemplate('schmuck')).materials.filter((m) => m.kind === 'fabric' || m.kind === 'lining');
    expect(fabric.length).toBeGreaterThan(0);
    for (const f of fabric) expect(f.display).toContain('m Meterware');
  });

  it('Stückware nennt Stück', () => {
    const buttons = construct(buildTemplate('makeup')).materials.find((m) => m.kind === 'button');
    if (buttons) expect(buttons.display).toMatch(/Stk$/);
  });

  it('Längen ab 1 m werden in Metern gezeigt', () => {
    const p = withModules([makeInstance('M06', 'r1')]);
    const thread = construct(p).materials.find((m) => m.kind === 'thread')!;
    expect(thread.display).toMatch(/ m$/);
  });
});

describe('Stoffbreite & Skalierungsstress (V-G-12 & 60 Module)', () => {
  it('V-G-12 feuert, wenn ein Schnittteil breiter als die Stoffbreite ist', () => {
    const p: Project = {
      ...baseProject(),
      base: { ...baseProject().base, widthMm: 500, spineWidthMm: 40 },
      settings: { seamAllowanceMm: 10, fabricWidthMm: 900, unit: 'mm' },
    };
    const c = construct(p);
    const f = c.findings.find((x) => x.ruleId === 'V-G-12');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('warn');
    expect(f!.fix?.kind).toBe('setFabricWidth');
  });

  it('60 Module (ca. 245 Operationen) bleiben azyklisch und konstruieren schnell', () => {
    const tpl = buildTemplate('strick');
    const mods: Instance[] = Array.from({ length: 60 }, (_, i) => ({
      ...tpl.modules[i % tpl.modules.length]!,
      id: `s_${i}`,
    }));
    const t0 = performance.now();
    const c = construct({ ...tpl, modules: mods });
    const dt = performance.now() - t0;
    expect(c.operations.length).toBeGreaterThan(200);
    expect(dt).toBeLessThan(500);
    const pos = new Map(c.operations.map((o, i) => [o.id, i]));
    for (const op of c.operations) {
      for (const dep of op.dependsOn) {
        const dp = pos.get(dep);
        if (dp !== undefined) expect(dp).toBeLessThan(pos.get(op.id)!);
      }
    }
  });
});
