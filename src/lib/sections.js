// Section progress: the smallest unit of work the app is willing to remember.
//
// A lesson has always been all-or-nothing. You had read it or you had not, and
// the only way to be credited was to reach the end. That is the wrong grain for
// this reader. Measured at 120 words a minute — deliberately slow, for someone
// reading law who may not be reading in a first language — the median lesson is
// 876 words, about eight minutes, and **317 of the 320 sections are three
// minutes or under**. The material was never too long. What was missing is that
// somebody with seven minutes on a bus had no way to spend them that the app
// would remember.
//
// So progress is kept per section. Three consequences, in order of how much
// they matter:
//
//   * a reader can stop mid-lesson and be told exactly where they stopped;
//   * "what can I do in the next N minutes" becomes answerable, because every
//     section carries an honest `readMinutes`;
//   * a lesson's read state stops being a claim about attention span.
//
// What this deliberately is NOT: a schedule, a score, or a measurement of
// knowing anything. `lessons.js` refuses to apply spaced repetition to prose
// because that would invent a measurement the app cannot make, and the same
// refusal applies here. Marking a section read says a reader scrolled past it
// and said so. Nothing more.
//
// Progress is keyed to the section `id` — never to its position. A section
// inserted above another would otherwise silently credit a reader with a
// section they never read, which is the same defect the content checker refuses
// for card ids, for the same reason.

import { meta } from './db.js';

const KEY = 'sectionsRead';

export async function readMap() {
  return (await meta.get(KEY, null)) || {};
}

export async function markRead(sectionId) {
  const m = await readMap();
  m[sectionId] = new Date().toISOString();
  await meta.set(KEY, m);
  return m;
}

export async function markUnread(sectionId) {
  const m = await readMap();
  delete m[sectionId];
  await meta.set(KEY, m);
  return m;
}

/** How far through one lesson a reader is. */
export function progressOf(lesson, read) {
  const sections = lesson?.sections || [];
  if (!sections.length) return { done: 0, total: 0, pct: 0, minutesLeft: 0, next: null };
  const done = sections.filter(s => read[s.id]).length;
  const next = sections.find(s => !read[s.id]) || null;
  return {
    done,
    total: sections.length,
    pct: Math.round((done / sections.length) * 100),
    minutesLeft: sections.filter(s => !read[s.id])
      .reduce((n, s) => n + (s.readMinutes || 0), 0),
    next,
  };
}

/**
 * Where the reader stopped, across the whole curriculum.
 *
 * A lesson counts as in progress only if it is genuinely part-done: opening the
 * first section and leaving is not somewhere to be sent back to, and neither is
 * a lesson that is finished.
 */
export function resumePoint(lessons, read) {
  for (const l of lessons) {
    const p = progressOf(l, read);
    if (p.done > 0 && p.done < p.total) return { lesson: l, ...p };
  }
  return null;
}

/**
 * What fits in the time the reader actually has.
 *
 * Returns whole sections in curriculum order whose `readMinutes` sum to no more
 * than `minutes`. It will return one section that overruns rather than nothing
 * at all: a reader who says five minutes and is offered an empty screen has
 * been told the app cannot help them, which is worse than a slight overrun.
 */
export function fitsIn(lessons, read, minutes) {
  const out = [];
  let spent = 0;
  for (const l of lessons) {
    for (const s of l.sections || []) {
      if (read[s.id]) continue;
      const cost = s.readMinutes || 0;
      if (spent && spent + cost > minutes) return out;
      out.push({ lesson: l, section: s });
      spent += cost;
      if (spent >= minutes) return out;
    }
  }
  return out;
}

/** Sections read per day, for a streak or a chart. Counts, not claims. */
export function readByDay(read) {
  const days = {};
  for (const at of Object.values(read)) {
    const day = String(at).slice(0, 10);
    days[day] = (days[day] || 0) + 1;
  }
  return days;
}
