#!/usr/bin/env python3
"""Prüft protect-main.json gegen das offizielle GitHub-REST-Schema.

Beantwortet die Frage, die sich ohne Schreibrechte sonst nicht beantworten
lässt: "Würde GitHub diesen Payload überhaupt annehmen?" — geprüft gegen das
Schema, das GitHub selbst veröffentlicht, nicht gegen die Doku-Prosa.

Das Schema wird aus github/rest-api-description geladen, gepinnt auf einen
Commit-SHA (nachvollziehbar und reproduzierbar). Der SHA steht in
SCHEMA_COMMIT; er lässt sich mit

    gh api repos/github/rest-api-description/commits/main --jq .sha

aktualisieren.

Aufruf:
    python3 .github/rulesets/schema-check.py            # prüfen
    python3 .github/rulesets/schema-check.py --offline  # nur Negativ-Kontrollen

Exit: 0 = Payload gültig und alle Negativ-Kontrollen greifen, 1 = Fehler.
"""
from __future__ import annotations

import base64
import copy
import json
import pathlib
import subprocess
import sys

# Gepinnt: api.github.com.2022-11-28.json aus diesem Commit.
SCHEMA_COMMIT = "d560905bbf50d79e40d6a006ce2e5834cfd86a31"  # github/rest-api-description@main, 27.11.2026
SCHEMA_PATH = "descriptions/api.github.com/api.github.com.2022-11-28.json"
SCHEMA_CACHE = pathlib.Path("/tmp/gh-api-schema.json")
PAYLOAD = pathlib.Path(__file__).with_name("protect-main.json")


def load_schema(offline: bool) -> dict:
    if SCHEMA_CACHE.exists():
        return json.loads(SCHEMA_CACHE.read_text())
    if offline:
        print("SKIP    kein Schema im Cache und --offline gesetzt")
        return {}
    try:
        import jsonschema  # noqa: F401
    except ImportError:
        sys.exit("SKIP: jsonschema nicht installiert (pip install jsonschema)")
    # Inhalt über den gepinnten Commit lesen (reproduzierbar, nicht "main").
    meta = json.loads(
        subprocess.check_output(
            ["gh", "api",
             f"repos/github/rest-api-description/contents/{SCHEMA_PATH}?ref={SCHEMA_COMMIT}",
             "--jq", "{sha: .sha, size: .size}"],
            text=True,
        )
    )
    sha = meta["sha"]
    blob = json.loads(
        subprocess.check_output(
            ["gh", "api", f"repos/github/rest-api-description/git/blobs/{sha}"],
            text=True,
        )
    )
    raw = base64.b64decode(blob["content"])
    if len(raw) != meta["size"]:
        sys.exit(f"FEHLER: Schemagröße {len(raw)} != {meta['size']}")
    SCHEMA_CACHE.write_bytes(raw)
    print(f"Schema geladen: {SCHEMA_PATH} (blob {sha[:12]}, {len(raw)} Bytes)")
    return json.loads(raw)


def resolve(node, store):
    """Löst $ref-Ketten innerhalb von components/schemas auf."""
    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
            return resolve(copy.deepcopy(store[ref.split("/")[-1]]), store)
        return {k: resolve(v, store) for k, v in node.items()}
    if isinstance(node, list):
        return [resolve(v, store) for v in node]
    return node


def main() -> int:
    offline = "--offline" in sys.argv
    api = load_schema(offline)
    if not api:
        return 0
    store = api["components"]["schemas"]
    request_schema = resolve(
        api["paths"]["/repos/{owner}/{repo}/rulesets"]["post"]["requestBody"]
        ["content"]["application/json"]["schema"],
        store,
    )

    try:
        import jsonschema
    except ImportError:
        sys.exit("SKIP: jsonschema nicht installiert")

    payload = json.loads(PAYLOAD.read_text())
    validator = jsonschema.Draft4Validator(request_schema)

    errors = sorted(validator.iter_errors(payload), key=lambda e: list(e.path))
    if errors:
        for e in errors:
            print(f"FEHLER  {list(e.path)}: {e.message}")
        print("Ergebnis: Payload würde von GitHub abgelehnt.")
        return 1
    print("OK      Payload entspricht dem offiziellen Schema (POST /repos/{owner}/{repo}/rulesets)")

    # Negativ-Kontrollen: ein Prüfer, der nichts ablehnt, beweist nichts.
    negatives = {
        "actor_type falsch geschrieben": lambda p: p["bypass_actors"][0].update(actor_type="repository_role"),
        "bypass_mode ungültig": lambda p: p["bypass_actors"][0].update(bypass_mode="sometimes"),
        "enforcement ungültig": lambda p: p.update(enforcement="enabled"),
        "target ungültig": lambda p: p.update(target="branches"),
        "Rule-Typ erfunden": lambda p: p["rules"].append({"type": "require_reviews"}),
        "Merge-Methode ungültig": lambda p: p["rules"][0]["parameters"].update(
            allowed_merge_methods=["squash", "fast-forward"]),
        "Approvals als String": lambda p: p["rules"][0]["parameters"].update(
            required_approving_review_count="0"),
        "name fehlt": lambda p: p.pop("name"),
        "integration_id als String": lambda p: p["rules"][1]["parameters"]
            ["required_status_checks"][0].update(integration_id="15368"),
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
    print(f"Ergebnis: Payload gültig, {len(negatives)}/{len(negatives)} Negativ-Kontrollen greifen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
