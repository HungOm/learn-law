/**
 * Focus mode: one section on screen at a time, with a Next.
 *
 * Shared by the lesson and the writing exercise so there is one setting rather
 * than two that can disagree. A reader who turns it off in a lesson has said
 * something about how they want to read, not about lessons.
 *
 * It is a per-device VIEW preference, not progress, so it lives in localStorage
 * rather than the IndexedDB `meta` store the rest of the app's state uses. Two
 * reasons: it has to be readable synchronously or the page flashes the wrong
 * mode on every load, and it is the one piece of state here a reader would not
 * mind losing. Everything that IS progress stays in `meta`, where the export in
 * Settings can reach it.
 *
 * The key still says `lesson`. Renaming it would read as "reset everyone who
 * has already chosen" — the mode went app-wide, the reader's choice did not
 * change, and a migration for a preference that defaults ON is not worth the
 * one-release window where it silently reverts.
 */
const KEY = 'lessonStepMode';

/** Focus mode is ON unless the reader has turned it off. */
export const focusOn = () => {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
};

export const setFocus = (on) => {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
};
