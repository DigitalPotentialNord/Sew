# Sicherheit, Validierung & Persistenz

Geprüfte Dateien: `src/core/project.ts`, `src/core/fixes.ts`, `src/core/export.ts`, `src/ui/App.tsx`, `src/state/store.ts`.

---

## 1. Gefundene & behobene Schwachstellen

1. **Prototype-Pollution-Schutz (`project.ts`, `fixes.ts`):**
   - Zod `z.record(z.string(), ...)` erzeugt ein neues Objekt und lässt `__proto__` beim Kopieren aus rohem `JSON.parse(...)` unter Umständen als Prototypzuweisung durchfallen, bevor `Object.keys()` läuft.
   - `findForbiddenKey()` prüft daher bereits vor `zod.safeParse` und vor `migrate()` rekursiv mit `Object.getOwnPropertyNames()` auf `__proto__`, `constructor` und `prototype`.
   - `updateParams` und `applyFix` (`setParam`) blockieren dieselben Schlüssel als Schreibziel.

2. **Schema- & Parameter-Grenzen (`project.ts`, `fixes.ts`):**
   - `validateProject` lehnt zukünftige `schemaVersion > SCHEMA_VERSION`, nicht-finite Werte (`NaN`/`Infinity`), negative/übermäßige Parameter (`< 0` / `> 5000`) sowie `count`-Felder `< 1` explizit ab.
   - `applyFix` klemmt `setParam` auf `[field.min, field.max]` (ganzzahlig bei `step === 1`) und hält alle Basiswerte innerhalb `LIMITS`.

3. **Popup-/Tabnabbing- & HTML/SVG-Schutz (`App.tsx`, `export.ts`):**
   - `openPrintWindow` setzt `w.opener = null` vor `document.write()`.
   - `buildPrintHtml` und `toSvg` escapen jede vom Nutzer eingegebene Zeichenkette (`<script>`, Attribut-Quotes).

4. **Storage-Resilienz (`project.ts`, `store.ts`):**
   - `safeRead` / `safeWrite` fangen Quota- und SecurityError-Ausnahmen ohne Absturz ab; bei Schreibfehler bleibt `saved === false` und ein ehrlicher Fehler-Toast erscheint.
