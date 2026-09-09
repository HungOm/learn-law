import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TERMS, KINDS, byId } from '../lib/glossary.js';
import { Prose } from '../components/Term.jsx';

/**
 * The glossary in full.
 *
 * The popover in a lesson shows the short reading and hides the long one behind
 * a toggle, because a reader mid-sentence wants to be let go. Here both are open
 * at once and side by side, because a reader who has navigated to the glossary
 * has come to compare them.
 */
export default function Glossary() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const { hash } = useLocation();

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return TERMS.filter(t => {
      if (kind !== 'all' && t.kind !== kind) return false;
      if (!needle) return true;
      return t.term.toLowerCase().includes(needle)
        || t.gloss.toLowerCase().includes(needle)
        || t.aliases.some(a => a.toLowerCase().includes(needle))
        || t.intermediate.toLowerCase().includes(needle);
    });
  }, [q, kind]);

  // A link from a popover arrives as /glossary#ratio-decidendi, and the element
  // only exists once the list has rendered.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ block: 'center' });
  }, [hash, list.length]);

  const counts = useMemo(() => {
    const c = { all: TERMS.length };
    for (const t of TERMS) c[t.kind] = (c[t.kind] || 0) + 1;
    return c;
  }, []);

  return (
    // Each entry sets "In short" and "Going deeper" side by side, and the two
    // columns are the point of the page — a reader who came here came to
    // compare them. Two columns of prose need more than one column's measure,
    // so this is the dashboard pane rather than the old 54rem middle width.
    <div className="wrap wrap--dash">
      <h1>Glossary</h1>
      <p className="lede">
        {TERMS.length} terms, each at two depths. Every one of them is linked automatically the
        first time it appears in a lesson, so you can read straight through and stop only where
        you need to.
      </p>

      <div className="gloss-controls">
        <input
          className="gloss-search"
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search terms, aliases and definitions…"
          aria-label="Search the glossary"
        />
        {['all', ...Object.keys(KINDS)].map(k => (
          <button
            key={k}
            type="button"
            className={`gloss-chip${kind === k ? ' is-on' : ''}`}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {k === 'all' ? 'All' : k} <span>{counts[k] || 0}</span>
          </button>
        ))}
      </div>

      {list.length === 0
        ? <p className="gloss-empty">Nothing matches “{q}”.</p>
        : (
          <div className="gloss-list">
            {list.map((t, i) => (
              <motion.article
                key={t.id}
                id={t.id}
                className="gloss-entry"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.012, 0.3), duration: 0.3 }}
              >
                <div className="gloss-head">
                  <h2 className="gloss-term">{t.term}</h2>
                  <span className={`termcard-kind kind-${t.kind}`}>{t.kind}</span>
                </div>
                <p className="gloss-gloss">{t.gloss}</p>
                <div className="gloss-body">
                  <div className="gloss-col">
                    <span className="termcard-tag">In short</span>
                    <p>{t.intermediate}</p>
                  </div>
                  <div className="gloss-col is-deep">
                    <span className="termcard-tag">Going deeper</span>
                    <Prose as="p" text={t.advanced} />
                  </div>
                </div>
                <div className="gloss-meta">
                  <span className="gloss-src">{t.source}</span>
                  {/* `t.see || []`, not `t.see`. A missing `see` here threw
                      TypeError, which unmounted the app — so #/glossary went
                      blank AND every route the smoke gate walked afterwards
                      reported an empty #root: five failures, one cause.
                      check-content.py now requires the key, but it read the
                      same field as `t.get("see") or []` and so tolerated
                      exactly what this line could not. A validator more
                      forgiving than its renderer is not a validator of the
                      renderer; the guard is what makes that irrelevant. */}
                  {(t.see || []).length > 0 && (
                    <span className="gloss-see taplink-row">
                      See also
                      {(t.see || []).map(s => byId[s] && (
                        <a key={s} href={`#${s}`} className="taplink">{byId[s].term}</a>
                      ))}
                    </span>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}

      <p className="small" style={{ marginTop: 'var(--space-7)' }}>
        Two levels because they answer different questions. <strong>In short</strong> is for the
        moment a word interrupted a sentence you were reading. <strong>Going deeper</strong> is
        for when the word is the thing you are actually stuck on — it is where the contested
        edges, the Malaysian departures from English law, and the way the point is really argued
        live. Neither is a substitute for the section or the case it names.
      </p>
    </div>
  );
}
