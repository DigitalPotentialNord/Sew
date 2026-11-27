/**
 * Qualitäts- & Nähbarkeitsbewertung — transparentes Studio-Prüfinstrument.
 * Zeigt den strengen 0–100-Score, Note, Freigabe-Urteil, 5 gewichtete
 * Kategorien, physikalische Kennzahlen und das 10-Punkte-Prüfprotokoll.
 */
import { useState } from 'react';
import type { ConstructionEvaluation } from '../core/evaluation';
import { t } from '../i18n/de';
import { Icon } from './icons';
import { Button } from './parts/primitives';

const R_SM = 9;
const C_SM = 2 * Math.PI * R_SM;
const R_LG = 20;
const C_LG = 2 * Math.PI * R_LG;

function toneOf(verdict: ConstructionEvaluation['verdict']): 'ok' | 'warn' | 'err' {
  if (verdict === 'blocked') return 'err';
  if (verdict === 'caution') return 'warn';
  return 'ok';
}

/** Kompaktes Qualitäts-Abzeichen für Canvas-Chrome, Panel-Kopf und Export-Kopf. */
export function QualityBadge({
  evaluation,
  onClick,
  compact,
}: {
  readonly evaluation: ConstructionEvaluation;
  readonly onClick?: () => void;
  readonly compact?: boolean;
}): JSX.Element {
  const tone = toneOf(evaluation.verdict);
  const dash = (evaluation.score / 100) * C_SM;
  const content = (
    <>
      <svg className="qb-ring" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle className="qb-track" cx="11" cy="11" r={R_SM} />
        <circle
          className={`qb-fill ${tone}`}
          cx="11"
          cy="11"
          r={R_SM}
          strokeDasharray={`${dash} ${C_SM}`}
          transform="rotate(-90 11 11)"
        />
      </svg>
      <span className="qb-score">{evaluation.score}</span>
      <span className={`qb-grade ${tone}`}>{evaluation.grade}</span>
      {!compact ? <span className="qb-verdict">{t(`eval.verdict.${evaluation.verdict}`)}</span> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`quality-badge interactive ${tone}`}
        onClick={onClick}
        title={`${t('eval.title')}: ${evaluation.score}/100 (${evaluation.grade}) · ${t(`eval.verdict.${evaluation.verdict}`)}`}
      >
        {content}
      </button>
    );
  }
  return <div className={`quality-badge ${tone}`}>{content}</div>;
}

/** Vollständige Qualitäts- und Prüf-Karte (für Bewertungs-Panel & Export-Prüfung). */
export function QualityInspector({
  evaluation,
  onOptimize,
  compact,
}: {
  readonly evaluation: ConstructionEvaluation;
  readonly onOptimize?: () => void;
  readonly compact?: boolean;
}): JSX.Element {
  const [checksOpen, setChecksOpen] = useState(evaluation.verdict === 'blocked');
  const tone = toneOf(evaluation.verdict);
  const dash = (evaluation.score / 100) * C_LG;
  const d = evaluation.diagnostics;

  return (
    <div className={`quality-card ${tone}${compact ? ' compact' : ''}`}>
      <div className="qc-head">
        <div className="qc-gauge" aria-label={`${t('eval.score')} ${evaluation.score} von 100, Note ${evaluation.grade}`}>
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
            <circle className="qc-track" cx="24" cy="24" r={R_LG} />
            <circle
              className={`qc-arc ${tone}`}
              cx="24"
              cy="24"
              r={R_LG}
              strokeDasharray={`${dash} ${C_LG}`}
              transform="rotate(-90 24 24)"
            />
          </svg>
          <span className="qc-gauge-num">{evaluation.score}</span>
        </div>

        <div className="qc-summary">
          <div className="qc-verdict-row">
            <span className={`qc-grade-pill ${tone}`}>{evaluation.grade}</span>
            <span className="qc-verdict">{t(`eval.verdict.${evaluation.verdict}`)}</span>
          </div>
          <div className="qc-sub">
            {t('eval.checksPassed', { passed: d.passedChecks, total: d.totalChecks })}
          </div>
        </div>

        {onOptimize ? (
          <Button
            size="sm"
            variant="outline"
            icon="sparkle"
            onClick={onOptimize}
            title={t('place.autoOptimizeHint')}
          >
            {t('place.autoOptimize')}
          </Button>
        ) : null}
      </div>

      {/* 5 gewichtete Bewertungskategorien */}
      <div className="qc-bars">
        {evaluation.categories.map((cat) => (
          <div className="qc-bar-row" key={cat.id}>
            <span className="qc-bar-label">{t(cat.labelKey)}</span>
            <div className="qc-bar-track" aria-hidden="true">
              <div className={`qc-bar-fill ${cat.status}`} style={{ width: `${cat.score}%` }} />
            </div>
            <span className={`qc-bar-val ${cat.status}`}>{cat.score}</span>
          </div>
        ))}
      </div>

      {/* Physikalische Kennzahlen */}
      <div className="qc-metrics">
        <span className={`qc-chip${d.spineUtilizationPct > 100 ? ' fail' : d.spineUtilizationPct > 85 ? ' warn' : ''}`}>
          {t('eval.bulk', { ist: d.estimatedBulkMm, max: d.spineWidthMm })}
        </span>
        <span className="qc-chip">
          {t('eval.balance', { links: d.leftAreaPct, rechts: d.rightAreaPct })}
        </span>
        <span className="qc-chip">
          {t('eval.utilization', { pct: d.fabricUtilizationPct })}
        </span>
      </div>

      {/* 10-Punkte-Prüfprotokoll */}
      <div className="qc-protocol">
        <button
          type="button"
          className="qc-protocol-toggle"
          onClick={() => setChecksOpen((o) => !o)}
          aria-expanded={checksOpen}
        >
          <Icon name={checksOpen ? 'chevronDown' : 'chevronRight'} size={12} />
          <span>{t('eval.checklistToggle', { passed: d.passedChecks, total: d.totalChecks })}</span>
        </button>
        {checksOpen ? (
          <ul className="qc-checks">
            {evaluation.checklist.map((chk) => (
              <li key={chk.id} className={`qc-check ${chk.status}`}>
                <span className={`qc-check-ic ${chk.status}`} aria-hidden="true">
                  <Icon name={chk.status === 'pass' ? 'check' : chk.status === 'warn' ? 'alert' : 'error'} size={12} />
                </span>
                <div className="qc-check-body">
                  <div className="qc-check-title">{t(chk.labelKey)}</div>
                  <div className="qc-check-detail">{t(chk.detailKey, chk.values)}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
