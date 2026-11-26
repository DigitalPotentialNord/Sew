# Teststrategie

Stand: 26.11.2026 · Architektur: [`system-architecture.md`](system-architecture.md) ·
Geometrie: [`geometry-engine.md`](geometry-engine.md)

---

## 1. Warum Testen hier kein Standardkapitel ist

In den meisten Webprodukten testet man, **ob die Software tut, was spezifiziert ist**.

In diesem Produkt gibt es eine zweite, wichtigere Frage:

> **Tut das erzeugte Schnittmuster das, was es verspricht — nämlich zu passen?**

Ein Bug in einem Formular kostet einen Klick. Ein Bug in der Konstruktion kostet
**Stoff, Zeit und das Vertrauen in das ganze Produkt** — und Phase 1
(`opportunity-analysis.md` §9, Risiko 5) hält fest: *„Unmögliche Schnittmuster zerstören
Vertrauen sofort."*

Deshalb ist die Teststrategie **risikogetrieben**, nicht pyramidal-fromm: Die Tests, die einen
nicht-nähbaren Export verhindern, haben Vorrang vor allem anderen.

---

## 2. Die Risiken und was sie abfängt

| # | Risiko | Schadenshöhe | Abfangende Tests |
|---|---|---|---|
| **R1** | Falsche Praxiswerte (Nahtluft, Elastikzug) → Etui passt nicht | 🔴 katastrophal | **Testnähung** (einziger echter Nachweis) + Kalibrier-Konstanten |
| **R2** | PDF nicht maßhaltig | 🔴 katastrophal | T-X-02, T-X-14 (physisch) |
| **R3** | Nicht-deterministische Ausgabe (andere Maße bei zweitem Aufruf) | 🟠 hoch | T-G-06, T-D-*, Golden-Hashes |
| **R4** | Material zu knapp berechnet → Nutzer kauft zu wenig | 🟠 hoch | T-M-11 (Invariante Meter ≥ Fläche/Breite) |
| **R5** | Operationsreihenfolge falsch → Naht nicht ausführbar | 🔴 katastrophal | Graph-Azyklik, 31 Kombinationen, V-O-01/02 |
| **R6** | Anleitung nennt falsche Zahlen | 🟠 hoch | T-X-08, Snapshot |
| **R7** | Projekt geht bei Update/Reload verloren | 🟠 hoch | Migration-Fixtures, I9-Round-Trip, Chaos-Test |
| **R8** | Touch-Bedienung unbenutzbar | 🟡 mittel | Playwright-Gerätetests, manuelle Prüfung |
| **R9** | Export blockiert nie, obwohl `error` | 🟡 mittel | E2E je Regel |
| **R10** | Browserunterschiede | 🟡 mittel | Playwright-Matrix + Hash-Vergleich |

**Die unbequeme Wahrheit:** R1 ist der einzige Punkt, den **kein** automatisierter Test abfängt.
Er braucht eine Nähmaschine. Das ist in `mvp-scope.md` §5.3 als Abnahme N1–N3 festgeschrieben.

---

## 3. Die Testebenen

```text
                    ┌──────────────────────────────────────┐
   E5  Physisch     │  Testnähung + Kalibrierdruck         │  wenige, teuer, unverzichtbar
                    └──────────────────────────────────────┘
                    ┌──────────────────────────────────────┐
   E4  E2E          │  Playwright: Flüsse, Export, Touch   │  ~25 Tests
                    └──────────────────────────────────────┘
                    ┌──────────────────────────────────────┐
   E3  Golden       │  Snapshot-Geometrie, Hashes          │  ~40 Tests
                    └──────────────────────────────────────┘
                    ┌──────────────────────────────────────┐
   E2  Property     │  fast-check: Invarianten, 5–10k Fälle│  ~15 Tests
                    └──────────────────────────────────────┘
                    ┌──────────────────────────────────────┐
   E1  Unit         │  Geometrie, Module, Regeln, Material │  ~200 Tests
                    └──────────────────────────────────────┘
```

**Verteilung bewusst anders als die klassische Pyramide:** Unit ist breit, aber **Property und
Golden sind hier ungewöhnlich stark** — weil die Domäne aus reinen Funktionen besteht und sich
Invarianten formulieren lassen. Das ist der Vorteil von A1 (reine Funktion).

