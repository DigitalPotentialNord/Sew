/** Projektverwaltung: neu, Vorlagen, speichern, öffnen, duplizieren, import, export. */
import { useRef, useState } from 'react';
import { TEMPLATES } from '../core/project';
import { LIMITS } from '../core/practice';
import { useStore } from '../state/store';
import { formatAmount } from '../core/construction';
import { t } from '../i18n/de';
import { downloadText, fileName, timestampForFile } from '../core/export';
import { Button, NumberField, Panel, Segmented, Switch } from './parts/primitives';
import { Icon } from './icons';

export function ProjectView(): JSX.Element {
  const project = useStore((s) => s.project);
  const c = useStore((s) => s.construction);
  const library = useStore((s) => s.library);
  const setPar = useStore((s) => s.setPar);
  const save = useStore((s) => s.save);
  const loadStored = useStore((s) => s.loadStored);
  const removeStored = useStore((s) => s.removeStored);
  const duplicateStored = useStore((s) => s.duplicateStored);
  const loadTemplate = useStore((s) => s.loadTemplate);
  const newProject = useStore((s) => s.newProject);
  const importProject = useStore((s) => s.importProject);
  const exportProject = useStore((s) => s.exportProject);
  const toast = useStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const onImport = async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const res = importProject(raw);
      if (!res.ok && !res.blocked) toast(`${t('toast.importError')}: ${res.message ?? ''}`, 'error');
    } catch {
      toast(t('toast.importError'), 'error');
    }
  };

  return (
    <div className="view-scroll">
      <div className="doc">
        <div className="doc-head">
          <div>
            <h2 className="doc-title">{t('proj.title')}</h2>
            <p className="doc-sub">
              {project.name} · zuletzt gespeichert {new Date(project.updatedAt).toLocaleString('de-DE')}
            </p>
          </div>
          <div className="doc-actions">
            <Button variant="outline" icon="save" onClick={save}>
              {t('proj.save')}
            </Button>
            <Button
              variant="outline"
              icon="download"
              onClick={() => {
                const data = exportProject();
                downloadText(`${fileName(project.name, 'projekt', 'json')}`, 'application/json', JSON.stringify(data, null, 2));
                toast(t('toast.exported'), 'ok');
              }}
            >
              {t('proj.export')}
            </Button>
            <Button variant="outline" icon="upload" onClick={() => fileRef.current?.click()}>
              {t('proj.import')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        <Panel title={t('proj.templates')}>
          <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
            {t('proj.templatesHint')}
          </p>
          <div className="template-grid">
            {TEMPLATES.map((tpl) => {
              const p = tpl.build();
              return (
                <button key={tpl.id} className="template-card" onClick={() => loadTemplate(tpl.id)}>
                  <div className="template-thumb">
                    <TemplateThumb project={p} />
                  </div>
                  <h4>{t(tpl.nameKey)}</h4>
                  <p>{t(tpl.descKey)}</p>
                  <p style={{ marginTop: 6, color: 'var(--ink-3)' }}>{t('tpl.modules', { n: p.modules.length })}</p>
                </button>
              );
            })}
            <button className="template-card" onClick={() => newProject()}>
              <div className="template-thumb" style={{ display: 'grid', placeItems: 'center' }}>
                <Icon name="plus" size={22} />
              </div>
              <h4>{t('proj.blank')}</h4>
              <p>{t('proj.blankDesc')}</p>
            </button>
          </div>
        </Panel>

        <div className="two-col">
          <Panel title={t('proj.base')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input
                className="project-name"
                style={{ border: '1px solid var(--line-strong)', flex: 1 }}
                value={project.name}
                onChange={(e) => setPar((p) => ({ ...p, name: e.target.value }))}
                onBlur={() => {
                  if (!project.name.trim()) {
                    setPar((p) => ({ ...p, name: t('proj.untitled') }), { undoable: false });
                  }
                }}
                aria-label={t('proj.name')}
              />
            </div>
            <NumberField
              label={t('proj.width')}
              value={project.base.widthMm}
              min={LIMITS.baseWidthMm.min}
              max={LIMITS.baseWidthMm.max}
              step={5}
              unit="mm"
              slider
              onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, widthMm: v } }))}
            />
            <NumberField
              label={t('proj.height')}
              value={project.base.heightMm}
              min={LIMITS.baseHeightMm.min}
              max={LIMITS.baseHeightMm.max}
              step={5}
              unit="mm"
              slider
              onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, heightMm: v } }))}
            />
            <NumberField
              label={t('proj.spine')}
              value={project.base.spineWidthMm}
              min={LIMITS.spineWidthMm.min}
              max={LIMITS.spineWidthMm.max}
              step={2}
              unit="mm"
              onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, spineWidthMm: v } }))}
            />
            <NumberField
              label={t('proj.radius')}
              value={project.base.cornerRadiusMm}
              min={LIMITS.cornerRadiusMm.min}
              max={LIMITS.cornerRadiusMm.max}
              step={2}
              unit="mm"
              onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, cornerRadiusMm: v } }))}
            />
            <Switch label={t('proj.lining')} checked={project.base.hasLining} onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, hasLining: v } }))} />
            <NumberField
              label={t('proj.seam')}
              value={project.settings.seamAllowanceMm}
              min={4}
              max={20}
              unit="mm"
              onChange={(v) => setPar((p) => ({ ...p, settings: { ...p.settings, seamAllowanceMm: v } }))}
            />
            <NumberField
              label={t('proj.fabric')}
              value={project.settings.fabricWidthMm}
              min={LIMITS.fabricWidthMm.min}
              max={LIMITS.fabricWidthMm.max}
              step={10}
              unit="mm"
              slider
              onChange={(v) => setPar((p) => ({ ...p, settings: { ...p.settings, fabricWidthMm: v } }))}
            />
            <Segmented
              label={t('proj.unit')}
              value={project.settings.unit}
              options={[
                { value: 'mm', label: 'mm' },
                { value: 'cm', label: 'cm' },
              ]}
              onChange={(v) => setPar((p) => ({ ...p, settings: { ...p.settings, unit: v } }))}
            />
          </Panel>

          <div>
            <Panel title={t('proj.stats')} flush>
              <div className="stat-grid">
                <div className="stat">
                  <div className="stat-label">{t('proj.statsModules')}</div>
                  <div className="stat-value">{c.metrics.moduleCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">{t('proj.statsPieces')}</div>
                  <div className="stat-value">{c.metrics.cutPieceCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">{t('proj.statsArea')}</div>
                  <div className="stat-value">{(c.metrics.fabricAreaM2 * 100).toFixed(1)}</div>
                  <div className="stat-sub">dm²</div>
                </div>
                <div className="stat">
                  <div className="stat-label">{t('proj.statsMeters')}</div>
                  <div className="stat-value">{c.fabricPlan ? c.fabricPlan.meters.toFixed(2).replace('.', ',') : '0'}</div>
                  <div className="stat-sub">m</div>
                </div>
                <div className="stat">
                  <div className="stat-label">{t('proj.statsSeam')}</div>
                  <div className="stat-value">{(c.metrics.seamLengthMm / 1000).toFixed(1).replace('.', ',')}</div>
                  <div className="stat-sub">m</div>
                </div>
                <div className="stat">
                  <div className="stat-label">{t('proj.statsFill')}</div>
                  <div className="stat-value">{c.metrics.channelFillPct}</div>
                  <div className="stat-sub">%</div>
                </div>
              </div>
            </Panel>
            <Panel title="Technisch">
              <div className="kv">
                <dt>{t('proj.hash')}</dt>
                <dd className="mono">{c.projectHash}</dd>
                <dt>{t('proj.practice')}</dt>
                <dd className="mono">{c.practiceVersion}</dd>
                <dt>Schema</dt>
                <dd className="mono">v{project.schemaVersion}</dd>
                <dt>{t('proj.statsPiecesTotal')}</dt>
                <dd>{c.metrics.pieceCount}</dd>
                <dt>Fehler / Hinweise</dt>
                <dd>
                  {c.metrics.errorCount} / {c.metrics.warnCount}
                </dd>
              </div>
            </Panel>
          </div>
        </div>

        <Panel title={t('proj.myProjects')} flush>
          {library.length === 0 ? (
            <p className="hint" style={{ padding: 14, margin: 0 }}>
              {t('proj.noProjects')}
            </p>
          ) : (
            <div className="table-scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Gespeichert</th>
                    <th style={{ textAlign: 'right' }}>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {library.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td style={{ color: 'var(--ink-2)' }}>{new Date(s.updatedAt).toLocaleString('de-DE')}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button size="sm" variant="outline" onClick={() => loadStored(s.id)}>
                          {t('proj.open')}
                        </Button>{' '}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateStored(s.id)}
                        >
                          {t('proj.duplicate')}
                        </Button>{' '}
                        {confirmId === s.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                removeStored(s.id);
                                setConfirmId(null);
                              }}
                            >
                              {t('proj.confirmDelete')}
                            </Button>
                            <Button size="sm" onClick={() => setConfirmId(null)}>
                              ✕
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirmId(s.id)} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <p className="hint">
          Alle Projekte liegen ausschließlich in diesem Browser (localStorage). Keine Konten, keine Server, kein Tracking. Export als JSON
          sichert dich ab.
        </p>
        <p className="hint" style={{ marginTop: 4 }}>
          Dateiname-Konvention: <span className="mono">{fileName(project.name, 'schnittmuster', 'pdf')}</span> · Stand{' '}
          <span className="mono">{timestampForFile(new Date())}</span> · {formatAmount(project.settings.fabricWidthMm, 'mm')} Stoffbreite
        </p>
      </div>
    </div>
  );
}

