#!/usr/bin/env bash
#
# Wendet das Ruleset "Protect main" auf DigitalPotentialNord/Sew an und prüft
# danach den Live-Zustand gegen den Soll-Zustand.
#
#   ./.github/rulesets/apply-protect-main.sh            # anwenden (idempotent)
#   ./.github/rulesets/apply-protect-main.sh --verify    # nur prüfen, nichts ändern
#   STUB_DIR=/tmp/x ./.github/rulesets/apply-protect-main.sh --verify   # gegen Stub
#
# Voraussetzung zum Anwenden: gh ist angemeldet, das Token hat
# "Administration: write". Ein GitHub-App-Installationstoken ohne diese
# Berechtigung scheitert mit HTTP 403 "Resource not accessible by integration".
# In dem Fall als Repository-Owner im Browser anwenden, siehe
# docs/engineering/branch-protection.md §3.2.
#
# Testbarkeit: Alle GitHub-Aufrufe laufen über gh_ro/gh_rw. Ist STUB_DIR
# gesetzt, werden Dateien daraus gelesen bzw. dorthin geschrieben. So lässt
# sich die Prüflogik ohne Administration-Rechte vollständig testen
# (siehe .github/rulesets/selftest.sh).
#
# Drei Nachweisebenen:
#   1. Payload  — schema-check.py gegen das offizielle GitHub-OpenAPI-Schema
#   2. Gespeichert — GET /rulesets/{id}
#   3. Wirksam  — GET /rules/branches/main (effektive Regeln, ohne Schreibrechte)
#
# Wichtig: PUT /rulesets/{id} ersetzt das komplette Objekt. Die Soll-Datei ist
# daher die einzige Wahrheit; vorhandene Regeln werden nicht blind
# überschrieben, sondern vorher gelesen und gemeldet (--verify).

set -uo pipefail

REPO="${REPO:-DigitalPotentialNord/Sew}"
RULESET_NAME="Protect main"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
DESIRED_FILE="${DESIRED_FILE:-$HERE/protect-main.json}"
STUB_DIR="${STUB_DIR:-}"
MODE="${1:-apply}"

FAILED=0

die() { printf 'FEHLER: %s\n' "$*" >&2; exit 2; }
ok()  { printf 'OK         %s\n' "$*"; }
bad() { printf 'ABWEICHUNG %s\n' "$*" >&2; FAILED=1; }

command -v jq >/dev/null || die "jq nicht gefunden"
if [[ -z "$STUB_DIR" ]]; then
  command -v gh >/dev/null || die "gh (GitHub CLI) nicht gefunden"
fi

# --- GitHub-Zugriff (mit Stub-Umschaltung) -----------------------------------
_gh() { # $1=ro|rw, Rest=Argumente
  local dir="$STUB_DIR" _ro="$1"; shift
  if [[ -z "$dir" ]]; then gh "$@"; return $?; fi
  _stub_gh "$_ro" "$@"
}

