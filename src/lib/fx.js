import confetti from 'canvas-confetti';

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// The palette is the app's, not the library's default carnival — and it is read
// from the design tokens at call time rather than copied here, so a change to
// the system reaches the confetti too. Canvas needs real colour values, which is
// the one place a computed lookup is unavoidable.
const ROLES = [
  '--signal-mastery', '--signal-correct', '--signal-wrong',
  '--text-primary', '--border-strong',
];

// No hardcoded fallback. A literal here is a colour the contrast checks can
// never see again, and it would drift the moment the palette moved — which is
// exactly what happened to the value that used to be here. If the roles cannot
// be resolved there is no document to paint on either, so the callers below
// simply omit `colors` and let the library decide.
let cached = null;
function colours() {
  if (cached) return cached;
  if (typeof getComputedStyle !== 'function') return [];
  const cs = getComputedStyle(document.documentElement);
  cached = ROLES.map(r => cs.getPropertyValue(r).trim()).filter(Boolean);
  return cached;
}

/** canvas-confetti treats an empty `colors` array as "no colours at all". */
function paint(opts) {
  const colors = colours();
  confetti({ ...opts, ...(colors.length ? { colors } : {}), disableForReducedMotion: true });
}

// A theme switch changes what the tokens resolve to, so the cache has to go.
// Two ways the theme can move. The system preference is the one in use today;
// palette.css also carries `:root[data-theme=...]` blocks for an explicit
// choice ("an explicit choice always wins over the system preference"), which
// nothing sets yet. Watching the attribute now costs one observer and means
// the confetti does not quietly keep painting yesterday's palette on the day
// somebody wires that switch up.
if (typeof matchMedia === 'function') {
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { cached = null; }); }
  catch { /* older engines: the cache simply persists */ }
}
if (typeof MutationObserver === 'function' && typeof document !== 'undefined') {
  new MutationObserver(() => { cached = null; })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

export function burst({ x = 0.5, y = 0.5, count = 90, spread = 70, scalar = 1 } = {}) {
  if (reducedMotion()) return;
  paint({ particleCount: count, spread, scalar, origin: { x, y }, ticks: 220 });
}

/**
 * The big one: a level-up, a clean sheet, a finished session.
 *
 * Returns a cancel function, and callers should use it. The ribbons run for
 * 1.2 seconds off a rAF loop; dismissing the card that triggered them used to
 * leave them painting over whatever the reader went to next.
 */
export function fanfare() {
  if (reducedMotion()) return () => {};
  const end = Date.now() + 1200;
  let live = true;
  (function frame() {
    if (!live) return;
    paint({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } });
    paint({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  burst({ y: 0.45, count: 140, spread: 110, scalar: 1.15 });
  return () => { live = false; };
}

/** A short, sharp one, aimed at the element that earned it. */
export function burstFrom(el, opts = {}) {
  if (!el || reducedMotion()) return;
  const r = el.getBoundingClientRect();
  burst({
    x: (r.left + r.width / 2) / window.innerWidth,
    y: (r.top + r.height / 2) / window.innerHeight,
    count: 45,
    spread: 55,
    ...opts,
  });
}

/** Haptic where the platform offers it. Silent everywhere else. */
export function buzz(pattern = 12) {
  if (reducedMotion()) return;
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}
