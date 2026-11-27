/**
 * Kontextuelle Eigenschaften — kompakt, nur was zum gewählten Modul gehört.
 *
 * Kein dauerhaftes großes Technikpanel: Primärwerte (Größe/Anzahl) oben,
 * Position und Material darunter, Fortgeschrittenes eingeklappt unter
 * „Weitere Einstellungen". Maße/Position Details nur im Expertenmodus.
 *
 * Echte Zwei-Wege-Bindung: jeder Regler schreibt in den Projekt-Stand.
 */
import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { computeSpineBulk } from '../core/evaluation';
import { mm } from '../core/geometry';
import { moduleDef, channelHeight, channelWidth } from '../core/modules';
import { suggestRepairMove } from '../core/placement';
import { LIMITS } from '../core/practice';
import type { Finding, ModuleTypeId, ParamValue } from '../core/types';
import type { Side } from '../core/construction';
import { useStore, type FabricThemeId } from '../state/store';
import { fmtMm, t } from '../i18n/de';
import { Icon, ModuleIcon } from './icons';
import { Button, Collapsible, EmptyState, NumberField, Segmented, Switch } from './parts/primitives';

export const FABRIC_THEMES: readonly {
  readonly id: FabricThemeId;
  readonly labelKey: string;
  readonly outer: string;
  readonly inner: string;
  readonly edge: string;
  readonly swatch: string;
}[] = [
  { id: 'linen', labelKey: 'props.theme.linen', outer: '#efe8db', inner: '#f7f3eb', edge: '#d5c9b5', swatch: '#dfd4c0' },
  { id: 'sage', labelKey: 'props.theme.sage', outer: '#dce4da', inner: '#eef3ed', edge: '#b5c4b2', swatch: '#a7bc9f' },
  { id: 'terracotta', labelKey: 'props.theme.terracotta', outer: '#ead8ce', inner: '#f7eee9', edge: '#cfa996', swatch: '#c9886b' },
  { id: 'navy', labelKey: 'props.theme.navy', outer: '#d5dde7', inner: '#eaf0f6', edge: '#a6b6c9', swatch: '#526b8c' },
  { id: 'rose', labelKey: 'props.theme.rose', outer: '#ebdcdc', inner: '#f7efef', edge: '#cfb5b6', swatch: '#c9979a' },
  { id: 'charcoal', labelKey: 'props.theme.charcoal', outer: '#dadcd9', inner: '#eceeed', edge: '#b0b5b1', swatch: '#61676a' },
];

