/** Einmal-Audit: keine offenen Platzhalter in dynamischen Texten (über ALLE Templates). */
import { describe, it, expect } from 'vitest';
import { TEMPLATES } from '../core/project';
import { construct } from '../core/construction';
import { t } from '../i18n/de';

describe('Platzhalter-Audit (global)', () => {
  for (const tpl of TEMPLATES) {
    it(`${tpl.id}: Befunde/Materialien/Operationen ohne offene Platzhalter`, () => {
      const c = construct(tpl.build());
      const leftovers: string[] = [];
      for (const f of c.findings) {
        const text = t(`rule.${f.ruleId}.detail`, f.values as Record<string, string | number | undefined>);
        if (text.includes('{')) leftovers.push(`rule.${f.ruleId}.detail :: ${text}`);
        const title = t(`rule.${f.ruleId}.title`, f.values as Record<string, string | number | undefined>);
        if (title.includes('{')) leftovers.push(`rule.${f.ruleId}.title :: ${title}`);
      }
      for (const m of c.materials) {
        const basis = t(m.basisKey, m.basisValues as Record<string, string | number | undefined>);
        if (basis.includes('{')) leftovers.push(`${m.basisKey} :: ${basis}`);
      }
      for (const op of c.operations) {
        const text = t(op.titleKey, op.values as Record<string, string | number | undefined>);
        if (text.includes('{')) leftovers.push(`${op.titleKey} :: ${text}`);
      }
      const missing: string[] = [];
      for (const f of c.findings) {
        const title = t(`rule.${f.ruleId}.title`);
        const detail = t(`rule.${f.ruleId}.detail`);
        if (title === `rule.${f.ruleId}.title`) missing.push(`rule.${f.ruleId}.title`);
        if (detail === `rule.${f.ruleId}.detail`) missing.push(`rule.${f.ruleId}.detail`);
      }
      for (const op of c.operations) {
        if (t(op.titleKey) === op.titleKey) missing.push(op.titleKey);
      }
      expect(missing).toEqual([]);
      expect(leftovers).toEqual([]);
    });
  }
});
