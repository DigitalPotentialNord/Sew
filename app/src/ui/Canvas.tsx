/**
 * Design-Ansicht — das aufgeschlagene Mäppchen als textile Fläche.
 *
 * Die Arbeitsfläche zeigt das GEÖFFNETE Etui: linke Innenfläche · Falz · rechte
 * Innenfläche. Module liegen auf der Stofffläche, nicht in CAD-Zeilen.
 *
 * Alle Koordinaten sind Millimeter (Weltkoordinaten des Buchs); Pixel entstehen
 * NUR hier über `scale` (px pro mm). Positionen sind echt: `side × row × Index`
 * (siehe docs/architecture/positioning-model-decision.md) — keine Fake-x/y.
 *
 * „Einfacher Modus": Raster, Maßketten und Nahtzugaben sind ausgeblendet; sie
 * erscheinen nur im „erweiterten Modus" oder bei aktiver Auswahl.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type DragEvent } from 'react';
import { bbox, clamp, mm, type Rect } from '../core/geometry';
import { moduleDef } from '../core/modules';
import { PRACTICE } from '../core/practice';
import type { Side } from '../core/construction';
import type { ModuleTypeId, Prim } from '../core/types';
import { useStore } from '../state/store';
import { t } from '../i18n/de';
import { Icon } from './icons';
import { Button } from './parts/primitives';

const PAD = 30; // mm Rand um das Buch im Canvas
const MIN_SCALE = 0.6;
const MAX_SCALE = 12;

/** Welche Parameter steuern Breite/Höhe eines Moduls? (null = nicht per Griff) */
const RESIZE: Record<ModuleTypeId, { w: string | null; h: string | null }> = {
  M01: { w: 'breite', h: 'hoehe' },
  M02: { w: 'breite', h: 'hoehe' },
  M03: { w: 'breite', h: 'hoehe' },
  M04: { w: 'breite', h: null },
  M05: { w: null, h: null },
  M06: { w: null, h: null },
  M07: { w: 'bandbreite', h: 'laenge' },
  M08: { w: 'laschenBreite', h: 'laschenLaenge' },
  M09: { w: 'breite', h: 'hoehe' },
  M10: { w: 'breite', h: 'hoehe' },
  M11: { w: 'breite', h: 'hoehe' },
  M12: { w: 'breite', h: 'hoehe' },
  M13: { w: 'breite', h: 'hoehe' },
  M14: { w: 'breite', h: 'hoehe' },
  M15: { w: 'breite', h: 'hoehe' },
  M16: { w: 'breite', h: 'laenge' },
};

interface DragState {
  kind: 'move' | 'resize-w' | 'resize-h' | 'marquee' | 'pan';
  startX: number;
  startY: number; // Welt-mm
  clientX: number;
  clientY: number;
  moduleId?: string;
  rowId?: string;
  side?: Side;
  paramKey?: string;
  startParam?: number;
  swapped?: boolean;
  startW?: number;
  startH?: number;
  targetRow?: string;
  targetSide?: Side;
  targetIndex?: number;
  moved?: boolean;
  panStartX?: number;
  panStartY?: number;
}

