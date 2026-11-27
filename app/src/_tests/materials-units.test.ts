/** dm²-Kohärenz der Materialbasis — #22-Selbstprüfung: `flaeche` war 10× zu groß. */
import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '../core/project';
import { construct } from '../core/construction';

describe('Materialbasis: dm²-Anzeige', () => {
  for (const tpl of TEMPLATES) {
    it(`${tpl.id}: flaeche ≡ amount × 100 (m² → dm²)`, () => {
      const c = construct(tpl.build());
      for (const m of c.materials) {
        if (m.unit !== 'm2' || !m.basisValues || !('flaeche' in m.basisValues)) continue;
        const shown = Number(String(m.basisValues.flaeche).replace(',', '.'));
        const dm2 = m.amount * 100;
        expect(Math.abs(shown - dm2)).toBeLessThan(0.06);
      }
    });
  }
});
