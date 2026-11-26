/**
 * Fixes (R4): reine, datengetriebene Reparaturvorschläge.
 * `applyFix` ist die EINZIGE Stelle, an der ein Finding das Projekt verändert.
 */
import { clamp } from './geometry';
import { LIMITS } from './practice';
import type { Finding, FixKind } from './types';
import type { Project } from './construction';

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
        base: { ...p.base, widthMm: clamp(fix.toMm, LIMITS.baseWidthMm.min, LIMITS.baseWidthMm.max) },
      });
    case 'growHeight':
      return touch({
        ...p,
        base: { ...p.base, heightMm: clamp(fix.toMm, LIMITS.baseHeightMm.min, LIMITS.baseHeightMm.max) },
      });
    case 'setFabricWidth':
      return touch({
        ...p,
        settings: { ...p.settings, fabricWidthMm: clamp(fix.toMm, LIMITS.fabricWidthMm.min, LIMITS.fabricWidthMm.max) },
      });
    case 'setCornerRadius':
      return touch({
        ...p,
        base: { ...p.base, cornerRadiusMm: clamp(fix.toMm, LIMITS.cornerRadiusMm.min, LIMITS.cornerRadiusMm.max) },
      });
    case 'removeModule':
      return touch({ ...p, modules: p.modules.filter((m) => m.id !== fix.moduleId) });
    case 'setParam':
      return touch({
        ...p,
        modules: p.modules.map((m) =>
          m.id === fix.moduleId ? { ...m, params: { ...m.params, [fix.key]: fix.value } } : m,
        ),
      });
    case 'addModule':
      return p; // wird vom Aufrufer über den Store erledigt (braucht eine neue ID)
    default:
      return p;
  }
}
