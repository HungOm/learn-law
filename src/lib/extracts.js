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

import extracts from '../../content/extracts/core.json';

export function all() {
  return extracts;
}

export function byId(id) {
  return extracts.find(x => x.id === id) || null;
}

/** Grouped for an index page, in the module order the caller already has. */
export function byModule(moduleIds) {
  return moduleIds
    .map(id => ({ moduleId: id, list: extracts.filter(x => x.moduleId === id) }))
    .filter(g => g.list.length);
}

/** Open when the lesson it hangs off has been marked read. */
export function isOpen(x, read = {}) {
  return !!(x && read[x.lessonId]);
}

export function counts(read = {}) {
  const open = extracts.filter(x => isOpen(x, read)).length;
  return { open, total: extracts.length };
}
