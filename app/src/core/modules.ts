/**
 * Modulbibliothek — neun Konstruktionen, jede mit eigener Geometrie,
 * eigenen Schnittteilen und eigenen Nähoperationen.
 *
 * Jedes Modul ist eine reine Beschreibung: width/height/pieces/operations/draw
 * sind Funktionen ohne Seiteneffekte. Siehe docs/product/module-library.md.
 */
import { mm, clamp, type Mm } from './geometry';
import { PRACTICE } from './practice';
import type {
  Finding,
  LayoutContext,
  ModuleDef,
  ModuleTypeId,
  ParamValue,
  Params,
  PieceSpec,
  Prim,
} from './types';

const num = (p: Params, k: string, fallback = 0): number => {
  const v = p[k];
  return typeof v === 'number' ? v : fallback;
};
const str = (p: Params, k: string, fallback = ''): string => {
  const v = p[k];
  return typeof v === 'string' ? v : fallback;
};
const bool = (p: Params, k: string, fallback = false): boolean => {
  const v = p[k];
  return typeof v === 'boolean' ? v : fallback;
};

/**
 * Höhen-Fix für Regeln »Modul zu hoch«: `setParam`, wenn das Feld den
 * verfügbaren Platz erreicht, ohne sein Minimum zu unterschreiten — sonst
 * wird `growHeight` vorgeschlagen. Ein Fix, der auf 0 klemmt, behebt das
 * Finding nicht und wird nicht angeboten.
 */
const heightFix = (
  ctx: LayoutContext,
  moduleId: string,
  key: string,
  current: number,
  fieldMin: number,
  ratio = 1,
): Finding['fix'] => {
  const settable = Math.floor(ctx.rowHeightMm * ratio);
  if (settable >= fieldMin) return { kind: 'setParam', moduleId, key, value: settable };
  return {
    kind: 'growHeight',
    toMm: Math.ceil(ctx.panelHeightMm - ctx.rowHeightMm + current / ratio) + 20,
  };
};

const base = (nz: number, key: string, nameKey: string, w: number, h: number, material: PieceSpec['material'], extra: Partial<PieceSpec> = {}): PieceSpec => ({
  id: key,
  nameKey,
  kind: 'cut',
  w: mm(w),
  h: mm(h),
  netW: mm(w - 2 * nz),
  netH: mm(h - 2 * nz),
  count: 1,
  material,
  grain: 'lengthwise',
  certainty: 'exact',
  role: 'module',
  foldEdge: 'none',
  ...extra,
});

const lengthPiece = (
  key: string,
  nameKey: string,
  lengthMm: number,
  material: PieceSpec['material'],
  certainty: PieceSpec['certainty'],
  noteKey?: string,
): PieceSpec => ({
  id: key,
  nameKey,
  kind: 'length',
  w: mm(lengthMm),
  h: mm(0),
  netW: mm(lengthMm),
  netH: mm(0),
  count: 1,
  material,
  grain: 'none',
  certainty,
  role: 'module',
  ...(noteKey ? { noteKey } : {}),
});

// ─────────────────────────────────────────────────────────────────────────────
// M01 — Stofffach (einfach). Aufgesetztes Steckfach, oben offen.
// ─────────────────────────────────────────────────────────────────────────────
const M01: ModuleDef = {
  id: 'M01',
  nameKey: 'mod.M01.name',
  category: 'taschen',
  icon: 'pocket',
  descriptionKey: 'mod.M01.desc',
  placement: { kind: 'row' },
  tags: ['fach', 'tasche', 'pocket', 'steckfach', 'zubehör'],
  defaults: { breite: 70, hoehe: 70, saum: 'saum', saumbreite: 10 },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 20, max: 260, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 25, max: 400, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    {
      key: 'saum',
      labelKey: 'f.oberkante',
      kind: 'enum',
      options: [
        { value: 'saum', labelKey: 'v.saum' },
        { value: 'einschlag', labelKey: 'v.einschlag' },
      ],
      groupKey: 'g.konstruktion',
    },
    { key: 'saumbreite', labelKey: 'f.saumbreite', kind: 'length', min: 6, max: 25, step: 1, unitKey: 'u.mm', groupKey: 'g.konstruktion' },
  ],
  bulkMm: () => 5,
  width: (p) => mm(num(p, 'breite', 70)),
  height: (p) => mm(num(p, 'hoehe', 70)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 70);
    const h = num(p, 'hoehe', 70);
    const sb = num(p, 'saumbreite', 10);
    const einschlag = str(p, 'saum') === 'einschlag';
    return [
      {
        ...base(nz, 'fach', 'piece.fach', w + 2 * nz, h + sb + 2 * nz, 'fabric', {
          netH: mm(h),
          netY: mm(sb + nz),
        }),
        foldEdge: einschlag ? 'top' : 'none',
        noteKey: einschlag ? 'note.einschlag' : 'note.saum',
      },
      base(0, 'fach-einlage', 'piece.fach-einlage', w, h, 'interfacing', { grain: 'crosswise', noteKey: 'note.einlage' }),
    ];
  },
  operations: (p, _ctx, id) => {
    const sb = num(p, 'saumbreite', 10);
    const h = num(p, 'hoehe', 70);
    return [
      { kind: 'fuse', moduleId: id, dependsOn: [], titleKey: 'op.fuse-pocket', values: { hoehe: h } },
      { kind: 'press', moduleId: id, dependsOn: [], titleKey: 'op.press-top', values: { saum: sb } },
      { kind: 'mark', moduleId: id, dependsOn: [], titleKey: 'op.mark-pocket', values: { hoehe: h } },
      { kind: 'baste', moduleId: id, dependsOn: [], titleKey: 'op.baste-pocket', values: { hoehe: h } },
      { kind: 'stitch', moduleId: id, dependsOn: [], titleKey: 'op.topstitch-sides', values: {} },
    ];
  },
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = num(p, 'breite', 70);
    const h = num(p, 'hoehe', 70);
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M01-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    if (w < PRACTICE.minSectionMm * 2) {
      out.push({
        ruleId: 'V-M01-02',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), min: PRACTICE.minSectionMm * 2 },
        fix: { kind: 'setParam', moduleId: id, key: 'breite', value: PRACTICE.minSectionMm * 2 },
        dismissible: true,
      });
    }
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M01-03',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 25),
        dismissible: false,
      });
    }
    if (str(p, 'saum') === 'einschlag' && num(p, 'saumbreite', 10) > h / 2) {
      out.push({
        ruleId: 'V-M01-04',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { saum: Math.round(num(p, 'saumbreite', 10)), hoehe: Math.round(h) },
        fix: { kind: 'setParam', moduleId: id, key: 'saumbreite', value: Math.round(h / 4) },
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const sb = num(p, 'saumbreite', 10);
    const einschlag = str(p, 'saum') === 'einschlag';
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    prims.push({ t: 'line', x1: 0, y1: sb, x2: w, y2: sb, style: einschlag ? 'fold' : 'seam' });
    if (einschlag) prims.push({ t: 'line', x1: 0, y1: sb / 2, x2: w, y2: sb / 2, style: 'guide' });
    prims.push({ t: 'line', x1: 3, y1: 3, x2: w - 3, y2: 3, style: 'seam' });
    prims.push({ t: 'text', x: w / 2, y: h - 4, text: `${Math.round(w)}`, anchor: 'middle' });
    return prims;
  },
  summary: (p) => `${Math.round(num(p, 'breite'))} × ${Math.round(num(p, 'hoehe'))} mm`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M02 — Geteiltes Fach: EIN Teil, mehrere Teilungsnähte. Andere Konstruktion
//       als M01 (Teilungsnähte müssen VOR der Panelnaht liegen).
// ─────────────────────────────────────────────────────────────────────────────
const M02: ModuleDef = {
  id: 'M02',
  nameKey: 'mod.M02.name',
  category: 'faecher',
  icon: 'divided',
  descriptionKey: 'mod.M02.desc',
  placement: { kind: 'row' },
  tags: ['geteilt', 'fächer', 'division', 'stifte', 'marker', 'pinsel'],
  defaults: { breite: 120, hoehe: 80, sections: 3, steg: 0 },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 30, max: 300, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 25, max: 400, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'sections', labelKey: 'f.faecher', kind: 'count', min: 2, max: 12, step: 1, groupKey: 'g.konstruktion' },
    { key: 'steg', labelKey: 'f.steg', kind: 'length', min: 0, max: 20, step: 1, unitKey: 'u.mm', groupKey: 'g.konstruktion' },
  ],
  bulkMm: () => 5,
  width: (p) => mm(num(p, 'breite', 120)),
  height: (p) => mm(num(p, 'hoehe', 80)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 120);
    const h = num(p, 'hoehe', 80);
    const sections = Math.max(1, num(p, 'sections', 3));
    return [
      {
        ...base(nz, 'fach-geteilt', 'piece.fach-geteilt', w + 2 * nz, h + 10 + 2 * nz, 'fabric', {
          netH: mm(h),
          netY: mm(10 + nz),
        }),
        noteKey: 'note.teilungsnaehte',
        count: 1,
        foldEdge: 'bottom',
      },
      {
        ...base(nz, 'fach-teilung', 'piece.fach-teilung', w + 2 * nz, 20 + 2 * nz, 'fabric'),
        count: sections - 1,
        grain: 'crosswise',
        noteKey: 'note.teilungsstreifen',
      },
    ];
  },
  operations: (p, _ctx, id) => {
    const sections = Math.max(1, num(p, 'sections', 3));
    return [
      { kind: 'stitch', moduleId: id, dependsOn: [], titleKey: 'op.stitch-teilung', values: { sections } },
      // Der 10-mm-Umschlag unten (fach-geteilt: h + 10 + 2·nz) — nicht die Fachhöhe.
      { kind: 'press', moduleId: id, dependsOn: [], titleKey: 'op.press-bottom', values: { umschlag: 10 } },
      { kind: 'baste', moduleId: id, dependsOn: [], titleKey: 'op.baste-pocket', values: { hoehe: Math.round(num(p, 'hoehe', 80)) } },
    ];
  },
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = num(p, 'breite', 120);
    const sections = Math.max(1, num(p, 'sections', 3));
    const steg = num(p, 'steg', 0);
    const teil = (w - (sections - 1) * steg) / sections;
    if (teil < PRACTICE.minSectionMm) {
      out.push({
        ruleId: 'V-M02-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { teil: Math.round(teil), min: PRACTICE.minSectionMm, sections },
        fix: { kind: 'setParam', moduleId: id, key: 'sections', value: Math.max(2, sections - 1) },
        dismissible: false,
      });
    }
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M02-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    const h = num(p, 'hoehe', 80);
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M02-03',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 25),
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const sections = Math.max(1, num(p, 'sections', 3));
    const steg = num(p, 'steg', 0);
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    const step = (w - (sections - 1) * steg) / sections;
    for (let i = 1; i < sections; i++) {
      const x = i * step + (i - 1) * steg;
      prims.push({ t: 'line', x1: x, y1: 10, x2: x, y2: h - 2, style: 'divide' });
      if (steg > 0) prims.push({ t: 'line', x1: x + steg, y1: 10, x2: x + steg, y2: h - 2, style: 'divide' });
    }
    prims.push({ t: 'line', x1: 0, y1: 10, x2: w, y2: 10, style: 'seam' });
    return prims;
  },
  summary: (p) => `${num(p, 'sections', 3)} Fächer · ${Math.round(num(p, 'breite'))} mm`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M03 — Reißverschlussfach. Eigene Konstruktion: RV-Band, Öffnung im Panel,
