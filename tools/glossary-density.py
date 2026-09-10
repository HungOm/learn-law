#!/usr/bin/env python3
"""How many glossary marks land in a paragraph, and in a lesson.

A dotted underline is only legible as a mark while most words are not marked.
Past some density the paragraph reads as a field of underlines, the reader
stops seeing individual terms, and the feature that was meant to help
comprehension starts costing it. That point is not a matter of taste, so this
measures it rather than leaving it to whoever adds the next term.

**A term is marked once per SECTION, not once per lesson.** `LessonView` builds
its `seen` map with `[id, stepping ? step : 'all']`, and focus mode — one
section at a time — is on by default at every width. So each section is
self-contained: a term marked in section 2 is marked again in section 5, because
the reader cannot scroll back to the first mark. Modelling a per-lesson `seen`
undercounted every section after the first and described the continuous mode,
which is the mode nobody is in unless they ask for it.

**The unit is the rendered passage, not the block.** `Prose` is called once per
string, so a paragraph, a table cell and a list item are each their own passage
with their own marks. Counting a whole block instead put a nine-row table's
cells into one number and reported a reading failure that is not on the page —
the noise this measures is marks crowding a *line of prose*, and a table cell
carrying one mark is not that.

**This models `src/lib/glossary.js`, and a model is not the thing.** The rules
reproduced here are: longest alias first (JS alternation is leftmost-first, not
leftmost-longest), a word boundary that is a leading character plus a negative
lookahead rather than `\\b`, one mark per term per *section*, and one mark per
term per passage — `tokenise` makes a fresh per-passage set on every call. `--verify` prints the per-lesson totals so they can be checked
against `.term` elements counted in a real browser — do that after any change to
the tokeniser, because a model that has drifted from the renderer reports
confident numbers about a page nobody is looking at.

    python3 tools/glossary-density.py            # the distribution
    python3 tools/glossary-density.py --gate     # exit 1 if any ceiling is passed
    python3 tools/glossary-density.py --verify   # per-lesson totals, to check in the DOM
"""

import json
import pathlib
import re
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Set from what a paragraph can carry before the marks stop reading as marks.
#
# Two measures, and only one of them is load-bearing.
#
# HEAVY_SHARE is the one that was validated. Making ordinary vocabulary quiet
# took the share of passages carrying four or more visible marks from a median
# of 25% to 9%, measured across the corpus before and after; that number tracks
# the thing the eye actually reports, which is whether the page reads as
# underlined. Its ceiling is 30%, a little over three times the median.
#
# The passage rule is a tripwire for genuine walls, and it is deliberately loose
# because two tighter versions were wrong in opposite directions. A flat ceiling
# of six flagged eleven passages, most of which were simply long. A rate of one
# mark per two rendered lines — 26 words, using density.py's calibration —
# flagged ninety-four, because a forty-word sentence introducing five terms of
# art is not a wall and there are a great many of them in a law course. What is
# left fires only when a passage is both heavily marked in absolute terms and
# marked faster than one word in twelve, which in this corpus is one passage:
# the section 26 recitation in l-consideration, fifteen marks in fifteen. That
# is a real wall, and it is the only one.
WALL_MARKS = 8
WALL_WORDS_PER_MARK = 12
# The share of a lesson's paragraphs allowed to sit at or above HEAVY marks.
# A few dense paragraphs are fine; a lesson where a third of them are dense
# reads as underlined throughout.
HEAVY = 4
HEAVY_SHARE = 0.30

