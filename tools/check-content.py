#!/usr/bin/env python3
"""Check the content JSON before it reaches the browser.

The app has no build step, so nothing stands between a hand-edited JSON file and
the page. These are the errors that would otherwise be silent:

  * a reused card id, which the README warns about because review history is
    keyed to it — the new card inherits the old card's schedule;
  * a rubric whose marks do not sum to the problem's stated total, so the
    marking screen shows a score out of a denominator nobody can reach;
  * a card or problem pointing at a module that does not exist, which drops it
    out of every list without an error;
  * a problem with no `verify` line, which is the app asserting an authority it
    has not earned.

Run it after editing anything under content/:

    python3 tools/check-content.py
"""

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BANDS = {"issue", "rule", "application", "method", "conclusion"}
PROBLEM_FIELDS = ["id", "moduleId", "title", "kind", "minutes", "marks", "scenario",
                  "task", "rubric", "modelAnswer", "source", "lastVerified", "verify"]
CARD_FIELDS = ["id", "moduleId", "type", "front", "back", "source"]


def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def main():
    errors = []
    books = load("content/books.json")
    modules = {m["id"] for m in books["modules"]}

    seen = {}
    cards = 0
    for path in sorted((ROOT / "content/cards").glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        types = set(doc.get("cardTypes", {}))
        for c in doc.get("cards", []):
            cards += 1
            where = f"{path.name}:{c.get('id', '?')}"
            for f in CARD_FIELDS:
                if not c.get(f):
                    errors.append(f"{where}: missing {f}")
            if c["id"] in seen:
                errors.append(f"{where}: id already used in {seen[c['id']]} — "
                              f"review history is keyed to it")
            seen[c["id"]] = path.name
            if c.get("moduleId") not in modules:
                errors.append(f"{where}: unknown module {c.get('moduleId')}")
            if types and c.get("type") not in types:
                errors.append(f"{where}: type {c.get('type')!r} is not in cardTypes")

    problems = 0
    for path in sorted((ROOT / "content/problems").glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        for p in doc.get("problems", []):
            problems += 1
            where = f"{path.name}:{p.get('id', '?')}"
            for f in PROBLEM_FIELDS:
                if not p.get(f):
                    errors.append(f"{where}: missing {f}")
            if p["id"] in seen:
                errors.append(f"{where}: id already used in {seen[p['id']]}")
            seen[p["id"]] = path.name
            if p.get("moduleId") not in modules:
                errors.append(f"{where}: unknown module {p.get('moduleId')}")

            rubric = p.get("rubric") or []
            total = sum(r.get("marks", 0) for r in rubric)
            if total != p.get("marks"):
                errors.append(f"{where}: rubric sums to {total}, `marks` says {p.get('marks')}")
            rids = [r.get("id") for r in rubric]
            if len(set(rids)) != len(rids):
                errors.append(f"{where}: duplicate rubric ids")
            for r in rubric:
                if r.get("band") not in BANDS:
                    errors.append(f"{where}/{r.get('id')}: band {r.get('band')!r} "
                                  f"is not one of {sorted(BANDS)}")
                for f in ("criterion", "authority", "marks"):
                    if not r.get(f):
                        errors.append(f"{where}/{r.get('id')}: missing {f}")
            for b in p.get("modelAnswer") or []:
                if not b.get("h") or not b.get("p"):
                    errors.append(f"{where}: a model answer block is missing `h` or `p`")

    for m in books["modules"]:
        for ref in m.get("primary", []) + m.get("reference", []):
            if ref not in {b["id"] for b in books["books"]}:
                errors.append(f"books.json:{m['id']}: unknown book {ref}")
        for ref in m.get("statutes", []):
            if ref not in {s["id"] for s in books["statutes"]}:
                errors.append(f"books.json:{m['id']}: unknown statute {ref}")

    print(f"{cards} cards, {problems} problems, {len(modules)} modules")
    if errors:
        print(f"\n{len(errors)} problem{'' if len(errors) == 1 else 's'}:")
        for e in errors:
            print(f"  {e}")
        return 1
    print("content is consistent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
