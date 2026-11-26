# Export-System

Stand: 26.11.2026 · Geometrie: [`geometry-engine.md`](geometry-engine.md) ·
Anforderungen: [`../product/prd.md`](../product/prd.md) §3.10

---

## 1. Auftrag

Der Export ist das **Endprodukt** — alles davor ist Vorbereitung. Phase 1 hat gezeigt, dass
Nutzer:innen in diesem Markt drei Dinge von einem Export erwarten, weil die Konkurrenz sie
liefert:

| Erwartung | Wer sie setzt | Konsequenz |
|---|---|---|
| **Maßhaltiger Druck bei 100 %** mit Kalibrierprüfung | Katagami (50-mm-Feld), Print + Cut + Sew | **Pflicht** (FR-74, NFR-15) |
| **A4-Tiling mit Klebemarken und Seitenübersicht** | alle Generatoren | **Pflicht** |
| **Nähanleitung im gleichen Dokument** | Print + Cut + Sew, Sewist | **Pflicht** (FR-84) |

Und eine, die nur wenige liefern:

| **SVG in Originalgröße** | Katagami, Nastix — **Print + Cut + Sew nicht** | **Differenzierung** (FR-75) |

---

## 2. Die eine Quelle: `Construction`

```text
                    Construction (aus construct())
                            │
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                    ▼
   svg/document()      pdf/pages()         json/project()
        │                   │                    │
        ├─ Canvas-Ansicht    ├─ Schnittteile      └─ Project (nicht Construction!)
        ├─ SVG-Download      ├─ Deckblatt
        └─ PDF (via Druck)   ├─ Materialliste
                             └─ Anleitung
```

**Verboten (A3):** Ein zweiter Rechenweg für den Export. Der Export liest **ausschließlich**
`Construction` und `Project` — er ruft **nie** Modulgeometrie direkt auf. Damit kann ein
Schnittmuster im PDF nicht anders aussehen als auf dem Bildschirm.

**Test dafür:** Der Export erzeugt für ein Projekt eine SVG-Datei; der Hash über alle
Pfad-Koordinaten muss identisch sein mit dem Hash der Canvas-Geometrie (Abnahme Q2).

---

## 3. Die Formate im Detail

### 3.1 SVG (Primärformat für Geometrie)

**Warum SVG das wichtigste Format ist:** Es ist die Brücke zu allem anderen — Druck, PDF,
Plotter, Lasercutter, Stoffprojektor. Und es ist das einzige Format, das **maßhaltig und
vektoriell** ist und gleichzeitig von jedem Browser gerendert wird.

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     width="260mm" height="230mm"
     viewBox="0 0 260 230">          <!-- 1 Einheit = 1 mm  (FR-75) -->
  <g id="piece-m1-kanal" data-piece="m1" data-cut-count="1">
    <path d="M0,0 H260 V230 H0 Z"            class="cut"/>   <!-- Schnittlinie -->
    <path d="M10,10 H250 V220 H10 Z"         class="sew"/>   <!-- Nählinie -->
    <path d="M130,15 V215"                   class="grain"/> <!-- Fadenlauf -->
    <path d="M10,120 H250"                   class="fold" data-fold="true"/>
    <g class="marks">
      <line x1="10" y1="40" x2="16" y2="40"/>   <!-- Knips -->
    </g>
    <text x="20" y="200" class="label">Nadelkanal · 1× · Außenstoff · 260×230 mm</text>
  </g>
