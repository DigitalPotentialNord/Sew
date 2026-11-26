# Wettbewerberanalyse

Stand: 26.11.2026 · Methode und Beweisregeln: siehe [`README.md`](README.md)

**Umfang:** 32 Anbieter in 4 Kategorien, davon 14 mit Einzelprofil, 11 mit tieferer Prüfung.
Zusätzlich die 10 kritischen Prüffragen aus dem Briefing und eine explizite Antwort auf die
zentrale Forschungsfrage.

---

## 1. Beweislage: was „geprüft" hier heißt

Der Auftrag verlangt, zwischen *nachweislich vorhandenen*, *beworbenen* und *tatsächlich
getesteten* Funktionen zu trennen. Deshalb drei getrennte Spalten und drei Zustände:

| Symbol | Bedeutung | Was ich dafür getan habe |
|---|---|---|
| ✅ **belegt** | Funktion am 26.11.2026 auf der Anbieterseite, in der Doku oder in einer Primärquelle nachgelesen | Seite geöffnet und Formulierung/Feature-Liste geprüft |
| 🟡 **beworben** | Anbieter behauptet es, ich habe es **nicht** selbst ausgeführt | Marketing-Text gelesen, nicht verifiziert |
| ❌ **fehlt** | laut Quelle/Doku nicht vorhanden – oder Funktion existiert nicht | geprüft, negativ |
| — | nicht anwendbar / nicht öffentlich |

**Ehrliche Einschränkung:** Ich habe **kein** Konto bei einem der Anbieter angelegt und
**kein** Schnittmuster gedruckt und vernäht. „Getestet" bedeutet hier: **Oberfläche,
Parameterlisten, Ausgabelisten und Preisseiten tatsächlich gelesen und gegeneinander
geprüft** – nicht „durchgeklickt bis zum fertigen PDF". Das ist die belastbarste Aussage,
die ohne Account-Anlage und ohne Testnähung möglich ist. Für die Go/No-Go-Entscheidung ist
sie ausreichend, weil die entscheidenden Fragen (Existiert die Funktion? Ist sie gratis?
Wie viele Freiheitsgrade hat sie?) an der Oberfläche beantwortbar sind.

---

## 2. Der Markt in vier Kategorien

| # | Kategorie | Anbieter | Rolle für die Produktidee |
|---|---|---|---|
| **A** | Parametrische Gratis-Generatoren | Print + Cut + Sew, Katagami, Nastix Patterns, Atomm, Sarah Kirsten (Calculators), Erb-Schatz Boxy-Bag-Rechner, DraftMySize | **direkte Substitute** – liefern das Ergebnis, das die Idee verspricht |
| **B** | Konstruktions-CAD | OpenSloper, Seamly2D, Valentina, Sewist CAD, Wild Ginger PatternMaster, SeamScape, Optitex, Gerber AccuMark | **technische Referenz** + Beleg, dass freie Konstruktion lösbar ist |
| **C** | KI- & Automatisierungs-Tools | Ourlette, IntelliSeam, MPattern, Seamcult, CLO 3D (AI Pattern Drafter), Tailornova | **Erwartungs-Treiber** – verschieben, was Nutzer:innen für selbstverständlich halten |
| **D** | Marktplätze & Content | Etsy, Sewunity, Ravelry, Makerist (†), Pinterest, YouTube, Craftsy/Seamwork | **Distribution & Nachfrage**, kein Funktionswettbewerb |

---

## 3. Hauptvergleichsmatrix

### 3.1 Matrix A – Konstruktion & Editor

| Anbieter | Produktumfang | Individualisierung | Drag & Drop | Visueller Editor | Parametrische Konstruktion | Schnittmuster-Erstellung |
|---|---|---|---|---|---|---|
| **Print + Cut + Sew** | 50+ Generatoren (Pouches, Bags, Organizer, Home, Garments) | Maße in cm/mm/inch, Presets, Options-Schalter | ❌ (Formular → Live-Vorschau, keine freie Platzierung) | ✅ Live-Preview der Schnittteile + „fertiges Stück" | ✅ belegt (Maße → Geometrie; Zipper-/Elastiklängen berechnet) | ✅ automatisch |
| **Katagami** | 293 Patterns, statische Web-App | fertige Maße in 1-cm-Schritten, Nahtzugabe 0–3 cm | ❌ | ✅ Live-SVG | ✅ (patterns.js, deklarativ) | ✅ |
| **Nastix Patterns** | 30+ Blöcke & Details, plus „Projekte" aus mehreren Generatoren | Maße + Presets + Konstruktionsvariante | ❌ | ✅ Draft-Preview | ✅ | ✅ |
| **Atomm Sewing Bag Pattern Generator** | 4 Bag-Styles | Maße (W/T/H), Stoffe, Name | ❌ | ✅ | ✅ | ✅ |
| **OpenSloper** | Voll-CAD: Blöcke, Styles, Pieces, Seams, Features | Formeln/Variablen, Measurement-Files | ✅ Canvas mit Snapping (Punkte ziehen) | ✅ vollwertiger 2D-Editor | ✅ **Formel-Engine mit Abhängigkeiten** | ✅ inkl. Nahtzugabe, Notches, Grainline |
| **Seamly2D / Valentina** | Voll-CAD, 3 Workbenches (Draw/Detail/Layout) | Variablen-Tabellen, Measurement-Files | ✅ (Punkt-Werkzeuge) | ✅ | ✅ | ✅ |
| **Sewist CAD** | Voll-CAD + Skriptsprache + Mix-and-Match + Shop | Maßtabellen, Grading, Fabric-Settings | 🟡 | ✅ | ✅ (eigene DSL) | ✅ |
| **Wild Ginger PatternMaster** | Modulare Programme (Women/Men/Kids/Knits/Cameo) | Messprofile, Style-Auswahl | ❌ | ✅ (Pattern Editor) | ✅ | ✅ |
| **Tailornova** | Templates + MTM + 3D-FitModel | Körpermaße, Style-Mix (Ausschnitt/Ärmel) | ❌ | ✅ | ✅ | ✅ + Grading + DXF |
| **Seamcult** | Geometrie-Core + Mannequin + Audits, agentengetrieben | über Agent (MCP) | ❌ (Chat/Annotation) | ✅ Review-Canvas | ✅ | ✅ PDF/PLT/DXF |
| **CLO 3D** | Profi 2D+3D | alles | ✅ | ✅ | ✅ | ✅ |
| **Ourlette** | 76 getestete Modelle + KI aus Foto/Prompt | Maße, Länge, Ausschnitt, Ärmel, Fit | ❌ | ✅ + 3D | ✅ | ✅ |
| **MPattern** | Katalog + KI-Grading + Projektor-Modus | Messprofile | ❌ | 🟡 | ✅ | ✅ PDF/SVG/DXF |

