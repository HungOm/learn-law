#!/usr/bin/env python3
"""Validate the guided statute readings, and enforce what they are allowed to be.

A statute entry here is GUIDED READING of a provision, never a copy of one. The
reader is sent to the section itself and told what to look for; the app supplies
the questions, not the words of the legislature.

The same two reasons as `check-extracts.py`, and one more that is specific to
legislation:

  * The text is not ours to republish. Laws of Malaysia are published by the
    Attorney General's Chambers and carry government copyright.
  * A provision retyped into a study app is one nobody can check, and on a law
    site a wrong subsection reads exactly like a right one.
  * **Legislation is amended.** A case report is fixed the day it is handed
    down; a section can be substituted, renumbered or repealed between one
    reading and the next. An app holding its own copy of a section is holding a
    copy that goes silently out of date, and a reader has no way to tell. The
    only honest thing to hold is a pointer and a date.

So the quotation ceiling is the strongest rule here, and `find` — where to read
the current text for free — is required on every entry rather than optional.

    python3 tools/check-statutes.py
"""

import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
STATUTES = ROOT / "content/statutes"
LESSONS = ROOT / "content/lessons"
BOOKS = ROOT / "content/books.json"

QUOTE_MAX_WORDS = 25
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")
QUOTED = re.compile(r"[\"“]([^\"”]{40,})[\"”]")
# A provision reference a reader can actually chase: a section, article or rule
# with a number in it.
PROVISION = re.compile(r"(?i)\b(section|art|article|rule|order|s|ss)\b[\s.]*\d")

FIELDS = ["id", "moduleId", "lessonId", "act", "actId", "provision", "find",
          "why", "read", "questions", "trap", "source", "verify", "lastVerified"]


def strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for v in node.values():
            yield from strings(v)
    elif isinstance(node, list):
        for v in node:
            yield from strings(v)


def main():
    if not STATUTES.exists():
        print("no content/statutes directory")
        return 1

    lessons = {}
    for path in sorted(LESSONS.glob("*.json")):
        for l in json.loads(path.read_text()).get("lessons") or []:
            lessons[l["id"]] = l.get("moduleId")

    books = json.loads(BOOKS.read_text())
    statute_ids = {s["id"] for s in books.get("statutes") or []}

    errors, seen, total = [], {}, 0
    by_act = {}

    for path in sorted(STATUTES.glob("*.json")):
        try:
            items = json.loads(path.read_text())
        except json.JSONDecodeError as e:
            errors.append(f"{path.name}: not valid JSON — {e}")
            continue
        if not isinstance(items, list):
            errors.append(f"{path.name}: top level must be a list")
            continue

        for x in items:
            total += 1
            xid = x.get("id") or "<no id>"
            where = f"{path.name}:{xid}"

            for f in FIELDS:
                if not x.get(f):
                    errors.append(f"{where}: missing {f}")

            if xid in seen:
                errors.append(f"{where}: id already used in {seen[xid]}")
            seen[xid] = path.name
            by_act[x.get("act")] = by_act.get(x.get("act"), 0) + 1

            # The statute must be one this corpus already lists, so a reader can
            # find it in Reading as well as here.
            if x.get("actId") and x["actId"] not in statute_ids:
                errors.append(f"{where}: actId {x['actId']!r} is not in books.json statutes")

            lid = x.get("lessonId")
            if lid and lid not in lessons:
                errors.append(f"{where}: lessonId {lid!r} names no lesson")
            elif lid and x.get("moduleId") != lessons[lid]:
                errors.append(f"{where}: moduleId {x.get('moduleId')} disagrees with "
                              f"lesson {lid}'s module {lessons[lid]}")

            # A pointer with no number is not a pointer.
            if x.get("provision") and not PROVISION.search(x["provision"]):
                errors.append(f"{where}: provision {x['provision']!r} carries no number — "
                              f"a reader cannot chase it")

            # `find` has to actually direct someone somewhere.
            find = x.get("find") or ""
            if len(find.split()) < 12:
                errors.append(f"{where}: `find` is {len(find.split())} words — it must tell a "
                              f"reader where to read the current text for free")

            for i, r in enumerate(x.get("read") or []):
                for k in ("passage", "look_for"):
                    if not (r.get(k) or "").strip():
                        errors.append(f"{where}: read[{i}] missing {k}")
            if len(x.get("read") or []) < 2:
                errors.append(f"{where}: needs at least 2 `read` pointers")

            for i, q in enumerate(x.get("questions") or []):
                for k in ("q", "model"):
                    if not (q.get(k) or "").strip():
                        errors.append(f"{where}: questions[{i}] missing {k}")
            if len(x.get("questions") or []) < 2:
                errors.append(f"{where}: needs at least 2 questions")

            for s in strings(x):
                for q in QUOTED.findall(s):
                    if len(q.split()) > QUOTE_MAX_WORDS:
                        errors.append(f"{where}: a quoted run of {len(q.split())} words "
                                      f"(ceiling {QUOTE_MAX_WORDS}). Point the reader at the "
                                      f"section; do not reproduce it.")

            lv = x.get("lastVerified") or ""
            if not ISO.match(lv):
                errors.append(f"{where}: lastVerified {lv!r} is not YYYY-MM-DD")
            elif datetime.date.fromisoformat(lv) > datetime.date.today():
                errors.append(f"{where}: lastVerified {lv} is in the future")

    if errors:
        print(f"{len(errors)} problem{'' if len(errors) == 1 else 's'}:\n")
        for e in errors:
            print(f"  {e}")
        return 1

    print(f"statutes: OK — {total} provisions across {len(by_act)} Acts, "
          f"every one pointed at and dated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
