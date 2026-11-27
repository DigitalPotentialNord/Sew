/** Eigenschaftenpanel: Parameter, Position, berechnete Werte — echte Zwei-Wege-Bindung. */
import { Fragment } from 'react';
import { bbox, mm } from '../core/geometry';
import { moduleDef, channelHeight, channelWidth } from '../core/modules';
import { LIMITS } from '../core/practice';
import type { Finding, ModuleTypeId, ParamValue } from '../core/types';
import { useStore } from '../state/store';
import { fmtMm, t } from '../i18n/de';
import { Icon, ModuleIcon } from './icons';
import { Button, Collapsible, EmptyState, NumberField, Segmented, Switch } from './parts/primitives';

export function Properties(): JSX.Element {
  const project = useStore((s) => s.project);
  const c = useStore((s) => s.construction);
  const sel = useStore((s) => s.session.selection);
  const setParam = useStore((s) => s.setParam);
  const setPar = useStore((s) => s.setPar);
  const duplicate = useStore((s) => s.duplicate);
  const moveModule = useStore((s) => s.moveModule);
  const remove = useStore((s) => s.remove);
  const rotate = useStore((s) => s.rotate);
  const select = useStore((s) => s.select);
  const findings = c.findings;

  if (sel.length === 0) {
    return (
      <>
        <div className="pane-head">
          <span className="pane-title">{t('props.title')}</span>
        </div>
        <div className="pane-body">
          <EmptyState icon="sliders" title={t('props.none')} hint={t('props.noneHint')} />
          <BaseProperties />
        </div>
      </>
    );
  }

  if (sel.length > 1) {
    return (
      <>
        <div className="pane-head">
          <span className="pane-title">{t('props.multi', { n: sel.length })}</span>
        </div>
        <div className="pane-body">
          <div style={{ padding: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Button icon="trash" variant="danger" onClick={() => remove(sel)}>
              {t('props.delete')}
            </Button>
            <Button
              icon="lock"
              variant="outline"
              onClick={() =>
                setPar((p) => ({ ...p, modules: p.modules.map((m) => (sel.includes(m.id) ? { ...m, locked: !m.locked } : m)) }))
              }
            >
              Sperren
            </Button>
          </div>
          <p className="hint" style={{ padding: '0 12px 12px' }}>
            {t('props.multiHint')}
          </p>
        </div>
      </>
    );
  }

  const id = sel[0]!;
  const inst = project.modules.find((m) => m.id === id);
  const placed = c.modules.find((m) => m.instanceId === id);
  if (!inst || !placed) {
    return (
      <>
        <div className="pane-head">
          <span className="pane-title">{t('props.title')}</span>
        </div>
        <div className="pane-body">
          <EmptyState title={t('props.none')} />
        </div>
      </>
    );
  }
  const def = moduleDef(inst.typeId as ModuleTypeId);
  const idx = c.modules.filter((m) => m.rowId === placed.rowId).findIndex((m) => m.instanceId === id);
  const modFindings = findings.filter((f) => f.subject.kind === 'module' && f.subject.id === id);

  const groups = new Map<string, typeof def.fields>();
  for (const f of def.fields) {
    const g = f.groupKey ?? 'g.masse';
    const arr = groups.get(g) ?? [];
    groups.set(g, [...arr, f]);
  }

  return (
    <>
      <div className="pane-head">
        <span className="lib-icon" style={{ width: 20, height: 20 }}>
          <ModuleIcon icon={def.icon} size={13} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t(def.nameKey)}
        </span>
        <Button icon="rotate" size="sm" onClick={() => rotate(id)} title={t('canvas.rotate')} />
        <Button icon="copy" size="sm" onClick={() => duplicate(id)} title={t('props.duplicate')} />
        <Button icon="trash" size="sm" variant="danger" onClick={() => remove([id])} title={t('props.delete')} />
      </div>
      <div className="pane-body">
        {modFindings.filter((f) => f.severity !== 'info').length > 0 ? (
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {modFindings
              .filter((f) => f.severity !== 'info')
              .map((f, i) => (
                <InlineFinding key={`${f.ruleId}${i}`} finding={f} />
              ))}
          </div>
        ) : null}

        {[...groups.entries()].map(([gkey, fields]) => (
          <Collapsible key={gkey} title={t(gkey)} defaultOpen>
            {fields.map((f) => {
              const value = inst.params[f.key];
              if (f.derived) {
                const derivedValue = f.key === 'breite' ? channelWidth(inst.params) : f.key === 'hoehe' ? channelHeight(inst.params) : 0;
                return (
                  <NumberField
                    key={f.key}
                    label={t(f.labelKey)}
                    value={derivedValue}
                    min={0}
                    max={600}
                    unit="mm"
                    derived
                    help={t('props.derivedHint')}
                  />
                );
              }
              if (f.kind === 'bool') {
                return <Switch key={f.key} label={t(f.labelKey)} checked={value === true} onChange={(v) => setParam(id, f.key, v)} />;
              }
              if (f.kind === 'enum') {
                return (
                  <Segmented
                    key={f.key}
                    label={t(f.labelKey)}
                    value={String(value)}
                    options={(f.options ?? []).map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                    onChange={(v) => setParam(id, f.key, v)}
                  />
                );
              }
              const numeric = typeof value === 'number' ? value : 0;
              const isLength = f.kind === 'length';
              return (
                <NumberField
                  key={f.key}
                  label={t(f.labelKey)}
                  value={numeric}
                  min={f.min ?? 0}
                  max={f.max ?? 999}
                  step={f.step ?? 1}
                  unit={isLength ? 'mm' : undefined}
                  help={f.helpKey ? t(f.helpKey) : undefined}
                  slider={isLength && (f.max ?? 0) - (f.min ?? 0) > 40}
                  onChange={(v: number) => setParam(id, f.key, v as ParamValue)}
                />
              );
            })}
            {gkey === 'g.berechnet' ? (
              <div className="formula">
                {inst.typeId === 'M06'
                  ? `breite = paare × (stärke + 2 × ${2} mm Nahtluft) + 2 × 5 mm\nhoehe  = nadellaenge + zugabe`
                  : '—'}
              </div>
            ) : null}
          </Collapsible>
        ))}

        <Collapsible title={t('props.position')}>
          <div className="field">
            <span className="field-label">Zeile</span>
            <div className="seg" role="group" aria-label={t('canvas.row')}>
              {project.rows.map((r) => (
                <button
                  key={r.id}
                  aria-pressed={placed.rowId === r.id}
                  onClick={() =>
                    setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, rowId: r.id } : m)) }))
                  }
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          <div className="kv" style={{ marginTop: 8 }}>
            <dt>x</dt>
            <dd>{fmtMm(placed.rect.x)}</dd>
            <dt>y</dt>
            <dd>{fmtMm(placed.rect.y)}</dd>
            <dt>Position</dt>
            <dd>{idx + 1} / {c.modules.filter((m) => m.rowId === placed.rowId).length}</dd>
            <dt>{t('f.breite')} × {t('f.hoehe')}</dt>
            <dd>
              {placed.rect.w} × {placed.rect.h} mm
            </dd>
            <dt>Drehung</dt>
            <dd>{inst.rotation}°</dd>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (idx > 0) moveModule(id, placed.rowId, idx - 1);
              }}
              disabled={idx <= 0}
            >
              ← nach vorn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const countInRow = c.modules.filter((m) => m.rowId === placed.rowId).length;
                if (idx < countInRow - 1) moveModule(id, placed.rowId, idx + 1);
              }}
              disabled={idx >= c.modules.filter((m) => m.rowId === placed.rowId).length - 1}
            >
              nach hinten →
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <Button variant="outline" size="sm" icon={inst.locked ? 'lock' : 'unlock'} onClick={() => setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m)) }))}>
              {inst.locked ? t('canvas.unlock') : t('canvas.lock')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, params: { ...def.defaults }, rotation: 0 } : m)) }));
                select([id]);
              }}
            >
              {t('props.reset')}
            </Button>
          </div>
        </Collapsible>

        <Collapsible title={t('mat.tab.title')} defaultOpen={false}>
          <PiecesForModule moduleId={id} />
        </Collapsible>
      </div>
    </>
  );
}

