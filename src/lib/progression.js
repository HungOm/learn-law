// Locking and unlocking.
//
// The rule is one sentence, and it has to stay one sentence or a twelve-year-old
// cannot hold it: **read the lesson you are on and pass its quiz, and the next
// one opens.** Everything you have already finished stays open forever.
//
// Two deliberate limits on how far this goes.
//
// The glossary is never locked. This app is a course and a reference at once,
// and the reader who most needs a definition is the one who has read least. A
// reference work that withholds a word until you have earned it is not a
// reference work.
//
// And a locked lesson still says what it is — its title, its module, how long it
// takes, and exactly what opens it. Hiding the body is the point; hiding the
// existence of the material would leave a reader unable to tell whether the
// thing they need is even in here.

import { meta } from './db.js';

/** Share of a lesson's quiz that counts as passing it. */
export const PASS = 0.6;

const KEY = 'unlockAll';

export async function unlockAllSetting() {
  return Boolean(await meta.get(KEY, false));
}

export function setUnlockAll(value) {
  return meta.set(KEY, Boolean(value));
}

/** How the reader has done on one lesson's quiz, as a share of its questions. */
export function quizShare(lesson, best) {
  const total = lesson.quizCount || 0;
  if (!total) return null;
  const row = best[lesson.id];
  if (!row) return 0;
  return Math.min(1, (row.correct || 0) / total);
}

export function quizPassed(lesson, best) {
  const share = quizShare(lesson, best);
  return share === null ? true : share >= PASS;
}

/**
 * A lesson is finished when it has been read AND its quiz passed.
 *
 * Marking read alone is not enough on purpose: it records that a button was
 * pressed. The quiz is the weakest test in the app, but it is a test, and it is
 * the only one that can be required without asking for forty minutes of writing.
 */
export function isComplete(lesson, read, best) {
  return Boolean(read[lesson.id]) && quizPassed(lesson, best);
}

/** What a lesson still needs before it counts as finished. */
export function missing(lesson, read, best) {
  const out = [];
  if (!read[lesson.id]) out.push('read');
  if (!quizPassed(lesson, best)) out.push('quiz');
  return out;
}

/**
 * Open/locked for every lesson, in curriculum order.
 *
 * Everything up to and including the first unfinished lesson is open — so there
 * is always exactly one frontier to work at, and never a dead end where nothing
 * can be opened.
 */
export function unlockMap(lessons, read, best, unlockAll = false) {
  const out = {};
  let reachedFrontier = false;
  let blocker = null;

  for (const l of lessons) {
    if (unlockAll || !reachedFrontier) {
      out[l.id] = { open: true, frontier: !unlockAll && !isComplete(l, read, best) };
    } else {
      out[l.id] = { open: false, blockedBy: blocker };
    }
    if (!reachedFrontier && !isComplete(l, read, best)) {
      reachedFrontier = true;
      blocker = l;
    }
  }
  return out;
}

/** The lesson to carry on with: the first unfinished one, or null if all are done. */
export function frontierLesson(lessons, read, best) {
  return lessons.find(l => !isComplete(l, read, best)) || null;
}

/** A module is open when any lesson inside it is. */
export function moduleOpen(module, unlock) {
  const list = module.lessons || [];
  if (!list.length) return true;
  return list.some(l => unlock[l.id]?.open);
}

/** Completed / total, for a ring or a bar. */
export function moduleProgress(module, read, best) {
  const list = module.lessons || [];
  const done = list.filter(l => isComplete(l, read, best)).length;
  return { done, total: list.length, pct: list.length ? done / list.length : 0 };
}

export function curriculumProgress(lessons, read, best) {
  const done = lessons.filter(l => isComplete(l, read, best)).length;
  return { done, total: lessons.length, pct: lessons.length ? done / lessons.length : 0 };
}

/** The sentence shown on a locked lesson. Names the thing that opens it. */
export function lockReason(entry) {
  if (!entry || entry.open) return null;
  const b = entry.blockedBy;
  if (!b) return 'Finish the lesson before this one to open it.';
  return `Finish “${b.title}” to open this — read it, then pass its quiz.`;
}
