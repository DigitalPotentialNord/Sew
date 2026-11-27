# Branch-Schutz `main` — Soll-Konfiguration, Umsetzung, Prüfung

Stand: 27.11.2026 · Repository: `DigitalPotentialNord/Sew` · Ziel-Branch: `main`

Dieses Dokument ist die verbindliche Beschreibung des Schutzes für `main`. Es hält
fest, **was** geschützt werden soll, **warum** genau diese Prüfungen Pflicht sind,
**wo** die Konfiguration liegt und **wie** man sie anwendet und kontrolliert.

Der Soll-Zustand liegt als maschinenlesbare Datei im Repository:

| Datei | Zweck |
| --- | --- |
| [`.github/rulesets/protect-main.json`](../../.github/rulesets/protect-main.json) | Soll-Zustand des Rulesets `Protect main` (versioniert, reviewbar) |
| [`.github/rulesets/apply-protect-main.sh`](../../.github/rulesets/apply-protect-main.sh) | wendet ihn an (`apply`) bzw. prüft nur (`--verify`), idempotent |
| [`.github/rulesets/selftest.sh`](../../.github/rulesets/selftest.sh) | testet die Prüflogik ohne GitHub: Soll-Zustand + 17 gezielt kaputte Zustände |
| [`.github/workflows/guard-branch-protection.yml`](../../.github/workflows/guard-branch-protection.yml) | Wächter im CI: Ruleset-Prüfung, Gate-Schritte in `ci.yml`, Live-Abgleich |

Exit-Codes des Skripts: `0` = Soll-Zustand erreicht, `1` = Abweichungen
gefunden, `2` = Vorbedingung verletzt (kein Ruleset, ungültige Soll-Datei,
fehlende Berechtigung). Ein fehlendes Ruleset ist damit **kein** stiller
Erfolg.

---

## 1. Ausgangslage (untersucht am 27.11.2026)

| Punkt | Befund |
| --- | --- |
| Repository-Rulesets | **keine** (`GET /repos/.../rulesets` → `[]`) |
| Klassische Branch Protection auf `main` | **nicht aktiv** (`main.protected = false`, `enforcement_level: off`) |
| Merge-Verfahren (Repository-Einstellung) | Squash **an**, Merge Commit **an**, Rebase **an** |
| Workflows | `ci.yml`, `pages.yml`, `dependabot.yml` — alle vorhanden und aktiv |
| Doppelte / veraltete Schutzregeln | keine (es gab keine) |
| Collaborators | `DigitalPotentialNord` (admin) — einziger Akteur |

**Ergebnis:** `main` war zu diesem Zeitpunkt **vollständig ungeschützt**. Direkte
Pushes, Force-Pushes und das Löschen des Branches waren ohne weitere Prüfung
möglich. Es gab keine bestehende Regel, die hätte erhalten oder zusammengeführt
werden müssen.

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

Die Namen stammen aus `.github/workflows/ci.yml` und wurden gegen die real
aufgelaufenen Check-Runs verifiziert (`GET /commits/main/check-runs`):

| Pflicht-Check (Kontext-Name) | Job in `ci.yml` | Deckt ab |
| --- | --- | --- |
| `Typecheck · Lint · Test · Build` | `check` | TypeScript (`tsc --noEmit`), ESLint, Vitest-Unit-Tests, Produktionsbuild, **Bundle-Budget** (`npm run size`) |
| `Abnahmetests (Playwright)` | `e2e` | E2E-/Abnahmetests (Chromium) |

Beide Checks stammen von `github-actions` (`integration_id: 15368`).
TypeScript, Lint, Unit-Tests, Build und Bundle-Budget laufen als **Schritte im
selben Job** — deshalb ist der Job-Name der Check-Name; eigene Check-Namen pro
Schritt existieren in GitHub Actions nicht. Es werden **keine** erfundenen
Kontexte eingetragen.

**Nicht als Pflicht-Check eingetragen** (bewusst):

- `Build (base /Sew/)`, `Deploy` (`pages.yml`) — laufen nur bei Push auf `main`,
  nicht bei Pull Requests, und sind Deployment, kein Qualitäts-Gate.
- `Dependabot` — stammt nicht aus den eigenen Workflows, ist kein Gate.

### 2.3 Warum diese beiden Checks zuverlässig sind

Geprüft am 27.11.2026:

- Beide Workflows werden bei **jedem** Pull Request ausgelöst (`on: pull_request:`
  ohne Pfad- oder Branch-Filter in `ci.yml`). Kein PR bleibt ohne Checks.
- Beide Jobs sind auf `ubuntu-24.04` gepinnt (nicht `ubuntu-latest`), damit
  Playwright-`--with-deps` nicht an einem zu neuen Ubuntu scheitert.
- Auf dem aktuellen Stand von `main` laufen nachweislich grün:
  `tsc --noEmit` (0 Fehler), `eslint .` (0 Fehler), `vitest` (255 Tests),
  `vite build`, Bundle-Budget (beide Budgets eingehalten), Playwright.
