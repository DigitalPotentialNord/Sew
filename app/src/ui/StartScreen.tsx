/**
 * Starter-Erfahrung: „Was möchtest du gestalten?" → „Wie starten?".
 * Keine leere technische Fläche beim Einstieg. Siehe docs/ux/editor-redesign.md §10.
 *
 * Die Wahl baut ein echtes Projekt (Vorlage / leer / eigene Größe) — kein Mockup.
 */
import { useState } from 'react';
import { LIMITS } from '../core/practice';
import { useStore } from '../state/store';
import { t } from '../i18n/de';
import type { TemplateId } from '../core/project';
import { Icon, ModuleIcon } from './icons';
import { Button } from './parts/primitives';

type OrgType = 'schmuck' | 'makeup' | 'strick' | 'feder' | 'eigen';
type How = 'template' | 'blank' | 'custom';

interface TypeDef {
  readonly id: OrgType;
  readonly labelKey: string;
  readonly descKey: string;
  readonly icon: string;
  readonly template?: TemplateId;
  readonly base?: { w: number; h: number };
}

const TYPES: readonly TypeDef[] = [
  { id: 'schmuck', labelKey: 'start.type.schmuck', descKey: 'start.type.schmuck.desc', icon: 'ring', template: 'schmuck', base: { w: 240, h: 200 } },
  { id: 'makeup', labelKey: 'start.type.makeup', descKey: 'start.type.makeup.desc', icon: 'brush', template: 'makeup', base: { w: 280, h: 240 } },
  { id: 'strick', labelKey: 'start.type.strick', descKey: 'start.type.strick.desc', icon: 'channel', template: 'strick', base: { w: 240, h: 330 } },
  { id: 'feder', labelKey: 'start.type.feder', descKey: 'start.type.feder.desc', icon: 'loops', base: { w: 220, h: 120 } },
  { id: 'eigen', labelKey: 'start.type.eigen', descKey: 'start.type.eigen.desc', icon: 'pencil', base: { w: 240, h: 200 } },
];

