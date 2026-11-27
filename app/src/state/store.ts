/**
 * Zustandsverwaltung: Projekt (persistiert, undo-fähig) vs. Session (flüchtig).
 * `construct()` ist memoisiert über den Projekt-Hash.
 */
import { create } from 'zustand';
import { construct, type Construction, type Project, type Side } from '../core/construction';
import { computeSpineBulk } from '../core/evaluation';
import { applyFix, findingKey } from '../core/fixes';
import { clamp, mm } from '../core/geometry';
import {
  evaluateAdd,
  evaluateMove,
  findBestPlacement,
  insertModuleAt,
  optimizeLayout,
  relocateModule,
  suggestRepairMove,
  type PlacementEvaluation,
  type PlacementTarget,
} from '../core/placement';
import { LIMITS } from '../core/practice';
import { fmtMm, t } from '../i18n/de';
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
import type { Finding, FixKind, ModuleTypeId, Params, ParamValue } from '../core/types';

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
export interface NewProjectPreset {
  readonly name: string;
  readonly widthMm: number;
  readonly heightMm: number;
}

export type PendingDiscard =
  | { readonly kind: 'template'; readonly id: TemplateId }
  | { readonly kind: 'new'; readonly preset?: NewProjectPreset }
  | { readonly kind: 'import'; readonly payload: unknown }
  | { readonly kind: 'loadStored'; readonly id: string }
  | { readonly kind: 'reset' };

/** Prüft, ob ein Fix ein gesperrtes Modul verändern oder löschen würde. */
export function isFixBlockedByLock(p: Project, fix: FixKind): boolean {
  if ('moduleId' in fix) {
    return p.modules.find((m) => m.id === fix.moduleId)?.locked === true;
  }
  return false;
}

/** Wendet einen einzelnen Fix an (inkl. `addModule` über optimale Platzierung). */
function applyFixStep(
  p: Project,
  fix: FixKind,
  curConstruction: Construction,
): { readonly project: Project; readonly addedId?: string; readonly blockedByLock?: boolean } {
  if (isFixBlockedByLock(p, fix)) return { project: p, blockedByLock: true };
  if (fix.kind === 'addModule') {
    const typeId = fix.typeId as ModuleTypeId;
    const best = findBestPlacement(p, typeId, 'left', undefined, curConstruction);
    const inst = { ...makeInstance(typeId, best.target.rowId), side: best.target.side };
    return { project: insertModuleAt(p, inst, best.target), addedId: inst.id };
  }
  return { project: applyFix(p, fix) };
}

/** Entfernt IDs aus selection/hovered, die im Projekt nicht mehr existieren. */
function pruneSessionIds(session: EditorSession, p: Project): EditorSession {
  const valid = new Set(p.modules.map((m) => m.id));
  const selection = session.selection.filter((id) => valid.has(id));
  const hovered = session.hovered && valid.has(session.hovered) ? session.hovered : null;
  if (selection.length === session.selection.length && hovered === session.hovered) return session;
  return { ...session, selection, hovered };
}

