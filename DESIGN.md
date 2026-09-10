# Warta — the design system

Named for the *Warta Kerajaan*, the gazette in which Malaysian statutes are
published. The app is set like a statute reprint, so it is named for the thing
that does the reprinting.

This document states the rules. `npm run check` enforces them. Where the two
disagree, the checker is right and this document is stale — say so.

---

## 1. What the app looks like, and why

A page of this app should read as a **reprint of a statute**: marginal section
numbers in a left column, a narrow measure, hairline rules that carry structure
instead of decorating it, and almost no colour. Emphasis is achieved the way a
printed page achieves it — with weight, space and rules — and colour is held
back for the few things that genuinely need to be seen at a glance.

Two typefaces, and the split between them is load-bearing:

| | | |
|---|---|---|
| **Spectral** | `--font-serif` | the material: prose, rules, card faces, quiz questions, anything read *for meaning* |
| **IBM Plex Sans** | `--font-sans` | the apparatus: labels, counts, navigation, state, buttons |

A reader should be able to tell without reading whether a line is the law or the
machinery around it.

### The mark

The house mark is **ST's Chambers' registry chop** — the impression a court stamp
leaves on a filed document. ST for Shen Ting; *chambering* for the year a
Malaysian law graduate spends reading in a real set before being called to the
Bar.

It replaced a pair of scales in a ring, and it changed the rule that went with
it. The scales were **one geometry at three sizes**. The chop **contains its own
name**, and a word has a legibility floor a drawing does not — so it is
**three cuts, chosen by size**:

| cut | from | carries | where |
|---|---|---|---|
| full | 110px | border, initials, rule, `CHAMBERS` | share cards, print |
| medium | 32px | border, initials, rule | `.wordmark` in `Rail.jsx`, `.levelup-crest` |
| minimal | below 32px | border, initials | `public/favicon.svg` and the four PNG icons |

**110px is arithmetic, not taste.** The word is 10 units on a 100-unit box, so it
renders at a tenth of the mark's width: `11px × (100 ÷ 10) = 110px`. At a 32px
favicon that word lands at 3.2px. This is §3's SVG ratio trap appearing in the
identity itself, and it is the whole reason there are three cuts.

The mark is **ink only**. Gold means earned (§2.2) and a logo has earned nothing
— the gold on the level-up crest is legitimate because a rank is earned, and the
gold in the favicon is the app-icon ground the palette drift check pins.

If the drawing changes, it changes in all three cuts.

---

## 2. Colour

### 2.1 Four hues, and no more

Each carries exactly one meaning. Two roles may share a hue only if they share a
meaning.

| hue | role | means |
|---|---|---|
| navy | `--text-*`, `--action-primary` | authority, structure, the text itself |
| green | `--signal-correct*` | good standing: correct, cleared, settled, the law as it stands |
| red | `--signal-wrong*` | correction: wrong, overruled, out of time, do not rely on this |
| gold | `--signal-mastery*` | **earned mastery, and nothing else** |

The green/red pair is the law-report flag convention — a green flag means a
proposition is still good law, a red flag means it is not — and this app uses it
for the same thing.

### 2.2 Gold is reserved

`--signal-mastery` marks something **the learner has actually finished**: a seal
struck, a rank crossed, an XP milestone, a module completed. It is not an
emphasis colour, not a highlight, not a decoration, and not a mid-tier grade. A
55% mark is not something earned.

If you want a drawing to point at something, use `--figure-accent`. That is what
it is for.

### 2.2a Open contradiction: a live streak is coloured like a mistake

`.meter.is-live`, `.hud-streak.is-blaze` and `.combo-pill.is-blaze` all paint a
**running streak** in `--signal-wrong-text`. §2.1 says red means correction —
wrong, overruled, out of time, do not rely on this. A streak someone is
currently keeping is the opposite of all four.

This is pre-existing, not introduced by the field or the layout work, and it is
recorded here rather than fixed because the fix is a judgement about the game
layer's voice, not a defect with one right answer. The heat metaphor is
deliberate: a streak is "on fire", and red is what that idiom looks like.

What the rest of this document would prescribe: **`--state-attention`**, per
§2.6 — ink rather than a fifth hue, for something to notice where nothing has
gone wrong. The non-colour cue already exists in both places (the flame is lit
or unlit; the combo pill appears or does not), so nothing is lost by dropping
the hue. Against that: it is the app's most celebratory moment, and ink may
read as flat where the point is excitement. `--signal-mastery` is **not** the
answer — §2.2, gold is for something finished, and a streak is by definition
still running.

`tools/design-lint.py` cannot see this. Rule 9 reads selector names for state
words, and none of `is-live`, `is-blaze` says "due" or "wrong" — which is the
limitation §4 already warns about, showing up in practice.

### 2.3 A fifth hue was considered and rejected

The obvious gap is "caution" — a state between correct and wrong. It was
rejected on two grounds. Geometrically it would have to sit between red (28°)
and gold (83°), the one stretch of this wheel where a new hue is hardest to
tell from its neighbours and hardest of all under protanopia. Pedagogically,
Mayer's coherence principle says that in material built for learning, every
extra colour is extra processing that is not about the law.

The state that wanted it — "due for review" — did not need a colour at all. See
§2.6.

### 2.4 Contrast floors

Body text is held to **WCAG AAA (7:1)**, not the AA 4.5:1 floor. The readership
includes children and adults returning to study after a long time away, reading
dense statutory material on whatever screen they have. Body copy is the one
thing that must never be the hard part.

| role | floor | why |
|---|---|---|
| `--text-primary`, `--text-strong` | 7:1 | the reading surface |
| `--text-secondary` | 5:1 | metadata, hints, captions |
| `--signal-*-text` | 4.5:1 | verdicts and labels, as words |
| `--signal-*`, `--border-strong`, `--viz-series-*` | 3:1 | WCAG 1.4.11 — non-text that carries information |

**A meter track is information, not decoration.** An empty bar and a full one
differ only by that line, so every track uses `--border-strong`, never
`--border-hairline`.

### 2.5 The verdict pair must survive colour blindness

This is the constraint the whole palette is built around.

