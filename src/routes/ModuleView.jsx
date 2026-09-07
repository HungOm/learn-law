import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStudy } from '../state/StudyContext.jsx';
import * as sched from '../lib/scheduler.js';
import * as prob from '../lib/problems.js';
import { Notice, Stat, StatGrid } from '../components/Bits.jsx';
import { LessonRow } from './LessonIndex.jsx';
import { ProblemRow } from './Problems.jsx';
import { BookRow, StatuteRow } from './Books.jsx';
import { plural } from '../lib/format.js';
import NotFound from './NotFound.jsx';

export default function ModuleView() {
  const { id } = useParams();
  const { cat, read } = useStudy();
  const m = cat.modules.find(x => x.id === id);
  const [mc, setMc] = useState(sched.EMPTY_COUNTS);
  const [latest, setLatest] = useState({});

  useEffect(() => {
    if (!m) return;
    sched.counts(id).then(setMc);
    prob.latestByProblem().then(setLatest);
  }, [id, m]);

  if (!m) return <NotFound />;

  const quizCount = m.lessons.reduce((n, l) => n + (l.quiz || []).length, 0);
  const firstQuiz = m.lessons.find(l => (l.quiz || []).length);

  return (
    <div className="wrap">
      <p className="small"><Link to="/">← Arrangement of modules</Link></p>
      <h2>{m.title}</h2>
      <p className="lede">
        {m.level === null ? 'Method module' : `Level ${m.level}`} · {plural(m.lessons.length, 'lesson')} ·
        {' '}{plural(mc.total, 'card')} · {plural(m.problems.length, 'problem')} · {quizCount} quiz questions
      </p>

      {m.gap && <Notice><strong>Known gap.</strong> {m.gap}</Notice>}

      <StatGrid>
        <Stat n={mc.due} k="due now" tone={mc.due ? 'oxide' : undefined} />
        <Stat n={mc.fresh} k="not yet seen" delay={0.05} />
        <Stat n={mc.review} k="in review" delay={0.1} />
        <Stat n={`${m.lessons.filter(l => read[l.id]).length}/${m.lessons.length}`} k="lessons read" delay={0.15} />
      </StatGrid>

      <div className="btn-row">
        {mc.due + mc.fresh > 0
          ? <Link className="btn btn-primary" to={`/review?module=${id}`}>Review this module</Link>
          : <span className="small">Nothing due in this module.</span>}
        {firstQuiz && <Link className="btn" to={`/quiz/${firstQuiz.id}`}>Quiz</Link>}
      </div>

      <h3>Lessons</h3>
      {m.lessons.length ? (
        <div className="arrangement">
          {m.lessons.map((l, i) => <LessonRow key={l.id} l={l} readAt={read[l.id]} index={i} />)}
        </div>
      ) : (
        <p className="small">
          No lesson written for this module yet. The reading list below is the route in, and it
          is the honest one — a lesson here would be a summary of a book nobody has read.
        </p>
      )}

      <h3>Problem questions</h3>
      {m.problems.length ? (
        <div className="arrangement">
          {m.problems.map((p, i) => <ProblemRow key={p.id} p={p} last={latest[p.id]} index={i} />)}
        </div>
      ) : <p className="small">None written for this module yet.</p>}

      <h3>Reading</h3>
      {m.books.length ? m.books.map(b => <BookRow key={b.id} b={b} />) : <p className="small">No text assigned yet.</p>}

      <h3>Statutes</h3>
      {m.statuteRefs.length ? m.statuteRefs.map(s => <StatuteRow key={s.id} s={s} />) : <p className="small">None.</p>}
    </div>
  );
}
