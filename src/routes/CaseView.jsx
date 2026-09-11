import { useState, useMemo} from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStudy } from '../state/StudyContext.jsx';
import * as extracts from '../lib/extracts.js';
import { Notice } from '../components/Bits.jsx';
import NotFound from './NotFound.jsx';
import { Prose, TermLayer } from '../components/Term.jsx';

/**
 * One case: what to read, what to look for, and questions to answer before the
 * model answer is shown.
 *
 * The model is behind a button on purpose. A guided reading question answered by
 * scrolling is a paragraph the reader has looked at; the whole value is in
 * committing to an answer first and finding out afterwards whether it holds.
 * Same argument as the Predict block in the lessons.
 */
export default function CaseView() {
  const { id } = useParams();
  const { cat, read } = useStudy();
  const x = extracts.byId(id);
  // Above every early return: hooks must run in the same order on every
  // render, and placing this next to the JSX that uses it put it after the
  // not-found and loading branches — React error #310, and the surface
  // rendered no terms at all. Caught by opening the page rather than by the
  // build, which was green throughout.
  const seen = useMemo(() => new Map(), [x?.id]);
  const [shown, setShown] = useState({});

  if (!x) return <NotFound />;

  const lesson = cat.lessons.find(l => l.id === x.lessonId);
  const open = extracts.isOpen(x, read);

  // A locked screen is a screen, so it gets its own h1 and says exactly what
  // opens it. A lock with no key is just a wall.
  if (!open) {
    return (
      <div className="wrap" data-module={x.moduleId}>
        <p className="small taplink-row"><Link className="taplink" to="/cases">← Case reading</Link></p>
        <h1>{x.case}</h1>
        <p className="lede">{x.citation} · {x.court}</p>
        <Notice>
          <strong>Not open yet.</strong> This one opens once you have read{' '}
          {lesson ? <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link> : 'its lesson'}.
          The order matters: a judgment read with no doctrine behind it teaches most people
          that law is impenetrable, which is untrue and is the thing most likely to stop you
          coming back.
        </Notice>
      </div>
    );
  }

  return (
    <TermLayer>
    <div className="wrap" data-module={x.moduleId}>
      <p className="small taplink-row"><Link className="taplink" to="/cases">← Case reading</Link></p>

      <h1>{x.case}</h1>
      <p className="lede">
        {x.citation} · {x.court}, {x.year}
        {lesson && <> · from <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link></>}
      </p>

      <h2>Why this one</h2>
      <Prose as="p" text={x.why} seen={seen} />

      <h2>Where to find it</h2>
      <Prose as="p" text={x.find} seen={seen} />

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

      {/* The same source discipline as every lesson: what this rests on, what to
          check, and the date it was last checked. A study aid that cannot be
          audited is a rumour with a citation attached. */}
      <h2>Sources</h2>
      <p className="small">{x.source}</p>
      <p className="small"><strong>Check before you rely on it.</strong> {x.verify}</p>
      <p className="small">Last verified {x.lastVerified}.</p>
    </div>
    </TermLayer>
  );
}
