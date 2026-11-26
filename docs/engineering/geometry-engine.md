# Pattern Geometry Engine

Stand: 26.11.2026 · Architektur: [`system-architecture.md`](system-architecture.md) §2 ·
Module: [`../product/module-library.md`](../product/module-library.md)

---

## 1. Auftrag und Grenzen

Die Geometrieengine ist das **Fundament**, auf dem Konstruktion, Material, Export und Rendering
stehen. Sie ist **reine Mathematik** — sie kennt weder Nähbegriffe noch Module noch React.

**Sie darf:**

- Punkte, Strecken, Rechtecke, Pfade, Bögen, Polygone berechnen
- Längen, Flächen, Abstände, Offsets, Schnittpunkte liefern
- Rundungen und Toleranzen **explizit** machen

**Sie darf nicht:**

- wissen, was eine „Nahtzugabe" ist (das ist Domäne)
- entscheiden, ob eine Konstruktion nähbar ist (das ist Regelwerk)
- rendern oder exportieren (das sind Adapter)

> **Warum diese Trennung wichtig ist [A]:** Sobald „Nahtzugabe" in die Geometrie einsickert,
> wird jeder Offset zur Sonderregel, und die Testbarkeit kollabiert. Die Geometrie liefert
> `offset(polygon, distance)` — was das *bedeutet*, entscheidet die Domäne.

---

## 2. Koordinatensystem (verbindlich)

### 2.1 Definition

```text
Ursprung:      linke obere Ecke der Trägerfläche (Panel), (0, 0)
x-Achse:       nach rechts, wachsend
y-Achse:       nach UNTEN, wachsend   ← Bildschirmkonvention
Einheit:       Millimeter, immer
Werte:         Integer (Ganzzahlen in mm)
Rundung:       HALF_UP (0,5 → weg von Null), NIE banker's rounding
Winkel:        Grad, im Uhrzeigersinn, 0° = +x
```

**Warum y nach unten:** Es entspricht SVG, dem Renderer und dem Export. Eine Umrechnung im
Rendering wäre eine dauerhafte Fehlerquelle.

**Warum Integer-mm:** Fließkomma-Fehler akkumulieren in Offsets, Summen und Kanalbreiten und
führen zu „das PDF ist 0,3 mm zu schmal". Bei 0,5-mm-Auflösung genügt Integer-mm vollständig
für Textilkonstruktion (Nähen toleriert keine 0,1 mm).

**Konsequenz — die wichtigste Regel:** **Jede** Berechnung, die in das Projekt zurückfließt,
wird auf Integer-mm **gerundet und validiert**. Fließkomma ist in der Geometrie erlaubt (Wurzel,
Trigonometrie), aber **nie an einer Grenze**:

```ts
// Geometrie-intern: number (double)
const len = Math.hypot(dx, dy);

// An der Domänengrenze: immer über diesen Helfer
export function toMm(value: number): Mm {
  assertFinite(value);
  return Math.round(Math.abs(value)) * Math.sign(value) as Mm; // HALF_UP via Math.round für positive
}
```

### 2.2 Zwei Koordinatensysteme, strikt getrennt

| System | Wo | Wer rechnet |
|---|---|---|
| **Weltkoordinaten (mm)** | Domäne, Geometrie, Export | alles Fachliche |
| **Bildschirmkoordinaten (px)** | ausschließlich Rendering | `Viewport { scale, translateX, translateY }` |

```ts
type Viewport = { scale: number; tx: number; ty: number };  // px = mm * scale + t
```

**Verboten:** Bildschirm-Pixel in Domänenobjekten. **Verboten:** `scale` in `construct()`.
Ein Zoom darf das Schnittmuster **nicht** verändern — das ist ein Testfall (s. §9, T-G-07).

---

## 3. Geometrische Primitive

### 3.1 Kerntypen (unveränderlich, `readonly`)

```ts
type Mm = number & { readonly __mm: unique symbol };   // branded, verhindert px-mm-Verwechslung

interface Point  { readonly x: Mm; readonly y: Mm }
interface Vec    { readonly dx: Mm; readonly dy: Mm }
interface Size   { readonly w: Mm; readonly h: Mm }
interface Rect   { readonly x: Mm; readonly y: Mm; readonly w: Mm; readonly h: Mm }
interface Line   { readonly a: Point; readonly b: Point }
interface Arc    { readonly c: Point; readonly r: Mm; readonly startDeg: number; readonly endDeg: number; readonly ccw: boolean }
interface Polyline { readonly pts: readonly Point[]; readonly closed: boolean }
interface Polygon  { readonly outline: Polyline; readonly holes?: readonly Polyline[] }
```

