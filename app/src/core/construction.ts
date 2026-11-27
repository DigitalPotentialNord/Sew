/**
 * Konstruktion: Project → Construction.
 * Reine Funktion, deterministisch, ohne React/Zeit/Zufall.
 * Siehe docs/engineering/system-architecture.md §4 und construction-rules.md.
 */
import { hashString, mm, rect, type Mm, type Rect } from './geometry';
import { moduleDef } from './modules';
import { LIMITS, PRACTICE } from './practice';
import { findingKey } from './fixes';
import type {
  ExtraMaterial,
  Finding,
  LayoutContext,
  MaterialKind,
  ModuleTypeId,
  Params,
  PieceSpec,
  Prim,
  SewingOperation,
  Certainty,
} from './types';

// ─── Projektmodell (Eingabe) ─────────────────────────────────────────────────
export const SCHEMA_VERSION = 2;

export interface ProjectBase {
  readonly form: 'book';
  readonly widthMm: number;
  readonly heightMm: number;
  readonly spineWidthMm: number;
  readonly cornerRadiusMm: number;
  readonly hasLining: boolean;
}

export interface Instance {
  readonly id: string;
  readonly typeId: ModuleTypeId;
  readonly rowId: string;
  readonly params: Params;
  readonly rotation: 0 | 90 | 180 | 270;
  readonly locked: boolean;
}

export interface RowSpec {
  readonly id: string;
  readonly name: string;
}

export interface ProjectSettings {
  readonly seamAllowanceMm: number;
  readonly fabricWidthMm: number;
  readonly unit: 'mm' | 'cm';
}

export interface Project {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly base: ProjectBase;
  readonly rows: readonly RowSpec[];
  readonly modules: readonly Instance[];
  readonly settings: ProjectSettings;
}

// ─── Ausgabe ─────────────────────────────────────────────────────────────────
export interface PlacedModule {
  readonly instanceId: string;
  readonly typeId: ModuleTypeId;
  readonly rowId: string;
  readonly rect: Rect;
  readonly rotation: number;
  readonly params: Params;
  readonly locked: boolean;
  readonly prims: readonly Prim[];
  readonly summary: string;
}

export interface PlacedRow {
  readonly id: string;
  readonly name: string;
  readonly rect: Rect;
  readonly fillPct: number;
  readonly usedMm: Mm;
}

export interface ComputedPiece extends PieceSpec {
  readonly netRect: Rect;
  readonly cutRect: Rect;
  readonly radius: number;
  readonly sourceModuleId?: string;
}

export interface MaterialLine {
  readonly kind: MaterialKind;
  readonly spec: string;
  readonly labelKey: string;
  /** Verbrauchte Menge in der Einheit von `unit`. */
  readonly amount: number;
  /** Einheit der Anzeige: Länge (mm), Fläche (m2) oder Stück (stk). */
  readonly unit: 'mm' | 'm2' | 'stk';
  /**
   * Klartext der Menge mit Einheit — EINE Stelle, damit Tabelle, Druck und
   * Export nie unterschiedlich runden. Bei Flächenmaterial steht hier die
   * Meterware („0,39 m“), nicht eine Zahl mit falscher Einheit.
   */
  readonly display?: string;
  /** Kaufhinweis in Metern bei Meterware (Fläche ÷ Stoffbreite). */
  readonly meters?: number;
  readonly certainty: Certainty;
  readonly basisKey: string;
  readonly basisValues: Readonly<Record<string, number | string>>;
  readonly purchaseHintKey?: string;
  readonly sources: readonly string[];
}

export interface FabricPlan {
  readonly pieces: readonly { readonly pieceId: string; readonly rect: Rect; readonly count: number }[];
  readonly rows: number;
  readonly usedHeightMm: number;
  readonly meters: number;
  readonly wastePct: number;
}

export interface Construction {
  readonly projectHash: string;
  readonly practiceVersion: string;
  readonly flap: Rect;
  readonly rows: readonly PlacedRow[];
  readonly modules: readonly PlacedModule[];
  readonly pieces: readonly ComputedPiece[];
  readonly materials: readonly MaterialLine[];
  readonly fabricPlan: FabricPlan | null;
  readonly operations: readonly SewingOperation[];
  readonly findings: readonly Finding[];
  readonly metrics: {
    readonly moduleCount: number;
    readonly pieceCount: number;
    readonly cutPieceCount: number;
    readonly fabricAreaM2: number;
    readonly seamLengthMm: number;
    readonly channelFillPct: number;
    readonly errorCount: number;
    readonly warnCount: number;
  };
}

// ─── Hilfen ──────────────────────────────────────────────────────────────────
export function effectiveSeamAllowance(p: Project): Mm {
  return mm(p.settings.seamAllowanceMm);
}

/** Belegte Maße eines Moduls (Rotation 90/270 tauscht Breite und Höhe). */
export function occupied(inst: Instance, ctx: LayoutContext): { w: Mm; h: Mm } {
  const def = moduleDef(inst.typeId);
  const w = def.width(inst.params, ctx);
  const h = def.height(inst.params, ctx);
  return inst.rotation % 180 === 90 ? { w: h, h: w } : { w, h };
}

