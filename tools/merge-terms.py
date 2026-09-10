#!/usr/bin/env python3
"""Merge a batch of glossary terms into content/glossary.json.

Authoring 200 terms in one hand-edited JSON file is how you get a duplicate
alias at 3am and a term that silently never links. Batches are written as small
files and merged through here, which refuses the merge rather than writing a
file the content check would reject:

  * an alias already claimed by a different term — the auto-linker takes the
    first owner and the second term never appears in prose
  * a duplicate id, a missing field, an unknown kind
  * a `see` pointing at a term that does not exist

    python3 tools/merge-terms.py batch.json [batch2.json ...]
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
GLOSS = ROOT / "content/glossary.json"
FIELDS = ("id", "term", "kind", "gloss", "intermediate", "advanced", "source")

def main(paths):
    doc = json.loads(GLOSS.read_text(encoding="utf-8"))
    kinds = set(doc["kinds"])
    ids = {t["id"] for t in doc["terms"]}
    owner = {a.lower(): t["id"] for t in doc["terms"] for a in t["aliases"]}
    errors, added = [], 0

    incoming = []
    for p in paths:
        incoming += json.loads(pathlib.Path(p).read_text(encoding="utf-8"))

    for t in incoming:
        tid = t.get("id", "?")
        for f in FIELDS:
            if not t.get(f): errors.append(f"{tid}: missing {f}")
        if "see" not in t: errors.append(f"{tid}: no `see` key (use [])")
        if t.get("kind") not in kinds: errors.append(f"{tid}: kind {t.get('kind')!r} unknown")
        if tid in ids: errors.append(f"{tid}: duplicate id")
        if t.get("term") and t["term"] not in (t.get("aliases") or []):
            errors.append(f"{tid}: term not among its own aliases")
        for a in t.get("aliases") or []:
            k = a.lower()
            if k in owner and owner[k] != tid:
                errors.append(f"{tid}: alias {a!r} already claimed by {owner[k]}")
            owner[k] = tid
        ids.add(tid)

    known = ids
    for t in incoming:
        for ref in t.get("see") or []:
            if ref not in known: errors.append(f"{t.get('id')}: sees {ref!r}, which is not a term")

    if errors:
        for e in errors: print("  " + e, file=sys.stderr)
        print(f"merge-terms: {len(errors)} problem(s) — nothing written", file=sys.stderr)
        return 1

    doc["terms"] += incoming
    doc["terms"].sort(key=lambda t: t["term"].lower())
    GLOSS.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"merge-terms: +{len(incoming)} terms, {len(doc['terms'])} total, "
          f"{len(owner)} aliases")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
