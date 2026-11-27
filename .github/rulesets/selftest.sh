#!/usr/bin/env bash
#
# Selbsttest für apply-protect-main.sh — läuft ohne GitHub und ohne
# Administration-Rechte, weil der Stub-Modus (STUB_DIR) benutzt wird.
#
#   ./.github/rulesets/selftest.sh
#
# Geprüft wird beides: dass der Soll-Zustand als OK durchgeht, und dass JEDE
# einzelne Abweichung wirklich erkannt wird. Ohne den zweiten Teil wäre nicht
# bewiesen, dass --verify überhaupt etwas fängt.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$HERE/apply-protect-main.sh"
DESIRED="$HERE/protect-main.json"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); printf '  ok    %s\n' "$*"; }
nope() { FAIL=$((FAIL+1)); printf '  FAIL  %s\n' "$*" >&2; }

# Baut einen Stub-Zustand: $1 = jq-Filter, der auf die Soll-Datei angewandt wird
make_stub() {
  local dir="$1" filter="$2"
  mkdir -p "$dir"
  jq "$filter" "$DESIRED" > "$dir/ruleset.json"
  jq -n '[{"id":4242,"name":"Protect main"}]' > "$dir/rulesets.json"
  jq -n '{allow_squash_merge:true, allow_merge_commit:false, allow_rebase_merge:false}' > "$dir/repo.json"
  # Effektive Regeln (GET /rules/branches/main) aus der Soll-Datei ableiten,
  # so wie GitHub sie anwenden würde.
  jq '[.rules[] | . + {ruleset_source_type:"Repository", ruleset_source:"DigitalPotentialNord/Sew", ruleset_id:4242}]' \
    "$dir/ruleset.json" > "$dir/branch-rules.json"
  # Bootstrapping-Stub: alle Pflicht-Checks sind auf main schon gelaufen.
  jq -n --slurpfile d "$DESIRED" '{sha:"main-sha"}' > "$dir/commit.json"
  jq -n --slurpfile d "$DESIRED" \
    '{check_runs: [$d[0].rules[] | select(.type=="required_status_checks")
                  | .parameters.required_status_checks[] | {name: .context, conclusion: "success"}]}' \
    > "$dir/check-runs.json"
}

# Erwartung: Läuft --verify gegen den Stub sauber durch (Exit 0)?
expect_ok() {
  local name="$1" dir="$2"
  if STUB_DIR="$dir" "$SCRIPT" --verify >"$WORK/out" 2>&1; then
    ok "$name"
  else
    nope "$name — --verify meldete Fehler:"
    sed 's/^/        /' "$WORK/out" >&2
  fi
}

# Erwartung: Erkennt --verify die Abweichung (Exit 1) und nennt das Stichwort?
expect_bad() {
  local name="$1" dir="$2" needle="$3"
  if STUB_DIR="$dir" "$SCRIPT" --verify >"$WORK/out" 2>&1; then
    nope "$name — Abweichung wurde NICHT erkannt"
  elif ! grep -qF "$needle" "$WORK/out"; then
    nope "$name — Fehler erkannt, aber '$needle' fehlt in der Meldung"
  else
    ok "$name"
  fi
}

echo "1) Soll-Zustand muss durchgehen"
make_stub "$WORK/good" '.'
expect_ok "unveraenderter Soll-Zustand ist OK" "$WORK/good"

echo
echo "2) Abweichungen muessen erkannt werden"
make_stub "$WORK/d1" '.enforcement = "disabled"'
expect_bad "Ruleset deaktiviert" "$WORK/d1" "Enforcement = 'disabled'"

make_stub "$WORK/d2" '.conditions.ref_name.include += ["refs/heads/dev*"]'
expect_bad "Zielbranch zu weit gefasst" "$WORK/d2" "Include = "

make_stub "$WORK/d3" '.conditions.ref_name.exclude = ["refs/heads/main"]'
expect_bad "main ausgenommen" "$WORK/d3" "Exclude = "