</svg>
```

**Verbindliche Regeln:**

| Regel | Wert | Prüfung |
|---|---|---|
| `width`/`height` in `mm` | immer | Attribut-Test |
| `viewBox` == mm-Maße | `viewBox="0 0 {w} {h}"` | Test |
| **1 SVG-Einheit = 1 mm** | ja | Kalibriertest (50 mm = 50 Einheiten) |
| Rollen als CSS-Klassen **und** `data-`Attribute | ja | damit Plotter/Laser filtern können |
| Keine externen Ressourcen | keine Fonts per URL, Systemfont-Stack | NFR-11 |
| Keine `transform`-Skalierung an Teilen | Maße stehen in den Koordinaten | sonst unbrauchbar für Plotter |
| Ein `<g>` pro Schnittteil, mit `id` | ja | Einzelteil-Export (FR-76) |
| Text als `<text>`, nicht als Pfad | ja | lesbar, durchsuchbar |

**Die Rollen-Klassen sind der Professionell-Trick:** Ein Lasercutter-Besitzer kann
`class="cut"` schneiden und `class="sew"` gravieren. Ein Plotter kann `cut` und `sew` als
zwei Stifte fahren. Das macht den SVG-Export **produktionstauglich** statt nur „vektoriell".

**Linienstile (verbindlich, damit PDF und SVG gleich aussehen):**

| Rolle | Strich | Stärke | Farbe |
|---|---|---|---|
| `cut` | durchgezogen | 0,4 mm | schwarz |
| `sew` | gestrichelt (3/2 mm) | 0,25 mm | grau 60 % |
| `fold` | strichpunktiert (6/2/1/2) | 0,3 mm | grau 40 % |
| `grain` | durchgezogen + Pfeilspitze | 0,25 mm | schwarz |
| `mark` | kurzer Strich (3 mm) | 0,3 mm | schwarz |
| `opening` | durchgezogen | 0,4 mm | schwarz |

> **Warum Strichstärken in mm und nicht in px:** Ein 0,4-mm-Strich ist auf Papier sichtbar und
> auf einem Projektor projizierbar. In px wäre er bei jeder Skalierung falsch.

### 3.2 PDF

**Zwei Pfade, bewusst beide vorgesehen:**

| Pfad | Wie | Vorteil | Nachteil | Einsatz |
|---|---|---|---|---|
| **A — SVG-Druck** (`window.print()` + `@page`) | HTML/CSS mit `mm`-Einheiten, Browser druckt vektoriell | null Abhängigkeit, echte Vektoren, druckdialog-vertraut | Nutzer muss „100 %" wählen; In-App-Browser ohne Druckdialog | **Primär** |
| **B — `pdf-lib`** | programmatisch im Browser erzeugt | echter Sofort-Download, **deterministische Bytes**, kein Dialog | Fonts einbetten, eigene Zeichenlogik | **Fallback** + Projektor/SVG-Alternative |

**Empfehlung:** Pfad A als Standard (billig, gut), Pfad B als **Ergänzung** dort, wo A nicht
verfügbar ist (In-App-Browser) und für **reproduzierbare Bytes** (Tests!). Ein `pdf-lib`-Test
kann byte-genau vergleichen, ein Druckdialog nicht — das ist für die Determinismus-Anforderung
(P4, Abnahme Q2) wertvoll.

**Seitenstruktur (verbindlich, PRD FR-84 / FR-95):**

```text
Seite 1   Deckblatt
          · Projektname, Grundform, Maße
          · Zusammenfassung: Teile, Material, geschätzte Zeit
          · Warnhinweis: "Vor dem Zuschnitt Testnähen empfohlen"
          · Offene Warnungen (wenn 'warn' vorhanden)
          · Kalibrierfeld 50 × 50 mm  ← HIER, auf Seite 1 (FR-74)

Seite 2   Materialliste (exakt/geschätzt getrennt, mit Grundlage)
Seite 3   Zuschnittübersicht (welches Teil, welche Anzahl, welcher Stoff)
Seite 4   Seitenübersicht / Klebematrix (Miniaturansicht aller Teile-Seiten)
Seite 5–n Schnittteile, getiled, mit:
          · Stückname, Zuschnittzahl, Material, Maße
          · Fadenlauf, Faltlinie, Knipse
          · Seiten-ID ("B2") und Klebemarken an jeder Kante
          · Übergangsmarken ("hier kleben: B2 → B3")
