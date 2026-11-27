# Testabdeckung & Verifikation

Geprüfte Testdateien: `src/_tests/*.test.ts` (9 Dateien) und `tests/acceptance.spec.ts`.

---

## 1. Erweiterungen der Unit-, Property- und Regressionstests

| Datei | Tests | Neu abgedeckt |
| --- | --- | --- |
| `src/_tests/properties.test.ts` *(neu)* | **15** | `fast-check`-Invarianten (`P-01..P-18`, je 150–200 Läufe): Fehlerfreiheit, Hash-Determinismus, Fix-Pflicht, `netRect`-Grenzen bei Rotation, Stoffplan-Vollständigkeit, DAG-Azyklizität, Round-Trip + Grenzwerte für **alle 16 Module (M01–M16)** |
| `src/_tests/construction.test.ts` | **74** (+2) | `V-G-12` bei zu schmaler Stoffbreite, 60-Modul-Skalierungs- & DAG-Test (< 500 ms) |
| `src/_tests/pdf.test.ts` | **19** (+2) | 2D-Liang–Barsky-Segmentclipping (diagonal/außerhalb), mehrseitige Anleitungen (> 50 Schritte) |
| `src/_tests/export.test.ts` | **31** (+2) | `instructionsOnly: true` (ohne Cover/Material/Kacheln), `usableH = 250 mm` Kachelgrenze |
| `src/_tests/project.test.ts` | **51** (+2) | Prototype-Pollution-Abwehr (`__proto__`, `constructor`), Ablehnung von Schema > 2, `NaN`, negativen Werten, `count < 1` |
| `src/_tests/fixes.test.ts` | **12** (+1) | `setParam`-Feldgrenzenklemmung und Ignorieren gefährlicher Schlüssel |
| `src/_tests/store.test.ts` | **19** (+3) | `propsOpen === false` als Startzustand, `moveModule` inkl. Undo, `rotate` 0→90→180→270→0 |
| `src/_tests/geometry.test.ts` | **28** | unverändert grün |
| `src/_tests/i18n.test.ts` | **6** | unverändert grün |
| **Gesamt Vitest** | **255** | **9 / 9 Dateien bestanden** |

---

## 2. Erweiterungen der Playwright-E2E-Tests (`tests/acceptance.spec.ts`)

Insgesamt **39 / 39** bestandene E2E-Tests in Chromium:

- Korrigierter Drehtest (`M07` 35×45 → 45×35 bleibt fehlerfrei im Raster) plus neuer Test für echten Höhenüberlauf beim Drehen (`M09` 106×46 → 46×106 auf 200-mm-Panel) inklusive 1-Klick-Fix-Reparatur.
- Skaliergriff-Drag vor **und** nach `90°`-Drehung ohne Aufsummierungs-Multiplikation.
- Vollständige **Responsive-Matrix** (`390×844`, `430×844`, `768×1024`, `1024×1024`, `1440×900`, `1920×900`) über alle fünf Ansichten + mobile Eigenschaften-Schublade.
- Verifikation des reinen Anleitungsdrucks (`Anleitung drucken` erzeugt `.steps` ohne `.tilebody` / Kalibrierbox / Materialtabelle).