make_stub "$WORK/d4" '.rules |= map(select(.type != "pull_request"))'
expect_bad "PR-Pflicht entfernt (direkte Pushes erlaubt)" "$WORK/d4" "Regel pull_request fehlt"

make_stub "$WORK/d5" '(.rules[] | select(.type=="pull_request") | .parameters.required_approving_review_count) = 1'
expect_bad "menschliche Freigabe erzwungen" "$WORK/d5" "Required approvals = 1"

make_stub "$WORK/d6" '(.rules[] | select(.type=="pull_request") | .parameters.required_review_thread_resolution) = false'
expect_bad "Conversation Resolution aus" "$WORK/d6" "Conversation resolution"

make_stub "$WORK/d7" '(.rules[] | select(.type=="pull_request") | .parameters.allowed_merge_methods) = ["squash","merge"]'
expect_bad "Merge Commit wieder erlaubt" "$WORK/d7" "allowed_merge_methods"

make_stub "$WORK/d8" '(.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks) = [{"context":"Typecheck · Lint · Test · Build","integration_id":15368}]'
expect_bad "Pflicht-Check fehlt (Playwright)" "$WORK/d8" "Pflicht-Checks = "

make_stub "$WORK/d9" '(.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[0].context) = "CI"'
expect_bad "falscher Check-Name (erfunden)" "$WORK/d9" "Pflicht-Checks = "

make_stub "$WORK/d10" '(.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[0].integration_id) = null'
expect_bad "Check ohne Absender (integration_id)" "$WORK/d10" "Pflicht-Checks = "

make_stub "$WORK/d11" '.rules |= map(select(.type != "non_fast_forward"))'
expect_bad "Force-Push erlaubt" "$WORK/d11" "non_fast_forward fehlt"

make_stub "$WORK/d12" '.rules |= map(select(.type != "deletion"))'
expect_bad "Loeschen von main erlaubt" "$WORK/d12" "deletion fehlt"

make_stub "$WORK/d13" '.bypass_actors += [{"actor_id":99,"actor_type":"User","bypass_mode":"always"}]'
expect_bad "fremder Bypass-Akteur (Benutzer)" "$WORK/d13" "fremde Akteure"

make_stub "$WORK/d14" '.bypass_actors += [{"actor_id":15368,"actor_type":"Integration","bypass_mode":"always"}]'
expect_bad "fremder Bypass-Akteur (GitHub App)" "$WORK/d14" "fremde Akteure"

make_stub "$WORK/d15" '.bypass_actors = []'
expect_bad "Bypass fehlt (kein Notausgang)" "$WORK/d15" "Bypass ist leer"

# (bypass_actors ganz entfernt wird in 4b behandelt: Sichtbarkeitsgrenze des
#  Tokens, kein Fehlalarm — das ist die bewusste Unterscheidung zu d15.)

echo
echo "3) Repository-Einstellungen"
make_stub "$WORK/d17" '.'
jq '.allow_merge_commit = true' "$WORK/d17/repo.json" > "$WORK/t" && mv "$WORK/t" "$WORK/d17/repo.json"
expect_bad "Merge Commit repository-weit erlaubt" "$WORK/d17" "Merge Commit noch erlaubt"

make_stub "$WORK/d18" '.'
jq '.allow_rebase_merge = true' "$WORK/d18/repo.json" > "$WORK/t" && mv "$WORK/t" "$WORK/d18/repo.json"
expect_bad "Rebase Merge repository-weit erlaubt" "$WORK/d18" "Rebase Merge noch erlaubt"

make_stub "$WORK/d19" '.'
jq '.allow_squash_merge = false' "$WORK/d19/repo.json" > "$WORK/t" && mv "$WORK/t" "$WORK/d19/repo.json"
expect_bad "Squash Merge deaktiviert (Mergen unmoeglich)" "$WORK/d19" "Squash Merge deaktiviert"

