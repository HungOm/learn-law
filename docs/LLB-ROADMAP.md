# From here to LLB level

What "LLB (MQF 6), 120+ credits" would actually take, measured against what the
corpus holds today. Written 2026-09-09.

> **Figures marked ⚠ need verifying against current MQA and LPQB documents
> before anyone plans against them.** They are standard published values, but
> this repository's rule is that a number nobody checked is a number nobody
> should use. The measurements of *our own corpus* are exact — they come from
> `tools/check-content.py` and `tools/readability.py`.

## 1. Three things "LLB level" can mean, and only two are reachable

**Conferring an LLB. Out of reach, and it must never be implied.** A degree can
only be awarded by a provider registered under the Private Higher Educational
Institutions Act and accredited by MQA; who may then practise is governed by the
Legal Profession Act 1976 and the Legal Profession Qualifying Board. No website
can confer, substitute for, or shorten that. This matters more here than on most
projects: the stated audience is *adults who never got the chance to go to
university*. They are exactly the readers most likely to believe a site that
hints otherwise, and most damaged when it turns out to be untrue.

**Content equivalence — covering what an LLB covers, at its depth.** Reachable,
and very large. Sized in §4.

**A companion at full breadth.** Reachable soon, and the best value for effort.
Sized in §5 as Stages 1–2.

This document plans for the second and third. It recommends the third as the
next real goal.

## 2. Where the corpus actually stands

| | Now | LLB (MQF 6) |
|---|---|---|
| Notional learning hours | **22.4** | **4,800** ⚠ (120 credits × 40 h) |
| Share | **0.47%** | — |
| Subjects | 16 modules | ~18–20 core ⚠ |
| Lesson prose | 72,129 words | — |
| Practice problems | 25 | — |
| Cards | 186 | — |
| Quiz questions | 286 | — |
| Guided judgments | 9 | — |
| Statutes referenced | 12 | — |

The headline number is discouraging and the shape underneath it is not.

**The gap is uniform.** Every module sits at roughly the same fraction of a real
subject — contract is the largest at 110 authored minutes, administrative the
smallest at 60. Nothing is finished and nothing is missing-in-the-middle. That is
the difference between a skeleton built to consistent scale and a half-written
degree, and it is a much better position to expand from: the architecture,
tone, gates and scheduler are all proven at 1% and none of them is what has to
change.

## 3. Two separate gaps, and only one of them is big

**Breadth — about eight core subjects absent.** Measured against a typical
Malaysian LLB core ⚠:

| Missing | Why it matters here |
|---|---|
| Equity and Trusts | Core everywhere; nothing in the corpus touches it |
| Family Law (civil) | Law Reform (Marriage and Divorce) Act 1976 |
| Syariah / Islamic law | Malaysia's dual system — a serious omission for this jurisdiction |
| Jurisprudence | Usually compulsory |
| Commercial law | Sale of goods, agency, partnership, negotiable instruments |
| Employment / industrial relations | High everyday relevance to this audience |
| Public international law | Commonly compulsory |
| Professional practice and ethics | Required for the CLP route ⚠ |

Present and roughly mapped: legal system, constitutional, contract, tort,
criminal law, criminal procedure, civil procedure, evidence, company, property
(land), administrative, statutory interpretation, legal reasoning, legal
research, foundations, study method.

**Depth — about 100× per subject.** A 6-credit subject is 240 notional hours ⚠.
The largest module here is 1.8.

Breadth is the cheap gap. Depth is the expensive one, and §4 is why it is
cheaper than 100× suggests.

## 4. The reframe: an LLB's hours are mostly reading, not lectures

This is the point the whole plan turns on. Of a 6-credit subject's 240 notional
hours ⚠, only a fraction is exposition. A defensible decomposition:

| Component | Share | Who supplies it |
|---|---|---|
| Guided exposition | ~17% | **We author this** |
| Primary reading — statutes and judgments | ~58% | **We scaffold it; we do not write it** |
| Practice and assessment | ~17% | We author this |
| Spaced review | ~8% | Already built (FSRS scheduler) |

So reaching 4,800 notional hours does **not** mean authoring 4,800 hours of
prose. It means authoring roughly 800 and scaffolding roughly 2,800.

