import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStudy } from '../state/StudyContext.jsx';
import * as writing from '../lib/writing.js';
import { Notice } from '../components/Bits.jsx';
import { plural } from '../lib/format.js';
import PrintSheet from '../components/PrintSheet.jsx';
import NotFound from './NotFound.jsx';
import { focusOn, setFocus } from '../lib/focus.js';
import { useDialog } from '../components/Overlays.jsx';

/**
 * One writing exercise: brief, steps, a place to draft, and — only after the
 * reader has actually drafted — the shape a good answer has and a rubric to
 * mark their own against.
 *
 * The reveal order is the point of the whole tier. Everything that would let a
 * reader produce an answer without composing one is behind a commitment: forty
 * words of their own first. That threshold is low on purpose. It is not a test
 * of effort, it is a lock against reading the answer and believing you would
 * have written it, which is the single most common way self-study goes wrong.
 */
export default function WritingView() {
  const { id } = useParams();
  const { cat, read } = useStudy();
  const w = writing.byId(id);

  const [stepPref, setStepPref] = useState(focusOn);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(null);
  // `useDialog` is a hook, so all of this sits above the early returns for a
  // missing or locked exercise.
  const stepping = stepPref;
  const readerRef = useDialog(stepping, () => { setStepPref(false); setFocus(false); });
  const closeReader = () => { setStepPref(false); setFocus(false); };
  const toReaderTop = () => readerRef.current?.querySelector('.focusview-body')?.scrollTo({ top: 0 });
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    let live = true;
    if (w) writing.getDraft(w.id).then(d => { if (live) setDraft(d); });
    return () => { live = false; };
  }, [w]);

  // Autosave, debounced. A reader who closes the tab mid-sentence should not
  // lose the paragraph; a reader who types should not hit IndexedDB per key.
  const onType = useCallback((text) => {
    setDraft(d => ({ ...d, text }));
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await writing.saveDraft(id, { text });
      setSaved('Saved to this device.');
      setTimeout(() => setSaved(''), 2000);
    }, 700);
  }, [id]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!w) return <NotFound />;

  const lesson = cat.lessons.find(l => l.id === w.lessonId);
  const open = writing.isOpen(w, read);

  if (!open) {
    return (
      <div className="wrap sheet" data-module={w.moduleId}>
        <p className="small taplink-row"><Link className="taplink" to="/writing">← Writing</Link></p>
        <h1>{w.title}</h1>
        <p className="lede">{w.kind.replace('-', ' ')} · {w.minutes} minutes</p>
        <Notice>
          <strong>Not open yet.</strong> This one opens once you have read{' '}
          {lesson ? <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link> : 'its lesson'}.
          You cannot argue about a rule you have not met, and an exercise attempted too early
          teaches you that you cannot write rather than that you are early.
        </Notice>
      </div>
    );
  }

  const n = writing.words(draft?.text);
  const drafted = writing.isDrafted(draft);

  // Focus mode over a writing exercise is not pagination of equal sections —
  // the stages are different in kind, and their ORDER is the pedagogy. The
  // brief before the scaffold, the scaffold before the blank box, and
  // everything that would let a reader produce an answer without composing one
  // behind forty words of their own. Stepping states that order instead of
  // leaving it to a reader's scroll discipline, which is the whole argument for
  // the mode.
  //
  // The reveal is ONE step rather than four. Its four headings are a single
  // stage that unlocks together, and splitting them would put three Next
  // presses between a reader and the rubric they just earned.
  const STAGES = [
    [0, 'The brief'],
    [1, 'Before you start'],
    [2, 'How to build it'],
    [3, 'Your draft'],
    [4, 'The shape, the model and the rubric'],
    [5, 'Sources'],
  ];
  const visible = STAGES.filter(([k]) => k !== 4 || drafted);
  // No width condition, deliberately, and the same decision as the lesson —
  // the argument is written out at LessonView.jsx above the stage state, and
  // the short version is that stepping is about ATTENTION, not wayfinding, so
  // a large screen is not a reason to hand the reader the whole wall. A
  // width-free stepper on a 1920px monitor reads like an oversight if you meet
  // it without that; it is not one. Both views share `focusOn` so the reader
  // sets this once.
  const idx = Math.min(step, visible.length - 1);
  const on = k => !stepping || visible[idx][0] === k;

  // The stages, rendered identically whether they are inline on the page or
  // alone inside the reader — one definition so the two cannot drift.
  const stagesNode = (
    <>
      {on(0) && (<>
      <h2>The brief</h2>
      <p>{w.brief}</p>
      <p className="small"><strong>Who you are writing for.</strong> {w.audience}</p>

      {/* On the brief, not further in: this is where a reader decides whether
          to do the exercise on paper, and the old placement put the only print
          button behind forty words typed on the screen they wanted to leave. */}
      <p className="btn-row">
        <button type="button" className="btn" onClick={() => window.print()}>
          {drafted
            ? 'Print or save as PDF — your draft, for someone else to mark'
            : 'Print or save as PDF — blank, to write by hand'}
        </button>
      </p>

      </>)}

      {on(1) && (<>
      <h2>Before you start</h2>
      <div className="arrangement">
        {w.before.map((b, i) => (
          <div className="arr-row is-static" key={i}>
            <span className="arr-num">{i + 1}</span>
            <span><span className="arr-title">{b}</span></span>
          </div>
        ))}
      </div>


      </>)}

      {on(2) && (<>
      <h2>How to build it</h2>
      <div className="arrangement">
        {w.scaffold.map((s, i) => (
          <div className="arr-row is-static" key={i}>
            <span className="arr-num">{i + 1}</span>
            <span>
              <span className="arr-title">{s.step}</span>
              <span className="arr-meta">{s.prompt}</span>
              <span className="arr-meta"><em>Why:</em> {s.why}</span>
            </span>
          </div>
        ))}
      </div>

      </>)}

      {/* One sheet, two shapes, mounted once and outside the step gating —
          two mounted sheets would both print.

          Before there is a draft it is a WORKSHEET: brief, the steps, and
          ruled lines to write on. That is the case this readership actually
          has — a phone, prepaid data, and a preference for paper — and the old
          version served it not at all, because the print button only appeared
          after forty words had already been typed on the screen the reader was
          trying to get away from.

          The rubric is deliberately absent from the worksheet. It is behind
          the same forty-word gate as the model on screen, and printing it
          early would hand over the answer's shape before a word is written,
          which is the one thing this tier exists to prevent. */}
      <PrintSheet
        kind="writing"
        refId={w.id}
        title={w.title}
        moduleTitle={cat.modules.find(m => m.id === w.moduleId)?.title || w.moduleId}
        moduleId={w.moduleId}
        lessonTitle={lesson?.title}
        level={w.level}
        minutes={w.minutes}
        brief={w.brief}
        text={drafted ? (draft?.text || '') : ''}
        steps={drafted ? [] : w.scaffold}
        blankLines={drafted ? 0 : 26}
        rubric={drafted ? w.rubric : []}
        selfMark={draft?.band}
        words={n}
      />

      {on(3) && (<>

      <h2>Your draft</h2>
      <p className="small">
        This stays on your device. Nothing is uploaded — there is nowhere to upload it to.
      </p>
      <label className="xlabel" htmlFor="draft">Your answer</label>
      <textarea
        id="draft"
        className="answer"
        rows={14}
        value={draft?.text || ''}
        onChange={e => onType(e.target.value)}
        placeholder="Write here. The shape and the rubric unlock once you have forty words of your own."
      />
      <p className="small" role="status" aria-live="polite">
        {plural(n, 'word')}. {saved}
        {!drafted && n > 0 && ` ${40 - n} more before the rubric opens.`}
      </p>

      {!drafted && (
        <Notice>
          <strong>The shape, the model and the rubric are behind your draft.</strong> Forty
          words of your own opens them. Reading them first would give you someone else's
          answer to reproduce, and you would learn nothing about your own writing — which is
          the only thing this exercise can teach you.
        </Notice>
      )}
      </>)}

      {on(4) && drafted && (
        <>
          <h2>The shape a good answer has</h2>
          <div className="arrangement">
            {w.structure.map((s, i) => (
              <div className="arr-row is-static" key={i}>
                <span className="arr-num">{i + 1}</span>
                <span>
                  <span className="arr-title">{s.part} — <em>{s.length}</em></span>
                  <span className="arr-meta">{s.does}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Marking your own writing is the weakest part of studying alone —
              the gap between what you meant and what you wrote is invisible
              from the inside. This puts the draft on paper with the brief and
              an empty rubric, so somebody else can read it. */}
          <p className="btn-row">
            <button type="button" className="btn" onClick={() => window.print()}>
              Print or save as PDF — for someone else to mark
            </button>
          </p>

          <h2>Mark your own draft</h2>
          <p className="small">
            Read your draft against each band, hardest first. Pick the highest one that is
            honestly true of what you wrote.
          </p>
          <div className="rubric">
            {w.rubric.map((r, i) => (
              <div className="arr-row is-static" key={i}>
                <span className="band">{r.band}</span>
                <span>
                  <span className="arr-meta">{r.test}</span>
                  <span>
                    <button
                      type="button"
                      className={draft?.band === r.band ? 'btn-primary' : 'btn'}
                      aria-pressed={draft?.band === r.band}
                      onClick={async () => {
                        const next = await writing.saveDraft(id, { band: r.band });
                        setDraft(next);
                      }}
                    >
                      {draft?.band === r.band ? `Marked: ${r.band}` : `This is my draft`}
                    </button>
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="checkpointblock">
            <span className="xlabel">One thing to do differently</span>
            <p className="predict-prompt">
              Before you read what a good answer does, write the single change you would make.
              A specific fault, not a mood.
            </p>
            <label className="xlabel" htmlFor="selfnote">Your note</label>
            <textarea
              id="selfnote"
              className="answer"
              rows={3}
              value={draft?.note || ''}
              onChange={async e => {
                const note = e.target.value;
                setDraft(d => ({ ...d, note }));
                clearTimeout(timer.current);
                timer.current = setTimeout(() => writing.saveDraft(id, { note }), 700);
              }}
            />
          </div>

          <h2>What a good answer does</h2>
          {revealed ? (
            <div className="predict-reveal" role="status">
              <p>{w.model}</p>
            </div>
          ) : (
            <p>
              <button type="button" className="btn" onClick={() => setRevealed(true)}>
                Show what a good answer does
              </button>
            </p>
          )}

          <h2>How this usually goes wrong</h2>
          <div className="arrangement">
            {w.faults.map((f, i) => (
              <div className="arr-row is-static" key={i}>
                <span className="arr-num">{i + 1}</span>
                <span><span className="arr-title">{f}</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      {on(5) && (<>
      <h2>Sources</h2>
      <p className="small">{w.source}</p>
      <p className="small"><strong>Check your own work.</strong> {w.verify}</p>
      <p className="small">Last verified {w.lastVerified}.</p>
      </>)}
    </>
  );

  return (
    <>
    <div className="wrap sheet" data-module={w.moduleId}
      style={stepping ? { display: 'none' } : undefined}>
      <p className="small taplink-row"><Link className="taplink" to="/writing">← Writing</Link></p>

      <h1>{w.title}</h1>
      <p className="lede">
        {w.kind.replace('-', ' ')} · {w.minutes} minutes
        {lesson && <> · from <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link></>}
      </p>

      {!stepping && stagesNode}


      <p className="stepper-mode">
        <button
          type="button"
          className="stepper-mode-btn"
          aria-pressed={stepping}
          onClick={() => { const next = !stepPref; setStepPref(next); setFocus(next); }}
        >
          {stepping ? 'Read straight through instead' : 'Read one stage at a time'}
        </button>
      </p>
    </div>

      {stepping && (
        <div className="focusview" ref={readerRef} tabIndex={-1} role="dialog" aria-modal="true"
          aria-label={`${w.title} — ${visible[idx][1]}, ${idx + 1} of ${visible.length}`}>
          <div className="focusview-surface">
            <div className="focusview-top">
              <p className="focusview-where">
                {/* The exercise title rides in the bar because a stage heading
                    alone does not say WHICH exercise you are in, and the page
                    that would have told you is not on screen. */}
                <span className="stepper-count">
                  {w.title} · {visible[idx][1]} · {idx + 1} of {visible.length}
                </span>
                <span className="stepper-bar" aria-hidden="true">
                  <i style={{ width: `${((idx + 1) / Math.max(1, visible.length)) * 100}%` }} />
                </span>
              </p>
              <button type="button" className="focusview-close" onClick={closeReader}>
                Close ✕
              </button>
            </div>

            <div className="focusview-body">
              <div className="focusview-col">
                {stagesNode}
              </div>
            </div>

            <div className="focusview-foot">
              <button
                type="button"
                className="stepper-btn"
                disabled={idx === 0}
                onClick={() => { setStep(i => Math.max(0, i - 1)); toReaderTop(); }}
              >← Back</button>
              <button
                type="button"
                className="stepper-btn stepper-btn--next"
                disabled={idx >= visible.length - 1}
                onClick={() => { setStep(i => Math.min(visible.length - 1, i + 1)); toReaderTop(); }}
              >Next →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
