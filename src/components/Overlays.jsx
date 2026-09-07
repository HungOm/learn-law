import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useStudy } from '../state/StudyContext.jsx';
import { Seal } from './Seal.jsx';
import { fanfare, burst } from '../lib/fx.js';

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

  useEffect(() => {
    if (!levelUp) return undefined;
    fanfare();
    const t = setTimeout(dismissLevelUp, 7000);
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') dismissLevelUp(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [levelUp, dismissLevelUp]);

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
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <motion.circle
                  cx="60" cy="60" r="52" className="crest-ring"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.2 }}
                />
                <circle cx="60" cy="60" r="43" className="crest-ring2" />
                {/* Scales of justice, drawn rather than imported. */}
                <g className="crest-mark">
                  <line x1="60" y1="34" x2="60" y2="86" />
                  <line x1="38" y1="46" x2="82" y2="46" />
                  <path d="M38 46 L30 64 h16 Z" />
                  <path d="M82 46 L74 64 h16 Z" />
                  <line x1="46" y1="86" x2="74" y2="86" />
                </g>
              </svg>
              <span className="levelup-num">{levelUp.level}</span>
            </motion.div>

            <motion.p className="levelup-kicker"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              Rank {levelUp.level}
            </motion.p>

            <h2 className="levelup-title">
              {levelUp.title.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.45 + i * 0.028, duration: 0.35 }}
                >{ch === ' ' ? ' ' : ch}</motion.span>
              ))}
            </h2>

            <motion.p className="levelup-note"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
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

  useEffect(() => {
    if (!seal) return undefined;
    burst({ x: 0.88, y: 0.16, count: 55, spread: 60 });
    const t = setTimeout(dismissSeal, 4600);
    return () => clearTimeout(t);
  }, [seal, dismissSeal]);

  return (
    <AnimatePresence>
      {seal && (
        <motion.button
          key={seal.id}
          className="sealpop"
          initial={{ opacity: 0, x: 60, rotate: 4 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          exit={{ opacity: 0, x: 40, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          onClick={dismissSeal}
        >
          <Seal a={seal} earned size={58} animate delay={0.12} />
          <span className="sealpop-text">
            <span className="sealpop-kicker">Seal struck</span>
            <span className="sealpop-name">{seal.name}</span>
            <span className="sealpop-hint">{seal.hint}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
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
