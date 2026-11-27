#!/usr/bin/env python3
"""Prüft protect-main.json gegen das offizielle GitHub-REST-Schema.

Beantwortet die Frage, die sich ohne Schreibrechte sonst nicht beantworten
lässt: "Würde GitHub diesen Payload überhaupt annehmen?" — geprüft gegen das
Schema, das GitHub selbst veröffentlicht, nicht gegen die Doku-Prosa.

Das Schema liegt neben dieser Datei (ruleset-schema.json) und stammt aus
github/rest-api-description, Commit d560905, Pfad
descriptions/api.github.com/api.github.com.2022-11-28.json. Es ist dort
extrahiert und dereferenziert (keine $refs), damit diese Prüfung vollständig
offline, deterministisch und ohne GitHub-Token läuft.

Aktualisieren (bei API-Änderungen):
    python3 .github/rulesets/schema-check.py --refresh
  benötigt gh + Netz und schreibt ruleset-schema.json neu.

Aufruf:
    python3 .github/rulesets/schema-check.py

Exit: 0 = Payload gültig und alle Negativ-Kontrollen greifen, 1 = Fehler,
      2 = Voraussetzung fehlt (jsonschema nicht installiert).
"""
from __future__ import annotations

import copy
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
PAYLOAD = HERE / "protect-main.json"
SCHEMA_FILE = HERE / "ruleset-schema.json"

# Nur für --refresh:
SCHEMA_SOURCE = {
    "repository": "github/rest-api-description",
    "commit": "d560905bbf50d79e40d6a006ce2e5834cfd86a31",
    "path": "descriptions/api.github.com/api.github.com.2022-11-28.json",
    "pointer": "#/paths/~1repos~1{owner}~1{repo}~1rulesets/post/requestBody/content/application~1json/schema",
}


def refresh() -> int:
    """Holt das Schema aus der offiziellen Quelle und schreibt es neu."""
    import base64
    import subprocess

    meta = json.loads(subprocess.check_output(
        ["gh", "api",
         f"repos/{SCHEMA_SOURCE['repository']}/contents/{SCHEMA_SOURCE['path']}"
         f"?ref={SCHEMA_SOURCE['commit']}",
         "--jq", "{sha: .sha, size: .size}"], text=True))
    blob = json.loads(subprocess.check_output(
        ["gh", "api", f"repos/{SCHEMA_SOURCE['repository']}/git/blobs/{meta['sha']}"],
        text=True))
    api = json.loads(base64.b64decode(blob["content"]))
    store = api["components"]["schemas"]

    def resolve(node):
        if isinstance(node, dict):
            ref = node.get("$ref")
            if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
                return resolve(copy.deepcopy(store[ref.split("/")[-1]]))
            return {k: resolve(v) for k, v in node.items()}
        if isinstance(node, list):
            return [resolve(v) for v in node]
        return node

    schema = resolve(copy.deepcopy(
        api["paths"]["/repos/{owner}/{repo}/rulesets"]["post"]
        ["requestBody"]["content"]["application/json"]["schema"]))
    out = {
        "$comment": ("Auszug aus github/rest-api-description: Request-Schema fuer "
                     "POST /repos/{owner}/{repo}/rulesets. Automatisch erzeugt, "
                     "nicht von Hand bearbeiten."),
        "x-source": dict(SCHEMA_SOURCE, repository_blob=meta["sha"]),
        "schema": schema,
    }
    SCHEMA_FILE.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"Schema neu geschrieben: {SCHEMA_FILE.name} (blob {meta['sha'][:12]})")
    return 0


def main() -> int:
    if "--refresh" in sys.argv:
        return refresh()

    if not SCHEMA_FILE.exists():
        print(f"FEHLER  {SCHEMA_FILE.name} fehlt — mit --refresh erzeugen")
        return 2
    try:
        import jsonschema
    except ImportError:
        print("FEHLER  jsonschema fehlt (pip install jsonschema)")
        return 2

    doc = json.loads(SCHEMA_FILE.read_text())
    schema = doc["schema"]
    src = doc.get("x-source", {})
    print(f"Schema: {src.get('repository')} @ {str(src.get('commit'))[:12]} "
          f"— POST /repos/{{owner}}/{{repo}}/rulesets")

    payload = json.loads(PAYLOAD.read_text())
    validator = jsonschema.Draft4Validator(schema)

    errors = sorted(validator.iter_errors(payload), key=lambda e: list(e.path))
    if errors:
        for e in errors:
            print(f"FEHLER  {list(e.path)}: {e.message}")
        print("Ergebnis: Payload würde von GitHub abgelehnt.")
        return 1
    print("OK      Payload entspricht dem offiziellen Schema "
          "(POST /repos/{owner}/{repo}/rulesets)")

    # Negativ-Kontrollen: ein Prüfer, der nichts ablehnt, beweist nichts.
    negatives = {
        "actor_type falsch geschrieben": lambda p: p["bypass_actors"][0].update(
            actor_type="repository_role"),
        "bypass_mode ungültig": lambda p: p["bypass_actors"][0].update(
            bypass_mode="sometimes"),
        "enforcement ungültig": lambda p: p.update(enforcement="enabled"),
        "target ungültig": lambda p: p.update(target="branches"),
        "Rule-Typ erfunden": lambda p: p["rules"].append({"type": "require_reviews"}),
        "Merge-Methode ungültig": lambda p: p["rules"][0]["parameters"].update(
            allowed_merge_methods=["squash", "fast-forward"]),
        "Approvals als String": lambda p: p["rules"][0]["parameters"].update(
            required_approving_review_count="0"),
        "name fehlt": lambda p: p.pop("name"),
        "integration_id als String": lambda p: (
            p["rules"][1]["parameters"]["required_status_checks"][0]
            .update(integration_id="15368")),
    }
    failed = 0
    for label, mutate in negatives.items():
        probe = copy.deepcopy(payload)
        mutate(probe)
        if list(validator.iter_errors(probe)):
            print(f"OK      erkannt: {label}")
        else:
            print(f"FEHLER  NICHT erkannt: {label} — der Prüfer greift nicht")
            failed += 1

    if failed:
        return 1
    print(f"Ergebnis: Payload gültig, {len(negatives)}/{len(negatives)} "
          f"Negativ-Kontrollen greifen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