---

## 4. E1 — Unit-Tests (Vitest)

### 4.1 Geometrie

Jede öffentliche Funktion aus `geometry/index.ts` (13 Exporte) hat Tests für:

| Kategorie | Beispiele |
|---|---|
| **Normal** | `offsetRect({0,0,100,50}, 10)` → `{-10,-10,120,70}` |
| **Grenzwert** | Offset 0; negative Offsets; Maße 1 mm |
| **Rundung** | `toMm(0.4999)=0`, `toMm(0.5)=1`, `toMm(-0.5)=-1` (HALF_UP) |
| **Ungültig** | `assertFinite(NaN)` wirft; `offsetRect` mit negativer Breite wirft |
| **Determinismus** | gleiche Eingabe 100× → gleiche Ausgabe |

### 4.2 Module (pro Modul ein Testpaket)

```
modules/M03/__tests__/
  params.test.ts       Zod-Grenzen: min/max, Integer, Enum
  geometry.test.ts     Maße → erwartete Geometrie (Tabelle aus der Spezifikation)
  pieces.test.ts       Schnittteile: Anzahl, Maße, Fadenlauf, cutCount
  materials.test.ts    Mengen + certainty + sources
  operations.test.ts   Operationen + Vorbedingungen (requires[])
  rules.test.ts        jede Regel V-M03-xx: auslösen + nicht auslösen + Fix anwenden
  golden/              vollständiges Teil als SVG-Snapshot
```

**Die `rules.test.ts` ist die wichtigste:** Für jede Regel gibt es **drei** Tests:
auslösender Fall, nicht-auslösender Grenzfall, und **Fix anwendet → Regel weg** (Regel R4 aus
`construction-rules.md`).

### 4.3 Regeln (regelwerkweit)

| Test | Prüft |
|---|---|
| Registry-Eindeutigkeit | jede `V-*`-ID genau einmal |
| Fix-Pflicht | `severity !== 'info'` ⇒ `fix` vorhanden |
| Zahlen-Pflicht | `detail` enthält mindestens eine Ziffer |
| Nicht-wegklickbar | `error` ⇒ `dismissible: false` |
| Fix-Validität | `applyFix(p, fix)` erzeugt valides Projekt + reduziert Fehler (R4) |

---

## 5. E2 — Property-Tests (fast-check)

**Warum Property-Tests hier überproportional wertvoll sind:** Die Domäne ist rein und
deterministisch — also lassen sich **Invarianten** formulieren, die für **alle** Eingaben gelten
müssen. Ein Unit-Test prüft einen Fall; ein Property-Test prüft eine Regel über tausende Fälle.

### 5.1 Die verbindlichen Properties

| # | Property | Formulierung | Abfangendes Risiko |
|---|---|---|---|
| **P-01** | Konstruktion wirft nie bei gültigem Projekt | `∀ valid project: construct() does not throw` | R5 |
| **P-02** | Determinismus | `∀ p: construct(p).hash === construct(p).hash` (auch nach Objekt-Kopie) | R3 |
| **P-03** | Zeitunabhängigkeit | `∀ p: hash(p with other timestamps) === hash(p)` | R3 |
| **P-04** | Kein `error` ohne Fix | `∀ p, f in findings: f.severity==='error' ⇒ f.fix` | R9 |
| **P-05** | **Kein Export bei `error`** | `∀ p: hasError(construction) ⇒ !canExport(p)` | R9 |
| **P-06** | Material nie zu klein | `∀ p: meter ≥ fläche / stoffbreite` | **R4** |
| **P-07** | Monotonie Material | `∀ p, +1 Modul: meter(p') ≥ meter(p)` | R4 |
| **P-08** | Kanal-Invariante | `∀ p: Σ modulbreiten ≤ kanallänge` **oder** `error` vorhanden | R5 |
| **P-08b** | Kanalhöhen-Invariante **(neu)** | `∀ p: Σ Kanalhöhen ≤ panelhöhe` **oder** `error` (`V-G-13`) | **R5** |
| **P-09** | Alle Teile haben NZ | `∀ piece: cutOutline = offset(netOutline, nz)` | – |
| **P-10** | Knips == Anker | `∀ piece: count(mark) === count(anchors)` | – |
| **P-11** | Operationsgraph azyklisch | `∀ p: isDAG(operations)` | **R5** |
| **P-12** | Anleitung vollständig | `∀ p: ∀ measurement: ∈ anleitungstext` | **R6** |
| **P-13** | Round-Trip | `∀ p: parse(serialize(p)).hash === p.hash` | R7 |
| **P-14** | Fix reduziert Fehler | `∀ finding with fix: errors(apply(p)) < errors(p)` (für dasselbe Subjekt) | – |
| **P-15** | Keine verbotenen Felder | `∀ p: serialize(p)` enthält kein `FORBIDDEN_IN_PROJECT` | – |
| **P-16** | SVG-Konsistenz | `∀ p: svgHash(p) === canvasHash(p)` | – |
| **P-17** | Schätzung vererbt sich | `∀ material: certainty === 'exact'` ⇒ alle `sources` sind `exact` (I11) | R4 |
| **P-18** | Keine leeren Zuschnittteile | `∀ piece with exportable: areaMm2 > 0` (I12) | – |