function baseContext(p: Project): LayoutContext {
  const availW = p.base.widthMm - 2 * PRACTICE.edgeMarginMm;
  return {
    channelFreeMm: mm(availW),
    panelWidthMm: mm(p.base.widthMm),
    panelHeightMm: mm(p.base.heightMm),
    rowHeightMm: mm(Math.max(0, p.base.heightMm - 2 * PRACTICE.edgeMarginMm)),
    seamAllowanceMm: effectiveSeamAllowance(p),
    fabricWidthMm: mm(p.settings.fabricWidthMm),
  };
}


/**
 * Prüfkontext für ein Modul: freier Platz in seiner Zeichenrichtung.
 * `drawWide` = das Modul steht quer (90°/270°), die Achsen sind getauscht.
 */
function checkContext(p: Project, drawWide: boolean, freeAlongRow: number, rowRoom: number): LayoutContext {
  const base = baseContext(p);
  // Quer stehende Module prüfen gegen die ZEILE als Ganzes: ihre 214 mm Inhalt
  // laufen waagerecht, ihre 18 mm Dicke senkrecht. Die Restplatz-Rechnung der
  // Zeile ist Sache von V-G-01, nicht die eines einzelnen Moduls.
  const availW = p.base.widthMm - 2 * PRACTICE.edgeMarginMm;
  return drawWide
    ? { ...base, channelFreeMm: mm(rowRoom), rowHeightMm: mm(availW) }
    : { ...base, channelFreeMm: mm(freeAlongRow), rowHeightMm: mm(rowRoom) };
}

function orientFinding(f: Finding, swap: boolean, p: Project): Finding {
  if (!swap || !f.fix) return f;
  if (f.fix.kind === 'widenBase') {
    const delta = Math.max(1, f.fix.toMm - p.base.widthMm);
    return { ...f, fix: { kind: 'growHeight', toMm: Math.round(p.base.heightMm + delta) } };
  }
  if (f.fix.kind === 'growHeight') {
    const delta = Math.max(1, f.fix.toMm - p.base.heightMm);
    return { ...f, fix: { kind: 'widenBase', toMm: Math.round(p.base.widthMm + delta) } };
  }
  return f;
}

