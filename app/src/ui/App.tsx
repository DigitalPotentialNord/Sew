import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/** Reaktiv: ist die Ansicht aktuell ≤ 1000 px (Tablet/Smartphone)? */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1000px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1000px)');
    const on = (): void => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}
import { buildPrintHtml, downloadText, fileName, tilePiece, toSvg, type PrintStrings } from '../core/export';
import { useStore } from '../state/store';
import { formatAmount } from '../core/construction';
import { t } from '../i18n/de';
import { Canvas } from './Canvas';
import { Library } from './Library';
import { Properties } from './Properties';
import { Warnings } from './Warnings';
import { isInteractiveTarget } from './isInteractiveTarget';
import { findingKey } from '../core/fixes';
import { QualityBadge } from './QualityCard';
import { Icon } from './icons';
import { Button, Sheet } from './parts/primitives';

// Sekundäre Tabs, Starter-Assistent & Hilfe-Dialog werden bei Bedarf geladen — hält den Editor-Start leichtgewichtig.
const StartScreen = lazy(() => import('./StartScreen').then((m) => ({ default: m.StartScreen })));
const ShortcutsModal = lazy(() => import('./ShortcutsModal'));
const MaterialsView = lazy(() => import('./MaterialsView').then((m) => ({ default: m.MaterialsView })));
const PatternView = lazy(() => import('./PatternView').then((m) => ({ default: m.PatternView })));
const InstructionsView = lazy(() => import('./InstructionsView').then((m) => ({ default: m.InstructionsView })));
const ProjectView = lazy(() => import('./ProjectView').then((m) => ({ default: m.ProjectView })));

type View = 'editor' | 'pattern' | 'materials' | 'instructions' | 'project';

