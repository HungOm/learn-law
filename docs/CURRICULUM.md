# Curriculum review and roadmap

A review of the learning materials against a changed audience, and what should
be built next. Written 2026-09-07.

## The audience this was built for, and the one it now has

The content reads as a revision aid for a Malaysian law undergraduate. It is
good at that. But the readers are now adults who never got the chance to go to
university, children and teenagers, and people returning to a module months
later — most of them without a lecturer, a study group, or a library card.

That gap shows up in measurable ways and in unmeasurable ones.

## What the numbers said

Measured with `tools/readability.py` before this round of work:

| Measure | Before | Target |
|---|---|---|
| Median Flesch-Kincaid grade | 11.0 | 8-10 |
| Lessons outside target | 41 of 41 | 0 |
| Hardest lesson | `l-judicial-review`, grade 12.2 | — |
| Longest single sentence | 60 words (`l-torrens`) | 30 |

Grade 11 means a reader needs roughly five more years of formal schooling than
the audience is assumed to have. The law was not the barrier. The sentences
were.

Coverage was also lopsided. Six modules — study method, criminal procedure,
property, company, evidence, civil procedure — had **no practice problem at
all**. A learner reaching them could read and memorise, but never once find out
whether they could actually use what they knew.

## What the numbers did not say

Four findings that no metric catches:

**1. The prose assumed an insider.** Phrases like "embarrassing to be unsure
about in the second year" and "the textbook has already made that choice for
you" tell a self-taught reader they are in the wrong room. They are the single
cheapest thing to fix and the most damaging to leave.

**2. Abstraction came before the concrete.** Most lessons named a doctrine,
defined it, then illustrated it. For a reader with no scaffolding this is
backwards — they must hold an empty term in mind while it is filled. Leading
with a concrete Malaysian scene and naming the doctrine *last* costs nothing in
rigour and removes most of the load. This is now the central rule in
`docs/STYLE.md`.

**3. There was no rung between a card and a problem.** Cards take five minutes.
Problems take forty-five and are marked against a rubric. Nothing sat between
them. Beginners need a *worked* example before an open one — so this round adds
`kind: "guided"` problems, worth fewer marks, whose task walks the reader
through the steps with the reasoning partly done.

**4. Vocabulary had no safety net.** There is no glossary. A reader who meets
"indefeasible" or "ultra vires" mid-lesson has nowhere to go. Term cards exist,
but only for a module already reached. For readers without legal training,
vocabulary — not concept difficulty — is the largest single barrier to legal
text.

## Work commissioned in this round

Six writers, partitioned by file so none can overwrite another, each bound by
`docs/STYLE.md` and validated by `tools/check-content.py`.

| Stream | Scope |
|---|---|
| Revision A | `lessons/method.json`, `lessons/method-advanced.json` — the entry point |
| Revision B | `lessons/substantive.json` — 14 core doctrine lessons |
| Revision C | `lessons/substantive-advanced.json` — the 13 hardest |
| New D | Criminal procedure + property: lessons, cards, first problems |
| New E | Company + evidence + civil procedure: lessons, cards, first problems |
| New F | Study method, research, reasoning, interpretation: skills + guided problems |

Reserved id namespaces (`pd-`, `pe-`, `pf-`) keep parallel authors from
colliding, because review history is keyed to card ids and a reused id silently
inherits another card's schedule.

## What this round delivered

| | before | after |
|---|---|---|
| Median reading grade | 11.0 | **7.0** |
| Lessons outside target | 41 of 41 | **0 of 55** |
| Longest sentence | 60 words | 30 |
| Lessons | 41 | 55 |
| Cards | 118 | 186 |
| Problems | 15 | 25 |
| Modules with no problem | 6 | **0** |

Guided problems now exist as a rung between a card and an open problem: 8-10
marks against 13-18, steps pre-ordered, half the reasoning handed over. They are
scored as rehearsals rather than attempts — see `src/lib/game.js`.

Four defects were found by review rather than by the checker, and are worth
recording because each was invisible to it:

- **Every quiz answer was option A.** All 286. Not learner-visible, because
  `prepare()` shuffles options at render — but any future surface that skips it
  (a print view, an offline pack) would have exposed it. Fixed by
  `tools/balance-quiz.py`; guarded by a distribution check.
- **Twenty answers were orphaned onto distractors.** The rebalancer moved
  `answer`, then an option-rewording pass rebuilt the arrays correct-first and
  left `answer` behind. Caught by the writer, then verified across all 211
  pre-existing questions against `HEAD`. This is the failure that marks a right
  answer wrong forever, and no schema check can see it.
- **Guided problems could strike the seal named "A first".** They fired the same
  event as open problems, so the reward for a first-class mark was most easily
  earned on the task built not to test you.
- **Five quiz ids collided across lessons.** Two authors both reached for `qcv`.
  Now enforced site-wide.

## What should be built next

In the order I would build it.

### 1. A glossary layer — DONE, delivered in parallel
189 terms at three depths (`gloss`, `intermediate`, `advanced`), linked into the
prose and searchable. Built by another session during this round. It was the
highest-value remaining item for this audience, on the reasoning that for a
reader without legal training vocabulary is a bigger barrier than concept
difficulty. Writers' in-lesson glosses must agree with its `gloss` **claim** —
see `docs/STYLE.md`.

### 2. A diagnostic entry for returning readers
A revisitor currently re-enters at the top of a linear lesson. Retrieval
practice says the opposite is right: ask first, then route to what was missed.
The scheduler and the arena already exist; this is mostly wiring.

### 3. A narrative spine for younger readers
Children reason extremely well about *fairness* and poorly about *abstraction*.
A single running case — one dispute followed from the argument to the court to
the judgment — would carry a twelve-year-old through the institutional material
that currently reads as a list of courts.

### 4. Bahasa Malaysia
The audience most excluded by an English-only site is exactly the audience this
is for. At minimum the glossary and the foundations module.

### 5. Audio
Someone studying after a shift often cannot read but can listen. Lessons are
already short, self-contained and written in plain sentences — which is most of
the work of making them listenable.

### 6. "What do I do now" pages
Not law-school material: what actually happens if you are arrested, what a
tenancy deposit dispute costs to bring, where a small claim goes. This is the
reason a non-student reads a law site at all, and it is the strongest possible
on-ramp to the doctrine.

## Standing rules

- Simplify the language, never the rule. A simple sentence may be incomplete;
  it may never be wrong.
- Never invent a case name, citation, section number or judge.
- Ids are permanent. Review history is keyed to them.
- `python3 tools/check-content.py` must pass before anything lands.
