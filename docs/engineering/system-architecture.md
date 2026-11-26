# Systemarchitektur

Stand: 26.11.2026 · Anforderungen: [`../product/prd.md`](../product/prd.md) · Überblick: [`../PHASE-2.md`](../PHASE-2.md)

---

## 1. Architekturprinzipien

| # | Prinzip | Durchsetzung |
|---|---|---|
| **A1** | **Die Konstruktion ist eine reine Funktion.** `construct(project) → Construction`. Kein Zustand, keine Zeit, kein Zufall, keine I/O | Funktionssignatur erzwingt es; Lint-Regel verbietet `Date`/`Math.random`/`fetch` im Kern |
| **A2** | **Abhängigkeiten zeigen nur nach innen.** UI → Application → Domain → Geometrie. Niemals umgekehrt | ESLint `no-restricted-imports` je Paketgrenze |
| **A3** | **Eine Geometriequelle.** Canvas-Rendering und Export lesen **dieselbe** Geometriestruktur | Export nimmt `Construction`, nicht `Project`; kein zweiter Rechenweg |
| **A4** | **Millimeter-Integer ist die einzige interne Einheit.** Konvertierung nur an den Rändern (Eingabe, Anzeige) | Zod `z.number().int()` im Domain-Modell; `unit` nur in UI-Typen |
| **A5** | **Alles Speicherbare ist validierbar.** Jeder persistierte Zustand hat ein Zod-Schema mit Version | Round-Trip-Test + Migrations-Test |
| **A6** | **Module sind Daten + reine Funktionen, keine Klassen mit Zustand.** Erweiterung = neue Datei in `modules/` | Modul-Registry, kein `switch` über Modultypen im Kern |
| **A7** | **Keine Netzwerkabhängigkeit im Betrieb.** Statisch auslieferbar, offline nach Erstaufruf | CI prüft auf externe URLs im Build |

---

## 2. Schichtenmodell

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│  L5  ADAPTER / IO          localStorage · URL-Fragment · Datei-Download        │
│      (dünn, austauschbar)  Clipboard · Druckdialog                            │
├───────────────────────────────────────────────────────────────────────────────┤
│  L4  UI                    React-Komponenten · SVG-Canvas · Panels · Sheets   │
│      (darf NICHT rechnen)  Touch-Gesten · A11y · i18n                         │
├───────────────────────────────────────────────────────────────────────────────┤
│  L3  APPLICATION           Store (Zustand) · Commands · Undo/Redo · Selektion │
│      (orchestriert)        Layout-Solver · Regel-Auswertung · Feedback-Zähler │
├───────────────────────────────────────────────────────────────────────────────┤
│  L2  DOMAIN                Project · Construction · Module Registry ·          │
│      (die Wahrheit)        Material-Modell · Operationen · Regeln             │
├───────────────────────────────────────────────────────────────────────────────┤
│  L1  GEOMETRY              Point · Vec · Rect · Path · Arc · Polygon ·         │
│      (reine Mathematik)    Offset · Boolean · Length · Clipper                │
└───────────────────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │  alles darüber ist ersetzbar,
                                   │  L1/L2 sind es nicht
