# Branch-Schutz `main` — Soll-Konfiguration, Umsetzung, Prüfung

Stand: 27.11.2026 · Repository: `DigitalPotentialNord/Sew` · Ziel-Branch: `main`

Dieses Dokument ist die verbindliche Beschreibung des Schutzes für `main`. Es hält
fest, **was** geschützt werden soll, **warum** genau diese Prüfungen Pflicht sind,
**wo** die Konfiguration liegt und **wie** man sie anwendet und kontrolliert.

Der Soll-Zustand ist versioniert und in drei Stufen abgesichert:

| Datei | Zweck |
| --- | --- |
| [`.github/rulesets/protect-main.json`](../../.github/rulesets/protect-main.json) | Soll-Zustand des Rulesets `Protect main` |
| [`.github/rulesets/apply-protect-main.sh`](../../.github/rulesets/apply-protect-main.sh) | anwenden (`apply`) bzw. prüfen (`--verify`), idempotent |
| [`.github/rulesets/selftest.sh`](../../.github/rulesets/selftest.sh) | 35 Prüfungen der Prüflogik, ohne GitHub (Stub) |
| [`.github/rulesets/schema-check.py`](../../.github/rulesets/schema-check.py) | Payload gegen das **offizielle GitHub-Schema**, 9 Negativ-Kontrollen |
| [`.github/workflows/guard-branch-protection.yml`](../../.github/workflows/guard-branch-protection.yml) | Wächter im CI, selbst Pflicht-Check |

Exit-Codes des Skripts: `0` = Soll-Zustand erreicht, `1` = Abweichungen,
`2` = Vorbedingung verletzt (kein Ruleset, ungültige Soll-Datei, fehlende
Berechtigung). Ein fehlendes Ruleset ist damit **kein** stiller Erfolg.

---

## 1. Ausgangslage (untersucht am 27.11.2026)

| Punkt | Befund |
| --- | --- |
| Repository-Rulesets | **keine** (`GET /rulesets` → `[]`) |
| Wirksame Regeln auf `main` | **keine** (`GET /rules/branches/main` → `[]`) |
| Klassische Branch Protection | **nicht aktiv** (`protected = false`) |
| Merge-Verfahren (Repository-Einstellung) | Squash **an**, Merge Commit **an**, Rebase **an** |
| Workflows | `ci.yml`, `pages.yml`, `dependabot.yml` — alle vorhanden und aktiv |
| Doppelte / veraltete Schutzregeln | keine (es gab keine) |
| Collaborators | `DigitalPotentialNord` (admin) — einziger Akteur |

`main` war **vollständig ungeschützt**: direkte Pushes, Force-Pushes und Löschen
waren ohne Prüfung möglich. Es gab keine bestehende Regel, die hätte erhalten
oder zusammengeführt werden müssen.

---

## 2. Soll-Zustand

### 2.1 Ruleset `Protect main`

| Eigenschaft | Wert |
| --- | --- |
| Name | `Protect main` |
| Enforcement | `active` |
| Target | `branch`, ausschließlich `refs/heads/main` |
| Require a pull request before merging | **an** |
| Required approvals | **0** (keine menschliche Freigabe erzwungen) |
| Require conversation resolution | **an** |
| Require status checks to pass | **an** (siehe §2.2) |
| Block force pushes | **an** (`non_fast_forward`) |
| Restrict deletions | **an** (`deletion`) |
| Erlaubte Merge-Verfahren im Ruleset | ausschließlich `squash` |

### 2.2 Pflicht-Prüfungen — nur tatsächlich existierende Check-Namen

Die Namen stammen aus den Workflow-Dateien und wurden gegen die real
aufgelaufenen Check-Runs auf `main` verifiziert (`GET /commits/main/check-runs`):

| Pflicht-Check (Kontext-Name) | Job in | Deckt ab |
| --- | --- | --- |
| `Typecheck · Lint · Test · Build` | `ci.yml` | TypeScript (`tsc --noEmit`), ESLint, Vitest-Unit-Tests, Produktionsbuild, **Bundle-Budget** (`npm run size`) |
| `Abnahmetests (Playwright)` | `ci.yml` | E2E-/Abnahmetests (Chromium) |
| `Ruleset & Gate-Integrität` | `guard-branch-protection.yml` | schützt den Schutz selbst (§4.1) |

Alle von `github-actions` (`integration_id: 15368`). TypeScript, Lint,
Unit-Tests, Build und Bundle-Budget laufen als **Schritte im selben Job** —
deshalb ist der Job-Name der Check-Name; eigene Check-Namen pro Schritt
existieren in GitHub Actions nicht. Es werden **keine** erfundenen Kontexte
eingetragen.

