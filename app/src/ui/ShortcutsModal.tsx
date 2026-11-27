/**
 * Tastaturkürzel-Übersicht — kompakt, per `?` oder Topbar-Hilfe erreichbar.
 */
import { useEffect } from 'react';
import { t } from '../i18n/de';
import { Button } from './parts/primitives';

const SHORTCUT_LIST: readonly { readonly keys: string; readonly labelKey: string }[] = [
  { keys: 'Strg + Z', labelKey: 'shortcuts.undo' },
  { keys: 'Strg + Umschalt + Z', labelKey: 'shortcuts.redo' },
  { keys: 'Strg + S', labelKey: 'shortcuts.save' },
  { keys: 'Strg + A', labelKey: 'shortcuts.selectAll' },
  { keys: 'R', labelKey: 'shortcuts.rotate' },
  { keys: 'Strg + D', labelKey: 'shortcuts.duplicate' },
  { keys: 'Entf / ⌫', labelKey: 'shortcuts.delete' },
  { keys: 'Esc', labelKey: 'shortcuts.escape' },
  { keys: 'Leertaste + Ziehen', labelKey: 'shortcuts.pan' },
  { keys: 'Mausrad', labelKey: 'shortcuts.zoom' },
  { keys: 'Rechtsklick', labelKey: 'shortcuts.context' },
  { keys: '?', labelKey: 'shortcuts.help' },
];

export default function ShortcutsModal({ onClose }: { readonly onClose: () => void }): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <div className="modal-head">
          <h2 id="shortcuts-title" className="modal-title">{t('shortcuts.title')}</h2>
          <Button size="sm" icon="close" onClick={onClose} ariaLabel={t('shortcuts.close')} />
        </div>
        <div className="shortcuts-list">
          {SHORTCUT_LIST.map((item) => (
            <div key={item.labelKey} className="shortcut-row">
              <span>{t(item.labelKey)}</span>
              <kbd className="kbd">{item.keys}</kbd>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <Button variant="primary" size="sm" onClick={onClose}>{t('shortcuts.close')}</Button>
        </div>
      </div>
    </div>
  );
}
