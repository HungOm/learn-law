#!/usr/bin/env python3
"""Check the content JSON before it reaches the browser.

The app has no build step, so nothing stands between a hand-edited JSON file and
the page. These are the errors that would otherwise be silent:

  * a reused card id, which the README warns about because review history is
    keyed to it — the new card inherits the old card's schedule;
  * a rubric whose marks do not sum to the problem's stated total, so the
    marking screen shows a score out of a denominator nobody can reach;
  * a card or problem pointing at a module that does not exist, which drops it
    out of every list without an error;
  * a problem with no `verify` line, which is the app asserting an authority it
    has not earned;
  * a card that no lesson introduces, or a problem no lesson prepares you for —
    content reachable only by someone who already knew it was there;
  * a quiz question whose `answer` index does not point at an option, which
    would mark a right answer wrong every time it was asked;
  * quiz answers bunched on one option position — every one of the first 286
    questions written had its answer first, which lets a learner score full
    marks without reading the question and costs them the retrieval practice;
  * raw HTML in lesson prose, which the renderer escapes and prints literally.

Run it after editing anything under content/:

    python3 tools/check-content.py
"""

import collections
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BANDS = {"issue", "rule", "application", "method", "conclusion"}
PROBLEM_FIELDS = ["id", "moduleId", "title", "kind", "minutes", "marks", "scenario",
                  "task", "rubric", "modelAnswer", "source", "lastVerified", "verify"]
LESSON_FIELDS = ["id", "moduleId", "title", "minutes", "summary", "sections",
                 "source", "lastVerified", "verify"]
PROSE_BLOCKS = {"p", "rule", "example", "caution", "list",
          # Visual blocks. Prose blocks carry `text`; these carry structure, so
          # each is checked for the fields its renderer actually reads.
          "chart", "table", "diagram", "steps", "compare",
          # Interactive blocks: the reader answers before reading on.
          "predict", "checkpoint"}
FIGURE_BLOCKS = {"table", "chart", "diagram", "figure", "steps", "compare"}
BLOCKS = PROSE_BLOCKS | FIGURE_BLOCKS
DIAGRAM_KINDS = {"hierarchy", "flow", "branch", "timeline", "matrix", "stack", "spectrum"}
CHART_KINDS = {"bar", "stack"}
QUIZ_FIELDS = ["id", "q", "options", "answer", "why"]
HTML = re.compile(r"<[a-zA-Z/][^>]{0,20}>")
CARD_FIELDS = ["id", "moduleId", "type", "front", "back", "source"]


