# House style for learning materials

Everyone writing content under `content/` follows this. It exists because the
audience changed: this is no longer a revision aid for law undergraduates.

## Who is actually reading

Assume, in this order:

1. **An adult who never got to university.** Works, has a phone, reads well
   enough, has never been taught how to read a rule. Curious and quite possibly
   in a situation where the law matters to them personally. Has no textbook, no
   lecturer, and nobody to ask.
2. **A child or teenager**, 12 upward, reading out of interest or for school.
3. **A returning revisitor** who did this module months ago and wants the
   nuance, fast.

The first two set the *language*. The third sets the *depth*. Both are served
by the same lesson — see **Two speeds** below. Never write down to anyone: the
reader is intelligent and under-served, not slow.

## The register

| Measure | Target |
|---|---|
| Flesch–Kincaid grade | **8–10** (currently the median is 11.0) |
| Median sentence | **≤ 16 words** |
| Longest sentence | **≤ 30 words**, and rare |
| Paragraph (`p` block) | **2–4 sentences** |

One idea per sentence. If a sentence has two commas and an "although", cut it
in two. Check yourself with `python3 tools/readability.py`.

**The grade band is a ceiling, not a floor.** Grade 8-10 is where we expected to
land, not a target to hit from below. A lesson that reads at grade 5 is not a
defect — it is the goal, achieved. `--gate` only ever fails a lesson for being
*too hard*.

This matters because the two targets above are mildly incompatible, and the
conflict has a wrong resolution that looks reasonable. At the plain vocabulary
this material wants (about 1.43 syllables per word), reaching grade 8.0 needs an
average sentence of roughly 17 words, which collides with the median-16 rule.
The only levers that would raise a too-easy grade are longer sentences or longer
words. **Do not pull either.** Both make the material worse for the reader in
exchange for a nicer number. Write as plainly as the law allows and let the
grade fall where it falls.

## Never assume an insider

Delete, on sight, anything that assumes schooling the reader may not have had:

- "as you will remember from your tort lectures"
- "embarrassing to be unsure about in the second year"
- "the textbook has already made this choice for you"
- "in the exam", "for your essay" — unless phrased as optional

Nobody is failing anything here. If exam framing genuinely helps, write "if you
are studying for something formal, …" and keep it to one sentence.

## Concrete before abstract

The single most important rule in this file. Every lesson, and every hard
section inside a lesson, goes in this order:

1. **A hook** — one sentence on why this matters to an ordinary life.
2. **A concrete Malaysian scene** — a real situation, named people, small money.
3. **The rule**, in plain words.
4. **The name** of the rule, last.

Introduce the idea *before* its label. A reader who already understands the
thing can hang the words "ratio decidendi" on it in one second. A reader given
the Latin first has to hold an empty box in their head while you fill it.

> **Bad:** "Ratio decidendi is the legal principle a decision rests on."
> **Good:** "A judge decides Aminah's case and writes four pages. Only some of
> that binds the next judge — the part the result actually turned on. The rest
> is commentary. Lawyers call the binding part the **ratio decidendi**."

## Gloss every term of art, every lesson

The first time a lesson uses a technical word, gloss it in plain words in the
same or the next sentence. Do this **in every lesson**, not once across the
site — people arrive in the middle.

- plaintiff (the person who starts the case)
- injunction (a court order to stop doing something)
- quantum (how much money)

Do not gloss twice in the same lesson. Do not gloss ordinary words.

## Malaysian texture, real and small

Use the country the reader lives in: a kedai runcit, a Grab driver, a deposit on
a rented room, a hire-purchase motorbike, kampung land passed down without
paperwork, a promise made on WhatsApp, a Touch 'n Go top-up gone wrong. Small
sums. Ordinary names. This is not decoration — a concrete scene is what a
reader without legal training reasons *with*.

**Never invent a case name, citation, section number or judge.** Illustrative
people are fine and should be obviously ordinary. Authorities must be real. If
you are not certain of a citation, describe the rule and cite the statute
generally, or say plainly that the point is standard doctrine.

## Two speeds in one lesson

A beginner must be able to read only the `p`, `rule` and `example` blocks and
come away with something **correct**, if incomplete. Put the qualifications,
the exceptions and the "but in Malaysia" wrinkles in `caution` blocks. That way:

- the beginner skims past and is not misled, only under-informed;
- the revisitor reads them and gets the nuance they came for.

This means a `p` block must never be *wrong* just because it is simple.
Simplify the **language**, never the **rule**.

## Blocks

Only these five, and they mean things:

- `p` — exposition. The spine.
- `rule` — a statement of law. **Requires a real `source`.** Its wording is
  frozen; see below.
