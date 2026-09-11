#!/usr/bin/env python3
"""Every hard `rule` block should be landed in plain words next to it.

`rule` blocks are the one place in the corpus where the words *are* the law.
`tools/readability.py` excludes them from the grade it gates on, and correctly
so: rewording a rule changes what it asserts. But the exclusion is a carve-out
in the measurement, not an exemption for the reader. Measured over the corpus,
rule text sits at reading grade 11.7 against 6.5 for the prose around it — a
step of five grades inside a single lesson, and one that gets TALLER every time
the surrounding prose improves.

`docs/STYLE.md` has always prescribed the remedy — a `p` setting up the problem,
the untouched rule, then a `p` restating it plainly — and nothing enforced it.
This does.

Why the blended figure hides the problem: rule text is 8.6% of the words, so
folding it into a lesson's median moves that median by a few tenths of a grade.
Every lesson passes `check:prose` on its average while containing a paragraph
five grades above everything around it. The average is not what a reader reads.

**What counts as landing a rule.** The block immediately after it is prose — `p`,
`example` or `caution` — and that prose is itself inside the house band. Not a
marker phrase: "Put simply" appears on only a quarter of the restatements that
exist, and gating on the phrase would reward the phrase rather than the plain
sentence. Not a block two or three further down either, because a reader who has
already moved on to a table has already met the rule unhelped.

A rule followed by another rule, a table, a list or a checkpoint fails. That is
not a technicality: it is precisely the shape where a reader meets frozen
statutory language and the next thing asked of them is to *use* it.

    python3 tools/check-rules.py           # report
    python3 tools/check-rules.py --gate    # fail the chain
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from readability import measure  # noqa: E402  the same instrument check:prose uses

ROOT = Path(__file__).resolve().parent.parent

# The house band, from docs/STYLE.md. A restatement that is itself grade 11 has
# restated nothing.
GRADE_CEILING = 10.0
MEDIAN_SENTENCE = 16

LANDING_BLOCKS = {"p", "example", "caution"}

# Blocks with no `t` reach Blocks.jsx's `default` case and render as a
# paragraph, so they land a rule exactly as a `p` does.
def kind(block):
    return block.get("t") or "p"


def main(argv):
    gate = "--gate" in argv
    unlanded, weak, total = [], [], 0

    for path in sorted((ROOT / "content/lessons").glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        for lesson in doc.get("lessons", []):
            for sec in lesson.get("sections", []):
                body = sec.get("body") or []
                for i, block in enumerate(body):
                    if kind(block) != "rule":
                        continue
                    total += 1
                    nxt = body[i + 1] if i + 1 < len(body) else None
                    where = (lesson["id"], sec.get("h", "?"), (block.get("text") or "")[:54])
                    if nxt is None:
                        unlanded.append((*where, "nothing follows it"))
                        continue
                    if kind(nxt) not in LANDING_BLOCKS:
                        unlanded.append((*where, f"followed by a `{kind(nxt)}` block"))
                        continue
                    m = measure(nxt.get("text") or "")
                    if m is None:
                        unlanded.append((*where, "the block after it has no prose in it"))
                    elif m["grade"] > GRADE_CEILING or m["median_sentence"] > MEDIAN_SENTENCE:
                        weak.append((*where, f"restated at grade {m['grade']:.1f}, "
                                             f"median sentence {m['median_sentence']:.0f}"))

    bad = unlanded + weak
    print(f"{total} rule blocks; {total - len(bad)} landed in plain words "
          f"({100 * (total - len(bad)) / max(1, total):.0f}%)")
    if unlanded:
        print(f"\n{len(unlanded)} with no plain restatement after them:")
        for lid, h, text, why in unlanded:
            print(f"  {lid:34} {why}\n      § {h}\n      “{text}…”")
    if weak:
        print(f"\n{len(weak)} restated, but not plainly:")
        for lid, h, text, why in weak:
            print(f"  {lid:34} {why}\n      § {h}\n      “{text}…”")

    if not bad:
        print("check-rules: OK — every rule block is landed in plain words")
        return 0
    print(f"\ncheck-rules: {'FAILED' if gate else 'REPORT'} — "
          f"{len(bad)} rule blocks leave the reader to translate the statute themselves.")
    print("  Put a `p` block straight after the rule that says the same thing in "
          "ordinary words.\n  Do not touch the rule's own `text`. See docs/STYLE.md, "
          "'Rule blocks are frozen'.")
    return 1 if gate else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
