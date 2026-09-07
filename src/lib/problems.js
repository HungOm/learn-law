// The reasoning layer.
//
// A review measures whether a rule is remembered. A problem question measures
// whether it can be found, stated, and applied to facts that do not announce
// which rule they need — which is the thing the whole curriculum is for, and
// the thing review counts cannot see.
//
// Problems are deliberately not scheduled by FSRS. A flashcard has one right
// answer and a recall event to fit a curve to; an attempt at a problem question
// is a piece of writing marked against a rubric by the person who wrote it.
// Feeding that into a memory model would produce a number that looks like the
// review statistics and means nothing like them.

import { attempts, meta } from './db.js';

/** What a self-mark can award for one rubric criterion. */
export const CREDIT = [
  { key: 'full', value: 1,   label: 'Got it',  hint: 'Made the point, with the authority' },
  { key: 'half', value: 0.5, label: 'Partly',  hint: 'Reached for it and did not land it' },
  { key: 'none', value: 0,   label: 'Missed',  hint: 'Not in the answer at all' },
];

export const BANDS = {
  issue:       'Issue',
  rule:        'Rule',
  application: 'Application',
  method:      'Method',
  conclusion:  'Conclusion',
};

const BAND_ORDER = ['issue', 'rule', 'method', 'application', 'conclusion'];

export function bandRank(band) {
  const i = BAND_ORDER.indexOf(band);
  return i === -1 ? BAND_ORDER.length : i;
}

export function totalMarks(problem) {
  return (problem.rubric || []).reduce((n, r) => n + r.marks, 0);
}

/** `awarded` maps criterion id to a CREDIT value. Anything unmarked scores nothing. */
export function scoreOf(problem, awarded = {}) {
  const raw = (problem.rubric || [])
    .reduce((n, r) => n + r.marks * (awarded[r.id] ?? 0), 0);
  return Math.round(raw * 2) / 2;
}

export function percent(score, total) {
  return total ? Math.round((score / total) * 100) : 0;
}

// --- drafts ---------------------------------------------------------------
// An attempt is forty minutes of writing held in a textarea. A closed tab, a
// reload, or a phone call would otherwise cost all of it, so the whole run —
// stage, text, clock, prediction, marks — is written to `meta` as it changes
// and picked up again on the way back in.

const key = (problemId) => `problemDraft:${problemId}`;

export const draft = {
  load: (problemId) => meta.get(key(problemId), null),
  save: (problemId, value) => meta.set(key(problemId), value),
  // Deleted rather than nulled: a finished problem should leave nothing behind
  // in a backup, and `meta` is exported whole.
  clear: (problemId) => meta.del(key(problemId)),
};

// --- attempts -------------------------------------------------------------

export async function record(problem, run) {
  const total = totalMarks(problem);
  const score = scoreOf(problem, run.awarded);
  const row = {
    problemId: problem.id,
    moduleId: problem.moduleId,
    startedAt: run.startedAt,
    markedAt: new Date().toISOString(),
    minutesSpent: Math.max(1, Math.round(run.elapsedMs / 60000)),
    targetMinutes: problem.minutes,
    answer: run.text || '',
    words: countWords(run.text),
    predicted: run.predicted,
    awarded: { ...run.awarded },
    score,
    total,
  };
  await attempts.add(row);
  await draft.clear(problem.id);
  return row;
}

export function countWords(text) {
  const t = String(text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

export async function historyFor(problemId) {
  const all = await attempts.all();
  return all
    .filter(a => a.problemId === problemId)
    .sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));
}

/** Latest attempt per problem, keyed by problem id. */
export async function latestByProblem() {
  const all = await attempts.all();
  const out = {};
  for (const a of all) {
    const prev = out[a.problemId];
    if (!prev || new Date(a.markedAt) > new Date(prev.markedAt)) out[a.problemId] = a;
  }
  return out;
}

// --- what the marks say ---------------------------------------------------

/**
 * Marks lost by rubric band, across every attempt. This is the diagnosis a
 * total score cannot give: losing marks on `issue` is a different problem from
 * losing them on `application`, and they are fixed by different work.
 */
export function bandBreakdown(problemsById, rows) {
  const acc = {};
  for (const a of rows) {
    const p = problemsById[a.problemId];
    if (!p) continue;
    for (const r of p.rubric || []) {
      const b = (acc[r.band] ||= { band: r.band, earned: 0, available: 0 });
      b.available += r.marks;
      b.earned += r.marks * (a.awarded?.[r.id] ?? 0);
    }
  }
  return Object.values(acc)
    .map(b => ({ ...b, earned: Math.round(b.earned * 2) / 2, pct: percent(b.earned, b.available) }))
    .sort((x, y) => bandRank(x.band) - bandRank(y.band));
}

/**
 * Signed calibration error in marks: predicted minus awarded, averaged. A
 * positive number means you consistently think your answers are better than
 * your own rubric says they are, which is the failure mode that survives a
 * degree — you cannot correct a gap you do not believe is there.
 */
export function calibration(rows) {
  const scored = rows.filter(a => typeof a.predicted === 'number');
  if (!scored.length) return null;
  const errs = scored.map(a => a.predicted - a.score);
  const mean = errs.reduce((s, e) => s + e, 0) / errs.length;
  const absMean = errs.reduce((s, e) => s + Math.abs(e), 0) / errs.length;
  return {
    n: scored.length,
    mean: Math.round(mean * 10) / 10,
    spread: Math.round(absMean * 10) / 10,
    direction: mean > 0.75 ? 'over' : mean < -0.75 ? 'under' : 'level',
  };
}

/**
 * Order for the problem list: never attempted first, then weakest, then
 * oldest. There is no due date and there is deliberately no badge — inventing
 * a schedule for problem questions would put a number the app cannot justify
 * next to one it can.
 */
export function listOrder(problems, latest) {
  return [...problems].sort((a, b) => {
    const la = latest[a.id], lb = latest[b.id];
    if (!la && lb) return -1;
    if (la && !lb) return 1;
    if (!la && !lb) return 0;
    const pa = percent(la.score, la.total), pb = percent(lb.score, lb.total);
    if (pa !== pb) return pa - pb;
    return new Date(la.markedAt) - new Date(lb.markedAt);
  });
}

/**
 * The clipboard payload the README argues for: everything a second reader
 * needs to mark the answer, and nothing the app pretends to mark itself.
 */
export function markingPacket(problem, run) {
  const lines = [
    `# ${problem.title}`,
    '',
    'Please mark the answer below against the rubric. Be strict. For each',
    'criterion say full, partial or missed, give the reason in one line, and',
    'quote the words in the answer that earned it — or say that nothing did.',
    '',
    '## Facts',
    ...(problem.scenario || []),
    '',
    '## Task',
    problem.task,
    '',
    `## The answer (${countWords(run.text)} words, ${Math.max(1, Math.round(run.elapsedMs / 60000))} minutes)`,
    (run.text || '').trim() || '(nothing written)',
    '',
    `## Rubric — ${totalMarks(problem)} marks`,
    ...(problem.rubric || []).map(r =>
      `- [${BANDS[r.band] || r.band}, ${r.marks} mark${r.marks === 1 ? '' : 's'}] ${r.criterion}` +
      (r.authority && r.authority !== '—' ? ` (${r.authority})` : '')),
    '',
    '## Note',
    'This is Malaysian law. Do not accept an authority you cannot verify, and',
    'say so where you are unsure rather than filling the gap.',
  ];
  return lines.join('\n');
}
