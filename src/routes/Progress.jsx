import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as prob from '../lib/problems.js';
import * as lessonsLib from '../lib/lessons.js';
import * as game from '../lib/game.js';
import { reviewLog, attempts } from '../lib/db.js';
import { ArrRow, CountUp, ProgressRing, Stat, StatGrid } from '../components/Bits.jsx';
import { daysAgo, plural, round1 } from '../lib/format.js';

export default function Progress() {
  const { cat, counts, read, game: g, rank } = useStudy();
  const [logs, setLogs] = useState(null);
  const [tries, setTries] = useState([]);

  useEffect(() => {
    reviewLog.all().then(setLogs);
    attempts.all().then(setTries);
  }, []);

  if (!logs) return <div className="wrap"><p className="lede">Reading the log…</p></div>;

  const now = Date.now();
  const day = 86400000;
  const last30 = logs.filter(l => now - new Date(l.reviewedAt) < 30 * day);
  const lapses = last30.filter(l => l.ratingKey === 'again').length;
  const accuracy = last30.length ? Math.round((1 - lapses / last30.length) * 100) : null;
  const days = game.recentDays(g, 28);
  const peak = Math.max(1, ...days.map(d => d.xp));

  return (
    <div className="wrap">
      <h2>Progress</h2>
      <p className="lede">
        Three layers, measured separately. Review counts say whether the rules are still
        available to you; quiz scores say whether you can pick them out of a line-up; problem
        marks say whether you can use them.
      </p>

      <div className="rank-panel">
        <ProgressRing value={rank.pct} size={128} stroke={9} tone="gold"
          label={rank.level} sub={`Rank ${rank.level}`} />
        <div>
          <h3 style={{ marginTop: 0 }}>{rank.title}</h3>
          <p className="small">{rank.note}</p>
          <p><strong><CountUp value={g.xp} /></strong> XP total
            {rank.next ? <> · {rank.toNext.toLocaleString()} to {rank.next.title}</> : ' · top rank'}</p>
          <p className="small">
            XP is a count of work done, weighted towards the work that produces learning. It is
            not a measurement of what you know — everything below this panel is.
          </p>
        </div>
      </div>

      <h3>The last four weeks</h3>
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

      <h3>The memory layer</h3>
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

      <h3>The recognition layer</h3>
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
          No quiz questions answered yet. {cat.quizPool.length} are written —
          {' '}<Link to="/quiz">take one</Link>, or <Link to="/arena">try the Arena</Link>.
        </p>
      )}

      <h3>The reading layer</h3>
      <ReadingSection cat={cat} read={read} />

      <h3>The reasoning layer</h3>
      <ReasoningSection cat={cat} tries={tries} />

      <h3>What this page still cannot tell you</h3>
      <p>
        Every half above is self-reported. The reviews record whether you pressed Forgot
        honestly and the problem marks record whether you marked yourself honestly, and nothing
        in the app can check either. The calibration figure is the closest it gets: it compares
        one judgment you made against another you made a few minutes later, which at least
        catches drift.
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
        {' '}<Link to="/lessons">start with the first</Link>.
      </p>
    );
  }
  return (
    <>
      <p>
        {done.length} of {cat.lessons.length} lessons marked read.{' '}
        {next
          ? <>Next: <Link to={`/lesson/${next.id}`}>{next.title}</Link>, {plural(next.minutes, 'minute')}.</>
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

function ReasoningSection({ cat, tries }) {
  if (!tries.length) {
    return (
      <p>
        No problem questions attempted yet. {cat.problems.length} are written and waiting —
        {' '}<Link to="/problems">start with one</Link>. This is the half of the curriculum the
        review counts say nothing about.
      </p>
    );
  }

  const byProblem = new Set(tries.map(a => a.problemId));
  const marks = tries.reduce((n, a) => n + prob.percent(a.score, a.total), 0) / tries.length;
  const cal = prob.calibration(tries);
  const bands = prob.bandBreakdown(cat.byId.problem, tries);
  const recent = [...tries].sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt)).slice(0, 5);

  const calCopy = !cal ? null : cal.direction === 'level'
    ? `Your predictions are level with your own marking, out by ${plural(cal.spread, 'mark')} on average across ${plural(cal.n, 'attempt')}. That is the useful state: it means a mark you are unhappy with is information rather than a surprise.`
    : cal.direction === 'over'
      ? `You predict ${plural(round1(Math.abs(cal.mean)), 'mark')} above what you then award yourself, across ${plural(cal.n, 'attempt')}. Over-estimating is the ordinary direction and the expensive one — it hides the gap it creates.`
      : `You predict ${plural(round1(Math.abs(cal.mean)), 'mark')} below what you then award yourself, across ${plural(cal.n, 'attempt')}. Under-estimating is cheaper, but it makes a good answer hard to tell from a lucky one.`;

  return (
    <>
      <StatGrid>
        <Stat n={tries.length} k="attempts" />
        <Stat n={`${byProblem.size}/${cat.problems.length}`} k="questions attempted" delay={0.05} />
        <Stat n={`${Math.round(marks)}%`} k="mean mark" delay={0.1} />
        <Stat n={cal ? `${cal.mean > 0 ? '+' : ''}${cal.mean}` : '—'} k="calibration gap"
          tone={cal && cal.direction === 'level' ? 'sage' : 'oxide'} delay={0.15} />
      </StatGrid>

      {calCopy && <p>{calCopy}</p>}

      <h4>Where the marks go</h4>
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
            <span className="band-num">{b.earned}/{b.available} · {b.pct}%</span>
          </div>
        ))}
      </div>

      <h4>Recent attempts</h4>
      <div className="arrangement">
        {recent.map((a, i) => {
          const q = cat.byId.problem[a.problemId];
          const pc = prob.percent(a.score, a.total);
          return (
            <ArrRow
              key={a.attemptId ?? i}
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
