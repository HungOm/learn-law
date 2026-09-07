import { Link } from 'react-router-dom';
import { useStudy } from '../state/StudyContext.jsx';
import * as lessonsLib from '../lib/lessons.js';
import { ArrRow, Notice, TodayCard } from '../components/Bits.jsx';
import { daysAgo, plural } from '../lib/format.js';

export function LessonRow({ l, readAt, index }) {
  const links = [
    (l.plants || []).length ? plural(l.plants.length, 'card') : '',
    (l.prepares || []).length ? plural(l.prepares.length, 'problem') : '',
    (l.quiz || []).length ? `${l.quiz.length}Q quiz` : '',
  ].filter(Boolean).join(' · ');
  return (
    <ArrRow
      index={index}
      to={`/lesson/${l.id}`}
      num={`${l.minutes}′`}
      title={l.title}
      meta={`${l.summary}${links ? ` — ${links}` : ''}`}
      state={readAt
        ? <span className="arr-state is-clear">read {daysAgo(readAt)}</span>
        : <span className="arr-state">unread</span>}
    />
  );
}

export default function LessonIndex() {
  const { cat, read } = useStudy();
  const next = lessonsLib.nextUnread(cat.lessons, read);
  const byModule = cat.modules.map(m => ({ m, list: m.lessons })).filter(g => g.list.length);
  const doneCount = cat.lessons.filter(l => read[l.id]).length;
  const pct = Math.round((doneCount / cat.lessons.length) * 100);

  return (
    <div className="wrap">
      <h2>Lessons</h2>
      <p className="lede">
        {cat.lessons.length} lessons, about {lessonsLib.totalMinutes(cat.lessons)} minutes of reading.
        You have marked {doneCount} as read.
      </p>

      <div className="bigbar">
        <i style={{ width: `${pct}%` }} />
        <span>{pct}%</span>
      </div>

      {next ? (
        <TodayCard tone="oxide">
          <p><strong>Next:</strong> {next.title} — {plural(next.minutes, 'minute')}.</p>
          <p className="small">{next.summary}</p>
          <div className="btn-row">
            <Link className="btn btn-primary" to={`/lesson/${next.id}`}>Read it</Link>
            {(next.quiz || []).length > 0 && (
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

      {byModule.map(({ m, list }) => (
        <div key={m.id}>
          <h3>{m.title}</h3>
          <div className="arrangement">
            {list.map((l, i) => <LessonRow key={l.id} l={l} readAt={read[l.id]} index={i} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
