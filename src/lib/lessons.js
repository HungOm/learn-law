// Lessons are the layer the other two rest on.
//
// A card keeps a rule available and a problem question tests whether it can be
// used, but neither of them teaches. Without exposition the app is a testing
// harness bolted to somebody else's textbook — which is a reasonable thing to
// be, and is not what the module pages were promising.
//
// The only state a lesson carries is whether it has been read. There is no
// score and no schedule: re-reading is cheap, and a spacing algorithm applied
// to prose would be inventing a measurement the app cannot make.

import { meta } from './db.js';

const KEY = 'lessonsRead';

export async function readMap() {
  return (await meta.get(KEY, null)) || {};
}

export async function markRead(id) {
  const m = await readMap();
  m[id] = new Date().toISOString();
  await meta.set(KEY, m);
  return m;
}

export async function markUnread(id) {
  const m = await readMap();
  delete m[id];
  await meta.set(KEY, m);
  return m;
}

/** The lesson a problem was written to follow, so a problem can point back. */
export function lessonForProblem(lessons, problemId) {
  return lessons.find(l => (l.prepares || []).includes(problemId)) || null;
}

/** The lesson that introduces a card, so review can say where it came from. */
export function lessonForCard(lessons, cardId) {
  return lessons.find(l => (l.plants || []).includes(cardId)) || null;
}

/** First unread lesson in curriculum order — what to read next. */
export function nextUnread(lessons, read) {
  return lessons.find(l => !read[l.id]) || null;
}

export function totalMinutes(lessons) {
  return lessons.reduce((n, l) => n + (l.minutes || 0), 0);
}