//       Futterbeutel. Braucht `install-zip` VOR der Panelnaht.
// ─────────────────────────────────────────────────────────────────────────────
const M03: ModuleDef = {
  id: 'M03',
  nameKey: 'mod.M03.name',
  category: 'taschen',
  icon: 'zip',
  descriptionKey: 'mod.M03.desc',
  placement: { kind: 'row' },
  tags: ['reißverschluss', 'zip', 'rv', 'geheimfach', 'taschen'],
  defaults: { breite: 160, hoehe: 90, ziptype: 'endlos' },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 90, max: 300, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 50, max: 300, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    {
      key: 'ziptype',
      labelKey: 'f.rvtyp',
      kind: 'enum',
      options: [
        { value: 'endlos', labelKey: 'v.rv-endlos' },
        { value: 'trennbar', labelKey: 'v.rv-trennbar' },
      ],
      groupKey: 'g.konstruktion',
    },
  ],
  bulkMm: () => 9,
  width: (p) => mm(num(p, 'breite', 160)),
  height: (p) => mm(num(p, 'hoehe', 90)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 160);
    const h = num(p, 'hoehe', 90);
    const zipMm = Math.round(w + 20);
    return [
      base(nz, 'rv-beutel', 'piece.rv-beutel', w + 2 * nz, h + 2 * nz, 'fabric', { noteKey: 'note.rv-beutel' }),
      base(nz, 'rv-futter', 'piece.rv-futter', w + 2 * nz, h + 2 * nz, 'lining', { noteKey: 'note.rv-futter' }),
      lengthPiece('rv-band', 'piece.rv-band', zipMm, 'zipper', 'exact', 'note.rv-laenge'),
    ];
  },
  extraMaterials: (p) => {
    const w = num(p, 'breite', 160);
    return [
      {
        kind: 'zipper',
        spec: str(p, 'ziptype', 'endlos') === 'trennbar' ? 'rv-trennbar-4mm' : 'rv-endlos-4mm',
        labelKey: 'mat.rv',
        amount: Math.round(w + 20),
        unit: 'mm',
        certainty: 'exact',
        basisKey: 'basis.rv',
        basisValues: { oeffnung: Math.round(w), zugabe: 20 },
        purchaseHintKey: 'buy.rv',
      },
    ];
  },
  operations: (p, _ctx, id) => {
    const w = num(p, 'breite', 160);
    return [
      { kind: 'install-zip', moduleId: id, dependsOn: [], titleKey: 'op.install-zip', values: { laenge: Math.round(w + 20) } },
      { kind: 'stitch', moduleId: id, dependsOn: [], titleKey: 'op.stitch-zip-bag', values: { breite: Math.round(w) } },
      { kind: 'topstitch', moduleId: id, dependsOn: [], titleKey: 'op.topstitch-zip', values: { laenge: Math.round(w) }, phase: 'sew-order' },
    ];
  },
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = num(p, 'breite', 160);
    if (w < PRACTICE.minZipMm) {
      out.push({
        ruleId: 'V-M03-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), min: PRACTICE.minZipMm },
        fix: { kind: 'setParam', moduleId: id, key: 'breite', value: PRACTICE.minZipMm },
        dismissible: false,
      });
    }
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M03-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    const h = num(p, 'hoehe', 90);
    if (h > ctx.rowHeightMm * 0.9) {
      out.push({
        ruleId: 'V-M03-03',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 50, 0.9),
        dismissible: true,
      });
    }
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M03-04',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 50),
        dismissible: false,
      });
    }
    return out;
  },
  draw: (_p, w, h) => {
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    prims.push({ t: 'line', x1: 4, y1: 6, x2: w - 4, y2: 6, style: 'zip' });
    for (let x = 8; x < w - 6; x += 6) {
      prims.push({ t: 'line', x1: x, y1: 3, x2: x, y2: 9, style: 'mark' });
    }
    prims.push({ t: 'line', x1: 4, y1: 12, x2: w - 4, y2: 12, style: 'seam' });
    return prims;
  },
  summary: (p) => `RV ${Math.round(num(p, 'breite') + 20)} mm`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M04 — Elastikschlaufenreihe. Kein Zuschnittteil mit Fläche für das Band:
//       Längenmaterial (kind: 'length'), exakte Loop-Rechnung.
// ─────────────────────────────────────────────────────────────────────────────
const M04: ModuleDef = {
  id: 'M04',
  nameKey: 'mod.M04.name',
  category: 'elastik',
  icon: 'loops',
  descriptionKey: 'mod.M04.desc',
  placement: { kind: 'row' },
  tags: ['elastik', 'gummi', 'schlaufen', 'loops', 'stifte', 'nadeln', 'makeup'],
  defaults: { breite: 140, loops: 6, gegenstandBreite: 12, gegenstandDicke: 10, bandbreite: 12, zug: PRACTICE.elasticGripMm },
  fields: [
    { key: 'breite', labelKey: 'f.reihenbreite', kind: 'length', min: 30, max: 300, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'loops', labelKey: 'f.loops', kind: 'count', min: 1, max: 20, step: 1, groupKey: 'g.masse' },
    { key: 'gegenstandBreite', labelKey: 'f.gegenstand-breite', kind: 'length', min: 2, max: 80, step: 1, unitKey: 'u.mm', groupKey: 'g.gegenstand' },
    { key: 'gegenstandDicke', labelKey: 'f.gegenstand-dicke', kind: 'length', min: 1, max: 60, step: 1, unitKey: 'u.mm', groupKey: 'g.gegenstand' },
    { key: 'bandbreite', labelKey: 'f.bandbreite', kind: 'length', min: 5, max: 30, step: 1, unitKey: 'u.mm', groupKey: 'g.konstruktion' },
    { key: 'zug', labelKey: 'f.zug', kind: 'length', min: 0, max: 14, step: 1, unitKey: 'u.mm', groupKey: 'g.konstruktion', helpKey: 'help.zug' },
  ],
  bulkMm: (p) => Math.min(18, Math.max(4, Math.round(num(p, 'gegenstandDicke', 10) * 0.75 + 2))),
  width: (p) => mm(num(p, 'breite', 140)),
  height: () => mm(26),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 140);
    const loops = Math.max(1, num(p, 'loops', 6));
    const gl = loopLength(p);
    const bandLen = Math.round(loops * gl + 2 * nz + 2 * PRACTICE.elasticTailMm);
    const carrierNetH = Math.max(40, Math.round(num(p, 'bandbreite', 12) + 28));
    return [
      {
        ...base(nz, 'elastik-traeger', 'piece.elastik-traeger', w + 2 * nz, carrierNetH + 2 * nz, 'fabric'),
        noteKey: 'note.elastik-traeger',
      },
      lengthPiece('elastik-band', 'piece.elastik-band', bandLen, 'elastic', 'exact', 'note.elastik-laenge'),
    ];
  },
  extraMaterials: (p, ctx) => {
    const loops = Math.max(1, num(p, 'loops', 6));
    const bandLen = Math.round(loops * loopLength(p) + 2 * ctx.seamAllowanceMm + 2 * PRACTICE.elasticTailMm);
    return [
      {
        kind: 'elastic',
        spec: `gummiband-${Math.round(num(p, 'bandbreite', 12))}mm`,
        labelKey: 'mat.elastik',
        amount: bandLen,
        unit: 'mm',
        certainty: 'exact',
        basisKey: 'basis.elastik',
        basisValues: { loops, loop: Math.round(loopLength(p)), reserve: 2 * PRACTICE.elasticTailMm },
      },
    ];
  },
  operations: (p, _ctx, id) => {
    const loops = Math.max(1, num(p, 'loops', 6));
    return [
      { kind: 'mark', moduleId: id, dependsOn: [], titleKey: 'op.mark-loops', values: { loops } },
      { kind: 'press', moduleId: id, dependsOn: [], titleKey: 'op.press-elastik-trage', values: { enden: 2 } },
      { kind: 'thread-elastic', moduleId: id, dependsOn: [], titleKey: 'op.thread-elastic', values: { loops, laenge: Math.round(loops * loopLength(p)) } },
    ];
  },
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = num(p, 'breite', 140);
    const loops = Math.max(1, num(p, 'loops', 6));
    const gb = num(p, 'gegenstandBreite', 12);
    const gap = 8;
    const needed = loops * (gb + gap) - gap;
    if (needed > w - 2 * PRACTICE.channelEdgeSeamMm) {
      out.push({
        ruleId: 'V-M04-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { benoetigt: Math.round(needed), breite: Math.round(w), loops },
        fix: { kind: 'setParam', moduleId: id, key: 'loops', value: Math.max(1, Math.floor((w - 2 * PRACTICE.channelEdgeSeamMm + gap) / (gb + gap))) },
        dismissible: false,
      });
    }
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M04-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    if (num(p, 'zug', PRACTICE.elasticGripMm) < 2) {
      out.push({
        ruleId: 'V-M04-03',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { zug: Math.round(num(p, 'zug', 0)) },
        fix: { kind: 'setParam', moduleId: id, key: 'zug', value: PRACTICE.elasticGripMm },
        dismissible: true,
      });
    }
    if (26 > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M04-04',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: 26, panel: Math.round(ctx.rowHeightMm) },
        fix: { kind: 'growHeight', toMm: Math.ceil(ctx.panelHeightMm - ctx.rowHeightMm + 26) + 20 },
        dismissible: false,
      });
    }
    const objW = num(p, 'gegenstandBreite', 12);
    const objD = num(p, 'gegenstandDicke', 10);
    const grip = num(p, 'zug', PRACTICE.elasticGripMm);
    const rawLoop = objW + 2 * objD - grip;
    if (rawLoop < 6) {
      const fix: Finding['fix'] =
        objW + 2 * objD >= 8
          ? { kind: 'setParam', moduleId: id, key: 'zug', value: Math.max(0, Math.round(objW + 2 * objD - 8)) }
          : { kind: 'setParam', moduleId: id, key: 'gegenstandBreite', value: Math.max(8, Math.round(8 + grip - 2 * objD)) };
      out.push({
        ruleId: 'V-M04-05',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { schlaufe: Math.round(rawLoop), zug: Math.round(grip) },
        fix,
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const loops = Math.max(1, num(p, 'loops', 6));
    const step = w / loops;
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    for (let i = 0; i < loops; i++) {
      const x0 = i * step + 4;
      const x1 = (i + 1) * step - 4;
      prims.push({ t: 'line', x1: x0, y1: h * 0.2, x2: x0, y2: h * 0.8, style: 'seam' });
      prims.push({ t: 'line', x1: x1, y1: h * 0.2, x2: x1, y2: h * 0.8, style: 'seam' });
      prims.push({ t: 'line', x1: x0, y1: h * 0.5, x2: x1, y2: h * 0.5, style: 'guide' });
    }
    return prims;
  },
  summary: (p) => `${num(p, 'loops', 6)} Loops · ${Math.round(loopLength(p))} mm/Stk`,
};

function loopLength(p: Params): number {
  return Math.max(6, num(p, 'gegenstandBreite', 12) + 2 * num(p, 'gegenstandDicke', 10) - num(p, 'zug', PRACTICE.elasticGripMm));
}

// ─────────────────────────────────────────────────────────────────────────────
// M05 — Einzelne Schlaufe (Gurtband, feste Weite). Andere Mechanik als M04:
//       kein Gummizug, sondern ein fixiertes Gurtband mit Knopf.
// ─────────────────────────────────────────────────────────────────────────────
const M05: ModuleDef = {
  id: 'M05',
  nameKey: 'mod.M05.name',
  category: 'elastik',
  icon: 'strap',
  descriptionKey: 'mod.M05.desc',
  placement: { kind: 'row' },
  tags: ['schlaufe', 'loop', 'gurtband', 'halter', 'schere', 'lineal', 'pinsel'],
  defaults: { breite: 40, bandbreite: 20, umfang: 70, anzahl: 1 },
  fields: [
    { key: 'anzahl', labelKey: 'f.anzahl', kind: 'count', min: 1, max: 6, step: 1, groupKey: 'g.masse' },
    { key: 'umfang', labelKey: 'f.umfang', kind: 'length', min: 20, max: 200, step: 1, unitKey: 'u.mm', groupKey: 'g.gegenstand', helpKey: 'help.umfang' },
    { key: 'bandbreite', labelKey: 'f.bandbreite', kind: 'length', min: 8, max: 50, step: 1, unitKey: 'u.mm', groupKey: 'g.konstruktion' },
  ],
  bulkMm: (p) => Math.min(16, Math.max(5, Math.round(num(p, 'umfang', 70) / 8))),
  width: (p) => mm(num(p, 'anzahl', 1) * (num(p, 'bandbreite', 20) + 16) + 16),
  height: () => mm(46),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const anzahl = Math.max(1, num(p, 'anzahl', 1));
    const bandLaenge = Math.round(num(p, 'umfang', 70) + 2 * nz);
    return [
      {
        ...base(nz, 'schlaufe-traeger', 'piece.schlaufe-traeger', Math.round(num(p, 'anzahl', 1) * (num(p, 'bandbreite', 20) + 16) + 16) + 2 * nz, 46 + 2 * nz, 'fabric'),
        noteKey: 'note.schlaufe',
      },
      {
        ...lengthPiece('gurtband', 'piece.gurtband', bandLaenge, 'webbing', 'exact', 'note.gurtband'),
        count: anzahl,
      },
    ];
  },
  extraMaterials: (p, ctx) => {
    const anzahl = Math.max(1, num(p, 'anzahl', 1));
    const nz = ctx.seamAllowanceMm;
    return [
      {
        kind: 'webbing',
        spec: `gurtband-${Math.round(num(p, 'bandbreite', 20))}mm`,
        labelKey: 'mat.gurtband',
        amount: Math.round(anzahl * (num(p, 'umfang', 70) + 2 * nz)),
        unit: 'mm',
        certainty: 'exact',
        basisKey: 'basis.gurtband',
        basisValues: { anzahl, umfang: Math.round(num(p, 'umfang', 70)), nz },
      },
    ];
  },
  operations: (p, _ctx, id) => {
    const anzahl = Math.max(1, num(p, 'anzahl', 1));
    return [
      { kind: 'press', moduleId: id, dependsOn: [], titleKey: 'op.press-strap', values: { anzahl } },
      { kind: 'stitch', moduleId: id, dependsOn: [], titleKey: 'op.stitch-strap', values: { anzahl } },
    ];
  },
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = M05.width(p, ctx);
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M05-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'setParam', moduleId: id, key: 'anzahl', value: Math.max(1, num(p, 'anzahl', 1) - 1) },
        dismissible: false,
      });
    }
    if (num(p, 'umfang', 70) < 40) {
      out.push({
        ruleId: 'V-M05-02',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { umfang: Math.round(num(p, 'umfang', 70)) },
        fix: { kind: 'setParam', moduleId: id, key: 'umfang', value: 70 },
        dismissible: true,
      });
    }
    if (46 > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M05-03',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: 46, panel: Math.round(ctx.rowHeightMm) },
        fix: { kind: 'growHeight', toMm: Math.ceil(ctx.panelHeightMm - ctx.rowHeightMm + 46) + 20 },
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const anzahl = Math.max(1, num(p, 'anzahl', 1));
    const bw = num(p, 'bandbreite', 20);
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    const step = (w - 16) / anzahl;
    for (let i = 0; i < anzahl; i++) {
      const x = 8 + i * step + step / 2;
      prims.push({ t: 'rect', x: x - bw / 2, y: 12, w: bw, h: h - 20, style: 'hatch' });
      prims.push({ t: 'circle', cx: x, cy: 12, r: Math.min(4, bw / 3), style: 'button' });
    }
    return prims;
  },
  summary: (p) => `${num(p, 'anzahl', 1)} × Gurtband ${Math.round(num(p, 'umfang'))} mm`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M06 — Nadelkanal. Das Kernmodul: Breite und Höhe sind ABGELEITET.