**The machine for that already exists and is the most valuable thing in the
repo.** The case reading tier holds a citation, where the judgment is free to
read, what to look for, and questions with model answers behind a reveal — and
never the judgment's text, with `tools/check-extracts.py` failing the build on a
quoted run over 25 words. That design is both copyright-safe and pedagogically
right, and its economics are extraordinary: roughly 400 authored words buys a
reader 1.5–2 hours of genuine engagement with primary law. Exposition buys about
0.04 hours per 400 words.

**That is a ~40× leverage difference, and it is the only reason LLB-scale hours
are reachable at all.** Nine judgments exist. The corpus already cites many more.

## 5. Stages

Each stage is worth shipping on its own. None depends on the next.

### Stage 1 — Close the map
Add the eight missing subjects at *current* depth: ~4 lessons, ~4,500 words,
~12 cards, ~2 problems, ~18 quiz questions each.

- Cost: ~32 lessons, ~36k words, ~96 cards, ~16 problems, ~144 quiz questions
- Result: 24 modules, ~108k words, ~34 notional hours (0.7%)
- **Why first:** it is the largest gain in usefulness per unit of work in the
  whole plan. Today a reader who wants family law or trusts finds nothing.
  Afterwards nobody hits a hole, and the site can honestly describe itself as
  covering the field.

### Stage 2 — Case tier to scale
9 → ~150 guided judgments, drawn from citations the corpus already carries.

- Cost: ~60k authored words
- Result: ~250 additional notional hours — more than ten times Stage 1's hours
  for under twice the words
- **The bottleneck is verification, not writing.** Every citation must be
  checked against a real report. `check-extracts.py` enforces structure; it
  cannot confirm a case says what we claim. Budget review time, not prose time.

### Stage 3 — Statute tier
The same machine pointed at provisions: Federal Constitution, Contracts Act
1950, Penal Code, CPC, Evidence Act 1950, National Land Code, Companies Act
2016, Rules of Court 2012.

- Result: ~200 notional hours; also the strongest answer to "where do I look
  this up", which is the skill the site says it teaches

### Stage 4 — Depth on the core
Take the ten subjects most relevant to the CLP route ⚠ from ~1.8 h to ~12 h.

- Cost: ~340k words — two and a half times everything above combined
- Result: ~105 notional hours of exposition, and the first point at which any
  subject is genuinely comparable to a taught one

### Stage 5 — Assessment at standard
25 → ~300 problems, at exam length, with rubrics and model answers.

- **The site cannot mark them.** It can only teach self-marking against a
  rubric, which is what the existing calibration apparatus already does.

**After Stages 1–3:** ~496 notional hours, full breadth, guided primary reading.
That is comfortably past A-Level Law's ~360 guided hours ⚠ and 10.3% of an LLB —
reached with 136k authored words where the same hours written as exposition
would take ~1.6M. **Nine per cent of the cost**, and the whole argument for
doing it in this order.

## 6. What has to change in the app, not the content

1. **Say plainly what this is not.** A permanent, unmissable statement that the
   site is not a qualification, confers nothing, and is not a route to practice.
   This should land in Stage 1, not last.
2. **Account for progress in notional hours** against a stated total, so a
   reader sees "35 of 4,800" rather than a percentage that flatters.
3. **Subject-level prerequisites.** The lesson-level gating works; 24 subjects
   need a graph above it.
4. **The case tier's gating model must survive 500 entries** — it was built for
   nine.
5. **Currency is the real risk.** Malaysian law moves; `lastVerified` exists but
   a 500k-word corpus has a maintenance cost that grows with size. A stale law
   site is worse than a small one. Before Stage 4, decide what the review cycle
   is and whether it can actually be staffed — that decision, not the writing,
   determines whether this survives.

## 7. Recommendation

Do not treat 120 credits as a content target. Treat it as a **coverage map**,
and let the case and statute tiers carry the hours.

Stages 1–3 are the next real goal: full breadth, guided reading, honest
accounting. Stage 4 is a separate decision that should not be taken until §6.5
has an answer.

---

## 8. What has been built (2026-09-09)

**The writing tier — new, and not in the original plan.** `content/writing/`,
`tools/check-writing.py`, `src/lib/writing.js`, `Writing.jsx`,
`WritingView.jsx`. Ten exercises: 3 foundation, 3 advanced, 4 at degree level,
across case notes, problem answers, letters of advice, written submissions and
an essay. It supplies a form and never a model answer, gated behind forty words
of the reader's own draft; the reasoning is in `docs/STYLE.md`. All nine of the
gate's rules were forced to fail before the gate was trusted.

