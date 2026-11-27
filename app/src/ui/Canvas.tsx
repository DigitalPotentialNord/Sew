/**
 * Arbeitsfläche — aufgeschlagenes Mäppchen mit Echtzeit-Verschiebe- & Bewertungs-Engine.
 *
 * - Zwei echte Innenflächen (`left`, `right`) getrennt durch den Bund/Falz.
 * - Live Drag & Drop (sowohl für vorhandene Module als auch aus der Bibliothek):
 *   exakte Ziel-Vorschau, Nachbar-Reflow, magnetische Fluchtlinien und strenges
 *   Live-Urteil aus `src/core/placement.ts` (kein Raten, keine Abweichung).
 * - Live-Größenänderung per Griff mit einem einzigen atomaren Undo-Schritt.
 * - Zwei Modi: „Einfach“ (ruhige Stoffansicht) und „Erweitert“ (Raster, Maßketten, Auslastung).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent, type WheelEvent } from 'react';
import { useStore } from '../state/store';
import { moduleDef } from '../core/modules';
import {
  evaluateAdd,
  evaluateMove,
  evaluateResize,
  previewModuleDim,
  resolveDropTarget,
  suggestRepairMove,
  type PlacementEvaluation,
  type ResolvedDropTarget,
} from '../core/placement';
import { isValidModuleTypeId } from '../core/project';
import { clamp, roundedRectPath, type Rect } from '../core/geometry';
import { LIMITS, PRACTICE } from '../core/practice';
import type { ModuleTypeId, Params, Prim, Side } from '../core/types';
import { t, fmtMm } from '../i18n/de';
import { Button } from './parts/primitives';
import { chooseContextBarPlacement, type PixelRect } from './contextBar';
import { isInteractiveTarget } from './isInteractiveTarget';
import { clearDraggedLibraryModule, getDraggedLibraryModule } from './Library';
import { FABRIC_THEMES } from './Properties';
import { QualityBadge } from './QualityCard';

const FoldedPreview = lazy(() => import('./FoldedPreview'));

interface CtxMenuState {
  readonly x: number;
  readonly y: number;
  readonly moduleId: string | null;
}

const HANDLE = 8;

interface ActiveDrag {
  readonly id: string;
  readonly startX: number;
  readonly startY: number;
  readonly origX: number;
  readonly origY: number;
  readonly dx: number;
  readonly dy: number;
  readonly moved: boolean;
  readonly resolved: ResolvedDropTarget | null;
  readonly evaluation: PlacementEvaluation | null;
}

interface LibDragPreview {
  readonly typeId: ModuleTypeId;
  readonly resolved: ResolvedDropTarget;
  readonly evaluation: PlacementEvaluation;
}

interface ActiveResize {
  readonly id: string;
  readonly axis: 'w' | 'h';
  readonly key: string;
  readonly min: number;
  readonly max: number;
  readonly startClient: number;
  readonly startVal: number;
  readonly currentVal: number;
  readonly params: Params;
  readonly evaluation: PlacementEvaluation;
}

export function Canvas(): JSX.Element {
  const wrapRef = useRef<HTMLDivElement>(null);
  const project = useStore((s) => s.project);
  const c = useStore((s) => s.construction);
  const session = useStore((s) => s.session);
  const select = useStore((s) => s.select);
  const selectAll = useStore((s) => s.selectAll);
  const toggleSelect = useStore((s) => s.toggleSelect);
  const setHovered = useStore((s) => s.setHovered);
  const setZoom = useStore((s) => s.setZoom);
  const setPan = useStore((s) => s.setPan);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const toggleSnap = useStore((s) => s.toggleSnap);
  const toggleStrictPlacement = useStore((s) => s.toggleStrictPlacement);
  const toggleFolded = useStore((s) => s.toggleFolded);
  const setMode = useStore((s) => s.setMode);
  const setWarnOpen = useStore((s) => s.setWarnOpen);
  const setGuides = useStore((s) => s.setGuides);
  const setPar = useStore((s) => s.setPar);
  const addRowAction = useStore((s) => s.addRowAction);
  const swapSides = useStore((s) => s.swapSides);
  const reorderInRow = useStore((s) => s.reorderInRow);
  const relocate = useStore((s) => s.relocate);
  const relocateToBest = useStore((s) => s.relocateToBest);
  const autoOptimize = useStore((s) => s.autoOptimize);
  const addModule = useStore((s) => s.addModule);
  const addModuleAt = useStore((s) => s.addModuleAt);
  const moveToSide = useStore((s) => s.moveToSide);
  const rotate = useStore((s) => s.rotate);
  const duplicate = useStore((s) => s.duplicate);
  const remove = useStore((s) => s.remove);
  const commitParams = useStore((s) => s.commitParams);
  const toast = useStore((s) => s.toast);

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const activeTheme = useMemo(
    () => FABRIC_THEMES.find((x) => x.id === session.fabricTheme) ?? FABRIC_THEMES[0]!,
    [session.fabricTheme],
  );
  const unit = project.settings.unit;

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  const openCtxMenu = (e: MouseEvent, moduleId: string | null): void => {
    e.preventDefault();
    e.stopPropagation();
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = clamp(e.clientX - r.left, 8, Math.max(8, r.width - 210));
    const y = clamp(e.clientY - r.top, 8, Math.max(8, r.height - 260));
    if (moduleId && !session.selection.includes(moduleId)) select([moduleId]);
    setCtxMenu({ x, y, moduleId });
  };

  const [size, setSize] = useState({ w: 960, h: 640 });
  const [drag, setDrag] = useState<ActiveDrag | null>(null);
  const [libDrag, setLibDrag] = useState<LibDragPreview | null>(null);
  const [resize, setResize] = useState<ActiveResize | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  const expert = session.mode === 'expert';

  // Canvas-Größe verfolgen
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Einpassen auf das volle aufgeschlagene Buch
  const fit = useCallback(
    (user = false) => {
      const margin = 76;
      const sx = (size.w - margin * 2) / Math.max(1, c.book.w);
      const sy = (size.h - margin * 2) / Math.max(1, c.book.h);
      const z = clamp(Math.min(sx, sy), 0.35, 3.6);
      setZoom(z, { user });
      setPan((size.w - c.book.w * z) / 2, (size.h - c.book.h * z) / 2);
    },
    [size, c.book.w, c.book.h, setZoom, setPan],
  );

  // Automatisches Einpassen — aber nur, solange der Nutzer den Zoom noch nicht selbst verstellt hat.
  useEffect(() => {
    if (!session.zoomTouched) fit(false);
  }, [fit, project.id, c.book.w, c.book.h, session.zoomTouched]);

  // Tastaturkürzel: Leertaste (Pan), Entf, R (Drehen), Esc, Alt+Pfeile (strenges Verschieben)
  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      if (isInteractiveTarget(e.target) || session.startOpen) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceDown(true);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && session.selection.length > 0) {
        e.preventDefault();
        remove(session.selection);
      }
      if (e.key === 'r' && session.selection.length === 1) {
        e.preventDefault();
        rotate(session.selection[0]!);
      }
      if (e.key === 'Escape') select([]);
      if (e.altKey && session.selection.length === 1 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const modId = session.selection[0]!;
        const inst = project.modules.find((m) => m.id === modId);
        if (!inst) return;
        e.preventDefault();
        const sameSlot = project.modules.filter((m) => m.rowId === inst.rowId && m.side === inst.side);
        const curIdx = sameSlot.findIndex((m) => m.id === modId);
        const rowIdx = project.rows.findIndex((r) => r.id === inst.rowId);
        if (e.key === 'ArrowLeft') {
          if (curIdx > 0) relocate(modId, { side: inst.side, rowId: inst.rowId, index: curIdx - 1 });
          else if (inst.side === 'right') {
            const leftCount = project.modules.filter((m) => m.rowId === inst.rowId && m.side === 'left').length;
            relocate(modId, { side: 'left', rowId: inst.rowId, index: leftCount });
          }
        } else if (e.key === 'ArrowRight') {
          if (curIdx < sameSlot.length - 1) relocate(modId, { side: inst.side, rowId: inst.rowId, index: curIdx + 1 });
          else if (inst.side === 'left') {
            relocate(modId, { side: 'right', rowId: inst.rowId, index: 0 });
          }
        } else if (e.key === 'ArrowUp' && rowIdx > 0) {
          const prevRow = project.rows[rowIdx - 1]!;
          const cnt = project.modules.filter((m) => m.rowId === prevRow.id && m.side === inst.side).length;
          relocate(modId, { side: inst.side, rowId: prevRow.id, index: cnt });
        } else if (e.key === 'ArrowDown' && rowIdx < project.rows.length - 1) {
          const nextRow = project.rows[rowIdx + 1]!;
          const cnt = project.modules.filter((m) => m.rowId === nextRow.id && m.side === inst.side).length;
          relocate(modId, { side: inst.side, rowId: nextRow.id, index: cnt });
        }
      }
    };
    const up = (e: KeyboardEvent): void => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [session.selection, session.startOpen, project.modules, project.rows, remove, rotate, select, relocate]);

  const toWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return {
        x: (clientX - r.left - session.panX) / session.zoom,
        y: (clientY - r.top - session.panY) / session.zoom,
      };
    },
    [session.panX, session.panY, session.zoom],
  );

  // Zoom um den Cursor (im Zugeklappt-Modus normales Scrollen erlauben!)
  const onWheel = (e: WheelEvent): void => {
    if (session.folded) return;
    e.preventDefault();
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      const factor = Math.exp(-e.deltaY * 0.0014);
      const next = clamp(session.zoom * factor, 0.35, 10);
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const wx = (cx - session.panX) / session.zoom;
      const wy = (cy - session.panY) / session.zoom;
      setZoom(next, { user: true });
      setPan(cx - wx * next, cy - wy * next);
    }
  };

  // Drag aus der Bibliothek (live Vorschau + strenge Auswertung!)
  const onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (session.folded) return;
    const typeId = getDraggedLibraryModule();
    if (!typeId) return;
    const w = toWorld(e.clientX, e.clientY);
    const dim = previewModuleDim(project, typeId);
    const resolved = resolveDropTarget(project, c, w.x, w.y, { movingDim: dim, snap: session.snap });
    const evaluation = evaluateAdd(project, typeId, resolved.target, undefined, c);
    setLibDrag({ typeId, resolved, evaluation });
    if (session.snap) {
      setGuides(resolved.guides.map((g) => ({ axis: g.axis, at: g.pos })));
    }
  };

  const onDragLeave = (e: DragEvent): void => {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setLibDrag(null);
      setGuides([]);
    }
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-module') || e.dataTransfer.getData('text/plain') || getDraggedLibraryModule() || '';
    clearDraggedLibraryModule();
    setLibDrag(null);
    setGuides([]);
    if (!raw || !isValidModuleTypeId(raw)) return;
    if (session.folded) {
      addModule(raw);
      return;
    }
    const w = toWorld(e.clientX, e.clientY);
    const dim = previewModuleDim(project, raw);
    const resolved = resolveDropTarget(project, c, w.x, w.y, { movingDim: dim, snap: session.snap });
    addModuleAt(raw, resolved.target);
  };

  // Canvas-Hintergrund: Klick hebt Auswahl auf, Leertaste/mittlere Maustaste pannt
  const onBgDown = (e: PointerEvent): void => {
    if (e.button === 1 || spaceDown) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setPanning({ startX: e.clientX, startY: e.clientY, panX: session.panX, panY: session.panY });
      return;
    }
    select([]);
  };

  const onBgMove = (e: PointerEvent): void => {
    if (!panning) return;
    setPan(panning.panX + (e.clientX - panning.startX), panning.panY + (e.clientY - panning.startY));
  };

  const onBgUp = (): void => setPanning(null);

  // Modul-Drag (live Placement-Engine + Reflow + strenges Gate)
  const startModDrag = (e: PointerEvent, id: string, origRect: Rect): void => {
    e.stopPropagation();
    if (spaceDown || e.button !== 0) return;
    if (e.shiftKey) {
      toggleSelect(id);
      return;
    }
    if (!session.selection.includes(id)) select([id]);
    const inst = project.modules.find((m) => m.id === id);
    if (inst?.locked) {
      toast(t('place.lockedBlocked'), 'info');
      return;
    }
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: origRect.x,
      origY: origRect.y,
      dx: 0,
      dy: 0,
      moved: false,
      resolved: null,
      evaluation: null,
    });
  };

  const moveModDrag = (e: PointerEvent, origRect: Rect): void => {
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / session.zoom;
    const dy = (e.clientY - drag.startY) / session.zoom;
    const moved = drag.moved || Math.hypot(dx, dy) > 3;
    if (!moved) return;

    const w = toWorld(e.clientX, e.clientY);
    const resolved = resolveDropTarget(project, c, w.x, w.y, {
      excludeModuleId: drag.id,
      movingDim: { w: origRect.w, h: origRect.h },
      snap: session.snap,
    });
    const evaluation = evaluateMove(project, drag.id, resolved.target, c);

    setDrag({ ...drag, dx, dy, moved: true, resolved, evaluation });
    if (session.snap) {
      setGuides(resolved.guides.map((g) => ({ axis: g.axis, at: g.pos })));
    } else {
      setGuides([]);
    }
  };

  const endModDrag = (): void => {
    if (!drag) return;
    const { id, moved, resolved } = drag;
    setDrag(null);
    setGuides([]);
    if (!moved || !resolved) return;
    // EIN atomarer Undo-Schritt mit strenger Prüfung!
    relocate(id, resolved.target);
  };

  // Größen-Griffe (Live-Vorschau ohne Undo-Flut, 1 atomarer Commit bei Loslassen!)
  const startResize = (e: PointerEvent, id: string, axis: 'w' | 'h'): void => {
    e.stopPropagation();
    const inst = project.modules.find((m) => m.id === id);
    if (!inst) return;
    if (inst.locked) {
      toast(t('place.lockedBlocked'), 'info');
      return;
    }
    const def = moduleDef(inst.typeId);
    const swapped = inst.rotation % 180 === 90;
    const wantW = swapped ? axis === 'h' : axis === 'w';
    const key = wantW ? 'breite' : def.fields.find((f) => f.key === 'hoehe' || f.key === 'laenge')?.key;
    if (!key) return;
    const field = def.fields.find((f) => f.key === key);
    if (!field || field.derived || field.min === undefined || field.max === undefined) return;
    const startVal = Number(inst.params[key] ?? def.defaults[key] ?? 60);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const nextParams = { ...inst.params, [key]: startVal };
    const evaluation = evaluateResize(project, id, nextParams, c);
    setResize({
      id,
      axis,
      key,
      min: field.min,
      max: field.max,
      startClient: axis === 'w' ? e.clientX : e.clientY,
      startVal,
      currentVal: startVal,
      params: nextParams,
      evaluation,
    });
  };

  const moveResize = (e: PointerEvent): void => {
    if (!resize) return;
    const delta = ((resize.axis === 'w' ? e.clientX : e.clientY) - resize.startClient) / session.zoom;
    const raw = resize.startVal + delta;
    const stepped = session.snap ? Math.round(raw / 2) * 2 : Math.round(raw);
    const clampedVal = clamp(stepped, resize.min, resize.max);
    if (clampedVal === resize.currentVal) return;
    const nextParams: Params = { ...resize.params, [resize.key]: clampedVal };
    const evaluation = evaluateResize(project, resize.id, nextParams, c);
    setResize({ ...resize, currentVal: clampedVal, params: nextParams, evaluation });
  };

  const endResize = (): void => {
    if (!resize) return;
    const { id, currentVal, startVal, params, evaluation } = resize;
    setResize(null);
    if (currentVal === startVal) return;
    if (session.strictPlacement && !evaluation.allowed) {
      const reason = t(evaluation.reasonKey, evaluation.reasonValues);
      toast(t('place.rejected', { grund: reason }), 'error');
      return;
    }
    commitParams(id, params);
  };

  // Aktive Live-Evaluation (entweder Modul-Drag oder Bibliothek-Drag)
  const activeEval: PlacementEvaluation | null = drag?.moved ? drag.evaluation : (libDrag?.evaluation ?? null);
  const activeResolved: ResolvedDropTarget | null = drag?.moved ? drag.resolved : (libDrag?.resolved ?? null);

  // Reflow-Offset-Map für Nachbarmodule während Drag/Resize
  const reflowOffsets = useMemo(() => {
    const map = new Map<string, { dx: number; dy: number }>();
    const list = activeEval?.shiftedModules ?? resize?.evaluation.shiftedModules ?? [];
    for (const s of list) {
      map.set(s.id, { dx: s.to.x - s.from.x, dy: s.to.y - s.from.y });
    }
    return map;
  }, [activeEval, resize]);

  // Fehler-/Warn-Status pro Modul (für Statuspunkte direkt auf dem Canvas)
  const moduleSeverity = useMemo(() => {
    const map = new Map<string, 'error' | 'warn'>();
    for (const f of c.findings) {
      if (f.subject.kind !== 'module') continue;
      const cur = map.get(f.subject.id);
      if (f.severity === 'error') map.set(f.subject.id, 'error');
      else if (f.severity === 'warn' && cur !== 'error') map.set(f.subject.id, 'warn');
    }
    return map;
  }, [c.findings]);

  // Geometrie des offenen Buchs
  const flapW = project.base.widthMm;
  const flapH = project.base.heightMm;
  const spine = project.base.spineWidthMm;
  const rightOrigin = flapW + spine;
  const bookW = c.book.w;
  const bookH = c.book.h;
  const usableW = flapW - 2 * PRACTICE.edgeMarginMm;
  const usableH = flapH - 2 * PRACTICE.edgeMarginMm;
  const seamMargin = PRACTICE.edgeMarginMm;
  const leftPath = roundedRectPath({ x: 0, y: 0, w: flapW, h: flapH } as Rect, project.base.cornerRadiusMm);
  const rightPath = roundedRectPath({ x: rightOrigin, y: 0, w: flapW, h: flapH } as Rect, project.base.cornerRadiusMm);
  const fullPath = roundedRectPath(c.book, project.base.cornerRadiusMm);

  const leftModCount = c.modules.filter((m) => m.side !== 'right').length;
  const rightModCount = c.modules.filter((m) => m.side === 'right').length;

  // Kontextleiste für einzelnes selektiertes Modul
  const selectedMod = session.selection.length === 1 ? c.modules.find((m) => m.instanceId === session.selection[0]) : undefined;
  const selectedInst = selectedMod ? project.modules.find((m) => m.id === selectedMod.instanceId) : undefined;
  const selectedRepair = useMemo(() => {
    if (!selectedInst || selectedInst.locked) return null;
    return suggestRepairMove(project, selectedInst.id, c);
  }, [project, selectedInst, c]);

  // Schwebendes Live-HUD für Drag & Resize (in Bildschirmkoordinaten)
  const hudPlacement = useMemo(() => {
    if (resize && resize.evaluation.projectedRect) {
      const r = resize.evaluation.projectedRect;
      const sx = session.panX + (r.x + r.w / 2) * session.zoom;
      const sy = session.panY + r.y * session.zoom - 14;
      const reason = t(resize.evaluation.reasonKey, resize.evaluation.reasonValues);
      const label =
        resize.evaluation.verdict === 'blocked'
          ? t('place.resizeBlocked', { w: Math.round(r.w), h: Math.round(r.h), grund: reason })
          : resize.evaluation.verdict === 'tight' || resize.evaluation.verdict === 'warn'
            ? t('place.resizeTight', { w: Math.round(r.w), h: Math.round(r.h) })
            : t('place.resizeOk', { w: Math.round(r.w), h: Math.round(r.h) });
      return {
        x: clamp(sx, 110, size.w - 110),
        y: clamp(sy, 44, size.h - 72),
        verdict: resize.evaluation.verdict,
        headline: label,
        sub: null as string | null,
        scoreDelta: resize.evaluation.scoreDelta,
      };
    }
    if (activeEval && activeResolved && activeEval.projectedRect) {
      const r = activeEval.projectedRect;
      const sx = session.panX + (r.x + r.w / 2) * session.zoom;
      const sy = session.panY + r.y * session.zoom - 16;
      const sideLabel = activeResolved.target.side === 'right' ? t('side.right') : t('side.left');
      return {
        x: clamp(sx, 130, size.w - 130),
        y: clamp(sy, 48, size.h - 76),
        verdict: activeEval.verdict,
        headline: `${sideLabel} · ${activeResolved.rowName}`,
        sub: t(activeEval.reasonKey, activeEval.reasonValues),
        scoreDelta: activeEval.scoreDelta,
      };
    }
    return null;
  }, [activeEval, activeResolved, resize, session.panX, session.panY, session.zoom, size.w, size.h]);

  return (
    <div
      className={`canvas-wrap canvas-scroll${panning || spaceDown ? ' panning' : ''}`}
      ref={wrapRef}
      onWheel={onWheel}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Ruhiger Studio-Titel oben links + Qualitäts-Abzeichen oben rechts */}
      <div className="design-title-pill" aria-hidden="true">
        <span>{session.folded ? t('folded.title') : t('design.openBook')}</span>
        <span className="pill-dim">
          {unit === 'cm' ? `${fmtMm(flapW, 'cm')} × ${fmtMm(flapH, 'cm')}` : `${flapW} × ${flapH} mm`}
        </span>
      </div>
      <div className="canvas-top-hud">
        <QualityBadge evaluation={c.evaluation} onClick={() => setWarnOpen(!session.warnOpen)} />
      </div>

      {session.folded ? (
        <Suspense fallback={null}>
          <FoldedPreview />
        </Suspense>
      ) : (
      <svg
        className="canvas-svg"
        width={size.w}
        height={size.h}
        onPointerDown={onBgDown}
        onPointerMove={onBgMove}
        onPointerUp={onBgUp}
        onContextMenu={(e) => openCtxMenu(e, null)}
        role="img"
        aria-label={`${t('design.openBook')}: ${project.name}, ${flapW} × ${flapH} mm`}
      >
        <defs>
          <pattern id="grid-sm" width={session.gridMm} height={session.gridMm} patternUnits="userSpaceOnUse">
            <path d={`M ${session.gridMm} 0 L 0 0 0 ${session.gridMm}`} fill="none" stroke="rgba(42,37,33,.045)" strokeWidth={0.4 / session.zoom} />
          </pattern>
          <pattern id="grid-lg" width={session.gridMm * 5} height={session.gridMm * 5} patternUnits="userSpaceOnUse">
            <rect width={session.gridMm * 5} height={session.gridMm * 5} fill="url(#grid-sm)" />
            <path
              d={`M ${session.gridMm * 5} 0 L 0 0 0 ${session.gridMm * 5}`}
              fill="none"
              stroke="rgba(42,37,33,.085)"
              strokeWidth={0.6 / session.zoom}
            />
          </pattern>
          <linearGradient id="linen-left" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={activeTheme.inner} />
            <stop offset="86%" stopColor={activeTheme.outer} />
            <stop offset="100%" stopColor={activeTheme.edge} />
          </linearGradient>
          <linearGradient id="linen-right" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={activeTheme.edge} />
            <stop offset="14%" stopColor={activeTheme.outer} />
            <stop offset="100%" stopColor={activeTheme.inner} />
          </linearGradient>
          <linearGradient id="spine-crease" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(42,37,33,0.11)" />
            <stop offset="35%" stopColor="rgba(42,37,33,0.03)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="65%" stopColor="rgba(42,37,33,0.03)" />
            <stop offset="100%" stopColor="rgba(42,37,33,0.11)" />
          </linearGradient>
          <pattern id="hazard-stripe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(181, 56, 56, 0.28)" strokeWidth="2.2" />
          </pattern>
          <filter id="book-drop" x="-6%" y="-6%" width="112%" height="114%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#2A2521" floodOpacity="0.11" />
          </filter>
          <filter id="mod-elev" x="-8%" y="-8%" width="116%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodColor="#2A2521" floodOpacity="0.09" />
          </filter>
        </defs>

        <g transform={`translate(${session.panX}, ${session.panY}) scale(${session.zoom})`}>
          {/* Raster — nur im erweiterten Modus sichtbar */}
          {expert && session.grid ? <rect x={-1600} y={-1600} width={4400} height={4400} fill="url(#grid-lg)" /> : null}

          {/* Grundform: das volle aufgeschlagene Mäppchen mit taktiler Tiefe */}
          <path d={fullPath} className="book-outer" filter="url(#book-drop)" />
          <path d={leftPath} fill="url(#linen-left)" className="flap-surface" />
          <path d={rightPath} fill="url(#linen-right)" className="flap-surface" />
          <rect
            x={0}
            y={0}
            width={flapW}
            height={flapH}
            rx={project.base.cornerRadiusMm}
            className="atelier-edge"
            pointerEvents="none"
          />
          {expert ? <path d={fullPath} className="flap-outline" vectorEffect="non-scaling-stroke" /> : null}

          {/* Subtile Atelier-Steppnaht als Nutzflächen-Rahmen */}
          <rect
            x={seamMargin}
            y={seamMargin}
            width={Math.max(0, usableW)}
            height={Math.max(0, usableH)}
            rx={Math.max(0, project.base.cornerRadiusMm - seamMargin)}
            className="usable-stitch"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={rightOrigin + seamMargin}
            y={seamMargin}
            width={Math.max(0, usableW)}
            height={Math.max(0, usableH)}
            rx={Math.max(0, project.base.cornerRadiusMm - seamMargin)}
            className="usable-stitch"
            vectorEffect="non-scaling-stroke"
          />

          {/* Beschriftung der beiden Innenflächen oben außerhalb des Stoffes */}
          <text x={flapW / 2} y={-10} textAnchor="middle" className="face-title" style={{ fontSize: 10.5 / session.zoom }}>
            {t('design.leftFace')}
          </text>
          <text x={rightOrigin + flapW / 2} y={-10} textAnchor="middle" className="face-title" style={{ fontSize: 10.5 / session.zoom }}>
            {t('design.rightFace')}
          </text>

          {/* Bund / Falz in der Mitte (mit Warnhervorhebung bei Drag über dem Falz) */}
          {spine > 0 ? (
            <g className={`spine-group${activeResolved?.spineZone ? ' spine-blocked' : ''}`}>
              <rect x={flapW} y={0} width={spine} height={flapH} fill="url(#spine-crease)" className="spine-band" />
              <line x1={flapW} y1={0} x2={flapW} y2={flapH} className="fold-crease" vectorEffect="non-scaling-stroke" />
              <line x1={rightOrigin} y1={0} x2={rightOrigin} y2={flapH} className="fold-crease" vectorEffect="non-scaling-stroke" />
              <line x1={flapW + spine / 2} y1={0} x2={flapW + spine / 2} y2={flapH} className="fold-center" vectorEffect="non-scaling-stroke" />
              <text
                x={flapW + spine / 2}
                y={flapH + 14 / session.zoom}
                textAnchor="middle"
                className={`atelier-fold-label fold-label${activeResolved?.spineZone ? ' warn' : ''}`}
                style={{ fontSize: 9.5 / session.zoom }}
              >
                {activeResolved?.spineZone
                  ? t('place.spine')
                  : `${t('canvas.fold')} · ${fmtMm(spine, project.settings.unit)}`}
              </text>
            </g>
          ) : (
            <line x1={flapW} y1={0} x2={flapW} y2={flapH} className="fold-center" vectorEffect="non-scaling-stroke" />
          )}

          {/* Einladender Hinweis auf leerer Gegenseite (wenn die andere Seite Module trägt) */}
          {leftModCount > 0 && rightModCount === 0 && !activeEval ? (
            <g className="empty-side-hint" pointerEvents="none">
              <rect
                x={rightOrigin + seamMargin + 8}
                y={seamMargin + 8}
                width={Math.max(0, usableW - 16)}
                height={Math.max(0, usableH - 16)}
                rx={6}
                className="empty-side-box"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={rightOrigin + flapW / 2}
                y={flapH / 2}
                textAnchor="middle"
                className="empty-side-text"
                style={{ fontSize: Math.min(11, 11 / session.zoom) }}
              >
                {t('place.dropHintRight')}
              </text>
            </g>
          ) : null}
          {rightModCount > 0 && leftModCount === 0 && !activeEval ? (
            <g className="empty-side-hint" pointerEvents="none">
              <rect
                x={seamMargin + 8}
                y={seamMargin + 8}
                width={Math.max(0, usableW - 16)}
                height={Math.max(0, usableH - 16)}
                rx={6}
                className="empty-side-box"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={flapW / 2}
                y={flapH / 2}
                textAnchor="middle"
                className="empty-side-text"
                style={{ fontSize: Math.min(11, 11 / session.zoom) }}
              >
                {t('place.dropHintLeft')}
              </text>
            </g>
          ) : null}

          {/* Nahtzugabe-Rahmen — nur im erweiterten Modus */}
          {expert ? (
            <>
              <rect
                x={project.settings.seamAllowanceMm}
                y={project.settings.seamAllowanceMm}
                width={Math.max(0, flapW - 2 * project.settings.seamAllowanceMm)}
                height={Math.max(0, flapH - 2 * project.settings.seamAllowanceMm)}
                rx={Math.max(0, project.base.cornerRadiusMm - project.settings.seamAllowanceMm)}
                className="sa-line"
                vectorEffect="non-scaling-stroke"
              />
              <rect
                x={rightOrigin + project.settings.seamAllowanceMm}
                y={project.settings.seamAllowanceMm}
                width={Math.max(0, flapW - 2 * project.settings.seamAllowanceMm)}
                height={Math.max(0, flapH - 2 * project.settings.seamAllowanceMm)}
                rx={Math.max(0, project.base.cornerRadiusMm - project.settings.seamAllowanceMm)}
                className="sa-line"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}

          {/* Zeilen-Trennlinien + Kapazitäts-Balken im erweiterten Modus oder beim Ziehen */}
          {(expert || activeEval !== null) &&
            c.rows.map((r) => {
              const isTargetRow = activeResolved?.target.rowId === r.id;
              const barY = r.rect.y + 1.5;
              const leftBarW = Math.min(usableW, (r.fillLeftPct / 100) * usableW);
              const rightBarW = Math.min(usableW, (r.fillRightPct / 100) * usableW);
              return (
                <g key={r.id}>
                  <rect
                    x={seamMargin}
                    y={r.rect.y}
                    width={usableW}
                    height={Math.max(r.rect.h, 18)}
                    className={`row-band${isTargetRow && activeResolved?.target.side === 'left' ? ' target' : ''}`}
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    x={rightOrigin + seamMargin}
                    y={r.rect.y}
                    width={usableW}
                    height={Math.max(r.rect.h, 18)}
                    className={`row-band${isTargetRow && activeResolved?.target.side === 'right' ? ' target' : ''}`}
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Feine Auslastungsbalken je Seite */}
                  {r.fillLeftPct > 0 ? (
                    <rect
                      x={seamMargin}
                      y={barY}
                      width={leftBarW}
                      height={1.6 / session.zoom}
                      className={`row-cap-bar ${r.fillLeftPct > 100 ? 'err' : r.fillLeftPct > 95 ? 'warn' : 'ok'}`}
                    />
                  ) : null}
                  {r.fillRightPct > 0 ? (
                    <rect
                      x={rightOrigin + seamMargin}
                      y={barY}
                      width={rightBarW}
                      height={1.6 / session.zoom}
                      className={`row-cap-bar ${r.fillRightPct > 100 ? 'err' : r.fillRightPct > 95 ? 'warn' : 'ok'}`}
                    />
                  ) : null}
                  <text x={seamMargin - 4} y={r.rect.y + 10 / session.zoom} textAnchor="end" className="row-label" style={{ fontSize: 8.5 / session.zoom }}>
                    {r.name}
                  </text>
                </g>
              );
            })}

          {/* Ziel-Geist & Einfüge-Linie aus der echten Platzierungs-Engine */}
          {activeEval && activeResolved ? (
            <g className="drop-preview" pointerEvents="none">
              {activeEval.projectedRect ? (
                <g>
                  <rect
                    x={activeEval.projectedRect.x}
                    y={activeEval.projectedRect.y}
                    width={activeEval.projectedRect.w}
                    height={activeEval.projectedRect.h}
                    rx={2.5}
                    className={`ghost-slot ${activeEval.verdict}`}
                    vectorEffect="non-scaling-stroke"
                  />
                  {activeEval.verdict === 'blocked' ? (
                    <rect
                      x={activeEval.projectedRect.x}
                      y={activeEval.projectedRect.y}
                      width={activeEval.projectedRect.w}
                      height={activeEval.projectedRect.h}
                      rx={2.5}
                      fill="url(#hazard-stripe)"
                    />
                  ) : null}
                </g>
              ) : null}
              <line
                x1={activeResolved.insertionLine.x}
                y1={activeResolved.insertionLine.y}
                x2={activeResolved.insertionLine.x}
                y2={activeResolved.insertionLine.y + activeResolved.insertionLine.h}
                className={`drop-bar ${activeEval.verdict}`}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : null}

          {/* Module — mit Live-Reflow-Vorschau für Nachbarmodule */}
          {c.modules.map((m) => {
            const sel = session.selection.includes(m.instanceId);
            const hov = session.hovered === m.instanceId;
            const isDragging = drag?.id === m.instanceId && drag.moved;
            const isResizing = resize?.id === m.instanceId;
            const reflow = !isDragging ? reflowOffsets.get(m.instanceId) : undefined;
            const def = moduleDef(m.typeId);
            const activeRect = isResizing && resize.evaluation.projectedRect ? resize.evaluation.projectedRect : m.rect;
            const tx = isDragging ? m.rect.x + drag.dx : activeRect.x + (reflow?.dx ?? 0);
            const ty = isDragging ? m.rect.y + drag.dy : activeRect.y + (reflow?.dy ?? 0);
            const sw = activeRect.w;
            const sh = activeRect.h;
            const rot = m.rotation;
            const swapped = rot % 180 === 90;
            const innerW = swapped ? sh : sw;
            const innerH = swapped ? sw : sh;
            const innerTx = (sw - innerW) / 2;
            const innerTy = (sh - innerH) / 2;
            const canResizeW = !m.locked && (swapped ? !def.derivedHeight : !def.derivedWidth) && def.fields.some((f) => f.key === (swapped ? 'hoehe' : 'breite'));
            const canResizeH =
              !m.locked && (swapped ? !def.derivedWidth : !def.derivedHeight) && def.fields.some((f) => f.key === (swapped ? 'breite' : 'hoehe') || f.key === 'laenge');
            const instObj = project.modules.find((x) => x.id === m.instanceId);
            const summaryTxt = instObj ? def.summary(instObj.params) : '';
            const label = t(def.nameKey);
            const labelFits = sw >= 42 && sh >= 20;
            const sideRightEdge = m.side === 'right' ? rightOrigin + flapW - seamMargin : flapW - seamMargin;
            const overflows = activeRect.x + sw > sideRightEdge + 0.5 || activeRect.y + sh > flapH - seamMargin + 0.5;
            const sev = moduleSeverity.get(m.instanceId);

            return (
              <g
                key={m.instanceId}
                className={`mod${sel ? ' sel' : ''}${hov ? ' hov' : ''}${overflows || sev === 'error' ? ' mod-overflow' : ''}${reflow ? ' reflow-mod' : ''}${m.locked ? ' locked' : ''}`}
                data-module-id={m.instanceId}
                transform={`translate(${tx}, ${ty})`}
                opacity={isDragging ? 0.42 : 1}
                style={{ cursor: m.locked ? 'default' : isDragging ? 'grabbing' : 'grab' }}
                onPointerDown={(e) => startModDrag(e, m.instanceId, m.rect)}
                onPointerMove={(e) => moveModDrag(e, m.rect)}
                onPointerUp={endModDrag}
                onPointerEnter={() => setHovered(m.instanceId)}
                onPointerLeave={() => setHovered(null)}
                onContextMenu={(e) => openCtxMenu(e, m.instanceId)}
                role="button"
                aria-label={`${label}${summaryTxt ? ` ${summaryTxt}` : ''}, ${Math.round(sw)} × ${Math.round(sh)} mm`}
              >
                <rect
                  x={0}
                  y={0}
                  width={sw}
                  height={sh}
                  rx={2.5}
                  className="mod-shape"
                  filter={sel || hov ? 'url(#mod-elev)' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
                {overflows ? (
                  <rect x={0} y={0} width={sw} height={sh} rx={2.5} fill="url(#hazard-stripe)" pointerEvents="none" />
                ) : null}
                <g transform={`rotate(${rot} ${sw / 2} ${sh / 2}) translate(${innerTx} ${innerTy})`}>
                  <Prims prims={m.prims} />
                </g>

                {/* Status-Indikator bei aktivem Fehler/Hinweis direkt am Modul */}
                {sev && !isDragging ? (
                  <circle
                    cx={Math.max(4, sw - 4.5)}
                    cy={4.5}
                    r={2.8 / Math.min(1.6, Math.max(0.7, session.zoom))}
                    className={`mod-status-dot ${sev}`}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}

                {/* Schloss-Markierung bei gesperrten Modulen */}
                {m.locked ? (
                  <text
                    x={4}
                    y={9 / Math.min(1.5, Math.max(0.7, session.zoom))}
                    className="mod-lock-tag"
                    style={{ fontSize: 7.5 / Math.min(1.5, Math.max(0.7, session.zoom)) }}
                  >
                    ●
                  </text>
                ) : null}

                {/* Ruhiges Modul-Label — nur bei Auswahl/Hover und wenn genug Platz */}
                {(sel || hov) && labelFits ? (
                  <text
                    x={sw / 2}
                    y={sh / 2 + 3 / session.zoom}
                    textAnchor="middle"
                    className="mod-caption"
                    style={{ fontSize: Math.min(10, 10 / session.zoom) }}
                  >
                    {label}
                  </text>
                ) : null}

                {/* Auswahlrahmen + Größen-Griffe */}
                {sel && !isDragging ? (
                  <>
                    <rect x={-1 / session.zoom} y={-1 / session.zoom} width={sw + 2 / session.zoom} height={sh + 2 / session.zoom} rx={3} className="sel-box" vectorEffect="non-scaling-stroke" />
                    {canResizeW ? (
                      <rect
                        x={sw - HANDLE / 2 / session.zoom}
                        y={sh / 2 - HANDLE / 2 / session.zoom}
                        width={HANDLE / session.zoom}
                        height={HANDLE / session.zoom}
                        rx={2 / session.zoom}
                        className="scale-handle"
                        vectorEffect="non-scaling-stroke"
                        onPointerDown={(e) => startResize(e, m.instanceId, 'w')}
                        onPointerMove={moveResize}
                        onPointerUp={endResize}
                      />
                    ) : null}
                    {canResizeH ? (
                      <rect
                        x={sw / 2 - HANDLE / 2 / session.zoom}
                        y={sh - HANDLE / 2 / session.zoom}
                        width={HANDLE / session.zoom}
                        height={HANDLE / session.zoom}
                        rx={2 / session.zoom}
                        className="scale-handle scale-handle-h"
                        vectorEffect="non-scaling-stroke"
                        onPointerDown={(e) => startResize(e, m.instanceId, 'h')}
                        onPointerMove={moveResize}
                        onPointerUp={endResize}
                      />
                    ) : null}
                    {/* Auswahl-Maß direkt am Modul */}
                    <text x={sw / 2} y={-5 / session.zoom} textAnchor="middle" className="dim-text" style={{ fontSize: 10 / session.zoom }}>
                      {fmtMm(sw, project.settings.unit)} × {fmtMm(sh, project.settings.unit)}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}

          {/* Magnetische Hilfslinien */}
          {session.guides.map((g, i) =>
            g.axis === 'x' ? (
              <line key={i} x1={g.at} y1={-36} x2={g.at} y2={bookH + 36} className="guide-snap" vectorEffect="non-scaling-stroke" />
            ) : (
              <line key={i} x1={-36} y1={g.at} x2={bookW + 36} y2={g.at} className="guide-snap" vectorEffect="non-scaling-stroke" />
            ),
          )}

          {/* Außen-Maßketten — nur im erweiterten Modus */}
          {expert ? (
            <g className="dim-group">
              <Dimension x1={0} y1={-22} x2={flapW} y2={-22} label={fmtMm(flapW, project.settings.unit)} zoom={session.zoom} />
              <Dimension x1={rightOrigin} y1={-22} x2={bookW} y2={-22} label={fmtMm(flapW, project.settings.unit)} zoom={session.zoom} />
              <Dimension x1={-22} y1={0} x2={-22} y2={flapH} label={fmtMm(flapH, project.settings.unit)} zoom={session.zoom} vertical />
            </g>
          ) : null}
        </g>
      </svg>
      )}

      {/* Leerer Zustand — einladend, nicht technisch */}
      {c.modules.length === 0 && !session.folded ? (
        <div className="canvas-empty-hint" aria-live="polite">
          <p className="ceh-title">{t('design.addFirst')}</p>
          <p className="ceh-sub">{t('design.addFirstHint')}</p>
        </div>
      ) : null}

      {/* Live-Bewertungs-HUD während Drag & Resize */}
      {hudPlacement ? (
        <div
          className={`drag-hud ${hudPlacement.verdict}`}
          style={{ left: hudPlacement.x, top: hudPlacement.y }}
          role="status"
          aria-live="polite"
        >
          <span className={`drag-hud-dot ${hudPlacement.verdict}`} />
          <div className="drag-hud-body">
            <span className="drag-hud-head">{hudPlacement.headline}</span>
            {hudPlacement.sub ? <span className="drag-hud-sub">{hudPlacement.sub}</span> : null}
          </div>
          {hudPlacement.scoreDelta !== 0 ? (
            <span className={`drag-hud-delta ${hudPlacement.scoreDelta > 0 ? 'pos' : 'neg'}`}>
              {hudPlacement.scoreDelta > 0 ? `+${hudPlacement.scoreDelta}` : hudPlacement.scoreDelta}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Rechtsklick-Kontextmenü für Modul oder Arbeitsfläche */}
      {ctxMenu && !session.folded ? (() => {
        const modInst = ctxMenu.moduleId ? project.modules.find((m) => m.id === ctxMenu.moduleId) : null;
        const sameSlot = modInst ? project.modules.filter((m) => m.rowId === modInst.rowId && m.side === modInst.side) : [];
        const slotIdx = modInst ? sameSlot.findIndex((m) => m.id === modInst.id) : -1;
        const closeMenu = () => setCtxMenu(null);
        return (
          <div
            className="ctx-menu"
            role="menu"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {modInst ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  disabled={modInst.locked}
                  onClick={() => { moveToSide(modInst.id, modInst.side === 'left' ? 'right' : 'left'); closeMenu(); }}
                >
                  {modInst.side === 'left' ? t('side.moveToRight') : t('side.moveToLeft')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={modInst.locked || slotIdx <= 0}
                  onClick={() => { void reorderInRow(modInst.id, -1); closeMenu(); }}
                >
                  {t('props.moveEarlier')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={modInst.locked || slotIdx < 0 || slotIdx >= sameSlot.length - 1}
                  onClick={() => { void reorderInRow(modInst.id, 1); closeMenu(); }}
                >
                  {t('props.moveLater')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={modInst.locked}
                  onClick={() => { rotate(modInst.id); closeMenu(); }}
                >
                  {t('canvas.rotate')} (90°)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { duplicate(modInst.id); closeMenu(); }}
                >
                  {t('props.duplicate')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === modInst.id ? { ...m, locked: !m.locked } : m)) }));
                    closeMenu();
                  }}
                >
                  {modInst.locked ? t('canvas.unlock') : t('canvas.lock')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={modInst.locked}
                  onClick={() => { void relocateToBest(modInst.id); closeMenu(); }}
                >
                  {t('place.moveToBest')}
                </button>
                <div className="ctx-menu-sep" />
                <button
                  type="button"
                  role="menuitem"
                  className="danger"
                  disabled={modInst.locked}
                  onClick={() => { remove([modInst.id]); closeMenu(); }}
                >
                  {t('props.delete')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  disabled={project.rows.length >= LIMITS.maxRows}
                  onClick={() => { addRowAction(); closeMenu(); }}
                >
                  {t('props.rowAdd')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={project.modules.length === 0}
                  onClick={() => { swapSides(); closeMenu(); }}
                >
                  {t('props.swapSides')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={project.modules.length === 0}
                  onClick={() => { autoOptimize(); closeMenu(); }}
                >
                  {t('place.autoOptimize')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={project.modules.length === 0}
                  onClick={() => { selectAll(); closeMenu(); }}
                >
                  {t('shortcuts.selectAll')}
                </button>
                <div className="ctx-menu-sep" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { toggleFolded(); closeMenu(); }}
                >
                  {t('canvas.viewFolded')}
                </button>
              </>
            )}
          </div>
        );
      })() : null}

      {/* Kontextleiste über ausgewähltem Modul */}
      {selectedMod && selectedInst && !drag && !resize && !session.folded ? (
        <ContextBar
          mod={selectedMod}
          otherMods={c.modules.filter((m) => m.instanceId !== selectedMod.instanceId)}
          side={selectedInst.side}
          locked={selectedInst.locked}
          hasRepair={selectedRepair !== null}
          zoom={session.zoom}
          panX={session.panX}
          panY={session.panY}
          canvasW={size.w}
          onRotate={() => rotate(selectedMod.instanceId)}
          onDuplicate={() => duplicate(selectedMod.instanceId)}
          onSwitchSide={() => moveToSide(selectedMod.instanceId, selectedInst.side === 'left' ? 'right' : 'left')}
          onToggleLock={() =>
            setPar((p) => ({
              ...p,
              modules: p.modules.map((m) => (m.id === selectedMod.instanceId ? { ...m, locked: !m.locked } : m)),
            }))
          }
          onRepairMove={() => void relocateToBest(selectedMod.instanceId)}
          onDelete={() => remove([selectedMod.instanceId])}
        />
      ) : null}

      {/* Canvas-Leiste unten: nur Werkzeuge anzeigen, die im aktuellen Modus sinnvoll wirken */}
      <div className="canvas-tools">
        {!session.folded ? (
          <>
            <div className="mode-toggle" role="group" aria-label={t('mode.label')}>
              <button
                type="button"
                aria-pressed={session.mode === 'simple'}
                onClick={() => setMode('simple')}
                title={t('mode.simple.hint')}
              >
                {t('mode.simple')}
              </button>
              <button
                type="button"
                aria-pressed={session.mode === 'expert'}
                onClick={() => setMode('expert')}
                title={t('mode.expert.hint')}
              >
                {t('mode.expert')}
              </button>
            </div>
            <span className="sep" />
          </>
        ) : null}
        <Button
          size="sm"
          icon="book"
          active={session.folded}
          onClick={toggleFolded}
          title={t('canvas.viewFoldedHint')}
        >
          {session.folded ? t('canvas.viewOpen') : t('canvas.viewFolded')}
        </Button>
        {!session.folded ? (
          <>
            <Button
              size="sm"
              icon="plus"
              disabled={project.rows.length >= LIMITS.maxRows}
              onClick={addRowAction}
              title={t('props.rowAdd')}
            >
              {t('canvas.row')}
            </Button>
            <span className="sep" />
            <Button
              size="sm"
              icon="shield"
              active={session.strictPlacement}
              onClick={toggleStrictPlacement}
              title={t(session.strictPlacement ? 'place.strictOn' : 'place.strictOff')}
            >
              {t('place.strictLabel')}
            </Button>
          </>
        ) : null}
        <Button
          size="sm"
          icon="sparkle"
          onClick={autoOptimize}
          title={t('place.autoOptimizeHint')}
          disabled={project.modules.length === 0}
        >
          {t('place.autoOptimize')}
        </Button>
        {!session.folded ? (
          <>
            <span className="sep" />
            <Button icon="zoomOut" size="sm" onClick={() => setZoom(session.zoom / 1.2, { user: true })} title={t('canvas.zoomOut')} />
            <span className="zoom-readout">{Math.round(session.zoom * 100)} %</span>
            <Button icon="zoomIn" size="sm" onClick={() => setZoom(session.zoom * 1.2, { user: true })} title={t('canvas.zoomIn')} />
            <Button icon="fit" size="sm" onClick={() => fit(true)} title={t('canvas.zoomFit')} />
            {expert ? (
              <>
                <span className="sep" />
                <Button icon="grid" size="sm" active={session.grid} onClick={toggleGrid} title={t('canvas.grid')} />
                <Button icon="magnet" size="sm" active={session.snap} onClick={toggleSnap} title={t('canvas.snap')} />
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Schwebende Kontextleiste am ausgewählten Modul. */
function ContextBar({
  mod,
  otherMods,
  side,
  locked,
  hasRepair,
  zoom,
  panX,
  panY,
  canvasW,
  onRotate,
  onDuplicate,
  onSwitchSide,
  onToggleLock,
  onRepairMove,
  onDelete,
}: {
  readonly mod: { readonly instanceId: string; readonly rect: Rect };
  readonly otherMods: readonly { readonly rect: Rect }[];
  readonly side: Side;
  readonly locked: boolean;
  readonly hasRepair: boolean;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly canvasW: number;
  readonly onRotate: () => void;
  readonly onDuplicate: () => void;
  readonly onSwitchSide: () => void;
  readonly onToggleLock: () => void;
  readonly onRepairMove: () => void;
  readonly onDelete: () => void;
}): JSX.Element {
  const toScreen = (r: Rect): PixelRect => ({
    x: panX + r.x * zoom,
    y: panY + r.y * zoom,
    w: r.w * zoom,
    h: r.h * zoom,
  });
  const pos = chooseContextBarPlacement(toScreen(mod.rect), otherMods.map((o) => toScreen(o.rect)), canvasW);
  return (
    <div
      className="ctx-bar"
      style={{ left: pos.left, top: pos.top }}
      role="toolbar"
      aria-label={t('props.module')}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button size="sm" icon="rotate" onClick={onRotate} disabled={locked} title={t('canvas.rotate')} ariaLabel={t('canvas.rotate')} />
      <Button size="sm" icon="copy" onClick={onDuplicate} title={t('props.duplicate')} ariaLabel={t('props.duplicate')} />
      <Button
        size="sm"
        icon={side === 'left' ? 'arrowRight' : 'arrowLeft'}
        onClick={onSwitchSide}
        disabled={locked}
        title={side === 'left' ? t('side.moveToRight') : t('side.moveToLeft')}
        ariaLabel={side === 'left' ? t('side.moveToRight') : t('side.moveToLeft')}
      />
      <Button
        size="sm"
        icon={locked ? 'unlock' : 'lock'}
        active={locked}
        onClick={onToggleLock}
        title={locked ? t('canvas.unlock') : t('canvas.lock')}
        ariaLabel={locked ? t('canvas.unlock') : t('canvas.lock')}
      />
      {hasRepair ? (
        <Button
          size="sm"
          icon="sparkle"
          onClick={onRepairMove}
          title={t('place.moveToBest')}
          ariaLabel={t('place.moveToBest')}
        />
      ) : null}
      <Button size="sm" variant="danger" icon="trash" onClick={onDelete} disabled={locked} title={t('props.delete')} ariaLabel={t('props.delete')} />
    </div>
  );
}

/** Modul-Primitive rendern (Geometrie aus modules.ts). */
function Prims({ prims }: { readonly prims: readonly Prim[] }): JSX.Element {
  return (
    <>
      {prims.map((p, i) => {
        switch (p.t) {
          case 'line': {
            const cls =
              p.style === 'seam'
                ? 'seam-line'
                : p.style === 'divide'
                  ? 'divide-line'
                  : p.style === 'zip'
                    ? 'zip-line'
                    : p.style === 'fold'
                      ? 'fold-line'
                      : p.style === 'mark'
                        ? 'mark-line'
                        : 'guide-line';
            return <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} className={cls} vectorEffect="non-scaling-stroke" />;
          }
          case 'rect': {
            const cls =
              p.style === 'pocket'
                ? 'pocket-fill'
                : p.style === 'padding'
                  ? 'padding-fill'
                  : p.style === 'shadow'
                    ? 'shadow-fill'
                    : 'hatch-fill';
            return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} className={cls} />;
          }
          case 'circle': {
            const cls = p.style === 'ring' ? 'ring-fill' : p.style === 'button' ? 'button-fill' : p.style === 'snap' ? 'snap-fill' : 'hole-fill';
            return <circle key={i} cx={p.cx} cy={p.cy} r={p.r} className={cls} vectorEffect="non-scaling-stroke" />;
          }
          case 'text':
            return (
              <text key={i} x={p.x} y={p.y} textAnchor={p.anchor ?? 'start'} className="prim-text">
                {p.text}
              </text>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

function Dimension({
  x1,
  y1,
  x2,
  y2,
  label,
  zoom,
  vertical,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  zoom: number;
  vertical?: boolean;
}): JSX.Element {
  const tick = 4 / zoom;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="dim-line" vectorEffect="non-scaling-stroke" />
      {vertical ? (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} className="dim-line" vectorEffect="non-scaling-stroke" />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} className="dim-line" vectorEffect="non-scaling-stroke" />
          <text
            x={mx - 8 / zoom}
            y={my}
            textAnchor="middle"
            className="dim-text"
            style={{ fontSize: 10 / zoom }}
            transform={`rotate(-90 ${mx - 8 / zoom} ${my})`}
          >
            {label}
          </text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} className="dim-line" vectorEffect="non-scaling-stroke" />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} className="dim-line" vectorEffect="non-scaling-stroke" />
          <text x={mx} y={my - 5 / zoom} textAnchor="middle" className="dim-text" style={{ fontSize: 10 / zoom }}>
            {label}
          </text>
        </>
      )}
    </g>
  );
}
