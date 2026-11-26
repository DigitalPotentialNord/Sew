# Architekturentscheidung: Positionsmodell

Stand: 26.11.2026 · Kontext: [Editor-Redesign](../ux/editor-redesign.md) ·
Datenmodell: [`../engineering/pattern-data-model.md`](../engineering/pattern-data-model.md) ·
Konstruktionsregeln: [`../engineering/construction-rules.md`](../engineering/construction-rules.md)

---

## 1. Die Frage

Die bestehende Architektur ist **zeilenbasiert**: Ein Modul trägt `rowId` und eine
Position innerhalb der Zeile (die Reihenfolge im `modules`-Array). Seine Pixel-Position
wird deterministisch aus `row + Index + Reihenfolge der Zeilen` berechnet — es gibt
**kein freies x/y**.

Das Editor-Redesign fordert eine Arbeitsfläche, die ein **geöffnetes Mäppchen** zeigt:
linke Innenfläche, Falz, rechte Innenfläche, Außenkanten, Verschlussbereiche. Der Nutzer
soll Module „auf der Stofffläche" anordnen, nicht in einer technischen Zeilenliste.

Daraus entsteht die Architekturfrage aus dem Lastenheft §7:

> **A.** Die zeilenbasierte Konstruktion wird intern weiterverwendet, aber durch eine
> produktorientierte visuelle Ebene abstrahiert.
>
> **B.** Das Datenmodell wird um echte Positionen, Bereiche, Ankerpunkte und
> geometrische Abhängigkeiten erweitert.

Und die harte Bedingung:

> *Wenn freie Positionierung für das Produkt erforderlich ist, darf sie nicht optisch
> simuliert werden, während die Konstruktion weiterhin ausschließlich zeilenbasiert
> funktioniert.*

---

## 2. Bewertung beider Ansätze

### Ansatz A — Zeilenmotor + visuelle Abstraktion

**Was er hält:** Die gesamte Konstruktionspipeline (`layout → pieces → materials →
operations → findings`), die Nahtzugaben-Rechnung, das Kanalbudget
(`base.widthMm − 2 × edgeMarginMm`), die Fadenlauf-Sperre im Shelf-Packing, das
Regelwerk V-G/V-M, die 228 Unit-Tests, die Referenz-Hashes und die Maßhaltigkeit — der
Kernwert des Produkts. All das bleibt unangetastet.

**Was er nicht kann:** Module auf **beide** Innenflächen eines aufgeschlagenen Mäppchens
zu legen. Das aktuelle Modell kennt nur eine Fläche (`flap = width × height`), obwohl
das Schnittteil bereits `2 × width + spine` breit ist. Ein Mäppchen hat aber zwei
Innenflächen — das ist keine Visualisierungssache, sondern eine Konstruktionssache:
ein Modul auf der rechten Innenfläche wird an einem anderen Panel genäht als eines auf
der linken.

**Risiko der Täuschung:** Würde man die zweite Fläche nur *zeichnen*, Module aber
heimlich alle auf der einen Fläche belassen, entstünde genau die verbotene Schein-
Positionierung. Das ist ausgeschlossen.

### Ansatz B — Volle freie x/y-Positionierung

**Was er verspricht:** Beliebige Platzierung in mm-Koordinaten, Ankerpunkte,
Abhängigkeiten, Kollisionserkennung, variable Nahtzugaben je Zone.

**Was er kostet:** Eine Neuimplementation von `layout()`, des Prüfkontexts
(`checkContext`), der Kollisions- und Überlappungsregeln (V-G-01, V-G-13, V-G-14), der
Materialplanung (Shelf-Packing mit Fadenlauf), der Nähoperationen (DAG) und damit **der
gesamten Maßhaltigkeit**, die das Produkt wertvoll macht. Freie Positionierung bricht die
einfache Budget-Rechnung „Summe der Modulbreiten ≤ Kanalbreite" und verlangt statt
dessen ein echtes 2D-Packing mit Nahtzugaben-Schranken — ein Mehrwochen-Projekt mit
hoher Wahrscheinlichkeit, *falsche* Schnittmuster zu erzeugen, ohne dass ein Test rot
wird. Genau das nennt AGENTS.md die größte Gefahr.

