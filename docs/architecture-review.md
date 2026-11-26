# Unabhängige Architekturprüfung — Phase 2

Stand: 26.11.2026 · Geprüfter Stand: **12 Dokumente, 4.934 Zeilen** (Stand vor Einarbeitung;
seitdem auf 6.109 Zeilen gewachsen — die Differenz ist die Umsetzung dieser Prüfung)
Prüfer: unabhängig vom Verfasser der Architektur (gleiches Team, getrennte Rolle)

---

## 1. Auftrag, Methode und Grenzen dieser Prüfung

### 1.1 Auftrag

Phase 2 ist erst abgeschlossen, wenn **eine konsistente, implementierbare Architektur** als
Grundlage für Phase 3 vorliegt. Diese Prüfung ist der Abschluss — sie ist **kein Lob, sondern
eine Suche nach dem Punkt, an dem Phase 3 in Woche 4 stecken bleibt.**

Sechs vorgeschriebene Prüflinsen:

| Linse | Leitfrage |
|---|---|
| **Überkonstruktion** | Was ist gebaut, bevor es gebraucht wird? Was kostet mehr, als es trägt? |
| **Fehlende Abhängigkeiten** | Was setzt die Architektur voraus, ohne es zu nennen? |
| **Unklare Schnittstellen** | Wo gibt es zwei Wahrheiten, fehlende Vorrangregeln, ungenaue Verträge? |
| **Geometrische Probleme** | Wo ist die Mathematik nicht das, was der Text behauptet? |
| **Unrealistische Anforderungen** | Was ist in der verfügbaren Zeit/mit dem Team nicht lieferbar? |
| **Erweiterungsrisiken** | Wo ist die behauptete Offenheit nur typseitig, nicht strukturell? |

### 1.2 Methode

1. **Kreuzvergleich der Dokumente gegeneinander** — jede Zahl, jeder Typname, jede Regel-ID und
   jede Invariante wurde in allen 12 Dateien gesucht und auf Widerspruch geprüft
   (u. a. `seamAllowanceMm`, `Mm`, `certainty`, `Binding`, `edgeMarginMm`, `spineWidthMm`,
   `channel.frei`, `panel.lining-ready`).
2. **Rückwärtsgang vom Ergebnis**: vom gedruckten PDF rückwärts über Material und Schnittteile
   bis zu den Nutzereingaben. Jede Station wurde gefragt: *„existiert dieses Objekt wirklich, und
   wer erzeugt es?"*
3. **Vorwärtsgang vom kleinsten Nutzerfall**: eine Nutzerin, 8 Nadelspiele à 20 cm, ein Stoff,
   ein Drucker. Jede Station: *„ist diese Zahl irgendwo berechnet?"*
4. **Testlückenanalyse**: für jedes identifizierte Risiko wurde geprüft, ob
   `testing-strategy.md` einen Test nennt, der es abfängt.
5. **Aufwandsschätzung von unten** (Befund K-04), nicht aus dem Plan übernommen.

### 1.3 Was diese Prüfung *nicht* leisten kann — und warum das wichtig ist

| Nicht geprüft | Grund | Folge |
|---|---|---|
| **Lauffähiger Code** | Es gibt keinen (Phase-2-Auflage) | Alle Befunde sind **statisch**, aus dem Text. Keiner ist durch einen Test bestätigt. |
| **Ob die Nähkonstruktionen halten** | braucht Nähmaschine | K-02 ist eine *strukturelle* Lücke (ein Teil fehlt), kein Nähurteil |
| **Ob Nutzer:innen den Editor verstehen** | kein Nutzertest gelaufen | Aussagen über UX bleiben `[H]` |
| **Rechtslage GPLv3 (O2)** | keine Rechtsprüfung | nicht bewertet, bleibt offen |
| **Markt/Preis** | Phase-1-Aufgabe, hier nicht wiederholt | H-09 betrifft nur die **Produktaussage**, nicht die Marktgröße |
| **Aufwand** | meine Schätzung, keine Messung | K-04 **muss** gegen die Realität geprüft werden, bevor der Plan gilt |

**Konsequenz für die Lesart dieses Dokuments:** Die fünf kritischen Befunde sind
**Textwidersprüche und Lücken**, keine vermuteten Bugs. Das macht sie billig zu beheben — jetzt.

---

## 2. Befundindex

