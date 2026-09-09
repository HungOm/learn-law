import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudy } from '../state/StudyContext.jsx';
import * as lessonsLib from '../lib/lessons.js';
import * as prog from '../lib/progression.js';
import * as sections_ from '../lib/sections.js';
import { ArrRow, Notice, TodayCard } from '../components/Bits.jsx';
import { daysAgo, plural } from '../lib/format.js';

/**
 * `secRead` is the section-level read map. It arrives from IndexedDB a moment
 * after the list paints, so every caller may legitimately pass nothing: with no
 * map the row falls back to exactly what it said before, rather than flashing
 * "0 of 7" at a reader who is halfway through.
 */
export function LessonRow({ l, readAt, index, gate, done, secRead = {} }) {
  const p = sections_.progressOf(l, secRead);
  const started = p.total > 0 && p.done > 0 && p.done < p.total;
  const links = [
    // The section count is the microlearning affordance: it says the lesson
    // breaks into pieces, which is what a reader with seven minutes needs to
    // know before opening it. Read time stays off this line — `l.minutes` is
    // already in the number column and two different minute figures on one
    // row invite the reader to work out which one is the lie.
    p.total ? `${p.total} sections` : '',
    (l.plants || []).length ? plural(l.plants.length, 'card') : '',
    (l.prepares || []).length ? plural(l.prepares.length, 'problem') : '',
    l.quizCount ? `${l.quizCount}Q quiz` : '',
  ].filter(Boolean).join(' · ');
  const locked = gate && !gate.open;
  return (
    <ArrRow
      index={index}
      moduleId={l.moduleId}
      to={`/lesson/${l.id}`}
      num={locked ? <span className="row-lock" aria-label="locked">🔒</span> : `${l.minutes}′`}
      title={l.title}
      locked={locked}
      meta={locked
        ? 'Locked — finish the lesson before this one to open it.'
        : started
          ? `${p.done} of ${p.total} sections read · ${plural(p.minutesLeft, 'minute')} left — next up, ${p.next.h}.`
          : `${l.summary}${links ? ` — ${links}` : ''}`}
      state={readAt
        ? <span className="arr-state is-clear">read {daysAgo(readAt)}</span>
        : started
          // Part-read is its own state. Calling it "unread" is a claim about a
          // reader who has done some of the work, and the denominator is on
          // screen so the figure cannot be read as a score.
          ? <span className="arr-state">{p.done}/{p.total}</span>
          : <span className="arr-state">unread</span>}
    />
  );
}

export default function LessonIndex() {
  const { cat, read, best, unlock } = useStudy();
  const [secRead, setSecRead] = useState({});
  useEffect(() => {
    let live = true;
    sections_.readMap().then(m => { if (live) setSecRead(m); });
    return () => { live = false; };
  }, []);
  const resume = sections_.resumePoint(cat.lessons, secRead);
  const next = lessonsLib.nextUnread(cat.lessons, read);
  const byModule = cat.modules.map(m => ({ m, list: m.lessons })).filter(g => g.list.length);
  const doneCount = cat.lessons.filter(l => read[l.id]).length;
  const pct = Math.round((doneCount / cat.lessons.length) * 100);

  return (
    <div className="wrap wrap--dash">
      <h1>Lessons</h1>
      <p className="lede">
        {cat.lessons.length} lessons, about {lessonsLib.totalMinutes(cat.lessons)} minutes of reading.
        You have marked {doneCount} as read.
      </p>

      <div className="bigbar">
        <i style={{ width: `${pct}%` }} />
        <span>{pct}%</span>
      </div>

      {/* Where you stopped beats what is next: a reader who left a lesson half
          done has already chosen it, and sending them to a different one makes
          that choice again on their behalf. This is the one place a section's
          `keypoint` is worth its line — it is what the next three minutes buy,
          which is the question the card exists to answer. */}
      {resume ? (
        <TodayCard tone="oxide">
          <p>
            <strong>Where you stopped:</strong> {resume.lesson.title} — {resume.done} of{' '}
            {resume.total} sections done, {plural(resume.minutesLeft, 'minute')} left.
          </p>
          <p className="small">Next up, {resume.next.h} — {resume.next.keypoint}</p>
          <div className="btn-row">
            <Link className="btn btn-primary" to={`/lesson/${resume.lesson.id}`}>Pick it up</Link>
          </div>
        </TodayCard>
      ) : next ? (
        <TodayCard tone="oxide">
          <p><strong>Next:</strong> {next.title} — {plural(next.minutes, 'minute')}.</p>
          <p className="small">{next.summary}</p>
          <div className="btn-row">
            <Link className="btn btn-primary" to={`/lesson/${next.id}`}>Read it</Link>
            {next.quizCount > 0 && (
              <Link className="btn" to={`/quiz/${next.id}`}>Skip to its quiz</Link>
            )}
          </div>
        </TodayCard>
      ) : (
        <TodayCard>
          <p>
            Every lesson is marked read. The work is now in the cards, the quizzes and the
            problem questions — and in the textbooks, which is where the depth is.
          </p>
          <div className="btn-row"><Link className="btn btn-primary" to="/arena">Arena</Link></div>
        </TodayCard>
      )}

      <Notice>
        A lesson states rules. It does not vouch for them: each one names its sources and
        carries a line saying what must be checked against a current text. Treat it as an
        orientation to the reading, not a replacement for it.
      </Notice>

      {/* The group carries the module id as well as the rows, so the heading
          that names the module can be painted in the same colour as the rows
          under it. The name is always on screen with the colour. */}
      {byModule.map(({ m, list }) => (
        <div className="arr-group" data-module={m.id} key={m.id}>
          <h2>{m.title}</h2>
          <div className="arrangement">
            {list.map((l, i) => <LessonRow key={l.id} l={l} readAt={read[l.id]} index={i}
              gate={unlock[l.id]} done={prog.isComplete(l, read, best)} secRead={secRead} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