export function Canvas(): JSX.Element {
  const project = useStore((s) => s.project);
  const c = useStore((s) => s.construction);
  const session = useStore((s) => s.session);
  const addModule = useStore((s) => s.addModule);
  const moveModule = useStore((s) => s.moveModule);
  const moveToSide = useStore((s) => s.moveToSide);
  const setPar = useStore((s) => s.setPar);
  const select = useStore((s) => s.select);
  const toggleSelect = useStore((s) => s.toggleSelect);
  const setHovered = useStore((s) => s.setHovered);
  const setZoom = useStore((s) => s.setZoom);
  const setPan = useStore((s) => s.setPan);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const toggleSnap = useStore((s) => s.toggleSnap);
  const setGuides = useStore((s) => s.setGuides);
  const setMode = useStore((s) => s.setMode);
  const duplicate = useStore((s) => s.duplicate);
  const remove = useStore((s) => s.remove);
  const rotate = useStore((s) => s.rotate);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [insert, setInsert] = useState<{ rowId: string; side: Side; x: number } | null>(null);
  const [dropRow, setDropRow] = useState<string | null>(null);
  const [dropSide, setDropSide] = useState<Side | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  const scale = session.zoom;
  const expert = session.mode === 'expert';
  const width = project.base.widthMm;
  const spine = project.base.spineWidthMm;
  const rightOrigin = width + spine; // x-Ursprung der rechten Innenfläche
  const worldW = c.book.w + 2 * PAD;
  const worldH = c.book.h + 2 * PAD;

  // ── Einpassen ─────────────────────────────────────────────────────────────
  const fit = useCallback(
    (maxScale = MAX_SCALE) => {
      const el = wrapRef.current;
      if (!el) return;
      const availW = el.clientWidth - 24;
      const availH = el.clientHeight - 24;
      const s = Math.min(availW / worldW, availH / worldH, maxScale);
      setZoom(clamp(Math.floor(s * 100) / 100, MIN_SCALE, MAX_SCALE));
      setPan(0, 0);
    },
    [setPan, setZoom, worldH, worldW],
  );

  const autoFit = !session.zoomTouched;
  useEffect(() => {
    if (!autoFit) return;
    const id = requestAnimationFrame(() => fit(2.4));
    return () => cancelAnimationFrame(id);
  }, [autoFit, fit]);

  useEffect(() => {
    if (!autoFit) return;
    const onResize = (): void => fit(2.4);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [autoFit, fit]);

  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setSpaceDown(true);
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
  }, []);

  // ── Koordinaten ───────────────────────────────────────────────────────────
  const toWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current;
      if (svg) {
        const r = svg.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return {
            x: ((clientX - r.left) / r.width) * worldW - PAD,
            y: ((clientY - r.top) / r.height) * worldH - PAD,
          };
        }
      }
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left - session.panX;
      const py = clientY - rect.top - session.panY;
      return { x: px / scale - PAD, y: py / scale - PAD };
    },
    [scale, session.panX, session.panY, worldH, worldW],
  );

  const selected = session.selection;
  const selSet = useMemo(() => new Set(selected), [selected]);

  /** Welcher Innenfläche gehört eine x-Koordinate? Im Falz: die nähere Seite. */
  const sideAt = useCallback(
    (x: number): Side => {
      if (spine <= 0) return x < width / 2 ? 'left' : 'right';
      return x < width + spine / 2 ? 'left' : 'right';
    },
    [width, spine],
  );

  function rowAt(y: number): string | null {
    for (const r of c.rows) {
      if (y >= r.rect.y - 8 && y <= r.rect.y + r.rect.h + 8) return r.id;
    }
    if (c.rows.length > 0 && y > c.rows[c.rows.length - 1]!.rect.y + c.rows[c.rows.length - 1]!.rect.h) {
      return c.rows[c.rows.length - 1]!.id;
    }
    return c.rows[0]?.id ?? null;
  }

  /** Einfügeindex unter (row, side, x) — Index über ALLE Zeilenmitglieder, damit
   *  moveInstance die within-side Reihenfolge korrekt herstellt. */
  function indexAt(rowId: string, x: number, side: Side, excludeId?: string): number {
    const inRow = c.modules.filter((m) => m.rowId === rowId && m.instanceId !== excludeId);
    const sameSide = inRow.filter((m) => (project.modules.find((pm) => pm.id === m.instanceId)?.side ?? 'left') === side);
    for (const m of sameSide) {
      if (x < m.rect.x + m.rect.w / 2) {
        return inRow.findIndex((m2) => m2.instanceId === m.instanceId);
      }
    }
    return inRow.length;
  }

  // ── Drag & Drop aus der Bibliothek ────────────────────────────────────────
  const onDragOver = (e: DragEvent<HTMLDivElement>): void => {
    if (e.dataTransfer.types.includes('application/x-module') || e.dataTransfer.types.includes('text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-module') || e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const typeId = raw as ModuleTypeId;
    const { x, y } = toWorld(e.clientX, e.clientY);
    const side = sideAt(x);
    const row = rowAt(y) ?? project.rows[0]!.id;
    const index = indexAt(row, x, side);
    const id = addModule(typeId, row, side);
    if (index !== null) moveModule(id, row, index);
    setDropRow(null);
    setDropSide(null);
  };

  // ── Modul-Drag (Pointer) ──────────────────────────────────────────────────
  const onModulePointerDown = (e: RPointerEvent<SVGGElement>, id: string): void => {
    if (e.button !== 0) return;
    const mod = project.modules.find((m) => m.id === id);
    if (!mod) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);

    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      toggleSelect(id);
      return;
    }
    if (!selSet.has(id)) select([id]);

    if (mod.locked) return;
    const w = toWorld(e.clientX, e.clientY);
    dragRef.current = {
      kind: 'move',
      startX: w.x,
      startY: w.y,
      clientX: e.clientX,
      clientY: e.clientY,
      moduleId: id,
      rowId: mod.rowId,
      side: mod.side,
    };
  };

  const onResizePointerDown = (e: RPointerEvent<SVGRectElement>, id: string, axis: 'w' | 'h'): void => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const placed = c.modules.find((m) => m.instanceId === id);
    const inst = project.modules.find((m) => m.id === id);
    if (!placed || !inst) return;
    const swapped = inst.rotation % 180 === 90;
    const map = RESIZE[inst.typeId];
    // Bei 90°/270°-Drehung sind die Achsen vertauscht: ein horizontaler Griff
    // ändert den Höhen-Parameter, ein vertikaler den Breiten-Parameter.
    const key = (axis === 'w') !== swapped ? map.w : map.h;
    if (!key) return;
    const startParam = typeof inst.params[key] === 'number' ? (inst.params[key] as number) : 0;
    const w = toWorld(e.clientX, e.clientY);
    dragRef.current = {
      kind: axis === 'w' ? 'resize-w' : 'resize-h',
      startX: w.x,
      startY: w.y,
      clientX: e.clientX,
      clientY: e.clientY,
      moduleId: id,
      paramKey: key,
      startParam,
      swapped,
      startW: placed.rect.w,
      startH: placed.rect.h,
    };
  };

  const onCanvasPointerDown = (e: RPointerEvent<HTMLDivElement>): void => {
    if (e.button === 1 || spaceDown) {
      dragRef.current = { kind: 'pan', startX: 0, startY: 0, clientX: e.clientX, clientY: e.clientY, panStartX: session.panX, panStartY: session.panY };
      return;
    }
    if (e.button !== 0) return;
    if (!e.shiftKey) select([]);
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>): void => {
    const d = dragRef.current;
    if (!d) return;
    const w = toWorld(e.clientX, e.clientY);

    if (d.kind === 'pan') {
      setPan((d.panStartX ?? 0) + (e.clientX - d.clientX), (d.panStartY ?? 0) + (e.clientY - d.clientY));
      return;
    }

    if (d.kind === 'move' && d.moduleId) {
      const dx = w.x - d.startX;
      const dy = w.y - d.startY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) d.moved = true;
      setDragPreview({ id: d.moduleId, dx, dy });
      const targetSide = sideAt(w.x);
      const targetRow = rowAt(w.y) ?? d.rowId!;
      setDropRow(targetRow);
      setDropSide(targetSide);
      const idx = indexAt(targetRow, w.x, targetSide, d.moduleId);
      // Einfügemarkierung auf der Zielseite: x = Start der Seite + belegte Breite bis Index.
      const sideModules = c.modules.filter(
        (m) => m.rowId === targetRow && m.instanceId !== d.moduleId && (project.modules.find((pm) => pm.id === m.instanceId)?.side ?? 'left') === targetSide,
      );
      let gx = (targetSide === 'right' ? rightOrigin : 0) + PRACTICE.edgeMarginMm;
      const sameSideOrdered = sideModules; // bereits in Array-Reihenfolge = visueller Reihenfolge
      for (let i = 0; i < Math.min(idx, sameSideOrdered.length); i++) gx += sameSideOrdered[i]?.rect.w ?? 0;
      setInsert({ rowId: targetRow, side: targetSide, x: gx });
      d.targetRow = targetRow;
      d.targetSide = targetSide;
      d.targetIndex = idx;

      if (session.snap) {
        // Magnetische Hilfen: Falzmitte, Zeilenanfänge beider Seiten, Modulkanten.
        const edges: number[] = [width, width + spine / 2, rightOrigin];
        for (const s of ['left', 'right'] as const) {
          const base = s === 'right' ? rightOrigin : 0;
          edges.push(base + PRACTICE.edgeMarginMm, base + (width - PRACTICE.edgeMarginMm));
        }
        const nearX = edges.find((v) => Math.abs(v - w.x) < 3);
        const nearY = c.rows.map((r) => r.rect.y).find((v) => Math.abs(v - w.y) < 2);
        const g: { axis: 'x' | 'y'; at: number }[] = [];
        if (nearX !== undefined) g.push({ axis: 'x', at: nearX });
        if (nearY !== undefined) g.push({ axis: 'y', at: nearY });
        setGuides(g);
      }
      return;
    }

    if ((d.kind === 'resize-w' || d.kind === 'resize-h') && d.moduleId && d.paramKey && d.startParam !== undefined) {
      const inst = project.modules.find((m) => m.id === d.moduleId);
      if (!inst) return;
      const key = d.paramKey;
      const field = moduleDef(inst.typeId).fields.find((f) => f.key === key);
      const min = field?.min ?? 5;
      const max = field?.max ?? 400;
      const cur = d.startParam;

      if (inst.typeId === 'M07' && key === 'laenge') {
        const delta = (w.y - d.startY) * 2;
        const next = clamp(Math.round((cur + delta) / 5) * 5, min, max);
        if (next !== cur) setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === inst.id ? { ...m, params: { ...m.params, [key]: next } } : m)) }));
        return;
      }
      // Bei gedrehten Modulen (swapped) ist ein horizontaler Griff ein Höhen-
      // delta und umgekehrt — die Achse folgt dem gespeicherten paramKey.
      const delta = (d.kind === 'resize-w') !== (d.swapped ?? false) ? w.x - d.startX : w.y - d.startY;
      const raw = cur + delta;
      const step = field?.step ?? 1;
      const next = clamp(Math.round(raw / step) * step, min, max);
      if (next !== cur) {
        setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === inst.id ? { ...m, params: { ...m.params, [key]: next } } : m)) }));
      }
      return;
    }
  };

  const endDrag = (): void => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragPreview(null);
    setInsert(null);
    setDropRow(null);
    setDropSide(null);
    setGuides([]);
    if (!d) return;
    if (d.kind === 'move' && d.moduleId && d.moved && d.targetRow !== undefined && d.targetIndex !== undefined) {
      // Seitenwechsel zuerst (echte Modelländerung), dann Reihenfolge.
      if (d.targetSide !== undefined && d.targetSide !== d.side) {
        moveToSide(d.moduleId, d.targetSide);
      }
      moveModule(d.moduleId, d.targetRow, d.targetIndex);
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(clamp(scale * factor, MIN_SCALE, MAX_SCALE), { user: true });
    }
  };

  const gridStep = session.gridMm;
  const availW = width - 2 * PRACTICE.edgeMarginMm;
  const radius = project.base.cornerRadiusMm;
  const showGrid = expert && session.grid;
  const showDims = expert;
  const showSeam = expert;
  const selectedBBox = useMemo(() => {
    const rects = c.modules.filter((m) => selSet.has(m.instanceId)).map((m) => m.rect);
    return rects.length > 0 ? bbox(rects) : null;
  }, [c.modules, selSet]);

  // Kontext-Aktionen für die Auswahl: schwebende Leiste nahe der Auswahl.
  const ctxAnchor = selectedBBox;

  return (
    <>
      <div className="design-chrome">
        <span className="design-title-pill">
          <span className="dot" />
          {t('design.openBook')}
        </span>
        <div className="mode-toggle" role="group" aria-label={t('mode.label')}>
          <button aria-pressed={!expert} onClick={() => setMode('simple')} title={t('mode.simple.hint')}>{t('mode.simple')}</button>
          <button aria-pressed={expert} onClick={() => setMode('expert')} title={t('mode.expert.hint')}>{t('mode.expert')}</button>
        </div>
      </div>

      <div className="canvas-toolbar">
        <div className="floating">
          <Button icon="zoomOut" onClick={() => setZoom(scale / 1.2, { user: true })} title={t('canvas.zoomOut')} />
          <span className="zoom-label">{Math.round(scale * 100)} %</span>
          <Button icon="zoomIn" onClick={() => setZoom(scale * 1.2, { user: true })} title={t('canvas.zoomIn')} />
          <Button icon="fit" onClick={() => { useStore.getState().setZoom(useStore.getState().session.zoom, { user: false }); fit(); }} title={t('canvas.zoomFit')} />
        </div>
        {expert ? (
          <div className="floating" style={{ marginLeft: 4 }}>
            <Button icon="grid" active={session.grid} onClick={toggleGrid} title={t('canvas.grid')} />
            <Button icon="magnet" active={session.snap} onClick={toggleSnap} title={t('canvas.snap')} />
          </div>
        ) : (
          <div className="floating" style={{ marginLeft: 4 }}>
            <Button icon="magnet" active={session.snap} onClick={toggleSnap} title={t('canvas.snap')} />
          </div>
        )}
        <div style={{ flex: 1 }} />
        {selected.length === 1 ? (
          <div className="floating">
            <Button icon="rotate" onClick={() => rotate(selected[0]!)} title={t('canvas.rotate')} />
            <Button icon="copy" onClick={() => duplicate(selected[0]!)} title={t('canvas.duplicate')} />
            <Button icon="trash" onClick={() => remove(selected)} title={t('canvas.delete')} />
          </div>
        ) : null}
        {selected.length > 1 ? (
          <div className="floating">
            <span style={{ fontSize: 11, color: 'var(--ink-2)', padding: '0 6px' }}>
              {selected.length} {t('canvas.multi')}
            </span>
            <Button icon="copy" onClick={() => { const first = selected[0]; if (first) duplicate(first); }} title={t('canvas.duplicate')} />
            <Button icon="trash" onClick={() => remove(selected)} title={t('canvas.delete')} />
          </div>
        ) : null}
      </div>

      <div
        ref={wrapRef}
        className="canvas-scroll"
        style={{ cursor: spaceDown ? 'grab' : dragRef.current?.kind === 'pan' ? 'grabbing' : 'default' }}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onDragOver={onDragOver}
        onDragLeave={() => { setDropRow(null); setDropSide(null); }}
        onDrop={onDrop}
        role="application"
        aria-label="Designfläche"
      >
        <div
          className="canvas-stage"
          style={{
            transform: `translate(${session.panX}px, ${session.panY}px)`,
            margin: `${Math.round(28 * scale)}px 0 0 ${Math.round(Math.max(0, ((wrapRef.current?.clientWidth ?? 0) - worldW * scale) / 2))}px`,
          }}
        >
          <svg
            ref={svgRef}
            className="canvas-svg"
            width={worldW * scale}
            height={worldH * scale}
            viewBox={`${-PAD} ${-PAD} ${worldW} ${worldH}`}
            style={{ background: 'transparent' }}
          >
            <defs>
              <pattern id="grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
                <path d={`M${gridStep},0 H0 V${gridStep}`} fill="none" stroke="var(--line)" strokeWidth={0.4} />
              </pattern>
              <pattern id="grid-major" width={gridStep * 5} height={gridStep * 5} patternUnits="userSpaceOnUse">
                <rect width={gridStep * 5} height={gridStep * 5} fill="url(#grid)" />
                <path d={`M${gridStep * 5},0 H0 V${gridStep * 5}`} fill="none" stroke="var(--line-strong)" strokeWidth={0.6} />
              </pattern>
              {/* Textile Flächenstruktur: feines Leinengewebe */}
              <pattern id="linen" width={4} height={4} patternUnits="userSpaceOnUse">
                <rect width={4} height={4} fill="var(--canvas-panel)" />
                <path d="M0,2 H4" stroke="rgba(120,110,90,0.06)" strokeWidth={0.5} />
                <path d="M2,0 V4" stroke="rgba(120,110,90,0.04)" strokeWidth={0.5} />
              </pattern>
              <pattern id="linen-right" width={4} height={4} patternUnits="userSpaceOnUse">
                <rect width={4} height={4} fill="var(--canvas-panel)" />
                <path d="M0,2 H4" stroke="rgba(120,110,90,0.05)" strokeWidth={0.5} />
                <path d="M2,0 V4" stroke="rgba(120,110,90,0.05)" strokeWidth={0.5} />
              </pattern>
              <clipPath id="left-clip"><rect x={0} y={0} width={width} height={c.book.h} rx={radius} /></clipPath>
              <clipPath id="right-clip"><rect x={rightOrigin} y={0} width={width} height={c.book.h} rx={radius} /></clipPath>
              <clipPath id="book-clip"><rect x={0} y={0} width={c.book.w} height={c.book.h} rx={radius} /></clipPath>
            </defs>

            {/* Aufgeschlagenes Mäppchen: linker Flap · Falz · rechter Flap */}
            <g className="book-shadow">
              {/* Linke Innenfläche */}
              <rect x={0} y={0} width={width} height={c.book.h} rx={radius} fill="url(#linen)" />
              {/* Rechte Innenfläche */}
              <rect x={rightOrigin} y={0} width={width} height={c.book.h} rx={radius} fill="url(#linen-right)" />
              {/* Falz/Bund: schmaler Streifen zwischen den Flaps */}
              {spine > 0 ? <rect x={width} y={0} width={spine} height={c.book.h} className="atelier-fold" /> : null}
              {spine > 0 ? <line x1={width + spine / 2} y1={0} x2={width + spine / 2} y2={c.book.h} className="atelier-fold-line" /> : null}

              {/* Dezente Außenkanten — nur eine ruhige Kontur, keine Maßkette */}
              <rect x={0} y={0} width={width} height={c.book.h} rx={radius} className="atelier-edge" />
              <rect x={rightOrigin} y={0} width={width} height={c.book.h} rx={radius} className="atelier-edge" />

              {showSeam ? (
                <>
                  <rect x={project.settings.seamAllowanceMm} y={project.settings.seamAllowanceMm} width={Math.max(0, width - 2 * project.settings.seamAllowanceMm)} height={Math.max(0, c.book.h - 2 * project.settings.seamAllowanceMm)} rx={Math.max(0, radius - project.settings.seamAllowanceMm / 2)} className="flap-seam" />
                  <rect x={rightOrigin + project.settings.seamAllowanceMm} y={project.settings.seamAllowanceMm} width={Math.max(0, width - 2 * project.settings.seamAllowanceMm)} height={Math.max(0, c.book.h - 2 * project.settings.seamAllowanceMm)} rx={Math.max(0, radius - project.settings.seamAllowanceMm / 2)} className="flap-seam" />
                </>
              ) : null}

              {showGrid ? (
                <>
                  <rect x={0} y={0} width={width} height={c.book.h} rx={radius} fill="url(#grid-major)" clipPath="url(#left-clip)" opacity={0.6} />
                  <rect x={rightOrigin} y={0} width={width} height={c.book.h} rx={radius} fill="url(#grid-major)" clipPath="url(#right-clip)" opacity={0.6} />
                </>
              ) : null}

              {/* Außenkontur des gesamten Buchs (Schnittkante) — expert only */}
              {showDims ? <rect x={0} y={0} width={c.book.w} height={c.book.h} rx={radius} className="flap-outline" /> : null}
            </g>

            {/* Zeilenzonen — dezente Bänder auf beiden Seiten, keine dominante Box */}
            {c.rows.map((row) => {
              const isDrop = dropRow === row.id;
              return (
                <g key={row.id}>
                  <rect x={PRACTICE.edgeMarginMm} y={row.rect.y} width={availW} height={row.rect.h} className={`row-bg${isDrop && dropSide === 'left' ? ' drop' : ''}`} opacity={0.35} rx={4} />
                  <rect x={rightOrigin + PRACTICE.edgeMarginMm} y={row.rect.y} width={availW} height={row.rect.h} className={`row-bg${isDrop && dropSide === 'right' ? ' drop' : ''}`} opacity={0.35} rx={4} />
                  {expert ? (
                    <>
                      <text className="zone-label" transform={`translate(${-3.5},${row.rect.y + row.rect.h / 2}) rotate(-90)`} textAnchor="middle">{row.name}</text>
                      <text className="zone-label" transform={`translate(${c.book.w + 3.5},${row.rect.y + row.rect.h / 2}) rotate(90)`} textAnchor="middle">{row.name}</text>
                    </>
                  ) : null}
                  {isDrop && insert ? (
                    <g>
                      <rect x={insert.x - 1.2} y={row.rect.y} width={2.4} height={row.rect.h} fill="var(--accent)" rx={1.2} opacity={insert.side === dropSide ? 0.95 : 0.3} />
                    </g>
                  ) : null}
                </g>
              );
            })}

            {/* Module */}
            {c.modules.map((m) => {
              const isSel = selSet.has(m.instanceId);
              const isHover = session.hovered === m.instanceId;
              const preview = dragPreview?.id === m.instanceId ? dragPreview : null;
              const dx = preview ? preview.dx : 0;
              const dy = preview ? preview.dy : 0;
              const resizable = RESIZE[m.typeId];
              const canW = resizable.w !== null;
              const canH = resizable.h !== null;
              const rot = m.rotation % 360;
              const swapped = rot % 180 === 90;
              const drawW = swapped ? m.rect.h : m.rect.w;
              const drawH = swapped ? m.rect.w : m.rect.h;
              const boxX = m.rect.x + (m.rect.w - drawW) / 2;
              const boxY = m.rect.y + (m.rect.h - drawH) / 2;
              const drawRect: Rect = { x: mm(boxX), y: mm(boxY), w: mm(drawW), h: mm(drawH) };
              const cxMid = m.rect.x + m.rect.w / 2;
              const cyMid = m.rect.y + m.rect.h / 2;
              const innerTransform = rot === 0 ? undefined : `rotate(${rot} ${cxMid} ${cyMid})`;
              return (
                <g
                  key={m.instanceId}
                  className={`mod${isSel ? ' sel' : ''}${isHover ? ' hover' : ''}${m.locked ? ' locked' : ''}`}
                  transform={`translate(${dx},${dy})`}
                  onPointerDown={(e) => onModulePointerDown(e, m.instanceId)}
                  onPointerEnter={() => setHovered(m.instanceId)}
                  onPointerLeave={() => setHovered(null)}
                  onDoubleClick={() => {
                    const def = moduleDef(m.typeId);
                    if (!def.fields.some((f) => !f.derived && f.kind === 'length')) return;
                    select([m.instanceId]);
                  }}
                  style={{ cursor: m.locked ? 'not-allowed' : 'move' }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t(moduleDef(m.typeId).nameKey)} ${m.summary}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      select([m.instanceId]);
                    }
                  }}
                >
                  <g transform={innerTransform}>
                    <rect x={boxX} y={boxY} width={drawW} height={drawH} rx={3} className="mod-shape" opacity={preview ? 0.4 : 1} />
                    <g clipPath={`url(#clip-${m.instanceId})`} opacity={preview ? 0.4 : 1}>
                      <Prims prims={m.prims} rect={drawRect} summary={m.summary} />
                    </g>
                    <clipPath id={`clip-${m.instanceId}`}><rect x={boxX} y={boxY} width={drawW} height={drawH} rx={3} /></clipPath>
                  </g>
                  {m.summary.length * 2.1 + 4 <= m.rect.w ? (
                    <text x={m.rect.x + 2} y={m.rect.y + 4} className="mod-label">{m.summary}</text>
                  ) : null}
                  {m.locked ? (
                    <g transform={`translate(${m.rect.x + m.rect.w - 9},${m.rect.y + 3})`} opacity={0.55}>
                      <path d="M0,3.5 v-1.2 a1.6,1.6 0 013.2,0 v1.2" stroke="var(--ink)" strokeWidth={0.7} fill="none" />
                      <rect x={-0.8} y={3.4} width={4.8} height={3.6} rx={0.6} fill="var(--ink)" />
                    </g>
                  ) : null}
                  {isSel && !m.locked ? (
                    <>
                      <rect x={m.rect.x} y={m.rect.y} width={m.rect.w} height={m.rect.h} rx={3} className="sel-box" pointerEvents="none" />
                      {canW ? (
                        <rect x={m.rect.x + m.rect.w - 5} y={m.rect.y + m.rect.h / 2 - 7} width={4} height={14} rx={1.5} className="scale-handle" onPointerDown={(e) => onResizePointerDown(e, m.instanceId, 'w')} aria-label="Breite ändern" />
                      ) : null}
                      {canH ? (
                        <rect x={m.rect.x + m.rect.w / 2 - 7} y={m.rect.y + m.rect.h - 5} width={14} height={4} rx={1.5} className="scale-handle" onPointerDown={(e) => onResizePointerDown(e, m.instanceId, 'h')} aria-label="Höhe ändern" />
                      ) : null}
                    </>
                  ) : null}
                </g>
              );
            })}

            {/* Hilfslinien (magnetisch) */}
            {session.guides.map((g, i) =>
              g.axis === 'x' ? (
                <line key={`g${i}`} x1={g.at} y1={-PAD / 2} x2={g.at} y2={c.book.h + PAD / 2} className="guide" />
              ) : (
                <line key={`g${i}`} x1={-PAD / 2} y1={g.at} x2={c.book.w + PAD / 2} y2={g.at} className="guide" />
              ),
            )}

            {/* Bemaßung — nur im Expertenmodus */}
            {showDims ? (
              <g className="dim-group">
                <line x1={0} y1={-14} x2={c.book.w} y2={-14} className="dim-line" />
                <line x1={0} y1={-17} x2={0} y2={-11} className="dim-tick" />
                <line x1={c.book.w} y1={-17} x2={c.book.w} y2={-11} className="dim-tick" />
                <text x={c.book.w / 2} y={-18} textAnchor="middle" className="measure measure-strong">{c.book.w} mm</text>
                <line x1={-14} y1={0} x2={-14} y2={c.book.h} className="dim-line" />
                <line x1={-17} y1={0} x2={-11} y2={0} className="dim-tick" />
                <line x1={-17} y1={c.book.h} x2={-11} y2={c.book.h} className="dim-tick" />
                <text x={-18} y={c.book.h / 2} textAnchor="middle" className="measure measure-strong" transform={`rotate(-90 ${-18} ${c.book.h / 2})`}>{c.book.h} mm</text>
              </g>
            ) : null}

            {/* Auswahlmaß — nur bei Auswahl */}
            {selectedBBox && selected.length >= 1 ? (
              <g opacity={0.9}>
                <line x1={selectedBBox.x} y1={selectedBBox.y - 4} x2={selectedBBox.x + selectedBBox.w} y2={selectedBBox.y - 4} className="dim-line" stroke="var(--accent)" />
                <text x={selectedBBox.x + selectedBBox.w / 2} y={selectedBBox.y - 6} textAnchor="middle" className="measure" fill="var(--accent)">{selectedBBox.w} mm</text>
              </g>
            ) : null}
          </svg>
        </div>

        {c.modules.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div className="empty-state" style={{ background: 'rgba(251,246,237,.9)', borderRadius: 12, border: '1px dashed var(--line-strong)', pointerEvents: 'none', padding: 'var(--s6)' }}>
              <Icon name="pocket" size={28} strokeWidth={1.1} />
              <p style={{ color: 'var(--ink)', fontWeight: 600, maxWidth: 260 }}>{t('design.addFirst')}</p>
              <p style={{ maxWidth: 280 }}>{t('design.addFirstHint')}</p>
            </div>
          </div>
        ) : null}

        {/* Kontext-Aktionsleiste nahe der Auswahl (Desktop) — nur Einzelwahl */}
        {ctxAnchor && selected.length === 1 ? (
          <ContextBar
            anchor={ctxAnchor}
            scale={scale}
            panX={session.panX}
            panY={session.panY}
            wrapWidth={wrapRef.current?.clientWidth ?? 800}
            side={project.modules.find((m) => m.id === selected[0])?.side ?? 'left'}
            onMoveSide={(s) => moveToSide(selected[0]!, s)}
            onDuplicate={() => duplicate(selected[0]!)}
            onDelete={() => remove(selected)}
            onRotate={() => rotate(selected[0]!)}
          />
        ) : null}
      </div>
    </>
  );
}

