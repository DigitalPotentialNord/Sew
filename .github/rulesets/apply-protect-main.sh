#!/usr/bin/env bash
#
# Wendet das Ruleset "Protect main" auf DigitalPotentialNord/Sew an
# und prüft danach, ob der Live-Zustand der Soll-Konfiguration entspricht.
#
#   ./.github/rulesets/apply-protect-main.sh            # anwenden (idempotent)
#   ./.github/rulesets/apply-protect-main.sh --verify    # nur prüfen, nichts ändern
#
# Voraussetzung: gh ist angemeldet und das Token hat
# "Administration: write" auf dem Repository (Rulesets). Ein GitHub-App-
# Installationstoken ohne diese Berechtigung schlägt mit HTTP 403 fehl
# ("Resource not accessible by integration") — dann als Repository-Owner
# im Browser anwenden, siehe docs/engineering/branch-protection.md §3.
#
# Warum kein blindes PUT: PUT /rulesets/{id} ersetzt das komplette Objekt.
# Das Skript liest immer erst den Ist-Zustand, damit nichts stillschweigend
# verloren geht, und meldet jede Abweichung, statt sie zu überschreiben.

set -euo pipefail

REPO="${REPO:-DigitalPotentialNord/Sew}"
RULESET_NAME="Protect main"
DESIRED_FILE="${DESIRED_FILE:-$(dirname "$0")/protect-main.json}"
MODE="${1:-apply}"

die() { printf 'FEHLER: %s\n' "$*" >&2; exit 1; }
ok()  { printf 'OK      %s\n' "$*"; }
bad() { printf 'ABWEICHUNG %s\n' "$*" >&2; FAILED=1; }

FAILED=0

command -v gh >/dev/null || die "gh (GitHub CLI) nicht gefunden"
command -v jq >/dev/null || die "jq nicht gefunden"
[[ -f "$DESIRED_FILE" ]] || die "Soll-Datei nicht gefunden: $DESIRED_FILE"
jq -e . "$DESIRED_FILE" >/dev/null || die "Soll-Datei ist kein gültiges JSON: $DESIRED_FILE"

# --- Ist-Zustand lesen -------------------------------------------------------
EXISTING_ID="$(gh api "repos/$REPO/rulesets" --jq \
  ".[] | select(.name == \"$RULESET_NAME\") | .id" 2>/dev/null || true)"

if [[ "$MODE" != "--verify" ]]; then
  if [[ -z "$EXISTING_ID" ]]; then
    printf 'Lege Ruleset "%s" an ...\n' "$RULESET_NAME"
    gh api --method POST "repos/$REPO/rulesets" --input "$DESIRED_FILE" \
      --jq '"Angelegt: id=\(.id) name=\(.name) enforcement=\(.enforcement)"' \
      || die "Anlegen fehlgeschlagen (fehlt Administration: write?)"
    EXISTING_ID="$(gh api "repos/$REPO/rulesets" --jq \
      ".[] | select(.name == \"$RULESET_NAME\") | .id")"
  else
    printf 'Ruleset "%s" existiert (id=%s) — aktualisiere ...\n' "$RULESET_NAME" "$EXISTING_ID"
    # Bewusst GET -> lokale Soll-Datei -> PUT: die Soll-Datei ist die Wahrheit,
    # vorhandene Regeln werden also zusammengeführt, nicht zufällig überschrieben.
    gh api --method PUT "repos/$REPO/rulesets/$EXISTING_ID" --input "$DESIRED_FILE" \
      --jq '"Aktualisiert: id=\(.id) enforcement=\(.enforcement)"' \
      || die "Aktualisieren fehlgeschlagen"
  fi
fi

[[ -n "$EXISTING_ID" ]] || die "Ruleset \"$RULESET_NAME\" existiert nicht (Modus $MODE)"

echo
echo "--- Kontrolle des Live-Zustands (id=$EXISTING_ID) ---"
LIVE="$(gh api "repos/$REPO/rulesets/$EXISTING_ID")"
WANT="$(jq -S . "$DESIRED_FILE")"

# 1. Name / Ziel / Aktiv
[[ "$(jq -r .name <<<"$LIVE")" == "$(jq -r .name <<<"$WANT")" ]] \
  && ok "Name = $(jq -r .name <<<"$LIVE")" || bad "Name"
[[ "$(jq -r .target <<<"$LIVE")" == "branch" ]] \
  && ok "Target = branch" || bad "Target"