// ─────────────────────────────────────────────────────────────────────────────
const M06: ModuleDef = {
  id: 'M06',
  nameKey: 'mod.M06.name',
  category: 'nadeln',
  icon: 'channel',
  descriptionKey: 'mod.M06.desc',
  placement: { kind: 'row' },
  tags: ['nadel', 'kanal', 'stricknadel', 'häkelnadel', 'channel', 'nadeln'],
  defaults: { nadellaenge: 200, nadelstaerke: 4, paare: 1, zugabe: 14, verstaerkung: true },
  derivedWidth: true,
  derivedHeight: true,
  grainSensitive: true,
  bulkMm: (p) => Math.min(18, Math.round(num(p, 'nadelstaerke', 4) + (bool(p, 'verstaerkung', true) ? 4 : 2))),
  fields: [
    { key: 'nadellaenge', labelKey: 'f.nadellaenge', kind: 'length', min: 60, max: 400, step: 5, unitKey: 'u.mm', groupKey: 'g.nadel', helpKey: 'help.nadellaenge' },
    { key: 'nadelstaerke', labelKey: 'f.nadelstaerke', kind: 'length', min: 1, max: 15, step: 1, unitKey: 'u.mm', groupKey: 'g.nadel' },
    { key: 'paare', labelKey: 'f.paare', kind: 'count', min: 1, max: 6, step: 1, groupKey: 'g.nadel' },
    { key: 'zugabe', labelKey: 'f.zugabe', kind: 'length', min: 4, max: 30, step: 1, unitKey: 'u.mm', groupKey: 'g.konstruktion', helpKey: 'help.zugabe' },
    { key: 'verstaerkung', labelKey: 'f.verstaerkung', kind: 'bool', groupKey: 'g.konstruktion' },
    { key: 'breite', labelKey: 'f.breite', kind: 'length', derived: true, unitKey: 'u.mm', groupKey: 'g.berechnet' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', derived: true, unitKey: 'u.mm', groupKey: 'g.berechnet' },
  ],
  width: (p) => mm(channelWidth(p)),
  height: (p) => mm(channelHeight(p)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = channelWidth(p);
    const h = channelHeight(p);
    const anzahl = Math.max(1, num(p, 'paare', 1));
    const out: PieceSpec[] = [
      {
        ...base(nz, 'kanal', 'piece.kanal', w + 2 * nz, h + 10 + nz, 'fabric', {
          netH: mm(h),
          netY: mm(10),
        }),
        noteKey: 'note.kanal-fadenlauf',
      },
      {
        ...lengthPiece('kanal-teilung', 'piece.kanal-teilung', Math.round(anzahl * h), 'thread', 'estimated', 'note.kanal-teilung'),
      },
    ];
    if (bool(p, 'verstaerkung', true)) {
      out.push(base(0, 'kanal-verstaerkung', 'piece.kanal-verstaerkung', w, h, 'interfacing', { noteKey: 'note.einlage' }));
    }
    return out;
  },
  operations: (p, _ctx, id) => {
    const anzahl = Math.max(1, num(p, 'paare', 1));
    const h = channelHeight(p);
    return [
      { kind: 'fuse', moduleId: id, dependsOn: [], titleKey: 'op.fuse-channel', values: { hoehe: Math.round(h) } },
      { kind: 'press', moduleId: id, dependsOn: [], titleKey: 'op.press-top', values: { saum: 10 } },
      { kind: 'baste', moduleId: id, dependsOn: [], titleKey: 'op.baste-channel', values: { hoehe: Math.round(h) } },
      // Trennnähte nur, wenn es tatsächlich mehrere Paare gibt — bei paare = 1 gibt es keine.
      ...(anzahl > 1
        ? [{
            kind: 'stitch-divider' as const,
            moduleId: id,
            dependsOn: [],
            titleKey: anzahl - 1 === 1 ? 'op.stitch-divider-one' : 'op.stitch-dividers',
            values: { naehte: anzahl - 1, hoehe: Math.round(h) },
          }]
        : []),
    ];
  },
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    // `ctx` beschreibt den freien Platz in Zeichenrichtung (Breite × Höhe der Zeile);
    // der Kontext ist bei gedrehten Modulen bereits achsengetauscht (s. Layout).
    const w = channelWidth(p);
    const h = channelHeight(p);
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M06-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M06-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: { kind: 'growHeight', toMm: Math.round(ctx.panelHeightMm + (h - ctx.rowHeightMm) + 20) },
        dismissible: false,
      });
    }
    if (num(p, 'zugabe', 14) < 8) {
      out.push({
        ruleId: 'V-M06-03',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { zugabe: Math.round(num(p, 'zugabe', 0)) },
        fix: { kind: 'setParam', moduleId: id, key: 'zugabe', value: 14 },
        dismissible: true,
      });
    }
    if (num(p, 'nadelstaerke', 4) > 10 && num(p, 'paare', 1) > 3) {
      out.push({
        ruleId: 'V-M06-04',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { staerke: Math.round(num(p, 'nadelstaerke', 4)), paare: Math.round(num(p, 'paare', 1)) },
        fix: { kind: 'setParam', moduleId: id, key: 'paare', value: 2 },
        dismissible: true,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const anzahl = Math.max(1, num(p, 'paare', 1));
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    const step = h / anzahl;
    for (let i = 0; i < anzahl; i++) {
      const y0 = i * step + 6;
      const y1 = (i + 1) * step - 6;
      // Nadel-Andeutung
      prims.push({ t: 'line', x1: w / 2, y1: y0, x2: w / 2, y2: y1, style: 'guide' });
      prims.push({ t: 'circle', cx: w / 2, cy: y1, r: Math.max(2, Math.min(5, num(p, 'nadelstaerke', 4) / 2)), style: 'hole' });
      if (i > 0) prims.push({ t: 'line', x1: 0, y1: i * step, x2: w, y2: i * step, style: 'divide' });
    }
    prims.push({ t: 'line', x1: 0, y1: 8, x2: w, y2: 8, style: 'seam' });
    return prims;
  },
  summary: (p) => `${Math.round(channelWidth(p))} × ${Math.round(channelHeight(p))} mm`,
};

export function channelWidth(p: Params): number {
  const paare = Math.max(1, num(p, 'paare', 1));
  return Math.round(paare * (num(p, 'nadelstaerke', 4) + 2 * PRACTICE.needleClearanceMm) + 2 * PRACTICE.channelEdgeSeamMm);
}
export function channelHeight(p: Params): number {
  return Math.round(num(p, 'nadellaenge', 200) + num(p, 'zugabe', 14));
}

// ─────────────────────────────────────────────────────────────────────────────
// M07 — Befestigungslasche (Band). Sitzt AN DER KANTE, überspannt die Panelnaht.
// ─────────────────────────────────────────────────────────────────────────────
const M07: ModuleDef = {
  id: 'M07',
  nameKey: 'mod.M07.name',
  category: 'verschluss',
  icon: 'strap',
  descriptionKey: 'mod.M07.desc',
  placement: { kind: 'edge', edge: 'right' },
  tags: ['lasche', 'band', 'verschluss', 'closure', 'klett'],
  defaults: { bandbreite: 25, laenge: 220, anzahl: 2, ueberlappung: 40 },
  fields: [
    { key: 'anzahl', labelKey: 'f.anzahl', kind: 'count', min: 1, max: 2, step: 1, groupKey: 'g.masse' },
    { key: 'bandbreite', labelKey: 'f.bandbreite', kind: 'length', min: 12, max: 60, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'laenge', labelKey: 'f.lasche-laenge', kind: 'length', min: 80, max: 500, step: 5, unitKey: 'u.mm', groupKey: 'g.konstruktion', helpKey: 'help.lasche' },
    { key: 'ueberlappung', labelKey: 'f.ueberlappung', kind: 'length', min: 20, max: 120, step: 5, unitKey: 'u.mm', groupKey: 'g.konstruktion' },
  ],
  bulkMm: () => 3,
  width: (p) => mm(num(p, 'bandbreite', 25) + 10),
  height: (p) => mm(Math.min(90, num(p, 'laenge', 220) / 2)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const bw = num(p, 'bandbreite', 25);
    const laenge = num(p, 'laenge', 220);
    const anzahl = Math.max(1, num(p, 'anzahl', 1));
    return [
      {
        ...base(nz, 'lasche', 'piece.lasche', 2 * bw + 2 * nz, laenge + 2 * nz, 'fabric', {
          count: anzahl,
          noteKey: 'note.lasche-doppelt',
          foldEdge: 'left',
          role: 'closure',
        }),
      },
    ];
  },
  extraMaterials: (p) => {
    const anzahl = Math.max(1, num(p, 'anzahl', 1));
    return [
      {
        kind: 'velcro',
        spec: 'klett-25mm',
        labelKey: 'mat.klett',
        amount: anzahl * 2,
        unit: 'stk',
        certainty: 'exact',
        basisKey: 'basis.klett',
        basisValues: { anzahl },
      },
    ];
  },
  operations: (p, _ctx, id) => [
    { kind: 'press', moduleId: id, dependsOn: [], titleKey: 'op.make-strap', values: { anzahl: Math.round(num(p, 'anzahl', 1)) } },
    { kind: 'insert-strap', moduleId: id, dependsOn: [], titleKey: 'op.attach-strap', values: { ueberlappung: Math.round(num(p, 'ueberlappung', 40)) } },
  ],
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const bw = num(p, 'bandbreite', 25);
    const laenge = num(p, 'laenge', 220);
    const ueberlappung = num(p, 'ueberlappung', 40);
    const w = M07.width(p, ctx);
    const h = M07.height(p, ctx);
    if (ueberlappung < 20) {
      out.push({
        ruleId: 'V-M07-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { ueberlappung: Math.round(ueberlappung) },
        fix: { kind: 'setParam', moduleId: id, key: 'ueberlappung', value: 40 },
        dismissible: false,
      });
    }
    if (bw < 15) {
      out.push({
        ruleId: 'V-M07-02',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { breite: Math.round(bw) },
        fix: { kind: 'setParam', moduleId: id, key: 'bandbreite', value: 25 },
        dismissible: true,
      });
    }
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M07-03',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M07-04',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: { kind: 'growHeight', toMm: Math.ceil(ctx.panelHeightMm - ctx.rowHeightMm + h) + 20 },
        dismissible: false,
      });
    }
    const spine = ctx.spineWidthMm ?? 0;
    const minReach = spine + ueberlappung;
    if (spine > 0 && laenge < minReach) {
      out.push({
        ruleId: 'V-M07-05',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { laenge: Math.round(laenge), benoetigt: Math.round(minReach), bund: Math.round(spine) },
        fix: { kind: 'setParam', moduleId: id, key: 'laenge', value: Math.min(500, Math.round(minReach)) },
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'hatch' }];
    prims.push({ t: 'line', x1: 0, y1: h / 2, x2: w, y2: h / 2, style: 'fold' });
    prims.push({ t: 'text', x: w / 2, y: h / 2 - 4, text: `${Math.round(num(p, 'laenge'))}`, anchor: 'middle' });
    return prims;
  },
  summary: (p) => `${num(p, 'anzahl', 1)} × ${Math.round(num(p, 'laenge'))} mm Band`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M08 — Knopfverschluss. Andere Mechanik: Öse + Knopf statt Band.