# Exactly the fields that reach `Prose`, per block type, read off Blocks.jsx and
# Interactive.jsx. This is a whitelist and not a list of plausible text keys,
# because guessing was wrong in both directions at once: the model read a
# diagram's `alt` and `caption`, which are never linked (Chart, Diagram and
# Plate are the three block types Blocks.jsx renders WITHOUT passing `seen`, so
# nothing in them is a glossary mark), and it missed a predict block's `prompt`
# and `reveal`, which are. A table's `caption` and a steps block's `title` are
# plain text too; only the cells, the note and the source line are prose.
#
# Section `keypoint` is NOT here. LessonView renders it as `<p className="lede">
# {sec.keypoint}</p>` — plain interpolation, no Prose — so it carries no marks
# however legal its vocabulary.
PROSE_FIELDS = {
    "rule":       ("text", "source"),
    "example":    ("text",),
    "caution":    ("text",),
    "list":       ("items",),
    "table":      ("rows", "note", "source"),
    "steps":      ("items.text",),
    "compare":    ("left.items", "right.items"),
    # `reveal` and `why` are left out on purpose. Interactive.jsx mounts them
    # only after the reader answers, so they are not on the page on arrival —
    # and this measures what a reader meets, not what the file contains.
    #
    # Leaving them in was wrong in BOTH directions, which is what made it hard
    # to see. Too high where a term appeared only in a reveal. Too low where a
    # term appeared first in a reveal and again in visible prose further down:
    # the model let the hidden occurrence claim the mark and then suppressed the
    # visible one, so the page showed a mark the model had already spent.
    "predict":    ("prompt",),
    "checkpoint": ("q",),
}
# Blocks.jsx has no `case 'p'`: a paragraph block carries `t: "p"` and reaches
# the switch's `default`, which renders `<Prose as="p" text={b.text}>`. So does
# any type nobody has written a case for. Keying the fallback on a missing `t`
# instead of on "not in the switch" made the model skip every paragraph in the
# corpus — and it still produced a plausible-looking distribution, which is why
# it survived a reading and died at the first comparison with the DOM.
DEFAULT_FIELDS = ("text",)
# Rendered, but never through Prose. Named so that a reader of this file can see
# the difference is deliberate rather than an omission.
UNLINKED = {"chart", "diagram", "figure"}


def build():
    doc = json.loads((ROOT / "content/glossary.json").read_text(encoding="utf-8"))
    alias_to_id, kind = {}, {}
    for t in doc["terms"]:
        kind[t["id"]] = t["kind"]
        for a in t["aliases"]:
            alias_to_id[a.lower()] = t["id"]
    order = sorted(alias_to_id, key=lambda a: (-len(a), a))
    pat = "|".join(re.escape(a) for a in order)
    return alias_to_id, re.compile(f"(^|[^A-Za-z0-9-])({pat})(?![A-Za-z0-9-])", re.I), kind


def marks(text, rx, alias_to_id, seen, local):
    """Ids marked in `text`, applying the once-per-lesson and once-per-passage rules."""
    out = []
    pos = 0
    while True:
        m = rx.search(text, pos)
        if not m:
            break
        alias = m.group(2)
        start = m.start(2)
        tid = alias_to_id.get(alias.lower())
        if tid is None or tid in local or (tid in seen and seen[tid] is not text):
            pos = start + len(alias)
            continue
        local.add(tid)
        seen[tid] = text
        out.append(tid)
        pos = start + len(alias)
    return out


def passages(block):
    """The strings a block renders through Prose, in render order."""
    kind = block.get("t")
    if kind in UNLINKED:
        return
    for field in PROSE_FIELDS.get(kind, DEFAULT_FIELDS):
        if field == "rows":
            for row in block.get("rows") or []:
                for cell in row:
                    if isinstance(cell, str) and cell:
                        yield cell
        elif field == "items":
            for it in block.get("items") or []:
                if isinstance(it, str) and it:
                    yield it
        elif field == "items.text":
            for it in block.get("items") or []:
                if isinstance(it, dict) and it.get("text"):
                    yield it["text"]
        elif field.endswith(".items"):
            side = block.get(field.split(".", 1)[0]) or {}
            for it in side.get("items") or []:
                if isinstance(it, str) and it:
                    yield it
        else:
            v = block.get(field)
            if isinstance(v, str) and v:
                yield v