Seite n+1 Nähanleitung (Schritte mit konkreten Zahlen)
```

### 3.3 Tiling (Seitenaufteilung)

```text
Nutzbare Fläche je Blatt:
  A4     210 × 297 mm   − 10 mm Rand   − 10 mm Klebestreifen  → 190 × 287
  Letter 216 × 279 mm   − 10 mm        − 10 mm                → 196 × 269
  A3     297 × 420 mm   − 10 mm        − 10 mm                → 277 × 410
  A0     841 × 1189 mm  (ein Teil, kein Tiling)

Verfahren: sequentielles Tiling am Teil-Bounding-Box
  cols = ceil(teilBreite  / nutzbareBreite)
  rows = ceil(teilHöhe   / nutzbareHöhe)
  → jede Kachel bekommt 10 mm Überlappung mit der Nachbarkachel
  → Klebemarken: Linie + Kreuz an jeder Kachelkante
  → Seiten-ID: Spalte als Buchstabe, Zeile als Zahl ("A1", "A2", "B1")

Teil größer als A0 → Flag "zu groß für Hausdruck" (wie Katagami/Print+Cut+Sew)
```

**Zwei Filter vor dem Tiling** *(Architekturprüfung H-08, M-12)*:

1. **`pieces.filter(p => p.exportable)`** — Längenmaterial (`kind: 'length'`, z. B. Gummiband) hat
   keine Fläche und wird **nicht** getiled. Es erscheint in der Materialliste (Seite 2) und in den
   `measurements[]` der Anleitung. Ohne diesen Filter erzeugt `cols = ceil(0 / 190) = 0` eine leere
   Seite oder eine Division durch 0.
2. **`ExportMeta`** wird beim Export in die Fußzeile von Seite 1 geschrieben:

```text
Berechnet mit Praxiswerten 1.0.0 · App 1.2.3 · 26.11.2026
```

   Grund: Nach einer Kalibrierung (Testnähung, `construction-rules.md` §7) erzeugt **dasselbe**
   Projekt ein **anderes** PDF. Wer ein ausgedrucktes Muster nachnäht, muss erkennen können, welche
   Werte darin stecken. `ExportMeta` gehört **nicht** ins Projekt und **nicht** in `construct()` —
   sonst wäre es eine Zeitangabe in der Konstruktion (Verstoß gegen P4).

**Drei Regeln, die den Unterschied zwischen „benutzbar" und „unbrauchbar" machen:**

| # | Regel | Warum |
|---|---|---|
| **E1** | **Überlappung 10 mm** an jeder Kachelkante, mit sichtbaren Klebemarken | Ohne Überlappung klebt man auf Stoß und es verschiebt sich um Millimeter |
| **E2** | **Jede Kachel trägt ihren Namen** (A1, A2 …) **und die Angabe der Nachbarn** („verbinden mit A2") | Sonst ist das Puzzle unlösbar |
| **E3** | **Ein Teil wird nie über eine Kachelkante hinweg „vergessen"** — Überlappungsprüfung mit `rectsOverlap` | Abgeschnittene Nahtlinie = unbrauchbares Muster |

> **E1–E3 sind genau die Punkte, an denen sich gute von schlechten PDF-Schnittmustern
> unterscheiden.** Phase 1 (`competitors.md` §4.1) zeigt, dass Print + Cut + Sew sie beherrscht
> („join them using the page map and alignment marks") — die Messlatte liegt also hoch.
> **Das ist kein Nice-to-have, sondern Eintrittsbedingung.**

### 3.4 Kalibrierung — der Vertrauensanker

```text
Auf Seite 1, prominent, mit Rahmen und Beschriftung:

   ┌───────────────────────┐
   │                       │
   │      50 × 50 mm       │   ← exakt 50,0 × 50,0 mm bei korrektem Druck
   │                       │
   └───────────────────────┘
   "Mit dem Lineal messen. 50 mm = richtig gedruckt.
    Bei Abweichung: Druck ohne Seitenanpassung / 100 % wählen."