// ─────────────────────────────────────────────────────────────────────────────
const M08: ModuleDef = {
  id: 'M08',
  nameKey: 'mod.M08.name',
  category: 'verschluss',
  icon: 'button',
  descriptionKey: 'mod.M08.desc',
  placement: { kind: 'edge', edge: 'right' },
  tags: ['knopf', 'button', 'verschluss', 'closure', 'lasche'],
  defaults: { knopfDurchmesser: 18, laschenLaenge: 90, laschenBreite: 22 },
  fields: [
    { key: 'knopfDurchmesser', labelKey: 'f.knopf', kind: 'length', min: 10, max: 30, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'laschenLaenge', labelKey: 'f.laschen-laenge', kind: 'length', min: 40, max: 200, step: 5, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'laschenBreite', labelKey: 'f.laschen-breite', kind: 'length', min: 12, max: 60, step: 1, unitKey: 'u.mm', groupKey: 'g.konstruktion' },
  ],
  bulkMm: () => 4,
  width: (p) => mm(num(p, 'laschenBreite', 22) + 10),
  height: (p) => mm(num(p, 'laschenLaenge', 90)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const lw = num(p, 'laschenBreite', 22);
    const ll = num(p, 'laschenLaenge', 90);
    return [
      {
        ...base(nz, 'knopf-lasche', 'piece.knopf-lasche', 2 * lw + 2 * nz, ll + 2 * nz, 'fabric', {
          noteKey: 'note.knopf-lasche',
          foldEdge: 'left',
          role: 'closure',
        }),
      },
    ];
  },
  extraMaterials: (p) => [
    {
      kind: 'button',
      spec: `knopf-${Math.round(num(p, 'knopfDurchmesser', 18))}mm`,
      labelKey: 'mat.knopf',
      amount: 1,
      unit: 'stk',
      certainty: 'exact',
      basisKey: 'basis.knopf',
      basisValues: { durchmesser: Math.round(num(p, 'knopfDurchmesser', 18)) },
    },
  ],
  operations: (p, _ctx, id) => [
    { kind: 'press', moduleId: id, dependsOn: [], titleKey: 'op.make-button-tab', values: { laenge: Math.round(num(p, 'laschenLaenge', 90)) } },
    { kind: 'insert-strap', moduleId: id, dependsOn: [], titleKey: 'op.attach-button-tab', values: { laenge: Math.round(num(p, 'laschenLaenge', 90)) } },
    { kind: 'attach-button', moduleId: id, dependsOn: [], titleKey: 'op.attach-button', values: { durchmesser: Math.round(num(p, 'knopfDurchmesser', 18)) } },
  ],
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const d = num(p, 'knopfDurchmesser', 18);
    const lw = num(p, 'laschenBreite', 22);
    const ll = num(p, 'laschenLaenge', 90);
    const w = M08.width(p, ctx);
    const h = M08.height(p, ctx);
    const spine = ctx.spineWidthMm ?? 0;
    const minReach = spine + d + PRACTICE.buttonTabMarginMm;
    if (lw < d + 6) {
      out.push({
        ruleId: 'V-M08-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { lasche: Math.round(lw), knopf: Math.round(d) },
        fix: { kind: 'setParam', moduleId: id, key: 'laschenBreite', value: Math.round(d + 8) },
        dismissible: false,
      });
    }
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M08-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M08-03',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'laschenLaenge', h, Math.max(40, spine > 0 ? minReach : 40)),
        dismissible: false,
      });
    }
    if (spine > 0 && ll < minReach) {
      out.push({
        ruleId: 'V-M08-04',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { laenge: Math.round(ll), benoetigt: Math.round(minReach), bund: Math.round(spine) },
        fix: { kind: 'setParam', moduleId: id, key: 'laschenLaenge', value: Math.min(200, Math.round(minReach)) },
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const d = num(p, 'knopfDurchmesser', 18);
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'hatch' }];
    prims.push({ t: 'circle', cx: w / 2, cy: 14, r: d / 2, style: 'button' });
    prims.push({ t: 'line', x1: 0, y1: h / 2, x2: w, y2: h / 2, style: 'fold' });
    return prims;
  },
  summary: (p) => `Knopf ${Math.round(num(p, 'knopfDurchmesser'))} mm`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M09 — Ringhalter (Schmuck). Gepolstertes Band, Ringe aufgefädelt.
