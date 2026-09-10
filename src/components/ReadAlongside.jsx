import { Link } from 'react-router-dom';
import * as extractsLib from '../lib/extracts.js';
import * as statutesLib from '../lib/statutes.js';
import * as readingLib from '../lib/reading.js';
import { plural } from '../lib/format.js';
import ActText from './ActText.jsx';
import { useStudy } from '../state/StudyContext.jsx';

/**
 * The reading assignment for one lesson.
 *
 * Per lesson, from the lesson's own authorities — see src/lib/reading.js for why
 * nothing here is authored. The list is what this lesson cites, in the order it
 * cites them, which is also the order to read them.
 *
 * Three tiers of certainty, and the block says which is which rather than
 * flattening them:
 *
 *   1. an app page exists for it   — a live link, gated by check:extracts or
 *                                    check:statutes, tied to this lessonId
 *   2. the lesson names it         — the citation as the lesson states it, to
 *                                    take to the Act or the law report
 *   3. secondary                   — Hart, Schauer and the like: not law, and
 *                                    kept apart from the authorities
 *
 * A lesson with no authorities renders nothing. Sixteen of sixty-four are method
 * and study lessons with no statutory basis to state, and an empty "Reading"
 * heading on those would teach the reader the section is decorative.
 */
export default function ReadAlongside({ lesson }) {
  const { cat } = useStudy();
  if (!lesson) return null;

  const { statutes, cases, secondary } = readingLib.authorities(lesson);
  const est = readingLib.estimate(lesson);

  // Tier pages tied to THIS lesson, by exact lessonId. No fuzzy matching of a
  // citation string against a tier entry: a wrong link on a law site is worse
  // than no link, and "Contracts Act 1950, s 26" matching the wrong provision
  // is exactly the kind of near-miss nobody would check.
  const casePages = safe(() => extractsLib.all().filter(x => x.lessonId === lesson.id));
  const statutePages = safe(() => statutesLib.all().filter(x => x.lessonId === lesson.id));

  if (!statutes.length && !cases.length && !casePages.length && !statutePages.length) return null;

  const linked = new Set([...casePages.map(x => x.case), ...statutePages.map(x => x.provision)]);

  return (
    <section className="readalong" aria-labelledby="readalong-h">
      <h2 id="readalong-h">Read this lesson&rsquo;s authorities</h2>
      <p className="small">
        Every source this lesson rests on, in the order it introduces them. The text
        governs: where it differs from the lesson, the text is right and the lesson is
        stale.{est ? ` Allow ${est.low}–${est.high} minutes.` : ''}
      </p>

      {(statutePages.length > 0 || casePages.length > 0) && (
        <>
          <h3>Guided here</h3>
          <div className="arrangement">
            {statutePages.map(x => (
              <Link className="arr-row is-link" to={`/statute/${x.id}`} key={x.id}>
                <span className="arr-num" aria-hidden="true">&sect;</span>
                <span>
                  <span className="arr-title">{x.provision}</span>
                  <span className="arr-meta">{x.act}</span>
                </span>
                <span className="arr-state is-clear">open</span>
              </Link>
            ))}
            {casePages.map(x => (
              <Link className="arr-row is-link" to={`/case/${x.id}`} key={x.id}>
                <span className="arr-num">{x.year || '—'}</span>
                <span>
                  <span className="arr-title">{x.case}</span>
                  <span className="arr-meta">{x.citation}{x.court ? ` · ${x.court}` : ''}</span>
                </span>
                <span className="arr-state is-clear">open</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {statutes.length > 0 && (
        <>
          <h3>{plural(statutes.length, 'provision')} to read</h3>
          <ul className="readalong-list">
            {statutes.map(s => {
              // The Act only — never the section. See actIdFor in lib/reading.js.
              const actId = readingLib.actIdFor(s, cat.statutes || []);
              return (
                <li key={s} className={linked.has(s) ? 'is-linked' : undefined}>
                  {s}
                  {actId && <ActText actId={actId} provision={s} className="readalong-where" />}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {cases.length > 0 && (
        <>
          <h3>{plural(cases.length, 'judgment')} to read</h3>
          <ul className="readalong-list">
            {cases.map(s => <li key={s}>{s}</li>)}
          </ul>
          <p className="small">
            Judgments are not reproduced here. The citation is what you take to the law
            report — a passage retyped into a study app is one nobody can check.
          </p>
        </>
      )}

      {secondary.length > 0 && (
        <>
          <h3>Around it</h3>
          <ul className="readalong-list is-secondary">
            {secondary.map(s => <li key={s}>{s}</li>)}
          </ul>
        </>
      )}
    </section>
  );
}

/* The tier libraries read generated JSON at import. A lesson must not fail to
   render because a tier is mid-edit — a throw here costs the reading list and
   nothing else. */
function safe(fn) {
  try { return fn() || []; } catch { return []; }
}