export function App(): JSX.Element {
  const view = useStore((s) => s.session.view);
  const setView = useStore((s) => s.setView);
  const c = useStore((s) => s.construction);
  const project = useStore((s) => s.project);
  const saved = useStore((s) => s.saved);
  const toasts = useStore((s) => s.toasts);

  const errors = c.findings.filter((f) => f.severity === 'error').length;
  const warns = c.findings.filter((f) => f.severity === 'warn').length;
  const startOpen = useStore((s) => s.session.startOpen);
  const helpOpen = useStore((s) => s.session.helpOpen);
  const setHelpOpen = useStore((s) => s.setHelpOpen);

  // Tastatur-Kürzel
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const remove = useStore((s) => s.remove);
  const duplicate = useStore((s) => s.duplicate);
  const save = useStore((s) => s.save);
  const selectAll = useStore((s) => s.selectAll);
  const selection = useStore((s) => s.session.selection);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const state = useStore.getState();
      const target = e.target as HTMLElement | null;
      const mod = e.metaKey || e.ctrlKey;

      // Offene Modale / Dialoge fangen Tastaturkürzel ab — nur Escape schließt sie,
      // damit dahinter keine Module gelöscht, gedreht oder Tabs gewechselt werden.
      if (state.pendingDiscard || state.session.startOpen || state.session.helpOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (state.pendingDiscard) state.cancelPendingDiscard();
          else if (state.session.helpOpen) setHelpOpen(false);
          else if (state.session.startOpen) state.setStartOpen(false);
        }
        return;
      }

      // Textfelder und Bedienelemente behalten ihre Tastatur: normale Kürzel
      // (Delete, r, Ziffern) greifen nur ohne Fokus auf interaktiven Zielen;
      // Strg/Cmd+Z/Y/S bleibt überall erlaubt außer in Texteingaben.
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      if (!mod && isInteractiveTarget(target)) return;
      const onOpenCanvas = view === 'editor' && !state.session.folded;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      } else if (mod && e.key.toLowerCase() === 'a' && onOpenCanvas) {
        e.preventDefault();
        selectAll();
      } else if (mod && e.key.toLowerCase() === 'd' && onOpenCanvas && selection.length > 0) {
        e.preventDefault();
        if (selection.length > 1) state.batchDuplicate(selection);
        else {
          const first = selection[0];
          if (first) duplicate(first);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && onOpenCanvas && selection.length > 0) {
        e.preventDefault();
        remove(selection);
      } else if (e.key === 'Escape') {
        state.select([]);
      } else if (e.key === '?' && !mod) {
        e.preventDefault();
        setHelpOpen(!state.session.helpOpen);
      } else if (e.key.toLowerCase() === 'r' && onOpenCanvas && selection.length === 1) {
        // Drehen als zusätzlicher Kurzbefehl bei Einzelwahl — visuell auffindbar
        // bleibt der Drehen-Knopf in der Kontextleiste/Eigenschaften.
        e.preventDefault();
        state.rotate(selection[0]!);
      } else if (e.key === '1') setView('editor');
      else if (e.key === '2') setView('pattern');
      else if (e.key === '3') setView('materials');
      else if (e.key === '4') setView('instructions');
      else if (e.key === '5') setView('project');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, remove, duplicate, save, selectAll, selection, setView, setHelpOpen, view]);

  return (
    <ErrorBoundary>
      <div className="app">
        <Topbar errors={errors} warns={warns} saved={saved} />
        <Tabbar view={view} setView={setView} errors={errors} warns={warns} modules={project.modules.length} pieces={c.metrics.cutPieceCount} />
        {startOpen ? (
          <Suspense fallback={null}>
            <StartScreen />
          </Suspense>
        ) : null}
        {helpOpen ? (
          <Suspense fallback={null}>
            <ShortcutsModal onClose={() => setHelpOpen(false)} />
          </Suspense>
        ) : null}
        <main className={`workspace${view === 'editor' ? '' : ' full'}`}>
          {view === 'editor' ? <EditorWorkspace /> : null}
          {view !== 'editor' ? (
            <Suspense fallback={null}>
              {view === 'pattern' ? <PatternHost /> : null}
              {view === 'materials' ? <MaterialsView /> : null}
              {view === 'instructions' ? <InstructionsHost /> : null}
              {view === 'project' ? <ProjectView /> : null}
            </Suspense>
          ) : null}
        </main>
        <Statusbar />
        <DiscardConfirm />
        <div className="toasts" aria-live="polite">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} id={toast.id} message={toast.message} tone={toast.tone} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function Topbar({ errors, warns, saved }: { errors: number; warns: number; saved: boolean }): JSX.Element {
  const project = useStore((s) => s.project);
  const setPar = useStore((s) => s.setPar);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const past = useStore((s) => s.past.length);
  const future = useStore((s) => s.future.length);
  const save = useStore((s) => s.save);
  const toast = useStore((s) => s.toast);
  const libOpen = useStore((s) => s.session.libOpen);
  const setLibOpen = useStore((s) => s.setLibOpen);
  const warnOpen = useStore((s) => s.session.warnOpen);
  const setWarnOpen = useStore((s) => s.setWarnOpen);
  const propsOpen = useStore((s) => s.session.propsOpen);
  const setPropsOpen = useStore((s) => s.setPropsOpen);
  const setStartOpen = useStore((s) => s.setStartOpen);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">OS</span>
        <span className="brand-name">{t('app.name')}</span>
      </div>
      <div className="topbar-sep" />
      <input
        className="project-name"
        value={project.name}
        onChange={(e) => setPar((p) => ({ ...p, name: e.target.value }), { undoable: false })}
        onBlur={() => {
          if (!project.name.trim()) {
            setPar((p) => ({ ...p, name: t('proj.untitled') }), { undoable: false });
          }
        }}
        aria-label={t('proj.name')}
        spellCheck={false}
      />
      <div className="topbar-group desktop-only">
        <Button icon="undo" onClick={undo} disabled={past === 0} title={`${t('top.undo')} (⌘Z)`} />
        <Button icon="redo" onClick={redo} disabled={future === 0} title={`${t('top.redo')} (⇧⌘Z)`} />
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-group mobile-only">
        <Button icon="menu" onClick={() => { setPropsOpen(false); setWarnOpen(false); setLibOpen(!libOpen); }} title={t('mobile.lib')} active={libOpen} />
        <Button icon="sliders" onClick={() => { setLibOpen(false); setWarnOpen(false); setPropsOpen(!propsOpen); }} title={t('mobile.panel')} active={propsOpen} />
        <Button icon={errors > 0 ? 'error' : warns > 0 ? 'alert' : 'check'} onClick={() => { setLibOpen(false); setPropsOpen(false); setWarnOpen(!warnOpen); }} active={warnOpen} title={t('warn.title')} />
      </div>
      <div className="topbar-group desktop-only">
        <Button icon="sparkle" onClick={() => setStartOpen(true)} title={t('top.wizardHint')}>
          {t('top.wizard')}
        </Button>
        <Button icon="help" onClick={() => setHelpOpen(true)} title={t('shortcuts.title')} ariaLabel={t('shortcuts.title')} />
      </div>
      <div className="topbar-sep desktop-only" />
      <div className="topbar-group desktop-only">
        <Button icon="save" onClick={save} title={t('top.save')} />
        <Button icon="upload" onClick={() => fileRef.current?.click()} title={t('top.import')} />
        <Button
          icon="download"
          onClick={() => {
            const data = useStore.getState().exportProject();
            downloadText(fileName(project.name, 'projekt', 'json'), 'application/json', JSON.stringify(data, null, 2));
            toast(t('toast.exported'), 'ok');
          }}
          title={t('top.exportProject')}
        />
        <Button
          icon="image"
          onClick={() => {
            downloadText(fileName(project.name, 'schnittmuster', 'svg'), 'image/svg+xml', toSvg(useStore.getState().construction));
            toast(t('toast.svgSaved'), 'ok');
          }}
          disabled={errors > 0}
          title={errors > 0 ? t('pattern.blocked', { n: errors }) : t('top.exportSvg')}
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const text = await f.text();
              const res = useStore.getState().importProject(JSON.parse(text) as unknown);
              if (!res.ok && !res.blocked) toast(`${t('toast.importError')}: ${res.message ?? ''}`, 'error');
            } catch {
              toast(t('toast.importError'), 'error');
            }
          }}
        />
      </div>
      <div className="topbar-sep desktop-only" />
      <div className="topbar-group">
        <PrintButton errors={errors} />
      </div>
      <span className="sr-only" role="status">
        {saved ? t('top.status.saved') : t('top.status.unsaved')}
      </span>
      <span className="desktop-only" style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 4 }}>
        {saved ? t('top.status.saved') : t('top.status.unsaved')}
      </span>
    </header>
  );
}

