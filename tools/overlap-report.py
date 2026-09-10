#!/usr/bin/env python3
"""Rank the lesson pairs most likely to teach the same subject. NOT a gate.

`check-content.py` enforces unique lesson **ids**. It says nothing about unique
**subjects**, and those are different properties: a second nuisance lesson
called `l-nuisance-depth` passes every gate in this repo, renders perfectly, and
leaves a reader wondering which of two lessons on one topic they were meant to
read. Nobody writes that on purpose — it happens when several authors, or
several agents in one round, extend a module without being able to see each
other's drafts.

**This is a report, not a check, and that was a measurement result rather than a
design preference.** The first version was a gate with a threshold. It was
tested three ways:

  * *An exact duplicate* of an existing lesson under a new id: detected easily.
    That control was worthless. Nobody produces a byte-identical lesson; the
    real failure is a REWORDED lesson on a covered subject.
  * *A realistic reworded duplicate* — a nuisance lesson titled "Unreasonable
    interference with the enjoyment of land", sharing no title word with
    `l-nuisance`: **missed**. It scored 30% word containment where the highest
    legitimate same-module pair in the corpus scored 40%. A threshold cannot
    separate those; they are the wrong way round.
  * *Weighting by rarity* — counting only words appearing in at most two lessons
    corpus-wide — put the duplicate above the legitimate pairs at last: 8 shared
    rare words against a worst legitimate 6, and 40% against 29% by containment.

A margin of two words, established on one synthetic example, is not enough to
refuse anybody's content. A gate that fires on a legitimate pair is a gate
someone switches off, and then it catches nothing at all. So this ranks and
explains, a human decides, and it always exits 0.

The ranking is real and useful even though the threshold is not: in the corpus
as it stands, the true duplicate sorts above every legitimate pair. Run it after
merging a batch and read the top few rows.

    python3 tools/overlap-report.py
    python3 tools/overlap-report.py --top 15
    python3 tools/overlap-report.py --self-test   # prove the ranking can fire
"""

import collections
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LESSONS = ROOT / "content/lessons"

# A word in at most this many lessons is "distinctive". Measured: at 2 the true
# duplicate ranks above every legitimate pair; at 3 or more it does not.
RARE_DF = 2
MIN_SIGNATURE = 6
DEFAULT_TOP = 8

STOP = set("""a an the and or but if then than that this these those of in on at to for from by with
without into onto over under is are was were be been being it its as not no nor so such can could may
might must shall should will would do does did done have has had you your they them their he she who
whom whose what when where which why how one two three first second more most less least other another
about after before between during through against because while both each few many some any all every
own same only just also even still yet very much rather quite here there now new law legal lesson
module reader answer question case court malaysia malaysian section provision act rule rules""".split())


def signature(lesson):
    """Distinctive words from where an author states what a lesson is about.

    Title, summary, section headings and keypoints only. Body prose is excluded
    deliberately: two lessons that both mention a case are not duplicates, and
    including bodies makes every lesson in a module resemble every other.
    """
    parts = [lesson.get("title") or "", lesson.get("summary") or ""]
    for sec in lesson.get("sections") or []:
        parts.append(sec.get("h") or "")
        parts.append(sec.get("keypoint") or "")
    words = re.findall(r"[a-z]{3,}", " ".join(parts).lower())
    return {w for w in words if w not in STOP}


def load():
    out = []
    for path in sorted(LESSONS.glob("*.json")):
        for l in json.loads(path.read_text()).get("lessons") or []:
            out.append(l)
    return out


def rank(lessons):
    sigs = {l["id"]: (l.get("moduleId"), signature(l)) for l in lessons}
    df = collections.Counter()
    for _, s in sigs.values():
        for w in s:
            df[w] += 1
    rare = {i: {w for w in s if df[w] <= RARE_DF} for i, (_, s) in sigs.items()}

    rows, ids = [], list(sigs)
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a, b = ids[i], ids[j]
            if sigs[a][0] != sigs[b][0]:
                continue
            sa, sb = sigs[a][1], sigs[b][1]
            if len(sa) < MIN_SIGNATURE or len(sb) < MIN_SIGNATURE:
                continue
            shared = rare[a] & rare[b]
            if not shared:
                continue
            denom = min(len(rare[a]), len(rare[b])) or 1
            rows.append((len(shared), len(shared) / denom, sigs[a][0], a, b, sorted(shared)))
    rows.sort(reverse=True)
    return rows


def main(argv):
    top = DEFAULT_TOP
    if "--top" in argv:
        top = int(argv[argv.index("--top") + 1])

    lessons = load()
    if not lessons:
        print("overlap-report: no lessons found")
        return 0

    if "--self-test" in argv:
        # A reworded duplicate, not a copy — the only control worth running.
        lessons = lessons + [{
            "id": "l-SELFTEST-duplicate", "moduleId": "m07-tort",
            "title": "Unreasonable interference with the enjoyment of land",
            "summary": "When a neighbour's activity crosses from irritating into "
                       "actionable, and what a court will order about it.",
            "sections": [
                {"h": "The interference standard", "keypoint": "Not every annoyance is "
                 "actionable; the interference must be unreasonable in the circumstances."},
                {"h": "Locality and duration", "keypoint": "What is normal for the area, "
                 "and how long the interference lasted, both bear on reasonableness."},
                {"h": "Who may sue", "keypoint": "A claimant needs an interest in the land "
                 "affected, which excludes some people who are genuinely inconvenienced."},
                {"h": "Injunction or damages", "keypoint": "Damages address the past; an "
                 "injunction changes the position and is discretionary."}]}]

    rows = rank(lessons)
    print(f"{len(lessons)} lessons, most-similar pairs within a module "
          f"(distinctive = word in <= {RARE_DF} lessons):\n")
    print(f"  {'shared':>6} {'ratio':>6}  pair")
    for n, ratio, module, a, b, shared in rows[:top]:
        print(f"  {n:>6} {ratio:>5.0%}  {module}: {a} / {b}")
        print(f"                 {', '.join(shared[:10])}")

    if "--self-test" in argv:
        pos = next((k for k, r in enumerate(rows) if "l-SELFTEST-duplicate" in (r[3], r[4])), None)
        ok = pos == 0
        print(f"\nself-test: reworded duplicate ranked "
              f"{'#1 — DETECTED' if ok else f'#{pos + 1 if pos is not None else '?'} — NOT TOP'}")
        return 0 if ok else 1

    print(f"\noverlap-report: {len(rows)} pairs share a distinctive word. "
          f"This is a report, not a gate — read the top rows and judge. Always exits 0.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
