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

        {/* How current the official text is, stated before the link rather than
            after it — and stated at all, which is the whole point. Every one of
            these dates was read off the front matter of the reprint AGC itself
            publishes, and several are alarming: the Contracts Act's newest
            official consolidation incorporates amendments only up to 1 January
            2006. A reader who does not know that will read a twenty-year-old
            text believing it current, and nothing on the page would tell them.

            This is also the argument against holding the text here. A stored
            copy inherits a date like that silently; a pointer carries it. */}
        {entry.currencyDate ? (
          <p className="acttext-note">
            The official reprint is <strong>{entry.currencyDate}</strong>. Anything
            enacted since is not in it, so check for amending Acts before relying
            on the words. Where the reprint differs from this lesson, the reprint
            governs and the lesson is stale.
          </p>
        ) : (
          <p className="acttext-note">
            <strong>There is no consolidated official text of this instrument.</strong>{' '}
            What the source publishes is the original as gazetted, and the
            amendments since are separate instruments. Read them together, and do
            not treat the text you find as current on its face.
          </p>
        )}

        <div className="acttext-links">
          {entry.officialPdf && (
            <a
              className="btn btn-primary acttext-go"
              href={entry.officialPdf}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open the official reprint (PDF)
              <span className="acttext-host">{host(entry.officialPdf)}</span>
            </a>
          )}
          {entry.official && (
            <a
              className="btn acttext-go"
              href={entry.official}
              target="_blank"
              rel="noreferrer noopener"
            >
              The Act on the Federal Legislation Portal
              <span className="acttext-host">{host(entry.official)}</span>
            </a>
          )}
          {/* A commercial mirror, offered as convenience and nothing more. Its
              terms forbid reproduction and framing, so it is a link out and will
              never be anything else here. */}
          {entry.secondary && (
            <a
              className="btn acttext-go"
              href={entry.secondary}
              target="_blank"
              rel="noreferrer noopener"
            >
              Also published by {host(entry.secondary)}
              <span className="acttext-host">unofficial</span>
            </a>
          )}
        </div>

        {/* The official links carry a server-side signature rather than a plain
            permalink — the portal refuses hand-built URLs outright. They are
            verified working, but if the signing secret is ever rotated every one
            of them dies at once, so the reader always gets a route that cannot
            expire. */}
        <p className="acttext-fallback small">
          If a link above fails, search for the Act by name at{' '}
          <a href="https://lom.agc.gov.my" target="_blank" rel="noreferrer noopener">
            lom.agc.gov.my
          </a>.
        </p>

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