**The palette resized from 16 to 24 modules.** This was the hidden cost of Stage
1 and it is worth recording, because the plan above did not know about it.
`src/styles/palette.css` is generated from `tools/palette.py`, where each
module's hue is derived from its index and the module count. Adding even one
module therefore re-colours every existing module — measured at 14 of 16 moving
more than 10°, up to 176°. **No gate catches a mis-coloured module**:
`design-lint` rule 8 only asks whether `--module-tint` is declared, and an
unmapped module silently inherits module 00's colour at `:root`.

Sized to 24 in one deliberate move so it happens once. `STRIDE` is now 7 —
co-prime with 24, and chosen because 7 × 15° puts neighbours 105° apart, the
closest available to the 112° the sixteen-module palette had. The guarantees
were re-verified and hold: body text on the softest tint 12.81:1 light and
11.94:1 dark against a 7.0 floor, module ink 6.01:1 and 7.28:1 against 4.5, and
consecutive modules differing by ΔE 0.137 and 0.157 against a 0.10 floor.
**Seven module slots remain. Use them before growing the list again.**

**Equity and Trusts, the first of the eight missing subjects.** Two lessons,
fifteen cards, seven quiz questions. It states **no case citations at all** —
deliberately, under the rule now recorded in `docs/STYLE.md`. The reception
lesson rests on the Civil Law Act 1956 s 3, which is checkable; the trusts
doctrine is stated as doctrine and flagged for a verification pass. A
proposition without authority is honest and improvable; one with an invented
authority is neither.

Adding seven quiz questions moved 215 existing questions to new option
positions. That is the balancer working as designed — `prepare()` shuffles
options unseeded at render, so on-disk position is never what a learner sees —
but it is a large diff in other people's files and worth expecting.

## 9. Stages 1 to 3 complete (2026-09-10)

**Stage 1 — closed.** All eight missing subjects exist: equity and trusts, family,
syariah, jurisprudence, commercial, employment, public international law,
professional practice and ethics. Nine lessons, 77 cards, 31 quiz questions —
and **16 practice problems**, one guided and one open per subject, because
shipping the lessons without them recreated the exact defect
`docs/CURRICULUM.md` names as the most important the project ever had: a reader
who can read and memorise but never find out whether they can apply anything.
Every one of the 24 modules now has practice.

**Stage 2 — the citation gap is closed; the stage is not.** The case tier went
9 → **26** (now 29): every case the corpus cites in a lesson `source` field has
a guided reading, and that gap is provably zero. **That is a smaller milestone
than Stage 2 as scoped above**, which is ~150 judgments for ~250 notional hours.
The 26 were the ones already named by a lesson; the remaining ~120 are not cited
anywhere yet, so reaching them needs case *selection*, not gap-closing — a
different and larger job. This entry previously read "closed", which was an
over-claim against this document's own target. Citations were pulled
programmatically each time and the remaining gap re-derived by set intersection
before each batch, never tracked by hand — the one time it was tracked by eye,
seven present cases were reported as missing.

**Stage 3 — built.** A statute tier: `content/statutes/`,
`tools/check-statutes.py`, `src/lib/statutes.js`, `Statutes.jsx`,
`StatuteView.jsx`, and a `check:statutes` gate. **Ten provisions across eight
Acts**, each gated on the lesson that relies on it.

It carries a justification the case tier does not, and it is the strongest of
the three: **a judgment is fixed on the day it is handed down; a section is
not.** A provision can be substituted, renumbered or repealed between one
reading and the next, so a stored copy does not merely age — it goes wrong
*silently*, and the reader cannot tell. The app holds a pointer and a date, and
the index says outright that if the Act differs from the page, the Act is right.

**Also landed:** the not-a-qualification statement, on Home and in the rail
footer on every page. §6.1 said it should land in Stage 1; it had not landed at
all.

### Still to do

| | |
|---|---|
| Stage 4 | Depth on the core — ~340k words. Unstarted, and gated on §6.5 having an answer. |
| Stage 5 | Assessment at standard — 41 problems now, ~300 wanted. |
| **Verification** | **The largest debt.** Every proposition in the eight new subjects' lessons, cards and problems needs checking against a Malaysian text. They cite nothing by design, so nothing is *wrong*-with-authority — but nothing is confirmed either, and `books.json` reading lists for all eight are empty on purpose. |
| Engine coverage | Every accessibility result in this repo is a Chrome result. See the note in DESIGN.md. |

