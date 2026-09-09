import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import catalogue from '../lib/content.js';
import { TERMS } from '../lib/glossary.js';
import { useDialog } from './Overlays.jsx';

/**
 * One search across everything: lessons, modules, problems, quizzes, glossary
 * terms and the app's own pages.
 *
 * A curriculum this size stops being navigable by menu at about the point it
 * stopped here — 41 lessons, 15 problems, 189 terms and nine pages is more than
 * a rail can hold. Cmd-K is the answer to "I know what it is called and I do not
 * know where it lives".
 *
 * It follows the combobox pattern rather than being a box with buttons in it:
 * focus stays in the input the whole time and the arrow keys move a *virtual*
 * selection, published by `aria-activedescendant`. The alternative — tabbing
 * through forty result buttons to reach the last one — is the reason that
 * pattern exists.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const close = useCallback(() => setOpen(false), []);
  const ref = useDialog(open, close);

  useEffect(() => {
    const onKey = (e) => {
      if (typeof e.key !== 'string') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQ('');
        setActive(0);
        return;
      }
      // A bare "/" opens it too, the way it does in most reading tools — but not
      // while the reader is typing an answer into a textarea.
      if (e.key === '/' && !open) {
        const t = e.target;
        const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (!typing) { e.preventDefault(); setOpen(true); setQ(''); setActive(0); }
      }
      // Escape is `useDialog`'s job while the palette is open.
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const index = useMemo(() => buildIndex(), []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return index.filter(r => r.kind === 'page').slice(0, 8);
    // Built once per query rather than once per matching row: on a bare letter
    // this loop matches most of the 250-odd rows, and compiling a regex inside
    // it was doing that work on every keystroke.
    const wordStart = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    const scored = [];
    for (const r of index) {
      const hay = r.haystack;
      const at = hay.indexOf(needle);
      if (at === -1) continue;
      // Prefix matches on the label first, then anything that starts a word,
      // then substring hits — so typing "cav" finds "caveat" before "vacate".
      const label = r.label.toLowerCase();
      const rank = label.startsWith(needle) ? 0
        : wordStart.test(label) ? 1
          : at === 0 ? 2 : 3;
      scored.push([rank, r]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].label.localeCompare(b[1].label))
      .slice(0, 40).map(([, r]) => r);
  }, [q, index]);

  const go = useCallback((r) => {
    if (!r) return;
    setOpen(false);
    navigate(r.to);
  }, [navigate]);

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(Math.max(results.length - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  };

  useEffect(() => { setActive(0); }, [q]);

  // The list scrolls at 24rem; without this the arrow keys walk the selection
  // straight out of the visible box and the reader is choosing blind.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open, results]);

  const activeId = results.length ? `pal-opt-${active}` : undefined;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="pal-scrim"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <motion.div
            className="pal"
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Search everything"
            tabIndex={-1}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <input
              className="pal-input"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Lessons, modules, problems, terms…"
              aria-label="Search"
              role="combobox"
              aria-expanded="true"
              aria-controls="pal-results"
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              autoComplete="off"
            />
            <ul className="pal-results" id="pal-results" role="listbox" aria-label="Results" ref={listRef}>
              {results.map((r, i) => (
                <li key={r.to + r.label} role="presentation">
                  <button
                    type="button"
                    id={`pal-opt-${i}`}
                    data-idx={i}
                    role="option"
                    aria-selected={i === active}
                    // Focus never leaves the input; the selection is virtual.
                    tabIndex={-1}
                    className={`pal-item${i === active ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                  >
                    <span className="pal-kind">{r.kind}</span>
                    <span className="pal-label">
                      {r.label}
                      {r.sub && <span className="pal-sub">{r.sub}</span>}
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li role="presentation"><p className="pal-item">Nothing matches “{q}”.</p></li>
              )}
            </ul>
            {/* The count is announced as it changes, and shown, because a
                sighted reader typing into a list that silently empties is
                served by it too. */}
            <p className="pal-foot" aria-live="polite">
              {results.length === 0 ? 'No results' : `${results.length} result${results.length === 1 ? '' : 's'}`} ·
              {' '}<span className="pal-key">↑</span> <span className="pal-key">↓</span> to move ·
              {' '}<span className="pal-key">↵</span> to open · <span className="pal-key">esc</span> to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

const PAGES = [
  ['Modules', '/', 'the arrangement of the curriculum'],
  ['Lessons', '/lessons', 'the exposition'],
  ['Review', '/review', 'cards due today'],
  ['Quizzes', '/quiz', 'recognition under a clock'],
  ['The Arena', '/arena', 'ninety seconds, three lives'],
  ['Problem questions', '/problems', 'write, predict, self-mark'],
  ['Glossary', '/glossary', 'every term, at two depths'],
  ['Progress', '/progress', 'what the app can and cannot measure'],
  ['Seals', '/seals', 'what you have finished'],
  ['Reading', '/books', 'texts and statutes'],
  ['Settings', '/settings', 'backup, goal, retention'],
];

function buildIndex() {
  const rows = [];
  const push = (kind, label, to, sub) =>
    rows.push({ kind, label, to, sub, haystack: `${label} ${sub || ''}`.toLowerCase() });

  for (const [label, to, sub] of PAGES) push('page', label, to, sub);
  for (const m of catalogue.modules) push('module', m.title, `/module/${m.id}`,
    m.level === null ? 'method module' : `level ${m.level}`);
  for (const l of catalogue.lessons) push('lesson', l.title, `/lesson/${l.id}`, l.summary);
  for (const l of catalogue.lessons) {
    if (l.quizCount) push('quiz', l.title, `/quiz/${l.id}`, `${l.quizCount} questions`);
  }
  for (const p of catalogue.problems) push('problem', p.title, `/problem/${p.id}`,
    `${p.minutes} minutes · ${p.kind}`);
  for (const t of TERMS) push('term', t.term, `/glossary#${t.id}`, t.gloss);
  return rows;
}
