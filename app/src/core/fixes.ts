/**
 * Fixes (R4): reine, datengetriebene Reparaturvorschläge.
 * `applyFix` ist die EINZIGE Stelle, an der ein Finding das Projekt verändert.
 */
import { clamp } from './geometry';
import { moduleDef } from './modules';
import { LIMITS } from './practice';
import type { Finding, FixKind, Side } from './types';
import type { Instance, Project } from './construction';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Reine, idempotente Atom-Verschiebung eines Moduls auf `(side, rowId, index)`
 * — wobei `index` der 0-basierte Platz INNERHALB von `(rowId, side)` ist.
 * Die Reihenfolge aller anderen Zeilen und der Gegenseite bleibt unberührt.
 */
export function relocateInModules(
  modules: readonly Instance[],
  moduleId: string,
  side: Side,
  rowId: string,
  index: number,
): readonly Instance[] {
  const inst = modules.find((m) => m.id === moduleId);
  if (!inst) return modules;
  const rest = modules.filter((m) => m.id !== moduleId);
  const sameSlotIndices: number[] = [];
  for (let i = 0; i < rest.length; i++) {
    const m = rest[i]!;
    if (m.rowId === rowId && m.side === side) sameSlotIndices.push(i);
  }
  const clamped = Math.round(clamp(index, 0, sameSlotIndices.length));
  const moved: Instance = { ...inst, rowId, side };
  let insertAt: number;
  if (sameSlotIndices.length === 0) {
    insertAt = rest.length;
  } else if (clamped >= sameSlotIndices.length) {
    insertAt = sameSlotIndices[sameSlotIndices.length - 1]! + 1;
  } else {
    insertAt = sameSlotIndices[clamped]!;
  }
  return [...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)];
}

/** Stabile Identität eines Findings — für Ausblenden und Deduplizieren. */
export function findingKey(f: Finding): string {
  return `${f.ruleId}|${f.subject.kind}|${'id' in f.subject ? f.subject.id : ''}|${JSON.stringify(f.values)}`;
}

/**
 * Einen Fix anwenden.
 *
 * `updatedAt` wird hier NICHT gesetzt: der Kern ist deterministisch und darf
 * keine Uhr lesen. Der Store stempelt die Änderung nach dem Aufruf — sonst
 * trüge ein repariertes Projekt den 1. Januar 1970 als Änderungsdatum.
 */
export function applyFix(p: Project, fix: FixKind): Project {
  const touch = (next: Omit<Project, 'updatedAt'>): Project => ({ ...next, updatedAt: p.updatedAt });

  switch (fix.kind) {
    case 'widenBase':
      return touch({
        ...p,
        base: { ...p.base, widthMm: Math.round(clamp(fix.toMm, LIMITS.baseWidthMm.min, LIMITS.baseWidthMm.max)) },
      });
    case 'growHeight':
      return touch({
        ...p,
        base: { ...p.base, heightMm: Math.round(clamp(fix.toMm, LIMITS.baseHeightMm.min, LIMITS.baseHeightMm.max)) },
      });
    case 'setFabricWidth':
      return touch({
        ...p,
        settings: { ...p.settings, fabricWidthMm: Math.round(clamp(fix.toMm, LIMITS.fabricWidthMm.min, LIMITS.fabricWidthMm.max)) },
      });
    case 'setCornerRadius':
      return touch({
        ...p,
        base: { ...p.base, cornerRadiusMm: Math.round(clamp(fix.toMm, LIMITS.cornerRadiusMm.min, LIMITS.cornerRadiusMm.max)) },
      });
    case 'setSpineWidth':
      return touch({
        ...p,
        base: { ...p.base, spineWidthMm: Math.round(clamp(fix.toMm, LIMITS.spineWidthMm.min, LIMITS.spineWidthMm.max)) },
      });
    case 'setRotation':
      return touch({
        ...p,
        modules: p.modules.map((m) => (m.id === fix.moduleId ? { ...m, rotation: fix.rotation } : m)),
      });
    case 'relocateModule': {
      if (!p.rows.some((r) => r.id === fix.rowId)) return p;
      return touch({
        ...p,
        modules: relocateInModules(p.modules, fix.moduleId, fix.side, fix.rowId, fix.index),
      });
    }
    case 'removeModule':
      return touch({ ...p, modules: p.modules.filter((m) => m.id !== fix.moduleId) });
    case 'setParam': {
      if (FORBIDDEN_KEYS.has(fix.key)) return p;
      return touch({
        ...p,
        modules: p.modules.map((m) => {
          if (m.id !== fix.moduleId) return m;
          let val = fix.value;
          if (typeof val === 'number') {
            if (!Number.isFinite(val)) return m;
            const field = moduleDef(m.typeId).fields.find((f) => f.key === fix.key);
            if (field?.min !== undefined && field?.max !== undefined) {
              val = Math.round(clamp(val, field.min, field.max));
            }
          }
          return { ...m, params: { ...m.params, [fix.key]: val } };
        }),
      });
    }
    case 'addModule':
      return p; // wird vom Aufrufer über den Store erledigt (braucht eine neue ID)
    default:
      return p;
  }
}
