/**
 * Store-Tests — die Persistenz-, Undo/Redo- und Fehlerpfade, die sonst niemand
 * testet. Der Store ist ein Singleton; zwischen den Tests wird sein Zustand
 * auf einen frischen Vorlagen-Stand zurückgesetzt und localStorage geleert.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../state/store';
import { buildTemplate, toFile } from '../core/project';

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
    expect(out.schemaVersion).toBe(2);
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
