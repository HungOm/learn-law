import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useStudy } from '../state/StudyContext.jsx';
import { Seal } from './Seal.jsx';
import { fanfare, burst, reducedMotion } from '../lib/fx.js';

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]',
].join(',');

/**
 * The Tab stops inside a surface, in document order.
 *
 * The `tabIndex >= 0` filter is the whole point and it is not decoration. A
 * selector alone gets this wrong: `button:not([disabled])` matches a button
 * carrying `tabindex="-1"`, so the palette's forty result buttons — which are
 * deliberately off the tab cycle, because the selection there is virtual —
 * were being counted as stops. That put the trap's "last element" on a button
 * the browser skips, so the boundary never matched, and Tab walked straight
 * out of the dialog on the second press. Caught by driving it in a browser;
 * no static check would have seen it.
 */
const tabStops = (node) =>
  [...node.querySelectorAll(FOCUSABLE)].filter(el => el.tabIndex >= 0);

/**
 * The reduced-motion preference as a live value rather than a reading taken
 * once at import. Three mechanisms already honour it — the CSS rule in
 * base.css, `<MotionConfig reducedMotion="user">` in main.jsx, and fx.js for
 * the canvas — but framer's `reducedMotion="user"` only suppresses transform
 * and layout animation. Opacity and `filter` still run, so anything animating
 * a blur has to ask this question itself.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(reducedMotion);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    try {
      mq.addEventListener('change', on);
      return () => mq.removeEventListener('change', on);
    } catch { return undefined; /* older engines: the first reading stands */ }
  }, []);
  return reduced;
}

// The last element that genuinely held focus, tracked because
// `document.activeElement` at the moment a dialog opens is not always the
// thing that opened it. A control that disables itself while it works — the
// lesson's "Mark as read" button does, and it is a common pattern — is blurred
// by the browser the instant it goes disabled, so by the time the overlay it
// triggered has mounted, focus is already on <body> and the opener is lost.
// Restoring to <body> strands a keyboard reader at the top of the document.
let lastFocused = null;
if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (e) => {
    if (e.target && e.target !== document.body) lastFocused = e.target;
  }, true);
}

/**
 * Focus containment for a modal surface: put focus inside on open, keep Tab
 * from walking out of it, close on Escape, and give focus back to whatever the
 * reader was on when it is done.
 *
 * The restore matters more than it looks. Without it, dismissing this overlay
 * drops focus to `<body>`, and the next Tab starts again from the top of the
 * page — a keyboard reader who was halfway down a lesson loses their place
 * every time they earn something.
 *
 * Returns a ref for the surface. The surface needs `tabIndex={-1}` so there is
 * somewhere to put focus when it holds no controls of its own.
 */