function TemplateThumb({ project }: { project: { base: { widthMm: number; heightMm: number; spineWidthMm: number }; modules: readonly { typeId: string }[] } }): JSX.Element {
  const halfW = project.base.widthMm;
  const spine = project.base.spineWidthMm || 0;
  const w = 2 * halfW + spine;
  const h = project.base.heightMm;
  const s = Math.min(228 / w, 60 / h);
  const rows = Math.min(3, Math.max(1, Math.ceil(project.modules.length / 3)));
  return (
    <svg width={w * s} height={h * s} viewBox={`0 0 ${w} ${h}`} style={{ margin: '4px auto', display: 'block', maxWidth: '100%' }} aria-hidden="true">
      <rect x={0} y={0} width={w} height={h} rx={8} fill="#fff" stroke="var(--ink-3)" strokeWidth={1.2} />
      {spine > 0 ? <rect x={halfW} y={1} width={spine} height={h - 2} fill="var(--surface-3)" /> : null}
      <line x1={halfW} y1={2} x2={halfW} y2={h - 2} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="3 2" />
      <line x1={halfW + spine} y1={2} x2={halfW + spine} y2={h - 2} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="3 2" />
      {project.modules.slice(0, 9).map((_m, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cellW = (halfW - 16) / 3;
        const cellH = (h - 12) / rows - 4;
        return (
          <rect
            key={i}
            x={8 + col * (cellW + 2)}
            y={6 + row * (cellH + 4)}
            width={cellW}
            height={Math.max(4, cellH)}
            rx={2}
            fill="var(--surface-3)"
            stroke="var(--line-strong)"
            strokeWidth={0.8}
          />
        );
      })}
    </svg>
  );
}
