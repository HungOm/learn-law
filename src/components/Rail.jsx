import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import { CountUp } from './Bits.jsx';

const NAV = [
  { to: '/',           label: 'Modules',  badge: 'due' },
  { to: '/lessons',    label: 'Lessons',  badge: 'unread' },
  { to: '/review',     label: 'Review',   badge: 'due' },
  { to: '/quiz',       label: 'Quizzes' },
  { to: '/problems',   label: 'Problems' },
  { to: '/books',      label: 'Reading' },
  { to: '/progress',   label: 'Progress' },
  { to: '/seals',      label: 'Seals',    badge: 'seals' },
  { to: '/settings',   label: 'Settings' },
];

export default function Rail() {
  const { cat, counts, read, rank, game, goal } = useStudy();
  const due = counts.due + counts.fresh;
  const unread = cat.lessons.filter(l => !read[l.id]).length;
  const sealCount = Object.keys(game.achievements).length;

  const badgeFor = (kind) => {
    if (kind === 'due') return due || null;
    if (kind === 'unread') return unread || null;
    if (kind === 'seals') return sealCount || null;
    return null;
  };

  return (
    <aside className="rail">
      <h1>Malaysian law</h1>
      <p className="sub">Self-study, zero to legal reasoning</p>

      <div className="rankbox">
        <div className="rankbox-head">
          <span className="rank-level">{rank.level}</span>
          <span>
            <span className="rank-title">{rank.title}</span>
            <span className="rank-xp"><CountUp value={game.xp} /> XP</span>
          </span>
        </div>
        <div className="xpbar" title={rank.next ? `${rank.toNext} XP to ${rank.next.title}` : 'Top rank'}>
          <motion.i
            initial={{ width: 0 }}
            animate={{ width: `${rank.pct}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          />
        </div>
        <p className="rank-next">
          {rank.next
            ? <>{rank.toNext.toLocaleString()} XP to <strong>{rank.next.title}</strong></>
            : <>Top of the ladder. Nothing left but the work.</>}
        </p>

        <div className="rail-meters">
          <span className={`meter${game.streak.current > 0 ? ' is-live' : ''}`}>
            <Flame lit={game.streak.current > 0} />
            {game.streak.current} day{game.streak.current === 1 ? '' : 's'}
          </span>
          <span className={`meter${goal.met ? ' is-done' : ''}`}>
            <span className="meter-bar"><i style={{ width: `${goal.pct}%` }} /></span>
            {goal.earned}/{goal.goal}
          </span>
        </div>
      </div>

      <nav>
        {NAV.map(item => {
          const n = badgeFor(item.badge);
          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <span>{item.label}</span>
              {n ? <span className={`badge badge-${item.badge}`}>{n}</span> : null}
            </NavLink>
          );
        })}
      </nav>

      <p className="rail-foot small">
        XP counts work done, not law known. The numbers that make a claim about
        what you know are on <NavLink to="/progress">Progress</NavLink>.
      </p>
    </aside>
  );
}

function Flame({ lit }) {
  return (
    <motion.svg
      className={`flame${lit ? ' is-lit' : ''}`} viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"
      animate={lit ? { scale: [1, 1.18, 1], rotate: [0, -3, 3, 0] } : {}}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d="M12 2c1 3.5-1.5 4.5-1.5 7A3.5 3.5 0 0 0 14 12.5c1.6 0 2.5-1 2.5-1 .6 1 1 2.2 1 3.5a5.5 5.5 0 1 1-11 0c0-4.5 5.5-6 5.5-13Z" />
    </motion.svg>
  );
}
