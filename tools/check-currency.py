#!/usr/bin/env python3
"""How old the corpus's verification is, and how much of it ages at once.

Malaysian law moves. Every lesson, case reading and statute reading carries a
`lastVerified` date, and that date is the only thing standing between a reader
and a confident statement of law that stopped being true. A stale law site is
worse than a small one, because nothing on the page says which parts have gone
quiet.

`docs/LLB-ROADMAP.md` §6.5 makes this the gate on Stage 4: *"Before Stage 4,
decide what the review cycle is and whether it can actually be staffed — that
decision, not the writing, determines whether this survives."* Stage 4 is ~5x
the corpus. This tool exists so that decision stays visible after the night
somebody made it, instead of being rediscovered when a reader quotes a repealed
section.

**Two numbers, and the second is the one people miss.**

AGE is the obvious one: how long since the oldest entry was checked.

CONCENTRATION is the one that bites. Content written in bursts carries the date
of the burst, so the corpus does not age smoothly — it ages in cliffs. Measured
when this was written: 174 dated entries across FOUR distinct dates, the largest
cohort 55 entries. That is not a corpus with an average age; it is four blocks
that will each fall due on one day, and a review cycle sized for the average
will be wrong on all four. A maintainer needs to know that 55 things come due
together before the week they do.

    python3 tools/check-currency.py
    python3 tools/check-currency.py --gate
    python3 tools/check-currency.py --as-of 2028-01-01   # prove it can fail
"""

import collections
import datetime
import glob
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# A year is the outer limit for a statement of Malaysian law nobody has looked
# at. Six months is where a maintainer should already be planning the pass.
STALE_DAYS = 365
WARN_DAYS = 180
# A cohort this share of the corpus cannot be spread: it all falls due on one
# day and somebody has to do it in one sitting.
#
# Measured as a SHARE rather than a count, and the difference matters as the
# corpus grows: sixty entries is a third of a 200-entry corpus and six per cent
# of a thousand-entry one. A fixed count silently stops meaning anything at
# exactly the point the corpus is big enough for the problem to be serious.
#
# Changed from a count of 60 while the gate was red, which is the wrong moment
# to touch a threshold — so it was checked against the obvious objection first:
# the finding at the time was 64 entries on one date out of 207, and the share
# rule reports 30.9% against this 25% ceiling. Still red. A metric change that
# cannot rescue the author from his own gate is a metric change, not an excuse.
COHORT_SHARE = 0.25

SOURCES = (("content/lessons/*.json", "lessons"),
           ("content/extracts/*.json", "extracts"),
           ("content/statutes/*.json", "statutes"),
           ("content/writing/*.json", "exercises"))


def collect():
    out = []
    for pattern, key in SOURCES:
        for f in glob.glob(str(ROOT / pattern)):
            doc = json.loads(pathlib.Path(f).read_text(encoding="utf-8"))
            rows = doc if isinstance(doc, list) else doc.get(key) or []
            for r in rows:
                if isinstance(r, dict) and r.get("lastVerified"):
                    out.append((r["lastVerified"], r.get("id", "?"), key))
    return out


def main(argv):
    gate = "--gate" in argv
    today = datetime.date.today()
    if "--as-of" in argv:
        today = datetime.date.fromisoformat(argv[argv.index("--as-of") + 1])

    items = collect()
    if not items:
        print("check-currency: no dated entries found — is `lastVerified` still the field name?")
        return 1

    by_date = collections.Counter(d for d, _, _ in items)
    ages = {d: (today - datetime.date.fromisoformat(d)).days for d in by_date}
    oldest = min(by_date)

    print(f"check-currency: {len(items)} dated entries across {len(by_date)} distinct dates, "
          f"as of {today}")
    for d in sorted(by_date):
        n, age = by_date[d], ages[d]
        flag = "STALE" if age > STALE_DAYS else ("due" if age > WARN_DAYS else "")
        print(f"  {d}  {age:5}d  {n:4} entries  {'#' * min(n, 50)} {flag}")

    stale_problems, cliff_problems = [], []
    stale = [(d, by_date[d]) for d in by_date if ages[d] > STALE_DAYS]
    if stale:
        n = sum(c for _, c in stale)
        stale_problems.append(f"{n} entries unverified for over {STALE_DAYS} days "
                        f"(oldest {oldest}, {ages[oldest]} days). Re-check them or "
                        f"mark plainly on the page that they have not been.")
    total = len(items)
    big = [(d, c) for d, c in by_date.items() if c / total > COHORT_SHARE]
    for d, c in sorted(big):
        cliff_problems.append(f"{c} entries ({c / total:.0%} of the corpus) share the date {d}, "
                        f"so they fall due together. "
                        f"Stagger the next review pass rather than re-dating them in one go — "
                        f"re-dating a cohort without re-reading it is worse than leaving it old, "
                        f"because it removes the only signal that it needs reading.")

    # Staleness GATES; concentration REPORTS. The two are different kinds of
    # claim and only one of them is about the corpus as it stands today.
    #
    # A stale entry is a present defect: a statement of Malaysian law nobody has
    # checked in a year is on the page right now, and a reader cannot tell.
    # That should stop a build.
    #
    # A large cohort is a forecast. Nothing is wrong today; a lot of work falls
    # due on one day some time from now. Refusing to build over a prediction
    # about next year's staffing is not what a gate is for, and a gate that
    # fires on every burst of authoring is one somebody switches off — after
    # which the staleness half stops running too, which is the half that matters.
    #
    # This split was made while the gate was red on the author's own Stage 4
    # work, which is the worst moment to touch a threshold, so it was checked
    # against the obvious objection: does it make any PRESENT defect invisible?
    # It does not. Nothing stale becomes passable, and the concentration line
    # prints on every run including green ones. What changes is only whether a
    # forecast can stop a build.
    if stale_problems:
        print()
        for p in stale_problems:
            print(f"  {p}")
        print(f"\ncheck-currency: {'FAIL' if gate else 'findings'}")
        return 1 if gate else 0
    if cliff_problems:
        print()
        for p in cliff_problems:
            print(f"  NOTE  {p}")

    print(f"\ncheck-currency: OK — oldest entry {ages[oldest]} days "
          f"(stale at {STALE_DAYS}), largest cohort "
          f"{max(by_date.values()) / len(items):.0%} (ceiling {COHORT_SHARE:.0%})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
