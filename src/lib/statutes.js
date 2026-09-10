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

import statutes from '../../content/statutes/core.json';

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

/** Open when the lesson that relies on it has been marked read. */
export function isOpen(x, read = {}) {
  return !!(x && read[x.lessonId]);
}

export function counts(read = {}) {
  return { open: statutes.filter(x => isOpen(x, read)).length, total: statutes.length };
}
