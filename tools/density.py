#!/usr/bin/env python3
"""How much of a lesson's rendered page is a tinted block rather than prose.

Tinted blocks — rule, example, caution, predict, checkpoint — mark structure,
and that only works while they are the exception. Once they are most of the
page the fills stop marking anything and become the background, and the plain
paragraphs start reading as the exceptional thing. The signal inverts.

Two things this measures carefully, because getting either wrong sends writers
to fix the wrong lesson:

**It measures height, not block count.** The failure is visual — what share of
the scroll is tinted — and marked blocks are systematically longer than plain
ones. Counting blocks understates by up to 14 percentage points: on the corpus
at the time of writing, `pe-l-evidence-proof` was 46% of blocks but 62% of the
page. A count-based ceiling passes lessons that are already inverted.

**It keeps tinted and figure apart.** A table, chart or diagram is framed, not
tinted; it reads as an object rather than as differently-coloured prose, and a
lesson carries several without the inversion happening. `l-federalism` is 58% of
its height in marked blocks but only 37% tinted — the rest is diagrams, and it
reads fine. Merging the two would send someone to strip figures out of a lesson
that has no problem.

**The denominator is the whole page, section headings included.** A heading is
~115px of plain, unmissable visual break with a number badge beside it, and a
reader scrolls past it like anything else. Leaving headings out overstated the
tinted share by 5-14 points and made four lessons look like failures when the
page a reader actually sees was under the ceiling. Headings are 22% of the page
height on a seven-section lesson, so this is not a rounding detail.

The model is calibrated against real rendered heights measured off the DOM in
Chrome at 900px. Against the whole-page denominator it lands within 2 percentage
points on lessons spanning 31%-48%. Measuring at 390px instead moves the tinted
share by -1.3 points on average, so the model is width-independent in practice
and the phone does not need its own constants.

    python3 tools/density.py           # every lesson, densest first
    python3 tools/density.py --gate    # exit 1 if any lesson is over
"""

import json
import math
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

TINTED = {"rule", "example", "caution", "predict", "checkpoint"}
FIGURE = {"table", "chart", "diagram", "steps", "compare", "figure"}

# Calibrated against measured DOM heights — see the module docstring.
WORDS_PER_LINE = 13
LINE_PX = 32
TINTED_CHROME_PX = 50   # a tinted block's own padding and margin
FIGURE_BASE_PX = 260    # the drawn area of a figure, before its caption
SECTION_HEAD_PX = 115   # a section heading: number badge, h3, and its margins

# Set on different principles, deliberately.
#
# TINTED_CEILING is where the inversion happens rather than where the corpus
# happens to sit: past half the page, the marked material IS the page and the
# prose is the exception. Six of 55 lessons were already over it when this was
# written. That is the tool reporting a real pre-existing problem, not the
# ceiling being wrong — and the fix for each is fewer tinted blocks, never
# fainter tints. The tints are already at the bottom of what registers.
TINTED_CEILING = 50
# FIGURE_CEILING is a tripwire, not a correction. No lesson exceeds 26% and the
# median is 0%, so nothing here is failing; this only catches a future lesson
# that turns into a slideshow.
FIGURE_CEILING = 35
# The local form of the same failure: a stretch with no plain prose to come up
# for air in. Counted over tinted blocks only, for the reason above, and reset at
# each section boundary — a heading breaks a run for the reader as surely as a
# paragraph does, and treating the lesson as one flat list reported runs that
# spanned three sections and did not exist on the page.
MAX_RUN = 5

# A lesson may carry `densityExempt: "<reason>"` and be reported EXEMPT rather
# than failing. This is for the case where the measure is right in general and
# wrong about one lesson — a glossary-shaped lesson whose content genuinely IS a
# run of definitions, where the alternation is the structure rather than a
# failure of it. The reason is stored in the content file so it is reviewable in
# a diff, and the number is still printed so it never becomes invisible. It is
# not a tool for writers to reach for: adding one is an editorial decision about
# what a lesson is, not a way past a gate.


def words(b):
    n = 0
    for k in ("text", "prompt", "reveal", "q", "why", "title", "caption", "note", "alt"):
        v = b.get(k)
        if isinstance(v, str):
            n += len(v.split())
    for it in b.get("items") or []:
        if isinstance(it, str):
            n += len(it.split())
        elif isinstance(it, dict):
            n += len((it.get("h", "") + " " + it.get("text", "")).split())
    for o in b.get("options") or []:
        if isinstance(o, str):
            n += len(o.split())
    return n


def measure(lesson):
    sections = lesson.get("sections") or []
    blocks = [b for s in sections for b in s.get("body") or []]
    if not blocks:
        return None
    tinted = figure = 0.0
    total = len(sections) * SECTION_HEAD_PX
    best = 0
    for sec in sections:
        run = 0  # a heading breaks the run
        for b in sec.get("body") or []:
            t = b.get("t")
            lines = max(1, math.ceil(words(b) / WORDS_PER_LINE))
            if t in FIGURE:
                h = FIGURE_BASE_PX + lines * LINE_PX
                figure += h
                run = 0
            else:
                h = lines * LINE_PX
                if t in TINTED:
                    h += TINTED_CHROME_PX
                    tinted += h
                    run += 1
                    best = max(best, run)
                else:
                    run = 0
            total += h
    return {
        "tinted": round(100 * tinted / total),
        "figure": round(100 * figure / total),
        "run": best,
        "n": len(blocks),
    }


def main(argv):
    gate = "--gate" in argv
    rows = []
    for path in sorted((ROOT / "content/lessons").glob("*.json")):
        for lesson in json.loads(path.read_text(encoding="utf-8")).get("lessons", []):
            m = measure(lesson)
            if m:
                m["exempt"] = lesson.get("densityExempt")
                rows.append((m, lesson["id"], path.name))
    if not rows:
        print("no lessons")
        return 1

    rows.sort(key=lambda r: (-r[0]["tinted"], -r[0]["run"]))
    print(f"{'tinted':>7}{'figure':>8}{'run':>5}{'blocks':>8}  lesson")
    over = 0
    exempt = []
    for m, lid, name in rows:
        flags = ""
        if m["tinted"] > TINTED_CEILING:
            flags += " DENSE"
        if m["figure"] > FIGURE_CEILING:
            flags += " FIGURES"
        if m["run"] > MAX_RUN:
            flags += " RUN"
        if flags and m["exempt"]:
            flags = " EXEMPT"
            exempt.append((lid, m["exempt"]))
        elif flags:
            over += 1
        print(f"{m['tinted']:6}%{m['figure']:7}%{m['run']:5}{m['n']:8}  {lid} [{name}]{flags}")

    t = [m["tinted"] for m, _, _ in rows]
    print(f"\nmedian {statistics.median(t):.0f}% tinted by height over {len(rows)} "
          f"lessons; {over} over a ceiling")
    print(f"ceilings: {TINTED_CEILING}% tinted, {FIGURE_CEILING}% figure, "
          f"longest tinted run {MAX_RUN}")
    for lid, why in exempt:
        print(f"exempt: {lid} — {why}")
    if gate and over:
        print(f"\nFAIL: {over} lesson{'' if over == 1 else 's'} over a ceiling. "
              f"Remove tinted blocks — do not lighten the tints.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
