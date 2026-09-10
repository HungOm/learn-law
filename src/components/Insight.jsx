import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudy } from '../state/StudyContext.jsx';
import { attempts } from '../lib/db.js';
import * as quizLib from '../lib/quiz.js';
import * as insight from '../lib/insight.js';
import { plural, round1 } from '../lib/format.js';

/**
 * The pieces of the diagnosis layer that render.
 *
 * Everything here is a link, a table or a sentence. There is no control that
 * is not a link, so keyboard traversal comes with the markup, and nothing is
 * coloured gold: these are measurements, and nothing in a measurement has
 * been earned. Where a figure is under its floor the cell says so in words
 * rather than showing a number that would render as confidently as a real one.
 */

// --- where to look first ----------------------------------------------------

export function WeakSpots({ findings }) {
  if (!findings.length) return null;
  return (
    <div className="arrangement">
      {findings.map((f, i) => (
        <Link className="arr-row is-link" to={f.to} key={f.kind}>
          <span className="arr-num">{i + 1}</span>
          <span>
            <span className="arr-title">{f.headline}</span>
            <span className="arr-meta">{f.detail}</span>
            <span className="arr-meta">Cannot see: {f.blind}</span>
          </span>
          <span className="arr-state is-due">{f.cta}</span>
        </Link>
      ))}
    </div>
  );
}

// --- by module -------------------------------------------------------------

function Cell({ value, note, label }) {
  return (
    /* `data-label`: see the note in Blocks.jsx. Without it the stacked layout
       at narrow widths renders six unlabelled numbers per module. */
    <td role="cell" className="is-num" data-label={label}>
      {value}
      {note && <span className="dtable-note">{note}</span>}
    </td>
  );
}

const NONE = '—';

