# E-learning UX upgrade — audit and workstreams

Measured against the current build, not against a trend list. Every "have" and
"gap" below was checked in the repo or in a browser. Written 2026-09-07.

**The audience decides which trends apply.** Adults who never got to university,
children of 12+, and returning revisitors — in Malaysia, mostly on a phone,
often on prepaid data, often after a shift. A trend that serves a corporate LMS
on a laptop may be worthless or harmful here. Two are rejected outright below,
with reasons.

## Where we are

| Trend | State | Evidence |
|---|---|---|
| Clean and simple design | **Strong** | Warta system, 3-tier tokens, WCAG AAA body text |
| Gamification | **Strong** | XP, 10 ranks, seals, streaks, arena, calibration |
| Consistency | **Strong** | design-lint, 9 rules, 52 files, no raw hex |
| Font and colour | **Strong** | AAA body, 16 module tints, CVD-verified |
| Visual hierarchy | **Good** | 12 block types, 5 tinted, density-gated |
| Storytelling | **Partial** | Scenes exist per lesson; no spine across lessons |
| Analytics and feedback | **Partial** | Progress page, calibration; nothing actionable |
| Personalization | **Weak** | FSRS scheduler exists; nothing recommends what next |
| Accessibility | **Unverified** | Colour is verified; keyboard/SR/focus never audited |
| Microlearning | **Gap** | Sections are 3 min or less; none is enterable or creditable |
| Mobile-first | **Gap** | Responsive, but desktop-first IA; no offline, no PWA |
| Social learning | **Constrained** | Static host, no backend, no accounts |
| Immersive AR/VR | **Rejected** | See below |

## The two rejections, and why

**AR/VR is wrong for this project.** It needs a device this audience may not
have, data this audience is paying for by the megabyte, and it earns its keep in
domains where spatial understanding is the skill — anatomy, engineering,
architecture. The skill here is reading a rule carefully and applying it to
facts. There is no spatial content to immerse anyone in. Building it would take
budget from offline access, which the same reader genuinely needs.

**Social learning cannot be built as specified, and should not be faked.**
Forums, peer review and group projects need a server, accounts, and moderation.
This is a static site on GitHub Pages with local storage; there is no backend
and no one to moderate. A law site carrying unmoderated legal advice between
strangers is actively dangerous. What *is* available and worth doing: prompts
that send the learner to a real person ("explain this to someone at home before
you read on" — the strongest retrieval practice there is), and an exportable
progress summary they can show a tutor or employer.

## The gap that matters most

**Microlearning.** Not because lessons are too long. That was the first version
of this finding and it was measuring the wrong field.

A lesson's `minutes` is an authored *study* estimate — time to work through the
material properly, reading and thinking. Read as reading time it implies 35
words per minute, which is not a reading speed; a slow careful reader on a phone
does 100-130. Measured honestly at 120 wpm, deliberately slow for someone
reading law who may not be in a first language:

- median lesson: **876 words, about 8 minutes**
- **317 of 320 sections are 3 minutes or under**

So the material is already micro-sized. The gap is entirely the second half:
a reader cannot *enter* at a section, *finish* at one, or be *credited* for one.
Everything is all-or-nothing at lesson scale, and a reader with seven minutes
has no way to spend them that the app will remember.

That makes the fix cheaper than first thought and the case for it stronger. No
content needs shortening. What is needed is state and an entry point.

This is the single highest-value change on the list for this audience, it needs
no new content, and it is mostly state and UI.

## Workstreams

Four in parallel. Owners are the sessions already on this repo.

### A — Microlearning and personalization (site-ba, this session)
Section-level progress: per-section completion, resume where you stopped, "next
3 minutes" entry from home. An adaptive Continue surface driven by data already
collected — due reviews, unread lessons, weakest module by quiz accuracy.
Code-split content per module so a phone loads one module, not 840KB.

### B — Mobile-first and offline (site-39, proposed)
A service worker and manifest so the site works with no signal and installs to
a home screen. Thumb-reachable navigation on phone. This is the stream with the
most direct effect on whether the audience can use the thing at all.

### C — Accessibility, WCAG 2.1 AA, zero compromise (site-62)
Colour is already verified; nothing else is. Keyboard traversal of every
interactive surface, visible focus order, a skip link, heading hierarchy,
screen-reader labelling, reduced motion, and the glossary index — 522 links at
62x17px, on the page a stuck reader reaches first.

### D — Information architecture and storytelling (site-0b)
Section-level metadata so B and A have something to render: per-section minutes
and a one-line key point. Navigation and IA review. A narrative spine for
younger readers.

## Standing rules

- Nothing ships that fails `npm run check` — content, design, prose, density.
- No raw hex, no value outside the token scales.
- Accessibility is not a phase. A feature that cannot be operated by keyboard is
  not finished.
- Measure before you conclude. Two wrong denominators were caught today by going
  back to the DOM; the corpus was never in the state the model claimed.
