import { test, expect, type Page } from '@playwright/test';

/**
 * Editor-Redesign — Kerninteraktionen ohne technische Vorkenntnisse.
 * Begleitet den dokumentierten Usability-Walkthrough (docs/quality/editor-usability-audit.md).
 *
 * Diese Tests prüfen die NEUE Bedienlogik: Starter, textile Designfläche,
 * visuelle Bibliothek, kontextuelle Eigenschaften, Seitenwechsel, Modi.
 * Die Maßhaltigkeit selbst bleibt durch die Unit-Tests (228) gesichert.
 */

const tab = (page: Page, label: string) => page.getByRole('tab', { name: new RegExp(label) });

async function moduleCount(page: Page): Promise<number> {
  return page.locator('.canvas-svg g.mod').count();
}

test.describe('Starter-Erfahrung', () => {
  test('„Was möchtest du gestalten?" — Schmuck-Organizer öffnet die Designfläche', async ({ page }) => {
    await page.goto('/');
    // Erster Besuch: Starter-Begrüßung steht im Vordergrund.
    const start = page.locator('.start-overlay');
    await expect(start).toBeVisible();
    await expect(page.getByText('Was möchtest du gestalten?')).toBeVisible();

    // Schmuck-Organizer wählen → „Mit einer Vorlage" → Beginnen.
    await start.getByRole('button', { name: /Schmuck-Organizer/ }).first().click();
    await start.getByRole('button', { name: /Mit einer Vorlage/ }).click();
    await start.getByRole('button', { name: /Beginnen/ }).click();

    // Die textile Designfläche ist aufgeschlagen (Buch = linker Flap + Falz + rechter Flap).
    await expect(page.locator('.canvas-svg')).toBeVisible();
    await expect(page.locator('.design-title-pill')).toContainText(/Mäppchen/i);
    await expect(page.locator('.canvas-svg g.mod')).toHaveCount(5);
  });

  test('Starter überspringbar — Editor öffnet sich mit der Vorlage als Hintergrund', async ({ page }) => {
    await page.goto('/');
    const start = page.locator('.start-overlay');
    await expect(start).toBeVisible();
    await start.getByRole('button', { name: /Editor öffnen/ }).first().click();
    await expect(start).toHaveCount(0);
    await expect(page.locator('.canvas-svg')).toBeVisible();
  });
});