### 5.2 Die Generatoren (das eigentliche Kunststück)

Ein Property-Test ist nur so gut wie sein Generator. Deshalb **ein bewusster Generator für
gültige Projekte**:

```ts
const arbProject = fc.record({
  base: fc.oneof(arbBookBase(), arbRollBase()),        // Grundformen
  modules: fc.array(arbModule(), { minLength: 0, maxLength: 20 }),
}).map(placeInChannels);   // weist Module gültigen Kanälen zu, ohne Überlauf

const arbModule = fc.oneof(
  arbM01(), arbM03(), arbM04(), arbM05()
);
```

**Wichtig:** Der Generator erzeugt **gültige Struktur**, aber **beliebige Werte innerhalb der
Grenzen** — inklusive der Fälle, die zu `error`s führen (zu breite Module, zu tiefe Module). Nur
so wird P-04/P-05 aussagekräftig: Der Test muss **Fehler erzeugen** und prüfen, dass sie korrekt
behandelt werden.

### 5.3 Die Laufzeiten

| Set | Fälle | Dauer (Ziel) | Wann |
|---|---|---|---|
| Smoke | 100 | < 5 s | jeder Commit |
| Standard | 1.000 | < 30 s | jeder PR |
| **Voll** | **10.000** | < 5 min | nightly + vor Release (PRD Q1) |

---

## 6. E3 — Golden-Tests

### 6.1 Was eingefroren wird

| Golden | Inhalt | Warum eingefroren |
|---|---|---|
| `golden/m03-kanal.svg` | vollständiges Schnittteil mit allen Rollen | Regression in der Geometrie |
| `golden/m03-kanal.pieces.json` | Teileliste mit allen Maßen | Regression in der Ableitung |
| `golden/m03-kanal.materials.json` | Materialzeilen inkl. `certainty` | Regression in der Materiallogik |
| `golden/m03-kanal.operations.json` | Operationsreihenfolge | Regression in der Nählogik |
| `golden/nadel-etui-standard/` | komplettes Standardprojekt, alle Ausgaben | **das Abnahmeprojekt** |
| `golden/alle-31-kombinationen/` | Operationsreihenfolge für jede Modulkombination | R5 |

**31 Kombinationen** = 2⁵ − 1 nichtleere Teilmengen der 5 MVP-Module. Sie laufen in Sekunden und
decken **jede** im MVP mögliche Nähreihenfolge ab. Es gibt keinen Grund, das nicht zu tun.

### 6.2 Der Umgang mit Golden-Änderungen

> **Ein geänderter Golden-Test ist ein Ereignis, kein Ärgernis.**

Regeln:

1. Golden-Änderungen werden **nie** blind akzeptiert (`--update` ist im CI verboten).
2. Jede Änderung braucht einen Satz im PR: **„Warum ändert sich das Ergebnis?"**
3. Ändert sich ein Golden durch eine **Praxiswert-Änderung** (`PRACTICE`), ist das erwartet und
   dokumentiert — und ein Signal, dass die Testnähung gewirkt hat.