export type FabricThemeId = 'linen' | 'sage' | 'terracotta' | 'navy' | 'rose' | 'charcoal';

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
  /** Strenge Verschiebe-/Platzierungs-Sperre: blockiert ungültige Ablagen per Drag & Drop. */
  readonly strictPlacement: boolean;
  /** Zugeklappt-Vorschau auf der Arbeitsfläche (zeigt gefaltetes Etui & Querschnitt). */
  readonly folded: boolean;
  /** Visuelles Stoff-Farbthema auf der Designfläche (reine Darstellung, ändert keine Maße). */
  readonly fabricTheme: FabricThemeId;
  /** Tastaturkürzel-Hilfe geöffnet. */
  readonly helpOpen: boolean;
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
  addModuleAt: (typeId: ModuleTypeId, target: PlacementTarget) => { readonly id: string | null; readonly evaluation: PlacementEvaluation };
  relocate: (id: string, target: PlacementTarget) => PlacementEvaluation;
  relocateToBest: (id: string) => boolean;
  reorderInRow: (id: string, delta: -1 | 1) => boolean;
  swapSides: () => void;
  autoFitSpine: () => void;
  autoOptimize: () => void;
  moveModule: (id: string, rowId: string, index: number) => void;
  moveToSide: (id: string, side: Side) => void;
  batchMoveToSide: (ids: readonly string[], side: Side) => void;
  batchMoveToRow: (ids: readonly string[], rowId: string) => void;
  batchSetLocked: (ids: readonly string[], locked: boolean) => void;
  batchDuplicate: (ids: readonly string[]) => void;
  duplicate: (id: string) => void;
  remove: (ids: readonly string[]) => void;
  rotate: (id: string) => void;
  setParam: (id: string, key: string, value: ParamValue) => void;
  commitParams: (id: string, nextParams: Params) => void;
  select: (ids: readonly string[]) => void;
  selectAll: () => void;
  toggleSelect: (id: string) => void;
  setHovered: (id: string | null) => void;
  setZoom: (z: number, opts?: { user?: boolean }) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleStrictPlacement: () => void;
  toggleFolded: () => void;
  setFabricTheme: (theme: FabricThemeId) => void;
  setHelpOpen: (v: boolean) => void;
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
  applyAllFixes: () => number;
  dismiss: (key: string) => void;
  addRowAction: () => void;
  removeRowAction: (rowId: string) => void;
  renameRowAction: (rowId: string, name: string) => void;
  moveRowOrder: (rowId: string, delta: -1 | 1) => void;
  save: () => void;
  loadStored: (id: string, opts?: { force?: boolean }) => void;
  removeStored: (id: string) => void;
  duplicateStored: (id: string) => void;
  loadTemplate: (id: TemplateId, opts?: { force?: boolean }) => void;
  newProject: (opts?: { force?: boolean; preset?: NewProjectPreset }) => void;
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
  propsOpen: false,
  libOpen: false,
  warnOpen: false,
  dismissed: [],
  guides: [],
  mode: 'simple',
  startOpen: false,
  strictPlacement: true,
  folded: false,
  fabricTheme: 'linen',
  helpOpen: false,
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
  // Dirty = seit dem Laden/Speichern wurde editiert UND der Stand ist nicht gespeichert:
  // `past` trägt die zurücknehmbaren Bearbeitungen, `saved` wird von jeder
  // Bearbeitung gelöscht und nur von save()/applyFreshProject gesetzt. Nach save()
  // ist `past` noch gefüllt (Undo bleibt möglich), aber `saved: true` → nicht
  // mehr dirty, also keine Verwerfen-Rückfrage. Undo hinter den Speicherpunkt
  // zurück leert `past` und ist damit ebenfalls sauber.
  const isDirty = (): boolean => get().past.length > 0 && !get().saved;
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
      if (rowId === undefined && side === undefined) {
        const best = findBestPlacement(p, typeId, 'left', undefined, get().construction);
        const inst = { ...makeInstance(typeId, best.target.rowId), side: best.target.side };
        get().setPar((prev) => ({ ...insertModuleAt(prev, inst, best.target), updatedAt: nowIso() }));
        set({ session: { ...get().session, selection: [inst.id], folded: false } });
        return inst.id;
      }
      const targetRow = rowId ?? p.rows[0]!.id;
      // `side` ist eine echte Modellentscheidung (v3), kein Visualisierungs-Flag.
      const inst = { ...makeInstance(typeId, targetRow), side: side ?? 'left' };
      get().setPar((prev) => ({ ...prev, modules: [...prev.modules, inst], updatedAt: nowIso() }));
      set({ session: { ...get().session, selection: [inst.id], folded: false } });
      return inst.id;
    },

    addModuleAt: (typeId, target) => {
      const p = get().project;
      const evaluation = evaluateAdd(p, typeId, target, undefined, get().construction);
      if (get().session.strictPlacement && !evaluation.allowed) {
        const reason = t(evaluation.reasonKey, evaluation.reasonValues);
        get().toast(t('place.rejected', { grund: reason }), 'error');
        return { id: null, evaluation };
      }
      const inst = { ...makeInstance(typeId, target.rowId), side: target.side };
      get().setPar((prev) => ({ ...insertModuleAt(prev, inst, target), updatedAt: nowIso() }));
      set({ session: { ...get().session, selection: [inst.id], folded: false } });
      return { id: inst.id, evaluation };
    },

    relocate: (id, target) => {
      const p = get().project;
      const inst = p.modules.find((m) => m.id === id);
      const evaluation = evaluateMove(p, id, target, get().construction);
      if (inst?.locked) {
        get().toast(t('place.lockedBlocked'), 'info');
        return evaluation;
      }
      if (get().session.strictPlacement && !evaluation.allowed) {
        const reason = t(evaluation.reasonKey, evaluation.reasonValues);
        get().toast(t('place.rejected', { grund: reason }), 'error');
        return evaluation;
      }
      if (evaluation.candidateProject === p) return evaluation;
      get().setPar((prev) => {
        const moved = relocateModule(prev, id, target);
        return moved === prev ? prev : { ...moved, updatedAt: nowIso() };
      });
      return evaluation;
    },

    relocateToBest: (id) => {
      const p = get().project;
      const inst = p.modules.find((m) => m.id === id);
      if (!inst) return false;
      if (inst.locked) {
        get().toast(t('place.lockedBlocked'), 'info');
        return false;
      }
      const best = suggestRepairMove(p, id, get().construction);
      if (!best) {
        get().toast(t('place.noBetterSlot'), 'info');
        return false;
      }
      get().setPar((prev) => ({ ...relocateModule(prev, id, best.target), updatedAt: nowIso() }));
      get().toast(t('place.movedToBest'), 'ok');
      return true;
    },

    reorderInRow: (id, delta) => {
      const p = get().project;
      const inst = p.modules.find((m) => m.id === id);
      if (!inst) return false;
      if (inst.locked) {
        get().toast(t('place.lockedBlocked'), 'info');
        return false;
      }
      const same = p.modules.filter((m) => m.rowId === inst.rowId && m.side === inst.side);
      const curIdx = same.findIndex((m) => m.id === id);
      const nextIdx = curIdx + delta;
      if (curIdx < 0 || nextIdx < 0 || nextIdx >= same.length) return false;
      const ev = get().relocate(id, { side: inst.side, rowId: inst.rowId, index: nextIdx });
      return ev.allowed || !get().session.strictPlacement;
    },

    swapSides: () => {
      const p = get().project;
      if (p.modules.length === 0) return;
      if (p.modules.every((m) => m.locked)) {
        get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      const candidate: Project = {
        ...p,
        updatedAt: nowIso(),
        modules: p.modules.map((m) => (m.locked ? m : { ...m, side: m.side === 'left' ? 'right' : 'left' })),
      };
      // Wenn einzelne Module gesperrt sind, ist das Tauschen nicht symmetrisch —
      // bei strenger Platzierung keine neuen harten Überlauffehler zulassen.
      if (get().session.strictPlacement && p.modules.some((m) => m.locked)) {
        const beforeErr = get().construction.metrics.errorCount;
        const afterErr = construct(candidate).metrics.errorCount;
        if (afterErr > beforeErr) {
          get().toast(t('toast.batchBlocked'), 'error');
          return;
        }
      }
      get().setPar(() => candidate);
      get().toast(t('toast.sidesSwapped'), 'ok');
    },

    autoFitSpine: () => {
      const p = get().project;
      if (p.modules.length === 0) return;
      const bulk = computeSpineBulk(p.modules, p.base.hasLining);
      const target = clamp(
        Math.max(LIMITS.spineWidthMm.min, bulk.requiredSpineMm),
        LIMITS.spineWidthMm.min,
        LIMITS.spineWidthMm.max,
      );
      if (Math.round(p.base.spineWidthMm) === target) return;
      get().setPar((cur) => ({
        ...cur,
        updatedAt: nowIso(),
        base: { ...cur.base, spineWidthMm: mm(target) },
      }));
      get().toast(t('toast.spineFitted', { mm: fmtMm(target, p.settings.unit) }), 'ok');
    },

    batchMoveToSide: (ids, side) => {
      const p = get().project;
      const setIds = new Set(ids);
      const movable = p.modules.filter((m) => setIds.has(m.id) && !m.locked && m.side !== side);
      if (movable.length === 0) {
        if (p.modules.some((m) => setIds.has(m.id) && m.locked)) get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      const candidate: Project = {
        ...p,
        updatedAt: nowIso(),
        modules: p.modules.map((m) => (setIds.has(m.id) && !m.locked ? { ...m, side } : m)),
      };
      if (get().session.strictPlacement) {
        const beforeErr = get().construction.metrics.errorCount;
        const afterErr = construct(candidate).metrics.errorCount;
        if (afterErr > beforeErr) {
          get().toast(t('toast.batchBlocked'), 'error');
          return;
        }
      }
      get().setPar(() => candidate);
    },

    batchMoveToRow: (ids, rowId) => {
      const p = get().project;
      const setIds = new Set(ids);
      if (!p.rows.some((r) => r.id === rowId)) return;
      const movable = p.modules.filter((m) => setIds.has(m.id) && !m.locked && m.rowId !== rowId);
      if (movable.length === 0) {
        if (p.modules.some((m) => setIds.has(m.id) && m.locked)) get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      const candidate: Project = {
        ...p,
        updatedAt: nowIso(),
        modules: p.modules.map((m) => (setIds.has(m.id) && !m.locked ? { ...m, rowId } : m)),
      };
      if (get().session.strictPlacement) {
        const beforeErr = get().construction.metrics.errorCount;
        const afterErr = construct(candidate).metrics.errorCount;
        if (afterErr > beforeErr) {
          get().toast(t('toast.batchBlocked'), 'error');
          return;
        }
      }
      get().setPar(() => candidate);
    },

    batchSetLocked: (ids, locked) => {
      const setIds = new Set(ids);
      get().setPar((cur) => ({
        ...cur,
        updatedAt: nowIso(),
        modules: cur.modules.map((m) => (setIds.has(m.id) ? { ...m, locked } : m)),
      }));
    },

    batchDuplicate: (ids) => {
      if (ids.length === 0) return;
      const created: string[] = [];
      get().setPar((cur) => {
        let next = cur;
        for (const id of ids) {
          const before = new Set(next.modules.map((m) => m.id));
          next = duplicateInstance(next, id);
          const added = next.modules.find((m) => !before.has(m.id));
          if (added) created.push(added.id);
        }
        return next;
      });
      if (created.length > 0) {
        set({ session: { ...get().session, selection: created } });
        get().toast(t('toast.duplicated'), 'ok');
      }
    },

    autoOptimize: () => {
      const p = get().project;
      const res = optimizeLayout(p);
      if (!res.changed) {
        get().toast(t('place.alreadyOptimal'), 'info');
        return;
      }
      get().setPar(() => ({ ...res.project, updatedAt: nowIso() }));
      get().toast(t('place.optimized', { n: res.movedCount, before: res.beforeScore, after: res.afterScore }), 'ok');
    },

    moveModule: (id, rowId, index) => {
      const inst = get().project.modules.find((m) => m.id === id);
      if (inst?.locked) {
        get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      get().setPar((p) => moveInstance(p, id, rowId, index));
    },

    moveToSide: (id, side) => {
      const p = get().project;
      const inst = p.modules.find((m) => m.id === id);
      if (!inst || inst.side === side) return;
      if (inst.locked) {
        get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      const cnt = p.modules.filter((m) => m.rowId === inst.rowId && m.side === side && m.id !== id).length;
      const evaluation = evaluateMove(p, id, { side, rowId: inst.rowId, index: cnt }, get().construction);
      if (get().session.strictPlacement && !evaluation.allowed) {
        const reason = t(evaluation.reasonKey, evaluation.reasonValues);
        get().toast(t('place.rejected', { grund: reason }), 'error');
        return;
      }
      get().setPar((cur) => moveToSide(cur, id, side));
    },

    duplicate: (id) => {
      const p = get().project;
      const src = p.modules.find((m) => m.id === id);
      if (!src) return;
      const beforeIds = new Set(p.modules.map((m) => m.id));
      get().setPar((prev) => duplicateInstance(prev, id));
      const added = get().project.modules.find((m) => !beforeIds.has(m.id));
      if (added) set({ session: { ...get().session, selection: [added.id] } });
      get().toast(t('toast.duplicated'), 'ok');
    },

    remove: (ids) => {
      if (ids.length === 0) return;
      const p = get().project;
      const removable = ids.filter((id) => !p.modules.find((m) => m.id === id)?.locked);
      if (removable.length === 0) {
        get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      if (removable.length < ids.length) {
        get().toast(t('place.lockedBlocked'), 'info');
      }
      get().setPar((prev) => removeInstance(prev, removable));
      set({ session: { ...get().session, selection: [] } });
    },

    rotate: (id) => {
      const inst = get().project.modules.find((m) => m.id === id);
      if (inst?.locked) {
        get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      get().setPar((p) => ({
        ...p,
        updatedAt: nowIso(),
        modules: p.modules.map((m) =>
          m.id === id ? { ...m, rotation: (((m.rotation + 90) % 360) as 0 | 90 | 180 | 270) } : m,
        ),
      }));
    },

    setParam: (id, key, value) => {
      const inst = get().project.modules.find((m) => m.id === id);
      if (inst?.locked) {
        get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      get().setPar((p) => updateParams(p, id, key, value));
    },

    commitParams: (id, nextParams) => {
      const inst = get().project.modules.find((m) => m.id === id);
      if (!inst || inst.locked) return;
      const entries = Object.entries(nextParams).filter(([k, v]) => inst.params[k] !== v);
      if (entries.length === 0) return;
      get().setPar((p) => {
        let cur = p;
        for (const [k, v] of entries) cur = updateParams(cur, id, k, v);
        return cur;
      });
    },

    select: (ids) => set({ session: { ...get().session, selection: [...ids] } }),
    selectAll: () => {
      const all = get().project.modules.map((m) => m.id);
      set({ session: { ...get().session, selection: all } });
      if (all.length > 0) get().toast(t('toast.selectedAll', { n: all.length }), 'info');
    },
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
    toggleStrictPlacement: () => {
      const next = !get().session.strictPlacement;
      set({ session: { ...get().session, strictPlacement: next } });
      get().toast(t(next ? 'place.strictOn' : 'place.strictOff'), 'info');
    },
    toggleFolded: () => set({ session: { ...get().session, folded: !get().session.folded } }),
    setFabricTheme: (fabricTheme) => set({ session: { ...get().session, fabricTheme } }),
    setHelpOpen: (helpOpen) => set({ session: { ...get().session, helpOpen } }),
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
        session: pruneSessionIds(get().session, prev),
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
        session: pruneSessionIds(get().session, next),
        saved: false,
        revision: get().revision + 1,
      });
    },

    applyFindingFix: (f) => {
      if (!f.fix) return;
      const fix: FixKind = f.fix;
      const p0 = get().project;
      const c0 = get().construction;
      if (isFixBlockedByLock(p0, fix)) {
        get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      const step = applyFixStep(p0, fix, c0);
      if (step.project === p0) {
        get().toast(t('toast.fixNoEffect'), 'error');
        return;
      }
      get().setPar(() => ({ ...step.project, updatedAt: nowIso() }));
      const after = get().construction;
      if (after.projectHash === c0.projectHash) {
        get().toast(t('toast.fixNoEffect'), 'error');
        return;
      }
      if (step.addedId) {
        set({ session: { ...pruneSessionIds(get().session, get().project), selection: [step.addedId], folded: false } });
      } else {
        set({ session: pruneSessionIds(get().session, get().project) });
      }
      get().dismiss(findingKey(f));
    },

    applyAllFixes: () => {
      const dismissed = get().session.dismissed;
      const seenKeys = new Set<string>();
      let applied = 0;
      let cur = get().project;
      for (let pass = 0; pass < 12; pass += 1) {
        const c = construct(cur);
        const fixable = c.findings
          .filter((f) => f.fix && !dismissed.includes(findingKey(f)) && !seenKeys.has(findingKey(f)))
          .sort((a, b) => (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1));
        let chosen: { key: string; next: Project } | null = null;
        for (const f of fixable) {
          const step = applyFixStep(cur, f.fix!, c);
          if (step.blockedByLock || step.project === cur) continue;
          const nextC = construct(step.project);
          if (nextC.projectHash === c.projectHash) continue;
          chosen = { key: findingKey(f), next: step.project };
          break;
        }
        if (!chosen) break;
        seenKeys.add(chosen.key);
        cur = chosen.next;
        applied += 1;
      }
      if (applied === 0) {
        get().toast(t('warn.fixedNone'), 'info');
        return 0;
      }
      const stamped: Project = { ...cur, updatedAt: nowIso() };
      get().setPar(() => stamped);
      set({ session: pruneSessionIds(get().session, stamped) });
      get().toast(t('warn.fixedAll', { n: applied }), 'ok');
      return applied;
    },

    dismiss: (key) => set({ session: { ...get().session, dismissed: [...get().session.dismissed, key] } }),

    addRowAction: () => {
      if (get().project.rows.length >= LIMITS.maxRows) {
        get().toast(t('place.maxRows', { max: LIMITS.maxRows }), 'info');
        return;
      }
      get().setPar((p) => addRow(p));
      get().toast(t('toast.rowAdded'), 'ok');
    },
    removeRowAction: (rowId) => {
      const p = get().project;
      if (p.rows.length <= 1) return;
      if (p.modules.some((m) => m.rowId === rowId && m.locked)) {
        get().toast(t('place.lockedBlocked'), 'info');
        return;
      }
      get().setPar((cur) => removeRow(cur, rowId));
      set({ session: pruneSessionIds(get().session, get().project) });
      get().toast(t('toast.rowRemoved'), 'info');
    },
    renameRowAction: (rowId, name) => get().setPar((p) => renameRow(p, rowId, name)),
    moveRowOrder: (rowId, delta) => {
      const p = get().project;
      const idx = p.rows.findIndex((r) => r.id === rowId);
      const nextIdx = idx + delta;
      if (idx < 0 || nextIdx < 0 || nextIdx >= p.rows.length) return;
      get().setPar((cur) => {
        const rows = [...cur.rows];
        const [moved] = rows.splice(idx, 1);
        rows.splice(nextIdx, 0, moved!);
        return { ...cur, rows };
      });
    },

    save: () => {
      // Leerer Name wäre exportiert/zurückgeladen nicht valide — auf gültigen Namen setzen.
      const p = { ...get().project, name: get().project.name.trim() || t('proj.untitled'), updatedAt: nowIso() };
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
        set({ pendingDiscard: { kind: 'new', preset: opts?.preset } });
        return;
      }
      const baseBlank = blankProject(opts?.preset?.name);
      const fresh: Project = opts?.preset
        ? {
            ...baseBlank,
            base: {
              ...baseBlank.base,
              widthMm: mm(clamp(Math.round(opts.preset.widthMm), LIMITS.baseWidthMm.min, LIMITS.baseWidthMm.max)),
              heightMm: mm(clamp(Math.round(opts.preset.heightMm), LIMITS.baseHeightMm.min, LIMITS.baseHeightMm.max)),
            },
          }
        : baseBlank;
      applyFreshProject(fresh, false);
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
          get().newProject({ force: true, preset: pending.preset });
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