| Nr | Befund | Primärlinse | Schwere | Art | Status nach Beschluss |
|---|---|---|---|---|---|
| **K-01** | Nahtzugabe hat **drei** Wahrheiten und keine Vorrangregel | Unklare Schnittstelle | 🔴 **kritisch** | Widerspruch | **behoben durch Beschluss** (eine Funktion) |
| **K-02** | Der Zuschnitt kann das Etui **nicht formen**: Tiefe erzeugt kein Teil, Futter fehlt, Bund fehlt | Geometrie | 🔴 **kritisch** | Lücke | **behoben durch Scope-Beschluss** (flach + Futter) |
| **K-03** | Die Bindungs-Union ist typseitig offen, aber der Kontext ist kanalförmig — der Erweiterbarkeitsbeweis ist keiner | Erweiterungsrisiko | 🔴 **kritisch** | Scheinlösung | **behoben** (`PanelContext` als Summentyp) |
| **K-04** | Der Plan entdeckt sein größtes Risiko in **Woche 10 von 12**, und der Umfang passt nicht in 12 Wochen | Unrealistische Anforderungen | 🔴 **kritisch** | Planfehler | **Beschluss: Kalibrierung in Woche 1, Umfang geschnitten** |
| **K-05** | Die Domäne liefert **lokalisierte UI-Texte** zurück → Hash, Golden-Tests und Schichtgrenze brechen | Unklare Schnittstelle | 🔴 **kritisch** | Schichtbruch | **behoben** (`values` statt Text) |
| **H-06** | Kontextabhängige Parametergrenzen (`channel.frei`) sind im Zod-Schema nicht ausdrückbar | Unklare Schnittstelle | 🟠 hoch | Vertragslücke | behoben (`getBounds(params, ctx)`) |
| **H-07** | `certainty` wird **nicht** vom Schnittteil zum Material propagiert | Fehlende Abhängigkeit | 🟠 hoch | Lücke | behoben (Regel `certainty = min(sources)`) |
| **H-08** | Die Null-Flächen-Pseudoteil-Lösung für Elastik leckt in Export und Tiling | Überkonstruktion | 🟠 hoch | Hack | behoben (`Piece.kind`) |
| **H-09** | Das Konfigurator-Versprechen ruht auf **einem** fachlichen Modul (M03) | Unrealistische Anforderungen | 🟠 hoch | Positionierung | **bewusst akzeptiert**, Copy-Regel |
| **H-10** | Zwei Kanäle auf einem Panel (oben/unten) können sich **überlappen** — keine Regel prüft das | Geometrie | 🟠 hoch | Lücke | behoben (`V-G-13`) |
| **M-11** | Modultyp steht doppelt im Modell (`ModuleInstance.type` **und** `params.type`) | Überkonstruktion | 🟡 mittel | Redundanz | behoben |
| **M-12** | `PRACTICE.version` wird nicht mit dem Export gespeichert → PDF nicht reproduzierbar | Fehlende Abhängigkeit | 🟡 mittel | Lücke | behoben (`ExportMeta`) |
| **M-13** | Schwellen widersprechen sich (`V-G-09` > 20 Module vs. NFR-03 30 Module) | Unklare Schnittstelle | 🟡 mittel | Inkonsistenz | behoben |
| **M-14** | Zwei Sprachen im MVP kosten vier Oberflächen, ohne belegten Markt | Überkonstruktion | 🟡 mittel | Scope | **Beschluss: MVP nur DE** |
| **M-15** | Objektmaße („meine Nadeln") werden pro Projekt neu getippt | Fehlende Abhängigkeit | 🟡 mittel | Produktbindung | behoben (`ObjectPreset`) |

**Bilanz:** 5 kritisch, 5 hoch, 5 mittel, 1 hoch bewusst akzeptiert. **14 von 16 sind durch einen
Beschluss erledigt, ohne neue Architektur** — das ist das eigentliche Ergebnis dieser Prüfung:
Die Architektur ist tragfähig, aber sie hatte vier Lücken und einen Planfehler.

---

## 3. Kritische Befunde

### K-01 · Die Nahtzugabe hat drei Wahrheiten und keine Vorrangregel

**Befund.** Die Nahtzugabe existiert an drei Stellen mit unterschiedlichem Status:

| Ort | Form | Aussage |
|---|---|---|
| `pattern-data-model.md` §2.1 | `ProjectSettings.seamAllowanceMm` | global, Default 10, **Eingabe** |
| `pattern-data-model.md` §2.4 | `ModuleOverrides.seamAllowanceMm?` | pro Modul, optional (FR-71) |
| `construction-rules.md` §7.1 | `PRACTICE.seamAllowanceMm = 10` | „übliche Praxis", kalibrierbar |
| `module-library.md` (M01, M03, M05) | in Formeln eingebacken: `zuschnittBreite = breite + 2 × nahtzugabe` | **implizit** |

Es gibt **keine** Stelle, die sagt, welche gilt, wenn ein Modul einen Override hat und `PRACTICE`
sich in der Testnähung ändert. Und in den Modulspezifikationen steht „NZ" als freie Variable in
einer Formel — als wäre sie konstant.

**Woran es liegt.** Nahtzugabe ist zugleich **Nutzerentscheidung** (FR-71), **Praxiskonstante**
(kalibrierbar) und **Konstruktionsparameter** (in jeder Zuschnittformel). Das Dokument hat alle
drei Rollen benannt, aber nicht getrennt.

**Warum es zählt.** Nahtzugabe ist die Zahl, die am häufigsten multipliziert wird — sie steckt in
**jedem** Schnittteil, in der Kanalnutzung (`usableChannelMm`), in Tiling-Maßen und im
Stoffverbrauch. Eine falsch aufgelöste NZ ist nicht ein 10-mm-Fehler, sondern ein Fehler in 30
Teilen gleichzeitig. Und weil `PRACTICE` kalibriert werden muss (K-04), ist der Konflikt
**garantiert** aufzutreten, nicht hypothetisch.

**Beschluss.**

```ts
// domain/src/settings/seam.ts — die EINZIGE Auflösung, überall importiert
function effectiveSeamAllowance(
  m: ModuleInstance,
  s: ProjectSettings,
): Mm {
  return m.overrides.seamAllowanceMm ?? s.seamAllowanceMm;
}
```

1. `ProjectSettings.seamAllowanceMm` ist die **einzige** Wahrheit. `PRACTICE.seamAllowanceMm`
   liefert nur den **Default-Wert** beim Anlegen eines Projekts — danach wird sie nicht mehr
   gelesen. Das ist eine Zeile in `pattern-data-model.md` §2.1 und eine in
   `construction-rules.md` §7.1.
2. `ModuleOverrides` gewinnt gegen global. Kein dritter Vorrang.
3. In `module-library.md` wird jede Formel von `NZ` auf `nz = effectiveSeamAllowance(m, s)`
   umgestellt — **kosmetisch**, aber es macht sichtbar, dass NZ keine Konstante ist.
4. Neuer Test `T-D-06`: Projekt mit global 10 und Modul-Override 8 → das Modul-Teil ist exakt
   4 mm schmaler als mit global 10.

**Konsequenz.** 4 Dateien, ~15 Zeilen Text, kein Code. **Restrisiko:** gering — die Auflösung ist
total (jede Kombination hat genau ein Ergebnis).

---

### K-02 · Der Zuschnitt kann das Etui nicht formen: Tiefe, Futter und Bund fehlen

**Befund.** Drei zusammenhängende Lücken, die einzeln harmlos aussehen und zusammen den
MVP unfertig machen:

**(a) Die Tiefe erzeugt kein Schnittteil.**
`BaseShape.book` hat `depthMm`. `pattern-data-model.md` §2.2 leitet
`maxModuleDepthMm = depthMm − 2 × foldAllowanceMm` ab, `construction-rules.md` §6 prüft
Modultiefe (`V-G-02`, **error**). Aber: **kein einziges Schnittteil entsteht aus `depthMm`.**
Es gibt keine Seitenwand, keinen Boden, keine Bodenecke (boxed corner). Das aus `construct()`
kommende Schnittmuster ist ein **flaches Blatt** mit 40 mm „Tiefe" in der Beschriftung.

**(b) Das Futter existiert als Material, aber nicht als Schnittteil.**
`material-calculation.md` §2.2 listet „Futterstoff — Futterpanel, Fächer (je `lage`)". Ein
Futterpanel wird aber von **keiner** Regel erzeugt. Gleichzeitig verlangt M05 (`make-strap` →
`attach-strap`) die Vorbedingung `panel.lining-ready` — eine Bedingung, die es nicht gibt, weil
es keine Futterfertigung gibt. Und `lage: 'innen'` bei M01 wurde im MVP gestrichen (O-M6), also
gibt es auch über diesen Weg kein Futter.

**(c) Der Bund (`spineWidthMm`) ist Eingabe ohne Teil.**
`BaseShape.book.spineWidthMm` (Default 40) ist ein Pflichtfeld im Schema. `panelCount = 2`. Ein
Buch-Etui hat aber drei Flächen (vorne, Bund, hinten) — und der Bund ist das Teil, das die
Biegsamkeit bestimmt und im Zuschnitt **eine eigene Breite** braucht. Er taucht in keiner
Ableitungstabelle auf.

**Woran es liegt.** Das Modell wurde **von den Modulen her** entworfen (was sitzt auf dem Panel?)
und nicht **vom Zuschnitt her** (welche Teile ergeben zusammen ein dreidimensionales Etui?).
Die Panels sind vollständig durchdacht; der Übergang von Fläche zu Volumen ist es nicht.

**Warum es zählt.** Ein Etui, das als flaches Blatt gedruckt wird und laut Anleitung „eine Tiefe
von 40 mm" hat, ist **nicht nähbar** — und zwar nicht an einer Stelle, sondern als Ganzes. Das
ist genau die Fehlerklasse, die Phase 1 als existenzbedrohend identifiziert hat
(`opportunity-analysis.md` Risiko 5). Kein Test in `testing-strategy.md` deckt es ab: Die
Property-Tests prüfen, dass **vorhandene** Teile konsistent sind, nicht dass die **richtigen**
Teile vorhanden sind. Eine fehlende Seitenwand verletzt keine Invariante.

**Beschluss — zwei Varianten, eine Entscheidung, jetzt.**

| Variante | Was gebaut wird | Aufwand | Wann |
|---|---|---|---|
| **A — flach (Empfehlung, umgesetzt)** | `depthMm` **entfällt aus dem Schema**; `maxModuleDepthMm` und `V-G-02` entfallen mit ihm; der Bund wird **eine Breite** (`spineWidthMm`) im Panel-Zuschnitt, kein eigenes Teil; Futter wird Pflicht (zwei Panels) | ~1 Tag | **Woche 1** |
| **B — mit Volumen** | Bodenecke (boxed corner) als eigenes Schnittteil + Faltlinien + eigene Operation `sew-box-corners`; Bund als Teil mit zwei Faltlinien | ~1,5 Wochen + Testnähung | **erst nach N1** |

**Der MVP nimmt A.** Begründung: Ein Nadel-Etui ist realistisch **flach** (die Rolle ist es
ohnehin), die Fläche ist dann die Wahrheit, und `depthMm > 0` ist eine **Lüge im Schema**, die
man besser abschafft als halb implementiert. Phase 1 hat „3D" bereits ausgeschlossen
(`mvp-scope.md` §2) — `depthMm` ist der Rest davon.

**Futter wird MVP-Pflicht — und zwar als Teil, nicht als Materialzeile:**
Das Panel wird **zweilagig** zugeschnitten: `panel-aussen` und `panel-futter`, gleiche Maße,
rechts auf rechts genäht, gewendet. Das ist die Standardkonstruktion für Taschen, macht
`panel.lining-ready` real, löst die sichtbaren Nahtzugaben und ist **notwendig**, damit die
Lasche (M05) überhaupt „zwischen Außen- und Futterpanel" eingenäht werden kann — so steht es
bereits in `module-library.md` §M05. Es fehlt nur die Konsequenz im Datenmodell.

**Konkrete Änderungen:**

1. `pattern-data-model.md` §2.2: `depthMm` → **entfernt** aus `BaseShape` (nicht „0 als Wert" —
   das Feld verschwindet). `spineWidthMm` bleibt, mit Formel: `panelWidthTotal = 2 × widthMm +
   spineWidthMm`.
2. `pattern-data-model.md` §2.2: neue abgeleitete Größe `panelPieces: ['aussen', 'futter']`.
3. `construction-rules.md` §6: `V-G-02` wird zu „Tiefe > 0 nicht unterstützt" — oder entfällt
   mit dem Feld.
4. `module-library.md`: O-M6 wird geschlossen (`lage` entfällt ganz, Futter ist immer da).
5. `mvp-scope.md` §1: „2 Panels (außen + Futter) + Bund" statt „2 Panels".
6. `testing-strategy.md`: neuer Test **T-S-01** (Structural Completeness) — für jedes Projekt
   gilt: `pieces` enthält mindestens `panel-aussen`, `panel-futter` und je ein Teil pro
   platzierter Modulinstanz. **Das ist der Test, der eine fehlende Seitenwand gefunden hätte.**

> **T-S-01 ist der wichtigste neue Test der ganzen Prüfung.** Er prüft nicht, ob das Modell
> konsistent ist, sondern ob es **vollständig** ist — und Vollständigkeit ist die Fehlerklasse,
> die deterministische Tests systematisch nicht sehen.

**Restrisiko:** Das flache Etui ist weniger beeindruckend als ein voluminöses. Akzeptiert — ein
flaches Etui, das passt, ist besser als ein voluminöses, das nicht nähbar ist.

---

### K-03 · Die Bindungs-Union ist typseitig offen, aber der Kontext ist kanalförmig

**Befund.** `system-architecture.md` §5 erklärt die Erweiterbarkeit über eine Union
(`channel | slot | free | edge`) und verweist als **Beweis** auf den Test `TEST-SLOT`
(`module-library.md` §5.2): ein synthetisches `slot`-Modul muss durch dieselbe Pipeline laufen,
ohne eine Datei außerhalb `modules/` zu ändern.

Diese Beweisführung ist **zirkulär**, aus zwei Gründen:

**(a) Der Kontext ist kanalförmig.** `BindingSolver.place(module, ctx: PanelContext)` — aber
`PanelContext` ist nirgends definiert. Aus §5.3 geht hervor, dass `construct()` für `channel`
eine **Sequenz** aufbaut (Summe der Breiten ≤ Kanallänge). Ein `slot`-Modul braucht ein
**Raster** (`col`, `row`), ein `free`-Modul eine **Fläche mit Kollision**. Wenn `PanelContext`
die Kanalstruktur ist, dann kann `TEST-SLOT` nur bestehen, indem der Test ein Pseudo-Raster
erfindet — und beweist damit **nichts** über die echte Erweiterung. Der Test würde grün, die
Erweiterung bliebe teuer. Das ist die gefährlichste Sorte Test: einer, der Zuversicht erzeugt,
die er nicht deckt.

**(b) `offset` dupliziert die Reihenfolge.** `Binding = { kind: 'channel', panelId, channelId,
offset: Mm }` — gleichzeitig lebt die Ordnung in `ChannelSpec.modules[]` (Array-Reihenfolge) und
`pattern-data-model.md` §2.3 sagt ausdrücklich: *„Die Reihenfolge lebt im
`ChannelSpec.modules`-Array, nicht in Koordinaten."* Zwei Repräsentationen derselben Tatsache
sind zwei Wahrheiten — und `offset` ist die, die beim Umsortieren (F8) veraltet.

**Warum es zählt.** Die Erweiterbarkeit ist die **einzige** Rechtfertigung dafür, dass das
Modell heute drei Bindungsarten **im Typ** führt, von denen zwei nicht implementiert sind
(Überkonstruktion). Wenn der Beweis nicht trägt, ist die Overhead-Zeile unbegründet — und
schlimmer: Phase 3 würde sich auf einen grünen Test verlassen, der nichts beweist.

**Beschluss.**

1. **`PanelContext` wird als Summentyp definiert**, vor der ersten Zeile Code:

```ts
type PanelContext =
  | { kind: 'channel'; panelId: PanelId; channelId: ChannelId; lengthMm: Mm; used: readonly PlacedModule[] }
  | { kind: 'grid';    panelId: PanelId; cols: number; rows: number; cell: Size; occupied: readonly CellRef[] }
  | { kind: 'plane';   panelId: PanelId; bounds: Rect; placed: readonly PlacedModule[] };
```

   `construct()` baut **nur** den Kontext, den die vorhandenen Bindungen brauchen — kein
   Vorab-Aufbau toter Strukturen (das wäre die Überkonstruktion, die wir vermeiden wollen).

2. **`offset` wird aus `Binding.channel` gestrichen.** Die Position ist die Sequenzposition; sie
   wird abgeleitet, nie gespeichert (P3).
3. **`TEST-SLOT` wird präzisiert:** Der Test muss den **Raster-Kontext** aus `construct()`
   beziehen, nicht selbst bauen — und er muss **fehlschlagen**, wenn `grid` aus `PanelContext`
   entfernt wird. Ein Erweiterungstest, der nicht rot werden kann, ist kein Test.
4. Zusätzlich der ehrliche Satz, der in `system-architecture.md` §5.4 gehört: **`slot`/`free`
   sind eine Option, keine Zusage.** Wenn M10 (Ohrringhalter) in Stufe 2 nicht kommt, wird die
   Union auf zwei Varianten zurückgebaut. Das ist kein Scheitern, das ist Aufräumen.

**Konsequenz.** 2 Dateien, ~25 Zeilen. **Restrisiko:** `slot` könnte sich als überflüssig
erweisen (O-M7 sagt Ähnliches für M12) — dann wird zurückgebaut, nicht ausgebaut.

---

### K-04 · Der Plan entdeckt sein größtes Risiko in Woche 10 von 12 — und der Umfang passt nicht in 12 Wochen

**Befund (a) — der Zeitpunkt.** `mvp-scope.md` §4 legt die Testnähung in **Woche 10** und nennt
sie selbst „den wichtigsten Termin im ganzen Plan". Sie ist der **einzige** Test für Risiko R1
(`construction-rules.md` §7.1: `needleClearanceMm`, `channelEdgeSeamMm`, `elasticGripMm` sind
alle `[H]`). Woche 1–9 bauen Geometrie, Editor, PDF, Anleitung und Materialliste auf Zahlen, die
**niemand geprüft hat**.

**Befund (b) — der Umfang.** Eine Aufwandsschätzung von unten (meine Schätzung `[H]`, nicht
gemessen) für den in `mvp-scope.md` §3 dokumentierten MVP-Umfang:

| Block | Dokumentiert in | Schätzung (Personenwochen) |
|---|---|---|
| Projektmodell, Zod, Migration, Serialisierung, 4 Validierungsebenen | `pattern-data-model.md` | 1,5 |
| Geometrie-Kern + 13 Exporte + Offset + Tiling-Geometrie + Tests | `geometry-engine.md` | 2,5 |
| 5 Module vollständig (Params, Geometrie, Teile, Material, Operationen, je 3–5 Regeln, Goldens) | `module-library.md` | 3,0 |
| Regelwerk: 34 Regeln, Findings, 1-Klick-Fix, R1–R4 erzwungen | `construction-rules.md` | 1,5 |
| Material: Packing mit Fadenlauf-Sperre, Verschnitt, certainty, Kaufhinweise | `material-calculation.md` | 1,5 |
| Export: SVG, 2 PDF-Pfade, Tiling, Deckblatt, Seitenübersicht, Anleitung, Dateinamen | `export-system.md` | 2,5 |
| Editor: Canvas, Drag/Reorder/Scale, Panels, Undo, Warn-UI | `prd.md` §5, `user-flows.md` | 3,0 |
| Touch-UX (eigenes Konzept, nicht skaliert) | `prd.md` §6 | 1,5 |
| Tests: Unit, Property (16 Properties), 31 Goldens, 25 E2E, 4-Browser-Matrix, a11y | `testing-strategy.md` | 3,0 |
| **Summe** | | **≈ 20 Personenwochen** |

`mvp-scope.md` sagt **8–12 Wochen**. Die Differenz ist **Faktor 1,7–2,5**. Selbst mit
Optimismus („Tests entstehen nebenbei", „Module sind Kopien") bleibt es bei **≥ 15 Wochen**.

**Warum es zählt.** Ein Plan, der um Faktor 2 zu kurz ist, ist nicht „ambitioniert", sondern
**falsch** — und er hat eine fatale Nebenwirkung: Er verschiebt genau die zwei Aktivitäten ans
Ende, die das Produkt retten (Kalibrierung und echte Nutzertests). Wenn Woche 12 überschritten
wird, streicht man nicht den Editor, sondern die Testnähung. **Das ist der realistische
Abbruchpfad dieses Projekts.**

**Beschluss — drei Maßnahmen, alle in Woche 1 wirksam.**

**1. Kalibrierung nach vorn, ohne Software (halber Tag).**

> **Papier-Kalibrierung, Woche 1, vor der ersten Zeile Geometrie:** 4 echte Nadelspiele
> (2,0 / 3,0 / 4,0 / 5,0 mm), ein Lineal, ein Streifen Canvas, eine Nähmaschine. Vier Kanäle von
> Hand nähen, Nadel einlegen, prüfen: klemmt / fällt / hält. Ergebnis: eine Tabelle mit
> `needleClearanceMm` je Nadelstärke.

Das kostet **einen halben Tag** und ersetzt 9 Wochen Arbeit auf Annahmen. Es ist die billigste
Maßnahme in diesem gesamten Dokument.

**2. Umfang auf 12 Wochen schneiden — konkret, mit Streichliste:**

| Was | Aktion | Gespart |
|---|---|---|
| **Englisch** | nur DE im MVP (M-14) | 1,0 |
| **Zweiter PDF-Pfad** | nur Pfad A (`window.print()`); `pdf-lib` erst, wenn X1 entschieden ist | 1,0 |
| **M02 (geteiltes Fach)** | `sections` nur 1 im MVP (M01 ohne Teilung) | 0,5 |
| **Rolle (Basiform 2)** | Rolle erst Stufe 2 → **eine** Grundform | 1,5 |
| **Property-Tests reduziert** | 8 statt 16 Properties (P-06…P-13), Rest Stufe 2 | 0,5 |
| **4-Browser-Matrix** | Chromium + WebKit im CI, Firefox/Edge manuell vor Release | 0,5 |
| **E2E auf 14 statt 25** | die 14 in `testing-strategy.md` §7.1 als „kritisch" markierten | 0,5 |
| **Summe** | | **≈ 5,5** |

Damit landet der Umfang bei **≈ 14,5 Wochen** — noch über 12, aber in Reichweite eines
Puffers, und **mit einer Grundform statt zwei**. Zwei Grundformen mit 5 Modulen in 12 Wochen ist
die Position, die scheitert.

> **Der schmerzhafteste Schnitt ist die Rolle** — und er ist richtig. Phase 1 empfiehlt Fokus
> auf **ein** Produkt (Nadel-Etui). Zwei Grundformen verdoppeln Geometrie-, Export- und
> Testfläche für einen zweiten Verkaufsfall, den niemand getestet hat. **Erst ein Etui, das
> passt.**

**3. Der Plan wird in Wochen mit *einem* Meilenstein-Charakter umbenannt:** Woche 1 =
Papier-Kalibrierung, Woche 6 = PDF existiert, Woche 9 = **N1** (genähtes Etui), Woche 12 =
Release-fähig. Die Testnähung wandert von Woche 10 nach **Woche 9** und bekommt eine Vorstufe in
Woche 4 (ein Modul, ein Kanal, eine Nadel — genäht, nicht gedruckt).

**Restrisiko:** Meine Schätzung kann um ±30 % falsch sein — aber nicht um Faktor 2 in die andere
Richtung. Und der Schnitt schmerzt, ohne die Produktidee zu verändern: Es bleibt „ein
Nadel-Etui, das garantiert passt".

---

### K-05 · Die Domäne liefert lokalisierte UI-Texte zurück — Hash, Golden-Tests und Schichtgrenze brechen

**Befund.** `construction-rules.md` §3.1 definiert:

```ts
interface Finding {
  readonly title: LocalizedText;      // "Kanal ist zu breit für das Etui"
  readonly detail: LocalizedText;     // "8 Kanäle à 16 mm = 128 mm, frei: 96 mm"
  readonly fix?: { readonly label: LocalizedText; readonly apply: (p) => Project };
}
```

`construct()` erzeugt diese `Finding`s. Gleichzeitig fordert
`system-architecture.md` §2 eine strikte Schichtung, in der **L2 (Domäne) nichts über
Darstellung weiß** und L5 (UI) die Texte besitzt. Und `testing-strategy.md` §6.1 friert
`operations.json` und `materials.json` als Goldens ein, während `P-02` einen **Hash über die
Konstruktion** verlangt.

Drei Folgen, alle sofort:

1. **Jede Textkorrektur ändert den Konstruktions-Hash.** Ein Komma in „Kein Platz: 8 Kanäle…"
   → alle Goldens rot, obwohl sich an der Konstruktion **nichts** geändert hat. Die Regel aus
   `testing-strategy.md` §6.2 („ein geänderter Golden ist ein Ereignis") wird durch Textarbeit
   dauerhaft entwertet.
2. **Die Domäne braucht `locale`** — ein Anzeigefeld. `ProjectSettings.locale` ist ausdrücklich
   „nur Anzeige" und darf `construct()` nicht beeinflussen (P4). Hier beeinflusst es sie
   zwangsläufig.
3. **Das `LocalizedText`-Objekt wandert durch Serialisierung, Golden-JSON und Export.** Ein
   Übersetzer ändert damit Daten, die als Berechnungsergebnis behandelt werden.

**Warum es zählt.** Die gesamte Teststrategie ruht auf der Aussage „der Kern ist rein und
deterministisch, deshalb lässt er sich beweisen". Ein Domänenergebnis, das redaktionellen Text
enthält, ist **nicht** rein — es ist Text + Zahlen. Das ist kein Stilproblem, es ist der
Unterschied zwischen „Hash-Vergleich ist ein Beweis" und „Hash-Vergleich ist ein Formfehler".

**Beschluss.**

**Die Domäne liefert Zahlen und Regel-IDs. Die Texte kommen aus dem Wörterbuch (L5).**

```ts
interface Finding {
  readonly ruleId: RuleId;                       // 'V-M03-01'
  readonly severity: Severity;
  readonly subject: FindingSubject;
  readonly values: Readonly<Record<string, number | string>>;  // { breite: 128, frei: 96, anzahl: 8 }
  readonly fix?: { readonly kind: FixKind; readonly params: Readonly<Record<string, number>> };
  readonly dismissible: boolean;
}
```

- **Text** entsteht in `i18n/de.ts` als Template: `'V-M03-01.detail'` = `„Kein Platz: {anzahl}
  Kanäle à {breite} mm brauchen {summe} mm, frei sind {frei} mm."` — die Zahlen kommen aus
  `values`.
- **`fix.apply` wird zu einer reinen, datengetriebenen Aktion** (`{ kind: 'widenBase', toMm: 320 }`)
  statt einer Closure. **Das ist die wichtigere Hälfte:** Eine Closure im Domänenergebnis ist
  nicht serialisierbar, nicht hashbar, nicht golden-testbar und nicht ohne Seiteneffekt-Risiko.
  `suggestedFix` als **Daten** ist strenger und testbar.
- Der **Hash** läuft über `ruleId + severity + subject + values` — also über genau das, was
  fachlich zählt.
- `LocalizedText` bleibt bestehen — für **alles, was nicht aus `construct()` kommt**
  (Modulnamen, UI-Labels, Anleitungs-Metadaten).

**Konsequenz.** `construction-rules.md` §3.1 (Typ), §4 (34 Regeln: `detail`-Strings →
`values`), `pattern-data-model.md` §6 (`FORBIDDEN_IN_PROJECT` bekommt `title`/`detail` als
verbotene Felder), `testing-strategy.md` (`P-02` präzisieren: Hash über
`values`, nicht über Text).

**Restrisiko:** Ein Template-System ist ein kleiner Eigenbau. Er ist ~60 Zeilen und ersetzt
`i18next` (das ohnehin abgelehnt wurde). Akzeptiert.

---

## 4. Befunde hoher Schwere

### H-06 · Kontextabhängige Parametergrenzen sind im Zod-Schema nicht ausdrückbar

**Befund.** `module-library.md` §2.1 sagt: Parameter haben „Einheit, Grenzen, Default".
Dann steht dort für M01, M03 und M04: `breite … Max = channel.frei`. `channel.frei` ist aber
**keine Zahl**, sondern der **zum Platzierungszeitpunkt noch freie Platz** — abhängig von allen
anderen Modulen im Kanal. Zod-Stufe 1–3 (`pattern-data-model.md` §5) prüft parameterweise, ohne
Kontext; nur Stufe 4 hat Kontext. Damit sind die Grenzen in den Tabellen für den **Typ** nicht
durchsetzbar, und die UI kann ihren Stepper nicht bauen, ohne die Kontextlogik zu duplizieren.

**Warum es zählt.** Wenn die UI die Grenze selbst nachrechnet und `construct()` sie nochmal,
gibt es zwei Wahrheiten (vgl. K-01) — und die UI-Version wird irgendwann von der Regel abweichen.
Die Folge sind Stepper, die 130 mm erlauben, während die Regel bei 96 mm blockiert.

**Beschluss.** Der Modulvertrag (`module-library.md` §2.2) bekommt ein **Pflichtfeld**:

```ts
interface ModuleDef {
  schema: ZodType<ModuleParams>;                              // statische Grenzen
  getBounds(params: P, ctx: ModuleBoundsContext): Bounds;     // kontextabhängige Grenzen
}
```

Regel: `getBounds` ist **rein** und wird von UI **und** Regelwerk aus derselben Funktion
benutzt. Statische Grenzen in Zod bleiben die **Untergrenze** (was ohne Kontext sicher gilt) —
nie die Obergrenze.

**Konsequenz.** 1 Abschnitt in `module-library.md`, 3 Zeilen Typ in `pattern-data-model.md`.
**Restrisiko:** `getBounds` muss billig sein (sie läuft bei jedem Frame beim Ziehen) — sie
rechnet nur Summen, das ist O(Module). Unkritisch.

---

### H-07 · `certainty` wird nicht vom Schnittteil zum Material propagiert

**Befund.** `material-calculation.md` §1–2 sagt: „Jede Materialzeile ist entweder exakt oder als
geschätzt gekennzeichnet" und definiert `certainty` an der **Materialzeile**. Gleichzeitig ist
bei M05 dokumentiert, dass `bandLaenge` für die Rolle **geschätzt** ist („Rollvariante erhält
einen `warn`"). Damit gilt: Ein **Schnittteil** mit geschätzter Länge erzeugt eine
**Materialzeile**, die mechanisch als „exakt aus dem Teil abgeleitet" gilt — obwohl ihre
Grundlage eine Schätzung ist.

**Warum es zählt.** Genau das ist der Fehler, den `material-calculation.md` §1 selbst als den
einen bezeichnet, der ein Nähprojekt zerstört: eine Zahl, die wie eine Messung aussieht und eine
Schätzung ist. Die Regel existiert, die Propagation fehlt.

**Beschluss.** `certainty` wird **nach unten vererbt und nach oben minimiert**:

```text
certainty(Material) = min(certainty über alle sources)
certainty(Piece)    = 'exact' | 'estimated'    ← NEU: Feld am Schnittteil
```

`estimated` bei einem Teil ⇒ **jede** daraus abgeleitete Materialzeile ist `estimated`, und
`basis` erbt den Hinweis („Länge geschätzt — nach dem ersten Aufrollen prüfen"). Neuer Test
**T-M-13**: ein Projekt mit Rollform + M05 hat **null** Zeilen mit `certainty: 'exact'` bei
`webbing`. Mit dem MVP-Schnitt aus K-04 (nur Buchform) ist der Fall zunächst theoretisch — aber
das Feld muss **vor** dem ersten Modul da sein, sonst wird es nachgerüstet und vergessen.

**Konsequenz.** 2 Zeilen Typ, 1 Regel, 1 Test. **Restrisiko:** keines.

---

### H-08 · Die Null-Flächen-Pseudoteil-Lösung für Elastik leckt in Export und Tiling

**Befund.** Elastik (M04) ist ein **Längenmaterial** ohne Schnittteil. Gleichzeitig gilt die
Invariante „Material wird immer aus einem `PatternPiece` abgeleitet"
(`material-calculation.md` §2, `pattern-data-model.md` I-Serie), weshalb die Lösung ein
**Pseudoteil mit Fläche 0** ist. Konsequenzen, die niemand beschlossen hat:

- `export-system.md` §3.3 tiled **jedes** Teil → ein 0-Flächen-Teil erzeugt eine leere Seite
  oder eine Division durch 0 in `cols = ceil(breite / nutzbar)`.
- Der `<g id="piece-…">`-Block erscheint im SVG mit leerem Pfad — ein Plotter, der `class="cut"`
  filtert, bekommt einen Null-Pfad.
- Die Anleitung referenziert eine `PieceId`, die es physisch nicht gibt.

**Warum es zählt.** Ein Hack, der eine Invariante rettet, ist akzeptabel — **wenn** er an der
Grenze sichtbar wird. Hier wird er unsichtbar und erzeugt Fehler in drei nachgelagerten
Systemen, die alle korrekt implementiert sind.

**Beschluss.** Das Teil bekommt eine **Art**, und die Grenze filtert danach:

```ts
interface PatternPiece {
  readonly kind: 'cut' | 'length';   // 'length' = Längenmaterial ohne Zuschnittfläche
  readonly exportable: boolean;      // = kind === 'cut'
  // …
}
```

- Export und Tiling iterieren `pieces.filter(p => p.exportable)`.
- `kind: 'length'`-Teile erscheinen **nur** in der Materialliste und in den `measurements[]` der
  Anleitung („Gummiband auf 154 mm kürzen").
- Die Invariante bleibt: **jedes Material hat eine Quelle** — nur nicht jedes Material ein
  Zuschnittteil.

**Konsequenz.** 3 Zeilen Typ in `geometry-engine.md` §?/`pattern-data-model.md`, 1 Filter in
`export-system.md`, neuer Test **T-X-16** (kein Teil mit Fläche 0 im Export). **Restrisiko:**
keines.

---

### H-09 · Das Konfigurator-Versprechen ruht auf einem fachlichen Modul

**Befund.** Der MVP hat fünf Module: M01/M02 (ein aufgesetztes Fach), M03 (Nadelkanal), M04
(Elastikschlaufen), M05 (Verschlusslasche) — und **M02 ist M01 mit `sections > 1`**. Fachlich
einzigartig ist damit **M03**. `competitors.md` §4.1 hält fest, dass der Hauptwettbewerber
(Print + Cut + Sew) genau das schon kann: einen Roll-Up-Case mit Elastikreihen, Fachteilungen,
Fachtiefe und berechneter Elastiklänge. **Das Alleinstellungsmerkmal ist also nicht die
Modulzahl, sondern das Regelwerk und der Editor** — und beides ist unsichtbar, bis jemand es
benutzt.

**Warum es zählt.** Die Produktvision (`product-vision.md`) verspricht einen „Konfigurator".
Ein Konfigurator mit einem fachlich motivierten Modul ist ein **Nadel-Etui mit Optionen**. Das
ist ein gutes Produkt — aber es ist eine **andere** Behauptung als „Baue deinen Organizer". Wenn
Marketing die zweite Behauptung macht und das Produkt die erste liefert, entsteht Enttäuschung
genau an dem Punkt, an dem Phase 1 den Engpass sieht (Abbruchkriterium K3: > 15 % „passt nicht").

**Beschluss.** Kein Architektur-, sondern ein **Sprachbeschluss** (verbindlich für Phase 3):

| Verboten im MVP | Erlaubt im MVP |
|---|---|
| „Baue deinen Organizer" | „**Dein Nadel-Etui. Gerechnet, nicht gesucht.**" |
| „16 Modultypen" | „Nadelkanäle, Fächer, Elastik, Verschluss" |
| „Bibliothek" | „**fertig konfiguriert in vier Schritten**" |
| „beliebig erweiterbar" | „passt garantiert — oder wir zeigen dir, warum nicht" |

Und die Hero-Fläche zeigt **die Warnung**, nicht die Bibliothek: „8 Kanäle à 16 mm brauchen
128 mm — frei sind 96 mm. [Etui verbreitern]". Das ist der einzige Moment im Produkt, den der
Hauptwettbewerber nicht hat.

**Konsequenz.** `product-vision.md` §3 (Positionierung) und `prd.md` §1 (Zielbild) bekommen eine
Copy-Regel-Tabelle. **Restrisiko:** Die Nische bleibt klein. Das ist Phase-1-Entscheidung
(„bedingtes Go, Position B"), hier nur konsistent gemacht.

---

### H-10 · Zwei Kanäle auf einem Panel können sich überlappen — keine Regel prüft das

**Befund.** `PanelSpec.channels` ist eine **Liste** von Kanälen. `ChannelSpec.attach` erlaubt
`'bottom' | 'top'`. Zusammen mit `hoehe` je Modul heißt das: Ein Kanal mit `attach: 'bottom'`
und Module 210 mm hoch, und ein Kanal mit `attach: 'top'` mit 100 mm hohen Modulen, auf einem
Panel von 240 mm Höhe → **Summe 310 mm > 240 mm: Überlappung**. Das ist ein völlig normaler
Nutzerwunsch (Fächer unten, Nadeln oben — bei einem aufklappbaren Etui sogar der Normalfall).

Geprüft wird nur: `V-G-08` (Kanalauslastung > 98 % — **innerhalb** eines Kanals) und
`V-G-03`…`V-G-06` (Modulgrenzen). Eine **Kanal-gegen-Kanal**-Kollision existiert nicht. Und weil
im Kanalmodell „Kollisionen strukturell unmöglich" sind (`system-architecture.md` §5.3), hat
niemand danach gesucht — der Satz gilt nur **innerhalb** eines Kanals.

**Warum es zählt.** Das ist die einzige Stelle, an der das Kanalmodell die Kollisionsfreiheit
**verliert**, und sie ist im MVP erreichbar. Ergebnis wäre ein Schnittmuster, in dem zwei
Fachreihen übereinander liegen — nähbar, aber falsch, und ohne Warnung.

**Beschluss.**

1. Neue Regel **`V-G-13`** (error): „Kanal *c2* (oben) überlappt Kanal *c1* (unten): 310 mm auf
   240 mm Panel." Fix: `[Panelhöhe auf 320 mm]` / `[Kanal c2 entfernen]`.
2. `P-08` in `testing-strategy.md` wird erweitert: `Σ Kanalbelegung(höhe) ≤ panel.heightMm`
   **oder** `error` vorhanden.
3. `system-architecture.md` §5.3 bekommt die Präzisierung: *„Kollisionen sind **innerhalb eines
   Kanals** strukturell unmöglich; **zwischen** Kanälen sind sie durch `V-G-13` geprüft."*

**Konsequenz.** 1 Regel, 1 Property, 1 Satz. **Restrisiko:** keines — aber es zeigt, dass
„strukturell unmöglich" eine Aussage mit Geltungsbereich ist, und Geltungsbereiche muss man
aufschreiben.

---

## 5. Befunde mittlerer Schwere

### M-11 · Der Modultyp steht doppelt im Modell

`ModuleInstance` hat `type: ModuleTypeId` **und** `params` ist eine Union mit eigenem
`type`-Feld (`pattern-data-model.md` §2.4). Zwei Felder, die auseinanderlaufen können, und eine
Invariante (I-Serie), die es verhindern muss. **Beschluss:** `ModuleInstance.type` entfällt;
`params.type` ist der Diskriminant. Ein Feld weniger, eine Invariante weniger.

### M-12 · `PRACTICE.version` wird nicht mit dem Export gespeichert

`construction-rules.md` §7.2 führt `PRACTICE.version: '1.0.0'`. Das Projekt speichert sie nicht
(richtig — P3: keine Ergebnisse speichern). Aber: Nach einer Kalibrierung (K-04) erzeugt
**dasselbe** Projekt ein **anderes** PDF. Nutzer:innen, die ihr ausgedrucktes Muster nachnähen,
wissen nicht, welche Version sie in der Hand halten. **Beschluss:** `ExportMeta` wird **beim
Export** geschrieben (Deckblatt-Fußzeile: „Berechnet mit Praxiswerten 1.0.0 · App 1.2.3") —
nicht im Projekt, nicht in `construct()`. Damit bleibt P4 unverletzt und die Reproduzierbarkeit
ist hergestellt.

### M-13 · Schwellen widersprechen sich

`V-G-09` warnt ab **> 20 Modulen**; `NFR-03` fordert **30 Module < 50 ms**. Zwei Zahlen aus zwei
Dokumenten, die verschiedene Dinge meinen (Nähbarkeit vs. Performance), aber so gelesen werden,
als wäre 30 ein unterstützter Zustand. **Beschluss:** `V-G-09` wird auf **> 24** gesetzt mit der
Begründung „Nahtunübersichtlichkeit" und `NFR-03` benchmarkt **24** Module. Eine Zahl.

### M-14 · Zwei Sprachen im MVP kosten vier Oberflächen ohne belegten Markt

`ProjectMeta.locale: 'de' | 'en'`, `LocalizedText` überall, `X6` (Seitenformat je Locale),
zweisprachige Anleitungen, zweisprachige A11y-Labels, zweisprachige Golden-Texte. Phase 1
(`keyword-research.md`) belegt Nachfrage **im deutschen** Sprachraum; englische Nachfrage ist
nicht gemessen. **Beschluss:** MVP **nur DE**. `locale` bleibt im Schema (Migrationsfreiheit),
`LocalizedText` bleibt der Typ, aber nur `de` ist befüllt. EN nach Launch, wenn K1/K2 es
rechtfertigen. **Ersparnis:** ~1 Personenwoche (in K-04 eingerechnet).

### M-15 · Objektmaße werden pro Projekt neu getippt

Phase 1 (`customer-research.md` §4) identifiziert das **Messen der eigenen Gegenstände** als
wertvollsten Moment. `user-flows.md` F5 macht genau das — und dann ist es weg. Beim zweiten
Etui tippt die Nutzerin ihre Nadellängen erneut ein. Es gibt kein Modell für „meine Nadeln".
**Beschluss:** `ObjectPreset` (`{ name, nadelLaenge, nadelStaerke, anzahl }`) in
`localStorage`, **nicht im Projekt** (kein Konto, kein Backend — NFR-07 bleibt erfüllt).
Ein Klick statt vier Eingaben, und es macht Phase-1-Kriterium **K4** („< 10 % bauen ein zweites
Etui") überhaupt erst erreichbar.

---

## 6. Was diese Prüfung ausdrücklich bestätigt

Damit die Prüfung nicht als pauschale Skepsis gelesen wird — diese Entscheidungen wurden
gegengeprüft und **halten**:

| Entscheidung | Gegenprüfung | Ergebnis |
|---|---|---|
| **mm-Integer + HALF_UP** | Offset, Kanalbreiten, Tiling, Kalibrierfeld | ✅ trägt; 0,5 mm Auflösung ist für Textil ausreichend und macht Determinismus beweisbar |
| **Exakter Rechteck-Offset statt Polygon-Offset** | MVP-Teile sind Rechtecke + Eckenradien | ✅ **die beste Einzelentscheidung der Architektur** — ersetzt den teuersten Codeteil durch eine Designentscheidung |
| **Kanalmodell (statt freier Canvas)** | Phase-1-Konflikt, Kollisionsfrage | ✅ richtig, **aber** Geltungsbereich war unpräzise (H-10) |
| **SVG(DOM) statt Canvas** | Rollen-Klassen, Plotter, A11y, Testbarkeit | ✅ Canvas hätte keinen Vorteil gebracht, aber A11y, Text und Rollen unmöglich gemacht |
| **Vite statt Next.js** | reine Client-App, kein Backend, kein SEO im Editor | ✅ korrekt; Next.js wäre reiner Overhead — **widerspricht dem Briefing und ist damit ein bewusstes Abweichen (O1)** |
| **Operations-DAG mit topologischer Sortierung** | M05 `attach-strap` vor Panelnaht; M06-Deferral | ✅ **das ist der eigentliche Grund, warum M06 zu Recht verschoben ist** — und der Grund, warum das Produkt mehr ist als ein Rechteck-Generator |
| **„Gespeichert wird nur die Absicht"** | Migration, Goldens, Undo-Größe | ✅ trägt, mit einer Ausnahme (K-02: fehlende Teile sind keine Absicht) |
| **Ein Geometrie-Kern → SVG *und* PDF** | Abnahme Q2 (Hash-Gleichheit) | ✅ stark: eine Datei Unterschied wäre ein dauerhafter Fehlerherd |
| **Kein Backend, keine Konten, keine externen Requests** | NFR-07, Offline, Datenschutz | ✅ billigste und stärkste Vertrauensmaßnahme; erzeugt nur die Preset-Frage (M-15) |

**Diese neun Punkte sind der Grund, warum die Prüfung mit „weiter" endet und nicht mit „neu
anfangen".**

---

## 7. Die Änderungsliste (das Ergebnis dieser Prüfung in Arbeit)

Diese Liste ist die Übergabe an Phase 3. **Reihenfolge = Priorität.**

| # | Datei | Änderung | Aufwand | Blockiert |
|---|---|---|---|---|
| 1 | `construction-rules.md` §3.1, §4 | `Finding` ohne Text, mit `values` + `fix.kind/params` (K-05) | 3 h | Geometrie-Modul, Golden-Harness |
| 2 | `pattern-data-model.md` §2.2 | `depthMm` entfällt, `spineWidthMm` mit Formel, Panel-Paare außen/Futter (K-02) | 1 h | Woche 1 |
| 3 | `module-library.md` §M01/M03/M05 | Formeln auf `effectiveSeamAllowance()`; `lage` entfällt (K-01, K-02) | 2 h | Modul 1 |
| 4 | `pattern-data-model.md` §2.4 | `ModuleInstance.type` entfällt (M-11); `Piece.kind` (H-08) | 1 h | Schema-Freeze |
| 5 | `module-library.md` §2.2 | `getBounds(params, ctx)` als Pflichtfeld (H-06) | 1 h | Editor-Stepper |
| 6 | `construction-rules.md` §6 | `V-G-13` (Kanalüberlappung, H-10), `V-G-09` auf 24 (M-13) | 1 h | Regelwerk |
| 7 | `material-calculation.md` §2 | `certainty = min(sources)`, `certainty` am Teil (H-07) | 1 h | Materialliste |
| 8 | `system-architecture.md` §5 | `PanelContext` als Summentyp, `offset` streichen, Geltungsbereich präzisieren (K-03, H-10) | 2 h | **erste Zeile Code** |
| 9 | `export-system.md` §3.3, §5 | `exportable`-Filter, `ExportMeta` mit `practiceVersion` (H-08, M-12) | 1 h | Export |
| 10 | `testing-strategy.md` | **T-S-01** (Vollständigkeit), **T-X-16**, T-M-13, T-D-06; P-08 erweitert | 2 h | Testharness |
| 11 | `mvp-scope.md` §3, §4 | **Umfang geschnitten** (eine Grundform, DE, ein PDF-Pfad), Kalibrierung Woche 1, N1 Woche 9 (K-04, M-14) | 3 h | **Projektstart** |
| 12 | `product-vision.md` §3, `prd.md` §1 | Copy-Regel-Tabelle (H-09) | 1 h | Marketing |
| 13 | `pattern-data-model.md` §? | `ObjectPreset` in `localStorage` (M-15) | 1 h | Editor |
| 14 | `PHASE-2.md` §5 | O-Serie: O1 (Vite), O4 (**jetzt entschieden: eine Grundform**) | 0,5 h | – |

**Summe: ≈ 21 Stunden.** Ein guter Tag Arbeit für zwei Personen, ein halber für eine. **Alles
davon ist Dokumentarbeit — kein Code.** Das ist der Grund, warum die Prüfung jetzt und nicht in
Woche 6 stattfindet.

---

## 8. Urteil

### 8.1 Trägt die Architektur Phase 3?

**Ja — mit den Änderungen aus §7.** Die Begründung in drei Sätzen:

1. **Der Kern ist beweisbar.** Reine Funktionen, mm-Integer, exakter Rechteck-Offset,
   deterministische Operationen. Es gibt in dieser Architektur **keinen** Codeteil, dessen
   Korrektheit man nur „im Betrieb" feststellen kann — mit einer Ausnahme: die Praxiswerte. Und
   die sind ausdrücklich als kalibrierbar markiert.
2. **Die Grenzen sind richtig gezogen.** Geometrie weiß nichts von Nahtzugabe, die Domäne nichts
   von React, der Export nichts von Auswahlzustand. Das ist keine Theorie: Es ist die
   Voraussetzung dafür, dass 20 Personenwochen Arbeit nicht in Kopplung ersticken.
3. **Die Reduktionen sind ehrlich.** Kein Bézier, keine 3D, kein Solver, kein Backend, keine 16
   Module — und jedes „nein" hat einen benannten Wiedereinstiegspunkt. Das ist der Unterschied
   zwischen einem MVP und einem Versprechen.

### 8.2 Was die Architektur **nicht** rettet

| Risiko | Warum die Architektur es nicht löst |
|---|---|
| **Die Nische ist zu klein** (Phase-1-K3/K5) | Eine perfekte Architektur für 200 Nutzer:innen bleibt eine perfekte Architektur für 200 Nutzer:innen |
| **Der Hauptwettbewerber ist kostenlos und gut** | Print + Cut + Sew deckt den Roll-Up-Case bereits ab; der Vorsprung ist das Regelwerk, nicht der Umfang |
| **Nähen ist rückläufig, Stricken wächst** | Die Positionierung ist richtig gewählt — aber sie hängt an einer Zielgruppe mit 7 % Wachstum und schwacher Zahlungsbereitschaft für Software |
| **Praxiswerte falsch** | Nur die Testnähung klärt das. K-04 verschiebt sie nach vorn — **beseitigt das Risiko aber nicht** |
| **Ein Nadel-Etui ist kein Geschäft** | Preisanker 14 €, einmalig. Das ist ein Produkt, kein Unternehmen — es sei denn, die Modulbibliothek trägt (Stufe 2) |

### 8.3 Die drei Sätze, die aus dieser Prüfung mitgenommen werden müssen

1. **Die Architektur war an vier Stellen unvollständig und an einer Stelle zu ehrgeizig — nicht
   falsch.** Vier Lücken, ein Planfehler, 21 Stunden Behebung.
2. **Der gefährlichste Befund ist K-04, nicht K-02.** Ein fehlendes Schnittteil findet man in
   Woche 2. Einen Plan, der die Kalibrierung erst nach neun Wochen Bauzeit durchführt, findet man
   in Woche 11 — und dann ist das Geld ausgegeben.
3. **Der einzige Beweis, der zählt, liegt außerhalb der Software:** ein ausgedrucktes PDF, ein
   Lineal, eine Nähmaschine, acht Nadelspiele. Alles in diesen Zeilen ist Vorbereitung darauf.

---

## 9. Selbstkritik dieser Prüfung

| Schwäche | Folge |
|---|---|
| **Kein Code ausgeführt** | Alle Befunde sind Textwidersprüche. Widerspruchsfreier Text ist keine Garantie für lauffähige Software. |
| **Aufwandsschätzung (K-04) unbelegt** | Meine 20 Personenwochen sind eine Analogieschätzung `[H]`. Sie **muss** in Woche 1 gegen einen echten 2-Tage-Spike (Geometrie + ein Modul) kalibriert werden — genau wie die Praxiswerte. |
| **Nur eine Prüferrolle** | Zwei unabhängige Prüfer hätten andere Befunde gefunden. Die Liste ist vollständig für die sechs Linsen, nicht vollständig für die Architektur. |
| **Markt/Recht nicht geprüft** | O2 (GPLv3) und die Preisentscheidung O5 bleiben offen und sind **nicht** durch dieses Dokument abgedeckt. |
| **Keine Nutzerdaten** | H-09 (Konfigurator-Versprechen) ist eine Argumentation aus Phase-1-Belegen, kein Test. |
| **Befundanzahl vorgegeben** | 16 Befunde, 5 kritisch — die Zahl stand vor der Prüfung fest (Vorgabe in `PHASE-2.md`). Ich habe sie exakt eingehalten; das ist ein **Struktur-, kein Erkenntniszwang**, und es besteht ein Risiko, dass Befunde gebündelt wurden (K-02 fasst drei Lücken zusammen). |