function PrintButton({ errors }: { errors: number }): JSX.Element {
  const toast = useStore((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const doPrint = useCallback(() => {
    if (errors > 0) {
      toast(t('toast.blocked', { n: errors }), 'error');
      useStore.getState().setView('pattern');
      return;
    }
    openPrintWindow('full');
  }, [errors, toast]);

  // PDF-Datei: derselbe Inhalt, aber als Datei zum Weitergeben. Der Druckdialog
  // bleibt der Weg für maßhaltige A4-Bögen — hier entsteht ein Dokument, das
  // ohne Browser geöffnet werden kann.
  const doDownloadPdf = useCallback(async () => {
    if (errors > 0) {
      toast(t('toast.blocked', { n: errors }), 'error');
      useStore.getState().setView('pattern');
      return;
    }
    setBusy(true);
    try {
      const { buildPdf } = await import('../core/pdf');
      const state = useStore.getState();
      const c = state.construction;
      const project = state.project;
      const strings = {
        title: project.name,
        subtitle: t('app.name'),
        calibration: t('pattern.calibration'),
        calibrationHint: t('pattern.calibrationHint'),
        materials: c.materials.map((m) => ({
          label: t(m.labelKey) === m.labelKey ? t(`mat.${m.kind}`) : t(m.labelKey),
          amount: m.display ?? formatAmount(m.amount, m.unit),
          certainty: m.certainty === 'exact' ? t('mat.tab.exact') : t('mat.tab.estimated'),
        })),
        cutList: c.pieces
          .filter((pc) => pc.kind === 'cut')
          .map((pc) => ({
            label: t(pc.nameKey),
            size: `${pc.w} × ${pc.h} mm`,
            count: `${pc.count}×`,
            tiles: `${tilePiece(pc).length} Seiten`,
          })),
        instructions: c.operations.map((op) => ({
          index: op.index,
          phase: t(`phase.${op.phase}`),
          text: t(op.titleKey, op.values),
        })),
        piece: c.pieces.filter((pc) => pc.kind === 'cut').length === 1 ? t('print.piece') : t('print.pieces'),
        footer: `${t('app.name')} · ${project.name} · Qualität ${c.evaluation.score}/100 (${c.evaluation.grade}) · Praxiswerte ${c.practiceVersion} · Konstruktion ${c.projectHash}`,
      };
      const { bytes, pages } = await buildPdf(c, strings);
      downloadText(fileName(project.name, 'schnittmuster', 'pdf'), 'application/pdf', bytes);
      toast(t('toast.pdfSaved', { n: pages }), 'ok');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'PDF fehlgeschlagen', 'error');
    } finally {
      setBusy(false);
    }
  }, [errors, toast]);

  return (
    <div className="btn-split">
      <Button variant="accent" icon="printer" onClick={doPrint} disabled={errors > 0} title={errors > 0 ? t('pattern.blocked', { n: errors }) : t('top.exportPdf')}>
        <span className="desktop-only">{t('top.exportPdf')}</span>
        <span className="mobile-only">PDF</span>
      </Button>
      <Button
        variant="accent"
        icon="download"
        onClick={() => void doDownloadPdf()}
        disabled={errors > 0 || busy}
        title={errors > 0 ? t('pattern.blocked', { n: errors }) : t('top.downloadPdf')}
        aria-label={t('top.downloadPdf')}
      />
    </div>
  );
}

function Tabbar({
  view,
  setView,
  errors,
  warns,
  modules,
  pieces,
}: {
  view: View;
  setView: (v: View) => void;
  errors: number;
  warns: number;
  modules: number;
  pieces: number;
}): JSX.Element {
  const items: { id: View; label: string; icon: 'sliders' | 'scissors' | 'spool' | 'list' | 'folder'; count?: string | number }[] = [
    { id: 'editor', label: t('nav.design'), icon: 'sliders' },
    { id: 'pattern', label: t('nav.pattern'), icon: 'scissors', count: pieces },
    { id: 'materials', label: t('nav.material'), icon: 'spool' },
    { id: 'instructions', label: t('nav.instructions'), icon: 'list' },
    { id: 'project', label: t('nav.project'), icon: 'folder' },
  ];
  return (
    <nav className="tabbar" role="tablist" aria-label="Ansicht">
      {items.map((it) => (
        <button key={it.id} className="tab" role="tab" aria-selected={view === it.id} onClick={() => setView(it.id)}>
          <Icon name={it.icon} size={13} />
          <span>{it.label}</span>
          {it.count !== undefined ? <span className="count">{it.count}</span> : null}
          {it.id === 'editor' && modules > 0 ? <span className="count">{modules}</span> : null}
        </button>
      ))}
      <span style={{ flex: 1 }} />
      {errors > 0 ? (
        <button className="tab" style={{ color: 'var(--error)' }} onClick={() => useStore.getState().setWarnOpen(true)}>
          <Icon name="error" size={13} />
          {errors}
        </button>
      ) : null}
      {warns > 0 ? (
        <button className="tab" style={{ color: 'var(--warn)' }} onClick={() => useStore.getState().setWarnOpen(true)}>
          <Icon name="alert" size={13} />
          {warns}
        </button>
      ) : null}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function EditorWorkspace(): JSX.Element {
  const libOpen = useStore((s) => s.session.libOpen);
  const setLibOpen = useStore((s) => s.setLibOpen);
  const warnOpen = useStore((s) => s.session.warnOpen);
  const setWarnOpen = useStore((s) => s.setWarnOpen);
  const propsOpen = useStore((s) => s.session.propsOpen);
  const setPropsOpen = useStore((s) => s.setPropsOpen);
  const selection = useStore((s) => s.session.selection);
  const select = useStore((s) => s.select);
  const isMobile = useIsMobile();

  return (
    <>
      <aside className="pane left desktop-only">
        <div className="pane-head">
          <span className="pane-title">{t('lib.title')}</span>
        </div>
        <Library />
      </aside>
      <div className="pane center">
        <Canvas />
      </div>
      <aside className="pane right desktop-only">
        <WarningsCollapsed />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Properties />
        </div>
        <SelectionFoot count={selection.length} />
      </aside>

      {libOpen ? (
        <Sheet title={t('mobile.lib')} onClose={() => setLibOpen(false)}>
          <Library />
        </Sheet>
      ) : null}
      {warnOpen ? (
        <Sheet title={t('warn.title')} onClose={() => setWarnOpen(false)}>
          <Warnings />
        </Sheet>
      ) : null}

      {/* Tablet/Smartphone: Eigenschaften als Sheet (Button-gesteuert oder bei Auswahl). */}
      {isMobile && (propsOpen || selection.length > 0) ? (
        <Sheet title={t('mobile.panel')} onClose={() => { setPropsOpen(false); select([]); }}>
          <Properties />
        </Sheet>
      ) : null}
    </>
  );
}

function WarningsCollapsed(): JSX.Element {
  const c = useStore((s) => s.construction);
  const dismissed = useStore((s) => s.session.dismissed);
  const [open, setOpen] = useState(false);
  const visible = c.findings.filter((f) => !dismissed.includes(findingKey(f)));
  const errors = visible.filter((f) => f.severity === 'error');
  const warns = visible.filter((f) => f.severity === 'warn');

  return (
    <div className={`eval-drawer${open ? ' open' : ''}`}>
      <button className="props-head eval-drawer-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="chev" style={{ display: 'grid', transform: open ? 'none' : 'rotate(-90deg)' }}>
          <Icon name="chevronDown" size={12} />
        </span>
        <span style={{ flex: 1 }}>{t('warn.title')}</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <QualityBadge evaluation={c.evaluation} compact />
          {errors.length > 0 ? <span className="eval-cnt err">{errors.length}</span> : null}
          {warns.length > 0 ? <span className="eval-cnt warn">{warns.length}</span> : null}
        </span>
      </button>
      <div className="eval-drawer-body">
        <Warnings compact />
      </div>
    </div>
  );
}

function SelectionFoot({ count }: { count: number }): JSX.Element | null {
  if (count === 0) return null;
  return (
    <div className="pane-foot" style={{ display: 'flex', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', flex: 1 }}>
        {count === 1 ? t('canvas.select') : `${count} ${t('canvas.multi')}`}
      </span>
      <span className="mono" style={{ color: 'var(--ink-3)' }}>⇧ Klick = mehrere</span>
    </div>
  );
}

function PatternHost(): JSX.Element {
  const toast = useStore((s) => s.toast);
  const errors = useStore((s) => s.construction.findings.filter((f) => f.severity === 'error').length);
  return (
    <PatternView
      onPrint={() => {
        if (errors > 0) {
          toast(t('toast.blocked', { n: errors }), 'error');
          return;
        }
        openPrintWindow('full');
      }}
      onPrintInstructions={() => openPrintWindow('instructions')}
    />
  );
}

function InstructionsHost(): JSX.Element {
  return <InstructionsView onPrint={() => openPrintWindow('instructions')} />;
}

function Statusbar(): JSX.Element {
  const c = useStore((s) => s.construction);
  const project = useStore((s) => s.project);
  const saved = useStore((s) => s.saved);
  const errors = c.metrics.errorCount;
  const warns = c.metrics.warnCount;
  return (
    <footer className="statusbar">
      <span className={`status-dot ${errors > 0 ? 'error' : warns > 0 ? 'warn' : ''}`} />
      <span>
        {errors > 0 ? <strong>{t('warn.errors', { n: errors })}</strong> : warns > 0 ? <strong>{t(warns === 1 ? 'warn.warnsOne' : 'warn.warns', { n: warns })}</strong> : <strong>{t('warn.none')}</strong>}
      </span>
      <span className="status-sep">·</span>
      <span className="mono">
        {t('eval.score')} {c.evaluation.score} ({c.evaluation.grade})
      </span>
      <span className="status-sep">·</span>
      <span>
        {c.metrics.moduleCount} Module · {t(c.metrics.cutPieceCount === 1 ? 'pattern.piece' : 'pattern.pieces', { n: c.metrics.cutPieceCount })}
      </span>
      <span className="status-sep">·</span>
      <span>
        {c.fabricPlan ? `${c.fabricPlan.meters.toFixed(2).replace('.', ',')} m Stoff` : '—'} · {formatAmount(c.metrics.seamLengthMm, 'mm')} Naht
      </span>
      <span className="status-sep desktop-only">·</span>
      <span className="desktop-only">
        {project.base.widthMm} × {project.base.heightMm} mm · NZ {project.settings.seamAllowanceMm} mm
      </span>
      <span style={{ flex: 1 }} />
      <span className="mono desktop-only" title="Konstruktions-Hash (deterministisch)">
        {t('top.status.hash')} {c.projectHash}
      </span>
      <span className="status-sep">·</span>
      <span>{saved ? t('top.status.saved') : t('top.status.unsaved')}</span>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
/** Druckfenster für Pfad A: der Browser druckt vektoriell in 100 %. */
function openPrintWindow(mode: 'full' | 'instructions'): void {
  const state = useStore.getState();
  const c = state.construction;
  const project = state.project;
  const strings: PrintStrings = {
    title: project.name,
    projectLabel: t('app.name'),
    materialLabel: t('mat.tab.title'),
    cutLabel: 'Zuschnittübersicht',
    pageMapLabel: 'Seitenübersicht',
    instructionsLabel: t('instr.title'),
    calibrationLabel: t('pattern.calibration'),
    calibrationHint: t('pattern.calibrationHint'),
    seamAllowance: 'Nahtzugabe',
    piece: c.pieces.filter((pc) => pc.kind === 'cut').length === 1 ? t('print.piece') : t('print.pieces'),
    count: c.pieces.filter((pc) => pc.kind === 'cut').length === 1 ? t('print.piece') : t('print.pieces'),
    size: 'Maße',
    grain: 'Fadenlauf',
    glue: 'kleben',
    warning: 'Vor dem Zuschnitt: erst maßhaltig drucken, dann testen.',
    step: 'Schritt',
    materialExact: t('mat.tab.exact'),
    materialEstimated: t('mat.tab.estimated'),
    footer: `${t('app.name')} · ${project.name} · Qualität ${c.evaluation.score}/100 (${c.evaluation.grade}) · Praxiswerte ${c.practiceVersion} · Konstruktion ${c.projectHash} · ${new Date().toLocaleDateString('de-DE')}`,
    legend: 'Schnittlinie durchgezogen · Nählinie gestrichelt · Fadenlauf mit Pfeil · Knipse kurz.',
  };

  const materialLines = c.materials.map((m) => ({
    label: t(m.labelKey) === m.labelKey ? t(`mat.${m.kind}`) : t(m.labelKey),
    amount: m.display ?? formatAmount(m.amount, m.unit),
    certainty: m.certainty,
    basis: t(m.basisKey, m.basisValues),
  }));

  const instructions = c.operations.map((op) => ({
    index: op.index,
    phase: t(`phase.${op.phase}`),
    text: t(op.titleKey, op.values),
  }));

  const openWarnings = c.findings
    .filter((f) => f.severity === 'warn' && !state.session.dismissed.includes(findingKey(f)))
    .map((f) => t(`rule.${f.ruleId}.detail`, f.values));

  const html = buildPrintHtml(c, project.name, strings, materialLines, instructions, openWarnings, {
    instructionsOnly: mode === 'instructions',
  });

  const w = window.open('', '_blank', 'width=900,height=1200');
  if (w) w.opener = null;
  if (!w) {
    // Fallback: Datei herunterladen
    downloadText(fileName(project.name, 'anleitung', 'html'), 'text/html', html);
    state.toast(t('toast.popupBlocked'), 'info');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Nach dem Rendern drucken
  const tryPrint = (): void => {
    try {
      w.focus();
      w.print();
    } catch {
      /* Nutzer kann selbst drucken */
    }
  };
  if (w.document.readyState === 'complete') setTimeout(tryPrint, 250);
  else w.onload = () => setTimeout(tryPrint, 250);
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Rückfrage für destruktive Aktionen mit ungespeicherten Änderungen.
 * Inline unter der Topbar (kein window.confirm → keyboard-/screenreader-freundlich,
 * funktioniert in eingebetteten Vorschauen, e2e-steuerbar).
 */
function DiscardConfirm(): JSX.Element | null {
  const pending = useStore((s) => s.pendingDiscard);
  const confirm = useStore((s) => s.confirmPendingDiscard);
  const cancel = useStore((s) => s.cancelPendingDiscard);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pending) confirmRef.current?.focus();
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, cancel]);

  if (!pending) return null;
  return (
    <div className="discard-bar" role="alertdialog" aria-modal="false" aria-label={t('proj.discardUnsaved')}>
      <span className="discard-icon" aria-hidden="true">
        <Icon name="alert" size={15} />
      </span>
      <span className="discard-text">{t('proj.discardUnsaved')}</span>
      <span className="discard-actions">
        <Button ref={confirmRef} size="sm" variant="danger" onClick={confirm}>
          {t('proj.discard')}
        </Button>
        <Button size="sm" variant="outline" onClick={cancel}>
          {t('proj.cancel')}
        </Button>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ToastItem({ id, message, tone }: { id: number; message: string; tone: 'ok' | 'error' | 'info' }): JSX.Element {
  const drop = useStore((s) => s.dropToast);
  return (
    <div className={`toast ${tone === 'error' ? 'error' : ''}`} role="status">
      <Icon name={tone === 'error' ? 'error' : tone === 'info' ? 'info' : 'check'} size={13} />
      <span style={{ flex: 1 }}>{message}</span>
      <button className="t-close" onClick={() => drop(id)} aria-label="Schließen">
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }
  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%', padding: 24 }}>
          <div style={{ maxWidth: 460, textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>{t('err.boundary')}</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: 13 }}>{t('err.boundaryHint')}</p>
            <pre className="mono" style={{ textAlign: 'left', background: 'var(--surface-3)', padding: 10, borderRadius: 6, fontSize: 10, overflow: 'auto', maxHeight: 160 }}>
              {this.state.error.message}
            </pre>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <Button variant="primary" onClick={() => window.location.reload()}>
                {t('err.reload')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  useStore.getState().resetToSaved({ force: true });
                  this.setState({ error: null });
                }}
              >
                {t('err.reset')}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

