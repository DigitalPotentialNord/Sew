/**
 * PDF-Export ohne Server und ohne Browser-Druckdialog.
 *
 * pdf-lib zeichnet die Seiten vektoriell: Rechtecke, Linien, Text in Punkten.
 * Maßstab: 1 mm = 72/25,4 pt — dadurch ist der Ausdruck maßhaltig, wenn der
 * Drucker auf »tatsächliche Größe« steht. Das Kalibrierquadrat auf Seite 1
 * prüft das, wie beim HTML-Druck.
 *
 * Bewusst KEIN SVG-Import: pdf-lib kann kein SVG einbetten. Was hier steht,
 * sind echte PDF-Zeichenbefehle aus derselben Konstruktion (tilePiece).
 */
import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import { tilePiece, PAGE } from './export';
import type { Tile } from './export';
import type { ComputedPiece, Construction } from './construction';

const PT = 72 / 25.4; // Punkte je Millimeter
const mm = (v: number): number => v * PT;

const INK = rgb(0.07, 0.07, 0.07);

/**
 * WinAnsi-fähiger Text. pdf-lib wirft bei Zeichen außerhalb von cp1252
 * („✂ mein Etui“ als Projektname) — der PDF-Export wäre sonst unbenutzbar,
 * sobald ein Import ein Emoji mitbringt. Deshalb: cp1252-Whitelist,
 * alles andere wird zu „?“, Gedankenstrich/Pfeile wie bisher ersetzt.
 */
const CP1252_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d,
  0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);
export function safe(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/→/g, '->')
    .replace(/×/g, 'x')
    .replace(/·/g, '-')
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, (ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      if (cp < 0x20 || cp === 0x7f) return ' '; // Steuerzeichen → Leerzeichen
      return CP1252_EXTRA.has(cp) ? ch : '?';
    });
}

/**
 * Zeichenbreite von Helvetica in 1/1000 em — nur so viel Tabelle, wie für den
 * Umbruch nötig ist. Wer die Breite nicht kennt, schneidet Text ab und merkt es
 * erst im Ausdruck.
 */
const HELV: Record<string, number> = { ' ': 278, '.': 278, ',': 278, '-': 333, 'i': 222, 'l': 222, 'j': 222, 'I': 278, 'f': 278, 't': 278, 'r': 333, 's': 500, 'c': 500, 'z': 500, '(': 333, ')': 333, '/': 278, ':': 278, ';': 278 };

function textWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) units += HELV[ch] ?? (/[A-ZÄÖÜ]/.test(ch) ? 667 : /[mwMW]/.test(ch) ? 833 : 556);
  return (units / 1000) * size;
}

/** Bricht Text auf eine Breite um — Wörter bleiben heil, lange Wörter werden getrennt. */
export function wrapText(text: string, maxWidth: number, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (textWidth(word, size) <= maxWidth) {
      line = word;
      continue;
    }
    // Einzelnes Überlange-Wort: hart trennen
    let rest = word;
    while (textWidth(rest, size) > maxWidth && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && textWidth(rest.slice(0, cut), size) > maxWidth) cut -= 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines;
}

const GREY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.8, 0.8, 0.8);

export interface PdfStrings {
  readonly title: string;
  readonly subtitle: string;
  readonly calibration: string;
  readonly calibrationHint: string;
  readonly materials: readonly { label: string; amount: string; certainty: string }[];
  readonly cutList: readonly { label: string; size: string; count: string; tiles: string }[];
  readonly instructions: readonly { index: number; phase: string; text: string }[];
  readonly footer: string;
  /** Zählwort für „{n} Teil(e)“ auf dem Deckblatt — Pluralwahl trifft der Aufrufer. */
  readonly piece: string;
}

/** Ein Blatt Papier im PDF-Koordinatensystem (Ursprung unten links). */
function newPage(doc: PDFDocument) {
  const [w, h] = PageSizes.A4;
  const page = doc.addPage([w, h]);
  const margin = mm(PAGE.A4.margin);
  return {
    page,
    left: margin,
    right: w - margin,
    top: h - margin,
    bottom: margin,
    width: w - 2 * margin,
    height: h - 2 * margin,
  };
}

