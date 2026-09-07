import { useStudy } from '../state/StudyContext.jsx';
import { Notice } from '../components/Bits.jsx';

export function BookRow({ b }) {
  const flags = [
    b.verified !== 'confirmed' ? ['flag-unverified', 'verify edition'] : null,
    b.staleness === 'high' ? ['flag-stale', 'badly dated'] : null,
    b.staleness === 'medium' ? ['flag-stale', 'dated'] : null,
    b.studentEdition ? ['flag-student', 'student edition'] : null,
  ].filter(Boolean);
  const bits = [b.author, b.edition ? `${b.edition} ed.` : null, b.publisher, b.year]
    .filter(Boolean).join(' · ');
  return (
    <div className="book">
      <div className="book-title">
        {b.title}
        {flags.map(([cls, label]) => <span key={cls + label} className={`flag ${cls}`}>{label}</span>)}
      </div>
      <p className="book-byline">{bits}</p>
      <p className="book-note">{b.notes || ''}</p>
    </div>
  );
}

export function StatuteRow({ s }) {
  return (
    <div className="book">
      <div className="book-title">{s.title}{s.citation ? <span className="small"> {s.citation}</span> : null}</div>
      <p className="book-byline">{s.source}</p>
      {s.notes && <p className="book-note">{s.notes}</p>}
    </div>
  );
}

export default function Books() {
  const { cat } = useStudy();
  const confirmed = cat.books.filter(b => b.verified === 'confirmed');
  const unconfirmed = cat.books.filter(b => b.verified !== 'confirmed');

  return (
    <div className="wrap">
      <h2>Reading</h2>
      <p className="lede">
        Editions matter more in law than in any other subject. Everything below carries its
        verification status.
      </p>

      <Notice>
        Free sources have no citator. You cannot confirm from the AGC portal or CommonLII alone
        that a case is still good law — that needs CLJ, LexisNexis CaseBase, or Westlaw Citator.
      </Notice>

      <h3>Edition confirmed</h3>
      {confirmed.map(b => <BookRow key={b.id} b={b} />)}

      <h3>Edition not verified — check before buying</h3>
      {unconfirmed.map(b => <BookRow key={b.id} b={b} />)}

      <h3>Statutes — free</h3>
      {cat.statutes.map(s => <StatuteRow key={s.id} s={s} />)}

      <h3>Where to buy</h3>
      {cat.vendors.map(v => (
        <div className="book" key={v.name}>
          <div className="book-title">
            {v.name}{v.cost === 'free' ? <span className="flag flag-free">free</span> : null}
          </div>
          <p className="book-byline">{v.url}</p>
          <p className="book-note">{v.notes || ''}</p>
        </div>
      ))}
    </div>
  );
}
