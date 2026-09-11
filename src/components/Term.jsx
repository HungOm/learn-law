import { createContext, Fragment, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { byId, tokenise, KINDS } from '../lib/glossary.js';
import { recordLookup } from '../lib/vocab.js';

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

  // The `word` tier, on a device with no pointer.
  //
  // Ordinary-vocabulary terms rest with no underline and reveal one when the
  // pointer enters their passage (see `.term-word` in learn.css). On touch
  // there is no pointer, so that reveal can never fire — and the tier built for
  // the reader who does not know "circumstances" or "threshold" was invisible
  // in every state on the device this audience actually reads on. Tappable, but
  // with nothing to say so.
  //
  // The obvious fix is to underline them on touch, and it was measured rather
  // than assumed: it takes the median heavy-passage share from 6.5% to 12.5%
  // and puts 15 of 156 lessons over the density ceiling instead of 2 — a page
  // of underlines, on the smallest screens, which is the failure the tier was
  // created to avoid.
  //
  // So touch gets the faithful analogue of hover instead: the passage you just
  // touched reveals its quiet terms, exactly as the passage under a mouse does.
  // A tap is what precedes reading a paragraph anyway.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(hover: hover)')?.matches) return undefined;
    let marked = null;
    const clear = () => { if (marked) marked.removeAttribute('data-words'); marked = null; };
    const onDown = (e) => {
      const passage = e.target?.closest?.('p, li, td, th, dd, figcaption');
      if (passage === marked) return;
      clear();
      if (passage) { marked = passage; marked.setAttribute('data-words', ''); }
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => { document.removeEventListener('pointerdown', onDown); clear(); };
  }, []);

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
    // Opening the card is the lookup, and the lookup is what enrols the word in
    // vocabulary review. Here rather than in `TermCard`, and not on "Go deeper":
    // a reader who expands the deep level has already been counted once, and
    // counting them twice would make the terms people study hardest look like
    // the terms they find hardest. `recordLookup` de-dupes repeats inside a
    // minute and never throws, so this is safe on a hover-opened card.
    recordLookup(id);
  }, [setOpen, uid, id]);

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
 *
 * **Emphasis is split off BEFORE the glossary runs, and this order matters.**
 * It used to be the other way round: tokenise the whole string, then apply the
 * inline markup to whatever plain segments came back. That works until a
 * glossary term sits inside a `**bold**` span, at which point the mark lands
 * between the delimiters and cuts them in half — the segments handed to the
 * emphasis pass are `…called **` and `**, which is …`, neither of which holds a
 * complete pair, so both render literally. The reader sees
 *
 *     A claim of this kind is called **negligence**, which is careless conduct
 *
 * with the asterisks on the page. Confirmed in Chrome against the built site on
 * l-negligence and l-liberties before this was changed; 74 of the 130 passages
 * in the corpus that carry inline markup had a mark inside a span, and they are
 * concentrated in exactly the sentences that introduce a term for the first
 * time, because that is where an author bolds a word AND the glossary knows it.
 *
 * Splitting first means a term is looked for inside each span rather than
 * across its edges, which is also the correct reading: `**breach of duty**` is
 * one bolded phrase, not a bolded fragment plus a linked fragment.
 */
export function Prose({ text, seen, as: Tag = null, className }) {
  const body = useMemo(() => {
    const s = String(text ?? '');
    const link = (str, keyed) => tokenise(str, seen).map((p, i) =>
      typeof p === 'string'
        ? <Fragment key={`${keyed}-${i}`}>{p}</Fragment>
        : <Term key={`${keyed}-${i}`} id={p.id}>{p.text}</Term>);
    if (!s.includes('*')) return link(s, 0);
    return s.split(TOKEN).filter(Boolean).map((chunk, k) => {
      const strong = chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4;
      const em = !strong && chunk.startsWith('*') && chunk.endsWith('*') && chunk.length > 2;
      const inner = strong ? chunk.slice(2, -2) : em ? chunk.slice(1, -1) : chunk;
      const nodes = link(inner, k);
      if (strong) return <strong key={k}>{nodes}</strong>;
      if (em) return <em key={k}>{nodes}</em>;
      return <Fragment key={k}>{nodes}</Fragment>;
    });
  }, [text, seen]);
  return Tag ? <Tag className={className}>{body}</Tag> : <>{body}</>;
}

// The two-token inline markup from the lesson prose. Kept as one expression so
// `split` returns the delimiters along with the text between them.
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

export { KINDS };
export default Term;
