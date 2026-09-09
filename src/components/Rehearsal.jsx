/**
 * A guided problem, framed as what it is.
 *
 * A rehearsal is a demonstration the learner takes part in, not an attempt they
 * are judged on. Someone who scores well on one has shown they can follow a
 * correct argument — a different thing from constructing one — and a learner
 * studying alone has nothing to correct that impression against. So the frame
 * is subordinate by construction: sunk rather than raised, dashed rather than
 * ruled, and it names itself. See DESIGN.md §2.8; the CSS carries the rest of
 * the reasoning.
 *
 * None of it is a colour. A rehearsal must not look like a verdict, and it must
 * not look like something earned.
 */
export function Rehearsal({ label = 'Rehearsal', children }) {
  return (
    <div className="rehearsal">
      <span className="rehearsal-label">{label}</span>
      {children}
    </div>
  );
}

/**
 * The steps, pre-ordered. `yoursFrom` is the index at which the learner takes
 * over: everything before it is the demonstration and is set as annotation,
 * everything from it is theirs and is set in body ink. That is the whole
 * "watch how this is done, and do the last part yourself" made literal.
 */
export function RehearsalSteps({ steps = [], yoursFrom = steps.length - 1 }) {
  return (
    <ol className="rehearsal-steps">
      {steps.map((s, i) => (
        <li key={i} className={i >= yoursFrom ? 'is-yours' : undefined}>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A rehearsal result reports; it does not congratulate. No signal colour, no
 * emphasis — scoring 8/8 here is not the same kind of event as scoring 8/8 on
 * the open problem this sits beneath, and the page must not imply that it is.
 */
export function RehearsalScore({ scored, total }) {
  return (
    <p className="rehearsal-score">
      {scored} of {total} — practice, not a graded attempt.
    </p>
  );
}

export default Rehearsal;
