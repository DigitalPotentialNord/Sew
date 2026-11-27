/** #16: Operations-Texte sind geometrisch/sachlich korrekt und vollständig belegt. */
import { describe, expect, it } from 'vitest';
import { MODULES, moduleDef } from '../core/modules';
import { buildTemplate } from '../core/project';
import { construct } from '../core/construction';
import { t } from '../i18n/de';
import type { LayoutContext } from '../core/types';
import { mm } from '../core/geometry';

const ctx: LayoutContext = {
  channelFreeMm: mm(400),
  panelWidthMm: mm(240),
  panelHeightMm: mm(300),
  rowHeightMm: mm(400),
  seamAllowanceMm: mm(10),
  fabricWidthMm: mm(1400),
};

describe('Operations-Texte — jeder Platzhalter ist belegt (Issue #16)', () => {
  it('alle Module: jeder t()-Platzhalter eines op.*-Textes ist mit Werten gefüllt', () => {
    for (const def of Object.values(MODULES)) {
      const params = { ...def.defaults };
      const ops = def.operations(params, ctx, 'test-id');
      for (const op of ops) {
        const raw = t(op.titleKey, op.values);
        // t() lässt fehlende Werte roh stehen — so finden wir Lücken zwischen Text und Modul
        const leftover = raw.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g);
        expect(leftover, `${def.id} / ${op.titleKey}: Platzhalter ohne Wert in „${raw}“`).toBeNull();
      }
    }
  });
});

describe('M06 — Trennnähte nur bei paare > 1 (Issue #16.1)', () => {
  const def = moduleDef('M06');
  it('paare = 1 erzeugt KEINE stitch-divider Operation', () => {
    const ops = def.operations({ paare: 1 }, ctx, 'id');
    expect(ops.some((o) => o.kind === 'stitch-divider')).toBe(false);
  });
  it('paare = 2 erzeugt genau eine stitch-divider mit Singular-Text', () => {
    const ops = def.operations({ paare: 2 }, ctx, 'id');
    const divider = ops.find((o) => o.kind === 'stitch-divider');
    expect(divider).toBeDefined();
    expect(divider!.titleKey).toBe('op.stitch-divider-one');
    expect(t(divider!.titleKey)).toContain('1 Trennnaht');
    expect(divider!.values.naehte).toBe(1);
  });
  it('paare = 3 erzeugt zwei Trennnähte (Plural-Text)', () => {
    const ops = def.operations({ paare: 3 }, ctx, 'id');
    const divider = ops.find((o) => o.kind === 'stitch-divider');
    expect(divider!.titleKey).toBe('op.stitch-dividers');
    expect(t(divider!.titleKey, divider!.values)).toContain('2 Trennnähte');
  });
});

describe('M16 — Scherenfach-Verstärkung auf halber Höhe (Issue #16.2)', () => {
  it('fuse-scissors nennt die Einlagenhöhe (laenge/2), nicht die volle Länge', () => {
    const def = moduleDef('M16');
    const ops = def.operations({ laenge: 180, breite: 60 }, ctx, 'id');
    const fuse = ops.find((o) => o.titleKey === 'op.fuse-scissors');
    expect(fuse!.values.hoehe).toBe(90);
    expect(t(fuse!.titleKey, fuse!.values)).toContain('90');
    expect(t(fuse!.titleKey, fuse!.values)).not.toContain('180');
  });
});

describe('M03 — Reißverschluss auf Öffnung + 20 mm (Issue #16.3)', () => {
  it('install-zip nennt dieselbe Länge wie der Materialplan', () => {
    const def = moduleDef('M03');
    const ops = def.operations({ breite: 160 }, ctx, 'id');
    const zip = ops.find((o) => o.titleKey === 'op.install-zip');
    expect(zip!.values.laenge).toBe(180);
    const materials = def.extraMaterials?.({ breite: 160 }, ctx) ?? [];
    const rv = materials.find((m) => m.spec.includes('rv'));
    expect(rv).toBeDefined();
    expect(rv!.basisValues?.oeffnung).toBe(160);
    expect(rv!.basisValues?.zugabe).toBe(20);
  });
});

describe('M04 — Träger hat zwei Enden (Issue #16.4)', () => {
  it('press-elastik-trage nennt 2 Enden, unabhängig von der Loop-Zahl', () => {
    const def = moduleDef('M04');
    for (const loops of [1, 6, 12]) {
      const ops = def.operations({ loops }, ctx, 'id');
      const press = ops.find((o) => o.titleKey === 'op.press-elastik-trage');
      expect(press!.values.enden).toBe(2);
      expect(t(press!.titleKey, press!.values)).not.toContain(String(loops));
    }
  });
});

describe('M02 — Unterkante nutzt den 10-mm-Umschlag, nicht die Fachhöhe (Issue #16.5)', () => {
  it('press-bottom nennt den Umschlag', () => {
    const def = moduleDef('M02');
    const ops = def.operations({ breite: 120, hoehe: 80, sections: 3 }, ctx, 'id');
    const press = ops.find((o) => o.titleKey === 'op.press-bottom');
    expect(press!.values.umschlag).toBe(10);
    expect(t(press!.titleKey, press!.values)).toContain('10');
    expect(t(press!.titleKey, press!.values)).not.toContain('80');
  });
  it('baste-pocket bekommt die Fachhöhe (Textplatzhalter hoehe)', () => {
    const def = moduleDef('M02');
    const ops = def.operations({ hoehe: 80 }, ctx, 'id');
    const baste = ops.find((o) => o.titleKey === 'op.baste-pocket');
    expect(baste!.values.hoehe).toBe(80);
    expect(t(baste!.titleKey, baste!.values)).toContain('80');
  });
});

describe('M12 — Beleg ist ein Streifen, keine Fächer (Issue #16.6)', () => {
  it('press-beleg nennt die Streifenbreite, nicht die Fächerzahl', () => {
    const def = moduleDef('M12');
    const ops = def.operations({ breite: 90, hoehe: 120, sections: 2 }, ctx, 'id');
    const press = ops.find((o) => o.titleKey === 'op.press-beleg');
    expect(press!.values.breite).toBe(90);
    expect(Object.keys(press!.values)).not.toContain('sections');
    expect(t(press!.titleKey, press!.values)).not.toMatch(/Fächer/);
  });
});

describe('M08 — Klapplasche-Text statt erfundener Überlappung', () => {
  it('attach-button-tab nennt die Laschenlänge', () => {
    const def = moduleDef('M08');
    const ops = def.operations({ laschenLaenge: 90 }, ctx, 'id');
    const op = ops.find((o) => o.titleKey === 'op.attach-button-tab');
    expect(op).toBeDefined();
    expect(op!.values.laenge).toBe(90);
    expect(t(op!.titleKey, op!.values)).toContain('90');
  });
});

describe('Vorlagen konstruieren mit konsistenten Op-Texten (Integration)', () => {
  it.each(['schmuck', 'makeup', 'strick'] as const)('Vorlage %s: kein op-Text mit offenem Platzhalter', (id) => {
    const c = construct(buildTemplate(id));
    for (const op of c.operations) {
      const rendered = t(op.titleKey, op.values);
      expect(rendered.match(/\{[a-zA-Z_]/), `${op.id} (${op.titleKey}): ${rendered}`).toBeNull();
    }
  });
});