function footer(page: ReturnType<typeof newPage>, text: string): void {
  page.page.drawLine({
    start: { x: page.left, y: page.bottom + mm(6) },
    end: { x: page.right, y: page.bottom + mm(6) },
    thickness: 0.4,
    color: LIGHT,
  });
  page.page.drawText(safe(text), { x: page.left, y: page.bottom + mm(2.5), size: 6, color: GREY });
}

/** Eine Liste über beliebig viele Seiten, mit Umbruch und Seitenköpfen. */
function listPages(
  doc: PDFDocument,
  title: string,
  rows: readonly { left: string; mid: string; right: string }[],
  footerText: string,
): void {
  let p = newPage(doc);
  p.page.drawText(safe(title), { x: p.left, y: p.top - mm(6), size: 14, color: INK });
  let y = p.top - mm(13);
  const lineHeight = mm(5.5);
  for (const row of rows) {
    const leftLines = wrapText(row.left, mm(84), 9);
    const midLines = wrapText(row.mid, mm(42), 9);
    const rightLines = wrapText(row.right, mm(52), 7.5);
    const lineCount = Math.max(leftLines.length, midLines.length, rightLines.length, 1);
    const needed = lineCount * lineHeight + mm(1);
    if (y - needed < p.bottom + mm(12)) {
      footer(p, footerText);
      p = newPage(doc);
      p.page.drawText(safe(`${title} (Fortsetzung)`), { x: p.left, y: p.top - mm(6), size: 11, color: GREY });
      y = p.top - mm(13);
    }
    leftLines.forEach((ln, i) => {
      p.page.drawText(safe(ln), { x: p.left, y: y - i * lineHeight, size: 9, color: INK });
    });
    midLines.forEach((ln, i) => {
      p.page.drawText(safe(ln), { x: p.left + mm(88), y: y - i * lineHeight, size: 9, color: INK });
    });
    rightLines.forEach((ln, i) => {
      p.page.drawText(safe(ln), { x: p.left + mm(134), y: y - i * lineHeight, size: 7.5, color: GREY });
    });
    y -= needed;
  }
  footer(p, footerText);
}

export interface BuiltPdf {
  readonly bytes: Uint8Array;
  /** Tatsächliche Seitenzahl des erzeugten Dokuments (doc.getPageCount()). */
  readonly pages: number;
}

