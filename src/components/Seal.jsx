import { motion } from 'framer-motion';

/**
 * An achievement, drawn as a struck seal rather than a badge: a ruled circle
 * with a sigil in it, the way a registry stamps a filed document. Locked seals
 * are shown pressed but blank, so the shape of what is left is visible without
 * giving away what earns it beyond the hint.
 *
 * `decorative` is for the case where the seal sits next to text that already
 * names it — the popup does this. There the seal is an illustration of a
 * sentence, and letting it announce itself as well says everything twice.
 */
export function Seal({ a, earned = false, size = 64, animate = false, delay = 0, decorative = false }) {
  const tone = earned ? (a.tone || 'sage') : 'locked';
  // `title` alone was doing two jobs badly: it is a hover tooltip that never
  // appears on a touch device, and it is not a dependable accessible name.
  // The name is given as one, and kept as a tooltip for the pointer.
  const label = earned ? a.name : `${a.name} — not yet earned`;
  return (
    <motion.div
      className={`seal seal-${tone}${earned ? ' is-earned' : ''}`}
      style={{ width: size, height: size }}
      initial={animate ? { scale: 0.2, rotate: -35, opacity: 0 } : false}
      animate={animate ? { scale: 1, rotate: 0, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 14, delay }}
      title={a.name}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? 'true' : undefined}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" className="seal-outer" />
        <circle cx="50" cy="50" r="39" className="seal-inner" />
        {NOTCHES.map((deg, i) => (
          <line
            key={i}
            x1="50" y1="4" x2="50" y2="11"
            className="seal-notch"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
      </svg>
      <span className="seal-sigil" aria-hidden="true">{earned ? a.sigil : '·'}</span>
      {earned && <span className="seal-shine" aria-hidden="true" />}
    </motion.div>
  );
}

const NOTCHES = Array.from({ length: 24 }, (_, i) => i * 15);

export default Seal;
