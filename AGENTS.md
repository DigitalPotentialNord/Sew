# AGENTS.md

**Anleitung für KI-Assistenten, die in diesem Repository arbeiten.**

Dieses Dokument ist kein Marketing und keine Zusammenfassung — es ist die
Betriebsanleitung. Es sagt, was das Projekt ist, wo die Wahrheit liegt, welche
Regeln nicht verhandelbar sind, welche Fallen schon einmal Zeit gekostet haben
und wie man prüft, ob eine Änderung wirklich fertig ist.

Zuerst lesen: **Abschnitt 1 (Was ist das)**, **Abschnitt 3 (Regeln)**,
**Abschnitt 6 (Prüfen)**. Alles andere bei Bedarf.

---

## 0. Kurzfassung für Eilige

```bash
cd app
npm install
npm run dev                 # http://localhost:5173
npm run check               # typecheck + lint + 255 Unit-Tests  ← Pflicht vor „fertig“
PW_NO_SERVER=1 npx playwright test   # 45 Abnahmetests (Dev-Server muss laufen)
```

| Fakt | Wert |
| --- | --- |
| Was | Browser-Tool, das aus Modulen ein maßhaltiges Näh-Schnittmuster erzeugt |
| Stack | Vite 8 · React 18 · TypeScript 5.6 (strict) · Zustand 4 · Zod 4 · pdf-lib |
| Tests | Vitest (255) + Playwright (45) |
| Sprache | Oberfläche **deutsch**, Code-Bezeichner **deutsch** (Fachbegriffe) |
| Backend | keins. `localStorage` + Datei-Exporte |
| Kern | `app/src/core/`, reine Funktionen: `Project → Construction` |
| Status | Phase 3: lauffähiger Prototyp mit dokumentierten Lücken |
| Größte Gefahr | Eine Änderung, die ein *falsches* Schnittmuster erzeugt, ohne dass ein Test rot wird |

---

## 0.1 Dev-Server: warum `0.0.0.0` und `allowedHosts: true`

`vite.config.ts` bindet Dev- und Preview-Server bewusst an `0.0.0.0` mit
`allowedHosts: true`. Grund: die Arena-Live-Preview proxied den Server über
einen fremden Hostnamen — mit dem Vite-Default (nur `localhost` erlaubt)
antwortet der Server mit „Blocked request“. **Kehrseite:** im LAN ist der
Dev-Server für andere Geräte sichtbar. Wer das nicht will, startet lokal nur
mit eigenem Loopback:

```bash
npx vite --host 127.0.0.1 --port 5173
```

Produktion hängt davon nichts ab — die Seite ist statisch (GitHub Pages).

---

## 1. Was ist das Projekt?

Ein Näh-Etui („Organizer“) für Stricknadeln, Schmuck oder Make-up entsteht am
Bildschirm: Der Nutzer wählt eine Grundfläche und füllt Zeilen mit Modulen
(Nadelkanal, Reißverschlussfach, Elastikschlaufen …). Das Programm rechnet
daraus alles aus, was man zum Nähen braucht:

1. **Schnittteile** mit Nahtzugabe, Nähmaß, Fadenlauf, Einlage
2. **Materialmengen** (Stoff als Meterware, Reißverschluss in mm, Haken in Stück,
   Garn aus Nahtlänge × Faktor)
3. **Nähreihenfolge** als gerichteter Graph, topologisch sortiert
4. **Warnungen** nach Regelwerk V-G (global) und V-M (je Modul), mit Fix-Vorschlag
5. **Ausgabe**: A4-Kacheln im PDF, SVG, Druck-HTML — maßhaltig

**Der Wert liegt in der Maßhaltigkeit.** Ein Formularfehler kostet einen Klick;
ein Schnittmuster, das 5 mm zu klein ist, kostet Stoff, Zeit und Vertrauen.
Deshalb ist der Kern framework-frei, deterministisch und dicht getestet.

### Domänenvokabular (Deutsch → Bedeutung)

