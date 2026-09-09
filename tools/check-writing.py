#!/usr/bin/env python3
"""Validate the guided-writing exercises, and enforce what they are allowed to be.

A writing exercise here teaches a FORM. The app supplies the brief, the staged
scaffolding, the shape a good answer has, and a rubric the reader marks their own
draft against. It does not supply a text to copy, and it does not supply anybody
else's words.

Two rules are load-bearing, and both mirror `check-extracts.py`:

  * No long quoted runs. The same ceiling, for the same reason: a passage of a
    judgment, a statute or a textbook pasted into a study app is a copyright
    problem wearing a study aid's coat, and a passage nobody can verify teaches
    something false with authority attached.

  * `model` describes what a good answer DOES; it is never a model answer. This
    is the rule most likely to be eroded by a well-meaning contributor, who will
    reason that a worked example would help. It would — and it would also be
    copied, and copying a model teaches the shape of someone else's thinking
    rather than how to produce your own. The `structure` and `rubric` fields
    exist so the shape can be taught without handing over a text. A `model` that
    reads like an answer rather than a description of one fails here.

The gate also checks that every exercise hangs off a real lesson, because the
tier is gated the way case reading is: an exercise whose lessonId names nothing
is an exercise no reader can ever open.

    python3 tools/check-writing.py
"""

import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
WRITING = ROOT / "content/writing"
LESSONS = ROOT / "content/lessons"

# Same ceiling as the case tier. A run longer than this is a reproduction.
QUOTE_MAX_WORDS = 25
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")
QUOTED = re.compile(r"[\"“]([^\"”]{40,})[\"”]")

LEVELS = {"foundation", "advanced", "llb"}
KINDS = {"case-note", "problem-answer", "advice", "argument", "essay"}

FIELDS = ["id", "moduleId", "lessonId", "level", "kind", "title", "minutes",
          "brief", "audience", "before", "scaffold", "structure", "rubric",
          "faults", "model", "source", "lastVerified", "verify"]

# A `model` that opens like an answer rather than a description of one. These
# are the shapes a drifting contributor actually writes.
ANSWER_SHAPED = re.compile(
    r"^\s*(dear |to whom|in the matter of|the issue is whether|i am writing|"
    r"this essay will|it is submitted that)", re.I)


def strings(node):
    """Every string anywhere in the exercise, so the quote rule cannot be dodged
    by moving text into a nested field."""
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for v in node.values():
            yield from strings(v)
    elif isinstance(node, list):
        for v in node:
            yield from strings(v)


def lesson_ids():
    out = {}
    for path in sorted(LESSONS.glob("*.json")):
        for lesson in json.loads(path.read_text()).get("lessons") or []:
            out[lesson["id"]] = lesson.get("moduleId")
    return out


def main():
    if not WRITING.exists():
        print("no content/writing directory")
        return 1

    lessons = lesson_ids()
    errors = []
    seen = {}
    total = 0
    by_level = {}
    by_kind = {}

    for path in sorted(WRITING.glob("*.json")):
        try:
            items = json.loads(path.read_text())
        except json.JSONDecodeError as e:
            errors.append(f"{path.name}: not valid JSON — {e}")
            continue
        if not isinstance(items, list):
            errors.append(f"{path.name}: top level must be a list of exercises")
            continue

        for w in items:
            total += 1
            wid = w.get("id") or "<no id>"
            where = f"{path.name}:{wid}"

            for f in FIELDS:
                if not w.get(f):
                    errors.append(f"{where}: missing {f}")

            if wid in seen:
                errors.append(f"{where}: id already used in {seen[wid]}")
            seen[wid] = path.name

            if w.get("level") not in LEVELS:
                errors.append(f"{where}: level {w.get('level')!r} is not one of {sorted(LEVELS)}")
            by_level[w.get("level")] = by_level.get(w.get("level"), 0) + 1

            if w.get("kind") not in KINDS:
                errors.append(f"{where}: kind {w.get('kind')!r} is not one of {sorted(KINDS)}")
            by_kind[w.get("kind")] = by_kind.get(w.get("kind"), 0) + 1

            # Gating. An exercise whose lesson does not exist can never open.
            lid = w.get("lessonId")
            if lid and lid not in lessons:
                errors.append(f"{where}: lessonId {lid!r} names no lesson")
            elif lid and w.get("moduleId") != lessons[lid]:
                errors.append(f"{where}: moduleId {w.get('moduleId')} disagrees with "
                              f"lesson {lid}'s module {lessons[lid]}")

            m = w.get("minutes")
            if not isinstance(m, int) or not 10 <= m <= 180:
                errors.append(f"{where}: minutes {m!r} is not a whole number between 10 and 180")

            # The staged fields are what make this guided rather than a prompt.
            for f, least in (("scaffold", 3), ("structure", 2), ("rubric", 3),
                             ("faults", 2), ("before", 1)):
                v = w.get(f)
                if isinstance(v, list) and len(v) < least:
                    errors.append(f"{where}: {f} has {len(v)}; a guided exercise needs at least {least}")

            for i, s in enumerate(w.get("scaffold") or []):
                for k in ("step", "prompt", "why"):
                    if not (s.get(k) or "").strip():
                        errors.append(f"{where}: scaffold[{i}] missing {k}")

            for i, s in enumerate(w.get("structure") or []):
                for k in ("part", "does", "length"):
                    if not (s.get(k) or "").strip():
                        errors.append(f"{where}: structure[{i}] missing {k}")

            # Three bands, so a reader can place a draft rather than pass/fail it.
            bands = [(r.get("band") or "").strip() for r in w.get("rubric") or []]
            for i, r in enumerate(w.get("rubric") or []):
                if not (r.get("test") or "").strip():
                    errors.append(f"{where}: rubric[{i}] has no test")
            if len(set(bands)) != len(bands):
                errors.append(f"{where}: rubric bands are not distinct")

            # The rule this file exists for.
            model = w.get("model") or ""
            if ANSWER_SHAPED.match(model):
                errors.append(f"{where}: `model` reads as an answer, not a description of one. "
                              f"Describe what a good answer does; never supply a text to copy.")
            if len(model.split()) < 40:
                errors.append(f"{where}: `model` is {len(model.split())} words — too short to "
                              f"describe a form. It is the field doing the teaching.")

            # The quotation ceiling, over every string in the exercise.
            for s in strings(w):
                for q in QUOTED.findall(s):
                    if len(q.split()) > QUOTE_MAX_WORDS:
                        errors.append(f"{where}: a quoted run of {len(q.split())} words "
                                      f"(ceiling {QUOTE_MAX_WORDS}). Point the reader at the "
                                      f"source; do not reproduce it.")

            lv = w.get("lastVerified") or ""
            if not ISO.match(lv):
                errors.append(f"{where}: lastVerified {lv!r} is not YYYY-MM-DD")
            else:
                if datetime.date.fromisoformat(lv) > datetime.date.today():
                    errors.append(f"{where}: lastVerified {lv} is in the future")

    if errors:
        print(f"{len(errors)} problem{'' if len(errors) == 1 else 's'}:\n")
        for e in errors:
            print(f"  {e}")
        return 1

    lv = ", ".join(f"{k} {v}" for k, v in sorted(by_level.items()))
    kd = ", ".join(f"{k} {v}" for k, v in sorted(by_kind.items()))
    print(f"{total} writing exercises — {lv}")
    print(f"kinds: {kd}")
    print("guided writing is consistent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