/** Schwebende Aktionsleiste über der Auswahl: duplizieren, Seite, drehen, löschen. */
function ContextBar({
  anchor,
  scale,
  panX,
  panY,
  wrapWidth,
  side,
  onMoveSide,
  onDuplicate,
  onDelete,
  onRotate,
}: {
  anchor: Rect;
  scale: number;
  panX: number;
  panY: number;
  wrapWidth: number;
  side: Side;
  onMoveSide: (s: Side) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRotate: () => void;
}): JSX.Element {
  const left = anchor.x * scale + (anchor.w * scale) / 2 + panX;
  const top = anchor.y * scale + panY - 8;
  const clampedLeft = Math.max(8, Math.min(wrapWidth - 280, left - 140));
  return (
    <div className="ctx-bar" style={{ left: clampedLeft, top: top < 8 ? anchor.y * scale + anchor.h * scale + panY + 8 : top }} aria-label={t('canvas.select')} onPointerDown={(e) => e.stopPropagation()}>
      <span className="ctx-label">{side === 'left' ? t('side.left') : t('side.right')}</span>
      <span className="ctx-divider" />
      <Button size="sm" icon="rotate" onClick={onRotate} title={t('canvas.rotate')} ariaLabel={t('canvas.rotate')} />
      <Button size="sm" icon="copy" onClick={onDuplicate} title={t('canvas.duplicate')} ariaLabel={t('canvas.duplicate')} />
      <Button size="sm" icon={side === 'left' ? 'arrowRight' : 'arrowRight'} onClick={() => onMoveSide(side === 'left' ? 'right' : 'left')} title={side === 'left' ? t('side.moveToRight') : t('side.moveToLeft')} ariaLabel={side === 'left' ? t('side.moveToRight') : t('side.moveToLeft')} />
      <span className="ctx-divider" />
      <Button size="sm" icon="trash" variant="danger" onClick={onDelete} title={t('canvas.delete')} ariaLabel={t('canvas.delete')} />
    </div>
  );
}