echo
echo "4) Feldreihenfolge der API-Antwort darf keinen falschen Alarm ausloesen"
make_stub "$WORK/order" '.bypass_actors = [{"bypass_mode":"always","actor_type":"RepositoryRole","actor_id":5}]'
expect_ok "Bypass mit anderer Feldreihenfolge ist OK" "$WORK/order"

echo
echo "4b) Token ohne Schreibrechte: GitHub liefert bypass_actors gar nicht"
# Wichtig fuer den CI-Waechter: GITHUB_TOKEN sieht das Feld nicht. Das darf
# keinen Fehlalarm ausloesen, sonst blockiert der Waechter jeden PR.
make_stub "$WORK/nobypass" 'del(.bypass_actors)'
if STUB_DIR="$WORK/nobypass" "$SCRIPT" --verify >"$WORK/out" 2>&1; then
  if grep -q "bypass_actors nicht sichtbar" "$WORK/out"; then
    ok "fehlendes Feld = Hinweis, kein Fehler (CI-Token)"
  else
    nope "fehlendes Feld: kein Hinweis ausgegeben"
  fi
else
  nope "fehlendes Feld wurde als Fehler gewertet (Fehlalarm im CI)"
  sed 's/^/        /' "$WORK/out" >&2
fi

# Gegenprobe: vorhanden, aber leer, ist ein echter Mangel.
make_stub "$WORK/emptybypass" '.bypass_actors = []'
expect_bad "leeres bypass_actors ist ein Fehler" "$WORK/emptybypass" "Bypass ist leer"

echo
echo "4c) Wirkungspruefung (GET /rules/branches/main, ohne Schreibrechte)"
# Das Ruleset kann korrekt gespeichert sein und trotzdem nicht wirken. Genau
# das muss auffallen, weil die Wirkung das ist, was zaehlt.

make_stub "$WORK/e1" '.'
jq 'map(select(.type != "pull_request"))' "$WORK/e1/branch-rules.json" > "$WORK/t" && mv "$WORK/t" "$WORK/e1/branch-rules.json"
expect_bad "main wirkt ungeschuetzt (keine PR-Regel)" "$WORK/e1" "NICHT geschuetzt"

make_stub "$WORK/e2" '.'
jq 'map(select(.type != "required_status_checks"))' "$WORK/e2/branch-rules.json" > "$WORK/t" && mv "$WORK/t" "$WORK/e2/branch-rules.json"
expect_bad "Pflicht-Checks wirken nicht" "$WORK/e2" "NICHT wirksam"

make_stub "$WORK/e3" '.'
jq 'map(if .type=="required_status_checks" then .parameters.required_status_checks |= .[:1] else . end)' \
  "$WORK/e3/branch-rules.json" > "$WORK/t" && mv "$WORK/t" "$WORK/e3/branch-rules.json"
expect_bad "ein wirksamer Pflicht-Check fehlt" "$WORK/e3" "wirksame Pflicht-Checks"

make_stub "$WORK/e4" '.'
jq 'map(if .type=="pull_request" then .parameters.allowed_merge_methods = ["squash","merge"] else . end)' \
  "$WORK/e4/branch-rules.json" > "$WORK/t" && mv "$WORK/t" "$WORK/e4/branch-rules.json"
expect_bad "Merge Commit wirkt erlaubt" "$WORK/e4" "Merge-Verfahren"

make_stub "$WORK/e5" '.'
jq 'map(if .type=="pull_request" then .parameters.required_approving_review_count = 1 else . end)' \
  "$WORK/e5/branch-rules.json" > "$WORK/t" && mv "$WORK/t" "$WORK/e5/branch-rules.json"
expect_bad "menschliche Freigabe wirkt erzwungen" "$WORK/e5" "wirksam erforderliche Freigaben = 1"