- `example` — a worked concrete instance. Use freely; use more than you think.
- `caution` — the trap, the exception, the common mistake. Second speed.
- `list` — enumerations with `items`. Good for elements of a claim.

Markup is `**strong**` and `*emphasis*` only. **No HTML** — the checker rejects
it and the renderer would print the tag.

## The two interactive blocks

Everything else in a lesson is exposition — the reader receives it. These two
interrupt that, and they are not decoration. Each is doing a specific job that
reading cannot do.

### `predict` — ask before you tell

Placed **before** the rule it anticipates. The reader commits to an answer, then
the rule is given.

```json
{ "t": "predict",
  "prompt": "Before you read on — who does the law say owns it?",
  "options": ["...", "...", "..."],
  "answer": 1,
  "reveal": "The register decides, and it decides on its own. ..." }
```

Why it works: attempting an answer and getting it wrong, *then* being told,
produces better retention than being told first. The failed attempt is what
makes the explanation land. So:

- **Placement is the whole thing.** A `predict` after the rule is just a quiz
  question. It must sit at the moment the reader has the facts and not the rule.
- **Being wrong is the mechanism, not a failure.** The reveal never scolds. The
  reader's wrong pick is labelled "you said", never marked red, and nothing is
  scored. Where the wrong answer is the intuitive one, say so and respect it —
  "hold on to that feeling, it is the instinct this system was built to
  overrule" teaches more than "incorrect".
- `options` is optional. Without it the reader is asked to think and then press
  a button to reveal, which suits an open question.
- The `reveal` is required. A prediction with no answer is a trick.

### `checkpoint` — retrieval inside the reading

One question, mid-lesson, with corrective feedback.

```json
{ "t": "checkpoint", "q": "...", "options": ["...", "..."], "answer": 0,
  "why": "..." }
```

Every other question on this site sits at the *end* of a lesson, by which point
the material has been read once, straight through. Retrieval spread through the
material is worth more than the same questions massed at the end — and it tells
a reader who has drifted that they have drifted, while there is still lesson
left to re-read.

Unlike `predict`, a checkpoint **does** have a right answer and says so, in the
signal colours and in words. Put it after a chunk substantial enough to be worth
checking, not after every paragraph.

## Figure blocks

Six more block types carry structure rather than a `text` string:

- `diagram` — inline SVG. Needs a `kind`, its kind's payload, and **`alt`**.
- `table` — genuinely tabular material: a comparison across two or more axes.
  Every row must have exactly as many cells as there are columns.
- `compare` — a two-column contrast: `left` and `right`, each `{h, items}`.
- `steps` — an ordered procedure as `items` of `{h, text}`.
- `chart` — `kind` `bar` or `stack`, `data` of `{label, value}`, and a `source`,
  because a chart plots figures and must say where they came from.
- `figure` — names a drawn plate by `scene`.

The seven diagram kinds, each with the payload key it reads:

| kind | payload | use it for |
|---|---|---|
| `hierarchy` | `rows` | authority: **above binds below**, nothing else |
| `flow` | `steps` | an order of operations |
| `branch` | `branches` | a decision with a `question` at the top |
| `timeline` | `events` | a position that moved, with `year` |
| `matrix` | `cells` | two independent axes crossed |
| `stack` | `layers` | ranked layers — strongest or commonest first |
| `spectrum` | `marks` | positions on one scale, `at` between 0 and 1 |

### A figure re-encodes; it never decorates and never adds

The test is the one `Diagram.jsx` states and DESIGN.md §2.11 argues: a figure is
a structure the prose already asserts, put into a form that is hard to hold in a
sentence — a hierarchy, an order, a branch, a scale. It is never decoration and
never a claim the text does not make.

This matters because the instinct to add pictures usually arrives as "the page
is a wall of text, break it up". Pictures added for that reason are the
*seductive details* case, and the effect on retention is measurably **negative**
— a decorative image next to a paragraph competes with it rather than resting
the reader. Pictures that carry the content's structure are the opposite, and
among the better-supported findings in the literature. So: if you cannot say
what a figure *asserts*, it does not go in. If you can, put it in.

A good place to hunt for missing figures is the prose gate itself. A long
enumerating sentence in a `p` block — four steps joined by semicolons — is
almost always a `flow` or a `steps` that has not been drawn yet.

### Every figure is also a prose edit

`readability.py` counts a figure's `alt`, `caption` and `title` as prose, and it
is right to: a screen-reader user hears the `alt` **as** the figure. The
consequence is not obvious and it has bitten twice. The natural way to describe
an n-step diagram is one sentence enumerating the steps — which is exactly the
shape the 30-word ceiling exists to stop.

Write the `alt` as several short sentences, and check it *before* inserting.
Note also that the gate names the failing **lesson**, not the failing sentence:
watch the `max` column fall to ≤ 30 rather than waiting for the FAIL line to
disappear, or you will "fix" one overrun while another one keeps the lesson red.