**Nicht als Pflicht-Check eingetragen** (bewusst):

- `Build (base /Sew/)`, `Deploy` (`pages.yml`) — laufen nur bei Push auf `main`,
  nicht bei Pull Requests, und sind Deployment, kein Qualitäts-Gate.
- `Dependabot` — stammt nicht aus den eigenen Workflows, ist kein Gate.

### 2.3 Warum diese Checks zuverlässig sind

- Alle drei Workflows werden bei **jedem** Pull Request ausgelöst
  (`on: pull_request:` ohne Pfad- oder Branch-Filter). Kein PR bleibt ohne Checks.
- Die CI-Jobs sind auf `ubuntu-24.04` gepinnt (nicht `ubuntu-latest`), damit
  Playwrights `--with-deps` nicht an einem zu neuen Ubuntu scheitert.
- Auf dem aktuellen Stand von `main` nachweislich grün: `tsc --noEmit`
  (0 Fehler), `eslint .` (0 Fehler), `vitest` (255 Tests), `vite build`,
  Bundle-Budget (beide Budgets eingehalten), Playwright.

### 2.4 `strict_required_status_checks_policy`

Bewusst **`false`**: Der PR muss die Checks auf seinem eigenen Head-Commit
bestehen, aber nicht zusätzlich gegen den neuesten `main` neu laufen. Bei einem
aktiven Entwickler und schnellen Merges würde `true` unnötig blockieren, ohne
Sicherheitsgewinn — direkte Pushes verhindert bereits die `pull_request`-Regel.
Bei Bedarf später auf `true` stellen: eine Zeile in der JSON.

### 2.5 Notfall-Bypass (ausschließlich Admin-Rolle)

```json
"bypass_actors": [
  { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
]
```

`RepositoryRole` mit `actor_id: 5` ist die **Admin-Rolle** des Repositorys
(bestätigt durch den enum im offiziellen GitHub-Schema: `RepositoryRole`).

> **Dies ist eine Notfallausnahme, kein normaler Arbeitsweg.**
>
> Der Bypass existiert für genau einen Fall: ein Pflicht-Check läuft nicht mehr
> an (umbenannter Workflow, GitHub-Incident, kaputter Runner) und ohne ihn wäre
> `main` bis zur Reparatur blockiert. Ein Admin darf dann einmalig eingreifen —
> sichtbar im Audit-Log.
>
> Nicht der Zweck: schnell „doch mal" direkt auf `main` pushen, Reviews oder
> Checks überspringen, weil CI gerade rot ist.
>
> Bewusst **nicht** eingetragen: einzelne Benutzer, Teams, Deploy-Keys oder
> GitHub Apps — und insbesondere **keine Arena-Agenten**. Agenten arbeiten
> immer über Branches und Pull Requests.

`always` ist bewusst gewählt: Im Notfall wirkt der Bypass auch bei einem
direkten Push. Wer den Notfall enger fassen will, setzt
`"bypass_mode": "pull_request"` — dann bleibt nur der Merge eines PRs möglich.

### 2.6 Merge-Verfahren

Zwei Ebenen, beide nötig:

1. **Ruleset:** `allowed_merge_methods: ["squash"]` — verbietet Merge-Commit und
   Rebase für `main` auch dann, wenn sie repository-weit erlaubt wären.
2. **Repository-Einstellung:** Squash an, Merge Commit aus, Rebase aus, damit
   die Merge-Schaltfläche im UI keine Alternativen anbietet.

---

## 3. Anwenden

### 3.1 Mit ausreichenden Berechtigungen

Das Token braucht **`Administration: write`** auf dem Repository. Ein
GitHub-App-Installationstoken ohne diese Berechtigung wird mit
`HTTP 403 — Resource not accessible by integration` abgewiesen
(Header `x-accepted-github-permissions: administration=write`).

```bash
./.github/rulesets/apply-protect-main.sh          # anlegen/aktualisieren
./.github/rulesets/apply-protect-main.sh --verify # nur kontrollieren
```

Das Skript ist idempotent. Bevor es **irgendetwas** schreibt, validiert es die
Soll-Datei (aktiv, nur `main`, alle vier Regeln vorhanden, Bypass ausschließlich
`RepositoryRole 5`). Eine versehentlich abgeschwächte Soll-Datei kann damit kein
schwächeres Ruleset anwenden.

Repository-Einstellungen (Squash/Merge/Rebase) separat:

```bash
gh api --method PATCH repos/DigitalPotentialNord/Sew \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false
```

### 3.2 Über die Weboberfläche (ohne Administration-Token)

**Ruleset:** Repository → *Settings* → *Rules* → *Rulesets* → *New branch ruleset*

