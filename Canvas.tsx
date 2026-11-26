/**
 * Interaktive Zeichenfläche.
 * Alle Koordinaten sind Millimeter (Weltkoordinaten); Pixel entstehen NUR hier
 * über `scale` (px pro mm). Kein mm-Wert wird aus Pixeln gespeichert.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type DragEvent } from 'react';
import { bbox, clamp, mm, type Rect } from '../core/geometry';
import { moduleDef } from '../core/modules';
import { PRACTICE } from '../core/practice';
import type { ModuleTypeId, Prim } from '../core/types';
import { useStore } from '../state/store';
import { t } from '../i18n/de';
import { Icon } from './icons';
import { Button } from './parts/primitives';

const PAD = 34; // mm Rand um das Etui im Canvas
const MIN_SCALE = 0.6;
const MAX_SCALE = 14;

/** Welche Parameter steuern Breite/Höhe eines Moduls? (null = nicht per Griff) */
const RESIZE: Record<ModuleTypeId, { w: string | null; h: string | null }> = {
  M01: { w: 'breite', h: 'hoehe' },
  M02: { w: 'breite', h: 'hoehe' },
  M03: { w: 'breite', h: 'hoehe' },
  M04: { w: 'breite', h: null },
  M05: { w: null, h: null },
  M06: { w: null, h: null }, // abgeleitet: Nadel bestimmt die Größe
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
  startW?: number;
  startH?: number;
  startIndex?: number;
  pushed?: boolean;
  targetRow?: string;
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
  const setPar = useStore((s) => s.setPar);
  const select = useStore((s) => s.select);
  const toggleSelect = useStore((s) => s.toggleSelect);
  const setHovered = useStore((s) => s.setHovered);
  const setZoom = useStore((s) => s.setZoom);
  const setPan = useStore((s) => s.setPan);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const toggleSnap = useStore((s) => s.toggleSnap);
  const setGuides = useStore((s) => s.setGuides);
  const duplicate = useStore((s) => s.duplicate);
  const remove = useStore((s) => s.remove);
  const rotate = useStore((s) => s.rotate);

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [insert, setInsert] = useState<{ rowId: string; x: number } | null>(null);
  const [dropRow, setDropRow] = useState<string | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  const scale = session.zoom;
  const worldW = c.flap.w + 2 * PAD;
  const worldH = c.flap.h + 2 * PAD;

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

  // Beim ersten Anzeigen einpassen — danach nur noch, wenn der Nutzer den Zoom
  // nicht selbst gesetzt hat. Sein Zoom gewinnt immer (kein Springen beim Tippen).
  const autoFit = !session.zoomTouched;
  useEffect(() => {
    if (!autoFit) return;
    // Startzoom höchstens 220 %: groß genug zum Arbeiten, klein genug, dass die
    // Modulbeschriftungen nicht größer werden als die Module selbst.
    const id = requestAnimationFrame(() => fit(2.2));
    return () => cancelAnimationFrame(id);
  }, [autoFit, fit]);

  useEffect(() => {
    if (!autoFit) return;
    const onResize = (): void => fit(2.2);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [autoFit, fit]);

  // Leertaste = Pan
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
      const el = wrapRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left - session.panX;
      const py = clientY - rect.top - session.panY;
      return { x: px / scale - PAD, y: py / scale - PAD };
    },
    [scale, session.panX, session.panY],
  );

  // ── Auswahl-Hilfen ────────────────────────────────────────────────────────
  const selected = session.selection;
  const selSet = useMemo(() => new Set(selected), [selected]);

  const selectedBBox = useMemo(() => {
    const rects = c.modules.filter((m) => selSet.has(m.instanceId)).map((m) => m.rect);
    return rects.length > 0 ? bbox(rects) : null;
  }, [c.modules, selSet]);

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
    const row = rowAt(y) ?? project.rows[0]!.id;
    const index = indexAt(row, x);
    const id = addModule(typeId, row);
    if (index !== null) moveModule(id, row, index);
    setDropRow(null);
  };

  function rowAt(y: number): string | null {
    for (const r of c.rows) {
      if (y >= r.rect.y - 8 && y <= r.rect.y + r.rect.h + 8) return r.id;
    }
    // unterhalb aller Zeilen: letzte Zeile
    if (c.rows.length > 0 && y > c.rows[c.rows.length - 1]!.rect.y + c.rows[c.rows.length - 1]!.rect.h) {
      return c.rows[c.rows.length - 1]!.id;
    }
    return c.rows[0]?.id ?? null;
  }

  function indexAt(rowId: string, x: number): number | null {
    const inRow = c.modules.filter((m) => m.rowId === rowId);
    for (let i = 0; i < inRow.length; i++) {
      const r = inRow[i]!.rect;
      if (x < r.x + r.w / 2) return i;
    }
    return inRow.length;
  }

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
      startIndex: c.modules.filter((m) => m.rowId === mod.rowId).findIndex((m) => m.instanceId === id),
    };
  };

  const onResizePointerDown = (e: RPointerEvent<SVGRectElement>, id: string, axis: 'w' | 'h'): void => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const placed = c.modules.find((m) => m.instanceId === id);
    const inst = project.modules.find((m) => m.id === id);
    if (!placed || !inst) return;
    const w = toWorld(e.clientX, e.clientY);
    dragRef.current = {
      kind: axis === 'w' ? 'resize-w' : 'resize-h',
      startX: w.x,
      startY: w.y,
      clientX: e.clientX,
      clientY: e.clientY,
      moduleId: id,
      startW: placed.rect.w,
      startH: placed.rect.h,
      pushed: false,
    };
  };

  const onCanvasPointerDown = (e: RPointerEvent<HTMLDivElement>): void => {
    if (e.button === 1 || spaceDown) {
      dragRef.current = { kind: 'pan', startX: 0, startY: 0, clientX: e.clientX, clientY: e.clientY, panStartX: session.panX, panStartY: session.panY };
      return;
    }
    if (e.button !== 0) return;
    const w = toWorld(e.clientX, e.clientY);
    if (!e.shiftKey) select([]);
    dragRef.current = { kind: 'marquee', startX: w.x, startY: w.y, clientX: e.clientX, clientY: e.clientY };
    setMarquee({ x: mm(w.x), y: mm(w.y), w: mm(0), h: mm(0) });
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>): void => {
    const d = dragRef.current;
    if (!d) return;
    const w = toWorld(e.clientX, e.clientY);

    if (d.kind === 'pan') {
      setPan((d.panStartX ?? 0) + (e.clientX - d.clientX), (d.panStartY ?? 0) + (e.clientY - d.clientY));
      return;
    }

    if (d.kind === 'marquee') {
      const x0 = Math.min(d.startX, w.x);
      const y0 = Math.min(d.startY, w.y);
      const rect: Rect = { x: mm(x0), y: mm(y0), w: mm(Math.abs(w.x - d.startX)), h: mm(Math.abs(w.y - d.startY)) };
      setMarquee(rect);
      const hits = c.modules
        .filter((m) => m.rect.x < rect.x + rect.w && rect.x < m.rect.x + m.rect.w && m.rect.y < rect.y + rect.h && rect.y < m.rect.y + m.rect.h)
        .map((m) => m.instanceId);
      select(hits);
      return;
    }

    if (d.kind === 'move' && d.moduleId) {
      const dx = w.x - d.startX;
      const dy = w.y - d.startY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) d.moved = true;
      setDragPreview({ id: d.moduleId, dx, dy });
      const targetRow = rowAt(w.y) ?? d.rowId!;
      setDropRow(targetRow);
      const idx = indexAt(targetRow, w.x);
      const inRow = c.modules.filter((m) => m.rowId === targetRow && m.instanceId !== d.moduleId);
      let gx = PRACTICE.edgeMarginMm;
      if (idx !== null) {
        for (let i = 0; i < idx; i++) gx += inRow[i]?.rect.w ?? 0;
      }
      setInsert({ rowId: targetRow, x: gx });
      d.targetRow = targetRow;
      d.targetIndex = idx ?? 0;
      if (session.snap) {
        const edges: number[] = [PRACTICE.edgeMarginMm];
        let cur = PRACTICE.edgeMarginMm;
        for (const m of c.modules.filter((m) => m.rowId === targetRow)) {
          edges.push(cur, mm(cur + m.rect.w));
          cur += m.rect.w;
        }
        edges.push(mm(PRACTICE.edgeMarginMm + (project.base.widthMm - 2 * PRACTICE.edgeMarginMm)));
        const nearX = edges.find((v) => Math.abs(v - gx) < 2);
        const nearY = [c.flap.y, c.flap.y + c.flap.h].find((v) => Math.abs(v - w.y) < 2);
        const g: { axis: 'x' | 'y'; at: number }[] = [];
        if (nearX !== undefined) g.push({ axis: 'x', at: nearX });
        if (nearY !== undefined) g.push({ axis: 'y', at: nearY });
        setGuides(g);
      }
      return;
    }

    if ((d.kind === 'resize-w' || d.kind === 'resize-h') && d.moduleId) {
      const inst = project.modules.find((m) => m.id === d.moduleId);
      if (!inst) return;
      const map = RESIZE[inst.typeId];
      const key = d.kind === 'resize-w' ? map.w : map.h;
      if (!key) return;
      const field = moduleDef(inst.typeId).fields.find((f) => f.key === key);
      const min = field?.min ?? 5;
      const max = field?.max ?? 400;
      const cur = typeof inst.params[key] === 'number' ? (inst.params[key] as number) : 0;

      if (d.kind === 'resize-h' && inst.typeId === 'M07') {
        // Lasche: die Höhe der Darstellung ist halbe Länge
        const delta = (w.y - d.startY) * 2;
        const next = clamp(Math.round((cur + delta) / 5) * 5, min, max);
        if (next !== cur) setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === inst.id ? { ...m, params: { ...m.params, [key]: next } } : m)) }), { undoable: !d.pushed });
        d.pushed = true;
        return;
      }
      const delta = d.kind === 'resize-w' ? w.x - d.startX : w.y - d.startY;
      const raw = cur + delta;
      const step = field?.step ?? 1;
      const next = clamp(Math.round(raw / step) * step, min, max);
      if (next !== cur) {
        setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === inst.id ? { ...m, params: { ...m.params, [key]: next } } : m)) }), {
          undoable: !d.pushed,
        });
        d.pushed = true;
      }
      return;
    }
  };

  const endDrag = (): void => {
    const d = dragRef.current;
    dragRef.current = null;
    setMarquee(null);
    setDragPreview(null);
    setInsert(null);
    setDropRow(null);
    setGuides([]);
    if (!d) return;
    if (d.kind === 'move' && d.moduleId && d.moved && d.targetRow !== undefined && d.targetIndex !== undefined) {
      moveModule(d.moduleId, d.targetRow, d.targetIndex);
    }
  };

  // ── Zoom per Rad ──────────────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(clamp(scale * factor, MIN_SCALE, MAX_SCALE), { user: true });
    }
  };

  const gridStep = session.gridMm;

  return (
    <>
      <div className="canvas-toolbar">
        <div className="floating">
          <Button icon="zoomOut" onClick={() => setZoom(scale / 1.2, { user: true })} title={t('canvas.zoomOut')} />
          <span className="zoom-label">{Math.round(scale * 100)} %</span>
          <Button icon="zoomIn" onClick={() => setZoom(scale * 1.2, { user: true })} title={t('canvas.zoomIn')} />
          <Button icon="fit" onClick={() => { useStore.getState().setZoom(useStore.getState().session.zoom, { user: false }); fit(); }} title={t('canvas.zoomFit')} />
        </div>
        <div className="floating" style={{ marginLeft: 4 }}>
          <Button icon="grid" active={session.grid} onClick={toggleGrid} title={t('canvas.grid')} />
          <Button icon="magnet" active={session.snap} onClick={toggleSnap} title={t('canvas.snap')} />
        </div>
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
            <Button
              icon="copy"
              onClick={() => {
                const first = selected[0];
                if (first) duplicate(first);
              }}
              title={t('canvas.duplicate')}
            />
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
        onDragLeave={() => setDropRow(null)}
        onDrop={onDrop}
        role="application"
        aria-label="Zeichenfläche"
      >
        <div
          className="canvas-stage"
          style={{
            transform: `translate(${session.panX}px, ${session.panY}px)`,
            // Oben mittig: die Maßketten (y = −18 mm) bleiben sichtbar, statt unter
            // der Werkzeugleiste zu verschwinden.
            margin: `${Math.round(26 * scale)}px 0 0 ${Math.round(Math.max(0, ((wrapRef.current?.clientWidth ?? 0) - worldW * scale) / 2))}px`,
          }}
        >
          <svg
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
              <clipPath id="flap-clip">
                <rect x={0} y={0} width={c.flap.w} height={c.flap.h} rx={project.base.cornerRadiusMm} />
              </clipPath>
            </defs>

            {/* Etui-Fläche */}
            <g>
              <rect
                x={0}
                y={0}
                width={c.flap.w}
                height={c.flap.h}
                rx={project.base.cornerRadiusMm}
                className="row-bg"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(20,20,15,.10)) drop-shadow(0 6px 16px rgba(20,20,15,.06))' }}
              />
              {session.grid ? (
                <rect x={0} y={0} width={c.flap.w} height={c.flap.h} rx={project.base.cornerRadiusMm} fill="url(#grid-major)" clipPath="url(#flap-clip)" opacity={0.7} />
              ) : null}
              <rect x={0} y={0} width={c.flap.w} height={c.flap.h} rx={project.base.cornerRadiusMm} className="flap-outline" />
              {/* Nahtzugabe-Innenlinie */}
              <rect
                x={project.settings.seamAllowanceMm}
                y={project.settings.seamAllowanceMm}
                width={Math.max(0, c.flap.w - 2 * project.settings.seamAllowanceMm)}
                height={Math.max(0, c.flap.h - 2 * project.settings.seamAllowanceMm)}
                rx={Math.max(0, project.base.cornerRadiusMm - project.settings.seamAllowanceMm / 2)}
                className="flap-seam"
              />
              {/* Bund */}
              {project.base.spineWidthMm > 0 ? (
                <g>
                  <rect
                    x={project.base.widthMm}
                    y={0}
                    width={project.base.spineWidthMm}
                    height={c.flap.h}
                    className="spine"
                    clipPath="url(#flap-clip)"
                  />
                  <text x={project.base.widthMm + project.base.spineWidthMm / 2} y={-6} className="measure measure-strong" textAnchor="middle">
                    Bund {project.base.spineWidthMm}
                  </text>
                </g>
              ) : null}
            </g>

            {/* Zeilen */}
            {c.rows.map((row) => {
              const isDrop = dropRow === row.id;
              return (
                <g key={row.id}>
                  <rect
                    x={row.rect.x}
                    y={row.rect.y}
                    width={row.rect.w}
                    height={row.rect.h}
                    className={`row-bg${isDrop ? ' drop' : ''}`}
                    opacity={0.55}
                    rx={6}
                    onClick={(e) => {
                      e.stopPropagation();
                      select([]);
                    }}
                  />
                  <text
                    className="row-label"
                    transform={`translate(${-4.5},${row.rect.y + row.rect.h / 2}) rotate(-90)`}
                    textAnchor="middle"
                  >
                    {row.name}
                  </text>
                  {isDrop && insert ? (
                    <g>
                      <rect x={insert.x - 1.2} y={row.rect.y} width={2.4} height={row.rect.h} fill="var(--accent)" rx={1.2} />
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
              // Drehung als echte Transformation um den Modulmittelpunkt:
              // Verschieben bleibt Verschieben, die Fläche dreht sich mit Inhalt.
              // `m.rect` ist der belegte (gedrehte) Kasten; gezeichnet wird in den
              // ungedrehten Maßen, zentriert im Kasten, und dann gedreht.
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
                    <rect
                      x={boxX}
                      y={boxY}
                      width={drawW}
                      height={drawH}
                      rx={3}
                      className="mod-shape"
                      opacity={preview ? 0.35 : 1}
                    />
                    <g clipPath={`url(#clip-${m.instanceId})`} opacity={preview ? 0.35 : 1}>
                      <Prims prims={m.prims} rect={drawRect} summary={m.summary} />
                    </g>
                    <clipPath id={`clip-${m.instanceId}`}>
                      <rect x={boxX} y={boxY} width={drawW} height={drawH} rx={3} />
                    </clipPath>
                  </g>
                  {/* Beschriftung liegt außerhalb der Drehung: sie bleibt lesbar,
                      auch wenn das Modul um 180° oder 270° gedreht ist. */}
                  {m.summary.length * 2.1 + 4 <= m.rect.w ? (
                    <text x={m.rect.x + 2} y={m.rect.y + 4} className="mod-label">
                      {m.summary}
                    </text>
                  ) : null}
                  {m.locked ? (
                    <g transform={`translate(${m.rect.x + m.rect.w - 9},${m.rect.y + 3})`} opacity={0.55}>
                      <path d="M0,3.5 v-1.2 a1.6,1.6 0 013.2,0 v1.2" stroke="var(--ink)" strokeWidth={0.7} fill="none" />
                      <rect x={-0.8} y={3.4} width={4.8} height={3.6} rx={0.6} fill="var(--ink)" />
                    </g>
                  ) : null}

                  {/* Griffe */}
                  {isSel && !m.locked ? (
                    <>
                      <rect x={m.rect.x} y={m.rect.y} width={m.rect.w} height={m.rect.h} rx={3} className="sel-box" pointerEvents="none" />
                      {canW ? (
                        <rect
                          x={m.rect.x + m.rect.w - 5}
                          y={m.rect.y + m.rect.h / 2 - 7}
                          width={4}
                          height={14}
                          rx={1.5}
                          className="scale-handle"
                          onPointerDown={(e) => onResizePointerDown(e, m.instanceId, 'w')}
                          aria-label="Breite ändern"
                        />
                      ) : null}
                      {canH ? (
                        <rect
                          x={m.rect.x + m.rect.w / 2 - 7}
                          y={m.rect.y + m.rect.h - 5}
                          width={14}
                          height={4}
                          rx={1.5}
                          className="scale-handle"
                          onPointerDown={(e) => onResizePointerDown(e, m.instanceId, 'h')}
                          aria-label="Höhe ändern"
                        />
                      ) : null}
                    </>
                  ) : null}
                </g>
              );
            })}

            {/* Marquee */}
            {marquee && marquee.w > 2 ? (
              <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="rgba(28,79,58,.08)" stroke="var(--accent)" strokeWidth={0.8} strokeDasharray="3 2" />
            ) : null}

            {/* Hilfslinien */}
            {session.guides.map((g, i) =>
              g.axis === 'x' ? (
                <line key={`g${i}`} x1={g.at} y1={-PAD / 2} x2={g.at} y2={c.flap.h + PAD / 2} className="guide" />
              ) : (
                <line key={`g${i}`} x1={-PAD / 2} y1={g.at} x2={c.flap.w + PAD / 2} y2={g.at} className="guide" />
              ),
            )}

            {/* Bemaßung */}
            <g>
              <line x1={0} y1={-14} x2={c.flap.w} y2={-14} className="dim-line" />
              <line x1={0} y1={-17} x2={0} y2={-11} className="dim-tick" />
              <line x1={c.flap.w} y1={-17} x2={c.flap.w} y2={-11} className="dim-tick" />
              <text x={c.flap.w / 2} y={-18} textAnchor="middle" className="measure measure-strong">
                {c.flap.w} mm
              </text>
              <line x1={-14} y1={0} x2={-14} y2={c.flap.h} className="dim-line" />
              <line x1={-17} y1={0} x2={-11} y2={0} className="dim-tick" />
              <line x1={-17} y1={c.flap.h} x2={-11} y2={c.flap.h} className="dim-tick" />
              <text x={-18} y={c.flap.h / 2} textAnchor="middle" className="measure measure-strong" transform={`rotate(-90 ${-18} ${c.flap.h / 2})`}>
                {c.flap.h} mm
              </text>
            </g>

            {/* Auswahlmaß */}
            {selectedBBox && selected.length >= 1 ? (
              <g opacity={0.9}>
                <line x1={selectedBBox.x} y1={selectedBBox.y - 4} x2={selectedBBox.x + selectedBBox.w} y2={selectedBBox.y - 4} className="dim-line" stroke="var(--accent)" />
                <text x={selectedBBox.x + selectedBBox.w / 2} y={selectedBBox.y - 6} textAnchor="middle" className="measure" fill="var(--accent)">
                  {selectedBBox.w} mm
                </text>
              </g>
            ) : null}
          </svg>
        </div>

        {c.modules.length === 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <div className="empty-state" style={{ background: 'rgba(255,255,255,.86)', borderRadius: 10, border: '1px dashed var(--line-strong)', pointerEvents: 'none' }}>
              <Icon name="layers" size={26} strokeWidth={1.2} />
              <p style={{ color: 'var(--ink-2)', fontWeight: 500, maxWidth: 240 }}>{t('canvas.empty')}</p>
              <p style={{ maxWidth: 240 }}>{t('canvas.emptyHint')}</p>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Prims({ prims, rect, summary }: { prims: readonly Prim[]; rect: Rect; summary: string }): JSX.Element {
  // Messtext der Module. Die Prims enthalten oft nur nackte Zahlen („90“) — die
  // erklären nichts. Stattdessen EIN Label mit Einheit, und nur dann, wenn es in
  // die Fläche passt: ein 18 mm breiter Nadelkanal bekommt keine Schrift, die
  // breiter ist als er selbst. Bei Platzmangel trägt das aria-label weiter.
  const hasUnitText = prims.some((p) => p.t === 'text' && /\d+\s*(mm|×)/.test(p.text));
  const labelFits = summary.length * 2.1 + 4 <= rect.w;
  return (
    <>
      {!hasUnitText && labelFits ? (
        <text
          x={rect.x + 2}
          y={rect.y + rect.h - 2.5}
          style={{ fontSize: 4, fill: 'var(--ink-3)', fontWeight: 500 }}
        >
          {summary}
        </text>
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
            // Zahlen im Modul ohne Einheit werden vom Klartext-Label ersetzt — sonst
            // stehen zwei Beschriftungen übereinander.
            if (!hasUnitText) return null;
            return (
              <text key={i} x={rect.x + p.x} y={rect.y + p.y} textAnchor={p.anchor ?? 'start'} style={{ fontSize: 3.6, fill: 'var(--ink-3)' }}>
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
