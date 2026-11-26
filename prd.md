# Product Requirements Document (PRD)

Stand: 26.11.2026 · Grundlage: [`../research/`](../research/) · Vision: [`product-vision.md`](product-vision.md)

---

## 1. Zweck und Geltung

Dieses PRD übersetzt die Phase-1-Erkenntnisse in **prüfbare Anforderungen**. Es ist die
verbindliche Grundlage für Phase 3 (Implementierung).

**Regeln für dieses Dokument:**

- Jede Anforderung hat eine **ID** (`FR-…`, `NFR-…`, `UX-…`) und ist **testbar formuliert**.
- Jede Anforderung trägt eine **Priorität**: `M` (MVP, muss), `S` (Should, Stufe 2),
  `C` (Could, später), `W` (Won't, ausdrücklich ausgeschlossen, mit Begründung).
- Wo eine Anforderung aus Phase 1 folgt, steht die **Quelle**.
- **Keine Anforderung ohne Abnahmekriterium.**

---

## 2. Anforderungsquellen: Persona → Problem → Feature

| Persona | Belegtes Problem (Phase 1) | Feature | IDs |
|---|---|---|---|
| **Maike** (Strick) | „Nadelmischung passt in kein Etui" | Füllmengen-Eingabe, Nadelkanal, Layout-Vorschlag | FR-20…FR-29 |
| **Sabine** (Gewerbe) | „Jede Größe neu konstruieren kostet Stunden" | Varianten, Batch-Export, Lizenz | `S`-Priorität (Stufe 2) |
| **Jonas** (Fortgeschritten) | „Werkzeuge, die konstruieren können, verlangen CAD-Denken" | Direkte Manipulation, SVG, kein Formelzwang | FR-40…FR-47 |
| **Betül** (Anfängerin) | „Ich weiß nicht, ob es klappt" | Geführter Modus, Warnungen mit Vorschlag, Kalibrierquadrat | FR-50…FR-58 |
| **Renate** (Schmuck) | „Ketten verknoten" | Kettenhalter, Ohrringhalter (Stufe 2) | `S`-Priorität |

**Wichtig:** Maike und Betül sind **dieselbe Designsprache**: geführt, sicher, schnell.
Jonas bekommt **eine Erweiterung**, keine zweite Oberfläche (siehe FR-45 „Expertenmodus").

---

## 3. Funktionale Anforderungen

### 3.1 Einstieg und Projektanlage

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-01** | Die Anwendung ist ohne Konto, ohne Login und ohne E-Mail vollständig nutzbar | **M** | Playwright: frischer Browser-Kontext → PDF-Download möglich, ohne je ein Formular mit E-Mail zu sehen |
| **FR-02** | Beim Aufruf wird ein **lauffähiges Beispielprojekt** geladen (nicht ein leerer Canvas) | **M** | Erster Screen enthält bereits ein vollständiges Etui mit 3 Modulen und ein anklickbares „Drucken" |
| **FR-03** | Der Nutzer wählt eine **Grundform** aus maximal 3 Optionen (Etui/Rolle/Aufklappbar) | **M** (nur 2 im MVP) | Auswahl in ≤ 1 Interaktion; jede Option zeigt Vorschaubild + Kurzbeschreibung |
| **FR-04** | Der Nutzer legt die **Abmessungen** über Presets fest (z. B. „für Nadelspiele bis 20 cm") **oder** über freie Maßeingabe | **M** | Preset-Auswahl setzt alle Maße plausibel; freie Eingabe erlaubt jeden Wert innerhalb der Modulgrenzen |
| **FR-05** | Ein Projekt ist nach Schritt 4 **vollständig druckbar** — auch ohne Editor-Besuch | **M** | Playwright: Preset wählen → „Drucken" → PDF mit allen Seiten; Interaktionszähler ≤ 4 |
| **FR-06** | Der Editor ist **optional erreichbar** („Anpassen"), nicht Pflichtschritt | **M** | Fluss ohne Editor-Besuch führt zum vollständigen Ergebnis |

> **Begründung FR-05/06 [A]:** Phase 1, Versprechen V3 und Metrik „≤ 8 Interaktionen". Der
> häufigste Fall („ich will einfach ein Nadel-Etui") darf nicht durch einen Editor führen.

### 3.2 Grundfläche definieren

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-10** | Die Grundfläche ist definiert durch: Breite, Höhe, Form (Rechteck / abgerundet), Bundbreite | **M** | Alle 4 Werte im Eigenschaften-Panel sichtbar und änderbar. **Keine Tiefe im MVP** (`depthMm` aus dem Schema entfernt, `pattern-data-model.md` §2.2.1) |
| **FR-11** | Änderungen an der Grundfläche **propagieren** auf alle Module (Positionen bleiben gültig oder werden korrigiert) | **M** | Property-Test: Verkleinern um X verschiebt kein Modul aus dem Panel; Konflikte werden aufgelöst und gemeldet |
| **FR-12** | *(im MVP ersetzt)* **Die Materialstärke der Module begrenzt, wie flach das Etui bleibt.** Ein Etui mit Tiefe > 0 ist **nicht** unterstützt | **M** | Ein Modul mit `hoehe` > verfügbare Panelhöhe ist nicht konfigurierbar (Eingabe geklemmt + Hinweis, `V-M03-03`). Volumen (Bodenecke) ist Stufe 2 |
| **FR-13** | Die Grundfläche zeigt ein **Raster** mit konfigurierbarer Schrittweite (1 cm / 5 mm / aus) | **M** | Raster ein-/ausschaltbar, Auswahl wird persistiert |
| **FR-14** | Maßangaben sind **immer sichtbar** (Bemaßung an Kanten), unabhängig vom Zoom | **M** | Bei Zoom 25 % und 400 % bleiben Labels lesbar (Mindestgröße in Bildschirm-Pixeln) |

### 3.3 Module hinzufügen, verschieben, skalieren, konfigurieren

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-20** | Module werden per **Drag & Drop** aus der Bibliothek auf eine Trägerfläche gezogen | **M** | Drop erzeugt Modul an der Drop-Position; bei ungültigem Ziel passiert nichts + Hinweis |
| **FR-21** | Module werden per **Drag** innerhalb ihrer Trägerfläche **umgeordnet** (nicht frei positioniert) | **M** | Während des Ziehens zeigt eine Einfügemarke die Zielposition; beim Loslassen rutschen die Nachbarn nach. Kein freies x/y — die Position folgt aus der Sequenz (`system-architecture.md` §5) |
| **FR-22** | Module werden per **Griff** im **Platz** verändert — nur in den Achsen, die der Modultyp als veränderbar deklariert | **M** | M01: Breite **und** Höhe. **M03: nur Anzahl/Paare — die Höhe ist `derived` (`nadelLaenge + zugabe`) und hat keinen Griff.** Die UI zeigt stattdessen „Höhe folgt Nadel (200 mm) 🔒" |
| **FR-23** | Skalierung respektiert **Mindest- und Maximalmaße** des Modultyps | **M** | Kein Modul kann unter sein Minimum gezogen werden; der Griff stoppt sichtbar |
| **FR-24** | Jedes Modul hat ein **Eigenschaften-Panel** mit allen typspezifischen Parametern | **M** | Jeder Parameter hat Label, Einheit, Grenzen und Hilfetext |
| **FR-25** | Module lassen sich **duplizieren, löschen, umordnen** (Reihenfolge im Kanal) | **M** | Duplizieren erzeugt Kopie direkt daneben; Umordnen per Drag oder Tastatur (Alt+←/→) |
| **FR-26** | Alle Aktionen sind **rückgängig machbar** (Undo/Redo) | **M** | ≥ 50 Schritte; Undo nach Löschen stellt Modul samt Parametern wieder her |
| **FR-27** | Module können **gesperrt** werden (kein versehentliches Verschieben) | **C** | – |
| **FR-28** | Modulbibliothek bietet **Kategorien, Suche und Favoriten** | **M** (Suche `S`) | Suche findet Modul über deutschen und englischen Namen; Favoriten persistieren lokal |
| **FR-29** | Nicht verfügbare Module (`status: planned`) sind **sichtbar, aber nicht klickbar**, mit Begründung | **M** | Tooltip: „Kommt in Stufe 2 — erfordert Polsterkonstruktion" |

> **FR-29 ist eine Anti-Anforderung mit Absicht:** P6 (Ehrlichkeit). Ein graues, erklärtes Modul
> ist besser als ein gebautes, das nicht funktioniert.

### 3.4 Das Bindungskonzept (Auflösung des Phase-1/Phase-2-Konflikts)

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-30** | Jedes Modul hat eine **Bindung**: `channel` (1D auf einer Trägerfläche), `slot` (2D-Zellen), `free` (Freiform) | **M** | Datenmodell enthält das Feld; UI zeigt die Bindung im Panel an |
| **FR-31** | Der **MVP implementiert ausschließlich `channel`** | **M** | Versuch, `slot`/`free` zu setzen, wird von Zod abgelehnt mit klarer Meldung |
| **FR-32** | Ein Kanal ist eine **geordnete Sequenz** von Modulen entlang einer Achse einer Trägerfläche | **M** | Reihenfolge ist explizit im Modell (Array-Position), nicht aus Koordinaten abgeleitet |
| **FR-33** | Module im Kanal haben **eine freie Koordinate** (Offset entlang des Kanals) und **eine abgeleitete** (Anlage an die Flächenkante) | **M** | Höhe/Anlage ergibt sich aus Modultyp; nicht per Drag veränderbar |
| **FR-34** | Der Übergang zu `slot`/`free` erfordert **keine Änderung** an Geometrie, Material oder Export | **M** | Architektur-Test: ein synthetisches `slot`-Modul durchläuft denselben Pipeline-Pfad |

> Ausführlich: [`../PHASE-2.md`](../PHASE-2.md) §3, [`../engineering/system-architecture.md`](../engineering/system-architecture.md) §5.

### 3.5 Konstruktion berechnen

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-40** | Nach jeder Änderung wird die Konstruktion **inkrementell** neu berechnet (nicht neu geladen) | **M** | Panel-Änderung bei 30 Modulen → Neuberechnung < 50 ms (gemessen, siehe NFR-05) |
| **FR-41** | Die Berechnung ist **deterministisch**: gleiche Eingabe → bit-identische Ausgabe | **M** | Golden-Test: 2 Läufe, identischer Hash über Geometrie + Materialmengen |
| **FR-42** | Alle internen Maße sind **Millimeter (Integer)**; Anzeige konvertiert nach cm/mm/inch | **M** | Kein Float im gespeicherten Modell (Zod: `z.number().int()`) |
| **FR-43** | Die Konstruktion erzeugt **Schnittteile, Nähoperationen und Materialbedarf** in einem Durchlauf | **M** | Eine reine Funktion `construct(project) → Construction` — kein versteckter Seiteneffekt |
| **FR-44** | Berechnung ist **abbrechbar / wiederholbar** ohne Zustandsverlust | **M** | 50 schnelle Änderungen hintereinander → konsistentes Endergebnis (Property-Test) |
| **FR-45** | **Expertenmodus**: Maße direkt eingeben, statt über Gegenstände abzuleiten | **S** | Toggle „Expertenmodus" blendet Rohmaß-Felder ein |
| **FR-46** | Die Konstruktion ist **ohne UI** aufrufbar (Headless/CLI-fähig) | **M** | Unit-Test ruft `construct()` direkt auf, ohne React |
| **FR-47** | Jede abgeleitete Zahl ist **nachvollziehbar** („warum ist das Fach 5,2 cm?") | **M** | Tooltip/Details zeigt die Herleitungskette |

### 3.6 Warnungen und Verbesserungsvorschläge

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-50** | Jede Warnung hat **Schweregrad** (`info` / `warn` / `error`), **Ort** (Modul-ID), **Ursache** (Regel-ID) und **Vorschlag** | **M** | Kein Fehler ohne `suggestedFix`; Zod-Schema erzwingt das |
| **FR-51** | `error` **blockiert** Export; `warn` blockiert nicht, wird aber im PDF vermerkt | **M** | Export-Button ist bei `error` deaktiviert, mit Begründung im Tooltip |
| **FR-52** | Ein Vorschlag ist **mit einem Klick anwendbar** („Übernehmen") | **M** | Klick ändert die Konfiguration; danach verschwindet die Warnung |
| **FR-53** | Warnungen erklären **warum**, in Alltagssprache | **M** | Text-Snapshot-Test: kein Text enthält nur einen Code |
| **FR-54** | Die Anzahl offener Warnungen ist **immer sichtbar** (Badge), nicht versteckt | **M** | Badge im Header, klickbar → Liste |
| **FR-55** | Positive Bestätigung, wenn alles passt („Alles nähbar. 4 Teile, 0,6 m Stoff.") | **M** | Sichtbarer, ruhiger Zustand ohne Warnungen |

### 3.7 Materialliste

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-60** | Die Materialliste unterscheidet **exakte Menge** (Stück, cm Elastik, cm Reißverschluss) und **geschätzten Verbrauch** (Meter Stoff bei gegebener Breite) | **M** | Jede Zeile trägt ein Feld `certainty: 'exact' \| 'estimated'` |
| **FR-61** | Stoffverbrauch berücksichtigt **Stoffbreite**, **Fadenlauf** und **Zuschnittanordnung** | **M** | Änderung der Stoffbreite 140 → 90 cm ändert den Verbrauch nachvollziehbar |
| **FR-62** | Materialien haben **Klartextnamen + Spezifikation** („Gummiband, 10 mm breit, 1,45 m") | **M** | Kein Eintrag nur als ID |
| **FR-63** | Die Liste ist **kopierbar** und **mobil abrufbar** (Einkaufsmodus) | **M** | Ein-Klick-Kopieren in die Zwischenablage; eigene mobile Ansicht |
| **FR-64** | Fehlmengen-Hinweis: wenn ein Material nicht in üblichen Packungsgrößen liegt, wird die Packung genannt | **S** | „1,45 m Elastik → 1 Packung à 3 m" |
| **FR-65** | Affiliate-/Bezugslinks sind **klar gekennzeichnet** und **abschaltbar** | **C** | – |

### 3.8 Schnittmuster

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-70** | Für jedes Schnittteil werden **Schnittlinie** (mit NZ), **Nählinie** (ohne NZ), **Faltlinie** und **Fadenlauf** erzeugt | **M** | SVG-Ausgabe enthält separate, benannte Layer/`data-`Attribute |
| **FR-71** | Nahtzugabe ist **global einstellbar** (Default 10 mm) und **pro Teil überschreibbar** | **M** | Wert im Export sichtbar; Änderung ändert die Schnittlinie, nicht die Nählinie |
| **FR-72** | Jedes Teil trägt **Name, Zuschnittzahl, Stoffart, Größe in mm** | **M** | Alle 4 Angaben im PDF-Label sichtbar |
| **FR-73** | Knipse (Notches) markieren **Befestigungspunkte** (z. B. Elastik-Anlagepunkte) | **M** | Anzahl Knipse = Anzahl dokumentierter Befestigungspunkte (Test) |
| **FR-74** | Teile werden **auf Seiten verteilt** (A4/Letter/A3/A0), mit **Seitenübersicht, Klebemarken und Kalibrierquadrat** | **M** | 50-mm-Referenz auf Seite 1; Überschneidungsprüfung verhindert abgeschnittene Teile |
| **FR-75** | SVG-Export in **Originalgröße in mm** | **M** | SVG `width="…mm"` und `viewBox` konsistent; 1 SVG-Einheit = 1 mm |
| **FR-76** | Jedes Teil kann **einzeln** exportiert werden | **S** | – |
| **FR-77** | Teile-Preisliste: Fläche pro Material (für Gewerbe) | **C** | – |

### 3.9 Nähanleitung

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-80** | Die Anleitung wird **aus den Nähoperationen der gewählten Module** erzeugt, nicht aus einem statischen Text | **M** | Entfernen eines Moduls entfernt dessen Schritte; Text-Snapshot ändert sich |
| **FR-81** | Schritte enthalten **konkrete Zahlen der Konfiguration** | **M** | „Elastik bei 4,2 / 8,9 / 13,6 cm anzeichnen" — nicht „gleichmäßig" |
| **FR-82** | Schritte sind **geordnet nach Fertigungslogik**, nicht nach Modulreihenfolge | **M** | Constraint-Test: „Reißverschluss“ kommt vor „Futter einnähen“ |
| **FR-83** | Jeder Schritt nennt **benötigte Teile und Materialien** | **M** | Querverweis auf Schnittteil-IDs |
| **FR-84** | Die Anleitung ist **als PDF anhängbar** an das Schnittmuster-PDF | **M** | Ein Download enthält Muster + Anleitung + Materialliste |
| **FR-85** | Illustrierte Schritte (Icons/Diagramme) | **C** | – |

### 3.10 Export

| ID | Anforderung | Prio | Abnahmekriterium |
|---|---|---|---|
| **FR-90** | Export als **PDF** (getiled + A0) und **SVG** | **M** | Beide Formate aus derselben Geometrie erzeugt |
| **FR-91** | **Projektor-Modus**: invertiertes, kontrastreiches SVG für Deckenprojektion | **S** | – |
| **FR-92** | **Datenexport** des Projekts als JSON (versioniert) und **Wiederimport** | **M** | Round-Trip-Test: Export → Import → identischer Konstruktions-Hash |
| **FR-93** | **Teilen per Link** kodiert das Projekt im URL-Fragment | **S** | Szenario-2-Priorität; Datenschutz: Fragment wird nicht an den Server gesendet |
| **FR-94** | Dateinamen sind **sprechend und stabil** (`nadel-etui_24x18cm_v3.pdf`) | **M** | Namensschema-Test |
| **FR-95** | Export enthält **Deckblatt** mit Konfigurations-Zusammenfassung und Warnhinweis „Testnähen empfohlen" | **M** | Sichtbar auf Seite 1 |

### 3.11 Bewusst ausgeschlossen (`W`)

| ID | Nicht-Anforderung | Begründung |
|---|---|---|
| **FR-W1** | Freie 2D-Platzierung mit Kollisionsauflösung | Phase 1: Aufwand 9/10, Nachfrage niedrig; Bindungsmodell ist nach oben offen (FR-30/34) |
| **FR-W2** | 3D-Engine mit Stoffsimulation | CLO/Atomm besetzen das; Aufwand 5/5, kein Conversion-Beweis |
| **FR-W3** | KI-Prompt → Schnittmuster | Ourlette/IntelliSeam; Erwartungsfalle |
| **FR-W4** | Konto, Cloud-Sync, Team-Freigaben | widerspricht P5 und dem „kein Konto"-Anker |
| **FR-W5** | Automatisches Nesting / Verschnittoptimierung | Aufwand hoch, Nutzen erst für Gewerbe (Stufe 3) |
| **FR-W6** | Kleidungskonstruktion | anderes Produkt |
| **FR-W7** | Marketplace | Makerist-Beleg |
| **FR-W8** | Native Apps | mobile Konstruktion unrealistisch |

---

## 4. Nicht-funktionale Anforderungen

| ID | Anforderung | Zielwert | Messung |
|---|---|---|---|
| **NFR-01** | Erstes sinnvolles Bild (LCP) auf Mittelklasse-Notebook, 4G | **< 1,5 s** | Lighthouse, Playwright-Trace |
| **NFR-02** | Interaktionslatenz beim Ziehen eines Moduls | **< 16 ms/Frame** (60 fps) | Performance-Marker im Drag-Handler |
| **NFR-03** | Vollständige Konstruktion (**24 Module** — dieselbe Zahl wie `V-G-09`) | **< 50 ms** | Benchmark in Vitest |
| **NFR-04** | PDF-Erzeugung (10 Seiten) | **< 2 s** | Benchmark |
| **NFR-05** | Bundle-Größe (initiales JS, gzip) | **< 250 kB** | Build-Report im CI |
| **NFR-06** | Funktioniert **offline** nach Erstaufruf (Service Worker) | ja | Playwright offline-Modus |
| **NFR-07** | Kein Netzwerk-Request mit Projektdaten (Datenschutz) | 0 Requests mit Projektdaten | Request-Interception-Test im CI |
| **NFR-08** | Browser-Support | letzte 2 Versionen Chrome/Firefox/Safari/Edge, iOS Safari 16+, Android Chrome | BrowserStack/Playwright-Projekte |
| **NFR-09** | Bedienbar per Tastatur (alle Editor-Aktionen) | vollständig | axe + manuelle Prüfung |
| **NFR-10** | WCAG 2.1 AA: Kontraste, Fokus, Labels, keine Farbe als einziges Signal | erfüllt | axe-core im CI, 0 critical |
| **NFR-11** | Keine externen Fonts/CDNs (Datenschutz + Offline) | 0 externe Requests | CI-Assertion |
| **NFR-12** | Zustand übersteht Reload ohne Datenverlust | ja | E2E-Test |
| **NFR-13** | Deterministische Ausgabe über Browser hinweg | identischer Hash | Matrix-Test in 4 Browsern |
| **NFR-14** | Fehlerbehandlung: nie ein weißer Screen | Error Boundary + „Konfiguration zurücksetzen" | Chaos-Test (korruptes localStorage) |
| **NFR-15** | Druckgenauigkeit: 50 mm Kalibrierstrecke | ±0,5 mm bei 100 % Druck | manueller Test + dokumentiertes Verfahren |

---

## 5. Editor-Konzept (Desktop)

### 5.1 Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER   Projektname · Grundform · [Warnungen ⚠2] · [Undo][Redo] · [Drucken] │
├───────────────┬──────────────────────────────────────────┬───────────────────┤
│ MODULE        │  ARBEITSFLÄCHE                           │ EIGENSCHAFTEN     │
│ ─────────     │  ┌────────────────────────────────────┐  │ ───────────────   │
│ 🔍 Suche      │  │  Bemaßung: 240 mm                  │  │ Tab:              │
│               │  │  ┌──────────────────────────────┐  │  │ [Maße][Modul]     │
│ ★ Favoriten   │  │  │ P1 Vorderpanel               │  │  │ [Material]        │
│               │  │  │ ┌────┐┌────┐┌──────────┐     │  │  │ [Konstruktion]    │
│ ▸ Nadeln   (4)│  │  │ │NK 1││NK 2││ Elastik  │     │  │                   │
│ ▸ Taschen  (3)│  │  │ └────┘└────┘└──────────┘     │  │ Name:  Nadelkanal │
│ ▸ Halter   (5)│  │  │      ▲ Kanalachse            │  │ Breite: [42] mm   │
│ ▸ Trenner  (2)│  │  └──────────────────────────────┘  │ Höhe:  folgt Nadel│
│ ▸ Verschl. (3)│  │                                    │ Tiefe: [15] mm    │
│               │  │  P2 Hinterpanel                    │                   │
│ [Alle]        │  └────────────────────────────────────┘  │ ⓘ Warum 51 mm?    │
│               │  Raster [1cm▾] Zoom [– 100% +] [Fit]      │                   │
├───────────────┴──────────────────────────────────────────┴───────────────────┤
│ UNTEN: [Schnittmuster] [Material] [Zuschnitt] [Nähanleitung]   (Tab-Leiste)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Vier Bereiche, klar getrennt:**

1. **Links — Modulbibliothek.** Kategorien, Suche, Favoriten. Ziehbar.
2. **Mitte — Arbeitsfläche.** Panels, Module, Raster, Bemaßung, Hilfslinien.
3. **Rechts — Eigenschaften.** Kontextsensitiv zum ausgewählten Modul *oder* zur Grundfläche.
4. **Unten — Ergebnisbereiche.** Schnittmuster, Material, Zuschnitt, Anleitung als Tabs.

### 5.2 Interaktionsmodell (Desktop)

| Aktion | Auslöser | Rückmeldung | Abbruch |
|---|---|---|---|
| Modul hinzufügen | Drag aus Bibliothek → Drop im Kanal | Geister-Vorschau mit Maßen, Einrasten, „+”-Marker an Einfügeposition | Esc oder Drop außerhalb |
| Modul verschieben | Drag am Modulkörper | Live-Position in mm am Zeiger, Einrasten am Raster (5 mm / 1 cm), Nachbarn rücken nach | Esc stellt Ausgangsposition wieder her |
| Modul skalieren | Drag am seitlichen Griff | Live-Breite, Mindestmaß als „Mauer", Warnung erscheint ab Unterschreitung | Esc |
| Auswählen | Klick | Blauer Rahmen + Handles + Eigenschaften-Panel aktualisiert | Klick auf leere Fläche |
| Mehrfachauswahl | Shift+Klick / Rahmenziehen | alle markiert, gemeinsames Panel (nur gemeinsame Felder) | – |
| Umordnen | Drag über Nachbar / Alt+←→ | Modul tauscht Platz, Kanal ordnet sich neu | Esc |
| Duplizieren | Ctrl/Cmd+D oder Kontextmenü | Kopie rechts daneben, ausgewählt | – |
| Löschen | Entf / Context-Menü | Modul verschwindet, Kanal schließt Lücke | Ctrl+Z |
| Undo/Redo | Ctrl+Z / Ctrl+Shift+Z | Zustand inkl. Auswahl | – |
| Fläche wechseln | Klick auf Panel-Reiter / Tab | Panel wechselt, Zoom bleibt | – |
| Zoomen | Scroll/Pinch, Ctrl+Scroll, Buttons | Zeiger-zentriert | „Fit" setzt zurück |
| Pan | Space+Drag, Mittelklick-Drag, Zwei-Finger | – | – |
| Raster umschalten | Button / Taste `G` | 1 cm → 5 mm → aus | – |
| Bemaßung umschalten | Taste `M` | Maße an/aus | – |
| Hilfe zu einer Zahl | Hover über ⓘ | Popover mit Herleitungskette | – |

### 5.3 Sichtbarkeit und Hierarchie (was der Editor *nicht* zeigt)

- **Keine Punkt-/Kurvenwerkzeuge.** Kein Ankerpunkt, kein Bézier-Griff. Das ist CAD und durch P1/§7 ausgeschlossen.
- **Keine Formel-/Variablenansicht** (das ist FR-45 Expertenmodus, Stufe 2, und selbst dort nur Zahlen).
- **Keine Layer-Verwaltung.** Panels sind die „Layer" (P3: eine Quelle pro Zahl).
- **Keine Ebenen-, Sperr- oder Gruppenfunktionen** außer Modul-Sperre (FR-27, `C`).

### 5.4 Die Arbeitsfläche und das Bindungsmodell im UI

**Visuell entscheidend:** Die Trägerflächen werden als **Panels mit sichtbarem Kanal** gezeichnet.
Der Kanal ist eine Linie/Zone auf der Fläche. Module sitzen *im* Kanal, nicht *auf* der Fläche.

```text
        ┌─────────────────────────────────────────── P1 · Vorderpanel · 240 × 180 mm
        │  ╔══════════════════════════════════════════════════════════════╗  ← Kanal
        │  ║ [Nadelkanal 1] [Nadelkanal 2] [Elastik-Reihe] [Fach]         ║
        │  ╚══════════════════════════════════════════════════════════════╝  ← Anlagekante unten
        │      ↑ Griff zum Verschieben (nur horizontal)
        └───────────────────────────────────────────────────────────────────
           ▶ Freiraum unter dem Kanal wird sichtbar als „ungenutzt" markiert
```

**Warum das für den Nutzer besser ist [A]:** Er sieht sofort, *wo* ein Modul hingehört und
*warum* es nicht woanders hin kann. Ein leerer Canvas mit „du darfst alles" erzeugt genau die
Frage, an der Seamly-Nutzer scheitern (*„working out the functions"*).

**Ehrliche Einschränkung [A]:** Dieser Ansatz ist **weniger frei** als ein CAD und wird von
Jonas (Persona 3) als Begrenzung erlebt. Deshalb: FR-45 Expertenmodus und die offene
Bindungsarchitektur. **Jonas ist Priorität 3 — er darf nicht die Oberfläche für Priorität 1
bestimmen.**

---

## 6. Touch-UX (Tablet & Mobile)

### 6.1 Grundsatzentscheidung

> **Touch ist kein verkleinerter Desktop. Touch ist eine eigene Anwendung auf derselben Engine.**

Analyse aus Phase 1 (`customer-research.md` §4): Nutzungssituationen sind
**„am Sofa, Idee" (Smartphone)** und **„am Nähplatz, Werkzeug messen" (Tablet)**. Layout-Bauen
am Telefon ist unrealistisch. Daraus folgt eine **Dreiteilung**:

| Gerät | Rolle | Was es kann | Was es nicht tut |
|---|---|---|---|
| **Smartphone** (< 768 px) | **Lesen, Messen, Einkaufen, Teilen** | Projekt ansehen, Gegenstände messen/eingeben, Materialliste, Anleitung lesen, Link teilen | Module frei platzieren, Feinkonstruktion |
| **Tablet** (768–1180 px, Touch) | **Anpassen, Prüfen** | Alles außer präzisem Millimeter-Justieren: Module hinzufügen, verschieben (grob + numerisch), konfigurieren, exportieren | Pixelgenaues Ziehen |
| **Desktop** (≥ 1180 px, Maus) | **Konstruieren** | vollständiger Editor | – |

**Die entscheidende Konsequenz:** Auf Touch wird **nicht** justiert, sondern **gewählt**. Wenn
Präzision nötig ist, wird der Wert **numerisch oder per Stepper** gesetzt — nicht per Finger.

### 6.2 Smartphone-Konzept (Mobile „Studio-Begleiter")

**Keine verkleinerte Arbeitsfläche.** Stattdessen vier Vollbild-Ansichten, gewechselt über eine
**untere Navigationsleiste** (max. 4 Einträge, je ≥ 56 px hoch):

```text
┌─────────────────────────────┐
│ ☰  Nadel-Etui · 240×180     │  ← Kopfzeile, 1 Zeile, Titel + Maße
├─────────────────────────────┤
│                             │
│   ┌───────────────────┐     │
│   │                   │     │
│   │   PANEL-VORSCHAU  │     │  ← Ein Panel groß, hochkant, zoom-/pan-fähig
│   │   (read-mostly)   │     │     Module antippbar → Bottom-Sheet mit Werten
│   │                   │     │
│   └───────────────────┘     │
│                             │
│  ◀ P1 · Vorderpanel ▶       │  ← Panel-Wechsler als Segmented Control
├─────────────────────────────┤
│  📐 Maße   🧵 Material  📖  │  ← untere Navigation
│           Anleitung  ⤓ Teilen│
└─────────────────────────────┘
```

**Regeln für Mobile:**

| Regel | Konkretisierung |
|---|---|
| **Eine Scrollachse pro Ansicht** | Die Vorschau scrollt **nie**; sie zoomt/pant. Die Liste darunter ist die einzige scrollende Fläche. Keine verschachtelten Scroll-Container |
| **Primäraktion in Daumenreichweite** | Alle Aktionen in der unteren 40 % des Screens oder als Bottom-Sheet |
| **Bottom-Sheets statt Modals** | Eigenschaften erscheinen als Sheet (3 Höhen: peek 25 % / half 55 % / full 90 %), mit Griff und Backdrop-Dismiss |
| **Tap-Ziele ≥ 44 × 44 px** | inkl. 8 px Abstand zwischen Zielen |
| **Kein Hover** | Alle Hover-Informationen haben ein Tap-Äquivalent (ⓘ-Button) |
| **Keine zwei gleichzeitig sichtbaren Panels** | Bibliothek **oder** Eigenschaften **oder** Vorschau |
| **Werte per Stepper** | ± 1 mm / ± 5 mm Buttons und numerische Eingabe; **kein** Finger-Slider unter 2 cm Breite |
| **Sichtbare Editor-Steuerung** | Zoom-Buttons (nicht nur Pinch), „Fit"-Button dauerhaft eingeblendet, Panel-Wechsler immer sichtbar |

### 6.3 Tablet-Konzept (Zwei-Zonen-Layout)

```text
┌───────────────────────────────────────────────────────────────┐
│ Header: Titel · Warnungen · Drucken                            │
├──────────────────────────────────────┬────────────────────────┤
│                                      │                        │
│         ARBEITSFLÄCHE                │   EIGENSCHAFTEN        │
│         (2-Finger-Pan,               │   als feste rechte     │
│          Pinch-Zoom,                 │   Spalte 320–360 px    │
│          Long-press = Kontextmenü)   │   (kein Overlay)       │
│                                      │                        │
│                                      │   oder als Sheet,      │
│                                      │   wenn < 900 px breit  │
├──────────────────────────────────────┴────────────────────────┤
│  Bibliothek als BOTTOM-SHEET (hochziehbar), nicht als Spalte   │
└───────────────────────────────────────────────────────────────┘
```

**Tablet-spezifische Interaktionen:**

| Interaktion | Umsetzung | Warum |
|---|---|---|
| **Touch-Drag & Drop** | **Long-press (300 ms) hebt das Modul an**, dann Drag. Vorher scrollt die Bibliothek | verhindert Konflikt zwischen Scrollen und Ziehen |
| **Drop-Ziel-Hervorhebung** | Kanal leuchtet auf, Einfüge-Lücke klappt auf (20 mm breit) | Finger verdeckt das Ziel → Ziel muss *um* den Finger herum sichtbar sein |
| **Präzisionsmodus** | Nach dem Drop: Wert im Sheet, ±1 mm Stepper, „Einrasten 5 mm" | Finger kann keine 2 mm |
| **Verschieben** | Drag am Modul mit **Offset-Anzeige oberhalb des Fingers** (nie darunter) | Finger verdeckt sonst die Zahl |
| **Skalieren** | Griffe 24 × 24 px, nur an den erlaubten Achsen; alternativ numerisch | zu kleine Griffe = Fehlbedienung |
| **Zoom/Pan** | Pinch + Zwei-Finger-Pan; **Ein-Finger = Aktion**, Zwei-Finger = Navigation | eindeutige Geste |
| **Undo** | dauerhaft sichtbarer Button (nicht nur Geste) | Gesten sind nicht entdeckbar |
| **Kontextmenü** | Long-press auf Modul → Duplizieren, Löschen, Sperren | spart Panel-Platz |

### 6.4 Was auf Touch **nicht** passiert (bewusste Grenzen)

- **Kein Multi-Select per Rahmen** (unzuverlässig mit Finger) → nur „Alle im Kanal auswählen".
- **Kein Feinjustieren unter 5 mm** ohne numerische Eingabe.
- **Keine Bibliothek-Suche mit Tastatur-Zwang** → Chips und Kategorien zuerst.
- **Keine Animationen über 150 ms** (Touch fühlt sich sonst träge an).

### 6.5 Responsive Bruchpunkte (verbindlich)

| Breakpoint | Layout | Editor-Modus |
|---|---|---|
| < 640 px | 1 Spalte, untere Navigation, Bottom-Sheets | **Begleiter** (kein freies Platzieren) |
| 640–900 px | 1 Spalte, Sheet-basiert, größere Canvas | **Begleiter+** (Platzieren per „Einfügen"-Button, nicht Drag) |
| 900–1180 px | 2 Zonen: Canvas + Sheet | **Anpassen** (Drag + numerisch) |
| ≥ 1180 px | 3 Zonen: Bibliothek + Canvas + Eigenschaften | **Konstruieren** (voll) |

---

## 7. Barrierefreiheit und Sprache

| ID | Anforderung | Prio |
|---|---|---|
| **UX-01** | Alle Editor-Aktionen per Tastatur erreichbar (Tab-Reihenfolge, Fokus sichtbar, Shortcuts dokumentiert) | M |
| **UX-02** | Modul-Auswahl hat eine **Listen-Alternative** (Tabelle aller Module mit Werten, editierbar) | M |
| **UX-03** | Statusmeldungen als `aria-live` (Warnungen werden angesagt) | M |
| **UX-04** | Farbe nie als einziges Signal (Warnungen haben Icon + Text) | M |
| **UX-05** | Sprache Deutsch als Default, Englisch als zweite Locale; **Fachbegriffe mit Glossar** | M |
| **UX-06** | Zahlen mit Einheit, Einheiten umschaltbar (mm/cm/inch), **Eingabe tolerant** („12,5", „12.5", „12,5cm") | M |
| **UX-07** | Druckfreundliche Ansichten (schwarz/weiß-tauglich, keine Farbverläufe) | M |
| **UX-08** | `prefers-reduced-motion` respektiert | S |

---

## 8. Abnahmekriterien für den MVP (Gesamtsicht)

Der MVP gilt als fertig, wenn **alle** folgenden Punkte in einem dokumentierten Testlauf
nachgewiesen sind:

1. Ein Nutzer ohne Vorkenntnis erzeugt in **< 3 Minuten** ein druckfertiges Nadel-Etui.
2. Der Pfad ohne Editor benötigt **≤ 4 Interaktionen**, mit Editor **≤ 8**.
3. Das PDF druckt bei 100 % eine **50-mm-Referenz mit ±0,5 mm**.
4. **Keine** Konfiguration kann erzeugt werden, die eine `error`-Regel verletzt (Property-Test über 10.000 Zufallskonfigurationen).
5. Zwei Läufe mit identischem Projekt erzeugen **bit-identische** SVG-Geometrie.
6. Die Nähanleitung nennt **die tatsächlichen Zahlen** der Konfiguration (Snapshot-Test).
7. Die Materialliste trennt **exakt** und **geschätzt** korrekt für alle 4 Module.
8. Das Ergebnis ist auf **iOS Safari, Android Chrome, Desktop-Chrome/Firefox/Safari** identisch.
9. **Null** Netzwerk-Requests mit Projektdaten.
10. Ein **Testnähen** des Standardprojekts ist durchgeführt und dokumentiert (Foto + Ergebnis).

> Punkt 10 ist nicht verhandelbar. Phase 1 (`opportunity-analysis.md` §10, Aufgabe 2) verlangt es
> ausdrücklich — und es ist die einzige Prüfung, die ein PDF nicht bestehen kann.
