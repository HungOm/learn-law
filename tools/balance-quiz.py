#!/usr/bin/env python3
"""Move each quiz answer to a deterministic position.

Every one of the 286 quiz questions had its correct answer as the first option.
A learner who notices can score full marks without reading the question, which
costs them the retrieval practice the quiz exists to provide — and retrieval is
the part that actually builds memory.

The fix has to be *stable*, so the target position is derived from the question
ids rather than from chance: running this twice changes nothing, and distractors
keep their relative order because an author may have arranged them deliberately.

**Why ranking and not `hash % 4`.** The first version of this tool took the
target as `sha256(id) % 4`. That is unbiased in expectation and badly lumpy at
n=286: it produced 54/85/90/57, chi-square 14.56 on 3 df, p=0.0022 — WORSE than
the 88/74/76/48 (chi-square 11.90, p=0.0077) it was run on. A tool that makes
the defect it exists to fix measurably worse is not a small bug.

Ranking the ids by hash and taking `rank % k` lands 71 or 72 in every position
(chi-square 0.01). The cost is that adding a question can move other questions'
positions, where `hash % 4` moved none. That cost is acceptable here and it is
worth saying why: `prepare()` in src/lib/quiz.js shuffles options unseeded at
render, so the on-disk position is never what a learner sees. Balancing it is
defence in depth for any future surface that skips `prepare()` — a print view,
an offline pack, an export — and data hygiene. It is not a live learner-facing
property, so churn in it costs nothing.

    python3 tools/balance-quiz.py            # rewrite every lesson file
    python3 tools/balance-quiz.py --check    # report only, change nothing
    python3 tools/balance-quiz.py f.json     # one file
"""

import collections
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def target_map(questions):
    """Assign every question a target position by rank, not by modulo.

    Ranking by hash is deterministic — the same corpus always produces the same
    assignment — while spreading positions evenly instead of leaving it to the
    lumpiness of a hash at this sample size.
    """
    ranked = sorted(questions, key=lambda q: hashlib.sha256(
        q["id"].encode("utf-8")).hexdigest())
    out = {}
    for rank, q in enumerate(ranked):
        out[q["id"]] = rank % len(q["options"])
    return out


def rebalance(question, target):
    """Return True if the question moved."""
    options = question["options"]
    answer = question["answer"]
    correct = options[answer]
    if answer == target:
        return False
    rest = [o for i, o in enumerate(options) if i != answer]
    question["options"] = rest[:target] + [correct] + rest[target:]
    question["answer"] = target
    assert question["options"][target] == correct
    return True


def main(argv):
    check_only = "--check" in argv
    names = [a for a in argv[1:] if not a.startswith("--")]

    # Targets are assigned over the WHOLE corpus, so a single-file run still
    # lands each question where a full run would put it.
    docs = {}
    every = []
    for path in sorted((ROOT / "content/lessons").glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        docs[path] = doc
        for lesson in doc.get("lessons", []):
            every.extend(lesson.get("quiz") or [])
    targets = target_map(every)

    moved = 0
    before, after = collections.Counter(), collections.Counter()
    for path, doc in docs.items():
        if names and path.name not in names:
            continue
        touched = False
        for lesson in doc.get("lessons", []):
            for q in lesson.get("quiz") or []:
                before[q["answer"]] += 1
                if rebalance(q, targets[q["id"]]):
                    moved += 1
                    touched = True
                after[q["answer"]] += 1
        if touched and not check_only:
            path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n",
                            encoding="utf-8")

    total = sum(after.values())
    if not total:
        print("no questions matched")
        return 1
    fmt = lambda c: "  ".join(f"[{i}] {100 * c[i] / total:5.1f}%" for i in sorted(c))
    print(f"{total} questions")
    print(f"  before  {fmt(before)}")
    print(f"  after   {fmt(after)}")
    print(f"  {moved} moved" + (" (nothing written: --check)" if check_only else ""))
    # chi-square on 3 df, so the report says whether the spread is actually flat
    # rather than merely looking flat.
    expected = total / len(after) if after else 0
    chi2 = sum((c - expected) ** 2 / expected for c in after.values()) if expected else 0
    print(f"  chi-square {chi2:.2f} on {len(after) - 1} df")
    if check_only and moved:
        print(f"\nFAIL: {moved} question{'' if moved == 1 else 's'} off target. "
              f"Run: python3 tools/balance-quiz.py")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
