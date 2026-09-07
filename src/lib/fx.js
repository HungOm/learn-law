import confetti from 'canvas-confetti';

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// The palette is the app's, not the library's default carnival. Confetti in
// oxide and sage reads as the same document as everything else.
const COLOURS = ['#2F6F62', '#9B3B32', '#C8A24A', '#1B2A3A', '#D8D5CC'];

export function burst({ x = 0.5, y = 0.5, count = 90, spread = 70, scalar = 1 } = {}) {
  if (reducedMotion()) return;
  confetti({
    particleCount: count,
    spread,
    scalar,
    origin: { x, y },
    colors: COLOURS,
    ticks: 220,
    disableForReducedMotion: true,
  });
}

/** The big one: a level-up, a clean sheet, a finished session. */
export function fanfare() {
  if (reducedMotion()) return;
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: COLOURS, disableForReducedMotion: true });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: COLOURS, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  burst({ y: 0.45, count: 140, spread: 110, scalar: 1.15 });
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
