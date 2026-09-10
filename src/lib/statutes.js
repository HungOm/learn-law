// Guided statute reading: the third tier, alongside cases and writing.
//
// The case tier teaches a reader to read a judgment. This one teaches the other
// half of the skill the course claims to build — finding a rule in the statute
// book and reading the words for yourself. Measured against a real law degree
// it is the larger gap of the two: an LLB student handles legislation daily and
// this corpus, until now, only ever told them what a section says.
//
// What this is NOT: a copy of any provision. The app holds the citation, where
// the current text is free to read, and what to look for. `tools/check-
// statutes.py` enforces that with the same 25-word quotation ceiling the case
// tier uses, and for one reason the case tier does not have:
//
//   **Legislation is amended.** A judgment is fixed on the day it is handed
//   down. A section can be substituted, renumbered or repealed between one
//   reading and the next, so an app holding its own copy of a section is
//   holding a copy that goes silently out of date — and a reader has no way to
//   tell which they are looking at. A pointer and a date can be checked. A
//   stored copy cannot.
//
// Gating matches the other two tiers: a provision opens when the lesson that
// relies on it is marked read. A section read cold teaches most people that
// legislation is impenetrable, which is untrue and is the belief this tier
// exists to remove.

// Every file in content/statutes/, not just core.json. `tools/check-statutes.py`
// globs the directory, so a batch written into stage3.json gates itself the
// moment it lands — but the app imported core.json alone, so a gated batch was
// green and invisible at the same time. Three provisions sat in that gap. The
// extract tier already solved this; the statute tier was written when there was
// one file and never revisited. Sorted by path so a batch's own order survives.
const modules = import.meta.glob('../../content/statutes/*.json', { eager: true });
const statutes = Object.keys(modules).sort()
  .flatMap((path) => modules[path].default ?? modules[path]);

export function all() {
  return statutes;
}

export function byId(id) {
  return statutes.find(x => x.id === id) || null;
}

/** Grouped by Act, in the order the entries were written. */
export function byAct() {
  const order = [];
  const groups = new Map();
  for (const x of statutes) {
    if (!groups.has(x.act)) { groups.set(x.act, []); order.push(x.act); }
    groups.get(x.act).push(x);
  }
  return order.map(act => ({ act, actId: groups.get(act)[0].actId, list: groups.get(act) }));
}

export function forModule(moduleId) {
  return statutes.filter(x => x.moduleId === moduleId);
}

/**
 * Open when the lesson that relies on it has been marked read.
 *
 * A page surfaced by `relatedForLesson` carries `via`, and that lesson opens it
 * too. The alternative is showing an equity reader a lock whose key is a lesson
 * in another module — which reads as rationing rather than sequencing, and the
 * reader has in fact already done the work this tier gates on.
 */
export function isOpen(x, read = {}) {
  return !!(x && (read[x.lessonId] || (x.via && read[x.via.lessonId])));
}

export function counts(read = {}) {
  return { open: statutes.filter(x => isOpen(x, read)).length, total: statutes.length };
}

// ---------------------------------------------------------------------------
// Related reading: the same provision, owned by another module.
//
// Ten of the twenty-four modules have no guided reading of their own, and the
// reason is not that nobody has written one. It is that every numbered
// provision those modules cite ALREADY HAS a page, sitting in whichever module
// claimed it first: `l-equity-reception`'s whole argument rests on section 3 of
// the Civil Law Act, and there is an excellent guided reading of section 3 — in
// m01, where an equity reader will never see it. `check-statutes.py` forbids a
// second page on one provision, and it is right to: two pages on section 3
// would drift apart and one of them would be wrong.
//
// So the fix is surfacing, not authoring. Nothing below invents a citation; it
// matches a page against a pointer the LESSON ITSELF already carries in its
// `reading` field, which is authored content that the content gate checks.
//
// Deliberately narrow. Matching on the Act alone puts eleven Contracts Act
// pages under a lesson about agency, which is noise rather than help — so a
// page is only surfaced when the reading's own `where` text names a provision
// the page actually covers. "section 3 — the reception provision" finds
// `st-cla-s3` and not `st-cla-s12`. "the agency provisions" names no number and
// finds nothing, which is the honest answer: this corpus has no agency page.
//
// The number parsing below duplicates a fragment of `claims()` in
// `tools/check-statutes.py` and is deliberately weaker than it. The checker
// must be exhaustive because it refuses content; this only ranks it, so a miss
// costs a reader one pointer and a false hit is prevented by requiring the
// match in both directions.
const ORDINALS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14,
};
const UNIT_NUM = /\b(?:sections?|ss?|arts?|articles?|rules?|orders?)\s*\.?\s*(\d+[A-Z]?)/gi;
const SCHEDULE = new RegExp(
  `\\b(${Object.keys(ORDINALS).join('|')}|\\d+)\\s+schedule\\b`, 'gi');

/** The provisions a piece of prose names, as comparable keys. */
function provisionKeys(text) {
  const out = new Set();
  if (!text) return out;
  for (const m of text.matchAll(UNIT_NUM)) out.add(`s${m[1]}`);
  for (const m of text.matchAll(SCHEDULE)) {
    const raw = m[1].toLowerCase();
    out.add(`sch${ORDINALS[raw] ?? raw}`);
  }
  return out;
}

function intersects(a, b) {
  for (const k of a) if (b.has(k)) return true;
  return false;
}

/**
 * Guided readings that this lesson points at but another module owns.
 *
 * Needs the loaded lesson body, not the catalogue row: `reading` lives in the
 * module chunk. Every result carries `via`, naming the lesson that reached it,
 * so the page can say why it is being shown here.
 */
export function relatedForLesson(lesson) {
  if (!lesson?.reading) return [];
  const out = new Map();
  for (const r of lesson.reading) {
    if (!r?.statuteId) continue;
    const wanted = provisionKeys(r.where);
    if (!wanted.size) continue;
    for (const x of statutes) {
      if (x.actId !== r.statuteId || x.moduleId === lesson.moduleId) continue;
      if (!intersects(wanted, provisionKeys(x.provision))) continue;
      out.set(x.id, { ...x, via: { lessonId: lesson.id, moduleId: lesson.moduleId } });
    }
  }
  return [...out.values()];
}

/**
 * Acts this module relies on whose guided readings live elsewhere, grouped.
 *
 * Module level, so it takes the Act rather than the provision: a reader opening
 * Commercial Law is better served by "the Contracts Act 1950 — eleven guided
 * readings, in Contract" than by eleven separate rows. `statuteIds` is the
 * module's own `statutes` list from books.json.
 */
export function relatedActs(moduleId, statuteIds = []) {
  return statuteIds
    .map((actId) => {
      const list = statutes.filter(x => x.actId === actId && x.moduleId !== moduleId);
      return list.length ? { actId, act: list[0].act, list } : null;
    })
    .filter(Boolean);
}
