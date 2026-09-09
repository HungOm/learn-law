import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudy } from '../state/StudyContext.jsx';
import * as prob from '../lib/problems.js';
import { ArrRow, Notice, TodayCard } from '../components/Bits.jsx';
import { daysAgo, plural } from '../lib/format.js';

export function ProblemRow({ p, last, index }) {
  const total = prob.totalMarks(p);
  let state = <span className="arr-state">not attempted</span>;
  if (last) {
    const pc = prob.percent(last.score, last.total);
    const cls = pc >= 70 ? 'is-clear' : pc >= 50 ? '' : 'is-due';
    state = <span className={`arr-state ${cls}`}>{last.score}/{last.total} · {daysAgo(last.markedAt)}</span>;
  }
  return (
    <ArrRow
      index={index}
      moduleId={p.moduleId}
      to={`/problem/${p.id}`}
      num={`${p.minutes}′`}
      title={p.title}
      meta={`${p.kind} · ${total} marks · ${(p.rubric || []).length} criteria`}
      state={state}
    />
  );
}

export default function Problems() {
  const { cat } = useStudy();
  const [latest, setLatest] = useState({});

  useEffect(() => { prob.latestByProblem().then(setLatest); }, []);

  const ordered = prob.listOrder(cat.problems, latest);
  const suggestion = ordered[0];
  const byModule = cat.modules
    .map(m => ({ m, list: cat.problems.filter(p => p.moduleId === m.id) }))
    .filter(g => g.list.length);
  const attempted = Object.keys(latest).length;

  return (
    <div className="wrap wrap--dash">
      <h1>Problem questions</h1>
      <p className="lede">
        {cat.problems.length} questions. You have attempted {attempted}. Write the answer first,
        in full, before you look at anything.
      </p>

      {suggestion && (
        <TodayCard tone="oxide">
          <p>
            <strong>{latest[suggestion.id] ? 'Weakest so far' : 'Start here'}:</strong>{' '}
            {suggestion.title} — {plural(suggestion.minutes, 'minute')}, {prob.totalMarks(suggestion)} marks.
          </p>
          <div className="btn-row"><Link className="btn btn-primary" to={`/problem/${suggestion.id}`}>Open it</Link></div>
        </TodayCard>
      )}

      <Notice>
        The rubric and the model answer are written to be marked against, not to be cited. Every
        question names what must be checked against a current source before its reasoning is
        relied on for anything real.
      </Notice>

      {byModule.map(({ m, list }) => (
        <div className="arr-group" data-module={m.id} key={m.id}>
          <h2>{m.title}</h2>
          <div className="arrangement">
            {list.map((p, i) => <ProblemRow key={p.id} p={p} last={latest[p.id]} index={i} />)}
          </div>
        </div>
      ))}

      <p className="small" style={{ marginTop: '2.5rem' }}>
        There is no due date on this page and no badge in the rail for it. A spacing algorithm
        fitted to single-fact recall has nothing to say about a forty-minute piece of writing,
        and a number that looked like the review counts would be read like them. An attempt pays
        more XP than anything else in the app, which is the only weighting the game layer makes.
      </p>
    </div>
  );
}
