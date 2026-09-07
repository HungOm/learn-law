import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as quizLib from '../lib/quiz.js';
import { ArrRow, TodayCard } from '../components/Bits.jsx';
import { plural } from '../lib/format.js';

export default function QuizIndex() {
  const { cat, read, game } = useStudy();
  const [best, setBest] = useState({});
  const [arena, setArena] = useState({ score: 0 });

  useEffect(() => {
    quizLib.bestMap().then(setBest);
    quizLib.arenaBest().then(setArena);
  }, []);

  const withQuiz = cat.lessons.filter(l => (l.quiz || []).length);
  const byModule = cat.modules
    .map(m => ({ m, list: withQuiz.filter(l => l.moduleId === m.id) }))
    .filter(g => g.list.length);

  const cleanSheets = withQuiz.filter(l => best[l.id]?.correct === (l.quiz || []).length).length;
  const nextOpen = withQuiz.find(l => read[l.id] && best[l.id]?.correct !== l.quiz.length)
    || withQuiz.find(l => best[l.id]?.correct !== l.quiz.length);

  return (
    <div className="wrap">
      <h2>Quizzes</h2>
      <p className="lede">
        {cat.quizPool.length} questions across {plural(withQuiz.length, 'lesson')}. Four options,
        one right, a clock running. You have a clean sheet on {cleanSheets} of them.
      </p>

      <motion.div
        className="arena-card"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -3 }}
      >
        <div className="arena-card-body">
          <span className="arena-kicker">Blitz</span>
          <h3 className="arena-title">The Arena</h3>
          <p>
            Ninety seconds, three lives, every question in the catalogue. Answer fast, keep the
            run alive, and the multiplier does the rest.
          </p>
          <p className="small">
            Best run: {arena.score ? `${arena.score.toLocaleString()} points` : 'not yet played'}
            {game.best.quizStreak ? ` · longest streak ${game.best.quizStreak}` : ''}
          </p>
        </div>
        <Link className="btn btn-primary btn-big" to="/arena">Enter</Link>
      </motion.div>

      {nextOpen && (
        <TodayCard delay={0.08}>
          <p><strong>Still open:</strong> {nextOpen.title} — {plural(nextOpen.quiz.length, 'question')}.</p>
          <div className="btn-row"><Link className="btn btn-primary" to={`/quiz/${nextOpen.id}`}>Take it</Link></div>
        </TodayCard>
      )}

      <div className="notice notice-sage">
        A quiz result does not move a card's due date, and it is not meant to. Picking the
        right rule out of four is a much easier act than producing it cold, and letting a
        recognition event lengthen a recall interval would inflate the schedule on evidence
        that does not support it. Quizzes pay XP; cards move the schedule.
      </div>

      {byModule.map(({ m, list }) => (
        <div key={m.id}>
          <h3>{m.title}</h3>
          <div className="arrangement">
            {list.map((l, i) => {
              const b = best[l.id];
              const perfect = b && b.correct === l.quiz.length;
              return (
                <ArrRow
                  key={l.id}
                  index={i}
                  to={`/quiz/${l.id}`}
                  num={`${l.quiz.length}Q`}
                  title={l.title}
                  meta={read[l.id] ? 'lesson read' : 'lesson not yet read — expect to lose some'}
                  state={
                    b
                      ? <span className={`arr-state ${perfect ? 'is-gold' : b.correct / b.total >= 0.6 ? 'is-clear' : 'is-due'}`}>
                          best {b.correct}/{l.quiz.length}
                        </span>
                      : <span className="arr-state">not taken</span>
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
