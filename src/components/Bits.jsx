import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/** A number that rolls to its value instead of appearing at it. */
export function CountUp({ value, decimals = 0, className = '' }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 20, mass: 0.7 });
  const text = useTransform(spring, v => v.toFixed(decimals));
  useEffect(() => { mv.set(value); }, [value, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}

/**
 * A ring that fills. Used for the daily goal, the arena clock and the quiz
 * result — the same shape doing the same job in three places, which is how a
 * reader learns to read it without a legend.
 */
export function ProgressRing({
  value = 0, size = 96, stroke = 7, tone = 'sage', label = null, sub = null, spin = false,
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`var(--${tone})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - Math.min(1, Math.max(0, value / 100))) }}
          transition={spin ? { duration: 0.2, ease: 'linear' } : { type: 'spring', stiffness: 60, damping: 18 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {(label !== null || sub !== null) && (
        <div className="ring-face">
          {label !== null && <span className="ring-label">{label}</span>}
          {sub !== null && <span className="ring-sub">{sub}</span>}
        </div>
      )}
    </div>
  );
}

// `motion.create(Link)` once, at module scope. Creating it inside the component
// would produce a new component type on every render and remount every row.
const MotionLink = motion.create(Link);

/** A row in the "arrangement of sections" list. Links unless `to` is absent. */
export function ArrRow({ to, num, title, meta, state, flag, index = 0, locked = false }) {
  const inner = (
    <>
      <span className="arr-num">{num}</span>
      <span>
        <span className="arr-title">{title}{flag}</span>
        {meta && <span className="arr-meta">{meta}</span>}
      </span>
      {state}
    </>
  );
  const anim = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: Math.min(index * 0.035, 0.5), duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  };
  if (!to) {
    return <motion.div className={`arr-row is-static${locked ? ' is-locked' : ''}`} {...anim}>{inner}</motion.div>;
  }
  return (
    <MotionLink
      to={to}
      className={`arr-row is-link${locked ? ' is-locked' : ''}`}
      {...anim}
      whileHover={{ x: 3 }}
    >{inner}</MotionLink>
  );
}


export function Stat({ n, k, tone, delay = 0 }) {
  return (
    <motion.div
      className={`stat${tone ? ` is-${tone}` : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <span className="n">{n}</span>
      <span className="k">{k}</span>
    </motion.div>
  );
}

export function StatGrid({ children }) {
  return <div className="stat-grid">{children}</div>;
}

export function Notice({ children, tone = 'oxide' }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

/** The card that says what to do next, at the top of a page. */
export function TodayCard({ children, tone = 'sage', delay = 0 }) {
  return (
    <motion.div
      className={`today${tone === 'oxide' ? ' has-due' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