// ─── Layout ──────────────────────────────────────────────────────────────────
function layout(p: Project): { rows: PlacedRow[]; modules: PlacedModule[]; findings: Finding[] } {
  const findings: Finding[] = [];
  const availW = p.base.widthMm - 2 * PRACTICE.edgeMarginMm;
  const availH = p.base.heightMm - 2 * PRACTICE.edgeMarginMm;

  // 1. Rohe Modulmaße je Zeile
  const raw = p.rows.map((row) => {
    const insts = p.modules.filter((m) => m.rowId === row.id);
    const ctx0 = baseContext(p);
    const dims = insts.map((inst) => ({ inst, dim: occupied(inst, ctx0) }));
    const height = dims.reduce((acc, d) => Math.max(acc, d.dim.h), 0);
    return { row, insts, dims, height };
  });

  // Zeilen sind in der Reihenfolge des Projekts angeordnet; ein gedrehtes Modul ist
  // breiter als seine Zeile hoch ist. Damit dieser Überhang ehrlich gemeldet wird,
  // steht die Überlappung im Befund — nicht als stille Abschneidung.
  const rowTop = new Map<string, number>();
  let acc = PRACTICE.edgeMarginMm;
  for (const r of raw) {
    rowTop.set(r.row.id, acc);
    acc += r.height;
  }

  const totalHeight = raw.reduce((acc, r) => acc + r.height, 0);
  const overflowH = Math.max(0, totalHeight - availH);

  // 2. Platzieren
  let y = PRACTICE.edgeMarginMm;
  const placedRows: PlacedRow[] = [];
  const placedModules: PlacedModule[] = [];

  for (const r of raw) {
    let x = PRACTICE.edgeMarginMm;
    const othersH = totalHeight - r.height;
    const rowRoom = Math.max(0, availH - othersH);

    const usedInRow = r.dims.reduce((acc, d) => acc + d.dim.w, 0);

    for (const { inst, dim } of r.dims) {
      const def = moduleDef(inst.typeId);
      const free = Math.max(0, availW - (usedInRow - dim.w));
      // Gedrehte Module prüfen gegen ihren GEDREHTEN Platzbedarf. Sonst meldet das
      // Regelwerk einen Platzmangel, der durch die Drehung gar nicht entsteht —
      // und verschweigt den vertikalen, den sie erzeugt (Nadelkanal um 90°).
      // Prüfkontext: freier Platz IN ZEICHENRICHTUNG des Moduls. Bei 90°/270° sind
      // die Achsen getauscht — dann ist die Zeilenhöhe die Breitenreserve und die
      // Breitenreserve der Zeile die Höhenreserve.
      const swap = inst.rotation % 180 === 90;
      const checkCtx = checkContext(p, swap, free, rowRoom);
      // Parameter auf den verfügbaren Raum begrenzen ist NICHT Aufgabe des Layouts —
      // das ist die Aufgabe der UI. Hier wird nur ehrlich platziert und gemeldet.
      const rectPlaced = rect(x, y, dim.w, dim.h);

      // Gezeichnet wird in den UNGEDREHTEN Maßen; die Drehung sitzt als
      // SVG-Transformation um den Modulmittelpunkt (siehe Canvas). Damit ist die
      // Drehung echte Geometrie (die Fläche dreht sich mit ihrem Inhalt) und
      // nicht bloß ein umsortiertes Rechteck.
      const drawW = swap ? dim.h : dim.w;
      const drawH = swap ? dim.w : dim.h;
      placedModules.push({
        instanceId: inst.id,
        typeId: inst.typeId,
        rowId: r.row.id,
        rect: rectPlaced,
        rotation: inst.rotation,
        params: inst.params,
        locked: inst.locked,
        prims: def.draw(inst.params, drawW, drawH),
        summary: def.summary(inst.params),
      });

      findings.push(...def.validate(inst.params, checkCtx, inst.id).map((f) => orientFinding(f, swap, p)));
      x += dim.w;
    }

    // Modul, das höher ist als seine Zeile: Überlappung mit der nächsten Zeile.
    for (const { inst, dim } of r.dims) {
      if (dim.h <= r.height) continue;
      findings.push({
        ruleId: 'V-G-14',
        severity: 'error',
        subject: { kind: 'module', id: inst.id },
        values: {
          typ: inst.typeId,
          hoehe: Math.round(dim.h),
          zeile: r.row.name,
          zeilenhoehe: Math.round(r.height),
          ueberhang: Math.round(dim.h - r.height),
        },
        fix: { kind: 'growHeight', toMm: Math.round(p.base.heightMm + (dim.h - r.height)) },
        dismissible: false,
      });
    }

    const usedMm = mm(x === PRACTICE.edgeMarginMm ? 0 : x - PRACTICE.edgeMarginMm);
    const fillPct = availW > 0 ? Math.round((usedMm / availW) * 100) : 0;
    placedRows.push({
      id: r.row.id,
      name: r.row.name,
      rect: rect(PRACTICE.edgeMarginMm, y, availW, Math.max(r.height, 1)),
      fillPct,
      usedMm,
    });
    y += r.height;
  }

  // 3. Globale Regeln
  const flapW = p.base.widthMm;
  const flapH = p.base.heightMm;

  for (const r of placedRows) {
    if (r.usedMm > availW) {
      findings.push({
        ruleId: 'V-G-01',
        severity: 'error',
        subject: { kind: 'panel' },
        values: {
          zeile: r.name,
          belegt: Math.round(r.usedMm),
          verfuegbar: Math.round(availW),
          fehlt: Math.round(r.usedMm - availW),
        },
        fix: { kind: 'widenBase', toMm: Math.round(flapW + (r.usedMm - availW)) },
        dismissible: false,
      });
    }
  }

  if (overflowH > 0) {
    findings.push({
      ruleId: 'V-G-13',
      severity: 'error',
      subject: { kind: 'panel' },
      values: {
        benoetigt: Math.round(totalHeight),
        verfuegbar: Math.round(availH),
        fehlt: Math.round(overflowH),
      },
      fix: { kind: 'growHeight', toMm: Math.round(flapH + overflowH) },
      dismissible: false,
    });
  }

  if (p.modules.length === 0) {
    findings.push({
      ruleId: 'V-G-03',
      severity: 'warn',
      subject: { kind: 'project' },
      values: { module: 0, breite: Math.round(flapW), hoehe: Math.round(flapH) },
      fix: { kind: 'addModule', typeId: 'M06' },
      dismissible: true,
    });
  } else {
    const hasClosure = p.modules.some((m) => m.typeId === 'M07' || m.typeId === 'M08');
    if (!hasClosure) {
      findings.push({
        ruleId: 'V-G-10',
        severity: 'warn',
        subject: { kind: 'project' },
        values: { hoehe: Math.round(flapH) },
        fix: { kind: 'addModule', typeId: 'M07' },
        dismissible: true,
      });
    }
    if (p.modules.length > LIMITS.maxModulesPerChannel) {
      findings.push({
        ruleId: 'V-G-09',
        severity: 'warn',
        subject: { kind: 'project' },
        values: { anzahl: p.modules.length, max: LIMITS.maxModulesPerChannel },
        dismissible: true,
      });
    }
  }

  for (const r of placedRows) {
    if (r.fillPct > LIMITS.channelFillWarnPct && r.usedMm > 0) {
      findings.push({
        ruleId: 'V-G-08',
        severity: 'warn',
        subject: { kind: 'panel' },
        values: { zeile: r.name, pct: r.fillPct },
        fix: { kind: 'widenBase', toMm: Math.round(flapW + (r.usedMm - availW)) },
        dismissible: true,
      });
    }
    if (r.fillPct > 0 && r.fillPct < LIMITS.channelFillInfoPct) {
      findings.push({
        ruleId: 'V-G-07',
        severity: 'info',
        subject: { kind: 'panel' },
        values: { zeile: r.name, pct: r.fillPct, belegt: Math.round(r.usedMm), verfuegbar: Math.round(availW) },
        dismissible: true,
      });
    }
  }

  if (p.base.cornerRadiusMm > 0 && p.base.cornerRadiusMm < p.settings.seamAllowanceMm + 2) {
    findings.push({
      ruleId: 'V-G-05',
      severity: 'error',
      subject: { kind: 'panel' },
      values: { radius: p.base.cornerRadiusMm, nz: p.settings.seamAllowanceMm },
      fix: { kind: 'setCornerRadius', toMm: p.settings.seamAllowanceMm + 4 },
      dismissible: false,
    });
  }

  return { rows: placedRows, modules: placedModules, findings };
}

