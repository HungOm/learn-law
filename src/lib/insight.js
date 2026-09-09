// The diagnosis layer.
//
// Everything on the progress page before this answered "how much". This module
// answers "where" — which module, which cards, which part of an answer — and
// it answers only from data the app already holds: the review log, the FSRS
// card states, the problem attempts and the quiz high scores.
//
// Two rules, both about honesty rather than arithmetic.
//
// First, nothing here is composite. A number is one measurement with its
// denominator attached. XP is never an input, because XP counts work done and
// every figure below is a claim about what the reader knows.
//
// Second, every figure has a floor. Sixteen modules divide the evidence
// sixteen ways, so a module with four reviews in the window would show 75% or
// 100% and mean neither. Below the floor a function returns `enough: false`
// and the page says "too few to say" in place of a number. That is not
// hedging: a percentage over a single attempt renders exactly as confidently
// as one over thirty, and it is the figure most likely to be over-read.

import { calibration, percent } from './problems.js';

/** Reviews in the window before a module's recall is stated as a percentage. */
export const RECALL_FLOOR = 10;
/** Predicted attempts before a module's calibration gap is stated. */
export const CAL_FLOOR = 3;
/** Attempts before a direction of travel in calibration is claimed. */
export const TREND_FLOOR = 6;
/** Quiz answers logged for a module before its accuracy is stated. */
export const QUIZ_FLOOR = 12;
/** FSRS lapses before a card is said to "keep lapsing". */
export const LAPSE_FLOOR = 3;
/** Marks a band must have been marked against before it is called the weakest. */
export const BAND_FLOOR = 6;
/** How many of anything a summary lists. */
export const LIST_LIMIT = 5;

const DAY = 86400000;

// --- which attempts count ----------------------------------------------------

/**
 * Attempts at unaided problems only. A guided problem is a rehearsal: the
 * steps come pre-ordered and half the reasoning is handed over, so predicting
 * its mark is easy by construction. Feeding those predictions into calibration
 * would make a learner look better calibrated than they are, which corrupts
 * the one figure meant to catch self-deception. game.js keeps guided attempts
 * out of the calibrated seal for the same reason, and this is the same rule
 * applied to the measurement. An attempt whose problem is no longer in the
 * catalogue is kept: the corpus is almost entirely unaided, and dropping it
 * would hide history on a guess.
 */
export function unaidedAttempts(rows, problemsById = {}) {
  return (rows || []).filter(a => problemsById[a.problemId]?.kind !== 'guided');
}

// --- the memory layer, by module ------------------------------------------

/**
 * Recall over the last `days`, per module. `pct` is the share of reviews in
 * the window not graded Forgot — the same figure the page already shows for
 * the whole deck, so the two agree by construction. The denominator is every
 * grade in the window, learning-step repeats included; a card graded three
 * times in one sitting counts three times.
 */
export function recallByModule(logs, { days = 30, now = Date.now() } = {}) {
  const out = {};
  for (const l of logs || []) {
    if (now - new Date(l.reviewedAt) >= days * DAY) continue;
    const m = (out[l.moduleId] ||= { moduleId: l.moduleId, n: 0, lapses: 0 });
    m.n++;
    if (l.ratingKey === 'again') m.lapses++;
  }
  for (const m of Object.values(out)) {
    m.enough = m.n >= RECALL_FLOOR;
    m.pct = m.enough ? Math.round((1 - m.lapses / m.n) * 100) : null;
  }
  return out;
}

/**
 * Cards the scheduler keeps having to reset. `lapses` is FSRS's own count of
 * Forgot presses on a card that had reached review — it is cumulative, so an
 * old card with a hard early life stays on this list until it is split or
 * rewritten, which is the right outcome: the list is a to-do, not a score.
 */
export function lapsingCards(cardStates, { floor = LAPSE_FLOOR, limit = LIST_LIMIT } = {}) {
  return (cardStates || [])
    .filter(c => (c.lapses || 0) >= floor)
    .sort((a, b) => (b.lapses - a.lapses) || (new Date(b.last_review || 0) - new Date(a.last_review || 0)))
    .slice(0, limit)
    .map(c => ({ id: c.id, moduleId: c.moduleId, lapses: c.lapses, reps: c.reps, lastReview: c.last_review || null }));
}

