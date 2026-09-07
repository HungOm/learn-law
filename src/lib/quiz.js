// Quizzes.
//
// A third kind of testing, sitting between a flashcard and a problem question.
// A card asks whether one fact is available; a problem asks whether the law can
// be applied to facts that do not announce themselves. A quiz question asks the
// thing in between — whether you can pick the right rule out of four that all
// sound plausible, which is most of what a multiple-choice paper tests and a
// fair amount of what a viva does.
//
// Quiz results deliberately do not feed FSRS. Recognising the right answer among
// four is a much easier act than producing it cold, and letting a recognition
// event lengthen a recall interval would inflate the schedule on evidence that
// does not support it. Quizzes pay XP; cards move the schedule.

import { meta } from './db.js';

export const ARENA_SECONDS = 90;
export const ARENA_LIVES = 3;

/** Fisher–Yates. Seeded by nothing: a quiz you can memorise the order of is a quiz you have stopped answering. */
export function shuffle(rows) {
  const a = [...rows];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Prepare questions for a run: shuffled, options shuffled too, with the answer
 * index carried across. Returns a stable `key` per question so React can keep
 * the option elements identified across re-renders.
 */
export function prepare(questions, { limit = null, shuffleOptions = true } = {}) {
  const picked = shuffle(questions).slice(0, limit ?? questions.length);
  return picked.map((q, i) => {
    const pairs = q.options.map((text, idx) => ({ text, correct: idx === q.answer }));
    const opts = shuffleOptions ? shuffle(pairs) : pairs;
    return {
      ...q,
      key: `${q.id}:${i}`,
      options: opts.map(o => o.text),
      answer: opts.findIndex(o => o.correct),
    };
  });
}

export function arenaScore({ correct, bestStreak, secondsLeft, lives }) {
  return Math.round(
    correct * 100 +
    bestStreak * 25 +
    Math.max(0, secondsLeft) * 5 +
    Math.max(0, lives) * 50
  );
}

/** A one-line verdict on a finished run. Honest about what it measured. */
export function verdict(correct, total) {
  if (!total) return '';
  const pct = Math.round((correct / total) * 100);
  if (pct === 100) return 'Every one. Now try the same material as a problem question, where nothing is offered to you.';
  if (pct >= 80) return 'Solid recognition. Recognition is the easy half — the cards make you produce it cold.';
  if (pct >= 50) return 'About half. Re-read the lesson before the cards come round, or the reviews will do the teaching.';
  return 'Under half. Go back to the lesson: a quiz you fail is telling you the exposition has not landed, not that you are slow.';
}

export function medal(correct, total) {
  if (!total) return null;
  const pct = (correct / total) * 100;
  if (pct === 100) return { tone: 'gold', label: 'Clean sheet' };
  if (pct >= 80) return { tone: 'sage', label: 'Pass, comfortably' };
  if (pct >= 50) return { tone: 'plain', label: 'Scraped it' };
  return { tone: 'oxide', label: 'Back to the lesson' };
}

// --- what a run leaves behind ---------------------------------------------
// One row per lesson: the best run, so the index can show which quizzes are
// still open. Not a schedule and not a grade — a high score.

const BEST_KEY = 'quizBest';

export async function bestMap() {
  return (await meta.get(BEST_KEY, null)) || {};
}

export async function recordRun(lessonId, { correct, total }) {
  const map = await bestMap();
  const prev = map[lessonId];
  const improved = !prev || correct > prev.correct;
  map[lessonId] = {
    correct: improved ? correct : prev.correct,
    total,
    runs: (prev?.runs || 0) + 1,
    last: new Date().toISOString(),
    lastCorrect: correct,
  };
  await meta.set(BEST_KEY, map);
  return { map, improved };
}

const ARENA_KEY = 'arenaBest';

export async function arenaBest() {
  return (await meta.get(ARENA_KEY, null)) || { score: 0, correct: 0, at: null };
}

export async function recordArena(run) {
  const prev = await arenaBest();
  if (run.score <= prev.score) return { best: prev, improved: false };
  const best = { ...run, at: new Date().toISOString() };
  await meta.set(ARENA_KEY, best);
  return { best, improved: true };
}
