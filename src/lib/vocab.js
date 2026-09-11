// Scheduled vocabulary: the glossary, remembered rather than merely looked up.
//
// The glossary has always been a lookup. 499 terms, three tiers of explanation
// each, and nothing that ever brings one back. A reader who looks up *estoppel*
// on three separate days looks it up cold three times, and the app — which owns
// a working spaced-repetition scheduler — never notices they do not know it.
//
// This points that scheduler at the glossary. The reasoning is in
// `docs/ENGLISH-SUPPORT.md`; the short version is that a great many people
// studying Malaysian law are not reading in a first language, comprehension
// tracks the proportion of words a reader already knows, and the glossary is
// this corpus's domain vocabulary list.
//
// THREE DESIGN DECISIONS, each of which could reasonably have gone the other
// way, recorded because the reasons are not recoverable from the code:
//
// 1. **A term enters the schedule when it is looked up, not in bulk.** Seeding
//    all 499 would hand a reader a 499-item backlog they never asked for, and
//    would say nothing about what they personally find hard. A lookup is the
//    one honest signal of not-knowing this app can collect without asking.
//
// 2. **Its own store, not `cardState` with a `kind` field.** `buildQueue`,
//    `counts` and `countsByModule` in scheduler.js each scan the whole of
//    `cardState` unfiltered, so sharing would silently change every number the
//    app shows about legal cards. See the note at `DB_VERSION` in db.js.
//
// 3. **The same FSRS engine, not a second scheduler.** `serialise` and
//    `deserialise` are imported from scheduler.js rather than reimplemented, so
//    a term's state cannot drift into a different shape from a card's.
//
// What this deliberately does NOT do: measure whether anyone knows any law.
// `lessons.js` refuses to apply spaced repetition to prose because that would
// invent a measurement the app cannot make. A term is a word and its meaning —
// which is exactly the thing recall testing is good for — and that is the whole
// of the claim being made here.

import { termState, reviewLog } from './db.js';
import {
  engine, RATING, RATING_LABELS, State,
  serialise, deserialise, humanInterval,
} from './scheduler.js';
import { createEmptyCard } from '../../vendor/ts-fsrs.mjs';

/** Fresh FSRS state for a term met for the first time. */
export function newTermState(termId, now = new Date()) {
  return { id: termId, ...serialise(createEmptyCard(now)) };
}

// A reader hovering a term, moving away and hovering back is one act of not
// knowing it, not two. Repeat opens inside this window are ignored, so the
// caller — `Term.jsx` — does not have to guard against it and the schedule is
// not distorted by a mouse.
const DEDUPE_MS = 60_000;
const recent = new Map();

/**
 * Record that a reader looked a term up. Fire-and-forget.
 *
 * Deliberately swallows its own errors and returns nothing. A failed write to
 * a study-aid scheduler must never break a definition popover: the reader's
 * question was "what does this word mean", and they are entitled to an answer
 * whether or not IndexedDB is available. A term that fails to enrol is simply
 * not scheduled, which is the state it was already in.
 */
export function recordLookup(termId) {
  if (!termId) return;
  const now = Date.now();
  const last = recent.get(termId);
  if (last && now - last < DEDUPE_MS) return;
  recent.set(termId, now);

  (async () => {
    try {
      const existing = await termState.get(termId);
      if (existing) {
        // Already scheduled. The lookup itself is evidence, but it is NOT a
        // grade: grading here would let a reader who looks a word up while
        // reading push its interval around without ever being tested, which
        // is the opposite of retrieval practice. Count it and leave the
        // schedule alone.
        await termState.put({
          ...existing,
          lookups: (existing.lookups || 0) + 1,
          lastLookup: new Date().toISOString(),
        });
        return;
      }
      await termState.put({
        ...newTermState(termId),
        lookups: 1,
        lastLookup: new Date().toISOString(),
      });
    } catch {
      // Intentionally silent — see the note above.
    }
  })();
}

// ENGINE DEPENDENCY, worth knowing before calling these from anywhere new.
// `preview` and `grade` call `engine()`, which throws until `scheduler.init()`
// has run. In the app that is safe by construction: StudyProvider awaits
// `sched.init()` before it ever sets `ready`, and every route renders behind
// that gate. `recordLookup` deliberately does NOT need the engine — it builds
// fresh state with `createEmptyCard` directly — so a lookup is recorded even
// if it somehow fires before init, which matters because the lookup is the
// signal this whole feature is built on and losing one is losing data.

/** Terms the reader has met, due now, oldest first. */
export async function due(limit = 20, now = new Date()) {
  const all = await termState.all();
  return all
    .filter(v => new Date(v.due) <= now)
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, limit);
}

/** What each button would do, so the UI can show the next interval. */
export function preview(row, now = new Date()) {
  const scheduling = engine().repeat(deserialise(row), now);
  const out = {};
  for (const { key, rating } of RATING_LABELS) {
    out[key] = { interval: humanInterval(scheduling[rating].card.due, now) };
  }
  return out;
}

/**
 * Apply a grade to a term, and log it.
 *
 * The log rows carry `termId` rather than `cardId`, so anything reading
 * `reviewLog` for card statistics can tell the two apart. They share a store
 * because the log is append-only history of "a thing was reviewed", and
 * splitting it would mean two histories to keep and two to back up.
 */
export async function grade(row, ratingKey, now = new Date()) {
  const result = engine().next(deserialise(row), now, RATING[ratingKey]);
  const next = { ...row, ...serialise(result.card) };
  await termState.put(next);
  try {
    await reviewLog.add({
      termId: row.id,
      rating: RATING[ratingKey],
      ratingKey,
      reviewedAt: now.toISOString(),
      state: result.log.state,
      stabilityAfter: result.card.stability,
      difficultyAfter: result.card.difficulty,
    });
  } catch {
    // The schedule is the thing that must survive; the log is analysis.
  }
  return next;
}

/** Counts for a progress surface. Zero everywhere is the honest empty state. */
export async function counts(now = new Date()) {
  const all = await termState.all();
  return {
    met: all.length,
    due: all.filter(v => new Date(v.due) <= now).length,
    learning: all.filter(v => v.state === State.Learning || v.state === State.Relearning).length,
    known: all.filter(v => v.state === State.Review).length,
  };
}

/** The terms a reader looks up most — what they find hardest, by their own hand. */
export async function hardest(limit = 10) {
  const all = await termState.all();
  return all
    .filter(v => (v.lookups || 0) > 1)
    .sort((a, b) => (b.lookups || 0) - (a.lookups || 0))
    .slice(0, limit);
}

export { State };