4. Ändert sich ein Golden **ohne** beabsichtigte Änderung: **Bug**, nicht Update.

### 6.3 `T-S-01` — der strukturelle Vollständigkeitstest *(Architekturprüfung K-02)*

**Alle bisherigen Tests prüfen, ob das, was da ist, konsistent ist. Keiner prüft, ob das
Richtige überhaupt da ist.** Genau diese Lücke war Befund K-02: Ein Etui mit „40 mm Tiefe" hätte
ein Schnittmuster ohne Seitenwand erzeugt — und **kein** Test hätte es bemerkt. Eine fehlende
Seitenwand verletzt keine Invariante.

```ts
// Für JEDES Projekt (nicht nur Property, sondern zwingend je Golden):
expect(pieceIds(construction)).toEqual(
  expect.arrayContaining([
    'panel-aussen',
    'panel-futter',
    ...construction.modules.map(m => expectIdFor(m))   // ≥ 1 exportierbares Teil je Modul
  ])
);
```

| Prüfung | Warum |
|---|---|
| `panel-aussen` **und** `panel-futter` existieren | ein einlagiges Panel ist nicht wendbar → nicht nähbar |
| jedes `kind: 'cut'`-Modul hat ≥ 1 exportierbares Teil | ein Modul ohne Teil ist ein Modul, das es nicht gibt |
| jedes Material hat ≥ 1 `source` | ein Material ohne Herkunft ist geraten |
| jedes `measurements[]`-Item der Anleitung hat eine Zahl | eine Anweisung ohne Zahl ist keine Anweisung |

> **`T-S-01` ist der wichtigste neue Test der Phase 2.** Er ersetzt keine Property-Tests — er
> deckt die Fehlerklasse ab, die Property-Tests systematisch **nicht** sehen: Vollständigkeit.

---

## 7. E4 — End-to-End (Playwright)

### 7.1 Die kritischen Flüsse

