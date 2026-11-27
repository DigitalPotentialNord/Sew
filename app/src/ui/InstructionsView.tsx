/** Nähanleitung — generiert aus den echten Operationen der Konstruktion, mit interaktiver Fortschritts-Checkliste. */
import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { formatAmount, PHASE_ORDER } from '../core/construction';
import { t } from '../i18n/de';
import { Button, Panel } from './parts/primitives';
import { Icon } from './icons';

function loadDoneSteps(projectId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`sew:steps-done:${projectId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function saveDoneSteps(projectId: string, set: Set<string>): void {
  try {
    localStorage.setItem(`sew:steps-done:${projectId}`, JSON.stringify([...set]));
  } catch {
    // ignorieren im privaten Modus
  }
}

export function InstructionsView({ onPrint }: { onPrint: () => void }): JSX.Element {
  const c = useStore((s) => s.construction);
  const project = useStore((s) => s.project);

  const [done, setDone] = useState<Set<string>>(() => loadDoneSteps(project.id));
  useEffect(() => {
    setDone(loadDoneSteps(project.id));
  }, [project.id]);

  const byPhase = new Map<string, typeof c.operations>();
  for (const op of c.operations) {
    const arr = byPhase.get(op.phase) ?? [];
    byPhase.set(op.phase, [...arr, op]);
  }
  const phaseOrder = PHASE_ORDER;

  const totalSteps = c.operations.length;
  const doneCount = c.operations.filter((op) => done.has(op.id)).length;
  const pct = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
  const estMin = Math.max(15, Math.round((totalSteps * 4.5 + c.metrics.seamLengthMm / 180) / 5) * 5);

  const toggleStep = (id: string): void => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveDoneSteps(project.id, next);
      return next;
    });
  };

  const resetProgress = (): void => {
    const empty = new Set<string>();
    setDone(empty);
    saveDoneSteps(project.id, empty);
  };

  return (
    <div className="view-scroll">
      <div className="doc">
        <div className="doc-head">
          <div>
            <h2 className="doc-title">{t('instr.title')}</h2>
            <p className="doc-sub">
              {t('instr.subtitle', { n: totalSteps })}
              {totalSteps > 0 ? ` · ${t('instr.estTime', { min: estMin })}` : ''}
            </p>
          </div>
          <div className="doc-actions">
            {doneCount > 0 ? (
              <Button variant="outline" size="sm" icon="reset" onClick={resetProgress}>
                {t('instr.resetProgress')}
              </Button>
            ) : null}
            <Button variant="accent" icon="printer" onClick={onPrint}>
              {t('instr.print')}
            </Button>
          </div>
        </div>

        {totalSteps > 0 ? (
          <div className="progress-banner" role="status">
            <div className="progress-banner-head">
              <span>{t('instr.progress', { done: doneCount, total: totalSteps })}</span>
              <strong>{pct} %</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : null}

        <Panel title={t('instr.matTitle')} flush>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Material</th>
                  <th style={{ textAlign: 'right' }}>Menge</th>
                  <th>Art</th>
                </tr>
              </thead>
              <tbody>
                {c.materials.map((m, i) => (
                  <tr key={i}>
                    <td>{t(m.labelKey) === m.labelKey ? t(`mat.${m.kind}`) : t(m.labelKey)}</td>
                    <td className="num">{m.display ?? formatAmount(m.amount, m.unit)}</td>
                    <td>
                      <span className={`badge ${m.certainty === 'exact' ? 'exact' : 'est'}`}>
                        {m.certainty === 'exact' ? t('mat.tab.exact') : t('mat.tab.estimated')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={`${t('pattern.calibration')}`}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Icon name="ruler" size={22} />
            <p className="hint" style={{ margin: 0 }}>
              {t('pattern.calibrationHint')}
            </p>
          </div>
        </Panel>

        {phaseOrder
          .filter((ph) => (byPhase.get(ph) ?? []).length > 0)
          .map((ph) => (
            <Panel key={ph} title={t(`phase.${ph}`)} flush>
              <ol className="steps">
                {(byPhase.get(ph) ?? []).map((op) => {
                  const isDone = done.has(op.id);
                  return (
                    <li key={op.id} className={isDone ? 'step-done' : undefined}>
                      <label className="step-check-row">
                        <input
                          type="checkbox"
                          className="studio-check"
                          checked={isDone}
                          onChange={() => toggleStep(op.id)}
                        />
                        <span className="step-phase">{op.index}</span>
                        <span className="step-text">{t(op.titleKey, op.values)}</span>
                      </label>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          ))}

        {c.operations.length === 0 ? <p className="hint">{t('instr.empty')}</p> : null}

        <p className="hint" style={{ marginTop: 16 }}>
          Projekt: {project.name} · Nahtzugabe {project.settings.seamAllowanceMm} mm · {c.metrics.moduleCount} Module · Praxiswerte{' '}
          {c.practiceVersion}
        </p>
      </div>
    </div>
  );
}
