# Issue-Fix-Fortschritt (Issues #12–#22, Stand 2026-11-27)

Alle elf offenen Issues (Bugs aus „Überprüfung 1“ + „Überprüfung 2“ gegen Commit `2fa442e`)
wurden analysiert und behoben. Diese Datei ist die Fortschrittsübersicht für die nächste
Sitzung — sie ersetzt kein Review und keinen CI-Lauf.

**Wichtige Abweichung vom vereinbarten Prozess:** Die Fixes wurden als einzelne, sauber
getrennte Commits (`Refs #<n>`) direkt auf dem Arbeits-Branch `arena/5d179ab7-sew`
umgesetzt, **nicht** als je ein Feature-Branch + PR pro Issue. Gründe: der Branch wird
jederzeit-Sitzung übergreifend weiterverfolgt, und der Arena-Stand ist über genau diesen
Branch getrackt; elf separate Feature-Branches vom selben Basis-Commit waren im Rahmen
dieser Sitzung nicht sinnvoll. Die Historie ist aber pro Issue getrennt und referenziert
je Issue (`Refs #18` usw.). Für den Merge nach `main` ist **ein Sammel-PR mit allen elf
Fixes** vorgesehen — oder der Branch wird fallweise aufgeteilt. **Niemand darf ohne
ausdrückliche Freigabe nach `main` mergen.** Die Commits verwenden `Refs`, nicht `Fixes` —
die Issues bleiben offen, bis der Nutzer nach dem Merge/Deploy entscheidet.

## Legende

- Status: ✅ implementiert & lokal verifiziert (tsc/eslint/vitest/build/size) · ⏳ E2E/visuell in CI abzunehmen
- Zahlen: Tests nach dieser Sitzung **359 Unit-Tests / 17 Dateien** (vor Sitzungsbeginn: 255 / 9)

## Fortschrittsübersicht

| # | Issue (Priorität) | Status | Commit | Kern-Fix |
|---|---|---|---|---|
| 12 | Canvas-Labels, Drehung, Kontextleiste, Falz (Mittel) | ✅ | `8429eda` | `.mod-label` entfernt (nur ClipPath-Labels), Kontextleiste per Kollisions-Score (`ui/contextBar.ts`), 90°/270°-Tausch der Breite/Höhe-Labels, Falz beschriftet + Überstand rot markiert |
| 13 | Anzeigeeinheit mm/cm (Niedrig–Mittel) | ✅ | `b7e2cfa` | Funktionsloser Umschalter entfernt (beide Stellen); `settings.unit` bleibt im Schema; cm als eigene Aufgabe |
| 14 | Dirty-Status nach Speichern, leere Projektnamen (Mittel) | ✅ | `d65423d` | `isDirty = past>0 && !saved`; `toFile()`/`save()` normalisieren leeren Namen; Topbar + Projekt-Tab: onBlur-Fallback |
| 15 | Seiten/Zähler/Zuschnittplan/Hash (Mittel) | ✅ | `2cf20e7` | `buildPdf` liefert `{bytes, pages}` (Toast = echte Seitenzahl), Zuschnittteile vs. gesamt getrennt, `packFabric()` schließt Reihen ab, Einlage 900 mm, `projectHash` mit Zeilenposition |
| 16 | Operations-Texte sachlich falsch (Mittel) | ✅ | `99e69f8` | M06 divider nur paare>1 + Singular/Plural; M16/M03/M04/M02/M12/M08 Werte korrigiert; Platzhalter-Vertrag getestet |
| 17 | Auto-Fixes wirkungslos/fehlerhaft (Hoch) | ✅ | `e828690` | `LIMITS.channelFillTargetPct = 95`; Fix-Ziel breiter als Ist; index in Seitenhöhe; 90°-Kontext; values-Vertrag |
| 18 | Modulhöhen/Export-Sperre (Hoch) | ✅ | `815a152` | `heightFix()`-Logik in `modules.ts` (V-M02-03, V-M03-04 (error), V-M09/10/11/12/14/15-02); V-M16-01 jetzt error |
| 19 | Tastatur/Starter-Dialog (Hoch, a11y) | ✅ | `bd8c341` | Space-Pan ignoriert Buttons/Inputs/Selects/ARIA-Rollen/Dialoge; StartScreen Größen als Draft + blur/Enter-Commit; `.start-overlay` flex+margin statt place-items (Top-Clipping); disabled-Optik |
| 20 | Anleitung Reihenfolge/Spalten (Hoch) | ✅ | `8c416f7` | `PHASE_ORDER` cut→prepare→sew-order→assemble→finish (aus construction.ts); M03 topstitch-zip → sew-order; leeres `<span/>`-Grid-Platzier-Bug behoben |
| 21 | Modulkarten unsichtbar, Kategorietabs (Hoch, a11y) | ✅ | `aba70d4` | `.lib-text` flex 0 0 auto; `.lib-cats` flex-wrap + keine Scrollbar-Kaschierung |
| 22 | Warnungs-Sheet, aria, Formate (Niedrig–Mittel) | ✅ | `fb71836` | Finding-Karten ohne verschachtelte interaktive Elemente; ein × im Sheet; aria-label Papierkorb; PDF/Druck disabled bei Fehlern; Schlaufen/Singular/Komma-Dezimal; SVG-Label-Gate |