export async function buildPdf(c: Construction, s: PdfStrings): Promise<BuiltPdf> {
  const doc = await PDFDocument.create();
  doc.setTitle(safe(s.title));
  doc.setCreator('Organizer Studio');
  doc.setProducer('Organizer Studio');
  const cut = c.pieces.filter((p) => p.kind === 'cut');

  // ── Seite 1: Deckblatt mit Kalibrierquadrat ────────────────────────────────
  {
    const p = newPage(doc);
    let y = p.top - mm(18);
    p.page.drawText(safe(s.subtitle.toUpperCase()), { x: p.left, y, size: 7, color: GREY });
    y -= mm(10);
    p.page.drawText(safe(s.title), { x: p.left, y, size: 22, color: INK });
    y -= mm(16);
    // 50-mm-Kalibrierquadrat: exakt 50 mm in PDF-Punkten
    p.page.drawRectangle({ x: p.left, y: y - mm(50), width: mm(50), height: mm(50), borderColor: INK, borderWidth: 0.6 });
    p.page.drawText(safe(s.calibration), { x: p.left + mm(54), y: y - mm(6), size: 10, color: INK });
    p.page.drawText(safe(s.calibrationHint), { x: p.left + mm(54), y: y - mm(11), size: 7.5, color: GREY, maxWidth: mm(95), lineHeight: 10 });
    y -= mm(60);

    // Kopfzahlen
    const stats = [
      `${c.flap.w} × ${c.flap.h} mm`,
      `${cut.length} ${s.piece}`,
      `${c.materials.length} Materialzeilen`,
    ];
    p.page.drawText(safe(stats.join('   ·   ')), { x: p.left, y, size: 9, color: INK });
    y -= mm(12);

    const errors = c.findings.filter((f) => f.severity === 'error');
    const warns = c.findings.filter((f) => f.severity === 'warn');
    p.page.drawText(
      errors.length === 0 && warns.length === 0
        ? 'Alle Prüfungen bestanden.'
        : `${errors.length} Fehler · ${warns.length} Hinweise — vor dem Zuschnitt prüfen.`,
      { x: p.left, y, size: 9, color: errors.length ? rgb(0.6, 0.1, 0.1) : INK },
    );
    footer(p, s.footer);
  }

  // ── Material ──────────────────────────────────────────────────────────────
  listPages(doc, 'Material', s.materials.map((m) => ({
    left: safe(m.label),
    mid: safe(m.amount),
    right: safe(m.certainty),
  })), s.footer);

  // ── Zuschnitt mit Seitenzuordnung ─────────────────────────────────────────
  listPages(doc, 'Zuschnitt', s.cutList.map((item) => ({
    left: safe(item.label),
    mid: safe(item.size),
    right: safe(`${item.count} · ${item.tiles}`),
  })), s.footer);

  // ── Gekachelte Teile ──────────────────────────────────────────────────────
  for (const piece of cut) {
    for (const tile of tilePiece(piece)) {
      drawTile(doc, piece, tile, s.footer);
    }
  }

  // ── Anleitung: umbrochene Schritte, über so viele Seiten wie nötig ───────
  {
    let page = newPage(doc);
    const heading = (pg: typeof page, label: string): number => {
      pg.page.drawText(safe(label), { x: pg.left, y: pg.top - mm(6), size: 14, color: INK });
      return pg.top - mm(13);
    };
    let y = heading(page, 'Anleitung');
    const bodySize = 9;
    const lineHeight = 3.6 * PT * bodySize / 9 * 1.02;
    for (const step of s.instructions) {
      const lines = wrapText(safe(`${step.index}.`), mm(10), bodySize);
      const body = wrapText(safe(`${step.phase.toUpperCase()}  ${step.text}`), mm(150), bodySize);
      const needed = Math.max(lines.length, body.length) * lineHeight + mm(3);
      if (y - needed < page.bottom + mm(12)) {
        footer(page, s.footer);
        page = newPage(doc);
        y = heading(page, 'Anleitung (Fortsetzung)');
      }
      page.page.drawText(safe(`${step.index}.`), { x: page.left, y, size: bodySize, color: GREY });
      body.forEach((ln, i) => {
        page.page.drawText(safe(ln), { x: page.left + mm(12), y: y - i * lineHeight, size: bodySize, color: INK });
      });
      y -= needed;
    }
    footer(page, s.footer);
  }

  return { bytes: await doc.save(), pages: doc.getPageCount() };
}

