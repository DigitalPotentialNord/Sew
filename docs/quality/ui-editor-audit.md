# Editor, Canvas & Zustand (`src/state/store.ts`, `src/ui/`)

Geprüfte Dateien: `src/state/store.ts`, `src/ui/{App,Canvas,Properties,PatternView,MaterialsView,InstructionsView,ProjectView}.tsx`.

---

## 1. Gefundene & behobene Fehler

1. **Tastaturkürzel Drehung (`App.tsx`):**
   - `r` / `R` fehlte in den globalen Tastenkürzeln und wurde mit sauberer Input-/Dialog-Prüfung auf `rotate(selected[0])` verdrahtet.
   - Dabei zeigte Playwright, dass test #27 zuvor nur scheinbar grün war: das Drehen des 106×46-Ringhalters im 200-mm-Schmuck-Etui erzeugt **zu Recht** 2 Überlauffehler (`222 > 180 mm`). Test #27 prüft jetzt `M07` (35×45 → 45×35, 0 Fehler), ein neuer Test prüft zusätzlich den echten Überlauf inkl. Fix.

2. **Skaliergriffe & Drop-Koordinaten (`Canvas.tsx`):**
   - `toWorld` berechnet Mauskoordinaten jetzt über `svgRef.current.getBoundingClientRect()` (unabhängig von Scroll-/Flex-Rändern).
   - `RESIZE` speichert `startParam`, `paramKey` und `swapped` beim Pointerdown statt pro `pointermove`-Frame zu addieren — bei 90°/270° tauscht der Griff zwischen Breite und Höhe; `M07` skaliert `laenge` mit halbem Darstellungsmaßstab und `ns-resize`-Cursor.
   - Rücken/Bund (`spineWidthMm`) und Falzlinie werden unbeschnitten innerhalb des zulässigen Bereichs gerendert.

3. **Eigenschaften & Teilansichten:**
   - `Properties.tsx` nutzt `moveModule` direkt für Auf-/Ab-Verschiebungen und eindeutige Keys.
   - `PatternView.tsx` zeigt je Schnittteil `netRect`, `netRadius`, `foldEdge` und `grain`; `MaterialsView.tsx` setzt responsive SVG-Skalierung; `ProjectView.tsx` gleicht `spineWidthMm`/`cornerRadiusMm` auf `LIMITS` (`0..80` / `0..40` bzw. Panelgrenzen) ab und zeigt im `TemplateThumb` den vollständigen Doppelflügel.
   - `WarningsCollapsed` blendet eingeklappte Elemente per `display: none` aus der Tab- und Pointer-Reihenfolge aus.