```

**Warum das unverzichtbar ist [A]:** Browser-Druckdialoge skalieren standardmäßig („An Seite
anpassen"). Ohne Kalibrierfeld merkt der Nutzer erst nach dem Zusammensetzen von 8 Seiten, dass
alles 4 % zu klein ist — und schreibt dann eine schlechte Bewertung. Katagami (`50 mm
Kalibrierfeld`) und Print + Cut + Sew machen es; es ist Industriestandard.

**Zusätzlich als Test (NFR-15):** Ein Playwright-Test erzeugt das PDF, ein CI-Job prüft die
`pageBox`/`MediaBox`-Maße und die Position des Kalibrierrechtecks (bei Pfad B byte-genau möglich).

### 3.5 Projektor-Modus (Stufe 2, `S`)

Ein SVG für Deckenprojektion auf Stoff: invertiert (weiße Linien auf transparentem/schwarzem
Grund), nur `cut`-Linien, sehr dünne Striche, keine Labels, keine Klebemarken.

**Nicht im MVP**, aber architektonisch trivial: Es ist dieselbe `Construction`, ein anderer
Renderer-Preset. Deshalb steht es in `S` und nicht in `W`.

### 3.6 JSON-Projektdatei

*(Details in [`pattern-data-model.md`](pattern-data-model.md) §7)*

**Der Export enthält `Project`, nicht `Construction`.** Begründung: Nur Absicht ist importierbar
— sonst könnte eine Konstruktion eingeschleust werden, die das Regelwerk nicht erzeugt hat.

### 3.7 Anleitung

**Nicht ein separates Format, sondern ein Abschnitt im PDF** (und als Text kopierbar).

```text
NÄHANLEITUNG — Nadel-Etui, 240 × 180 mm

VORBEREITUNG
  1. Bügle die Verstärkung H250 auf die linke Seite von: Panel Außen, Nadelkanal,
     Stofffach. (3 Teile)
  2. Schneide das Gummiband auf 154 mm. Markiere bei 5,0 / 24,0 / 43,0 / 62,0 /
     81,0 / 100,0 mm.                                   ← KONKRETE ZAHLEN (FR-81)

TEIL 1 — Nadelkanäle (8 Stück)
  3. Schlage die Oberkante jedes Nadelkanals 8 mm ein und steppe sie knappkantig.
  4. Hefte die 8 Kanäle auf das vordere Futterpanel: Unterkante bündig mit der
     Panelkante, 10 mm Abstand zwischen den Kanälen.
  5. Steppe die Trennähte von unten nach oben, am oberen Ende verriegeln.
     ⚠️ Vor der Panelnaht — danach nicht mehr erreichbar.   ← REIHENFOLGE (FR-82)

TEIL 2 — Elastikreihe
  6. Stecke das Band an den Markierungen fest, Schlaufen nach oben.
  7. Steppe an jeder Markierung quer über das Band, verriegeln.

TEIL 3 — Verschlusslasche
  8. Falte die Lasche längs, beide Kanten zur Mitte, erneut falten, Kanten steppen.
  9. Hefte die Lasche an die markierte Stelle, Zulage 10 mm innen.

ZUSAMMENBAU
 10. Lege Außenpanel rechts auf rechts auf das Futterpanel. Steppe rundherum,
     10 mm Nahtzugabe, 8 cm Wendeöffnung an der Unterkante.
 11. Kanten zurückschneiden, Ecken schräg, wenden, bügeln.
 12. Wendeöffnung schließen, knappkantig absteppen.
