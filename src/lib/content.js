// Content lives as JSON in /content and is read-only at runtime. Git is the
// versioning system: every rule change is a commit with a date.
//
// It is *imported* rather than fetched. Under Vite that means a malformed file
// fails the build instead of producing a blank page at 3am, and the catalogue
// is available synchronously — no loading state on the first paint.

import books from '../../content/books.json';

import cardsFoundations from '../../content/cards/foundations.json';
import cardsMethod from '../../content/cards/method.json';
import cardsSubstantive from '../../content/cards/substantive.json';

import problemsMethod from '../../content/problems/method.json';
import problemsSubstantive from '../../content/problems/substantive.json';
import problemsAdvanced from '../../content/problems/advanced.json';

import lessonsMethod from '../../content/lessons/method.json';
import lessonsMethodAdvanced from '../../content/lessons/method-advanced.json';
import lessonsSubstantive from '../../content/lessons/substantive.json';
import lessonsSubstantiveAdvanced from '../../content/lessons/substantive-advanced.json';

// Each new deck is one import above and one entry here.
const DECKS = [cardsFoundations, cardsMethod, cardsSubstantive];

// Problem questions: the reasoning layer. Registered the same way as decks, and
// kept in separate files because they are edited in different sittings from the
// cards — a card is five minutes' work, a problem question is an afternoon.
const PROBLEM_SETS = [problemsMethod, problemsSubstantive, problemsAdvanced];

// Lessons: the exposition. Ordered here rather than sorted at runtime, because
// the sequence within a module is pedagogical and not derivable from any field.
const LESSON_SETS = [
  lessonsMethod,
  lessonsMethodAdvanced,
  lessonsSubstantive,
  lessonsSubstantiveAdvanced,
];

const cards = DECKS.flatMap(d => d.cards || []);
const problems = PROBLEM_SETS.flatMap(s => s.problems || []);
const lessons = LESSON_SETS.flatMap(s => s.lessons || []);

const byId = {
  book: index(books.books),
  statute: index(books.statutes),
  module: index(books.modules),
  card: index(cards),
  problem: index(problems),
  lesson: index(lessons),
};

const modules = books.modules.map(m => ({
  ...m,
  cardCount: cards.filter(c => c.moduleId === m.id).length,
  problems: problems.filter(p => p.moduleId === m.id),
  lessons: lessons.filter(l => l.moduleId === m.id),
  books: [...m.primary, ...m.reference].map(id => byId.book[id]).filter(Boolean),
  statuteRefs: m.statutes.map(id => byId.statute[id]).filter(Boolean),
}));

// Every quiz question in the catalogue, tagged with the lesson that asks it.
// The quiz arena draws from this pool; a lesson quiz draws from one lesson.
const quizPool = lessons.flatMap(l =>
  (l.quiz || []).map(q => ({
    ...q,
    lessonId: l.id,
    lessonTitle: l.title,
    moduleId: l.moduleId,
  })));

export const catalogue = {
  books: books.books,
  statutes: books.statutes,
  vendors: books.vendors,
  purchasingNotes: books.purchasingNotes,
  modules,
  cards,
  problems,
  lessons,
  quizPool,
  byId,
  cardTypes: Object.assign({}, ...DECKS.map(d => d.cardTypes || {})),
  bands: PROBLEM_SETS.find(s => s.bands)?.bands || {},
};

function index(rows) {
  return Object.fromEntries((rows || []).map(r => [r.id, r]));
}

export function moduleLabel(m) {
  return m.level === null || m.level === undefined ? '—' : String(m.level);
}

/** Quiz questions for one lesson, or for a whole module. */
export function quizFor({ lessonId = null, moduleId = null } = {}) {
  return quizPool.filter(q =>
    (!lessonId || q.lessonId === lessonId) && (!moduleId || q.moduleId === moduleId));
}

export default catalogue;