| Begriff | Bedeutung |
| --- | --- |
| Grundfläche / Panel | Das aufgeschlagene Etui, `base.widthMm × base.heightMm` |
| Bund (spine) | Falz zwischen Vorder- und Rückseite, `base.spineWidthMm` |
| Zeile (row) | Waagerechter Streifen der Innenfläche, enthält Module |
| Modul | Ein genähtes Element (Fach, Kanal, Halter), 16 Typen `M01…M16` |
| Nahtzugabe (NZ) | Zugabe um jedes Schnittteil, Standard 10 mm |
| Nähmaß (net) | Teil ohne NZ — das Maß, das am Ende sichtbar ist |
| Fadenlauf (grain) | Richtung im Stoff; Teile dürfen nicht beliebig gedreht werden |
| Kanalnutzung | Belegte Breite aller Zeilen ÷ verfügbare Breite, in % |
| Finding | Prüfergebnis (`ruleId`, `severity`, `values`, optional `fix`) |
| Flap | Das Rechteck der Grundfläche im Canvas-Koordinatensystem |

---

## 2. Landkarte

```
/home/user/
├── README.md                  ← Einstieg für Menschen
├── AGENTS.md                  ← dieses Dokument
├── docs/                      ← Phase-1/2-Spezifikation (Absicht, Markt, Architektur)
│   ├── product/               prd.md, module-library.md, mvp-scope.md, user-flows.md
│   ├── engineering/           system-architecture, geometry-engine, construction-rules,
│   │                          material-calculation, export-system, pattern-data-model,
│   │                          testing-strategy, README.md (Abweichungen)
│   ├── research/              Markt, Zielgruppen, decision-brief.md
│   ├── architecture-review.md 15 bindende Entscheidungen (K-01…M-15)
│   ├── PHASE-2.md             Architektur & Testplan
│   └── PHASE-3.md             IST-Zustand der Implementierung, Lücken, Abweichungen
└── app/
    ├── src/core/              ← DER KERN: kein React, kein DOM, keine Zeit, kein Zufall
    │   ├── types.ts           (222) Domänentypen
    │   ├── geometry.ts        (209) mm-Branded-Type, Rect-Mathe, FNV-Hash, SVG-Pfade
    │   ├── practice.ts        (43)  ALLE Praxiswerte + LIMITS
    │   ├── modules.ts         (1508) die 16 Module: Maße, Teile, Regeln, Prims, Texte
    │   ├── construction.ts    (957) Pipeline + Layout + Material + Operationen + Findings
    │   ├── fixes.ts           (60)  Fix-Anwendung
    │   ├── export.ts          (339) SVG, A4-Kachelung, Druck-HTML, Download
    │   ├── pdf.ts             (398) PDF via pdf-lib, eigenes Linien-Clipping
    │   └── project.ts         (408) Zod-Schema v2, Migration v1→v2, Storage, 3 Vorlagen
    ├── src/state/store.ts     (419) Zustand: project/past/future + session + toasts
    ├── src/ui/                React-Oberfläche (5 Ansichten, Canvas, Panels, primitives)
    ├── src/i18n/de.ts         (602 Zeilen, 535 Schlüssel) alle sichtbaren Strings
    ├── src/_tests/            9 Vitest-Dateien, 255 Tests (construction, project, store, geometry, fixes, i18n, export, pdf, properties)
    ├── tests/acceptance.spec.ts    33 Abnahme-Tests (Abnahmekriterien aus `docs/product/prd.md`)
    └── tests/editor-redesign.spec.ts  12 Editor-Redesign-Tests (Starter, Walkthrough, Seitenwechsel, Modi)
    └── docs-shots/            Screenshots des laufenden Editors + Beispiel-PDF
```

### Die Pipeline in `core/construction.ts`

```
construct(project)
  ├── layout()          Module in Zeilen platzieren, Prüfkontext bauen, V-G-* global
  ├── buildPieces()     je Modul PieceSpec[] → ComputedPiece[] (NZ, netRect, cutRect)
  ├── buildMaterials()  Teile + extraMaterials → MaterialLine[], fabricPlan (Shelf-Packing)
  ├── buildOperations() OpSpec[] → topologisch sortiert → SewingOperation[]
  ├── Findings          dedupliziert, nach severity/ruleId/values sortiert
  ├── projectHash       FNV-1a über die ABSICHT (base, rows, params, rotation, practice)
  └── metrics           moduleCount, cutPieceCount, channelFillPct, errorCount …
```

