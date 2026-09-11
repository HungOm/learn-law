import { useState, useMemo} from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStudy } from '../state/StudyContext.jsx';
import * as statutes from '../lib/statutes.js';
import { Notice } from '../components/Bits.jsx';
import NotFound from './NotFound.jsx';
import ActText from '../components/ActText.jsx';
import { Prose, TermLayer } from '../components/Term.jsx';

/**
 * One provision: where to read it, what to look for, and questions answered
 * before the model is shown.
 *
 * Same reveal discipline as the case tier. A guided reading question answered
 * by scrolling is a paragraph the reader has looked at; the value is entirely
 * in committing to an answer and then finding out whether it holds.
 */
export default function StatuteView() {
  const { id } = useParams();
  const { cat, read } = useStudy();
  const x = statutes.byId(id);
  // Above every early return: hooks must run in the same order on every
  // render, and placing this next to the JSX that uses it put it after the
  // not-found and loading branches — React error #310, and the surface
  // rendered no terms at all. Caught by opening the page rather than by the
  // build, which was green throughout.
  const seen = useMemo(() => new Map(), [x?.id]);
  const [shown, setShown] = useState({});

  if (!x) return <NotFound />;

  const lesson = cat.lessons.find(l => l.id === x.lessonId);
  const open = statutes.isOpen(x, read);

  if (!open) {
    return (
      <div className="wrap sheet" data-module={x.moduleId}>
        <p className="small taplink-row"><Link className="taplink" to="/statutes">← Statutes</Link></p>
        <h1>{x.provision}</h1>
        <p className="lede">{x.act}</p>
        <Notice>
          <strong>Not open yet.</strong> This one opens once you have read{' '}
          {lesson ? <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link> : 'its lesson'}.
          A section read with no doctrine behind it teaches most people that legislation is
          impenetrable, which is false and is the belief this tier exists to remove.
        </Notice>
      </div>
    );
  }

  return (
    <TermLayer>
    <div className="wrap sheet" data-module={x.moduleId}>
      <p className="small taplink-row"><Link className="taplink" to="/statutes">← Statutes</Link></p>

      <h1>{x.provision}</h1>
      <p className="lede">
        {x.act}
        {lesson && <> · from <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link></>}
      </p>

      <h2>Why this one</h2>
      <Prose as="p" text={x.why} seen={seen} />

      <h2>Where to read it</h2>
      <Prose as="p" text={x.find} seen={seen} />
      {/* The prose above tells a reader to search for the Act. This opens it.
          It does not carry the text: see the note in ActText.jsx for the two
          measurements behind that, and src/lib/statutes.js for why a stored
          copy of legislation is worse than a pointer to it. */}
      <ActText actId={x.actId} act={x.act} provision={x.provision} />

      <h2>What to look for</h2>
      <div className="arrangement">
        {x.read.map((r, i) => (
          <div className="arr-row is-static" key={i}>
            <span className="arr-num">{i + 1}</span>
            <span>
              <span className="arr-title"><Prose text={r.passage} seen={seen} /></span>
              <span className="arr-meta"><Prose text={r.look_for} seen={seen} /></span>
            </span>
          </div>
        ))}
      </div>

      <h2>Questions</h2>
      {x.questions.map((q, i) => (
        <div className="checkpointblock" key={i}>
          <span className="xlabel">Answer before you look</span>
          <Prose as="p" className="predict-prompt" text={q.q} seen={seen} />
          {shown[i] ? (
            <div className="predict-reveal" role="status">
              <Prose as="p" text={q.model} seen={seen} />
            </div>
          ) : (
            <p>
              <button
                type="button"
                className="btn"
                onClick={() => setShown(s => ({ ...s, [i]: true }))}
              >
                Show what a good answer does
              </button>
            </p>
          )}
        </div>
      ))}

      <Notice><strong>The usual mistake here.</strong> {x.trap}</Notice>

      <h2>Sources</h2>
      <p className="small">{x.source}</p>
      <p className="small"><strong>Check before you rely on it.</strong> {x.verify}</p>
      <p className="small">Last verified {x.lastVerified}. Legislation is amended; if the Act
        differs from this page, the Act is right.</p>
    </div>
    </TermLayer>
  );
}