// ─── Schnittteile ────────────────────────────────────────────────────────────
function buildPieces(p: Project, modules: readonly PlacedModule[]): ComputedPiece[] {
  const nz = effectiveSeamAllowance(p);
  const pieces: ComputedPiece[] = [];

  const panelW = 2 * p.base.widthMm + p.base.spineWidthMm;
  const panelH = p.base.heightMm;

  const mk = (spec: PieceSpec, sourceModuleId?: string): ComputedPiece => {
    const cutRect = rect(0, 0, spec.w, spec.h);
    const hasSA = spec.kind === 'cut' && (spec.netW < spec.w || spec.netH < spec.h);
    const nx =
      spec.netX !== undefined
        ? spec.netX
        : hasSA
          ? Math.max(0, Math.round((spec.w - spec.netW) / 2))
          : 0;
    const ny =
      spec.netY !== undefined
        ? spec.netY
        : hasSA
          ? Math.max(0, Math.round((spec.h - spec.netH) / 2))
          : 0;
    const netRect = spec.kind === 'cut' ? rect(nx, ny, spec.netW, spec.netH) : rect(0, 0, spec.w, spec.h);
    const radius = spec.role === 'panel' || spec.role === 'lining' ? p.base.cornerRadiusMm : 0;
    return {
      ...spec,
      netRect,
      cutRect,
      radius,
      ...(sourceModuleId ? { sourceModuleId } : {}),
    };
  };

  // Grundform: immer vorhanden (T-S-01)
  pieces.push(
    mk({
      id: 'panel-aussen',
      nameKey: 'piece.panel-aussen',
      kind: 'cut',
      w: mm(panelW + 2 * nz),
      h: mm(panelH + 2 * nz),
      netW: mm(panelW),
      netH: mm(panelH),
      count: 1,
      material: 'fabric',
      grain: 'lengthwise',
      certainty: 'exact',
      role: 'panel',
      foldEdge: 'none',
      noteKey: 'note.panel-aussen',
    }),
  );

  if (p.base.hasLining) {
    pieces.push(
      mk({
        id: 'panel-futter',
        nameKey: 'piece.panel-futter',
        kind: 'cut',
        w: mm(panelW + 2 * nz),
        h: mm(panelH + 2 * nz),
        netW: mm(panelW),
        netH: mm(panelH),
        count: 1,
        material: 'lining',
        grain: 'lengthwise',
        certainty: 'exact',
        role: 'lining',
        foldEdge: 'none',
        noteKey: 'note.panel-futter',
      }),
    );
  }

  for (const m of modules) {
    const def = moduleDef(m.typeId);
    const ctx: LayoutContext = {
      ...baseContext(p),
      seamAllowanceMm: nz,
    };
    const specs = def.pieces(m.params, ctx, m.instanceId);
    // Rotation (90/180/270) dreht Geometrie, Nähfeld (netX/netY) und Bruchkante exakt mit
    for (const spec of specs) {
      if (spec.kind === 'cut' && m.rotation !== 0) {
        const hasSA = spec.netW < spec.w || spec.netH < spec.h;
        const nx0 = spec.netX ?? (hasSA ? Math.max(0, Math.round((spec.w - spec.netW) / 2)) : 0);
        const ny0 = spec.netY ?? (hasSA ? Math.max(0, Math.round((spec.h - spec.netH) / 2)) : 0);
        const fold90: Record<NonNullable<PieceSpec['foldEdge']>, NonNullable<PieceSpec['foldEdge']>> = {
          top: 'right', right: 'bottom', bottom: 'left', left: 'top', none: 'none',
        };
        const fold180: Record<NonNullable<PieceSpec['foldEdge']>, NonNullable<PieceSpec['foldEdge']>> = {
          top: 'bottom', right: 'left', bottom: 'top', left: 'right', none: 'none',
        };
        const fold270: Record<NonNullable<PieceSpec['foldEdge']>, NonNullable<PieceSpec['foldEdge']>> = {
          top: 'left', left: 'bottom', bottom: 'right', right: 'top', none: 'none',
        };
        if (m.rotation === 90) {
          pieces.push(
            mk(
              {
                ...spec,
                w: spec.h,
                h: spec.w,
                netW: spec.netH,
                netH: spec.netW,
                netX: mm(Math.max(0, spec.h - ny0 - spec.netH)),
                netY: mm(nx0),
                foldEdge: fold90[spec.foldEdge ?? 'none'],
              },
              m.instanceId,
            ),
          );
        } else if (m.rotation === 180) {
          pieces.push(
            mk(
              {
                ...spec,
                netX: mm(Math.max(0, spec.w - nx0 - spec.netW)),
                netY: mm(Math.max(0, spec.h - ny0 - spec.netH)),
                foldEdge: fold180[spec.foldEdge ?? 'none'],
              },
              m.instanceId,
            ),
          );
        } else {
          pieces.push(
            mk(
              {
                ...spec,
                w: spec.h,
                h: spec.w,
                netW: spec.netH,
                netH: spec.netW,
                netX: mm(ny0),
                netY: mm(Math.max(0, spec.w - nx0 - spec.netW)),
                foldEdge: fold270[spec.foldEdge ?? 'none'],
              },
              m.instanceId,
            ),
          );
        }
      } else {
        pieces.push(mk(spec, m.instanceId));
      }
    }
  }

  // deterministische Reihenfolge: Grundform zuerst, dann Module, dann ID
  const order = (a: ComputedPiece): number => (a.role === 'panel' ? 0 : a.role === 'lining' ? 1 : 2);
  return pieces.sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id));
}

