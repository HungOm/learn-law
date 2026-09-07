# Malaysian law — self-study

A static study app for working through Malaysian law from zero. No backend, no
build step. Content is JSON in the repo; scheduling is FSRS-6 running in the
browser; progress lives in IndexedDB.

## Run it

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. It must be served over HTTP — opening
`index.html` from the filesystem fails, because ES modules and `fetch` are
blocked on `file://`.

## Deploy to GitHub Pages

Push to a repo, then Settings → Pages → deploy from branch, root. No build, no
Actions workflow. `.nojekyll` stops Jekyll from touching the files.

## Layout

```
index.html
assets/app.css
src/
  app.js         router and views
  content.js     loads and indexes the JSON catalogue
  db.js          IndexedDB: card state, review log, attempts, settings
  scheduler.js   FSRS wrapper — queue building, grading, intervals
  problems.js    problem attempts: drafts, self-marking, calibration
  lessons.js     lesson read-state and the links between the three layers
content/
  books.json     reading list, statutes, modules, vendors
  lessons/*.json   exposition — the rules, stated, with sources
  cards/*.json   flashcard decks
  problems/*.json  problem questions with rubrics and model answers
vendor/
  ts-fsrs.mjs    FSRS-6, vendored — no CDN, works offline
tools/
  check-content.py  validates the JSON before the browser sees it
```

## Checking the content

```bash
python3 tools/check-content.py
```

There is no build step, so nothing stands between a hand-edited JSON file and the
page. Run this after editing anything under `content/`. It catches the errors
that are otherwise silent: a reused card id (the new card inherits the old card's
review history), a rubric whose marks do not sum to the problem's stated total, a
reference to a module or book that does not exist, a `verify` line missing from a
lesson or problem, a `rule` block asserting a rule with no source, and a card or
problem that no lesson reaches.

## Adding problem questions

Drop a JSON file in `content/problems/` and register it in `PROBLEM_SETS` in
`src/content.js`. Each problem needs `scenario` (an array of paragraphs), `task`,
a `rubric`, a `modelAnswer`, and — not optional — `source`, `lastVerified` and
`verify`. The last of those names what has to be checked against a current text
before the reasoning is relied on, and it is shown on the marking screen. A
problem without one is asserting an authority the app cannot support.

Rubric criteria carry a `band` (`issue`, `rule`, `application`, `method`,
`conclusion`) and a mark value. The band is what makes the progress page able to
say *where* marks go rather than only how many, so pick it honestly: a criterion
that rewards stating a section accurately is `rule` even if it feels like
application.

## Adding cards

Drop a JSON file in `content/cards/` and register it in the `DECKS` array in
`src/content.js`. Any card whose `id` has no saved state gets a fresh FSRS state
on next load, so new cards appear automatically. Never reuse an `id` for
different content — the review history is keyed to it.

Keep cards atomic: one fact per card. If a card needs a comma-separated list on
the back, it should be several cards. Every card carries a `source` so you can
re-verify it later, which matters because Malaysian textbooks go stale.

## Backup

**There is no server.** Clearing browser data deletes every review permanently.
Settings → Export backup writes a JSON file with all card state, the full review
log, and your settings. Do it monthly. Import replaces everything.

## Adding lessons

Drop a JSON file in `content/lessons/` and register it in `LESSON_SETS` in
`src/content.js`. Order inside the file is the order they are taught in — it is
pedagogical and nothing in the data can derive it.

A lesson needs `summary`, `minutes`, `sections`, and the same `source`,
`lastVerified` and `verify` a problem needs. Each section is `{h, body}`, and a
body is a list of typed blocks: `p`, `rule`, `example`, `caution`, `list`. **A
`rule` block must carry a `source`** — the validator refuses a rule stated with
nothing behind it, because a pulled-out black-letter box is the most
authoritative-looking thing on the page.

Two fields tie the layers together. `plants` lists the card ids the lesson
introduces; `prepares` lists the problem ids it sets up. They are checked in both
directions: every card must be planted by exactly one lesson, every problem must
be prepared by at least one, and a lesson may not name a card or problem that
does not exist. That is what stops content from becoming reachable only by
someone who already knew it was there.

## The three layers

Lessons, cards and problem questions do different work and are measured
differently on purpose.

**Lessons state the rules.** They are exposition — the thing the app had none of
for a long time, which made the module pages a reading list with a testing
harness bolted to it. A lesson is an orientation to the reading, not a
replacement for it, and it says so. The only state one carries is whether you
have marked it read; there is no score and no schedule, because re-reading is
cheap and a spacing algorithm applied to prose would be inventing a measurement.

Every module has at least one. Where a module also has cards or problems the
lesson hands off to them; where it does not, the lesson ends by pointing at the
reading, which is the honest thing for it to do.

Cards and problem questions are scored by different machinery on purpose.

A card has one right answer and a recall event, which is what FSRS fits a curve
to. A problem answer is four hundred words marked against a rubric by the person
who wrote it. Feeding the second into the first would produce a number that
*looks* like the review statistics and means nothing like them, so problems have
no due date, no interval, and no badge in the rail. The problem list is ordered
unattempted first, then weakest — a stated heuristic, not a schedule.

The middle stage of an attempt is the one worth defending. Before the rubric
appears you must predict your own mark, and that prediction is the only number
the app records that you cannot revise once you have seen the answer. The gap
between prediction and self-mark is the measurement: a consistent over-estimate
is the error that survives a whole degree, because it is invisible from the
inside. The progress page reports it in marks, with its direction.

## What it does not do

- **No AI grading.** A static site has nowhere safe to hold an API key. Problem
  answers are self-marked against a rubric and model answer. The marking screen
  has a **Copy answer and rubric** button that puts the facts, what you wrote and
  the rubric on the clipboard, for a second opinion from a person or a model. The
  app does not send anything anywhere.
- **No sync.** One browser, one device. Export/import is the only bridge.
- **No citator.** The app can tell you what a rule is; it cannot tell you whether
  a case is still good law. Free Malaysian sources have no citator, so every case
  record carries a `lastVerified` date and that check stays manual. Do not let the
  interface imply an authority it does not have.

## Scheduler notes

FSRS-6 via [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) 5.4.2,
vendored at `vendor/ts-fsrs.mjs`. Default desired retention 0.90.

Press **Forgot** when you actually failed. Using **Hard** as a soft fail is the
most common way people break FSRS — it inflates every subsequent interval.

If reviews grow past roughly 30% of study time, the cards are carrying too much.
Re-atomise them rather than lowering retention.

## The thing this app cannot measure

Both layers are self-reported. The reviews record whether you pressed **Forgot**
honestly; the problem marks record whether you marked yourself honestly. Nothing
in a static site can check either, and the progress page says so.

The lesson counter is weaker still, and deliberately so: it records that you
pressed a button, not that you understood anything. The cards and the problem
marks are what test that, which is why the progress page says as much next to it.

The calibration figure is the closest it gets, because it compares one judgment
against another you made a few minutes later and catches drift between them. It
does not catch a learner who is generously wrong about both.

What is left over is a timed answer written under supervision, and an answer read
by someone who knows the law better than you do. Neither is a thing this app can
supply, and no feature added to it will change that.