**Urteil:** Voll-B ist für diesen Schritt disproportional riskant. Die Maßhaltigkeit darf
nicht aufs Spiel gesetzt werden, um eine CAD-freie Anordnung zu erreichen, die das
Produkt gar nicht verlangt: ein Näh-Etui wird in **Zeilen** genäht — Module sitzen
waagerecht nebeneinander und übereinander, nicht frei im Raum. Freie x/y-Positionierung
ist keine Produktanforderung, sondern eine CAD-Konvention, die das Redesign gerade
ablösen will.

---

## 3. Entscheidung: Ansatz A+ (hybrid)

> **Die zeilenbasierte Konstruktionsmaschine bleibt erhalten. Sie wird um EINE echte
> Positionsdimension erweitert: die Innenfläche (`side: 'left' | 'right'`).**

Das ist kein optischer Trick, sondern eine echte, im Schema gespeicherte, im Hash
verankerte Konstruktionsabsicht. Damit wird der Tatsache Rechnung getragen, dass ein
aufgeschlagenes Mäppchen **zwei** genähte Innenflächen hat.

### Was neu am Modell ist

| Feld | Typ | Wo | Bedeutung |
| --- | --- | --- | --- |
| `Instance.side` | `'left' \| 'right'` | `construction.ts`, `project.ts` | Auf welcher Innenfläche das Modul sitzt |
| `SCHEMA_VERSION` | `3` | `construction.ts` | Schema-Major; Migration v2→v3 |
| `migrate()` | — | `project.ts` | v2-Projekte: jedes Modul erhält `side: 'left'` |
| `layout()` | — | `construction.ts` | Zeilen werden **je `side`** gestapelt; linker Flap und rechter Flap sind zwei unabhängige Kanäle |
| `projectHash` | — | `construction.ts` | Hash-Input enthält `side` je Modul |

### Was unverändert bleibt

- Die Budget-Rechnung pro Zeile (`Summe Modulbreiten ≤ width − 2 × edgeMargin`).
- Die Höhenbudget-Rechnung pro Seite (`Summe Zeilenhöhen ≤ height − 2 × edgeMargin`).
- Nahtzugaben, Nähmaße, Fadenlauf, Materialplanung, Nähoperationen, Regelwerk, PDF,
  SVG, Druck — kein einziges Berechnungsergebnis ändert sich für bestehende Projekte,
  die (nach Migration) alle Module auf `side: 'left'` haben.
- Alle 16 Module (`M01…M16`), ihre Geometrie, ihre Teile, ihre Operationen.

### Warum das ehrlich ist

- Jede sichtbare Position ist durch ein echtes Modellfeld gestützt: `side × rowId ×
  Index`. Es gibt **keine** „freie" Pixel-Position, die nicht im Modell steht.
- Ziehen eines Moduls über den Falz verschiebt es **real** auf die andere Innenfläche
  (`moveToSide`) — das Schnittteil wandert mit, weil `layout()` die Seite auswertet.
- Ziehen innerhalb einer Fläche sortiert **real** in Zeilen um (`moveInstance`) — das ist
  das gleiche, validatede Modell wie zuvor, nur ohne die CAD-Drumherum.
- Magnetische Ausrichtungs- und Einrasthilfen sind **visuelle Hilfen** für eine reale
  Aktion (Reihenfolge/Zeile/Seite wählen), keine Fake-Koordinaten.

### Was bewusst NICHT gebaut wird (und warum)

| Gefordert | Entscheidung | Begründung |
| --- | --- | --- |
| Freie x/y in mm | **nein** | Produkt näht in Zeilen; freie Positionierung bricht Maßhaltigkeit und Budget-Regeln ohne Gegenwert |
| Ankerpunkte & Abhängigkeiten zwischen Modulen | **nein** | Kein Modul hängt geometrisch von einem anderen ab (jedes hat eigene Teile & Nahtzugaben); Abhängigkeiten bestehen nur in der *Nähreihenfolge* (bereits als DAG gelöst) |
| Kollisionserkennung 2D | **begrenzt** | Überlappung = Zeilen-Überlauf, bereits via V-G-01/V-G-13/V-G-14 gemeldet; echte 2D-Kollision ergibt sich nicht, weil Module sich nicht frei überlappen können |
| Variable Nahtzugaben je Zone | **nein** | Nahtzugabe ist global (`settings.seamAllowanceMm`); Zonen-Variable Nahtzugabe ist eine Fertigungsoption, die das Schnittmuster verkompliziert, ohne den MVP-Nutzen zu tragen |
| Falz als eigene Modul-Zielzone | **nein** | Der Bund (`spineWidthMm`) ist Teil des Außenpanels, kein Platz für Innenmodule; Verschlussmodule (`M07/M08`) sitzen an der Kante, nicht im Falz |

