/**
 * Zustandsverwaltung: Projekt (persistiert, undo-fähig) vs. Session (flüchtig).
 * `construct()` ist memoisiert über den Projekt-Hash.
 */
import { create } from 'zustand';
import { construct, type Construction, type Project, type Side } from '../core/construction';
import { applyFix, findingKey } from '../core/fixes';
import { t } from '../i18n/de';
import {
  addRow,
  blankProject,
  buildTemplate,
  clearCurrent,
  deleteFromLibrary,
  duplicateInstance,
  fromFile,
  loadCurrent,
  loadLibrary,
  makeInstance,
  moveInstance,
  moveToSide,
  newId,
  nowIso,
  removeInstance,
  removeRow,
  renameRow,
  saveCurrent,
  saveToLibrary,
  toFile,
  updateParams,
  type StoredProject,
  type TemplateId,
} from '../core/project';
import type { Finding, FixKind, ModuleTypeId, ParamValue } from '../core/types';

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: 'ok' | 'error' | 'info';
}

/**
 * Destruktive Aktion, die auf Bestätigung wartet.
 * `null` = nichts offen. Alle fünf Pfade (Vorlage, neu, Import, gespeichertes
 * Projekt, Zurücksetzen) ersetzen den Editor-Stand — ungespeicherte Arbeit
 * darf das nicht stillschweigend vernichten.
 */
export type PendingDiscard =
  | { readonly kind: 'template'; readonly id: TemplateId }
  | { readonly kind: 'new' }
  | { readonly kind: 'import'; readonly payload: unknown }
  | { readonly kind: 'loadStored'; readonly id: string }
  | { readonly kind: 'reset' };

interface EditorSession {
  readonly selection: readonly string[];
  readonly hovered: string | null;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly grid: boolean;
  readonly snap: boolean;
  readonly gridMm: number;
  readonly view: 'editor' | 'pattern' | 'materials' | 'instructions' | 'project';
  readonly propsOpen: boolean;
  readonly libOpen: boolean;
  readonly warnOpen: boolean;
  readonly dismissed: readonly string[];
  readonly guides: readonly { readonly axis: 'x' | 'y'; readonly at: number }[];
  /** Sitzung: gesetzt, sobald der Nutzer den Zoom selbst bestimmt hat. */
  readonly zoomTouched: boolean;
  /** Editor-Redesign: 'simple' = textile Oberfläche ohne CAD-Beiwerk, 'expert' = mit Raster/Maßen. */
  readonly mode: 'simple' | 'expert';
  /** Starter-Erstsbesuch; false, sobald der Nutzer eine Wahl getroffen oder übersprungen hat. */
  readonly startOpen: boolean;
}

interface StoreState {
  project: Project;
  past: Project[];
  future: Project[];
  construction: Construction;
  session: EditorSession;
  library: StoredProject[];
  saved: boolean;
  toasts: Toast[];
  /** Bumped on every project change — memo key. */
  revision: number;
  /** Destruktive Aktion wartet auf Bestätigung (ungespeicherte Änderungen). */
  pendingDiscard: PendingDiscard | null;

  // Actions
  setPar: (updater: (p: Project) => Project, opts?: { undoable?: boolean }) => void;
  addModule: (typeId: ModuleTypeId, rowId?: string, side?: Side) => string;
  moveModule: (id: string, rowId: string, index: number) => void;
  moveToSide: (id: string, side: Side) => void;
  duplicate: (id: string) => void;
  remove: (ids: readonly string[]) => void;
  rotate: (id: string) => void;
  setParam: (id: string, key: string, value: ParamValue) => void;
  select: (ids: readonly string[]) => void;
  toggleSelect: (id: string) => void;
  setHovered: (id: string | null) => void;
  setZoom: (z: number, opts?: { user?: boolean }) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setView: (v: EditorSession['view']) => void;
  setMode: (m: EditorSession['mode']) => void;
  setStartOpen: (v: boolean) => void;
  setPropsOpen: (v: boolean) => void;
  setLibOpen: (v: boolean) => void;
  setWarnOpen: (v: boolean) => void;
  setGuides: (g: EditorSession['guides']) => void;
  undo: () => void;
  redo: () => void;
  applyFindingFix: (f: Finding) => void;
  dismiss: (key: string) => void;
  addRowAction: () => void;
  removeRowAction: (rowId: string) => void;
  renameRowAction: (rowId: string, name: string) => void;
  save: () => void;
  loadStored: (id: string, opts?: { force?: boolean }) => void;
  removeStored: (id: string) => void;
  duplicateStored: (id: string) => void;
  loadTemplate: (id: TemplateId, opts?: { force?: boolean }) => void;
  newProject: (opts?: { force?: boolean }) => void;
  importProject: (raw: unknown, opts?: { force?: boolean }) => { ok: boolean; message?: string; blocked?: boolean };
  exportProject: () => unknown;
  refreshLibrary: () => void;
  toast: (message: string, tone?: Toast['tone']) => void;
  dropToast: (id: number) => void;
  resetToSaved: (opts?: { force?: boolean }) => void;
  confirmPendingDiscard: () => void;
  cancelPendingDiscard: () => void;
}