// ─── Materialplanung: Shelf-Packing mit Fadenlauf-Sperre ─────────────────────
export function packFabric(
  pieces: readonly ComputedPiece[],
  fabricWidthMm: number,
  material: MaterialKind,
): FabricPlan {
  const items: { pieceId: string; rect: Rect; count: number }[] = [];
  const relevant = pieces.filter((p) => p.material === material && p.kind === 'cut');

  // absteigend nach Höhe (deterministisch: Höhe, dann Breite, dann ID)
  const expanded: { id: string; w: number; h: number }[] = [];
  for (const p of relevant) {
    for (let i = 0; i < p.count; i++) expanded.push({ id: p.id, w: p.w, h: p.h });
  }
  expanded.sort((a, b) => b.h - a.h || b.w - a.w || a.id.localeCompare(b.id));

  const wastePct = 22;
  if (expanded.length === 0) {
    return { pieces: [], rows: 0, usedHeightMm: 0, meters: 0, wastePct };
  }
  const usableWidth = fabricWidthMm * 0.98;
  let shelfY = 0;
  let shelfH = 0;
  let x = 0;
  let rows = 0;

  for (const e of expanded) {
    if (e.w > fabricWidthMm) {
      // passt nicht in die Stoffbreite → wird als Warnung gemeldet, hier trotzdem platziert
      items.push({ pieceId: e.id, rect: rect(0, shelfY, e.w, e.h), count: 1 });
      shelfY += e.h;
      rows += 1;
      continue;
    }
    if (x + e.w > usableWidth) {
      shelfY += shelfH;
      shelfH = 0;
      x = 0;
      rows += 1;
    }
    items.push({ pieceId: e.id, rect: rect(x, shelfY, e.w, e.h), count: 1 });
    x += e.w;
    shelfH = Math.max(shelfH, e.h);
  }

  const usedHeight = mm(shelfY + shelfH);
  const meters = Math.ceil(((usedHeight * (1 + wastePct / 100)) / 1000) * 100) / 100;
  return { pieces: items, rows: rows + 1, usedHeightMm: usedHeight, meters, wastePct };
}


/** Klartext einer Menge — die EINZIGE Stelle, an der Mengen gerundet werden. */
export function formatAmount(amount: number, unit: MaterialLine['unit']): string {
  switch (unit) {
    case 'mm':
      return amount >= 1000
        ? `${(amount / 1000).toFixed(2).replace('.', ',')} m`
        : `${Math.round(amount)} mm`;
    case 'm2':
      return `${amount.toFixed(3).replace('.', ',')} m²`;
    case 'stk':
      return `${Math.round(amount)} Stk`;
    default:
      return String(amount);
  }
}

// ─── Materialien ─────────────────────────────────────────────────────────────
const MAT_LABEL: Record<MaterialKind, string> = {
  fabric: 'mat.fabric',
  lining: 'mat.lining',
  interfacing: 'mat.interfacing',
  batting: 'mat.batting',
  elastic: 'mat.elastic',
  zipper: 'mat.zipper',
  button: 'mat.button',
  snap: 'mat.snap',
  velcro: 'mat.velcro',
  webbing: 'mat.webbing',
  ring: 'mat.ring',
  thread: 'mat.thread',
};