| Feld | Wert |
| --- | --- |
| Ruleset Name | `Protect main` |
| Enforcement status | `Active` |
| Target branches | *Add target* → *Include by pattern* → `main` |
| Bypass list | *Add bypass* → **Repository admin** |
| Restrict deletions | ✔ |
| Block force pushes | ✔ |
| Require a pull request before merging | ✔ (Required approvals: **0**; *Require conversation resolution*: ✔; *Allowed merge methods*: **nur Squash**) |
| Require status checks to pass | ✔ → die drei Namen aus §2.2 |

**Merge-Verfahren:** Repository → *Settings* → *General* → *Pull Requests* →
*Allow merge commits* und *Allow rebase merging* **abwählen**,
*Allow squash merging* **anwählen**.

---

## 4. Kontrolle

### 4.1 Drei Nachweisebenen

Der Schutz wird nicht geglaubt, sondern auf drei Ebenen geprüft — jede mit einer
anderen Fehlerquelle im Blick:

| Ebene | Frage | Werkzeug | Braucht Schreibrechte? |
| --- | --- | --- | --- |
| **Payload** | Würde GitHub diese Konfiguration überhaupt annehmen? | `schema-check.py` gegen das offizielle OpenAPI-Schema | nein |
| **Gespeichert** | Steht im Ruleset, was drinstehen soll? | `apply-protect-main.sh` liest `GET /rulesets/{id}` | nein (Lesen) |
| **Wirksam** | Setzt GitHub es auf `main` tatsächlich durch? | `GET /rules/branches/main` — die effektiven Regeln | **nein** |

Die dritte Ebene ist die wichtigste: Ein korrekt gespeichertes Ruleset kann
trotzdem nicht greifen (falsches Target, deaktiviert, von einer anderen Regel
überlagert). Genau dieser Fall — gespeichert korrekt, wirksam nichts — wird
erkannt und gemeldet.

```bash
./.github/rulesets/apply-protect-main.sh --verify   # Ebenen 2 + 3 + Repo-Einstellungen
python3 .github/rulesets/schema-check.py            # Ebene 1
./.github/rulesets/selftest.sh                      # Prüflogik selbst
```

### 4.2 Die zehn Kontrollfragen

| # | Frage | Prüfung (Ebene) |
| --- | --- | --- |
| 1 | Ist das Ruleset aktiv? | `enforcement == active` (2) |
| 2 | Gilt es für `main`? | `include == ["refs/heads/main"]`, `exclude == []` (2) + wirksame `pull_request`-Regel (3) |
| 3 | Sind direkte Änderungen blockiert? | Regel `pull_request` (2) **und** wirksam (3) |
| 4 | Sind Force-Pushes blockiert? | `non_fast_forward` (2) **und** wirksam (3) |
| 5 | Ist Löschen blockiert? | `deletion` (2) **und** wirksam (3) |
| 6 | Korrekte CI-Checks als Pflicht? | exakt die drei Namen (2), wirksam (3), in Workflows vorhanden (§4.3) |
| 7 | Menschliche Freigabe weiterhin 0? | gespeichert (2) **und** wirksam (3) |
| 8 | Admin-Bypass korrekt? | ausschließlich `RepositoryRole 5` (2) |
| 9 | Nur Squash erlaubt? | gespeichert (2), wirksam (3), Repo-Einstellungen |
| 10 | Reguläre PRs weiter mergebar? | kein Pflicht-Check ohne Lauf auf `main` (§4.3), §5 |

Zusätzlich jederzeit ohne Token lesbar:

```bash
gh api repos/DigitalPotentialNord/Sew/rules/branches/main
```

### 4.3 Wächter gegen stilles Aushöhlen und Selbstblockade

Der Schutz wäre wertlos, wenn er unbemerkt ausgehöhlt würde — oder wenn er
durch eine falsche Pflichtangabe jeden PR blockiert. Beides fängt
`guard-branch-protection.yml` ab, bei jedem PR und auf `main`:

| Szenario | Auffangnetz |
| --- | --- |
| `npm run size` (Bundle-Budget) wird aus `ci.yml` entfernt | Wächter prüft die sechs Gate-Schritte auf Existenz → rot |
| Ein Job in den Workflows wird umbenannt | Wächter vergleicht Job-Namen über **alle** Workflow-Dateien → rot |
| Ruleset im UI abgeschwächt (Regel aus, Bypass erweitert) | `--verify` und Wirkungsprüfung → rot, sobald das Ruleset aktiv ist |
| Ein Pflicht-Check ist auf `main` noch nie gelaufen | `apply-protect-main.sh` meldet das, **bevor** es eingetragen wird (§4.4) |

Seine Prüflogik ist mit `selftest.sh` selbst getestet — inklusive der
Gegenprobe, dass jede Abweichung wirklich erkannt wird.

