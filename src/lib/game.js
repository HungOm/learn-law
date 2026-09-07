// The game layer.
//
// A word about what this is and is not, because the rest of the app is careful
// about the difference. XP, ranks, streaks and seals are **motivation**, not
// measurement. They are a count of work done, weighted to reward the behaviour
// that actually produces learning — an honest lapse, a written answer, a
// prediction that turned out right. They are deliberately not shown next to the
// review statistics or the calibration figure, because those are claims about
// what you know and this is a claim about how much you turned up.
//
// One consequence worth stating: pressing **Forgot** pays XP. If failing a card
// cost you points the scoreboard would be paying you to lie to the scheduler,
// and a corrupted FSRS curve is far more expensive than a small number.

import { meta } from './db.js';

const KEY = 'game';
const VERSION = 1;

// --- ranks ----------------------------------------------------------------
// The ladder is the Malaysian legal career, which makes the next rung mean
// something to a student of this particular jurisdiction.

export const RANKS = [
  { level: 1,  xp: 0,     title: 'Layperson',            note: 'Reads the newspaper report, not the judgment.' },
  { level: 2,  xp: 250,   title: 'First-Year',           note: 'Owns the textbooks. Has opened two of them.' },
  { level: 3,  xp: 700,   title: 'Pupil in Chambers',    note: 'Nine months of doing what the master says.' },
  { level: 4,  xp: 1500,  title: 'Advocate & Solicitor', note: 'Called to the Malaysian Bar.' },
  { level: 5,  xp: 2800,  title: 'Senior Advocate',      note: 'Now the one being asked, not asking.' },
  { level: 6,  xp: 4800,  title: 'Sessions Court Judge', note: 'Deciding, on the record, with reasons.' },
  { level: 7,  xp: 7800,  title: 'High Court Judge',     note: 'Unlimited original jurisdiction.' },
  { level: 8,  xp: 12000, title: 'Court of Appeal Judge',note: 'Correcting the court below, in threes.' },
  { level: 9,  xp: 18000, title: 'Federal Court Judge',  note: 'The last word, and Article 128.' },
  { level: 10, xp: 27000, title: 'Chief Justice',        note: 'There is no rung above this one.' },
];