| # | Test | Prüft | Bezug |
|---|---|---|---|
| **E-01** | Kaltstart → `[Drucken]` → PDF vorhanden | Beispielprojekt funktioniert | F1 |
| **E-02** | **Schnellweg: 4 Interaktionen bis PDF** | `interaction_count ≤ 4` | **V3, F2** |
| **E-03** | Editor-Weg: ≤ 8 Interaktionen | dito | V3 |
| **E-04** | Modul per Drag hinzufügen | Drop erzeugt Modul | F6 |
| **E-05** | Modul verschieben/umordnen | Reihenfolge ändert sich | F8 |
| **E-06** | Modul skalieren, stoppt am Minimum | Griff klemmt | FR-23 |
| **E-07** | Warnung auslösen → Fix klicken → Warnung weg | 1-Klick-Fix | F9 |
| **E-08** | `error` blockiert Export (Button disabled + Tooltip) | FR-51 | F12 |
| **E-09** | Materialliste: exakt vs. geschätzt sichtbar | FR-60 | F10 |
| **E-10** | PDF herunterladen, Struktur prüfen | Deckblatt/Teile/Anleitung | F12 |
| **E-11** | SVG herunterladen, mm-Maße prüfen | FR-75 | F12 |
| **E-12** | JSON exportieren → importieren → identisch | FR-92 | F14 |
| **E-13** | Reload → Projekt wiederhergestellt | NFR-12 | F14 |
| **E-14** | Geteilter Link → Hinweis, nicht überschreiben | F14 | – |
| **E-15** | Korruptes localStorage → kein weißer Screen | NFR-14 | F15 |
| **E-16** | Offline nach Erstaufruf | NFR-06 | – |
| **E-17** | **Null Requests mit Projektdaten** | NFR-07 | – |
| **E-18** | Touch: Long-press → Drag → Drop + Sheet | PRD §6.3 | F6 |
| **E-19** | Touch: Eigenschaften als Bottom-Sheet, keine verschachtelten Scroller | PRD §6.2 | – |
| **E-20** | Tastatur: Modul hinzufügen, ändern, löschen, exportieren | NFR-09 | – |
| **E-21** | axe-core: 0 critical/serious | NFR-10 | – |
| **E-22** | 4 Browser: identischer Konstruktions-Hash | NFR-13 | – |
| **E-23** | Mobile (< 640 px): Begleiter-Modus, kein freies Platzieren | PRD §6.1 | – |
| **E-24** | Farbkorrektur-Waise: Warnungen haben Icon + Text, nicht nur Farbe | UX-04 | – |
| **E-25** | Fehlerfall: `construct` wirft → Fehlerzustand mit Rettungsweg | NFR-14 | – |
| **E-26** | Fix-Button ändert **nur** das Projekt, keine versteckten Zustände; danach ist die Warnung weg (**R4**) | FR-50 | – |
| **E-27** | Warnung nennt **Zahlen** (kein „ungültig") — Snapshot der ersten Warnung im Standardprojekt | **R2** | – |

> **Die E2E-Liste wird nach Architekturprüfung K-04 auf 14 Tests im CI geschnitten**
> (E-01…E-12, E-17, E-21); die übrigen laufen nightly. Die 14 sind die, bei denen ein Fehlschlag
> bedeutet: „das Produkt funktioniert nicht".

### 7.2 Browser- und Gerätematrix

| Projekt | Warum |
|---|---|
| Chromium Desktop 1440×900 | Standard |
| Firefox Desktop | SVG/PDF-Unterschiede |
| WebKit Desktop | Safari-Eigenheiten |
| Chromium Tablet 1024×768 (Touch) | **Hauptzielgruppe am Nähplatz** |
| WebKit iPhone 14 (Emulation) | Begleiter-Modus |
| Chromium Android 412×915 | Chrome Mobile |

**Die Hash-Vergleichsmatrix (E-22) ist der schärfste Determinismus-Test** und der einzige, der
NFR-13 wirklich prüft.

### 7.3 Visuelle Regression — bewusst zurückgestellt

Kein Screenshot-Diffing im MVP: SVG-Rendering unterscheidet sich in Antialiasing und
Font-Metriken zwischen Browsern und erzeugt Rauschen. **Stattdessen** wird die **Geometrie**
verglichen (Hash), nicht das Bild. Das ist strenger und stabiler.

---

## 8. E5 — Physische Tests (die wichtigste Ebene)

### 8.1 Testnähung (Abnahme N1–N3)

| # | Test | Vorgehen | Nachweis |
|---|---|---|---|
| **N1** | Standardprojekt nähen | Etui mit 8 Nadelkanälen für 20-cm-Nadelspiele nach Anleitung nähen | **Foto + Messprotokoll** (Fachbreiten, Passung) |
| **N2** | Praxiswerte kalibrieren | `needleClearanceMm`, `channelEdgeSeamMm`, `elasticGripMm` anhand N1 prüfen und dokumentieren | Änderungsprotokoll + Golden-Update |
| **N3** | Fremdperson näht | eine Person außerhalb des Teams näht nach der Anleitung | Kurzbericht: Wo war die Anleitung unklar? |

**Konkret für N1 zu messen:**

```text
□ Halten die 8 Nadelspiele ohne herauszurutschen?
□ Lassen sie sich mit einer Hand entnehmen?
□ Ist der Kanal zu eng (Nadel klemmt) oder zu weit (Nadel fällt)?
□ Liegt die Elastikreihe so, dass sie nicht in der Nahtzugabe sitzt?
□ Ist die Lasche lang genug für die Füllung?
□ Passen die zwei Panels in der Mitte (Spine) — oder wölbt sich das Etui?
□ Stimmt der Stoffverbrauch (±15 %)?
```

### 8.2 Kalibrierdruck (Abnahme Q4)

| Schritt | Erwartung |
|---|---|
| PDF auf A4 drucken, „100 %", keine Seitenanpassung | – |
| 50-mm-Feld mit Lineal messen | **50,0 ± 0,5 mm** |
| Alle 8 Seiten zusammenkleben | Teile passen lückenlos, Klebemarken fluchten |
| Schnittteile ausschneiden, gegen Maßtabelle prüfen | ± 1 mm |

**Dokumentation:** Scan des Messschiebers/Fotos + Bemerkung zum Drucker/Modell. Ohne diese
Dokumentation gilt Q4 als nicht erfüllt.

---

## 9. CI-Gates

| Gate | Was | Blockiert |
|---|---|---|
| **G1** | `tsc --noEmit` | Merge |
| **G2** | ESLint inkl. **Importgrenzen** + **Determinismus-Regeln** (kein `Date`, `Math.random`, `fetch`, `toFixed` außerhalb `rounding.ts`) | Merge |
| **G3** | Unit + Property (Standard, 1.000 Fälle) + `T-S-01` | Merge |
| **G4** | Golden (kein `--update`) | Merge |
| **G5** | E2E-Kern (E-01…E-12) auf Chromium | Merge |
| **G6** | Bundle < 250 kB gzip | Merge |
| **G7** | axe-core 0 critical | Merge |
| **G8** | Property **voll** (10.000) + 4-Browser-Hash-Matrix | Nightly + Release |
| **G9** | Keine externen URLs im Build | Merge |
| **G10** | Kein `FORBIDDEN_IN_PROJECT`-Feld im Serialisat | Merge |

**G2 ist der wichtigste Gate:** Er verhindert, dass Nicht-Determinismus überhaupt ins Repo kommt.
Ein `Date.now()` im Kern ist in einem Code-Review leicht zu übersehen und in einem Property-Test
nur manchmal sichtbar — ein Lint-Fehler ist unübersehbar.

---

## 10. Testdaten und Fixtures

```text
fixtures/
  projects/
    minimal.json              // 1 Modul, kleinste gültige Konfiguration
    standard-nadel-etui.json  // das Abnahmeprojekt (N1)
    maximal.json              // 20 Module, größte Maße
    rollform.json
    alle-module.json          // 1× jedes MVP-Modul
    fehlerhaft/               // absichtlich ungültig, für Ablehnungstests
      negative-breite.json
      float-mass.json
      verwaistes-modul.json
      unbekannter-modultyp.json
  legacy/
    v0-project.json           // für Migrations-Tests (auch wenn v0 = v1 heute)
  expected/
    standard-nadel-etui.pieces.json
    standard-nadel-etui.materials.json
    standard-nadel-etui.operations.json
    standard-nadel-etui.svg
```

**`legacy/v0-project.json` wird am Tag 1 angelegt**, auch wenn es identisch zu v1 ist. Damit ist
die Migrations-Infrastruktur getestet, **bevor** sie gebraucht wird — und nicht erst dann, wenn
Nutzer:innen Daten verlieren.

---

## 11. Was diese Strategie nicht leistet

| Nicht abgedeckt | Warum | Konsequenz |
|---|---|---|
| **Ob das Etui gefällt** | Geschmack | Nutzerfeedback |
| **Ob die Werte fachlich richtig sind** | braucht Nähmaschine | **Testnähung N1–N3** |
| **Ob Nutzer:innen den Flow verstehen** | Usability ist kein Test, sondern Beobachtung | moderierter Test (A3) |
| **Ob der Markt es will** | Phase 1, Abbruchkriterien K1–K5 | nach Launch messen |
| **Druckerverhalten aller Hersteller** | unbeherrschbar | Kalibrierfeld |
| **Plotter/Laser-Kompatibilität** | keine Hardware | SVG-Standard + Rollen-Klassen |

---

## 12. Die drei Sätze, die diese Strategie zusammenfassen

1. **Der Kern ist rein und deterministisch — deshalb kann man ihn beweisen, nicht nur testen.**
   Property-Tests über 10.000 Projekte sind hier billiger und stärker als 1.000 Beispiele.
2. **Golden-Tests frieren die Nählogik ein, nicht die Pixel.** Ein geänderter Golden ist ein
   Signal, kein Fehler.
3. **Der wichtigste Test findet nicht im CI statt.** Er findet an einer Nähmaschine statt, mit
   einem ausgedruckten PDF und einem Lineal — und ohne ihn ist der MVP nicht fertig. Deshalb
   steht er seit der Architekturprüfung (K-04) in **Woche 9**, nicht in Woche 10, und hat eine
   Vorstufe in **Woche 4**: ein Modul, ein Kanal, eine Nadel, von Hand genäht.