Every quiz, every review card and every marked problem answers a learner in
green and red. At the pre-Warta values those two sat at **near-identical OKLab
lightness** (0.496 and 0.484), so once dichromacy flattened the hue there was
nothing left to tell them apart — around 1 in 12 men could not read the app's
primary feedback channel.

Dichromacy destroys hue but leaves **lightness** intact. So the four signals are
spaced roughly 0.12 apart down the lightness axis *first*, and given their hue
*second*. Wrong sits below correct: a red flag is the heavier mark in a law
report, and the heavier mark is the darker one.

`tools/palette.py` verifies this on every run — all signal pairs and all chart
series pairs, under protanopia, deuteranopia and tritanopia (Machado et al.
2009), in both themes, plus an explicit lightness-separation floor on the
verdict pair specifically.

### 2.6 Colour is never the only cue

A learner who cannot separate green from red must still be able to read the app.
So every colour-coded state carries a second, non-colour cue:

- a right/wrong answer gets a tick or a cross **and** a 2px border **and** a fill;
- a caution block gets a bold uppercase `CAUTION` label as well as a red marker;
- a chart series gets a direct label or a dash pattern;
- **work due today is not coloured at all.** It is set in the heaviest ink on
  the page and made semibold. Colouring a daily queue the same red as a wrong
  answer makes an ordinary morning look like a page of mistakes — and it spends
  a signal colour on a state that is an invitation, not a correction.

**A number without its unit is not a label.** A badged navigation link computed
its accessible name as "Modules 186". A sighted reader has the rail around it;
a listener gets the name and nothing else, and 186 could be anything. Badged
links now name their unit — "Modules, 186 due", "Lessons, 55 unread".

The trap in fixing that is worse than the bug. **An `aria-label` on a control
that needs no name breaks voice control**: it overrides the visible text, so a
user who says "Quizzes" gets no response, and the name still *sounds* right to
anyone testing with a screen reader. So the label is set only where a count
exists and is non-zero; everywhere else the attribute is absent and the visible
text stands. Never label a control whose visible text is already its name.

**A 12% tint is not a signal.** `--fill-correct` and `--fill-wrong` are ΔE 0.024
apart in *normal* vision — barely the just-noticeable difference — and 0.014
under deuteranopia. They are reinforcement for a border and a glyph that are
already doing the work, never the thing that carries the verdict. If a shape's
correct/wrong state rests on its fill, it is not encoded at all.

**Attention is not a verdict.** For something to notice where nothing has gone
wrong — a due count, a pip on an outstanding module, an unread marker — use
`--state-attention`. It is ink, not a fifth hue, because at pip sizes salience
is contrast rather than colour: a 6px dot in `--state-attention` is 17.8:1 on
light and 15.9:1 on dark, against 8.7:1 and 3.6:1 for the same dot in the
verdict red. The honest colour is also the louder one.

### 2.7 Chart series are not signals

`--viz-series-1..3` are a separate family. A series is an *identity*, not a
verdict, and a green line would be read as the right answer. **Three is the
cap** — past three, facet the chart or use a table.

### 2.8 Rehearsal is quieter than performance

A guided problem is a demonstration the learner takes part in, not an attempt
they are judged on. Someone who scores 8/8 on one has shown they can *follow* a
correct argument, which is a different thing from constructing one — and a
learner studying alone has no external correction for that mistake.

So `.rehearsal` is subordinate by construction, using no colour at all:

- **sunk, not raised** — everything that counts in this app is lifted off the
  page; a rehearsal is recessed below it;
- **dashed rules** — a dashed line already means "not the real thing" here: it
  is how a seal's unearned inner ring is drawn;
- **its score is never a signal colour** — it reports, it does not congratulate;
- **it says "Rehearsal"** — for anyone who reads none of the above.

The styling cannot carry this alone. If a rehearsal awards the same XP and the
same seals as a real problem, the mechanics say *achievement* louder than the
design says *practice*, and the mechanics win.

**Quiet about achievement is not vague about correctness.** These are different
things and the distinction matters. A rehearsal or a checkpoint must not claim
the learner has *accomplished* something they have not — so no verdict colours,
no celebration. But it must still tell them plainly whether they were right,
in words: for retrieval practice, unambiguous feedback is the active
ingredient, and a reader who finishes unsure whether they knew it has done the
work and lost the benefit. Colour stays reinforcement; the words carry the
signal. Same shape as the `CAUTION` label.

### 2.9 Module identity, and the limit of colour

