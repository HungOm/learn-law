#!/usr/bin/env python3
"""Catch a provision alias that means two different Acts in this corpus.

The glossary links prose by matching aliases, and an alias is just a string.
"section 6" is a perfectly good alias and a perfectly bad one: this app cites
section 6 of the Contracts Act (how a proposal comes to an end), section 6 of
the Civil Law Act (English land law shut out) and section 6 of the Penal Code
(definitions read subject to the exceptions). One term owns the string, so two
of those three sentences would open a popover confidently describing the wrong
Act. On a law site a wrong gloss is worse than no gloss, because it is
indistinguishable from a right one.

**How a citation is attributed.** Within each lesson section, in reading order,
the Act most recently named before a citation is taken to be its Act. Lessons
name an Act once and then say "that Act" or nothing, so nearest-in-either-
direction is wrong: an earlier version used a 160-character window and reported
five findings of which one was real, because it kept catching the Act being
discussed in the next sentence.

**What it does not catch.** Attribution needs an Act named earlier in the same
section. The case that prompted this — "Section 11" for the Contracts Act in one
lesson and for the Specific Relief Act in another, where the second says only
"section 11 of that Act" and names the Act a section earlier — is invisible to
it, and stayed invisible when the alias was added deliberately to check. So this
is a floor, not a proof: it makes a class of error harder to ship, and a bare
section number in a new lesson still deserves a human look.

REVIEWED lists aliases whose two Acts were checked by hand and found spurious.
Each entry says what was actually there, so the next person can re-check rather
than trust it.

    python3 tools/check-provisions.py
"""

import collections
import glob
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

ACTS = ("Federal Constitution|Penal Code|Criminal Procedure Code|National Land Code|Rules of Court|"
        "Evidence Act|Contracts Act|Companies Act|Civil Law Act|Specific Relief Act|Limitation Act|"
        "Interpretation Acts|Defamation Act|Sale of Goods Act|Road Transport Act|Employment Act|"
        "Industrial Relations Act|Government Proceedings Act|Local Government Act|"
        "Probate and Administration Act|Law Reform \\(Marriage and Divorce\\) Act|Financial Services Act")
ACT_RX = re.compile(ACTS, re.I)

# Articles are the Constitution's own numbering, so "Article 5" can only be one
# provision however many Acts are named around it. Only section, rule and order
# references can collide.
PROV = re.compile(r"(?i)^(?:ss?|sections?|rr?|rules?|orders?)\.?\s*\d")

REVIEWED = {
    "s 105": "Both uses are Evidence Act s 105 (burden of proving an exception). The "
             "Criminal Procedure Code is named earlier in l-bail-trial while discussing "
             "the same point.",
    "section 26": "All uses are Contracts Act s 26. The National Land Code is named "
                  "earlier in l-consideration for the registration limb of s 26(a).",
    "section 3(1)": "Both uses are Civil Law Act s 3(1). The Federal Constitution is "
                    "named earlier in l-sources, which walks the whole hierarchy.",
}


def norm(a):
    return re.sub(r"\s+", " ", a.strip()).lower()


def main():
    doc = json.loads((ROOT / "content/glossary.json").read_text(encoding="utf-8"))
    owner = {}
    for t in doc["terms"]:
        for a in t["aliases"]:
            owner[norm(a)] = t["id"]
    provs = sorted((a for a in owner if PROV.match(a)), key=lambda a: (-len(a), a))
    if not provs:
        print("check-provisions: no provision aliases to check")
        return 0
    cite_rx = re.compile(r"(^|[^A-Za-z0-9-])(" + "|".join(re.escape(a) for a in provs)
                         + r")(?![A-Za-z0-9-])", re.I)

    found = collections.defaultdict(set)
    for path in sorted((ROOT / "content/lessons").glob("*.json")):
        for lesson in json.loads(path.read_text(encoding="utf-8")).get("lessons", []):
            for sec in lesson.get("sections", []):
                txt = " ".join(" ".join(str(v) for v in b.values() if isinstance(v, str))
                               for b in (sec.get("body") or []))
                events = [(m.start(), 0, re.sub(r"\s+", " ", m.group(0)).title())
                          for m in ACT_RX.finditer(txt)]
                events += [(m.start(2), 1, norm(m.group(2))) for m in cite_rx.finditer(txt)]
                current = None
                for _, kind, val in sorted(events):
                    if kind == 0:
                        current = val
                    elif current:
                        found[(val, owner[val])].add(current)

    bad, stale = [], set(REVIEWED)
    for (alias, tid), acts in sorted(found.items()):
        if len(acts) < 2:
            continue
        stale.discard(alias)
        if alias in REVIEWED:
            continue
        bad.append((alias, tid, sorted(acts)))

    for alias, tid, acts in bad:
        print(f"  {alias!r} is claimed by {tid} but is cited under {', '.join(acts)}.")
        print(f"      Two of those readings would gloss the wrong Act. Either give the term "
              f"a name that does not occur in prose, so it stops auto-linking, or add it to "
              f"REVIEWED with what you found.")
    for alias in sorted(stale):
        print(f"  {alias!r} is in REVIEWED but is no longer ambiguous — remove the exemption.")

    total = len(bad) + len(stale)
    print(f"check-provisions: {len(found)} provision aliases with an Act in scope, "
          f"{len(REVIEWED) - len(stale)} reviewed, {total} to fix")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