def check_visual(where, b):
    """Field checks for the visual block types.

    These carry structure rather than a `text` string, so the prose checks above
    cannot see inside them. The two that matter most are a table row with the
    wrong number of cells — which silently shifts every value into the wrong
    column — and a diagram with no `alt`, which is simply invisible to a reader
    using a screen reader.
    """
    t = b.get("t")
    out = []
    if t == "table":
        cols = b.get("columns") or []
        if not cols:
            out.append(f"{where}: a table has no columns")
        for i, row in enumerate(b.get("rows") or []):
            if not isinstance(row, list):
                out.append(f"{where}: table row {i} is not a list")
            elif cols and len(row) != len(cols):
                out.append(f"{where}: table row {i} has {len(row)} cells but "
                           f"there are {len(cols)} columns")
    elif t == "chart":
        if not b.get("kind"):
            out.append(f"{where}: a chart has no kind")
        data = b.get("data") or []
        if not data:
            out.append(f"{where}: a chart has no data")
        for d in data:
            if not isinstance(d, dict) or d.get("label") is None or d.get("value") is None:
                out.append(f"{where}: a chart datum is missing label or value")
        if not b.get("caption"):
            out.append(f"{where}: a chart has no caption saying what it shows")
        # The one rule this app cannot bend: a chart is the most authoritative-
        # looking thing on a page, and one drawn over unsourced numbers is a
        # claim it has not earned.
        if not b.get("source"):
            out.append(f"{where}: a chart plots figures and must name where they come from")
    elif t == "diagram":
        # Each kind carries its own payload key; what they share is that a
        # diagram with no alt text does not exist for a screen reader, and this
        # audience includes people who will use one.
        payloads = {"stack": "layers", "branch": "branches", "hierarchy": "rows",
                    "flow": "steps", "timeline": "events", "matrix": "cells",
                    "spectrum": "marks"}
        if not b.get("alt"):
            out.append(f"{where}: a diagram has no alt text")
        kind = b.get("kind")
        if kind not in payloads:
            out.append(f"{where}: diagram kind {kind!r} is not one of "
                       f"{sorted(payloads)}")
        elif not b.get(payloads[kind]):
            out.append(f"{where}: a {kind} diagram has no `{payloads[kind]}`")
    elif t == "figure":
        # A lesson naming a plate nobody drew falls back to a generic one
        # silently, which is the quiet kind of wrong this file exists to catch.
        if SCENES and b.get("scene") not in SCENES:
            out.append(f"{where}: figure names plate {b.get('scene')!r}, which does not exist")
    elif t == "steps":
        for it in b.get("items") or []:
            if not isinstance(it, dict) or not it.get("h") or not it.get("text"):
                out.append(f"{where}: a steps item is missing h or text")
    elif t == "predict":
        # A prediction with no reveal teaches nothing: the whole mechanism is
        # attempt-then-explanation, and without the second half it is a quiz
        # question with no feedback.
        if not b.get("prompt"):
            out.append(f"{where}: a predict block has no prompt")
        if not b.get("reveal"):
            out.append(f"{where}: a predict block has no reveal — the answer to "
                       f"a prediction is the point of making it")
        opts = b.get("options")
        if opts is not None:
            if len(opts) < 2:
                out.append(f"{where}: a predict block with options needs at least two")
            elif len(set(opts)) != len(opts):
                out.append(f"{where}: a predict block has duplicate options")
            a = b.get("answer")
            if not isinstance(a, int) or not 0 <= a < len(opts):
                out.append(f"{where}: predict answer {a!r} does not point at an option")
    elif t == "checkpoint":
        for f in ("q", "why"):
            if not b.get(f):
                out.append(f"{where}: a checkpoint block has no {f}")
        opts = b.get("options") or []
        if len(opts) < 2:
            out.append(f"{where}: a checkpoint needs at least two options")
        elif len(set(opts)) != len(opts):
            out.append(f"{where}: a checkpoint has duplicate options")
        a = b.get("answer")
        if not isinstance(a, int) or not 0 <= a < len(opts):
            out.append(f"{where}: checkpoint answer {a!r} does not point at an option")
    elif t == "compare":
        for side in ("left", "right"):
            col = b.get(side)
            if not isinstance(col, dict) or not col.get("h") or not col.get("items"):
                out.append(f"{where}: compare/{side} is missing h or items")
    return out


def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def scene_keys():
    """The plate scenes the app can actually draw, read from the source.

    A lesson naming a plate nobody drew falls back to a generic one silently,
    which is exactly the kind of quiet wrong-looking-right this file is for.
    """
    keys = set()
    for name in ("scenes.jsx", "scenes2.jsx"):
        path = ROOT / "src/components/plates" / name
        if path.exists():
            keys |= set(re.findall(r"scene\('([a-z0-9-]+)'", path.read_text(encoding="utf-8")))
    return keys


SCENES = scene_keys()


