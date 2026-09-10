// Case reading: the advanced tier.
//
// Everything else in this app teaches law at one remove — a lesson states a
// rule, a card tests it, a problem applies it. This is the one place a reader
// meets a judgment. Measured against a real law degree that is the biggest gap
// in the course: the whole corpus names about fifty cases where an LLB expects
// several hundred read in full, and the difference between learning *about* law
// and learning law is whether you have ever read a court's own words.
//
// What this is NOT: a copy of any judgment. The app holds the citation, what to
// look for, and the questions; the reader fetches the judgment itself, free
// where that is possible. `tools/check-extracts.py` enforces that — a long
// quoted run fails the build. Two reasons: a law report's text is not ours to
// republish, and a passage nobody can verify is worse than no passage at all.
//
// Gating. An extract opens when its lesson is marked read. Not to ration the
// material — anyone may read a judgment — but because a first case read with no
// doctrine behind it teaches a reader that law is impenetrable, which is both
// false and the thing most likely to stop them coming back. The lock says what
// opens it, always, and it is one lesson away.

// Every file in content/extracts/, not just core.json: the tier is written in
// batches by more than one session, and check-extracts.py already globs the
// directory, so a new file gates itself the moment it lands. Eager, because the
// index needs all of them to paint. Sorted by path so the order a batch was
// written in survives — a batch is often a sequence to be read in order.
const modules = import.meta.glob('../../content/extracts/*.json', { eager: true });
const extracts = Object.keys(modules).sort()
  .flatMap((path) => modules[path].default ?? modules[path]);

export function all() {
  return extracts;
}

export function byId(id) {
  return extracts.find(x => x.id === id) || null;
}

/**
 * Order within a module, where an entry has asked for one.
 *
 * Several of these are sequences rather than lists — Bolam, Rogers, Foo Fio Na
 * and Zulhasnimar are one argument about the standard in medical negligence,
 * made over sixty years, and read out of order they look like four cases about
 * the same thing. Before this, order fell out of the FILENAMES the batches
 * happened to be written in, which meant adding a stage5.json or renaming a file
 * silently reordered a reader's sequence with nothing on screen to say so.
 *
 * `order` is optional. Absent means unsequenced, not last in importance, so
 * those keep their existing relative order behind the ones that asked.
 */
function inReadingOrder(list) {
  const ranked = list.filter(x => Number.isInteger(x.order));
  const rest = list.filter(x => !Number.isInteger(x.order));
  return [...ranked.sort((a, b) => a.order - b.order), ...rest];
}

/** Grouped for an index page, in the module order the caller already has. */
export function byModule(moduleIds) {
  return moduleIds
    .map(id => ({ moduleId: id, list: inReadingOrder(extracts.filter(x => x.moduleId === id)) }))
    .filter(g => g.list.length);
}

/**
 * Open when the lesson it hangs off has been marked read.
 *
 * `relatedForLesson` results carry `via`, and that lesson opens them too — see
 * the reasoning on the same line in `statutes.js`.
 */
export function isOpen(x, read = {}) {
  return !!(x && (read[x.lessonId] || (x.via && read[x.via.lessonId])));
}

export function counts(read = {}) {
  const open = extracts.filter(x => isOpen(x, read)).length;
  return { open, total: extracts.length };
}

// ---------------------------------------------------------------------------
// Related reading: a case this lesson cites, extracted under another module.
//
// The statute tier's problem in the same shape — see the long note in
// `statutes.js`. A case gets exactly one guided reading, under whichever module
// claimed it, and a lesson elsewhere that relies on the same judgment currently
// shows the reader nothing. `l-citation` in Legal Research is built around a
// decision that superseded an earlier one, and that decision is read in full —
// in Property.
//
// The match is a substring of the lesson's own `source` field, which is where
// this corpus records what a lesson rests on. That is a stricter test than it
// looks: `case` values are full party names, so a hit means the lesson names
// the case, not that two strings happen to share a word. The length floor is
// there so a malformed short `case` value can never match half the corpus.
const CASE_NAME_FLOOR = 12;

/**
 * Extracts named in this lesson's `source` but owned by another module.
 *
 * Needs the loaded lesson body: `source` lives in the module chunk, not the
 * catalogue row. Results carry `via` so the page can say why they appear here.
 */
export function relatedForLesson(lesson) {
  const src = lesson?.source;
  if (!src) return [];
  return extracts
    .filter(x => x.moduleId !== lesson.moduleId
              && (x.case || '').length >= CASE_NAME_FLOOR
              && src.includes(x.case))
    .map(x => ({ ...x, via: { lessonId: lesson.id, moduleId: lesson.moduleId } }));
}