// ─────────────────────────────────────────────────────────────────────────────
const M09: ModuleDef = {
  id: 'M09',
  nameKey: 'mod.M09.name',
  category: 'schmuck',
  icon: 'ring',
  descriptionKey: 'mod.M09.desc',
  placement: { kind: 'row' },
  tags: ['ring', 'schmuck', 'jewelry', 'ringe', 'polster'],
  defaults: { breite: 110, hoehe: 55, ringe: 6, polsterung: 6 },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 40, max: 260, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 25, max: 200, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'ringe', labelKey: 'f.ringe', kind: 'count', min: 1, max: 14, step: 1, groupKey: 'g.konstruktion' },
    { key: 'polsterung', labelKey: 'f.polsterung', kind: 'length', min: 0, max: 15, step: 1, unitKey: 'u.mm', groupKey: 'g.konstruktion' },
  ],
  bulkMm: (p) => Math.min(18, Math.max(5, Math.round(num(p, 'polsterung', 6) + 5))),
  width: (p) => mm(num(p, 'breite', 110)),
  height: (p) => mm(num(p, 'hoehe', 55)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 110);
    const h = num(p, 'hoehe', 55);
    const out: PieceSpec[] = [
      base(nz, 'ring-band', 'piece.ring-band', w + 2 * nz, h + 2 * nz, 'fabric', { noteKey: 'note.ring-band' }),
    ];
    if (num(p, 'polsterung', 6) > 0) {
      out.push(base(0, 'ring-polster', 'piece.ring-polster', w, h, 'batting', { noteKey: 'note.polster' }));
    }
    return out;
  },
  operations: (p, _ctx, id) => [
    { kind: 'mark', moduleId: id, dependsOn: [], titleKey: 'op.mark-rings', values: { ringe: Math.round(num(p, 'ringe', 6)) } },
    { kind: 'stitch', moduleId: id, dependsOn: [], titleKey: 'op.quilt-padding', values: { ringe: Math.round(num(p, 'ringe', 6)) } },
  ],
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = num(p, 'breite', 110);
    const ringe = Math.max(1, num(p, 'ringe', 6));
    const slot = w / ringe;
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M09-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    if (slot < 12) {
      out.push({
        ruleId: 'V-M09-02',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { platz: Math.round(slot), ringe },
        fix: { kind: 'setParam', moduleId: id, key: 'ringe', value: Math.max(1, Math.floor(w / 16)) },
        dismissible: true,
      });
    }
    const h = num(p, 'hoehe', 55);
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M09-03',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 25),
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const ringe = Math.max(1, num(p, 'ringe', 6));
    const step = w / ringe;
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    if (num(p, 'polsterung', 6) > 0) prims.push({ t: 'rect', x: 4, y: 4, w: w - 8, h: h - 8, style: 'padding' });
    for (let i = 0; i < ringe; i++) {
      const x = step * (i + 0.5);
      prims.push({ t: 'circle', cx: x, cy: h * 0.5, r: Math.min(step * 0.28, h * 0.3), style: 'ring' });
      if (i > 0) prims.push({ t: 'line', x1: step * i, y1: h * 0.15, x2: step * i, y2: h * 0.85, style: 'divide' });
    }
    return prims;
  },
  summary: (p) => `${num(p, 'ringe', 6)} Ringe · gepolstert`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M10 — Ohrringhalter. Paarweise Lochleiste (Ösen), ganz andere Geometrie.
// ─────────────────────────────────────────────────────────────────────────────
const M10: ModuleDef = {
  id: 'M10',
  nameKey: 'mod.M10.name',
  category: 'schmuck',
  icon: 'earring',
  descriptionKey: 'mod.M10.desc',
  placement: { kind: 'row' },
  tags: ['ohrring', 'earring', 'schmuck', 'ösen', 'paare'],
  defaults: { breite: 110, hoehe: 45, paare: 7, lochAbstand: 10 },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 40, max: 260, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 25, max: 150, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'paare', labelKey: 'f.paare', kind: 'count', min: 1, max: 14, step: 1, groupKey: 'g.konstruktion' },
    { key: 'lochAbstand', labelKey: 'f.lochabstand', kind: 'length', min: 5, max: 30, step: 1, unitKey: 'u.mm', groupKey: 'g.konstruktion' },
  ],
  bulkMm: () => 6,
  width: (p) => mm(num(p, 'breite', 110)),
  height: (p) => mm(num(p, 'hoehe', 45)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 110);
    const h = num(p, 'hoehe', 45);
    return [
      base(nz, 'ohrring-leiste', 'piece.ohrring-leiste', w + 2 * nz, h + 2 * nz, 'fabric', {
        count: 2,
        noteKey: 'note.ohrring',
      }),
      base(0, 'ohrring-einlage', 'piece.ohrring-einlage', w, h, 'interfacing', {
        count: 2,
        noteKey: 'note.einlage',
      }),
    ];
  },
  operations: (_p, _ctx, id) => [
    { kind: 'fuse', moduleId: id, dependsOn: [], titleKey: 'op.fuse-earring', values: { lagen: 2 } },
    { kind: 'mark', moduleId: id, dependsOn: [], titleKey: 'op.mark-holes', values: { paare: Math.round(num(_p, 'paare', 7)) } },
  ],
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = num(p, 'breite', 110);
    const paare = Math.max(1, num(p, 'paare', 7));
    if (w / paare < num(p, 'lochAbstand', 10) + 2) {
      out.push({
        ruleId: 'V-M10-01',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { platz: Math.round(w / paare), abstand: Math.round(num(p, 'lochAbstand', 10) + 2) },
        fix: { kind: 'setParam', moduleId: id, key: 'paare', value: Math.max(1, Math.floor(w / (num(p, 'lochAbstand', 10) + 2))) },
        dismissible: true,
      });
    }
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M10-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    const h = num(p, 'hoehe', 45);
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M10-03',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 25),
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const paare = Math.max(1, num(p, 'paare', 7));
    const step = w / paare;
    const d = num(p, 'lochAbstand', 10);
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    for (let i = 0; i < paare; i++) {
      const x = step * (i + 0.5);
      prims.push({ t: 'circle', cx: x - d / 2, cy: h / 2, r: 2.5, style: 'hole' });
      prims.push({ t: 'circle', cx: x + d / 2, cy: h / 2, r: 2.5, style: 'hole' });
      prims.push({ t: 'line', x1: x - d / 2, y1: h / 2, x2: x + d / 2, y2: h / 2, style: 'guide' });
    }
    return prims;
  },
  summary: (p) => `${num(p, 'paare', 7)} Paare`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M11 — Kettenhalter. Hakenleiste mit Schlaufen + Tasche darunter.
// ─────────────────────────────────────────────────────────────────────────────
const M11: ModuleDef = {
  id: 'M11',
  nameKey: 'mod.M11.name',
  category: 'schmuck',
  icon: 'necklace',
  descriptionKey: 'mod.M11.desc',
  placement: { kind: 'row' },
  tags: ['kette', 'necklace', 'schmuck', 'haken', 'anhänger'],
  defaults: { breite: 130, hoehe: 120, haken: 5 },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 60, max: 260, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 60, max: 300, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'haken', labelKey: 'f.haken', kind: 'count', min: 1, max: 9, step: 1, groupKey: 'g.konstruktion' },
  ],
  bulkMm: () => 6,
  width: (p) => mm(num(p, 'breite', 130)),
  height: (p) => mm(num(p, 'hoehe', 120)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 130);
    const h = num(p, 'hoehe', 120);
    const pocketH = Math.min(40, Math.round(h * 0.45));
    return [
      base(nz, 'ketten-panel', 'piece.ketten-panel', w + 2 * nz, h + 2 * nz, 'fabric', { noteKey: 'note.ketten' }),
      base(nz, 'ketten-tasche', 'piece.ketten-tasche', w + 2 * nz, pocketH + 2 * nz, 'fabric', { noteKey: 'note.ketten-tasche' }),
    ];
  },
  extraMaterials: (p) => [
    {
      kind: 'ring',
      spec: 'haken-12mm',
      labelKey: 'mat.haken',
      amount: Math.max(1, num(p, 'haken', 5)),
      unit: 'stk',
      certainty: 'exact',
      basisKey: 'basis.haken',
      basisValues: { haken: Math.round(num(p, 'haken', 5)) },
    },
  ],
  operations: (p, _ctx, id) => {
    const h = num(p, 'hoehe', 120);
    const pocketH = Math.min(40, Math.round(h * 0.45));
    return [
      { kind: 'mark', moduleId: id, dependsOn: [], titleKey: 'op.mark-hooks', values: { haken: Math.round(num(p, 'haken', 5)) } },
      { kind: 'stitch', moduleId: id, dependsOn: [], titleKey: 'op.stitch-hook-tape', values: { haken: Math.round(num(p, 'haken', 5)) } },
      { kind: 'baste', moduleId: id, dependsOn: [], titleKey: 'op.baste-chain-pocket', values: { hoehe: pocketH } },
    ];
  },
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = num(p, 'breite', 130);
    if (w / Math.max(1, num(p, 'haken', 5)) < 18) {
      out.push({
        ruleId: 'V-M11-01',
        severity: 'warn',
        subject: { kind: 'module', id },
        values: { platz: Math.round(w / Math.max(1, num(p, 'haken', 5))) },
        fix: { kind: 'setParam', moduleId: id, key: 'haken', value: Math.max(1, Math.floor(w / 20)) },
        dismissible: true,
      });
    }
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M11-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    const h = num(p, 'hoehe', 120);
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M11-03',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 60),
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const haken = Math.max(1, num(p, 'haken', 5));
    const step = w / haken;
    const pocketH = Math.min(40, Math.round(h * 0.45));
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    for (let i = 0; i < haken; i++) {
      const x = step * (i + 0.5);
      prims.push({ t: 'circle', cx: x, cy: 18, r: 4, style: 'ring' });
      prims.push({ t: 'line', x1: x, y1: 18, x2: x, y2: h * 0.55, style: 'guide' });
    }
    prims.push({ t: 'line', x1: 0, y1: h - pocketH, x2: w, y2: h - pocketH, style: 'seam' });
    return prims;
  },
  summary: (p) => `${num(p, 'haken', 5)} Haken + Tasche`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M12 — Werkzeug-/Pinselhalter. Tiefe Tasche mit Fachtrennung, offene Oberseite.
