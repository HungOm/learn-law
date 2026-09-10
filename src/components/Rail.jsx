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
  { to: '/cases',      label: 'Cases' },
  { to: '/statutes',   label: 'Statutes' },
  { to: '/writing',    label: 'Writing' },
  { to: '/books',      label: 'Reading' },
  { to: '/progress',   label: 'Progress' },
  { to: '/seals',      label: 'Seals',    badge: 'seals' },
  { to: '/settings',   label: 'Settings' },
];

/* The five a returning reader actually opens, in NAV's own order. The bar is a
   shortcut under the thumb, not a second navigation: all nine stay in the rail
   above it, so nothing here is the only way to reach anything. Paths rather
   than a second list of labels — a copy drifts the first time one is renamed. */
const PHONE = ['/', '/lessons', '/review', '/quiz', '/progress'];

/* What each badge counts, for the accessible name only. Chrome computes the
   name of a badged link as "Modules 186" — correctly spaced, and still a bare
   number to anyone who cannot see that it sits in a queue of work. The sighted
   reader has the rail around it for context; the listener has the name and
   nothing else, so the noun goes in the name. */
const COUNTS = { due: 'due', unread: 'unread', seals: 'earned' };
const nameFor = (item, n) => (n ? `${item.label}, ${n} ${COUNTS[item.badge]}` : undefined);

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
    <>
      <aside className="rail">
        <Wordmark />

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

        <nav aria-label="Sections">
          {NAV.map(item => {
            const n = badgeFor(item.badge);
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} aria-label={nameFor(item, n)}>
                <span>{item.label}</span>
                {n ? <span className={`badge badge-${item.badge}`}>{n}</span> : null}
              </NavLink>
            );
          })}
        </nav>

        {/* On every page, because on a phone the same statement on Home sits
            696px down — one scroll below the fold on the device most of this
            readership uses. Measured by site-59; a statement that needs a
            scroll is not the permanent one the roadmap asked for. */}
        <p className="rail-foot small">
          This site is not a qualification and confers nothing. Only an accredited
          university awards a law degree, and only the LPQB decides who may practise.
        </p>

        <p className="rail-foot small">
          XP counts work done, not law known. The numbers that make a claim about
          what you know are on{' '}
          {/* A link inside a running sentence: padding it to 44px would open up
              the line box around it. DESIGN.md's inline exemption, stated on the
              element so the next audit reads a decision rather than a defect. */}
          <NavLink className="tap-exempt" to="/progress">Progress</NavLink>.
        </p>
      </aside>

      {/* A sibling of the rail, not a child: it is its own navigation landmark
          and it is fixed to the bottom of the viewport, so nesting it inside a
          complementary region would misreport it to a screen reader without
          changing where it paints. Hidden above 780px, where the rail itself is
          the navigation. The room it occupies is reserved by .main's bottom
          padding in base.css, keyed to the same --railnav-h it is sized with. */}
      <nav className="railnav" aria-label="Quick navigation">
        {NAV.filter(item => PHONE.includes(item.to)).map(item => {
          const n = badgeFor(item.badge);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="railnav-link"
              aria-label={nameFor(item, n)}
            >
              <span className="railnav-label">{item.label}</span>
              {n ? <span className="railnav-count">{n}</span> : null}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}

/**
 * The mark and the name, set together.
 *
 * ST Chambers' registry chop, in three cuts rather than one geometry at three
 * sizes — because the name is INSIDE this mark, and a word has a legibility
 * floor a drawing does not:
 *
 *   full     >= 110px   border, initials, rule, "CHAMBERS"   Overlays.jsx crest
 *   medium   32-109px   border, initials, rule               here
 *   minimal  < 32px     border, initials                     public/favicon.svg
 *
 * 110px is not a taste call: the word is 10 units on a 100-unit box, so it
 * renders at a tenth of the mark's width, and 11px x (100 / 10) = 110px. Change
 * the drawing and change it in all three.
 */
function Wordmark() {
  return (
    <NavLink to="/" className="wordmark" end>
      {/* The MEDIUM cut of the chop: border, initials, rule — no "CHAMBERS".
          The word is 10 units on a 100-unit box, so it needs 110px of rendered
          width to clear the 11px floor, and this box is 32px. The name is set
          beside it in real Spectral anyway; printing it twice, once at 3.2px,
          would be worse than not printing it. Full cut on the level-up crest,
          minimal cut in public/favicon.svg. */}
      <svg className="wordmark-seal" viewBox="0 0 100 100" aria-hidden="true">
        <rect x="8" y="14" width="84" height="72" rx="2" className="wm-chop-edge" />
        <text x="50" y="60" textAnchor="middle" className="wm-chop-st">ST</text>
        <line x1="26" y1="70" x2="74" y2="70" className="wm-chop-rule" />
      </svg>
      <span className="wordmark-text">
        <span className="wordmark-name">ST Chambers</span>
        <span className="wordmark-sub">Malaysian law, from zero</span>
      </span>
    </NavLink>
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