const emptySession: EditorSession = {
  zoomTouched: false,
  selection: [],
  hovered: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  grid: true,
  snap: true,
  gridMm: 5,
  view: 'editor',
  propsOpen: true,
  libOpen: false,
  warnOpen: false,
  dismissed: [],
  guides: [],
  mode: 'simple',
  startOpen: false,
};

/** Memo: derselbe Projekt-Hash → dasselbe Ergebnis. */
let memoKey = '';
let memoValue: Construction | null = null;

export function compute(p: Project): Construction {
  const key = JSON.stringify({ p: p.base, r: p.rows, m: p.modules, s: p.settings });
  if (memoValue && memoKey === key) return memoValue;
  const value = construct(p);
  memoKey = key;
  memoValue = value;
  return value;
}

function initialProject(): Project | null {
  // Erstsbesuch: kein gespeichertes Projekt → null signalisiert „Starter öffnen".
  // Die konkrete Vorlage (schmuck) wird als Hintergrund geladen, damit der
  // Editor hinter dem Starter nicht leer ist.
  return typeof localStorage !== 'undefined' ? loadCurrent() : null;
}

let toastId = 0;

export const useStore = create<StoreState>((set, get) => {
  const storedOnEntry = initialProject();
  const project = storedOnEntry ?? buildTemplate('schmuck');
  // Erster Besuch ohne gespeichertes Projekt → Starter öffnen. Wer schon ein
  // Projekt hat, landet direkt im Editor (kein again-and-again-Dialog).
  const initialSession: EditorSession = { ...emptySession, startOpen: storedOnEntry === null };
  // Konservativ: fragt auch dann, wenn seit dem Sessionbeginn editiert (und danach
  // gespeichert) wurde — lieber einmal zu viel fragen als Unbezahltes zu löschen.
  // `past.length > 0` überlebt auch ein zwischenzeitliches Undo nicht: nach beliebig
  // vielen Undo bleibt die Historie bis zum Laden gefüllt.
  const isDirty = (): boolean => get().past.length > 0;
  const applyFreshProject = (p: Project, saved: boolean, keepView = false): void => {
    saveCurrent(p);
    set({
      project: p,
      past: [],
      future: [],
      construction: compute(p),
      saved,
      session: keepView ? { ...emptySession, view: get().session.view } : { ...emptySession },
      revision: get().revision + 1,
    });
  };
  return {
    project,
    past: [],
    future: [],
    construction: compute(project),
    session: initialSession,
    library: typeof localStorage !== 'undefined' ? loadLibrary() : [],
    saved: false,
    toasts: [],
    revision: 0,
    pendingDiscard: null,

    setPar: (updater, opts) => {
      const prev = get().project;
      const next = updater(prev);
      if (next === prev) return;
      const undoable = opts?.undoable ?? true;
      const past = undoable ? [...get().past, prev].slice(-60) : get().past;
      set({
        project: next,
        past,
        future: undoable ? [] : get().future,
        construction: compute(next),
        saved: false,
        revision: get().revision + 1,
      });
    },

    addModule: (typeId, rowId, side) => {
      const p = get().project;
      const targetRow = rowId ?? p.rows[0]!.id;
      // `side` ist eine echte Modellentscheidung (v3), kein Visualisierungs-Flag.
      const inst = { ...makeInstance(typeId, targetRow), side: side ?? 'left' };
      get().setPar((prev) => ({ ...prev, modules: [...prev.modules, inst], updatedAt: nowIso() }));
      set({ session: { ...get().session, selection: [inst.id] } });
      return inst.id;
    },

    moveModule: (id, rowId, index) => {
      get().setPar((p) => moveInstance(p, id, rowId, index));
    },

    moveToSide: (id, side) => {
      get().setPar((p) => moveToSide(p, id, side));
    },

    duplicate: (id) => {
      const p = get().project;
      const src = p.modules.find((m) => m.id === id);
      if (!src) return;
      get().setPar((prev) => duplicateInstance(prev, id));
      get().toast(t('toast.duplicated'), 'ok');
    },

    remove: (ids) => {
      if (ids.length === 0) return;
      get().setPar((p) => removeInstance(p, ids));
      set({ session: { ...get().session, selection: [] } });
    },

    rotate: (id) => {
      get().setPar((p) => ({
        ...p,
        updatedAt: nowIso(),
        modules: p.modules.map((m) =>
          m.id === id ? { ...m, rotation: (((m.rotation + 90) % 360) as 0 | 90 | 180 | 270) } : m,
        ),
      }));
    },

    setParam: (id, key, value) => {
      get().setPar((p) => updateParams(p, id, key, value));
    },

    select: (ids) => set({ session: { ...get().session, selection: [...ids] } }),
    toggleSelect: (id) => {
      const sel = get().session.selection;
      const next = sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id];
      set({ session: { ...get().session, selection: next } });
    },
    setHovered: (id) => set({ session: { ...get().session, hovered: id } }),
    setZoom: (z, opts) =>
      set({
        session: {
          ...get().session,
          zoom: Math.min(14, Math.max(0.35, z)),
          zoomTouched: get().session.zoomTouched || opts?.user === true,
        },
      }),
    setPan: (x, y) => set({ session: { ...get().session, panX: x, panY: y } }),
    toggleGrid: () => set({ session: { ...get().session, grid: !get().session.grid } }),
    toggleSnap: () => set({ session: { ...get().session, snap: !get().session.snap } }),
    setView: (v) => set({ session: { ...get().session, view: v } }),
    setMode: (m) => set({ session: { ...get().session, mode: m } }),
    setStartOpen: (v) => set({ session: { ...get().session, startOpen: v } }),
    setPropsOpen: (v) => set({ session: { ...get().session, propsOpen: v } }),
    setLibOpen: (v) => set({ session: { ...get().session, libOpen: v } }),
    setWarnOpen: (v) => set({ session: { ...get().session, warnOpen: v } }),
    setGuides: (g) => set({ session: { ...get().session, guides: g } }),

    undo: () => {
      const past = get().past;
      if (past.length === 0) return;
      const prev = past[past.length - 1]!;
      set({
        project: prev,
        past: past.slice(0, -1),
        future: [get().project, ...get().future].slice(0, 60),
        construction: compute(prev),
        saved: false,
        revision: get().revision + 1,
      });
    },

    redo: () => {
      const future = get().future;
      if (future.length === 0) return;
      const next = future[0]!;
      set({
        project: next,
        past: [...get().past, get().project],
        future: future.slice(1),
        construction: compute(next),
        saved: false,
        revision: get().revision + 1,
      });
    },

    applyFindingFix: (f) => {
      if (!f.fix) return;
      const fix: FixKind = f.fix;
      if (fix.kind === 'addModule') {
        get().addModule(fix.typeId as ModuleTypeId);
        return;
      }
      const before = get().construction;
      get().setPar((p) => ({ ...applyFix(p, fix), updatedAt: nowIso() }));
      const after = get().construction;
      if (after.projectHash === before.projectHash) {
        // Ehrlich bleiben: ein Fix, der nichts ändert, wird nicht als Erfolg verkauft.
        get().toast(t('toast.fixNoEffect'), 'error');
        return;
      }
      get().dismiss(findingKey(f));
    },

    dismiss: (key) => set({ session: { ...get().session, dismissed: [...get().session.dismissed, key] } }),

    addRowAction: () => get().setPar((p) => addRow(p)),
    removeRowAction: (rowId) => get().setPar((p) => removeRow(p, rowId)),
    renameRowAction: (rowId, name) => get().setPar((p) => renameRow(p, rowId, name)),

    save: () => {
      const p = { ...get().project, updatedAt: nowIso() };
      const okLibrary = saveToLibrary(p);
      const okCurrent = saveCurrent(p);
      if (!okLibrary || !okCurrent) {
        // Ehrlich bleiben: nicht als gespeichert melden, wenn es nicht persistiert ist.
        set({ project: p, saved: false, library: loadLibrary() });
        get().toast(t('toast.saveFailed'), 'error');
        return;
      }
      set({ project: p, saved: true, library: loadLibrary() });
      get().toast(t('toast.saved'), 'ok');
    },

    loadStored: (id, opts) => {
      const item = get().library.find((s) => s.id === id);
      if (!item) return;
      if (!opts?.force && isDirty()) {
        set({ pendingDiscard: { kind: 'loadStored', id } });
        return;
      }
      applyFreshProject(item.project, true, true);
      get().toast(t('toast.projectLoaded'), 'ok');
    },

    removeStored: (id) => {
      deleteFromLibrary(id);
      set({ library: loadLibrary() });
    },

    /**
     * Duplikat in die Bibliothek legen — ohne den Editor zu öffnen und ohne
     * den aktuellen Stand anzufassen. Rückgängig-sicher per Konstruktion:
     * es ersetzt nichts.
     */
    duplicateStored: (id) => {
      const item = get().library.find((s) => s.id === id);
      if (!item) return;
      const copy: Project = {
        ...item.project,
        id: newId('p'),
        name: `${item.project.name} (Kopie)`,
        updatedAt: nowIso(),
      };
      saveToLibrary(copy);
      set({ library: loadLibrary() });
      get().toast(t('toast.duplicated'), 'ok');
    },

    loadTemplate: (id, opts) => {
      if (!opts?.force && isDirty()) {
        set({ pendingDiscard: { kind: 'template', id } });
        return;
      }
      applyFreshProject(buildTemplate(id), false);
      get().toast(t('toast.loaded'), 'ok');
    },

    newProject: (opts) => {
      if (!opts?.force && isDirty()) {
        set({ pendingDiscard: { kind: 'new' } });
        return;
      }
      applyFreshProject(blankProject(), false);
    },

    importProject: (raw, opts) => {
      const parsed = fromFile(raw);
      if (!parsed.ok) {
        return { ok: false, message: parsed.issues.slice(0, 3).map((i) => `${i.path}: ${i.message}`).join(' · ') };
      }
      // Erst validieren — eine kaputte Datei verdient die Fehlermeldung,
      // nicht den Rückfrage-Dialog.
      if (!opts?.force && isDirty()) {
        set({ pendingDiscard: { kind: 'import', payload: raw } });
        return { ok: false, blocked: true };
      }
      applyFreshProject(parsed.project, false);
      get().toast(t('toast.imported'), 'ok');
      return { ok: true };
    },

    exportProject: () => toFile(get().project),

    refreshLibrary: () => set({ library: loadLibrary() }),

    toast: (message, tone = 'ok') => {
      toastId += 1;
      const toast: Toast = { id: toastId, message, tone };
      set({ toasts: [...get().toasts, toast] });
      setTimeout(() => {
        set({ toasts: get().toasts.filter((x) => x.id !== toast.id) });
      }, 3200);
    },

    dropToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

    confirmPendingDiscard: () => {
      const pending = get().pendingDiscard;
      set({ pendingDiscard: null });
      if (!pending) return;
      switch (pending.kind) {
        case 'template':
          get().loadTemplate(pending.id, { force: true });
          break;
        case 'new':
          get().newProject({ force: true });
          break;
        case 'import': {
          const res = get().importProject(pending.payload, { force: true });
          if (!res.ok) get().toast(`${t('toast.importError')}: ${res.message ?? ''}`, 'error');
          break;
        }
        case 'loadStored':
          get().loadStored(pending.id, { force: true });
          break;
        case 'reset':
          get().resetToSaved({ force: true });
          break;
      }
    },

    cancelPendingDiscard: () => set({ pendingDiscard: null }),

    resetToSaved: (opts) => {
      if (!opts?.force && isDirty()) {
        set({ pendingDiscard: { kind: 'reset' } });
        return;
      }
      const stored = loadCurrent();
      const p = stored ?? buildTemplate('schmuck');
      clearCurrent();
      applyFreshProject(p, true);
      get().toast(t('toast.reset'), 'info');
    },
  };
});

export type { Project };
