/**
 * Zugeklappt-Vorschau: zeigt das gefaltete Etui von außen und im Querschnitt
 * samt berechneter Inhalts-Dicke vs. gewählter Bundbreite.
 */
import { useMemo } from 'react';
import { computeSpineBulk } from '../core/evaluation';
import { LIMITS } from '../core/practice';
import { useStore } from '../state/store';
import { fmtMm, t } from '../i18n/de';
import { FABRIC_THEMES } from './Properties';
import { Icon } from './icons';
import { Button } from './parts/primitives';

export default function FoldedPreview(): JSX.Element {
  const project = useStore((s) => s.project);
  const c = useStore((s) => s.construction);
  const fabricTheme = useStore((s) => s.session.fabricTheme);
  const toggleFolded = useStore((s) => s.toggleFolded);
  const autoFitSpine = useStore((s) => s.autoFitSpine);

  const theme = FABRIC_THEMES.find((x) => x.id === fabricTheme) ?? FABRIC_THEMES[0]!;
  const unit = project.settings.unit;
  const { widthMm, heightMm, spineWidthMm, cornerRadiusMm, hasLining } = project.base;
  const flapW = widthMm;
  const spineW = spineWidthMm;
  const totalOpenW = c.book.w;

  const bulk = useMemo(
    () => computeSpineBulk(project.modules, hasLining),
    [project.modules, hasLining],
  );
  const isEmpty = project.modules.length === 0;
  const needSpine = Math.max(LIMITS.spineWidthMm.min, bulk.requiredSpineMm);
  const exceedsMax = !isEmpty && bulk.estimatedBulkMm > LIMITS.spineWidthMm.max;
  const deficit = isEmpty ? 0 : bulk.requiredSpineMm - spineWidthMm;
  const hardDeficit = !isEmpty && (exceedsMax || deficit >= 8 || (bulk.leftBulkMm > 0 && bulk.rightBulkMm > 0 && deficit >= 4));
  const statusTone: 'ok' | 'warn' | 'error' = isEmpty
    ? 'ok'
    : hardDeficit
      ? 'error'
      : deficit > 0
        ? 'warn'
        : 'ok';
  const statusText = isEmpty
    ? t('folded.empty', { need: fmtMm(bulk.estimatedBulkMm, unit) })
    : exceedsMax
      ? t('folded.exceedsMax', { need: fmtMm(bulk.estimatedBulkMm, unit), max: fmtMm(LIMITS.spineWidthMm.max, unit) })
      : hardDeficit
        ? t('folded.fitsBlocked')
        : deficit > 0
          ? t('folded.fitsTight')
          : t('folded.fitsOk');
  const showAutoFit = !isEmpty && Math.round(spineWidthMm) < needSpine;
  const hasSnap = project.modules.some((m) => m.typeId === 'M07' || m.typeId === 'M11');
  const hasZip = project.modules.some((m) => m.typeId === 'M03' || m.typeId === 'M16');

  // Front-View SVG proportions (normalize cleanly inside 360 x 260 box)
  const pad = 26;
  const maxW = 280;
  const maxH = 210;
  const scale = Math.min(maxW / Math.max(1, flapW + spineW * 0.4), maxH / Math.max(1, heightMm));
  const drawW = Math.round(flapW * scale);
  const drawH = Math.round(heightMm * scale);
  const spineVis = Math.max(8, Math.min(26, Math.round(spineW * scale * 0.6)));
  const drawR = Math.min(drawW / 3, drawH / 3, Math.round(cornerRadiusMm * scale));
  const svgW = drawW + spineVis + pad * 2;
  const svgH = drawH + pad * 2;
  const x0 = pad + spineVis;
  const y0 = pad;

  // Querschnitt (von oben auf das geschlossene Etui geblickt)
  const csW = 280;
  const csH = 92;
  const coverLen = 190;
  const spinePx = Math.max(18, Math.min(54, Math.round(spineWidthMm * 1.15)));
  const visualBulkMm = isEmpty ? bulk.estimatedBulkMm : bulk.estimatedBulkMm;
  const fillPx = Math.max(8, Math.min(58, Math.round(visualBulkMm * 1.15)));
  const cy = csH / 2;
  const topY = cy - spinePx / 2;
  const botY = cy + spinePx / 2;
  const leftX = 48;
  const rightX = leftX + coverLen;

  return (
    <div className="folded-stage" role="region" aria-label={t('folded.title')}>
      <div className="folded-card">
        <div className="folded-head">
          <div>
            <h2 className="folded-title">{t('folded.title')}</h2>
            <p className="folded-sub">{t('folded.subtitle')}</p>
          </div>
          <Button size="sm" variant="outline" icon="book" onClick={toggleFolded}>
            {t('canvas.viewOpen')}
          </Button>
        </div>

        <div className="folded-body">
          {/* Vorderansicht des geschlossenen Etuis */}
          <div className="folded-visual">
            <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} role="img" aria-label={t('folded.front')}>
              <defs>
                <filter id="folded-shadow" x="-15%" y="-15%" width="135%" height="135%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#181715" floodOpacity="0.14" />
                </filter>
              </defs>
              {/* Rücken / Falz links */}
              <path
                d={`M ${x0} ${y0} H ${x0 - spineVis + 5} Q ${x0 - spineVis} ${y0} ${x0 - spineVis} ${y0 + 6} V ${y0 + drawH - 6} Q ${x0 - spineVis} ${y0 + drawH} ${x0 - spineVis + 5} ${y0 + drawH} H ${x0} Z`}
                fill={theme.edge}
                stroke="#8c8170"
                strokeWidth={1}
              />
              {/* Gefaltete Vorderseite */}
              <path
                d={`M ${x0} ${y0} H ${x0 + drawW - drawR} Q ${x0 + drawW} ${y0} ${x0 + drawW} ${y0 + drawR} V ${y0 + drawH - drawR} Q ${x0 + drawW} ${y0 + drawH} ${x0 + drawW - drawR} ${y0 + drawH} H ${x0} Z`}
                fill={theme.outer}
                stroke="#7a7060"
                strokeWidth={1.2}
                filter="url(#folded-shadow)"
              />
              {/* Umlaufende Absteppnaht */}
              <path
                d={`M ${x0 + 6} ${y0 + 6} H ${x0 + drawW - Math.max(4, drawR - 4)} Q ${x0 + drawW - 6} ${y0 + 6} ${x0 + drawW - 6} ${y0 + Math.max(6, drawR - 2)} V ${y0 + drawH - Math.max(6, drawR - 2)} Q ${x0 + drawW - 6} ${y0 + drawH - 6} ${x0 + drawW - Math.max(4, drawR - 4)} ${y0 + drawH - 6} H ${x0 + 6}`}
                fill="none"
                stroke="#7a7060"
                strokeOpacity="0.45"
                strokeWidth={0.9}
                strokeDasharray="3 2.5"
              />
              {/* Falzlinie */}
              <line x1={x0} y1={y0 + 2} x2={x0} y2={y0 + drawH - 2} stroke="#6a6050" strokeOpacity="0.35" strokeWidth={1} />
              {/* Optionales Verschluss-Detail */}
              {hasSnap ? (
                <g>
                  <rect x={x0 + drawW - 22} y={y0 + drawH / 2 - 11} width={26} height={22} rx={10} fill={theme.inner} stroke="#7a7060" strokeWidth={1} />
                  <circle cx={x0 + drawW - 9} cy={y0 + drawH / 2} r={4.2} fill="#b89860" stroke="#6c5730" strokeWidth={0.9} />
                </g>
              ) : hasZip ? (
                <line
                  x1={x0 + drawW}
                  y1={y0 + drawR}
                  x2={x0 + drawW}
                  y2={y0 + drawH - drawR}
                  stroke="#5c564c"
                  strokeWidth={2.5}
                  strokeDasharray="2 2"
                />
              ) : null}
              {/* Projektname dezent als Webetikett */}
              <rect x={x0 + 16} y={y0 + drawH - 30} width={Math.min(drawW - 32, 118)} height={18} rx={3} fill={theme.inner} fillOpacity={0.86} stroke="#8c8170" strokeOpacity={0.45} strokeWidth={0.8} />
              <text x={x0 + 22} y={y0 + drawH - 18} fontSize={9.5} fill="#4a4640" fontWeight={600}>
                {project.name.slice(0, 18)}
              </text>
              {/* Maßlinien außen */}
              <text x={x0 + drawW / 2} y={y0 - 8} textAnchor="middle" fontSize={10.5} fill="#5e5c57" fontWeight={600}>
                {fmtMm(flapW, unit)}
              </text>
              <text
                x={x0 + drawW + 14}
                y={y0 + drawH / 2}
                textAnchor="middle"
                fontSize={10.5}
                fill="#5e5c57"
                fontWeight={600}
                transform={`rotate(90 ${x0 + drawW + 14} ${y0 + drawH / 2})`}
              >
                {fmtMm(heightMm, unit)}
              </text>
            </svg>
            <div className="folded-caption">{t('folded.front')}</div>
          </div>

          {/* Querschnitt + Kennzahlen */}
          <div className="folded-details">
            <div className="folded-cross">
              <div className="props-group-label" style={{ marginTop: 0 }}>{t('folded.crossSection')}</div>
              <svg width="100%" height={csH} viewBox={`0 0 ${csW} ${csH}`} role="img" aria-label={t('folded.crossSection')}>
                {/* Inneninhalt (Auftrag) */}
                <rect
                  x={leftX + 10}
                  y={cy - fillPx / 2}
                  width={coverLen - 22}
                  height={fillPx}
                  rx={4}
                  fill={statusTone === 'ok' ? '#d8e9de' : statusTone === 'warn' ? '#f6e7c8' : '#f4d6d2'}
                  stroke={statusTone === 'ok' ? '#2a7b4f' : statusTone === 'warn' ? '#a86418' : '#b83228'}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                <text x={leftX + coverLen / 2} y={cy + 3.5} textAnchor="middle" fontSize={9.5} fill="#3d3c39" fontWeight={600}>
                  {t('folded.bulk', { need: fmtMm(bulk.estimatedBulkMm, unit), have: fmtMm(spineWidthMm, unit) })}
                </text>
                {/* U-förmige Außenhülle */}
                <path
                  d={`M ${rightX} ${topY} H ${leftX} C ${leftX - spinePx * 0.55} ${topY} ${leftX - spinePx * 0.55} ${botY} ${leftX} ${botY} H ${rightX}`}
                  fill="none"
                  stroke="#5e5548"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                <path
                  d={`M ${rightX} ${topY} H ${leftX} C ${leftX - spinePx * 0.55} ${topY} ${leftX - spinePx * 0.55} ${botY} ${leftX} ${botY} H ${rightX}`}
                  fill="none"
                  stroke={theme.outer}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="folded-metrics">
              <div className="folded-metric">
                <span>{t('folded.closedSize')}</span>
                <strong>{fmtMm(flapW, unit)} × {fmtMm(heightMm, unit)}</strong>
              </div>
              <div className="folded-metric">
                <span>{t('folded.openSize')}</span>
                <strong>{fmtMm(totalOpenW, unit)} × {fmtMm(heightMm, unit)}</strong>
              </div>
              <div className="folded-metric">
                <span>{t('folded.thickness')}</span>
                <strong>{fmtMm(spineWidthMm, unit)}</strong>
              </div>
              <div className="folded-metric">
                <span>{t('side.left')} / {t('side.right')}</span>
                <strong>
                  {project.modules.filter((m) => m.side === 'left').length} / {project.modules.filter((m) => m.side === 'right').length} Module
                </strong>
              </div>
            </div>

            <div className={`folded-status ${statusTone}`}>
              <Icon name={statusTone === 'ok' ? 'check' : 'alert'} size={14} />
              <span>{statusText}</span>
            </div>

            {showAutoFit ? (
              <Button size="sm" variant="primary" icon="sparkle" block onClick={autoFitSpine}>
                {t('props.spineAuto')} ({fmtMm(needSpine, unit)})
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
