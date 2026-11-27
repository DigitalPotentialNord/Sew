/** Materialplan: echte regelbasierte Berechnung, Einkaufs-Checkliste, Export & Stoffbreiten-Presets. */
import { useEffect, useState } from 'react';
import { mm } from '../core/geometry';
import { downloadText, fileName } from '../core/export';
import { useStore } from '../state/store';
import { formatAmount } from '../core/construction';
import { fmtMm, t } from '../i18n/de';
import type { MaterialLine } from '../core/construction';
import { Button, Panel } from './parts/primitives';

const ORDER: readonly string[] = ['fabric', 'lining', 'interfacing', 'batting', 'elastic', 'zipper', 'webbing', 'velcro', 'button', 'snap', 'ring', 'thread'];
const FABRIC_WIDTH_PRESETS = [1100, 1400, 1500] as const;

function labelOf(m: MaterialLine): string {
  const direct = t(`mat.${m.kind}`);
  return direct === `mat.${m.kind}` ? t(m.labelKey) : direct;
}

function loadChecked(projectId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`sew:mat-checked:${projectId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(projectId: string, set: Set<string>): void {
  try {
    localStorage.setItem(`sew:mat-checked:${projectId}`, JSON.stringify([...set]));
  } catch {
    // ignorieren im privaten Modus
  }
}

export function MaterialsView(): JSX.Element {
  const c = useStore((s) => s.construction);
  const project = useStore((s) => s.project);
  const setPar = useStore((s) => s.setPar);
  const toast = useStore((s) => s.toast);
  const unit = project.settings.unit;

  const [checked, setChecked] = useState<Set<string>>(() => loadChecked(project.id));
  useEffect(() => {
    setChecked(loadChecked(project.id));
  }, [project.id]);

  const sorted = [...c.materials].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.spec.localeCompare(b.spec));
  const plan = c.fabricPlan;
  const itemKey = (m: MaterialLine) => `${m.kind}::${m.labelKey}::${m.spec}`;
  const doneCount = sorted.filter((m) => checked.has(itemKey(m))).length;

  const toggleItem = (key: string): void => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveChecked(project.id, next);
      return next;
    });
  };

  const resetChecked = (): void => {
    const empty = new Set<string>();
    setChecked(empty);
    saveChecked(project.id, empty);
  };

  const buildPlainList = (): string => {
    const lines = [
      `Einkaufsliste – ${project.name}`,
      `Stoffbreite: ${fmtMm(project.settings.fabricWidthMm, unit)} · Nahtzugabe: ${project.settings.seamAllowanceMm} mm`,
      '',
      ...sorted.map((m) => {
        const mark = checked.has(itemKey(m)) ? '[x]' : '[ ]';
        const amt = m.display ?? formatAmount(m.amount, m.unit);
        return `${mark} ${labelOf(m)} (${m.spec}): ${amt}`;
      }),
    ];
    return lines.join('\n');
  };

  const copyList = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(buildPlainList());
      toast(t('mat.copied'), 'ok');
    } catch {
      downloadText(fileName(project.name, 'einkaufsliste', 'txt'), 'text/plain;charset=utf-8', buildPlainList());
      toast(t('mat.exportedTxt'), 'ok');
    }
  };

  return (
    <div className="view-scroll">
      <div className="doc">
        <div className="doc-head">
          <div>
            <h2 className="doc-title">{t('mat.tab.title')}</h2>
            <p className="doc-sub">
              {project.name} · {c.metrics.moduleCount} Module · {fmtMm(project.settings.fabricWidthMm, unit)} Stoffbreite
              {sorted.length > 0 ? ` · ${t('mat.checked', { done: doneCount, total: sorted.length })}` : ''}
            </p>
          </div>
          <div className="doc-actions">
            {doneCount > 0 ? (
              <Button variant="outline" size="sm" icon="reset" onClick={resetChecked}>
                {t('mat.resetChecks')}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" icon="copy" disabled={sorted.length === 0} onClick={() => void copyList()}>
              {t('mat.copyList')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="download"
              disabled={sorted.length === 0}
              onClick={() => {
                downloadText(fileName(project.name, 'einkaufsliste', 'txt'), 'text/plain;charset=utf-8', buildPlainList());
                toast(t('mat.exportedTxt'), 'ok');
              }}
            >
              {t('mat.exportTxt')}
            </Button>
          </div>
        </div>

        <Panel flush>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 32 }} aria-label="Abhaken" />
                  <th>Material</th>
                  <th style={{ textAlign: 'right' }}>Menge</th>
                  <th>Art</th>
                  <th>{t('mat.tab.basis')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m, i) => {
                  const key = itemKey(m);
                  const isDone = checked.has(key);
                  return (
                    <tr key={`${m.kind}-${m.spec}-${i}`} className={isDone ? 'row-checked' : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          className="studio-check"
                          checked={isDone}
                          aria-label={labelOf(m)}
                          onChange={() => toggleItem(key)}
                        />
                      </td>
                      <td>
                        <div className="check-label-main" style={{ fontWeight: 500 }}>{labelOf(m)}</div>
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
                  );
                })}
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>
                      {t('mat.tab.empty')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <p className="hint" style={{ marginTop: -8, marginBottom: 16 }}>
          {t('mat.tab.legend')} {t('mat.tab.threadNote')}
        </p>

        {plan && plan.pieces.length > 0 ? (
          <Panel title={t('mat.tab.plan')}>
            <div className="fabric-preset-bar">
              <span className="field-label" style={{ margin: 0 }}>{t('mat.fabricQuick')}:</span>
              <div className="seg" role="group" aria-label={t('mat.fabricQuick')}>
                {FABRIC_WIDTH_PRESETS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={project.settings.fabricWidthMm === w}
                    onClick={() => setPar((p) => ({ ...p, settings: { ...p.settings, fabricWidthMm: mm(w) } }))}
                  >
                    {w / 10} cm
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 12 }}>
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
                  <dt>{t(plan.rows === 1 ? 'mat.tab.row' : 'mat.tab.rows', { rows: plan.rows, height: Math.round(plan.usedHeightMm) })}</dt>
                  <dd />
                  <dt>Stoffhöhe</dt>
                  <dd>{fmtMm(Math.round(plan.usedHeightMm), unit)}</dd>
                  <dt>Verbrauch</dt>
                  <dd>{plan.meters.toFixed(2).replace('.', ',')} m</dd>
                </div>
              </div>
            </div>
          </Panel>
        ) : null}

        <Panel title="Schnittteile" flush>
          <div className="table-scroll">
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
                        {fmtMm(p.w, unit)} × {fmtMm(p.h, unit)}
                      </td>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>
                        {fmtMm(p.netW, unit)} × {fmtMm(p.netH, unit)}
                      </td>
                      <td>{t(`mat.${p.material}`)}</td>
                      <td style={{ color: 'var(--ink-2)' }}>
                        {p.grain === 'lengthwise' ? 'längs' : p.grain === 'crosswise' ? 'quer' : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
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
      style={{ border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface-2)', maxWidth: '100%', height: 'auto' }}
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
          {p.rect.w >= p.pieceId.length * 4.6 + 10 && p.rect.h >= 14 ? (
            <text x={p.rect.x + 4} y={p.rect.y + 11} style={{ fontSize: 8, fill: 'var(--ink-2)' }}>
              {p.pieceId}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
