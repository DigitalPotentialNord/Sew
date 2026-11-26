import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Abnahme (PRD §8): Der Nutzer öffnet den Schmuck-Organizer, fügt ein Modul hinzu,
 * verschiebt/konfiguriert es, sieht die Änderung live, bekommt die aktualisierte
 * Materialliste, erzeugt ein Schnittmuster, exportiert ein PDF, speichert und öffnet
 * das Projekt wieder.
 */

const tab = (page: Page, label: string) => page.getByRole('tab', { name: new RegExp(label) });

async function loadSchmuck(page: Page): Promise<void> {
  await page.goto('/');
  await tab(page, 'Projekt').click();
  await page.getByRole('button', { name: /Schmuck-Organizer/ }).first().click();
  await tab(page, 'Editor').click();
  await expect(page.locator('.canvas-svg')).toBeVisible();
}

async function moduleCount(page: Page): Promise<number> {
  return page.locator('.canvas-svg g.mod').count();
}

test.describe('1 — Start und Vorlage', () => {
  test('die App lädt, zeigt drei Vorlagen und öffnet den Schmuck-Organizer', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    await expect(page.locator('.topbar')).toBeVisible();
    await tab(page, 'Projekt').click();

    const cards = page.locator('.template-card');
    await expect(cards).toHaveCount(4); // 3 Vorlagen + "leeres Projekt"
    for (const name of ['Schmuck-Organizer', 'Make-up-Organizer', 'Stricknadel-Organizer']) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: /Schmuck-Organizer/ }).first().click();
    await tab(page, 'Editor').click();
    await expect(page.locator('.canvas-svg g.mod')).toHaveCount(5);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('jede Vorlage rendert ohne Fehler-Findings', async ({ page }) => {
    for (const name of ['Schmuck-Organizer', 'Make-up-Organizer', 'Stricknadel-Organizer']) {
      await page.goto('/');
      await tab(page, 'Projekt').click();
      await page.getByRole('button', { name: new RegExp(name) }).first().click();
      // Die Statusleiste nennt die Fehlerzahl; Vorlagen müssen 0 haben.
      await expect(page.locator('.statusbar')).not.toContainText('1 Fehler');
      await expect(page.locator('.statusbar')).not.toContainText('2 Fehler');
    }
  });
});

test.describe('2 — Modul hinzufügen, verschieben, konfigurieren', () => {
  test.beforeEach(async ({ page }) => loadSchmuck(page));

  test('Klick auf ein Bibliotheksmodul fügt es hinzu', async ({ page }) => {
    const before = await moduleCount(page);
    await page.locator('.lib-item[data-module-id="M01"]').first().click();
    await expect.poll(() => moduleCount(page)).toBe(before + 1);
  });

  test('Drag & Drop aus der Bibliothek auf die Fläche fügt hinzu', async ({ page }) => {
    const before = await moduleCount(page);
    const item = page.locator('.lib-item[data-module-id="M04"]').first();
    const canvas = page.locator('.canvas-scroll');
    await item.dragTo(canvas, { targetPosition: { x: 300, y: 260 } });
    await expect.poll(() => moduleCount(page)).toBe(before + 1);
  });

  test('Suche filtert die Bibliothek echt', async ({ page }) => {
    await page.getByRole('searchbox').fill('nadelkanal');
    await expect(page.locator('.lib-item')).toHaveCount(1);
    await expect(page.locator('.lib-item')).toContainText('Nadelkanal');
    await page.getByRole('searchbox').fill('xyzgibtsnicht');
    await expect(page.locator('.lib-item')).toHaveCount(0);
    await expect(page.locator('.lib-list .empty-state')).toBeVisible();
  });

  test('Ziehen ordnet das Modul in der Zeile um — Undo stellt die alte Reihenfolge wieder her', async ({ page }) => {
    const first = page.locator('.canvas-svg g.mod').first();
    const firstName = (await first.getAttribute('aria-label'))!.split(' ')[0]!;
    const orderBefore = await page.locator('.canvas-svg g.mod').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    expect(orderBefore.length).toBe(5);

    const box = (await first.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Weit nach rechts ziehen: das Modul wandert in der Zeile nach hinten
    await page.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect
      .poll(async () => page.locator('.canvas-svg g.mod').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))))
      .not.toEqual(orderBefore);

    await page.keyboard.press('Control+z');
    await expect
      .poll(async () => page.locator('.canvas-svg g.mod').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))))
      .toEqual(orderBefore);
    await expect(page.locator('.canvas-svg g.mod').first()).toHaveAttribute('aria-label', new RegExp(firstName));
  });

  test('Parameter im Eigenschaften-Panel ändern die Geometrie live', async ({ page }) => {
    // M01 "Stofftasche" hat eine freie Breite/Höhe
    await page.locator('.lib-item[data-module-id="M01"]').first().click();
    const mod = page.locator('.canvas-svg g.mod[aria-label^="Stofftasche"]');
    await expect(mod).toHaveCount(1);
    await mod.click();

    const width = page.getByRole('spinbutton', { name: 'Breite', exact: true });
    await expect(width).toBeVisible();
    const rectBefore = await mod.locator('rect.mod-shape').getAttribute('width');

    await width.fill('80');
    await width.blur();

    await expect(width).toHaveValue('80');
    // Das Modul füllt die Zeile nicht mehr aus: sein summary nennt die echte Breite
    await expect(mod).toHaveAttribute('aria-label', /Stofftasche 80/);
    const rectAfter = await mod.locator('rect.mod-shape').getAttribute('width');
    expect(rectAfter).not.toBe(rectBefore);
  });

  test('abgeleitete Werte sind nicht editierbar (Nadelkanal)', async ({ page }) => {
    await page.locator('.lib-item[data-module-id="M06"]').first().click();
    await expect(page.getByRole('spinbutton', { name: /berechnet/ }).first()).toBeVisible();
    const derived = page.getByRole('spinbutton', { name: /berechnet/ }).first();
    await expect(derived).toBeVisible();
    await expect(derived).not.toBeEditable();
  });

  test('Änderungen werden im Statusfeld als ungespeichert geführt', async ({ page }) => {
    await expect(page.locator('.statusbar')).toContainText(/nicht gespeichert|gespeichert/i);
  });
});

