import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as quizLib from '../lib/quiz.js';
import { ARENA_LIVES, ARENA_SECONDS } from '../lib/quiz.js';
import { CountUp, ProgressRing } from '../components/Bits.jsx';
import { burstFrom, fanfare, buzz } from '../lib/fx.js';

const STAGE = { ready: 'ready', playing: 'playing', over: 'over' };

export default function Arena() {
  const { cat, award, toast } = useStudy();
  const [stage, setStage] = useState(STAGE.ready);
  const [deck, setDeck] = useState([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [lives, setLives] = useState(ARENA_LIVES);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [msLeft, setMsLeft] = useState(ARENA_SECONDS * 1000);
  const [record, setRecord] = useState({ score: 0 });
  const [finalScore, setFinalScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const askedAt = useRef(Date.now());
  const endsAt = useRef(0);
  const boardRef = useRef(null);
  const advanceTimer = useRef(null);

  const pool = cat.quizPool;

  useEffect(() => { quizLib.arenaBest().then(setRecord); }, []);
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const start = useCallback(() => {
    setDeck(quizLib.prepare(pool));
    setI(0); setPicked(null); setLives(ARENA_LIVES);
    setCorrect(0); setAnswered(0); setStreak(0); setBest(0); setXp(0);
    setNewRecord(false);
    endsAt.current = Date.now() + ARENA_SECONDS * 1000;
    setMsLeft(ARENA_SECONDS * 1000);
    askedAt.current = Date.now();
    setStage(STAGE.playing);
  }, [pool]);

  // Own clock, ticking on a frame rather than an interval so the ring drains
  // smoothly instead of stepping once a second.
  useEffect(() => {
    if (stage !== STAGE.playing) return undefined;
    let raf;
    const tick = () => {
      const left = endsAt.current - Date.now();
      setMsLeft(Math.max(0, left));
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const q = stage === STAGE.playing ? deck[i % Math.max(1, deck.length)] : null;

  const finish = useCallback(async (finalLives, finalCorrect, finalBest, finalAnswered) => {
    setStage(STAGE.over);
    const secondsLeft = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
    const score = quizLib.arenaScore({
      correct: finalCorrect, bestStreak: finalBest, secondsLeft, lives: finalLives,
    });
    setFinalScore(score);
    const { improved, best: b } = await quizLib.recordArena({
      score, correct: finalCorrect, answered: finalAnswered, bestStreak: finalBest,
    });
    setRecord(b);
    setNewRecord(improved);
    await award({ kind: 'quizRun', arena: true, score, total: finalAnswered, correct: finalCorrect, perfect: false });
    if (improved) { fanfare(); toast(`New Arena record — ${score.toLocaleString()}`, 'gold'); }
  }, [award, toast]);

  // Time out ends the run wherever it is.
  useEffect(() => {
    if (stage === STAGE.playing && msLeft <= 0) finish(lives, correct, best, answered);
  }, [msLeft, stage, lives, correct, best, answered, finish]);

  const choose = useCallback(async (n) => {
    if (picked !== null || !q || stage !== STAGE.playing) return;
    const right = n === q.answer;
    const ms = Date.now() - askedAt.current;
    setPicked(n);
    buzz(right ? 8 : [10, 60, 10]);

    const nextStreak = right ? streak + 1 : 0;
    const nextLives = right ? lives : lives - 1;
    const nextCorrect = right ? correct + 1 : correct;
    const nextBest = Math.max(best, nextStreak);
    const nextAnswered = answered + 1;

    setStreak(nextStreak); setLives(nextLives); setCorrect(nextCorrect);
    setBest(nextBest); setAnswered(nextAnswered);

    if (right) {
      // A correct answer buys two seconds back. It is the only way to extend a
      // run, which is what makes speed worth something.
      endsAt.current += 2000;
      if (nextStreak >= 3) burstFrom(boardRef.current, { count: 24 + nextStreak * 4 });
    }

    const res = await award({ kind: 'quizAnswer', correct: right, ms, streak: nextStreak });
    setXp(x => x + res.xp);

    advanceTimer.current = setTimeout(() => {
      if (nextLives <= 0) { finish(0, nextCorrect, nextBest, nextAnswered); return; }
      setPicked(null);
      setI(k => k + 1);
      askedAt.current = Date.now();
    }, right ? 520 : 1500);
  }, [picked, q, stage, streak, lives, correct, best, answered, award, finish]);

  useEffect(() => {
    const onKey = (e) => {
      if (stage === STAGE.ready && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); start(); return; }
      if (stage !== STAGE.playing || picked !== null) return;
      if (['1', '2', '3', '4', '5'].includes(e.key) && q && Number(e.key) - 1 < q.options.length) {
        choose(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, picked, q, choose, start]);

  const timePct = (msLeft / (ARENA_SECONDS * 1000)) * 100;
  const urgent = msLeft < 15000;

  if (stage === STAGE.ready) {
    return (
      <div className="wrap arena-intro">
        <h2>The Arena</h2>
        <p className="lede">
          {ARENA_SECONDS} seconds. {ARENA_LIVES} lives. {pool.length} questions drawn from every
          lesson in the catalogue, in an order you cannot memorise.
        </p>
        <ul className="rules">
          <li>A right answer buys <strong>two seconds</strong> back.</li>
          <li>A wrong answer costs <strong>one life</strong>, and the run ends at zero.</li>
          <li>The streak multiplier pays; the clock and the lives you finish with pay too.</li>
        </ul>
        <div className="notice notice-sage">
          Nothing here touches the review schedule. The Arena is recognition against a clock,
          which is a real skill and not the same skill as recall — the cards remain the only
          thing that moves a due date.
        </div>
        {record.score > 0 && (
          <p className="small">Your record: <strong>{record.score.toLocaleString()}</strong> points,
            {' '}{record.correct} right{record.bestStreak ? `, longest streak ${record.bestStreak}` : ''}.</p>
        )}
        <div className="btn-row">
          <motion.button className="btn-primary btn-big" onClick={start}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>Begin</motion.button>
          <Link className="btn" to="/quiz">Lesson quizzes</Link>
        </div>
      </div>
    );
  }

  if (stage === STAGE.over) {
    return (
      <div className="wrap arena-over">
        <motion.div
          className="result-head"
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 190, damping: 18 }}
        >
          <ProgressRing
            value={100}
            size={150}
            stroke={10}
            tone={newRecord ? 'gold' : 'sage'}
            label={<CountUp value={finalScore} />}
            sub="points"
          />
          <div>
            <h2>{lives <= 0 ? 'Out of lives' : 'Time'}</h2>
            <p className="lede">
              {correct} of {answered} right, longest run {best}. +{xp} XP.
            </p>
            {newRecord
              ? <p className="result-xp">A new record.</p>
              : <p className="small">Record stands at {record.score.toLocaleString()}.</p>}
          </div>
        </motion.div>
        <div className="btn-row" style={{ marginTop: '2rem' }}>
          <button className="btn-primary" onClick={start}>Again</button>
          <Link className="btn" to="/quiz">Lesson quizzes</Link>
          <Link className="btn" to="/review">Review the cards</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`wrap arena${urgent ? ' is-urgent' : ''}`} ref={boardRef}>
      <div className="arena-hud">
        <ProgressRing
          value={timePct}
          size={72}
          stroke={6}
          spin
          tone={urgent ? 'oxide' : 'sage'}
          label={Math.ceil(msLeft / 1000)}
        />
        <div className="arena-hud-mid">
          <div className="lives">
            {Array.from({ length: ARENA_LIVES }).map((_, n) => (
              <motion.span
                key={n}
                className={`life${n < lives ? ' is-on' : ''}`}
                animate={n < lives ? { scale: 1 } : { scale: [1.4, 0.9, 1], opacity: 0.28 }}
                transition={{ duration: 0.45 }}
              >⚖</motion.span>
            ))}
          </div>
          <AnimatePresence>
            {streak >= 2 && (
              <motion.span
                key="st"
                className={`hud-pill hud-streak${streak >= 5 ? ' is-hot' : ''}${streak >= 10 ? ' is-blaze' : ''}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1.35, 1], opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
              >×{streak}</motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="arena-hud-right">
          <span className="hud-pill">{correct} right</span>
          <span className="hud-pill hud-xp">+<CountUp value={xp} /> XP</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {q && (
          <motion.div
            key={`${q.key}:${i}`}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="arena-from">{q.lessonTitle}</p>
            <p className="quiz-q">{q.q}</p>
            <div className="quiz-options">
              {q.options.map((text, n) => {
                const decided = picked !== null;
                const isAnswer = n === q.answer;
                const isPicked = n === picked;
                const cls = !decided ? '' : isAnswer ? ' is-right' : isPicked ? ' is-wrong' : ' is-dim';
                return (
                  <motion.button
                    key={n}
                    className={`quiz-option${cls}`}
                    onClick={() => choose(n)}
                    disabled={decided}
                    initial={{ opacity: 0, y: 10 }}
                    animate={
                      decided && isPicked && !isAnswer
                        ? { opacity: 1, y: 0, x: [0, -10, 9, -6, 0] }
                        : decided && isAnswer
                          ? { opacity: 1, y: 0, scale: [1, 1.05, 1] }
                          : { opacity: 1, y: 0 }
                    }
                    transition={{ delay: decided ? 0 : n * 0.04, duration: 0.26 }}
                    whileTap={decided ? {} : { scale: 0.98 }}
                  >
                    <span className="quiz-key">{n + 1}</span>
                    <span className="quiz-text">{text}</span>
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {picked !== null && picked !== q.answer && (
                <motion.p
                  className="arena-why"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                >{q.why}</motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
