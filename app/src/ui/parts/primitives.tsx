/** Wiederverwendbare Bedienelemente. Jedes Element hat echte Funktion — nichts ist Dekoration. */
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { clamp } from '../../core/geometry';
import { t } from '../../i18n/de';
import { Icon, type IconName } from '../icons';

export function Button({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  icon,
  disabled,
  active,
  title,
  ariaLabel,
  block,
  type = 'button',
  ref,
}: {
  children?: ReactNode;
  onClick?: () => void;
  ref?: Ref<HTMLButtonElement>;
  variant?: 'ghost' | 'outline' | 'primary' | 'accent' | 'danger';
  size?: 'sm' | 'md';
  icon?: IconName;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  ariaLabel?: string;
  block?: boolean;
  type?: 'button' | 'submit';
}): JSX.Element {
  const cls = ['btn', variant !== 'ghost' ? variant : '', size === 'sm' ? 'sm' : '', !children ? 'icon' : '', block ? 'block' : '', active ? 'on' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel ?? title ?? (typeof children === 'string' ? children : undefined)}
      aria-pressed={active}
      draggable={false}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 13 : 15} /> : null}
      {children}
    </button>
  );
}

export function Collapsible({
  title,
  children,
  defaultOpen = true,
  right,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  right?: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="props-section">
      <button className="props-head" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}>
        <span className="chev" style={{ display: 'grid' }}>
          <Icon name="chevronDown" size={12} />
        </span>
        <span style={{ flex: 1 }}>{title}</span>
        {right}
      </button>
      {open ? (
        <div className="props-content" id={id}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** Zahlfeld mit Einheit und Stepper. Schreibt bei jedem gültigen Wert (intern stets ganzzahlige mm). */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  displayUnit = 'mm',
  derived,
  help,
  slider,
  disabled,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  displayUnit?: 'mm' | 'cm';
  derived?: boolean;
  help?: string;
  slider?: boolean;
  disabled?: boolean;
}): JSX.Element {
  const isCm = unit === 'mm' && displayUnit === 'cm';
  const shownUnit = isCm ? 'cm' : unit;
  const fmt = (mmVal: number): string => {
    const rounded = Math.round(mmVal);
    if (!isCm) return String(rounded);
    const cm = rounded / 10;
    return cm % 1 === 0 ? String(cm) : cm.toFixed(1);
  };

  const [draft, setDraft] = useState(() => fmt(value));
  const [editing, setEditing] = useState(false);
  const inputId = useId();

  useEffect(() => {
    if (!editing) setDraft(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editing, isCm]);

  const commitMm = (mmVal: number): void => {
    if (!Number.isFinite(mmVal)) {
      setDraft(fmt(value));
      return;
    }
    const next = clamp(Math.round(mmVal), min, max);
    setDraft(fmt(next));
    if (next !== value && onChange) onChange(next);
  };

  const commit = (raw: string): void => {
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n)) {
      setDraft(fmt(value));
      return;
    }
    commitMm(isCm ? n * 10 : n);
  };

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        <span>{label}</span>
        {derived ? <span className="derived">{t('props.derived')}</span> : null}
        {help ? (
          <span title={help} style={{ display: 'inline-flex', color: 'var(--ink-3)' }}>
            <Icon name="info" size={11} />
          </span>
        ) : null}
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <div className={`input${derived ? ' derived' : ''}`}>
          {onChange && !disabled ? (
            <div className="stepper" style={{ order: 2 }}>
              <button type="button" onClick={() => commitMm(value - step)} disabled={value <= min} aria-label={`${label} verkleinern`}>
                <Icon name="minus" size={11} />
              </button>
              <button type="button" onClick={() => commitMm(value + step)} disabled={value >= max} aria-label={`${label} vergrößern`}>
                <Icon name="plus" size={11} />
              </button>
            </div>
          ) : null}
          <input
            id={inputId}
            type="number"
            inputMode={isCm ? 'decimal' : 'numeric'}
            value={draft}
            min={isCm ? min / 10 : min}
            max={isCm ? max / 10 : max}
            step={isCm ? step / 10 : step}
            readOnly={!onChange || disabled}
            disabled={disabled}
            aria-label={onChange && !disabled ? label : `${label} (berechnet)`}
            onChange={(e) => {
              setEditing(true);
              setDraft(e.target.value);
            }}
            onBlur={(e) => {
              setEditing(false);
              commit(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                commitMm(Math.min(max, value + step));
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                commitMm(Math.max(min, value - step));
              }
            }}
          />
          {shownUnit ? <span className="unit">{shownUnit}</span> : null}
        </div>
      </div>
      {slider && onChange && !disabled ? (
        <div style={{ marginTop: 6 }}>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => commitMm(Number(e.target.value))}
            aria-label={`${label} Regler`}
          />
        </div>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label?: string;
  value: T;
  options: readonly { readonly value: T; readonly label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <div className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" disabled={disabled} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <label className="switch" style={{ marginBottom: 12 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" />
      <span>{label}</span>
    </label>
  );
}

export function EmptyState({
  icon = 'layers',
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="empty-state">
      <span className="icon-lg">
        <Icon name={icon} size={28} strokeWidth={1.2} />
      </span>
      <p style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{title}</p>
      {hint ? <p>{hint}</p> : null}
      {action}
    </div>
  );
}

/** Sheet für Tablet/Mobil — schließt per Escape und Backdrop. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    // Escape schließt das Sheet; Capture-Phase, damit das Sheet die Geste zuerst bekommt.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <Button icon="close" onClick={onClose} ariaLabel={t('mobile.close')} />
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

export function Panel({
  title,
  children,
  flush,
  right,
}: {
  title?: string;
  children: ReactNode;
  flush?: boolean;
  right?: ReactNode;
}): JSX.Element {
  return (
    <div className="panel">
      {title ? (
        <div className="panel-head">
          <h3>{title}</h3>
          {right ? <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>{right}</div> : null}
        </div>
      ) : null}
      <div className={`panel-body${flush ? ' flush' : ''}`}>{children}</div>
    </div>
  );
}