`Construction` ist unveränderlich und enthält **alles**, was die UI braucht. Die
UI rechnet nie selbst — sie liest.

---

## 3. Regeln, die nicht verhandelbar sind

Diese Regeln sind teuer gelernt. Wer sie bricht, bricht entweder Determinismus,
Testbarkeit oder die Maßhaltigkeit.

### 3.1 Der Kern bleibt rein

- `src/core/**` importiert **kein** React, kein `window`, kein `localStorage`,
  kein `Date.now()`, kein `Math.random()`.
- Zeitstempel setzt der **Store**, nicht der Kern (`applyFix` gibt `updatedAt`
  unverändert zurück — ein Test hält das fest).
- IDs sind nicht Teil des Hashes. Zwei gleiche Projekte mit verschiedenen IDs
  haben denselben `projectHash`.
- Ein `Finding` enthält **nur Zahlen und Strings** in `values` — niemals
  lokalisierten Text. Die Übersetzung passiert in `i18n/de.ts` über
  `t('rule.V-G-01.detail', values)`.
- `OpSpec.values` bleibt optional/weit (`number | string | undefined`).

### 3.2 Eine Wahrheit für Zahlen

- **Nahtzugabe** nur über `effectiveSeamAllowance(p)` bzw. `ctx.seamAllowanceMm`.
  Nie eine 10 hartkodieren.
- **Praxiswerte** (Nahtzugabe, Garnfaktor 3,4, Elastikreserve, Mindest-RV 80 mm …)
  stehen ausschließlich in `practice.ts`. Wer einen Wert ändert, ändert
  `PRACTICE.version` — der Hash und damit die Golden-Tests ändern sich dadurch
  bewusst.
- **Mengen** werden an genau einer Stelle formatiert: `formatAmount()` in
  `construction.ts` + Feld `display` je `MaterialLine`. Tabelle, Druck und PDF
  lesen `display`. Kein zweites `toFixed` in der UI.
- **Breitenbudget** einer Zeile: `base.widthMm − 2 × edgeMarginMm` (10 mm je Seite).
  Höhenbudget: `base.heightMm − 2 × edgeMarginMm`.

### 3.3 Typen und Branding

- `Mm` ist ein gebrandeter Typ (`number & {__mm}`). Rechnen mit `Mm` erzeugt
  `number`; der Rückweg ist `mm(x)`. In SVG-/Zahlen-Kontexten sind Casts
  (`mm(boxX)`) erlaubt und teils nötig — nicht „aufräumen“, ohne zu prüfen.
- `tsconfig` läuft mit `strict`, `noUnusedLocals`, `noUnusedParameters`,
  `noUncheckedIndexedAccess`. `any` ist per ESLint verboten.
- Neue Modultypen müssen in **zwei** Allowlists stehen: `ModuleTypeId` in
  `types.ts` und `moduleTypes` im Zod-Schema in `project.ts` — sonst schlägt
  jedes Laden fehl.

### 3.4 Was die UI nicht darf

- Kein `useMemo` im Zustand-Selector, keine Objekt-Rückgaben aus Selektoren
  (Endlosschleife/Instabilität). Selektoren liefern Primitive oder stabile
  Referenzen aus dem Store.
- Keine deutschen Strings in `core/`. Alles über `t('key')`.
- Kein `require()` (ESM, `isolatedModules`).
- Keine Rechnung in der UI duplizieren: Wenn eine Zahl fehlt, gehört sie in
  `Construction`.

### 3.5 Prüfungen, die Fehler sind

- `severity: 'error'` blockiert den Export — nicht wegklickbar.
  `severity: 'warn'` ist quittierbar (`session.dismissed`).
- Ein Fix, der den `projectHash` nicht ändert, wird **nicht** als Erfolg
  gemeldet (`applyFindingFix` prüft den Hash und tostet ehrlich).