export function StartScreen(): JSX.Element {
  const setStartOpen = useStore((s) => s.setStartOpen);
  const loadTemplate = useStore((s) => s.loadTemplate);
  const newProject = useStore((s) => s.newProject);
  const setPar = useStore((s) => s.setPar);
  const toast = useStore((s) => s.toast);

  const [type, setType] = useState<OrgType | null>(null);
  const [how, setHow] = useState<How | null>(null);
  // Eingabefelder als String-Entwürfe — erst bei blur/Enter/„Beginnen“ klemmen,
  // sonst springt „300“ beim Tippen auf 80 zurück.
  const [wDraft, setWDraft] = useState('240');
  const [hDraft, setHDraft] = useState('200');

  const typeDef = TYPES.find((x) => x.id === type) ?? null;
  // Für Typen ohne Vorlage ist „Mit Vorlage" nicht verfügbar.
  const canTemplate = typeDef?.template !== undefined;

  const readSize = (draft: string, min: number, max: number, fallback: number): number => {
    const n = Number(draft);
    const v = Number.isFinite(n) ? n : fallback;
    return Math.round(Math.max(min, Math.min(max, v)));
  };
  const commitDraft = (which: 'w' | 'h'): void => {
    if (which === 'w') setWDraft(String(readSize(wDraft, LIMITS.baseWidthMm.min, LIMITS.baseWidthMm.max, 240)));
    else setHDraft(String(readSize(hDraft, LIMITS.baseHeightMm.min, LIMITS.baseHeightMm.max, 200)));
  };

  const begin = (): void => {
    if (!typeDef) {
      toast(t('start.title'), 'info');
      return;
    }
    const method: How = how ?? (canTemplate ? 'template' : 'blank');
    if (method === 'template' && typeDef.template) {
      loadTemplate(typeDef.template, { force: true });
    } else {
      newProject({ force: true });
      const baseW = method === 'custom' ? readSize(wDraft, LIMITS.baseWidthMm.min, LIMITS.baseWidthMm.max, 240) : typeDef.base!.w;
      const baseH = method === 'custom' ? readSize(hDraft, LIMITS.baseHeightMm.min, LIMITS.baseHeightMm.max, 200) : typeDef.base!.h;
      setPar((p) => ({
        ...p,
        name: t(typeDef.labelKey),
        base: { ...p.base, widthMm: baseW, heightMm: baseH },
      }), { undoable: false });
    }
    setStartOpen(false);
  };

  const skip = (): void => setStartOpen(false);

  return (
    <div className="start-overlay" role="dialog" aria-modal="true" aria-label={t('start.title')}>
      <div className="start-card">
        <div className="start-eyebrow">{t('app.tagline')}</div>
        <h1 className="start-title">{t('start.title')}</h1>
        <p className="start-sub">{t('start.subtitle')}</p>

        <div className="start-grid" role="group" aria-label={t('start.title')}>
          {TYPES.map((td) => (
            <button
              key={td.id}
              className="start-type"
              aria-pressed={type === td.id}
              onClick={() => {
                setType(td.id);
                setHow(null);
                if (td.base) {
                  setWDraft(String(td.base.w));
                  setHDraft(String(td.base.h));
                }
              }}
            >
              <span className="start-type-thumb">
                <ModuleIcon icon={td.icon} size={26} />
              </span>
              <span className="start-type-name">{t(td.labelKey)}</span>
              <span className="start-type-desc">{t(td.descKey)}</span>
            </button>
          ))}
        </div>

        {typeDef ? (
          <>
            <div style={{ marginTop: 'var(--s6)' }}>
              <h2 className="start-title" style={{ fontSize: 18 }}>{t('start.how')}</h2>
            </div>
            <div className="start-how" role="group" aria-label={t('start.how')}>
              <button className="start-option" aria-pressed={how === 'template'} disabled={!canTemplate} onClick={() => setHow('template')}>
                <span className="start-option-name">{t('start.how.template')}</span>
                <span className="start-option-desc">{t('start.how.template.desc')}</span>
              </button>
              <button className="start-option" aria-pressed={how === 'blank'} onClick={() => setHow('blank')}>
                <span className="start-option-name">{t('start.how.blank')}</span>
                <span className="start-option-desc">{t('start.how.blank.desc')}</span>
              </button>
              <button className="start-option" aria-pressed={how === 'custom'} onClick={() => setHow('custom')}>
                <span className="start-option-name">{t('start.how.custom')}</span>
                <span className="start-option-desc">{t('start.how.custom.desc')}</span>
              </button>
            </div>

            {how === 'custom' ? (
              <div className="start-size-row">
                <div className="start-size-field">
                  <label htmlFor="start-w">{t('start.width')} (mm)</label>
                  <input
                    id="start-w"
                    type="number"
                    inputMode="numeric"
                    min={LIMITS.baseWidthMm.min}
                    max={LIMITS.baseWidthMm.max}
                    value={wDraft}
                    onChange={(e) => setWDraft(e.target.value)}
                    onBlur={() => commitDraft('w')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitDraft('w');
                    }}
                  />
                </div>
                <div className="start-size-field">
                  <label htmlFor="start-h">{t('start.height')} (mm)</label>
                  <input
                    id="start-h"
                    type="number"
                    inputMode="numeric"
                    min={LIMITS.baseHeightMm.min}
                    max={LIMITS.baseHeightMm.max}
                    value={hDraft}
                    onChange={(e) => setHDraft(e.target.value)}
                    onBlur={() => commitDraft('h')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitDraft('h');
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div className="start-actions">
              <Button variant="accent" icon="arrowRight" onClick={begin}>
                {t('start.begin')}
              </Button>
              <Button variant="outline" onClick={skip}>
                {t('start.skip')}
              </Button>
            </div>
          </>
        ) : (
          <div className="start-actions">
            <Button variant="outline" icon="close" onClick={skip}>
              {t('start.skip')}
            </Button>
          </div>
        )}
      </div>
      <span className="sr-only" aria-hidden="true">
        <Icon name="sparkle" size={1} />
      </span>
    </div>
  );
}