**Branded Types für `Mm`:** Damit kann man nicht versehentlich Pixel oder Zentimeter übergeben.
Das ist der einzige Typtrick, den diese Architektur benutzt — und er ist die billigste Absicherung
gegen die häufigste Fehlerklasse in CAD-Code.

### 3.2 Warum keine Bézierkurven im MVP

| Option | MVP-Bedarf | Entscheidung |
|---|---|---|
| Polylinien (Polygone) | 100 % der MVP-Teile (alles Rechtecke) | ✅ |
| Bögen (`Arc`) | Panel-Ecken mit Radius (FR-10: „abgerundet") | ✅ |
| Kubische Bézier | Nicht nötig | ❌ **nicht im MVP** |

**Aber:** Das Modell lässt Kurven zu. `Polyline` kann später durch ein `Path`-Segmentmodell
ersetzt werden, **ohne** dass Offsets/Export neu gedacht werden müssen — weil Offsets ohnehin auf
**segmentierter** Geometrie arbeiten (§6). Das ist die Vorbereitung auf M06 (RV an Rundungen).

> **Ehrlich:** Ein echtes CAD hat Bézierkurven. Wir nicht. Das ist eine bewusste Reduktion auf
> das, was Textilkonstruktion mit Rechtecken und Eckenradien braucht (PRD FR-W1, P6).

### 3.3 Die eine Kurvenannäherung, die es gibt

Bögen werden für **Offset und Länge** in Segmente zerlegt, für **Rendering** als SVG-`A`-Befehl
ausgegeben.

```ts
function arcToPolyline(arc: Arc, toleranceMm = 0.2): Polyline
// Segmentzahl aus Toleranz: n = ceil(|Δangle| / (2 * acos(1 - tol / r)))
```

**Toleranz 0,2 mm** ist die verbindliche Konstante: feiner als die Nähgenauigkeit, grob genug
für deterministische, stabile Segmentzahlen. Sie ist **global konfigurierbar** und in Golden-Tests
eingefroren.

---

## 4. Pfade

### 4.1 Pfadmodell

Ein Pfad ist eine **geordnete Folge von Segmenten** mit Metadaten. Die Metadaten sind der Grund,
warum ein Schnittmuster überhaupt lesbar ist.

```ts
type SegmentKind = 'line' | 'arc';

interface PathSegment {
  readonly kind: SegmentKind;
  readonly from: Point;
  readonly to: Point;
  readonly arc?: { readonly r: Mm; readonly ccw: boolean };   // nur bei kind='arc'
  readonly role: SegmentRole;
}

type SegmentRole =
  | 'cut'        // Schnittlinie (mit Nahtzugabe)
  | 'sew'        // Nählinie (ohne Nahtzugabe)
  | 'fold'       // Faltlinie / Stoffbruch
  | 'grain'      // Fadenlauf-Markierung (eigenes Segment, kein Umriss)
  | 'mark'       // Knips, Ausrichtungsmarkierung (Punkt, kein Segment im Umriss)
  | 'opening';   // Öffnungskante (z. B. obere Fachkante, gesäumt)

interface Path { readonly segments: readonly PathSegment[]; readonly closed: boolean }
```

**Die Rollen sind der Kern:** Ein Schnittteil ist **nicht** ein Polygon mit Zierlinien drumherum.
Es ist ein Polygon, bei dem **jede Kante eine Rolle hat** — und diese Rolle entscheidet, ob sie
mit Nahtzugabe versetzt wird, ob sie gefaltet wird oder ob sie eine Nähanweisung trägt.

| Rolle | Wird verschoben um NZ? | Linienstil im Export | Beispiel |
|---|---|---|---|
| `cut` | nein (ist schon die Schnittkante) | durchgezogen, außen | Außenumriss |
| `sew` | nein (Referenz) | gestrichelt, innen | Nahtlinie |
| `fold` | **nein** | strichpunktiert + „Stoffbruch" | Faltkante der Lasche |
| `grain` | nein | Pfeil | Fadenlauf |
| `mark` | nein | kurzer Strich | Knips an Elastik-Anlage |
| `opening` | **spezial** (Saum) | durchgezogen | Oberkante Stofffach |

### 4.2 Das Schnittteil als Datenstruktur

```ts
interface PatternPiece {
  readonly id: PieceId;
  readonly kind: 'cut' | 'length';            // 'length' = Längenmaterial, keine Zuschnittfläche
  readonly exportable: boolean;                // = kind === 'cut'  (abgeleitet, s. unten)
  readonly nameKey: string;                    // 'piece.kanal' — Wörterbuchschlüssel, kein Text (K-05)
  readonly cutCount: number;                   // 1, 2, "2 gegengleich"
  readonly mirrored: boolean;                  // gegengleich
  readonly material: MaterialRef;
  readonly grainDirection: 'lengthwise' | 'crosswise' | 'bias';
  readonly netOutline: Polygon;                // Nählinie (Referenz, ohne NZ)
  readonly seamAllowanceMm: Mm;                // pro Teil überschreibbar (FR-71)
  readonly cutOutline: Polygon;                // = offset(netOutline, seamAllowanceMm)
  readonly paths: readonly Path[];             // fold, grain, mark, sew
  readonly anchors: readonly Anchor[];         // Befestigungspunkte → Knipse
  readonly noteKeys: readonly string[];        // Wörterbuchschlüssel + values, kein Text (K-05)
  readonly bbox: Rect;                         // für Layout/Tiling
  readonly areaMm2: number;                    // für Material
}
```

**Invariante (getestet):** `cutOutline = offset(netOutline, seamAllowanceMm)`.
Wer `cutOutline` von Hand setzt, hat einen Bug — es ist abgeleitet (P3).

#### 4.2.1 `kind: 'length'` — die Lösung für Materialien ohne Zuschnitt

*(Architekturprüfung H-08.)* Elastik, Gurtband und Garn sind **Längenmaterial**: Sie brauchen eine
Menge (mm) und einen Verwendungsort, aber **keine Fläche**. Die frühere Lösung — ein Pseudoteil
mit Fläche 0 — rettete die Invariante „jedes Material hat ein Schnittteil" und brach dafür drei
nachgelagerte Systeme:

| System | Was mit Fläche 0 passiert |
|---|---|
| Tiling (`export-system.md` §3.3) | `cols = ceil(0 / 190) = 0` → leere Seite oder Division durch 0 |
| SVG-Export | `<g id="piece-…">` mit leerem Pfad; ein Plotter, der `class="cut"` filtert, bekommt einen Null-Pfad |
| Anleitung | referenziert eine `PieceId`, die physisch nicht existiert |

**Regel:**

```text
kind === 'cut'     → erscheint in Tiling, SVG, Zuschnittübersicht, Materialliste
kind === 'length'  → erscheint NUR in Materialliste und in measurements[] der Anleitung
                      ("Gummiband auf 154 mm kürzen — 6 Loops à 19 mm + 2 × 10 mm Einzug")
```

Die Invariante bleibt bestehen und wird präziser: **jedes Material hat eine Quelle** — aber nicht
jedes Material hat ein Zuschnittteil. Export und Tiling iterieren `pieces.filter(p => p.exportable)`.

**Test:** `T-X-16` — kein Teil mit `areaMm2 === 0` unter den exportierbaren Teilen. Neue Invariante
**I12** (`pattern-data-model.md` §8).

---

## 5. Rollen → Linien: die vollständige Abbildung des Schnittteils

```text
                        ┌──────────── cutOutline (mit NZ) ────────────┐
                        │  ╔══════════ netOutline (Nählinie) ═══════╗  │
                        │  ║                                        ║  │
     NZ-Breite (10 mm) ─┤  ║   ↑ grain (Fadenlauf, längs)           ║  ├─
                        │  ║   │                                    ║  │
                        │  ║   │        ┆ fold (Stoffbruch)         ║  │
                        │  ║   │        ┆                            ║  │
                        │  ║   ├ mark   ┆   Kante mit Rolle 'sew'   ║  │
                        │  ╚════════════════════════════════════════╝  │
                        └─────────────────────────────────────────────┘
```

**Vier Linien pro Teil, immer vorhanden, immer aus denselben Daten:**

| Linie | Quelle | Zweck |
|---|---|---|
| **Schnittlinie** | `cutOutline` | Ausschneiden |
| **Nählinie** | `netOutline` | Nähen (Orientierung beim Steppen) |
| **Faltlinie** | `Path` mit `role: 'fold'` | Falten/Bruch |
| **Fadenlauf** | `Path` mit `role: 'grain'` + `grainDirection` | Zuschnitt-Orientierung |

Dazu: **Befestigungsmarkierungen** (`mark`) an `anchors[]` — das sind die Knipse, die die
Anleitung referenziert (PRD FR-73). **Die Anzahl der Knipse ist immer gleich der Anzahl
dokumentierter Anker** — und das ist ein Test.

---

## 6. Offset-Berechnung (Nahtzugaben)

### 6.1 Das MVP-Verfahren: exakt, weil einfach

Alle MVP-Teile sind **Rechtecke**. Ein Rechteck-Offset ist **exakt** und **trivial**:

```ts
function offsetRect(r: Rect, d: Mm): Rect {
  return { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d };
}
```

**Mit abgerundeten Ecken** (Panel-Radius `rad`) ist der Offset ebenfalls exakt:
`r' = rad + d`. Kein Algorithmus, keine Näherung, kein Fehler.

> **Das ist der wichtigste geometrische Befund dieses Dokuments:** Indem das MVP auf
> Rechtecke und Eckenradien **beschränkt** ist, ist die schwierigste Operation der
> Schnittmustererstellung (Nahtzugabe) **exakt lösbar statt approximiert**. Ein allgemeiner
> Polygon-Offset wäre der teuerste und fehleranfälligste Codeteil des MVP — und wird durch
> eine Designentscheidung ersetzt.

### 6.2 Das Verfahren für den allgemeinen Fall (Stufe 2, verbindlich vorbereitet)

Wenn M06 (Rißverschluss an Rundungen) kommt, wird Offset allgemein gebraucht. Das **Vorgehen**
ist festgelegt, die **Implementierung** nicht:

```text
1. Segmentierung:   alle Bögen → Polylinie (Toleranz 0,2 mm)
2. Normale je Segment (nach außen, konsistent zur Umlaufrichtung)
3. Versatz:         jede Segmentlinie um d senkrecht verschieben
4. Verbindung:      an konvexen Ecken → Bogen einfügen (Radius d)
                    an konkaven Ecken → Schnittpunkt der verschobenen Linien
5. Selbstüberschneidung entfernen (bei d > lokaler Krümmungsradius)
6. Ergebnis:        Polyline, danach `toMm`-Rundung je Punkt
```

**Bekannte Grenzen (dokumentiert, nicht versteckt):**

| Fall | Verhalten | Konsequenz |
|---|---|---|
| Innenradius < NZ | Offset schneidet sich selbst | **Regel** verhindert es (Mindest-Radius = NZ + 2 mm), statt den Algorithmus zu retten |
| Spitze Ecke (< 15°) | Offset-Länge wächst stark | **Regel** verbietet spitze Ecken |
| Loch im Teil | Offset nach innen | Nicht im MVP |

> **Prinzip:** Wir lösen geometrische Randfälle **im Regelwerk** (Domäne), nicht im Algorithmus.
> Ein Offset, der „meistens" funktioniert, produziert Schnittmuster, die „meistens" passen — und
> ein einziges nicht-nähbares PDF kostet mehr Vertrauen als zehn gute gewinnen (P2, V2).

---

## 7. Längen, Flächen, Schnittpunkte

| Funktion | Verwendung | Genauigkeit |
|---|---|---|
| `pathLength(p)` | Reißverschlusslänge (M06), Garnverbrauch, Nahtlänge | exakt für Linien, Toleranz für Bögen |
| `polygonArea(p)` | Materialfläche, Verschnitt | Shoelace, exakt für Polygone |
| `polygonPerimeter(p)` | Saumlänge | – |
| `intersects(a, b)` | Kollisionsprüfung (`slot`/`free`), Überlappungsprüfung von Teilen im Layout | exakt für Achsen-Rechtecke, sonst Segment-Segment |
| `distanceToPolyline(pt, pl)` | Einrasten am Raster/Kante | – |
| `bbox(polygons)` | Tiling, Layout, Seitenaufteilung | – |

**Determinismus-Anforderung:** Alle diese Funktionen müssen bei gleicher Eingabe **bit-identische**
Ergebnisse liefern. Deshalb:

- keine `Math.hypot`-Abkürzungen, wo die Reihenfolge der Summanden variieren könnte
- keine Sortierung ohne totalen Vergleichsschlüssel (Punktvergleich immer `x` dann `y`)
- keine Objekt-Iteration ohne definierte Ordnung (`Object.keys` ist verboten, `Map` mit
  Einfügereihenfolge oder sortierte Arrays sind Pflicht)

---

## 8. Überschneidungsprüfung

### 8.1 Drei Ebenen, drei Zwecke

| Ebene | Was wird geprüft | Wo | MVP |
|---|---|---|---|
| **Modul ↔ Modul im Kanal** | Passt die Summe in den Kanal? | Layout-Solver (1D) | ✅ |
| **Modul ↔ Panelgrenze** | Ragt ein Modul über die Fläche? | Layout-Solver | ✅ |
| **Teil ↔ Teil im Drucklayout** | Überlappen Schnittteile auf einer Seite? | Tiling | ✅ |
| **Modul ↔ Modul in 2D** | Polygon-Überlappung | Solver (`slot`/`free`) | ❌ Stufe 3 |

**Der MVP braucht keine Polygon-Kollision.** Das ist keine Lücke, sondern die Folge des
Kanalmodells: In einer lückenlosen Sequenz kann sich nichts überlappen
(`system-architecture.md` §5.3). Die einzige Prüfung ist eine **Summe**:

```text
Σ moduleWidth[i] + Σ gaps[i] ≤ channelLength    // sonst: error mit Vorschlag
```

**Warum das eine echte Absicherung ist:** Ein `error` mit „8 Kanäle à 16 mm = 128 mm, frei sind
96 mm → [Etui auf 320 mm verbreitern]" ist für Nutzer:innen hilfreicher als eine Kollisionswarnung
in einem freien Canvas — und für Entwickler:innen um Größenordnungen billiger.

### 8.2 Die Tiling-Überlappung (echte 2D-Prüfung, im MVP nötig)

Beim Verteilen der Schnittteile auf Druckseiten ist echte 2D-Geometrie nötig:

```text
Verfahren: Shelf-Packing in stabiler Reihenfolge
  1. Teile sortieren: nach Höhe absteigend, dann Breite absteigend, dann ID (total, stabil)
  2. Seite = nutzbare Fläche (Format − Rand − Klebestreifen)
  3. Regal für Regal füllen; passt ein Teil nicht → nächstes Regal / nächste Seite
  4. Nach Platzierung: achsenparallele Rechteck-Überlappung prüfen (schnell, exakt)
  5. Teile, die größer als die Seite sind → als „zu groß" melden (Katagami/Print+Cut+Sew
     machen dasselbe: „oversized pieces are flagged")
```

**Bewusst kein optimales Nesting** (PRD FR-W5): Ein Stoffverbrauch, der auf 5 % genau ist,
reicht für eine Einkaufsliste. Optimales Nesting ist ein eigenes Forschungsfeld und liefert
für Hobby-Näher:innen keinen Mehrmutzen.

---

## 9. Determinismus und Testbarkeit

### 9.1 Die Determinismus-Invarianten (erzwungen)

| # | Invariante | Durchsetzung |
|---|---|---|
| **D1** | Keine `Date`, `Math.random`, `crypto`, `performance.now` in `geometry/` oder `domain/` | ESLint-Regel, Build bricht |
| **D2** | Keine Iteration über `Object.keys`/`for…in` bei Reihenfolge-relevanten Strukturen | Lint + Review |
| **D3** | Alle Sortierungen haben einen **totalen** Schlüssel (nie nur ein Feld) | Code-Review-Checkliste |
| **D4** | Rundung nur über `toMm()` / `roundHalfUp()`, nie `toFixed` | Lint-Regel gegen `toFixed`/`Math.floor` außerhalb von `rounding.ts` |
| **D5** | Kein Zustand zwischen Aufrufen (auch kein Modul-Level-Cache ohne Hash-Schlüssel) | Design: Cache lebt in der Application-Schicht, nicht im Kern |
| **D6** | Gleiches Projekt → identischer Hash über `Construction` | Golden-Test, 2 Läufe |
| **D7** | Zoom/Viewport beeinflusst Konstruktion nicht | Test T-G-07 |
| **D8** | Browser-übergreifend identisch | Playwright-Matrix, Hash-Vergleich (NFR-13) |

### 9.2 Testkategorien für die Geometrie

| Kategorie | Beispiel | Werkzeug |
|---|---|---|
| **Unit (exakt)** | `offsetRect({0,0,100,50}, 10)` → `{-10,-10,120,70}` | Vitest |
| **Golden (eingefroren)** | vollständiges Nadelkanal-Teil als SVG-Snapshot + Hash | Vitest Snapshot |
| **Property (Invarianten)** | Für alle Rechtecke: `area(offset(r,d)) > area(r)`; `pathLength(closed) > 2·max(w,h)` | fast-check |
| **Precision** | 200-fache Offset-Kette driftet nicht (Integer-mm bleibt stabil) | Vitest |
| **Determinismus** | 2 Läufe → Hash gleich; 100 Zufallsprojekte → reproduzierbar | fast-check + Hash |
| **Cross-Browser** | gleicher Hash in Chromium/WebKit/Firefox | Playwright |

### 9.3 Konkrete benannte Tests (Auszug, verbindlich)

| ID | Prüft | Erwartung |
|---|---|---|
| **T-G-01** | `offsetRect` mit 0, 1, 10, 100 mm | exakt, keine Drift |
| **T-G-02** | `arcToPolyline` bei r=5 mm, 90° | Segmentzahl stabil, Länge ±0,2 mm zur Theorie |
| **T-G-03** | `pathLength` eines geschlossenen Rechtecks | exakt `2(w+h)` |
| **T-G-04** | `polygonArea` mit Loch | Außen − Innen |
| **T-G-05** | 200 Offsets hintereinander (hin und zurück) | Rückkehr zum Ausgangswert **exakt** |
| **T-G-06** | `toMm(0.4999)` / `toMm(0.5)` / `toMm(-0.5)` | 0 / 1 / -1 (HALF_UP) |
| **T-G-07** | `construct(project)` mit Viewport scale 0,1 / 1 / 10 | identischer Hash |
| **T-G-08** | Polygon-Offset (Stufe 2, vorbereitet) an Innenradius < NZ | Regel greift, Algorithmus wird nicht aufgerufen |

### 9.4 Der Geometrie-Vertrag als Code

Damit die Domäne nicht gegen eine wachsende API programmiert, ist die öffentliche Fläche klein
und **eingefroren**:

```ts
// packages/geometry/index.ts — die vollständige öffentliche API des MVP
export type { Mm, Point, Rect, Line, Arc, Polyline, Polygon, Size, Vec };
export { px }                    // Zahlen → Mm (mit Assertion)
export { mmToUnit, unitToMm }    // Anzeige-Konvertierung (cm, inch)
export { add, sub, scale, mid, dist, lerp };
export { rectOf, offsetRect, insetRect, rectsOverlap, rectCorners };
export { polygonOf, polygonArea, polygonPerimeter, polygonBBox, pointInPolygon };
export { pathLength, polylineLength };
export { arcToPolyline, arcLength };
export { offsetPolygon }         // MVP: nur Rechtecke/Polygone ohne Innenradius; wirft sonst
export { roundHalfUp, toMm };
export { GOLDEN_TOLERANCE_MM }   // 0.2
export { assertFinite, GeometryError };
```

**13 Exporte.** Wer mehr braucht, muss begründen, warum es nicht in die Domäne gehört. Das ist
die einzige wirksame Bremse gegen eine ausufernde Geometrie-API.

---

## 10. Was diese Engine bewusst nicht kann (Ehrlichkeit)

| Nicht vorhanden | Konsequenz | Wann relevant |
|---|---|---|
| Bézierkurven | Organische Formen (z. B. geschwungene Klappen) nicht möglich | Stufe 3, evtl. nie |
| Allgemeiner Polygon-Offset | Nur Rechtecke + Eckenradien | **M06 (Stufe 2)** |
| Polygon-Booleans (Vereinigung/Differenz) | Kein „Fach ausschneiden aus Panel" | Nicht geplant |
| 3D / Faltung / Drapierung | Keine Volumenprüfung | Nicht geplant (PRD FR-W2) |
| Text-/Font-Metrik | Kein Text auf Schnittteilen außer über SVG-`text` mit Standardfont | Hinweise: ja, Maßtext: ja, Beschriftung: über SVG |
| Optimale Nesting-Algorithmen | Verschnitt nicht minimiert | Stufe 3 |
| Meshing/Triangulierung | – | nie |

**Der wichtigste Satz dieses Dokuments:** Die Engine ist **klein, weil das Produkt klein ist**.
Phase 1 hat einen Organizer-Editor für ein enges Segment empfohlen; diese Engine ist genau so
groß wie diese Empfehlung — nicht größer.