### 3.2 Matrix B – Output, Fertigung, Anleitung

| Anbieter | Nahtzugaben | Materialberechnung | Zuschnitt-/Layout-Optimierung | PDF | SVG | 3D-Vorschau | Nähanleitung |
|---|---|---|---|---|---|---|---|
| **Print + Cut + Sew** | ✅ inkl. & markiert, Interfacing **ohne** NZ | ✅ „Main fabric about 0.4 m of 112 cm fabric" | ❌ (kein Nesting; Stücklisten-Maße stattdessen) | ✅ A4/Letter-Tiling + A0/Rolle | ❌ **kein SVG** | ❌ | ✅ **kontextabhängig generiert** (Schritte passen sich den Optionen an) |
| **Katagami** | ✅ 0–3 cm einstellbar, Nahtlinie ein-/ausblendbar | ❌ | ❌ | ✅ A4/Letter-Tiling, 50-mm-Kalibrierfeld | ✅ (SVG-Rendering) | ❌ | ✅ bebilderte How-tos |
| **Nastix** | ✅ pro Generator | 🟡 (Fabric-Width-Feedback) | ❌ | ✅ A4/Copyshop + 5×5-cm-Testquadrat | ✅ | ❌ | 🟡 Projekt-Anleitungen |
| **Atomm** | ✅ „seam allowances already marked" | 🟡 | ❌ | ✅ „print-and-cut" | 🟡 | ✅ **3D** | 🟡 illustrierte Guides |
| **OpenSloper** | ✅ echte NZ-Objekte, Seam-Length-Checks | ✅ **Roll-/Sheet-Material prüfen + Verbrauch berechnen** | ✅ **Nesting/Packing** („Pack pieces nest them by shapes") | ✅ mit eingebetteten Fonts | ✅ SVG + PNG | 🟡 „Garment tab: pieces as sewn" (2D-Simulation, keine 3D-Engine) | ✅ Notes/Callouts, Live-Werte |
| **Seamly2D / Valentina** | ✅ | 🟡 | ✅ Layout-Workbench | ✅ | ✅ | ❌ | ❌ |
| **Sewist CAD** | ✅ | ✅ (Fabric Layout, Yardage) | ✅ (Online-Fabric-Layout) | ✅ | ✅ | 🟡 (2D/3D beworben) | ✅ **automatisch generierte** Nähanleitung |
| **Wild Ginger** | ✅ | ✅ | 🟡 | ✅ | 🟡 | ❌ | ✅ Style-Summaries |
| **Tailornova** | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ + Tech Packs (Pro) |
| **Seamcult** | ✅ | 🟡 | 🟡 Lay Plans | ✅ | ✅ (via DXF/PLT) | 🟡 Mannequin | ❌ |
| **CLO 3D** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅✅ (fotoreal) | 🟡 |
| **Ourlette** | ✅ | ✅ „fabric quantities" | 🟡 „cutting layout" | ✅ A4/A3/A0/36×48/Projektor | 🟡 | ✅ + Stoffmuster | ✅ „guide you can talk to" |
| **MPattern** | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ |

### 3.3 Matrix C – Geschäftsmodell, Zielgruppe, Schwäche

| Anbieter | Preis (26.11.2026) | Geschäftsmodell | Zielgruppe | Größte Schwäche gegenüber der Idee |
|---|---|---|---|---|
| **Print + Cut + Sew** | **0 €**, keine Werbung, **kein Konto** | keins / Hobby-Projekt | Hobby-Näher:innen, Anfänger | **Template-gebunden**: Innenleben nur als Parameter (Elastikreihen, Fächer, Tiefe) – **keine freie Platzierung, keine Modulbibliothek, kein Objekt-Modell, kein SVG, kein 3D** |
| **Katagami** | **0 €** | keins (Einzelperson) | Anfänger, Spielzeug/Kuscheltiere | kein Innenleben-Konzept, keine Organizer-Module, keine Materialberechnung |
| **Nastix** | **0 €** | Lead-Gen/Portfolio | Semi-Profi | Kleidungsfokus, Detail-Generatoren einzeln, kein Organizer-Innenraum |
| **Atomm** | **0 €** (Ökosystem) | **Hardware-Verkauf (xTool)** | Laser-/Schneide-Maker | nur 4 Außenformen, **kein Innenleben-Editor**; Strategie dient dem Maschinenverkauf |
| **OpenSloper** | **0 €**, GPLv3 | Open Source | Pattern Maker, Semi-Profi | **Steile Lernkurve, keine Module, kein Organizer-Wissen, keine Nähanleitung**, Desktop-App |
| **Seamly2D / Valentina** | **0 €**, GPL | Open Source | Semi-Profi, Ausbildung | Lernkurve, Doku dünn, kein Content, keine Module |
| **Sewist CAD** | Gestalten gratis, Fremdpattern 3,95 USD | Marktplatz + Shop provisionen | Semi-Profi, Verkäufer | Bedienung „website looks old" (Nutzerzitat), Skript-Denke, kein Organizer-Modul |
| **Wild Ginger** | 50–175 USD/Modul, Cameo bis 850 USD | Einmalkauf | Bestandskund:innen, Semi-Profi | Windows-Desktop, altmodisch, **Lizenz verbietet Verkauf der Patterns** |
| **Tailornova** | 29 / 49 / 79 USD **pro Monat** | Abo | Indie-Designer, Boutique | reines Kleidungs-MTM, kein Innenleben, Abo-Hürde für Hobby |
| **Seamcult** | nicht öffentlich (Frühphase) | noch offen | Technische Pattern Maker | Agenten-Workflow setzt Können voraus; kein Objekt-Editor für Laien |
| **CLO 3D** | 50 USD/Monat | Abo | Industrie/Profi | Preis, Komplexität, kein Interieur-Konzept |
| **Ourlette** | Gratis-Tier (76 Modelle) + Pläne | Freemium-Abo | Hobby, Content-Creator | **Kleidung fokussiert**; Objekt-Interieur nicht adressiert |
| **MPattern** | 19,99 € einmalig + 2,99 €/Monat optional | Einmalkauf + Cloud-Abo | Hobby-Näher:innen | Kleidung, keine Organizer, KI-Grading statt freie Konstruktion |

---

## 4. Einzelprofile der kritischen Wettbewerber

### 4.1 Print + Cut + Sew — **der gefährlichste Wettbewerber**

`printcutsew.app` · gratis · kein Konto · keine Werbung · Betreiber einzelpersonenhaft

**Belegte Fakten (alle am 26.11.2026 auf der Seite gelesen) [B]:**

- **50+ Pattern-Seiten**: Zip Pouch, Boxy Pouch, Pocket Tissue Holder, **Zip-Around Organiser**,
  Wallet, Device Sleeve, Half-Moon Pouch, Dumpling Pouch, Bags, **Bag Organiser Insert**,
  **Tool Belt**, **Roll-Up Pencil or Brush Case**, Bedside Caddy, Aprons, Home, Hats,
  simple Garments. Selbstbeschreibung: *„Free to use, with no ads and no account"* **[F]**.
- **Zip-Around Organiser** – die Parameterliste ist der direkte Angriff auf die Produktidee:
  - *„Set the closed size, **elastic rows, loop divisions and pocket depth**. Add a gusset for
    thicker contents; **the pattern calculates elastic and zip lengths**."* **[F]**
  - Änderbar: Closed width 7–30 cm, Closed height 7–30 cm, **Spine width, Gusset depth,
    Corner radius, Elastic bands, Elastic width, Band positions from the top, Equal sections
    OR section widths, Item thickness, Pocket depth, Pocket sections**, Zip tape width.
  - Berechnet: Elastiklänge pro Loop (*„section's width plus twice the item's thickness, less
    a little so the loop grips"*), Reißverschlusslänge (Summe der Kanten am Zahn, mit Kurven).
  - Ausgabe: **Zuschnittliste** (Outer/Lining/Pocket/Interfacing, mit „Cut 1" und Maßen),
    **Stoffschätzung** („Main fabric about 0.2 m of 112 cm fabric"), **9-Schritt-Nähanleitung**,
    A4-Tiling (3 Seiten) bis A0/36"-Rolle.
- **Roll-Up Case** analog: Panel 15–65 cm × 12–60 cm, **Pocket rows als Liste**, Row-1 flat
  pockets, Row-2 elastic loops, Tie-Länge; Zuschnittliste mit 10 Fächern à 3,4 cm; 10 Schritte.
- **Explizite Positionierung als „pattern maker"**: jede Seite heißt „Pattern Maker", jede
  Seite enthält „How to set up the pattern" und „FAQ".

**Was fehlt (und zwar wirklich) [B]:**

| Fehlt | Konsequenz |
|---|---|
| **Freie Platzierung** – kein Ziehen, kein Objekt auf einer Fläche | Innenleben nur *innerhalb* eines Templates konfigurierbar |
| **Modulbibliothek** über Templates hinweg | keine Ohrringhalter, Kettenhaken, Pinselhalter, Nadelkanäle als wiederverwendbare Objekte |
| **Abhängigkeiten zwischen Modulen** (Kollision, Überlappung, „passt nicht in die Tiefe") | kein Constraint-Solver → Nutzer:innen müssen selbst denken |
| **3D** | keine Vorstellung vom Ergebnis |
| **SVG** | kein Plotter-/Laser-/Projektor-Workflow |
| **Zuschnitt-Nesting** | Stoffverschnitt nicht optimiert |
| **Konto / Speichern / Teilen** | kein Projektgedächtnis, keine Wiederkehr |

**Bewertung [A]:** Print + Cut + Sew hat **80 % des Nutzenversprechens bereits eingelöst – für
0 €**. Was fehlt, ist genau die **Freiheit** (Objektmodell, Drag & Drop, Abhängigkeiten) und
der **professionelle Output** (SVG, 3D, Nesting). Das ist ein schmales, aber klar definiertes
Delta. Wer die Idee baut, ohne diesen Wettbewerber zu schlagen, baut ein schlechteres
Gratis-Produkt.

**Zusätzliche Beobachtung [A]:** Der Betreiber ist erkennbar eine kleine Einheit
(„an individually run" Stil, kein Impressum mit Firma, keine Preise). Das heißt: **Das
Produkt ist ohne Kapital gebaut.** Es ist also auch **technisch ohne Kapital angreifbar** –
aber es setzt den Preis-Anker.

---

### 4.2 Atomm (xTool) — Sewing Bag Pattern Generator

`atomm.com/creativetools/sewing-bag-pattern-generator` · gratis · Teil des xTool-Ökosystems

**Belegt [B]:**
- *„Customize **four bag styles** with your own dimensions, fabrics and names. **Preview the
  finished bag in 3D**, then export **print-and-cut sewing patterns with seam allowances
  already marked**."*
- 3 Schritte: Style wählen → Maße (W/D/H) + Stoffe + Name → **3D-Preview rotieren** → Export.
- Vermarktete Zielgruppen: *Bag-Making Beginners, Gift Makers, Sewing Teachers & Clubs,
  Small-Batch Sellers* – mit dem Verkaufsargument *„Keep a dimension set for each bestseller
  and reprint the pattern any time"*.
- Zusätzlich: *Custom Sewing Pattern Generator* für *„coasters, bags, sleeves and book
  covers"*, plus Personalisierungs-Generatoren (Monogramm, Name) und **StitchPrint**-Embroidery.

**Bewertung [A]:** Atomm ist strategisch der interessanteste Gegner: Ein **Hardware-Hersteller
verschenkt Schnittmuster-Software inkl. 3D**, um Maschinen zu verkaufen. Damit ist der Preis
für „parametrisch + 3D + Nahtzugabe" dauerhaft auf **0 €** gesetzt. Was Atomm **nicht** hat:
Innenleben. Vier Außenformen, keine Module, keine Interieur-Konfiguration. Das ist die
sauberste Lücke im ganzen Feld – **aber** Atomm könnte sie mit einem Generator-Updates in
Wochen schließen, ohne Umsatz zu brauchen.

---

### 4.3 OpenSloper — die technische Referenz (Open Source)

`opensloper.com` · gratis · GPLv3 · Version 0.6.0 · Linux/macOS/Windows

**Belegt [F/B] (Feature-Liste der Projektseite gelesen):**
- **Formeln, nicht feste Größen**: *„Points, lines and curves are placed by formulas that read
  your measurements and variables, such as a quarter of the waist plus ease."*
- **Snap mit Beziehungsspeicherung**: *„Each snap records how a point was placed, so it keeps
  its place when measurements change."* ← **genau die Abhängigkeitslogik, die die Produktidee
  braucht**
- **Pieces per Klick**, mit Nahtzugabe, Notches, Grainline, Materials, Cut counts.
- **Features-Tab**: Reißverschluss, Dart, Saum, Facing, Knopfleiste – *„the points, edges,
  allowances, seams, notches and topstitching … as ordinary objects that one Undo takes off"*
  ← **objektbasierte Konstruktion, bereits existent**
- **Material**: Rollenbreite/Bogenmaß → *„every piece is checked to fit it"*, *„Publish works
  out how much of each material the layout needs"*
- **Packing/Nesting**: *„let Pack pieces nest them by their shapes onto as few pages as it can,
  a small piece tucked into the curve of a larger one"*
- **Garment-Tab** (Stücke „as sewn"), SVG/PNG-Export
- **CLI + Automation API + MCP-Server** („or to Claude as an MCP server"), dokumentierte
  JSON-Schemata

**Bewertung [A]:** OpenSloper beweist, dass **alles Schwierige an der Produktidee bereits
gelöst ist** – in einer kostenlosen Open-Source-Anwendung: Abhängigkeiten, Nahtzugaben,
Materialverbrauch, Nesting, objektbasierte Features, Export. Es fehlt **nur** das
Domänenmodell (Organizer-Module), die **Laien-Bedienung** und der **Content** (Nähanleitung).
Das senkt den Entwicklungsaufwand erheblich – und senkt gleichzeitig den
Differenzierungsanspruch: „wir können Constraints" ist kein Alleinstellungsmerkmal mehr.

**Strategische Konsequenz [A]:** Ein Eigenbau der Geometrie-Engine ist wirtschaftlich
schwer zu rechtfertigen. Prüfen, ob ein Fork/Integration von OpenSloper (GPLv3 → **Achtung:
Copyleft zwingt zur Offenlegung bei Distribution**) oder ein eigener, schlanker Solver auf
Basis eines Constraint-Solvers sinnvoller ist. GPLv3 ist ein **echtes Geschäftsmodell-Risiko**,
wenn ein SaaS darauf aufbaut – juristisch zu klären, nicht im Alleingang zu entscheiden.

---

### 4.4 Seamcult — der Blick in die Zukunft der Bedienung

`seamcult.com` · Preis nicht öffentlich

**Belegt [F]:**
- *„Your **AI agent** drafts the pattern pieces. Seamcult gives the agent a mannequin to draft
  against and checks the geometry. You review the pieces on the canvas. Export as PDF, PLT or
  DXF."*
- Positionierung: *„A pattern design tool for the **LLM era**"*, Anbindung über **MCP**.
- **Pattern Audits**: *„Checks the agent runs to find mistakes in the pattern and fix them.
  Not exhaustive yet"*.
- Mannequin aus Maßen; Annotieren auf dem Canvas („circle a spot and tell the agent").

**Bewertung [A]:** Seamcult zeigt, wohin die Bedienung wandert: **nicht Drag & Drop, sondern
Anweisung + Prüfung + Freigabe.** Für die Produktidee ist das eine Warnung (der manuelle
Editor könnte als Zwischenschritt wirken) und eine Chance (die **Domain-Logik für Organizer**
– „passt ein Ohrringhalter neben einen Pinselhalter in 4 cm Tiefe?" – ist genau die
Audit-Logik, die ein Agent nicht selbst erfindet). Wer die Organizer-Konstruktionsregeln als
prüfbares Modell besitzt, kann sie *sowohl* im Editor *als auch* als Agenten-Tool verkaufen.

---

### 4.5 Sewist CAD — Funktions-Maximalist, Bedienungs-Minimalist

`sewist.com` · Gestalten gratis · Fremdpatterns 3,95 USD · eigene Designs frei & royalty-free

**Belegt [F] (Manual & Produktseite):**
- Eigenwerbung: *„the #1 full scale parametric online pattern drafting software"*, patentiert.
- **Skriptsprache** für Patterns, Size-Tables, **Grading per Klick**, Cloud-Speicher.
- **Fabric-Settings**, **Online-Fabric-Layout (Yardage)**, Spec-Sheets mit Flächen in cm²,
  **automatisch generierte Nähanleitung** inkl. monochromer technischer Zeichnungen.
- Mix-and-Match-Wizards, Templates, Shop, „Job Market", Message Boards, Vergleichsprojekte.
- Fremdpattern-Preis 3,95 USD; eigene Entwürfe frei herunterladbar und **kommerziell
  verwendbar** (royalty-free).

**Nutzerstimmen [F] (Reddit):** *„the website looks old and I'm afraid to get scammed"*;
*„a pretty challenging pattern to follow. The instructions are quite bare bones"*; *„No
instructions"*; *„their pattern being a bit boxy"*.

**Bewertung [A]:** Sewist hat funktional **fast alles** – inklusive automatischer
Nähanleitung und Stofflayout. Es verliert **nicht** an Funktionsumfang, sondern an
**Vertrauen und Bedienbarkeit**. Das ist die wichtigste Lehre für die Produktidee: In diesem
Markt entscheidet **wahrgenommene Zuverlässigkeit und Einfachheit**, nicht Feature-Zahl.

---

### 4.6 Katagami & Nastix — die „0 €-Erwartung"

**Katagami** (`katagami.org`, gratis, kein Login, 293 Patterns, Web-App ohne Server,
`patterns.js` deklarativ, GitHub `apricot626/katagami`) **[F]**:
- Maßeingabe in cm → **Live-SVG** mit Schnittlinie, Nahtlinie, Fadenlauf, „im Bruch", Knipsen.
- **Nahtzugabe 0–3 cm** einstellbar, Nahtlinie ein-/ausblendbar.
- A4-Tiling mit **50-mm-Kalibrierfeld** zur Prüfung der Druckwaage; Daten bleiben im Browser.
- Ehrliche Selbstauskunft: Kleidung mit Körperformvarianz sei *„als Entwurf zum Anprobieren"*
  gedacht, nicht als Passt-sicher; Taschen/Utensilos seien maßhaltig.
- **Kein Organizer-Innenleben, keine Materialberechnung.**

**Nastix Patterns** (`nastix-patterns.com`, gratis) **[B]**:
- 30+ Generatoren (Blöcke + Details: Pattentasche, Nahttasche, Schlitz, Kragen, Manschette …)
  plus **„Projekte"**, die mehrere Generatoren zu einem Kleidungsstück verketten – inkl.
  *„which numbers carry from one pattern to the next, how much fabric the whole thing needs,
  and the order to sew it in"*.
- Export **SVG, Copyshop-PDF, A4-Tiling mit 5×5-cm-Testquadrat**.
- **Das ist architektonisch exakt die Produktidee – nur für Kleidung statt Organizer.**

**Bewertung [A]:** Katagami und Nastix definieren, was Nutzer:innen für selbstverständlich
halten: Maße rein → SVG + PDF + Anleitung raus, gratis, ohne Konto, mit Testquadrat.
**Jedes kostenpflichtige Produkt muss dieses Niveau übertreffen, nicht erreichen.**

---

### 4.7 Tailornova / CLO 3D / Ourlette / MPattern — KI und die Erwartungsfalle

| Anbieter | Belegte Fakten | Relevanz |
|---|---|---|
| **Tailornova** | **29 / 49 / 79 USD pro Monat**; 3D-FitModel aus Maßen, MTM-Patterns, Grading, DXF, Tech Packs; Eigenangabe **210.000 Nutzer** **[F]** | Beweist: Es gibt Zahlungsbereitschaft für „Maße → Pattern + 3D" – **bei Gewerblichen und Semi-Profis**, nicht bei Hobby-Näher:innen |
| **CLO 3D** | **50 USD/Monat**, fotorealistische 3D-Simulation, **AI Pattern Drafter (beta)** laut Help Center Juli 2026 **[F]** | Setzt die 3D-Referenz; für Hobby irrelevant, für B2B der Standard |
| **Ourlette** | Start **08.10.2026**; *„describe a garment or upload a photo, and a drafting engine draws a real pattern to your measurements"*; 76 getestete Modelle gratis, KI in bezahlten Plänen; 3D inkl. Stoffmuster; Export A4–A0/Projektor; *„sewing guide you can talk to"*; **läuft in ChatGPT und Claude** **[F]** | **Der wichtigste neue Gegner.** Zeigt: „Prompt → Pattern" ist 2026 marktreif – und dass Distribution über LLM-Chats erfolgt. Ein Drag-&-Drop-Editor muss erklären, warum Ziehen besser ist als Beschreiben |
| **MPattern** | **19,99 € einmalig** (EU), 3 Patterns gratis, Grading inkl., Export PDF/SVG/DXF, **Projektor-Modus**, optional **2,99 €/Monat** Cloud, DLC-Packs 2,99 € **[F]** | Preis-Referenz: Der Hobby-Markt zahlt **~20 € einmalig**, nicht 10 €/Monat |
| **IntelliSeam** | *„Turn images, sketches, or text prompts into precise, production-ready sewing patterns"*, B2B-Ansprache **[F]** | Zeigt den B2B-Zweig (Marken, Produktion) |

---

### 4.8 Die „Modulbaukasten"-Wettbewerber — der unterschätzte Gegner

**shesmile „Innenleben 1/2/3" für die Handytasche Smartkram** (deutscher Indie-Designer) **[F]**
([shesmile.de](https://shesmile.de/doityourself/naehen/1521-innenleben-3-fuer-die-handytasche-smartkram-schnittmuster-ergaenzung)):

- Verkauft wird *„Schnittmuster für **6 verschiedene Module** und 2 Größen, welche nach
  Belieben kombiniert werden können"*.
- Module: **Innenleben 1** (Steckfach), **Innenleben 2** (Münzfach, 2 Kartenfächer, Schlaufe
  für Kugelschreiber/Nagelfeile), **Innenleben 3** (großes Münzfach, 2 Kartenfächer) – plus
  „mit oder ohne 3 cm Tiefe".
- Vermarktung über *„Designnähen"*: Eine Community-Aktion, in der Käuferinnen die Module
  vernähen und Ergebnisse teilen. **Das ist Community-Engineering als Verkaufsmaschine.**

**Bewertung [A]:** Das ist der **semantisch nächste** Wettbewerber zur Produktidee – und er
verkauft *Module*, nicht *Software*. Wichtig: shesmile beweist, dass Nutzer:innen **Modul-Denken
verstehen und kaufen**. Es beweist aber auch, dass die Erwartung „**kombinierbare Bausteine**"
bereits von **PDF-Produkten** bedient wird – mit dem Vorteil, dass sie **fertig durchdacht**
sind. Ein Editor, der Nutzer:innen die Kombination überlässt, muss die Konstruktions-Sicherheit
liefern, die shesmile durch Kuratierung liefert. Das ist **die eigentliche Messlatte**.

---

### 4.9 Marktplätze: Etsy, Sewunity, Ravelry, Makerist (†)

| Plattform | Belegte Fakten | Rolle |
|---|---|---|
| **Etsy** | Organizer-/Jewelry-Patterns **2,50–15 €**, typisch 4–8 €; häufige 50–70 %-Rabatte; „blouse sewing pattern" 2.400 Suchen/Monat bei 59.535 Listings **[F]**; ~65 % der Verkäufer:innen < 100 USD/Jahr **[H]** | **Preis-Presse** und Distribution. Für ein Tool irrelevant als Kanal, für Validierung der Nachfrage nützlich |
| **Sewunity** | DE-Plattform; finanziert über **Stoffwerbung an Pattern-Seiten** (23,20/58/96,50 € Pakete) und 5 % Affiliate; nach Makerist-Übernahme umgebaut, Altinhalte teils verloren **[F]** | **Der wahrscheinlichste Launch-Partner in DE** |
| **Ravelry** | **8,3–11 Mio.** Nutzer:innen, **~1,2 Mio.** Patterns, ~3.500 neue Projekte/Tag **[F]** | Größte Strick-Community der Welt = Zielgruppe „Stricknadel-Etui", aber **kein Software-Marktplatz** |
| **Makerist** | **eingestellt 31.03.2025**, fabfab-Insolvenz, Downloads nur bis 31.01.2026 **[F]** | **Die offene Flanke im DE-Markt** |

---

### 4.10 Vollständigkeitshalber geprüft, aber nicht wettbewerbskritisch

| Anbieter | Warum nicht kritisch |
|---|---|
| **SeamScape** (Pattern Studio, 3D, Nesting-as-a-Service, API) | B2B-Industrie, kein Endkunden-Tool |
| **Optitex, Gerber AccuMark, TUKAcad, Vetigraph, Assyst, Lectra** | Industrie-CAD, 4- bis 6-stellige Preise, nicht adressierbar |
| **DraftMySize** | MTM-Kleidung, 14,99 USD/Pattern – zeigt, dass **Einzelpattern-Verkauf** noch funktioniert |
| **PatternMaker (PatternMaker Software)** | Desktop-Klassiker, Kleidung, kleiner Bestand |
| **JSK Patrones** (App) | Kleidungs-Grundschnitte, Nutzerkritik: keine Speicherung, keine Kleider/Röcke |
| **FiberGoblin, Saga, Sewing Patterns Lite, Stash Hub, Sewist Studio, Threadloop, Cora** | Stitch-/Stash-/Projekt-**Verwaltung**, keine Konstruktion – aber **Beleg für Zahlungsbereitschaft bei Organisation** (Sewist Studio: 4,99 USD/Monat Pro; Stash Hub 3,49 USD/Monat) |
| **SewCanShe, Sweet Red Poppy, Treasurie, sew4home** | Content/Blogs: liefern **kostenlose** Organizer-Patterns – verstärken den 0-€-Anker |
| **Sarah Kirsten (Pouch/Tote Calculator), Erb-Schatz (Boxy Bag Rechner), speedcalcs (Zipper Calculator), Laura's Boxy Pouch Calculator** | **Der Beweis, dass „Rechnen statt Konstruieren" die präferierte Lösung ist** – kleine Gratis-Rechner, keine Editoren |
| **3D-Bag-Configuratoren** (XYZBag, Vectary, Hexa, 3dconfigurator.io) | E-Commerce-Konfiguratoren für **fertige** Taschen (Farbe/Material/Text) – kein Näh-Schnittmuster. Zeigen aber: 3D-Konfiguration ist visuell etabliert |

---

## 5. Die 10 kritischen Prüffragen

> **Gibt es bereits einen echten CAD-ähnlichen Organizer-Designer, bei dem Nutzer das
> Innenleben eines Mäppchens frei konstruieren können und anschließend ein vollständiges,
> nähbares Schnittmuster erhalten?**

| # | Prüffrage | Antwort | Beleg |
|---|---|---|---|
| 1 | **Frei positionierbare Organizer-Module** | **NEIN** – kein Anbieter gefunden. Print + Cut + Sew konfiguriert innerhalb fester Templates; OpenSloper erlaubt freie Geometrie, kennt aber keine Organizer-Module | [B] Print+Cutz+Sew-Parameterliste; [F] OpenSloper-Features |
| 2 | **Individuelle Innenraumgestaltung** | **TEILWEISE** – als *Parameter* ja (Elastikreihen, Fächerzahl, Fachbreiten, Taschen-Tiefe, Gusset), als *freie Gestaltung* nein | [B] Zip-Around-Organiser: „Elastic bands, Band positions, Equal sections **or section widths**, Pocket sections" |
| 3 | **Unterschiedliche Halterungssysteme** | **NEIN als Modulbibliothek.** Elastik-Loops und Steckfächer existieren; Ohrringhalter, Kettenhaken, Pinselhalter, Nadelkanäle sind **nicht** als wählbare Objekte vorhanden | [B] Parameterlisten geprüft |
| 4 | **Objektbasierte Planung** | **NEIN im Organizer-Kontext.** In OpenSloper gibt es Objekte (Features, Pieces, Seams) – aber für Kleidung, nicht für Organizer | [F] OpenSloper „as ordinary objects" |
| 5 | **Automatische Anpassung von Modulen** (Modulwachstum, wenn Nachbar schrumpft) | **NEIN** – nirgends gefunden. Vorhanden ist nur *globale* Parametrik (Maß ändert alles) | [A] aus geprüften Parameterlisten |
| 6 | **Abhängigkeiten zwischen Konstruktionselementen** | **JA, technisch** – OpenSloper/Seamly/Valentina/Sewist können das (Formeln, Snap-Beziehungen, Seam-Length-Checks). **NEIN, domänenspezifisch** – keine Regel „Loop-Länge = Fachbreite + 2 × Dicke − Zug" außerhalb von Print + Cut + Sew (und dort fest im Template) | [F] OpenSloper; [B] Print+Cutz+Sew-FAQ |
| 7 | **Vollständige Materialberechnung** | **JA** – Print + Cut + Sew („0.4 m of 112 cm fabric" je Stoff), OpenSloper (Roll-/Sheet-Fit + Verbrauch), Sewist (Yardage), Tailornova | [B]/[F] |
| 8 | **Technisch nachvollziehbare Nähkonstruktion** | **JA** – Print + Cut + Sew erzeugt Schritt-für-Schritt-Anleitungen, **die sich den gewählten Optionen anpassen** (inkl. Nahtzugabe 1 cm, Interfacing ohne NZ). Das ist bemerkenswert gut gemacht | [B] 9-Schritt-Anleitung Zip-Around |
| 9 | **Automatische Schnittmustererstellung** | **JA, mehrfach und gratis** | [B]/[F] |
| 10 | **Drag & Drop auf einer freien Arbeitsfläche** | **NEIN im Näh-Kontext.** Drag & Drop existiert in **Produkt-Konfiguratoren** (XYZBag, Vectary) und in **Vektor-/CAD-Editoren** (OpenSloper/Illustrator) – aber nicht kombiniert mit Organizer-Schnittmustern | [F]/[B] |

### Ergebnis

> **Die Lücke ist real und präzise beschreibbar:**
> **„Objektbasierter, frei positionierbarer Innenraum-Editor mit Domänen-Constraints
> (Loop-Länge, Fachtiefe, Kollision, Gusset) und automatisch abgeleiteter, konfektionierbarer
> Nähkonstruktion inkl. SVG/3D."**
>
> **Es gibt sie – Stand 26.11.2026 – bei keinem Anbieter.**
>
> Aber: **Jeder einzelne Baustein existiert bereits, gratis, an anderer Stelle.** Die Lücke ist
> eine **Integrations- und Domänenlücke**, keine Erfindungslücke. Das verschiebt den
> Wettbewerbsvorteil von „wir können etwas, das niemand kann" zu **„wir machen eine bekannte
> Arbeit in 3 Minuten statt 45"**.

---

## 6. Bedrohungs-Ranking (wer kann die Idee am schnellsten entwerten?)

| Rang | Bedrohung | Warum | Zeitfenster |
|---|---|---|---|
| 1 | **Print + Cut + Sew** | Hat 80 % der Funktion, 0 € Preis, 0 Reibung, bereits 50+ Generatoren. Ein „Innenleben-Modus" wäre eine Template-Erweiterung | **Wochen** |
| 2 | **Atomm / xTool** | 3D + Parametrik + Export vorhanden; Innenleben fehlt. Finanziert durch Hardware – kein Umsatzdruck | **Wochen–Monate** |
| 3 | **Ourlette & KI-Tools** | Verschieben die Erwartung von „bauen" zu „beschreiben". Wenn „mach mir ein Schmuckrollen-Schnittmuster mit 12 Ringen und einer Kette" funktioniert, ist der Editor obsolet | **6–18 Monate** |
| 4 | **OpenSloper** | Alle Constraints + Material + Nesting vorhanden. Ein Organizer-Preset-Paket ist ein Wochenendprojekt | **Wochen** (aber Community-getrieben, unvorhersehbar) |
| 5 | **shesmile & Indie-Designer** | Verkaufen bereits Modulbaukästen als PDF. Können „Konfigurator" als Service dazukaufen | **Monate** |
| 6 | **Tailornova / Sewist** | Haben Reichweite, Zahlungsbereitschaft und Technik. Ein Organizer-Modul wäre inkrementell | **Monate** |
| 7 | **Ein neuer Gratis-Anbieter** | Die Markteintrittskosten sind niedrig (siehe Print + Cut + Sew: eine Einzelperson) | **jederzeit** |

**Konsequenz [A]:** Es gibt **kein** verteidigbares Technologie-Monopol. Der einzige
verteidigbare Vorteil ist **(a) Domänenwissen als kuratiertes, geprüftes Regelwerk,
(b) Content/Anleitung, die wirklich stimmt, (c) Distribution in einer Nische, (d) Geschwindigkeit
der Iteration.** Ein Burggraben aus Code ist nicht erreichbar.

---

## 7. Was im Feld **nicht** besetzt ist (die Landkarte der freien Felder)

1. **Objektbasierter Innenraum-Editor mit Kollisions-/Tiefenprüfung** – frei belegt.
2. **Modulbibliothek für Objekt-Halterungen** (Ohrringhalter, Kettenhaken mit Antirotations-Logik,
   Pinselhalter, Nadelkanäle, Ringsteg, Uhrenkissen) als *wiederverwendbare, parametrische Objekte*.
3. **„Passt-das?"-Prüfung**: Warnung, wenn ein Modul die Gusset-Tiefe überschreitet, ein
   Reißverschluss zu kurz wird, ein Loop die Naht kreuzt.
4. **SVG-Export für Laser/Plotter/Projektor bei Organizern** (Print + Cut + Sew hat kein SVG).
5. **3D-Vorschau des *Innenlebens*, gefüllt mit den eigenen Gegenständen** (nicht nur Außenform).
6. **Objekt-Bibliothek der Nutzer:innen** („mein Make-up: 12 Pinsel, 3 Paletten, 1 Schwamm") →
   daraus Layout-Vorschlag. Das ist der eigentliche Hebel: **Input ist der Besitz, nicht die Maße.**
7. **Automatische Layout-Vorschläge** (Bin-Packing für Taschen-Innenräume).
8. **Nähanleitung, die auf die *eigene* Konfiguration reagiert** – existiert bei Print + Cut +
   Sew bereits für Templates, nicht für freie Layouts.
9. **Gewerbe-Modus**: reproduzierbare Größen, Chargen-Konsistenz, Lizenz zur Vermarktung
   (Wild Ginger verbietet es explizit).
10. **Deutschsprachige, deutsch denkende Bedienung** – Sewist/OpenSloper/Print + Cut + Sew sind
    englisch; Sewunity-Nutzer:innen sind deutsch.
