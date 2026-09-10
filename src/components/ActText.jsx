import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useDialog } from './Overlays.jsx';
import { useStudy } from '../state/StudyContext.jsx';

/**
 * Where to read the actual text of a cited provision.
 *
 * The gap this closes: 43 provisions carried no link at all. Every one told the
 * reader, in prose, to search the Attorney General's Chambers site for the Act
 * by name — which is the hunting a study app exists to remove.
 *
 * What it deliberately does NOT do is hold the text.
 *
 * Two measurements decided that, not a preference:
 *
 *   1. The official source cannot be embedded. `lom.agc.gov.my` sends
 *      `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'`, so a popup
 *      that iframes it renders an empty box.
 *   2. The convenient source cannot be pinned. The commercial mirror carries no
 *      per-section anchors — a citation to s 26 lands a reader at the top of a
 *      191-section page — and states no "as amended up to" date anywhere on the
 *      Act, so nothing on the page says how current the text is.
 *
 * (2) is the reason that matters. Legislation is amended: a section can be
 * substituted, renumbered or repealed between one reading and the next, so a
 * stored copy goes silently out of date and the reader has no way to tell which
 * they are looking at. A pointer and a date can be checked. A copy cannot. The
 * same argument is set out at greater length in src/lib/statutes.js, and
 * tools/check-statutes.py enforces it with a 25-word quotation ceiling.
 *
 * So this card is a pointer with the reading apparatus attached: the Act, the
 * provision, and a link that opens the current text at its source. Where the
 * provision has a guided page, that page's own `find` and `read` do the rest.
 */
export default function ActText({ actId, provision, act, className }) {
  const [open, setOpen] = useState(false);
  const { cat } = useStudy();
  const entry = actId ? cat.byId.statute?.[actId] : null;

  // No entry means books.json does not carry this Act. Render nothing rather
  // than a control that opens a card with one line in it — a dead end the
  // reader has to tap to discover is worse than an absence they can see.
  if (!entry) return null;

  return (
    <>
      <button
        type="button"
        className={className || 'btn acttext-btn'}
        onClick={() => setOpen(true)}
      >
        Where to read the text
      </button>
      {open && (
        <Card
          entry={entry}
          provision={provision}
          act={act || entry.title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Card({ entry, provision, act, onClose }) {
  const ref = useDialog(true, onClose);

  return createPortal(
    <>
      <div className="acttext-scrim" onClick={onClose} />
      <div
        className="acttext"
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Where to read ${provision ? `${provision}, ` : ''}${act}`}
      >
        <div className="acttext-head">
          <p className="acttext-act">{act}</p>
          {provision && <p className="acttext-prov">{provision}</p>}
          <button type="button" className="acttext-close" onClick={onClose}>Close ✕</button>
        </div>

        {/* Stated before the links, not after them. A reader who follows the
            link and finds a different section number needs to know that is
            expected — legislation is renumbered — rather than concluding the
            app is wrong or, worse, that their memory of the section is. */}
        <p className="acttext-note">
          Read the provision in the current reprint. If the numbering or the wording
          differs from this lesson, the reprint governs and the lesson is stale —
          tell nobody it is settled until you have seen the words.
        </p>

        <div className="acttext-links">
          {entry.source && (
            <a
              className="btn btn-primary acttext-go"
              href={entry.source}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open {entry.title}
              <span className="acttext-host">{host(entry.source)}</span>
            </a>
          )}
        </div>

        {provision && (
          <p className="acttext-find">
            The source opens at the Act. Find <strong>{provision}</strong> within it —
            the sources available for Malaysian legislation do not address individual
            sections, so this is the one step nobody can take for you.
          </p>
        )}

        {entry.notes && <p className="acttext-notes small">{entry.notes}</p>}
      </div>
    </>,
    document.body,
  );
}

/* The host, shown beside the link. A reader about to leave the app should be
   able to see where to, and a government domain is worth recognising. */
function host(url) {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; }
}
