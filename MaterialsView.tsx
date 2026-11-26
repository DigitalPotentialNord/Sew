/** Materialplan: echte regelbasierte Berechnung, exakt vs. geschätzt, mit Zuschnittplan. */
import { useStore } from '../state/store';
import { formatAmount } from '../core/construction';
import { t } from '../i18n/de';
import type { MaterialLine } from '../core/construction';
import { Panel } from './parts/primitives';

const ORDER: readonly string[] = ['fabric', 'lining', 'interfacing', 'batting', 'elastic', 'zipper', 'webbing', 'velcro', 'button', 'snap', 'ring', 'thread'];

function labelOf(m: MaterialLine): string {
  const direct = t(`mat.${m.kind}`);
  return direct === `mat.${m.kind}` ? t(m.labelKey) : direct;
}

export function MaterialsView(): JSX.Element {
  const c = useStore((s) => s.construction);
  const project = useStore((s) => s.project);

  const sorted = [...c.materials].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.spec.localeCompare(b.spec));
  const plan = c.fabricPlan;

  return (
    <div className="view-scroll">
      <div className="doc">
        <div className="doc-head">
          <div>
            <h2 className="doc-title">{t('mat.tab.title')}</h2>
            <p className="doc-sub">
              {project.name} · {c.metrics.moduleCount} Module · {project.settings.fabricWidthMm} mm Stoffbreite
            </p>
          </div>
        </div>

        <Panel flush>
          <table className="data">
            <thead>
              <tr>
                <th>Material</th>
                <th style={{ textAlign: 'right' }}>Menge</th>
                <th>Art</th>
                <th>{t('mat.tab.basis')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr key={`${m.kind}-${m.spec}-${i}`}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{labelOf(m)}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.spec}</div>
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {m.display ?? formatAmount(m.amount, m.unit)}
                  </td>
                  <td>
                    <span className={`badge ${m.certainty === 'exact' ? 'exact' : 'est'}`}>
                      {m.certainty === 'exact' ? t('mat.tab.exact') : t('mat.tab.estimated')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--ink-2)', fontSize: 11.5 }}>{t(m.basisKey, m.basisValues)}</td>
                </tr>
              ))}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>
                    {t('mat.tab.empty')}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Panel>

        <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>
          {t('mat.tab.legend')} {t('mat.tab.threadNote')}
        </p>

        {plan && plan.pieces.length > 0 ? (
          <Panel title={t('mat.tab.plan')}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <FabricPlanSvg
                width={project.settings.fabricWidthMm}
                height={Math.min(plan.usedHeightMm, 2600)}
                pieces={plan.pieces}
                maxWidth={420}
              />
              <div style={{ flex: 1, minWidth: 180 }}>
                <p className="hint" style={{ marginTop: 0 }}>
                  {t('mat.tab.planHint', {
                    breite: project.settings.fabricWidthMm,
                    verschnitt: plan.wastePct,
                  })}
                </p>
                <div className="kv" style={{ marginTop: 8 }}>
                  <dt>{t('mat.tab.rows', { rows: plan.rows, height: Math.round(plan.usedHeightMm) })}</dt>
                  <dd />
                  <dt>Stoffhöhe</dt>
                  <dd>{Math.round(plan.usedHeightMm)} mm</dd>
                  <dt>Verbrauch</dt>
                  <dd>{plan.meters.toFixed(2).replace('.', ',')} m</dd>
                </div>
              </div>
            </div>
          </Panel>
        ) : null}

        <Panel title="Schnittteile">
          <table className="data">
            <thead>
              <tr>
                <th>Teil</th>
                <th style={{ textAlign: 'right' }}>Anzahl</th>
                <th style={{ textAlign: 'right' }}>Zuschnitt</th>
                <th style={{ textAlign: 'right' }}>Nähmaß</th>
                <th>Material</th>
                <th>Fadenlauf</th>
              </tr>
            </thead>
            <tbody>
              {c.pieces
                .filter((p) => p.kind === 'cut')
                .map((p) => (
                  <tr key={p.id}>
                    <td>{t(p.nameKey)}</td>
                    <td className="num">{p.count}×</td>
                    <td className="num">
                      {p.w} × {p.h}
                    </td>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>
                      {p.netW} × {p.netH}
                    </td>
                    <td>{t(`mat.${p.material}`)}</td>
                    <td style={{ color: 'var(--ink-2)' }}>
                      {p.grain === 'lengthwise' ? 'längs' : p.grain === 'crosswise' ? 'quer' : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

function FabricPlanSvg({
  width,
  height,
  pieces,
  maxWidth,
}: {
  width: number;
  height: number;
  pieces: readonly { pieceId: string; rect: { x: number; y: number; w: number; h: number } }[];
  maxWidth: number;
}): JSX.Element {
  const scale = Math.min(maxWidth / width, 1);
  return (
    <svg
      width={width * scale}
      height={Math.max(60, height * scale)}
      viewBox={`0 0 ${width} ${Math.max(60, height)}`}
      style={{ border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface-2)' }}
      role="img"
      aria-label={t('mat.tab.plan')}
    >
      <rect x={0} y={0} width={width} height={Math.max(60, height)} fill="var(--surface-2)" />
      {pieces.map((p, i) => (
        <g key={`${p.pieceId}-${i}`}>
          <rect
            x={p.rect.x + 1}
            y={p.rect.y + 1}
            width={Math.max(2, p.rect.w - 2)}
            height={Math.max(2, p.rect.h - 2)}
            fill="#fff"
            stroke="var(--ink)"
            strokeWidth={1}
          />
          {p.rect.w > 60 ? (
            <text x={p.rect.x + 4} y={p.rect.y + 11} style={{ fontSize: 8, fill: 'var(--ink-2)' }}>
              {p.pieceId}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
