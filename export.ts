/**
 * Export: aus EINER Konstruktion werden SVG, Druckbögen und PDF.
 * Keine zweite Geometrie — siehe docs/engineering/export-system.md.
 */
import { roundedRectPath, type Mm, type Rect } from './geometry';
import type { ComputedPiece, Construction } from './construction';

// ─── SVG (1 Einheit = 1 mm) ──────────────────────────────────────────────────
const STYLE: Record<string, string> = {
  cut: 'fill="none" stroke="#111" stroke-width="0.4"',
  sew: 'fill="none" stroke="#8a8a8a" stroke-width="0.25" stroke-dasharray="3 2"',
  fold: 'fill="none" stroke="#9a9a9a" stroke-width="0.3" stroke-dasharray="6 2 1 2"',
  grain: 'fill="none" stroke="#111" stroke-width="0.25"',
  mark: 'fill="none" stroke="#111" stroke-width="0.3"',
};

const asMm = (n: number): Mm => n as Mm;

function pieceGroup(piece: ComputedPiece, x: number, y: number): string {
  const r: Rect = { x: asMm(x), y: asMm(y), w: piece.w, h: piece.h };
  const nz = Math.max(0, Math.round((piece.w - piece.netW) / 2));
  const net: Rect = { x: asMm(x + nz), y: asMm(y + nz), w: piece.netW, h: piece.netH };
  const grainX = x + piece.w / 2;
  const parts: string[] = [];
  parts.push(`<g id="piece-${piece.id}" data-piece="${piece.id}" data-count="${piece.count}" data-material="${piece.material}">`);
  parts.push(`<path d="${roundedRectPath(r, piece.radius)}" class="cut" ${STYLE.cut}/>`);
  parts.push(`<path d="${roundedRectPath(net, 0)}" class="sew" ${STYLE.sew}/>`);
  parts.push(`<path d="M${grainX},${y + 8} V${y + piece.h - 8}" class="grain" ${STYLE.grain}/>`);
  parts.push(`<path d="M${grainX - 3},${y + 13} L${grainX},${y + 8} L${grainX + 3},${y + 13}" ${STYLE.grain}/>`);
  if (piece.foldEdge && piece.foldEdge !== 'none') {
    const fy = piece.foldEdge === 'bottom' ? y + piece.h : y;
    parts.push(`<path d="M${x + 2},${fy} H${x + piece.w - 2}" class="fold" ${STYLE.fold}/>`);
  }
  parts.push(
    `<text x="${x + piece.w / 2}" y="${y + piece.h / 2}" class="label" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="5" fill="#111">${piece.id} · ${piece.count}× · ${piece.w}×${piece.h} mm</text>`,
  );
  parts.push('</g>');
  return parts.join('\n    ');
}