```

**Vier verbindliche Eigenschaften:**

| # | Eigenschaft | Warum |
|---|---|---|
| **A1** | Schritte enthalten die **Zahlen der Konfiguration** | FR-81; „gleichmäßig verteilen" ist der häufigste Grund, warum generierte Anleitungen nutzlos sind |
| **A2** | Reihenfolge aus dem Operationsgraphen, inkl. Warnhinweisen an kritischen Kanten | FR-82; `⚠️ vor der Panelnaht` ist die wertvollste Zeile im ganzen Dokument |
| **A3** | Jeder Schritt nennt **Teile und Materialien** | FR-83 |
| **A4** | Kein Schritt ohne Bezug auf ein real existierendes Teil | Test: jede `PieceId` existiert, jede referenzierte Menge stimmt |

> **Die wertvollste Differenzierung liegt nicht im Schnittmuster, sondern in Zeile 5.**
> Ein generiertes Muster, das die Reihenfolge *begründet*, ist besser als eines, das nur Schritte
> listet — und Phase 1 zeigt, dass Nutzer:innen genau daran scheitern (Sewist: „instructions are
> quite bare bones").

---

## 4. Dateinamen (FR-94)

```text
{slug}-{breite}x{hoehe}mm-{grundform}-{yyyy-mm-dd}.{ext}

nadel-etui_240x180mm_buch_2026-11-26.pdf
nadel-etui_240x180mm_buch_2026-11-26.svg
nadel-etui_240x180mm_buch_2026-11-26.json

Regeln:
  · slug aus Projektname: transliteriert (ä→ae), lower-case, [a-z0-9-], max 40 Zeichen
  · Maße immer in mm, ohne Einheit im Namen ("240x180mm" nicht "24x18cm")
  · kein Datum in der Anzeige, aber im Dateinamen (Sortierung, Versionierung)
  · bei gleichem Namen: Suffix -2, -3 (nie überschreiben im Download-Ordner)
