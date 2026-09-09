import { useEffect, useState } from 'react';
import { useStudy } from '../state/StudyContext.jsx';
import * as writing from '../lib/writing.js';
import { ArrRow, Notice, TodayCard } from '../components/Bits.jsx';
import { plural } from '../lib/format.js';

/**
 * The index of the writing tier.
 *
 * Grouped by level rather than by module, which is the opposite of every other
 * index here. The reason is that the skill ladder runs across subjects: the
 * shape of a case note is the same whether the case is about land or
 * negligence, and a reader who has written one at foundation level should meet
 * the advanced version next, not the foundation version of another subject.
 */
export default function Writing() {
  const { read } = useStudy();
  const { open, total } = writing.counts(read);
  const groups = writing.byLevel();
  const next = writing.all().find(w => !writing.isOpen(w, read));
  const [drafts, setDrafts] = useState({});

  useEffect(() => { writing.allDrafts().then(setDrafts); }, []);

  return (
    <div className="wrap wrap--dash">
      <h1>Writing</h1>
      <p className="lede">
        Advanced. A law degree is assessed almost entirely on writing, and nothing else in this
        course asks you to compose anything. Here you draft, mark your own work against a
        rubric, and only then find out what a good answer does.
        {' '}{plural(total, 'exercise')}, {open} open to you now.
      </p>

      {open === 0 ? (
        <TodayCard tone="oxide">
          <p>
            <strong>Nothing open yet.</strong> Each exercise opens when you have read the lesson
            it belongs to. Writing about a rule you have not met produces a page of hedging, and
            that teaches you that you cannot write — which is untrue.
          </p>
          {next && (
            <p className="small">
              The first one is {next.title}. Read the lesson it hangs off and it opens.
            </p>
          )}
        </TodayCard>
      ) : null}

      <Notice>
        <strong>There is no model answer here, and that is deliberate.</strong> You get the
        brief, the steps, the shape a good answer has, and the faults it usually has. What you
        do not get is a text to copy — because it would be copied, and a reader who reads a
        model before drafting produces a version of it and learns nothing about their own
        writing. Draft first. The comparison is worth something only after you have committed.
      </Notice>

      {groups.map(({ id, label, note, list }) => (
        <div className="arr-group" key={id}>
          <h2>{label}</h2>
          <p className="small">{note}</p>
          <div className="arrangement">
            {list.map((w, i) => {
              const isOpen = writing.isOpen(w, read);
              const d = drafts[w.id];
              const drafted = writing.isDrafted(d);
              return (
                <ArrRow
                  key={w.id}
                  index={i}
                  moduleId={w.moduleId}
                  to={`/writing/${w.id}`}
                  num={isOpen ? `${w.minutes}m` : <span className="row-lock" aria-label="locked">🔒</span>}
                  title={w.title}
                  locked={!isOpen}
                  meta={isOpen
                    ? `${w.kind.replace('-', ' ')} · ${w.brief.split('. ')[0]}.`
                    : 'Opens when you have read the lesson this belongs to.'}
                  state={
                    <span className={`arr-state${drafted ? ' is-clear' : ''}`}>
                      {drafted
                        ? (d.band ? d.band : `${writing.words(d.text)} words`)
                        : (isOpen ? 'not started' : '')}
                    </span>
                  }
                />
              );
            })}
          </div>
        </div>
      ))}

      <h2>What this cannot do</h2>
      <p className="small">
        Nothing here marks your work. No app can — marking legal writing is a judgement about
        reasoning, and a rubric applied by the person who wrote the answer is the honest
        substitute, not a lesser one. It is also the skill itself: a lawyer who cannot tell
        whether their own draft is any good has to wait for someone else to tell them.
      </p>
    </div>
  );
}
