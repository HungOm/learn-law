// Vocabulary review: the words a reader has actually looked up, brought back.
//
// The queue here is not a syllabus. It contains exactly the terms this reader
// opened a definition for, because that is the one honest signal the app can
// collect about what they personally did not know. Nobody is handed 499 words.
// A reader who never looks anything up sees an empty page, and that is correct
// rather than a failure — there is nothing to review.
//
// Why this is a separate route from `/review` rather than mixed into it:
// legal cards and English vocabulary are different kinds of work and a reader
// may reasonably want one and not the other. They also come from different
// stores (see `DB_VERSION` in db.js), so mixing them here would misrepresent
// what the counts on every other page mean.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as vocab from '../lib/vocab.js';
import { RATING_LABELS } from '../lib/scheduler.js';
import { byId as termById } from '../lib/glossary.js';

export default function Vocab() {
  const [queue, setQueue] = useState(null);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [met, setMet] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const [rows, c] = await Promise.all([vocab.due(20), vocab.counts()]);
      if (!live) return;
      setQueue(rows);
      setMet(c.met);
    })();
    return () => { live = false; };
  }, []);

  const row = queue && queue[i];
  // A term whose row survives in the store after its content left the glossary.
  // Same failure the card review already guards: state outlives content.
  const term = row ? termById[row.id] : null;

  const preview = useMemo(
    () => (row && shown ? vocab.preview(row) : null),
    [row, shown],
  );

  const submit = useCallback(async (key) => {
    if (!row || !shown) return;
    await vocab.grade(row, key);
    setShown(false);
    setI(n => n + 1);
  }, [row, shown]);

  // Same keys as the card review, so the two do not need learning separately:
  // space or enter reveals, 1-4 grade.
  useEffect(() => {
    const onKey = (e) => {
      if (!row) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setShown(true); return; }
      if (shown && /^[1-4]$/.test(e.key)) submit(RATING_LABELS[Number(e.key) - 1].key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [row, shown, submit]);

  if (queue === null) {
    return (
      <div className="wrap sheet review">
        <p className="lede" role="status">Looking for words to review…</p>
      </div>
    );
  }

  // Two different empty states, because they mean opposite things and telling a
  // reader "nothing due" when they have never looked anything up would read as
  // a broken feature rather than an untouched one.
  if (!row) {
    const never = met === 0;
    return (
      <div className="wrap sheet review">
        <p className="small taplink-row"><Link className="taplink" to="/">← Arrangement of modules</Link></p>
        <h1>{never ? 'No words yet' : 'Nothing due'}</h1>
        <p className="lede">
          {never
            ? 'Words arrive here when you look one up. Tap any underlined term while you read, and it will come back later so you actually keep it.'
            : `You have met ${met} ${met === 1 ? 'word' : 'words'}. None is due yet — come back tomorrow.`}
        </p>
        <div className="btn-row">
          <Link className="btn btn-primary" to="/lessons">Read a lesson</Link>
          <Link className="btn" to="/glossary">Browse the glossary</Link>
        </div>
      </div>
    );
  }

  if (!term) {
    // Content moved on; skip rather than crash, and do not grade a ghost.
    return (
      <div className="wrap sheet review">
        <p className="lede">That word is no longer in the glossary.</p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => setI(n => n + 1)}>Skip it</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap sheet review">
      <div className="review-progress">
        <span>{i + 1} of {queue.length}</span>
        <span>{met} met</span>
      </div>

      <div className="flipwrap">
        <motion.div className="flipcard" key={row.id}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flip-face flip-front">
            <p className="card-kind">{term.kind}</p>
            <h1 className="card-front">{term.term}</h1>
            {!shown && (
              <p className="keyhint">
                Say what it means out loud before you reveal. Trying and failing
                is what makes it stick — reading the answer is not.
              </p>
            )}
          </div>

          {shown && (
            <div className="flip-face flip-back">
              <p className="card-kind">meaning</p>
              <p className="card-back-text">{term.gloss}</p>
              {term.intermediate && <p className="card-note">{term.intermediate}</p>}
              {term.source && <p className="card-source">{term.source}</p>}
            </div>
          )}
        </motion.div>
      </div>

      <div className="review-actions">
        {!shown ? (
          <div className="btn-row">
            <button type="button" className="btn-primary btn-big" onClick={() => setShown(true)}>
              Reveal
            </button>
          </div>
        ) : (
          <div className="grades">
            {RATING_LABELS.map((r, n) => (
              <button type="button" key={r.key} className="grade" onClick={() => submit(r.key)}>
                <span className="g-num">{n + 1}</span>
                <span className="g-label">{r.label}</span>
                <span className="g-int">{preview[r.key].interval}</span>
              </button>
            ))}
          </div>
        )}
        <p className="keyhint">
          {shown ? '1–4 to grade.' : 'Space or Enter to reveal.'}
        </p>
      </div>
    </div>
  );
}
