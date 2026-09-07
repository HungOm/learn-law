import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as sched from '../lib/scheduler.js';
import * as lessonsLib from '../lib/lessons.js';
import { ArrRow, CountUp, ProgressRing, TodayCard } from '../components/Bits.jsx';
import { plural } from '../lib/format.js';

export default function Home() {
  const { cat, counts, read, game, rank, goal } = useStudy();
  const [byModule, setByModule] = useState({});

  useEffect(() => { sched.countsByModule().then(setByModule); }, [counts]);

  const total = counts.due + counts.fresh;
  const nextLesson = lessonsLib.nextUnread(cat.lessons, read);
  const readCount = cat.lessons.filter(l => read[l.id]).length;

  return (
    <div className="wrap">
      <h2>Malaysian law, from zero</h2>
      <p className="lede">
        A sixteen-module curriculum. Progress is gated on whether you can write a
        competent answer, not on how much you have read.
      </p>

      <motion.div
        className="hero"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <ProgressRing
          value={goal.pct}
          size={116}
          tone={goal.met ? 'gold' : 'sage'}
          label={<CountUp value={goal.earned} />}
          sub={`of ${goal.goal} XP`}
        />
        <div className="hero-body">
          <p className="hero-rank">
            Rank {rank.level} · <strong>{rank.title}</strong>
          </p>
          <p className="hero-line">
            {goal.met
              ? 'Today\'s goal is met. Anything past this is interest.'
              : `${goal.goal - goal.earned} XP to today's goal.`}
            {' '}
            {game.streak.current > 0
              ? `${plural(game.streak.current, 'day')} running, best ${game.streak.longest}.`
              : 'No streak running — one card starts one.'}
          </p>
          <div className="btn-row">
            <Link className={`btn ${total ? 'btn-primary' : ''}`} to="/review">
              {total ? `Review ${total}` : 'Review'}
            </Link>
            <Link className="btn" to="/arena">Arena</Link>
            {nextLesson && <Link className="btn" to={`/lesson/${nextLesson.id}`}>Next lesson</Link>}
          </div>
        </div>
      </motion.div>

      <TodayCard tone={total ? 'oxide' : 'sage'} delay={0.08}>
        {total === 0 ? (
          <p>
            Nothing due.{' '}
            {counts.total ? 'The schedule is clear until tomorrow.' : 'Add cards under content/cards/ to begin.'}
          </p>
        ) : (
          <>
            <p>
              {plural(counts.due, 'card')} due for review
              {counts.fresh ? `, ${counts.fresh} not yet seen` : ''}.
            </p>
            <p className="small">
              Reviews should take about a fifth of your study time. The rest goes to reading,
              briefing and problem questions.
            </p>
            <div className="btn-row"><Link className="btn btn-primary" to="/review">Start review</Link></div>
          </>
        )}
      </TodayCard>

      <h3>Arrangement of modules</h3>
      <div className="arrangement">
        {cat.modules.map((m, i) => {
          const mc = byModule[m.id] || sched.EMPTY_COUNTS;
          const readIn = m.lessons.filter(l => read[l.id]).length;
          const pct = m.lessons.length ? Math.round((readIn / m.lessons.length) * 100) : 0;
          const due = mc.due + mc.fresh;
          const num = m.level === null || m.level === undefined ? '—' : String(m.level).padStart(2, '0');
          return (
            <ArrRow
              key={m.id}
              index={i}
              to={`/module/${m.id}`}
              locked={!mc.total && !m.lessons.length}
              num={num}
              title={m.title}
              flag={m.gap ? <span className="flag flag-unverified">gap</span> : null}
              meta={
                <>
                  {plural(m.lessons.length, 'lesson')} · {plural(mc.total, 'card')} · {plural(m.problems.length, 'problem')}
                  <span className="minibar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
                </>
              }
              state={
                due
                  ? <span className="arr-state is-due">{due} due</span>
                  : mc.total
                    ? <span className="arr-state is-clear">clear</span>
                    : <span className="arr-state">{readIn}/{m.lessons.length} read</span>
              }
            />
          );
        })}
      </div>

      <div className="layer-grid">
        <LayerCard
          to="/lessons"
          n={`${readCount}/${cat.lessons.length}`}
          title="Lessons"
          body="The exposition. States the rules, names its sources, and says what has to be checked before you rely on it."
          delay={0}
        />
        <LayerCard
          to="/quiz"
          n={cat.quizPool.length}
          title="Quiz questions"
          body="Recognition, under a clock. Sits between a card and a problem question, and pays XP without touching the schedule."
          delay={0.06}
        />
        <LayerCard
          to="/review"
          n={cat.cards.length}
          title="Cards"
          body="Recall, cold, scheduled by FSRS. This is the only layer that moves a due date."
          delay={0.12}
        />
        <LayerCard
          to="/problems"
          n={cat.problems.length}
          title="Problem questions"
          body="Forty minutes of writing, self-marked against a rubric, with your own prediction recorded first."
          delay={0.18}
        />
      </div>

      <p className="small" style={{ marginTop: '2rem' }}>
        Levels follow the sequence in the study design: foundations and method first,
        then constitutional, criminal and contract, then tort, property and company,
        with procedure and evidence last because they presuppose the substantive law.
      </p>
    </div>
  );
}

function LayerCard({ to, n, title, body, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
    >
      <Link className="layer-card" to={to}>
        <span className="layer-n">{n}</span>
        <span className="layer-title">{title}</span>
        <span className="layer-body">{body}</span>
      </Link>
    </motion.div>
  );
}