function InlineFinding({ finding }: { finding: Finding }): JSX.Element {
  const applyFix = useStore((s) => s.applyFindingFix);
  const detailKey = `rule.${finding.ruleId}.detail`;
  const titleKey = `rule.${finding.ruleId}.title`;
  return (
    <div className="finding" style={{ border: '1px solid var(--line)', borderRadius: 6, background: finding.severity === 'error' ? 'var(--error-soft)' : 'var(--warn-soft)' }}>
      <span className={`dot ${finding.severity}`} />
      <div>
        <div className="finding-title">{t(titleKey)}</div>
        <div className="finding-detail">{t(detailKey, finding.values)}</div>
        {finding.fix ? (
          <div className="finding-actions">
            <Button size="sm" variant="outline" onClick={() => applyFix(finding)}>
              {fixLabel(finding)}
            </Button>
            <span className="finding-rule">{finding.ruleId}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function fixLabel(finding: Finding): string {
  const fix = finding.fix;
  if (!fix) return t('fix.repair');
  switch (fix.kind) {
    case 'widenBase':
    case 'growHeight':
    case 'setFabricWidth':
    case 'setCornerRadius':
      return t(`fix.${fix.kind}`, { toMm: Math.round(fix.toMm) });
    case 'setParam':
      return t('fix.setParam', { key: t(paramLabelKey(fix.key)), value: String(fix.value) });
    case 'removeModule':
      return t('fix.removeModule');
    case 'addModule':
      return t('fix.addModule');
    default:
      return t('fix.repair');
  }
}

function paramLabelKey(key: string): string {
  return `f.${key}`;
}

function PiecesForModule({ moduleId }: { moduleId: string }): JSX.Element {
  const pieces = useStore((s) => s.construction.pieces);
  const mine = pieces.filter((p) => p.sourceModuleId === moduleId);
  if (mine.length === 0) return <p className="hint">Kein eigenes Zuschnittteil (nur Längenmaterial).</p>;
  return (
    <div className="kv">
      {mine.map((p) => (
        <Fragment key={p.id}>
          <dt>{t(p.nameKey)}</dt>
          <dd>
            {p.kind === 'length' ? `${p.w} mm` : `${p.w} × ${p.h} mm`} · {p.count}×
          </dd>
        </Fragment>
      ))}
    </div>
  );
}

function BaseProperties(): JSX.Element {
  const project = useStore((s) => s.project);
  const setPar = useStore((s) => s.setPar);
  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      <Collapsible title={t('props.base')}>
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
        <Switch
          label={t('proj.lining')}
          checked={project.base.hasLining}
          onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, hasLining: v } }))}
        />
      </Collapsible>
      <Collapsible title={t('props.settings')} defaultOpen={false}>
        <NumberField
          label={t('proj.seam')}
          value={project.settings.seamAllowanceMm}
          min={4}
          max={20}
          step={1}
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
      </Collapsible>
    </div>
  );
}

export function selectionBBox(p: { modules: { instanceId: string; rect: { x: number; y: number; w: number; h: number } }[]; }, sel: readonly string[]) {
  const rects = p.modules.filter((m) => sel.includes(m.instanceId)).map((m) => ({ x: mm(m.rect.x), y: mm(m.rect.y), w: mm(m.rect.w), h: mm(m.rect.h) }));
  return rects.length ? bbox(rects) : null;
}

export { Icon };
