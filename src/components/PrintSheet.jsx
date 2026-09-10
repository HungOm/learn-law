import { createPortal } from 'react-dom';
import '../styles/print.css';

/**
 * A printable sheet of the reader's own written work, for someone else to mark.
 *
 * This is the answer to the one gap no amount of content closes. Measured
 * against a law degree, this course's weakest point is not coverage — it is that
 * nobody ever reads what the learner wrote. A rubric you apply to yourself is
 * useful and is not the same thing: the whole difficulty of legal writing is
 * that the gap between what you meant and what you wrote is invisible from the
 * inside. So the work leaves the app on paper, with everything a reader needs to
 * judge it and nothing they have to take on trust.
 *
 * Two pages, deliberately:
 *
 *   1. What was asked, who wrote it, which lesson it belongs to, and the writing
 *      itself. A marker who does not know the question cannot mark the answer,
 *      so the brief is printed with the draft rather than left in the app.
 *   2. The rubric, laid out as something to write on — a band per row, a box to
 *      tick, and ruled space for the comment that actually teaches. It starts on
 *      its own page so the reader forms a view of the writing before they see
 *      the bands, which is the same order the app makes the writer work in.
 *
 * The sheet carries no heading ELEMENTS. It is aria-hidden and exists only to
 * be printed, but it lives in the document all the same, and a second <h1>
 * sitting invisibly in the DOM is still a second <h1> — smoke caught exactly
 * that. Its headings are styled paragraphs; paper has no accessibility tree to
 * care, and the screen keeps one h1 per route.
 *
 * There is no PDF library here. `window.print()` reaches every browser's "Save
 * as PDF", and on a phone it is in the share sheet — which matters for an
 * audience on prepaid data who should not download a rendering library to
 * produce a document the browser already makes. It also keeps the text
 * selectable and the file small.
 */
export default function PrintSheet({
  kind = 'writing',
  refId,
  title,
  moduleTitle,
  moduleId,
  lessonTitle,
  level,
  minutes,
  marks,
  brief,
  text = '',
  rubric = [],
  selfMark,
  words,
}) {
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const paragraphs = String(text).split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const isProblem = kind === 'problem';

  return createPortal(
    <div className="printsheet" aria-hidden="true">
      <section className="ps-work">
        <p className="ps-eyebrow">
          Malaysian law · self-study — {isProblem ? 'problem question' : 'writing exercise'}
        </p>
        <p className="ps-title">{title}</p>

        {/* Everything needed to place this page: which module, which lesson, and
            the exercise's own id, so a reader holding two sheets from the same
            module can tell them apart, and so anyone can find the source. */}
        <dl className="ps-ident">
          <div><dt>Module</dt><dd>{moduleTitle}{moduleId ? ` (${moduleId})` : ''}</dd></div>
          {lessonTitle && <div><dt>Lesson</dt><dd>{lessonTitle}</dd></div>}
          <div><dt>Reference</dt><dd>{refId}</dd></div>
          {level && <div><dt>Level</dt><dd>{level}</dd></div>}
          {minutes ? <div><dt>Time allowed</dt><dd>{minutes} minutes</dd></div> : null}
          {isProblem && marks ? <div><dt>Marks</dt><dd>{marks}</dd></div> : null}
          {words ? <div><dt>Length written</dt><dd>{words} words</dd></div> : null}
          <div><dt>Printed</dt><dd>{today}</dd></div>
        </dl>

        {/* Written on, not filled in: the app never asks for a name, and it is
            not going to start in order to print one. */}
        <div className="ps-byline">
          <span className="ps-rule"><span className="ps-rule-label">Written by</span></span>
          <span className="ps-rule"><span className="ps-rule-label">Date written</span></span>
        </div>

        {brief && (
          <div className="ps-brief">
            <p className="ps-h">What was asked</p>
            <p>{brief}</p>
          </div>
        )}

        <div className="ps-answer">
          <p className="ps-h">The answer as written</p>
          {paragraphs.length
            ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
            : <p className="ps-empty">Nothing was written.</p>}
        </div>
      </section>

      <section className="ps-feedback">
        <p className="ps-eyebrow">For the reader</p>
        <p className="ps-title">Marking {title}</p>
        <p className="ps-note">
          Read the answer once through before looking at the bands below. Mark the highest band
          that is honestly true of what is written, then say in your own words the one change
          that would most improve it. One specific change is worth more than a list.
        </p>

        <table className="ps-rubric">
          <thead>
            <tr>
              <th scope="col" className="ps-tick">✓</th>
              <th scope="col">{isProblem ? 'Criterion' : 'Band'}</th>
              <th scope="col">What it looks for</th>
              {isProblem && <th scope="col" className="ps-marks">Marks</th>}
            </tr>
          </thead>
          <tbody>
            {rubric.map((r, i) => (
              <tr key={r.id ?? i}>
                <td className="ps-tick"><span className="ps-box" /></td>
                <td className="ps-band">
                  {r.band}
                  {selfMark && r.band === selfMark && <span className="ps-self"> — writer’s own mark</span>}
                </td>
                <td>{r.test || r.criterion}</td>
                {isProblem && <td className="ps-marks">{r.marks ? `/ ${r.marks}` : ''}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ps-comments">
          <p className="ps-h">The one change that would most improve it</p>
          <span className="ps-line" /><span className="ps-line" /><span className="ps-line" />
          <p className="ps-h">What is already working, and should not be lost</p>
          <span className="ps-line" /><span className="ps-line" />
          <p className="ps-h">Read by</p>
          <span className="ps-line" />
        </div>

        <p className="ps-foot">
          Marks and bands here describe one piece of writing on one day. They are not a
          qualification and this sheet is not a transcript.
        </p>
      </section>
    </div>,
    document.body,
  );
}
