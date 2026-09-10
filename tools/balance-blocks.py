#!/usr/bin/env python3
"""Spread the correct answer across positions in IN-BODY predict and checkpoint blocks.

`balance-quiz.py` does this for `quiz` arrays. It does not touch the `predict`
and `checkpoint` blocks inside lesson sections, and those are the ones where
position is visible: `prepare()` in src/lib/quiz.js shuffles a quiz run's
options at render, but a block inside a lesson is rendered exactly as authored.
So for these, the stored index IS what the reader sees.

Measured before this existed: 136 of 158 in-body blocks — **86%** — had the
answer at index 1. A reader could score 86% on every check in the corpus by
always clicking the second option, which does not merely inflate a score. It
removes the retrieval the block exists to create: a reader who has noticed the
pattern is no longer recalling anything, and the block becomes a page-turn.

The transform is `balance-quiz.py`'s, deliberately: pull the correct option out,
splice it back at the target, set `answer`, assert it landed. The target is
`hash(id) % len(options)` where the id is the section id plus the block's index
within the section, so it is deterministic and stable — a block keeps its
position across runs unless its section is renumbered.

    python3 tools/balance-blocks.py --check   # report only
    python3 tools/balance-blocks.py           # rewrite
"""

import collections
import glob
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
KINDS = ("predict", "checkpoint")


def target_for(key, n):
    h = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return int(h, 16) % n


def main(argv):
    check = "--check" in argv
    before, after, moved, files = collections.Counter(), collections.Counter(), 0, 0

    for path in sorted((ROOT / "content/lessons").glob("*.json")):
        raw = path.read_text(encoding="utf-8")
        indent = 2 if raw.startswith('{\n  "') else 1
        doc = json.loads(raw)
        touched = False
        for lesson in doc.get("lessons", []):
            for sec in lesson.get("sections", []):
                for i, b in enumerate(sec.get("body") or []):
                    if b.get("t") not in KINDS:
                        continue
                    opts, ans = b.get("options"), b.get("answer")
                    if not isinstance(opts, list) or not isinstance(ans, int):
                        continue
                    if not 0 <= ans < len(opts):
                        print(f"  {sec.get('id')}[{i}]: answer {ans} out of range", file=sys.stderr)
                        return 1
                    before[ans] += 1
                    t = target_for(f"{sec.get('id')}#{i}", len(opts))
                    if t != ans:
                        correct = opts[ans]
                        rest = [o for j, o in enumerate(opts) if j != ans]
                        b["options"] = rest[:t] + [correct] + rest[t:]
                        b["answer"] = t
                        assert b["options"][t] == correct
                        moved += 1
                        touched = True
                    after[b["answer"]] += 1
        if touched and not check:
            path.write_text(json.dumps(doc, indent=indent, ensure_ascii=False) + "\n",
                            encoding="utf-8")
            files += 1

    total = sum(after.values())
    if not total:
        print("balance-blocks: no in-body predict/checkpoint blocks found")
        return 0
    print(f"{total} in-body blocks across {len(list((ROOT/'content/lessons').glob('*.json')))} files")
    for label, c in (("before", before), ("after", after)):
        row = "  ".join(f"[{i}] {c[i] / total:5.1%}" for i in sorted(c))
        print(f"  {label}  {row}")
    print(f"  {moved} moved" + (" (nothing written: --check)" if check
                                else f", {files} files rewritten"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
