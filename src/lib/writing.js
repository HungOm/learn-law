// Guided writing: the tier that makes a reader produce something.
//
// Everything else in this app is recognition or short application — a card is
// answered in five seconds, a quiz option is chosen, a problem is answered
// against a rubric. None of it asks the reader to compose. Measured against a
// real law degree that is the second biggest gap after case reading: an LLB is
// assessed almost entirely on writing, and a reader who has never drafted a
// paragraph of legal prose has not been examined on the thing that is examined.
//
// What this is NOT: a model answer to copy. The app supplies the brief, staged
// scaffolding, the SHAPE a good answer has, the faults it commonly has, and a
// rubric the reader marks their own draft against. `tools/check-writing.py`
// enforces that — a `model` field that reads as an answer rather than as a
// description of one fails the build, as does any long quoted run.
//
// Why no model text, when a worked example would obviously help: it would be
// copied. A reader who reads a model before drafting produces a version of it,
// learns the shape of someone else's thinking, and finds out nothing about
// their own. The reveal order is the same argument the case tier makes and the
// same one the Predict block makes — commit first, compare after.
//
// Gating matches case reading: an exercise opens when the lesson it hangs off
// is marked read. Not to ration it, but because writing about a rule you have
// not met produces a page of hedging, and that teaches a reader they cannot
// write, which is both false and the thing most likely to stop them returning.

import exercises from '../../content/writing/core.json';
import { meta } from './db.js';

const DRAFT_KEY = 'writingDrafts';

export const LEVELS = [
  { id: 'foundation', label: 'Foundation', note: 'the shape, with the scaffolding visible' },
  { id: 'advanced', label: 'Advanced', note: 'the same shapes, unlabelled and at length' },
  { id: 'llb', label: 'Degree level', note: 'open briefs, exam length, argued positions' },
];

export function all() {
  return exercises;
}

export function byId(id) {
  return exercises.find(w => w.id === id) || null;
}

/** Grouped for an index page, in the level order above. */
export function byLevel() {
  return LEVELS
    .map(l => ({ ...l, list: exercises.filter(w => w.level === l.id) }))
    .filter(g => g.list.length);
}

export function forModule(moduleId) {
  return exercises.filter(w => w.moduleId === moduleId);
}

/** Open when the lesson it hangs off has been marked read. */
export function isOpen(w, read = {}) {
  return !!(w && read[w.lessonId]);
}

export function counts(read = {}) {
  return { open: exercises.filter(w => isOpen(w, read)).length, total: exercises.length };
}

// ---------------------------------------------------------------------------
// Drafts.
//
// A draft is the reader's own work and the only content in this app they
// author. It stays on their device, in the same IndexedDB as everything else,
// and it is never sent anywhere — there is nowhere to send it to. It is stored
// per exercise, with the self-mark alongside, so returning to an exercise
// months later shows both what they wrote and what they thought of it.

export async function allDrafts() {
  return (await meta.get(DRAFT_KEY, null)) || {};
}

export async function getDraft(id) {
  const map = await allDrafts();
  return map[id] || { text: '', band: null, note: '', updated: null };
}

export async function saveDraft(id, patch) {
  const map = await allDrafts();
  const next = {
    ...map,
    [id]: { ...(map[id] || { text: '', band: null, note: '' }), ...patch, updated: Date.now() },
  };
  await meta.set(DRAFT_KEY, next);
  return next[id];
}

export async function clearDraft(id) {
  const map = await allDrafts();
  delete map[id];
  await meta.set(DRAFT_KEY, map);
  return map;
}

/** Words in a draft, counted the way the briefs count them. */
export function words(text) {
  return (text || '').trim() ? text.trim().split(/\s+/).length : 0;
}

/** Has the reader committed to a draft worth comparing against the model? */
export function isDrafted(draft) {
  return words(draft?.text) >= 40;
}