- Playwright ist im CI mit `retries: 1` konfiguriert; auf unverändertem Code
  zeigte die Historie keine Flakes (Fehlschläge traten nur auf Branches mit
  tatsächlichen Fehlern bzw. bei echten Abhängigkeitsbrüchen auf).

### 2.4 `strict_required_status_checks_policy`

Bewusst **`false`**: Der PR muss die Checks auf seinem eigenen Head-Commit
bestehen, aber nicht zusätzlich gegen den jeweils neuesten `main` neu laufen.
Mit nur einem aktiven Entwickler und schnellen Merges würde `true` unnötig
PRs blockieren, ohne Sicherheitsgewinn (das Ruleset verhindert ohnehin direkte
Pushes). Bei Bedarf später auf `true` stellen — eine Zeile in der JSON-Datei.

### 2.5 Notfall-Bypass (ausschließlich Admin-Rolle)

```json
"bypass_actors": [
  { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
]
```

`RepositoryRole` mit `actor_id: 5` ist die **Admin-Rolle** des Repositorys.

> **Dies ist eine Notfallausnahme, kein normaler Arbeitsweg.**
>
> Der Bypass existiert für genau einen Fall: ein Pflicht-Check läuft nicht mehr
> an (umbenannter Workflow, GitHub-Incident, kaputter Runner) und ohne ihn wäre
> `main` bis zur Reparatur vollständig blockiert. Ein Admin darf dann einmalig
> eingreifen — sichtbar im Audit-Log des Rulesets.
>
> Nicht der Zweck des Bypasses: schnell „doch mal“ direkt auf `main` pushen,
> Reviews oder Checks überspringen, weil der CI gerade rot ist.
>
> Bewusst **nicht** eingetragen: einzelne Benutzer, Teams, Deploy-Keys, GitHub
> Apps und insbesondere **keine Arena-Agenten**. Agenten arbeiten immer über
> Branches und Pull Requests.

Konsequenz des `always`-Modus (bewusst gewählt): Im Notfall greift der Bypass
auch für einen direkten Push. Wer den Notfall noch enger fassen will, setzt
`"bypass_mode": "pull_request"` — dann bleibt nur der Merge eines PRs möglich,
niemals ein direkter Push.

### 2.6 Merge-Verfahren

Zwei Ebenen, beide nötig:

1. **Ruleset:** `allowed_merge_methods: ["squash"]` — verbietet Merge-Commit und
   Rebase für `main` auch dann, wenn sie repository-weit erlaubt wären.
2. **Repository-Einstellung:** Squash an, Merge Commit aus, Rebase aus, damit die
   Merge-Schaltfläche im UI gar nicht erst Alternativen anbietet.

Zielwerte:

| Einstellung | Soll |
| --- | --- |
| Allow squash merging | **an** |
| Allow merge commits | **aus** |
| Allow rebase merging | **aus** |

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

Das Skript ist idempotent: existiert das Ruleset, wird es aktualisiert,
sonst angelegt. Danach prüft es den Live-Zustand gegen den Soll-Zustand und
endet bei jeder Abweichung mit Exit-Code 1.

Bevor irgendetwas geschrieben wird, validiert das Skript die Soll-Datei selbst
(aktiv, nur `main`, alle vier Regeln vorhanden, Bypass ausschließlich
`RepositoryRole 5`). Eine versehentlich abgeschwächte Soll-Datei kann damit
kein schwächeres Ruleset anwenden.

Prüflogik ohne GitHub testen:

```bash
./.github/rulesets/selftest.sh   # 24 Prüfungen, läuft gegen einen Stub
```

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
| Require a pull request before merging | ✔ (Required approvals: **0**; *Require conversation resolution*: ✔) |
| Require status checks to pass | ✔ → `Typecheck · Lint · Test · Build`, `Abnahmetests (Playwright)` |

Feld **„Allowed merge methods“** im Abschnitt *Require a pull request before
merging* auf **nur Squash** stellen.

**Merge-Verfahren:** Repository → *Settings* → *General* → *Pull Requests* →
*Allow merge commits* und *Allow rebase merging* **abwählen**,
*Allow squash merging* **anwählen**.

---

## 4. Abschließende Kontrolle

Nach dem Anwenden `./.github/rulesets/apply-protect-main.sh --verify` ausführen.
Es prüft exakt diese Punkte:

| # | Frage | Prüfung |
| --- | --- | --- |
| 1 | Ist das Ruleset aktiv? | `enforcement == active` |
| 2 | Gilt es für `main`? | `include == ["refs/heads/main"]`, `exclude == []` |
| 3 | Sind direkte Änderungen blockiert? | Regel `pull_request` vorhanden |
| 4 | Sind Force-Pushes blockiert? | Regel `non_fast_forward` vorhanden |
| 5 | Ist Löschen blockiert? | Regel `deletion` vorhanden |
| 6 | Korrekte CI-Checks als Pflicht? | exakt die zwei Namen aus §2.2 |
| 7 | Menschliche Freigabe weiterhin 0? | `required_approving_review_count == 0` |
| 8 | Admin-Bypass korrekt? | ausschließlich `RepositoryRole 5` |
| 9 | Nur Squash erlaubt? | `allowed_merge_methods == ["squash"]` + Repo-Einstellungen |
| 10 | Reguläre PRs weiter mergebar? | siehe §5 |
| 11 | Drift: existieren die Pflicht-Jobs noch in `ci.yml`? | §4.1 |