def check_reading(lessons, books, errors):
    """Every reading pointer must name a text that exists.

    This gate exists because the reading assignments spent the project's whole
    life authored correctly and rendering nowhere: the splitter dropped the
    field, and every checker read the source JSON where it was present and
    fine. A reference that resolves in content/ and not in the app is the shape
    to watch for, so this checks the ids against the same books.json the app
    indexes, and the smoke gate checks that the block reaches the page.
    """
    known = {b["id"] for b in books.get("books", [])} | {s["id"] for s in books.get("statutes", [])}
    for l in lessons:
        for i, r in enumerate(l.get("reading") or []):
            ref = r.get("bookId") or r.get("statuteId")
            if not ref:
                errors.append(f"{l['id']}  reading[{i}] names neither a bookId nor a statuteId")
            elif ref not in known:
                errors.append(f"{l['id']}  reading[{i}] points at `{ref}`, which is not in books.json")
            if not (r.get("where") or "").strip():
                errors.append(f"{l['id']}  reading[{i}] has no `where` — a text with no pointer is a bibliography")


def main():
    errors = []
    books = load("content/books.json")
    modules = {m["id"] for m in books["modules"]}

    seen = {}
    cards = 0
    for path in sorted((ROOT / "content/cards").glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        types = set(doc.get("cardTypes", {}))
        for c in doc.get("cards", []):
            cards += 1
            where = f"{path.name}:{c.get('id', '?')}"
            for f in CARD_FIELDS:
                if not c.get(f):
                    errors.append(f"{where}: missing {f}")
            if c["id"] in seen:
                errors.append(f"{where}: id already used in {seen[c['id']]} — "
                              f"review history is keyed to it")
            seen[c["id"]] = path.name
            if c.get("moduleId") not in modules:
                errors.append(f"{where}: unknown module {c.get('moduleId')}")
            if types and c.get("type") not in types:
                errors.append(f"{where}: type {c.get('type')!r} is not in cardTypes")

    problems = 0
    for path in sorted((ROOT / "content/problems").glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        for p in doc.get("problems", []):
            problems += 1
            where = f"{path.name}:{p.get('id', '?')}"
            for f in PROBLEM_FIELDS:
                if not p.get(f):
                    errors.append(f"{where}: missing {f}")
            if p["id"] in seen:
                errors.append(f"{where}: id already used in {seen[p['id']]}")
            seen[p["id"]] = path.name
            if p.get("moduleId") not in modules:
                errors.append(f"{where}: unknown module {p.get('moduleId')}")

            rubric = p.get("rubric") or []
            total = sum(r.get("marks", 0) for r in rubric)
            if total != p.get("marks"):
                errors.append(f"{where}: rubric sums to {total}, `marks` says {p.get('marks')}")
            rids = [r.get("id") for r in rubric]
            if len(set(rids)) != len(rids):
                errors.append(f"{where}: duplicate rubric ids")
            for r in rubric:
                if r.get("band") not in BANDS:
                    errors.append(f"{where}/{r.get('id')}: band {r.get('band')!r} "
                                  f"is not one of {sorted(BANDS)}")
                for f in ("criterion", "authority", "marks"):
                    if not r.get(f):
                        errors.append(f"{where}/{r.get('id')}: missing {f}")
            for b in p.get("modelAnswer") or []:
                if not b.get("h") or not b.get("p"):
                    errors.append(f"{where}: a model answer block is missing `h` or `p`")

    lessons = 0
    planted, prepared, quiz_seen, section_seen = {}, {}, {}, {}
    for path in sorted((ROOT / "content/lessons").glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        for l in doc.get("lessons", []):
            lessons += 1
            where = f"{path.name}:{l.get('id', '?')}"
            if l.get("plate") and SCENES and l["plate"] not in SCENES:
                errors.append(f"{where}: plate {l['plate']!r} is not a scene that exists")
            if l.get("plate") and not l.get("plateCaption"):
                errors.append(f"{where}: has a plate with no caption saying what it shows")
            for f in LESSON_FIELDS:
                if not l.get(f):
                    errors.append(f"{where}: missing {f}")
            if l["id"] in seen:
                errors.append(f"{where}: id already used in {seen[l['id']]}")
            seen[l["id"]] = path.name
            if l.get("moduleId") not in modules:
                errors.append(f"{where}: unknown module {l.get('moduleId')}")
            for sec in l.get("sections") or []:
                if not sec.get("h") or not sec.get("body"):
                    errors.append(f"{where}: a section is missing `h` or `body`")
                # Section progress is keyed to this id. A missing one loses a
                # reader's place; a reused one credits them with a section they
                # never read. The trailing number is a mint-time ordinal, not a
                # position, so a section inserted later takes a fresh number and
                # nothing renumbers.
                sid = sec.get("id")
                if not sid:
                    errors.append(f"{where}: a section has no id")
                elif sid in section_seen:
                    errors.append(f"{where}/{sid}: section id already used in "
                                  f"{section_seen[sid]}")
                else:
                    section_seen[sid] = l["id"]
                if sid and not sid.startswith(f"sec-{l['id']}-"):
                    errors.append(f"{where}/{sid}: section id does not belong to this lesson")
                rm = sec.get("readMinutes")
                if not isinstance(rm, int) or not 1 <= rm <= 8:
                    errors.append(f"{where}: `readMinutes` {rm!r} is not a whole number of "
                                  f"minutes between 1 and 8")
                kp = (sec.get("keypoint") or "").strip()
                if not kp:
                    errors.append(f"{where}: a section has no `keypoint` — the resume card "
                                  f"has nothing to say")
                elif kp.lower() == (sec.get("h") or "").strip().lower():
                    errors.append(f"{where}: a `keypoint` merely repeats its heading")
                elif not 20 <= len(kp) <= 160:
                    errors.append(f"{where}: a `keypoint` is {len(kp)} characters; it should be "
                                  f"one line, roughly 20-160")
                for b in sec.get("body") or []:
                    if b.get("t") not in BLOCKS:
                        errors.append(f"{where}: block type {b.get('t')!r} "
                                      f"is not one of {sorted(BLOCKS)}")
                    if b.get("t") == "rule" and not b.get("source"):
                        errors.append(f"{where}: a rule block states a rule with no source")
                    errors.extend(check_visual(where, b))
            quiz = l.get("quiz") or []
            qids = [x.get("id") for x in quiz]
            if len(set(qids)) != len(qids):
                errors.append(f"{where}: duplicate quiz question ids")
            # Across the whole site, not just within the lesson. Two authors
            # both reached for `qcv` -- one for caveats, one for civil procedure
            # -- and nothing caught it. Harmless in today's lesson-scoped
            # screens, but it silently merges two different questions the moment
            # anything keys per-question state on the id.
            for qid in qids:
                if qid in quiz_seen:
                    errors.append(f"{where}/{qid}: quiz id already used in "
                                  f"{quiz_seen[qid]}")
                quiz_seen[qid] = l["id"]
            for x in quiz:
                qwhere = f"{where}/{x.get('id', '?')}"
                for f in QUIZ_FIELDS:
                    if x.get(f) in (None, "", []):
                        errors.append(f"{qwhere}: missing {f}")
                opts = x.get("options") or []
                if len(opts) < 2:
                    errors.append(f"{qwhere}: needs at least two options")
                if len(set(opts)) != len(opts):
                    errors.append(f"{qwhere}: duplicate options")
                ans = x.get("answer")
                if not isinstance(ans, int) or not 0 <= ans < len(opts):
                    errors.append(f"{qwhere}: answer {ans!r} does not point at an option")
            for cid in l.get("plants") or []:
                planted.setdefault(cid, []).append(l["id"])
            for pid in l.get("prepares") or []:
                prepared.setdefault(pid, []).append(l["id"])
            # A reading is a book OR a piece of primary law. For a lesson whose
            # subject is a provision, the provision is the reading and a
            # commentary on it is the second-best thing — so `statuteId` is a
            # first-class pointer here, not a special case.
            for r in l.get("reading") or []:
                if r.get("statuteId"):
                    if r["statuteId"] not in {x["id"] for x in books["statutes"]}:
                        errors.append(f"{where}: unknown statute {r['statuteId']}")
                elif r.get("bookId") not in {b["id"] for b in books["books"]}:
                    errors.append(f"{where}: unknown book {r.get('bookId')}")

    # --- curriculum order -------------------------------------------------
    # The teaching order is declared in split-content.py, not derived from
    # filenames. It regressed once to alphabetical, which put company law first
    # and `method-advanced` before `method`; every gate stayed green because
    # none of them asserted on order. This is that assertion.
    gen = ROOT / "tools/split-content.py"
    if gen.exists():
        src = gen.read_text(encoding="utf-8")
        m = re.search(r"LESSON_FILE_ORDER = \[(.*?)\]", src, re.S)
        if not m:
            errors.append("split-content.py: LESSON_FILE_ORDER is gone — lesson order would "
                          "fall back to whatever glob returns, which is alphabetical")
        else:
            declared = re.findall(r'"([^"]+\.json)"', m.group(1))
            on_disk = sorted(p.name for p in (ROOT / "content/lessons").glob("*.json"))
            for name in on_disk:
                if name not in declared:
                    errors.append(f"content/lessons/{name}: not placed in LESSON_FILE_ORDER in "
                                  f"split-content.py — a lesson file's position in the "
                                  f"curriculum has to be chosen, not sorted")
            for name in declared:
                if name not in on_disk:
                    errors.append(f"split-content.py: LESSON_FILE_ORDER names {name}, "
                                  f"which does not exist")

    # The first lesson a new reader is given must teach them how to study. That
    # is the whole reason the method module has no level number.
    cat_path = ROOT / "src/generated/catalogue.json"
    if cat_path.exists():
        gencat = json.loads(cat_path.read_text(encoding="utf-8"))
        if gencat and gencat[0].get("moduleId") != "m-study-method":
            errors.append(f"generated catalogue starts at {gencat[0].get('id')!r} in module "
                          f"{gencat[0].get('moduleId')!r} — the curriculum must open on the "
                          f"study-method module")

    # --- the glossary ---------------------------------------------------
    # Aliases are matched against lesson prose by the auto-linker, so a duplicate
    # alias means one of the two terms silently never links.
    gpath = ROOT / "content/glossary.json"
    if gpath.exists():
        gdoc = json.loads(gpath.read_text(encoding="utf-8"))
        kinds = set(gdoc.get("kinds", {}))
        term_ids, owner = set(), {}
        for t in gdoc.get("terms", []):
            tid = t.get("id", "?")
            where = f"glossary.json:{tid}"
            for f in ("id", "term", "kind", "gloss", "intermediate", "advanced", "source"):
                if not t.get(f):
                    errors.append(f"{where}: missing {f}")
            # `see` must EXIST, even when empty. Glossary.jsx reads `t.see.length`
            # with no guard, so a term without the key crashes the glossary route
            # — and, because the crash unmounts the app, every route walked after
            # it. This rule was written after exactly that: two terms were added
            # without `see`, the checker read it as `t.get("see") or []` and
            # passed, and the page was blank. A validator more forgiving than its
            # renderer is not a validator of the renderer.
            if "see" not in t:
                errors.append(f"{where}: no `see` key — Glossary.jsx reads it "
                              f"unguarded, so the page crashes. Use [] for none.")
            if tid in term_ids:
                errors.append(f"{where}: duplicate term id")
            term_ids.add(tid)
            if kinds and t.get("kind") not in kinds:
                errors.append(f"{where}: kind {t.get('kind')!r} is not one of {sorted(kinds)}")
            if t.get("term") and t["term"] not in (t.get("aliases") or []):
                errors.append(f"{where}: the term itself is not among its aliases, so it will not link")
            for a in t.get("aliases") or []:
                k = a.lower()
                if k in owner and owner[k] != tid:
                    errors.append(f"{where}: alias {a!r} is also claimed by {owner[k]} — "
                                  f"one of the two will never link")
                owner[k] = tid
        for t in gdoc.get("terms", []):
            for ref in t.get("see") or []:
                if ref not in term_ids:
                    errors.append(f"glossary.json:{t.get('id')}: sees {ref!r}, which is not a term")

    # Lesson prose is rendered as text with a two-token inline markup (**strong**
    # and *emphasis*). HTML in it is escaped and printed literally, so a pasted
    # <b> tag is a visible defect rather than bold text.
    for path in sorted((ROOT / "content").rglob("*.json")):
        text = path.read_text(encoding="utf-8")
        for tag in sorted(set(HTML.findall(text))):
            errors.append(f"{path.name}: contains raw HTML {tag} — use **strong** or *emphasis*")

    # Reachability. A card nothing teaches, or a problem nothing sets up, is
    # content that only somebody who already knew about it would ever find.
    for path in sorted((ROOT / "content/cards").glob("*.json")):
        for c in json.loads(path.read_text(encoding="utf-8")).get("cards", []):
            if c["id"] not in planted:
                errors.append(f"{c['id']}: no lesson plants this card")
            elif len(planted[c["id"]]) > 1:
                errors.append(f"{c['id']}: planted by {len(planted[c['id']])} lessons "
                              f"({', '.join(planted[c['id']])})")
    for path in sorted((ROOT / "content/problems").glob("*.json")):
        for pr in json.loads(path.read_text(encoding="utf-8")).get("problems", []):
            if pr["id"] not in prepared:
                errors.append(f"{pr['id']}: no lesson prepares this problem")
    for cid in planted:
        if cid not in seen:
            errors.append(f"a lesson plants {cid}, which is not a card")
    for pid in prepared:
        if pid not in seen:
            errors.append(f"a lesson prepares {pid}, which is not a problem")

    for m in books["modules"]:
        for ref in m.get("primary", []) + m.get("reference", []):
            if ref not in {b["id"] for b in books["books"]}:
                errors.append(f"books.json:{m['id']}: unknown book {ref}")
        for ref in m.get("statutes", []):
            if ref not in {s["id"] for s in books["statutes"]}:
                errors.append(f"books.json:{m['id']}: unknown statute {ref}")

    # Answer position. Not a schema error, but a defect that silently destroys
    # what the quiz is for. `python3 tools/balance-quiz.py` fixes it.
    positions = collections.Counter()
    for path in sorted((ROOT / "content/lessons").glob("*.json")):
        for l in json.loads(path.read_text(encoding="utf-8")).get("lessons", []):
            for x in l.get("quiz") or []:
                if isinstance(x.get("answer"), int):
                    positions[x["answer"]] += 1
    placed = sum(positions.values())
    if placed >= 20:
        worst, count = positions.most_common(1)[0]
        if count / placed > 0.45:
            errors.append(
                f"quiz answers: {100 * count / placed:.0f}% sit at option "
                f"[{worst}] ({count} of {placed}) — a learner can score without "
                f"reading. Run: python3 tools/balance-quiz.py")

    quiz_total = sum(
        len(l.get("quiz") or [])
        for path in sorted((ROOT / "content/lessons").glob("*.json"))
        for l in json.loads(path.read_text(encoding="utf-8")).get("lessons", [])
    )
    gterms = len(json.loads((ROOT / "content/glossary.json").read_text(encoding="utf-8"))["terms"]) \
        if (ROOT / "content/glossary.json").exists() else 0

    all_lessons = [
        l
        for path in sorted((ROOT / "content/lessons").glob("*.json"))
        for l in json.loads(path.read_text(encoding="utf-8")).get("lessons", [])
    ]
    check_reading(all_lessons, books, errors)
    with_reading = sum(1 for l in all_lessons if l.get("reading"))
    print(f"{len(section_seen)} sections, "
          f"{lessons} lessons, {cards} cards, {problems} problems, "
          f"{quiz_total} quiz questions, {gterms} glossary terms, {len(modules)} modules")
    print(f"{with_reading} of {len(all_lessons)} lessons carry a reading assignment")
    if errors:
        print(f"\n{len(errors)} problem{'' if len(errors) == 1 else 's'}:")
        for e in errors:
            print(f"  {e}")
        return 1
    print("content is consistent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
