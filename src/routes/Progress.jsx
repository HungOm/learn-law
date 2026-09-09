import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as prob from '../lib/problems.js';
import * as lessonsLib from '../lib/lessons.js';
import * as game from '../lib/game.js';
import * as sched from '../lib/scheduler.js';
import * as quizLib from '../lib/quiz.js';
import * as insight from '../lib/insight.js';
import { reviewLog, attempts, cardState } from '../lib/db.js';
import { WeakSpots, ModuleTable, calibrationTrendCopy } from '../components/Insight.jsx';
import { ArrRow, CountUp, ProgressRing, Stat, StatGrid } from '../components/Bits.jsx';
import { daysAgo, plural, round1 } from '../lib/format.js';

export default function Progress() {
  const { cat, counts, read, game: g, rank } = useStudy();
  const [logs, setLogs] = useState(null);
  const [tries, setTries] = useState([]);
  const [cards, setCards] = useState([]);
  const [runs, setRuns] = useState([]);
  const [byModule, setByModule] = useState({});

  useEffect(() => {
    reviewLog.all().then(setLogs);
    attempts.all().then(setTries);
    cardState.all().then(setCards);
    quizLib.runLog().then(setRuns);
    sched.countsByModule().then(setByModule);
  }, []);

  if (!logs) return <div className="wrap wrap--dash"><h1>Progress</h1><p className="lede" role="status">Reading the log…</p></div>;

  const now = Date.now();
  const day = 86400000;
  const last30 = logs.filter(l => now - new Date(l.reviewedAt) < 30 * day);
  const lapses = last30.filter(l => l.ratingKey === 'again').length;
  const accuracy = last30.length ? Math.round((1 - lapses / last30.length) * 100) : null;
  const days = game.recentDays(g, 28);
  const peak = Math.max(1, ...days.map(d => d.xp));

  // The diagnosis layer. Every figure here is one measurement with a floor
  // under it; nothing is composite and XP is not an input to any of it.
  const bands = prob.bandBreakdown(cat.byId.problem, tries);
  const findings = insight.weakestAreas({ logs, cardStates: cards, attempts: tries, runs, cat, bands });
  const table = insight.moduleTable({ cat, logs, attempts: tries, runs, byModule });
  const trend = calibrationTrendCopy(insight.calibrationTrend(tries, { problemsById: cat.byId.problem }));

  return (
    <div className="wrap wrap--dash">
      <h1>Progress</h1>
      <p className="lede">
        Three layers, measured separately. Review counts say whether the rules are still
        available to you; quiz scores say whether you can pick them out of a line-up; problem
        marks say whether you can use them.
      </p>

      <div className="rank-panel">
        <ProgressRing value={rank.pct} size={128} stroke={9} tone="mastery"
          label={rank.level} sub={`Rank ${rank.level}`} />
        <div>
          <h2 style={{ marginTop: 0 }}>{rank.title}</h2>
          <p className="small">{rank.note}</p>
          <p><strong><CountUp value={g.xp} /></strong> XP total
            {rank.next ? <> · {rank.toNext.toLocaleString()} to {rank.next.title}</> : ' · top rank'}</p>
          <p className="small">
            XP is a count of work done, weighted towards the work that produces learning. It is
            not a measurement of what you know — everything below this panel is.
          </p>
        </div>
      </div>

      <h2>The last four weeks</h2>
      <div className="strip" role="img" aria-label="XP earned each day over the last 28 days">
        {days.map((d, i) => (
          <motion.span
            key={d.day}
            className={`strip-bar${d.xp > 0 ? ' is-on' : ''}`}
            title={`${d.day}: ${d.xp} XP`}
            initial={{ height: 2 }}
            animate={{ height: `${Math.max(2, (d.xp / peak) * 100)}%` }}
            transition={{ delay: i * 0.012, type: 'spring', stiffness: 120, damping: 18 }}
          />
        ))}
      </div>
      <p className="small">
        {g.streak.current > 0
          ? `${plural(g.streak.current, 'day')} running. Longest ${g.streak.longest}.`
          : 'No streak running. A single graded card starts one.'}
        {' '}Best day: {g.best.dayXp} XP.
      </p>

      <h2>Where to look first</h2>
      {findings.length ? (
        <>
          <p className="small">
            Everything from here down is measurement, not XP. Each line is one figure with the
            count it rests on, and a place to go and do something about it. Nothing appears until
            there is enough behind it to mean something.
          </p>
          <WeakSpots findings={findings} />
        </>
      ) : (
        <p>
          Nothing to point at yet. A finding appears once a module has {insight.RECALL_FLOOR} grades
          in thirty days, or {insight.CAL_FLOOR} unaided problem attempts carry a prediction, or a
          card has been forgotten {insight.LAPSE_FLOOR} times. Before that a percentage would be a guess
          dressed as a measurement.
        </p>
      )}

      <h2>The memory layer</h2>
      <StatGrid>
        <Stat n={logs.length} k="reviews all time" />
        <Stat n={last30.length} k="last 30 days" delay={0.05} />
        <Stat n={accuracy === null ? '—' : `${accuracy}%`} k="recall, 30 days"
          tone={accuracy !== null && accuracy < 80 ? 'oxide' : 'sage'} delay={0.1} />
        <Stat n={counts.total} k="cards total" delay={0.15} />
        <Stat n={counts.review} k="in long-term review" delay={0.2} />
        <Stat n={g.totals.forgot} k="honest lapses" delay={0.25} />
      </StatGrid>

      {accuracy !== null && accuracy < 80 && (
        <div className="notice">
          Recall is under 80%. That usually means cards are carrying too much at once — split
          them into single facts rather than lowering the retention setting.
        </div>
      )}

      <h2>The recognition layer</h2>
      {g.totals.quizAnswered ? (
        <>
          <StatGrid>
            <Stat n={g.totals.quizAnswered} k="quiz questions answered" />
            <Stat n={`${Math.round((g.totals.quizCorrect / g.totals.quizAnswered) * 100)}%`} k="right" delay={0.05} />
            <Stat n={g.best.quizStreak} k="longest streak" delay={0.1} />
            <Stat n={g.totals.quizPerfect} k="clean sheets" delay={0.15} />
          </StatGrid>
          <p className="small">
            A quiz percentage runs high and should. Four options with one right answer is a much
            easier act than producing the rule cold, which is why nothing here moves a due date.
            Read it as a floor, not a score.
          </p>
        </>
      ) : (
        <p>
          No quiz questions answered yet. {cat.quizCount} are written —
          {' '}<Link className="tap-exempt" to="/quiz">take one</Link>, or <Link className="tap-exempt" to="/arena">try the Arena</Link>.
        </p>
      )}

      <h2>The reading layer</h2>
      <ReadingSection cat={cat} read={read} />

      <h2>The reasoning layer</h2>
      <ReasoningSection cat={cat} tries={tries} bands={bands} trend={trend} />

      <h2>By module</h2>
      <p className="small">
        One row per module, every figure with the count it rests on. "Too few" means the count is
        under the floor and a percentage would mislead: {insight.RECALL_FLOOR} grades for recall,
        {' '}{insight.QUIZ_FLOOR} answers for quiz, {insight.CAL_FLOOR} predicted attempts for the
        gap. Quiz counts lesson quizzes only; the Arena is not in it. The gap counts unaided
        problems only; rehearsals are not in it.
      </p>
      <ModuleTable rows={table} />

      <h2>What this page still cannot tell you</h2>
      <p>
        Every half above is self-reported. The reviews record whether you pressed Forgot
        honestly and the problem marks record whether you marked yourself honestly, and nothing
        in the app can check either. The calibration figure is the closest it gets: it compares
        one judgment you made against another you made a few minutes later, which at least
        catches drift.
      </p>
      <p>
        The findings and the module table inherit every one of those limits and add one. A floor
        is the point at which a number stops being noise, not the point at which it becomes a
        grade. Ten grades in a module is enough to show a percentage. It is not enough to trust one
        to the nearest five points.
      </p>
      <p className="small">
        Nothing here measures a timed answer written under supervision, or an answer read by
        someone who knows the law better than you do. Neither is a thing a static site can
        supply, and the XP total least of all — it rewards showing up, which is a different
        virtue from being right.
      </p>
    </div>
  );
}

