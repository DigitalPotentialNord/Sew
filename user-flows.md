# User Flows

Stand: 26.11.2026 · Anforderungen: [`prd.md`](prd.md) · Vision: [`product-vision.md`](product-vision.md)

---

## 0. Lesehilfe

Jeder Flow hat: **Ziel**, **Auslöser**, **Schritte** (mit Systemreaktion), **Zustandswechsel**,
**Fehlerpfade** und **Abbruchpunkte** — also Stellen, an denen echte Nutzer aussteigen. Diese
Abbruchpunkte sind die wichtigsten Stellen im Produkt und werden im Playwright-Test
instrumentiert (Ereignis `drop_off` mit Ort).

**Die harte Leitplanke (PRD NFR, Vision V3):**

```text
Ohne Editor:  ≤ 4 Interaktionen bis PDF
Mit Editor:   ≤ 8 Interaktionen bis PDF
Median-Zeit:  < 3 Minuten
```

Jeder Flow, der diese Grenze reißt, ist ein Fehler im Flow — nicht im Nutzer.

---

## 1. Übersicht der Flows

```text
                    ┌──────────────────┐
   F1 ──────────────▶│  Einstieg        │◀────────────── F9 (Link)
   (Erstbesuch)      │  Beispielprojekt │
                     └────────┬─────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
   F2 ▼                F2b ▼ │                      │
  ┌──────────┐   ┌──────────────────┐               │
  │ Schnell- │   │ Grundform + Maße │               │
  │ weg      │   │ (geführt)        │               │
  │ (Preset) │   └────────┬─────────┘               │
  └────┬─────┘            │                          │
       │                  │                          │
       │           F3/F4 ▼                           │
       │        ┌──────────────────┐                 │
       │        │ Füllmenge        │                 │
       │        │ (Gegenstände)    │                 │
       │        └────────┬─────────┘                 │
       │                 │                           │
       │        F5 ▼     ▼                           │
       │     ┌────────────────────────┐              │
       └────▶│  EDITOR                │◀─────────────┘
             │  (F5–F8)               │
             └───────┬────────────────┘
                     │
         F8 Warnungen▼
             ┌────────────────┐
             │ F10 Material   │
             └───────┬────────┘
                     │
             F11 ▼   ▼
             ┌────────────────┐
             │ F12 Export     │
             └───────┬────────┘
                     │
             F13 ▼   ▼
             ┌────────────────┐
             │ F14 Nach dem   │
             │ Export         │
             └────────────────┘
```

