#!/usr/bin/env python3
"""Report the reading level of every lesson.

The audience is adults who did not get to university, and children. That sets a
target the prose can be measured against rather than argued about:

    Flesch-Kincaid grade 8-10, median sentence <= 16 words, none over 30.

Usage:
    python3 tools/readability.py              # every lesson, worst first
    python3 tools/readability.py method.json  # one file
    python3 tools/readability.py --gate       # exit 1 if any lesson is over

The gate is an upper bound only. A lesson that reads easier than grade 8 is not
a defect for this audience -- it is the goal.
"""

import json
import pathlib
import re
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOWELS = "aeiouy"


def syllables(word):
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    n, prev = 0, False
    for ch in w:
        cur = ch in VOWELS
        if cur and not prev:
            n += 1
        prev = cur
    if w.endswith("e") and n > 1:
        n -= 1
    return max(n, 1)


def block_prose(b):
    """Sentence-like text from a block, whatever its type.

    Prose blocks carry `text`. The visual blocks carry structure, and only some
    of what they hold is prose: a chart's caption is a sentence a reader reads,
    its axis labels are fragments that would flatter the sentence-length figure.
    So captions, notes, alt text and step bodies count; bare labels and table
    cells do not.
    """
    t = b.get("t")
    out = []
    if t in ("p", "rule", "example", "caution"):
        out.append(b.get("text"))
    elif t == "list":
        out.extend(b.get("items") or [])
    elif t == "steps":
        for it in b.get("items") or []:
            if isinstance(it, dict):
                out.extend([it.get("h"), it.get("text")])
    elif t == "compare":
        for side in ("left", "right"):
            col = b.get(side)
            if isinstance(col, dict):
                out.append(col.get("h"))
                out.extend(col.get("items") or [])
    elif t == "predict":
        out.extend([b.get("prompt"), b.get("reveal")])
        out.extend(b.get("options") or [])
    elif t == "checkpoint":
        out.extend([b.get("q"), b.get("why")])
        out.extend(b.get("options") or [])
    elif t in ("table", "chart", "diagram", "figure"):
        out.extend([b.get("caption"), b.get("note"), b.get("alt")])
        for layer in b.get("layers") or []:
            if isinstance(layer, dict):
                out.append(layer.get("note"))
    return [x for x in out if isinstance(x, str) and x.strip()]


def prose(lesson, include_rules=True):
    """Every word a reader actually reads, quiz included.

    Section headings are excluded: they are labels, not prose, and counting a
    four-word heading as a sentence flatters the median.

    `rule` blocks are separable because their wording is frozen — a rule block
    states black-letter law, and rewording it changes what it asserts. Writers
    are accountable for the prose around a rule, not the rule itself, so the
    gate is measured with include_rules=False.
    """
    out = []
    for sec in lesson.get("sections") or []:
        for b in sec.get("body") or []:
            if b.get("t") == "rule" and not include_rules:
                continue
            out.extend(block_prose(b))
    out.append(lesson.get("summary", ""))
    for q in lesson.get("quiz") or []:
        out.append(q.get("q", ""))
        out.append(q.get("why", ""))
    # Join at a sentence boundary; a bare space would fuse two blocks into one
    # enormous phantom sentence.
    return " ".join(x.rstrip().rstrip(".") + "." for x in out
                    if isinstance(x, str) and x.strip())


def measure(text):
    text = re.sub(r"\*+", "", text)
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    words = re.findall(r"[A-Za-z']+", text)
    if not sentences or not words:
        return None
    lengths = [len(re.findall(r"[A-Za-z']+", s)) for s in sentences]
    lengths = [n for n in lengths if n]
    syl = sum(syllables(w) for w in words)
    grade = 0.39 * (len(words) / len(sentences)) + 11.8 * (syl / len(words)) - 15.59
    return {
        "grade": grade,
        "median_sentence": statistics.median(lengths),
        "longest": max(lengths),
        "words": len(words),
    }


def main(argv):
    gate = "--gate" in argv
    args = [a for a in argv[1:] if not a.startswith("--")]
    only = args[0] if args else None
    rows = []
    for path in sorted((ROOT / "content/lessons").glob("*.json")):
        if only and path.name != only:
            continue
        for lesson in json.loads(path.read_text(encoding="utf-8")).get("lessons", []):
            m = measure(prose(lesson, include_rules=False))
            blended = measure(prose(lesson, include_rules=True))
            if m:
                m["blended"] = blended["grade"] if blended else m["grade"]
                rows.append((m, lesson["id"], path.name))
    if not rows:
        print("no lessons matched")
        return 1

    rows.sort(key=lambda r: -r[0]["grade"])
    print(f"{'grade':>6} {'+rule':>6} {'med':>4} {'max':>4} {'words':>6}  lesson")
    over = 0
    for m, lid, name in rows:
        flag = ""
        if m["grade"] > 10:
            flag += " GRADE"
        if m["median_sentence"] > 16:
            flag += " SENTENCES"
        if m["longest"] > 30:
            flag += " LONGEST"
        if flag:
            over += 1
        print(f"{m['grade']:6.1f} {m['blended']:6.1f} {m['median_sentence']:4.0f} "
              f"{m['longest']:4d} {m['words']:6d}  {lid} [{name}]{flag}")

    grades = [m["grade"] for m, _, _ in rows]
    print(f"\nmedian grade {statistics.median(grades):.1f} over {len(rows)} lessons; "
          f"{over} outside target")
    print("target: grade 8-10, median sentence <= 16 words, longest <= 30")
    print("`grade` excludes frozen `rule` block text; `+rule` is what a reader meets.")
    if gate and over:
        print(f"\nFAIL: {over} lesson{'' if over == 1 else 's'} outside target. "
              f"See docs/STYLE.md.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
