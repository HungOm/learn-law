# ST's Chambers

**Malaysian law, from zero.**

A study app for working through Malaysian law from zero. Content is JSON in the
repo; scheduling is FSRS-6 running in the browser; progress lives in IndexedDB.
There is no backend and nothing is sent anywhere.

Four layers: **lessons** state the rules, **quizzes** check you recognise them,
**cards** keep them available under FSRS, and **problem questions** find out
whether you can use them. A **glossary** of 189 terms runs underneath all four,
linked automatically into the prose at two depths. A game layer — XP, ranks, streaks and seals — sits on
top and counts work done. It is careful not to pretend to be a measurement; see
[The game layer](#the-game-layer).

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints. `npm run build` produces `dist/`;
`npm run preview` serves that build.

## Deploy to GitHub Pages

The app is a Vite bundle now, so **Settings → Pages → Source must be set to
"GitHub Actions"**, not "deploy from a branch". `.github/workflows/deploy.yml`
validates the content, builds, and publishes `dist/` on every push to `main`.
`vite.config.js` sets `base: './'`, so it works from a repository sub-path
without knowing the repository name.

Routing is `HashRouter` on purpose: Pages has no rewrite rule, so a reload on a
real path would 404, and every URL the earlier build published
(`#/lesson/l-precedent`) still resolves.

## Layout

```
index.html            Vite entry
vite.config.js
public/
  favicon.svg
  .nojekyll
src/
  main.jsx            mounts the app inside HashRouter + StudyProvider
  App.jsx             routes and page transitions
  state/
    StudyContext.jsx  catalogue, game state, counts, toasts, overlays
  lib/
    content.js        imports and indexes the JSON catalogue
    db.js             IndexedDB: card state, review log, attempts, settings
    scheduler.js      FSRS wrapper — queue building, grading, intervals
    problems.js       problem attempts: drafts, self-marking, calibration
    lessons.js        lesson read-state and the links between the layers
    glossary.js       the term index and the prose tokeniser
    quiz.js           quiz runs, arena scoring, high scores
    game.js           XP, ranks, streaks, seals — the whole game layer
    fx.js             confetti and haptics, both reduced-motion aware
    format.js         dates, clocks, pluralisation, clipboard
  components/         Rail, Bits (rings/rows/stats), Seal, Overlays
    Term.jsx          the glossary popover, and the prose linker
    Blocks.jsx        one lesson block — prose, table, chart, diagram, figure
    Diagram.jsx       seven SVG diagram kinds
    Chart.jsx         bar and stacked bar, with a table view
    CommandPalette.jsx  Cmd-K across everything
    CurriculumMap.jsx   sixteen rings, one per module
    plates/           the illustration plates: kit, scenes, frame
  routes/             one file per screen
  styles/
    tokens.css        the design system's roles (see DESIGN.md)
    base.css          the statute-reprint visual language
    game.css          rings, seals, combo meters, the level-up card
    learn.css         glossary, lesson layout, contents rail, palette
    plates.css        plates, diagrams, charts, tables
content/
  books.json          reading list, statutes, modules, vendors
  glossary.json       189 terms, each at two depths
  lessons/*.json      exposition — the rules, with sources, quizzes and figures
  cards/*.json        flashcard decks
  problems/*.json     problem questions with rubrics and model answers
vendor/
  ts-fsrs.mjs         FSRS-6, vendored — no CDN, works offline
tools/
  check-content.py    validates the JSON before the browser sees it
```

Content is **imported**, not fetched. A malformed file fails the build instead
of producing a blank page at 3am, and the catalogue is available synchronously,
so there is no loading state on first paint.

## Checking the content

```bash
python3 tools/check-content.py     # or: npm run check
```

Run this after editing anything under `content/`. It catches the errors that are
otherwise silent: a reused card id (the new card inherits the old card's review
history), a rubric whose marks do not sum to the problem's stated total, a
reference to a module or book that does not exist, a `verify` line missing from
a lesson or problem, a `rule` block asserting a rule with no source, a card or
problem that no lesson reaches, a quiz question whose `answer` index does not
point at an option, and raw HTML in lesson prose.

CI runs it before the build, so a content error fails the deploy rather than
shipping.

## Writing lessons

Drop a JSON file in `content/lessons/` and register it in `LESSON_SETS` in
`src/lib/content.js`. Order inside the file is the order they are taught in — it
is pedagogical and nothing in the data can derive it.

A lesson needs `summary`, `minutes`, `sections`, and the same `source`,
`lastVerified` and `verify` a problem needs. Each section is `{h, body}`, and a
body is a list of typed blocks: `p`, `rule`, `example`, `caution`, `list`. **A
`rule` block must carry a `source`** — the validator refuses a rule stated with
nothing behind it, because a pulled-out black-letter box is the most
authoritative-looking thing on the page.

Prose supports exactly two inline tokens, `**strong**` and `*emphasis*`, parsed
into React elements. HTML is escaped and printed literally, and the validator
rejects it.

Three fields tie the layers together. `plants` lists the card ids the lesson
introduces; `prepares` lists the problem ids it sets up; `quiz` is the lesson's
own questions. The first two are checked in both directions: every card must be
planted by exactly one lesson, every problem must be prepared by at least one,
and a lesson may not name a card or problem that does not exist. That is what
stops content from becoming reachable only by someone who already knew it was
there.

## Writing quiz questions

A `quiz` entry is `{id, q, options, answer, why}` with an optional `source`.
`answer` is the **index** into `options` as authored; the app reshuffles both the
questions and the options on every run, so a quiz cannot be passed from memory
of where the right answer sat.

`why` is not optional in practice and the validator requires it. A quiz that
tells you that you were wrong and not why has taught nothing, and the
explanation is shown on a right answer too — being right for the wrong reason is
the failure this layer is best placed to catch.

## The glossary

`content/glossary.json` holds 189 terms. Each carries three things, and the
split is the point:

- `gloss` — one line, for the popover header.
- `intermediate` — two or three sentences, for a reader who met the word in a
  sentence they were part-way through and wants to be let go.
- `advanced` — the contested edges, the Malaysian departures from English law,
  and how the point is actually argued. It is deliberately harder reading, and
  it is out of scope for any reading-level pass.

Terms are **not** marked up in the lesson content. An author writes ordinary
prose and the linker finds the term: `src/lib/glossary.js` builds one regex from
every alias, longest first, and a term is linked the first time it appears in a
lesson and left alone afterwards. Linking every occurrence turns a page of
exposition into a page of underlines, and by the fourth "consideration" the
reader has either looked it up or decided not to.

Two rules the content check enforces. An alias may be claimed by only one term,
because a duplicate means one of the two silently never links; and a term's own
name must be among its aliases, or the term will not link to itself.

## Figures: plates, diagrams, charts and tables

A lesson block may be `p`, `rule`, `example`, `caution`, `list` — or one of the
visual types: `table`, `chart`, `diagram`, `figure`, `steps`, `compare`.

**Plates** are the illustration at the head of each lesson. They are drawn, not
sourced: original engraving-style SVG in `src/components/plates/`, composed from
a shared motif kit. Photographs would have been the obvious answer and the wrong
one — the app is offline-first with no CDN, and a picture whose licence nobody
can vouch for sits badly in an app that makes every lesson name its sources.
There are 58 scenes; every lesson names one in its `plate` field, with a
`plateCaption` saying what it shows.

**Diagrams** come in seven kinds — `hierarchy`, `flow`, `branch`, `timeline`,
`matrix`, `stack`, `spectrum` — and re-encode a structure that is hard to hold
in a sentence. Each needs `alt`, because a structure available only as a picture
is a structure some readers do not get.

**Charts** are deliberately few. A law lesson has very little genuinely
quantitative content, and a chart over invented numbers would be exactly the
authoritative-looking claim the rest of this app refuses to make. Every chart
must carry a `source`; the content check fails the build without one. The series
colours are the design system's `--viz-series-1..3`, capped at three, because a
fourth categorical hue cannot be reliably separated — past three the data goes
out as a table instead.

### Anchors

A figure is placed by an `anchor` key on the section it belongs to
(`"anchor": "fig-l-courts-0"`). Do not delete one. Headings are free to be
rewritten — that is what the anchor is for — but a section that loses its anchor
loses its figure. Moving the key to a different section moves the figure.

## Navigation

- **Cmd-K** (or `/`) opens one search across lessons, modules, problems,
  quizzes, glossary terms and the app's own pages. At 55 lessons, 25 problems
  and 189 terms a rail cannot hold it any more.
- Each lesson has a **contents rail** with scroll-spy, and previous/next links
  that run in **curriculum order** rather than within the module.
- The home page opens with a **curriculum map**: one ring per module, filled by
  the lessons read, with a dot where cards are due.

## Adding cards

Drop a JSON file in `content/cards/` and register it in `DECKS` in
`src/lib/content.js`. Any card whose `id` has no saved state gets a fresh FSRS
state on next load, so new cards appear automatically. Never reuse an `id` for
different content — the review history is keyed to it.

Keep cards atomic: one fact per card. If a card needs a comma-separated list on
the back, it should be several cards. Every card carries a `source` so you can
re-verify it later, which matters because Malaysian textbooks go stale.

## Adding problem questions

Drop a JSON file in `content/problems/` and register it in `PROBLEM_SETS` in
`src/lib/content.js`. Each problem needs `scenario` (an array of paragraphs),
`task`, a `rubric`, a `modelAnswer`, and — not optional — `source`,
`lastVerified` and `verify`. The last of those names what has to be checked
against a current text before the reasoning is relied on, and it is shown on the
marking screen. A problem without one is asserting an authority the app cannot
support.

Rubric criteria carry a `band` (`issue`, `rule`, `application`, `method`,
`conclusion`) and a mark value. The band is what makes the progress page able to
say *where* marks go rather than only how many, so pick it honestly: a criterion
that rewards stating a section accurately is `rule` even if it feels like
application.

## Backup

**There is no server.** Clearing browser data deletes every review permanently —
and now every point of XP and every seal, because the game state lives in the
same store. Settings → Export backup writes a JSON file with all card state, the
full review log, your attempts and your settings. Do it monthly. Import replaces
everything.

## The four layers

They do different work and are measured differently on purpose.

**Lessons state the rules.** They are exposition. A lesson is an orientation to
the reading, not a replacement for it, and it says so. The only state one
carries is whether you have marked it read; there is no score and no schedule,
because re-reading is cheap and a spacing algorithm applied to prose would be
inventing a measurement.

**Quizzes test recognition.** Four options, one right, a clock running. This
sits between a card and a problem question: it asks whether you can pick the
governing rule out of four that all sound plausible, which is most of what a
multiple-choice paper tests and a fair amount of what a viva does.

A quiz result deliberately **does not move a card's due date**. Recognising the
right answer among four is a much easier act than producing it cold, and letting
a recognition event lengthen a recall interval would inflate the schedule on
evidence that does not support it. Quizzes pay XP; cards move the schedule.

**Cards test recall.** One right answer and a recall event, which is what FSRS
fits a curve to. This is the only layer with a due date.

**Problem questions test reasoning.** Four hundred words marked against a rubric
by the person who wrote it. Problems have no due date, no interval, and no badge
in the rail — feeding a self-marked essay into a memory model would produce a
number that *looks* like the review statistics and means nothing like them. The
problem list is ordered unattempted first, then weakest: a stated heuristic, not
a schedule.

The middle stage of an attempt is the one worth defending. Before the rubric
appears you must predict your own mark, and that prediction is the only number
the app records that you cannot revise once you have seen the answer. The gap
between prediction and self-mark is the measurement: a consistent over-estimate
is the error that survives a whole degree, because it is invisible from the
inside. The progress page reports it in marks, with its direction.

## The game layer

XP, ranks, streaks and seals are **motivation, not measurement**. They count
work done, weighted towards the work that actually produces learning: a written
problem answer is worth more than a dozen cards, and a prediction that lands
within a mark is worth more again.

The ladder is the Malaysian legal career — Layperson, Pupil in Chambers,
Advocate & Solicitor, up to Chief Justice — because a rung should mean something
to a student of this jurisdiction.

Two design rules constrain the whole layer:

**Pressing Forgot pays XP.** If an honest lapse cost you points, the scoreboard
would be paying you to lie to the scheduler, and a corrupted FSRS curve costs
far more than a number. There is a seal for pressing Forgot twenty-five times.

**Nothing here is shown as a measurement of what you know.** The XP total does
not appear beside the recall percentage or the calibration gap on the Progress
page, because those are claims about what you know and this is a claim about how
much you turned up. Every seal is derived from data the app already had —
reviews graded, lessons marked, quizzes finished, answers written — and none can
be earned by pressing a button that does nothing else.

Motion respects `prefers-reduced-motion`: the CSS kills every animation and
transition, and the confetti is told separately because it paints on a canvas a
CSS rule cannot reach.

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

The vendored copy is upstream's `dist/index.mjs` with one line removed: the
trailing `//# sourceMappingURL=index.mjs.map`. The map is not vendored, so
leaving the comment made the dev server log an ENOENT on every load. Strip it
again when re-vendoring.

Press **Forgot** when you actually failed. Using **Hard** as a soft fail is the
most common way people break FSRS — it inflates every subsequent interval.

If reviews grow past roughly 30% of study time, the cards are carrying too much.
Re-atomise them rather than lowering retention.

## The thing this app cannot measure

Every layer is self-reported. The reviews record whether you pressed **Forgot**
honestly; the problem marks record whether you marked yourself honestly. Nothing
in a browser-only app can check either, and the progress page says so.

The lesson counter is weaker still, and deliberately so: it records that you
pressed a button, not that you understood anything. The quiz percentage runs
high and should — it is a floor, not a score. The cards and the problem marks
are what test comprehension, which is why the progress page says as much next to
each of them.

The calibration figure is the closest it gets, because it compares one judgment
against another you made a few minutes later and catches drift between them. It
does not catch a learner who is generously wrong about both.

What is left over is a timed answer written under supervision, and an answer
read by someone who knows the law better than you do. Neither is a thing this
app can supply, and no feature added to it will change that — least of all the
XP total, which rewards showing up, a different virtue from being right.
# learn-law