function buildMaterials(p: Project, pieces: readonly ComputedPiece[]): { materials: MaterialLine[]; fabricPlan: FabricPlan | null } {
  const lines: MaterialLine[] = [];
  const fabricWidth = p.settings.fabricWidthMm;

  for (const kind of ['fabric', 'lining', 'interfacing', 'batting'] as const) {
    const relevant = pieces.filter((pc) => pc.material === kind && pc.kind === 'cut');
    if (relevant.length === 0) continue;
    const plan = packFabric(pieces, fabricWidth, kind);
    const areaMm2 = relevant.reduce((acc, pc) => acc + pc.w * pc.h * pc.count, 0);
    lines.push({
      kind,
      spec: kind === 'fabric' ? 'canvas-240g' : kind === 'lining' ? 'popeline' : kind === 'interfacing' ? 'h250' : 'vlies-80g',
      labelKey: MAT_LABEL[kind],
      amount: Math.round((areaMm2 / 1e6) * 1000) / 1000,
      unit: 'm2',
      meters: plan.meters,
      certainty: 'estimated',
      basisKey: 'basis.flaeche',
      basisValues: {
        teile: relevant.reduce((a, pc) => a + pc.count, 0),
        flaeche: Math.round(areaMm2 / 100) / 10,
        breite: fabricWidth,
        verschnitt: plan.wastePct,
      },
      sources: relevant.map((pc) => pc.id),
    });
  }

  // Zusatzmaterialien der Module (Knöpfe, Ösen, Klett, exakte Band/RV-Specs …)
  // Pro Modul: Wenn extraMaterials eine Materialart (z. B. zipper/elastic/webbing)
  // mit konkreter Spezifikation deklariert, übernimmt diese die Stückliste und
  // zieht ihre `sources` aus den Längen-Teilen desselben Moduls — so werden
  // RV (M03), Gummi (M04) und Gurtband (M05) nie doppelt gezählt.
  const ctx0 = baseContext(p);
  const coveredByExtra = new Set<string>();
  const modLengthSources = new Map<string, string[]>();
  for (const pc of pieces) {
    if (pc.kind !== 'length' || !pc.sourceModuleId) continue;
    const mkKey = `${pc.sourceModuleId}:${pc.material}`;
    const arr = modLengthSources.get(mkKey);
    if (arr) arr.push(pc.id);
    else modLengthSources.set(mkKey, [pc.id]);
  }

  const extra: (ExtraMaterial & { sources: string[] })[] = [];
  for (const m of p.modules) {
    const def = moduleDef(m.typeId);
    if (def.extraMaterials) {
      for (const em of def.extraMaterials(m.params, ctx0)) {
        const mkKey = `${m.id}:${em.kind}`;
        coveredByExtra.add(mkKey);
        extra.push({ ...em, sources: modLengthSources.get(mkKey) ?? [] });
      }
    }
  }

  // Längenmaterial (nur Teile, die nicht durch extraMaterials desselben Moduls abgedeckt sind)
  const lengthPieces = pieces.filter((pc) => pc.kind === 'length');
  const grouped = new Map<string, { mat: MaterialKind; total: number; certainty: Certainty; sources: string[] }>();
  for (const pc of lengthPieces) {
    if (pc.sourceModuleId && coveredByExtra.has(`${pc.sourceModuleId}:${pc.material}`)) continue;
    const key = `${pc.material}:${pc.id}`;
    const prev = grouped.get(key);
    const certainty: Certainty = pc.certainty;
    if (prev) {
      prev.total += pc.w * pc.count;
      if (!prev.sources.includes(pc.id)) prev.sources.push(pc.id);
      if (certainty === 'estimated') prev.certainty = 'estimated';
    } else {
      grouped.set(key, { mat: pc.material, total: pc.w * pc.count, certainty, sources: [pc.id] });
    }
  }
  for (const [, g] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (g.mat === 'thread') continue; // Garn wird am Ende geschätzt
    lines.push({
      kind: g.mat,
      spec: `${g.mat}-standard`,
      labelKey: MAT_LABEL[g.mat],
      amount: Math.round(g.total),
      unit: 'mm',
      certainty: g.certainty,
      basisKey: 'basis.laenge',
      basisValues: { laenge: Math.round(g.total) },
      sources: g.sources,
    });
  }

  // Zusatzmaterial gruppiert nach Art UND Spezifikation. Punktmaterial (Stück) wird
  // addiert, Längenmaterial wird zu EINEM zusammenhängenden Stück zusammengefasst:
  // zwei Reißverschlüsse à 170 mm sind ein Kauf von 340 mm, nicht 340 mm »exakt«
  // in einem Zug — deshalb auch der Hinweis auf die Teilstücke in der Grundlage.
  const extraGroups = new Map<string, ExtraMaterial & { amount: number; parts: number; sources: string[] }>();
  for (const e of extra) {
    const key = `${e.kind}:${e.spec}`;
    const prev = extraGroups.get(key);
    if (prev) {
      prev.amount += e.amount;
      prev.parts += 1;
      for (const s of e.sources) if (!prev.sources.includes(s)) prev.sources.push(s);
    } else {
      extraGroups.set(key, { ...e, parts: 1, sources: [...e.sources] });
    }
  }
  for (const [, e] of [...extraGroups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const partial = e.parts > 1 && e.unit === 'mm';
    lines.push({
      kind: e.kind,
      spec: e.spec,
      labelKey: e.labelKey,
      // Längen in mm werden auf ganze mm gerundet; Flächen (m²) NICHT — sonst
      // wird aus 0,0049 m² eine Null.
      amount: e.unit === 'mm' ? Math.round(e.amount) : e.amount,
      unit: e.unit,
      certainty: e.certainty,
      basisKey: partial ? 'basis.summe' : e.basisKey,
      basisValues: partial ? { teile: e.parts, summe: Math.round(e.amount) } : e.basisValues,
      ...(e.purchaseHintKey ? { purchaseHintKey: e.purchaseHintKey } : {}),
      sources: e.sources,
    });
  }

  // Garn: Nähtlänge × Faktor
  const seamLength = pieces
    .filter((pc) => pc.kind === 'cut')
    .reduce((acc, pc) => acc + 2 * (pc.w + pc.h) * pc.count, 0);
  const threadMm = Math.round(seamLength * PRACTICE.threadDensityFactor);
  if (threadMm > 0) {
    lines.push({
      kind: 'thread',
      spec: 'allnadel-40',
      labelKey: MAT_LABEL.thread,
      amount: threadMm,
      unit: 'mm',
      certainty: 'estimated',
      basisKey: 'basis.garn',
      basisValues: { naht: Math.round(seamLength), faktor: PRACTICE.threadDensityFactor },
      sources: [],
    });
  }

  const fabricPlan = packFabric(pieces, fabricWidth, 'fabric');
  // Mengen von 0 sind keine Materialzeile, sondern Rauschen: eine Zeile ohne
  // Verbrauch würde im Zuschnitt eine Kaufentscheidung vortäuschen.
  const used = lines.filter((l) => l.amount > 0);
  const withDisplay = used.map((l) => {
    // Flächenmaterial wird als Meterware angezeigt — die Zahl mit der Einheit,
    // in der man es kauft. Einlage in Form eines einzelnen Zuschnitts dagegen
    // als Stück: „0,000 m² Einlage“ hilft niemandem.
    if (l.meters !== undefined) {
      return { ...l, display: `${l.meters.toFixed(2).replace('.', ',')} m Meterware` };
    }
    if (l.unit === 'm2' && l.amount > 0) {
      // Einzelzuschnitte haben keine sinnvolle Meterware: hier steht die Fläche
      // mit vier Nachkommastellen. Maße zu erfinden wäre schlimmer als eine Zahl.
      const { breite, hoehe } = l.basisValues;
      const size = typeof breite === 'number' && typeof hoehe === 'number' ? `${breite} × ${hoehe} mm · ` : '';
      return { ...l, display: `${size}${l.amount.toFixed(4).replace('.', ',')} m²` };
    }
    return { ...l, display: formatAmount(l.amount, l.unit) };
  });
  return { materials: withDisplay.sort((a, b) => a.kind.localeCompare(b.kind) || a.spec.localeCompare(b.spec)), fabricPlan };
}

// ─── Nähoperationen: DAG + deterministische topologische Sortierung ──────────
const PHASE_OF: Record<string, SewingOperation['phase']> = {
  cut: 'cut',
  fuse: 'prepare',
  press: 'prepare',
  mark: 'prepare',
  baste: 'sew-order',
  stitch: 'sew-order',
  'stitch-divider': 'sew-order',
  'install-zip': 'sew-order',
  'thread-elastic': 'sew-order',
  'insert-strap': 'assemble',
  'close-panel': 'assemble',
  turn: 'assemble',
  topstitch: 'finish',
  'attach-button': 'finish',
  'attach-snap': 'finish',
  'final-check': 'finish',
};

const PHASE_ORDER: SewingOperation['phase'][] = ['prepare', 'cut', 'sew-order', 'assemble', 'finish'];

function buildOperations(p: Project, pieces: readonly ComputedPiece[]): SewingOperation[] {
  interface Node {
    id: string;
    kind: SewingOperation['kind'];
    moduleId?: string;
    titleKey: string;
    values: Record<string, number | string>;
    deps: Set<string>;
    phase: SewingOperation['phase'];
    seq: number;
  }
  const nodes: Node[] = [];
  const push = (n: Omit<Node, 'deps' | 'phase'> & { deps?: string[]; phase?: SewingOperation['phase'] }): Node => {
    const node: Node = {
      ...n,
      deps: new Set(n.deps ?? []),
      phase: n.phase ?? PHASE_OF[n.kind] ?? 'sew-order',
    };
    nodes.push(node);
    return node;
  };

  let seq = 0;
  const cutId = 'op-cut';
  push({ id: cutId, kind: 'cut', titleKey: 'op.cut-pieces', values: { teile: pieces.filter((x) => x.kind === 'cut').length }, seq: seq++ });

  const moduleOps: { id: string; kind: string }[] = [];
  p.modules.forEach((m, i) => {
    const def = moduleDef(m.typeId);
    const ctx = baseContext(p);
    let prevOpId: string | null = null;
    def.operations(m.params, ctx, m.id).forEach((op, j) => {
      const id = `${m.id}-${j}-${op.kind}`;
      const isPostTurn = op.kind === 'attach-button' || op.kind === 'attach-snap';
      // Modul-spezifisches Absteppen (z. B. RV-Beutel M03) passiert VOR der Panelnaht,
      // nicht erst nach dem Wenden des Organizers.
      const phase: SewingOperation['phase'] =
        op.kind === 'topstitch' ? 'sew-order' : PHASE_OF[op.kind] ?? 'sew-order';
      const deps = prevOpId && !isPostTurn ? [cutId, prevOpId] : [cutId];
      push({
        id,
        kind: op.kind,
        moduleId: m.id,
        titleKey: op.titleKey,
        values: { ...op.values, modul: def.nameKey, nr: i + 1 },
        deps,
        phase,
        seq: seq++,
      });
      moduleOps.push({ id, kind: op.kind });
      if (!isPostTurn) prevOpId = id;
    });
  });

  // Panelnaht fasst ALLE Modulzulagen → hängt an allen Moduloperationen
  const closeId = 'op-close';
  push({
    id: closeId,
    kind: 'close-panel',
    titleKey: 'op.close-panel',
    values: { module: p.modules.length, nz: p.settings.seamAllowanceMm },
    deps: [...moduleOps.filter((o) => o.kind !== 'attach-button' && o.kind !== 'attach-snap').map((o) => o.id)],
    seq: seq++,
  });
  const turnId = 'op-turn';
  push({ id: turnId, kind: 'turn', titleKey: 'op.turn-panel', values: { nz: p.settings.seamAllowanceMm }, deps: [closeId], seq: seq++ });
  push({ id: 'op-topstitch', kind: 'topstitch', titleKey: 'op.topstitch-edge', values: { nz: p.settings.seamAllowanceMm }, deps: [turnId], seq: seq++ });

  // Knöpfe/Ösen NACH dem Wenden
  for (const o of moduleOps.filter((x) => x.kind === 'attach-button' || x.kind === 'attach-snap')) {
    const n = nodes.find((x) => x.id === o.id);
    n?.deps.add(turnId);
  }
  push({ id: 'op-final', kind: 'final-check', titleKey: 'op.final-check', values: { teile: pieces.filter((x) => x.kind === 'cut').length }, deps: ['op-topstitch'], seq: seq++ });

  // Kahn mit Adjazenzliste O(V log V + E) und deterministischem Sortierschlüssel
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const indeg = new Map<string, number>();
  const dependents = new Map<string, Node[]>();
  for (const n of nodes) {
    indeg.set(n.id, 0);
    dependents.set(n.id, []);
  }
  for (const n of nodes) {
    for (const d of n.deps) {
      if (byId.has(d)) {
        indeg.set(n.id, (indeg.get(n.id) ?? 0) + 1);
        dependents.get(d)!.push(n);
      }
    }
  }

  const phaseRank = (phase: SewingOperation['phase']): number => PHASE_ORDER.indexOf(phase);
  const cmp = (a: Node, b: Node): number => {
    const pa = phaseRank(a.phase);
    const pb = phaseRank(b.phase);
    if (pa !== pb) return pa - pb;
    const ma = a.moduleId ?? '\uffff';
    const mb = b.moduleId ?? '\uffff';
    if (ma !== mb) return ma < mb ? -1 : 1;
    return a.seq - b.seq;
  };

  const ready = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).sort(cmp);
  const out: Node[] = [];
  while (ready.length > 0) {
    const n = ready.shift()!;
    out.push(n);
    const nexts = dependents.get(n.id) ?? [];
    if (nexts.length > 0) {
      let inserted = false;
      for (const m of nexts) {
        const d = (indeg.get(m.id) ?? 0) - 1;
        indeg.set(m.id, d);
        if (d === 0) {
          ready.push(m);
          inserted = true;
        }
      }
      if (inserted) ready.sort(cmp);
    }
  }
  if (out.length !== nodes.length) {
    throw new Error('Operationsgraph enthält einen Zyklus');
  }

  return out.map((n, i) => ({
    id: n.id,
    kind: n.kind,
    ...(n.moduleId ? { moduleId: n.moduleId } : {}),
    dependsOn: [...n.deps].sort(),
    titleKey: n.titleKey,
    values: n.values,
    phase: n.phase,
    index: i + 1,
  }));
}