export function rankFor(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const rank = RANKS[i];
  const next = RANKS[i + 1] || null;
  const span = next ? next.xp - rank.xp : 1;
  const into = xp - rank.xp;
  return {
    ...rank,
    next,
    into,
    span,
    toNext: next ? next.xp - xp : 0,
    pct: next ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

// --- what things are worth ------------------------------------------------

export const REVIEW_XP = { again: 4, hard: 8, good: 12, easy: 10 };
export const LESSON_XP = 60;
export const QUIZ_BASE_XP = 20;
export const PROBLEM_XP = 150;

/** Combo pays, but not enough to make a wrong Good worth faking. */
export function comboBonus(combo) {
  return Math.min(20, Math.max(0, combo - 1) * 2);
}

/** Under four seconds is recall; over twelve is reconstruction. */
export function speedBonus(ms) {
  if (!ms || ms > 12000) return 0;
  return Math.round(15 * Math.min(1, Math.max(0, (12000 - ms) / 8000)));
}

// --- state ----------------------------------------------------------------

export function emptyState() {
  return {
    version: VERSION,
    xp: 0,
    totals: {
      reviews: 0, forgot: 0, lessons: 0,
      quizAnswered: 0, quizCorrect: 0, quizRuns: 0, quizPerfect: 0,
      problems: 0, calibrated: 0,
    },
    best: { combo: 0, quizStreak: 0, arenaScore: 0, dayXp: 0, problemPct: 0 },
    streak: { current: 0, longest: 0, last: null },
    days: {},
    achievements: {},
    dailyGoal: 150,
  };
}

export async function load() {
  const saved = await meta.get(KEY, null);
  if (!saved) return emptyState();
  const base = emptyState();
  return {
    ...base,
    ...saved,
    totals: { ...base.totals, ...(saved.totals || {}) },
    best: { ...base.best, ...(saved.best || {}) },
    streak: { ...base.streak, ...(saved.streak || {}) },
    days: saved.days || {},
    achievements: saved.achievements || {},
  };
}

export function save(state) {
  return meta.set(KEY, state);
}

export function today(d = new Date()) {
  // Local date, not UTC. A review at 9pm in Kuala Lumpur belongs to that day,
  // and `toISOString().slice(0,10)` would file it under tomorrow.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayBefore(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return today(dt);
}

/** Days studied in a row, ending today or yesterday. */
export function streakOf(days, now = new Date()) {
  const t = today(now);
  let cursor = days[t] ? t : (days[dayBefore(t)] ? dayBefore(t) : null);
  if (!cursor) return 0;
  let n = 0;
  while (days[cursor]) { n++; cursor = dayBefore(cursor); }
  return n;
}

// --- achievements ---------------------------------------------------------
// Each is a seal: a short sigil struck into a circle, the way a court stamps a
// filed document. No emoji — the rest of the app is set like a statute reprint
// and a smiley face in the middle of it would read as a different application.

export const ACHIEVEMENTS = [
  { id: 'first-blood',  sigil: 'I',    name: 'First recall',        hint: 'Grade one card.',                          tone: 'sage',  test: s => s.totals.reviews >= 1 },
  { id: 'reviews-100',  sigil: 'C',    name: 'A hundred cards',     hint: 'Grade 100 cards.',                         tone: 'sage',  test: s => s.totals.reviews >= 100 },
  { id: 'reviews-500',  sigil: 'D',    name: 'Five hundred',        hint: 'Grade 500 cards.',                         tone: 'sage',  test: s => s.totals.reviews >= 500 },
  { id: 'reviews-2000', sigil: 'MM',   name: 'Two thousand',        hint: 'Grade 2,000 cards.',                       tone: 'gold',  test: s => s.totals.reviews >= 2000 },
  { id: 'honest-25',    sigil: '✗',    name: 'Honest witness',      hint: 'Press Forgot 25 times. The scheduler is only as good as your candour.', tone: 'oxide', test: s => s.totals.forgot >= 25 },

  { id: 'streak-3',     sigil: '3',    name: 'Three days',          hint: 'Study three days running.',                tone: 'sage',  test: s => s.streak.longest >= 3 },
  { id: 'streak-7',     sigil: '7',    name: 'A full week',         hint: 'Study seven days running.',                tone: 'sage',  test: s => s.streak.longest >= 7 },
  { id: 'streak-30',    sigil: '30',   name: 'A term',              hint: 'Study thirty days running.',               tone: 'gold',  test: s => s.streak.longest >= 30 },
  { id: 'streak-100',   sigil: '100',  name: 'A hundred days',      hint: 'Study a hundred days running.',            tone: 'gold',  test: s => s.streak.longest >= 100 },

  { id: 'lesson-1',     sigil: '§',    name: 'Opened the book',     hint: 'Mark one lesson read.',                    tone: 'sage',  test: s => s.totals.lessons >= 1 },
  { id: 'lesson-10',    sigil: '§X',   name: 'Ten lessons',         hint: 'Mark ten lessons read.',                   tone: 'sage',  test: s => s.totals.lessons >= 10 },
  { id: 'lesson-all',   sigil: '§§',   name: 'The whole exposition',hint: 'Mark every lesson read.',                  tone: 'gold',  test: (s, ctx) => ctx.lessonCount > 0 && s.totals.lessons >= ctx.lessonCount },

  { id: 'quiz-first',   sigil: '?',    name: 'First quiz',          hint: 'Finish one lesson quiz.',                  tone: 'sage',  test: s => s.totals.quizRuns >= 1 },
  { id: 'quiz-perfect', sigil: '✓',    name: 'Clean sheet',         hint: 'Finish a quiz with every answer right.',   tone: 'gold',  test: s => s.totals.quizPerfect >= 1 },
  { id: 'quiz-streak-10', sigil: 'X',  name: 'Ten in a row',        hint: 'Answer ten quiz questions correctly, consecutively.', tone: 'sage', test: s => s.best.quizStreak >= 10 },
  { id: 'quiz-streak-25', sigil: 'XXV',name: 'Twenty-five in a row',hint: 'Answer twenty-five quiz questions correctly, consecutively.', tone: 'gold', test: s => s.best.quizStreak >= 25 },
  { id: 'quiz-correct-250', sigil: 'CCL', name: 'Well briefed',     hint: 'Answer 250 quiz questions correctly.',     tone: 'gold',  test: s => s.totals.quizCorrect >= 250 },
  { id: 'arena-1500',   sigil: '⚖',    name: 'The arena',           hint: 'Score 1,500 in a single Arena run.',       tone: 'gold',  test: s => s.best.arenaScore >= 1500 },

  { id: 'problem-1',    sigil: 'A',    name: 'First answer',        hint: 'Write and mark one problem question.',     tone: 'sage',  test: s => s.totals.problems >= 1 },
  { id: 'problem-5',    sigil: 'V',    name: 'Five answers',        hint: 'Write and mark five problem questions.',   tone: 'sage',  test: s => s.totals.problems >= 5 },
  { id: 'problem-20',   sigil: 'XX',   name: 'Twenty answers',      hint: 'Write and mark twenty problem questions.', tone: 'gold',  test: s => s.totals.problems >= 20 },
  { id: 'problem-80',   sigil: '80',   name: 'A first',             hint: 'Mark yourself 80% or more on a problem question.', tone: 'gold', test: s => s.best.problemPct >= 80 },
  { id: 'calibrated-3', sigil: '=',    name: 'Calibrated',          hint: 'Predict within one mark, three times. The hardest seal here.', tone: 'gold', test: s => s.totals.calibrated >= 3 },

  { id: 'combo-10',     sigil: 'X!',   name: 'Ten-card run',        hint: 'Ten cards in a row without a lapse.',      tone: 'sage',  test: s => s.best.combo >= 10 },
  { id: 'combo-25',     sigil: 'XXV!', name: 'Twenty-five-card run',hint: 'Twenty-five cards in a row without a lapse.', tone: 'gold', test: s => s.best.combo >= 25 },

  { id: 'xp-5000',      sigil: 'V M',  name: 'Five thousand',       hint: 'Earn 5,000 XP.',                           tone: 'gold',  test: s => s.xp >= 5000 },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

// --- awarding -------------------------------------------------------------

/**
 * Apply an event. Returns the new state plus what the UI should celebrate:
 * XP gained, whether a rank was crossed, and any seals struck.
 *
 * Pure in the sense that matters — it does not write. The caller persists,
 * because the caller is the one that knows whether the screen is still there.
 */
export function apply(state, event, ctx = {}, now = new Date()) {
  const s = {
    ...state,
    totals: { ...state.totals },
    best: { ...state.best },
    streak: { ...state.streak },
    days: { ...state.days },
    achievements: { ...state.achievements },
  };

  let xp = 0;
  const notes = [];

  switch (event.kind) {
    case 'review': {
      xp = (REVIEW_XP[event.ratingKey] ?? 0) + comboBonus(event.combo || 0);
      s.totals.reviews += 1;
      if (event.ratingKey === 'again') s.totals.forgot += 1;
      s.best.combo = Math.max(s.best.combo, event.combo || 0);
      break;
    }
    case 'lesson': {
      xp = LESSON_XP;
      s.totals.lessons += 1;
      break;
    }
    case 'unlesson': {
      s.totals.lessons = Math.max(0, s.totals.lessons - 1);
      break;
    }
    case 'quizAnswer': {
      s.totals.quizAnswered += 1;
      if (event.correct) {
        s.totals.quizCorrect += 1;
        xp = QUIZ_BASE_XP + speedBonus(event.ms) + Math.min(10, event.streak || 0) * 3;
        s.best.quizStreak = Math.max(s.best.quizStreak, event.streak || 0);
      }
      break;
    }
    case 'quizRun': {
      s.totals.quizRuns += 1;
      if (event.perfect) {
        s.totals.quizPerfect += 1;
        xp = 100 + 10 * (event.total || 0);
        notes.push('Clean sheet');
      }
      if (event.arena) s.best.arenaScore = Math.max(s.best.arenaScore, event.score || 0);
      break;
    }
    case 'problem': {
      const pct = event.total ? Math.round((event.score / event.total) * 100) : 0;
      xp = PROBLEM_XP + pct;
      s.totals.problems += 1;
      s.best.problemPct = Math.max(s.best.problemPct, pct);
      if (typeof event.gap === 'number' && Math.abs(event.gap) <= 1) {
        s.totals.calibrated += 1;
        xp += 80;
        notes.push('Predicted within a mark');
      }
      break;
    }
    default:
      break;
  }

  if (xp > 0) {
    const key = today(now);
    s.xp += xp;
    s.days[key] = (s.days[key] || 0) + xp;
    s.best.dayXp = Math.max(s.best.dayXp, s.days[key]);
    const current = streakOf(s.days, now);
    s.streak = {
      current,
      longest: Math.max(s.streak.longest || 0, current),
      last: key,
    };
  }

  const before = rankFor(state.xp);
  const after = rankFor(s.xp);

  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.test(s, ctx); } catch { ok = false; }
    if (ok) {
      s.achievements[a.id] = now.toISOString();
      unlocked.push(a);
    }
  }

  return {
    state: s,
    xp,
    notes,
    rank: after,
    leveledUp: after.level > before.level ? after : null,
    unlocked,
  };
}

/** Last `n` days of XP, oldest first, for the strip chart on the progress page. */
export function recentDays(state, n = 28, now = new Date()) {
  const out = [];
  let key = today(now);
  for (let i = 0; i < n; i++) {
    out.unshift({ day: key, xp: state.days[key] || 0 });
    key = dayBefore(key);
  }
  return out;
}

export function goalProgress(state, now = new Date()) {
  const earned = state.days[today(now)] || 0;
  const goal = state.dailyGoal || 150;
  return { earned, goal, pct: Math.min(100, Math.round((earned / goal) * 100)), met: earned >= goal };
}
