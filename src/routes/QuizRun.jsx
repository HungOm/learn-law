import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as quizLib from '../lib/quiz.js';
import * as prog from '../lib/progression.js';
import { QuizStandingLine } from '../components/Insight.jsx';
import { loadLesson } from '../lib/content.js';
import { CountUp, ProgressRing } from '../components/Bits.jsx';
import { burstFrom, fanfare, buzz } from '../lib/fx.js';
import { plural } from '../lib/format.js';
import NotFound from './NotFound.jsx';

export default function QuizRun() {
  const { id } = useParams();
  const { cat, award, toast, read, best: bestMapNow, unlock, refreshBest } = useStudy();
  const meta = cat.byId.lesson[id];

  // The questions ride with the lesson's module chunk, so a quiz is a fetch
  // before it is a run.
  const [lesson, setLesson] = useState(null);
  const [deck, setDeck] = useState(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [wrongIds, setWrongIds] = useState([]);
  const askedAt = useRef(Date.now());
  const boardRef = useRef(null);
  const recorded = useRef(false);
  const [unlocked, setUnlocked] = useState(null);
  // Captured once, at mount: whether the next lesson was locked before this run.
  const wasNextShut = useRef(false);

  useEffect(() => {
    let live = true;
    setLesson(null);
    loadLesson(id).then(full => { if (live) setLesson(full); });
    return () => { live = false; };
  }, [id]);

  const questions = useMemo(() => (lesson?.quiz || []), [lesson]);

  useEffect(() => {
    if (!lesson) return;
    const order = cat.lessons;
    const nextUp = order[order.findIndex(x => x.id === lesson.id) + 1];
    wasNextShut.current = Boolean(nextUp) && !unlock[nextUp.id]?.open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  // Cleared as well as set, so navigating between two quizzes cannot leave the
  // previous lesson's deck on screen while the next one loads.
  useEffect(() => {
    setDeck(questions.length ? quizLib.prepare(questions) : null);
    recorded.current = false;
  }, [questions]);

  // A retake reshuffles rather than reloading the page: the options are drawn in
  // a new order, so a run remembered by position is not a run at all.
  const restart = useCallback(() => {
    recorded.current = false;
    setDeck(quizLib.prepare(questions));
    setI(0); setPicked(null); setCorrect(0); setStreak(0); setBest(0); setXp(0); setWrongIds([]);
  }, [questions]);

  useEffect(() => { askedAt.current = Date.now(); }, [i]);

  const q = deck && deck[i];
  const finished = deck && i >= deck.length;

  const choose = useCallback(async (n) => {
    if (picked !== null || !q) return;
    const right = n === q.answer;
    const ms = Date.now() - askedAt.current;
    setPicked(n);
    buzz(right ? 10 : [10, 50, 10]);

    const nextStreak = right ? streak + 1 : 0;
    setStreak(nextStreak);
    setBest(b => Math.max(b, nextStreak));
    if (right) {
      setCorrect(c => c + 1);
      if (nextStreak >= 3) burstFrom(boardRef.current, { count: 30 + nextStreak * 3 });
    } else {
      setWrongIds(w => [...w, q.id]);
    }
    const res = await award({ kind: 'quizAnswer', correct: right, ms, streak: nextStreak });
    setXp(x => x + res.xp);
  }, [picked, q, streak, award]);

  const next = useCallback(() => { setPicked(null); setI(n => n + 1); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (finished) return;
      if (picked !== null && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); return; }
      if (picked === null && ['1', '2', '3', '4', '5'].includes(e.key)) {
        const n = Number(e.key) - 1;
        if (q && n < q.options.length) choose(n);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, q, finished, choose, next]);

  useEffect(() => {
    if (!finished || recorded.current || !deck || !lesson) return;
    recorded.current = true;
    const perfect = correct === deck.length;
    (async () => {
      const { improved } = await quizLib.recordRun(lesson.id, { correct, total: deck.length });
      // A pass can open the next lesson, so the unlock map has to be rebuilt
      // before the result screen decides what to say.
      const freshBest = await refreshBest();
      // "Opened" only if the next lesson was shut when this run began and this
      // lesson is now finished. `wasNextShut` is captured at mount, before the
      // run could have changed anything.
      const order = cat.lessons;
      const nextUp = order[order.findIndex(x => x.id === lesson.id) + 1] || null;
      setUnlocked(wasNextShut.current && nextUp && prog.isComplete(lesson, read, freshBest)
        ? nextUp : null);
      const res = await award({ kind: 'quizRun', perfect, total: deck.length, correct });
      if (perfect) { fanfare(); toast(`Clean sheet · +${res.xp} XP`, 'mastery'); }
      else if (improved) toast('New best on this quiz', 'correct');
    })();
  }, [finished, deck, correct, lesson, award, toast]);

  if (!meta) return <NotFound />;
  if (!lesson) {
    return (
      <div className="wrap sheet" data-module={meta.moduleId}>
        <h1>{meta.title}</h1>
        <p className="lede" role="status">Fetching the questions…</p>
      </div>
    );
  }
  if (!questions.length) {
    return (
      <div className="wrap sheet" data-module={lesson.moduleId}>
        <h1>{lesson.title}</h1>
        <p className="lede">No quiz written for this lesson yet.</p>
        <Link className="btn" to="/quiz">Other quizzes</Link>
      </div>
    );
  }
  // Every branch that renders its own screen carries its own h1, including the
  // half-second between the questions arriving and the deck being shuffled.
  if (!deck) {
    return (
      <div className="wrap sheet" data-module={lesson.moduleId}>
        <h1>{lesson.title}</h1>
        <p className="lede" role="status">Shuffling…</p>
      </div>
    );
  }

  if (finished) {
    return <Result lesson={lesson} correct={correct} total={deck.length} xp={xp} best={best}
      wrongIds={wrongIds} onRestart={restart} unlocked={unlocked}
      needsRead={!read[lesson.id]} />;
  }

  const pct = Math.round((i / deck.length) * 100);

  return (
    // A question and four options, all of it read for meaning: the reading
    // measure, on a sheet, not the dashboard pane.
    <div className="wrap sheet quizrun" data-module={lesson.moduleId} ref={boardRef}>
      <div className="review-progress">
        <span className="crumb-row"><Link className="crumb" to="/quiz">← Quizzes</Link> {lesson.title}</span>
        <span>{i + 1} of {deck.length}</span>
      </div>

      <div className="qbar" aria-hidden="true">
        <motion.i animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
      </div>

      <div className="quiz-hud">
        <span className="hud-pill">{correct} right</span>
        <AnimatePresence>
          {streak >= 2 && (
            <motion.span
              key="s"
              className={`hud-pill hud-streak${streak >= 5 ? ' is-hot' : ''}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1.35, 1], opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
            >{streak} streak</motion.span>
          )}
        </AnimatePresence>
        <span className="hud-pill hud-xp">+<CountUp value={xp} /> XP</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.key}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* The question is the screen's subject, so it is the screen's
              heading. Without it this route rendered no h1 at all — the same
              gap the review card had, fixed the same way and for the same
              reason. Styled by .quiz-q, not by the tag. */}
          <h1 className="quiz-q">{q.q}</h1>

          <div className="quiz-options">
            {q.options.map((text, n) => (
              <Option
                key={n}
                n={n}
                text={text}
                picked={picked}
                answer={q.answer}
                onPick={() => choose(n)}
              />
            ))}
          </div>

          <AnimatePresence>
            {picked !== null && (
              <motion.div
                className={`quiz-why ${picked === q.answer ? 'is-right' : 'is-wrong'}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="quiz-why-head">
                  {picked === q.answer ? 'Right.' : 'Not that one.'}
                </p>
                <p>{q.why}</p>
                {q.source && <p className="small quiz-src">{q.source}</p>}
                <button className="btn-primary" onClick={next} autoFocus>
                  {i + 1 === deck.length ? 'See the result' : 'Next question'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Option({ n, text, picked, answer, onPick }) {
  const decided = picked !== null;
  const isAnswer = n === answer;
  const isPicked = n === picked;
  const cls = !decided ? '' : isAnswer ? ' is-right' : isPicked ? ' is-wrong' : ' is-dim';

  return (
    <motion.button
      className={`quiz-option${cls}`}
      onClick={onPick}
      disabled={decided}
      initial={{ opacity: 0, y: 14 }}
      animate={
        decided && isPicked && !isAnswer
          ? { opacity: 1, y: 0, x: [0, -9, 8, -6, 4, 0] }
          : decided && isAnswer
            ? { opacity: 1, y: 0, scale: [1, 1.04, 1] }
            : { opacity: 1, y: 0 }
      }
      transition={{ delay: decided ? 0 : n * 0.06, duration: 0.36 }}
      whileHover={decided ? {} : { x: 4 }}
      whileTap={decided ? {} : { scale: 0.98 }}
    >
      <span className="quiz-key">{n + 1}</span>
      <span className="quiz-text">{text}</span>
      {decided && isAnswer && <span className="quiz-tick">✓</span>}
      {decided && isPicked && !isAnswer && <span className="quiz-cross">✗</span>}
    </motion.button>
  );
}

function Result({ lesson, correct, total, xp, best, wrongIds, onRestart, unlocked, needsRead }) {
  const m = quizLib.medal(correct, total);
  const pct = Math.round((correct / total) * 100);
  const missed = (lesson.quiz || []).filter(q => wrongIds.includes(q.id));

  return (
    <div className="wrap sheet quizresult" data-module={lesson.moduleId}>
      <motion.div
        className="result-head"
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 190, damping: 18 }}
      >
        <ProgressRing
          value={pct}
          size={150}
          stroke={10}
          tone={m.tone === 'gold' ? 'mastery' : m.tone === 'oxide' ? 'wrong' : 'correct'}
          label={`${correct}/${total}`}
          sub={m.label}
        />
        <div>
          <h1>{lesson.title}</h1>
          <p className="lede">{quizLib.verdict(correct, total)}</p>
          <p className="result-xp">+<CountUp value={xp} /> XP{best >= 3 ? ` · best run of ${best}` : ''}</p>
        </div>
      </motion.div>

      {/* Where this quiz stands against the rest of its module. Silent until at
          least two lessons in the module have runs, so it never compares a
          score against nothing. */}
      <QuizStandingLine lessonId={lesson.id} />

      {unlocked && (
        <motion.div
          className="unlock-banner"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
        >
          <span className="unlock-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <rect x="5" y="10.5" width="14" height="10" rx="2" className="lk-body" />
              <path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.4-2" className="lk-shackle" />
            </svg>
          </span>
          <span>
            <span className="unlock-kicker">Opened</span>
            <span className="unlock-title">{unlocked.title}</span>
          </span>
          <Link className="btn btn-primary" to={`/lesson/${unlocked.id}`}>Go</Link>
        </motion.div>
      )}

      {needsRead && correct / total >= prog.PASS && (
        <div className="notice notice-sage">
          Passed — but this lesson is not finished until it is marked read, and the next one
          stays shut until it is. <Link to={`/lesson/${lesson.id}`}>Open the lesson</Link> and
          mark it when you have been through it.
        </div>
      )}

      {missed.length > 0 && (
        <>
          <h2>What you missed</h2>
          <div className="missed">
            {missed.map((q, n) => (
              <motion.div
                key={q.id}
                className="missed-row"
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + n * 0.06 }}
              >
                <p className="missed-q">{q.q}</p>
                <p className="missed-a">{q.options[q.answer]}</p>
                <p className="small">{q.why}</p>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <div className="btn-row" style={{ marginTop: '2rem' }}>
        <button className="btn-primary" onClick={onRestart}>Take it again</button>
        <Link className="btn" to={`/lesson/${lesson.id}`}>Re-read the lesson</Link>
        <Link className="btn" to="/quiz">Other quizzes</Link>
      </div>

      <p className="small" style={{ marginTop: '1.5rem' }}>
        {plural(total, 'question')} answered by recognition. The same material asked cold is in
        the review deck, and asked as facts is in the problem questions — those are the two that
        say whether this stuck.
      </p>
    </div>
  );
}
