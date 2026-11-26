# Architektur-Audit — Organizer Studio

**Stand:** 26. November 2026 · **Audit-Commit:** Branch `arena/353c3061-sew` (Basis `4bde58c`)
**Auftrag:** Umfassende Prüfung der Code-Architektur; Ziel ist Industrie-Niveau ab Anfang an;
plus GitHub-Pages-Testdeploy und Repo-Härtung (Scope: „Bericht + Behebung der Findings").
**Methode:** Vollständige Lektüre von `core/`, `state/`, `ui/` (repräsentativ), Tests, Build-
und Repo-Infrastruktur; Ausführung aller Qualitäts-Gates; Link- und Konsistenzchecks;
`npm audit`. Sichtung der bestehenden Architektur-Dokumentation (`architecture-review.md`
mit den Entscheidungen K-01…M-15) als Maßstab, nicht als Wahrheit.

---

## 1. Executive Summary

Der **Code** war bereits deutlich über Prototyp-Niveau: ein reiner, deterministischer
Kern (`Project → Construction`), 193 Unit-Tests inkl. Golden-Hashes, Zod-Validierung an den
Systemgrenzen, konsequente Einheiten- und Pausregel-Disziplin, eine deutsche, gepflegte
Doku-Kultur. Das **Repository** war das Gegenteil: ein flacher Upload („Add files via
upload", Commit `4bde58c`), in dem **nichts mehr lief** — `index.html` zeigte auf ein
nicht existierendes `src/main.tsx`, `tsconfig`/`vitest`/`playwright` inkludierten
nicht existierende Pfade, `README.md` war ein Forschungsdokument und alle
`docs/…`-Verweise waren tot. Es fehlten `.gitignore`, CI und jeder Deploy-Pfad;
Build-Artefakte und ein leerer Ordner-Platzhalter waren eingecheckt.

| Bereich | Vorher | Nachher |
| --- | --- | --- |
| Repo-Layout | flach, nicht baubar | dokumentierte Struktur `app/` + `docs/`, beweisbar verlustfreier Umzug (md5) |
| Qualitäts-Gates | nur lokal | CI (Typecheck · Lint · Unit · Build) bei Push/PR |
| GitHub Pages | nicht vorhanden | Workflow `pages.yml`, testweise live unter `/Sew/` |
| `.gitignore` / Hygiene | fehlte / Artefakte eingecheckt | vorhanden; `download`, `last-run.json`, `tsconfig.tsbuildinfo` entfernt |
| Persistenz-Sicherheit | Schreibzugriffe unguarded | ehrlich gemeldete Fehlschläge statt Exception |
| Dead Code / Layering | vorhanden (`snapX`, `useSelectedModule` …) | entfernt, `findingKey`-Layering korrigiert |
| PDF-Robustheit | pdf-lib-Crash bei Emoji/CJK im Projektnamen möglich | cp1252-Whitelist `safe()` + Tests |

**Status nach zweiter Prüfrunde (§10):** 193/193 Tests grün, Dead Code entfernt, PDF/cp1252 gehärtet, CI least-privilege, `.gitattributes`/`.editorconfig` ergänzt.
**Status nach dritter Prüfrunde (§11):** 228/228 Tests grün, Abhängigkeits-Majors aktualisiert (vite 8 · vitest 5 · zod 4), Ungespeicherte-Arbeit-Schutz (F-42) implementiert, Store getestet, CI Node 22 + SHA-Pins + Bundle-Budget + E2E-Job.
| Determinismus | Golden-Hashes stabil | **228/228 Tests grün, Hashes unverändert (536766d8 · dc2a59aa · 5ed64ba1)** |

**Ampel:** Kern-Architektur 🟢 · Repo-/Release-Infrastruktur 🟢 (nach Fixes) · Supply-Chain
(npm audit) 🟡 · Lizenz/Branch-Protection 🟠 (Entscheidung offen, s. §6).

---

## 2. Ausgangslage: Was kaputt war (vor den Fixes)

1. **Flacher Upload.** Alle 80 Dateien lagen im Root. `npm run dev`, `npm run build`,
   `vitest` und Playwright waren objektiv nicht ausführbar. Das Root-`README.md` war
   `Research: Interaktiver Organizer-Designer …` — die eigentliche Projekt-Doku
   (`README.md`/`AGENTS.md`, „Organizer Studio") fehlte im Repo komplett.
2. **Tote Pfade.** `tsconfig.json` → `src/`, `tests/`; `vitest.config.ts` → `src/_tests/`;
   `playwright.config.ts` → `./tests/`; `index.html` → `/src/main.tsx`. Nichts davon
   existierte an diesen Orten.
3. **`styles.css` am falschen Ort** (`src/styles.css` statt `src/ui/styles.css` —
   `main.tsx` importiert `./ui/styles.css`; erst der Produktionsbuild hat es gemerkt,
   `tsc` nicht).
4. **Tote Doku-Verweise.** Alle `docs/…`-Links in README/AGENTS gebrochen;
   `docs/engineering/README.md` referenziert, aber nicht vorhanden;
   `docs/PHASE-2.md` verlinkte `../research/` (falsche Ebene).
5. **Kein `.gitignore`.** Eingecheckt: `tsconfig.tsbuildinfo` (Build-Artefakt),
   `last-run.json` (Runtime-Artefakt), `download` (leere Datei).
6. **Keine CI/CD, kein Pages-Deploy, keine Branch-Protection, keine Lizenzdatei.**
7. **Korrektheits-/Robustheits-Kleinigkeiten im Code** (Details §4): ungeschützter
   localStorage-Schreibpfad, kollidierende `blankProject()`-IDs, `Date.now()`-IDs,
   tote Bedingung, duplizierte Dedup-Logik, i18n-Abweichungen.

---

## 3. Durchgeführte Maßnahmen (mit Verifikation)

Alle Änderungen sind durch `npm run check` (typecheck + eslint + vitest) und
`npm run build` belegt: **0 TS-Fehler · 0 Lint-Fehler · 193/193 Tests grün ·
Build OK** (Editor-Chunk ≈ 388 kB / 110,6 kB gzip, `pdf`-Chunk separat 428 kB).
Die drei Vorlagen-Hashes sind unverändert (`536766d8`, `dc2a59aa`, `5ed64ba1`) —
keine der Code-Änderungen berührt Geometrie, Praxiswerte oder Parameterauswertung.

| # | Maßnahme | Dateien |
| --- | --- | --- |
| M1 | Verlustfreier Umzug auf die dokumentierte Struktur (Prüfsummen-beweisbar: 80 → 77 Dateien, 3 Junk entfernt, 2 Anhänge neu) | `app/**`, `docs/**` |
| M2 | `styles.css` → `src/ui/styles.css` (Pfad, den `main.tsx` importiert) | `app/src/ui/styles.css` |
| M3 | Angehängtes `README.md` („Organizer Studio") + `AGENTS.md` ins Root; altes Root-README → `docs/research/README.md` | `README.md`, `AGENTS.md`, `docs/research/README.md` |
| M4 | `.gitignore` (node_modules, dist, tsbuildinfo, Test-Artefakte, Env, OS) | `.gitignore` |
| M5 | Müll entfernt: `download`, `last-run.json`, `tsconfig.tsbuildinfo` | gelöscht |
| M6 | CI: `typecheck` → `lint` → `test` (193) → `build` auf jeder PR/Push nach main; npm cache, `npm ci` | `.github/workflows/ci.yml` |
| M7 | Pages-Deploy: Build mit `VITE_BASE_PATH=/Sew/`, `configure-pages`/`upload-pages-artifact`/`deploy-pages`, Trigger `push: main` + `workflow_dispatch`; Pages-Build lokal verifiziert (Assets unter `/Sew/`, Preview HTTP 200) | `.github/workflows/pages.yml`, `app/vite.config.ts` |
| M8 | `index.html`: Meta-Description (DE) + `theme-color` | `app/index.html` |
| M9 | `package.json`: `engines.node >= 20` (Doku-Anforderung; lockfile synchronisiert) | `app/package.json`, `app/package-lock.json` |
| M10 | localStorage-Schreibzugriffe gehärtet (`safeWrite`), Fehlschlag meldet ehrlich `toast.saveFailed` statt Crash | `core/project.ts`, `state/store.ts`, `i18n/de.ts` |
| M11 | `blankProject()` bekommt frische ID (zwei leere Projekte überschrieben sich sonst in der Bibliothek) | `core/project.ts` |
| M12 | `newId()`: `crypto.randomUUID()`-Entropie + Zähler (zwei Tabs in derselben ms kollidierten nicht mehr) | `core/project.ts` |
| M13 | Tote Bedingung entfernt (`mark/fuse/press ? [cutId] : [cutId]` → `[cutId]`) | `core/construction.ts` |
| M14 | Finding-Deduplikation nutzt `findingKey()` aus `fixes.ts` statt kopierter Formel | `core/construction.ts` |
| M15 | SVG-Export escaped `piece.id` in `id`/`data-piece`/`<text>` (Defense-in-Depth; `escapeHtml`) | `core/export.ts` |
| M16 | Hartcodierte deutsche Toasts → `t()` (store.ts ×6, App.tsx ×2, PatternView.tsx ×2; neue Schlüssel ergänzt) | `state/store.ts`, `ui/*`, `i18n/de.ts` |
| M17 | `docs/engineering/README.md` angelegt (referenziert, aber fehlend); toter Link in `PHASE-2.md` repariert | `docs/**` |
| M18 | Umfassender Link-Check über alle Markdown-Dateien: **alle relativen Links OK** | (Prüfung) |

### Bewusst NICHT geändert (Begründung)

- **Golden-Werte / `packFabric` / `rows+1`:** Die Meterware-Formel
  (`1 + wastePct/2/100` ≈ 11 % Zuschlag bei 22 % Verschnitt) und der `rows: rows + 1`-
  Rückgabewert sind fachlich inkonsistent zur angezeigten Angabe `verschnitt: 22`.
  Eine Korrektur ändert Zuschnitt-Ausgaben und Golden-Tests und ist eine **Fachentscheidung**
  (§5, F-07) — keine stillschweigende Änderung.
- **Modul-IDs (M03↔M06 …):** dokumentierte Abweichung Spezifikation ↔ Code, absichtlich
  nicht umbenannt (`PHASE-3.md` §3).
- **Major-Upgrades** (vite 5→8, vitest 2→5, zod 3→4; `npm audit fix --force`): würden
  7 Advisory-Findings beheben, sind aber breaking Changes → §6.

---

## 4. Findings im Detail

Schwere: **K**ritisch · **H**och · **M**ittel · **N**iedrig. Status: ✅ behoben · 📋 offen (Empfehlung).

### Architektur & Build

| ID | Schwere | Befund | Status |
| --- | --- | --- | --- |
| F-01 | K | Repo nicht baubar (flacher Upload, tote Pfade überall) | ✅ M1, M2 |
| F-02 | H | README/AGENTS fehlend im Repo; Root-README war Research-Fazit; 100 % der `docs/`-Links tot | ✅ M3, M17, M18 |
| F-03 | H | Keine CI — Definition of Done nur als lokale Konvention | ✅ M6 |
| F-04 | H | Kein Pages-/Release-Pfad; `base` nicht konfigurierbar | ✅ M7 |
| F-05 | H | Keine `.gitignore`; Build-/Runtime-Artefakte eingecheckt | ✅ M4, M5 |
| F-06 | M | `styles.css`-Pfad inkonsistent zum Import — nur der Build fängt das | ✅ M2 (empfohlen: CI enthält jetzt Build, fängt solche Fälle) |
| F-07 | M | `packFabric`: Meterware nutzt ½ des Verschnitts, Anzeige nennt 22 %; `rows+1` Off-by-one; Verschnitt bewusst unkonservativ | 📋 Fachentscheidung nötig; Testabsicherung vorher (Output ändert sich) |
| F-08 | N | `compute()`-Memo schlüsselt über `JSON.stringify` des ganzen Projekts — O(n), bei dieser Projektgröße irrelevant | 📋 beobachten |
| F-09 | N | `PatternView` nutzt `as Mm`-Casts (bekannt, dokumentiert) — Typsystem wird unterlaufen | 📋 `snapTo`/`mm()` statt Cast |

### Kernqualität (`src/core/`)

| ID | Schwere | Befund | Status |
| --- | --- | --- | --- |
| F-10 | M | localStorage-Schreibpfade ohne try/catch (Quota/privater Modus) — Crash im Klick-Handler, stiller Datenverlust | ✅ M10 |
| F-11 | M | `blankProject()` feste ID `p_new` → Bibliothek überschrieb leere Projekte gegenseitig | ✅ M11 |
| F-12 | M | `newId()` nur `Date.now()`+Zähler — tabübergreifende Kollision in derselben ms | ✅ M12 |
| F-13 | N | Tote Bedingung in `buildOperations` (beide Zweige `[cutId]`) | ✅ M13 |
| F-14 | N | Finding-Key-Formel in `construction.ts` und `fixes.ts` dupliziert | ✅ M14 |
| F-15 | N | `V-G-11` nicht implementiert; `M07/M08`-Randplatzierung genähert; gedrehte Überhang-Module gemeldet statt umgelegt | 📋 dokumentierte Lücken (`PHASE-3.md` §4) — Plan, kein Bug |
| F-16 | N | `packFabric` nicht optimal (Shelf statt Nesting) — bewusst, dokumentiert | 📋 OK für MVP |
| F-17 | N | FNV-1a-Hash nicht kryptografisch — korrekt für Cache-Keys/Golden-Werte; darf **nie** als Sicherheits- oder Integritätsschutz zweckentfremdet werden | 📋 Kommentar vorhanden? ggf. ergänzen |
| F-18 | N | `appVersion: '0.1.0'` in `project.ts` spiegelt `package.json` manuell — droht zu driften | 📋 später: Single Source (`resolveJsonModule`-Import oder Vite-Define) |

### UI / State

| ID | Schwere | Befund | Status |
| --- | --- | --- | --- |
| F-19 | M | Hartcodierte UI-Strings in `store.ts`/Views statt `t()` — verletzt die eigene i18n-Regel | ✅ M16 |
| F-20 | N | `ErrorBoundary` vorhanden und aktiv — gut; Fallback-Texte über i18n ✓ | ✅ i. O. |
| F-21 | N | Undo/Redo sauber getrennt (Projekt persistiert+undo, Session flüchtig); 60-Schritt-Kappung | ✅ i. O. |
| F-22 | N | Kein A11y-Automatisierungstest; manuelle Attribute (`role=status`, `sr-only`, `aria-label`) vorhanden | 📋 axe-core in CI als Folgeausbau |
| F-23 | N | `document.write` in Print-Fenster — kontrolliertes, statisches HTML (alles andere escaped); Popup-Fallback vorhanden | ✅ i. O., beobachten |

### Sicherheit & Datenschutz

| ID | Schwere | Befund | Status |
| --- | --- | --- | --- |
| F-24 | M | `piece.id` unescaped in SVG (`id`, `data-piece`, `<text>`) — aktuell engine-intern, aber Defense-in-Depth nötig | ✅ M15 |
| F-25 | N | Druck-HTML escaped konsequent (`escapeHtml` auf Name, Material, Warnungen, Schritte) ✓; PDF: WinAnsi via `safe()` ✓ | ✅ i. O. |
| F-26 | N | Kein Tracking, keine externen Requests zur Laufzeit, alles lokal — datenschutzfreundlich by Design ✓ | ✅ i. O., kommunizieren |
| F-27 | M | `npm audit`: 7 Advisory-Findings — **zod <4.6.6 (hoch, Laufzeit-Abhängigkeit)**, tinypool (kritisch, nur Test-Worker), @vitest/mocker (moderat), vite/esbuild (moderat, Dev-Server) | 📋 §6 — Upgrade-Entscheidung mit dir |
| F-28 | N | Kein CSP/`<meta http-equiv>`; auf Pages nicht zwingend, aber empfohlen (`default-src 'self'`) | 📋 optional |

### Repo & Prozess

| ID | Schwere | Befund | Status |
| --- | --- | --- | --- |
| F-29 | H | Kein LICENSE — public Repo ohne Lizenz = alle Rechte vorbehalten; niemand darf forken/nutzen | 📋 deine Entscheidung (MIT/Apache-2.0?) |
| F-30 | M | Keine Branch-Protection auf `main` (direkte Pushes möglich) | 📋 aktivieren (Repo-Settings) |
| F-31 | M | Kein Dependabot; Dependencies driften | 📋 `.github/dependabot.yml` |
| F-32 | N | Kein PR-Template / keine Issue-Templates | 📋 klein, hoher Hebel |
| F-33 | N | E2E (27 Playwright-Abnahmetests) nicht in CI — Playwright-CDN ist kein verlässlicher CI-Pfad lokaler Labs; bewusst lokal | 📋 bei Bedarf: separater Nightly-Job |
| F-34 | N | Screenshots im Repo (`docs/assets`, `app/docs-shots`) — 5+ MB Binärdateien; OK für Doku, beachten bei Historie | 📋 ggf. Git LFS später |

---

## 5. Offene Fachentscheidungen (blockieren absichtlich)

**F-07 `packFabric` — Meterware-Formel vs. Anzeige (22 %)**
Zwei Stellschrauben: (a) Formel `usedHeight × (1 + wastePct/2/100)` durch vollen Verschnitt
ersetzen oder (b) Anzeige/basisValues angleichen. (a) ist konservativer (mehr Meterware
→ sichere Kaufmenge, aber teureres Ergebnis), (b) ehrlicher (Anzeige = Rechnung). Zusätzlich
`rows + 1` normalisieren. Beides ändert Zuschnitt-Ausgaben → Golden-Werte und
`construction.test.ts`-Erwartungen ziehen nach; Begründung gehört in den Commit.
**Empfehlung:** (a) + `rows` ohne `+1` + `write: „Verschnitt 22 % (Shelf-Packing, 2 % Nutzbreite-Verlust"` — nach Freigabe umsetze ich das mit aktualisierten Test-Referenzen.

---

## 6. Supply Chain & Dependencies

`npm audit` (26.11.2026): **7 Findings (3 moderat, 2 hoch, 2 kritisch)**.

| Advisory | Komponente | Relevanz | Fix |
| --- | --- | --- | --- |
| GHSA-5gmw/85c8 | tinypool ≤2.1.1 (vitest) | nur Test-Worker | vitest ≥5 (breaking) |
| GHSA-82fw/qxg6 | @vitest/mocker | nur Tests | vitest ≥5 (breaking) |
| GHSA-67mh | esbuild/vite ≤6.4.3 | nur Dev-Server | vite ≥8 (breaking) |
| GHSA-mrhx | zod <4.6.6 | **Laufzeit** (Import-Validierung) | zod ≥4.6.7 (breaking) |

**Empfehlung:** geplantes Major-Upgrade (Branch + Abnahmetests + 193 Unit-Tests als Netz).
`npm audit fix --force` ist **kein** akzeptabler Pfad ohne Migration-Review. Bis dahin:
CI führt `npm audit --omit=dev --audit-level=high` als nicht-blockierende Warnung
(`continue-on-error` wäre die Alternative — bewusst nicht erzwungen, da das Gate sonst sofort rot wäre).

**F-29 LICENSE, F-30 Branch-Protection, F-31/F-32/F-33:** alles Repo-/Prozessentscheidungen
außerhalb „Code" — ohne dein Go setze ich sie nicht um (Lizenz ist rechtlich bindend).

---

## 7. Was bereits Industrie-Niveau ist (nicht anfassen)

- **Reiner, deterministischer Kern** (`Project → Construction`), keine Zeit/Zufall/I-O
  im Berechnungspfad; Hash über Absicht statt über IDs — nachvollziehbar, testbar.
- **mm-Disziplin** (`Mm`-Typ, ganzzahlig, HALF_UP über `mm()`, `NonFiniteError`) — Einheiten
  sind Typsache, nicht Konvention.
- **Zod an den Grenzen**, Referenzintegrität (eindeutige IDs, Zeilenexistenz, Modul-Allowlist),
  Schema-Migration (`schemaVersion`) mit Test.
- **193 Unit-Tests** inkl. Determinismus- und Template-Invarianten; Golden-Hashes als
  bewusster Regressionsanker; Playwright-Abnahmetests aus der PRD abgeleitet.
- **ErrorBoundary**, Sichtbar-/Tastatur-Bedienbarkeit (R, Ctrl+D, 1–5, Entf),
  `role=status`, `aria-label` an Modulen, Touch-Panels ab <1000 px.
- **Ehrliche UX** (kein Erfolg ohne Wirkung: Fix-Hash-Check, Mengen >0-Filter, Export erst ab
  Fehlerfreiheit) — die stärkste Eigenheit des Projekts. Behalten.
- **Doku ↔ Code-Kultur** (AGENTS.md, PHASE-3.md mit Abweichungsliste) — selten, wertvoll.

---

## 8. Prävention (damit es nicht wieder kippt)

1. **CI ist das Gate**, nicht die Erinnerung im README: Typecheck → Lint → Tests → Build.
2. **Pages-Deploy** läuft automatisiert ab `main` (+ manuell für Tests) — „funktioniert nur
   auf meiner Maschine" gibt es nicht mehr.
3. **`.gitignore`** verhindert Artefakt-Commits dauerhaft.
4. **Der Flat-Upload-Vorfall selbst** ist der eigentliche Fix-Anlass: Dateien gehören im
   Repo in die dokumentierte Struktur; ein Upload-Commit sollte nie wieder produktiv sein
   (Branch-Protection + Pflicht-CI decken das ab, §6).
5. **Link-Check als Skript** lohnt als `npm run check:docs` (jetzt im Audit einmalig
   durchgeführt — alle Links grün).

## 9. Verifizierte Endstände (26.11.2026)

```
cd app
npx tsc --noEmit     → 0 Fehler (strict, noUncheckedIndexedAccess)
npx eslint .         → 0 Fehler
npx vitest run       → 193 Tests / 5 Dateien grün
npm run build        → OK · Editor ≈ 388 kB (gzip ≈ 111 kB) · pdf-Chunk 428 kB
VITE_BASE_PATH=/Sew/ → Build + `vite preview`: /Sew/ liefert HTTP 200, Assets korrekt referenziert
Vorlagen-Hashes      → schmuck 536766d8 · makeup dc2a59aa · strick 5ed64ba1 (unverändert)
Markdown-Link-Check  → alle relativen Links OK
```

E2E (Playwright) wurde in diesem Audit **nicht** ausgeführt (Chromium-Download auf
außerhalb der Lab-Whitelist); die 27 Abnahmetests laufen lokal wie dokumentiert.

---

## 10. Zweite Prüfrunde (26.11.2026, abends) — tieferer Scan

Scope: Dead Code, i18n-Vollständigkeit, Dateinamen-/PDF-Robustheit, UI-Layering,
Config-Hygiene, Testabdeckung. Alles Verifizierte gilt für den Branch-Stand mit
desselben Golden-Hashes (`536766d8` / `dc2a59aa` / `5ed64ba1` — unverändert).

### Behoben in dieser Runde (193/193 Tests grün, Build OK)

| ID | Schwere | Befund | Fix |
| --- | --- | --- | --- |
| F-35 | M | **PDF-Export konnte crashen:** pdf-lib `drawText` wirft außerhalb cp1252 (Emoji/CJK aus einem importierten Projektnamen). try/catch in der UI fing es ab, aber Export war dann schlicht unbenutzbar | `safe()` neu: cp1252-Whitelist + CP1252-Extras, Rest → `?`, Steuerzeichen → Leerzeichen; 4 neue Tests (`safe` in `pdf.test.ts`) |
| F-36 | N | Toter Export: `snapX`/`SnapResult` (Canvas snappt selbst), `piecesBBox`, `snapToLines` (nur `snapX` nutzte ihn) | entfernt; Imports (`bbox`, `snapTo`) bereinigt |
| F-37 | N | Toter Store-Code: `useSelectedModule` ohne Aufrufer/Tests; Re-Export `newId`/`PRACTICE` unnötig | entfernt |
| F-38 | N | Layering: `App.tsx` importierte `findingKey` durch `Warnings.tsx` statt aus `core/fixes` | direkter Import; Re-Export entfernt |
| F-39 | N | `ci.yml` ohne `permissions`-Block (Default-Rechte zu breit) | `permissions: contents: read` |
| F-40 | N | Keine `.gitattributes`/`.editorconfig` — Zeilenende-/Binär-Behandlung ungeregelt | beide ergänzt (`*.pdf/-png` binary, LF, 2er-Indent) |
| F-41 | N | Testzähler-Drift in Doku (189 → 193 überall synchronisiert) | README/AGENTS/PHASE-3/Audit |

### i18n-Audit — Ergebnis: vollständig

- 339 statische `t('…')`-Referenzen: **alle definiert**, keine fehlt zur Laufzeit.
- Dynamische Schlüssel-Familien per Literal-Abgleich geprüft (`mat.*`, `phase.*`,
  `lib.cat.*`, `rule.<ruleId>.title|detail`, `fix.*`, `mod.*`, `piece.*`, `note.*`,
  `basis.*`, `v.*`, `f.*`, `help.*`, `op.*`, `instr.*`, `unit.*`, `u.*`, `warn.*`):
  **keine Lücke** — jede im Code referenzierte `ruleId` hat `.title` und `.detail`.
- Keine hartcodierten sichtbaren Strings mehr im UI-Layer (CP1252-Code-Pfad ausgenommen).
- Kein verwendeter Schlüssel fehlt (vorher: F-19).

### Neu gefunden — bewusst offen (Entscheidungen nötig)

| ID | Schwere | Befund | Vorschlag |
| --- | --- | --- | --- |
| F-42 | M | **Ungespeicherte Arbeit geht ohne Rückfrage verloren:** Vorlage laden / neues Projekt / Import / gespeichertes Projekt laden ersetzen den Stand sofort (nur Löschen hat Inline-Confirm). E2E klickt Template-Karten direkt — ein Rückfrage-Dialog muss e2e-kooperativ inline gelöst werden, nicht via `window.confirm` | Inline-Confirm (wie Löschen) oder dirty-Flag + Blocker; mit dir klären |
| F-43 | M | Dev-/Preview-Server mit `allowedHosts: true` und Bindung `0.0.0.0` (nötig für die Arena-Live-Preview) — auf Entwicklermaschinen LAN-sichtbar | In AGENTS.md dokumentieren oder per Env-Flag (`OPEN_HOSTS`) begrenzen |
| F-44 | M | **Store-Schicht ungetestet** (Persistenz, Undo/Redo, Save-Fehlerpfade, `resetToSaved`) — Zustand ist isoliert testbar (node-Env), wäre ein echter Industrie-Baustein | `src/_tests/store.test.ts` (~15–20 Tests); Vorlage: `project.test.ts` localStorage-Shim |
| F-45 | N | Supply-Chain-Pinning: Actions als `@v4`-Major-Pins statt Commit-SHA; Dependabot geschlossen Lücke nicht automatisch | SHA-Pins + Dependabot zusammen |
| F-46 | N | Qualitäts-Gate für Vorlagen (0 Fehler/0 Warnungen, Hash-Referenzen) liegt nur in AGENTS.md/README, nicht als Script | `npm run verify:templates` (Sonde) im Repo, optional in CI |
| F-47 | N | `size-limit`/Bundle-Budget-Wächter fehlt | optional; aktuell 388 kB Editor / 428 kB PDF-Chunk (separat) |
| F-48 | N | `toFile()` hardcodiert `appVersion: '0.1.0'` — drifted gegen `package.json` | Single Source (JSON-Import oder Vite-Define) |
| F-49 | N | `npm run e2e` nicht automatisiert (Chromium-Download) — lokal ok, CI offen | Nightly-Job oder Playwright-Cache |
| F-50 | N | Branch-Protection + LICENSE + Dependabot + PR-/Issue-Templates + SHA-Pins (F-29–F-32, F-45) | Entscheidung §6 |

### Prüfung, die bewusst NICHT passiert ist

Kein Browser-Render-Test dieser Runde (Snapshot/Screenshot); optischer
Regressionsschutz existiert über E2E + `docs-shots/`. Sichtprüfung nach
Mergen empfohlen.


---

## 11. Dritte Prüfrunde (26.11.2026, nachts) — „verbessere alles + vergessene Tests“

Scope: alles Offenstehende aus §10 plus Abhängigkeiten, Bundle-Budget und die
Tests, die sonst jeder vergisst. Golden-Hashes weiterhin unverändert
(`536766d8` / `dc2a59aa` / `5ed64ba1`); Vorlagen 0 Fehler / 0 Warnungen.

### Abhängigkeiten (jetzt 0 bekannte Schwachstellen)

| Paket | vorher | jetzt | Grund |
| --- | --- | --- | --- |
| `vite` | 5.x | **8.4.0** | Rolldown-basiert; Build ≈ 340 ms |
| `@vitejs/plugin-react` | 4.x | **6.3.0** | Peer vite ^8 |
| `vitest` | 2.x | **5.1.2** | Peer vite ^6.4/^7/^8 |
| `zod` | 3.x | **4.6.7** | Validierung; `z.record` braucht Key-Schema (Umstellung) |

`npm audit` → **0 Vulnerabilities**. Bewusst NICHT angefasst: React 18,
TypeScript 5.6, Zustand 4, ESLint 9, @playwright/test 1.48 — große Majors,
deren Nutzen in diesem Repo begrenzt ist und deren Verifikation hier nicht
vollständig möglich war (s. „Nicht ausgeführt“). Kandidaten für einen separaten,
gezielten Upgrade-Schritt.

**Vitest 5 braucht Node ≥ 22.12** → CI auf Node 22 angehoben (beide Workflows).

### Neu geschriebene Tests — die sonst jeder vergisst (35 neue → 228 gesamt)

| Datei | Tests | Abdeckung |
| --- | --- | --- |
| `src/_tests/store.test.ts` | 16 | Persistenz-Schreibfehler (Quota) ehrlich gemeldet, `loadStored` unbekannte ID, `resetToSaved`-Fallback, Import kaputt/valide, `applyFindingFix` ohne Wirkung/Erfolg, Toast-Timeout, Undo/Redo-Roundtrip, `duplicateStored`-Pfad, Dirty-Guard auf allen fünf ersetzenden Pfaden |
| `src/_tests/i18n.test.ts` | 6 | **Vertrag Code ↔ Wörterbuch**: jede statische `t('…')`-Referenz existiert; alle von der Engine erzeugten dynamischen Keys (Module, Felder, Options, Stücke, Operationen, Regeln, Extras) sind definiert; `phase.*`/`mat.*` vorhanden; Mut-Check (> 100 statische Refs gefunden) |
| `src/_tests/fixes.test.ts` | 11 | `findingKey` stabil/formatierbar; `applyFix` klemmt an Schemagrenzen, idempotent, kein `updatedAt` aus dem Kern, No-op bei unbekanntem Modul |
| `src/_tests/export.test.ts` | +2 | SVG-Escaping gegen Skript-Injection (`toSvg`), strukturelle Wohlgeformtheit |

Zusätzlich gehärtet: `safeRead()` in `core/project.ts` — ein Lese-Fehler im
`localStorage` (Policy/privater Modus) crashte bisher `loadLibrary()`; jetzt
tolerant (Test: „Speicherfehler … crasht nicht“).

### F-42 geschlossen: Schutz ungespeicherter Arbeit

Fünf Pfade ersetzen den Editor-Stand (Vorlage, neues Projekt, Import,
gespeichertes Projekt, Zurücksetzen). Jetzt:

- Store merkt `pendingDiscard`; `isDirty()` ist `past.length > 0`.
- **Inline-Rückfrage** (`role="alertdialog"`, deutsche Buttons „Verwerfen“/
  „Abbrechen“, Esc bricht ab, Fokus springt auf „Verwerfen“) im UI — kein
  `window.confirm` (e2e-kooperativ, tastatur-/screenreader-zugänglich).
- `importProject` validiert ERST (kaputte Datei → Fehlermeldung, keine
  Rückfrage), fragt erst danach.
- `duplicateStored()` dupliziert Bibliotheks-Einträge OHNE Öffnen/Ersetzen —
  wer dupliziert, verliert nie Arbeit (alter Bug: „Duplizieren“ rief
  `loadStored()` + `setPar()` uncodiert auf).
- 3 neue Playwright-Abnahmetests (§10, „Schutz vor Datenverlust“).

### Weitere geschlossene §10-Findings

| ID | Lösung |
| --- | --- |
| F-43 | In AGENTS.md (§0.1) + README dokumentiert: warum `0.0.0.0`/`allowedHosts` (Arena-Preview), wie man Loopback-only startet |
| F-45 | Actions als **Commit-SHAs** gepinnt (`checkout`, `setup-node`, `configure-pages`, `upload-pages-artifact`, `deploy-pages`) + `persist-credentials: false`; `.github/dependabot.yml` (npm wöchentlich, Actions wöchentlich, Gruppierung) |
| F-46 | `npm run verify:templates` = gezielter Lauf der Template-Invarianten (konstruiert alle Vorlagen, 0 Fehler/0 Warnungen, Hashes) |
| F-47 | `scripts/check-bundle-size.mjs` (ohne Zusatz-Dependency): schlägt an, wenn Editor-Chunk > 460 kB raw / 140 kB gzip bzw. PDF-Chunk > 460/200 — läuft als `npm run size` und in CI nach dem Build |
| F-48 | `appVersion` kommt jetzt aus `package.json` (`import { version }`); der hartcodierte `'0.1.0'` in `toFile()` UND in `PatternView.tsx` (dort als Inline-Klon von `toFile()` — jetzt `exportProject()`-Aufruf) ist weg |
| F-49 | CI hat zweiten Job `e2e` (Playwright, Node 22, Chromium mit Deps); Hinweis: lokal bleibt `npm run e2e` |
| F-50 | Teilweise: Dependabot + SHA-Pins umgesetzt; LICENSE und Branch-Protection bleiben Repo-Admin-Entscheidungen (s. u.) |

### Bewusst offen (Entscheidungen / externe Faktoren)

| ID | Befund | Stand |
| --- | --- | --- |
| F-50 | LICENSE fehlt; Branch-Protection auf `main` liegt bei der Repo-Administration | offen — Entscheidung des Repos |
| — | React-18→19, TS-5.6→7, Zustand 4→5, ESLint 9→10, Playwright-Major | bewusst nicht jetzt: Nutzen klein, Risiko bzw. Verifikation (E2E) hier nicht vollständig möglich |
| — | GitHub Pages kann von diesem Agenten nicht aktiviert werden (POST /pages → 403) | Repo-Admin: Settings → Pages → Source: GitHub Actions |

### Nicht ausgeführt in dieser Runde

Playwright-E2E **konnte in dieser Umgebung nicht ausgeführt werden**: die in
`~/.cache/ms-playwright` abgelegten Browser-Binaries sind nicht persistent
zwischen Sessions und der Download ist in diesem Sandbox durch die
Netzwerk-Allowlist blockiert (das CDN für
Browser-Binaries ist nicht in der Netzwerk-Allowlist; npm/GitHub erlaubt). `npx playwright install chromium` schlägt mit Code 1 fehl. Die E2E-
Suite (30 Tests inkl. 3 neuer Schutz-Tests) läuft auf jeder Pull-Request-CI
(Job `e2e`) bzw. lokal mit `npm run e2e`. Bis dort grün: die UI-Änderungen sind
durch Typecheck/Lint/Build/Unit abgesichert, aber **visuell unverifiziert**.

### Verifizierte Endstände (diese Runde)

```
npx tsc --noEmit    → 0 Fehler
npx eslint .        → 0 Fehler
npx vitest run      → 228 Tests / 8 Dateien grün
npm run verify:templates → 72 Konstruktionstests grün (Invarianten + Hashes)
npm run build       → OK · Editor ≈ 425 kB (gzip ≈ 122 kB) · pdf-Chunk ≈ 419 kB (gzip ≈ 175 kB)
npm run size        → OK (Budgets: index 460/140, pdf 460/200)
npm audit           → 0 Vulnerabilities
VITE_BASE_PATH=/Sew/ + vite preview → HTTP 200, Assets unter /Sew/ referenziert
Golden-Hashes       → unverändert
```
