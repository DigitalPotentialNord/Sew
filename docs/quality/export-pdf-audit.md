# Export & PDF-Erzeugung (`src/core/export.ts`, `src/core/pdf.ts`)

Geprüfte Dateien: `src/core/export.ts`, `src/core/pdf.ts`.

---

## 1. Behobene Fehler in `pdf.ts`

1. **2D-Liang–Barsky-Clipping statt 1D-Schnitt:**
   - Diagonale Kontursegmente wurden zuvor pro Achse unvollständig gekürzt.
   - `clipSegment` implementiert jetzt exaktes 2D-Liang–Barsky-Clipping am Kachelfenster (`win`) inklusive Richtungstreue (`[a, b]`).
2. **Mehrseitige Anleitungen (`instructions`) ohne Seitenverlust:**
   - Der Seitencursor wird über `listPages` auf beliebig vielen Folgeseiten sauber inkrementiert und je Seite mit Kopf-/Fußzeile gerendert (`big24` mit 87 Operationen erzeugt 63 vollständige Seiten statt abgebrochener Folgeseiten).
3. **Kacheldarstellung (`drawTile`):**
   - Abgerundete Außenkanten (`roundedRectPath`-Segmente) werden sauber in das Kachelfenster geklippt.
   - `netRect`-Nahtlinien, Bruchkanten (`foldEdge`), Fadenlauf (`lengthwise`/`crosswise`), Bund-/Kleberänder (`hasTopGutter`, `hasLeftGutter`), Kachellabel im Kopf und `safe(s.title)` wurden vervollständigt.

## 2. Behobene Fehler in `export.ts`

1. **Druckbare Kachelhöhe (`tilePiece`):**
   - `usableH` nutzt realistische `250 mm` (statt `267 mm`), sodass Kopf- und Fußzeilen auf A4-Ausdrucken nicht kollidieren.
2. **Schnittteil-Darstellung (`pieceGroup`, `buildPrintHtml`):**
   - Nähfeld berücksichtigt `piece.netRect.x`/`netRect.y` statt starrer Zentrierung; Fadenlaufpfeile und Bruchkanten erscheinen konsistent in SVG und HTML-Druck.
3. **Reiner Anleitungsdruck (`instructionsOnly: true`):**
   - Überspringt Deckblatt, Kalibrierbox, Materialtabelle, Zuschnittliste, Klebematrix und Schnittkacheln vollständig und druckt nur die Nähanleitung mit Projekttitel.
4. **HTML-Escaping:**
   - Sämtliche dynamischen Texte im HTML-Druck (`projectName`, Warnungen, Labels, Fußzeilen) durchlaufen `escapeHtml`.