function Prims({ prims, rect, summary }: { prims: readonly Prim[]; rect: Rect; summary: string }): JSX.Element {
  const hasUnitText = prims.some((p) => p.t === 'text' && /\d+\s*(mm|×)/.test(p.text));
  const labelFits = summary.length * 2.1 + 4 <= rect.w;
  return (
    <>
      {!hasUnitText && labelFits ? (
        <text x={rect.x + 2} y={rect.y + rect.h - 2.5} style={{ fontSize: 4, fill: 'var(--ink-3)', fontWeight: 500 }}>{summary}</text>
      ) : null}
      {prims.map((p, i) => {
        switch (p.t) {
          case 'line':
            return (
              <line
                key={i}
                x1={rect.x + p.x1}
                y1={rect.y + p.y1}
                x2={rect.x + p.x2}
                y2={rect.y + p.y2}
                className={
                  p.style === 'seam' ? 'seam-line'
                    : p.style === 'divide' ? 'divide-line'
                      : p.style === 'zip' ? 'zip-line'
                        : p.style === 'fold' ? 'fold-line'
                          : p.style === 'mark' ? 'mark-line'
                            : 'guide-line'
                }
              />
            );
          case 'rect': {
            const cls = p.style === 'pocket' ? 'pocket-fill' : p.style === 'padding' ? 'padding-fill' : p.style === 'shadow' ? 'shadow-fill' : 'hatch-fill';
            return <rect key={i} x={rect.x + p.x} y={rect.y + p.y} width={p.w} height={p.h} className={cls} />;
          }
          case 'circle': {
            const cls = p.style === 'ring' ? 'ring-fill' : p.style === 'button' ? 'button-fill' : p.style === 'snap' ? 'snap-fill' : 'hole-fill';
            return <circle key={i} cx={rect.x + p.cx} cy={rect.y + p.cy} r={p.r} className={cls} />;
          }
          case 'text':
            if (!hasUnitText) return null;
            return (
              <text key={i} x={rect.x + p.x} y={rect.y + p.y} textAnchor={p.anchor ?? 'start'} style={{ fontSize: 3.6, fill: 'var(--ink-3)' }}>{p.text}</text>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