// --- the reasoning layer, by module ---------------------------------------

/**
 * Marks and calibration per module. `meanPct` is the mean of each attempt's
 * percentage over every attempt, rehearsals included, so a 4-mark problem and
 * a 12-mark problem weigh the same — an attempt is the unit, not a mark.
 * `cal` is `problems.calibration` over the module's unaided attempts only,
 * and is null below the floor; `unaided` is how many there were.
 */
export function marksByModule(rows, problemsById = {}) {
  const by = {};
  for (const a of rows || []) (by[a.moduleId] ||= []).push(a);
  const out = {};
  for (const [moduleId, list] of Object.entries(by)) {
    const meanPct = Math.round(list.reduce((n, a) => n + percent(a.score, a.total), 0) / list.length);
    const unaided = unaidedAttempts(list, problemsById);
    const cal = calibration(unaided);
    out[moduleId] = {
      moduleId,
      n: list.length,
      meanPct,
      unaided: unaided.length,
      predicted: cal ? cal.n : 0,
      cal: cal && cal.n >= CAL_FLOOR ? cal : null,
    };
  }
  return out;
}

/**
 * Whether the calibration gap is closing. Compares the last five predicted
 * unaided attempts against everything before them, on `spread` (mean absolute
 * error), because a learner who swings from +3 to -3 has not improved even
 * though the signed mean says so. Half a mark is the smallest change worth
 * naming. Pass `problemsById` so rehearsals can be told apart and left out.
 */
export function calibrationTrend(rows, { recentN = 5, problemsById = {} } = {}) {
  const scored = unaidedAttempts(rows, problemsById)
    .filter(a => typeof a.predicted === 'number')
    .sort((a, b) => new Date(a.markedAt) - new Date(b.markedAt));
  const all = calibration(scored);
  if (!all) return null;
  const enough = scored.length >= TREND_FLOOR;
  if (!enough) return { n: scored.length, all, recent: null, earlier: null, direction: null, enough };
  const recent = calibration(scored.slice(-recentN));
  const earlier = calibration(scored.slice(0, -recentN));
  const delta = recent.spread - earlier.spread;
  const direction = delta <= -0.5 ? 'narrowing' : delta >= 0.5 ? 'widening' : 'steady';
  return { n: scored.length, all, recent, earlier, direction, enough };
}

// --- the recognition layer, by module -------------------------------------

/** The catalogue carries lesson metadata only; the quiz is a count there. */
function quizCount(lesson) {
  return Array.isArray(lesson.quiz) ? lesson.quiz.length : (lesson.quizCount || 0);
}

/**
 * Quiz accuracy per module, from the run log: every lesson quiz finished, up
 * to the last 200. Right answers over answers given, across runs, so a lesson
 * run three times weighs three times — the unit is an answer, not a lesson.
 * The Arena draws from every module at once and is not logged here, so it is
 * not in this figure. `weakest` is the lesson with the lowest accuracy over
 * its own runs, which is where the next run should go.
 */
export function quizByModule(runs, lessons) {
  const byLesson = {};
  const out = {};
  for (const l of lessons || []) {
    byLesson[l.id] = l;
    if (!quizCount(l)) continue;
    const m = (out[l.moduleId] ||= {
      moduleId: l.moduleId, lessons: 0, lessonsRun: 0, runs: 0, answered: 0, correct: 0,
      perLesson: {}, weakest: null, pct: null, enough: false,
    });
    m.lessons++;
  }
  for (const r of runs || []) {
    const l = byLesson[r.lessonId];
    const m = l && out[l.moduleId];
    if (!m) continue;
    m.runs++;
    m.answered += r.total;
    m.correct += r.correct;
    const pl = (m.perLesson[l.id] ||= { lessonId: l.id, title: l.title, runs: 0, correct: 0, total: 0, pct: 0 });
    pl.runs++;
    pl.correct += r.correct;
    pl.total += r.total;
  }
  for (const m of Object.values(out)) {
    const ls = Object.values(m.perLesson);
    m.lessonsRun = ls.length;
    for (const pl of ls) {
      pl.pct = percent(pl.correct, pl.total);
      if (!m.weakest || pl.pct < m.weakest.pct) m.weakest = pl;
    }
    m.enough = m.answered >= QUIZ_FLOOR;
    m.pct = m.enough ? percent(m.correct, m.answered) : null;
  }
  return out;
}