// ─────────────────────────────────────────────────────────────────────────────
const M12: ModuleDef = {
  id: 'M12',
  nameKey: 'mod.M12.name',
  category: 'werkzeug',
  icon: 'brush',
  descriptionKey: 'mod.M12.desc',
  placement: { kind: 'row' },
  tags: ['pinsel', 'werkzeug', 'brush', 'halter', 'makeup', 'stift'],
  defaults: { breite: 90, hoehe: 120, sections: 2, schraeg: true },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 30, max: 200, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 40, max: 300, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'sections', labelKey: 'f.faecher', kind: 'count', min: 1, max: 6, step: 1, groupKey: 'g.konstruktion' },
    { key: 'schraeg', labelKey: 'f.schraege', kind: 'bool', groupKey: 'g.konstruktion', helpKey: 'help.schraege' },
  ],
  bulkMm: () => 10,
  width: (p) => mm(num(p, 'breite', 90)),
  height: (p) => mm(num(p, 'hoehe', 120)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 90);
    const h = num(p, 'hoehe', 120);
    const schraeg = bool(p, 'schraeg', true);
    return [
      base(nz, 'werkzeug-fach', 'piece.werkzeug-fach', w + 2 * nz, h + 20 + 2 * nz, 'fabric', {
        netH: mm(h),
        netY: mm(20 + nz),
        noteKey: schraeg ? 'note.schraeg' : 'note.gerade',
      }),
      base(nz, 'werkzeug-beleg', 'piece.werkzeug-beleg', w + 2 * nz, 20 + 2 * nz, 'fabric', {
        grain: 'crosswise',
        noteKey: 'note.beleg',
      }),
    ];
  },
  operations: (p, _ctx, id) => {
    const sections = Math.max(1, num(p, 'sections', 2));
    const w = num(p, 'breite', 90);
    return [
      // EIN Belegstreifen (w × 20 mm, quer zugeschnitten) — kein Fächer-Bezug.
      { kind: 'press', moduleId: id, dependsOn: [], titleKey: 'op.press-beleg', values: { breite: Math.round(w) } },
      { kind: 'stitch', moduleId: id, dependsOn: [], titleKey: 'op.stitch-teilung', values: { sections } },
      { kind: 'baste', moduleId: id, dependsOn: [], titleKey: 'op.baste-deep-pocket', values: { hoehe: Math.round(num(p, 'hoehe', 120)) } },
    ];
  },
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = num(p, 'breite', 90);
    const sections = Math.max(1, num(p, 'sections', 2));
    if (w / sections < PRACTICE.minSectionMm) {
      out.push({
        ruleId: 'V-M12-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { teil: Math.round(w / sections), min: PRACTICE.minSectionMm },
        fix: { kind: 'setParam', moduleId: id, key: 'sections', value: Math.max(1, Math.floor(w / PRACTICE.minSectionMm)) },
        dismissible: false,
      });
    }
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M12-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    const h = num(p, 'hoehe', 120);
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M12-03',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 40),
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const sections = Math.max(1, num(p, 'sections', 2));
    const schraeg = bool(p, 'schraeg', true);
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    if (schraeg) {
      prims.push({ t: 'line', x1: 0, y1: 20, x2: w, y2: 6, style: 'seam' });
      prims.push({ t: 'line', x1: 0, y1: 34, x2: w, y2: 20, style: 'seam' });
    } else {
      prims.push({ t: 'line', x1: 0, y1: 14, x2: w, y2: 14, style: 'seam' });
    }
    const step = w / sections;
    for (let i = 1; i < sections; i++) {
      prims.push({ t: 'line', x1: i * step, y1: 24, x2: i * step, y2: h, style: 'divide' });
    }
    return prims;
  },
  summary: (p) => `${num(p, 'sections', 2)} Fächer · tief`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M13 — Abdeckklappe. Sitzt an der Oberkante, schlägt über die Innenfläche.
// ─────────────────────────────────────────────────────────────────────────────
const M13: ModuleDef = {
  id: 'M13',
  nameKey: 'mod.M13.name',
  category: 'struktur',
  icon: 'flap',
  descriptionKey: 'mod.M13.desc',
  placement: { kind: 'edge', edge: 'top' },
  tags: ['abdeckung', 'klappe', 'flap', 'schutz', 'makeup'],
  defaults: { breite: 160, hoehe: 90, knopf: true },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 60, max: 300, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 30, max: 260, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'knopf', labelKey: 'f.mit-knopf', kind: 'bool', groupKey: 'g.konstruktion' },
  ],
  bulkMm: () => 4,
  width: (p) => mm(num(p, 'breite', 160)),
  height: (p) => mm(num(p, 'hoehe', 90)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 160);
    const h = num(p, 'hoehe', 90);
    const out: PieceSpec[] = [
      base(nz, 'klappe-aussen', 'piece.klappe-aussen', w + 2 * nz, h + 2 * nz, 'fabric', { noteKey: 'note.klappe' }),
      base(nz, 'klappe-futter', 'piece.klappe-futter', w + 2 * nz, h + 2 * nz, 'lining', { noteKey: 'note.klappe-futter' }),
    ];
    if (bool(p, 'knopf', true)) {
      out.push(base(0, 'klappe-einlage', 'piece.klappe-einlage', w, h, 'interfacing', { noteKey: 'note.einlage' }));
    }
    return out;
  },
  extraMaterials: (p) =>
    bool(p, 'knopf', true)
      ? [
          {
            kind: 'snap',
            spec: 'druckknopf-15mm',
            labelKey: 'mat.druckknopf',
            amount: 1,
            unit: 'stk',
            certainty: 'exact',
            basisKey: 'basis.druckknopf',
            basisValues: { anzahl: 1 },
          },
        ]
      : [],
  operations: (p, _ctx, id) => [
    { kind: 'fuse', moduleId: id, dependsOn: [], titleKey: 'op.fuse-flap', values: { lagen: 1 } },
    { kind: 'press', moduleId: id, dependsOn: [], titleKey: 'op.press-flap', values: { hoehe: Math.round(num(p, 'hoehe', 90)) } },
    { kind: 'insert-strap', moduleId: id, dependsOn: [], titleKey: 'op.attach-flap', values: { breite: Math.round(num(p, 'breite', 160)) } },
    ...(bool(p, 'knopf', true)
      ? [{ kind: 'attach-snap' as const, moduleId: id, dependsOn: [], titleKey: 'op.attach-snap', values: { anzahl: 1 } }]
      : []),
  ],
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const w = num(p, 'breite', 160);
    const h = num(p, 'hoehe', 90);
    if (w > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M13-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(w), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (w - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M13-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 30),
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'shadow' }];
    prims.push({ t: 'line', x1: 0, y1: 8, x2: w, y2: 8, style: 'fold' });
    if (bool(p, 'knopf', true)) prims.push({ t: 'circle', cx: w / 2, cy: h - 16, r: 6, style: 'snap' });
    prims.push({ t: 'text', x: w / 2, y: h / 2, text: 'Abdeckklappe', anchor: 'middle' });
    return prims;
  },
  summary: (p) => `Klappe ${Math.round(num(p, 'hoehe'))} mm`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M14 — Zubehörfach mit Gummizug (Netz-/Beutelfach, oben geschlossen).