_stub_gh() {
  local rw="$1"; shift
  local method=GET path="" jqf="." input=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --jq) jqf="$2"; shift 2 ;;
      --input) input="$2"; shift 2 ;;
      --method) method="$2"; shift 2 ;;
      -X) method="$2"; shift 2 ;;
      --paginate) shift ;;
      *) path="$1"; shift ;;
    esac
  done
  local file
  case "$method" in
    POST|PUT|PATCH)
      [[ -n "$input" ]] || { printf 'STUB: %s ohne --input\n' "$method" >&2; return 1; }
      mkdir -p "$STUB_DIR"
      cp "$input" "$STUB_DIR/posted.json"
      [[ -f "$STUB_DIR/rulesets.json" ]] || echo '[]' > "$STUB_DIR/rulesets.json"
      echo '{"id":4242}' > "$STUB_DIR/created.json"
      jq "$jqf" "$STUB_DIR/created.json" ;;
    *)
      case "$path" in
        repos/*/rules/branches/*) file="$STUB_DIR/branch-rules.json" ;;
        repos/*/commits/*/check-runs) file="$STUB_DIR/check-runs.json" ;;
        repos/*/commits/*) file="$STUB_DIR/commit.json" ;;
        repos/*/rulesets) file="$STUB_DIR/rulesets.json" ;;
        repos/*/rulesets/*) file="$STUB_DIR/ruleset.json" ;;
        repos/*) file="$STUB_DIR/repo.json" ;;
        *) printf 'STUB: unbekannter Pfad %s\n' "$path" >&2; return 1 ;;
      esac
      [[ -f "$file" ]] || { printf 'STUB: %s fehlt\n' "$file" >&2; return 1; }
      jq "$jqf" "$file" ;;
  esac
}

# --- Vorbedingungen ----------------------------------------------------------
[[ -f "$DESIRED_FILE" ]] || die "Soll-Datei nicht gefunden: $DESIRED_FILE"
jq -e . "$DESIRED_FILE" >/dev/null 2>&1 || die "Soll-Datei ist kein gültiges JSON: $DESIRED_FILE"

WANT="$(jq -S . "$DESIRED_FILE")"

# Strukturelle Plausibilität der Soll-Datei, bevor irgendetwas geschrieben wird.
[[ "$(jq -r .enforcement <<<"$WANT")" == "active" ]] || die "Soll-Datei: enforcement muss 'active' sein"
[[ "$(jq -c '.conditions.ref_name.include' <<<"$WANT")" == '["refs/heads/main"]' ]] \
  || die "Soll-Datei: include muss exakt [\"refs/heads/main\"] sein"
jq -e '[.rules[].type] | index("pull_request") and index("required_status_checks")
       and index("non_fast_forward") and index("deletion")' <<<"$WANT" >/dev/null \
  || die "Soll-Datei: eine der Regeln pull_request/required_status_checks/non_fast_forward/deletion fehlt"
[[ "$(jq -c '[.bypass_actors[] | "\(.actor_type):\(.actor_id)"]' <<<"$WANT")" == '["RepositoryRole:5"]' ]] \
  || die "Soll-Datei: Bypass muss ausschließlich RepositoryRole 5 (Admin) sein"

# --- Ist-Zustand lesen -------------------------------------------------------
EXISTING_ID="$(_gh ro "repos/$REPO/rulesets" --jq \
  ".[] | select(.name == \"$RULESET_NAME\") | .id" 2>/dev/null || true)"

if [[ "$MODE" != "--verify" ]]; then
  if [[ -z "$EXISTING_ID" ]]; then
    printf 'Lege Ruleset "%s" an ...\n' "$RULESET_NAME"
    _gh rw --method POST "repos/$REPO/rulesets" --input "$DESIRED_FILE" \
      --jq '"Angelegt: id=\(.id) name=\(.name) enforcement=\(.enforcement)"' \
      || die "Anlegen fehlgeschlagen (fehlt Administration: write?)"
    EXISTING_ID="$(_gh ro "repos/$REPO/rulesets" --jq \
      ".[] | select(.name == \"$RULESET_NAME\") | .id")"
  else
    printf 'Ruleset "%s" existiert (id=%s) — aktualisiere ...\n' "$RULESET_NAME" "$EXISTING_ID"
    _gh rw --method PUT "repos/$REPO/rulesets/$EXISTING_ID" --input "$DESIRED_FILE" \
      --jq '"Aktualisiert: id=\(.id) enforcement=\(.enforcement)"' \
      || die "Aktualisieren fehlgeschlagen"
  fi
fi

[[ -n "$EXISTING_ID" ]] || die "Ruleset \"$RULESET_NAME\" existiert nicht (Modus $MODE)"
LIVE="$(_gh ro "repos/$REPO/rulesets/$EXISTING_ID")" || die "Ruleset $EXISTING_ID nicht lesbar"

echo
echo "--- Ruleset \"$RULESET_NAME\" (id=$EXISTING_ID) ---"

# 1. Name, Ziel, Enforcement
[[ "$(jq -r .name <<<"$LIVE")" == "$RULESET_NAME" ]] \
  && ok "Name = $RULESET_NAME" || bad "Name = '$(jq -r .name <<<"$LIVE")'"
[[ "$(jq -r .target <<<"$LIVE")" == "branch" ]] \
  && ok "Target = branch" || bad "Target = '$(jq -r .target <<<"$LIVE")'"
[[ "$(jq -r .enforcement <<<"$LIVE")" == "active" ]] \
  && ok "Enforcement = active" || bad "Enforcement = '$(jq -r .enforcement <<<"$LIVE")' (muss active sein)"

# 2. Gilt ausschließlich für main
[[ "$(jq -c '.conditions.ref_name.include' <<<"$LIVE")" == '["refs/heads/main"]' ]] \
  && ok "Gilt für refs/heads/main" || bad "Include = $(jq -c '.conditions.ref_name.include' <<<"$LIVE")"
[[ "$(jq -c '.conditions.ref_name.exclude // []' <<<"$LIVE")" == '[]' ]] \
  && ok "Keine Ausnahmen (exclude leer)" || bad "Exclude = $(jq -c '.conditions.ref_name.exclude // []' <<<"$LIVE")"

# 3. Pull-Request-Pflicht
if ! jq -e '.rules[] | select(.type=="pull_request")' <<<"$LIVE" >/dev/null; then
  bad "Regel pull_request fehlt — direkte Pushes auf main waeren erlaubt"
else
  ok "Pull Request für jede Aenderung an main erforderlich"
  PR="$(jq -c '.rules[] | select(.type=="pull_request") | .parameters' <<<"$LIVE")"

  [[ "$(jq -r '.required_approving_review_count // "FEHLT"' <<<"$PR")" == "0" ]] \
    && ok "Required approvals = 0" \
    || bad "Required approvals = $(jq -r '.required_approving_review_count // "FEHLT"' <<<"$PR") (soll 0)"

  for f in dismiss_stale_reviews_on_push require_code_owner_review require_last_push_approval; do
    [[ "$(jq -r ".$f" <<<"$PR")" == "false" ]] \
      || bad "$f = $(jq -r ".$f" <<<"$PR") — nicht aufgefordert, bremst ohne Nutzen"
  done

  [[ "$(jq -r '.required_review_thread_resolution' <<<"$PR")" == "true" ]] \
    && ok "Conversation resolution erforderlich" \
    || bad "Conversation resolution = $(jq -r '.required_review_thread_resolution' <<<"$PR") (soll true)"

  # 4. Nur Squash
  [[ "$(jq -c '.allowed_merge_methods // "FEHLT"' <<<"$PR")" == '["squash"]' ]] \
    && ok "Erlaubte Merge-Verfahren = [squash]" \
    || bad "allowed_merge_methods = $(jq -c '.allowed_merge_methods // "FEHLT"' <<<"$PR") (soll [\"squash\"])"
fi

# 5. Pflicht-Prüfungen — exakt die echten Check-Namen aus ci.yml
CHECKS="$(jq -c '[.rules[] | select(.type=="required_status_checks")
                  | .parameters.required_status_checks[] | "\(.context)@\(.integration_id)"] | sort' <<<"$LIVE")"
WANT_CHECKS="$(jq -c '[.rules[] | select(.type=="required_status_checks")
                       | .parameters.required_status_checks[] | "\(.context)@\(.integration_id)"] | sort' <<<"$WANT")"
if [[ "$WANT_CHECKS" == "[]" ]]; then
  bad "Soll-Datei enthält keine Pflicht-Checks"
elif [[ "$CHECKS" == "$WANT_CHECKS" ]]; then
  ok "Pflicht-Checks = $(jq -r '[.rules[]|select(.type=="required_status_checks")|.parameters.required_status_checks[].context]|join(" | ")' <<<"$LIVE")"
else
  bad "Pflicht-Checks = $CHECKS (erwartet $WANT_CHECKS)"
fi

# 6. Force-Push und Löschen blockiert
jq -e '[.rules[].type] | index("non_fast_forward")' <<<"$LIVE" >/dev/null \
  && ok "Force-Push blockiert (non_fast_forward)" || bad "non_fast_forward fehlt — Force-Push erlaubt"
jq -e '[.rules[].type] | index("deletion")' <<<"$LIVE" >/dev/null \
  && ok "Loeschen von main blockiert (deletion)" || bad "deletion fehlt — main loeschbar"

# 6b. Wirkungsprüfung ohne Schreibrechte.
#     GET /rules/branches/{branch} liefert die von GitHub tatsächlich
#     angewendeten Regeln ("effective rules") und braucht nur Metadata:read —
#     es funktioniert also auch mit GITHUB_TOKEN im CI und sogar anonym.
#     Das ist der stärkere Nachweis als das Lesen der gespeicherten Soll-Datei:
#     er zeigt, was GitHub wirklich durchsetzt.
EFFECTIVE="$(_gh ro "repos/$REPO/rules/branches/main" 2>/dev/null || echo "__FEHLER__")"
if [[ "$EFFECTIVE" == "__FEHLER__" ]]; then
  bad "effektive Regeln fuer main nicht lesbar (GET /rules/branches/main)"
else
  eff_has() { jq -e --arg t "$1" '[.[].type] | index($t)' <<<"$EFFECTIVE" >/dev/null 2>&1; }
  echo "--- Effektiv angewendet auf main (GitHub-Sicht) ---"
  if ! eff_has pull_request; then
    bad "main ist NICHT geschuetzt: keine pull_request-Regel wirksam"
  elif ! eff_has required_status_checks; then
    bad "Pflicht-Checks sind auf main NICHT wirksam"
  else
    ok "main ist geschuetzt: pull_request + required_status_checks wirksam"
    # Genau die geforderten Check-Namen müssen wirksam sein.
    eff_checks="$(jq -c '[.[] | select(.type=="required_status_checks")
                          | .parameters.required_status_checks[].context] | sort' <<<"$EFFECTIVE")"
    want_checks="$(jq -c '[.rules[] | select(.type=="required_status_checks")
                           | .parameters.required_status_checks[].context] | sort' <<<"$WANT")"
    [[ "$eff_checks" == "$want_checks" ]] \
      && ok "wirksame Pflicht-Checks = $(jq -r 'join(" | ")' <<<"$eff_checks")" \
      || bad "wirksame Pflicht-Checks = $eff_checks (erwartet $want_checks)"

    # Nur Squash? (Feld fehlt, wenn GitHub die Voreinstellung nicht mitschickt.)
    eff_merge="$(jq -c '[.[] | select(.type=="pull_request") | .parameters.allowed_merge_methods // ["alle"]] | .[0]' <<<"$EFFECTIVE")"
    [[ "$eff_merge" == '["squash"]' ]] \
      && ok "wirksam erlaubte Merge-Verfahren = [squash]" \
      || bad "wirksam erlaubte Merge-Verfahren = $eff_merge (erwartet [\"squash\"])"

    # 0 Freigaben wirksam?
    eff_appr="$(jq -r '[.[] | select(.type=="pull_request") | .parameters.required_approving_review_count] | .[0] // "FEHLT"' <<<"$EFFECTIVE")"
    [[ "$eff_appr" == "0" ]] \
      && ok "wirksam erforderliche Freigaben = 0" \
      || bad "wirksam erforderliche Freigaben = $eff_appr (erwartet 0)"

    # Bootstrapping: Jeder Pflicht-Check muss auf main schon einmal gelaufen
    # sein, sonst blockiert er den ersten PR dauerhaft. Geprueft ueber die
    # Check-Historie des aktuellen main-Commits.
    MAIN_SHA="$(_gh ro "repos/$REPO/commits/main" --jq .sha 2>/dev/null || echo "")"
    if [[ -n "$MAIN_SHA" ]]; then
      echo "--- Pflicht-Checks auf main belegt (Bootstrapping) ---"
      SEEN="$(_gh ro "repos/$REPO/commits/$MAIN_SHA/check-runs" --jq '[.check_runs[].name]' 2>/dev/null || echo '[]')"
      while IFS= read -r c; do
        [[ -n "$c" ]] || continue
        if jq -e --arg c "$c" 'index($c)' <<<"$SEEN" >/dev/null 2>&1; then
          ok "Check '$c' ist auf main bereits gelaufen"
        else
          bad "Check '$c' ist auf main noch NIE gelaufen — als Pflicht blockiert er jeden PR (erst Workflow mergen, dann als Pflicht eintragen)"
        fi
      done < <(jq -r '.rules[] | select(.type=="required_status_checks")
                      | .parameters.required_status_checks[].context' <<<"$WANT")
    fi
  fi
  eff_has non_fast_forward \
    && ok "wirksam: Force-Push blockiert" || bad "wirksam: Force-Push NICHT blockiert (non_fast_forward fehlt)"
  eff_has deletion \
    && ok "wirksam: Loeschen blockiert" || bad "wirksam: Loeschen NICHT blockiert (deletion fehlt)"
  # Herkunft der Regeln: muss das Repository-Ruleset sein, keine Altregel.
  eff_src="$(jq -c '[.[] | select(.ruleset_source_type != null) | .ruleset_source_type] | unique' <<<"$EFFECTIVE")"
  [[ "$eff_src" == '["Repository"]' ]] \
    && ok "Regeln stammen aus einem Repository-Ruleset" \
    || printf 'HINWEIS    Regelquellen: %s (erwartet ["Repository"])\n' "$eff_src"
fi

# 7. Bypass — ausschließlich die Admin-Rolle, als Notfallausnahme.
#    Achtung: GitHub liefert das Feld "bypass_actors" nur an Aufrufer mit
#    Schreibrechten auf das Ruleset. Fehlt der Schlüssel ganz, ist das eine
#    Sichtbarkeitsgrenze des Tokens (z. B. GITHUB_TOKEN im CI), kein Fehler —
#    sonst würde der Wächter im CI fälschlich jeden PR blockieren.
#    Vorhanden, aber leer ([]), ist dagegen ein echter Mangel: kein Notausgang.
if ! jq -e 'has("bypass_actors")' <<<"$LIVE" >/dev/null; then
  printf 'HINWEIS    bypass_actors nicht sichtbar (Token ohne Schreibrechte) — Bypass-Pruefung uebersprungen\n'
else
  # Vergleich über normalisierte Strings ("Rolle:ID", sortiert): weder die
  # Feldreihenfolge der API-Antwort noch die Reihenfolge der Einträge darf
  # einen falschen Alarm auslösen.
  LIVE_BYPASS="$(jq -c '[.bypass_actors // [] | .[] | "\(.actor_type):\(.actor_id // 0)"] | sort' <<<"$LIVE")"
  EXPECTED_BYPASS='["RepositoryRole:5"]'
  if [[ "$LIVE_BYPASS" == "$EXPECTED_BYPASS" ]]; then
    ok "Bypass = ausschließlich Admin-Rolle (RepositoryRole 5, Notfallausnahme)"
  elif [[ "$LIVE_BYPASS" == "[]" ]]; then
    bad "Bypass ist leer — kein Notausgang, wenn ein Pflicht-Check nicht mehr anlaeuft"
  else
    bad "Bypass enthaelt fremde Akteure: $LIVE_BYPASS (nur RepositoryRole 5 erlaubt)"
  fi
fi

# 8. Repository-weite Merge-Verfahren (zweite Ebene neben dem Ruleset)
echo
echo "--- Repository-Einstellungen ---"
SETTINGS="$(_gh ro "repos/$REPO" --jq '{squash:.allow_squash_merge, merge:.allow_merge_commit, rebase:.allow_rebase_merge}')" \
  || die "Repository-Einstellungen nicht lesbar"
[[ "$(jq -r .squash <<<"$SETTINGS")" == "true"  ]] && ok "Squash Merge erlaubt" \
  || bad "Squash Merge deaktiviert — Mergen waere unmoeglich"
[[ "$(jq -r .merge  <<<"$SETTINGS")" == "false" ]] && ok "Merge Commit deaktiviert" \
  || bad "Merge Commit noch erlaubt (Repository-Einstellung)"
[[ "$(jq -r .rebase <<<"$SETTINGS")" == "false" ]] && ok "Rebase Merge deaktiviert" \
  || bad "Rebase Merge noch erlaubt (Repository-Einstellung)"

# 9. Drift-Wächter: Die Pflicht-Check-Namen müssen in ci.yml noch existieren.
#    Wird ein Job umbenannt, blockiert das Ruleset sonst jeden PR dauerhaft.
if [[ -z "$STUB_DIR" && -f "$REPO_ROOT/.github/workflows/ci.yml" ]]; then
  echo
  echo "--- Abgleich mit .github/workflows/ci.yml ---"
  while IFS= read -r ctx; do
    [[ -n "$ctx" ]] || continue
    if grep -qF "name: $ctx" "$REPO_ROOT/.github/workflows/ci.yml"; then
      ok "Job '$ctx' existiert in ci.yml"
    else
      bad "Job '$ctx' fehlt in ci.yml — Pflicht-Check wuerde nie erfuellt"
    fi
  done < <(jq -r '.rules[] | select(.type=="required_status_checks")
                  | .parameters.required_status_checks[].context' <<<"$WANT")
fi

echo
if [[ "$FAILED" -eq 0 ]]; then
  echo "Ergebnis: Soll-Zustand vollstaendig erreicht."
  exit 0
fi
echo "Ergebnis: Abweichungen vorhanden (siehe ABWEICHUNG-Zeilen)." >&2
exit 1
