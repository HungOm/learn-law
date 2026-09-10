import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStudy } from '../state/StudyContext.jsx';
import * as sched from '../lib/scheduler.js';
import * as prob from '../lib/problems.js';
import * as sections_ from '../lib/sections.js';
import { Notice, Stat, StatGrid } from '../components/Bits.jsx';
import { BrandBlock } from '../components/Liquid.jsx';
import { LessonRow } from './LessonIndex.jsx';
import * as prog from '../lib/progression.js';
import { ProblemRow } from './Problems.jsx';
import { BookRow, StatuteRow } from './Books.jsx';
import { relatedActs } from '../lib/statutes.js';
import { plural } from '../lib/format.js';
import NotFound from './NotFound.jsx';

export default function ModuleView() {
  const { id } = useParams();
  const { cat, read, best, unlock } = useStudy();
  const m = cat.modules.find(x => x.id === id);
  const [mc, setMc] = useState(sched.EMPTY_COUNTS);
  const [latest, setLatest] = useState({});
  // Section progress, so the rows here say the same thing as the rows on the
  // lesson index rather than two different things about one lesson.
  const [secRead, setSecRead] = useState({});

  useEffect(() => {
    if (!m) return;
    sched.counts(id).then(setMc);
    prob.latestByProblem().then(setLatest);
    sections_.readMap().then(setSecRead);
  }, [id, m]);

  if (!m) return <NotFound />;

  const quizCount = m.lessons.reduce((n, l) => n + (l.quizCount || 0), 0);
  const firstQuiz = m.lessons.find(l => l.quizCount > 0);

  return (
    // An index of one module: stat grid, three lists of rows, book entries.
    // None of it is a column of prose, so it takes the dashboard pane. The
    // data-module is on the page itself, so --module-tint and --module-ink
    // resolve for every descendant and the whole page takes the module's
    // colour — with the module's name as the h1 above it.
    <div className="wrap wrap--dash" data-module={m.id}>
      {/* A lone link in a short paragraph is a control wearing prose clothing
          and gets no inline exemption (DESIGN.md 3, Tap targets): it measured
          159x17 at every width. .taplink in a .taplink-row gives it a real
          44px target without touching the line box of any running text. */}
      <p className="small taplink-row"><Link className="taplink" to="/">← Arrangement of modules</Link></p>
      <header className="module-head">
        {/* The whole page is about one module, so the head states which one in
            that module's colour, at a size a reader takes in before reading a
            word. The title is inside the block and identifies it in words; the
            colour is reinforcement, never the identifier (DESIGN.md 2.9).

            The counts line stays OUTSIDE. It is `.lede`, which is
            --text-secondary, and secondary ink over the block's 12% swell
            measures 4.6:1 — under its 5:1 floor. The block also replaces the
            .module-rule that was here: a rule and a block in the same ink at
            the same head are one cue said twice. */}
        <BrandBlock module={m.id}>
          <h1 className="brandblock-title">{m.title}</h1>
        </BrandBlock>
        <p className="lede">
          {m.level === null ? 'Method module' : `Level ${m.level}`} · {plural(m.lessons.length, 'lesson')} ·
          {' '}{plural(mc.total, 'card')} · {plural(m.problems.length, 'problem')} · {quizCount} quiz questions
        </p>
      </header>

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

      <h2>Lessons</h2>
      {m.lessons.length ? (
        <div className="arrangement">
          {m.lessons.map((l, i) => <LessonRow key={l.id} l={l} readAt={read[l.id]} index={i}
            gate={unlock[l.id]} done={prog.isComplete(l, read, best)} secRead={secRead} />)}
        </div>
      ) : (
        <p className="small">
          No lesson written for this module yet. The reading list below is the route in, and it
          is the honest one — a lesson here would be a summary of a book nobody has read.
        </p>
      )}

      <h2>Problem questions</h2>
      {m.problems.length ? (
        <div className="arrangement">
          {m.problems.map((p, i) => <ProblemRow key={p.id} p={p} last={latest[p.id]} index={i} />)}
        </div>
      ) : <p className="small">None written for this module yet.</p>}

      <h2>Reading</h2>
      {m.books.length ? m.books.map(b => <BookRow key={b.id} b={b} />) : <p className="small">No text assigned yet.</p>}

      <h2>Statutes</h2>
      {m.statuteRefs.length ? m.statuteRefs.map(s => <StatuteRow key={s.id} s={s} />) : <p className="small">None.</p>}

      <GuidedElsewhere m={m} cat={cat} />
    </div>
  );
}

/**
 * Guided readings of this module's own Acts, written under another module.
 *
 * Ten modules have no guided reading of their own, and not for want of one
 * being written: every numbered provision they cite already HAS a page, owned
 * by whichever module claimed it first, and `check-statutes.py` rightly forbids
 * a second page on one provision. So a reader in Commercial Law is one hop from
 * eleven guided readings of the Act their module runs on, with nothing on the
 * page to say so.
 *
 * Deliberately a weaker claim than the lists above it, and separated so it
 * reads as one. A page written FOR this module is a strong claim; a page
 * surfaced here because the module declares the same Act is correct, useful and
 * not the same thing — and flattening the two is how a reader stops checking.
 * Same reasoning as the tiering in `ReadAlongside.jsx`.
 */
function GuidedElsewhere({ m, cat }) {
  const groups = relatedActs(m.id, m.statutes);
  if (!groups.length) return null;
  return (
    <>
      <h2>Guided elsewhere in the course</h2>
      <p className="small">
        Guided readings of the Acts this module runs on, written for another
        module's lesson. They open when that lesson is marked read.
      </p>
      {groups.map(g => (
        <div className="book" key={g.actId}>
          <div className="book-title">{g.act}</div>
          <p className="book-byline">
            {plural(g.list.length, 'guided reading')}, in{' '}
            {[...new Set(g.list.map(x => x.moduleId))]
              .map(id => cat.byId.module[id]?.title || id).join(', ')}
          </p>
          <p className="book-note">
            {g.list.map((x, i) => (
              <span key={x.id}>
                {i ? ' · ' : ''}<Link to={`/statute/${x.id}`}>{x.provision}</Link>
              </span>
            ))}
          </p>
        </div>
      ))}
    </>
  );
}
