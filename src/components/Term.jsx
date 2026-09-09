import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { byId, tokenise, KINDS } from '../lib/glossary.js';

/**
 * A glossary term in running prose.
 *
 * Two levels, because the two audiences are the same person at different
 * moments. *In short* is what you want when the word interrupted a sentence you
 * were reading; *going deeper* is what you want when the word is the thing you
 * are actually stuck on. Putting both in one popover and defaulting to the
 * short one keeps the first case from paying for the second.
 */

// One popover at a time, owned above the prose so opening a second closes the
// first. Without this, a mouse dragged across a paragraph leaves a trail.
const OpenCtx = createContext({ open: null, setOpen: () => {} });

export function TermLayer({ children }) {
  const [open, setOpen] = useState(null);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') setOpen(null); };
    const onScroll = () => setOpen(null);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);
  return <OpenCtx.Provider value={value}>{children}</OpenCtx.Provider>;
}

export function Term({ id, children }) {
  const t = byId[id];
  const { open, setOpen } = useContext(OpenCtx);
  const ref = useRef(null);
  const timer = useRef(null);
  const uid = useId();
  const isOpen = open === uid;

  const show = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setOpen(uid);
    setRect({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width });
  }, [setOpen, uid]);

  const [rect, setRect] = useState(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!t) return children || null;

  return (
    <>
      <button
        type="button"
        ref={ref}
        className={`term tap-exempt term-${t.kind}${isOpen ? ' is-open' : ''}`}
        aria-expanded={isOpen}
        onMouseEnter={() => { clearTimeout(timer.current); timer.current = setTimeout(show, 130); }}
        onMouseLeave={() => clearTimeout(timer.current)}
        onFocus={show}
        onClick={(e) => { e.preventDefault(); isOpen ? setOpen(null) : show(); }}
      >
        {children || t.term}
      </button>
      {isOpen && rect && <TermCard t={t} rect={rect} onClose={() => setOpen(null)} />}
    </>
  );
}

const CARD_W = 360;

function TermCard({ t, rect, onClose }) {
  const [deep, setDeep] = useState(false);
  const vw = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 768 : window.innerHeight;

  // Flip above the term when there is not room below, and pull back inside the
  // viewport horizontally. A popover that opens off-screen is a popover the
  // reader concludes is broken.
  const below = vh - rect.bottom > 260 || rect.top < 260;
  const left = Math.min(Math.max(12, rect.left - 16), Math.max(12, vw - CARD_W - 12));

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="termcard"
        role="dialog"
        aria-label={t.term}
        style={{
          width: Math.min(CARD_W, vw - 24),
          left,
          top: below ? rect.bottom + 10 : undefined,
          bottom: below ? undefined : vh - rect.top + 10,
        }}
        initial={{ opacity: 0, y: below ? -8 : 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onMouseLeave={onClose}
      >
        <div className="termcard-head">
          <span className="termcard-term">{t.term}</span>
          <span className={`termcard-kind kind-${t.kind}`}>{t.kind}</span>
        </div>
        <p className="termcard-gloss">{t.gloss}</p>

        <div className="termcard-level">
          <span className="termcard-tag">In short</span>
          <p>{t.intermediate}</p>
        </div>

        <AnimatePresence initial={false}>
          {deep && (
            <motion.div
              className="termcard-level is-deep"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
            >
              <span className="termcard-tag">Going deeper</span>
              <p>{t.advanced}</p>
              <p className="termcard-src">{t.source}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="termcard-foot">
          <button type="button" className="termcard-more" onClick={() => setDeep(d => !d)}>
            {deep ? 'Less' : 'Go deeper'}
          </button>
          {/* Guarded for the same reason as Glossary.jsx: a term with no
              `see` key threw here too, and this one is inside a popover that
              opens over live reading. */}
          {(t.see || []).slice(0, 3).map(s => byId[s] && (
            <Link key={s} className="termcard-see taplink" to={`/glossary#${s}`} onClick={onClose}>
              {byId[s].term}
            </Link>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

/**
 * Prose with the glossary linked into it.
 *
 * `seen` is supplied by the page so that a term links once per lesson rather
 * than once per paragraph. Pass nothing and every occurrence links, which is
 * what the glossary index itself wants.
 */
export function Prose({ text, seen, as: Tag = null, className }) {
  const parts = useMemo(() => tokenise(text, seen), [text, seen]);
  const body = parts.map((p, i) =>
    typeof p === 'string'
      ? <Emphasis key={i} text={p} />
      : <Term key={i} id={p.id}>{p.text}</Term>);
  return Tag ? <Tag className={className}>{body}</Tag> : <>{body}</>;
}

// The two-token inline markup from the lesson prose, applied inside the
// glossary-linked segments rather than around them.
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

function Emphasis({ text }) {
  if (!text.includes('*')) return text;
  return (
    <>
      {text.split(TOKEN).filter(Boolean).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export { KINDS };
export default Term;
