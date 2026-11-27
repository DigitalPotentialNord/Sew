# Responsives Bedienkonzept

Stand: 26.11.2026 · Kontext: [`editor-redesign.md`](editor-redesign.md) ·
Audit: [`../quality/editor-usability-audit.md`](../quality/editor-usability-audit.md)

---

## 1. Ziel: drei Geräteklassen, eine Bedienlogik

Die Anwendung soll auf Desktop, Tablet und Smartphone **voll bedienbar** sein,
ohne drei Scroll-Ebenen und ohne permanent verschwindende Werkzeuge. Die
Konstruktionsmaschine ist gerätneutral; nur die Anordnung der Bedienelemente
ändert sich.

Breakpoints (wie bisher): **1180 / 1000 / 720 px**.

---

## 2. Desktop (> 1000 px)

```
┌──────────────────────────────────────────────────────────┐
│ Topbar: Marke · Name · Undo/Redo · Speichern · Export · PDF │
├──────────────────────────────────────────────────────────┤
│ Tabs: Designen · Schnittmuster · Materialien · Anleitung · Projekt │
├──────────┬───────────────────────────────────┬───────────┤
│ Bibliothek│   textile Designfläche (Buch)     │ Eigensch. │
│ (Seiten-  │   + Modus-Umschalter oben         │ + Warnun- │
│  leiste,  │   + Kontext-Aktionsleiste          │ gen (kompakt)│
│  Kategorien│                                   │           │
│  + Karten)│                                   │           │
├──────────┴───────────────────────────────────┴───────────┤
│ Statusleiste                                              │
└──────────────────────────────────────────────────────────┘
```

- Große Designfläche, kontextabhängige Panels beidseitig.
- Bibliothek als visuelles Kartenraster links.
- Eigenschaften kompakt rechts (nur relevante Felder, „Weitere Einstellungen").

## 3. Tablet (≤ 1000 px)

- **Designfläche bleibt groß und dominant.**
- Bibliothek wird zum **Bottom-Sheet** (Bibliotheks-Knopf in der Topbar).
- Eigenschaften werden zum **rechten Drawer**, der sich öffnet, sobald ein Modul
  gewählt ist; Backdrop schließt ihn.
- Modus-Umschalter und Kontext-Aktionsleiste bleiben auf der Fläche.
- Keine drei Scroll-Ebenen: die Fläche scrollt; Panels sind Overlays.

```
┌──────────────────────────────────────────┐
│ Topbar (kompakt) · Bibliothek · Warnungen │
├──────────────────────────────────────────┤
│ Tabs (横向 scrollbar)                      │
├──────────────────────────────────────────┤
│                                          │
│   textile Designfläche (Buch)            │
│   + Modus · Kontextleiste                 │
│                                          │
└──────────────────────────────────────────┘
  ↑ Bibliothek = Bottom-Sheet   ↑ Eigenschaften = rechter Drawer (bei Auswahl)
```

## 4. Smartphone (≤ 720 px)

- **Designfläche ist der primäre Bereich** (fast vollflächig).
- **Untere Modulauswahl**: Bibliothek als Bottom-Sheet (voller Breite).
- **Kontextabhängige Einstellungsansicht**: rechter Drawer (volle Höhe) bei
  Auswahl.
- Topbar reduziert (Markenname ausgeblendet), Tabs horizontal scrollbar.
- Touch-Ziele ≥ 28 px (bzw. 34 px unter `(pointer: coarse)`); Werkzeugleisten
  bleiben bedienbar.

---

## 5. Touch-Bedienung

- Pointer-Events (nicht nur Maus) für Verschieben, Griff, Auswahl.
- Touch-Ziele per Media-Query vergrößert (`@media (pointer: coarse)`):
  Buttons ≥ 34 px, Inputs ≥ 34 px, Tabs ≥ 40 px, Bibliothekskarten ≥ 10 px Padding.
- Pan per Leertaste/Mitteltaste entfällt auf Touch — die Fläche scrollt/statt.
- Drag & Drop funktioniert per Touch (Pointer-Capture); alternativ Klick-zum-
  Hinzufügen (der primäre Weg, bewusst auch für Touch nutzbar).

## 6. Vermeidung von Fallstricken

- **Kein horizontaler Überlauf:** `document.scrollWidth − clientWidth` bleibt 0
  (Acceptance-Test 7). Tabs und Kategorien scrollen intern.
- **Keine permanent verschwindenden Werkzeuge:** Modus-Umschalter und Zoom bleiben
  immer auf der Fläche; Eigenschaften erscheinen verlässlich bei Auswahl.
- **Keine drei Scroll-Ebenen:** Desktop hat zwei Spalten + Fläche; Tablet/Phone
  haben Fläche + je ein Overlay.

## 7. Getestet (Walkthrough)

Der Usability-Walkthrough (Audit §3) wird je Gerätät durchgespielt: Schmuck
öffnen, Ringhalter zufügen/verschieben, RV-Fach, Größe ändern, duplizieren,
rückgängig, Schnittmuster, Materialien. Touch-Ziel-Größen werden im
Acceptance-Test 7 geprüft (alle Buttons ≥ 28 px).
