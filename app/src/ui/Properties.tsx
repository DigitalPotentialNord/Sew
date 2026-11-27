/**
 * Kontextuelle Eigenschaften — kompakt, nur was zum gewählten Modul gehört.
 *
 * Kein dauerhaftes großes Technikpanel: Primärwerte (Größe/Anzahl) oben,
 * Position und Material darunter, Fortgeschrittenes eingeklappt unter
 * „Weitere Einstellungen". Maße/Position Details nur im Expertenmodus.
 *
 * Echte Zwei-Wege-Bindung: jeder Regler schreibt in den Projekt-Stand.
 */
import { mm } from '../core/geometry';
import { moduleDef, channelHeight, channelWidth } from '../core/modules';
import { LIMITS } from '../core/practice';
import type { Finding, ModuleTypeId, ParamValue } from '../core/types';
import type { Side } from '../core/construction';
import { useStore } from '../state/store';
import { fmtMm, t } from '../i18n/de';
import { Icon, ModuleIcon } from './icons';
import { Button, Collapsible, EmptyState, NumberField, Segmented, Switch } from './parts/primitives';

/** Felder, die selten gebraucht werden — landen unter „Weitere Einstellungen".
 *  Größe, Anzahl, Nadel- und Gegenstandsmaße bleiben primär (oben sichtbar),
 *  ebenso die ABGELEITETEN Werte: sie sind Lesetext, den man sehen will. */
const ADVANCED_KEYS = new Set([
  'steg', 'zugabe', 'verstaerkung', 'schraege', 'mitZug', 'mitKnopf',
  'saumbreite', 'lochAbstand', 'polsterung', 'ueberlappung',
]);

