/**
 * Domänentypen. Kein React, keine Darstellung, keine Zeit, kein Zufall.
 * Quelle: docs/engineering/pattern-data-model.md, construction-rules.md.
 */
import type { Mm } from './geometry';

export type LocalizedKey = string;

// ─── Material ────────────────────────────────────────────────────────────────
export type MaterialKind =
  | 'fabric'
  | 'lining'
  | 'interfacing'
  | 'batting'
  | 'elastic'
  | 'zipper'
  | 'button'
  | 'snap'
  | 'velcro'
  | 'webbing'
  | 'ring'
  | 'thread';

export type Certainty = 'exact' | 'estimated';

export interface MaterialRef {
  readonly kind: MaterialKind;
  readonly spec: string;
  readonly labelKey: LocalizedKey;
}

// ─── Schnittteile ────────────────────────────────────────────────────────────
export type GrainDirection = 'lengthwise' | 'crosswise' | 'bias' | 'none';

/**
 * 'cut'   = Zuschnittteil mit Fläche (wird getiled und gedruckt)
 * 'length'= Längenmaterial ohne Zuschnittfläche (Gummiband, RV, Band)
 *           → erscheint NUR in Materialliste und Anleitung (Architekturprüfung H-08)
 */
export type PieceKind = 'cut' | 'length';

export interface PieceSpec {
  readonly id: string;
  readonly nameKey: LocalizedKey;
  readonly kind: PieceKind;
  /** Zuschnittmaß MIT Nahtzugabe. */
  readonly w: Mm;
  readonly h: Mm;
  /** Nähmaß ohne Nahtzugabe (nur bei kind==='cut' sinnvoll). */
  readonly netW: Mm;
  readonly netH: Mm;
  /** Optionaler Versatz des Nähfelds innerhalb des Zuschnitts (für einseitige Säume/Bruchkanten). */
  readonly netX?: Mm;
  readonly netY?: Mm;
  readonly count: number;
  readonly material: MaterialKind;
  readonly grain: GrainDirection;
  readonly certainty: Certainty;
  readonly noteKey?: LocalizedKey;
  readonly role: 'panel' | 'module' | 'closure' | 'lining' | 'stabilizer';
  readonly moduleId?: string;
  readonly foldEdge?: 'top' | 'bottom' | 'left' | 'right' | 'none';
}

// ─── Nähoperationen ──────────────────────────────────────────────────────────
export type OperationKind =
  | 'fuse'
  | 'press'
  | 'mark'
  | 'cut'
  | 'baste'
  | 'stitch'
  | 'stitch-divider'
  | 'install-zip'
  | 'insert-strap'
  | 'attach-button'
  | 'attach-snap'
  | 'thread-elastic'
  | 'close-panel'
  | 'turn'
  | 'topstitch'
  | 'final-check';

export interface OpSpec {
  readonly kind: OperationKind;
  readonly moduleId?: string;
  readonly dependsOn: readonly string[];
  readonly titleKey: LocalizedKey;
  readonly values: Readonly<Record<string, number | string | undefined>>;
}

export interface SewingOperation extends OpSpec {
  readonly id: string;
  readonly phase: 'prepare' | 'cut' | 'sew-order' | 'assemble' | 'finish';
  readonly index: number;
}

// ─── Findings ────────────────────────────────────────────────────────────────
export type Severity = 'info' | 'warn' | 'error';

export type FindSubject =
  | { readonly kind: 'module'; readonly id: string }
  | { readonly kind: 'panel' }
  | { readonly kind: 'project' };

export type FixKind =
  | { readonly kind: 'widenBase'; readonly toMm: number }
  | { readonly kind: 'growHeight'; readonly toMm: number }
  | { readonly kind: 'setParam'; readonly moduleId: string; readonly key: string; readonly value: number | string | boolean }
  | { readonly kind: 'removeModule'; readonly moduleId: string }
  | { readonly kind: 'addModule'; readonly typeId: string }
  | { readonly kind: 'setFabricWidth'; readonly toMm: number }
  | { readonly kind: 'setCornerRadius'; readonly toMm: number };

export interface Finding {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly subject: FindSubject;
  /** NUR Zahlen/Strings — nie lokalisierter Text (Architekturprüfung K-05). */
  readonly values: Readonly<Record<string, number | string>>;
  readonly fix?: FixKind;
  readonly dismissible: boolean;
}

