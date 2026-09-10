import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStudy } from '../state/StudyContext.jsx';
import * as prob from '../lib/problems.js';
import * as lessonsLib from '../lib/lessons.js';
import { ArrRow, CountUp, ProgressRing, Stat, StatGrid } from '../components/Bits.jsx';
import { Rehearsal, RehearsalScore } from '../components/Rehearsal.jsx';
import { CalibrationLine } from '../components/Insight.jsx';
import { fanfare } from '../lib/fx.js';
import { copyText, daysAgo, fmtClock, plural, round1 } from '../lib/format.js';
import PrintSheet from '../components/PrintSheet.jsx';
import NotFound from './NotFound.jsx';

const EMPTY_RUN = { stage: 'read', text: '', startedAt: null, elapsedMs: 0, predicted: null, awarded: {} };

export default function ProblemView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cat, award, toast } = useStudy();
  const p = cat.byId.problem[id];
  // Which lesson sends a reader here. Problems carry a moduleId but no lesson,
  // and a marker holding the printed sheet needs to know the topic it belongs
  // to, so it is read off the lesson that prepares it.
  const preparedBy = p ? cat.lessons.find(l => (l.prepares || []).includes(p.id)) : null;

  const [run, setRun] = useState(null);
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(null);
  const [awardedXp, setAwardedXp] = useState(0);

  // The clock accrues only while the writing stage is on screen. Reading the
  // facts is not writing time, and neither is marking.
  const since = useRef(null);
  const runRef = useRef(null);
  runRef.current = run;

  useEffect(() => {
    if (!p) return;
    let live = true;
    (async () => {
      const [draft, hist] = await Promise.all([prob.draft.load(id), prob.historyFor(id)]);
      if (!live) return;
      setRun(draft || { ...EMPTY_RUN, awarded: {} });
      setHistory(hist);
    })();
    return () => { live = false; };
  }, [id, p]);

  const elapsed = useCallback(() => {
    const r = runRef.current;
    if (!r) return 0;
    return r.elapsedMs + (since.current ? Date.now() - since.current : 0);
  }, []);

  // Idempotent, because the writing stage can be entered either by pressing the
  // button or by resuming a saved draft straight into it. Starting the clock
  // twice would drop the first interval; starting it only on the button press
  // would leave a resumed attempt running untimed, which is the case the draft
  // exists for.
  const clockIn = useCallback(() => { if (since.current === null) since.current = Date.now(); }, []);
  const clockOut = useCallback(() => {
    if (since.current === null || !runRef.current) return;
    const add = Date.now() - since.current;
    since.current = null;
    const next = { ...runRef.current, elapsedMs: runRef.current.elapsedMs + add };
    runRef.current = next;
    setRun(next);
  }, []);

  // Writes are done outside the state updater. React may call an updater twice
  // in development, and a function that writes to IndexedDB is not one you want
  // called twice for one keystroke.
  const persist = useCallback((next) => {
    const r = next || runRef.current;
    if (!r || r.stage === 'done') return;
    prob.draft.save(id, { ...r, elapsedMs: r.elapsedMs + (since.current ? Date.now() - since.current : 0) });
  }, [id]);

  const update = useCallback((patch) => {
    const next = { ...runRef.current, ...patch };
    runRef.current = next;
    setRun(next);
    return next;
  }, []);

  const go = useCallback((stage, patch = {}) => {
    clockOut();
    persist(update({ ...patch, stage }));
  }, [clockOut, persist, update]);

  // Leaving the page banks the clock and the draft.
  useEffect(() => () => {
    const r = runRef.current;
    if (!r || r.stage === 'done') return;
    const add = since.current ? Date.now() - since.current : 0;
    since.current = null;
    prob.draft.save(id, { ...r, elapsedMs: r.elapsedMs + add });
  }, [id]);

  if (!p) return <NotFound />;
  // The catalogue already knows this question's title, so the loading branch
  // opens with the same h1 the loaded page does rather than with no heading at
  // all — nothing jumps when the draft arrives.
  if (!run) {
    return (
      <div className="wrap sheet" data-module={p.moduleId}>
        <h1>{p.title}</h1>
        <p className="lede" role="status">Opening the question…</p>
      </div>
    );
  }

  const total = prob.totalMarks(p);
  const mod = cat.byId.module[p.moduleId] || {};
  const lesson = lessonsLib.lessonForProblem(cat.lessons, id);

  // Rendered as elements rather than as components declared in the render body:
  // a component type created on every render remounts its whole subtree on every
  // keystroke in the answer box.
  const header = (right) => (
    <div className="review-progress">
      <span className="crumb-row"><Link className="crumb" to="/problems">← Problem questions</Link> {mod.title || ''}</span>
      <span>{right}</span>
    </div>
  );

  const guided = p.kind === 'guided';
  const factsInner = (
    <div className="facts">
      <p className="card-kind">
        {guided ? '' : `${p.kind} · `}{plural(p.minutes, 'minute')} · {total} marks
      </p>
      {(p.scenario || []).map((t, i) => <p key={i}>{t}</p>)}
      <p className="task"><strong>{p.task}</strong></p>
    </div>
  );
  // A guided problem is a rehearsal, and the frame says so. See
  // components/Rehearsal.jsx — sunk, dashed, and never a signal colour.
  const facts = guided ? <Rehearsal>{factsInner}</Rehearsal> : factsInner;

  // --- stage 1: read ------------------------------------------------------
  if (run.stage === 'read') {
    return (
      // Forty minutes of reading facts and writing an answer. Prose from top
      // to bottom, so it keeps the measure and takes the sheet; data-module
      // puts the question in its part of the curriculum, with the module's
      // name already printed in the bar above.
      <div className="wrap sheet problem" data-module={p.moduleId}>
        {header(history.length ? plural(history.length, 'previous attempt', 'previous attempts') : '')}
        <h1>{p.title}</h1>
        {facts}

        <div className="notice">
          Write the whole answer before you look at the rubric or the model. Reading the rubric
          first turns the exercise into a checklist and destroys the only measurement it makes.
        </div>

        {lesson && (
          <p className="small">
            This question was written to follow <Link className="tap-exempt" to={`/lesson/${lesson.id}`}>{lesson.title}</Link>.
            Read it first if you have not.
          </p>
        )}

        <div className="btn-row">
          <motion.button className="btn-primary btn-big" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => go('write')}>
            {run.text ? 'Carry on writing' : 'Start writing'}
          </motion.button>
        </div>
        {run.text && (
          <p className="small">
            A draft from {daysAgo(run.startedAt)} is saved — {prob.countWords(run.text)} words,
            {' '}{fmtClock(run.elapsedMs)} on the clock.
          </p>
        )}

        {history.length > 0 && (
          <>
            <h2>Previous attempts</h2>
            <div className="arrangement">
              {history.map((a, i) => (
                <ArrRow
                  key={a.attemptId ?? i}
                  moduleId={p.moduleId}
                  index={i}
                  num={`${a.score}/${a.total}`}
                  title={daysAgo(a.markedAt)}
                  meta={`${a.words} words · ${a.minutesSpent} min${typeof a.predicted === 'number' ? ` · predicted ${a.predicted}` : ''}`}
                  state={<span className="arr-state">{prob.percent(a.score, a.total)}%</span>}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // --- stage 2: write -----------------------------------------------------
  if (run.stage === 'write') {
    return (
      <WriteStage
        p={p} run={run} update={update} persist={persist} clockIn={clockIn} elapsed={elapsed}
        header={header} facts={facts} onFinish={() => go('predict')}
        onPause={() => { clockOut(); persist(); navigate('/problems'); }}
        toast={toast}
      />
    );
  }

  // --- stage 3: predict ---------------------------------------------------
  if (run.stage === 'predict') {
    return (
      <PredictStage
        p={p} run={run} total={total} header={header}
        onBack={() => go('write')}
        onReveal={(v) => go('mark', { predicted: v })}
        toast={toast}
      />
    );
  }

  // --- stage 4: mark ------------------------------------------------------
  if (run.stage === 'mark') {
    return (
      <MarkStage
        p={p} run={run} update={update} total={total} persist={persist} header={header}
        toast={toast}
        moduleTitle={mod.title} lessonTitle={preparedBy?.title}
        onSave={async () => {
          const unmarked = (p.rubric || []).filter(r => run.awarded[r.id] === undefined);
          if (unmarked.length && !window.confirm(
            `${unmarked.length} criteri${unmarked.length === 1 ? 'on has' : 'a have'} not been marked. ` +
            'They will score zero. Save anyway?')) return;
          const row = await prob.record(p, { ...run, elapsedMs: run.elapsedMs });
          const res = await award({
            kind: 'problem', guided: p.kind === 'guided',
            score: row.score, total: row.total, gap: row.predicted - row.score,
          });
          setAwardedXp(res.xp);
          setSaved(row);
          fanfare();
          update({ stage: 'done' });
          setHistory(await prob.historyFor(id));
        }}
      />
    );
  }

  // --- stage 5: done ------------------------------------------------------
  if (!saved) {
    return (
      <div className="wrap sheet" data-module={p.moduleId}>
        <h1>{p.title}</h1>
        <p className="lede" role="status">Saved. <Link to="/problems">Back to the questions.</Link></p>
      </div>
    );
  }
  return <DoneStage p={p} a={saved} xp={awardedXp} header={header} />;
}

// ---------------------------------------------------------------------------

function WriteStage({ p, run, update, persist, clockIn, elapsed, header, facts, onFinish, onPause, toast }) {
  const [ms, setMs] = useState(run.elapsedMs);
  const taRef = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    clockIn();
    const t = setInterval(() => setMs(elapsed()), 500);
    return () => clearInterval(t);
  }, [clockIn, elapsed]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.selectionStart = ta.selectionEnd = ta.value.length;
  }, []);

  const words = prob.countWords(run.text);
  const over = ms > p.minutes * 60000;
  const pct = Math.min(100, (ms / (p.minutes * 60000)) * 100);

  return (
    <div className="wrap sheet problem" data-module={p.moduleId}>
      {header(<><span className={`clock${over ? ' is-over' : ''}`}>{fmtClock(ms)}</span> of {p.minutes}′</>)}
      <div className="qbar" aria-hidden="true">
        <motion.i className={over ? 'is-over' : ''} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
      </div>
      <h1>{p.title}</h1>
      {facts}
      {/* The placeholder is not a name: it disappears the moment anything is
          typed, and it is not exposed as one. This is the only control on the
          screen, so it says what it is. */}
      <textarea
        ref={taRef}
        className="answer"
        aria-label="Your answer"
        spellCheck
        value={run.text}
        placeholder="Issue. Rule. Application. Conclusion. Write it as you would in the hall — full sentences, authorities named, no notes to yourself."
        onChange={(e) => {
          const next = update({ text: e.target.value });
          clearTimeout(debounce.current);
          debounce.current = setTimeout(() => persist(next), 600);
        }}
      />
      <div className="write-bar">
        <span className="small">
          {plural(words, 'word')}
          {words > 0 && <> · about {Math.max(1, Math.round(words / Math.max(1, ms / 60000)))} a minute</>}
        </span>
        <span className="btn-row">
          <button onClick={onPause}>Save and stop</button>
          <button className="btn-primary" onClick={() => {
            if (!run.text.trim()) return toast('Nothing written yet.');
            onFinish();
          }}>Finished — mark it</button>
        </span>
      </div>
    </div>
  );
}

function PredictStage({ p, run, total, header, onBack, onReveal, toast }) {
  const [value, setValue] = useState(run.predicted ?? '');
  const pct = value === '' ? 0 : Math.min(100, (Number(value) / total) * 100);

  return (
    <div className="wrap sheet problem" data-module={p.moduleId}>
      {header(`${prob.countWords(run.text)} words · ${fmtClock(run.elapsedMs)}`)}
      <h1>Before the rubric</h1>
      <p className="lede">
        The rubric has {plural((p.rubric || []).length, 'criterion', 'criteria')} and {total} marks.
        You have not seen it. What do you think that answer earned?
      </p>

      <motion.div className="predict-panel"
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
        <ProgressRing value={pct} size={128} stroke={9} tone="series"
          label={value === '' ? '?' : value} sub={`of ${total}`} />
        <div className="predict">
          <label id="pred-label" htmlFor="pred">Your prediction, out of {total}</label>
          {/* The slider and the number box are two ways into one value, so they
              take the one visible label rather than the slider going unnamed. */}
          <input
            type="range" id="pred-range" min="0" max={total} step="0.5"
            aria-labelledby="pred-label"
            value={value === '' ? 0 : value}
            onChange={e => setValue(e.target.value)}
            className="predict-range"
          />
          <input
            type="number" id="pred" min="0" max={total} step="0.5" inputMode="decimal"
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
          />
        </div>
      </motion.div>

      <p className="small">
        This is the only number the app records that you cannot revise once you have seen the
        answer. The gap between it and your own mark is the measurement — a consistent
        over-estimate is the error that survives a degree, because you cannot correct a gap you
        do not believe is there. Landing within one mark is worth 80 XP, and it is the hardest
        XP in the app to earn.
      </p>

      <div className="btn-row">
        <button onClick={onBack}>Back to the answer</button>
        <button className="btn-primary" onClick={() => {
          const v = Number(value);
          if (value === '' || Number.isNaN(v) || v < 0 || v > total) {
            return toast(`Give a number between 0 and ${total}.`);
          }
          onReveal(v);
        }}>Show the rubric</button>
      </div>
    </div>
  );
}

function MarkStage({ p, run, update, total, persist, header, onSave, toast, moduleTitle, lessonTitle }) {
  const rubric = [...(p.rubric || [])].sort((a, b) => prob.bandRank(a.band) - prob.bandRank(b.band));
  const score = prob.scoreOf(p, run.awarded);
  const markedCount = rubric.filter(r => run.awarded[r.id] !== undefined).length;

  const setCredit = (rid, v) => {
    persist(update({ awarded: { ...run.awarded, [rid]: v } }));
  };

  return (
    <div className="wrap sheet problem" data-module={p.moduleId}>
      {header(`predicted ${run.predicted} / ${total}`)}
      <h1>Mark your own answer</h1>
      <p className="lede">
        Be strict. A mark you award yourself for a point you nearly made is a mark you will not
        make in the hall.
      </p>

      <details className="fold">
        <summary>Your answer — {prob.countWords(run.text)} words in {fmtClock(run.elapsedMs)}</summary>
        <div className="answer-read">{run.text}</div>
      </details>

      {/* Marking yourself is the weakest part of studying alone: the gap between
          what you meant and what you wrote is invisible from the inside. This
          takes the answer off the screen and onto paper, with the question and
          an empty rubric, so somebody else can read it. */}
      <p className="btn-row">
        <button type="button" className="btn" onClick={() => window.print()}>
          Print or save as PDF — for someone else to mark
        </button>
      </p>
      <PrintSheet
        kind="problem"
        refId={p.id}
        title={p.title}
        moduleTitle={moduleTitle}
        moduleId={p.moduleId}
        lessonTitle={lessonTitle}
        level={p.kind}
        minutes={p.minutes}
        marks={total}
        brief={p.task}
        text={run.text}
        rubric={rubric}
        words={prob.countWords(run.text)}
      />

      <div className="running">
        <span className="running-n"><CountUp value={score} decimals={score % 1 ? 1 : 0} /></span>
        {' '}/ {total} awarded
        <span className="running-bar"><i style={{ width: `${(score / total) * 100}%` }} /></span>
        <span className="running-k">{markedCount}/{rubric.length} criteria marked</span>
      </div>

      <div className="rubric">
        {rubric.map((r, n) => (
          <motion.div
            className="crit" key={r.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(n * 0.04, 0.4) }}
          >
            <div className="crit-head">
              <span className={`band band-${r.band}`}>{prob.BANDS[r.band] || r.band}</span>
              <span className="crit-marks">{plural(r.marks, 'mark')}</span>
            </div>
            <p className="crit-text">{r.criterion}</p>
            {r.authority && r.authority !== '—' && <p className="crit-auth">{r.authority}</p>}
            <div className="credit">
              {prob.CREDIT.map(c => (
                <motion.button
                  key={c.key}
                  title={c.hint}
                  className={run.awarded[r.id] === c.value ? 'is-on' : ''}
                  onClick={() => setCredit(r.id, c.value)}
                  whileTap={{ scale: 0.94 }}
                >{c.label}</motion.button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <details className="fold">
        <summary>Model answer</summary>
        {(p.modelAnswer || []).map((b, i) => (
          <div key={i}>
            <h2>{b.h}</h2>
            {(b.p || []).map((t, k) => <p key={k}>{t}</p>)}
          </div>
        ))}
      </details>

      {(p.traps || []).length > 0 && (
        <details className="fold">
          <summary>Where this question is usually lost</summary>
          <ul>{p.traps.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </details>
      )}

      <div className="source-note">
        <p className="small"><strong>Sources.</strong> {p.source}</p>
        <p className="small">
          <strong>Verify before relying on this.</strong> {p.verify}{' '}
          Last checked by the author of this question on {p.lastVerified}.
        </p>
      </div>

      <div className="btn-row" style={{ marginTop: '2rem' }}>
        <button className="btn-primary btn-big" onClick={onSave}>Save this attempt</button>
        <button onClick={async () => {
          const ok = await copyText(prob.markingPacket(p, { ...run, elapsedMs: run.elapsedMs }));
          toast(ok ? 'Copied' : 'Could not reach the clipboard.');
        }}>Copy answer and rubric</button>
      </div>
      <p className="small">
        “Copy answer and rubric” puts the facts, what you wrote and the rubric on the clipboard,
        for a second opinion from a person or a model. The app does not mark anything and has
        nowhere safe to hold a key.
      </p>
    </div>
  );
}

function DoneStage({ p, a, xp, header }) {
  const gap = a.predicted - a.score;
  const pct = prob.percent(a.score, a.total);
  const guided = p.kind === 'guided';
  // A rehearsal is not marked in green or red: those colours mean a verdict on
  // an attempt, and following a correct argument is not the same event as
  // constructing one. It also earns no calibration bonus — predicting your mark
  // is easy when the steps are handed to you — so the page must not claim one.
  const calibrated = !guided && Math.abs(gap) <= 1;
  const verdict = Math.abs(gap) <= 1
    ? 'Your sense of the answer matched the rubric. That is the harder half of this exercise.'
    : gap > 0
      ? `You thought it was ${round1(gap)} ${Math.abs(gap) === 1 ? 'mark' : 'marks'} better than it was. Over-estimating is the ordinary direction, and the fix is to write the rule out in full rather than gesture at it.`
      : `You marked yourself ${round1(-gap)} ${Math.abs(gap) === 1 ? 'mark' : 'marks'} above your own prediction. Under-estimating costs less, but it makes it hard to tell a good answer from a lucky one.`;

  const missed = (p.rubric || [])
    .filter(r => (a.awarded[r.id] ?? 0) < 1)
    .sort((x, y) => prob.bandRank(x.band) - prob.bandRank(y.band));

  return (
    <div className="wrap sheet problem" data-module={p.moduleId}>
      {header('')}
      <motion.div className="result-head"
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 190, damping: 18 }}>
        <ProgressRing value={pct} size={150} stroke={10}
          tone={guided ? 'neutral' : pct >= 70 ? 'correct' : pct >= 50 ? 'neutral' : 'wrong'}
          label={`${a.score}/${a.total}`} sub={`${pct}%`} />
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>{a.score} out of {a.total}</h1>
          <p className="lede" style={{ marginBottom: '0.75rem' }}>
            {a.words} words in {plural(a.minutesSpent, 'minute')} against a {p.minutes}-minute target.
          </p>
          {guided && <RehearsalScore scored={a.score} total={a.total} />}
          <p className="result-xp">+<CountUp value={xp} /> XP{calibrated ? ' · calibration bonus' : ''}</p>
        </div>
      </motion.div>

      <StatGrid>
        <Stat n={a.predicted} k="you predicted" />
        <Stat n={a.score} k="you awarded" delay={0.06} />
        <Stat n={`${gap > 0 ? '+' : ''}${round1(gap)}`} k="calibration gap"
          tone={Math.abs(gap) <= 1 ? 'sage' : 'oxide'} delay={0.12} />
      </StatGrid>

      {/* One attempt's gap says little; the trend across attempts is the thing a
          learner studying alone has no other way to see.

          Not on a rehearsal. Predicting your own mark is easy when the steps
          are pre-ordered and half the reasoning is handed over, which is the
          same reason game.js keeps guided problems out of the `calibrated`
          seal. A trend sentence under a rehearsal would be the reward system
          asserting something about self-assessment that the task did not
          test. */}
      {!guided && <CalibrationLine />}

      <p>{verdict}</p>

      {missed.length > 0 ? (
        <>
          <h2>What to take away</h2>
          <div className="arrangement">
            {missed.map((r, i) => (
              <ArrRow
                key={r.id}
                index={i}
                num={(a.awarded[r.id] ?? 0) === 0.5 ? 'half' : '0'}
                title={prob.BANDS[r.band] || r.band}
                meta={r.criterion}
                state={null}
              />
            ))}
          </div>
        </>
      ) : <p>Full marks on every criterion. Attempt it again cold in a month.</p>}

      <div className="btn-row" style={{ marginTop: '2rem' }}>
        <Link className="btn btn-primary" to="/problems">Other questions</Link>
        <Link className="btn" to="/progress">Progress</Link>
      </div>
    </div>
  );
}
