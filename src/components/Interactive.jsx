import { useState } from 'react';
import { Prose } from './Term.jsx';

/**
 * The two blocks that ask the reader to do something mid-lesson.
 *
 * Everything else in a lesson is exposition: the reader receives it. These two
 * interrupt that, and they do it for different reasons.
 *
 * `predict` asks for an answer BEFORE the rule is given. Attempting something
 * and getting it wrong, then being told, produces better retention than being
 * told first — the attempt is what makes the explanation land. So a wrong
 * prediction is not a failure state and is never dressed as one: there is no
 * score, no tally, and no verdict colour anywhere in the block. The reveal sets
 * the reader's attempt and the rule side by side and leaves them to be
 * compared, which is the whole point of having asked first.
 *
 * `checkpoint` is retrieval practice placed inside the reading rather than
 * after it. Every other question on this site sits at the end of a lesson, by
 * which point the material has been read once, straight through. Retrieval
 * spread through the material is worth more than the same questions massed at
 * the end, and it tells a reader who has drifted that they have drifted while
 * there is still lesson left to re-read. It has a right answer and says so —
 * unambiguous feedback is the active ingredient — but it says so in words, and
 * its result borrows the rehearsal treatment rather than the verdict colours,
 * because it is practice inside the reading and not an assessment of it.
 *
 * Presentation lives in base.css (.predictblock / .checkpointblock, written by
 * the design system) and interactive.css (the option buttons).
 */

/** Commit first, then read on. */
export function Predict({ prompt, options, answer, reveal, seen }) {
  const [picked, setPicked] = useState(null);
  const [shown, setShown] = useState(false);
  const open = shown || picked !== null;
  const hasOptions = Array.isArray(options) && options.length > 0;

  return (
    <div className="predictblock">
      <span className="xlabel">Before you read on</span>
      <p className="predict-prompt"><Prose text={prompt} seen={seen} /></p>

      {hasOptions && (
        <ul className="opt-list">
          {options.map((o, i) => (
            <li key={i}>
              <button
                type="button"
                className="opt"
                // The reader's own pick is marked as theirs, never as wrong.
                data-state={open && i === picked ? 'yours' : undefined}
                aria-pressed={picked === i}
                disabled={open}
                onClick={() => setPicked(i)}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!hasOptions && !open && (
        <button type="button" className="opt opt-wide" onClick={() => setShown(true)}>
          I have an answer in mind — show me
        </button>
      )}

      {/* The live region is always in the DOM and empty until the reveal.
          Inserting a region at the same moment its content appears is
          unreliable — some screen readers only watch regions that already
          existed — and a reader who commits to an answer and is told nothing
          has done the hard half of a prediction and been denied the half that
          teaches. `polite` because they asked for this by answering, so it
          must not interrupt them mid-sentence.

          The styling stays on the inner `.predict-reveal`, so the empty outer
          container collapses to nothing rather than showing a stray rule. */}
      <div role="status" aria-live="polite">
        {open && (
          <div className="predict-reveal">
            {hasOptions && picked !== null && (
              <p className="predict-yours">You said: {options[picked]}</p>
            )}
            <Prose as="p" text={reveal} seen={seen} />
          </div>
        )}
      </div>
    </div>
  );
}

/** One retrieval question, in the middle of the reading. */
export function Checkpoint({ q, options = [], answer, why, seen }) {
  const [picked, setPicked] = useState(null);
  const done = picked !== null;
  const right = picked === answer;

  return (
    <div className="checkpointblock">
      <span className="xlabel">Check yourself</span>
      <p className="predict-prompt"><Prose text={q} seen={seen} /></p>

      <ul className="opt-list">
        {options.map((o, i) => {
          // Marked, not coloured: the answer is named in words below, and the
          // marker only says which one the rule takes and which the reader took.
          const state = !done ? undefined
            : i === answer ? 'answer'
            : i === picked ? 'yours' : undefined;
          return (
            <li key={i}>
              <button
                type="button"
                className="opt"
                data-state={state}
                disabled={done}
                onClick={() => setPicked(i)}
              >
                {o}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Same always-present live region. This one matters twice over: the
          worded verdict exists precisely so correctness is unambiguous, and
          unannounced it was unreadable to the readers who most need it said
          in words. */}
      <div role="status" aria-live="polite">
        {done && (
          <div className="predict-reveal">
            <p className="predict-yours">{right ? 'Yes — that is the one.' : 'Not that one.'}</p>
            <Prose as="p" text={why} seen={seen} />
          </div>
        )}
      </div>
    </div>
  );
}
