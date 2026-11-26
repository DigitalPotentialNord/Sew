import { version as appVersion } from '../../package.json';
/**
 * Projektverwaltung: Schema, Validierung (Zod), Speicherung, Vorlagen.
 * Gespeichert wird nur ABSICHT — nie ein Berechnungsergebnis.
 */
import { z } from 'zod';
import { moduleDef } from './modules';
import { LIMITS, PRACTICE } from './practice';
import { SCHEMA_VERSION, type Instance, type Project, type ProjectBase, type RowSpec } from './construction';
import type { ModuleTypeId, Params } from './types';

// ─── Zod ─────────────────────────────────────────────────────────────────────
export const paramsSchema = z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])); // zod v4: Schlüsselschema explizit

export const instanceSchema = z.object({
  id: z.string().min(1),
  typeId: z.string().min(2),
  rowId: z.string().min(1),
  params: paramsSchema,
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  locked: z.boolean(),
});

export const projectSchema = z.object({
  schemaVersion: z.number().int(),
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  createdAt: z.string(),
  updatedAt: z.string(),
  base: z.object({
    form: z.literal('book'),
    widthMm: z.number().int().min(LIMITS.baseWidthMm.min).max(LIMITS.baseWidthMm.max),
    heightMm: z.number().int().min(LIMITS.baseHeightMm.min).max(LIMITS.baseHeightMm.max),
    spineWidthMm: z.number().int().min(0).max(LIMITS.spineWidthMm.max),
    cornerRadiusMm: z.number().int().min(0).max(LIMITS.cornerRadiusMm.max),
    hasLining: z.boolean(),
  }),
  rows: z.array(z.object({ id: z.string(), name: z.string() })).min(1).max(8),
  modules: z.array(instanceSchema),
  settings: z.object({
    seamAllowanceMm: z.number().int().min(4).max(20),
    fabricWidthMm: z.number().int().min(LIMITS.fabricWidthMm.min).max(LIMITS.fabricWidthMm.max),
    unit: z.union([z.literal('mm'), z.literal('cm')]),
  }),
});

export type ProjectFile = {
  readonly format: 'organizer-studio/project';
  readonly schemaVersion: number;
  readonly exportedAt: string;
  readonly appVersion: string;
  readonly project: Project;
};

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export function validateProject(input: unknown): { ok: true; project: Project } | { ok: false; issues: ValidationIssue[] } {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  }
  const p = parsed.data as unknown as Project;
  const issues: ValidationIssue[] = [];
  // Referenzintegrität (Invarianten I1–I3)
  const ids = new Set(p.modules.map((m) => m.id));
  if (ids.size !== p.modules.length) issues.push({ path: 'modules', message: 'Modul-IDs sind nicht eindeutig.' });
  const rowIds = new Set(p.rows.map((r) => r.id));
  for (const m of p.modules) {
    if (!rowIds.has(m.rowId)) issues.push({ path: `modules.${m.id}.rowId`, message: 'Zeile existiert nicht.' });
    if (!Object.prototype.hasOwnProperty.call(moduleTypes, m.typeId)) {
      issues.push({ path: `modules.${m.id}.typeId`, message: `Unbekannter Modultyp ${m.typeId}.` });
    }
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, project: p };
}

const moduleTypes: Record<string, true> = {
  M01: true, M02: true, M03: true, M04: true, M05: true, M06: true, M07: true, M08: true,
  M09: true, M10: true, M11: true, M12: true, M13: true, M14: true, M15: true, M16: true,
};

export function migrate(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const file = raw as Record<string, unknown>;
  const inner = (file.project ?? raw) as Record<string, unknown>;
  const version = typeof inner.schemaVersion === 'number' ? inner.schemaVersion : 1;
  let p = { ...inner };
  if (version < 2) {
    // v1 → v2: `rows` kam hinzu; Module ohne rowId landen in einer Sammelzeile
    const rows = Array.isArray(p.rows) && p.rows.length > 0 ? p.rows : [{ id: 'r1', name: 'Zeile 1' }];
    const firstRow = (rows as { id: string }[])[0]!.id;
    const mods = Array.isArray(p.modules)
      ? (p.modules as Record<string, unknown>[]).map((m) => ({
          rotation: 0,
          locked: false,
          rowId: firstRow,
          ...m,
        }))
      : [];
    p = { ...p, schemaVersion: 2, rows, modules: mods };
  }
  return { ...(file.project ? file : {}), ...p, schemaVersion: SCHEMA_VERSION } as unknown as Project;
}