export function toSvg(c: Construction): string {
  const cut = c.pieces.filter((p) => p.kind === 'cut');
  const gap = 20;
  const perRow = Math.max(1, Math.min(4, cut.length));
  let x = gap;
  let y = gap;
  let rowH = 0;
  const placements: { piece: ComputedPiece; x: number; y: number }[] = [];
  let col = 0;
  for (const p of cut) {
    placements.push({ piece: p, x, y });
    x += p.w + gap;
    rowH = Math.max(rowH, p.h);
    col += 1;
    if (col >= perRow) {
      col = 0;
      x = gap;
      y += rowH + gap;
      rowH = 0;
    }
  }
  const width = Math.ceil(Math.max(...placements.map((p) => p.x + p.piece.w), 100) + gap);
  const height = Math.ceil(y + rowH + gap);
  const body = placements.map((pl) => pieceGroup(pl.piece, pl.x, pl.y)).join('\n    ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
  <!-- Organizer Studio · Praxiswerte ${c.practiceVersion} · Hash ${c.projectHash} -->
  <g id="calibration"><path d="M10,10 h50 v50 h-50 Z" fill="none" stroke="#111" stroke-width="0.3"/>
    <text x="10" y="8" font-family="Helvetica,Arial,sans-serif" font-size="4" fill="#111">50 mm</text></g>
  <g id="pieces">
    ${body}
  </g>
</svg>`;
}

// ─── A4-Tiling ───────────────────────────────────────────────────────────────
export const PAGE = {
  A4: { w: 210, h: 297, margin: 10, glue: 10 },
} as const;

export interface Tile {
  readonly pageIndex: number;
  readonly label: string;
  readonly pieceId: string;
  readonly srcRect: Rect; // Ausschnitt im Teil-Koordinatensystem
  readonly col: number;
  readonly row: number;
  readonly cols: number;
  readonly rows: number;
}

export function tilePiece(piece: ComputedPiece): Tile[] {
  const usableW = PAGE.A4.w - 2 * PAGE.A4.margin - PAGE.A4.glue;
  const usableH = PAGE.A4.h - 2 * PAGE.A4.margin - PAGE.A4.glue;
  const cols = Math.max(1, Math.ceil(piece.w / usableW));
  const rows = Math.max(1, Math.ceil(piece.h / usableH));
  const out: Tile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      const w = Math.min(usableW, piece.w - cIdx * usableW);
      const h = Math.min(usableH, piece.h - r * usableH);
      out.push({
        pageIndex: out.length,
        label: `${String.fromCharCode(65 + cIdx)}${r + 1}`,
        pieceId: piece.id,
        srcRect: { x: asMm(cIdx * usableW), y: asMm(r * usableH), w: asMm(w), h: asMm(h) },
        col: cIdx,
        row: r,
        cols,
        rows,
      });
    }
  }
  return out;
}

/**
 * Seitenzahl des Druckbogens: Deckblatt, Material, Zuschnitt, Klebematrix,
 * alle Kacheln und die Anleitung (die Anleitung ist eine eigene Seite, s. buildPrintHtml).
 */
export function totalPages(c: Construction): number {
  const cut = c.pieces.filter((p) => p.kind === 'cut');
  return 5 + cut.reduce((acc, p) => acc + tilePiece(p).length, 0);
}

// ─── Druck-HTML (Pfad A: Browser druckt vektoriell, 100 % Maßstab) ───────────
export interface PrintStrings {
  readonly title: string;
  readonly projectLabel: string;
  readonly materialLabel: string;
  readonly cutLabel: string;
  readonly pageMapLabel: string;
  readonly instructionsLabel: string;
  readonly calibrationLabel: string;
  readonly calibrationHint: string;
  readonly seamAllowance: string;
  readonly piece: string;
  readonly count: string;
  readonly size: string;
  readonly grain: string;
  readonly glue: string;
  readonly warning: string;
  readonly step: string;
  readonly materialExact: string;
  readonly materialEstimated: string;
  readonly footer: string;
  readonly legend: string;
}

interface PrintLine {
  readonly label: string;
  readonly amount: string;
  readonly certainty: string;
  readonly basis: string;
}

export function buildPrintHtml(
  c: Construction,
  projectName: string,
  s: PrintStrings,
  materials: readonly PrintLine[],
  instructions: readonly { readonly index: number; readonly phase: string; readonly text: string }[],
  openWarnings: readonly string[],
): string {
  const cut = c.pieces.filter((p) => p.kind === 'cut');
  const pages: string[] = [];

  // Seite 1 — Deckblatt + Kalibrierung
  pages.push(`<section class="page cover">
    <div class="kicker">${s.projectLabel}</div>
    <h1>${escapeHtml(projectName)}</h1>
    <div class="meta">
      <div><span>${s.size}</span><b>${c.flap.w} × ${c.flap.h} mm</b></div>
      <div><span>${s.count}</span><b>${cut.length} ${s.piece}</b></div>
      <div><span>${s.seamAllowance}</span><b>${c.pieces[0] ? Math.round((c.pieces[0].w - c.pieces[0].netW) / 2) : 0} mm</b></div>
    </div>
    <div class="calibrate">
      <div class="cal-box"></div>
      <div>
        <b>${s.calibrationLabel}</b>
        <p>${s.calibrationHint}</p>
      </div>
    </div>
    <div class="warn"><b>${s.warning}</b>${openWarnings.length ? `<ul>${openWarnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>` : ''}</div>
    <div class="footer">${escapeHtml(s.footer)}</div>
  </section>`);

  // Seite 2 — Materialliste
  pages.push(`<section class="page">
    <h2>${s.materialLabel}</h2>
    <table class="material">
      <thead><tr><th>${s.materialLabel}</th><th>${s.size}</th><th></th><th>${s.grain}</th></tr></thead>
      <tbody>
      ${materials
        .map(
          (m) => `<tr>
          <td>${escapeHtml(m.label)}</td>
          <td class="num">${escapeHtml(m.amount)}</td>
          <td class="cert ${m.certainty === 'exact' ? 'exact' : 'est'}">${m.certainty === 'exact' ? s.materialExact : s.materialEstimated}</td>
          <td class="basis">${escapeHtml(m.basis)}</td>
        </tr>`,
        )
        .join('')}
      </tbody>
    </table>
  </section>`);

  // Seite 3 — Zuschnittübersicht
  pages.push(`<section class="page">
    <h2>${s.cutLabel}</h2>
    <table class="cutlist">
      <thead><tr><th>${s.piece}</th><th>${s.count}</th><th>${s.size}</th><th>${s.grain}</th></tr></thead>
      <tbody>${cut
        .map(
          (p) =>
            `<tr><td>${escapeHtml(p.id)}</td><td class="num">${p.count}×</td><td class="num">${p.w} × ${p.h} mm</td><td>${p.grain === 'lengthwise' ? 'längs' : p.grain === 'crosswise' ? 'quer' : '—'}</td></tr>`,
        )
        .join('')}</tbody>
    </table>
    <p class="hint">${s.legend}</p>
  </section>`);

  // Seite 4 — Seitenübersicht / Klebematrix
  const mapRows = cut.map((p) => {
    const tiles = tilePiece(p);
    return `<tr><td>${escapeHtml(p.id)}</td><td class="num">${p.w} × ${p.h} mm</td><td class="num">${tiles.map((t) => t.label).join(', ')}</td></tr>`;
  });
  pages.push(`<section class="page">
    <h2>${s.pageMapLabel}</h2>
    <table class="cutlist"><thead><tr><th>${s.piece}</th><th>${s.size}</th><th>${s.glue}</th></tr></thead>
    <tbody>${mapRows.join('')}</tbody></table>
  </section>`);

  // Tiled pages
  for (const piece of cut) {
    for (const tile of tilePiece(piece)) {
      pages.push(`<section class="page tile">
        <div class="tilehead"><b>${escapeHtml(piece.id)}</b><span>${tile.label} · ${tile.cols}×${tile.rows}</span></div>
        <div class="tilebody">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="${tile.srcRect.x} ${tile.srcRect.y} ${tile.srcRect.w} ${tile.srcRect.h}" preserveAspectRatio="none" style="width:${tile.srcRect.w}mm;height:${tile.srcRect.h}mm">
            <g transform="translate(0,0)">
              <path d="${roundedRectPath({ x: asMm(0), y: asMm(0), w: piece.w, h: piece.h }, piece.radius)}" fill="none" stroke="#111" stroke-width="0.4"/>
              <path d="M0,${Math.max(0, (piece.h - piece.netH) / 2)} H${piece.w}" fill="none" stroke="#999" stroke-width="0.25" stroke-dasharray="3 2"/>
              <path d="M${piece.w / 2},4 V${piece.h - 4}" fill="none" stroke="#111" stroke-width="0.25"/>
            </g>
          </svg>
        </div>
        <div class="tilefoot">
          <span>${s.glue}: ${tile.row > 0 ? `${String.fromCharCode(65 + tile.col)}${tile.row}` : ''} ${tile.row < tile.rows - 1 ? `→ ${String.fromCharCode(65 + tile.col)}${tile.row + 2}` : ''}</span>
          <span>${tile.col > 0 ? `← ${String.fromCharCode(64 + tile.col)}${tile.row + 1}` : ''} ${tile.col < tile.cols - 1 ? `→ ${String.fromCharCode(66 + tile.col)}${tile.row + 1}` : ''}</span>
        </div>
        <div class="footer">${escapeHtml(s.footer)}</div>
      </section>`);
    }
  }

  // Anleitung
  pages.push(`<section class="page">
    <h2>${s.instructionsLabel}</h2>
    <ol class="steps">
      ${instructions.map((i) => `<li><span class="ph">${escapeHtml(i.phase)}</span> ${escapeHtml(i.text)}</li>`).join('')}
    </ol>
    <div class="footer">${escapeHtml(s.footer)}</div>
  </section>`);

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(s.title)}</title>
<style>
  @page { size: A4; margin: ${PAGE.A4.margin}mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Helvetica, Arial, sans-serif; }
  .page { position: relative; width: ${PAGE.A4.w - 2 * PAGE.A4.margin}mm; min-height: ${PAGE.A4.h - 2 * PAGE.A4.margin}mm; padding: 0; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 22pt; margin: 2mm 0 6mm; letter-spacing: -0.02em; }
  h2 { font-size: 13pt; margin: 0 0 5mm; letter-spacing: -0.01em; }
  .kicker { font-size: 8pt; text-transform: uppercase; letter-spacing: .12em; color: #777; margin-top: 8mm; }
  .meta { display: flex; gap: 12mm; margin-bottom: 14mm; }
  .meta div { display: flex; flex-direction: column; font-size: 9pt; }
  .meta span { color: #777; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .08em; }
  .meta b { font-size: 12pt; }
  .calibrate { display: flex; align-items: center; gap: 8mm; border: .3mm solid #111; padding: 5mm; margin-bottom: 10mm; }
  .cal-box { width: 50mm; height: 50mm; border: .3mm solid #111; flex: none; }
  .calibrate p { font-size: 8pt; color: #444; margin: 2mm 0 0; max-width: 90mm; }
  .warn { border-left: 1mm solid #111; padding-left: 4mm; font-size: 8.5pt; }
  .warn ul { margin: 2mm 0 0 4mm; padding: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th { text-align: left; border-bottom: .3mm solid #111; padding: 2mm 1mm; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; }
  td { border-bottom: .15mm solid #ddd; padding: 2mm 1mm; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .cert { font-size: 7pt; text-transform: uppercase; letter-spacing: .06em; }
  .cert.est { color: #8a6d00; }
  .cert.exact { color: #0a6b3d; }
  .basis { color: #666; font-size: 7.5pt; }
  .hint { font-size: 8pt; color: #555; margin-top: 6mm; }
  .tilehead { display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 3mm; }
  .tilebody { border: .2mm dashed #bbb; overflow: hidden; }
  .tilefoot { display: flex; justify-content: space-between; font-size: 7pt; color: #666; margin-top: 2mm; }
  .footer { position: absolute; bottom: 0; left: 0; right: 0; font-size: 7pt; color: #888; border-top: .15mm solid #ddd; padding-top: 1.5mm; }
  .steps { font-size: 9pt; padding-left: 6mm; }
  .steps li { margin-bottom: 3mm; line-height: 1.45; }
  .ph { display: inline-block; font-size: 6.5pt; text-transform: uppercase; letter-spacing: .08em; color: #fff; background: #111; padding: .6mm 1.6mm; margin-right: 2mm; }
</style></head><body>${pages.join('\n')}</body></html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadText(filename: string, mime: string, content: string | Uint8Array): void {
  const blob = new Blob([content as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function fileName(projectName: string, base: string, ext: string): string {
  const safe = projectName
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safe || 'organizer'}_${base}.${ext}`;
}

export function timestampForFile(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}