---

## 4. Migration & Kompatibilität

- **Schema v2 → v3:** nicht-destruktiv. Jedes Modul ohne `side` erhält `side: 'left'`.
  Ein v2-Projekt sieht nach Migration **exakt** so aus wie vorher (alles links),
  derselbe Schnitt, dieselbe Materialliste.
- **Hash-Stabilität:** Der Hash-Input erhält ein neues Feld (`side`). Für ein migriertes
  v2-Projekt ändert sich der Hash-Wert (neues Feld, auch wenn konstant `'left'`). Das ist
  *korrekt*: die Absicht „auf welcher Fläche" ist jetzt Teil der Konstruktion. Die
  Referenz-Hashes in `AGENTS.md`/`PHASE-3.md` werden nachgezogen und im Redesign-
  Audit dokumentiert.
- **Material-/Schnittmusterberechnung:** unverändert. Das Außenpanel bleibt
  `2 × width + spine` breit — das war schon immer so, nur die Arbeitsfläche zeigte es
  bisher nicht. Module auf der rechten Seite fügen dem Außenpanel keine neue Naht hinzu;
  sie werden auf die rechte Innenfläche genäht, wie links auch.
- **PDF/SVG/Druck:** unberührt. Die Schnittteile eines Moduls hängen nicht von `side` ab,
  nur seine Platzierung in der Design-Ansicht.

---

## 5. Konsequenzen für die Oberfläche

Die Design-Ansicht (`editor`) zeichnet ab sofort das **volle aufgeschlagene Mäppchen**:

```
┌──────────────┬───┬──────────────┐
│  LINKE       │ F │  RECHTE      │
│  INNEN-      │ A │  INNEN-      │
│  FLÄCHE      │ L │  FLÄCHE      │
│  (side:left) │ Z │  (side:right)│
└──────────────┴───┴──────────────┘
   width           spine           width
```

- Beide Innenflächen sind textil dargestellt (Leinen-/Creme-Ton), keine CAD-Linien.
- Zeilen sind als dezente Zonen erkennbar, nicht als dominante technische Kästen.
- Raster, Maßketten und Nahtzugabe-Innenlinie sind **standardmäßig ausgeblendet**
  („einfacher Modus"); sie erscheinen nur im „erweiterten Modus" oder bei Auswahl.
- Auswahlgriffe und Maße erscheinen nur bei aktiver Auswahl.
- Drag über den Falz = `moveToSide`; Drag innerhalb = `moveInstance`.

---

## 6. Offene Punkte (dokumentiert, nicht verschwiegen)

1. **Randplatzierung `M07/M08`** bleibt genähert (siehe AGENTS.md §7). Die Verschluss-
   laschen sitzen an der rechten Außenkante; auf der rechten Innenfläche ist das
   geometrisch konsistent, auf der linken näherungsweise.
2. **Gedrehte Module, die ihre Zeile überragen** (V-G-14), werden weiterhin gemeldet,
   nicht automatisch umgelegt — das ist eine bewusste Lücke.
3. Ein **drittes „Mittelteil"-Band** (z. B. ein Einsatz im Falz) ist nicht vorgesehen;
   der Falz ist Struktur, keine Modulfläche.

---

## 7. Ergebnis

**Ansatz A+** — zeilenbasierte Maschine mit echter `side`-Dimension, produktorientierter
visueller Schicht ohne Fake-Positionierung, voller Erhalt der Maßhaltigkeit und der
bestehenden Tests. Volles freies x/y (Ansatz B) wird abgelehnt, weil es den Kernwert
ohne Produktgegenwert gefährdet.