Zusätzlich jederzeit ohne Token lesbar:

```bash
gh api repos/DigitalPotentialNord/Sew/rules/branches/main
```

### 4.1 Wächter gegen stilles Abschwächen

Der Schutz wäre wertlos, wenn er unbemerkt ausgehöhlt werden könnte. Drei
Szenarien sind denkbar — alle drei werden abgefangen:

| Szenario | Was passiert | Auffangnetz |
| --- | --- | --- |
| Jemand entfernt `npm run size` (Bundle-Budget) aus `ci.yml` | Der Job `Typecheck · Lint · Test · Build` bleibt grün — das Ruleset merkt nichts | `guard-branch-protection.yml` prüft die sechs Gate-Schritte auf Existenz |
| Ein Job in `ci.yml` wird umbenannt | Der Pflicht-Check würde nie wieder erfüllt → jeder PR dauerhaft blockiert | Wächter vergleicht die Job-Namen mit den Pflicht-Check-Namen |
| Das Ruleset wird im UI abgeschwächt (Regel aus, Bypass erweitert) | CI bliebe grün | `--verify` im Wächter vergleicht den Live-Zustand, sobald das Ruleset existiert |

Der Wächter läuft bei jedem Pull Request und auf `main`. Seine Prüflogik ist
mit `selftest.sh` selbst getestet — inklusive der Gegenprobe, dass jede der 17
Abweichungen wirklich erkannt wird.

**Bewusst nicht als Pflicht-Check eingetragen:** Der Check-Name
`Ruleset & Gate-Integrität` existiert erst, nachdem der Workflow auf `main`
liegt; als Pflicht eingetragen würde er den ersten Merge dieses PRs selbst
blockieren. Nach dem Merge ist das eine Zeile in `protect-main.json` — siehe §7.

---

## 5. Was sich für den Alltag ändert

- Jede Änderung an `main` läuft über einen Pull Request. Direkte Pushes auf
  `main` werden abgewiesen (`GH013: Repository rule violations`).
- Ein PR ist mergebar, wenn beide CI-Jobs grün sind und alle Kommentare
  aufgelöst sind — **ohne** dass jemand zustimmen muss.
- Gemerged wird ausschließlich per **Squash**.
- Für Agenten ändert sich nichts am Ablauf: Branch → PR → Checks → Squash-Merge.

### Betroffene offene Pull Requests

Pflicht-Checks blockieren nur, was tatsächlich rot ist. Zwei offene
Dependabot-PRs sind aus **inhaltlichen** Gründen rot (kein Flake, kein
Workflow-Fehler) und würden nach Aktivierung des Rulesets bis zur Behebung
nicht mergebar sein — das ist gewollt:

| PR | Ursache (reproduziert am 27.11.2026) |
| --- | --- |
| #6 `react`-Gruppe | React-19-Typen definieren den globalen `JSX`-Namespace nicht mehr → `tsc`: `TS2503: Cannot find namespace 'JSX'` in ~15 UI-Dateien. `npm ci` selbst läuft durch. |
| #5 `build-toolchain`-Gruppe | `typescript@6.0.3` verletzt Peer-Range von `typescript-eslint@8.74.0` (`>=4.8.4 <6.1.0`) → `npm ci` bricht mit `ERESOLVE` ab. |

Beide sind echte Kompatibilitätsbrüche, die vor einem Merge behoben (oder
geschlossen) werden müssen. Alle übrigen offenen PRs sind grün.

---

## 6. Was hier bewusst nicht geändert wurde

- **Keine** Änderung an `ci.yml`: Der Workflow löst bereits bei jedem PR aus,
  alle relevanten Prüfungen laufen. Es war kein separater Workflow-PR nötig, um
  die Checks zuverlässig auszulösen. Der neue
  `guard-branch-protection.yml` ist ein **zusätzlicher** Wächter und greift
  nicht in Build oder Tests ein.
- **Keine** Änderung an Tests, keine abgeschwächten oder übersprungenen Prüfungen.
- **Keine** Änderung am Quellcode in `app/`.
- **Keine** zusätzlichen Regeln (Signaturen, Linear History, Merge Queue,
  Pflicht-Reviewer, Branch-Namensmuster), die den Ablauf ohne Nutzen bremsen.
- `pages.yml` bleibt unverändert aktiv (Deploy nach `main`-Merge).

---

## 7. Optionaler nächster Schritt

Nachdem `guard-branch-protection.yml` auf `main` liegt, kann sein Check-Name
zusätzlich Pflicht werden. Dazu in `.github/rulesets/protect-main.json`:

```json
{ "context": "Ruleset & Gate-Integrität", "integration_id": 15368 }
```

in `required_status_checks` ergänzen, danach `apply-protect-main.sh` erneut
ausführen. Ein Eintrag mehr oder weniger ist der einzige Unterschied; der
Selbsttest deckt beide Varianten ab.