---

## 4. Fallen (jede hat schon einmal Zeit gekostet)

### 4.1 Playwright

- **Pointer-Interception:** In dichten Vorlagen (z. B. `strick`) fängt ein
  benachbarter `rect.pocket-fill` den Klick ab; `locator.click()` läuft 30 s in
  den Timeout. Immer `click({ force: true })` bei `.canvas-svg g.mod`.
- **`r` (Drehen) braucht Fokus im Dokument.** Nach `click({force:true})` einmal
  `.canvas-svg` klicken, sonst kommt das globale Kürzel nicht an.
- **Nicht auf „hat sich verändert“ testen.** Der Auswahlrahmen um ein Modul ist
  nicht deckungsgleich mit dem belegten Rechteck; ein Test, der nur
  „Breite ≠ vorher“ prüft, war schon einmal ein Fehlalarm. Auf **Richtung**
  prüfen (quer → hochkant) oder auf echte Zahlen.
- **Selektoren, die es gibt:** `.canvas-svg g.mod[aria-label]`, `.flap-outline`,
  `.lib-item[data-module-id]`, `[role=tab]`, `[role=searchbox]`,
  `.pane.right .finding.error`, `.toast`, `.toast.error`,
  `.topbar .btn-split > button` (0 = Druck, 1 = PDF-Download, `.btn-split` =
  Gruppe), `[role=dialog].sheet`, `.template-card`.
- **Selektoren, die es NICHT gibt:** `.piece-card`, `.empty-state` außerhalb
  `.lib-list`, ein Modul mit Namen „Ringhalter“ als erstes `.mod`.
- **Toast-Texte sind mehrfach vorhanden** (z. B. „Vorlage geladen“ + „PDF
  heruntergeladen“). Mit `.filter({ hasText: … })` arbeiten, nicht mit
  `.locator('.toast')` allein (strict mode).
- `PW_NO_SERVER=1` überspringt den Webserver-Start; der Dev-Server muss dann
  selbst laufen. Ohne diese Variable startet Playwright `npm run dev` selbst.

### 4.2 Geometrie und Drehung

- Ein gedrehtes Modul belegt ein **getauschtes** Rechteck
  (`PlacedModule.rect`), wird aber **ungetauscht** in einem zentrierten Kasten
  gezeichnet (`drawW/drawH`, `boxX/boxY`). Wer das „vereinheitlicht“, macht die
  Innenbeschriftung unlesbar.
- Prüfkontext bei 90°/270°: `checkContext(p, drawWide, freeAlongRow, rowRoom)`
  mappt `channelFreeMm = rowRoom`, `rowHeightMm = base.widthMm − 20`.
  Vier falsche Varianten davor erzeugten Scheinmeldungen (V-M06-02).
- Ein Modul, das höher ist als seine Zeile, ist **V-G-14** — gemeldet, aber
  nicht automatisch umgelegt.
- Modulbeschriftung steht **außerhalb** der Drehgruppe und nur, wenn sie passt
  (`summary.length * 2.1 + 4 <= rect.w`), sonst bleibt nur das `aria-label`.

### 4.3 Zahlen, Einheiten, Material

- Flächenmaterial (Stoff/Futter/Vlies) wird als **Meterware** angezeigt
  (Meter = Fläche ÷ Stoffbreite × Verschnitt), nicht als m²-Zahl.
- Flächenmengen dürfen **nicht** auf ganze Zahlen gerundet werden — aus
  0,0049 m² würde 0. Längen in mm werden gerundet, Flächen nicht.
- Zeilen mit Menge 0 sind keine Materialzeile (sie werden gefiltert).
- `packFabric` ist Shelf-Packing mit Fadenlauf-Sperre und 22 % Verschnitt —
  bewusst kein optimales Nesting (dokumentierte Vereinfachung).

### 4.4 PDF

- pdf-lib kann **kein SVG einbetten** (`embedSvg` existiert nicht). Seiten
  werden direkt gezeichnet.
