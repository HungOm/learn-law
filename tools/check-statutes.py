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
# Plurals matter: a scheme is often several sections read together, and
# "Sections 101 to 106" is a perfectly chaseable pointer.
PROVISION = re.compile(r"(?i)\b(sections?|arts?|articles?|rules?|orders?|ss?)\b[\s.]*\d")

FIELDS = ["id", "moduleId", "lessonId", "act", "actId", "provision", "find",
          "why", "read", "questions", "trap", "source", "verify", "lastVerified"]


# ---------------------------------------------------------------------------
# Coverage, not just identity.
#
# The id check catches two entries called the same thing. It does not catch two
# entries about the same LAW, which is the failure that actually reaches a
# reader: `st-fc-art5` covers "Article 5, especially clauses (3) and (4)", and a
# second page called "Article 5(3)" is a different id, a different provision
# string, and the same provision. A generator matching on clause rather than on
# what a page covers produces exactly that, and it did.
#
# So a provision string is parsed into the set of (number, clause) pairs it
# claims. A clause of None means the whole section, and therefore overlaps every
# clause of it. Two entries on the same Act conflict if their claims intersect.
# A provision string names what the page COVERS, and often also mentions
# provisions it merely points at — "Section 5(1), read with section 4(2)(a)".
# The cross-reference is not a claim, and treating it as one produced two false
# positives on the first run. So: cut the string at the first cross-reference
# marker, then read only the number run that follows the unit word. A rule that
# cries wolf is a rule someone switches off.
XREF = re.compile(r"(?i)\b(read (?:with|alongside|together with)|together with|see also|see |under |cf\.?)")
UNIT = re.compile(r"(?i)\b(sections?|arts?|articles?|rules?|orders?|ss?)\b[\s.]*")


# A Schedule is a provision with a name instead of a number, so the number run
# above finds nothing in it and the entry claims the empty set — which cannot
# collide with anything, so a second First Schedule page would pass. A rule that
# catches nothing fails quietly, which is the worst direction for a gate to fail
# in. Ordinals are mapped to numbers so "First Schedule" and "Schedule 1" are the
# same claim.
ORDINALS = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
            "sixth": 6, "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10,
            "eleventh": 11, "twelfth": 12, "thirteenth": 13, "fourteenth": 14}
SCHEDULE = re.compile(
    r"(?i)\b(?:(" + "|".join(ORDINALS) + r"|\d+)\s+schedule|schedule\s+(\d+))\b")


def schedule_claims(text):
    out = set()
    for m in SCHEDULE.finditer(text):
        raw = (m.group(1) or m.group(2) or "").lower()
        n = ORDINALS.get(raw, raw)
        out.add((f"Schedule {n}", None))
    return out


def claims(provision):
    """The (number, clause) pairs a provision string claims to COVER.

    Numbers after a cross-reference marker, and numbers belonging to some other
    noun ("Exception 1"), are not claims — the run stops at the first word that
    is neither a number nor a connector.
    """
    # KNOWN AND DELIBERATE: a named sub-unit inside a provision — "with the
    # Exceptions to section 300", "Explanation 2", "the proviso" — is prose for
    # a reader and not a claim the rule can see. `st-pc-homicide` claims
    # {299, 300}, so a future page claiming an Exception specifically would not
    # collide with it. That is the Schedule hole one level down, and it is left
    # open on purpose: named sub-units have no stable vocabulary across Acts, so
    # a rule for them would guess. If someone writes that page, extend the
    # existing one instead — which is what closing this gap looked like in
    # September 2026.
    text = XREF.split(provision or "", 1)[0]
    scheds = schedule_claims(text)
    m = UNIT.search(text)
    if not m:
        return scheds
    rest = text[m.end():]

    # Consume "300", "299 and 300", "101 to 106", "74(1) and (2)" — and stop at
    # the first token that is not a number, a bare clause, or a connector.
    run, pos = [], 0
    pattern = re.compile(r"\s*(?:(and|to|,|–|—|-)\s*)?(?:(\d+[A-Z]?)(?:\(([0-9A-Za-z]+)\))?|\(([0-9A-Za-z]+)\))")
    while True:
        mm = pattern.match(rest, pos)
        if not mm:
            break
        run.append((mm.group(1), mm.group(2), mm.group(3), mm.group(4)))
        pos = mm.end()

    out, base = set(scheds), None
    for conn, num, clause, bare in run:
        if num:
            base = num
            out.add((num, clause))
        elif bare and base:
            out.add((base, bare))

    # "101 to 106" is a run, not two endpoints.
    nums = [int(n) for _, n, _, _ in run if n and n.isdigit()]
    if any(c and c.lower() == "to" for c, _, _, _ in run) and len(nums) >= 2:
        lo, hi = min(nums), max(nums)
        if 0 < hi - lo < 200:
            for n in range(lo, hi + 1):
                out.add((str(n), None))
    return out


def overlaps(a, b):
    """Do two claim sets touch? A clause of None covers the whole number."""
    for (na, ca) in a:
        for (nb, cb) in b:
            if na != nb:
                continue
            if ca is None or cb is None or ca == cb:
                return f"{na}{'(' + ca + ')' if ca else ''}"
    return None


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
    cov = {}
    orders = {}

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

            cov.setdefault(x.get("act"), []).append(
                (where, x.get("provision"), claims(x.get("provision"))))

            # `order` matches the extracts tier: optional integer, unique within
            # a module, so a sequence survives a new file landing beside it.
            if "order" in x:
                if not isinstance(x["order"], int):
                    errors.append(f"{where}: order {x['order']!r} is not an integer")
                else:
                    key = (x.get("moduleId"), x["order"])
                    if key in orders:
                        errors.append(f"{where}: order {x['order']} already claimed in "
                                      f"{x.get('moduleId')} by {orders[key]}")
                    orders[key] = xid
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

    # Two pages claiming one provision. Compared per Act, after everything is
    # read, because the pair may live in different files written by different
    # people — which is precisely how it happened.
    for act, entries in cov.items():
        for i in range(len(entries)):
            for j in range(i + 1, len(entries)):
                wa, pa, ca = entries[i]
                wb, pb, cb = entries[j]
                hit = overlaps(ca, cb)
                if hit:
                    errors.append(
                        f"{wa} and {wb} both cover {act} {hit} "
                        f"({pa!r} / {pb!r}). One provision, one page.")

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
