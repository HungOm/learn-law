import { useStudy } from '../state/StudyContext.jsx';
import * as extracts from '../lib/extracts.js';
import { ArrRow, Notice, TodayCard } from '../components/Bits.jsx';
import { plural } from '../lib/format.js';

/**
 * The index of the advanced tier.
 *
 * It says what the tier is for in the first two sentences, because a reader who
 * arrives here from the rail has no idea why this is different from Lessons and
 * should not have to work it out.
 */
export default function Cases() {
  const { cat, read } = useStudy();
  const { open, total } = extracts.counts(read);
  const groups = extracts.byModule(cat.modules.map(m => m.id));
  const next = extracts.all().find(x => !extracts.isOpen(x, read));

  return (
    <div className="wrap wrap--dash">
      <h1>Case reading</h1>
      <p className="lede">
        Advanced. Every other part of this course tells you what the law is. Here you read
        what a court actually wrote and work out the rule yourself — which is the thing a law
        degree spends three years teaching. {plural(total, 'case')}, {open} open to you now.
      </p>

      {open === 0 ? (
        <TodayCard tone="oxide">
          <p>
            <strong>Nothing open yet.</strong> Each case opens when you have read the lesson it
            belongs to, so the doctrine is in your head before the judgment is in front of you.
          </p>
          {next && (
            <p className="small">
              The first one is {next.case}. Read the lesson it hangs off and it opens.
            </p>
          )}
        </TodayCard>
      ) : null}

      <Notice>
        <strong>This app does not reproduce judgments.</strong> It gives you the citation, tells
        you where the judgment is free to read, and says what to look for. That is deliberate:
        the words of a court belong in a law report, and a passage retyped into a study app is
        one nobody can check. Read the real thing — and if a citation here does not match what
        you find, trust the report and not this page.
      </Notice>

      {groups.map(({ moduleId, list }) => {
        const m = cat.modules.find(x => x.id === moduleId);
        return (
          <div className="arr-group" data-module={moduleId} key={moduleId}>
            <h2>{m ? m.title : moduleId}</h2>
            <div className="arrangement">
              {list.map((x, i) => {
                const isOpen = extracts.isOpen(x, read);
                return (
                  <ArrRow
                    key={x.id}
                    index={i}
                    moduleId={moduleId}
                    to={`/case/${x.id}`}
                    num={isOpen ? `${x.year}` : <span className="row-lock" aria-label="locked">🔒</span>}
                    title={x.case}
                    locked={!isOpen}
                    meta={isOpen
                      ? `${x.citation} · ${x.court} — ${x.why.split('. ')[0]}.`
                      : `${x.citation} — opens when you have read the lesson this belongs to.`}
                    state={<span className={`arr-state${isOpen ? ' is-clear' : ''}`}>
                      {isOpen ? 'open' : 'locked'}
                    </span>}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