// ─── Module ──────────────────────────────────────────────────────────────────
export type ModuleTypeId =
  | 'M01'
  | 'M02'
  | 'M03'
  | 'M04'
  | 'M05'
  | 'M06'
  | 'M07'
  | 'M08'
  | 'M09'
  | 'M10'
  | 'M11'
  | 'M12'
  | 'M13'
  | 'M14'
  | 'M15'
  | 'M16';

export type ModuleCategory = 'taschen' | 'faecher' | 'nadeln' | 'elastik' | 'verschluss' | 'schmuck' | 'werkzeug' | 'struktur';

/** Wo ein Modul sitzt. */
export type Placement =
  /** In einer Zeile der Innenfläche (Standard). */
  | { readonly kind: 'row' }
  /** An einer Kante, überspannt die Panelnaht (Lasche, Knopfverschluss). */
  | { readonly kind: 'edge'; readonly edge: 'left' | 'right' | 'top' | 'bottom' };

export type FieldKind = 'length' | 'count' | 'enum' | 'bool';

export interface FieldSpec {
  readonly key: string;
  readonly labelKey: LocalizedKey;
  readonly kind: FieldKind;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly unitKey?: string;
  readonly options?: readonly { readonly value: string; readonly labelKey: LocalizedKey }[];
  /** true = nicht direkt editierbar (abgeleitet). */
  readonly derived?: boolean;
  readonly helpKey?: LocalizedKey;
  readonly groupKey?: LocalizedKey;
}

export type ParamValue = number | string | boolean;
export type Params = Readonly<Record<string, ParamValue>>;

export interface LayoutContext {
  readonly channelFreeMm: Mm;
  readonly panelWidthMm: Mm;
  readonly panelHeightMm: Mm;
  readonly rowHeightMm: Mm;
  readonly seamAllowanceMm: Mm;
  readonly fabricWidthMm: Mm;
}

/** Zeichenprimitive in LOKALEN Modulkoordinaten (0..w, 0..h), mm. */
export type Prim =
  | { readonly t: 'line'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly style: 'seam' | 'divide' | 'zip' | 'fold' | 'mark' | 'guide' }
  | { readonly t: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly style: 'pocket' | 'panel' | 'padding' | 'shadow' | 'hatch' }
  | { readonly t: 'circle'; readonly cx: number; readonly cy: number; readonly r: number; readonly style: 'ring' | 'button' | 'hole' | 'snap' }
  | { readonly t: 'text'; readonly x: number; readonly y: number; readonly text: string; readonly anchor?: 'start' | 'middle' | 'end' };

export interface ModuleDef {
  readonly id: ModuleTypeId;
  readonly nameKey: LocalizedKey;
  readonly category: ModuleCategory;
  readonly icon: string;
  readonly descriptionKey: LocalizedKey;
  readonly placement: Placement;
  readonly fields: readonly FieldSpec[];
  readonly defaults: Params;
  /** Optional: Höhe folgt aus Parameter (dann nicht per Griff skalierbar). */
  readonly derivedHeight?: boolean;
  /** Optional: Breite folgt aus Parameter. */
  readonly derivedWidth?: boolean;
  width(p: Params, ctx: LayoutContext): Mm;
  height(p: Params, ctx: LayoutContext): Mm;
  pieces(p: Params, ctx: LayoutContext, moduleId: string): readonly PieceSpec[];
  extraMaterials?(p: Params, ctx: LayoutContext): readonly ExtraMaterial[];
  operations(p: Params, ctx: LayoutContext, moduleId: string): readonly OpSpec[];
  validate(p: Params, ctx: LayoutContext, moduleId: string): readonly Finding[];
  draw(p: Params, w: number, h: number): readonly Prim[];
  /** Kurze Zusammenfassung für die Bibliothek/Statuszeile. */
  summary(p: Params): string;
  /** Suchbegriffe für die Bibliothek. */
  readonly tags: readonly string[];
}

export interface ExtraMaterial {
  readonly kind: MaterialKind;
  readonly spec: string;
  readonly labelKey: LocalizedKey;
  readonly amount: number;
  readonly unit: 'mm' | 'stk' | 'm2';
  readonly certainty: Certainty;
  readonly basisKey: LocalizedKey;
  readonly basisValues: Readonly<Record<string, number | string>>;
  readonly purchaseHintKey?: LocalizedKey;
}
