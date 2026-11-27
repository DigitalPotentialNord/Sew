/** Nähanleitung — generiert aus den echten Operationen der Konstruktion. */
import { useStore } from '../state/store';
import { formatAmount } from '../core/construction';
import { t } from '../i18n/de';
import { Button, Panel } from './parts/primitives';
import { Icon } from './icons';

export function InstructionsView({ onPrint }: { onPrint: () => void }): JSX.Element {
  const c = useStore((s) => s.construction);
  const project = useStore((s) => s.project);

  const byPhase = new Map<string, typeof c.operations>();
  for (const op of c.operations) {
    const arr = byPhase.get(op.phase) ?? [];
    byPhase.set(op.phase, [...arr, op]);
  }
  const phaseOrder = ['prepare', 'cut', 'sew-order', 'assemble', 'finish'];

  return (
    <div className="view-scroll">
      <div className="doc">
        <div className="doc-head">
          <div>
            <h2 className="doc-title">{t('instr.title')}</h2>
            <p className="doc-sub">{t('instr.subtitle', { n: c.operations.length })}</p>
          </div>
          <div className="doc-actions">
            <Button variant="accent" icon="printer" onClick={onPrint}>
              {t('instr.print')}
            </Button>
          </div>
        </div>

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
                {(byPhase.get(ph) ?? []).map((op) => (
                  <li key={op.id}>
                    <span />
                    <div>
                      <span className="step-phase">{op.index}</span>
                      <div className="step-text">{t(op.titleKey, op.values)}</div>
                    </div>
                  </li>
                ))}
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
