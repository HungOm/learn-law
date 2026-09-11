// FSRS wrapper. ts-fsrs is vendored in /vendor so this works offline and on
// GitHub Pages with no CDN. Version pinned at build time — see README.

import { fsrs, generatorParameters, createEmptyCard, Rating, State }
  from '../../vendor/ts-fsrs.mjs';
import { cardState, reviewLog, meta } from './db.js';

// 0.90 is a sensible default, not a universal optimum. Raising it means more
// reviews for marginally better recall; lowering it means fewer reviews and
// more lapses. Leave it alone until you have a few thousand reviews logged.
export const DEFAULT_RETENTION = 0.90;

let _engine = null;
let _retention = DEFAULT_RETENTION;

export async function init() {
  _retention = await meta.get('requestRetention', DEFAULT_RETENTION);
  _engine = fsrs(generatorParameters({
    request_retention: _retention,
    enable_fuzz: true,        // stops big decks clumping onto the same days
    enable_short_term: true,
  }));
  return _engine;
}

export function engine() {
  if (!_engine) throw new Error('Scheduler not initialised. Call init() first.');
  return _engine;
}

export function retention() { return _retention; }

export async function setRetention(value) {
  _retention = value;
  await meta.set('requestRetention', value);
  return init();
}

export const RATING = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

// Press Again when you actually failed. Using Hard as a soft fail inflates
// intervals and quietly wrecks the schedule — this is the single most common
// way people break FSRS.
export const RATING_LABELS = [
  { key: 'again', rating: Rating.Again, label: 'Forgot', hint: 'Could not recall it' },
  { key: 'hard',  rating: Rating.Hard,  label: 'Hard',   hint: 'Recalled, but slowly' },
  { key: 'good',  rating: Rating.Good,  label: 'Good',   hint: 'Recalled correctly' },
  { key: 'easy',  rating: Rating.Easy,  label: 'Easy',   hint: 'Instant, no effort' },
];

/** Fresh FSRS state for a card that has never been seen. */
export function newState(cardId, moduleId, now = new Date()) {
  const empty = createEmptyCard(now);
  return { id: cardId, moduleId, ...serialise(empty) };
}

// Exported for `vocab.js`, which schedules glossary terms with the same FSRS
// engine against its own store. Pure field mapping — Date <-> ISO string — with
// no rating, retention or interval arithmetic in either direction. Exported so
// there is ONE state mapping rather than two copies that drift.
export function serialise(c) {
  return {
    due: c.due instanceof Date ? c.due.toISOString() : c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review
      ? (c.last_review instanceof Date ? c.last_review.toISOString() : c.last_review)
      : undefined,
  };
}

export function deserialise(row) {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps ?? 0,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

/** What each button would do, so the UI can show the next interval. */
export function preview(row, now = new Date()) {
  const scheduling = engine().repeat(deserialise(row), now);
  const out = {};
  for (const { key, rating } of RATING_LABELS) {
    const item = scheduling[rating];
    out[key] = {
      due: item.card.due,
      interval: humanInterval(item.card.due, now),
    };
  }
  return out;
}

/** Apply a grade: writes new state and appends an immutable log row. */
export async function grade(row, ratingKey, now = new Date(), extra = {}) {
  const rating = RATING[ratingKey];
  const result = engine().next(deserialise(row), now, rating);
  const next = { ...row, ...serialise(result.card) };

  await cardState.put(next);
  await reviewLog.add({
    cardId: row.id,
    moduleId: row.moduleId,
    rating,
    ratingKey,
    reviewedAt: now.toISOString(),
    state: result.log.state,
    elapsed_days: result.log.elapsed_days,
    scheduled_days: result.log.scheduled_days,
    stabilityAfter: result.card.stability,
    difficultyAfter: result.card.difficulty,
    ...extra,
  });
  return next;
}

/**
 * Today's queue. Due cards first (oldest due first), then new cards up to a
 * daily cap. The cap matters: introducing 200 new cards on a keen Sunday
 * produces an unpayable review debt three weeks later.
 */
export async function buildQueue({ newLimit = 15, reviewLimit = 200, moduleId = null } = {}) {
  const now = new Date();
  const all = await cardState.all();
  const pool = moduleId ? all.filter(c => c.moduleId === moduleId) : all;

  const due = pool
    .filter(c => c.state !== State.New && new Date(c.due) <= now)
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, reviewLimit);

  const fresh = pool
    .filter(c => c.state === State.New)
    .slice(0, newLimit);

  return { due, fresh, queue: [...due, ...fresh] };
}

export async function counts(moduleId = null) {
  const now = new Date();
  const all = await cardState.all();
  const pool = moduleId ? all.filter(c => c.moduleId === moduleId) : all;
  return {
    total: pool.length,
    due: pool.filter(c => c.state !== State.New && new Date(c.due) <= now).length,
    fresh: pool.filter(c => c.state === State.New).length,
    learning: pool.filter(c => c.state === State.Learning || c.state === State.Relearning).length,
    review: pool.filter(c => c.state === State.Review).length,
  };
}

export function humanInterval(due, from = new Date()) {
  const mins = Math.round((new Date(due) - from) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)} hr`;
  const days = hours / 24;
  if (days < 31) return `${Math.round(days)} d`;
  const months = days / 30.44;
  if (months < 12) return `${months.toFixed(months < 3 ? 1 : 0)} mo`;
  return `${(days / 365.25).toFixed(1)} yr`;
}

export { State };

/**
 * Every module's counts in one pass. The per-module page can afford a query
 * each; the home page cannot — sixteen modules meant sixteen full scans of the
 * card store on every paint.
 */
export async function countsByModule() {
  const now = new Date();
  const all = await cardState.all();
  const out = {};
  for (const c of all) {
    const m = (out[c.moduleId] ||= { total: 0, due: 0, fresh: 0, learning: 0, review: 0 });
    m.total++;
    if (c.state === State.New) m.fresh++;
    else if (new Date(c.due) <= now) m.due++;
    if (c.state === State.Learning || c.state === State.Relearning) m.learning++;
    if (c.state === State.Review) m.review++;
  }
  return out;
}

export const EMPTY_COUNTS = { total: 0, due: 0, fresh: 0, learning: 0, review: 0 };