// --- the answer to "what am I worst at" -----------------------------------

/**
 * The weakest rubric band, from `problems.bandBreakdown` rows. A band is only
 * a candidate once enough marks have been marked against it: one attempt at
 * one problem can produce "Issue 0/2" and "Conclusion 1/1", which reads like
 * a diagnosis and is a single criterion each way.
 */
export function weakestBand(bands, { floor = BAND_FLOOR } = {}) {
  const eligible = (bands || []).filter(b => b.available >= floor);
  if (!eligible.length) return null;
  return eligible.reduce((worst, b) => (b.pct < worst.pct ? b : worst));
}

/**
 * At most four findings, each one measurement, each with a place to go and
 * do something about it. Ordered by how much a learner alone can act on it:
 * the calibration gap first, because nobody else will tell them; then the
 * module where recall is lowest; then the cards that keep lapsing; then the
 * weakest band. A finding below its floor is not emitted, and an empty list
 * is the honest answer for a new reader.
 */
export function weakestAreas({ logs = [], cardStates = [], attempts = [], runs = [], cat, bands = [], now = Date.now() }) {
  const findings = [];
  const moduleTitle = id => cat?.byId?.module?.[id]?.title || id;

  // Calibration, whole corpus, unaided problems only. Over-estimating is the
  // direction that hides.
  const cal = calibration(unaidedAttempts(attempts, cat?.byId?.problem));
  if (cal && cal.n >= CAL_FLOOR && cal.direction !== 'level') {
    const marks = Math.abs(cal.mean);
    findings.push({
      kind: 'calibration',
      headline: cal.direction === 'over'
        ? `You predict ${marks} ${marks === 1 ? 'mark' : 'marks'} above what you then award yourself.`
        : `You predict ${marks} ${marks === 1 ? 'mark' : 'marks'} below what you then award yourself.`,
      detail: `Across ${cal.n} unaided attempts; rehearsals do not count. ${cal.direction === 'over'
        ? 'Nobody else will tell you this. Write the rule out in full before you predict.'
        : 'Cheaper than the other way, but a good answer becomes hard to tell from a lucky one.'}`,
      blind: 'Both numbers are yours: a prediction and a self-mark. The gap between them is real even if neither is.',
      to: '/problems',
      cta: 'Write another',
    });
  }

  // Recall, weakest module over the floor.
  const recall = Object.values(recallByModule(logs, { now })).filter(m => m.enough);
  if (recall.length) {
    const worst = recall.reduce((w, m) => (m.pct < w.pct ? m : w));
    if (worst.pct < 90) {
      findings.push({
        kind: 'recall',
        moduleId: worst.moduleId,
        headline: `Recall is lowest in ${moduleTitle(worst.moduleId)}: ${worst.pct}%.`,
        detail: `${worst.lapses} of ${worst.n} grades in the last 30 days were Forgot. Under 80% usually means the cards carry too much at once.`,
        blind: 'Counts what you pressed. A Hard that should have been Forgot is invisible here.',
        to: `/review?module=${worst.moduleId}`,
        cta: 'Review this module',
      });
    }
  }

  // Cards that keep lapsing.
  const lapsing = lapsingCards(cardStates);
  if (lapsing.length) {
    const top = lapsing[0];
    const card = cat?.byId?.card?.[top.id];
    findings.push({
      kind: 'lapsing',
      moduleId: top.moduleId,
      headline: lapsing.length === 1
        ? 'One card keeps lapsing.'
        : `${lapsing.length} cards keep lapsing.`,
      detail: `${card ? `"${card.front}"` : top.id} has been forgotten ${top.lapses} times after reaching review. A card that lapses this often is usually two facts wearing one front.`,
      blind: 'Lapses are cumulative. A card fixed last month stays here until its count is overtaken.',
      to: `/review?module=${top.moduleId}`,
      cta: `Review ${moduleTitle(top.moduleId)}`,
      cards: lapsing,
    });
  }

  // Weakest band.
  const band = weakestBand(bands);
  if (band && band.pct < 70) {
    findings.push({
      kind: 'band',
      band: band.band,
      headline: `Marks go missing at ${bandLabel(band.band)}: ${band.pct}%.`,
      detail: `${band.earned} of ${band.available} marks, over ${band.attempts || '—'} attempts. ${BAND_ADVICE[band.band] || ''}`.trim(),
      blind: 'Marked by you against your own reading of the rubric.',
      to: '/problems',
      cta: 'Write another',
    });
  }

  // Quiz, weakest module over the floor. Recognition is the easy half, so a
  // low figure here says the exposition has not landed, not that recall is off.
  const quiz = Object.values(quizByModule(runs, cat?.lessons || [])).filter(m => m.enough);
  if (quiz.length) {
    const worst = quiz.reduce((w, m) => (m.pct < w.pct ? m : w));
    if (worst.pct < 70 && worst.weakest) {
      findings.push({
        kind: 'quiz',
        moduleId: worst.moduleId,
        headline: `Quiz recognition is lowest in ${moduleTitle(worst.moduleId)}: ${worst.pct}%.`,
        detail: `${worst.correct} of ${worst.answered} answers right over ${worst.runs} ${worst.runs === 1 ? 'run' : 'runs'}. A quiz you fail says the lesson has not landed. Re-read it before the cards come round.`,
        blind: 'Lesson quizzes only. Arena runs draw from every module and are not counted.',
        to: `/quiz/${worst.weakest.lessonId}`,
        cta: 'Retake the weakest',
      });
    }
  }

  return findings.slice(0, 4);
}

