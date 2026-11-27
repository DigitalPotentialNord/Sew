# Engineering — Technische Dokumente

Index der technischen Dokumente dieses Repositorys. **Wichtig:** `docs/` beschreibt Absicht
und Spezifikation (Phase 1–2). Wo beide voneinander abweichen, gilt der Code — die
Abweichungsliste steht in [`../PHASE-3.md`](../PHASE-3.md) §3 und in
[`../architecture-review.md`](../architecture-review.md). Dieses Verzeichnis ist Teil des
**Documentation as Code**-Prinzips: Änderungen an Verhalten gehören in denselben
Commit wie die zugehörige Doku.

## Lesereihenfolge

| Dokument | Inhalt |
| --- | --- |
| [system-architecture.md](system-architecture.md) | Schichten, Abhängigkeitsregeln (Kern ⊥ React), Datenfluss `Project → Construction` |
| [pattern-data-model.md](pattern-data-model.md) | Projektschema (Zod, `schemaVersion`), Invarianten I1–I8, Migration |
| [geometry-engine.md](geometry-engine.md) | mm-Typ, `HALF_UP`-Rundung, Rect/Polygon, Hash, SVG-Pfade |
| [construction-rules.md](construction-rules.md) | V-G/V-M-Regeln, Severity, Fix-Kinds, Prüfkontext bei Drehung |
| [material-calculation.md](material-calculation.md) | Mengen, Meterware, Shelf-Packing mit Fadenlauf-Sperre |
| [export-system.md](export-system.md) | SVG, Druck-HTML, A4-Kacheln, PDF (pdf-lib), Maßhaltigkeit |
| [testing-strategy.md](testing-strategy.md) | Testpyramide, Golden-Hashes, Vorlagen-Invarianten, E2E-Abnahme |
| [architecture-audit.md](architecture-audit.md) | Industrie-Niveau-Prüfung 26.11.2026: Findings, Fixes, offene Punkte |
| [branch-protection.md](branch-protection.md) | Schutz von `main`: Ruleset `Protect main`, Pflicht-Checks, Admin-Notfall-Bypass, Squash-Merge |

## Verbindliche Regeln (Kurzfassung)

1. **`src/core/` kennt weder React noch `localStorage` noch Zeit/Zufall** — die einzige
   Ausnahme sind die Konstruktor-IDs (`newId` in `project.ts`), bewusst dokumentiert.
2. **Maße sind `Mm` (ganze mm, HALF_UP).** Fließkomma nur an Ausgabe-Rändern.
3. **Praxiswerte nur in `src/core/practice.ts`** — eine Stelle, versioniert (`PRACTICE.version`),
   Teil des `projectHash`.
4. **Sichtbare Texte nur über `t('key')`** aus `src/i18n/de.ts`; Code, Kommentare und
   Bezeichner bleiben deutsch (Fachbegriffe).
5. **Konsistenz der Hashes:** Ändert sich `projectHash` durch eine gewollte
   Verhaltensänderung, gehören neuer Wert + Begründung in den Commit und in
   `../PHASE-3.md`.

## Abweichungen Code ↔ Spezifikation

Keine IDs umbenennen: Modul-IDs der Spezifikation (`docs/product/module-library.md`)
entsprechen teils anderen Modulen in der Implementierung — Tabelle in
[`../PHASE-3.md`](../PHASE-3.md) §3. Ebenfalls dort: bewusste Lücken (z. B. V-G-11 nicht
implementiert, `packFabric` als Shelf-Packing statt Nesting).