const BASE_PRESETS: readonly { readonly id: string; readonly labelKey: string; readonly w: number; readonly h: number }[] = [
  { id: 'compact', labelKey: 'props.preset.compact', w: 180, h: 150 },
  { id: 'classic', labelKey: 'props.preset.classic', w: 240, h: 200 },
  { id: 'large', labelKey: 'props.preset.large', w: 280, h: 240 },
  { id: 'long', labelKey: 'props.preset.long', w: 240, h: 330 },
];

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
  const relocate = useStore((s) => s.relocate);
  const relocateToBest = useStore((s) => s.relocateToBest);
  const reorderInRow = useStore((s) => s.reorderInRow);
  const batchMoveToSide = useStore((s) => s.batchMoveToSide);
  const batchMoveToRow = useStore((s) => s.batchMoveToRow);
  const batchSetLocked = useStore((s) => s.batchSetLocked);
  const batchDuplicate = useStore((s) => s.batchDuplicate);
  const duplicate = useStore((s) => s.duplicate);
  const remove = useStore((s) => s.remove);
  const rotate = useStore((s) => s.rotate);
  const select = useStore((s) => s.select);
  const findings = c.findings;
  const unit = project.settings.unit;

  const singleId = sel.length === 1 ? sel[0] : undefined;
  const repairSuggestion = useMemo(() => {
    if (!singleId) return null;
    return suggestRepairMove(project, singleId, c);
  }, [project, singleId, c]);

  if (sel.length === 0) {
    return (
      <>
        <div className="props-compact-head">
          <span className="pane-title">{t('props.title')}</span>
        </div>
        <div className="props-compact-body">
          <EmptyState icon="sliders" title={t('props.none')} hint={t('props.noneHint')} />
          <RowStructureManager />
          <BaseProperties />
        </div>
      </>
    );
  }

  if (sel.length > 1) {
    const anyUnlocked = sel.some((mid) => !project.modules.find((m) => m.id === mid)?.locked);
    return (
      <>
        <div className="props-compact-head">
          <Button icon="arrowLeft" size="sm" onClick={() => select([])} title={t('props.clearSel')} ariaLabel={t('props.clearSel')} />
          <span className="props-compact-title">{t('props.multi', { n: sel.length })}</span>
        </div>
        <div className="props-compact-body">
          <div className="props-group-label">{t('side.label')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <Button size="sm" variant="outline" onClick={() => batchMoveToSide(sel, 'left')}>{t('props.batchLeft')}</Button>
            <Button size="sm" variant="outline" onClick={() => batchMoveToSide(sel, 'right')}>{t('props.batchRight')}</Button>
          </div>
          <div className="props-group-label">{t('props.batchRow')}</div>
          <div className="seg" role="group" aria-label={t('props.batchRow')} style={{ marginBottom: 10 }}>
            {project.rows.map((r) => (
              <button key={r.id} type="button" onClick={() => batchMoveToRow(sel, r.id)}>
                {r.name}
              </button>
            ))}
          </div>
          <div className="props-group-label">{t('props.actions')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Button size="sm" variant="outline" icon="copy" onClick={() => batchDuplicate(sel)}>{t('props.batchDup')}</Button>
            <Button size="sm" variant="outline" icon={anyUnlocked ? 'lock' : 'unlock'} onClick={() => batchSetLocked(sel, anyUnlocked)}>
              {anyUnlocked ? t('props.batchLock') : t('props.batchUnlock')}
            </Button>
            <Button size="sm" icon="trash" variant="danger" onClick={() => remove(sel)}>{t('props.delete')}</Button>
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
  const sameSlot = project.modules.filter((m) => m.rowId === inst.rowId && m.side === inst.side);
  const slotIdx = sameSlot.findIndex((m) => m.id === id);
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
      return <NumberField key={f.key} label={fieldLabel(f)} value={derivedValue} min={0} max={600} unit="mm" displayUnit={unit} derived help={t('props.derivedHint')} />;
    }
    if (f.kind === 'bool') {
      return <Switch key={f.key} label={fieldLabel(f)} checked={value === true} disabled={inst.locked} onChange={(v) => setParam(id, f.key, v)} />;
    }
    if (f.kind === 'enum') {
      return (
        <Segmented key={f.key} label={fieldLabel(f)} value={String(value)} disabled={inst.locked} options={(f.options ?? []).map((o) => ({ value: o.value, label: t(o.labelKey) }))} onChange={(v) => setParam(id, f.key, v)} />
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
        displayUnit={isLength ? unit : 'mm'}
        help={f.helpKey ? t(f.helpKey) : undefined}
        slider={isLength && (f.max ?? 0) - (f.min ?? 0) > 40}
        disabled={inst.locked}
        onChange={(v: number) => setParam(id, f.key, v as ParamValue)}
      />
    );
  };

  return (
    <>
      <div className="props-compact-head">
        <Button icon="arrowLeft" size="sm" onClick={() => select([])} title={t('props.backToBase')} ariaLabel={t('props.backToBase')} />
        <span className="lib-icon" style={{ width: 24, height: 24 }}>
          <ModuleIcon icon={def.icon} size={14} />
        </span>
        <span className="props-compact-title">{t(def.nameKey)}</span>
        <Button icon="rotate" size="sm" onClick={() => rotate(id)} disabled={inst.locked} title={t('canvas.rotate')} ariaLabel={t('canvas.rotate')} />
        <Button icon="copy" size="sm" onClick={() => duplicate(id)} title={t('props.duplicate')} ariaLabel={t('props.duplicate')} />
        <Button icon="trash" size="sm" variant="danger" onClick={() => remove([id])} disabled={inst.locked} title={t('props.delete')} ariaLabel={t('props.delete')} />
      </div>
      <div className="props-compact-body">
        {inst.locked ? (
          <div className="locked-banner" role="status">
            <Icon name="lock" size={13} />
            <span style={{ flex: 1 }}>{t('place.lockedBlocked')}</span>
            <Button
              size="sm"
              variant="outline"
              icon="unlock"
              onClick={() => setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, locked: false } : m)) }))}
            >
              {t('canvas.unlock')}
            </Button>
          </div>
        ) : null}

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

        {/* Position: Innenfläche + Zeile — über die strenge Platzierungs-Engine */}
        <div className="props-group-label">{t('props.position2')}</div>
        <div className="field">
          <span className="field-label">{t('side.label')}</span>
          <div className="side-seg" role="group" aria-label={t('side.label')}>
            <button
              type="button"
              aria-pressed={inst.side === 'left'}
              disabled={inst.locked}
              onClick={() => {
                const cnt = project.modules.filter((m) => m.rowId === inst.rowId && m.side === 'left' && m.id !== id).length;
                relocate(id, { side: 'left' as Side, rowId: inst.rowId, index: cnt });
              }}
            >
              {t('side.left')}
            </button>
            <button
              type="button"
              aria-pressed={inst.side === 'right'}
              disabled={inst.locked}
              onClick={() => {
                const cnt = project.modules.filter((m) => m.rowId === inst.rowId && m.side === 'right' && m.id !== id).length;
                relocate(id, { side: 'right' as Side, rowId: inst.rowId, index: cnt });
              }}
            >
              {t('side.right')}
            </button>
          </div>
          <p className="hint">{t('side.hint')}</p>
        </div>
        <div className="field">
          <span className="field-label">{t('canvas.row')}</span>
          <div className="seg" role="group" aria-label={t('canvas.row')}>
            {project.rows.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={placed.rowId === r.id}
                disabled={inst.locked}
                onClick={() => {
                  const cnt = project.modules.filter((m) => m.rowId === r.id && m.side === inst.side && m.id !== id).length;
                  relocate(id, { side: inst.side, rowId: r.id, index: cnt });
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
        {sameSlot.length > 1 ? (
          <div className="field">
            <span className="field-label">{t('props.order')} ({slotIdx + 1} / {sameSlot.length})</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button
                size="sm"
                variant="outline"
                icon="arrowLeft"
                block
                disabled={inst.locked || slotIdx <= 0}
                onClick={() => void reorderInRow(id, -1)}
              >
                {t('props.moveEarlier')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon="arrowRight"
                block
                disabled={inst.locked || slotIdx >= sameSlot.length - 1}
                onClick={() => void reorderInRow(id, 1)}
              >
                {t('props.moveLater')}
              </Button>
            </div>
          </div>
        ) : null}
        {repairSuggestion && !inst.locked ? (
          <div style={{ marginBottom: 10 }}>
            <Button size="sm" variant="outline" icon="sparkle" block onClick={() => void relocateToBest(id)}>
              {t('place.moveToBest')}
            </Button>
          </div>
        ) : null}
        {expert ? (
          <div className="kv" style={{ marginTop: 8 }}>
            <dt>x</dt><dd>{fmtMm(placed.rect.x, unit)}</dd>
            <dt>y</dt><dd>{fmtMm(placed.rect.y, unit)}</dd>
            <dt>{t('f.breite')} × {t('f.hoehe')}</dt><dd>{fmtMm(placed.rect.w, unit)} × {fmtMm(placed.rect.h, unit)}</dd>
            <dt>{t('canvas.rotate')}</dt><dd>{inst.rotation}°</dd>
            <dt>Pos</dt><dd>{idx + 1} / {c.modules.filter((m) => m.rowId === placed.rowId).length}</dd>
          </div>
        ) : null}

        {/* Material: was dieses Modul an Schnittteilen bringt (Lesetext). */}
        <div className="props-group-label">{t('props.material')}</div>
        <PiecesForModule moduleId={id} />

        {/* Aktionen: immer erreichbar für alle 16 Module */}
        <div className="props-group-label">{t('props.actions')}</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <Button
            variant="outline"
            size="sm"
            block
            icon={inst.locked ? 'unlock' : 'lock'}
            onClick={() => setPar((p) => ({ ...p, modules: p.modules.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m)) }))}
          >
            {inst.locked ? t('canvas.unlock') : t('canvas.lock')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            block
            icon="reset"
            disabled={inst.locked}
            onClick={() => {
              setPar((p) => ({
                ...p,
                modules: p.modules.map((m) => (m.id === id ? { ...m, params: { ...def.defaults }, rotation: 0 } : m)),
              }));
              select([id]);
            }}
          >
            {t('props.reset')}
          </Button>
        </div>

        {/* Fortgeschrittene Werte — eingeklappt, bis sie gebraucht werden. */}
        {advancedFields.length > 0 ? (
          <Collapsible title={t('props.advanced')} defaultOpen={false}>
            <p className="hint" style={{ marginTop: 0 }}>{t('props.advancedHint')}</p>
            {advancedFields.map(renderField)}
            {inst.typeId === 'M06' ? (
              <div className="formula">{'breite = paare × (stärke + 2 × 2 mm Nahtluft) + 2 × 5 mm\nhoehe  = nadellaenge + zugabe'}</div>
            ) : null}
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
    case 'setSpineWidth':
      return t(`fix.${fix.kind}`, { toMm: Math.round(fix.toMm) });
    case 'setRotation':
      return t('fix.setRotation', { rotation: fix.rotation });
    case 'relocateModule':
      return t('fix.relocateModule');
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
  const unit = useStore((s) => s.project.settings.unit);
  const mine = pieces.filter((p) => p.sourceModuleId === moduleId);
  if (mine.length === 0) return <p className="hint">Kein eigenes Zuschnittteil (nur Längenmaterial).</p>;
  return (
    <div className="kv">
      {mine.map((p) => (
        <Fragment key={p.id}>
          <dt>{t(p.nameKey)}</dt>
          <dd>{p.kind === 'length' ? fmtMm(p.w, unit) : `${fmtMm(p.w, unit)} × ${fmtMm(p.h, unit)}`} · {p.count}×</dd>
        </Fragment>
      ))}
    </div>
  );
}

/** Zeilenname mit lokalem Entwurf: erlaubt Leerzeichen & Löschen, schreibt 1 Undo-Schritt bei Blur/Enter. */
function RowNameInput({
  value,
  ariaLabel,
  onCommit,
}: {
  readonly value: string;
  readonly ariaLabel: string;
  readonly onCommit: (name: string) => void;
}): JSX.Element {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = (): void => {
    const clean = draft.trim().slice(0, 60);
    if (!clean) {
      setDraft(value);
      return;
    }
    if (clean !== value) onCommit(clean);
    else setDraft(clean);
  };

  return (
    <input
      className="row-mgr-name"
      type="text"
      value={draft}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function RowStructureManager(): JSX.Element {
  const project = useStore((s) => s.project);
  const c = useStore((s) => s.construction);
  const addRowAction = useStore((s) => s.addRowAction);
  const removeRowAction = useStore((s) => s.removeRowAction);
  const renameRowAction = useStore((s) => s.renameRowAction);
  const moveRowOrder = useStore((s) => s.moveRowOrder);
  const select = useStore((s) => s.select);
  const toggleSelect = useStore((s) => s.toggleSelect);
  const setHovered = useStore((s) => s.setHovered);
  const unit = project.settings.unit;

  return (
    <div style={{ borderTop: '1px solid var(--line)', marginTop: 'var(--s3)', paddingTop: 'var(--s2)' }}>
      <Collapsible title={`${t('props.rows')} (${project.rows.length})`} defaultOpen={true}>
        <div className="row-mgr-list">
          {project.rows.map((row, rowIdx) => {
            const mods = project.modules.filter((m) => m.rowId === row.id);
            const hasLocked = mods.some((m) => m.locked);
            return (
              <div key={row.id} className="row-mgr-card">
                <div className="row-mgr-head">
                  <RowNameInput
                    value={row.name}
                    ariaLabel={`${t('canvas.row')} ${rowIdx + 1}`}
                    onCommit={(name) => renameRowAction(row.id, name)}
                  />
                  <Button
                    size="sm"
                    icon="arrowUp"
                    disabled={rowIdx === 0}
                    onClick={() => moveRowOrder(row.id, -1)}
                    title={t('props.rowMoveUp')}
                    ariaLabel={t('props.rowMoveUp')}
                  />
                  <Button
                    size="sm"
                    icon="arrowDown"
                    disabled={rowIdx >= project.rows.length - 1}
                    onClick={() => moveRowOrder(row.id, 1)}
                    title={t('props.rowMoveDown')}
                    ariaLabel={t('props.rowMoveDown')}
                  />
                  <Button
                    size="sm"
                    icon="trash"
                    variant="danger"
                    disabled={project.rows.length <= 1 || hasLocked}
                    onClick={() => removeRowAction(row.id)}
                    title={hasLocked ? t('place.lockedBlocked') : t('props.rowDelete')}
                    ariaLabel={hasLocked ? t('place.lockedBlocked') : t('props.rowDelete')}
                  />
                </div>
                {mods.length === 0 ? (
                  <div className="row-mgr-empty">{t('props.rowEmpty')}</div>
                ) : (
                  <div className="row-mgr-mods">
                    {mods.map((m) => {
                      const def = moduleDef(m.typeId as ModuleTypeId);
                      const placed = c.modules.find((pm) => pm.instanceId === m.id);
                      const hasErr = c.findings.some((f) => f.severity === 'error' && f.subject.kind === 'module' && f.subject.id === m.id);
                      const hasWarn = !hasErr && c.findings.some((f) => f.severity === 'warn' && f.subject.kind === 'module' && f.subject.id === m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`layer-row ${hasErr ? 'has-error' : hasWarn ? 'has-warn' : ''}`}
                          onClick={(e) => (e.shiftKey ? toggleSelect(m.id) : select([m.id]))}
                          onMouseEnter={() => setHovered(m.id)}
                          onMouseLeave={() => setHovered(null)}
                        >
                          <ModuleIcon icon={def.icon} size={13} />
                          <span className="layer-row-name">{t(def.nameKey)}</span>
                          <span className={`layer-side-tag ${m.side}`}>{m.side === 'left' ? 'L' : 'R'}</span>
                          {placed ? (
                            <span className="layer-dim">{fmtMm(placed.rect.w, unit)}×{fmtMm(placed.rect.h, unit)}</span>
                          ) : null}
                          {m.locked ? <Icon name="lock" size={11} /> : null}
                          {hasErr ? <span className="dot error" /> : hasWarn ? <span className="dot warn" /> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 8 }}>
          <Button
            size="sm"
            variant="outline"
            icon="plus"
            block
            disabled={project.rows.length >= LIMITS.maxRows}
            onClick={addRowAction}
          >
            {t('props.rowAdd')}
          </Button>
        </div>
      </Collapsible>
    </div>
  );
}

function BaseProperties(): JSX.Element {
  const project = useStore((s) => s.project);
  const fabricTheme = useStore((s) => s.session.fabricTheme);
  const setFabricTheme = useStore((s) => s.setFabricTheme);
  const setPar = useStore((s) => s.setPar);
  const swapSides = useStore((s) => s.swapSides);
  const autoFitSpine = useStore((s) => s.autoFitSpine);
  const unit = project.settings.unit;

  const bulk = useMemo(
    () => computeSpineBulk(project.modules, project.base.hasLining),
    [project.modules, project.base.hasLining],
  );
  const needSpine = Math.max(LIMITS.spineWidthMm.min, bulk.requiredSpineMm);

  return (
    <div style={{ borderTop: '1px solid var(--line)', marginTop: 'var(--s2)', paddingTop: 'var(--s2)' }}>
      <Collapsible title={t('props.base')}>
        <div className="field">
          <span className="field-label">{t('props.presets')}</span>
          <div className="preset-grid">
            {BASE_PRESETS.map((pr) => {
              const active = project.base.widthMm === pr.w && project.base.heightMm === pr.h;
              return (
                <button
                  key={pr.id}
                  type="button"
                  className={`preset-chip ${active ? 'active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setPar((p) => ({ ...p, base: { ...p.base, widthMm: mm(pr.w), heightMm: mm(pr.h) } }))}
                >
                  <span>{t(pr.labelKey)}</span>
                  <span className="preset-dim">{fmtMm(pr.w, unit)} × {fmtMm(pr.h, unit)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <NumberField label={t('proj.width')} value={project.base.widthMm} min={LIMITS.baseWidthMm.min} max={LIMITS.baseWidthMm.max} step={5} unit="mm" displayUnit={unit} slider onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, widthMm: v } }))} />
        <NumberField label={t('proj.height')} value={project.base.heightMm} min={LIMITS.baseHeightMm.min} max={LIMITS.baseHeightMm.max} step={5} unit="mm" displayUnit={unit} slider onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, heightMm: v } }))} />
        <NumberField label={t('proj.spine')} value={project.base.spineWidthMm} min={LIMITS.spineWidthMm.min} max={LIMITS.spineWidthMm.max} step={2} unit="mm" displayUnit={unit} onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, spineWidthMm: v } }))} />
        {project.modules.length > 0 ? (
          <div style={{ marginTop: -4, marginBottom: 10 }}>
            <Button
              size="sm"
              variant="outline"
              icon="sparkle"
              block
              disabled={Math.round(project.base.spineWidthMm) === needSpine}
              onClick={autoFitSpine}
              title={t('props.spineAutoHint', { mm: needSpine })}
            >
              {t('props.spineAuto')} ({fmtMm(needSpine, unit)})
            </Button>
          </div>
        ) : null}
        <NumberField label={t('proj.radius')} value={project.base.cornerRadiusMm} min={LIMITS.cornerRadiusMm.min} max={LIMITS.cornerRadiusMm.max} step={2} unit="mm" displayUnit={unit} onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, cornerRadiusMm: v } }))} />
        <Switch label={t('proj.lining')} checked={project.base.hasLining} onChange={(v) => setPar((p) => ({ ...p, base: { ...p.base, hasLining: v } }))} />

        {project.modules.length > 0 ? (
          <div style={{ marginTop: 8 }}>
            <Button size="sm" variant="outline" icon="swap" block onClick={swapSides}>
              {t('props.swapSides')}
            </Button>
          </div>
        ) : null}

        <div className="field" style={{ marginTop: 12 }}>
          <span className="field-label">{t('props.fabricTheme')}</span>
          <div className="theme-swatches" role="radiogroup" aria-label={t('props.fabricTheme')}>
            {FABRIC_THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                role="radio"
                aria-checked={fabricTheme === th.id}
                className={`theme-swatch ${fabricTheme === th.id ? 'active' : ''}`}
                style={{ '--swatch': th.swatch } as CSSProperties}
                title={t(th.labelKey)}
                aria-label={t(th.labelKey)}
                onClick={() => setFabricTheme(th.id)}
              />
            ))}
          </div>
        </div>
      </Collapsible>
      <Collapsible title={t('props.settings')} defaultOpen={false}>
        <Segmented
          label={t('props.unit')}
          value={project.settings.unit}
          options={[
            { value: 'mm', label: t('props.unitMm') },
            { value: 'cm', label: t('props.unitCm') },
          ]}
          onChange={(v) => setPar((p) => ({ ...p, settings: { ...p.settings, unit: v === 'cm' ? 'cm' : 'mm' } }))}
        />
        <NumberField label={t('proj.seam')} value={project.settings.seamAllowanceMm} min={4} max={20} step={1} unit="mm" displayUnit={unit} onChange={(v) => setPar((p) => ({ ...p, settings: { ...p.settings, seamAllowanceMm: v } }))} />
        <NumberField label={t('proj.fabric')} value={project.settings.fabricWidthMm} min={LIMITS.fabricWidthMm.min} max={LIMITS.fabricWidthMm.max} step={10} unit="mm" displayUnit={unit} onChange={(v) => setPar((p) => ({ ...p, settings: { ...p.settings, fabricWidthMm: v } }))} />
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