make_stub "$WORK/e6" '.'
jq 'map(select(.type != "non_fast_forward"))' "$WORK/e6/branch-rules.json" > "$WORK/t" && mv "$WORK/t" "$WORK/e6/branch-rules.json"
expect_bad "Force-Push wirkt erlaubt" "$WORK/e6" "Force-Push NICHT blockiert"

make_stub "$WORK/e7" '.'
jq 'map(select(.type != "deletion"))' "$WORK/e7/branch-rules.json" > "$WORK/t" && mv "$WORK/t" "$WORK/e7/branch-rules.json"
expect_bad "Loeschen wirkt erlaubt" "$WORK/e7" "Loeschen NICHT blockiert"

# Gegenprobe: gar keine Regeln wirksam = der Zustand von heute.
mkdir -p "$WORK/e8"
cp "$WORK/good/ruleset.json" "$WORK/good/rulesets.json" "$WORK/good/repo.json" "$WORK/e8/"
echo '[]' > "$WORK/e8/branch-rules.json"
expect_bad "keine einzige Regel wirksam (heutiger Zustand)" "$WORK/e8" "NICHT geschuetzt"

echo
echo "4d) Bootstrapping: Pflicht-Check ohne Lauf auf main blockiert jeden PR"
# Genau der Fall, der den ersten Merge dauerhaft blockieren würde.
make_stub "$WORK/b1" '.'
jq '.check_runs |= map(select(.name != "Ruleset & Gate-Integrität"))' \
  "$WORK/b1/check-runs.json" > "$WORK/t" && mv "$WORK/t" "$WORK/b1/check-runs.json"
expect_bad "Waechter-Check lief noch nie auf main" "$WORK/b1" "noch NIE gelaufen"

make_stub "$WORK/b2" '.'
jq '.check_runs |= map(select(.name != "Abnahmetests (Playwright)"))' \
  "$WORK/b2/check-runs.json" > "$WORK/t" && mv "$WORK/t" "$WORK/b2/check-runs.json"
expect_bad "Playwright lief noch nie auf main" "$WORK/b2" "noch NIE gelaufen"

make_stub "$WORK/b3" '.'
expect_ok "alle Pflicht-Checks sind auf main belegt" "$WORK/b3"

echo
echo "5) Fehlendes Ruleset ist ein Fehler, kein stiller Erfolg"
mkdir -p "$WORK/none"
echo '[]' > "$WORK/none/rulesets.json"
jq -n '{allow_squash_merge:true, allow_merge_commit:false, allow_rebase_merge:false}' > "$WORK/none/repo.json"
if STUB_DIR="$WORK/none" "$SCRIPT" --verify >"$WORK/out" 2>&1; then
  nope "fehlendes Ruleset wurde als OK gemeldet"
elif grep -q "existiert nicht" "$WORK/out"; then
  ok "fehlendes Ruleset wird gemeldet"
else
  nope "fehlendes Ruleset: unerwartete Meldung"
fi

echo
echo "6) Soll-Datei wird vor dem Schreiben validiert"
mkdir -p "$WORK/badjson"
jq '.bypass_actors = [{"actor_id":4,"actor_type":"RepositoryRole","bypass_mode":"always"}]' "$DESIRED" > "$WORK/bad.json"
if DESIRED_FILE="$WORK/bad.json" STUB_DIR="$WORK/good" "$SCRIPT" --verify >"$WORK/out" 2>&1; then
  nope "Soll-Datei mit Bypass auf 'write'-Rolle wurde akzeptiert"
elif grep -q "RepositoryRole 5" "$WORK/out"; then
  ok "Soll-Datei mit falscher Bypass-Rolle wird abgelehnt"
else
  nope "Soll-Datei-Validierung: unerwartete Meldung"
fi

echo
echo "-------------------------------------------"
printf 'Bestanden: %d   Fehlgeschlagen: %d\n' "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]] || exit 1
echo "Selbsttest erfolgreich."