```

**Die entscheidende Grenze:** **L1 und L2 kennen React nicht.** Ein Test kann
`construct(project)` aufrufen, ohne DOM, ohne Browser. Damit sind Golden-, Property- und
Headless-Tests überhaupt erst möglich (PRD FR-46).

---

## 3. Paketstruktur (ein Repo, klare Grenzen)

```text
/
├─ packages/
│  ├─ geometry/              L1 — reine Mathematik
│  │   src/{units,point,rect,path,arc,polygon,offset,boolean,length,rounding}.ts
│  │   tests/{golden,property,precision}/
│  │
│  ├─ domain/                L2 — Modelle, Module, Regeln, Material, Konstruktion
│  │   src/
│  │     project/            Zod-Schemata, Versionierung, Migrationen
│  │     modules/            M01…M05: je ein Ordner (definition, params, geometry,
│  │                         pieces, materials, operations, rules, golden/)
│  │     construction/       construct(), Pipeline, Layout-Solver, Operationsgraph
│  │     materials/          Materialbibliothek, Verbrauch, Zuschnittanordnung
│  │     rules/              Regel-Engine, typisierte Findings, Fixes
│  │
│  ├─ export/                L2.5 — liest Construction, erzeugt Artefakte
│  │   src/{svg,pdf,tiling,json,filename,layout-pages}.ts
│  │
│  └─ app/                   L3–L5 — React-Anwendung
│      src/
│        store/              Zustand, Commands, Undo/Redo
│        ui/                 Canvas, Bibliothek, Eigenschaften, Tabs, Sheets
│        platform/           adapters: storage, url-state, download, clipboard
│        i18n/               de, en
│        test-harness/       Instrumentierung (interaction_count, drop_off)
│
├─ docs/                     research/, product/, engineering/
└─ e2e/                      Playwright
```

### 3.1 Erlaubte Importrichtungen (CI-erzwungen)

```text
geometry   → (nichts)
domain     → geometry
export     → domain, geometry
app        → export, domain, geometry
e2e        → (nur öffentliche UI)
```

**Verboten (Build bricht):**

| Verstoß | Warum |
|---|---|
| `geometry` importiert `domain` | Geometrie muss für sich testbar bleiben |
| `domain` importiert `react` | Kern muss headless laufen (FR-46) |
| `domain` importiert `app` | Zyklen |
| `export` importiert `app` | Export muss ohne UI testbar sein |
| `domain` benutzt `Date`, `Math.random`, `fetch`, `localStorage` | Determinismus (P4) + Reinheit (A1) |

---

## 4. Datenfluss

Der gesamte Ablauf ist **eine Richtung**, ohne Seiteneffekte im Kern:

```text
  Nutzeraktion (L4)
        │
        ▼  Command (L3)  z. B. { type: 'module:setParam', moduleId, key, value }
  Project (L2, immutable, Zod-validiert)
        │
        ├──────────────▶ construct(project) ────  reine Funktion, L2
        │                        │
        │                        ├─▶ Construction
        │                        │      ├─ pieces[]     (Schnittteile mit NZ)
        │                        │      ├─ panels[]     (Trägerflächen + Kanäle)
        │                        │      ├─ modules[]    (platzierte Geometrie)
        │                        │      ├─ anchors[]    (Befestigungspunkte)
        │                        │      ├─ materials[]  (exakt | geschätzt)
        │                        │      ├─ operations[] (typisiert, geordnet)
        │                        │      └─ findings[]   (Regeln: info/warn/error)
        │                        │
        │                        ▼
        ├──────────────▶ SVG-Canvas (L4)  rendert panels + modules + anchors + Bemaßung
        │
        ├──────────────▶ Material-Panel (L4)  rendert materials
        ├──────────────▶ Warn-Panel (L4)      rendert findings + fixes
        ├──────────────▶ Anleitung-Panel (L4) rendert operations
        │
        └──────────────▶ export/* (L2.5)  liest Construction
                                 ├─ svg/document()
                                 ├─ pdf/document()
                                 ├─ tiling/pages()
                                 └─ json/project()      (liest Project, nicht Construction)
```

**Warum `construct()` alles auf einmal erzeugt (A3, PRD FR-43):** Weil sonst Material und
Schnittmuster aus zwei verschiedenen Rechenwegen stammen und auseinanderlaufen können. Genau
dieser Fehler ist der häufigste Grund, warum generierte Schnittmuster nicht zu ihrer
Materialliste passen — und er ist der schnellste Weg, Vertrauen zu verlieren (V2).

---

## 5. Das Bindungskonzept (Auflösung des Phase-1/Phase-2-Konflikts)

*(Ausführlich in [`../PHASE-2.md`](../PHASE-2.md) §3 — hier die technische Fassung.)*

### 5.1 Das Modell

```ts
type Binding =
  | { kind: 'channel'; panelId: PanelId; channelId: ChannelId }              // MVP — Position = Sequenz
  | { kind: 'slot';    panelId: PanelId; col: number; row: number }          // Stufe 3
  | { kind: 'free';    panelId: PanelId; x: Mm; y: Mm }                      // Stufe 3+
  | { kind: 'edge';    panelId: PanelId; edge: 'top'|'bottom'|'left'|'right'; offset: Mm }; // MVP (M05)
```

> **`offset` ist bei `channel` gestrichen** *(Architekturprüfung K-03)*. Die Ordnung lebt im
> `ChannelSpec.modules[]`-Array (`pattern-data-model.md` §2.3); ein zusätzliches `offset` wäre
> eine **zweite Wahrheit**, die beim Umsortieren (F8) veraltet. Positionen im Kanal werden
> **abgeleitet, nie gespeichert** (P3). Bei `edge` bleibt `offset`, weil dort keine Sequenz
> existiert — an einer Kante ist der Abstand die einzige Ortsangabe.

### 5.2 Warum drei Varianten und nicht eine

| Ansatz | Problem |
|---|---|
| Nur `free` (echter Canvas) | braucht Solver, Kollision, Freiform-Offset → Phase 1: 9/10 Aufwand, niedrige Nachfrage |
| Nur `channel` (jetzt) | **nicht erweiterbar** — jede spätere Freiheit wäre ein Modellbruch |
| **Union mit `kind`** | MVP implementiert 2 von 4, die anderen sind **typseitig vorgesehen** und lösen beim Versuch eine klare Fehlermeldung aus (PRD FR-31) |

### 5.3 Wie der Solver je Bindungsart arbeitet

```ts
interface BindingSolver<K extends Binding['kind']> {
  kind: K;
  place(module: ModuleInstance, ctx: PanelContextFor<K>): PlacedModule | PlaceError;
  validate(placed: PlacedModule, ctx: PanelContextFor<K>): Finding[];
}

// Der Kontext ist ein SUMMENTYP — nicht eine Kanalstruktur mit Umwegen.
// (Architekturprüfung K-03: ohne diesen Typ war der Erweiterbarkeitsbeweis zirkulär.)
type PanelContext =
  | { kind: 'channel'; panelId: PanelId; channelId: ChannelId;
      lengthMm: Mm; used: readonly PlacedModule[] }
  | { kind: 'grid';    panelId: PanelId; cols: number; rows: number;
      cell: Size; occupied: readonly CellRef[] }
  | { kind: 'plane';   panelId: PanelId; bounds: Rect; placed: readonly PlacedModule[] };

type PanelContextFor<K extends Binding['kind']> =
  K extends 'channel' | 'edge' ? Extract<PanelContext, { kind: 'channel' }>
  : K extends 'slot'          ? Extract<PanelContext, { kind: 'grid' }>
  :                             Extract<PanelContext, { kind: 'plane' }>;
```

**`construct()` baut nur den Kontext, den die vorhandenen Bindungen brauchen.** Kein Vorab-Aufbau
toter Strukturen — das wäre die Überkonstruktion, die diese Architektur vermeiden will.

- **`channel` (MVP):** `place` weist dem Modul eine **Sequenzposition** im Kanal zu; die Breite
  folgt aus `params`; x/y werden aus der Sequenz **abgeleitet** (links beginnend, Anlagekante
  aus `attach`). **Kollisionen sind *innerhalb eines Kanals* strukturell unmöglich**, weil die
  Sequenz lückenlos ist: Summe der Breiten ≤ Kanallänge ist die einzige Bedingung.
  **Zwischen** Kanälen desselben Panels sind Überlappungen möglich (Fächer unten, Nadeln oben) —
  dafür gibt es `V-G-13` (`construction-rules.md` §4.1).
- **`slot` (Stufe 3):** Rasterzellen; Belegung als Bitmap; Kollision = Zelle doppelt belegt.
- **`free` (Stufe 3+):** echte 2D-Kollision (Polygon-Überlappung) + Offset an Freiform.

**Der Erweiterungspfad ist damit nicht „hoffentlich", sondern typseitig vorbereitet** — und der
Test `TEST-SLOT` (module-library.md §5.2) beweist ihn ab Tag 1. Zwei Präzisierungen, die
notwendig sind, damit der Test nicht zur Selbsttäuschung wird:

1. `TEST-SLOT` bezieht den **`grid`-Kontext aus `construct()`** — er baut ihn nicht selbst.
2. `TEST-SLOT` **muss fehlschlagen**, wenn `{ kind: 'grid' }` aus `PanelContext` entfernt wird.
   Ein Erweiterungstest, der nicht rot werden kann, ist kein Test.

**Und die ehrliche Einordnung:** `slot` und `free` sind eine **Option, keine Zusage.** Wenn M10
(Ohrringhalter) in Stufe 2 nicht kommt, wird die Union auf die implementierten Varianten
zurückgebaut. Das ist kein Scheitern, sondern Aufräumen.

### 5.4 Warum `channel` kein Kompromiss, sondern eine Designentscheidung ist

Ein Modul in einem Organizer ist **kein freies Objekt**. Es ist an eine Fläche gebunden, hat eine
Naht zur Fläche und eine Tiefe. Ein Objekt, das „irgendwo" liegt, ist keine nähbare Konstruktion,
sondern eine Zeichnung. Das Kanalmodell ist damit **näher an der Nährealität** als freies
Platzieren — es ist nicht die einfachere, sondern die **richtigere** Abstraktion. Freiheit, die
zu nicht-nähbaren Ergebnissen führt, ist keine Freiheit (PRD P2).

---

## 6. Zustandsverwaltung

### 6.1 Zwei Zustände, klar getrennt

| Zustand | Wo | Warum getrennt |
|---|---|---|
| **`Project`** (Domäne) | Store, serialisierbar | Die einzige Wahrheit; alles andere ist abgeleitet (P3) |
| **`Session`** (UI) | Store, **nicht** serialisiert | Selektion, Zoom, aktiver Tab, Sheet-Höhe, offene Popover |

**Regel:** `Project` wird **nie** von UI-Zustand beeinflusst. `Session` wird **nie** exportiert.
Ein Export mit Zoom-Stufe darin wäre ein Bug.

### 6.2 Abgeleiteter Zustand

`Construction` wird **nicht gespeichert**, sondern berechnet — aber **memoisiert** über einen
strukturellen Hash des Projekts:

```ts
const construction = useMemo(() => construct(project), [hashProject(project)]);
```

**Warum Memoisierung über Hash und nicht über Objektreferenz:** Bei Undo/Redo entstehen neue
Objekte mit identischem Inhalt; ohne Hash würde neu gerechnet (NFR-03 gefährdet). Der Hash ist
stabil und deterministisch (P4).

### 6.3 Undo/Redo

**Command-Muster mit Snapshots** (nicht Inverse-Commands):

- Jeder Command erzeugt ein neues unveränderliches `Project`.
- Der Verlauf hält die letzten **50** Projekte (PRD FR-26).
- Ein Projekt mit 20 Modulen ist wenige Kilobyte — Snapshots sind billiger und **fehlerfreier**
  als Inverse-Operationen (kein „Undo hat einen Randfall vergessen").
- **Konsequenz:** Undo ist garantiert korrekt, weil es keinen eigenen Code hat.

---

## 7. Technologieentscheidung

### 7.1 Anforderungen an die Technologie (aus dem Produkt abgeleitet)

| # | Anforderung | Quelle |
|---|---|---|
| T1 | Millimetergenaue Vektorgeometrie mit glatten Kurven und präzisen Offsets | Nahtzugaben, Rundungen |
| T2 | Ausgabe **identischer** Geometrie an Bildschirm und Druck | NFR-13, Abnahme Q2 |
| T3 | Deterministische Ausgabe über Browser hinweg | NFR-13 |
| T4 | Touch-Gesten und präzise Drag-Interaktion | PRD §6 |
| T5 | Offline, kein Backend, kleine Bundle-Größe | NFR-05, NFR-06 |
| T6 | Vollständige Testbarkeit des Kerns ohne DOM | FR-46 |
| T7 | A11y: alle Editor-Aktionen per Tastatur | NFR-09 |

### 7.2 Die geprüften Optionen

#### Framework / Rendering

| Option | Bewertung | Entscheidung |
|---|---|---|
| **Next.js (App Router)** | Bringt SSR, Routing, Server-Routen, Bildoptimierung. **Davon brauchen wir: nichts.** Kosten: größerer Bundle, Server-Annahmen im Kopf, `'use client'`-Grenzen, RSC-Fallstricke, kompliziertere statische Auslieferung | ❌ **abgelehnt** |
| **Vite + React + TS** | Minimal, extrem schnell, statisch auslieferbar, keine Server-Annahmen, vollständige Kontrolle über Rendering | ✅ **angenommen** |
| Svelte/SvelteKit | Technisch sehr geeignet, kleineres Bundle. Aber: Team-Skills laut Briefing React; kleinere Ökosystembasis für DnD-Testing | ❌ (Team-Risiko) |
| Vue/Nuxt | gleichwertig, gleiche Begründung | ❌ |
| Solid | sehr gut für feine Reaktivität, aber kleineres Ökosystem | ❌ (Risiko) |

> **Die Begründung ist nicht „Vite ist moderner", sondern: dieses Produkt hat keinen Server.**
> Next.js wäre eine Architektur für ein Problem, das wir nicht haben — und Phase 1 hat
> festgehalten, dass der Betrieb ohne Backend ein **Kostenvorteil und ein Datenschutzversprechen**
> ist (`business-model.md` §7). **Rückfalloption:** Sollte SEO-SSR für Landingpages nötig werden,
> wird die *Landingpage* separat statisch generiert — nicht die App.

#### Canvas-Rendering

| Option | Bewertung | Entscheidung |
|---|---|---|
| **SVG (React rendert DOM-SVG)** | Vektorgenau, **identisch mit dem Export**, per CSS/`data-`Attribute adressierbar, **per Tastatur und Screenreader zugänglich**, keine zweite Geometriequelle. Skaliert bis ~1.000 Elemente problemlos (MVP: < 200) | ✅ **angenommen** |
| Canvas2D | Schneller bei vielen Elementen, aber: **zweite Renderpipeline** (A3 verletzt), keine A11y, Text/Fonts problematisch für mm-Präzision, Hit-Testing selbst zu bauen | ❌ |
| WebGL / PixiJS | Overkill; Text- und Linienpräzision schlechter; harte A11y-Grenze | ❌ |
| Konva / Fabric.js | Bequeme Objekt-Canvas-Layer, aber Canvas-basiert (s. o.) und zusätzliche Abstraktion über einem Modell, das wir selbst besitzen | ❌ |

**Der ausschlaggebende Punkt:** Nur SVG erfüllt **T2** (gleiche Geometrie für Bildschirm und
Export) und **T7** (A11y) gleichzeitig. Ein Canvas-basierter Editor wäre schneller zu bauen und
schlechter im Ergebnis.

#### Geometrie-Bibliotheken

| Option | Bewertung | Entscheidung |
|---|---|---|
| **Eigenes mm-Modul** | Wir brauchen ~6 Primitive (Point, Rect, Path, Arc, Polygon, Offset) und eine Offset-Berechnung. Volle Kontrolle über Rundung und Determinismus | ✅ **Kern selbst** |
| `paper.js` | Mächtig (Boolean, Offset), aber: eigene Koordinaten-/Einheitenlogik, **nicht baumfreundlich**, DOM-/Canvas-Nähe, Ergebnisse schwer deterministisch zu pinnen | ❌ |
| `flatten-js` | Gute Polygon-Booleans, präzise; aber eigene Typphilosophie und Fließkomma-Verhalten, das wir nicht kontrollieren | ❌ (prüfen für Stufe 3) |
| `polygon-clipping` / `martinez` | Nur Booleans, kein Offset; als **gezielte** Abhängigkeit für `slot`/`free` denkbar | 🟡 **Stufe 3** |
| `svg-path-properties` | Pfadlänge (brauchen wir für RV-Länge, M06) – klein, prüfbar, aber Fließkomma | 🟡 als geprüfte, gekapselte Abhängigkeit |
| `earcut` | Triangulierung — brauchen wir nicht | ❌ |

> **Ehrliche Risikoeinschätzung [A]:** Ein Offset-Polygon (Nahtzugabe an einer beliebigen Form) ist
> **nicht trivial**. Im MVP hilft die Geometrie: alle MVP-Teile sind **Rechtecke** — Offset =
> Rechteck um `nz` vergrößern. Das ist ein Einzeiler und exakt.
> **Erst M06 (Rißverschluss an Rundungen) braucht echtes Offset an Kurven.** Deshalb ist die
> Geometrie-Bibliotheksfrage für Stufe 2 bewusst offen — und nicht im MVP gelöst. Ein
> vorschneller Offset-Algorithmus wäre der klassische Fall von Überkomplexität.

#### PDF-Erzeugung

| Option | Bewertung | Entscheidung |
|---|---|---|
| **SVG → `window.print()`** | Null Abhängigkeit, Browser druckt vektoriell, perfekte mm-Kontrolle über CSS `@page` + `mm`-Einheiten. **Nachteil:** Nutzer muss „100 %" wählen — deshalb Kalibrierquadrat | ✅ **Primär** |
| `pdf-lib` | Programmatisches PDF im Browser, volle Kontrolle, kein Druckdialog, **deterministische Bytes**. Aber: eigene Zeichenlogik, Fonts müssen eingebettet werden | ✅ **Sekundär/Alternative** |
| `jsPDF` | Verbreitet, aber Koordinaten in pt/mm mit eigenen Rundungen, Font-Handling unangenehm | ❌ |
| Server-PDF (Puppeteer) | Widerspricht „kein Backend" (A7), Kosten, Latenz | ❌ |
| `@react-pdf/renderer` | Deklarativ, aber **zweite Layout-Engine** neben SVG → A3 verletzt | ❌ |

> **Empfehlung: beide** — SVG-Druck als Standard (billig, vektoriell, druckdialog-vertraut) und
> `pdf-lib` als „Sofort-Download"-Pfad, wenn der In-App-Browser keinen Druckdialog hat (PRD F15).
> Die Entscheidung, welcher Pfad primär ist, gehört in Phase 3 nach einem Prototyp in Woche 6.

#### Validierung, Tests

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Schemata | **Zod** | Ein Schema für Persistenz, Migration, Grenzen, Fehlermeldungen; deutsche Fehlertexte möglich (UX-05) |
| Unit/Golden | **Vitest** | Schnell, TS-nativ, Snapshot-fähig |
| Property | **fast-check** | PRD Q1 (10.000 Zufallskonfigurationen) braucht es zwingend |
| E2E | **Playwright** | Touch-Emulation, PDF-Download-Prüfung, Multi-Browser-Matrix (NFR-13), Offline, A11y |
| A11y | **axe-core** via Playwright | NFR-10 |

#### Zustand, Styling, i18n

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Store | **Zustand** | Klein, kein Provider-Ballast, perfekt für „ein Projekt + Session" |
| Styling | **Tailwind** | Schnell, konsistent, aber: Design-Tokens (Farben, Abstände, **Touch-Ziele ≥ 44 px**) als zentrale Konstanten, nicht als Streu-Tailwind |
| i18n | **eigenes schlankes Wörterbuch** (kein i18next) | Zwei Sprachen, ~300 Strings, kein Plural-/Interpolationsbedarf darüber hinaus; i18next wäre eine Abhängigkeit ohne Gegenwert |
| DnD | **eigenes Pointer-Event-Modell** | Bibliotheken (dnd-kit, react-beautiful-dnd) sind für **Listen** gebaut; unser Modell ist „in einen Kanal einfügen" mit Snap und Konflikt mit Scrollen. Eigene ~150 Zeilen sind kontrollierbarer als das Umbiegen einer Listenbibliothek. **Alternative:** `dnd-kit` als Rückfall, wenn Touch-Konflikte in Woche 5 nicht lösbar sind |
| Zahlen-Eingabe | eigenes `MmInput` | Tolerante Eingabe („12,5", „12.5cm", inch), Stepper, Klemmung, Einheiten — keine Bibliothek macht das richtig für mm |

### 7.3 Endgültiger Stack

```text
Runtime      Browser (ES2022), kein Server
Build        Vite 5+ · TypeScript 5.x strict
UI           React 18 · Tailwind CSS · eigenes SVG-Canvas · eigenes Pointer-Modell
Domain       TypeScript, rein, ohne Framework
Geometrie    eigenes Paket (mm-Integer), keine Abhängigkeit im MVP
Validierung  Zod 3
Persistenz   localStorage (+ URL-Fragment für Teilen)
Export       SVG (nativ) · PDF (SVG-Druck primär, pdf-lib sekundär) · JSON
Tests        Vitest · fast-check · Playwright · axe-core
Lint/Gates   ESLint (Importgrenzen, keine Seiteneffekte im Kern) · tsc --noEmit
Auslieferung statisch (S3/Netlify/Cloudflare Pages, kein Node nötig)
```

### 7.4 Abweichungen vom Briefing — begründet

| Briefing | Entscheidung | Begründung |
|---|---|---|
| **Next.js** | **Vite + React** | Kein Server, kein SSR, kein Routing-Bedarf. Next.js bringt Komplexität ohne Gegenwert und erschwert statische Auslieferung (T5, A7). **Rückfalloption dokumentiert** |
| React, TypeScript, Tailwind, SVG, Zod, Vitest, Playwright | **bestätigt** | Alle sieben halten der Prüfung stand (s. o.) |

**Das ist die einzige Abweichung — und sie ist begründet, nicht modisch.**

---

## 8. Fehlerbehandlung und Resilienz

| Fehlerklasse | Strategie |
|---|---|
| **Ungültige Nutzereingabe** | Zod + UI-Klemmung; niemals ein Zustand „ungültig" im Store |
| **Ungültiges gespeichertes Projekt** | Migrationskette; schlägt sie fehl → Rohdaten-Download anbieten, Beispiel laden (F14) |
| **Konstruktionsfehler** (unerwartete Ausnahme in `construct`) | Gefangen in der Application-Schicht; UI zeigt „Die Berechnung ist fehlgeschlagen" + `[Projekt herunterladen]` + Fehler-ID (Hash des Projekts). **Nie ein weißer Screen** (NFR-14) |
| **Geometrie-Invariante verletzt** (z. B. negative Breite) | Property-Test im CI; zur Laufzeit `assert` im Dev-Build, im Prod-Build defensiv (Modul wird als „nicht berechenbar" markiert, Rest läuft weiter) |
| **localStorage voll / gesperrt** | Läuft ohne Persistenz, einmaliger Hinweis |
| **Export schlägt fehl** | Fallback-Kette: PDF → SVG → Maßliste zum Kopieren. Immer ein Ausweg |

**Prinzip:** Der Nutzer verliert **nie** seine Arbeit ohne einen Weg, sie zu retten.

---

## 9. Performance-Strategie

| Hebel | Maßnahme |
|---|---|
| **Konstruktion** | Memoisierung über Projekt-Hash; inkrementelle Wiederverwendung je Modul (Modul-Hash → gecachtes Modulergebnis) |
| **Rendering** | SVG-DOM, nur geänderte Module re-rendern (React-Key = Modul-ID + Modul-Hash) |
| **Drag** | Während des Ziehens **keine** Neuberechnung der Konstruktion — nur Transform-Update. Neuberechnung erst bei Drop (NFR-02) |
| **Bundle** | Kein Framework-Overhead; PDF-Bibliothek **dynamisch** geladen (nur bei Export) |
| **Erststart** | Beispielprojekt mitgeliefert (statisch), nicht berechnet |

---

## 10. Sicherheit und Datenschutz (durch Architektur)

| Aspekt | Umsetzung |
|---|---|
| Keine Konten | keine Auth, keine Sessions, keine Tokens |
| Keine Datenübertragung | alles im Browser; CI prüft `fetch`/`XHR`/`sendBeacon` im Produktions-Bundle (NFR-07) |
| Kein Tracking | keine Analytics-Bibliothek; Metriken lokal (F16), Übertragung nur nach ausdrücklicher Zustimmung |
| Keine externen Ressourcen | keine CDN-Fonts, keine externen Bilder (NFR-11) |
| Geteilte Links | Zustand im **URL-Fragment** (`#…`), das per Spezifikation **nicht** an den Server geht |
| Kein XSS-Vektor | keine `dangerouslySetInnerHTML`; SVG wird aus eigenen Daten erzeugt, nie aus Fremdmarkup |
| Kein CSRF/SSRF | keine Serverkommunikation |

**Konsequenz [A]:** Die DSGVO-Frage ist für dieses Produkt **strukturell gelöst**, nicht durch
Einwilligungen. Das ist ein Wettbewerbsvorteil (Phase 1, `business-model.md` §7) und muss so
bleiben — jede spätere Analytics-Integration muss daran gemessen werden.

---

## 11. Bewusste Nicht-Entscheidungen (was diese Architektur offen lässt)

| Nicht entschieden | Warum offen | Wann fällig |
|---|---|---|
| Offset-Polygon-Bibliothek für Kurven | MVP braucht nur Rechteck-Offsets | Vor M06 (Stufe 2) |
| Echte 3D-Darstellung | Aufwand/ Nutzen unklar | Nach Conversion-Daten |
| Constraint-Solver für `free` | wird wahrscheinlich nie gebraucht | Nur bei belegtem Bedarf |
| PDF: SVG-Druck vs. pdf-lib als Primärpfad | braucht Prototyp | Woche 6 |
| DnD: eigenes Modell vs. dnd-kit | braucht Touch-Prototyp | Woche 5 |
| Listen-Parameter im Modulschema (M08) | additive Erweiterung | Stufe 2 |

**Das ist Absicht.** Eine Architektur, die jede Eventualität vorab entscheidet, ist
überkomplex — genau der Fehler, nach dem die Architekturprüfung sucht
([`../architecture-review.md`](../architecture-review.md) §2).