### 4.4 Bootstrapping — warum hier kein Henne-Ei-Problem entsteht

Ein Pflicht-Check, der noch nie gelaufen ist, blockiert dauerhaft jeden PR.
Deshalb gilt: **Ein Check wird nur Pflicht, wenn er auf `main` bereits
existiert.** Erfüllt wird das durch die Reihenfolge:

1. `guard-branch-protection.yml` läuft schon bei **jedem Pull Request**, bevor
   das Ruleset existiert — der Check-Name ist also ab dem Merge dieses PRs auf
   `main` vorhanden.
2. `apply-protect-main.sh` prüft vor dem Eintragen, ob jeder Pflicht-Check im
   Check-Run-Verlauf des aktuellen `main`-Commits vorkommt; sonst verweigert es
   mit Exit 2.
3. Solange das Ruleset noch nicht aktiv ist (0 wirksame Regeln), meldet der
   Wächter die Regel-Prüfungen als „noch nicht angewendet" und bleibt grün —
   er blockiert also nicht seinen eigenen ersten Merge.

---

## 5. Was sich für den Alltag ändert

- Jede Änderung an `main` läuft über einen Pull Request. Direkte Pushes werden
  abgewiesen (`GH013: Repository rule violations`).
- Ein PR ist mergebar, wenn alle drei Checks grün sind und alle Kommentare
  aufgelöst sind — **ohne** dass jemand zustimmen muss.
- Gemerged wird ausschließlich per **Squash**.
- Für Agenten ändert sich nichts am Ablauf: Branch → PR → Checks → Squash-Merge.

### Betroffene offene Pull Requests

Pflicht-Checks blockieren nur, was tatsächlich rot ist. Zwei offene
Dependabot-PRs sind aus **inhaltlichen** Gründen rot (kein Flake, kein
Workflow-Fehler) und wären bis zur Behebung nicht mergebar — das ist gewollt:

| PR | Ursache (reproduziert am 27.11.2026) |
| --- | --- |
| #6 `react`-Gruppe | React-19-Typen definieren den globalen `JSX`-Namespace nicht mehr → `tsc`: `TS2503: Cannot find namespace 'JSX'` in ~15 UI-Dateien. `npm ci` läuft durch. |
| #5 `build-toolchain`-Gruppe | `typescript@6.0.3` verletzt die Peer-Range von `typescript-eslint@8.74.0` (`>=4.8.4 <6.1.0`) → `npm ci` bricht mit `ERESOLVE` ab. |

Beide sind echte Kompatibilitätsbrüche, die vor einem Merge behoben (oder
geschlossen) werden müssen. Alle übrigen offenen PRs sind grün.

---

## 6. Was hier bewusst nicht geändert wurde

- **Keine** Änderung an `ci.yml`: Der Workflow löst bereits bei jedem PR aus.
  Der Wächter ist ein **zusätzlicher** Workflow und greift nicht in Build oder
  Tests ein.
- **Keine** Änderung an Tests, keine abgeschwächten oder übersprungenen Prüfungen.
- **Keine** Änderung am Quellcode in `app/`.
- **Keine** zusätzlichen Regeln (Signaturen, Linear History, Merge Queue,
  Pflicht-Reviewer, Branch-Namensmuster), die ohne Nutzen bremsen.
- `pages.yml` bleibt unverändert aktiv (Deploy nach `main`-Merge).

---

## 7. Grenzen dieses Ansatzes

Ehrlich benannt, weil sie den Aussagewert begrenzen:

1. **Das Anwenden selbst ist nicht automatisierbar.** Dem Agenten-Token fehlt
   `Administration: write`; GitHub antwortet mit HTTP 403. Deshalb ist die
   Kette so gebaut, dass jeder andere Schritt ohne diese Berechtigung prüfbar
   ist und der eine fehlende Schritt eine einzelne Zeile bleibt.
2. **Es gibt kein echtes „Trockenlaufen" gegen die GitHub-API.** Der
   Schema-Check prüft Struktur und Enums gegen die offizielle Spezifikation,
   aber ob eine inhaltlich erlaubte Konfiguration von GitHub auch akzeptiert
   wird, zeigt erst der Schreibzugriff. Deshalb prüft `--verify` danach die
   **Wirkung** — nicht die Absicht.
3. **Die Wirkungsprüfung sieht keine Bypass-Akteure.** `GET /rules/branches/main`
   liefert Regeln, nicht die Bypass-Liste. Diese bleibt an `GET /rulesets/{id}`
   mit Schreibrechten gebunden; ohne sie meldet das Skript das ausdrücklich als
   HINWEIS statt es zu verschweigen.