function ReadingSection({ cat, read }) {
  const done = cat.lessons.filter(l => read[l.id]);
  const next = lessonsLib.nextUnread(cat.lessons, read);
  if (!done.length) {
    return (
      <p>
        No lessons marked read. {cat.lessons.length} are written, about
        {' '}{lessonsLib.totalMinutes(cat.lessons)} minutes in all —
        {' '}<Link className="tap-exempt" to="/lessons">start with the first</Link>.
      </p>
    );
  }
  return (
    <>
      <p>
        {done.length} of {cat.lessons.length} lessons marked read.{' '}
        {next
          ? <>Next: <Link className="tap-exempt" to={`/lesson/${next.id}`}>{next.title}</Link>, {plural(next.minutes, 'minute')}.</>
          : 'All of them.'}
      </p>
      <p className="small">
        This is the weakest signal on the page and it is meant to be. It records that you
        pressed a button, not that you understood anything — the cards, the quizzes and the
        problem marks are what test that.
      </p>
    </>
  );
}

function ReasoningSection({ cat, tries, bands, trend }) {
  if (!tries.length) {
    return (
      <p>
        No problem questions attempted yet. {cat.problems.length} are written and waiting —
        {' '}<Link className="tap-exempt" to="/problems">start with one</Link>. This is the half of the curriculum the
        review counts say nothing about.
      </p>
    );
  }

  const byProblem = new Set(tries.map(a => a.problemId));
  const marks = tries.reduce((n, a) => n + prob.percent(a.score, a.total), 0) / tries.length;
  // Calibration is over unaided problems only. A rehearsal hands over half the
  // reasoning, so predicting its mark is easy, and counting it would make the
  // learner look better calibrated than they are.
  const unaided = insight.unaidedAttempts(tries, cat.byId.problem);
  const rehearsals = tries.length - unaided.length;
  const cal = prob.calibration(unaided);
  const recent = [...tries].sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt)).slice(0, 5);

  const calCopy = !cal ? null : cal.direction === 'level'
    ? `Your predictions are level with your own marking, out by ${plural(cal.spread, 'mark')} on average across ${plural(cal.n, 'unaided attempt')}. That is the useful state: it means a mark you are unhappy with is information rather than a surprise.`
    : cal.direction === 'over'
      ? `You predict ${plural(round1(Math.abs(cal.mean)), 'mark')} above what you then award yourself, across ${plural(cal.n, 'unaided attempt')}. Over-estimating is the ordinary direction and the expensive one — it hides the gap it creates.`
      : `You predict ${plural(round1(Math.abs(cal.mean)), 'mark')} below what you then award yourself, across ${plural(cal.n, 'unaided attempt')}. Under-estimating is cheaper, but it makes a good answer hard to tell from a lucky one.`;

  return (
    <>
      <StatGrid>
        <Stat n={tries.length} k="attempts" />
        <Stat n={`${byProblem.size}/${cat.problems.length}`} k="questions attempted" delay={0.05} />
        <Stat n={`${Math.round(marks)}%`} k="mean mark" delay={0.1} />
        <Stat n={cal ? `${cal.mean > 0 ? '+' : ''}${cal.mean}` : '—'} k="calibration gap, unaided"
          tone={cal && cal.direction === 'level' ? 'sage' : 'oxide'} delay={0.15} />
      </StatGrid>

      {calCopy && <p>{calCopy}</p>}
      {calCopy && cal.n < insight.CAL_FLOOR && (
        <p className="small">
          Under {insight.CAL_FLOOR} unaided attempts this is one or two subtractions, not a pattern.
          Read it as a first reading rather than a finding.
        </p>
      )}
      {!cal && rehearsals > 0 && (
        <p>
          No calibration figure yet. {plural(rehearsals, 'rehearsal')} so far and no unaided attempt
          with a prediction. Rehearsals do not count: predicting a mark is easy when the steps are
          handed to you, and counting them would make you look better calibrated than you are.
        </p>
      )}
      {trend && <p className="small">{trend}</p>}

      <h3>Where the marks go</h3>
      <p className="small">
        Marks earned against marks available, by rubric band, across every attempt. A low band is
        a different problem from a low total, and it is fixed by different work — issue-spotting
        by reading more facts, application by writing more answers.
      </p>
      <div className="bands">
        {bands.map((b, i) => (
          <div className="band-row" key={b.band}>
            <span className="band-name">{prob.BANDS[b.band] || b.band}</span>
            <span className="band-bar">
              <motion.i initial={{ width: 0 }} animate={{ width: `${b.pct}%` }}
                transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 70, damping: 18 }} />
            </span>
            <span className="band-num">{b.earned}/{b.available} · {b.pct}% · {plural(b.attempts, 'attempt')}</span>
          </div>
        ))}
      </div>

      <h3>Recent attempts</h3>
      <div className="arrangement">
        {recent.map((a, i) => {
          const q = cat.byId.problem[a.problemId];
          const pc = prob.percent(a.score, a.total);
          return (
            <ArrRow
              key={a.attemptId ?? i}
              moduleId={q ? q.moduleId : undefined}
              index={i}
              to={`/problem/${a.problemId}`}
              num={`${a.score}/${a.total}`}
              title={q ? q.title : a.problemId}
              meta={`${daysAgo(a.markedAt)} · ${a.words} words · ${a.minutesSpent} min${typeof a.predicted === 'number' ? ` · predicted ${a.predicted}` : ''}`}
              state={<span className={`arr-state ${pc >= 70 ? 'is-clear' : pc < 50 ? 'is-due' : ''}`}>{pc}%</span>}
            />
          );
        })}
      </div>
    </>
  );
}