Twenty-four modules, one colour each: orientation ("I am in Property, not
Contract") and a retrieval cue, which is a real effect — consistent context at
encoding and retrieval aids recall.

**It is reinforcement, never an identifier.** Measured before it was designed:

| scheme | worst pair, under CVD |
|---|---|
| 16 hues evenly round the wheel | ΔE **0.002** (deuteranopia) — and the set is 24 now, which is worse |
| 4 bands × 4 lightness steps | ΔE 0.021 |
| the best 4 hues obtainable, searched | ΔE 0.067 |

The identifier floor is 0.10. Sixteen categories is far past what colour can
carry — and so is four, because tritanopia collapses the blue/teal pair wherever
you put it. So the module's **name is on screen every time its colour is**. The
colour helps readers who can see it and costs nothing to readers who cannot.

**Never build anything where colour is the only thing telling two modules
apart** — no unlabelled colour-coded map, no legend-free chart keyed on module.

What *is* guaranteed, and checked every run: body text on the softest tint stays
at 12.8:1 (light) / 12.0:1 (dark); module ink clears 4.5:1 on every surface; and
**consecutive** modules differ by ΔE 0.14+, so a listing reads as varied rather
than as a gradient. Hue advances by a stride co-prime with 16, putting
neighbours ~112° apart. Lightness is constant across all sixteen — no module
outranks another.

Usage is one attribute; the 16 mappings are generated from the real module ids:

```html
<article data-module={lesson.moduleId}>   <!-- --module-tint / --module-ink -->
```

### 2.10 Block fills mark structure

A lesson is a long column. Until these existed, every paragraph, example and
list in it looked identical, and a reader could not see the shape of what they
were about to read. **Block type is the lesson's structure**, so marking it is
signalling rather than decoration — the one kind of colour the evidence says
helps rather than costs.

```
--block-rule-fill  --block-caution-fill  --block-example-fill
--block-predict-fill  --block-checkpoint-fill
```

Every fill is verified to leave body text at 10–13:1, well above AAA. They are
faint deliberately, and deepening them is the change to resist: these sit behind
dense material read for long stretches by people who are often tired and often
on a phone at night. A saturated block would be worse than the monochrome it
replaced.

Two of them carry a further rule. **`predict` has no verdict colour anywhere** —
it asks for an answer before the rule is shown, and being wrong is the mechanism
working, not the reader failing; if the reveal turns green or red, productive
failure becomes ordinary failure. **`checkpoint`** may be answered, but its
result uses the `.rehearsal` treatment, not the verdict colours: it is practice
inside the reading, not an assessment of it.

### 2.11 Restraint is not monochrome

The rest of this document argues for holding colour back, and that argument was
taken too far. Applied across 55 lessons it produced a wall of near-black column
that a twelve-year-old, or an adult studying after a shift, has to scroll for a
long time to see any change in.

The coherence principle rules out **decoration**. It never argued for
monochrome. Every colour in §2.9 and §2.10 encodes something — which module you
are in, what kind of block you are reading — and that is the test to apply to
the next one: if you cannot say what a colour *means*, it does not go in; if you
can, restraint is not a reason to leave it out.

### 2.12 The liquid field

The field is the large, slow, coloured shape behind the page. It is the biggest
visual object in the app and the one most likely to be mistaken for decoration,
so it is worth being exact about what it is.

**What it means.** The field is painted in **module colour**, and it says which
part of the curriculum you are standing in. On a module or lesson page it
narrows to that module's `--module-ink`; elsewhere it is the spread across all
sixteen. That is §2.9's orientation cue, at page scale rather than chip scale —
the same claim, in the one place a reader's eye goes before they have read a
word.

**What it does not mean.** It carries **no quantity**. Nothing about a blob's
size, position or speed encodes progress, due counts, accuracy or difficulty,
and nothing may be added that does. A slow-moving shape is unreadable as a
number, so a field that tried to be a chart would be a chart nobody can read —
and §2.9 already forbids anything where colour is the only thing telling two
modules apart. The field is where you are. The figures are on Progress.

**Why it does not touch contrast.** Body text is held to AAA (§2.4), and the
field is a moving coloured surface, which sounds like the end of that. The two
are compatible because **text is never composited against the field at all**:
a long read sits on `.sheet`, an opaque `--surface-page` ground, and the field
stays in the margins around it. The safety comes from the occlusion, not from a
low alpha — an alpha is a number someone can talk themselves into raising, and
`--liquid-alpha-*` is a ceiling reached by eye, not a contrast guarantee. If you
ever find text sitting directly on the field, that is the bug; do not fix it by
fading the field.

**What it costs.** The ambient orbs are radial gradients that animate
`transform` only, so they are compositor work and effectively free. The gooey
metaball layer is not free — it is a full-viewport SVG filter — and it is
therefore **desktop-only, from 1024px up**. This readership is phone-first in
Malaysia, often on low-end Android and prepaid data, and the phone is exactly
the device that cannot afford it. Nothing in the field may become a per-frame
JavaScript animation.

All of it is CSS animation, which means `prefers-reduced-motion` already stops
it through the global rule in `base.css` — see the note there about why that
rule alone is not enough for the rest of the app. Measured rather than assumed:
with the preference set, `document.getAnimations()` returns 0 on a page that
otherwise runs 11. If a future version of this layer reaches for framer-motion
or JavaScript, that stops being true silently and it needs its own switch.

**`aria-hidden="true"` on the field is load-bearing twice over.** The obvious
reason is that a screen reader must not meet six decorative spans. The second
is that `tools/responsive.mjs` uses it: the field is `overflow: hidden` with
orbs deliberately overflowing it — that overflow is what makes it full-bleed —
so a clipping check that only asks "is this element clipped" reports the field
as broken at every width and every route. The rule was tightened to require an
element to carry text or a control, and not sit inside `[aria-hidden]`, before
its clipping counts. Drop the attribute and 54 false failures come back.

Worth knowing that this trap caught two people independently before either
noticed: a sweep across 8 widths x 7 routes returned 56 "overflow" hits, all of
them orbs, while `scrollWidth === clientWidth` at every width from 360 to 2560.
Nothing was overflowing. The lesson generalises past this file — **measure
clipping that costs a reader something, not clipped-ness.**

### 2.13 The Arena's clock, and why it needs no adjustment

The Arena is ninety seconds and three lives. That is a time limit, so **WCAG
2.2.1 Timing Adjustable** applies, and the position on the record is that it
passes under the **essential exception**: the limit is the thing being
exercised, and extending it would invalidate the activity. The Arena's own copy
makes the argument — *"recognition against a clock, which is a real skill and
not the same skill as recall."*

Two facts are what make that exception honest rather than convenient, and they
are the things to protect:

1. **Nothing is locked behind the clock.** Arena questions come from the same
   catalogue pool that quizzes and review serve untimed, so every item is
   reachable without ever entering a timed mode. This is the load-bearing one:
   if content is ever gated behind the Arena, the exception fails and the mode
   needs adjust, extend or turn-off.
2. **It is walled off from progress** — *"Nothing here touches the review
   schedule."*

"A right answer buys two seconds back" is a **gameplay extension, not a
conforming one**, and must not be cited as the adjustment 2.2.1 asks for.

Still outstanding, and a genuine gap rather than an exempted one: **the
countdown is not announced.** `.ring-label` is exposed to assistive technology
but it is plain text updating every second inside no live region, so a screen
reader user is never told time is running out. Announcing every second is
unusable; the shape that works is a polite announcement at thresholds only —
30s, 10s, and the last five — from a small dedicated live region, with the
numeral itself left silent.

---

## 2A. Layout: the pane and the column

These are two different things, and treating them as one is what made the app
look, on a 1920px screen, like a phone layout someone had stretched.

`--measure` (68ch) is a rule about **a line of type**. It was also, until
recently, the only rule about **the page**: every route rendered `.wrap`, which
capped content at 68ch and left it at flex-start, so a wide screen got a 660px
strip against the left edge and a thousand pixels of nothing beside it.

| | |
|---|---|
| `.wrap` | a column of prose. 68ch, centred. The measure is unchanged and stays unchanged. |
| `.wrap--dash` | an index or dashboard pane. `--pane-dash`, centred. Rows, grids and cards have no reading measure and should use the width. |
| `.wrap--wide` | the middle width, `--measure-wide`, centred. |
| `.sheet` | the opaque ground a prose column sits on, over the field. See §2.12. |
| `--shell-max` | the app stops growing at 1792px. Past that the screen grows and the app does not, which is the only honest thing to do with a 34-inch monitor. |

**Centred, not left-aligned.** A reader's eye returns to the same place on every
line and every page, and a column pinned to one edge of a wide screen makes the
whole app read as though it is falling over.

**Six breakpoints, not one.** There was exactly one, at 780px, which gave the
app two designs: phone, and everything else — so a laptop, a 1440 desktop and a
34-inch monitor all got the 781px layout, and the wider the screen the worse it
looked. The ladder is ≤600, 601–780, 781–1023, 1024+, 1440+, 1800+, and it is
written in `base.css` with a note on what each state is for. Only states that
need a declaration have one: a breakpoint that changes nothing is a breakpoint
that will confuse the next person to read the file.

---

## 3. Tokens

Three tiers. **Components may only use tier 2 and tier 3.**

1. **Primitives** — `--w-*` in `src/styles/palette.css`. Generated, verified,
   and **private**. Referencing one outside that file is a lint failure: it
   means the semantic role no longer describes what the app does.
2. **Semantic roles** — also `palette.css`. What a colour is *for*.
3. **Scales** — `src/styles/tokens.css`. Space, type, line, radius, shadow,
   motion, measure.

### Colour roles

```
--surface-page --surface-raised --surface-sunk
--text-strong --text-primary --text-secondary --text-inverse
--border-hairline --border-strong --border-active
--signal-correct  --signal-correct-text
--signal-wrong    --signal-wrong-text
--signal-mastery  --signal-mastery-text
--fill-correct --fill-wrong --fill-mastery
--viz-series-1 --viz-series-2 --viz-series-3
--figure-ink --figure-accent --figure-wash
--focus-ring --action-primary --action-on-primary --scrim
```

**Plain vs `-text` is not politeness.** The plain `--signal-*` are tuned for
borders, rings and fills at 3:1. They do **not** clear 4.5:1 as body text. Use
the `-text` variant for words, the plain one for shapes.

WCAG counts text at 24px+ as large and lets it pass at 3:1, so a plain signal on
a big display numeral is technically legal. This app uses the `-text` variant
there anyway: a number on the progress page is read, not glanced at, and this
readership is the whole reason the palette targets AAA for things people read.
Icons and pips that carry state — life counters, dots — are non-text and
correctly take the plain signal.

### Scales

| | |
|---|---|
| type | `--type-2xs` 11px · `xs` 12 · `sm` 13 · `base` 15 · `body` 18 · `lg` 21 · `xl` 26 · `2xl` 32 · `3xl` 40 |
| leading | `--leading-tight` 1.15 · `snug` 1.35 · `base` 1.5 · `prose` 1.65 |
| weight | `--weight-regular/medium/semi/bold` |
| space | `--space-1..9` — a 4px grid: 4, 8, 12, 16, 24, 32, 48, 64, 96 |
| radius | `--radius-sm` 2px · `md` 4 · `lg` 8 · `pill` · `circle` |
| line | `--line-hairline` 1px separates · `--line-marker` 3px means something |
| shadow | `--shadow-pop` · `overlay` · `modal` |
| motion | `--ease-out` (house curve) · `--ease-in-out` · `--dur-instant/quick/base/slow` |
| measure | `--measure` 68ch · `--measure-narrow` · `--measure-wide` · `--rail-width` · `--margin-num` |
| pane | `--pane-dash` 78rem · `--shell-max` 112rem · `--pane-pad` (fluid `clamp`) — see §2A |
| field | `--liquid-alpha-deep/-mid/-soft` · `--liquid-orb-lg/-md/-sm` · `--dur-drift-1..4` — see §2.12 |

### Type floor

**Nothing renders below 11px**, and 11px (`--type-2xs`) is for **short uppercase
labels only**. The smallest size allowed to be a sentence is `--type-xs` (12px).
Twelve places in the pre-Warta CSS were under that floor.

**SVG is the trap.** An SVG `font-size` in viewBox units is a *ratio*, not a
size — a 10-unit label in a 760-wide viewBox rendered at 700px is 9.2px. Check
the floor at the **narrowest rendered width**, not the design width:

```
min_units = floor_px × (viewBox_width / min_rendered_px)
```

and pin `min_rendered_px` with a `min-width` on the figure inside its
`overflow-x: auto` box, so the floor is guaranteed rather than hoped for. The
lint cannot catch this one; it stays a human rule.

### Tap targets

Every control clears **44 × 44 CSS px** (`--tap-min`), WCAG 2.5.5. Not an
aspiration here: the audience is phone-first and includes children, whose
finger-to-target accuracy is worse than an adult's, and tired readers on a
train.

A control may still *look* small — pad it out with `min-height` rather than
growing the ink. Things that look like controls but are not (the `.quiz-key`
legend showing which key to press) must be excluded explicitly, or every option
row grows 44px for nothing.

**A list of links is not prose.** WCAG exempts links inline in a sentence,
because a target inside a line cannot be padded without wrecking the line. A
comma-separated run of cross-references — "See also X, Y, Z" — is a row of
controls wearing prose clothing and gets no exemption. Use `.taplink` in a
`.taplink-row`: it makes them real targets and, incidentally, makes them look
pressable, which a comma-separated underline never did.

**The exemption's trap.** A control that *is* a word in a sentence is exempt —
and `min-height` on it does harm, not nothing. An inline-block contributes its
height to the **line box**, so a 44px floor inside prose makes every line
containing one about half again as tall as its neighbours: ragged leading across
the whole reading surface, from a fix that could never have helped, because
width was what was under the floor and `min-height` cannot touch width. Inline
controls take `.tap-exempt`.

One more trap, found the hard way. The audit that "confirmed" the terms were
44px tall was reading a height that the 44px declaration had itself produced —
a number your own CSS generated is not independent evidence that the CSS is
right. Where a measurement and a declaration agree, check that the measurement
could have disagreed. And a declaration that *cannot* fix the thing it was
added for — `min-height` against a width failure — is the first clue that
something is wrong, before any measurement at all.

Auditing this needs care in both directions. A sweep by bounding box **over**counts
(it flags legends like `.quiz-key`) and **under**counts (a `min-height` fix leaves
targets that are thin in the *other* dimension). Filter to focusable elements and
check both dimensions.

### Elevation

A reprint is flat. Shadow is only for things that genuinely float above the page
and must be dismissed: toasts, popovers, modals. **Cards use a border, never a
shadow.**

---

## 4. Working in this repo

### The rules, short

1. No raw hex outside `palette.css`. No `--w-*` primitive outside `palette.css`.
2. Gold means earned.
3. Nothing below 11px; 11px is uppercase labels only.
4. Colour is never the only cue.
5. If you need a value that has no token, **the token is what is missing.** Ask
   for it; do not inline it.

### Checking

```
npm run check           # everything
npm run check:design    # palette + lint only
python3 tools/palette.py --report    # the full contrast and CVD table
```

`tools/palette.py` verifies contrast and colour-blind separation and **generates
`palette.css`**. That file is a build product — never hand-edit it:

```
python3 tools/palette.py --emit
```

**A browser gate that fails on a *transport* error should be re-run before it is
believed.** Three distinct faces of the same hazard, all seen in one day, none
of them a defect in the app:

| symptom | cause |
|---|---|
| `ERR_FAILED` / "Failed to fetch dynamically imported module" | a rebuild landed mid-run; `index.html` names chunk hashes that no longer exist |
| a fix that "did not take" | `smoke` and `responsive` serve `dist`, so a source or content fix untested until you rebuild |
| `ERR_CONNECTION_REFUSED` on the harness's own port | another session's run holds 4178/4179; the preview never came up |

All three read exactly like real failures, and the first two read like *your*
failure specifically. Re-run once before investigating. If it passes unchanged
with no edit in between, it was contention.

**The underlying fact: `dist/` and the harness ports are shared mutable state**,
and this repo is routinely worked by several sessions at once.

**A red `check:smoke` naming `ERR_FAILED` on a dynamic import should be re-run
before it is believed.** `dist/` is shared mutable state, and this repo is
routinely worked by several sessions at once. When one rebuilds while another's
smoke run is serving `dist/`, `index.html` points at chunk hashes that no longer
exist and the later routes fail with "Failed to fetch dynamically imported
module" — which reads exactly like a genuinely broken code split. Observed: two
failures in a row, then a pass on the third run with no edit in between, chunks
on disk throughout. `smoke.mjs` documents this race in its own header and
refuses a stale dist, but it cannot see a build that lands mid-run. The cost of
not knowing this is two people hunting the same defect that is not there.

**IndexedDB is scoped per origin, and an origin includes the port.** Vite
silently takes the next free port when 5173 is busy, so restarting a dev server
and refreshing can land you on a different origin with an empty database. That
is indistinguishable from a wipe: no XP, every gated lesson locked again, all
progress apparently gone. It was reported once as data loss and it was not —
the write path is sound, and a hydration failure would surface as "Could not
start." rather than as an empty state. Check the port before believing a wipe.

`strictPort` would make this fail loudly instead of moving, which is the right
behaviour for one developer and the wrong one while several sessions each need
a dev server. It is deliberately not set; if this repo ever goes back to a
single worker, set it.

### The dev server does not serve your source at `/`

**Open `http://localhost:5173/app/`, not `/`.** Measured on a running dev
server: `/` returns `src="./assets/index-CPrdMOTH.js"`, `/app/` returns
`src="/src/main.jsx"`.

The reason is deliberate and is in `vite.config.js`'s own comment. GitHub Pages
publishes this branch's root, so the root must hold the **built** site —
`index.html` plus `assets/` are committed build artifacts. The build entry
therefore moved to `app/index.html` (`rollupOptions.input`), but Vite's **root
deliberately stayed at the repository root**, because moving it broke
`tools/diagram-cases.mjs`, which fetches `/tools/fixtures/…` from the dev
server. Only the entry moved.

The consequence is not in that comment: `npx vite` serves the repository root,
so `/` is the committed bundle. **Every edit under `src/` is invisible at `/`
until someone rebuilds and commits.** It cost one session an hour of chasing a
figure width, because its calibration compared a fixture reading live source
against an app page reading a stale bundle — two pages executing different code,
which looks exactly like a layout bug.

**And getting the path wrong does not fail — it silently serves the stale
bundle.** Vite's history fallback answers *any* unmatched path with the root
`index.html`, which here is the committed build artifact. Measured:

| requested | status | serves |
|---|---|---|
| `/app/` | 200 | `/src/main.jsx` — live source |
| `/aap/` (typo) | 200 | `/assets/index-*.js` — the bundle |
| `/nonsense/deep/path` | 200 | the bundle |
| `/typo-entry.html` | 200 | the bundle |

So a typo in an entry path, the entry moving again — it moved once already —
or anyone hand-typing `localhost:5173` produces a page that **boots perfectly,
renders the whole app, and is last week's code.** No error, no blank screen, no
404. The only symptom is numbers that are quietly about different source.

This is why **a "did the app boot" check cannot detect it**: the fallback boots
fine. Anything verifying it is looking at live source must assert on
`document.scripts` — that `/src/main.jsx` was actually loaded — not on the app
having mounted.

`smoke` and `responsive` are unaffected: they build and serve `dist`. It is the
person eyeballing the dev server who is misled, which makes this worse than a
broken gate rather than better.

**Both gates serve `dist`, so a dev-only defect is outside the measured set.**
`smoke.mjs` and `responsive.mjs` each build and serve production output. That is
right for what they check, and it means **the server a person actually reads the
app in is the one nothing tests** — and under `<StrictMode>` dev and production
genuinely execute differently.

That is not hypothetical. Glossary term linking was **completely dead in `npm run
dev` and perfect in `dist`**: `tokenise` mutated a shared `seen` set during
render, StrictMode's double-invoke ran it twice, the first pass claimed every
term and the second found them all taken. An impure render — exactly what the
double-invoke exists to surface. It surfaced it for months and nobody was
looking.

The reason it survived being *looked at* is worth more than the fix: this app's
dev server was opened and screenshotted many times on the day the terms were
added, with zero underlines on screen, and nobody noticed — because **the
absence of a feature you are not expecting is invisible.** A missing thing has
no shape. Check a new feature against a stated expected count, in the
environment a reader uses, or its absence reads as a clean page.

**Every browser result in this repo is a Chrome result.** `tools/smoke.mjs` and
`tools/responsive.mjs` both drive system Chrome through `playwright-core`, and
the installed browser set is Chromium only — no WebKit, no Gecko. That is a
caveat on the whole of the accessibility and layout verification, not on one
finding, and it bites hardest on the results that came back *clean*, which are
the ones most likely to be quietly wrong on another engine.

One known instance, rather than a hypothetical: diagram scroll containers
(`.dia-body`, `.table-wrap`) are keyboard-reachable in Chrome only because
Chrome implements keyboard-focusable scrollers. **WebKit does not**, so on iOS
Safari — a real share of this readership — those figures are likely already
unreachable by keyboard, and no gate here can see it. Markup fixes them for
every engine: `tabindex="0"`, `role="group"`, and an `aria-label` naming the
figure.

`safaridriver` exists at `/System/Cryptexes/App/usr/bin/safaridriver` and needs
Safari Settings → Developer → Allow Remote Automation, which is a person's
decision to make, not an agent's.

### Measure the thing, not the thing next to it

Eleven times in one day, across five sessions, someone drew a confident
conclusion from a measurement that succeeded against an object adjacent to the
target. Every one passed its own checks; none was caught by a gate. They are
collected here because the pattern is the finding — the individual bugs are not.

| what was measured | what was meant |
|---|---|
| `.main`'s box, full width | its contents, huddled in a third of it |
| a progression-locked "finish X to open this" stub | the lesson behind it |
| `getComputedStyle` on SVG text — **user units** | rendered pixels |
| decorative orbs clipped by an `aria-hidden` parent | clipping that costs a reader something |
| `.tap-exempt` present on an element | whether the exemption is *correct* |
| a tab traversal resuming mid-document | the whole page's focus order |
| `getAnimations()` on a page whose animations sit on elements | whether the reduced-motion **rule** is complete |
| a word-overlap score on alt text | whether the alt re-encodes the figure |
| label *sizes* clearing the type floor | whether the labels overlap each other |
| a tab traversal wrapping through browser chrome | one cycle of stops, not two |
| **`smoke.mjs` walking two lesson routes** | **the lesson bodies behind the progression gate** |

**The last one is the sharpest, because it is the gate written for this class.**
`tools/smoke.mjs` walked `#/lesson/l-courts` and `#/lesson/l-how-to-study`
without seeding `unlockAll`, so both rendered the progression gate's "finish X
to open this" panel — which mounts, carries a heading, names its controls and
leaks no NaN, so every assertion in the file passed on it. **Those two routes
had never once been checked against a lesson body.** Its own `ROUTES` comment
argues that parameterised routes matter more than the indexes because the
multi-state screens live behind an id, and it then stopped at the single state
the progression system hands a new reader. It now seeds and reloads.

It was found by running a *new* check in sensitised mode — its label test
disabled so every `role="group"` had to fire — expecting four hits and getting
one. **The wrong count was the finding.** So forcing a check to fire validates
more than the assertion: a count that comes back too small is a signal about the
walk, not about the rule.

The last one is the sharpest. **Chrome keeps the sequential-focus navigation
starting point across a same-document navigation**, and this app is hash-routed,
so every route change is same-document. `blur()` does not reset it. A traversal
audit that navigated by hash silently began partway down the page: `#/quiz/…`
reported 5 focus stops against a real 17, `#/settings` 28 against 40. The
navigation succeeded, the page was correct, and the *starting point* was the
wrong object.

Two rules follow, for anything that measures this app in a browser:

1. **`reload()` after navigating, and after seeding.** Under hash routing a
   `goto('#/x')` from another hash never re-runs the provider's init effect, so
   a seeded setting is not read and the focus starting point is not reset. Both
   failures look like results.
2. **Prefer a property of the layout that cannot be faked.**
   `scrollWidth === clientWidth` settles horizontal overflow no matter what any
   attribute says. Where a measurement and a declaration agree, check that the
   measurement *could* have disagreed.

3. **Show the check can fail before believing it passed — and predict the count
   before you look.** A green detector and a broken detector both report zero.
   When the diagram collision check went in, it was first run with its threshold
   inverted to force a hit on every pair — 60 collisions — and only then run
   properly, for 0 at six widths.

   That is the weak version. The strong one: the `role="group"` rule was
   sensitised expecting **4** hits and returned **1**, and the *shortfall* was
   the defect — it is how the `smoke.mjs` blind spot above was found. Firing at
   all only tells you the plumbing is connected. **The number tells you what it
   is connected to**, so a hit count you cannot explain is a finding whether it
   is too low or too high. The control validates the walk, not the assertion.

   **Changing a body size in this app changes the layout.** `--measure` is `68ch`,
   and `ch` scales with the *element's* font-size — so `--type-body` is not only
   a type token. Measured at a 780px viewport, raising it from 17px to 19px took
   `68ch` from 578px to 646px, and the sheet track and every figure container
   built on the measure moved with it, to the pixel. That is the measure doing
   its job — 68ch is ~75 characters at any size — but the pixel consequences are
   invisible from the token, and nothing warns you.

   It surfaced as `check:diagram-cases` failing at 780px and passing at 360px,
   which localises it exactly: below 68ch the viewport binds and the measure
   never does. The first diagnosis blamed a stylesheet edited 27 seconds
   earlier — right deduction, right conclusion (*a container width changed*),
   wrong file, because a fresh mtime is a very persuasive coincidence. It was
   settled by reverting one token and re-running, which is the only move that
   ever settles these.

   **A validator more forgiving than its renderer is not a validator of the
   renderer.** `check-content.py` read a glossary term's cross-references as
   `t.get("see") or []`; `Glossary.jsx` read `t.see.length` unguarded. Two terms
   arrived without the key, the gate passed, and the page threw — which
   unmounted the app, so every route the smoke gate walked *after* the glossary
   reported an empty `#root`. Five failing routes, one cause, and the validator
   green throughout. Both readings were individually correct; the *relation*
   between them was not. The gate now requires the key, and both renderers guard
   with `(t.see || [])`, because a rule stops bad data and a guard stops the
   crash whether or not the rule is still there.

   **A guard whose expected value comes from the thing under test cannot detect
   the thing it exists to detect.** When the diagram calibration's hardcoded
   608px went stale, the obvious patch was to derive the expectation from the
   container being measured — `expect = max(608, inner)`. It was rejected, and
   correctly: that can only verify the SVG obeys its own stylesheet, so a
   fixture container at 420px would still pass. The fix was to calibrate against
   what a *real lesson* renders at each width, which is an independent standard.
   This is the measurement trap one level up — not a check measuring the wrong
   object, a check taking its standard *from* the object.

   A related shape, from the other end: **a check whose failure path has never
   run.** A guard added to `smoke.mjs` referenced a binding declared below it —
   `node --check` passes, and it raises a temporal-dead-zone `ReferenceError`
   only on the rare path the guard exists to make legible. It would have crashed
   on exactly the occasion it was written for, and no number of green runs could
   ever have surfaced it. Exercise the failure path, not just the success one.

4. **A test stream built from the failure you are fixing will not show the
   failure next door.** The Arena's countdown was rewritten from equality tests
   to crossed-below because a dropped frame could take the clock from 31 to 29
   and skip a threshold entirely. It was then verified against a stream built to
   skip thresholds — which it handled — while a *larger* skip, 40 straight to 8,
   announced twice a second apart for one crossing. The fix was correct and its
   test was shaped by the bug it fixed, so the neighbouring bug survived. Build
   at least one case from a direction the fix was not designed for.

**Arithmetic is not a substitute for measuring, even when it is right.** A
`timeline` gap derived as exactly one line box still overlapped by 0.8u, because
a rendered glyph box runs about 1.07× the font size for the ascent alone. A
separate piece of geometry reasoning about `matrix` happened to be right — but
by a 12u margin, large enough to survive being approximately wrong. Use the
arithmetic to decide what to measure; do not file it as the measurement.

### A check that cannot fail

Five times in one evening, across four sessions, an instrument reported and
nobody asked what it would take for it to report something else. Each ran, each
was green or hedging, and none could have said otherwise.

| the instrument | why it could not fail |
|---|---|
| `responsive.mjs`'s dist guard | compared truncated `mtime` against sub-millisecond `mtimeMs` — never equal, so it cried INCONCLUSIVE on **every** run since it was added |
| `Diagram.jsx`'s spectrum crowding fallback | gated on `plan.room`, which `plan` did not carry: `undefined < 110` is false, so the fallback layout was unreachable code |
| `check-statutes.py`'s coverage rule | stopped firing after a tightening — correctly, as it turned out, but silence is what a broken rule and a satisfied rule both look like |
| `check-statutes.py` vs `src/lib/statutes.js` | the gate globbed the directory, the app imported one file, so a batch could gate green and reach no reader |
| `diagram-cases.mjs`'s calibration | while `.dia-svg` had `min-width: 38rem`, the fixture and the app both rendered 608px **regardless of their containers** — two numbers equal for a reason unrelated to the thing being calibrated |

The last is the worst variant and the one worth studying. The others were mute.
That one **fired correctly on every run, on evidence that meant nothing.** The
fixture had never been the width the app gives a figure — its chain has no
`.main`, so `.sheet`'s `margin-inline: -16px` bled against `body` and *added*
16px a side where the app's cancels a gutter, 334px against 302px. The pin hid
a 32px disagreement by overriding both sides with the same constant.

Removing the pin did not break the calibration. **It made it capable of
failing, and it failed immediately.**

**A mute check and a confidently wrong one are not the same failure.** A check
that can never fire wastes the effort of writing it. A check that fires
confidently on meaningless evidence *spends* trust: every green calibration run
made the fixture look verified, so nobody re-derived it, and a 32px
disagreement between the fixture and the app survived for a day behind a row of
passes. The mute ones cost nothing but their own authorship. This kind is
load-bearing in everyone's confidence, which is why it survives longest.

The sixth instance is the proof. `responsive.mjs`'s guard reported INCONCLUSIVE
on every run, so `npm run check` exited 0 through it all evening — and it was
covering a live WCAG 4.1.3 failure at six widths, where advancing a lesson
section left focus on `body` and announced nothing. Replacing the guard with a
dist-content fingerprint turned the chain red within one run. The chain had not
been green; it had been unable to say otherwise.

So the question to ask of a green check is not "did it pass". It is:

> **What would have to be true for this to report something else?**

If there is no answer, the check is decoration, and a decoration is worse than
no check because it is load-bearing in everyone's confidence.

**Three habits that came out of the same evening.** Force the failure before
trusting the rule — site-59 forced five, including a negative control, because
the risk when closing a quiet-failure hole is over-firing, and a rule that
over-fires gets switched off. When a rule stops firing, find out why rather
than filing it as resolved; site-59 listed every Penal Code entry and found the
*content* had moved, not the rule. And prefer an assertion that cannot be
satisfied by accident: one CSS pixel per unit needs no pin, so
`fontSize={15}` is 15px by construction and there is no constant in two files
to drift.

### Green and invisible: when the gate sees content the app does not

Twice in one session, in two different content tiers, a batch of authored
content passed its gate and reached no reader at all. The shape is identical
both times:

| | |
|---|---|
| `tools/check-statutes.py:78` | globs `content/statutes/*.json` |
| `src/lib/statutes.js` (before the fix) | imported `core.json`, alone |

The checker walks the directory, so a new `stage3.json` gates itself the moment
it lands and reports a rising count. The app imports one file, so the same
entries render for nobody. Both halves are working correctly and they disagree,
and the half that speaks — the one that prints `OK — 13 provisions across 9
Acts` — is the half that is wrong about what a reader will see.

`content/extracts/` had the same defect earlier the same day: a peer's batch was
gated green and sat invisible for a day while they waited on a publish they
believed had already happened.

**Neither was a mistake when it was written.** The library imported one file
because there *was* one file. It stopped being true when the tier grew to two,
and nothing in the repo was watching for that moment. This is why it is worth a
section rather than two bug fixes: the next tier will be written the same way,
one file, correct on the day, and will inherit it.

Both libraries now glob:

```js
const modules = import.meta.glob('../../content/statutes/*.json', { eager: true });
const statutes = Object.keys(modules).sort()
  .flatMap((path) => modules[path].default ?? modules[path]);
```

**Adding a content tier?** Glob the directory in the library on day one, while
there is one file and it makes no difference. And when a gate reports a count,
the count is the gate's, not the app's — to know what a reader sees, ask the
app.

**Sorting by path is a second, quieter version of the same trap.** Path order
means a `stage5.json` or a rename silently reorders content that was written as
a sequence. `content/extracts/` carries an optional integer `order` per entry,
sorted within a module, with the gate failing two entries that claim one slot.
Absent means unsequenced, not last.

### A kind with no uses is not a gap

`matrix` is a verified, working diagram kind that **no content uses**, and that
is a correct state rather than a hole to fill. Verifying a renderer says it is
safe to use; it does not create an obligation to use it. Authoring a figure to
exercise a kind inverts the test every other figure is held to — that it
re-encodes something the prose is already claiming — and in the one case
considered it would have meant asserting law nobody could source: seizable and
bailable are two independent lookups in the First Schedule, not a grid, so a
cell at their intersection would assert something the lesson never says.

`tools/responsive.mjs` derives its lesson routes from the content and prints
which kinds it covered, so a kind at zero uses shows up as *absent* in the
output rather than as a silent pass. That is what makes this safe to leave
alone.

**A duplicate is only safe to delete when the survivor is complete.** The
curriculum map was declared in both `game.css` and `learn.css`; the copy in
`learn.css` won on import order, so the rebuild in `game.css` had to double its
selectors to outrank it. Deleting the `learn.css` copy was correct — and it took
the map's ring, track, arc, numeral and label rules with it, because `game.css`
had only redeclared the wrapper, the row and the node's box. Two files declaring
the same *selectors* is not two files declaring the same *rules*.

It failed silently and then loudly: an unstyled SVG `<circle>` is a solid black
disc, because `fill` defaults to black and `stroke` to none. Sixteen black discs
with overlapping labels. No gate caught it — every value was a legitimate token,
every file parsed, and `design-lint` passed. Only looking at the page caught it.

`tools/design-lint.py` enforces eight rules: raw colour, primitive leakage,
removed tokens, the type floor, off-scale radii, palette drift in the two files
that cannot use a CSS variable (`favicon.svg` and the `theme-color` metas),
stylesheet reachability, and `var()` references to tokens nothing declares.

The last two exist because of how CSS fails. An undefined custom property is
not an error — the declaration is simply dropped — so both of these failures are
completely silent:

- **A rename mid-flight.** Someone retires a token while another session is
  still using it. Nothing errors; the element just stops being styled.
- **A broken import chain.** Delete `@import './palette.css'` from `tokens.css`
  and every other rule here still passes — the file is still on disk, still
  declares every role, still verifies — while the browser receives no tokens at
  all. Rule 7 walks the stylesheet graph from the JS entry points and checks
  the token files are actually in it.

Rule 9 catches semantic misuse by reading selector names, which means it cannot
see a violation on an element whose class name does not mention its state — a
`.mapnode-dot` rendered only when work is due looks like any other dot. Elements
whose state lives in a JSX condition rather than in their class still need a
human. Name state in the class where you can; it is what makes the rule work.

Escape hatch, for a real reason:

```css
color: #ff0000; /* design-lint: allow — reason */
```

### Adding a colour

Add the role to `ROLES` in `tools/palette.py`, add its primitive to `LIGHT` and
`DARK` as an OKLCH triple, add it to the appropriate rule list so it is actually
checked, then `--emit`. Specify colour in OKLCH, never in hex: a lightness step
means the same thing to the eye at every hue, which is what makes the contrast
and CVD guarantees hold.

### File ownership

| | |
|---|---|
| design system | `styles/palette.css`, `tokens.css`, `base.css`, `game.css`, `liquid.css`; `components/Bits.jsx`, `Seal.jsx`, `Rail.jsx`, `Overlays.jsx`, `Liquid.jsx`; `lib/fx.js`; `public/favicon.svg`; `index.html` head |
| feature work | `styles/learn.css`, `plates.css`; `components/Term.jsx`, `Chart.jsx`, `Diagram.jsx`; `routes/**`; `lib/**` except `fx.js`; `content/**` |

Feature stylesheets must be imported **after** `base.css` and `game.css`.

### Legacy names

Colour-named state classes are dual-selected during migration:

```
.is-sage → .is-correct    .is-oxide → .is-wrong    .is-gold → .is-mastery
.seal-sage/-oxide/-gold → .seal-correct/-wrong/-mastery
.toast-sage/-gold → .toast-correct/-mastery
```

Write the semantic name in anything new. `.is-sage` stops being true the moment
a colour is retuned — which is exactly what happened to it.

These variables are **gone**, not aliased:

```
--paper → --surface-page     --raise  → --surface-raised
--ink   → --text-primary     --muted  → --text-secondary
--rule  → --border-hairline  --serif  → --font-serif
--sage  → --signal-correct   --sans   → --font-sans
--oxide → --signal-wrong     --rail   → --rail-width
--gold  → --signal-mastery
```
