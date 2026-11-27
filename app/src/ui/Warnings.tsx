import { isFixBlockedByLock, useStore } from '../state/store';
import { t } from '../i18n/de';
import { Icon } from './icons';
import { Button } from './parts/primitives';
import { fixLabel } from './Properties';
import { QualityInspector } from './QualityCard';

import { findingKey } from '../core/fixes';

export function Warnings({ compact }: { readonly compact?: boolean } = {}): JSX.Element {
  const project = useStore((s) => s.project);
  const c = useStore((s) => s.construction);
  const findings = c.findings;
  const dismissed = useStore((s) => s.session.dismissed);
  const applyFix = useStore((s) => s.applyFindingFix);
  const applyAllFixes = useStore((s) => s.applyAllFixes);
  const autoOptimize = useStore((s) => s.autoOptimize);
  const select = useStore((s) => s.select);
  const dismiss = useStore((s) => s.dismiss);
  const setWarnOpen = useStore((s) => s.setWarnOpen);

  const visible = findings.filter((f) => !dismissed.includes(findingKey(f)));
  const fixableCount = visible.filter((f) => f.fix && !isFixBlockedByLock(project, f.fix)).length;

  return (
    <>
      {!compact ? (
        <div className="pane-head">
          <span className="pane-title">{t('eval.title')}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)' }}>
            {visible.filter((f) => f.severity === 'error').length} {t('warn.error')} ·{' '}
            {(() => {
              const n = visible.filter((f) => f.severity === 'warn').length;
              return `${n} ${n === 1 ? t('warn.warn') : t('warn.warnMany')}`;
            })()}
          </span>
        </div>
      ) : null}
      <div className="pane-body">
        <QualityInspector evaluation={c.evaluation} onOptimize={autoOptimize} compact={compact} />

        {fixableCount > 0 ? (
          <div style={{ margin: '10px 0 6px' }}>
            <Button size="sm" variant="primary" icon="sparkle" block onClick={() => void applyAllFixes()}>
              {t('warn.fixAll')} ({fixableCount})
            </Button>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <div className="empty-state compact-empty">
            <Icon name="check" size={20} strokeWidth={1.5} />
            <p style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{t('warn.none')}</p>
            <p>{t('warn.noneHint')}</p>
          </div>
        ) : (
          <div className="findings-stack">
            {visible.map((f) => {
              const key = findingKey(f);
              const moduleId = f.subject.kind === 'module' ? f.subject.id : null;
              return (
                <div key={key} className={`finding ${f.severity}`}>
                  <span className={`dot ${f.severity}`} />
                  <div>
                    <div className="finding-title">{t(`rule.${f.ruleId}.title`)}</div>
                    <div className="finding-detail">{t(`rule.${f.ruleId}.detail`, f.values)}</div>
                    <div className="finding-actions">
                      {moduleId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            select([moduleId]);
                            setWarnOpen(false);
                          }}
                          title={t('canvas.select')}
                        >
                          {t('canvas.select')}
                        </Button>
                      ) : null}
                      {f.fix ? (
                        <Button
                          size="sm"
                          variant={f.severity === 'error' ? 'primary' : 'outline'}
                          onClick={() => applyFix(f)}
                        >
                          {fixLabel(f)}
                        </Button>
                      ) : null}
                      {f.severity !== 'error' ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            dismiss(key);
                          }}
                          title={t('warn.dismiss')}
                        >
                          {t('warn.dismiss')}
                        </Button>
                      ) : null}
                      <span className="finding-rule">{f.ruleId}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {visible.some((f) => f.severity === 'error') ? (
        <div className="pane-foot" style={{ background: 'var(--error-soft)' }}>
          <p className="hint" style={{ margin: 0, color: 'var(--error)' }}>
            {t('warn.blocked')}
          </p>
        </div>
      ) : null}
    </>
  );
}