[[ "$(jq -r .enforcement <<<"$LIVE")" == "active" ]] \
  && ok "Enforcement = active" || bad "Enforcement ist '$(jq -r .enforcement <<<"$LIVE")'"

# 2. Gilt ausschließlich für main
INCLUDE="$(jq -c '.conditions.ref_name.include' <<<"$LIVE")"
EXCLUDE="$(jq -c '.conditions.ref_name.exclude // []' <<<"$LIVE")"
[[ "$INCLUDE" == '["refs/heads/main"]' ]] && ok "Gilt für refs/heads/main" || bad "Include = $INCLUDE"
[[ "$EXCLUDE" == '[]' ]] && ok "Keine Ausnahmen (exclude leer)" || bad "Exclude = $EXCLUDE"

# 3. Pull-Request-Pflicht, 0 Freigaben, Konversationen aufgelöst, nur Squash
PR="$(jq -c '.rules[] | select(.type=="pull_request") | .parameters' <<<"$LIVE")"
[[ -n "$PR" ]] && ok "Regel pull_request vorhanden" || bad "Regel pull_request fehlt"
[[ "$(jq -r .required_approving_review_count <<<"$PR" 2>/dev/null)" == "0" ]] \
  && ok "Required approvals = 0" || bad "Required approvals"
[[ "$(jq -r .required_review_thread_resolution <<<"$PR" 2>/dev/null)" == "true" ]] \
  && ok "Conversation resolution = an" || bad "Conversation resolution"
[[ "$(jq -c '.allowed_merge_methods' <<<"$PR" 2>/dev/null)" == '["squash"]' ]] \
  && ok "Erlaubte Merge-Verfahren = [squash]" || bad "allowed_merge_methods = $(jq -c '.allowed_merge_methods' <<<"$PR" 2>/dev/null)"

# 4. Pflicht-Prüfungen: exakt die echten Check-Namen aus .github/workflows/ci.yml
CHECKS="$(jq -c '[.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[] | .context] | sort' <<<"$LIVE")"
WANT_CHECKS="$(jq -c '[.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[] | .context] | sort' <<<"$WANT")"
[[ "$CHECKS" == "$WANT_CHECKS" ]] && ok "Pflicht-Checks = $CHECKS" || bad "Pflicht-Checks = $CHECKS (erwartet $WANT_CHECKS)"

# 5. Force-Push und Löschen blockiert
jq -e '[.rules[].type] | index("non_fast_forward")' <<<"$LIVE" >/dev/null \
  && ok "Force-Push blockiert (non_fast_forward)" || bad "non_fast_forward fehlt"
jq -e '[.rules[].type] | index("deletion")' <<<"$LIVE" >/dev/null \
  && ok "Löschen blockiert (deletion)" || bad "deletion fehlt"

# 6. Bypass: ausschließlich die Admin-Rolle (actor_id 5), Notfallausnahme
BYPASS="$(jq -c '.bypass_actors // []' <<<"$LIVE")"
EXPECTED_BYPASS='[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"}]'
if [[ "$BYPASS" == "$EXPECTED_BYPASS" ]]; then
  ok "Bypass = ausschließlich Admin-Rolle (RepositoryRole 5, always)"
elif [[ "$BYPASS" == "[]" || "$BYPASS" == "null" ]]; then
  bad "Bypass fehlt (Admin-Notfallausnahme nicht konfiguriert)"
else
  bad "Bypass enthält unerwartete Akteure: $BYPASS"
fi

# 7. Repository-weite Merge-Verfahren
echo
echo "--- Repository-Einstellungen ---"
SETTINGS="$(gh api "repos/$REPO" --jq '{squash: .allow_squash_merge, merge: .allow_merge_commit, rebase: .allow_rebase_merge}')"
[[ "$(jq -r .squash <<<"$SETTINGS")" == "true" ]]  && ok "Squash Merge erlaubt"        || bad "Squash Merge deaktiviert"
[[ "$(jq -r .merge <<<"$SETTINGS")" == "false" ]]  && ok "Merge Commit deaktiviert"     || bad "Merge Commit noch erlaubt"
[[ "$(jq -r .rebase <<<"$SETTINGS")" == "false" ]] && ok "Rebase Merge deaktiviert"     || bad "Rebase Merge noch erlaubt"

echo
if [[ "$FAILED" -eq 0 ]]; then
  echo "Ergebnis: Soll-Zustand erreicht."
else
  echo "Ergebnis: Abweichungen vorhanden (siehe oben)." >&2
  exit 1
fi