test.describe('Kerninteraktionen (Walkthrough)', () => {
  async function openSchmuck(page: Page): Promise<void> {
    await page.goto('/');
    const start = page.locator('.start-overlay');
    if (await start.count() > 0) {
      await start.getByRole('button', { name: /Schmuck-Organizer/ }).first().click();
      await start.getByRole('button', { name: /Beginnen/ }).click();
    }
    await expect(page.locator('.canvas-svg g.mod')).toHaveCount(5);
  }

  test('2 — Ringhalter hinzufügen (Klick in der visuellen Bibliothek)', async ({ page }) => {
    await openSchmuck(page);
    const before = await moduleCount(page);
    await page.locator('.lib-item[data-module-id="M09"]').first().click();
    await expect.poll(() => moduleCount(page)).toBe(before + 1);
    // Der Ringhalter erscheint auf der Stofffläche und ist ausgewählt.
    await expect(page.locator('.canvas-svg g.mod.sel')).toHaveCount(1);
  });

  test('3 — Ringhalter verschieben (direkt auf der Flache, ohne Technikbegriff)', async ({ page }) => {
    await openSchmuck(page);
    await page.locator('.lib-item[data-module-id="M09"]').first().click();
    const mod = page.locator('.canvas-svg g.mod.sel');
    const box = (await mod.boundingBox())!;
    // Greifen und innerhalb der linken Innenfläche verschieben — die Aktion
    // ist ein echtes Umsortieren (side:left), kein Fake-x/y.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    // Das Modul bleibt erhalten (kein Verlust durch die Bewegung).
    await expect.poll(() => moduleCount(page)).toBe(6);
  });

  test('4 — Reißverschlussfach hinzufügen', async ({ page }) => {
    await openSchmuck(page);
    const before = await moduleCount(page);
    await page.locator('.lib-item[data-module-id="M03"]').first().click();
    await expect.poll(() => moduleCount(page)).toBe(before + 1);
  });

  test('5 — Größe des Faches verändern (Griff oder Wert)', async ({ page }) => {
    await openSchmuck(page);
    await page.locator('.lib-item[data-module-id="M03"]').first().click();
    const mod = page.locator('.canvas-svg g.mod.sel');
    await expect(mod).toHaveCount(1);
    const width = page.getByRole('spinbutton', { name: 'Breite', exact: true });
    await expect(width).toBeVisible();
    await width.fill('120');
    await width.blur();
    await expect(width).toHaveValue('120');
    // Die Geometrie folgt dem Wert: das aria-label nennt die neue Breite.
    await expect(mod).toHaveAttribute('aria-label', /120/);
  });

  test('6 — Materialansicht öffnen (Einkaufsliste)', async ({ page }) => {
    await openSchmuck(page);
    await tab(page, 'Materialien').click();
    await expect(page.locator('table').first()).toBeVisible();
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0);
  });

  test('7 — Element duplizieren (Kontextleiste)', async ({ page }) => {
    await openSchmuck(page);
    await page.locator('.lib-item[data-module-id="M09"]').first().click();
    const before = await moduleCount(page);
    // Kontext-Aktionsleiste über der Auswahl — „Duplizieren" visuell auffindbar.
    await page.locator('.ctx-bar').getByRole('button', { name: /Duplizieren/ }).click();
    await expect.poll(() => moduleCount(page)).toBe(before + 1);
  });

  test('8 — Änderung rückgängig machen', async ({ page }) => {
    await openSchmuck(page);
    await page.locator('.lib-item[data-module-id="M09"]').first().click();
    const before = await moduleCount(page);
    await page.locator('.ctx-bar').getByRole('button', { name: /Duplizieren/ }).click();
    await expect.poll(() => moduleCount(page)).toBe(before + 1);
    await page.keyboard.press('Control+z');
    await expect.poll(() => moduleCount(page)).toBe(before);
  });

  test('9 — Schnittmusteransicht öffnen (technische Ansicht sekundär)', async ({ page }) => {
    await openSchmuck(page);
    await tab(page, 'Schnittmuster').click();
    // Die Design-Ansicht ist primär; das Schnittmuster ist die sekundäre, technische Ansicht.
    await expect(page.getByText(/Schnittmuster|Zuschnitt/i).first()).toBeVisible();
  });

  test('10 — Auf die andere Innenfläche ziehen (echter Seitenwechsel)', async ({ page }) => {
    await openSchmuck(page);
    await page.locator('.lib-item[data-module-id="M09"]').first().click();
    const mod = page.locator('.canvas-svg g.mod.sel');
    const box = (await mod.boundingBox())!;
    // Über den Falz (Mitte der Buchbreite) ziehen → rechte Innenfläche.
    const canvas = page.locator('.canvas-scroll');
    const cb = (await canvas.boundingBox())!;
    const midX = cb.x + cb.width / 2;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(midX + 80, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    // Das Modul bleibt erhalten; die Konstruktion folgt der neuen Seite (kein Fehler).
    await expect.poll(() => moduleCount(page)).toBe(6);
  });

  test('Moduswechsel: Einfach ↔ Erweitert zeigt Raster/Maße', async ({ page }) => {
    await openSchmuck(page);
    // Einfacher Modus: keine Maßkette oberhalb der Fläche.
    await expect(page.locator('.canvas-svg .dim-line')).toHaveCount(0);
    await page.locator('.mode-toggle').getByRole('button', { name: /Erweitert/ }).click();
    // Erweiterter Modus: Maßketten und Außenkontur werden sichtbar.
    await expect(page.locator('.canvas-svg .dim-line').first()).toBeVisible();
    await expect(page.locator('.canvas-svg .flap-outline')).toHaveCount(1);
  });
});