const BAND_ADVICE = {
  issue: 'Issue-spotting is fixed by reading more facts, not more law.',
  rule: 'State the rule in full and name its source before you apply it.',
  method: 'Say which question you are answering before you answer it.',
  application: 'Tie each fact to the rule it triggers. Application is where most marks live.',
  conclusion: 'Answer the question you were asked, in one sentence, at the end.',
};

function bandLabel(band) {
  return { issue: 'Issue', rule: 'Rule', application: 'Application', method: 'Method', conclusion: 'Conclusion' }[band] || band;
}

/**
 * One row per module for the table on the progress page. Every cell carries
 * its own denominator; a cell under its floor is null and the view says so.
 */
export function moduleTable({ cat, logs = [], attempts = [], runs = [], byModule = {}, now = Date.now() }) {
  const recall = recallByModule(logs, { now });
  const marks = marksByModule(attempts, cat.byId?.problem);
  const quiz = quizByModule(runs, cat.lessons);
  return cat.modules.map(m => {
    const counts = byModule[m.id] || {};
    return {
      moduleId: m.id,
      title: m.title,
      level: m.level,
      cards: counts.total || 0,
      due: (counts.due || 0) + (counts.fresh || 0),
      recall: recall[m.id] || null,
      quiz: quiz[m.id] || null,
      marks: marks[m.id] || null,
    };
  });
}

// --- seals: how far from striking ------------------------------------------
// A seal counts work done, so "how far" is a count too. The threshold and the
// distance to it come from the same `progress` function on the achievement in
// game.js, so the two cannot drift apart. A seal without one gets no bar.

/** `{ current, target, pct }` for an unstruck seal, or null if it has no count. */
export function sealProgress(achievement, state, ctx = {}) {
  if (typeof achievement.progress !== 'function') return null;
  let pair = null;
  try { pair = achievement.progress(state, ctx); } catch { return null; }
  const [current, target] = pair || [];
  if (!target) return null;
  const pct = Math.min(100, Math.round((Math.min(current || 0, target) / target) * 100));
  return { current: current || 0, target, pct };
}

/**
 * Unstruck seals, nearest first. A seal with no progress at all is not listed,
 * and neither is one whose count already meets its target: that seal is
 * waiting for the next event to strike it (a restored backup can leave one in
 * this state), and "100%, still open" would read as a fault.
 */
export function nearestSeals(achievements, state, ctx = {}, { limit = LIST_LIMIT } = {}) {
  return achievements
    .filter(a => !state.achievements[a.id])
    .map(a => ({ a, p: sealProgress(a, state, ctx) }))
    .filter(x => x.p && x.p.current > 0 && x.p.current < x.p.target)
    .sort((x, y) => (y.p.pct - x.p.pct) || (x.p.target - y.p.target))
    .slice(0, limit);
}
