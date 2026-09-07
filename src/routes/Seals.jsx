import { motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import { ACHIEVEMENTS, RANKS } from '../lib/game.js';
import { Seal } from '../components/Seal.jsx';
import { ProgressRing } from '../components/Bits.jsx';
import { daysAgo } from '../lib/format.js';

export default function Seals() {
  const { game, rank } = useStudy();
  const earned = ACHIEVEMENTS.filter(a => game.achievements[a.id]);
  const locked = ACHIEVEMENTS.filter(a => !game.achievements[a.id]);
  const pct = Math.round((earned.length / ACHIEVEMENTS.length) * 100);

  return (
    <div className="wrap">
      <h2>Seals</h2>
      <p className="lede">
        {earned.length} of {ACHIEVEMENTS.length} struck. A seal marks something you did, not
        something you know — the hardest one here is <strong>Calibrated</strong>, and it is the
        only one that is about judgment rather than volume.
      </p>

      <div className="rank-panel">
        <ProgressRing value={pct} size={116} stroke={9} tone="gold" label={`${pct}%`} sub="struck" />
        <div>
          <h3 style={{ marginTop: 0 }}>Rank {rank.level} · {rank.title}</h3>
          <p className="small">{rank.note}</p>
          <div className="ladder">
            {RANKS.map(r => (
              <span key={r.level} className={`rung${r.level <= rank.level ? ' is-done' : ''}${r.level === rank.level ? ' is-here' : ''}`}
                title={`${r.title} — ${r.xp.toLocaleString()} XP`}>
                {r.level}
              </span>
            ))}
          </div>
          <p className="small">
            {rank.next
              ? <>{rank.toNext.toLocaleString()} XP to <strong>{rank.next.title}</strong>.</>
              : 'Top of the ladder.'}
          </p>
        </div>
      </div>

      <h3>Struck</h3>
      {earned.length ? (
        <div className="sealgrid">
          {earned.map((a, i) => (
            <motion.div className="sealcard" key={a.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.5) }}
              whileHover={{ y: -4 }}>
              <Seal a={a} earned size={72} />
              <span className="sealcard-name">{a.name}</span>
              <span className="sealcard-hint">{a.hint}</span>
              <span className="sealcard-when">{daysAgo(game.achievements[a.id])}</span>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="small">None yet. Grade one card and the first is struck.</p>
      )}

      <h3>Still open</h3>
      <div className="sealgrid">
        {locked.map((a, i) => (
          <motion.div className="sealcard is-locked" key={a.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4) }}>
            <Seal a={a} size={72} />
            <span className="sealcard-name">{a.name}</span>
            <span className="sealcard-hint">{a.hint}</span>
          </motion.div>
        ))}
      </div>

      <p className="small" style={{ marginTop: '2.5rem' }}>
        Every seal is derived from data the app already had: reviews graded, lessons marked,
        quizzes finished, answers written. None of them can be earned by pressing a button that
        does nothing else, which is the only design rule this page follows.
      </p>
    </div>
  );
}
