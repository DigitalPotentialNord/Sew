/**
 * Store-Tests — die Persistenz-, Undo/Redo- und Fehlerpfade, die sonst niemand
 * testet. Der Store ist ein Singleton; zwischen den Tests wird sein Zustand
 * auf einen frischen Vorlagen-Stand zurückgesetzt und localStorage geleert.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../state/store';
import { buildTemplate, toFile } from '../core/project';
import { SCHEMA_VERSION } from '../core/construction';

const initial = useStore.getState();

const freshLocalStorage = (options?: { throwOnWrite?: boolean }): void => {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (options?.throwOnWrite) throw new DOMException('QuotaExceeded', 'QuotaExceededError');
        map.set(k, v);
      },
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
      get length() {
        return map.size;
      },
      key: (i: number) => [...map.keys()][i] ?? null,
      __map: map, // Test-Handles für Assertions
    },
  });
};

const reset = (): void => {
  freshLocalStorage();
  useStore.setState(
    {
      ...initial,
      project: buildTemplate('schmuck'),
      past: [],
      future: [],
      session: { ...initial.session, selection: [], view: 'editor' },
      saved: false,
      toasts: [],
      revision: 0,
      library: [],
    },
    true,
  );
};

describe('Store: Grundoperationen', () => {
  beforeEach(reset);
  afterEach(() => vi.useRealTimers());

  it('startet mit der Schmuck-Vorlage und leerem Verlauf', () => {
    const s = useStore.getState();
    expect(s.project.name).toBe('Schmuck-Organizer');
    expect(s.past).toEqual([]);
    expect(s.future).toEqual([]);
    expect(s.revision).toBe(0);
  });

  it('addModule fügt ein Modul an und wählt es aus', () => {
    const before = useStore.getState().project.modules.length;
    useStore.getState().addModule('M01');
    const s = useStore.getState();
    expect(s.project.modules.length).toBe(before + 1);
    expect(s.session.selection).toEqual([s.project.modules[s.project.modules.length - 1]!.id]);
    expect(s.revision).toBe(1);
    expect(s.past.length).toBe(1);
  });

  it('undo/redo stellen den Stand exakt wieder her', () => {
    const before = useStore.getState().project;
    useStore.getState().addModule('M01');
    useStore.getState().undo();
    expect(useStore.getState().project).toEqual(before);
    useStore.getState().redo();
    expect(useStore.getState().project.modules.length).toBe(before.modules.length + 1);
  });

  it('remove löscht Module und leert die Auswahl', () => {
    const id = useStore.getState().addModule('M01');
    useStore.getState().remove([id]);
    const s = useStore.getState();
    expect(s.project.modules.some((m) => m.id === id)).toBe(false);
    expect(s.session.selection).toEqual([]);
  });

  it('duplicate erzeugt eine Kopie direkt hinter dem Original mit neuer ID', () => {
    useStore.getState().addModule('M01');
    const src = useStore.getState().project.modules.at(-1)!;
    useStore.getState().duplicate(src.id);
    const mods = useStore.getState().project.modules;
    const at = mods.findIndex((m) => m.id === src.id);
    expect(mods[at + 1]!.typeId).toBe(src.typeId);
    expect(mods[at + 1]!.id).not.toBe(src.id);
  });
});

describe('Store: Persistenz', () => {
  beforeEach(reset);

  it('save persistiert in Bibliothek und current, meldet saved', () => {
    useStore.getState().save();
    const s = useStore.getState();
    expect(s.saved).toBe(true);
    expect(s.library.length).toBe(1);
    expect(s.library[0]!.project.id).toBe(s.project.id);
    expect(s.toasts.some((x) => x.tone === 'ok')).toBe(true);
  });

  it('save ohne schreibbaren Storage: ehrlich Fehler-Toast, saved bleibt false', () => {
    freshLocalStorage({ throwOnWrite: true });
    useStore.getState().save();
    const s = useStore.getState();
    expect(s.saved).toBe(false);
    expect(s.toasts.some((x) => x.tone === 'error')).toBe(true);
    expect(s.toasts.at(-1)!.message).toContain('fehlgeschlagen');
  });

  it('loadStored mit unbekannter ID lässt den Stand unberührt', () => {
    const before = useStore.getState().project;
    useStore.getState().loadStored('gibts-nicht');
    expect(useStore.getState().project).toBe(before);
  });

  it('nach save() löst loadTemplate/newProject/resetToSaved keine Verwerfen-Rückfrage aus', () => {
    useStore.getState().addModule('M01');
    useStore.getState().save();
    // Alle ohne force — dürfen NICHT pendingDiscard setzen
    useStore.getState().loadTemplate('makeup');
    expect(useStore.getState().pendingDiscard).toBeNull();
    expect(useStore.getState().project.base.widthMm).toBe(280);

    useStore.getState().addModule('M09');
    useStore.getState().save();
    useStore.getState().newProject();
    expect(useStore.getState().pendingDiscard).toBeNull();

    useStore.getState().addModule('M04');
    useStore.getState().save();
    useStore.getState().resetToSaved();
    expect(useStore.getState().pendingDiscard).toBeNull();

    // loadStored gegen die frisch gespeicherte Bibliothek — ohne force
    const id = useStore.getState().project.id;
    useStore.getState().addModule('M01');
    useStore.getState().save();
    useStore.getState().loadStored(id);
    expect(useStore.getState().pendingDiscard).toBeNull();
  });

  it('nach save() löst importProject keine Verwerfen-Rückfrage aus', () => {
    useStore.getState().addModule('M01');
    useStore.getState().save();
    const file = toFile(useStore.getState().project);
    const res = useStore.getState().importProject(file);
    expect(res.blocked).toBeUndefined();
    expect(useStore.getState().pendingDiscard).toBeNull();
  });

  it('nach Bearbeitung ohne save() bleibt die Rückfrage erhalten', () => {
    useStore.getState().addModule('M01');
    useStore.getState().loadTemplate('makeup');
    expect(useStore.getState().pendingDiscard).not.toBeNull();
  });

  it('save() setzt einen gültigen Namen, auch wenn das Feld geleert wurde', () => {
    useStore.setState((s) => ({ project: { ...s.project, name: '   ' } }));
    useStore.getState().save();
    expect(useStore.getState().project.name.length).toBeGreaterThan(0);
    expect(useStore.getState().project.name).toBe('Ohne Namen');
  });

  it('resetToSaved ohne gespeichertes Projekt fällt auf die Vorlage zurück', () => {
    useStore.getState().resetToSaved();
    const s = useStore.getState();
    expect(s.project.name).toBe('Schmuck-Organizer');
    expect(s.saved).toBe(true);
  });

  it('Speicherfehler beim initialen Laden crasht nicht (loadLibrary tolerant)', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('SecurityError');
        },
      },
    });
    // Kein Aufruf von loadLibrary im Store beim Zugriff — aber save/loadStored dürfen nicht werfen:
    expect(() => useStore.getState().refreshLibrary()).not.toThrow();
  });
});

describe('Store: Import/Export und Findings', () => {
  beforeEach(reset);

  it('importProject lehnt Unsinn mit Meldung ab', () => {
    const res = useStore.getState().importProject({ kaputt: true });
    expect(res.ok).toBe(false);
    expect(res.message).toBeTruthy();
  });

  it('importProject übernimmt ein valides Projekt', () => {
    const file = toFile(buildTemplate('makeup'));
    const res = useStore.getState().importProject(file);
    expect(res.ok).toBe(true);
    expect(useStore.getState().project.name).toBe('Make-up-Organizer');
  });

  it('applyFindingFix ohne Wirkung (identisches toMm) meldet Fehler statt Erfolg', () => {
    const p = useStore.getState().project;
    const finding = {
      ruleId: 'V-G-05',
      severity: 'error' as const,
      subject: { kind: 'panel' as const },
      values: { radius: p.base.cornerRadiusMm, nz: p.settings.seamAllowanceMm },
      fix: { kind: 'setCornerRadius' as const, toMm: p.base.cornerRadiusMm }, // ändert nichts
      dismissible: false,
    };
    const hashBefore = useStore.getState().construction.projectHash;
    useStore.getState().applyFindingFix(finding);
    const s = useStore.getState();
    expect(s.construction.projectHash).toBe(hashBefore);
    expect(s.toasts.at(-1)!.tone).toBe('error');
  });

  it('applyFindingFix mit Wirkung ändert den Hash (und feuert keinen Fehler-Toast)', () => {
    const p = useStore.getState().project;
    const finding = {
      ruleId: 'V-G-05',
      severity: 'error' as const,
      subject: { kind: 'panel' as const },
      values: { radius: p.base.cornerRadiusMm, nz: p.settings.seamAllowanceMm },
      fix: { kind: 'setCornerRadius' as const, toMm: p.base.cornerRadiusMm + 4 },
      dismissible: false,
    };
    const hashBefore = useStore.getState().construction.projectHash;
    useStore.getState().applyFindingFix(finding);
    const s = useStore.getState();
    expect(s.construction.projectHash).not.toBe(hashBefore);
    expect(s.toasts.some((x) => x.tone === 'error')).toBe(false);
  });

  it('exportProject liefert ein schema-valides Projekt-Datei-Objekt', () => {
    const out = useStore.getState().exportProject() as { format: string; schemaVersion: number; project: unknown };
    expect(out.format).toBe('organizer-studio/project');
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('Store: Toasts', () => {
  beforeEach(reset);

  it('Toasts verschwinden nach 3,2 s', () => {
    vi.useFakeTimers();
    useStore.getState().toast('Hallo', 'ok');
    expect(useStore.getState().toasts.length).toBe(1);
    vi.advanceTimersByTime(3300);
    expect(useStore.getState().toasts).toEqual([]);
  });

  it('propsOpen startet standardmäßig geschlossen (verhindert unerwünschtes Sheet auf Mobilgeräten)', () => {
    expect(initial.session.propsOpen).toBe(false);
  });

  it('moveModule verschiebt zwischen Zeilen, aktualisiert Reihenfolge und ist per Undo umkehrbar', () => {
    const s0 = useStore.getState();
    const first = s0.project.modules[0]!;
    const targetRow = s0.project.rows[1]!.id;
    s0.moveModule(first.id, targetRow, 0);
    const moved = useStore.getState().project.modules.find((m) => m.id === first.id)!;
    expect(moved.rowId).toBe(targetRow);
    useStore.getState().undo();
    const restored = useStore.getState().project.modules.find((m) => m.id === first.id)!;
    expect(restored.rowId).toBe(first.rowId);
  });

  it('rotate dreht in 90°-Schritten zurück auf 0°', () => {
    const id = useStore.getState().project.modules[0]!.id;
    for (const expected of [90, 180, 270, 0] as const) {
      useStore.getState().rotate(id);
      expect(useStore.getState().project.modules.find((m) => m.id === id)!.rotation).toBe(expected);
    }
  });
});

describe('Store: Erweiterte Editor-Funktionen', () => {
  beforeEach(reset);

  it('swapSides tauscht links/rechts aller ungesperrten Module als 1 Undo-Schritt', () => {
    const before = useStore.getState().project.modules.map((m) => ({ id: m.id, side: m.side }));
    const pastBefore = useStore.getState().past.length;
    useStore.getState().swapSides();
    const after = useStore.getState().project.modules;
    expect(useStore.getState().past.length).toBe(pastBefore + 1);
    for (const b of before) {
      const m = after.find((x) => x.id === b.id)!;
      expect(m.side).toBe(b.side === 'left' ? 'right' : 'left');
    }
    useStore.getState().undo();
    for (const b of before) {
      expect(useStore.getState().project.modules.find((x) => x.id === b.id)!.side).toBe(b.side);
    }
  });

  it('moveRowOrder verschiebt Zeilen hoch/runter und respektiert Grenzen', () => {
    const rows0 = useStore.getState().project.rows.map((r) => r.id);
    expect(rows0.length).toBeGreaterThanOrEqual(2);
    useStore.getState().moveRowOrder(rows0[0]!, -1);
    expect(useStore.getState().project.rows.map((r) => r.id)).toEqual(rows0);
    useStore.getState().moveRowOrder(rows0[0]!, 1);
    expect(useStore.getState().project.rows[0]!.id).toBe(rows0[1]);
    expect(useStore.getState().project.rows[1]!.id).toBe(rows0[0]);
    useStore.getState().undo();
    expect(useStore.getState().project.rows.map((r) => r.id)).toEqual(rows0);
  });

  it('reorderInRow tauscht Reihenfolge zweier Module in derselben Zeile & Seite', () => {
    useStore.getState().newProject({ force: true });
    const rowId = useStore.getState().project.rows[0]!.id;
    const id1 = useStore.getState().addModule('M01', rowId, 'left');
    const id2 = useStore.getState().addModule('M01', rowId, 'left');
    const slotBefore = useStore
      .getState()
      .project.modules.filter((m) => m.rowId === rowId && m.side === 'left')
      .map((m) => m.id);
    expect(slotBefore).toEqual([id1, id2]);
    const ok = useStore.getState().reorderInRow(id1, 1);
    expect(ok).toBe(true);
    const slotAfter = useStore
      .getState()
      .project.modules.filter((m) => m.rowId === rowId && m.side === 'left')
      .map((m) => m.id);
    expect(slotAfter).toEqual([id2, id1]);
  });

  it('autoFitSpine berechnet Bundbreite automatisch passend zum Inhalt', () => {
    useStore.getState().setPar((p) => ({ ...p, base: { ...p.base, spineWidthMm: 10 as typeof p.base.spineWidthMm } }));
    const before = useStore.getState().project.base.spineWidthMm;
    useStore.getState().autoFitSpine();
    const after = useStore.getState().project.base.spineWidthMm;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('applyAllFixes behebt mehrere behebbare Fehler in einem atomaren Undo-Schritt', () => {
    useStore.getState().setPar((p) => ({
      ...p,
      base: { ...p.base, widthMm: 120 as typeof p.base.widthMm, cornerRadiusMm: 45 as typeof p.base.cornerRadiusMm },
    }));
    expect(useStore.getState().construction.findings.some((f) => f.fix)).toBe(true);
    const pastBefore = useStore.getState().past.length;
    const fixed = useStore.getState().applyAllFixes();
    expect(fixed).toBeGreaterThan(0);
    expect(useStore.getState().past.length).toBe(pastBefore + 1);
  });

  it('selectAll und Mehrfach-Aktionen (batchMoveToSide, batchMoveToRow, batchSetLocked, batchDuplicate)', () => {
    useStore.getState().selectAll();
    const allIds = useStore.getState().session.selection;
    expect(allIds.length).toBe(useStore.getState().project.modules.length);
    const pair = allIds.slice(0, 2);
    useStore.getState().batchMoveToSide(pair, 'right');
    for (const id of pair) {
      expect(useStore.getState().project.modules.find((m) => m.id === id)!.side).toBe('right');
    }
    const targetRow = useStore.getState().project.rows[1]!.id;
    useStore.getState().batchMoveToRow(pair, targetRow);
    for (const id of pair) {
      expect(useStore.getState().project.modules.find((m) => m.id === id)!.rowId).toBe(targetRow);
    }
    useStore.getState().batchSetLocked(pair, true);
    for (const id of pair) {
      expect(useStore.getState().project.modules.find((m) => m.id === id)!.locked).toBe(true);
    }
    useStore.getState().batchSetLocked(pair, false);
    const countBefore = useStore.getState().project.modules.length;
    useStore.getState().batchDuplicate(pair);
    expect(useStore.getState().project.modules.length).toBe(countBefore + pair.length);
  });

  it('toggleFolded, setFabricTheme und setHelpOpen aktualisieren die Session sauber', () => {
    expect(useStore.getState().session.folded).toBe(false);
    useStore.getState().toggleFolded();
    expect(useStore.getState().session.folded).toBe(true);
    useStore.getState().setFabricTheme('sage');
    expect(useStore.getState().session.fabricTheme).toBe('sage');
    useStore.getState().setHelpOpen(true);
    expect(useStore.getState().session.helpOpen).toBe(true);
  });
});

describe('Store: Logiktabelle & Konsistenz-Invarianten', () => {
  beforeEach(reset);

  it('L1: applyAllFixes löst auch addModule-Fixes (z. B. fehlender Verschluss V-G-10) in einem Undo-Schritt', () => {
    useStore.getState().newProject({ force: true });
    useStore.getState().addModule('M01');
    // Kein Verschluss -> V-G-10 mit fix.kind === 'addModule'
    expect(useStore.getState().construction.findings.some((f) => f.ruleId === 'V-G-10' && f.fix?.kind === 'addModule')).toBe(true);
    const fixed = useStore.getState().applyAllFixes();
    expect(fixed).toBeGreaterThanOrEqual(1);
    expect(useStore.getState().project.modules.some((m) => m.typeId === 'M07' || m.typeId === 'M08')).toBe(true);
  });

  it('L2: gesperrtes Modul wird weder von applyFindingFix noch von applyAllFixes verändert', () => {
    useStore.getState().newProject({ force: true });
    const m06Id = useStore.getState().addModule('M06');
    useStore.getState().rotate(m06Id); // V-G-11 Fadenlauf-Warnung mit fix: setRotation 0
    useStore.getState().batchSetLocked([m06Id], true);
    const finding = useStore.getState().construction.findings.find((f) => f.ruleId === 'V-G-11')!;
    expect(finding).toBeDefined();
    useStore.getState().applyFindingFix(finding);
    expect(useStore.getState().project.modules.find((m) => m.id === m06Id)!.rotation).toBe(90);
    useStore.getState().applyAllFixes();
    expect(useStore.getState().project.modules.find((m) => m.id === m06Id)!.rotation).toBe(90);
  });

  it('L3/L20: removeRowAction löscht keine Zeile mit gesperrtem Modul und bereinigt sonst Auswahl', () => {
    useStore.getState().addRowAction();
    const row2 = useStore.getState().project.rows.at(-1)!.id;
    const modId = useStore.getState().addModule('M01', row2, 'left');
    useStore.getState().batchSetLocked([modId], true);
    const rowsBefore = useStore.getState().project.rows.length;
    useStore.getState().removeRowAction(row2);
    expect(useStore.getState().project.rows.length).toBe(rowsBefore);

    useStore.getState().batchSetLocked([modId], false);
    useStore.getState().select([modId]);
    useStore.getState().removeRowAction(row2);
    expect(useStore.getState().project.rows.length).toBe(rowsBefore - 1);
    expect(useStore.getState().session.selection).toEqual([]);
  });

  it('L4: duplicate entsperrt die Kopie und wählt sie direkt aus', () => {
    const id = useStore.getState().project.modules[0]!.id;
    useStore.getState().batchSetLocked([id], true);
    useStore.getState().duplicate(id);
    const sel = useStore.getState().session.selection;
    expect(sel.length).toBe(1);
    expect(sel[0]).not.toBe(id);
    const copy = useStore.getState().project.modules.find((m) => m.id === sel[0])!;
    expect(copy.locked).toBe(false);
  });

  it('L5/L23: strenge Platzierung blockiert unzulässigen Seitenwechsel (moveToSide, batchMoveToSide, asymmetrisches swapSides)', () => {
    useStore.getState().newProject({ force: true });
    useStore.getState().setPar((p) => ({ ...p, base: { ...p.base, widthMm: 160 as typeof p.base.widthMm } }));
    const rowId = useStore.getState().project.rows[0]!.id;
    const leftId = useStore.getState().addModule('M01', rowId, 'left');
    const rightId = useStore.getState().addModule('M01', rowId, 'right');
    useStore.getState().setParam(leftId, 'breite', 110);
    useStore.getState().setParam(rightId, 'breite', 110);
    // 110 + 110 = 220 > 140 Nutzbreite -> beide auf einer Seite wären V-G-01!
    useStore.getState().moveToSide(rightId, 'left');
    expect(useStore.getState().project.modules.find((m) => m.id === rightId)!.side).toBe('right');
    useStore.getState().batchMoveToSide([rightId], 'left');
    expect(useStore.getState().project.modules.find((m) => m.id === rightId)!.side).toBe('right');
    // Asymmetrisches swapSides: links gesperrt, rechts entsperrt -> würde beide links kollidieren lassen
    useStore.getState().batchSetLocked([leftId], true);
    useStore.getState().swapSides();
    expect(useStore.getState().project.modules.find((m) => m.id === rightId)!.side).toBe('right');
  });

  it('L6/L8: undo/redo bereinigen verwaiste Auswahl; addModule öffnet Zugeklappt-Vorschau automatisch', () => {
    useStore.getState().toggleFolded();
    expect(useStore.getState().session.folded).toBe(true);
    const newId = useStore.getState().addModule('M01');
    expect(useStore.getState().session.folded).toBe(false);
    expect(useStore.getState().session.selection).toEqual([newId]);
    useStore.getState().undo();
    expect(useStore.getState().session.selection).toEqual([]);
  });

  it('L13/L21: autoFitSpine ist bei leerem Projekt No-op; newProject mit Preset schützt ungespeicherte Arbeit', () => {
    useStore.getState().newProject({ force: true });
    const spineBefore = useStore.getState().project.base.spineWidthMm;
    useStore.getState().autoFitSpine();
    expect(useStore.getState().project.base.spineWidthMm).toBe(spineBefore);

    useStore.getState().addModule('M01'); // dirty
    useStore.getState().newProject({ preset: { name: 'Federmäppchen', widthMm: 220, heightMm: 120 } });
    expect(useStore.getState().pendingDiscard?.kind).toBe('new');
    useStore.getState().confirmPendingDiscard();
    expect(useStore.getState().project.name).toBe('Federmäppchen');
    expect(useStore.getState().project.base.widthMm).toBe(220);
    expect(useStore.getState().project.base.heightMm).toBe(120);
  });
});

