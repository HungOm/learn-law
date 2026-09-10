#!/usr/bin/env python3
"""Split the lesson content into an eager catalogue and per-module bodies.

Every lesson on the site currently loads before the first paint: one 966KB
chunk, 290KB over the wire, modulepreloaded in the head. A reader who opens one
lesson pays for 55. On prepaid data, which is what this audience is on, that is
a real cost paid on every cold visit.

The split is metadata-eager, bodies-lazy:

  catalogue.json    every lesson's id, module, title, timings, section headings
                    and counts -- everything an index page renders. ~5KB gzip,
                    so first paint keeps its synchronous catalogue and gains no
                    loading state.
  module-<id>.json  the section bodies and quiz for one module. ~12KB gzip
                    median. Loaded when a reader opens something in it.

Per MODULE rather than per FILE because 15 of 16 modules have lessons spread
across several content files -- the files are grouped by authoring layer
(method, substantive, advanced), which is the right shape for writers and the
wrong shape for a reader who wants one subject. Splitting by file would make a
reader opening one contract lesson pay 51KB instead of 12KB.

Generated into src/generated/, which is gitignored: the content JSON stays the
single source of truth and these are build artefacts. `npm run dev` and
`npm run build` regenerate them first.

    python3 tools/split-content.py
"""

import json
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "generated"

# Kept in the catalogue because an index, a resume card or the section list
# renders them without needing a single block of prose. Everything else rides
# with the body chunk, because by the time it is shown the module has loaded
# anyway. Measured: carrying `verify`, `source`, `reading`, `plateCaption` and
# the section `anchor` eagerly cost 19KB gzip on every cold visit and none of
# them is rendered before a module loads.
LESSON_META = ["id", "moduleId", "title", "minutes", "readMinutes", "summary",
               "plate", "plants", "prepares"]
SECTION_META = ["id", "h", "readMinutes", "keypoint"]


# The teaching order, and it is NOT alphabetical. `sorted(glob())` put
# company law first and `method-advanced` before `method`, which is what the
# original comment in content.js warned about: the sequence within a module is
# pedagogical and is not derivable from any field on a lesson or from its
# filename. It has to be written down, and this is where it is written down.
#
# On-ramp files come before the lessons they lead into, within each area.
LESSON_FILE_ORDER = [
    "gap-method-reasoning.json",
    "method.json",
    "method-advanced.json",
    "gap-procedure-property.json",
    "gap-company-evidence-civil.json",
    "substantive.json",
    "substantive-advanced.json",
    # Stage 1 of docs/LLB-ROADMAP.md: the core subjects the curriculum was
    # missing. They sit after the advanced substantive layer because they
    # assume it — trusts leans on property, and the reception lesson assumes a
    # reader already knows what a common law system is.
    "equity.json",
    "personal-law.json",
    "commercial-work.json",
    "theory-practice.json",
]


def lesson_files():
    """Ordered lesson files, with any unlisted file appended and reported."""
    found = {p.name: p for p in (ROOT / "content/lessons").glob("*.json")}
    out = [found.pop(n) for n in LESSON_FILE_ORDER if n in found]
    for name in sorted(found):
        print(f"  ! {name} is not in LESSON_FILE_ORDER — appended at the end; "
              f"add it to the list to place it deliberately")
        out.append(found[name])
    return out


def main():
    lessons = []
    for path in lesson_files():
        lessons.extend(json.loads(path.read_text(encoding="utf-8")).get("lessons", []))

    catalogue, bodies = [], {}
    for l in lessons:
        meta = {k: l[k] for k in LESSON_META if k in l}
        meta["sections"] = [{k: s[k] for k in SECTION_META if k in s}
                            for s in l.get("sections") or []]
        meta["quizCount"] = len(l.get("quiz") or [])
        catalogue.append(meta)

        # Everything the catalogue left behind, which is what the note above
        # promised and what this did not do. It carried exactly three keys, so
        # `reading`, `source`, `verify` and `plateCaption` were dropped from the
        # catalogue for weight and then never added to the chunk — they reached
        # no reader at all. The visible symptom was that "Read alongside" never
        # rendered on any of the 53 lessons that carry a reading assignment,
        # because `l.reading` was undefined at runtime however carefully the
        # content was authored. Nothing gates this: every checker reads
        # content/lessons/*.json, where the field is present and correct.
        #
        # Cost of carrying them here is nil in the terms the note cares about:
        # the chunk is fetched when the lesson opens, and these fields are text
        # measured in bytes against sections measured in tens of kilobytes.
        body = {k: v for k, v in l.items() if k not in ("sections", "quiz")}
        body["sections"] = l.get("sections") or []
        body["quiz"] = l.get("quiz") or []
        bodies.setdefault(l["moduleId"], []).append(body)

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    (OUT / "catalogue.json").write_text(
        json.dumps(catalogue, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for module_id, rows in bodies.items():
        (OUT / f"module-{module_id}.json").write_text(
            json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    cat_kb = (OUT / "catalogue.json").stat().st_size / 1024
    sizes = sorted((OUT / f"module-{m}.json").stat().st_size / 1024 for m in bodies)
    print(f"catalogue {cat_kb:.0f}KB raw, {len(bodies)} module chunks "
          f"{sizes[0]:.0f}-{sizes[-1]:.0f}KB raw (median {sizes[len(sizes)//2]:.0f}KB)")
    print(f"{len(catalogue)} lessons, "
          f"{sum(len(m['sections']) for rows in bodies.values() for m in rows)} sections")
    return 0


if __name__ == "__main__":
    sys.exit(main())
