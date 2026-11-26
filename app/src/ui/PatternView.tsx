/** Schnittmuster: echte Teile aus der Konstruktion, SVG- und PDF-Export, A4-Aufteilung. */
import { roundedRectPath, type Mm } from '../core/geometry';
import { downloadText, fileName, tilePiece, timestampForFile, toSvg, totalPages } from '../core/export';
import { useStore } from '../state/store';
import { t } from '../i18n/de';
import { Icon } from './icons';
import { Button, Panel } from './parts/primitives';

export function PatternView({ onPrint, onPrintInstructions }: { onPrint: () => void; onPrintInstructions: () => void }): JSX.Element {
  const c = useStore((s) => s.construction);
  const project = useStore((s) => s.project);
  const toast = useStore((s) => s.toast);
  const cut = c.pieces.filter((p) => p.kind === 'cut');
  const errors = c.findings.filter((f) => f.severity === 'error');

  const exportSvg = (): void => {
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
              {t('pattern.pieces', { n: cut.length })} · {t('pattern.pages', { n: totalPages(c) })}
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

        {errors.length > 0 ? (
          <div
            className="panel"
            style={{ borderColor: 'var(--error)', background: 'var(--error-soft)', padding: 14, display: 'flex', gap: 10, alignItems: 'center' }}
            role="alert"
          >
            <Icon name="error" size={18} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--error)' }}>{t('pattern.blocked', { n: errors.length })}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t(`rule.${errors[0]!.ruleId}.detail`, errors[0]!.values)}</div>
            </div>
          </div>
        ) : (
          <div
            className="panel"
            style={{ borderColor: 'var(--ok)', background: 'var(--ok-soft)', padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}
          >
            <Icon name="check" size={14} />
            {t('pattern.ready')} · {c.metrics.cutPieceCount} Schnittteile · {Math.round(c.metrics.seamLengthMm / 10) / 100} m Naht
          </div>
        )}

        <Panel title={t('pattern.calibration')}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <svg width={120} height={120} viewBox="0 0 50 50" style={{ border: '1px solid var(--ink)', flex: 'none' }} role="img" aria-label="50 mm Kalibrierquadrat">
              <path d="M0,0 h50 v50 h-50 Z" fill="none" stroke="var(--ink)" strokeWidth={0.4} />
              <path d="M0,0 L50,50 M50,0 L0,50" stroke="var(--line-strong)" strokeWidth={0.2} />
            </svg>
            <p className="hint" style={{ maxWidth: 420, margin: 0 }}>
              {t('pattern.calibrationHint')}
            </p>
          </div>
        </Panel>

        <Panel title={t('pattern.tile')} flush>
          <table className="data">
            <thead>
              <tr>
                <th>Teil</th>
                <th style={{ textAlign: 'right' }}>Maße (mm)</th>
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
                      {p.w} × {p.h}
                    </td>
                    <td className="num" style={{ color: 'var(--ink-3)' }}>
                      {p.netW} × {p.netH}
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
        </Panel>

        <div className="piece-grid">
          {cut.map((p) => {
            const maxW = 200;
            const maxH = 130;
            const s = Math.min(maxW / Math.max(1, p.w), maxH / Math.max(1, p.h));
            return (
              <div className="piece-card" key={p.id}>
                <div className="piece-card-head">
                  <span className="piece-card-name">{t(p.nameKey)}</span>
                  <span className="badge solid">{p.count}×</span>
                </div>
                <div className="piece-card-svg">
                  <svg width={Math.max(20, p.w * s)} height={Math.max(20, p.h * s)} viewBox={`0 0 ${p.w} ${p.h}`} role="img" aria-label={t(p.nameKey)}>
                    <path d={roundedRectPath({ x: 0 as Mm, y: 0 as Mm, w: p.w, h: p.h }, Math.min(p.radius * s, 6))} fill="#fff" stroke="var(--ink)" strokeWidth={Math.max(0.4, 1 / s)} />
                    <path
                      d={roundedRectPath({ x: ((p.w - p.netW) / 2) as Mm, y: (p.h - p.netH - (p.h - p.netH) / 2) as Mm, w: p.netW, h: p.netH }, 0)}
                      fill="none"
                      stroke="var(--ink-3)"
                      strokeWidth={Math.max(0.3, 0.8 / s)}
                      strokeDasharray={`${4 / s} ${3 / s}`}
                    />
                    <path d={`M${p.w / 2},${3 / s} V${p.h - 3 / s}`} stroke="var(--ink-2)" strokeWidth={Math.max(0.3, 0.8 / s)} />
                    <path
                      d={`M${p.w / 2 - 3 / s},${8 / s} L${p.w / 2},${3 / s} L${p.w / 2 + 3 / s},${8 / s}`}
                      fill="none"
                      stroke="var(--ink-2)"
                      strokeWidth={Math.max(0.3, 0.8 / s)}
                    />
                  </svg>
                </div>
                <div className="piece-card-meta">
                  <span>
                    {p.w} × {p.h} mm
                  </span>
                  <span>{t(`mat.${p.material}`)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <Button variant="outline" icon="printer" onClick={onPrintInstructions}>
            {t('instr.print')}
          </Button>
          <Button
            variant="outline"
            icon="download"
            onClick={() => {
              downloadText(fileName(project.name, 'projekt', 'json'), 'application/json', JSON.stringify({ format: 'organizer-studio/project', schemaVersion: 2, exportedAt: new Date().toISOString(), appVersion: '0.1.0', project }, null, 2));
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