export function useDialog(open, onClose) {
  const ref = useRef(null);
  const restoreTo = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const live = document.activeElement;
    restoreTo.current = live && live !== document.body ? live : lastFocused;
    const node = ref.current;
    (node ? tabStops(node)[0] || node : null)?.focus?.();

    // The page behind a modal should not scroll under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prev;
      const back = restoreTo.current;
      // Guard `isConnected`: the element that opened this may have been
      // unmounted by the navigation that opened it. `contains` guards the
      // other way — never hand focus back into the surface being closed.
      if (back?.isConnected && !node?.contains(back)) back.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const node = ref.current;
      if (!node) return;
      const items = tabStops(node);
      if (!items.length) { e.preventDefault(); node.focus?.(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const on = document.activeElement;
      if (e.shiftKey && (on === first || !node.contains(on))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (on === last || !node.contains(on))) { e.preventDefault(); first.focus(); }
    };
    // Capture, so a handler inside the surface cannot swallow the Tab first.
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  return ref;
}

export function Toasts() {
  const { toasts } = useStudy();
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            className={`toast toast-${t.tone}`}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Crossing a rank is the biggest thing that happens in the app, so it gets the
 * biggest animation: the page dims, a seal is struck, the rank name sets itself
 * letter by letter, and confetti comes off the top of the card.
 */
export function LevelUpOverlay() {
  const { levelUp, dismissLevelUp } = useStudy();
  const reduced = usePrefersReducedMotion();
  const ref = useDialog(!!levelUp, dismissLevelUp);

  // The card leaves on its own after seven seconds, which is right for the
  // reader who glances at it and carries on — and wrong for anyone still
  // reading it, or using a screen reader that has not finished announcing it.
  // So engagement cancels the timer and it stays until dismissed deliberately.
  // (WCAG 2.2.1.)
  //
  // `settled` is what keeps that from swallowing the timer entirely: opening
  // the dialog moves focus into it programmatically, and counting that as
  // engagement would mean the card never auto-dismissed for anybody. Only
  // what the reader does after it has opened counts.
  const [held, setHeld] = useState(false);
  const settled = useRef(false);
  useEffect(() => {
    setHeld(false);
    settled.current = false;
    if (!levelUp) return undefined;
    const t = setTimeout(() => { settled.current = true; }, 250);
    return () => clearTimeout(t);
  }, [levelUp]);
  const engage = () => { if (settled.current) setHeld(true); };
  useEffect(() => {
    if (!levelUp || held) return undefined;
    const t = setTimeout(dismissLevelUp, 7000);
    return () => clearTimeout(t);
  }, [levelUp, dismissLevelUp, held]);

  // Cancelled on dismissal: without this the ribbons keep painting for a
  // second after the card has gone.
  useEffect(() => (levelUp ? fanfare() : undefined), [levelUp]);

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          className="scrim"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={dismissLevelUp}
        >
          <motion.div
            className="levelup"
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="levelup-title"
            tabIndex={-1}
            // `mouseenter` alone is not enough: the card is centred and opens
            // under a cursor that may already be sitting there, and a browser
            // does not fire an enter for an element that appears beneath a
            // stationary pointer. Any movement over it counts instead.
            onMouseEnter={engage}
            onMouseMove={engage}
            onFocusCapture={engage}
            onKeyDownCapture={engage}
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              className="levelup-crest"
              initial={{ scale: 0.3, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 190, damping: 12, delay: 0.15 }}
            >
              {/* The house mark at its largest. Same geometry as the rail
                  wordmark and public/favicon.svg — identical path data on a
                  100-unit viewBox — with a second ring that only the crest
                  gets. Change the drawing in one and change it in all three. */}
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <motion.circle
                  cx="50" cy="50" r="46" className="crest-ring"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.2 }}
                />
                <circle cx="50" cy="50" r="40" className="crest-ring2" />
                <g className="crest-mark">
                  <line x1="50" y1="26" x2="50" y2="76" />
                  <line x1="28" y1="38" x2="72" y2="38" />
                  <path d="M28 38 L20 60 h16 Z" />
                  <path d="M72 38 L64 60 h16 Z" />
                  <line x1="38" y1="76" x2="62" y2="76" />
                </g>
              </svg>
              <span className="levelup-num">{levelUp.level}</span>
            </motion.div>

            <motion.p className="levelup-kicker"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              Rank {levelUp.level}
            </motion.p>

            {/* The title sets itself letter by letter, which is a nice effect
                and a bad string: split into spans it can be announced one
                character at a time. `aria-label` gives assistive technology the
                whole title and the spans are hidden from it.

                Under reduced motion it is set as plain text instead — the
                per-letter animation moves each glyph and blurs it, and `filter`
                is the one property MotionConfig's `reducedMotion="user"` does
                not suppress. */}
            <h2 className="levelup-title" id="levelup-title" aria-label={levelUp.title}>
              {reduced ? levelUp.title : levelUp.title.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden="true"
                  initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.45 + i * 0.028, duration: 0.35 }}
                >{ch === ' ' ? ' ' : ch}</motion.span>
              ))}
            </h2>

            <motion.p className="levelup-note"
              initial={{ opacity: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              {levelUp.note}
            </motion.p>

            {levelUp.next && (
              <motion.p className="small levelup-next"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                Next: {levelUp.next.title}, at {levelUp.next.xp.toLocaleString()} XP.
              </motion.p>
            )}

            <button className="btn-primary levelup-btn" onClick={dismissLevelUp}>Carry on</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Achievements arrive one at a time, from the side, and stamp themselves. */
export function SealPopup() {
  const { seal, dismissSeal } = useStudy();
  const [held, setHeld] = useState(false);

  useEffect(() => { setHeld(false); }, [seal]);

  useEffect(() => {
    if (!seal) return undefined;
    burst({ x: 0.88, y: 0.16, count: 55, spread: 60 });
  }, [seal]);

  useEffect(() => {
    if (!seal || held) return undefined;
    const t = setTimeout(dismissSeal, 4600);
    return () => clearTimeout(t);
  }, [seal, dismissSeal, held]);

  // This one does not trap focus: it is a notification at the corner, not a
  // modal, and stealing focus from someone mid-sentence to announce a seal
  // would be worse than the thing it is announcing. It gets a live region so
  // it is read out, an accessible name so its purpose is not carried by
  // layout alone, and Escape so it can be got rid of from the keyboard.
  useEffect(() => {
    if (!seal) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') dismissSeal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seal, dismissSeal]);

  return (
    <div role="status" aria-live="polite">
      <AnimatePresence>
        {seal && (
          <motion.button
            key={seal.id}
            className="sealpop"
            type="button"
            aria-label={`Seal struck: ${seal.name}. ${seal.hint} Dismiss.`}
            onMouseEnter={() => setHeld(true)}
            onFocus={() => setHeld(true)}
            initial={{ opacity: 0, x: 60, rotate: 4 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: 40, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={dismissSeal}
          >
            <Seal a={seal} earned size={58} animate delay={0.12} decorative />
            <span className="sealpop-text" aria-hidden="true">
              <span className="sealpop-kicker">Seal struck</span>
              <span className="sealpop-name">{seal.name}</span>
              <span className="sealpop-hint">{seal.hint}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Overlays() {
  return (
    <>
      <Toasts />
      <SealPopup />
      <LevelUpOverlay />
    </>
  );
}
