import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as prob from '../lib/problems.js';
import { ArrRow } from '../components/Bits.jsx';
import Inline from '../components/Inline.jsx';
import { burstFrom } from '../lib/fx.js';
import { daysAgo, plural } from '../lib/format.js';
import NotFound from './NotFound.jsx';

export default function LessonView() {
  const { id } = useParams();
  const { cat, read, markLesson } = useStudy();
  const l = cat.byId.lesson[id];
  const btnRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (!l) return <NotFound />;

  const mod = cat.byId.module[l.moduleId] || {};
  const siblings = mod.lessons || [];
  const i = siblings.findIndex(x => x.id === l.id);
  const nextInModule = siblings[i + 1] || null;
  const cards = (l.plants || []).map(cid => cat.byId.card[cid]).filter(Boolean);
  const prepares = (l.prepares || []).map(pid => cat.byId.problem[pid]).filter(Boolean);
  const readAt = read[l.id];

  const toggle = async () => {
    setBusy(true);
    if (!readAt) burstFrom(btnRef.current, { count: 70, spread: 80 });
    await markLesson(l.id, Boolean(readAt));
    setBusy(false);
  };

  return (
    <div className="wrap lesson">
      <motion.div className="readbar" style={{ scaleX: bar }} aria-hidden="true" />

      <div className="review-progress">
        <span><Link to="/lessons">← Lessons</Link> · <Link to={`/module/${l.moduleId}`}>{mod.title || ''}</Link></span>
        <span>{plural(l.minutes, 'minute')}{siblings.length > 1 ? ` · ${i + 1} of ${siblings.length}` : ''}</span>
      </div>

      <h2>{l.title}</h2>
      <p className="lede">{l.summary}</p>

      {(l.sections || []).map((sec, n) => (
        <motion.section
          className="lsec"
          key={n}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <h3>{sec.h}</h3>
          {(sec.body || []).map((b, k) => <Block key={k} b={b} />)}
        </motion.section>
      ))}

      {(l.quiz || []).length > 0 && (
        <motion.div
          className="quiz-invite"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <div>
            <h3 style={{ marginTop: 0 }}>Check it before you leave</h3>
            <p className="small">
              {plural(l.quiz.length, 'question')} on what you have just read. Recognition, not
              recall — but a question you cannot even recognise the answer to is a section to
              read again now rather than in three weeks when the card comes round.
            </p>
          </div>
          <Link className="btn btn-primary btn-big" to={`/quiz/${l.id}`}>Take the quiz</Link>
        </motion.div>
      )}

      {(cards.length > 0 || prepares.length > 0) && (
        <div className="handoff">
          <h3>What this lesson hands off to</h3>
          {cards.length > 0 && (
            <>
              <p className="small">
                It plants {plural(cards.length, 'card')}, which the scheduler will start showing
                you. They are already in the deck — reading this is what makes them answerable
                rather than guessable.
              </p>
              <ul className="plantlist">{cards.map(c => <li key={c.id}>{c.front}</li>)}</ul>
            </>
          )}
          {prepares.length > 0 && (
            <>
              <p className="small" style={{ marginTop: '1.25rem' }}>It prepares you for:</p>
              <div className="arrangement">
                {prepares.map((pr, n) => (
                  <ArrRow
                    key={pr.id}
                    index={n}
                    to={`/problem/${pr.id}`}
                    num={`${pr.minutes}′`}
                    title={pr.title}
                    meta={`${prob.totalMarks(pr)} marks · written to follow this lesson`}
                    state={<span className="arr-state">problem</span>}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {(l.reading || []).length > 0 && (
        <>
          <h3>Read alongside</h3>
          {l.reading.map((r, n) => {
            const b = cat.byId.book[r.bookId];
            if (!b) return null;
            return (
              <div className="book" key={n}>
                <div className="book-title">{b.title}</div>
                <p className="book-byline">{[b.author, b.edition ? `${b.edition} ed.` : null].filter(Boolean).join(' · ')}</p>
                <p className="book-note">{r.where}</p>
              </div>
            );
          })}
        </>
      )}

      <div className="source-note">
        <p className="small"><strong>Sources.</strong> {l.source}</p>
        <p className="small">
          <strong>Verify before relying on this.</strong> {l.verify}{' '}
          Last checked by the author of this lesson on {l.lastVerified}.
        </p>
      </div>

      <div className="btn-row" style={{ marginTop: '2rem' }} ref={btnRef}>
        <motion.button
          className={readAt ? '' : 'btn-primary'}
          onClick={toggle}
          disabled={busy}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          {readAt ? 'Mark unread' : 'Mark as read · +60 XP'}
        </motion.button>
        {nextInModule && <Link className="btn" to={`/lesson/${nextInModule.id}`}>Next: {nextInModule.title}</Link>}
        {prepares.length > 0 && <Link className="btn" to={`/problem/${prepares[0].id}`}>Attempt the problem</Link>}
      </div>
      {readAt && (
        <p className="small">
          Marked read {daysAgo(readAt)}. Re-reading costs nothing and is not tracked — only
          whether you have been through it once.
        </p>
      )}
    </div>
  );
}

export function Block({ b }) {
  switch (b.t) {
    case 'rule':
      return (
        <motion.div
          className="ruleblock"
          initial={{ opacity: 0, x: -14 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4 }}
        >
          <p><Inline text={b.text} /></p>
          {b.source && <p className="rb-src">{b.source}</p>}
        </motion.div>
      );
    case 'example':
      return <div className="exblock"><p><span className="xlabel">Example</span><Inline text={b.text} /></p></div>;
    case 'caution':
      return <div className="cautionblock"><p><span className="xlabel">Careful</span><Inline text={b.text} /></p></div>;
    case 'list':
      return <ul className="lsec-list">{(b.items || []).map((t, i) => <li key={i}><Inline text={t} /></li>)}</ul>;
    default:
      return <p><Inline text={b.text} /></p>;
  }
}