## Bekannte Abnahme-Lücken (ehrlich)

1. ~~**E2E-Abnahme**~~ — Playwright läuft in CI („Abnahmetests“), lokal ist der
   Browser-Download blockiert. Erster Lauf des PR #23 war rot: 3 Alt-Tests gegen die neuen,
   korrekten Zustände (Fehleranzahl Tabbar/Toast 5 → 8 durch #18-Höhenvalidierung;
   `.finding.error` 2 → 4 durch #18; Feldlabels „Höhe“/„Breite“ tauschen bei 90° durch #12;
   Exportknöpfe sind bei Fehlern `disabled` mit Sperrtitel, kein Klick-Toast mehr durch #22).
   Test-Erwartungen angepasst (Commit `5d09e18`) — keine Logikänderung. **CI grün (beide Jobs).**
2. **Visuelle Prüfung fehlt** — insbesondere #12 (Falz-Beschriftung, Überstand-Markierung,
   Kontextleisten-Platzierung) und #19 (Starter bei 796×734). Screenshots unter `docs-shots/`
   sind auf dem Stand vor diesen Fixes.
3. **Referenz-Hashes gewechselt** (`schmuck e4396906`, `makeup deb5f0a6`, `strick a3bda729`) —
   Grund (Hash ohne Zeilenreihenfolge) in `docs/PHASE-3.md` §2.4 dokumentiert; README/AGENTS.md
   nachgezogen. Keine Geometrie-/Praxisänderung.
4. **60-Modul-Stresstest-Schwelle angepasst** (200 → 150 Ops): M06 emittiert `stitch-divider`
   korrekt nur bei paare > 1. Begründet im Testkommentar.
5. **#13 bewusst minimal**: Umschalter entfernt, cm nicht implementiert (eigene Aufgabe).
6. **#12 Falzüberstand**: „Modul bricht automatisch um“ wurde NICHT umgesetzt (Verhaltens-
   änderung aller Konstruktionen); stattdessen Falz klar gekennzeichnet + V-G-01-Lage direkt
   rot markiert. Entscheidung dokumentiert, ggf. Fachentscheidung nötig.
7. **#14 Dirty-Status**: `past > 0 && !saved` ist konservativ korrekt; Undo hinter den
   Speicherpunkt leert `past` → sauber. Limit: zwei gleich lange, verschiedene Stände
   könnten theoretisch verwechselt werden (nicht der Fall bei Undo-only-Historie).

## Technische Schulden (nach dieser Sitzung)

- `PrintStrings`/`PdfStrings` (Druck-HTML vs. PDF) duplizieren Teile des Inhalts;
  Seitenzahl des Druckpfads (`totalPages`) und des PDF (`buildPdf().pages`) sind zwei
  Wahrheiten — korrekt, aber doppelt gepflegt.
- `docs/product/module-library.md` erwähnt evtl. noch den alten `channel`-Plan (M07/M08/M13) —
  Doku-Nachzug aussteht (Architektur-Entscheid steht in `docs/PHASE-3.md`).
- Playwright-Suite (51 Tests) nie lokal gelaufen; CI-Status unklar.
- Bundle: Editor-Chunk ≈ 425,7 kB roh / 119,3 kB gzip (Budget 460/140) — nah am Budget,
  weitere Features sollten das PDF-Chunk-Prinzip nutzen (dynamischer Import).
- #15-Doku: `Interfacing width 900 mm` ist Praxiswert (`H`), kein Messwert — mittelfristig
  durch Herstellerdaten verifizieren.

## Nächste Schritte

1. ~~CI abwarten; Fehlschläge (insb. E2E) beheben.~~ — CI grün (beide Jobs) seit Commit
   `5d09e18`.
2. Nutzer-Review des Sammel-PRs; Merge nur mit Freigabe.
3. Nach Merge: Issues #12–#22 schließen (dann `Fixes` statt `Refs` verwenden).
4. Gegebenenfalls #13 (cm-Anzeige, vollständig) und #12-Fachentscheidung (Auto-Zeilenumbruch)
   als neue, eigene Issues schneiden.