| Flow | Name | Priorität |
|---|---|---|
| **F1** | Erstbesuch / Kaltstart | M |
| **F2** | Schnellweg (Preset → PDF) | **M (der wichtigste Flow)** |
| **F3** | Grundform wählen | M |
| **F4** | Abmessungen bestimmen | M |
| **F5** | Füllmenge erfassen („was nimmst du mit") | **M (Alleinstellungsmerkmal)** |
| **F6** | Editor: Modul hinzufügen (Drag & Drop) | M |
| **F7** | Editor: Modul konfigurieren | M |
| **F8** | Editor: verschieben / skalieren / umordnen | M |
| **F9** | Warnungen prüfen und beheben | M |
| **F10** | Materialliste prüfen | M |
| **F11** | Schnittmuster generieren | M |
| **F12** | Export | M |
| **F13** | Nach dem Export (Rückmeldung, Teilen, Wiederverwenden) | M |
| **F14** | Wiederaufnahme (Reload / geteilter Link) | M |
| **F15** | Fehler- und Randfälle | M |

---

## F1 — Erstbesuch / Kaltstart

**Ziel:** In ≤ 10 Sekunden zeigen, was das Produkt tut — ohne Erklärung, ohne Wizard.
**Auslöser:** Aufruf der Domain.
**Persona:** Maike (Strick) kommt über Google „stricknadel etui nähen schnittmuster".

| # | Nutzer | System |
|---|---|---|
| 1 | öffnet Seite | Lädt **lauffähiges Beispielprojekt** (Nadel-Etui, 240 × 180 mm, 3 Module) — **kein leerer Canvas** (FR-02) |
| 2 | sieht Arbeitsfläche | Zeigt Modulbibliothek links, Panels in der Mitte, Eigenschaften rechts, Tabs unten — **vollständig, nicht schrittweise** |
| 3 | liest Kopfzeile | `Nadel-Etui · 240 × 180 mm · 4 Teile · 0,6 m Stoff · ✓ Alles nähbar` |
| 4 | sieht Primäraktion | **`[Drucken]`** ist der prominenteste Button, nicht „Neu starten" |

**Zustandswechsel:** `empty → example-loaded`

**Designentscheidung [A]:** Das Beispiel ist **nicht** ein Tutorial-Overlay. Kein „Willkommen,
klicke hier". Der Nutzer soll sehen: *das ist ein Werkzeug, es ist fertig, ich kann sofort
drucken*. Phase 1: „Kein Konto. Kein CAD. Kein Suchen."

**Abbruchpunkte:**
- A1: Nutzer versteht nicht, dass das Beispiel *sein* Projekt sein kann → **Lösung:** Kopfzeile
  zeigt `Beispiel — [Für mich anpassen]` als zweiten Button neben `[Drucken]`.
- A2: Nutzer will sofort sein eigenes Projekt → **Lösung:** `[Neues Projekt]` in der Kopfzeile,
  führt zu F3.

**Fehlerpfade:**
- localStorage blockiert (Privatmodus) → Beispiel lädt trotzdem; Hinweis „Deine Änderungen
  werden in diesem Browser nicht gespeichert" (nicht blockierend).
- JS-Fehler → Error Boundary mit `[Beispiel neu laden]` (NFR-14).

---

## F2 — Schnellweg (Preset → PDF) ⭐ wichtigster Flow

**Ziel:** Ein druckfertiges Schnittmuster in **≤ 4 Interaktionen**.
**Auslöser:** `[Für mich anpassen]` oder `[Neues Projekt]` → Preset.
**Persona:** Kerstin/Maike/ein Großteil aller Nutzer.

```text
Schritt 1 ────────────── Schritt 2 ────────────── Schritt 3 ────────── Schritt 4
[Neues Projekt]          Preset wählen            Maße bestätigen       [Drucken]
      │                        │                        │                   │
      ▼                        ▼                        ▼                   ▼
  Grundform-Dialog     "Nadelspiele bis 20 cm"    240 × 180 × 40 mm      PDF öffnet
  (2 Optionen)          → setzt alle Maße           (vorausgefüllt)      (Druckdialog)
```

| # | Nutzer | System | Interaktion |
|---|---|---|---|
| 1 | klickt `[Neues Projekt]` | Öffnet Grundform-Auswahl (Etui / Rolle), 2 Karten mit Vorschaubild | **1** |
| 2 | wählt „Etui" | Zeigt Maßvorschläge als **Preset-Karten**: „Nadelspiele bis 20 cm · 240 × 180 mm", „Rundstricknadeln · 300 × 220 mm", „Eigene Maße" | **2** |
| 3 | wählt Preset | Erzeugt Projekt **mit vorkonfigurierten Modulen** (3 Nadelkanäle + 1 Elastik-Reihe), springt in Editor | **3** |
| 4 | klickt `[Drucken]` | Erzeugt PDF, öffnet Druck-/Download-Dialog | **4** |

**Zustandswechsel:** `example-loaded → project-created → constructed → exported`

**Ergebnis:** 4 Interaktionen, ~90 Sekunden. ✓ erfüllt die Leitplanke.

**Abbruchpunkte:**
- B1: Nutzer weiß nicht, welches Preset passt → **Lösung:** Jedes Preset nennt **konkrete
  Gegenstände** („für 20-cm-Nadelspiele"), nie Maße allein.
- B2: Nutzer will eigenes Maß → dritte Karte „Eigene Maße" führt zu F4.
- B3: Nach Preset-Wahl ist der Editor „überwältigend" → **Lösung:** Nach Preset-Wahl erscheint
  ein ruhiger Zustand: `[Drucken]` pulsiert nicht, aber ein Hinweisband sagt „Fertig — drucken
  oder anpassen". Der Pfad **muss** nicht durch den Editor.

**Fehlerpfade:**
- Preset erzeugt Warnung (sollte nicht passieren) → Presets sind **getestet**; falls doch, wird
  das Preset als fehlerhaft gemeldet und ein funktionierendes Fallback-Preset geladen.

---

## F3 — Grundform wählen

**Ziel:** Entscheidung in einer Interaktion, ohne Auswahllast.
**Auslöser:** `[Neues Projekt]`.

**Angebotene Formen im MVP (verbindlich):**

| Form | Beschreibung | Technische Basis |
|---|---|---|
| **Aufklappbares Etui** („Buch") | Zwei Panels, an einer Kante verbunden, Reißverschluss umlaufend | 2 Panels, gemeinsame Naht, RV entlang Umfang |
| **Ausrollbar** („Rolle") | Ein langes Panel, aufgerollt, Bänder oder Klettverschluss | 1 Panel + Bänder, keine RV-Rundung |

**Nicht im MVP:** Steh-Utensilo, Halbrund, Mehrfach-Faltung → `status: planned`, sichtbar mit
Begründung (FR-29).

| # | Nutzer | System |
|---|---|---|
| 1 | sieht 2 Karten | Jede Karte: Skizze (Vorder-/Innenansicht), 1 Satz Beschreibung, „typisch für: Nadelspiele, Häkelnadeln" |
| 2 | wählt Karte | Weiter zu F4 |
| 3 | (optional) `ⓘ` | Popover: Unterschied in 2 Sätzen, inkl. „was ist leichter zu nähen" |

**Designentscheidung [A]:** Die Formwahl zeigt **Innen- und Außenansicht**. Phase 1
(`customer-research.md`) belegt: *„I immediately dismiss any pattern that doesn't show the
inside"* — der Innenraum ist das Kaufargument, also muss er in der Auswahl sichtbar sein.

**Abbruchpunkt:** C1: Nutzer will eine andere Form → Verweis „Kommt in Stufe 2" mit
Newsletter-freiem Merkzettel (kein Konto: nur lokal gemerkt).

---

## F4 — Abmessungen bestimmen

**Ziel:** Maße setzen, ohne zu wissen, welche Maße sinnvoll sind.
**Persona:** Betül (Anfängerin) und Maike.

**Zwei Wege, gleichwertig angeboten:**

```text
┌─ Weg A: Gegenstandsgetrieben (empfohlen) ─────────────────────┐
│  "Was soll hinein?"                                          │
│  [Nadelspiele: Länge ▾ 20 cm]  [Anzahl: 8]                   │
│  [Rundstricknadeln: Seillänge ▾ 80 cm]  [Anzahl: 4]          │
│  → System schlägt 240 × 180 mm vor, mit Begründung           │
└──────────────────────────────────────────────────────────────┘
┌─ Weg B: Maßgetrieben (Experten) ─────────────────────────────┐
│  Breite [240] mm   Höhe [180] mm   Bund [40] mm             │
│  Form: (•) Rechteck ( ) abgerundet  Radius [20] mm          │
└──────────────────────────────────────────────────────────────┘
```

| # | Nutzer | System |
|---|---|---|
| 1 | sieht Weg A als Default | Weg B ist ein-klappbar, nicht versteckt (Jonas findet ihn in 1 Klick) |
| 2 | ändert „Anzahl Nadelspiele" | Maße **und** Modulanzahl aktualisieren live; Vorschau zeigt Panel |
| 3 | sieht Maße plausibel | Jedes abgeleitete Maß hat `ⓘ` mit Herleitung (FR-47): „8 Nadelspiele × 22 mm + 7 × 1,5 mmNaht = 186 mm" |
| 4 | bestätigt | → F5 oder direkt Editor |

**Validierung (live, nicht erst beim Klick):**

| Regel | Reaktion |
|---|---|
| Breite < 100 mm oder > 500 mm | Eingabe geklemmt, Hinweis „üblich sind 120–350 mm" |
| Bundbreite > 80 mm | Warnung `warn`: „Ein 90 mm breiter Bund lässt das Etui im Rücken ausbeulen." |
| ~~Tiefe~~ | **entfällt im MVP** — `depthMm` ist aus dem Schema entfernt (`pattern-data-model.md` §2.2.1); das Etui ist flach, zweilagig (außen + Futter) |
| Anzahl 0 | `info`: „Noch keine Nadeln erfasst — du kannst Module auch manuell hinzufügen" |
| Maße führen zu 0 passenden Modulen | `error`: „Diese Maße passen zu keinem Modul. Mindestens 120 × 100 mm nötig." mit `[Vorschlag übernehmen]` |

**Abbruchpunkt:** D1: Nutzer weiß seine Nadellänge nicht → **Lösung:** Dropdown mit gängigen
Längen **und** „messen: lege deine Nadel an ein Lineal" mit Mini-Illustration. Keine Pflichteingabe.

---

## F5 — Füllmenge erfassen („was nimmst du mit") ⭐ Alleinstellungsmerkmal

**Ziel:** Das Kernversprechen einlösen — Input ist der **Besitz**, nicht das Maß.

**Warum eigener Flow:** Phase 1, Positionierung B: *„Sag uns, was du mitnimmst."* Kein
Wettbewerber fragt das. Das ist Differenzierung #1.

**Interaktionsmuster:** Kartenliste, kein Formular.

```text
┌─ Was nimmst du mit? ───────────────────────────────────────┐
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🪡 Nadelspiele          Länge [20 cm ▾]   × [8]  🗑  │ │
│  │    └ 8 Fächer à 22 mm → Fachbreite 22 mm              │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🧶 Rundstricknadeln     Seil [80 cm ▾]    × [4]  🗑  │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ➕ Etwas hinzufügen  (Häkelnadeln, Markierer, ...)    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Ergebnis: 240 × 180 mm · 8 Nadelkanäle · 4 Elastik-Loops  │
│  [Übernehmen]                                               │
└─────────────────────────────────────────────────────────────┘
```

| # | Nutzer | System |
|---|---|---|
| 1 | sieht Vorschlagsliste | Top-5 der häufigsten Gegenstände (aus Domänenwissen, **nicht** aus Tracking) |
| 2 | stellt Länge/Anzahl | Zeile zeigt die **abgeleitete Fachbreite** live — das ist der „Aha"-Moment |
| 3 | fügt etwas hinzu | Such-/Auswahlliste aller Halterungstypen |
| 4 | übernimmt | Erzeugt Module **an den richtigen Stellen** im Kanal (Reihenfolge nach Größe) |

**Zustandsmodell:**

```text
fill-list: [] ──add──▶ [{type, dims, count}] ──derive──▶ layout-proposal
                              │                                │
                              └───edit──────────────────────────┘
                                              │
                                        [Übernehmen] ──▶ modules created
```

**Abbruchpunkte:**
- E1: Nutzer kennt seine Nadellänge nicht → Längen-Dropdown enthält „weiß nicht" → System nimmt
  den **häufigsten** Wert (20 cm) und markiert ihn als Annahme mit `info`-Hinweis.
- E2: Nutzer will nur ein Modul → „Überspringen" ist ein sichtbarer, gleichwertiger Button.

**Designentscheidung [A]:** Die abgeleitete Fachbreite wird **sofort und pro Zeile** gezeigt.
Sie ist der Beweis, dass das System rechnet — und damit die Antwort auf Problem 4
(„ich weiß nicht, ob es nähbar ist").

---

## F6 — Editor: Modul hinzufügen (Drag & Drop)

**Ziel:** Ein Modul in ≤ 2 Interaktionen hinzufügen, ohne Fehlbedienung.

**Desktop:**

| # | Nutzer | System |
|---|---|---|
| 1 | drückt auf Bibliothekseintrag und zieht | Ghost-Vorschau (halbtransparent, mit Maßen), Bibliothek bleibt sichtbar |
| 2 | führt über den Kanal | **Gültiges Ziel:** Kanal leuchtet, Einfüge-Lücke klappt auf (animiert, 100 ms). **Ungültiges Ziel:** Cursor `not-allowed`, Begründung als Tooltip am Zeiger („Nur in einen Kanal ablegen") |
| 3 | lässt los | Modul eingefügt, ausgewählt, Eigenschaften-Panel zeigt es, Konstruktion neu berechnet (< 50 ms) |
| 4 | (alternativ) Doppelklick auf Bibliothekseintrag | Modul wird **ans Ende des aktiven Kanals** angefügt — Tastatur-/Maus-Alternative (UX-01) |

**Touch (Tablet):**

| # | Nutzer | System |
|---|---|---|
| 1 | **Long-press 300 ms** auf Bibliothekseintrag | Eintrag „hebt sich an" (Skalierung 1.05, Haptik-Feedback falls verfügbar) |
| 2 | zieht zum Kanal | Drop-Ziel leuchtet, Einfüge-Lücke klappt auf |
| 3 | lässt los | Modul eingefügt; **Sheet öffnet** mit „Breite: 22 mm [−][+]" und „Einrasten 5 mm ✓" |

**Warum Long-press [A]:** Ohne Long-press scrollt die Bibliothek beim Ziehen — ein
Klassiker, der Touch-Editoren unbenutzbar macht.

**Zustandsmodell:**

```text
idle ──pointerdown(lib-item)──▶ dragging(ghost)
    │                                │
    │                                ├──over(valid)──▶ dragging+drop-target
    │                                ├──over(invalid)─▶ dragging+rejected
    │                                └──release ──▶ insert ──▶ selected
    └──Esc / pointercancel ─────────▶ idle
```

**Fehlerpfade:**
- Modul passt nicht mehr in den Kanal (zu breit) → Insert **nicht** ausgeführt, Toast:
  „Nicht genug Platz. Das Etui ist voll. [Etui breiter machen]"
- Modul passt, aber löst Warnung aus → einfügen, Warnung erscheint im Badge + Panel (nicht blockierend)

**Abbruchpunkte:**
- F1: Bibliothek hat zu viele Einträge → **Lösung:** 4 im MVP, Rest als „geplant" markiert.
  Kategorien und Suche trotzdem vorhanden, damit die Struktur sichtbar ist.

---

## F7 — Editor: Modul konfigurieren

**Ziel:** Alle Parameter ohne Nachschlagen verstehen.

**Eigenschaften-Panel (Rechts, Desktop):**

```text
┌─ Nadelkanal 2 ──────────────────────  [⋮] ┐
│                                            │
│  Maße                                      │
│   Breite      [ 22 ] mm   ⓘ warum?         │
│   Höhe        folgt Nadel (200 mm)  🔒     │
│   Paare       [  1 ]   ⚠ min 1 / max 6     │
│   ────────────────────────────────────     │
│  Konstruktion                              │
│   Fachteilung    ( ) gleich  (•) manuell   │
│   Fächer         [ 1 ]  ⓘ                  │
│   Steg zwischen Fächern  [ 1,5 ] mm        │
│   Bodennaht      (•) geschlossen ( ) offen │
│  ────────────────────────────────────      │
│  Befestigung                               │
│   Anlage         (•) untere Kante          │
│   Naht         [ Geradstich, 3 mm ]        │
│  ────────────────────────────────────      │
│  ⓘ Breite folgt aus Nadellänge 200 mm +    │
│    2 × Zugabe 10 mm = 220 mm               │
└────────────────────────────────────────────┘
```

| # | Nutzer | System |
|---|---|---|
| 1 | wählt Modul (Klick) | Panel wechselt, Felder zeigen Ist-Werte mit Einheit |
| 2 | ändert `Paare` auf 4 | Kein Griff an der Höhe, nur Felder: **Breite und Höhe sind `derived`** (M03). Vorschau und Kanalfüllung aktualisieren live; bei Platzmangel `V-M03-01` mit Fix `[Etui auf 320 mm verbreitern]` (FR-52) |
| 3 | ändert `Breite` | Geometrie-Vorschau aktualisiert sofort (< 16 ms), Konstruktion in < 50 ms |
| 4 | öffnet `ⓘ warum?` | Popover mit **Herleitungskette** (FR-47) |
| 5 | schließt Panel | – |

**Regeln für das Panel:**
- **Jedes Feld** hat: Label, Einheit, Grenzen (als `min/max` im Feld sichtbar), Hilfetext (`ⓘ`).
- **Abgeleitete Felder** sind sichtbar, aber gesperrt (🔒) und nennen ihre Quelle. Sie
  verschwinden **nicht** — sonst fragt der Nutzer, wo sie sind (P3: eine Quelle, aber sichtbar).
- **Einheiten** umschaltbar, Eingabe tolerant („12,5", „12.5", „12,5cm", „1,25" bei inch).

**Touch:** identischer Inhalt als Bottom-Sheet, Felder als Stepper ± 1 mm / ± 5 mm.

---

## F8 — Editor: verschieben, skalieren, umordnen

**Ziel:** Anordnen, ohne zu scheitern.

| Aktion | Desktop | Touch | Constraint |
|---|---|---|---|
| **Verschieben** | Drag am Körper | Drag am Körper, Offset-Anzeige **über** dem Finger | nur entlang Kanal; klemmt an Panelgrenzen |
| **Skalieren** | Drag am Seiten-Griff | Griff 24 px; danach numerisch | nur erlaubte Achsen (Nadelkanal: nur Breite) |
| **Umordnen** | Drag über Nachbarn, Lücke öffnet | Long-press + Drag | Kanal bleibt immer lückenlos geordnet |
| **Duplizieren** | Cmd/Ctrl+D | Long-press-Menü | Kopie rechts daneben; wenn kein Platz → Warnung |
| **Löschen** | Entf | Long-press-Menü | Lücke schließt sich |
| **Undo** | Cmd/Ctrl+Z | sichtbarer Button | ≥ 50 Schritte |

**Der entscheidende Punkt — „Verschieben" ist im Kanal-Modell ein *Umordnen*:**
Ein Modul kann nicht zwischen zwei Positionen „schweben"; es tauscht mit Nachbarn. Das ist
**kein Mangel, sondern die Absicherung** (PRD P2: unmöglich statt gewarnt).

```text
Vorher:  [NK1 220mm][NK2 220mm][NK3 220mm]
Ziehe NK3 nach links:
Während: [NK1 220mm][NK3 ghost][NK2 220mm]   ← Lücke öffnet sich an der Zielposition
Nachher: [NK3][NK1][NK2]                     ← Reihenfolge geändert, keine Koordinaten
```

**Fehlerpfade:**
- Modul zu breit für verfügbaren Platz → Griff/Position **stoppt an der Grenze**, Widerstand +
  Hinweis „Kein Platz — [Etui breiter machen]"
- Skalieren unter Minimum → Griff stoppt, Eingabefeld zeigt Minimum, `info`-Hinweis

**Abbruchpunkt:** G1: Nutzer erwartet freie Positionierung (Jonas) → **Lösung:** Einmaliger,
dezenter Hinweis beim ersten Drag: „Module ordnen sich im Kanal an — so bleibt das Etui nähbar."
Kein Modal, kein Tutorial.

---

## F9 — Warnungen prüfen und beheben

**Ziel:** Fehler beheben, ohne zu verstehen, was ein Constraint ist.

**Anzeige:** Badge in der Kopfzeile (`⚠ 2`), klickbar → Panel/Liste.

```text
┌─ 2 Hinweise ────────────────────────────────────────────┐
│                                                          │
│  ⛔ Nadelkanal 3 ist zu schmal für 5,0-mm-Nadelspitzen  │
│     Fach 4,2 mm, nötig 5,4 mm                            │
│     [ Auf 5,4 mm setzen ]                    [Ignorieren]│
│                                                          │
│  ⚠ Elastik-Reihe überlappt die Bodennaht                │
│     Elastik liegt 3 mm unter der Nahtzugabe              │
│     [ Elastik 5 mm nach oben ]                           │
│                                                          │
│  ⓘ Etui wird 4 mm breiter (266 mm) — Stoff reicht        │
└──────────────────────────────────────────────────────────┘
```

| # | Nutzer | System |
|---|---|---|
| 1 | sieht Badge `⛔1 ⚠1` | Badge in Kopfzeile, Farbe **und** Icon (UX-04) |
| 2 | klickt Badge | Liste, nach Schweregrad sortiert |
| 3 | klickt `[Auf 5,4 mm setzen]` | Wert gesetzt, Warnung verschwindet, Badge aktualisiert |
| 4 | sieht `⛔` verschwinden | `[Drucken]` wird aktiv (war bei `error` deaktiviert, FR-51) |

**Regeln:**
- **Keine Warnung ohne Vorschlag** (Zod erzwingt `suggestedFix`).
- **`error` blockiert den Export** — sichtbar dadurch, dass `[Drucken]` deaktiviert ist *und*
  einen Tooltip mit Grund trägt. Nicht durch einen modalen Dialog.
- **`warn` blockiert nicht**, wird aber auf dem PDF-Deckblatt vermerkt (FR-95).
- **Kein positiver Zwang:** Bei 0 Warnungen steht ruhig `✓ Alles nähbar.` (FR-55) — kein Konfetti.

**Abbruchpunkte:**
- H1: Nutzer versteht die Warnung nicht → **Lösung:** Jede Warnung nennt **Zahlen** und **ein
  Objekt** („deine 5,0-mm-Nadelspitze"), nie nur Regelnamen.
- H2: Nutzer will die Warnung ignorieren → bei `warn` möglich (mit dauerhaftem Merker im PDF);
  bei `error` **nicht** — aber mit klarer Erklärung, warum („sonst lässt sich der Reißverschluss
  nicht schließen").

---

## F10 — Materialliste prüfen

**Ziel:** Einkaufsfähige Liste, ohne Nachrechnen.

| # | Nutzer | System |
|---|---|---|
| 1 | wechselt Tab `Material` | Tabelle, gruppiert nach Materialart |
| 2 | sieht Zeilen | Jede Zeile: Klartextname, Spezifikation, Menge, Einheit, **Kennzeichnung exakt/geschätzt** (FR-60) |
| 3 | sieht Stoffverbrauch | Mit Angabe der **Stoffbreite** und des **Fadenlaufs**; Änderung der Breite ändert den Wert live (FR-61) |
| 4 | kopiert Liste | `[Kopieren]` → Zwischenablage als Text |
| 5 | öffnet mobil | Einkaufsmodus: große Checkboxen, Summen pro Material |

**Beispielausgabe:**

```text
MATERIAL                          MENGE            ART
─────────────────────────────────────────────────────────
Außenstoff (Baumwoll-Canvas)      0,45 m × 140 cm  geschätzt
  └ Zuschnitt: 2 Teile, Fadenlauf längs, 12 % Verschnitt
Futterstoff (Baumwoll-Popeline)   0,40 m × 140 cm  geschätzt
Verstärkung (H250, aufbügelbar)   0,35 m × 90 cm   geschätzt
Gummiband, 10 mm breit            1,45 m           exakt
Reißverschluss, 3 mm Raupe        60 cm            exakt
  └ Endlos-RV empfohlen (kürzbar) 65 cm            exakt
Nähgarn                           1 Spule          geschätzt
```

**Abbruchpunkt:** I1: Nutzer versteht „geschätzt" nicht → **Lösung:** Fußnote an der Tabelle:
„*geschätzt* = inkl. Verschnitt, abhängig von der Stoffbreite. *exakt* = von deiner Konfiguration
vorgegeben."

---

## F11 — Schnittmuster generieren

**Ziel:** Vertrauen, dass das PDF maßhaltig ist.

| # | Nutzer | System |
|---|---|---|
| 1 | wechselt Tab `Schnittmuster` | Zeigt Teile als Vorschau, **mit Papierformat-Auswahl** (A4 / Letter / A3 / A0) |
| 2 | sieht Teileliste | Name, Zuschnittzahl, Maße in mm, Stoffart |
| 3 | sieht Seitenvorschau | Kleine Seiten-Thumbnails mit Platzierung + Seitenübersicht (Klebematrix) |
| 4 | ändert Nahtzugabe | Global (Default 10 mm), pro Teil überschreibbar (FR-71); Schnittlinie verschiebt sich sichtbar |
| 5 | prüft Kalibrierung | Hinweis: „Drucke bei 100 %. Prüfe das 50-mm-Feld auf Seite 1." |

**Abbruchpunkt:** J1: Nutzer traut der Maßhaltigkeit nicht → **Lösung:** Kalibrierquadrat ist
**visuell beworben** (nicht versteckt), mit einem Satz: „Feld mit dem Lineal messen: 50 mm =
richtig gedruckt." Phase 1: Katagami macht das genauso, und es ist Vertrauensbasis.

---

## F12 — Export

**Ziel:** Ein Download, alles drin.

| # | Nutzer | System |
|---|---|---|
| 1 | klickt `[Drucken]` / `[Exportieren]` | Menü mit 3 Optionen: **PDF (alles)**, **SVG**, **Projektdatei (.json)** |
| 2 | wählt PDF | Erzeugt ein Dokument: Deckblatt (Konfiguration + Warnhinweis) → Materialliste → Schnittteile (getiled) → Nähanleitung |
| 3 | sieht Fortschritt | Deterministischer Fortschritt (kein Fake-Spinner), bei 10 Seiten < 2 s (NFR-04) |
| 4 | erhält Datei | `nadel-etui_240x180mm_2026-11-26.pdf` (FR-94) |

**Wenn `error` offen ist:** Button deaktiviert + Tooltip „2 Probleme beheben, dann drucken"
+ Direktlink zur Warnliste. **Kein** stilles Blockieren.

**Abbruchpunkte:**
- K1: Nutzer will nur die Maße, kein PDF → `[ ] Nur Maße kopieren` als Nebenaktion.
- K2: Nutzer druckt und es stimmt nicht → Kalibrierhinweis bereits auf Seite 1 (F11/J1).

---

## F13 — Nach dem Export

**Ziel:** Rückmeldung für die Nordstern-Metrik, ohne Konto und ohne Nerven.

```text
┌─────────────────────────────────────────────┐
│  Hat alles gepasst?                          │
│                                              │
│  [ 👍 Ja, hat gepasst ]   [ 👎 Nicht ganz ]  │
│                                              │
│  ── optional ──                              │
│  [ Konfiguration teilen (Link kopieren) ]    │
│  [ Als Projektdatei speichern ]              │
└─────────────────────────────────────────────┘
```

- **Zwei Klicks maximal.** Kein Freitext-Zwang, keine Sterne, keine E-Mail.
- „Nicht ganz" → eine optionale Auswahl (zu eng / zu breit / Anleitung unklar / anderes) →
  **anonym**, lokal gezählt, aggregiert erst bei ausdrücklicher Zustimmung gesendet.
- **„Konfiguration teilen"** liefert einen Link mit kodiertem Zustand im URL-Fragment.

**Warum das wichtig ist [A]:** Phase 1 macht „Anteil genäht und passend" zur Nordstern-Metrik
und K3 (> 15 % „passt nicht") zum Abbruchkriterium. Ohne diesen Flow ist die Metrik nicht
erhebbar — und ohne Erhebung ist das Abbruchkriterium wirkungslos.

---

## F14 — Wiederaufnahme (Reload / geteilter Link)

| Situation | Verhalten |
|---|---|
| **Reload** | Projekt aus localStorage wiederhergestellt (NFR-12), inkl. Auswahl und Zoom |
| **Geteilter Link** (`#p=…`) | Projekt aus Fragment dekodiert, **überschreibt** lokalen Stand **nicht** automatisch. Hinweis: „Geteilte Konfiguration geladen. [Meine behalten] [Diese übernehmen]" |
| **Beschädigter Zustand** | Schema-Migration greift (siehe `pattern-data-model.md` §6); wenn unmöglich: „Projekt konnte nicht geladen werden" + `[Beispiel laden]` + `[Rohdaten herunterladen]` (NFR-14) |
| **Anderes Gerät** | Kein Sync (bewusst, FR-W4). Hinweis: „Projekte werden nur in diesem Browser gespeichert. [Als Datei speichern]" |

**Designentscheidung [A]:** Der geteilte Link **überschreibt nicht**. Ein Link ist ein Vorschlag,
kein Befehl. Andernfalls verliert ein Nutzer sein Projekt, weil er einen Link angeklickt hat.

---

## F15 — Fehler- und Randfälle

| Fall | Verhalten | Begründung |
|---|---|---|
| **Zu viele Module** (> 24 im Kanal) | Erlaubt, aber `warn`: „{anzahl} Module sind zu viel für eine übersichtliche Naht" (`V-G-09`) | Ehrlichkeit statt Verbot |
| **Modul höher als Panel** | Eingabe geklemmt + Erklärung (`V-M03-03`) | P2 |
| **Breite > verfügbarer Platz** | Modul wird nicht eingefügt, Toast mit Angebot „Etui breiter" | kein stiller Fehlschlag |
| **Alle Module gelöscht** | Leerer Zustand mit `[Module aus Füllmenge vorschlagen]` (führt zu F5) | kein toter Zustand |
| **Maße 0 / negativ** | Zod lehnt ab, UI klemmt auf Minimum | Datenintegrität |
| **Maße unrealistisch groß** (900 mm) | `warn` + Hinweis „größer als übliche Rollen; prüfe deine Eingabe" | Tippfehler-Schutz |
| **Browser ohne localStorage** | Läuft, aber ohne Speichern; Hinweis einmal | NFR-14 |
| **Kein Druckdialog** (In-App-Browser) | `[PDF herunterladen]` als Alternative | mobile Realität |
| **Sehr langsames Gerät** | Skelett-Ladezustand, Berechnung in `requestIdleCallback` falls > 100 ms | NFR-02 |
| **Doppelklick auf Drucken** | Debounce, identische Datei (Determinismus) | P4 |

---

## 16. Instrumentierung (welche Ereignisse werden gemessen?)

Alles **lokal**, keine Übertragung ohne Zustimmung (NFR-07).

| Ereignis | Zweck | Metrik |
|---|---|---|
| `app_loaded` | Einstieg | – |
| `example_printed` | Schnellster Erfolgspfad | Conversion-Basis |
| `project_created` (mit `path`: preset/fill/mass) | Welcher Weg gewählt wird | Anteil Weg A vs. B → **wichtigste Produktentscheidung** |
| `module_added` / `module_removed` | Bibliotheksnutzung | welche Module wirklich benutzt werden |
| `warning_shown` / `warning_fixed` / `warning_dismissed` | Regelwerk-Qualität | „Warnungen, die behoben werden" > 60 % |
| `export_completed` | Ziel erreicht | Time-to-pattern |
| `interaction_count` | Leitplanke | Anteil ≤ 4 / ≤ 8 |
| `feedback_passed_yes` / `_no` | **Nordstern** | Anteil passend < 85 % = Problem |
| `drop_off` (mit Ort) | Abbruchpunkte | Wo Nutzer aussteigen |

**Konsequenz für Phase 3:** Diese Ereignisse müssen als **erstklassige Anforderungen** in die
Implementierung, nicht als Nachrüstung. `interaction_count` ist dabei ein **Testkriterium**, kein
Nice-to-have.