export function ModuleTable({ rows }) {
  return (
    /* The scroll box is focusable in Chrome only, so the stop is declared here
       and named. Also in Diagram.jsx, Blocks.jsx and Chart.jsx — change all
       four or none. See the note in Blocks.jsx. */
    <div className="table-wrap" tabIndex={0} role="group" aria-label="Progress by module">
      {/* Explicit roles, restating what the markup already implies. Below
          600px the stacked layout sets `display: block` on the rows and cells
          so each becomes a labelled block — and in Chrome and Safari that
          DROPS the implicit ARIA role, so the table stops being a table to a
          screen reader exactly where it is hardest to read anyway. CSS cannot
          put the semantics back; only these can. They are inert at wide
          widths, where they say what the tags already said. */}
      <table className="dtable" role="table">
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Module</th>
            <th scope="col" role="columnheader" className="is-num">Cards</th>
            <th scope="col" role="columnheader" className="is-num">Recall, 30 days</th>
            <th scope="col" role="columnheader" className="is-num">Quiz</th>
            <th scope="col" role="columnheader" className="is-num">Mean mark</th>
            <th scope="col" role="columnheader" className="is-num">Gap, unaided</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map(r => {
            const rc = r.recall, qz = r.quiz, mk = r.marks;
            return (
              <tr key={r.moduleId} role="row">
                <th scope="row" role="rowheader">
                  <Link to={`/module/${r.moduleId}`}>{r.title}</Link>
                </th>
                <Cell
                  label="Cards"
                  value={r.cards || NONE}
                  note={r.cards ? (r.due ? `${r.due} due` : 'clear') : null}
                />
                <Cell
                  label="Recall, 30 days"
                  value={rc ? (rc.enough ? `${rc.pct}%` : 'too few') : NONE}
                  note={rc ? `${plural(rc.n, 'grade')}${rc.enough ? '' : `, under ${insight.RECALL_FLOOR}`}` : 'no reviews'}
                />
                <Cell
                  label="Quiz"
                  value={qz ? (qz.enough ? `${qz.pct}%` : 'too few') : NONE}
                  note={qz
                    ? `${plural(qz.answered, 'answer')} in ${plural(qz.runs, 'run')}${qz.enough ? '' : `, under ${insight.QUIZ_FLOOR}`}`
                    : 'no runs'}
                />
                <Cell
                  label="Mean mark"
                  value={mk ? `${mk.meanPct}%` : NONE}
                  note={mk ? plural(mk.n, 'attempt') : 'no attempts'}
                />
                <Cell
                  label="Gap, unaided"
                  value={mk ? (mk.cal ? `${mk.cal.mean > 0 ? '+' : ''}${mk.cal.mean}` : 'too few') : NONE}
                  note={mk
                    ? (mk.cal ? `over ${mk.cal.n} unaided` : `${mk.predicted} unaided, under ${insight.CAL_FLOOR}`)
                    : null}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- calibration over time ---------------------------------------------------

/** One sentence on whether the gap is closing. Says nothing until it can. */
export function calibrationTrendCopy(t) {
  if (!t) return null;
  if (!t.enough) {
    return `Direction of travel needs ${insight.TREND_FLOOR} unaided attempts with a prediction. You have ${t.n}; rehearsals do not count.`;
  }
  const r = t.recent, e = t.earlier;
  const word = t.direction === 'narrowing' ? 'narrowing' : t.direction === 'widening' ? 'widening' : 'holding steady';
  return `Over your last five predictions you are out by ${plural(round1(r.spread), 'mark')} on average, against ${round1(e.spread)} before that. The gap is ${word}.`;
}

/**
 * Self-loading, so it can be mounted with one line under a results screen.
 * Reads the attempts store itself; pass `rows` to skip the read.
 */
export function CalibrationLine({ rows = null }) {
  const { cat } = useStudy();
  const [list, setList] = useState(rows);
  useEffect(() => { if (!rows) attempts.all().then(setList); }, [rows]);
  if (!list) return null;
  const t = insight.calibrationTrend(list, { problemsById: cat.byId.problem });
  const copy = calibrationTrendCopy(t);
  if (!copy) return null;
  return <p className="small">{copy}</p>;
}

// --- quiz standing, for the end of a run -------------------------------------

/**
 * Self-loading. Names the weakest quiz in the module a lesson belongs to,
 * from every run logged, so a reader who has just finished one knows where
 * the next one is. Silent until a second lesson in the module has been run.
 */
export function QuizStandingLine({ lessonId }) {
  const { cat } = useStudy();
  const [runs, setRuns] = useState(null);
  useEffect(() => { quizLib.runLog().then(setRuns); }, [lessonId]);
  const lesson = cat.byId.lesson[lessonId];
  if (!runs || !lesson) return null;
  const m = insight.quizByModule(runs, cat.lessons)[lesson.moduleId];
  if (!m || m.lessonsRun < 2 || !m.weakest) return null;
  const w = m.weakest;
  const title = cat.byId.module[lesson.moduleId]?.title || lesson.moduleId;
  return (
    <p className="small">
      In {title} your weakest quiz is{' '}
      {w.lessonId === lessonId
        ? <>this one, at {w.correct} of {w.total} over {plural(w.runs, 'run')}.</>
        : <><Link to={`/quiz/${w.lessonId}`}>{w.title}</Link>, at {w.correct} of {w.total} over {plural(w.runs, 'run')}.</>}
    </p>
  );
}

// --- seals: how far off ------------------------------------------------------

export function NearestSeals({ items }) {
  if (!items.length) return null;
  return (
    <div className="arrangement">
      {items.map(({ a, p }, i) => (
        <div className="arr-row is-static" key={a.id}>
          <span className="arr-num">{i + 1}</span>
          <span>
            <span className="arr-title">{a.name}</span>
            <span className="arr-meta">
              {p.current.toLocaleString()} of {p.target.toLocaleString()} · {a.hint}
              <span className="minibar" aria-hidden="true"><i style={{ width: `${p.pct}%` }} /></span>
            </span>
          </span>
          <span className="arr-state">{p.pct}%</span>
        </div>
      ))}
    </div>
  );
}
