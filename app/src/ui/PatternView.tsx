/** Schnittmuster: echte Teile aus der Konstruktion, Detail-Vorschau, SVG- und PDF-Export, A4-Aufteilung. */
import { useState } from 'react';
import { mm, roundedRectPath } from '../core/geometry';
import { canExport, downloadText, fileName, tilePiece, timestampForFile, toSvg, totalPages } from '../core/export';
import type { ComputedPiece } from '../core/construction';
import { useStore } from '../state/store';
import { fmtMm, t } from '../i18n/de';
import { Icon } from './icons';
import { QualityBadge } from './QualityCard';
import { Button, Panel, Switch } from './parts/primitives';

const SEAM_PRESETS = [7, 10, 12, 15] as const;

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSinglePieceSvg(p: ComputedPiece, name: string): string {
  const pad = 10;
  const safeName = escXml(name);
  const hasSA = p.netW < p.w || p.netH < p.h;
  const netRadius = Math.max(0, p.radius - Math.min(p.netRect.x, p.netRect.y));
  const outer = roundedRectPath({ x: mm(0), y: mm(0), w: p.w, h: p.h }, p.radius);
  const net = hasSA ? roundedRectPath(p.netRect, netRadius) : '';
  const foldPath =
    p.foldEdge === 'top'
      ? `M2,0 H${p.w - 2}`
      : p.foldEdge === 'bottom'
        ? `M2,${p.h} H${p.w - 2}`
        : p.foldEdge === 'left'
          ? `M0,2 V${p.h - 2}`
          : p.foldEdge === 'right'
            ? `M${p.w},2 V${p.h - 2}`
            : '';
  const grainSvg =
    p.grain === 'crosswise'
      ? `  <path d="M6,${p.h / 2} H${Math.max(12, p.w - 6)} M${Math.max(12, p.w - 6) - 4},${p.h / 2 - 2.5} L${Math.max(12, p.w - 6)},${p.h / 2} L${Math.max(12, p.w - 6) - 4},${p.h / 2 + 2.5}" fill="none" stroke="#5e5c57" stroke-width="0.3" />`
      : p.grain === 'lengthwise'
        ? `  <path d="M${p.w / 2},6 V${Math.max(12, p.h - 6)} M${p.w / 2 - 2.5},10 L${p.w / 2},6 L${p.w / 2 + 2.5},10" fill="none" stroke="#5e5c57" stroke-width="0.3" />`
        : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${p.w + pad * 2}mm" height="${p.h + pad * 2}mm" viewBox="${-pad} ${-pad} ${p.w + pad * 2} ${p.h + pad * 2}">`,
    `  <title>${safeName}</title>`,
    `  <path d="${outer}" fill="none" stroke="#181715" stroke-width="0.4" />`,
    hasSA ? `  <path d="${net}" fill="none" stroke="#706e68" stroke-width="0.3" stroke-dasharray="3 2" />` : '',
    foldPath ? `  <path d="${foldPath}" fill="none" stroke="#2d6e5f" stroke-width="0.5" stroke-dasharray="4 2" />` : '',
    grainSvg,
    `  <text x="${p.w / 2}" y="${p.h / 2}" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#181715">${safeName} (${p.count}x, ${p.w}x${p.h} mm)</text>`,
    `</svg>`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function PatternView({ onPrint, onPrintInstructions }: { onPrint: () => void; onPrintInstructions: () => void }): JSX.Element {
  const c = useStore((s) => s.construction);
  const project = useStore((s) => s.project);
  const setPar = useStore((s) => s.setPar);
  const toast = useStore((s) => s.toast);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [showTiles, setShowTiles] = useState(true);
  const cut = c.pieces.filter((p) => p.kind === 'cut');
  const errors = c.findings.filter((f) => f.severity === 'error');
  const eligibility = canExport(c);
  const unit = project.settings.unit;
  const inspected = inspectId ? cut.find((p) => p.id === inspectId) ?? null : null;

  const exportSvg = (): void => {
    if (!eligibility.ok) {
      toast(t('toast.blocked', { n: eligibility.errorCount }), 'error');
      return;
    }
    downloadText(fileName(project.name, 'schnittmuster', 'svg'), 'image/svg+xml', toSvg(c));
    toast(t('toast.svgSaved'), 'ok');
  };


  return (
    <div className="view-scroll">
      <div className="doc">
        <div className="doc-head">
          <div>
            <h2 className="doc-title">{t('pattern.title')}</h2>
            <p className="doc-sub">
              {t(cut.length === 1 ? 'pattern.piece' : 'pattern.pieces', { n: cut.length })} · {t('pattern.pages', { n: totalPages(c) })}
            </p>
          </div>
          <div className="doc-actions">
            <Button variant="outline" icon="image" onClick={exportSvg} disabled={errors.length > 0}>
              {t('pattern.svg')}
            </Button>
            <Button variant="accent" icon="printer" onClick={onPrint} disabled={errors.length > 0}>
              {t('pattern.pdf')}
            </Button>
          </div>
        </div>

        {!eligibility.ok ? (
          <div
            className="panel"
            style={{ borderColor: 'var(--error)', background: 'var(--error-soft)', padding: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
            role="alert"
          >
            <Icon name="error" size={18} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--error)' }}>{t('pattern.blocked', { n: errors.length })}</div>
              {errors[0] ? <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t(`rule.${errors[0].ruleId}.detail`, errors[0].values)}</div> : null}
            </div>
            <QualityBadge evaluation={c.evaluation} />
          </div>
        ) : (
          <div
            className="panel"
            style={{ borderColor: 'var(--ok)', background: 'var(--ok-soft)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, flexWrap: 'wrap' }}
          >
            <Icon name="check" size={14} />
            <span style={{ flex: 1 }}>
              {t('pattern.ready')} · {t(c.metrics.cutPieceCount === 1 ? 'pattern.piece' : 'pattern.pieces', { n: c.metrics.cutPieceCount })} · {(c.metrics.seamLengthMm / 1000).toFixed(1).replace('.', ',')} m Naht
            </span>
            <QualityBadge evaluation={c.evaluation} />
          </div>
        )}

        <Panel title={t('pattern.calibration')}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <svg width={100} height={100} viewBox="0 0 50 50" style={{ border: '1px solid var(--ink)', flex: 'none' }} role="img" aria-label="50 mm Kalibrierquadrat">
                <path d="M0,0 h50 v50 h-50 Z" fill="none" stroke="var(--ink)" strokeWidth={0.4} />
                <path d="M0,0 L50,50 M50,0 L0,50" stroke="var(--line-strong)" strokeWidth={0.2} />
              </svg>
              <p className="hint" style={{ maxWidth: 380, margin: 0 }}>
                {t('pattern.calibrationHint')}
              </p>
            </div>
            <div>
              <div className="field-label" style={{ marginBottom: 4 }}>{t('pattern.quickSeam')}</div>
              <div className="seg" role="group" aria-label={t('pattern.quickSeam')}>
                {SEAM_PRESETS.map((sa) => (
                  <button
                    key={sa}
                    type="button"
                    aria-pressed={project.settings.seamAllowanceMm === sa}
                    onClick={() => setPar((p) => ({ ...p, settings: { ...p.settings, seamAllowanceMm: mm(sa) } }))}
                  >
                    {sa} mm
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title={t('pattern.tile')} flush>
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Teil</th>
                  <th style={{ textAlign: 'right' }}>Maße ({unit})</th>
                  <th style={{ textAlign: 'right' }}>Nähmaß</th>
                  <th style={{ textAlign: 'right' }}>Anz.</th>
                  <th>A4-Seiten</th>
                </tr>
              </thead>
              <tbody>
                {cut.map((p) => {
                  const tiles = tilePiece(p);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{t(p.nameKey)}</td>
                      <td className="num">
                        {fmtMm(p.w, unit)} × {fmtMm(p.h, unit)}
                      </td>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>
                        {fmtMm(p.netW, unit)} × {fmtMm(p.netH, unit)}
                      </td>
                      <td className="num">{p.count}×</td>
                      <td className="mono" style={{ color: 'var(--ink-2)' }}>
                        {tiles.map((x) => x.label).join(' · ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="piece-grid">
          {cut.map((p) => {
            const maxW = 200;
            const maxH = 130;
            const s = Math.min(maxW / Math.max(1, p.w), maxH / Math.max(1, p.h));
            const hasSA = p.netW < p.w || p.netH < p.h;
            const netRadius = Math.max(0, p.radius - Math.min(p.netRect.x, p.netRect.y));
            return (
              <div className="piece-card" key={p.id}>
                <div className="piece-card-head">
                  <span className="piece-card-name">{t(p.nameKey)}</span>
                  <span className="badge solid">{p.count}×</span>
                </div>
                <div className="piece-card-svg">
                  <svg width={Math.max(20, p.w * s)} height={Math.max(20, p.h * s)} viewBox={`0 0 ${p.w} ${p.h}`} role="img" aria-label={t(p.nameKey)}>
                    <path d={roundedRectPath({ x: mm(0), y: mm(0), w: p.w, h: p.h }, p.radius)} fill="#fff" stroke="var(--ink)" strokeWidth={Math.max(0.4, 1 / s)} />
                    {hasSA ? (
                      <path
                        d={roundedRectPath(p.netRect, netRadius)}
                        fill="none"
                        stroke="var(--ink-3)"
                        strokeWidth={Math.max(0.3, 0.8 / s)}
                        strokeDasharray={`${4 / s} ${3 / s}`}
                      />
                    ) : null}
                    {p.foldEdge === 'top' ? (
                      <path d={`M2,0 H${p.w - 2}`} stroke="var(--geo-fold)" strokeWidth={Math.max(0.4, 1 / s)} strokeDasharray={`${5 / s} ${2 / s}`} />
                    ) : p.foldEdge === 'bottom' ? (
                      <path d={`M2,${p.h} H${p.w - 2}`} stroke="var(--geo-fold)" strokeWidth={Math.max(0.4, 1 / s)} strokeDasharray={`${5 / s} ${2 / s}`} />
                    ) : p.foldEdge === 'left' ? (
                      <path d={`M0,2 V${p.h - 2}`} stroke="var(--geo-fold)" strokeWidth={Math.max(0.4, 1 / s)} strokeDasharray={`${5 / s} ${2 / s}`} />
                    ) : p.foldEdge === 'right' ? (
                      <path d={`M${p.w},2 V${p.h - 2}`} stroke="var(--geo-fold)" strokeWidth={Math.max(0.4, 1 / s)} strokeDasharray={`${5 / s} ${2 / s}`} />
                    ) : null}
                    {p.grain === 'crosswise' ? (
                      <>
                        <path d={`M${3 / s},${p.h / 2} H${Math.max(6 / s, p.w - 3 / s)}`} stroke="var(--ink-2)" strokeWidth={Math.max(0.3, 0.8 / s)} />
                        <path
                          d={`M${p.w - 8 / s},${p.h / 2 - 3 / s} L${p.w - 3 / s},${p.h / 2} L${p.w - 8 / s},${p.h / 2 + 3 / s}`}
                          fill="none"
                          stroke="var(--ink-2)"
                          strokeWidth={Math.max(0.3, 0.8 / s)}
                        />
                      </>
                    ) : (
                      <>
                        <path d={`M${p.w / 2},${3 / s} V${Math.max(6 / s, p.h - 3 / s)}`} stroke="var(--ink-2)" strokeWidth={Math.max(0.3, 0.8 / s)} />
                        <path
                          d={`M${p.w / 2 - 3 / s},${8 / s} L${p.w / 2},${3 / s} L${p.w / 2 + 3 / s},${8 / s}`}
                          fill="none"
                          stroke="var(--ink-2)"
                          strokeWidth={Math.max(0.3, 0.8 / s)}
                        />
                      </>
                    )}
                  </svg>
                </div>
                <div className="piece-card-meta">
                  <span>
                    {fmtMm(p.w, unit)} × {fmtMm(p.h, unit)}
                  </span>
                  <button
                    type="button"
                    className="piece-inspect-btn"
                    onClick={() => setInspectId(p.id)}
                  >
                    {t('pattern.inspect')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {inspected ? (() => {
          const tiles = tilePiece(inspected);
          const hasSA = inspected.netW < inspected.w || inspected.netH < inspected.h;
          const netRadius = Math.max(0, inspected.radius - Math.min(inspected.netRect.x, inspected.netRect.y));
          const maxW = 460;
          const maxH = 320;
          const s = Math.min(maxW / Math.max(1, inspected.w), maxH / Math.max(1, inspected.h));
          const pName = t(inspected.nameKey);
          return (
            <div
              className="modal-backdrop"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setInspectId(null);
              }}
            >
              <div className="modal-card piece-modal" role="dialog" aria-modal="true" aria-labelledby="piece-modal-title">
                <div className="modal-head">
                  <div>
                    <h3 id="piece-modal-title" className="modal-title">{pName}</h3>
                    <p className="hint" style={{ margin: '2px 0 0' }}>
                      {inspected.count}× · {t(`mat.${inspected.material}`)} · {fmtMm(inspected.w, unit)} × {fmtMm(inspected.h, unit)}
                      {hasSA ? ` (Nähmaß ${fmtMm(inspected.netW, unit)} × ${fmtMm(inspected.netH, unit)})` : ''}
                    </p>
                  </div>
                  <Button size="sm" icon="close" onClick={() => setInspectId(null)} ariaLabel={t('shortcuts.close')} />
                </div>

                <div className="piece-modal-svg">
                  <svg
                    width={Math.max(60, inspected.w * s)}
                    height={Math.max(60, inspected.h * s)}
                    viewBox={`0 0 ${inspected.w} ${inspected.h}`}
                    role="img"
                    aria-label={pName}
                  >
                    <path d={roundedRectPath({ x: mm(0), y: mm(0), w: inspected.w, h: inspected.h }, inspected.radius)} fill="#fff" stroke="var(--ink)" strokeWidth={Math.max(0.5, 1.2 / s)} />
                    {hasSA ? (
                      <path
                        d={roundedRectPath(inspected.netRect, netRadius)}
                        fill="none"
                        stroke="var(--ink-3)"
                        strokeWidth={Math.max(0.4, 0.9 / s)}
                        strokeDasharray={`${4 / s} ${3 / s}`}
                      />
                    ) : null}
                    {showTiles ? tiles.map((tile) => (
                      <g key={tile.label}>
                        <rect
                          x={tile.srcRect.x}
                          y={tile.srcRect.y}
                          width={tile.srcRect.w}
                          height={tile.srcRect.h}
                          fill="none"
                          stroke="#2b6cb0"
                          strokeOpacity={0.45}
                          strokeWidth={Math.max(0.4, 0.9 / s)}
                          strokeDasharray={`${3 / s} ${2 / s}`}
                        />
                        <text
                          x={tile.srcRect.x + 6 / s}
                          y={tile.srcRect.y + 14 / s}
                          fontSize={10 / s}
                          fill="#2b6cb0"
                          fontWeight={600}
                        >
                          {tile.label}
                        </text>
                      </g>
                    )) : null}
                  </svg>
                </div>

                <div className="piece-modal-foot">
                  <Switch label={t('pattern.tileOverlay')} checked={showTiles} onChange={setShowTiles} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="download"
                      disabled={!eligibility.ok}
                      title={!eligibility.ok ? t('pattern.blocked', { n: errors.length }) : t('pattern.downloadPiece')}
                      onClick={() => {
                        if (!eligibility.ok) {
                          toast(t('toast.blocked', { n: eligibility.errorCount }), 'error');
                          return;
                        }
                        downloadText(
                          fileName(`${project.name}-${pName}`, 'teil', 'svg'),
                          'image/svg+xml',
                          buildSinglePieceSvg(inspected, pName),
                        );
                        toast(t('toast.svgSaved'), 'ok');
                      }}
                    >
                      {t('pattern.downloadPiece')}
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => setInspectId(null)}>
                      {t('shortcuts.close')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : null}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button variant="outline" icon="printer" onClick={onPrintInstructions}>
            {t('instr.print')}
          </Button>
          <Button
            variant="outline"
            icon="download"
            onClick={() => {
              downloadText(fileName(project.name, 'projekt', 'json'), 'application/json', JSON.stringify(useStore.getState().exportProject(), null, 2));
              toast(t('toast.projectExported'), 'ok');
            }}
          >
            {t('top.exportJson')}
          </Button>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Dateiname: <span className="mono">{fileName(project.name, 'schnittmuster', 'svg')}</span> · Stand{' '}
          <span className="mono">{timestampForFile(new Date())}</span> · Praxiswerte{' '}
          <span className="mono">{c.practiceVersion}</span> · Konstruktion <span className="mono">{c.projectHash}</span>
        </p>
      </div>
    </div>
  );
}