- Kein Clip-Pfad für Kacheln: Linien vorher zuschneiden (`clipSegment`,
  Liang–Barsky, achsenparallel). Clip-Operatoren verhalten sich je nach
  Betrachter unterschiedlich und sind nicht testbar.
- Standardfonts sind WinAnsi: `→ · × –` vorher durch `safe()` ersetzen, sonst
  verschwinden Zeichen.
- Text umbrechen mit `wrapText(text, widthPt, size)` (Helvetica-Breitentabelle).
  Ohne Umbruch läuft Text aus der Seite und wird abgeschnitten.

### 4.5 Scripted Edits (Python/sed auf TSX)

- Nach **jeder** skriptgestützten Änderung sofort `npx tsc --noEmit`. Ein
  `str.replace` hat schon einmal ein `useCallback`-Ende dupliziert (TS1128).
- Beim Ersetzen von JSX-Blöcken nach Zeilennummern arbeiten ist fragil —
  Marker-Text suchen, `assert old in s` einbauen, damit ein Fehlschlag laut ist.

---

## 5. Änderungsrezepte

### Ein Modul hinzufügen oder ändern

1. `src/core/modules.ts`: Objekt mit `id`, `nameKey`, `category`, `tags`,
   `defaults`, `fields`, `width/height`, `pieces`, `operations`, `validate`,
   `draw`, `summary`.
2. `src/core/types.ts`: `ModuleTypeId` erweitern.
3. `src/core/project.ts`: Allowlist `moduleTypes` erweitern (sonst lädt nichts).
4. `src/i18n/de.ts`: `mod.Mxx.name`, `.desc`, Feldlabels, `rule.V-Mxx-*.title/.detail`.
5. Prüfen: `npx vite-node` mit einer Sonde, die `construct()` auf einer Vorlage
   ausführt und `findings` zählt (Muster unter `/tmp/*.ts` in der Historie).
6. `npx vitest run` → Determinismus- und Vorlagen-Tests laufen lassen.

**Falle:** Modul-Defaults aus der Vorlage nicht glauben — nach jeder Änderung
mit einer Sonde nachmessen (`width()/height()` mit echtem Kontext).

### Eine Regel hinzufügen

1. `validate()` im Modul (V-M) oder `layout()`/`construct()` (V-G).
2. `values` **nur Zahlen/Strings**, `fix` optional und absolut (`toMm`, nicht
   Delta).
3. Titel + Detail in `i18n/de.ts` (`rule.V-…title`, `.detail`), Platzhalter in
   `{}` müssen zu `values` passen.
4. Unit-Test: Regel feuert genau dann, wenn sie soll — und **nicht** bei einer
   gedrehten Variante, wenn Drehung keine Rolle spielt.

### Das Schema ändern

`schemaVersion` in `construction.ts` erhöhen, `migrate()` in `project.ts`
ergänzen, Migrationstest in `src/_tests/project.test.ts`. Ändern sich dadurch
Hashes oder Maße: neue Referenzwerte in `README.md`, `AGENTS.md` und
`docs/PHASE-3.md` nachziehen und im Commit begründen.

### Die Oberfläche ändern

- Neue sichtbare Texte **nur** in `i18n/de.ts`.
- Neue Bedienelemente aus `ui/parts/primitives.tsx` verwenden
  (`Button`, `Collapsible`, `NumberField`, `Segmented`, `Switch`, `EmptyState`,
  `Sheet`, `Panel`) — nicht eigene Knöpfe bauen; Touch-Ziele und Fokus sind dort
  geregelt.
- Breakpoints: 1180 / 1000 / 720 px. Unter 1000 px werden die Seitenpanels zu
  Sheets; `document.scrollWidth − clientWidth` muss 0 bleiben (Test 7).

---

## 6. Prüfen — die Definition von „fertig“

Eine Änderung ist fertig, wenn **alle** Zeilen grün sind:

```bash
cd app
npx tsc --noEmit                     # 0 Fehler
npx eslint src                       # 0 Fehler
npx vitest run                       # 255 Tests, 9 Dateien
npm run dev &                        # Dev-Server für E2E
PW_NO_SERVER=1 npx playwright test   # 45 Tests
npm run build                        # Build OK
```