---

## 10. The wall, found three times (2026-09-11)

Three tiers stalled independently this week, and the stopping point was the same
one each time. It is worth writing down because it is not a scheduling problem
and no amount of authoring effort moves it.

- **Stage 2** stopped at 30 of ~150 case readings. Not because 120 are hard to
  write, but because the corpus cites about thirty judgments in total, and the
  tier is built only from citations the corpus already carries.
- **Stage 3** stopped at 43 provisions. Roughly a third of the provisions that
  looked buildable turned out to be covered already inside broader pages.
- **The writing tier's other half** — a guided reading for each of the ten
  modules that have none — could not be built at all. Every numbered provision
  those ten modules cite **already has a page**, owned by whichever module
  claimed it first: Civil Law Act s 3 is `st-cla-s3` in m01, Article 121(1A) is
  `st-fc-art121-1a` in m17, Tan Ying Hong is `x-tan-ying-hong` in m08. The
  coverage rule in `check-statutes.py` forbids a second page on one provision,
  and it is right to — two pages on section 3 would drift apart and one of them
  would be wrong.

**The corpus is smaller than the curriculum.** The constraint on all three tiers
is source material, not labour. Everything these tiers can be built from is a
citation someone has already verified, and the supply of those is exhausted at
about thirty cases and forty-three provisions. Adding the next one is a syllabus
decision — deciding which judgment a Malaysian law student should read — and
that is not a gap this document can close by scheduling more work.

**What the wall does NOT block, and what was done instead.**

The writing tier needs no citation: it teaches a form. So the closable half was
closed. `content/writing/stage6.json` adds fifteen exercises, one for each
module that had none, and the tier is now 25 across all 24 modules —
foundation 7, advanced 7, llb 11. Every exercise's `verify` field names what the
reader must check rather than asserting it, which is why none of them needed a
source this corpus does not have.

And the guided-reading half turned out to be a **surfacing** problem wearing an
authoring problem's coat. `l-equity-reception`'s whole argument rests on section
3 of the Civil Law Act; there is an excellent guided reading of section 3, in
m01, where an equity reader will never see it. `relatedForLesson` in
`src/lib/statutes.js` and `src/lib/extracts.js` matches a page against a pointer
the lesson itself already carries, and invents nothing. It is deliberately
narrow — matching on the Act alone would put eleven Contracts Act pages under a
lesson about agency — so `l-agency-basics` gets nothing, which is the honest
answer.

**Revised position: 193 notional hours, 4.0% of an LLB** (was 154h and 3.2%).
The remaining stages are unchanged in size and two of them are now known to be
gated on source material rather than on time.

### 10.1 The wall moves when the corpus grows, and only then

Within hours of the above being written, site-17 added ten lessons across four
modules and the wall moved: **ten modules with no guided reading became eight.**
That is the proof of the diagnosis rather than an exception to it. Nothing was
unblocked by effort; it was unblocked by new lessons carrying new citations.

Of the ten citations offered, four could be built and six could not, and the
line between them is a single rule worth stating on its own:

> **A numbered provision in a lesson's `source` is a guided reading page that
> can exist. An Act named generally is not.**

Built: `st-lrmda-s53-54`, `st-lrmda-s76`, `st-lrmda-s88` (m16-family, which had
none and now has three) and `st-ea-s126-129` (m22-ethics). Refused: Order 53
r 2(4), because `st-roc-o53` already covers the Order and a page on an Order
covers its rules — extend it rather than add beside it; the Trustee Act 1949 and
the Legal Profession Act 1976, both cited without a section; and — briefly — the
Guardianship of Infants Act 1961 s 11, which was numbered and buildable but
whose Act was not in `books.json`. site-62 added the entry within the hour and
`st-goia-s11` was written, so m16-family went from nothing to four pages in a
single evening. The lesson there: **the blocker was one line of registry, not a
week of authoring**, and it was invisible until someone tried to build the page
and was refused by the gate.

**m15-equity-trusts is the instructive failure.** It gained two lessons and
stayed on the gap list, because both cite Civil Law Act s 3 — already covered by
`st-cla-s3` — and the National Land Code without a number. More lessons in a
module does not move the wall. More *citations* does.
