/**
 * T-S-02…T-S-06, T-M-01: Schema, Migration, Persistenz, Referenzintegrität.
 * Geprüft wird der Projektvertrag — nicht die Konstruktion (siehe construction.test.ts).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  addRow,
  blankProject,
  buildTemplate,
  deleteFromLibrary,
  duplicateInstance,
  fromFile,
  loadCurrent,
  loadLibrary,
  makeInstance,
  migrate,
  moveInstance,
  removeInstance,
  removeRow,
  renameRow,
  saveCurrent,
  saveToLibrary,
  TEMPLATES,
  toFile,
  updateParams,
  validateProject,
  type ProjectFile,
} from '../core/project';
import { construct, SCHEMA_VERSION, type Instance, type Project } from '../core/construction';
import { moduleDef } from '../core/modules';

// localStorage-Shim (vitest läuft im node-Env; die Persistenz ist trotzdem testbar)
beforeEach(() => {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
      get length() {
        return map.size;
      },
      key: (i: number) => [...map.keys()][i] ?? null,
    },
  });
});

describe('Schematreue (FR-70, I5)', () => {
  it('SCHEMA_VERSION ist 3', () => {
    expect(SCHEMA_VERSION).toBe(3);
  });

  it('jede Vorlage trägt die aktuelle Schemaversion', () => {
    for (const t of TEMPLATES) expect(t.build().schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('exportierte Datei nennt Format, Version und Appversion', () => {
    const file = toFile(buildTemplate('schmuck'));
    expect(file.format).toBe('organizer-studio/project');
    expect(file.schemaVersion).toBe(SCHEMA_VERSION);
    expect(file.appVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Date.parse(file.exportedAt)).not.toBeNaN();
  });

  it('das Serialisat enthält KEINE Berechnungsergebnisse (I10)', () => {
    const json = JSON.stringify(toFile(buildTemplate('strick')));
    for (const forbidden of ['"pieces"', '"materials"', '"operations"', '"findings"', '"projectHash"', '"fabricPlan"', '"netRect"', '"cutRect"']) {
      expect(json.includes(forbidden), `Serialisat enthält ${forbidden}`).toBe(false);
    }
  });

  it('nur die erlaubten Felder stehen im Projekt', () => {
    const p = buildTemplate('makeup');
    expect(Object.keys(p).sort()).toEqual(
      ['base', 'createdAt', 'id', 'modules', 'name', 'rows', 'schemaVersion', 'settings', 'updatedAt'].sort(),
    );
    expect(Object.keys(p.base).sort()).toEqual(
      ['cornerRadiusMm', 'form', 'hasLining', 'heightMm', 'spineWidthMm', 'widthMm'].sort(),
    );
    // K-02: keine Tiefe im Schema
    expect('depthMm' in p.base).toBe(false);
  });
});

describe('Validierung (I1–I4)', () => {
  const bad = (mutate: (p: Project) => unknown): unknown => mutate(blankProject());

  it('leeres Projekt ist gültig', () => {
    expect(validateProject(blankProject()).ok).toBe(true);
  });

  it('null/false/[]/String werden abgelehnt', () => {
    for (const v of [null, false, [], 'projekt', 42, undefined]) {
      expect(validateProject(v).ok, `validateProject(${JSON.stringify(v)})`).toBe(false);
    }
  });

  it('doppelte Modul-IDs werden abgelehnt (I1)', () => {
    const p = blankProject();
    const m = makeInstance('M01', 'r1');
    const res = validateProject({ ...p, modules: [m, { ...m }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.issues.some((i) => i.path === 'modules')).toBe(true);
  });

  it('Modul mit unbekannter Zeile wird abgelehnt (I2)', () => {
    const p = blankProject();
    const res = validateProject({ ...p, modules: [{ ...makeInstance('M01', 'r1'), rowId: 'gibtsnicht' }] });
    expect(res.ok).toBe(false);
  });

  it('unbekannter Modultyp wird abgelehnt', () => {
    const p = blankProject();
    const res = validateProject({ ...p, modules: [{ ...makeInstance('M01', 'r1'), typeId: 'M42' }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.issues[0]!.message).toContain('M42');
  });

  it('jeder der 16 Modultypen wird akzeptiert', () => {
    const p = blankProject();
    for (const id of ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'] as const) {
      const res = validateProject({ ...p, modules: [makeInstance(id, 'r1')] });
      expect(res.ok, id).toBe(true);
    }
  });

  it('Grenzwerte der Basis werden gehalten (I4)', () => {
    for (const [w, h] of [[79, 200], [601, 200], [200, 79], [200, 601], [200.5, 200]]) {
      const res = validateProject(bad((p) => ({ ...p, base: { ...p.base, widthMm: w, heightMm: h } })));
      expect(res.ok, `${w}×${h}`).toBe(false);
    }
    for (const [w, h] of [[80, 80], [600, 600]]) {
      expect(validateProject(bad((p) => ({ ...p, base: { ...p.base, widthMm: w, heightMm: h } }))).ok).toBe(true);
    }
  });

  it('Nahtzugabe außerhalb 4…20 mm wird abgelehnt', () => {
    for (const nz of [3, 21]) {
      expect(validateProject(bad((p) => ({ ...p, settings: { ...p.settings, seamAllowanceMm: nz } }))).ok).toBe(false);
    }
    for (const nz of [4, 20]) {
      expect(validateProject(bad((p) => ({ ...p, settings: { ...p.settings, seamAllowanceMm: nz } }))).ok).toBe(true);
    }
  });

  it('Rotation ist auf 0/90/180/270 beschränkt', () => {
    const p = blankProject();
    expect(validateProject({ ...p, modules: [{ ...makeInstance('M01', 'r1'), rotation: 45 }] }).ok).toBe(false);
    for (const rotation of [0, 90, 180, 270]) {
      expect(validateProject({ ...p, modules: [{ ...makeInstance('M01', 'r1'), rotation }] }).ok, String(rotation)).toBe(true);
    }
  });

  it('ein Projekt ohne Zeile wird abgelehnt (rows min 1)', () => {
    expect(validateProject(bad((p) => ({ ...p, rows: [] }))).ok).toBe(false);
  });

  it('mehr als 8 Zeilen werden abgelehnt', () => {
    const p = blankProject();
    const manyRows = Array.from({ length: 9 }, (_, i) => ({ id: `r${i}`, name: `Z${i}` }));
    expect(validateProject({ ...p, rows: manyRows }).ok).toBe(false);
  });
});

describe('Migration (I5)', () => {
  const v1 = {
    schemaVersion: 1,
    id: 'p_alt',
    name: 'Altes Projekt',
    createdAt: '2025-05-05T00:00:00.000Z',
    updatedAt: '2025-05-05T00:00:00.000Z',
    base: { form: 'book', widthMm: 230, heightMm: 180, spineWidthMm: 32, cornerRadiusMm: 18, hasLining: true },
    rows: [],
    modules: [
      { id: 'm1', typeId: 'M06', params: { nadellaenge: 200, nadelstaerke: 4, paare: 1, zugabe: 14, verstaerkung: true } },
      { id: 'm2', typeId: 'M04', params: { breite: 140, loops: 6 } },
    ],
    settings: { seamAllowanceMm: 10, fabricWidthMm: 1400, unit: 'mm' },
  };

  it('v1 → v3 ergänzt Zeile, rotation, locked, side', () => {
    const m = migrate(v1) as Project;
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.rows).toHaveLength(1);
    expect(m.modules.every((x) => x.rowId === 'r1')).toBe(true);
    expect(m.modules.every((x) => x.rotation === 0 && x.locked === false)).toBe(true);
    // v3: migrierte Module erhalten nicht-destruktiv die linke Innenfläche.
    expect(m.modules.every((x) => x.side === 'left')).toBe(true);
  });

  it('migriertes v1-Projekt validiert und konstruiert', () => {
    const res = validateProject(migrate(v1));
    expect(res.ok).toBe(true);
    if (res.ok) {
      const c = construct(res.project);
      expect(c.modules).toHaveLength(2);
      // v1 bringt keine Zeilen mit: alle Module landen in EINER Zeile — dass das
      // eng wird (Nadelkanal 214 mm + Loops), ist eine ehrliche Meldung, kein Fehler der Migration.
      expect(c.rows).toHaveLength(1);
      expect(c.modules.every((m) => m.rowId === 'r1')).toBe(true);
    }
  });

  it('Migration ist idempotent', () => {
    const once = migrate(v1);
    expect(JSON.stringify(migrate(once))).toBe(JSON.stringify(once));
  });

  it('Migration von Unsinn liefert Unsinn zurück (kein Crash)', () => {
    expect(() => migrate(null)).not.toThrow();
    expect(() => migrate('x')).not.toThrow();
    expect(validateProject(migrate({ foo: 'bar' })).ok).toBe(false);
  });

  it('eine Datei mit Hülle wird genauso migriert wie ein nacktes Projekt', () => {
    const wrapped = { format: 'organizer-studio/project', schemaVersion: 1, project: v1 };
    const a = migrate(wrapped) as Project;
    const b = migrate(v1) as Project;
    expect(a.modules.length).toBe(b.modules.length);
    expect(construct(a).projectHash).toBe(construct(b).projectHash);
  });
});

describe('Round-Trip (I9)', () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))('%s überlebt export → import', (_id, tpl) => {
    const p = tpl.build();
    const file: ProjectFile = toFile(p);
    const wire = JSON.parse(JSON.stringify(file));
    const back = fromFile(wire);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(construct(back.project).projectHash).toBe(construct(p).projectHash);
    expect(back.project.name).toBe(p.name);
    expect(back.project.modules.length).toBe(p.modules.length);
  });

  it('Doppel-Export ist byte-gleich bis auf exportedAt', () => {
    const p = buildTemplate('schmuck');
    const a = toFile(p);
    const b = toFile(p);
    expect({ ...a, exportedAt: '' }).toEqual({ ...b, exportedAt: '' });
  });

  it('ein manipulierter Import wird abgelehnt, nicht repariert', () => {
    const file = toFile(buildTemplate('strick'));
    const broken = { ...file, project: { ...file.project, base: { ...file.project.base, widthMm: 5000 } } };
    expect(fromFile(broken).ok).toBe(false);
  });
});

describe('Projektoperationen', () => {
  const withTwo = (): Project => {
    const p = blankProject();
    return { ...p, modules: [makeInstance('M01', 'r1'), makeInstance('M09', 'r1')] };
  };

  it('duplizieren erzeugt eine neue ID und hängt direkt dahinter', () => {
    const p = withTwo();
    const src = p.modules[0]!;
    const q = duplicateInstance(p, src.id);
    expect(q.modules).toHaveLength(3);
    expect(q.modules[1]!.id).not.toBe(src.id);
    expect(q.modules[1]!.typeId).toBe(src.typeId);
    expect(q.modules[1]!.params).toEqual(src.params);
    expect(validateProject(q).ok).toBe(true);
  });

  it('duplizieren einer unbekannten ID ändert nichts', () => {
    const p = withTwo();
    expect(duplicateInstance(p, 'gibtsnicht')).toBe(p);
  });

  it('Kopie hat eigene Parameter (kein geteiltes Objekt)', () => {
    const p = withTwo();
    const q = duplicateInstance(p, p.modules[0]!.id);
    const copy = q.modules[1]!;
    const edited = updateParams(q, copy.id, 'breite', 55);
    expect(edited.modules[1]!.params.breite).toBe(55);
    expect(edited.modules[0]!.params.breite).toBe(moduleDef('M01').defaults.breite);
  });

  it('löschen entfernter IDs lässt referenzintegres Projekt zurück', () => {
    const p = withTwo();
    const q = removeInstance(p, [p.modules[0]!.id]);
    expect(q.modules).toHaveLength(1);
    expect(validateProject(q).ok).toBe(true);
  });

  it('löschen mehrerer IDs auf einmal', () => {
    const p = withTwo();
    const q = removeInstance(p, p.modules.map((m) => m.id));
    expect(q.modules).toHaveLength(0);
    expect(validateProject(q).ok).toBe(true);
  });

  it('Parameteränderung erzeugt ein neues Objekt (Immutabilität)', () => {
    const p = withTwo();
    const before = JSON.stringify(p);
    updateParams(p, p.modules[0]!.id, 'hoehe', 33);
    expect(JSON.stringify(p)).toBe(before);
  });

  it('Verschieben in eine andere Zeile hält die Referenz gültig', () => {
    const p = addRow(withTwo());
    const target = p.rows[1]!.id;
    const q = moveInstance(p, p.modules[0]!.id, target, 0);
    expect(q.modules.find((m) => m.id === p.modules[0]!.id)!.rowId).toBe(target);
    expect(validateProject(q).ok).toBe(true);
  });

  it('Zeile löschen entfernt ihre Module mit', () => {
    let p = addRow(withTwo());
    p = moveInstance(p, p.modules[0]!.id, p.rows[1]!.id, 0);
    const q = removeRow(p, p.rows[1]!.id);
    expect(q.rows).toHaveLength(1);
    expect(q.modules).toHaveLength(1);
    expect(validateProject(q).ok).toBe(true);
  });

  it('die letzte Zeile lässt sich nicht löschen', () => {
    const p = blankProject();
    expect(removeRow(p, p.rows[0]!.id).rows).toHaveLength(1);
  });

  it('Zeile umbenennen ändert nur den Namen', () => {
    const p = withTwo();
    const q = renameRow(p, 'r1', 'Nadeln');
    expect(q.rows[0]!.name).toBe('Nadeln');
    expect(q.modules).toEqual(p.modules);
  });
});

describe('Persistenz (localStorage)', () => {
  it('Speichern und Laden erhält alle Projekte', () => {
    const a = buildTemplate('schmuck');
    const b = buildTemplate('strick');
    saveToLibrary({ ...a, updatedAt: '2026-01-02T00:00:00.000Z' });
    saveToLibrary({ ...b, updatedAt: '2026-01-03T00:00:00.000Z' });
    const lib = loadLibrary();
    expect(lib).toHaveLength(2);
    expect(lib[0]!.id).toBe(b.id); // neuestes zuerst
  });

  it('erneutes Speichern derselben ID überschreibt statt zu duplizieren', () => {
    const a = buildTemplate('schmuck');
    saveToLibrary(a);
    saveToLibrary({ ...a, name: 'Schmuck 2' });
    const lib = loadLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0]!.name).toBe('Schmuck 2');
  });

  it('die Bibliothek ist auf 30 Einträge begrenzt', () => {
    for (let i = 0; i < 35; i++) {
      saveToLibrary({ ...blankProject(`P${i}`), id: `p${i}`, updatedAt: new Date(2026, 0, 1 + i).toISOString() });
    }
    expect(loadLibrary().length).toBe(30);
  });

  it('Löschen entfernt genau einen Eintrag', () => {
    const a = buildTemplate('schmuck');
    const b = buildTemplate('makeup');
    saveToLibrary(a);
    saveToLibrary(b);
    deleteFromLibrary(a.id);
    const lib = loadLibrary();
    expect(lib).toHaveLength(1);
    expect(lib[0]!.id).toBe(b.id);
  });

  it('kaputter Speicherinhalt wird ignoriert, nicht geworfen', () => {
    localStorage.setItem('os.projects.v2', '{{{kein json');
    expect(loadLibrary()).toEqual([]);
    localStorage.setItem('os.projects.v2', JSON.stringify([{ project: { kaputt: true } }, null, 42]));
    expect(loadLibrary()).toEqual([]);
  });

  it('ein gespeichertes Projekt bleibt hashgleich nach dem Neuladen', () => {
    const p = buildTemplate('makeup');
    saveToLibrary(p);
    const back = loadLibrary()[0]!.project;
    expect(construct(back).projectHash).toBe(construct(p).projectHash);
  });

  it('aktuelles Projekt speichern/laden/verwerfen', () => {
    const p = buildTemplate('strick');
    saveCurrent(p);
    expect(loadCurrent()?.id).toBe(p.id);
    expect(construct(loadCurrent()!).projectHash).toBe(construct(p).projectHash);
  });

  it('ohne gespeichertes Projekt liefert loadCurrent null', () => {
    expect(loadCurrent()).toBeNull();
  });
});

describe('Modul-Parametervertrag', () => {
  it('makeInstance nutzt die Defaults des Moduls', () => {
    const inst = makeInstance('M06', 'r1');
    expect(inst.params).toEqual(moduleDef('M06').defaults);
  });

  it('Overrides überschreiben nur den genannten Schlüssel', () => {
    const inst = makeInstance('M06', 'r1', { nadellaenge: 150 });
    expect(inst.params.nadellaenge).toBe(150);
    expect(inst.params.nadelstaerke).toBe(moduleDef('M06').defaults.nadelstaerke);
  });

  it('jedes Modul hat Defaults, die im Schemabereich liegen', () => {
    const p = blankProject();
    for (const def of ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'] as const) {
      const inst: Instance = makeInstance(def, 'r1');
      const res = validateProject({ ...p, modules: [inst] });
      expect(res.ok, `${def}: ${JSON.stringify(res.ok ? '' : res.issues)}`).toBe(true);
    }
  });

  it('alle 16 Module in einer Zeile validieren weiterhin (Grenzfall)', () => {
    const ids = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16'] as const;
    const p: Project = { ...blankProject(), modules: ids.map((id) => makeInstance(id, 'r1')) };
    expect(validateProject(p).ok).toBe(true);
    // Die Konstruktion muss das melden dürfen, ohne zu werfen (V-G-01/V-G-09).
    expect(() => construct(p)).not.toThrow();
    expect(construct(p).metrics.warnCount).toBeGreaterThan(0);
  });
});

describe('applyFix lässt den Zeitstempel in Ruhe', () => {
  it('behält updatedAt bei — der Kern liest keine Uhr', async () => {
    const { applyFix } = await import('../core/fixes');
    const p = buildTemplate('schmuck');
    const q = applyFix(p, { kind: 'widenBase', toMm: 300 } as never);
    expect(q.base.widthMm).toBe(300);
    expect(q.updatedAt).toBe(p.updatedAt);
    expect(q.updatedAt.startsWith('1970')).toBe(false);
  });
});

describe('Security & Boundary-Validierung', () => {
  it('lehnt Prototype-Pollution-Keys (__proto__, constructor, prototype) ab', () => {
    const p = blankProject();
    const m = makeInstance('M01', 'r1');
    const polluted = JSON.parse(`{"schemaVersion":2,"id":"p1","name":"X","createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z","base":${JSON.stringify(p.base)},"rows":${JSON.stringify(p.rows)},"modules":[{"id":"m1","typeId":"M01","rowId":"r1","params":{"breite":70,"hoehe":70,"__proto__":1},"rotation":0,"locked":false}],"settings":${JSON.stringify(p.settings)}}`);
    expect(validateProject(polluted).ok).toBe(false);
    const up = updateParams({ ...p, modules: [m] }, m.id, 'constructor', 99);
    expect(Object.hasOwn(up.modules[0]!.params, 'constructor')).toBe(false);
  });

  it('lehnt zukünftige Schema-Versionen, NaN/out-of-range Parameter und count < 1 ab', () => {
    const p = blankProject();
    expect(validateProject({ ...p, schemaVersion: 99 }).ok).toBe(false);
    const m = makeInstance('M04', 'r1', { loops: 0 });
    expect(validateProject({ ...p, modules: [m] }).ok).toBe(false);
    const mNeg = makeInstance('M01', 'r1', { breite: -5 });
    expect(validateProject({ ...p, modules: [mNeg] }).ok).toBe(false);
    const mHuge = makeInstance('M01', 'r1', { breite: 5001 });
    expect(validateProject({ ...p, modules: [mHuge] }).ok).toBe(false);
  });
});


describe('toFile — Export-Vertrag (Issue #14)', () => {
  it('leert ein leeres Namensfeld auf einen gültigen Namen', () => {
    const p = { ...buildTemplate('schmuck'), name: '' };
    const file = toFile(p);
    expect(file.project.name.trim().length).toBeGreaterThan(0);
    // und ist re-importierbar (Zod: name min 1)
    expect(fromFile(file).ok).toBe(true);
  });

  it('getrimmter Leername wird ebenfalls normalisiert', () => {
    const p = { ...buildTemplate('schmuck'), name: '   ' };
    const file = toFile(p);
    expect(file.project.name.trim().length).toBeGreaterThan(0);
  });
});
