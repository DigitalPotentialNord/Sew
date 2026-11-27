/**
 * Visuelle Modulbibliothek — Kategorien + echte Geometrie-Vorschauen.
 *
 * Keine abstrakten Icons als einzige Orientierung: jede Karte zeigt das Modul
 * so, wie es auf der Stofffläche erscheint (die Vorschau IST die `draw()`-Geometrie).
 * Klicken fügt hinzu (primärer Weg); Drag & Drop ist die zusätzliche Möglichkeit.
 */
import { useMemo, useState, type DragEvent } from 'react';
import { MODULES, moduleDef, moduleOrDefaults } from '../core/modules';
import { mm } from '../core/geometry';
import type { LayoutContext, ModuleCategory, ModuleTypeId, Prim } from '../core/types';
import { useStore } from '../state/store';
import { t } from '../i18n/de';
import { Icon } from './icons';

const CATEGORIES: ModuleCategory[] = ['taschen', 'faecher', 'nadeln', 'elastik', 'verschluss', 'schmuck', 'werkzeug', 'struktur'];

const PREVIEW_CTX: LayoutContext = {
  channelFreeMm: mm(400),
  panelWidthMm: mm(280),
  panelHeightMm: mm(300),
  rowHeightMm: mm(280),
  seamAllowanceMm: mm(10),
  fabricWidthMm: mm(1400),
  spineWidthMm: mm(32),
};

/** Laufender Bibliothek-Drag (Browser verbergen dataTransfer während dragover). */
let activeDragModule: ModuleTypeId | null = null;
export const getDraggedLibraryModule = (): ModuleTypeId | null => activeDragModule;
export const clearDraggedLibraryModule = (): void => {
  activeDragModule = null;
};

export function Library(): JSX.Element {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ModuleCategory | 'all'>('all');
  const addModule = useStore((s) => s.addModule);
  const rows = useStore((s) => s.project.rows);
  const setLibOpen = useStore((s) => s.setLibOpen);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    return MODULES.filter((m) => {
      if (cat !== 'all' && m.category !== cat) return false;
      if (!query) return true;
      const name = t(m.nameKey).toLowerCase();
      const desc = t(m.descriptionKey).toLowerCase();
      return name.includes(query) || desc.includes(query) || m.tags.some((tag) => tag.includes(query)) || m.id.toLowerCase() === query;
    });
  }, [q, cat]);

  const onDragStart = (e: DragEvent<HTMLDivElement>, id: ModuleTypeId): void => {
    activeDragModule = id;
    e.dataTransfer.setData('application/x-module', id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onDragEnd = (): void => {
    activeDragModule = null;
  };

  const add = (id: ModuleTypeId): void => {
    addModule(id);
    if (window.matchMedia('(max-width: 1000px)').matches) setLibOpen(false);
  };

  return (
    <>
      <div className="search-wrap">
        <div className="search">
          <Icon name="search" size={13} />
          <input type="search" placeholder={t('lib.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('lib.search')} />
          {q ? (
            <button className="btn icon sm" onClick={() => setQ('')} aria-label="Suche löschen">
              <Icon name="close" size={13} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="lib-cats" role="tablist" aria-label={t('lib.catLabel')}>
        <button className="lib-cat" role="tab" aria-selected={cat === 'all'} onClick={() => setCat('all')}>{t('lib.all')}</button>
        {CATEGORIES.map((c) => (
          <button key={c} className="lib-cat" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}>{t(`lib.cat.${c}`)}</button>
        ))}
      </div>
      <div className="pane-body">
        <div className="lib-list">
          {items.map((m) => {
            const def = moduleDef(m.id);
            const params = moduleOrDefaults(m.id);
            return (
              <div
                key={m.id}
                className="lib-item"
                draggable
                onDragStart={(e) => onDragStart(e, m.id)}
                onDragEnd={onDragEnd}
                onClick={() => add(m.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    add(m.id);
                  }
                }}
                role="button"
                tabIndex={0}
                title={`${t(def.nameKey)} — ${t('lib.dragAlt')}`}
                data-module-id={m.id}
              >
                <span className="lib-card-preview" aria-hidden="true">
                  <ModulePreview typeId={m.id} />
                </span>
                <span className="lib-text">
                  <span className="lib-name">{t(m.nameKey)}</span>
                  <span className="lib-sub">{m.summary(params)}</span>
                  <span className="lib-card-add">
                    <Icon name="plus" size={11} />
                    {t('lib.clickToAdd')}
                  </span>
                </span>
              </div>
            );
          })}
          {items.length === 0 ? (
            <div className="empty-state">
              <Icon name="search" size={22} strokeWidth={1.2} />
              <p>{t('lib.empty')}</p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="pane-foot">
        <p className="hint" style={{ margin: 0 }}>
          {MODULES.length} Module · {rows.length} {rows.length === 1 ? 'Zeile' : 'Zeilen'}
        </p>
      </div>
    </>
  );
}

/** Vorschau aus echter Geometrie: `draw()` mit Defaults, in einem SVG viewBox=0..w,0..h. */
function ModulePreview({ typeId }: { typeId: ModuleTypeId }): JSX.Element {
  const def = moduleDef(typeId);
  const params = moduleOrDefaults(typeId);
  const w = Math.max(1, def.width(params, PREVIEW_CTX));
  const h = Math.max(1, def.height(params, PREVIEW_CTX));
  // Vorschau-Box: 64×46 px, Modulgeometrie eingepasst (Aspect erhalten).
  const boxW = 64;
  const boxH = 46;
  const s = Math.min((boxW - 8) / w, (boxH - 8) / h);
  const dw = w * s;
  const dh = h * s;
  const ox = (boxW - dw) / 2;
  const oy = (boxH - dh) / 2;
  const prims = def.draw(params, w, h);
  return (
    <svg width={boxW} height={boxH} viewBox={`0 0 ${boxW} ${boxH}`}>
      <rect x={ox} y={oy} width={dw} height={dh} rx={1.5} className="mod-shape" />
      <g transform={`translate(${ox},${oy}) scale(${s})`}>
        {prims.map((p, i) => renderPrim(p, i))}
      </g>
    </svg>
  );
}

function renderPrim(p: Prim, i: number): JSX.Element | null {
  switch (p.t) {
    case 'line':
      return (
        <line
          key={i}
          x1={p.x1}
          y1={p.y1}
          x2={p.x2}
          y2={p.y2}
          className={p.style === 'seam' ? 'seam-line' : p.style === 'divide' ? 'divide-line' : p.style === 'zip' ? 'zip-line' : p.style === 'fold' ? 'fold-line' : p.style === 'mark' ? 'mark-line' : 'guide-line'}
          vectorEffect="non-scaling-stroke"
        />
      );
    case 'rect': {
      const cls = p.style === 'pocket' ? 'pocket-fill' : p.style === 'padding' ? 'padding-fill' : p.style === 'shadow' ? 'shadow-fill' : 'hatch-fill';
      return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} className={cls} />;
    }
    case 'circle': {
      const cls = p.style === 'ring' ? 'ring-fill' : p.style === 'button' ? 'button-fill' : p.style === 'snap' ? 'snap-fill' : 'hole-fill';
      return <circle key={i} cx={p.cx} cy={p.cy} r={p.r} className={cls} />;
    }
    case 'text':
      return null; // Vorschau ohne Maßtext — die Karte nennt das Maß eh im Untertitel.
    default:
      return null;
  }
}