// ─── Hauptfunktion ───────────────────────────────────────────────────────────
export function construct(p: Project): Construction {
  const { rows, modules, findings: layoutFindings } = layout(p);
  const pieces = buildPieces(p, modules);
  const { materials, fabricPlan } = buildMaterials(p, pieces);
  const operations = buildOperations(p, pieces);

  const findings: Finding[] = [...layoutFindings];

  // Stoffbreite gegen Teilebreite (V-G-12)
  for (const pc of pieces) {
    if (pc.kind === 'cut' && (pc.material === 'fabric' || pc.material === 'lining') && pc.w > p.settings.fabricWidthMm) {
      findings.push({
        ruleId: 'V-G-12',
        severity: 'warn',
        subject: { kind: 'project' },
        values: { teil: pc.nameKey, breite: Math.round(pc.w), stoff: p.settings.fabricWidthMm },
        fix: { kind: 'setFabricWidth', toMm: Math.round(pc.w + 40) },
        dismissible: true,
      });
    }
  }

  const dedup = new Map<string, Finding>();
  for (const f of findings) {
    const k = findingKey(f); // identische Formel wie in fixes.ts — eine Stelle
    if (!dedup.has(k)) dedup.set(k, f);
  }
  const sorted = [...dedup.values()].sort(
    (a, b) =>
      (a.severity === 'error' ? 0 : a.severity === 'warn' ? 1 : 2) -
        (b.severity === 'error' ? 0 : b.severity === 'warn' ? 1 : 2) ||
      a.ruleId.localeCompare(b.ruleId) ||
      JSON.stringify(a.values).localeCompare(JSON.stringify(b.values)),
  );

  const flap = rect(0, 0, p.base.widthMm, p.base.heightMm);
  const fabricAreaM2 =
    pieces.filter((x) => x.kind === 'cut' && (x.material === 'fabric' || x.material === 'lining')).reduce((a, x) => a + (x.w * x.h * x.count) / 1e6, 0);
  const seamLengthMm = pieces.filter((x) => x.kind === 'cut').reduce((a, x) => a + 2 * (x.w + x.h) * x.count, 0);
  const totalUsed = rows.reduce((a, r) => a + r.usedMm, 0);
  const totalAvail = rows.length * (p.base.widthMm - 2 * PRACTICE.edgeMarginMm);

  // I7/I8: der Hash hängt nur an der ABSICHT (Base, Zeilen, Modulparameter, Praxisversion),
  // nicht an IDs, Zeitstempeln oder der Speicherreihenfolge — die Reihenfolge selbst steckt
  // numerisch in `order` und ändert den Hash weiterhin, sobald sie wirklich tauscht (I6).
  const hashInput = JSON.stringify({
    practice: PRACTICE.version,
    base: p.base,
    rows: p.rows.map((r) => r.name),
    modules: p.modules
      .map((m) => ({
        typeId: m.typeId,
        row: p.rows.findIndex((r) => r.id === m.rowId),
        params: Object.keys(m.params)
          .sort()
          .map((k) => [k, m.params[k]]),
        rotation: m.rotation,
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    settings: p.settings,
  });

  return {
    projectHash: hashString(hashInput),
    practiceVersion: PRACTICE.version,
    flap,
    rows,
    modules,
    pieces,
    materials,
    fabricPlan,
    operations,
    findings: sorted,
    metrics: {
      moduleCount: p.modules.length,
      pieceCount: pieces.length,
      cutPieceCount: pieces.filter((x) => x.kind === 'cut').length,
      fabricAreaM2: Math.round(fabricAreaM2 * 1000) / 1000,
      seamLengthMm: Math.round(seamLengthMm),
      channelFillPct: totalAvail > 0 ? Math.round((totalUsed / totalAvail) * 100) : 0,
      errorCount: sorted.filter((f) => f.severity === 'error').length,
      warnCount: sorted.filter((f) => f.severity === 'warn').length,
    },
  };
}
