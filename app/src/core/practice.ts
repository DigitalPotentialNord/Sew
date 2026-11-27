/**
 * Praxiskonstanten — alle Werte, die auf Annahmen beruhen und in der Testnähung
 * kalibriert werden müssen. Siehe docs/engineering/construction-rules.md §7.
 */

export const PRACTICE = {
  version: '1.2.0',
  /** Standard-Nahtzugabe beim Anlegen eines Projekts (danach: ProjectSettings). */
  seamAllowanceMm: 10,
  /** Randabstand des Kanals zur Panelkante (Kanalnutzung). */
  edgeMarginMm: 10,
  /** Nahtluft je Nadel und Seite (M03). [H] — Testnähung. */
  needleClearanceMm: 2,
  /** Randnaht je Seite eines Nadelkanals (M03). [H] — Testnähung. */
  channelEdgeSeamMm: 5,
  /** Straffheit der Elastikschlaufen (M04). [H] — Testnähung. */
  elasticGripMm: 6,
  /** Mindest-Teilbreite eines Fachs (M01). */
  minSectionMm: 15,
  /** Mindestbreite, ab der ein Teil wendbar ist. */
  minTurnMm: 15,
  /** Stichlänge für die Garnverbrauchsschätzung. */
  stitchLengthMm: 3,
  /** Garnverbrauch ≈ Nahtlänge × Faktor. [H] */
  threadDensityFactor: 3.4,
  /** Einzugsreserve je Bandende (M04). */
  elasticTailMm: 10,
  /** Typische Breite von Einlage (H250) und Vlies — Meterware vs. Zuschnitte. [H] */
  interfacingWidthMm: 900,
  /** Mindestlänge einer Reißverschlussöffnung. */
  minZipMm: 80,
  /** Toleranz für die Maßhaltigkeit im Druck (± mm bei 50 mm). */
  printToleranceMm: 0.5,
  /** Gefaltete Grunddicke der Panel-Lagen (Außenstoff + Futter + Einlage, doppelt im Falz). [H] */
  panelFoldBulkMm: 4,
  /** Sicherheitsreserve vertikal im Panel bevor V-G-17 warnt. [H] */
  minVerticalReserveMm: 4,
  /** Mindestüberstand einer Knopflasche über Bund + Knopf. [H] */
  buttonTabMarginMm: 10,
} as const;

export const LIMITS = {
  baseWidthMm: { min: 80, max: 600 },
  baseHeightMm: { min: 80, max: 600 },
  spineWidthMm: { min: 0, max: 90 },
  cornerRadiusMm: { min: 0, max: 60 },
  fabricWidthMm: { min: 400, max: 2000 },
  seamAllowanceMm: { min: 4, max: 20 },
  maxRows: 8,
  maxModulesPerChannel: 24,
  maxClosures: 2,
  channelFillWarnPct: 98,
  channelFillInfoPct: 40,
  /** Ziel-Auslastung für den V-G-08-Verbreiterungs-Fix (≤ 95 % nach Anwendung). */
  channelFillTargetPct: 95,
} as const;