// ─── IDs ─────────────────────────────────────────────────────────────────────
let counter = 0;
/**
 * Prozess-lokal eindeutige IDs. `Date.now()` allein reicht nicht: zwei Tabs, die
 * in derselben Millisekunde eine ID fordern, bekämen denselben Wert. Deshalb
 * Zufall aus `crypto`; der Zähler bleibt als Tiebreaker im selben Prozess.
 * Instances tragen lokale IDs ohne Sicherheitsrelevanz.
 */
export function newId(prefix: string): string {
  counter += 1;
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${rand}${counter.toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ─── Erzeugen ────────────────────────────────────────────────────────────────
export function blankProject(name = 'Neues Etui'): Project {
  const ts = '2026-01-01T00:00:00.000Z';
  return {
    schemaVersion: SCHEMA_VERSION,
    // Frische ID, sonst überschreiben zwei leere Projekte in der Bibliothek
    // einander (saveToLibrary ersetzt per ID).
    id: newId('p'),
    name,
    createdAt: ts,
    updatedAt: ts,
    base: { form: 'book', widthMm: 240, heightMm: 200, spineWidthMm: 40, cornerRadiusMm: 16, hasLining: true },
    rows: [{ id: 'r1', name: 'Zeile 1' }],
    modules: [],
    settings: { seamAllowanceMm: PRACTICE.seamAllowanceMm, fabricWidthMm: 1400, unit: 'mm' },
  };
}

export function makeInstance(typeId: ModuleTypeId, rowId: string, overrides: Partial<Params> = {}): Instance {
  const def = moduleDef(typeId);
  return {
    id: newId('m'),
    typeId,
    rowId,
    params: { ...def.defaults, ...overrides } as Params,
    rotation: 0,
    locked: false,
  };
}

export function duplicateInstance(p: Project, id: string): Project {
  const src = p.modules.find((m) => m.id === id);
  if (!src) return p;
  const copy: Instance = { ...src, id: newId('m'), params: { ...src.params }, locked: false };
  const idx = p.modules.findIndex((m) => m.id === id);
  const modules = [...p.modules];
  modules.splice(idx + 1, 0, copy);
  return { ...p, modules, updatedAt: nowIso() };
}

export function removeInstance(p: Project, ids: readonly string[]): Project {
  const set = new Set(ids);
  return { ...p, modules: p.modules.filter((m) => !set.has(m.id)), updatedAt: nowIso() };
}

export function updateParams(p: Project, id: string, key: string, value: number | string | boolean): Project {
  return {
    ...p,
    updatedAt: nowIso(),
    modules: p.modules.map((m) => (m.id === id ? { ...m, params: { ...m.params, [key]: value } as Params } : m)),
  };
}

export function moveInstance(p: Project, id: string, rowId: string, index: number): Project {
  const src = p.modules.find((m) => m.id === id);
  if (!src) return p;
  const rest = p.modules.filter((m) => m.id !== id);
  const targetRowIdx = rest.filter((m) => m.rowId === rowId).length;
  const clamped = Math.max(0, Math.min(index, targetRowIdx));
  // Einfügeposition in Gesamtliste bestimmen
  const rowMembers = rest.filter((m) => m.rowId === rowId);
  let insertAt: number;
  if (rowMembers.length === 0) {
    const lastOfRow = rest.map((m) => m.rowId === rowId).lastIndexOf(true);
    insertAt = lastOfRow === -1 ? rest.length : lastOfRow + 1;
    const firstOther = rest.findIndex((m, i) => i > insertAt && m.rowId !== rowId);
    insertAt = firstOther === -1 ? rest.length : firstOther;
  } else {
    const anchor = rowMembers[Math.min(clamped, rowMembers.length - 1)]!;
    insertAt = rest.indexOf(anchor);
    if (clamped >= rowMembers.length) insertAt = rest.indexOf(rowMembers[rowMembers.length - 1]!) + 1;
  }
  const modules = [...rest];
  modules.splice(insertAt, 0, { ...src, rowId });
  return { ...p, modules, updatedAt: nowIso() };
}

export function addRow(p: Project): Project {
  const id = newId('r');
  return { ...p, rows: [...p.rows, { id, name: `Zeile ${p.rows.length + 1}` }], updatedAt: nowIso() };
}

export function removeRow(p: Project, rowId: string): Project {
  if (p.rows.length <= 1) return p;
  return {
    ...p,
    rows: p.rows.filter((r) => r.id !== rowId),
    modules: p.modules.filter((m) => m.rowId !== rowId),
    updatedAt: nowIso(),
  };
}

export function renameRow(p: Project, rowId: string, name: string): Project {
  return { ...p, rows: p.rows.map((r) => (r.id === rowId ? { ...r, name } : r)), updatedAt: nowIso() };
}

// ─── Serialisierung ──────────────────────────────────────────────────────────
export function toFile(p: Project): ProjectFile {
  return {
    format: 'organizer-studio/project',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    appVersion,
    project: p,
  };
}

export function fromFile(raw: unknown): { ok: true; project: Project } | { ok: false; issues: ValidationIssue[] } {
  const migrated = migrate(raw);
  return validateProject(migrated);
}

// ─── localStorage ────────────────────────────────────────────────────────────
const STORE_KEY = 'os.projects.v2';
const CURRENT_KEY = 'os.current.v2';

export interface StoredProject {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: string;
  readonly project: Project;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadLibrary(): StoredProject[] {
  const list = safeParse<unknown[]>(safeRead(STORE_KEY));
  if (!Array.isArray(list)) return [];
  const out: StoredProject[] = [];
  for (const item of list) {
    const candidate = item as { project?: unknown };
    const parsed = fromFile(candidate?.project ?? item);
    if (parsed.ok) {
      out.push({ id: parsed.project.id, name: parsed.project.name, updatedAt: parsed.project.updatedAt, project: parsed.project });
    }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Lese-/Schreibzugriff kann scheitern (Quota, privater Modus, per Policy
 * deaktiviertes Storage). Dann bleibt die App bedienbar und meldet ehrlich
 * „nicht gespeichert“, statt mit einer Exception im Klick-Handler abzustürzen.
 */
function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

export function saveToLibrary(p: Project): boolean {
  const list = loadLibrary().filter((s) => s.id !== p.id);
  list.unshift({ id: p.id, name: p.name, updatedAt: p.updatedAt, project: p });
  return safeWrite(() => localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 30))));
}

export function deleteFromLibrary(id: string): boolean {
  const list = loadLibrary().filter((s) => s.id !== id);
  return safeWrite(() => localStorage.setItem(STORE_KEY, JSON.stringify(list)));
}

export function loadCurrent(): Project | null {
  const raw = safeParse<unknown>(safeRead(CURRENT_KEY));
  if (!raw) return null;
  const parsed = fromFile(raw);
  return parsed.ok ? parsed.project : null;
}

export function saveCurrent(p: Project): boolean {
  return safeWrite(() => localStorage.setItem(CURRENT_KEY, JSON.stringify(p)));
}

export function clearCurrent(): void {
  safeWrite(() => localStorage.removeItem(CURRENT_KEY));
}

// ─── Vorlagen ────────────────────────────────────────────────────────────────
export type TemplateId = 'schmuck' | 'makeup' | 'strick';

interface TemplateDef {
  readonly id: TemplateId;
  readonly nameKey: string;
  readonly descKey: string;
  readonly build: () => Project;
}

const mk = (typeId: ModuleTypeId, rowId: string, params: Params): Instance => ({
  id: newId('m'),
  typeId,
  rowId,
  params,
  rotation: 0,
  locked: false,
});

const base = (w: number, h: number, spine: number, radius: number): ProjectBase => ({
  form: 'book',
  widthMm: w,
  heightMm: h,
  spineWidthMm: spine,
  cornerRadiusMm: radius,
  hasLining: true,
});

const rows = (...names: string[]): RowSpec[] => names.map((name, i) => ({ id: `r${i + 1}`, name }));

export const TEMPLATES: readonly TemplateDef[] = [
  {
    id: 'schmuck',
    nameKey: 'tpl.schmuck',
    descKey: 'tpl.schmuck.desc',
    build: () => ({
      schemaVersion: SCHEMA_VERSION,
      id: newId('p'),
      name: 'Schmuck-Organizer',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      base: base(240, 200, 32, 16),
      rows: rows('Ringe & Ohrringe', 'Ketten', 'RV & Lasche'),
      modules: [
        mk('M09', 'r1', { breite: 106, hoehe: 46, ringe: 6, polsterung: 6 }),
        mk('M10', 'r1', { breite: 106, hoehe: 46, paare: 6, lochAbstand: 12 }),
        mk('M11', 'r2', { breite: 206, hoehe: 70, haken: 5 }),
        mk('M03', 'r3', { breite: 150, hoehe: 46, ziptype: 'endlos' }),
        mk('M07', 'r3', { bandbreite: 25, laenge: 90, anzahl: 2, ueberlappung: 40 }),
      ],
      settings: { seamAllowanceMm: 10, fabricWidthMm: 1400, unit: 'mm' },
    }),
  },
  {
    id: 'makeup',
    nameKey: 'tpl.makeup',
    descKey: 'tpl.makeup.desc',
    build: () => ({
      schemaVersion: SCHEMA_VERSION,
      id: newId('p'),
      name: 'Make-up-Organizer',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      base: base(280, 240, 30, 16),
      rows: rows('Pinsel', 'Abdeckung', 'Zubehör & RV'),
      modules: [
        mk('M12', 'r1', { breite: 116, hoehe: 96, sections: 2, schraeg: true }),
        mk('M04', 'r1', { breite: 116, loops: 5, gegenstandBreite: 14, gegenstandDicke: 12, bandbreite: 12, zug: 6 }),
        mk('M13', 'r2', { breite: 210, hoehe: 56, knopf: true }),
        mk('M14', 'r3', { breite: 108, hoehe: 44, mitZug: true }),
        mk('M03', 'r3', { breite: 108, hoehe: 40, ziptype: 'endlos' }),
        mk('M08', 'r3', { knopfDurchmesser: 18, laschenLaenge: 64, laschenBreite: 26 }),
      ],
      settings: { seamAllowanceMm: 10, fabricWidthMm: 1400, unit: 'mm' },
    }),
  },
  {
    id: 'strick',
    nameKey: 'tpl.strick',
    descKey: 'tpl.strick.desc',
    build: () => ({
      schemaVersion: SCHEMA_VERSION,
      id: newId('p'),
      name: 'Stricknadel-Organizer',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      base: base(240, 330, 36, 16),
      rows: rows('Nadelkanäle', 'Häkelnadeln', 'Werkzeug'),
      modules: [
        mk('M06', 'r1', { nadellaenge: 200, nadelstaerke: 4, paare: 1, zugabe: 14, verstaerkung: true }),
        mk('M06', 'r1', { nadellaenge: 200, nadelstaerke: 5, paare: 1, zugabe: 14, verstaerkung: true }),
        mk('M06', 'r1', { nadellaenge: 200, nadelstaerke: 5, paare: 1, zugabe: 14, verstaerkung: true }),
        mk('M06', 'r1', { nadellaenge: 200, nadelstaerke: 6, paare: 1, zugabe: 14, verstaerkung: true }),
        mk('M06', 'r1', { nadellaenge: 200, nadelstaerke: 6, paare: 1, zugabe: 14, verstaerkung: true }),
        mk('M06', 'r1', { nadellaenge: 200, nadelstaerke: 8, paare: 1, zugabe: 14, verstaerkung: true }),
        mk('M16', 'r1', { laenge: 176, breite: 58 }),
        mk('M04', 'r2', { breite: 200, loops: 7, gegenstandBreite: 16, gegenstandDicke: 10, bandbreite: 12, zug: 6 }),
        mk('M01', 'r3', { breite: 96, hoehe: 60, saum: 'saum', saumbreite: 10 }),
        mk('M15', 'r3', { breite: 56, hoehe: 44 }),
        mk('M07', 'r3', { bandbreite: 25, laenge: 80, anzahl: 1, ueberlappung: 40 }),
      ],
      settings: { seamAllowanceMm: 10, fabricWidthMm: 1400, unit: 'mm' },
    }),
  },
];

export function templateById(id: TemplateId): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function buildTemplate(id: TemplateId): Project {
  const t = templateById(id);
  if (!t) throw new Error(`Unbekannte Vorlage: ${id}`);
  return t.build();
}

export type { Project, Instance };
