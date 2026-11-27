# Responsive Layout & Barrierefreiheit

Geprüfte Dateien: `app/index.html`, `app/src/state/store.ts`, `app/src/ui/App.tsx`, `app/src/ui/styles.css`, alle Teilansichten.

---

## 1. Gefundene & behobene Probleme

1. **Mobile Initialisierung & globale Sheets (`store.ts`, `App.tsx`):**
   - `emptySession.propsOpen` startete zuvor auf `true`, wodurch auf Mobilgeräten sofort nach dem Laden eine Dialog-Schublade die Arbeitsfläche verdeckte; jetzt startet `propsOpen: false`.
   - `MobileSheets` (`Bibliothek`, `Eigenschaften`, `Warnungen`) hängt am Root von `App` und lässt sich über die Topbar sowie den Warnungs-Badge in **allen fünf Ansichten** öffnen.
   - Mobile Undo-/Redo-Buttons stehen direkt in der Canvas-Toolbar; die mobile Topbar ergänzt einen eigenen Speicher-Button.

2. **Breakpoints `390×844` bis `1920×900` (`styles.css`):**
   - Schmale Smartphones (`≤ 560 px`): kompakte 5-Spalten-Icon-Tabbar ohne Abschneiden oder horizontalen Überlauf; Statusbar blendet Sekundärmetriken sauber aus; Datentabellen liegen in `.table-scroll`-Containern (`overflow-x: auto`).
   - Touch-Ziele (`≤ 1000 px` oder `pointer: coarse`): Schaltflächen, Segmente, Stepper und Bibliothekszeilen erreichen `36–44 px` Höhe (geprüft auf `390×844`: `0` Buttons `< 28 px` sowohl im Haupt-UI als auch in `Bibliothek`- und `Eigenschaften`-Sheets).

3. **HTML-Metadaten & ARIA (`index.html`, `App.tsx`):**
   - `<meta name="color-scheme" content="light" />` und `#fafaf8` verhindern ungewolltes Dark-Mode-Invertieren durch System-Webviews.
   - `ariaLabel` sauber an `Button`-Komponenten weitergereicht; eingeklappte `WarningsCollapsed`-Schaltflächen aus dem aktiven Fokus-/Klick-Baum entfernt.

4. **Verifizierte Matrix (Playwright, alle 5 Ansichten):**
   - `390×844`, `430×844`, `768×1024`, `1024×1024`, `1440×900`, `1920×900`: jeweils `0` Dokument-Überlauf, `0` abgeschnittene Tabs, `0` ungescrollte Tabellenüberläufe, `0` Console-/Page-Errors.
