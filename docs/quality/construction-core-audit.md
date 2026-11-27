# Konstruktionskern & Module (`src/core/`)

Geprüfte Dateien: `types.ts`, `geometry.ts`, `modules.ts`, `construction.ts`, `fixes.ts`, `i18n/de.ts`.

---

## 1. Gefundene & behobene Fehler

1. **Asymmetrische Nähfelder bei Drehung (`construction.ts`, `types.ts`):**
   - `PieceSpec` unterstützt explizite `netX`/`netY` für Teile mit einseitigem Saum/Einschlag (z. B. `M01` oben + `saumbreite` + `nz`).
   - Vorher wurden `netX`/`netY` bei Drehung per Spread nicht geleert, wodurch bei 270°-Rotation `netY + netH > h` entstehen konnte (per `fast-check`-Counterexample `M01` 20×25 mm gefunden).
   - Jetzt transformiert `buildPieces` `netX`, `netY` und `foldEdge` exakt für `90°`, `180°` und `270°`, sodass `0 <= netX`, `netX + netW <= w`, `0 <= netY`, `netY + netH <= h` immer gelten.

2. **Richtungswechsel bei Regel-Fixes (`construction.ts` `orientFinding`):**
   - Bei 90°/270° gedrehten Modulen tauschte `orientFinding` `widenBase` ↔ `growHeight` korrekt auf Basis des jeweiligen Achsen-Deltas statt die Rohbreite direkt auf die Höhe zu schreiben.

3. **Moduldefinitionen M01–M16 (`modules.ts`, `i18n/de.ts`):**
   - `M10`: Ohrringhalter-Einlage trennt `piece.ohrring-einlage` sauber vom Stoffteil.
   - `M05`/`M07`: Gurtband-Herleitung (`basis.gurtband`) ohne missverständliche Nahtzugaben-Behauptung; doppelte `extraMaterials` desselben `kind`/`spec` werden in `buildMaterials` sauber zusammengeführt.
   - `M03`: `op.topstitch-zip` ergänzt die RV-Verarbeitung konsistent.
   - `V-G-12`: Prüft alle Zuschnittteile aus `fabric`/`lining` gegen `fabricWidthMm` und liefert `setFabricWidth`-Fix.

4. **Operationsgraph (`construction.ts` `buildOperations`):**
   - Topologische Sortierung nach Kahn mit Min-Heap (`O(V log V + E)`) und eindeutigen Nachbarschaftslisten ersetzt die quadratische Schleife.
   - Phasen-, Abhängigkeits- und Modulreihenfolge bleiben deterministisch (`31`-Kombinationen-Test und 60-Modul-Stresstest grün).