## Rule blocks are frozen — annotate, do not rewrite

A `rule` block is the one place in this app where the words *are* the law rather
than a description of it. Reword it and you change what it asserts. So:

**Do not edit the `text` of a `rule` block, and never remove its `source`.**

Rule blocks are 13.8% of the prose and sit at reading grade 12.6, against 10.4
for everything else. You are not accountable for that 12.6 — `tools/readability.py`
excludes rule text from the `grade` column it gates on, and reports the blended
figure separately as `+rule`.

You are accountable for making the rule *land*. Where a rule block is hard,
surround it:

1. A `p` block **before** it that sets up the problem the rule answers.
2. The `rule` block, untouched.
3. A `p` block **after** it that restates it in plain words — "Put simply: if
   you promise something and get nothing back for it, the promise usually
   cannot be enforced."

The design supports being read this way: a rule sits in its own ruled block with
its source beneath it, visually separated from the annotation around it, the way
a statute reprint sets a provision apart from the note on it. Let the rule be
formal and let your prose do the teaching.

### A known exception, deliberately left standing

The freeze is justified where a rule block quotes or closely tracks a provision.
It is *over*-broad for the rest: a good number of rule blocks are authored
paraphrases rather than quotations. In `l-shape-of-law`, for instance:

> "Public law: the State is a party in its capacity as the State. Private law:
> the parties meet as equals, and the State supplies only the court."
> — source: "Standard classification; see Williams, Learning the Law"

That is a description of the law, not a provision of it, and freezing it locks
some authored grade-12.6 prose permanently out of reach of the reading-level
work.

It is frozen anyway, and on purpose. The asymmetry decides it: a writer silently
altering a real legal proposition is far more costly than some stiff prose. No
writer working at speed can be relied on to sort the quotations from the
paraphrases correctly, and the failure is invisible when it happens.

**This is a decision, not an oversight.** A later pass, with someone competent to
say which rule blocks are authored and which are quoted, could reasonably unfreeze
the authored ones and bring them down to grade 9. Until that review happens, the
freeze applies to all of them. Do not rediscover this as a surprise and do not
relax it unilaterally.

## The glossary

`content/glossary.json` defines 189 terms at three depths — `gloss` (one plain
line), `intermediate`, and `advanced`. It is maintained separately; do not edit
it. Two consequences for you:

- Your in-lesson gloss on first use should agree with the glossary's `gloss` —
  its **claim**, not its wording. Requiring the exact string would make the prose
  stilted at the point where it most needs to flow. If you find yourself making a
  *different claim* about what the term means, one of you is wrong; go and find
  out which.
- The `advanced` fields are *deliberately* hard and are out of scope for the
  reading-level work. Difficulty there is the feature.

## Do not delete an `anchor` key

Some sections carry a key that has nothing to do with the prose:

```json
{ "h": "How sure the court has to be", "anchor": "fig-l-courts-0", "body": [ ... ] }
```

It marks where a figure — a table, chart or diagram — belongs. The figures are
placed by a separate pass that matches on `anchor` first and on heading keywords
only as a fallback, which is what lets you rewrite a heading freely without the
figure sliding into the wrong section.

**Edit `h` and `body` however the reader is best served. Never drop the `anchor`
key.** The usual way it gets lost is a writer rebuilding a section object from
scratch instead of editing it in place. If a figure genuinely belongs somewhere
else, move the `anchor` key to that section — that is exactly how to ask for it
to be moved.

## Quiz questions

- Question and options in the same plain register as the prose.
- Wrong options must be *plausibly* wrong — the mistake a real learner makes,
  not a joke. A distractor nobody would pick teaches nothing.
- `why` explains why the right answer is right **and** names the trap.
- `answer` is the zero-based index into `options`. Get this wrong and the app
  marks a correct answer wrong forever.

## Cards

`front` is a question, not a topic. `back` is the shortest correct answer — one
or two sentences. If the back needs three sentences it is two cards.

Every card must be planted by exactly one lesson (`plants`), and every problem
prepared by at least one (`prepares`). The checker enforces this.

## Non-negotiables the checker enforces

Run this before you finish; it must print `content is consistent`:

```
python3 tools/check-content.py
```

- Every `id` is globally unique across cards, problems and lessons — **review
  history is keyed to it**, so never reuse or renumber an existing id.
- Rubric marks sum exactly to the problem's `marks`.
- Rubric `band` ∈ issue, rule, application, method, conclusion.
- Every `rule` block has a `source`; every lesson and problem has `verify`.
- Quiz `answer` points at a real option; options are unique; ≥ 2 options.
- `reading[].bookId` exists in `books.json`.
