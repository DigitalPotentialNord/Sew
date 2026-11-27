# Verifikations-Protokoll (PR #23, Stand 2026-11-27)

Jede Aussage hier ist reproduzierbar. „OK“ heißt: ausgeführt UND bestanden —
nicht „sollte funktionieren“.

## Automatisiert (lokal, reproduzierbar)

| # | Was | Befehl | Ergebnis |
|---|---|---|---|
| 1 | Typcheck | `npm run typecheck` | 0 Fehler |
| 2 | Lint | `npm run lint` | 0 Fehler |
| 3 | Unit-Tests | `npm test` / `npx vitest run` | **370/370, 19 Dateien** |
| 4 | Produktionsbuild | `npm run build` | OK (~0,4 s) |
| 5 | Bundle-Budgets | `npm run size` | index 425,8/460 kB roh · 119,3/140 gzip; pdf 428,8/460 · 177,1/200 |
| 6 | Vollprüfung (1–3) | `npm run check` | Exit 0 |
| 7 | CI (2 Jobs) | GitHub Actions, PR #23 | Typecheck·Lint·Test·Build ✓ · Abnahmetests (Playwright) ✓ |

## Produktions-Bundle im echten DOM (jsdom, IIFE-Build des Live-Bundles)

Das Produktions-JS wurde als Single-File-IIFE gebaut und unter jsdom 25
ausgeführt (Polyfills für matchMedia/rAF/createObjectURL). Geprüfte Abläufe:

| Ablauf | Ergebnis |
|---|---|
| Start-Overlay erscheint, „Editor öffnen“ schließt es | OK |
| Schmuck-Vorlage lädt: 5 Module, Design-Titel | OK |
| Modul anklicken → Kontextleiste | OK |
| Bibliothek: M01/M02 hinzufügen, Selektion folgt | OK |
| Zahlfeld setzen (Breite 100/280, focusout-Commit) | OK |
| 90°-Drehung: Labels tauschen („Breite (90°)“/„Höhe (90°)“) | OK |
| Geänderter Wert multipliziert sich nicht (PR#9-Regressionsschutz) | OK |
| **Tabbar-Fehlerbadge == Panel-Fehlerzahl** in 3 Zuständen (0/0, 8/8, 7/7) | OK |
| Alle 3 Exportknöpfe (Druck/Download/SVG) bei Fehlern `disabled` + Sperrtitel | OK |
| Strg+Z / Strg+Y ohne Exceptions | OK |
| Escape / Badge-Klick → stabil | OK |
| **Text-Audit aller 5 Views**: keine `undefined`/`NaN`/`{`/`}`-Leaks | OK |
| Deutsche Formate sichtbar: `20,1 dm²`, `3,4`, Singular/Plural | OK |
| Anleitung: Phase „Zuschnitt“ vor „Vorbereitung“ (#20) | OK |
| Kein Verwerfen-Dialog nach normalen Flows | OK |

Hinweis „null“-Leak-Test: als Leak gewertet wurden nur `undefined`/`NaN`/Klammern;
„null“ ist bewusst deutsches UI-Copy („Fange bei null an“).

## Erzeugte Artefakte (tatsächlich geschrieben und geprüft)

| Artefakt | Pfad | Prüfung |
|---|---|---|
| PDF „schmuck“, 21 Seiten (A4), 19 138 B | /tmp/verify/schmuck.pdf | mit pdf-lib erneut geladen: 21 Seiten, Titel „Schmuck-Organizer“, Creator „Organizer Studio“, Seite 1 = 595×842 pt |
| SVG „schmuck“, 8 027 B, 1616×476 mm | /tmp/verify/schmuck.svg | XML wohlgeformt (ElementTree), 44 Schnittpfade, 12 Texte |
| Druck-HTML, 25 330 Zeichen, 22 Seiten | /tmp/verify/schmuck-print.html | `totalPages()` == `<section class="page">`-Zählung (per Test), kein `undefined`/`NaN` |
| Print-Pfad | — | Seitenzahl an Renderer per Test gekoppelt (export.test.ts) |

## Navigations-Smoke (curl/HTTP)

- `vite preview` (dist/): HTML + Assets 200, Bundle ohne `127.0.0.1`/`localhost`-Referenzen;
  Bundle ohne lokale Hosts; externe URLs nur Namensräume (w3.org), Schema-Metadaten
  (schema.org) sowie Dokumentations-Links (reactjs.org/json-schema.org, statisch).
- `npm audit --omit=dev`: **0 Schwachstellen**.

## Was (noch) nicht verifiziert ist

- **Kein visueller Pixel-/Layout-Check** (Chromium-Download aus dieser Sandbox blockiert;
  kein System-Chromium, kein libnss3). Kontextleiste/Overflow-Marker/Fold-Label sind
  statisch verifiziert (Quellen + CSS-Verträge + jsdom-Lauf ohne Exceptions), nicht
  gerendert gesehen.
- **E2E (Playwright) lief nur in CI**, nie lokal — dort grün (Stand `fec5973`).
- **jsdom ≠ echter Browser**: kein Layout, keine Paint-/Font-Metriken, keine Pointer-
  Gesten (Drag & Drop, Skaliergriffe) — nur Klicks, Tastatur und Commit-Pfade.
- Print-HTML/PDF sind artefakt-geprüft, aber **nicht gedruckt**; Maßhaltigkeit
  (Kalibrierfeld-Abmessung) ist Praxiswert.
- Hash-Änderung (#15): Golden-Hashes neu gesetzt, Semantik in PHASE-3 §2.4.
