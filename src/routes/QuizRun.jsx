import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as quizLib from '../lib/quiz.js';
import { CountUp, ProgressRing } from '../components/Bits.jsx';
import { burstFrom, fanfare, buzz } from '../lib/fx.js';
import { plural } from '../lib/format.js';
import NotFound from './NotFound.jsx';

export default function QuizRun() {
  const { id } = useParams();
  const { cat, award, toast } = useStudy();
  const lesson = cat.byId.lesson[id];

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

  const questions = useMemo(() => (lesson?.quiz || []), [lesson]);

  useEffect(() => {
    if (questions.length) setDeck(quizLib.prepare(questions));
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
    if (!finished || recorded.current || !deck) return;
    recorded.current = true;
    const perfect = correct === deck.length;
    (async () => {
      const { improved } = await quizLib.recordRun(lesson.id, { correct, total: deck.length });
      const res = await award({ kind: 'quizRun', perfect, total: deck.length, correct });
      if (perfect) { fanfare(); toast(`Clean sheet · +${res.xp} XP`, 'gold'); }
      else if (improved) toast('New best on this quiz', 'sage');
    })();
  }, [finished, deck, correct, lesson, award, toast]);

  if (!lesson) return <NotFound />;
  if (!questions.length) {
    return (
      <div className="wrap">
        <h2>{lesson.title}</h2>
        <p className="lede">No quiz written for this lesson yet.</p>
        <Link className="btn" to="/quiz">Other quizzes</Link>
      </div>
    );
  }
  if (!deck) return <div className="wrap"><p className="lede">Shuffling…</p></div>;

  if (finished) {
    return <Result lesson={lesson} correct={correct} total={deck.length} xp={xp} best={best}
      wrongIds={wrongIds} onRestart={restart} />;
  }

  const pct = Math.round((i / deck.length) * 100);

  return (
    <div className="wrap quizrun" ref={boardRef}>
      <div className="review-progress">
        <span><Link to="/quiz">← Quizzes</Link> · {lesson.title}</span>
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
          <p className="quiz-q">{q.q}</p>

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

function Result({ lesson, correct, total, xp, best, wrongIds, onRestart }) {
  const m = quizLib.medal(correct, total);
  const pct = Math.round((correct / total) * 100);
  const missed = (lesson.quiz || []).filter(q => wrongIds.includes(q.id));

  return (
    <div className="wrap quizresult">
      <motion.div
        className="result-head"
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 190, damping: 18 }}
      >
        <ProgressRing
          value={pct}
          size={150}
          stroke={10}
          tone={m.tone === 'gold' ? 'gold' : m.tone === 'oxide' ? 'oxide' : 'sage'}
          label={`${correct}/${total}`}
          sub={m.label}
        />
        <div>
          <h2>{lesson.title}</h2>
          <p className="lede">{quizLib.verdict(correct, total)}</p>
          <p className="result-xp">+<CountUp value={xp} /> XP{best >= 3 ? ` · best run of ${best}` : ''}</p>
        </div>
      </motion.div>

      {missed.length > 0 && (
        <>
          <h3>What you missed</h3>
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