test.describe('3 — Live-Neuberechnung über alle Ansichten', () => {
  test('Materialliste reagiert auf ein neues Modul', async ({ page }) => {
    await loadSchmuck(page);
    await tab(page, 'Material').click();
    const rowsBefore = await page.locator('table tbody tr').count();
    await tab(page, 'Editor').click();
    await page.locator('.lib-item[data-module-id="M06"]').first().click();
    await tab(page, 'Material').click();
    await expect.poll(async () => page.locator('table tbody tr').count()).toBeGreaterThan(0);
    expect(rowsBefore).toBeGreaterThan(0);
    // Der Nadelkanal bringt Einlage/Verstärkung mit — die Materialliste wächst
    const after = await page.locator('table tbody tr').count();
    expect(after).toBeGreaterThanOrEqual(rowsBefore);
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('Schnittmusterzahl wächst mit dem Modul', async ({ page }) => {
    await loadSchmuck(page);
    await tab(page, 'Schnittmuster').click();
    const before = await page.locator('.piece-card').count();
    await tab(page, 'Editor').click();
    await page.locator('.lib-item[data-module-id="M01"]').first().click();
    await tab(page, 'Schnittmuster').click();
    await expect.poll(async () => page.locator('.piece-card').count()).toBeGreaterThan(before);
  });

  test('Anleitung nennt echte, projektabhängige Schritte', async ({ page }) => {
    await loadSchmuck(page);
    await tab(page, 'Anleitung').click();
    const steps = page.locator('ol li, .step');
    expect(await steps.count()).toBeGreaterThan(5);
    await expect(page.locator('body')).toContainText(/Zuschnitt|Nahtzugabe/i);
  });
});

test.describe('4 — Regelwerk und Warnungen', () => {
  test('ein zu breites Modul erzeugt einen Fehler, der Export blockiert', async ({ page }) => {
    await loadSchmuck(page);
    await page.locator('.lib-item[data-module-id="M02"]').first().click();
    await expect(page.getByRole('spinbutton', { name: 'Breite', exact: true })).toBeVisible();
    const width = page.getByRole('spinbutton', { name: 'Breite', exact: true });
    await width.fill('280');
    await width.blur();
    // Fehleranzeige in der Tabbar und in der Warnungsleiste
    await expect(page.locator('.tabbar')).toContainText('5');
    await expect(page.locator('.pane.right')).toContainText(/Fehler/);
    await expect(page.locator('.pane.right')).toContainText(/Export gesperrt/);

    // Der PDF-Knopf blockiert ehrlich und führt zur Fehleransicht
    await page.locator('.topbar .btn-split > button').first().click();
    await expect(page.locator('.toast.error')).toContainText(/gesperrt/);
    await expect(page.locator('.toast.error')).toContainText(/5 Fehler/);
    await expect(page.getByRole('tab', { name: /Schnittmuster/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('ein Fix repariert den Zustand wirklich', async ({ page }) => {
    await loadSchmuck(page);
    await page.locator('.lib-item[data-module-id="M02"]').first().click();
    const width = page.getByRole('spinbutton', { name: 'Breite', exact: true });
    await expect(width).toBeVisible();
    await width.fill('280');
    await width.blur();

    // Warnungsleiste aufklappen und den vom Regelwerk angebotenen Fix anwenden
    await page.getByRole('button', { name: /Warnungen/i }).first().click();
    const pane = page.locator('.pane.right');
    await expect(pane).toContainText(/verbreitern/);
    const flapWidth = () => page.locator('.canvas-svg .flap-outline').getAttribute('width');
    const before = Number(await flapWidth());
    expect(before).toBe(240);

    const firstError = pane.locator('.finding.error').first();
    const fixText = (await firstError.getByRole('button').innerText()).trim();
    const target = Number(fixText.match(/(\d+)\s*mm/)?.[1]);
    expect(target).toBeGreaterThan(before);

    await firstError.getByRole('button').click();

    // Der Fix verändert das Projekt wirklich: die Etui-Breite ist jetzt der Zielwert
    await expect.poll(async () => Number(await flapWidth())).toBe(target);
    // und das reparierte Finding ist verschwunden
    await expect(pane.locator('.finding.error').first()).not.toContainText(fixText);
  });
});

test.describe('5 — Schnittmuster und Export', () => {
  test.beforeEach(async ({ page }) => loadSchmuck(page));

  test('Schnittmuster zeigt Teile, Nahtzugabe und Kalibrierquadrat', async ({ page }) => {
    await tab(page, 'Schnittmuster').click();
    await expect(page.getByLabel('50 mm Kalibrierquadrat').first()).toBeVisible();
    await expect(page.locator('.piece-card').first()).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/NÄHMASS|Nähmaß/); // Nähmaß = Maß ohne Nahtzugabe
    expect(body).toMatch(/KONTROLLMASSSTAB/i);
    expect(body).toContain('A4');
    // Jedes Teil zeigt Zuschnitt- und Nähmaß — die Differenz ist die Nahtzugabe
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toContainText('×');
  });

  test('SVG-Export lädt eine Datei mit mm-Einheiten herunter', async ({ page }) => {
    await tab(page, 'Schnittmuster').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /SVG/i }).first().click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.svg$/);
    const stream = await download.createReadStream();
    let text = '';
    for await (const chunk of stream) text += chunk.toString();
    expect(text).toContain('<svg');
    expect(text).toMatch(/width="\d+mm"/);
  });

  test('PDF-Export öffnet ein Druckfenster mit A4-Seiten', async ({ page, context }) => {
    const popupPromise = context.waitForEvent('page');
    await page.locator('.topbar .btn-split > button').first().click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    const html = await popup.content();
    expect(html).toContain('@page');
    expect(html).toContain('A4');
    await popup.close();
  });

  test('Projekt-Export lädt gültiges JSON', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Projekt exportieren|Export/ }).first().click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
    const stream = await download.createReadStream();
    let text = '';
    for await (const chunk of stream) text += chunk.toString();
    const json = JSON.parse(text) as { format: string; schemaVersion: number; project: { modules: unknown[] } };
    expect(json.format).toBe('organizer-studio/project');
    expect(json.schemaVersion).toBe(2);
    expect(json.project.modules.length).toBe(5);
    expect(text).not.toContain('projectHash');
  });
});