def main(argv):
    gate = "--gate" in argv
    verify = "--verify" in argv
    alias_to_id, rx, kind = build()
    # The reading-noise ceiling applies to VISIBLE marks. Ordinary vocabulary
    # (kind `word`) is hoverable but carries no resting underline — see the
    # `.term-word` rule in learn.css — so it costs the reader nothing to scan
    # past and does not belong in a count of how underlined a paragraph looks.
    # Total marks are still reported, because that is the coverage the glossary
    # is for and it has no ceiling.
    visible = lambda ids: [i for i in ids if kind.get(i) != "word"]

    rows, over_para, over_share = [], [], []
    for path in sorted((ROOT / "content/lessons").glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        for lesson in doc.get("lessons", []):
            counts, per_section = [], []
            # The same lesson, deduped the two ways the app can render it. The
            # reading surface has moved twice while this tool was being written
            # — section-at-a-time on narrow screens, then at every width, then
            # into an overlay with the page behind it rendering continuously —
            # and each move changes which `seen` map the renderer builds. A
            # model that describes only one of them is right until someone edits
            # LessonView, which is not a useful kind of right. So emit both and
            # let the DOM check compare against whichever is on screen.
            sheet_seen = {}
            # The source note at the foot of the lesson renders `l.verify`
            # through Prose with NO `seen` map, so every term in it marks, and
            # it sits outside the stepped region so it is present whichever
            # surface is on screen.
            #
            # This was in the model, then taken out: the note is guarded on
            # `l.source`, the generated chunks did not carry that field, and
            # including it put every section four to six marks over the DOM.
            # That has changed under us — split-content.py was fixed to carry
            # every field the catalogue drops, so the note renders now and the
            # model was short by exactly its marks. Worth keeping the history in
            # view: the same line was right, then wrong, then right again
            # without anyone editing it.
            note_marks = 0
            if lesson.get("source") and lesson.get("verify"):
                note_marks = len(marks(lesson["verify"], rx, alias_to_id, {}, set()))
            for sec in lesson.get("sections", []):
                # Fresh per section: that is what `[id, stepping ? step : 'all']`
                # does in LessonView, and focus mode is the default.
                seen = {}
                shown = 0
                for block in sec.get("body") or []:
                    for text in passages(block):
                        marks(text, rx, alias_to_id, sheet_seen, set())
                        # A fresh `local` per passage, because `tokenise` makes
                        # one per call and it is called once per string. Sharing
                        # it across a block modelled a rule the renderer does
                        # not have, and undercounted every table.
                        got = marks(text, rx, alias_to_id, seen, set())
                        shown += len(visible(got))
                        if got:
                            counts.append((len(visible(got)), len(got),
                                           len(text.split()), text[:60]))
                per_section.append((len(seen) + note_marks, shown))
            if not counts:
                continue
            nums = [v for v, _, _, _ in counts]
            heavy = sum(1 for c in nums if c >= HEAVY) / len(nums)
            rows.append((lesson["id"], per_section, max(nums), heavy, len(nums),
                         len(sheet_seen) + note_marks))
            for v, total, words, where in counts:
                if v >= WALL_MARKS and words < v * WALL_WORDS_PER_MARK:
                    over_para.append((lesson["id"], v, total, words, where,
                                      lesson.get("glossaryDense")))
            if heavy > HEAVY_SHARE:
                over_share.append((lesson["id"], heavy, len(nums),
                                   lesson.get("glossaryDense")))

    rows.sort(key=lambda r: -r[2])
    if verify:
        # Per SECTION, in order — one line per lesson, because that is what a
        # browser can count: focus mode puts exactly one section in the DOM.
        for lid, per_section, _, _, _, sheet in sorted(rows):
            print(f"{lid} sheet={sheet} steps={','.join(str(n) for n, _ in per_section)}")
        return 0

    maxes = [r[2] for r in rows]
    print(f"{len(rows)} lessons, {len(alias_to_id)} aliases over "
          f"{len(json.loads((ROOT / 'content/glossary.json').read_text(encoding='utf-8'))['terms'])} terms")
    print(f"underlined marks in the densest passage: median {statistics.median(maxes):.0f}, "
          f"max {max(maxes)} (wall at {WALL_MARKS}+ marks inside "
          f"{WALL_WORDS_PER_MARK} words each)")
    sect = [n for r in rows for n, _ in r[1]]
    shown = [v for r in rows for _, v in r[1]]
    print(f"marks per section: median {statistics.median(sect):.0f}, max {max(sect)} "
          f"({statistics.median(shown):.0f} / {max(shown)} of them underlined)")
    print(f"share of blocks at {HEAVY}+ marks: median "
          f"{statistics.median([r[3] for r in rows]):.0%} (ceiling {HEAVY_SHARE:.0%})")
    print()
    print(f"{'lesson':34} {'sect.max':>8} {'densest':>7} {'heavy':>6} {'passages':>8}")
    for lid, per_section, mx, heavy, blocks, _sheet in rows[:12]:
        print(f"{lid:34} {max(n for n, _ in per_section):8} {mx:7} {heavy:5.0%} {blocks:8}")

    unexempt = [r for r in over_share if not r[3]] + [r for r in over_para if not r[5]]
    if over_para or over_share:
        print()
        for lid, v, total, words, where, why in over_para:
            tag = "EXEMPT" if why else "WALL  "
            print(f"  {tag}  {lid}: {v} underlined marks of {total} in only {words} words "
                  f"— {where!r}" + (f"\n          {why}" if why else ""))
        for lid, share, blocks, why in over_share:
            tag = "EXEMPT" if why else "OVER  "
            print(f"  {tag}  {lid}: {share:.0%} of {blocks} passages carry {HEAVY}+ marks "
                  f"(ceiling {HEAVY_SHARE:.0%})" + (f" — {why}" if why else ""))
        if gate and unexempt:
            print("\nglossary-density: FAIL")
            return 1
    print("\nglossary-density: OK" if gate else "")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
