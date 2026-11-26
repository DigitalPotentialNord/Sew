import { useMemo, useState, type DragEvent } from 'react';
import { MODULES, moduleDef, moduleOrDefaults } from '../core/modules';
import type { ModuleCategory, ModuleTypeId } from '../core/types';
import { useStore } from '../state/store';
import { t } from '../i18n/de';
import { Icon, ModuleIcon } from './icons';
import { Button } from './parts/primitives';

const CATEGORIES: ModuleCategory[] = ['taschen', 'faecher', 'nadeln', 'elastik', 'verschluss', 'schmuck', 'werkzeug', 'struktur'];

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
    e.dataTransfer.setData('application/x-module', id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'copy';
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
          <input
            type="search"
            placeholder={t('lib.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('lib.search')}
          />
          {q ? <Button icon="close" size="sm" onClick={() => setQ('')} title="Suche löschen" /> : null}
        </div>
      </div>
      <div className="cats">
        <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
          {t('lib.all')}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {t(`lib.cat.${c}`)}
          </button>
        ))}
      </div>
      <div className="pane-body">
        <div className="lib-list">
          {items.map((m) => {
            const params = moduleOrDefaults(m.id);
            const def = moduleDef(m.id);
            return (
              <div
                key={m.id}
                className="lib-item"
                draggable
                onDragStart={(e) => onDragStart(e, m.id)}
                onClick={() => add(m.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    add(m.id);
                  }
                }}
                role="button"
                tabIndex={0}
                title={`${t(def.nameKey)} — ${t('lib.drag')}`}
                data-module-id={m.id}
              >
                <span className="lib-icon">
                  <ModuleIcon icon={m.icon} size={15} />
                </span>
                <span className="lib-text">
                  <span className="lib-name">{t(m.nameKey)}</span>
                  <span className="lib-sub">{m.summary(params)}</span>
                </span>
                <span className="lib-add" aria-hidden="true">
                  <Icon name="plus" size={13} />
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