Zusätzlich bei Geometrie-, Material- oder Exportänderungen:

```bash
# Vorlagen müssen weiter 0 Fehler / 0 Warnungen haben
npx vite-node /tmp/<sonde>.ts        # baut TEMPLATES, ruft construct(), zählt findings
```

und bei sichtbaren Änderungen ein Screenshot (`docs-shots/`), damit die
Behauptung „sieht gut aus“ überprüfbar bleibt.

**Aktuelle Sollwerte** (nach einer Änderung hier aktualisieren):

| Prüfung | Soll |
| --- | --- |
| `tsc --noEmit` | 0 Fehler |
| `eslint src` | 0 Fehler |
| `vitest run` | 255 Tests / 9 Dateien |
| `playwright test` | 45 Tests |
| `npm run build` | OK, Editor-Chunk ≈ 430 kB |
| Vorlagen | je 0 Fehler / 0 Warnungen |
| Hashes (Referenz) | schmuck `6443f47e`, makeup `a712eb1e`, strick `1a7e23ff` |

Wenn ein Test rot ist, ist **der Test nicht das Problem**, bis das Gegenteil
bewiesen ist. Besonders bei Determinismus- und Vorlagen-Tests: erst die Ursache
suchen, dann den Erwartungswert anfassen — und die Änderung begründen.
Ändert sich ein Hash durch eine gewollte Geometrieänderung, gehören der neue
Wert und der Grund in den Commit und in `docs/PHASE-3.md`.

---

## 7. Abweichungen Spezifikation ↔ Code (nicht „reparieren“)

Die Modul-IDs in `docs/product/module-library.md` entsprechen **nicht** denen im
Code. Das ist bekannt, dokumentiert in `docs/PHASE-3.md` §3, und wird **nicht**
umbenannt (Bestanddaten, Tests, Hashes):

| Code | Bedeutung im Code | Bedeutung in der Spezifikation |
| --- | --- | --- |
| M03 | Reißverschlussfach | Nadelkanal |
| M06 | Nadelkanal | RV-Tasche |
| M07 | Befestigungslasche | Pinselhalter |
| M08 | Knopfverschluss | Werkzeughalter |
| M13 | Abdeckklappe | Knopf |
| M14 | Zubehörfach | Druckknopf |
| M15 | Maßbandhalter | Klett |
| M16 | Scherenhalter | Aufhänger |

Weitere bewusste Lücken (Stand Phase 3): V-G-11 nicht implementiert;
`M07/M08`-Randplatzierung genähert; gedrehte Module, die ihre Zeile überragen,
werden gemeldet statt umgelegt; `PatternView` nutzt `as Mm`-Casts; PDF-Anleitung
prüft nicht jede Zeile gegen den Seitenumbruch.

---

## 8. Umgang mit Anforderungen

- **Erst nachsehen, dann behaupten.** Ob eine Funktion existiert, steht im Code,
  nicht in `docs/` (die Spezifikation enthält auch Nicht-Gebautes, z. B.
  Rollenform und Expertenmodus).
- **Nichts stillschweigend abschwächen.** Wenn eine Anforderung nicht umsetzbar
  ist, wird sie als Lücke dokumentiert (`docs/PHASE-3.md` §4), nicht als erledigt
  verbucht.
- **Keine Platzhalter als Ergebnis.** Ein Knopf, der nichts tut, ein Fix, der
  nichts ändert, oder eine Zahl, die nur plausibel aussieht, sind schlimmer als
  eine fehlende Funktion.
- **Deutsch bleibt deutsch.** Neue sichtbare Texte auf Deutsch, Fachbegriffe
  korrekt (Nahtzugabe, Fadenlauf, Einschlag, Kanalnutzung). Keine englischen
  UI-Texte „weil es einfacher ist“.
- **Kommentare erklären Warum, nicht Was.** Der Code sagt, was passiert; im
  Kommentar steht, warum es so und nicht anders ist (siehe `practice.ts`,
  `pdf.ts`, `checkContext`).
