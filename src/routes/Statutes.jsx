import { useStudy } from '../state/StudyContext.jsx';
import * as statutes from '../lib/statutes.js';
import { ArrRow, Notice, TodayCard } from '../components/Bits.jsx';
import { plural } from '../lib/format.js';

/**
 * The index of the statute tier.
 *
 * Grouped by Act rather than by module, because that is how a reader looks a
 * provision up. Someone who wants s 340 wants the National Land Code, not the
 * property module — and the whole skill this tier teaches is going to the book.
 */
export default function Statutes() {
  const { read } = useStudy();
  const { open, total } = statutes.counts(read);
  const groups = statutes.byAct();
  const next = statutes.all().find(x => !statutes.isOpen(x, read));

  return (
    <div className="wrap wrap--dash">
      <h1>Statutes</h1>
      <p className="lede">
        Advanced. The lessons tell you what a section says. Here you go and read it —
        which is the half of legal skill a course can most easily leave out, and the half
        a working lawyer uses every day. {plural(total, 'provision')}, {open} open to you now.
      </p>

      {open === 0 ? (
        <TodayCard tone="oxide">
          <p>
            <strong>Nothing open yet.</strong> Each provision opens once you have read the
            lesson that relies on it, so you meet the words with the doctrine already in your
            head rather than the other way round.
          </p>
          {next && (
            <p className="small">
              The first is {next.provision} of the {next.act}. Read the lesson it belongs to
              and it opens.
            </p>
          )}
        </TodayCard>
      ) : null}

      <Notice>
        <strong>This app does not reproduce any provision, and that is not only about
        copyright.</strong> Legislation is amended. A section can be substituted, renumbered
        or repealed between one reading and the next, so a copy stored here would go quietly
        out of date and you would have no way to tell. What you get is a pointer, a date, and
        what to look for. If the text you find differs from anything on these pages, the text
        is right and this page is stale — tell nobody, just trust the Act.
      </Notice>

      {groups.map(({ act, list }) => (
        <div className="arr-group" key={act}>
          <h2>{act}</h2>
          <div className="arrangement">
            {list.map((x, i) => {
              const isOpen = statutes.isOpen(x, read);
              return (
                <ArrRow
                  key={x.id}
                  index={i}
                  moduleId={x.moduleId}
                  to={`/statute/${x.id}`}
                  num={isOpen ? '§' : <span className="row-lock" aria-label="locked">🔒</span>}
                  title={x.provision}
                  locked={!isOpen}
                  meta={isOpen
                    ? x.why.split('. ')[0] + '.'
                    : 'Opens when you have read the lesson that relies on it.'}
                  state={<span className={`arr-state${isOpen ? ' is-clear' : ''}`}>
                    {isOpen ? 'open' : ''}
                  </span>}
                />
              );
            })}
          </div>
        </div>
      ))}

      <h2>Why the pointer and not the text</h2>
      <p className="small">
        Every entry names where to read the current version without paying for it. That is
        deliberate: a reader who cannot reach the primary source is dependent on whoever
        summarised it, and this course is built for readers who mostly cannot afford to be.
      </p>
    </div>
  );
}
