#!/usr/bin/env python3
"""Validate the case-reading extracts, and enforce what they are allowed to be.

A case extract in this app is GUIDED READING, never a reproduction. The reader
is sent to the judgment itself and told what to look for; the app supplies the
questions, not the words of the court. Two reasons, and both are load-bearing:

  * Reported judgments are not ours to republish. The words of a judgment sit in
    a law report whose headnotes and editorial matter belong to a publisher, and
    an app that pastes them in is a copyright problem wearing a study aid's coat.
  * Text nobody can verify is worse than no text. This corpus already carries a
    `source` and a `lastVerified` on every lesson because a study aid that
    misquotes a court teaches a reader something false with a citation attached
    to it. A paragraph of judgment typed from memory is exactly that failure.

So the strongest rule here is the quotation ceiling: no field may carry a long
quoted run. It exists to stop a future contributor "improving" an extract by
pasting the passage in. Point them at `find` instead, which is where a reader is
told how to reach the real thing for free.

    python3 tools/check-extracts.py
"""

import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXTRACTS = ROOT / "content/extracts"
LESSONS = ROOT / "content/lessons"

# A quoted run longer than this is a reproduction, not an anchor.
QUOTE_MAX_WORDS = 25
# Every citation carries a year, in brackets for a report and parentheses for
# the older series. Anything without one is not a citation a reader can chase.
CITATION = re.compile(r"[\[(]\d{4}[\])]")
QUOTED = re.compile(r"[\"“]([^\"”]{40,})[\"”]")
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")

TEXT_FIELDS = ("why", "find", "trap", "source", "verify")
REQUIRED = ("id", "moduleId", "lessonId", "case", "citation", "court", "year",
            "why", "find", "read", "questions", "trap", "source", "verify",
            "lastVerified")


def known_lessons():
    """moduleId and lessonId must name things that exist, or a reader following
    an extract back to its lesson lands on a 404 the gate never saw."""
    lessons, modules = {}, set()
    for f in sorted(LESSONS.glob("*.json")):
        data = json.loads(f.read_text())
        for l in (data if isinstance(data, list) else data.get("lessons", [])):
            lessons[l["id"]] = l.get("moduleId")
            modules.add(l.get("moduleId"))
    return lessons, modules


def walk_strings(value, path=""):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from walk_strings(v, f"{path}[{i}]")
    elif isinstance(value, dict):
        for k, v in value.items():
            yield from walk_strings(v, f"{path}.{k}" if path else k)


def main():
    errors, count, cases = [], 0, set()
    lessons, modules = known_lessons()
    today = datetime.date.today()

    files = sorted(EXTRACTS.glob("*.json"))
    if not files:
        print("check-extracts: no extract files found")
        return 0

    seen_ids = set()
    for f in files:
        rel = f.relative_to(ROOT)
        try:
            data = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            errors.append(f"{rel}  is not valid JSON: {e}")
            continue
        if not isinstance(data, list):
            errors.append(f"{rel}  must be a list of extracts")
            continue

        for x in data:
            count += 1
            xid = x.get("id", "<no id>")
            where = f"{rel}:{xid}"

            for key in REQUIRED:
                if not x.get(key):
                    errors.append(f"{where}  missing `{key}`")
            if not str(xid).startswith("x-"):
                errors.append(f"{where}  id must start with `x-`")
            if xid in seen_ids:
                errors.append(f"{where}  duplicate id — progress is keyed to it")
            seen_ids.add(xid)

            if x.get("lessonId") and x["lessonId"] not in lessons:
                errors.append(f"{where}  lessonId `{x['lessonId']}` is not a lesson")
            elif x.get("lessonId") and x.get("moduleId") != lessons[x["lessonId"]]:
                errors.append(
                    f"{where}  moduleId `{x.get('moduleId')}` but its lesson "
                    f"`{x['lessonId']}` is in `{lessons[x['lessonId']]}`")
            if x.get("moduleId") and x["moduleId"] not in modules:
                errors.append(f"{where}  moduleId `{x['moduleId']}` is not a module")

            if x.get("citation") and not CITATION.search(x["citation"]):
                errors.append(
                    f"{where}  citation `{x['citation']}` has no year — a reader "
                    f"cannot find a report without one")
            year = x.get("year")
            if isinstance(year, int) and not (1800 <= year <= today.year):
                errors.append(f"{where}  year {year} is outside 1800-{today.year}")
            cases.add(x.get("case"))

            read = x.get("read") or []
            if len(read) < 1:
                errors.append(f"{where}  needs at least one `read` pointer")
            for i, r in enumerate(read):
                for key in ("passage", "look_for"):
                    if not r.get(key):
                        errors.append(f"{where}  read[{i}] missing `{key}`")

            qs = x.get("questions") or []
            if len(qs) < 2:
                errors.append(f"{where}  needs at least two questions")
            for i, q in enumerate(qs):
                for key in ("q", "model"):
                    if not q.get(key):
                        errors.append(f"{where}  questions[{i}] missing `{key}`")

            lv = x.get("lastVerified", "")
            if lv and not ISO.match(lv):
                errors.append(f"{where}  lastVerified `{lv}` is not YYYY-MM-DD")
            elif lv and datetime.date.fromisoformat(lv) > today:
                errors.append(f"{where}  lastVerified `{lv}` is in the future")

            # The rule this file exists for.
            for path, text in walk_strings(x):
                for m in QUOTED.finditer(text):
                    words = len(m.group(1).split())
                    if words > QUOTE_MAX_WORDS:
                        errors.append(
                            f"{where}  {path} carries a {words}-word quotation. "
                            f"Extracts are guided reading, not reproduction — "
                            f"send the reader to the judgment via `find` and say "
                            f"what to look for instead")
                for m in re.finditer(r"http://", text):
                    errors.append(f"{where}  {path} has an http:// link — use https")

    if errors:
        print("check-extracts: FAILED")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"extracts: OK — {count} extracts, {len(cases)} cases, "
          f"{len({x for x in seen_ids})} ids, every one sourced and dated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
