import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as quizLib from '../lib/quiz.js';
import { ARENA_LIVES, ARENA_SECONDS } from '../lib/quiz.js';
import { loadQuizPool } from '../lib/content.js';
import { CountUp, ProgressRing } from '../components/Bits.jsx';
import { burstFrom, fanfare, buzz } from '../lib/fx.js';

const STAGE = { ready: 'ready', playing: 'playing', over: 'over' };

/* Where the clock speaks, descending. Announcing every second is unusable and
   announcing nothing leaves a screen-reader reader unaware the clock is
   running out; these are the points where the answer changes what a reader
   would do. Descending order is load-bearing — the crossed-below search below
   takes the first match, which must be the highest threshold not yet spoken. */
const THRESHOLDS = [30, 10, 5, 4, 3, 2, 1];

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

  // The Arena is the one screen that wants every question, so it is the one
  // screen that pays for every module chunk. Fetched on arrival rather than on
  // Begin, so the wait overlaps with reading the rules.
  const [pool, setPool] = useState(null);

  useEffect(() => { quizLib.arenaBest().then(setRecord); }, []);
  useEffect(() => {
    let live = true;
    loadQuizPool().then(p => { if (live) setPool(p); });
    return () => { live = false; };
  }, []);
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  const start = useCallback(() => {
    if (!pool) return;
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

  /* The clock is announced at thresholds and never continuously. A countdown
     that speaks every second is unusable; one that never speaks leaves a
     screen-reader user with no idea time is running out, which on a ninety-
     second board is the whole game. The visible numeral stays in the
     accessibility tree rather than being aria-hidden — threshold announcements
     say when it matters, and the readable numeral answers "how long have I
     got?" whenever the reader asks. Losing the second to get the first would
     be a bad trade.

     Keyed on `secs`, not `msLeft`: msLeft is driven by requestAnimationFrame,
     so this would otherwise run sixty times a second to say nothing. */
  const secs = Math.ceil(msLeft / 1000);
  const [timeSay, setTimeSay] = useState('');
  const said = useRef(new Set());
  useEffect(() => {
    if (stage !== STAGE.playing) { setTimeSay(''); said.current.clear(); return; }
    // Crossed-below, not equality. msLeft is driven by requestAnimationFrame,
    // and a frame drop on a loaded phone — which is the device this audience
    // actually has — can take the clock from 31 straight to 29. An `=== 30`
    // test would then never fire at all, and the reader who most needs the
    // warning is the one whose phone is struggling. Anything at or under a
    // threshold counts as having crossed it.
    const hit = THRESHOLDS.find(t => secs <= t && !said.current.has(t));
    if (hit === undefined) return;
    // Once per run, not once per crossing: a right answer buys two seconds
    // back, so the clock can fall through 10, return to 12 and fall again, and
    // repeating a warning is chattiest exactly when a reader is concentrating
    // hardest.
    //
    // `t >= secs`, not `t >= hit`. Mark every threshold at or above where the
    // clock actually IS, not at or above the one this tick happened to match.
    // With `hit`, a jump from 40 to 8 marks only 30 — leaving 10 unmarked, so
    // the next tick at 7 satisfies `7 <= 10` and announces a second time, one
    // second after the first, for what is a single crossing.
    THRESHOLDS.forEach(t => { if (t >= secs) said.current.add(t); });
    // Announce the real remaining time rather than the threshold's name: after
    // a skip they are not the same number, and the true one is the useful one.
    setTimeSay(secs === 1 ? 'One second left.' : `${secs} seconds left.`);
  }, [secs, stage]);

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
    if (improved) { fanfare(); toast(`New Arena record — ${score.toLocaleString()}`, 'mastery'); }
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
      // The Arena stays at the reading measure through all three of its
      // screens rather than taking the dashboard pane. Its options are
      // sentences and its explanations are prose, and a run that changed width
      // when you pressed Begin would be a layout you notice instead of a
      // question you read. The sheet keeps every one of those words off the
      // field.
      <div className="wrap sheet arena-intro">
        <h1>The Arena</h1>
        <p className="lede">
          {ARENA_SECONDS} seconds. {ARENA_LIVES} lives. {cat.quizCount} questions drawn from every
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
            disabled={!pool} aria-busy={!pool}
            whileHover={pool ? { scale: 1.04 } : {}} whileTap={pool ? { scale: 0.96 } : {}}>
            {pool ? 'Begin' : 'Fetching the questions…'}
          </motion.button>
          <Link className="btn" to="/quiz">Lesson quizzes</Link>
        </div>
      </div>
    );
  }

  if (stage === STAGE.over) {
    return (
      <div className="wrap sheet arena-over">
        <motion.div
          className="result-head"
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 190, damping: 18 }}
        >
          <ProgressRing
            value={100}
            size={150}
            stroke={10}
            tone={newRecord ? 'mastery' : 'correct'}
            label={<CountUp value={finalScore} />}
            sub="points"
          />
          <div>
            <h1>{lives <= 0 ? 'Out of lives' : 'Time'}</h1>
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
    <div className={`wrap sheet arena${urgent ? ' is-urgent' : ''}`} ref={boardRef}>
      {/* Polite, so a threshold warning never interrupts the question a reader
          is part-way through hearing. */}
      <p className="sr-only" role="status" aria-live="polite">{timeSay}</p>

      <div className="arena-hud">
        <ProgressRing
          value={timePct}
          size={72}
          stroke={6}
          spin
          tone={urgent ? 'wrong' : 'correct'}
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
            {/* Once the run starts, the intro's h1 is gone and the question is
                the only subject on screen — so it is the heading, as on the
                review card and the lesson quiz. Styled by .quiz-q. */}
            <h1 className="quiz-q">{q.q}</h1>
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