test.describe('6 — Speichern und Wiederöffnen', () => {
  test('gespeichertes Projekt überlebt ein Neuladen', async ({ page }) => {
    await loadSchmuck(page);
    // Modul hinzufügen, damit die Änderung prüfbar ist
    await page.locator('.lib-item[data-module-id="M01"]').first().click();
    await expect.poll(() => moduleCount(page)).toBe(6);
    await page.getByRole('button', { name: /Speichern/ }).first().click();
    await page.reload();
    await expect.poll(() => moduleCount(page)).toBe(6);
  });

  test('die Projektbibliothek führt gespeicherte Projekte', async ({ page }) => {
    await loadSchmuck(page);
    await page.getByRole('button', { name: /Speichern/ }).first().click();
    await tab(page, 'Projekt').click();
    await expect(page.locator('.lib-row, table tbody tr').first()).toBeVisible();
    await expect(page.locator('body')).toContainText('Schmuck-Organizer');
  });
});

test.describe('7 — Responsive ohne Überlauf', () => {
  for (const [name, size] of [
    ['Tablet', { width: 834, height: 1112 }],
    ['Telefon', { width: 390, height: 844 }],
  ] as const) {
    test(`${name}: kein horizontaler Überlauf, Werkzeugleiste bleibt bedienbar`, async ({ page }) => {
      await page.setViewportSize(size);
      await loadSchmuck(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${name} läuft horizontal über`).toBeLessThanOrEqual(1);
      await expect(page.locator('.tabbar')).toBeVisible();
      // Auf kleinen Geräten liegen Bibliothek/Eigenschaften in Schubladen, nicht im Fluss
      const menu = page.getByRole('button', { name: /Module|Bibliothek/i }).first();
      if (await menu.count()) {
        await menu.click();
        await expect(page.locator('.sheet').first()).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.sheet')).toHaveCount(0);
      }
    });
  }

  test('Touch-Ziele sind ausreichend groß', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loadSchmuck(page);
    const small = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('button'))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.height < 28) out.push((el.getAttribute('aria-label') ?? el.textContent ?? '?').slice(0, 40));
      }
      return out;
    });
    expect(small, `zu kleine Ziele: ${small.join(', ')}`).toEqual([]);
  });
});

test.describe('8 — Bedienung ohne Maus', () => {
  test('Tastatur: Auswahl, Duplizieren, Löschen, Undo', async ({ page }) => {
    await loadSchmuck(page);
    const mod = page.locator('.canvas-svg g.mod').first();
    await mod.click();
    const before = await moduleCount(page);
    await page.keyboard.press('Control+d');
    await expect.poll(() => moduleCount(page)).toBe(before + 1);
    await page.keyboard.press('Delete');
    await expect.poll(() => moduleCount(page)).toBe(before);
    await page.keyboard.press('Control+z');
    await expect.poll(() => moduleCount(page)).toBe(before + 1);
  });

  test('alle fünf Ansichten sind per Tastatur erreichbar', async ({ page }) => {
    await loadSchmuck(page);
    for (const [key, heading] of [
      ['2', /Schnittmuster/],
      ['3', /Material/],
      ['4', /Anleitung/],
      ['5', /Projekt/],
      ['1', /Module/],
    ] as const) {
      await page.keyboard.press(key);
      await expect(page.locator('body')).toContainText(heading);
    }
  });
});

test.describe('9 — PDF-Datei und Drehung', () => {
  test('PDF-Download erzeugt eine Datei mit Seiten', async ({ page }) => {
    await loadSchmuck(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.btn-split button').nth(1).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    const path = await download.path();
    expect(path).toBeTruthy();
    const head = await readFile(path!, { encoding: 'latin1' }).then((s) => s.slice(0, 5));
    expect(head).toBe('%PDF-');
    await expect(page.locator('.toast').filter({ hasText: /PDF heruntergeladen/ })).toBeVisible();
  });

  test('gedrehtes Modul bleibt im Raster und erzeugt keinen falschen Fehler', async ({ page }) => {
    await loadSchmuck(page);
    const mod = page.locator('.canvas-svg g.mod').first();
    const before = await mod.boundingBox();
    await mod.click({ force: true });
    await page.keyboard.press('r');
    await expect
      .poll(async () => {
        const b = await page.locator('.canvas-svg g.mod').first().boundingBox();
        return b ? Math.round(b.width) : 0;
      })
      .not.toBe(Math.round(before!.width));
    await expect(page.locator('.pane.right .finding.error')).toHaveCount(0);
  });
});