export function Properties(): JSX.Element {
  const project = useStore((s) => s.project);
  const c = useStore((s) => s.construction);
  const sel = useStore((s) => s.session.selection);
  const expert = useStore((s) => s.session.mode === 'expert');
  const setParam = useStore((s) => s.setParam);
  const setPar = useStore((s) => s.setPar);
  const moveToSide = useStore((s) => s.moveToSide);
  const duplicate = useStore((s) => s.duplicate);
  const remove = useStore((s) => s.remove);
  const rotate = useStore((s) => s.rotate);
  const select = useStore((s) => s.select);
  const findings = c.findings;

  if (sel.length === 0) {
    return (
      <>
        <div className="props-compact-head">
          <span className="pane-title">{t('props.title')}</span>
        </div>
        <div className="props-compact-body">
          <EmptyState icon="sliders" title={t('props.none')} hint={t('props.noneHint')} />
          <BaseProperties />
        </div>
      </>
    );
  }

  if (sel.length > 1) {
    return (
      <>
        <div className="props-compact-head">
          <span className="props-compact-title">{t('props.multi', { n: sel.length })}</span>
        </div>
        <div className="props-compact-body">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Button icon="trash" variant="danger" onClick={() => remove(sel)}>{t('props.delete')}</Button>
            <Button icon="lock" variant="outline" onClick={() => setPar((p) => ({ ...p, modules: p.modules.map((m) => (sel.includes(m.id) ? { ...m, locked: !m.locked } : m)) }))}>Sperren</Button>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>{t('props.multiHint')}</p>
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
        <div className="props-compact-head"><span className="pane-title">{t('props.title')}</span></div>
        <div className="props-compact-body"><EmptyState title={t('props.none')} /></div>
      </>
    );
  }
  const def = moduleDef(inst.typeId as ModuleTypeId);
  const idx = c.modules.filter((m) => m.rowId === placed.rowId).findIndex((m) => m.instanceId === id);
  const modFindings = findings.filter((f) => f.subject.kind === 'module' && f.subject.id === id);

  // Felder nach Gruppe ordnen; Primärwerte oben, Fortgeschrittenes eingeklappt.
  // ABGELEITETE Felder bleiben primär (sie sind Lesetext, z. B. die berechnete
  // Kanalbreite bei M06 — der Nutzer sieht sie sich verändern).
  const groups = new Map<string, typeof def.fields>();
  for (const f of def.fields) {
    const g = f.groupKey ?? 'g.masse';
    groups.set(g, [...(groups.get(g) ?? []), f]);
  }
  const primaryGroups = [...groups.entries()]
    .map(([g, fs]) => [g, fs.filter((f) => !ADVANCED_KEYS.has(f.key))] as const)
    .filter(([, fs]) => fs.length > 0);
  const advancedFields = def.fields.filter((f) => ADVANCED_KEYS.has(f.key));

  const swapped = inst.rotation % 180 === 90;
  const rotateHint = swapped ? t('props.rotHint90', { deg: String(inst.rotation) }) : inst.rotation === 180 ? t('props.rotHint180') : null;
  // Bei 90°/270° belegt das Feld „Breite“ die vertikale Richtung und umgekehrt —
  // Beschriftung getauscht (+ Gradzahl), Werte bleiben die Konstruktions-Parameter.
  const fieldLabel = (f: (typeof def.fields)[number]): string => {
    if (swapped && f.key === 'breite') return `${t('f.hoehe')} (${inst.rotation}°)`;
    if (swapped && f.key === 'hoehe') return `${t('f.breite')} (${inst.rotation}°)`;
    return t(f.labelKey);
  };

  const renderField = (f: (typeof def.fields)[number]): JSX.Element => {
    const value = inst.params[f.key];
    if (f.derived) {
      const derivedValue = f.key === 'breite' ? channelWidth(inst.params) : f.key === 'hoehe' ? channelHeight(inst.params) : 0;
      return <NumberField key={f.key} label={fieldLabel(f)} value={derivedValue} min={0} max={600} unit="mm" derived help={t('props.derivedHint')} />;
    }
    if (f.kind === 'bool') {
      return <Switch key={f.key} label={fieldLabel(f)} checked={value === true} onChange={(v) => setParam(id, f.key, v)} />;
    }
    if (f.kind === 'enum') {
      return (
        <Segmented key={f.key} label={fieldLabel(f)} value={String(value)} options={(f.options ?? []).map((o) => ({ value: o.value, label: t(o.labelKey) }))} onChange={(v) => setParam(id, f.key, v)} />
      );
    }
    const numeric = typeof value === 'number' ? value : 0;
    const isLength = f.kind === 'length';
    return (
      <NumberField
        key={f.key}
        label={fieldLabel(f)}
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
  };

  return (
    <>
      <div className="props-compact-head">
        <span className="lib-icon" style={{ width: 24, height: 24 }}>
          <ModuleIcon icon={def.icon} size={14} />
        </span>
        <span className="props-compact-title">{t(def.nameKey)}</span>
        <Button icon="rotate" size="sm" onClick={() => rotate(id)} title={t('canvas.rotate')} ariaLabel={t('canvas.rotate')} />
        <Button icon="copy" size="sm" onClick={() => duplicate(id)} title={t('props.duplicate')} ariaLabel={t('props.duplicate')} />
        <Button icon="trash" size="sm" variant="danger" onClick={() => remove([id])} title={t('props.delete')} ariaLabel={t('props.delete')} />
      </div>
      <div className="props-compact-body">
        {modFindings.filter((f) => f.severity !== 'info').length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--s3)' }}>
            {modFindings.filter((f) => f.severity !== 'info').map((f, i) => <InlineFinding key={`${f.ruleId}${i}`} finding={f} />)}
          </div>
        ) : null}

        {rotateHint ? (
          <p className="hint" role="status" style={{ margin: '0 0 var(--s2)', padding: '6px 8px', border: '1px solid var(--line-strong)', borderRadius: 6, background: 'var(--warn-soft)' }}>
            {rotateHint}
          </p>
        ) : null}

        {/* Primärwerte: Größe / Anzahl */}
        {primaryGroups.map(([gkey, fields]) => (
          <div key={gkey}>
            <div className="props-group-label">{t(gkey)}</div>
            {fields.map(renderField)}
          </div>
        ))}

        {/* Position: Innenfläche + Zeile — die produktorientierte Anfrage. */}
        <div className="props-group-label">{t('props.position2')}</div>
        <div className="field">
          <span className="field-label">{t('side.label')}</span>
          <div className="side-seg" role="group" aria-label={t('side.label')}>
            <button aria-pressed={inst.side === 'left'} onClick={() => moveToSide(id, 'left' as Side)}>{t('side.left')}</button>
            <button aria-pressed={inst.side === 'right'} onClick={() => moveToSide(id, 'right' as Side)}>{t('side.right')}</button>
          </div>
          <p className="hint">{t('side.hint')}</p>
        </div>
        <div className="field">
          <span className="field-label">{t('canvas.row')}</span>
          <div className="seg" role="group" aria-label={t('canvas.row')}>
            {project.rows.map((r) => (
              <button key={r.id} aria-pressed={placed.rowId === r.id} onClick={() => setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, rowId: r.id } : m)) }))}>{r.name}</button>
            ))}
          </div>
        </div>
        {expert ? (
          <div className="kv" style={{ marginTop: 8 }}>
            <dt>x</dt><dd>{fmtMm(placed.rect.x)}</dd>
            <dt>y</dt><dd>{fmtMm(placed.rect.y)}</dd>
            <dt>{t('f.breite')} × {t('f.hoehe')}</dt><dd>{placed.rect.w} × {placed.rect.h} mm</dd>
            <dt>{t('canvas.rotate')}</dt><dd>{inst.rotation}°</dd>
            <dt>Pos</dt><dd>{idx + 1} / {c.modules.filter((m) => m.rowId === placed.rowId).length}</dd>
          </div>
        ) : null}

        {/* Material: was dieses Modul an Schnittteilen bringt (Lesetext). */}
        <div className="props-group-label">{t('props.material')}</div>
        <PiecesForModule moduleId={id} />

        {/* Fortgeschrittene Werte — eingeklappt, bis sie gebraucht werden. */}
        {advancedFields.length > 0 ? (
          <Collapsible title={t('props.advanced')} defaultOpen={false}>
            <p className="hint" style={{ marginTop: 0 }}>{t('props.advancedHint')}</p>
            {advancedFields.map(renderField)}
            {inst.typeId === 'M06' ? (
              <div className="formula">{'breite = paare × (stärke + 2 × 2 mm Nahtluft) + 2 × 5 mm\nhoehe  = nadellaenge + zugabe'}</div>
            ) : null}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <Button variant="outline" size="sm" icon={inst.locked ? 'lock' : 'unlock'} onClick={() => setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m)) }))}>
                {inst.locked ? t('canvas.unlock') : t('canvas.lock')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, params: { ...def.defaults }, rotation: 0 } : m)) })); select([id]); }}>{t('props.reset')}</Button>
            </div>
          </Collapsible>
        ) : null}
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
            <Button size="sm" variant="outline" onClick={() => applyFix(finding)}>{fixLabel(finding)}</Button>
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
        <>
          <dt key={`${p.id}-n`}>{t(p.nameKey)}</dt>
          <dd key={`${p.id}-v`}>{p.kind === 'length' ? `${p.w} mm` : `${p.w} × ${p.h} mm`} · {p.count}×</dd>
        </>
      ))}
    </div>
  );
}

