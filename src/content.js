// Content lives as JSON in /content and is read-only at runtime. Git is the
// versioning system: every rule change is a commit with a date.

const DECKS = [
  'content/cards/foundations.json',
];

// Problem questions: the reasoning layer. Registered the same way as decks, and
// kept in separate files because they are edited in different sittings from the
// cards — a card is five minutes' work, a problem question is an afternoon.
const PROBLEM_SETS = [
  'content/problems/method.json',
  'content/problems/substantive.json',
];

let _catalogue = null;

export async function load() {
  if (_catalogue) return _catalogue;

  const [books, decks, sets] = await Promise.all([
    fetchJSON('content/books.json'),
    Promise.all(DECKS.map(fetchJSON)),
    Promise.all(PROBLEM_SETS.map(fetchJSON)),
  ]);

  const cards = decks.flatMap(d => d.cards || []);
  const problems = sets.flatMap(s => s.problems || []);
  const byId = {
    book: index(books.books),
    statute: index(books.statutes),
    module: index(books.modules),
    card: index(cards),
    problem: index(problems),
  };

  const modules = books.modules.map(m => ({
    ...m,
    cardCount: cards.filter(c => c.moduleId === m.id).length,
    problems: problems.filter(p => p.moduleId === m.id),
    books: [...m.primary, ...m.reference].map(id => byId.book[id]).filter(Boolean),
    statuteRefs: m.statutes.map(id => byId.statute[id]).filter(Boolean),
  }));

  _catalogue = {
    books: books.books,
    statutes: books.statutes,
    vendors: books.vendors,
    purchasingNotes: books.purchasingNotes,
    modules,
    cards,
    problems,
    byId,
    cardTypes: decks[0]?.cardTypes || {},
    bands: sets.find(s => s.bands)?.bands || {},
  };
  return _catalogue;
}

async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

function index(rows) {
  return Object.fromEntries((rows || []).map(r => [r.id, r]));
}

export function moduleLabel(m) {
  return m.level === null || m.level === undefined ? '—' : String(m.level);
}
