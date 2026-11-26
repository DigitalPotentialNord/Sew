# Editor-Redesign — Modern Textile Atelier

Stand: 26.11.2026 · Umsetzung: Branch `arena/e0c5b61b-sew` ·
Architekturentscheidung: [`../architecture/positioning-model-decision.md`](../architecture/positioning-model-decision.md) ·
Interaktionsmodell: [`interaction-model.md`](interaction-model.md) ·
Responsiv: [`responsive-concept.md`](responsive-concept.md) ·
Audit: [`../quality/editor-usability-audit.md`](../quality/editor-usability-audit.md)

---

## 1. Ausgangslage und Problem

Der bestehende Editor zeigte eine **einzelne technische Zeichenfläche**: ein
Rechteck (die „Flap"), darüber Maßketten, ein permanent sichtbares Raster, eine
 gestrichelte Nahtzugabe-Innenlinie, Zeilen als Kästen mit Beschriftung am Rand,
und ein großes, immer offenes Eigenschaftenpanel rechts. Wer das erste Mal ein
Mäppchen gestalten wollte, sah CAD — nicht sein Produkt.

### Bestandsaufnahme der UX-Probleme

**Visuelle Probleme**
- Permanent sichtbares 5-mm-Raster und Maßketten auch ohne Auswahl — Rauschen.
- Zeilen als dominante technische Kästen mit hochkantiger Beschriftung am Rand.
- Nahtzugabe-Innenlinie immer sichtbar; Außenkontur hart und schwarz.
- Module als weiße Rechtecke mit dünnen Linien — keine textile Lesart.
- Bibliothek als reine Liste mit abstrakten Icons, ohne Vorschau der Geometrie.

**Probleme der Bedienlogik**
- „Zeile", „Kanalnutzung", „Nahtzugabe", „Fadenlauf" sind technische Begriffe,
  bevor ein einziges Fach platziert ist.
- Drag ordnet innerhalb einer Zeile um — aber das ist für den Nutzer nicht als
  „ich arrangiere mein Mäppchen" erkennbar, sondern als „ich sortiere eine Liste".
- Auswahlgriffe und Werkzeugleiste (Raster/Einrasten/Zoom) immer präsent.
- Eigenschaftenpanel zeigt immer alle Felder aller Gruppen — überladen.

**Informationsarchitektur**
- Der „Editor"-Tab mischt Design-Oberfläche und technische Werkzeuge.
- Schnittmuster, Material, Anleitung, Projekt sind gleichberechtigte Tabs — die
  Designfläche ist nicht als der primäre Ort erkennbar.
- Kein geführter Einstieg: der Nutzer landet direkt im gefüllten Editor.

**Architektur**
- Das Datenmodell ist **ausschließlich zeilenbasiert** (`rowId` + Index). Es
  kannte nur EINE Innenfläche, obwohl das Schnittteil schon
  `2 × Breite + Bund` breit ist. Ein aufgeschlagenes Mäppchen hat aber **zwei**
  Innenflächen — das war im Modell nicht abbildbar (siehe Architekturentscheidung).

---

## 2. Neues Konzept: das aufgeschlagene Mäppchen

Die zentrale Arbeitsfläche stellt ein **tatsächlich geöffnetes Mäppchen** dar:

```
┌──────────────┬───┬──────────────┐
│  LINKE       │ F │  RECHTE      │
│  INNEN-      │ A │  INNEN-      │
│  FLÄCHE      │ L │  FLÄCHE      │
│  (side:left) │ Z │ (side:right) │
└──────────────┴───┴──────────────┘
   Breite         Bund          Breite
```

- Beide Innenflächen sind **textil** dargestellt (Leinen-/Creme-Ton mit feiner
  Gewebestruktur), nicht als CAD-Rechteck.
- Der **Falz/Bund** ist als dezente Zone zwischen den Flaps erkennbar.
- Außenkanten sind eine ruhige Kontur, keine Maßkette.
- Zeilen sind **dezente Zonenbänder** auf beiden Seiten, keine dominanten Kästen.
- Module liegen mit **stoffigen Füllungen** auf der Fläche (Fach, Polsterung,
  Band, Lochleiste — abgeleitet aus der echten `draw()`-Geometrie).

### Designrichtung: Modern Textile Atelier

| Token | Wert | Verwendung |
| --- | --- | --- |
| Warmes Off-White | `#f3ece0` | Atelier-Hintergrund |
| Creme | `#fbf6ed` | Panels, Karten |
| Leinen | `#f4ecdf` / `#ece3d2` | Waben, Ateliertisch |
| Sand | `#eae0cc` | inaktive Flächen, Falz |
| Salbeigrün | `#5f7d63` | Akzent, Auswahl |
| Terracotta | `#c07a5f` | Führungslinien, Starter-Eyebrow |

Keine generischen weißen Rechtecke mehr; die Modulflächen tragen textile Töne
(`--fabric-pocket`, `--fabric-padding`, `--fabric-hatch`, `--fabric-band`).

---

## 3. Einfacher und erweiterter Modus

| | Einfach (Standard) | Erweitert |
| --- | --- | --- |
| Raster | ausgeblendet | 5-mm-Raster sichtbar |
| Maßketten | ausgeblendet | Buch-Bemaßung sichtbar |
| Nahtzugaben-Innenlinie | ausgeblendet | sichtbar |
| Außenkontur (Schnittkante) | dezente Kante | `flap-outline`-Buchkontur |
| Zeilenbeschriftung | nur Zonen | Namen links/rechts |
| Auswahlgriffe / Maße | nur bei Auswahl | nur bei Auswahl |

Der Modus-Umschalter liegt oben rechts auf der Designfläche (`mode-toggle`).
Standardeinstellung ist **Einfach** — der Nutzer arbeitet mit dem Produkt, nicht
mit der technischen Abstraktion.

---

## 4. Starter-Erfahrung

Beim Erstsbesuch (kein gespeichertes Projekt) öffnet sich die Begrüßung:

> **Was möchtest du gestalten?**
> Schmuck-Organizer · Make-up-Organizer · Stricknadel-Etui · Federmäppchen ·
> Eigenes Projekt

Anschließend **Wie möchtest du starten?**
- Mit einer Vorlage
- Mit einem leeren Mäppchen
- Mit einer eigenen Größe (Breite/Höhe)

„Beginnen" baut ein **echtes Projekt** (Vorlage oder `blankProject` + eigene Maße)
und öffnet die Designfläche. „Später entscheiden" überspringt den Starter; hinter
ihm steht schon die Schmuck-Vorlage, sodass der Nutzer nie vor einer leeren
technischen Fläche steht.

Bei einem **leeren Projekt** zeigt die Fläche: *„Füge dein erstes Fach hinzu."*

---

## 5. Visuelle Modulbibliothek

Statt einer reinen Liste: eine **Kategorieleiste** (Taschen, Fächer, Nadeln,
Elastik, Verschluss, Schmuck, Werkzeug, Struktur) und ein Raster von Karten.
Jede Karte zeigt eine **Vorschau aus echter Geometrie** — die Vorschau IST das
`draw()`-Ergebnis mit Default-Parametern, maßstabsgetreu eingepasst.

- **Klicken** fügt hinzu (primärer Weg).
- **Drag & Drop** auf die Fläche ist die zusätzliche Möglichkeit (nicht der
  einzige Weg, wie im Lastenheft §5 gefordert).

---

## 6. Kontextuelle Eigenschaften

Kein dauerhaft großes Technikpanel: Beim Auswählen eines Moduls erscheinen **nur
die für dieses Modul relevanten Felder**:
- **Größe & Anzahl** (primär): Breite, Höhe, Ringe, Paare, Fächer …
- **Position**: Innenfläche (Links/Rechts) + Zeile.
- **Material**: die Schnittteile dieses Moduls (Lesetext).
- **Weitere Einstellungen** (eingeklappt): seltene Konstruktionswerte
  (Steg, Zugabe, Polsterung, Überlappung …).

Auf Desktop bleibt das Panel rechts (kompakt); auf Tablet/Smartphone wird es zum
**rechten Drawer**, der sich öffnet, sobald etwas gewählt ist.

---

## 7. Vorher-Nachher-Vergleich

| Kriterium | Vorher | Nachher |
| --- | --- | --- |
| Arbeitsfläche | ein CAD-Rechteck mit Raster+Maßen | aufgeschlagenes textiles Mäppchen |
| Technisches Beiwerk | permanent | nur im erweiterten Modus / bei Auswahl |
| Innenflächen | eine | zwei (echtes `side`-Modellfeld) |
| Bibliothek | Liste + Icons | Kategorien + Geometrie-Vorschauen |
| Eigenschaften | immer alle Felder | kontextuell, kompakt, „Weitere Einstellungen" |
| Einstieg | direkt im gefüllten Editor | geführter Starter (Typ → Startart) |
| Farbpalette | neutral grau/weiß/salbei | Modern Textile Atelier (warm, leinen, terracotta) |
| nötige Interaktionen bis zum 1. Fach | Klick in Liste | Klick auf Vorschau-Karte |
| Bedienbegriffe vorab | Zeile, Kanal, NZ, Fadenlauf | Mäppchen, Innenfläche, Fach |

---

## 8. Was bewusst NICHT verändert wurde

- Die Konstruktionsmaschine (`construct`, pieces, materials, operations,
  findings) bleibt rein und deterministisch — Maßhaltigkeit unangetastet.
- Kein freies x/y (siehe Architekturentscheidung §3): das Produkt näht in Zeilen.
- Nahtzugaben, Nähmaße, Fadenlauf, Materialplanung, PDF/SVG/Druck — unverändert.
- Die 16 Module und ihre Geometrie — unverändert (nur textile Füllungen).