/** Schneidet ein beliebiges Liniensegment auf ein Kachelfenster zu (Liang–Barsky). */
export function clipSegment(
  a: readonly [number, number],
  b: readonly [number, number],
  win: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
): [[number, number], [number, number]] | null {
  const [x0, y0] = a;
  const [x1, y1] = b;
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x0 - win.x, win.x + win.w - x0, y0 - win.y, win.y + win.h - y0];
  for (let i = 0; i < 4; i++) {
    if (p[i]! === 0) {
      if (q[i]! < 0) return null;
    } else {
      const r = q[i]! / p[i]!;
      if (p[i]! < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }
  return [
    [x0 + t0 * dx, y0 + t0 * dy],
    [x0 + t1 * dx, y0 + t1 * dy],
  ];
}

/**
 * Eine Kachel eines Schnittteils.
 *
 * Bewusst ohne PDF-Clipping: jeder Strich wird auf das Kachelfenster
 * zugeschnitten, bevor er gezeichnet wird. Das ist nachrechenbar (clipSegment)
 * und verhält sich in jedem PDF-Betrachter gleich — Clipping-Pfade tun das
 * erfahrungsgemäß nicht.
 */
function drawTile(doc: PDFDocument, piece: ComputedPiece, tile: Tile, footerText: string): void {
  const p = newPage(doc);
  const G = PAGE.A4.glue; // Klebekante in mm
  const hasLeftGutter = tile.col > 0;
  const hasTopGutter = tile.row > 0;
  // Klebekante ist Teil des Drucks: der Streifen links (bzw. oben) zeigt das
  // Stück der Nachbarseite noch einmal, damit man exakt übereinanderkleben kann.
  const gutterLeft = hasLeftGutter ? G : 0;
  const gutterTop = hasTopGutter ? G : 0;

  const headY = p.top - mm(2);
  p.page.drawText(safe(piece.id), { x: p.left, y: headY, size: 8, color: INK });
  p.page.drawText(
    safe(`Kachel ${tile.label} · ${tile.col + 1}/${tile.cols} · ${tile.row + 1}/${tile.rows} · ${piece.count}× · ${piece.w} × ${piece.h} mm`),
    { x: p.left + mm(50), y: headY, size: 7, color: GREY },
  );
  // Kachelmarke klar im Kopf rechts, verdeckt keine Schnittlinie
  p.page.drawText(safe(tile.label), { x: p.right - mm(10), y: headY - mm(0.5), size: 11, color: GREY });

  // Fenster im Teil-Koordinatensystem, um die Klebekanten links/oben erweitert
  const win = {
    x: tile.srcRect.x - gutterLeft,
    y: tile.srcRect.y - gutterTop,
    w: tile.srcRect.w + gutterLeft,
    h: tile.srcRect.h + gutterTop,
  };
  const contentTop = headY - mm(5);
  const X = (px: number): number => p.left + mm(px - win.x);
  const Y = (py: number): number => contentTop - mm(py - win.y);

  const stroke = (
    a: readonly [number, number],
    b: readonly [number, number],
    opts: { color: typeof INK; width: number; dash?: number[] },
  ): void => {
    const seg = clipSegment(a, b, win);
    if (!seg) return;
    p.page.drawLine({
      start: { x: X(seg[0][0]), y: Y(seg[0][1]) },
      end: { x: X(seg[1][0]), y: Y(seg[1][1]) },
      thickness: opts.width,
      color: opts.color,
      ...(opts.dash ? { dashArray: opts.dash } : {}),
    });
  };

  const strokeRounded = (
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    rad: number,
    opts: { color: typeof INK; width: number; dash?: number[] },
  ): void => {
    const r = Math.max(0, Math.min(rad, Math.min(rw, rh) / 2));
    stroke([rx + r, ry], [rx + rw - r, ry], opts);
    stroke([rx + rw, ry + r], [rx + rw, ry + rh - r], opts);
    stroke([rx + rw - r, ry + rh], [rx + r, ry + rh], opts);
    stroke([rx, ry + rh - r], [rx, ry + r], opts);
    if (r > 0) {
      const arc = (cx: number, cy: number, a0: number, a1: number) => {
        const steps = 10;
        let prev: [number, number] = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
        for (let i = 1; i <= steps; i++) {
          const ang = a0 + ((a1 - a0) * i) / steps;
          const next: [number, number] = [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
          stroke(prev, next, opts);
          prev = next;
        }
      };
      arc(rx + r, ry + r, Math.PI, Math.PI * 1.5);
      arc(rx + rw - r, ry + r, Math.PI * 1.5, Math.PI * 2);
      arc(rx + rw - r, ry + rh - r, 0, Math.PI * 0.5);
      arc(rx + r, ry + rh - r, Math.PI * 0.5, Math.PI);
    }
  };

  // Schnittkante
  strokeRounded(0, 0, piece.w, piece.h, piece.radius, { color: INK, width: 0.7 });

  // Nählinie (nur wenn Nahtzugabe vorhanden)
  const hasSA = piece.netW < piece.w || piece.netH < piece.h;
  if (hasSA) {
    const netRad = Math.max(0, piece.radius - Math.min(piece.netRect.x, piece.netRect.y));
    strokeRounded(piece.netRect.x, piece.netRect.y, piece.netW, piece.netH, netRad, {
      color: GREY,
      width: 0.35,
      dash: [3, 2],
    });
  }

  // Bruchkante
  if (piece.foldEdge && piece.foldEdge !== 'none') {
    if (piece.foldEdge === 'top') stroke([2, 0], [piece.w - 2, 0], { color: GREY, width: 0.5, dash: [6, 2, 1, 2] });
    else if (piece.foldEdge === 'bottom') stroke([2, piece.h], [piece.w - 2, piece.h], { color: GREY, width: 0.5, dash: [6, 2, 1, 2] });
    else if (piece.foldEdge === 'left') stroke([0, 2], [0, piece.h - 2], { color: GREY, width: 0.5, dash: [6, 2, 1, 2] });
    else if (piece.foldEdge === 'right') stroke([piece.w, 2], [piece.w, piece.h - 2], { color: GREY, width: 0.5, dash: [6, 2, 1, 2] });
  }

  // Fadenlauf-Pfeil (längs oder quer)
  const padY = piece.netRect.y + 6;
  if (piece.grain === 'crosswise') {
    const midY = piece.h / 2;
    const leftX = piece.netRect.x + 6;
    const rightX = piece.netRect.x + piece.netW - 6;
    if (rightX - leftX > 12) {
      stroke([leftX, midY], [rightX, midY], { color: INK, width: 0.35 });
      stroke([rightX, midY], [rightX - 4, midY - 3], { color: INK, width: 0.35 });
      stroke([rightX, midY], [rightX - 4, midY + 3], { color: INK, width: 0.35 });
      if (midY >= win.y + 4 && midY <= win.y + win.h - 4 && (leftX + rightX) / 2 >= win.x && (leftX + rightX) / 2 <= win.x + win.w - 18) {
        p.page.drawText(safe('Fadenlauf quer'), { x: X((leftX + rightX) / 2) - mm(8), y: Y(midY) + mm(2), size: 5.5, color: GREY });
      }
    }
  } else if (piece.grain === 'lengthwise') {
    const midX = piece.w / 2;
    const top = Math.min(padY, piece.h * 0.2);
    const bot = Math.max(piece.h - padY, piece.h * 0.8);
    if (bot - top > 12) {
      stroke([midX, top], [midX, bot], { color: INK, width: 0.35 });
      stroke([midX, top], [midX - 3.5, top + 4], { color: INK, width: 0.35 });
      stroke([midX, top], [midX + 3.5, top + 4], { color: INK, width: 0.35 });
      if (midX >= win.x + 6 && midX <= win.x + win.w - 14 && (top + bot) / 2 >= win.y && (top + bot) / 2 <= win.y + win.h) {
        p.page.drawText(safe('Fadenlauf'), { x: X(midX) + mm(2), y: Y((top + bot) / 2), size: 5.5, color: GREY });
      }
    }
  }

  // ── Klebekanten ───────────────────────────────────────────────────────────
  if (hasLeftGutter) {
    const seamX = p.left + mm(G);
    p.page.drawLine({
      start: { x: seamX, y: contentTop },
      end: { x: seamX, y: contentTop - mm(win.h) },
      thickness: 0.3,
      color: LIGHT,
      dashArray: [2, 2],
    });
    p.page.drawText(safe(hasTopGutter ? 'Klebekante' : 'Klebekante links'), {
      x: p.left + mm(0.5),
      y: contentTop - mm(win.h) + mm(1.5),
      size: 6,
      color: GREY,
    });
  }
  if (hasTopGutter) {
    const seamY = contentTop - mm(G);
    p.page.drawLine({
      start: { x: p.left, y: seamY },
      end: { x: p.left + mm(win.w), y: seamY },
      thickness: 0.3,
      color: LIGHT,
      dashArray: [2, 2],
    });
    p.page.drawText(safe('Klebekante oben — überlappt mit vorheriger Seite'), {
      x: p.left + mm(G) + mm(2),
      y: seamY + mm(2.5),
      size: 6,
      color: GREY,
    });
  }

  footer(p, footerText);
}