// ─────────────────────────────────────────────────────────────────────────────
const M14: ModuleDef = {
  id: 'M14',
  nameKey: 'mod.M14.name',
  category: 'taschen',
  icon: 'pouch',
  descriptionKey: 'mod.M14.desc',
  placement: { kind: 'row' },
  tags: ['zubehör', 'beutel', 'pouch', 'accessoire', 'kabel', 'münzen'],
  defaults: { breite: 110, hoehe: 90, mitZug: true },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 40, max: 260, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 30, max: 260, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'mitZug', labelKey: 'f.mit-zug', kind: 'bool', groupKey: 'g.konstruktion' },
  ],
  bulkMm: (p) => (bool(p, 'mitZug', true) ? 12 : 8),
  width: (p) => mm(num(p, 'breite', 110)),
  height: (p) => mm(num(p, 'hoehe', 90)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    const w = num(p, 'breite', 110);
    const h = num(p, 'hoehe', 90);
    const out: PieceSpec[] = [
      base(nz, 'zubehoer-fach', 'piece.zubehoer-fach', w + 2 * nz, h + 2 * nz, 'fabric', { noteKey: 'note.zubehoer' }),
      base(nz, 'zubehoer-futter', 'piece.zubehoer-futter', w + 2 * nz, h + 2 * nz, 'lining', { noteKey: 'note.zubehoer-futter' }),
    ];
    if (bool(p, 'mitZug', true)) {
      out.push(lengthPiece('zubehoer-zug', 'piece.zubehoer-zug', Math.round(2 * w + 30), 'elastic', 'estimated', 'note.zug-laenge'));
    }
    return out;
  },
  operations: (p, _ctx, id) => [
    { kind: 'stitch', moduleId: id, dependsOn: [], titleKey: 'op.stitch-pouch', values: { breite: Math.round(num(p, 'breite', 110)) } },
    { kind: 'turn', moduleId: id, dependsOn: [], titleKey: 'op.turn-pouch', values: {} },
    ...(bool(p, 'mitZug', true)
      ? [{ kind: 'thread-elastic' as const, moduleId: id, dependsOn: [], titleKey: 'op.thread-drawstring', values: { laenge: Math.round(2 * num(p, 'breite', 110) + 30) } }]
      : []),
  ],
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    if (num(p, 'breite', 110) > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M14-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(num(p, 'breite', 110)), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (num(p, 'breite', 110) - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    const h = num(p, 'hoehe', 90);
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M14-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 30),
        dismissible: false,
      });
    }
    return out;
  },
  draw: (p, w, h) => {
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    prims.push({ t: 'line', x1: 0, y1: 12, x2: w, y2: 12, style: 'seam' });
    if (bool(p, 'mitZug', true)) {
      prims.push({ t: 'line', x1: 4, y1: 8, x2: w - 4, y2: 8, style: 'guide' });
      prims.push({ t: 'circle', cx: 8, cy: 8, r: 2, style: 'hole' });
      prims.push({ t: 'circle', cx: w - 8, cy: 8, r: 2, style: 'hole' });
    }
    return prims;
  },
  summary: (p) => `${Math.round(num(p, 'breite'))} × ${Math.round(num(p, 'hoehe'))} mm Beutel`,
};

// ─────────────────────────────────────────────────────────────────────────────
// M15 / M16 — Einfache Halter: Maßbandhalter und Scherenhalter.
// Klein, aber eigener Zweck und eigene Teile.
// ─────────────────────────────────────────────────────────────────────────────
const M15: ModuleDef = {
  id: 'M15',
  nameKey: 'mod.M15.name',
  category: 'werkzeug',
  icon: 'tape',
  descriptionKey: 'mod.M15.desc',
  placement: { kind: 'row' },
  tags: ['maßband', 'bandmaß', 'tape', 'meter'],
  defaults: { breite: 60, hoehe: 40 },
  fields: [
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 30, max: 120, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'hoehe', labelKey: 'f.hoehe', kind: 'length', min: 25, max: 100, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
  ],
  bulkMm: () => 10,
  width: (p) => mm(num(p, 'breite', 60)),
  height: (p) => mm(num(p, 'hoehe', 40)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    return [base(nz, 'massband-fach', 'piece.massband-fach', num(p, 'breite', 60) + 2 * nz, num(p, 'hoehe', 40) + 2 * nz, 'fabric', { noteKey: 'note.massband' })];
  },
  operations: (_p, _ctx, id) => [{ kind: 'baste', moduleId: id, dependsOn: [], titleKey: 'op.baste-pocket', values: { hoehe: 40 } }],
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    if (num(p, 'breite', 60) > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M15-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(num(p, 'breite', 60)), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (num(p, 'breite', 60) - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    const h = num(p, 'hoehe', 40);
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M15-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'hoehe', h, 25),
        dismissible: false,
      });
    }
    return out;
  },
  draw: (_p, w, h) => [
    { t: 'rect', x: 0, y: 0, w, h, style: 'pocket' },
    { t: 'circle', cx: w / 2, cy: h / 2, r: Math.min(w, h) * 0.32, style: 'ring' },
    { t: 'line', x1: w / 2, y1: h / 2, x2: w / 2 + 8, y2: h / 2 - 6, style: 'guide' },
  ],
  summary: (p) => `Maßband ${Math.round(num(p, 'breite'))} mm`,
};

const M16: ModuleDef = {
  id: 'M16',
  nameKey: 'mod.M16.name',
  category: 'werkzeug',
  icon: 'scissors',
  descriptionKey: 'mod.M16.desc',
  placement: { kind: 'row' },
  tags: ['schere', 'scissors', 'werkzeug'],
  defaults: { laenge: 180, breite: 60 },
  fields: [
    { key: 'laenge', labelKey: 'f.scheren-laenge', kind: 'length', min: 80, max: 260, step: 5, unitKey: 'u.mm', groupKey: 'g.masse' },
    { key: 'breite', labelKey: 'f.breite', kind: 'length', min: 25, max: 110, step: 1, unitKey: 'u.mm', groupKey: 'g.masse' },
  ],
  bulkMm: () => 9,
  width: (p) => mm(num(p, 'breite', 60)),
  height: (p) => mm(num(p, 'laenge', 180)),
  pieces: (p, ctx) => {
    const nz = ctx.seamAllowanceMm;
    return [
      base(nz, 'scheren-fach', 'piece.scheren-fach', num(p, 'breite', 60) + 2 * nz, num(p, 'laenge', 180) + 2 * nz, 'fabric', {
        noteKey: 'note.schere',
      }),
      base(0, 'scheren-einlage', 'piece.scheren-einlage', num(p, 'breite', 60), Math.round(num(p, 'laenge', 180) * 0.5), 'interfacing', {
        noteKey: 'note.einlage',
      }),
    ];
  },
  operations: (p, _ctx, id) => [
    { kind: 'fuse', moduleId: id, dependsOn: [], titleKey: 'op.fuse-scissors', values: { hoehe: Math.round(num(p, 'laenge', 180) * 0.5) } },
    { kind: 'baste', moduleId: id, dependsOn: [], titleKey: 'op.baste-deep-pocket', values: { hoehe: Math.round(num(p, 'laenge', 180)) } },
  ],
  validate: (p, ctx, id) => {
    const out: Finding[] = [];
    const h = num(p, 'laenge', 180);
    if (h > ctx.rowHeightMm) {
      out.push({
        ruleId: 'V-M16-01',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { hoehe: Math.round(h), panel: Math.round(ctx.rowHeightMm) },
        fix: heightFix(ctx, id, 'laenge', h, 80),
        dismissible: false,
      });
    }
    if (num(p, 'breite', 60) > ctx.channelFreeMm) {
      out.push({
        ruleId: 'V-M16-02',
        severity: 'error',
        subject: { kind: 'module', id },
        values: { breite: Math.round(num(p, 'breite', 60)), frei: Math.round(ctx.channelFreeMm) },
        fix: { kind: 'widenBase', toMm: ctx.panelWidthMm + (num(p, 'breite', 60) - ctx.channelFreeMm) },
        dismissible: false,
      });
    }
    return out;
  },
  draw: (_p, w, h) => {
    const prims: Prim[] = [{ t: 'rect', x: 0, y: 0, w, h, style: 'pocket' }];
    prims.push({ t: 'line', x1: 0, y1: 14, x2: w, y2: 14, style: 'seam' });
    prims.push({ t: 'circle', cx: w * 0.4, cy: h * 0.5, r: 5, style: 'hole' });
    prims.push({ t: 'circle', cx: w * 0.6, cy: h * 0.5, r: 5, style: 'hole' });
    prims.push({ t: 'line', x1: w * 0.4, y1: h * 0.55, x2: w * 0.15, y2: h * 0.9, style: 'guide' });
    prims.push({ t: 'line', x1: w * 0.6, y1: h * 0.55, x2: w * 0.85, y2: h * 0.9, style: 'guide' });
    return prims;
  },
  summary: (p) => `Schere ${Math.round(num(p, 'laenge'))} mm`,
};

export const MODULES: readonly ModuleDef[] = [M01, M02, M03, M04, M05, M06, M07, M08, M09, M10, M11, M12, M13, M14, M15, M16];

const registry = new Map<ModuleTypeId, ModuleDef>(MODULES.map((m) => [m.id, m]));

export function moduleDef(id: ModuleTypeId): ModuleDef {
  const def = registry.get(id);
  if (!def) throw new Error(`Unbekannter Modultyp: ${id}`);
  return def;
}

export function moduleOrDefaults(id: ModuleTypeId): Params {
  return { ...moduleDef(id).defaults };
}

export type { Mm, ParamValue };
export { clamp };
