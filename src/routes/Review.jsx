import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as sched from '../lib/scheduler.js';
import * as lessonsLib from '../lib/lessons.js';
import { CountUp, Stat, StatGrid } from '../components/Bits.jsx';
import { fanfare, burstFrom, buzz } from '../lib/fx.js';
import { plural } from '../lib/format.js';

const GRADE_KEYS = ['1', '2', '3', '4'];

export default function Review() {
  const [params] = useSearchParams();
  const moduleId = params.get('module') || null;
  const { cat, award, refreshCounts, celebrate } = useStudy();

  const [queue, setQueue] = useState(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [tally, setTally] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [xpTotal, setXpTotal] = useState(0);
  const [float, setFloat] = useState(null);
  const [flash, setFlash] = useState(null);
  const startedAt = useRef(Date.now());
  const gradesRef = useRef(null);
  const busy = useRef(false);

  useEffect(() => {
    sched.buildQueue({ moduleId }).then(q => setQueue(q.queue));
  }, [moduleId]);

  const state = queue && queue[i];
  const card = state ? cat.byId.card[state.id] : null;
  const preview = useMemo(() => (state ? sched.preview(state) : null), [state]);
  const done = queue && i >= queue.length;

  const submit = useCallback(async (key) => {
    if (busy.current || !queue || i >= queue.length) return;
    busy.current = true;
    const row = queue[i];
    const nextCombo = key === 'again' ? 0 : combo + 1;

    await sched.grade(row, key);
    const res = await award({ kind: 'review', ratingKey: key, combo: nextCombo });

    setTally(t => ({ ...t, [key]: t[key] + 1 }));
    setCombo(nextCombo);
    setBestCombo(b => Math.max(b, nextCombo));
    setXpTotal(x => x + res.xp);
    setFloat({ id: Date.now(), xp: res.xp });
    setFlash(key === 'again' ? 'miss' : 'hit');
    buzz(key === 'again' ? [8, 40, 8] : 10);
    if (nextCombo > 0 && nextCombo % 10 === 0) burstFrom(gradesRef.current, { count: 60 });
    setTimeout(() => setFlash(null), 320);

    setRevealed(false);
    setI(n => n + 1);
    refreshCounts();
    busy.current = false;
  }, [queue, i, combo, award, refreshCounts]);

  useEffect(() => {
    if (done && queue?.length) { fanfare(); celebrate(); }
  }, [done, queue, celebrate]);

  useEffect(() => {
    const onKey = (e) => {
      if (done) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setRevealed(true); return; }
      if (revealed && GRADE_KEYS.includes(e.key)) {
        e.preventDefault();
        submit(sched.RATING_LABELS[Number(e.key) - 1].key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, done, submit]);

  if (!queue) return <div className="review"><p className="lede">Building the queue…</p></div>;

  if (!queue.length) {
    return (
      <div className="wrap review">
        <p className="small"><Link to="/">← Arrangement of modules</Link></p>
        <h2>Nothing due</h2>
        <p className="lede">Come back tomorrow. Consistency beats volume — FSRS assumes you show up.</p>
        <div className="btn-row">
          <Link className="btn btn-primary" to="/arena">Play the Arena instead</Link>
          <Link className="btn" to="/lessons">Read a lesson</Link>
        </div>
      </div>
    );
  }

  if (done) return <Finish queue={queue} tally={tally} xpTotal={xpTotal} bestCombo={bestCombo} startedAt={startedAt.current} />;

  // A card whose state survives in IndexedDB after its content was deleted from
  // /content. Skipping it in an effect rather than during render, because a
  // setState in a render body is a re-entrant render React is entitled to loop on.
  if (!card) return <SkipMissing onSkip={() => setI(n => n + 1)} />;

  const mod = cat.byId.module[card.moduleId] || {};
  const lesson = lessonsLib.lessonForCard(cat.lessons, card.id);
  const pct = Math.round((i / queue.length) * 100);

  return (
    <div className={`review${flash ? ` flash-${flash}` : ''}`}>
      <div className="review-progress">
        <span>{i + 1} of {queue.length}</span>
        <span>{mod.title || ''}</span>
      </div>

      <div className="qbar" aria-hidden="true">
        <motion.i animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
      </div>

      <ComboMeter combo={combo} />

      <div className="flipwrap">
        <motion.div
          className="flipcard"
          key={card.id}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: revealed ? 180 : 0 }}
          transition={{ rotateX: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }, default: { duration: 0.35 } }}
        >
          <div className="flip-face flip-front">
            <p className="card-kind">{cat.cardTypes[card.type] ? card.type : 'card'}</p>
            <p className="card-front">{card.front}</p>
            <p className="keyhint">Space or Enter to reveal. Try to answer out loud first.</p>
          </div>
          <div className="flip-face flip-back">
            <p className="card-kind">answer</p>
            <p className="card-back-text">{card.back}</p>
            {card.note && <p className="card-note">{card.note}</p>}
            <p className="card-source">
              {card.source}
              {lesson && <> · from <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link></>}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="review-actions" ref={gradesRef}>
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="show"
              className="btn-row"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ justifyContent: 'center' }}
            >
              <motion.button
                className="btn-primary btn-big"
                onClick={() => setRevealed(true)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              >Show answer</motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="grades"
              className="grades"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              {sched.RATING_LABELS.map((r, n) => (
                <motion.button
                  key={r.key}
                  className="grade"
                  data-key={r.key}
                  title={r.hint}
                  onClick={() => submit(r.key)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: n * 0.05 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="g-num">{n + 1}</span>
                  <span className="g-label">{r.label}</span>
                  <span className="g-int">{preview[r.key].interval}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {float && (
            <motion.span
              key={float.id}
              className="xp-float"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: [0, 1, 1, 0], y: -54, scale: [0.8, 1.3, 1, 1] }}
              transition={{ duration: 1.3, times: [0, 0.15, 0.7, 1] }}
              onAnimationComplete={() => setFloat(null)}
            >+{float.xp} XP</motion.span>
          )}
        </AnimatePresence>
      </div>

      {revealed && (
        <p className="keyhint">
          1 forgot · 2 hard · 3 good · 4 easy. Press <strong>Forgot</strong> when you actually
          failed — it still pays XP, and using Hard as a soft fail inflates every future interval.
        </p>
      )}
    </div>
  );
}

/** A card the deck still schedules but the catalogue no longer defines. */
function SkipMissing({ onSkip }) {
  useEffect(() => { onSkip(); }, [onSkip]);
  return null;
}

function ComboMeter({ combo }) {
  return (
    <div className="combo" aria-live="polite">
      <AnimatePresence>
        {combo >= 2 && (
          <motion.div
            key="c"
            className={`combo-pill${combo >= 10 ? ' is-hot' : ''}${combo >= 20 ? ' is-blaze' : ''}`}
            initial={{ opacity: 0, scale: 0.6, y: -6 }}
            animate={{ opacity: 1, scale: [1.3, 1], y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 340, damping: 18 }}
          >
            <span className="combo-n">{combo}</span>
            <span className="combo-k">in a row</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Finish({ queue, tally, xpTotal, bestCombo, startedAt }) {
  const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  const graded = tally.again + tally.hard + tally.good + tally.easy;
  const recall = graded ? Math.round((1 - tally.again / graded) * 100) : 0;

  return (
    <div className="wrap review">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
        <h2>Session done</h2>
        <p className="lede">
          {plural(queue.length, 'card')} in about {plural(mins, 'minute')}.
        </p>
      </motion.div>

      <motion.div className="xp-banner"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <span className="xp-banner-n">+<CountUp value={xpTotal} /></span>
        <span className="xp-banner-k">XP earned{bestCombo >= 3 ? ` · best run of ${bestCombo}` : ''}</span>
      </motion.div>

      <StatGrid>
        <Stat n={tally.again} k="forgot" tone="oxide" delay={0.2} />
        <Stat n={tally.hard} k="hard" delay={0.25} />
        <Stat n={tally.good} k="good" delay={0.3} />
        <Stat n={tally.easy} k="easy" delay={0.35} />
        <Stat n={`${recall}%`} k="recalled" tone={recall >= 80 ? 'sage' : 'oxide'} delay={0.4} />
      </StatGrid>

      {recall < 80 && graded >= 8 && (
        <div className="notice">
          Under 80% recalled. That usually means the cards are carrying too much at once —
          split them into single facts rather than lowering the retention setting.
        </div>
      )}

      <p className="small">
        Reviews are the memory layer. The reasoning layer needs a problem question and a
        written answer — that is where the actual learning happens.
      </p>
      <div className="btn-row">
        <Link className="btn btn-primary" to="/problems">Write a problem answer</Link>
        <Link className="btn" to="/arena">Arena</Link>
        <Link className="btn" to="/">Back to modules</Link>
      </div>
    </div>
  );
}
