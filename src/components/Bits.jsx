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
// Tone names are roles, not colours. The design system owns the values; this
// map is the only place the two vocabularies meet, so a rename there is one
// edit here rather than a hunt through six routes.
const TONE = {
  correct: 'var(--signal-correct)',
  wrong: 'var(--signal-wrong)',
  mastery: 'var(--signal-mastery)',
  neutral: 'var(--border-strong)',
  series: 'var(--viz-series-1)',
};

export function ProgressRing({
  value = 0, size = 96, stroke = 7, tone = 'correct', label = null, sub = null, spin = false,
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-hairline)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={TONE[tone] || TONE.correct} strokeWidth={stroke} strokeLinecap="round"
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

/**
 * WCAG 2.4.2, Page Titled. This is a single-page app, so <title> was written
 * once in index.html and never changed: every route announced itself as
 * "Malaysian law — self-study". A screen reader user hears the same words on
 * arriving at every page, and browser history, tab strips and bookmarks are
 * indistinguishable from one another.
 *
 * The title is read from the page's own <h1> rather than kept in a lookup
 * table, which would be a second copy of every route's name to drift out of
 * step. That is only reliable because the heading rules now guarantee exactly
 * one h1 per rendered screen, and tools/smoke.mjs fails the build if that stops
 * being true — so this is a use of that guarantee, not an assumption about it.
 *
 * It observes rather than reads once. Route transitions animate: AnimatePresence
 * holds the OUTGOING screen while the incoming one mounts, so an effect that
 * reads the h1 when the route changes reliably reads the previous page's title
 * — measured, and every route was one behind. A MutationObserver on <main> does
 * not care about transition timing, and it also catches an h1 that changes
 * within a route, such as a loading state resolving into content.
 */
export function useDocumentTitle(suffix = 'Malaysian law') {
  useEffect(() => {
    const main = document.getElementById('main');
    if (!main) return undefined;
    let last = '';
    const sync = () => {
      const h1 = main.querySelector('h1');
      const text = h1 && h1.textContent.trim();
      if (!text || text === last) return;
      last = text;
      // The home page's own h1 already opens with the app's name; appending it
      // again reads as a stutter in a tab strip.
      document.title = text.startsWith(suffix) ? text : `${text} — ${suffix}`;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [suffix]);
}

/**
 * The first tab stop on every page: a way past the rail, which is ten or more
 * links a keyboard user would otherwise traverse on every single navigation
 * before reaching a word of the lesson.
 *
 * It is a button, not the usual `<a href="#main">`. This app uses HashRouter,
 * so the fragment is the router's — `#main` would be read as the route /main
 * and land the reader on the not-found page, which is a worse outcome than
 * having no skip link at all. Moving focus directly is the only way that works
 * here, and it needs `tabIndex={-1}` on the target so a non-interactive element
 * can accept focus programmatically.
 *
 * Visible only when focused: see `.skiplink` in base.css. It must never be
 * `display: none` or hidden from the accessibility tree, or it cannot be
 * reached by the keyboard it exists for.
 */
export function SkipToContent({ targetId = 'main' }) {
  return (
    <button
      type="button"
      className="skiplink"
      onClick={() => {
        const el = document.getElementById(targetId);
        if (!el) return;
        el.focus();
        el.scrollIntoView({ block: 'start' });
      }}
    >
      Skip to content
    </button>
  );
}

// `motion.create(Link)` once, at module scope. Creating it inside the component
// would produce a new component type on every render and remount every row.
const MotionLink = motion.create(Link);

/** A row in the "arrangement of sections" list. Links unless `to` is absent. */
export function ArrRow({ to, num, title, meta, state, flag, index = 0, locked = false, moduleId }) {
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
  // A row that knows its module carries the colour itself. palette.css maps
  // data-module to --module-tint/--module-ink, so the caller passes an id
  // rather than a colour, and a row without one is left uncoloured.
  const tint = { 'data-module': moduleId || undefined };
  if (!to) {
    return <motion.div className={`arr-row is-static${locked ? ' is-locked' : ''}`} {...tint} {...anim}>{inner}</motion.div>;
  }
  return (
    <MotionLink
      to={to}
      className={`arr-row is-link${locked ? ' is-locked' : ''}`}
      {...tint}
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