```

**Warum das wichtig ist:** Ein Ordner mit `download(3).pdf`, `download(4).pdf` ist der Feind der
Wiederauffindbarkeit. Nutzer:innen dieses Segments arbeiten mit ausgedruckten Ordnern (Phase 1:
Papier ist der Arbeitsmodus). Sprechende Namen sind ein kleiner, aber echter Nutzen.

---

## 5. Fehlerbehandlung

| Fall | Verhalten | Begründung |
|---|---|---|
| **Offene `error`-Findings** | Export **deaktiviert** mit Tooltip + Direktlink zur Warnliste | FR-51; ein nicht nähbares Muster zu drucken zerstört Vertrauen |
| **Offene `warn`-Findings** | Export **erlaubt**, Warnungen auf Deckblatt | FR-95 |
| **Teil größer als Blatt** | Flag auf Deckblatt: „Teil X ist 400 mm breit — A0 oder Copyshop nötig" | wie Katagami/Print+Cut+Sew |
| **Kein Druckdialog** (In-App-Browser) | Fallback auf `pdf-lib`-Download | F15 |
| **PDF-Erzeugung schlägt fehl** | Fallback-Kette: PDF → SVG → Maßliste kopieren | immer ein Ausweg |
| **Stoffbreite zu klein für ein Teil** | `warn` bereits bei Konstruktion (`V-G-12`); Export erlaubt mit Hinweis | – |
| **SVG sehr groß** (> 5 MB) | Warnung + Vorschlag: Teile einzeln exportieren | Performance |
| **Projekt > 8.000 Zeichen kodiert** | Kein Teilen-Link, stattdessen Datei | `pattern-data-model.md` §7.1 |

---

## 6. Teststrategie des Exports

### 6.1 Die Tests, die zählen

| # | Test | Erwartung | Werkzeug |
|---|---|---|---|
| **T-X-01** | SVG: `width`, `height`, `viewBox` in mm, konsistent | 1 Einheit = 1 mm | Vitest (XML-Parse) |
| **T-X-02** | **Kalibrierrechteck ist exakt 50,0 × 50,0 mm** im SVG **und** im PDF | ±0 mm im SVG, ±0,1 mm im PDF | Parse + `pdf-lib`-Inspektion |
| **T-X-03** | SVG-Geometrie == Canvas-Geometrie (Hash) | identisch | Golden |
| **T-X-04** | Tiling: **kein Teil** wird an einer Kachelkante abgeschnitten | Überlappungsprüfung | Unit |
| **T-X-05** | Tiling: jede Kachel hat ID + Nachbarnennung | vollständig | Unit |
| **T-X-06** | Überlappung zwischen Kacheln = 10 mm | exakt | Unit |
| **T-X-07** | Rollen-Klassen vorhanden (`cut`, `sew`, `fold`, `grain`, `mark`) | alle | Unit |
| **T-X-08** | Anleitung enthält **alle** Zahlen aus `measurements[]` | vollständig | Snapshot + Cross-Check |
| **T-X-09** | Anleitung: jede `PieceId` existiert | vollständig | Unit |
| **T-X-10** | Dateiname entspricht Schema | Regex | Unit |
| **T-X-11** | PDF-Struktur: Deckblatt → Material → Teile → Anleitung | Reihenfolge | `pdf-lib`-Parse |
| **T-X-12** | Export bei `error` blockiert | Button disabled | Playwright |
| **T-X-13** | 2 Exporte → identische Bytes (Pfad B) | identisch | Vitest |
| **T-X-14** | Druckausgabe bei 100 % ergibt 50 mm (physisch) | ±0,5 mm | **manuell, dokumentiert** |
| **T-X-15** | Kein externer Request beim Export | 0 | Playwright-Interception |
| **T-X-16** | Kein exportierbares Teil mit Fläche 0; `kind: 'length'`-Teile tauchen in keiner Kachel auf | 0 | Unit |

**T-X-14 ist der einzige Test, der nicht automatisiert werden kann** — und der wichtigste. Er
gehört in die Abnahme (PRD Q4) und muss mit Foto/Scan dokumentiert werden.

### 6.2 Was nicht getestet wird (und warum)

| Nicht getestet | Grund |
|---|---|
| Optische Qualität des Drucks | subjektiv, druckerabhängig |
| Alle Druckertreiber | nicht beherrschbar; Kalibrierfeld ist die Antwort |
| Plotter-/Laser-Kompatibilität | keine Hardware im Projekt; SVG-Standard + Rollen-Klassen sind die Zusage |
| PDF/A-Konformität | nicht nötig (kein Archivierungsbedarf) |

---

## 7. Offene Entscheidungen

| # | Entscheidung | Optionen | Fällig |
|---|---|---|---|
| **X1** | PDF-Pfad A (Druck) oder B (`pdf-lib`) als **Standard** | A ist billiger und druckdialog-vertraut; B ist deterministisch und ohne Dialog | **Woche 6, Prototyp** |
| **X2** | Kalibrierfeld zusätzlich **am Fuß jeder Seite**? | Mehr Vertrauen vs. mehr Tinte/Verwirrung | Woche 6 |
| **X3** | SVG-Einzelteile-Export (FR-76) im MVP? | billig, aber `S`-Priorität | Woche 8 |
| **X4** | Zuschnittplan als Bild (aus `material-calculation.md` L-8) | **hoher Nutzen, günstig** — Kandidat für MVP-Nachzügler | nach MVP |
| **X5** | Illustrierte Schritt-Diagramme | `C`; Text mit Zahlen zuerst | Stufe 2 |
| **X6** | Seitenformat-Default je Locale (A4 in DE, Letter in US) | trivial, aber richtig | Woche 6 |

**X4 ist die interessanteste:** Ein Zuschnittplan („so legst du die Teile auf den Stoff") ist
günstig (Packing läuft schon), sichtbar wertvoll und von Print + Cut + Sew **nicht** angeboten.
Er wäre die billigste echte Differenzierung nach dem MVP — günstiger als M06 und mit
unmittelbarem Nutzen im Stoffladen (Phase 1: der wertvollste Moment).
