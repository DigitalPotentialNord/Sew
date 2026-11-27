/**
 * Umfassende Invarianten-Prüfung für die gesamte Konstruktions-Pipeline.
 *
 * Reine, deterministische Selbstprüfung über 18 mathematische und nähtechnische
 * Zusicherungen — eingesetzt in Property-Tests, Regressions-Tests und Audits.
 */
import { rectsOverlap } from './geometry';
import { construct, type Construction, type Project } from './construction';
import { applyFix } from './fixes';
import { PRACTICE } from './practice';

export interface InvariantViolation {
  readonly code: string;
  readonly message: string;
}

const isFiniteInt = (n: number): boolean => Number.isFinite(n) && Math.floor(n) === n && !Object.is(n, -0);

/**
 * Prüft alle harten Invarianten einer Konstruktion. Gibt ein leeres Array
 * zurück, wenn alle Zusicherungen erfüllt sind.
 */
export function checkConstructionInvariants(p: Project, c: Construction): readonly InvariantViolation[] {
  const out: InvariantViolation[] = [];
  const fail = (code: string, message: string): void => {
    out.push({ code, message });
  };

  // INV-01: Determinismus
  const again = construct(p);
  if (again.projectHash !== c.projectHash) {
    fail('INV-01', `projectHash nicht deterministisch: ${c.projectHash} !== ${again.projectHash}`);
  }
  if (again.evaluation.score !== c.evaluation.score || again.evaluation.grade !== c.evaluation.grade) {
    fail('INV-01', `evaluation nicht deterministisch`);
  }

  // INV-02: Buch- & Flap-Geometrie exakt & ganzzahlig
  const expectedBookW = 2 * p.base.widthMm + p.base.spineWidthMm;
  if (c.book.w !== expectedBookW || c.book.h !== p.base.heightMm) {
    fail('INV-02', `book=${c.book.w}×${c.book.h}, erwartet ${expectedBookW}×${p.base.heightMm}`);
  }
  if (c.flap.w !== p.base.widthMm || c.flap.h !== p.base.heightMm) {
    fail('INV-02', `flap=${c.flap.w}×${c.flap.h}, erwartet ${p.base.widthMm}×${p.base.heightMm}`);
  }

  // INV-03: Schnittteile gültig, positiv, netRect liegt in cutRect
  for (const pc of c.pieces) {
    if (pc.kind !== 'cut') continue;
    if (!isFiniteInt(pc.w) || !isFiniteInt(pc.h) || pc.w <= 0 || pc.h <= 0) {
      fail('INV-03', `Teil ${pc.id}: ungültige Zuschnittmaße ${pc.w}×${pc.h}`);
    }
    if (!isFiniteInt(pc.netW) || !isFiniteInt(pc.netH) || pc.netW <= 0 || pc.netH <= 0) {
      fail('INV-03', `Teil ${pc.id}: ungültige Nettomaße ${pc.netW}×${pc.netH}`);
    }
    if (
      pc.netRect.x < 0 ||
      pc.netRect.y < 0 ||
      pc.netRect.x + pc.netRect.w > pc.cutRect.w ||
      pc.netRect.y + pc.netRect.h > pc.cutRect.h
    ) {
      fail('INV-03', `Teil ${pc.id}: netRect außerhalb cutRect`);
    }
  }

  // INV-04: Panel-Außen immer vorhanden; Panel-Futter genau bei hasLining
  const hasOuter = c.pieces.some((pc) => pc.id === 'panel-aussen');
  const hasLining = c.pieces.some((pc) => pc.id === 'panel-futter');
  if (!hasOuter) fail('INV-04', 'panel-aussen fehlt');
  if (hasLining !== p.base.hasLining) {
    fail('INV-04', `panel-futter=${String(hasLining)} widerspricht hasLining=${String(p.base.hasLining)}`);
  }

  // INV-05: Jedes platzierte Modul besitzt >= 1 Schnittteil und >= 1 Operation
  for (const m of p.modules) {
    if (!c.pieces.some((pc) => pc.sourceModuleId === m.id)) {
      fail('INV-05', `Modul ${m.id} (${m.typeId}) hat kein Schnittteil`);
    }
    if (!c.operations.some((op) => op.moduleId === m.id)) {
      fail('INV-05', `Modul ${m.id} (${m.typeId}) hat keine Operation`);
    }
  }

  // INV-06 & INV-07: Zuschnittplan überlappungsfrei & vollständig
  if (c.fabricPlan) {
    const rects = c.fabricPlan.pieces.map((x) => x.rect);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (rectsOverlap(rects[i]!, rects[j]!)) {
          fail('INV-06', `fabricPlan Überlappung zwischen ${c.fabricPlan.pieces[i]!.pieceId} und ${c.fabricPlan.pieces[j]!.pieceId}`);
        }
      }
    }
    const expectedFabricCount = c.pieces
      .filter((pc) => pc.kind === 'cut' && pc.material === 'fabric')
      .reduce((sum, pc) => sum + pc.count, 0);
    if (c.fabricPlan.pieces.length !== expectedFabricCount) {
      fail('INV-07', `fabricPlan hat ${c.fabricPlan.pieces.length} Teile, erwartet ${expectedFabricCount}`);
    }
  }

  // INV-08: Operations-DAG azyklisch, lückenlos 1..N, Abhängigkeiten strikt vor Nachfolgern, V-O-01/V-O-02
  const opIndex = new Map<string, number>();
  c.operations.forEach((op, idx) => {
    if (op.index !== idx + 1) fail('INV-08', `Operation ${op.id} hat Index ${op.index}, erwartet ${idx + 1}`);
    opIndex.set(op.id, idx);
  });
  for (const op of c.operations) {
    const myIdx = opIndex.get(op.id)!;
    for (const dep of op.dependsOn) {
      const depIdx = opIndex.get(dep);
      if (depIdx === undefined || depIdx >= myIdx) {
        fail('INV-08', `Operation ${op.id} hängt von ${dep} ab, Reihenfolge verletzt`);
      }
    }
  }
  const closeIdx = opIndex.get('op-close');
  const turnIdx = opIndex.get('op-turn');
  if (closeIdx !== undefined && turnIdx !== undefined && closeIdx >= turnIdx) {
    fail('INV-08', 'op-close muss vor op-turn liegen');
  }
  for (const op of c.operations) {
    const idx = opIndex.get(op.id)!;
    if ((op.kind === 'stitch-divider' || op.kind === 'insert-strap' || op.kind === 'install-zip' || op.kind === 'baste') && closeIdx !== undefined && idx >= closeIdx) {
      fail('INV-08', `V-O-01 verletzt: ${op.kind} (${op.id}) liegt nicht vor close-panel`);
    }
    if ((op.kind === 'attach-button' || op.kind === 'attach-snap') && turnIdx !== undefined && idx <= turnIdx) {
      fail('INV-08', `V-O-02 verletzt: ${op.kind} (${op.id}) liegt nicht nach turn`);
    }
  }

  // INV-09..12: Findings-Regeln R1, R2, R3 + Fix-Sicherheit
  for (const f of c.findings) {
    if (f.severity === 'error' && f.dismissible) {
      fail('INV-09', `R3 verletzt: Error ${f.ruleId} darf nicht dismissible sein`);
    }
    if ((f.severity === 'error' || f.severity === 'warn') && !f.fix) {
      fail('INV-10', `R1 verletzt: ${f.severity} ${f.ruleId} hat keinen Fix`);
    }
    const vals = Object.values(f.values);
    const hasFiniteNum = vals.some((v) => typeof v === 'number' && Number.isFinite(v));
    if (!hasFiniteNum) {
      fail('INV-11', `R2 verletzt: ${f.ruleId} enthält keine endliche Zahl in values`);
    }
    if (f.fix) {
      const fixed = applyFix(p, f.fix);
      if (fixed.updatedAt !== p.updatedAt) {
        fail('INV-12', `Fix ${f.fix.kind} hat updatedAt im Kern verändert`);
      }
    }
  }

  // INV-13 & INV-14: Zähler & Hartes Bewertungs-Gate konsistent
  const errCount = c.findings.filter((f) => f.severity === 'error').length;
  const warnCount = c.findings.filter((f) => f.severity === 'warn').length;
  if (c.metrics.errorCount !== errCount) fail('INV-14', `metrics.errorCount=${c.metrics.errorCount} !== ${errCount}`);
  if (c.metrics.warnCount !== warnCount) fail('INV-14', `metrics.warnCount=${c.metrics.warnCount} !== ${warnCount}`);
  if (errCount > 0) {
    if (c.evaluation.verdict !== 'blocked' || c.evaluation.grade !== 'F' || c.evaluation.score > 49) {
      fail('INV-13', `Hartes Gate verletzt bei ${errCount} Fehlern: verdict=${c.evaluation.verdict}, grade=${c.evaluation.grade}, score=${c.evaluation.score}`);
    }
  } else if (warnCount > 0) {
    if (c.evaluation.verdict !== 'caution' || c.evaluation.grade === 'A' || c.evaluation.grade === 'A+') {
      fail('INV-13', `Warn-Gate verletzt bei ${warnCount} Hinweisen: verdict=${c.evaluation.verdict}, grade=${c.evaluation.grade}`);
    }
  } else if (c.evaluation.verdict !== 'approved') {
    fail('INV-13', `0 Fehler / 0 Hinweise sollte approved sein, war ${c.evaluation.verdict}`);
  }

  // INV-15: Modulpositionen pro Seite respektieren Ränder und überlappen nicht innerhalb einer (row, side)
  const rightOrigin = p.base.widthMm + p.base.spineWidthMm;
  const bySlot = new Map<string, typeof c.modules[number][]>();
  for (const m of c.modules) {
    const minX = m.side === 'right' ? rightOrigin + PRACTICE.edgeMarginMm : PRACTICE.edgeMarginMm;
    if (m.rect.x < minX) {
      fail('INV-15', `Modul ${m.instanceId} beginnt links vom Rand (${m.rect.x} < ${minX})`);
    }
    const key = `${m.rowId}|${m.side}`;
    const arr = bySlot.get(key) ?? [];
    arr.push(m);
    bySlot.set(key, arr);
  }
  for (const [key, list] of bySlot) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (rectsOverlap(list[i]!.rect, list[j]!.rect)) {
          fail('INV-15', `Module in Slot ${key} überlappen sich: ${list[i]!.instanceId} & ${list[j]!.instanceId}`);
        }
      }
    }
  }

  // INV-16 & INV-17: Kein stiller Überlauf ohne harten Error
  const availW = p.base.widthMm - 2 * PRACTICE.edgeMarginMm;
  const availH = p.base.heightMm - 2 * PRACTICE.edgeMarginMm;
  for (const m of c.modules) {
    const maxX = m.side === 'right' ? rightOrigin + PRACTICE.edgeMarginMm + availW : PRACTICE.edgeMarginMm + availW;
    if (m.rect.x + m.rect.w > maxX + 0.5 && errCount === 0) {
      fail('INV-16', `Stiller Breitenüberlauf bei ${m.instanceId} ohne Error-Finding!`);
    }
    if (m.rect.y + m.rect.h > PRACTICE.edgeMarginMm + availH + 0.5 && errCount === 0) {
      fail('INV-17', `Stiller Höhenüberlauf bei ${m.instanceId} ohne Error-Finding!`);
    }
  }

  // INV-18: Materialien valide & Stoff/Futter/Garn stets estimated
  for (const mat of c.materials) {
    if (!Number.isFinite(mat.amount) || mat.amount <= 0) {
      fail('INV-18', `Ungültige Materialmenge bei ${mat.spec}: ${mat.amount}`);
    }
    if ((mat.kind === 'fabric' || mat.kind === 'lining' || mat.kind === 'thread') && mat.certainty !== 'estimated') {
      fail('INV-18', `Material ${mat.kind} muss certainty='estimated' sein`);
    }
  }

  return out;
}

export function assertConstructionInvariants(p: Project, c: Construction): void {
  const violations = checkConstructionInvariants(p, c);
  if (violations.length > 0) {
    const summary = violations.map((v) => `[${v.code}] ${v.message}`).join('\n');
    throw new Error(`Konstruktions-Invarianten verletzt (${violations.length}):\n${summary}`);
  }
}