function BaseProperties(): JSX.Element {
  const project = useStore((s) => s.project);
  const setPar = useStore((s) => s.setPar);
  return (
    <div style={{ borderTop: '1px solid var(--line)', marginTop: 'var(--s4)', paddingTop: 'var(--s3)' }}>
      <Collapsible title={t('props.base')}>
        <NumberField label={t('proj.width')} value={project.base.widthMm} min={LIMITS.baseWidthMm.min} max={LIMITS.baseWidthMm.max} step={5} unit="mm" slider onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, widthMm: v } }))} />
        <NumberField label={t('proj.height')} value={project.base.heightMm} min={LIMITS.baseHeightMm.min} max={LIMITS.baseHeightMm.max} step={5} unit="mm" slider onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, heightMm: v } }))} />
        <NumberField label={t('proj.spine')} value={project.base.spineWidthMm} min={LIMITS.spineWidthMm.min} max={LIMITS.spineWidthMm.max} step={2} unit="mm" onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, spineWidthMm: v } }))} />
        <NumberField label={t('proj.radius')} value={project.base.cornerRadiusMm} min={LIMITS.cornerRadiusMm.min} max={LIMITS.cornerRadiusMm.max} step={2} unit="mm" onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, cornerRadiusMm: v } }))} />
        <Switch label={t('proj.lining')} checked={project.base.hasLining} onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, hasLining: v } }))} />
      </Collapsible>
      <Collapsible title={t('props.settings')} defaultOpen={false}>
        <NumberField label={t('proj.seam')} value={project.settings.seamAllowanceMm} min={4} max={20} step={1} unit="mm" onChange={(v) => setPar((p) => ({ ...p, settings: { ...p.settings, seamAllowanceMm: v } }))} />
        <NumberField label={t('proj.fabric')} value={project.settings.fabricWidthMm} min={LIMITS.fabricWidthMm.min} max={LIMITS.fabricWidthMm.max} step={10} unit="mm" onChange={(v) => setPar((p) => ({ ...p, settings: { ...p.settings, fabricWidthMm: v } }))} />
      </Collapsible>
    </div>
  );
}

export function selectionBBox(p: { modules: { instanceId: string; rect: { x: number; y: number; w: number; h: number } }[]; }, sel: readonly string[]) {
  const rects = p.modules.filter((m) => sel.includes(m.instanceId)).map((m) => ({ x: mm(m.rect.x), y: mm(m.rect.y), w: mm(m.rect.w), h: mm(m.rect.h) }));
  // bbox wird hier nicht mehr gebraucht (die Canvas berechnet ihre eigene), aber
  // die Signatur bleibt, um bestehende Importe nicht zu brechen.
  return rects.length ? rects : null;
}

export { Icon };
