# Reading law in a second language

*Research and measurement, 2026-09-11. Against a corpus of 156 lessons,
139,377 running words, a 499-term glossary, 54 guided statute readings and 30
guided case readings.*

---

## 1. Who this is for, and why it is not a translation problem

Malaysian law is taught, argued and reported in English. A great many people
studying it are not reading in a first language. The corpus already knows this —
`tools/sections.js` sets its reading-speed estimate at 120 words a minute,
"deliberately slow, for someone reading law who may not be reading in a first
language."

The instinct is to reach for translation. That is the wrong tool here, for a
reason worth stating plainly: **the reader has to end up able to read the English,
because the statute, the judgment and the exam are all in English.** A Malay or
Chinese rendering of a section helps someone understand it today and leaves them
no better able to read the next one. What is needed is support that makes English
legal text *reachable*, and then gets out of the way.

That is a well-studied problem with a name — Content and Language Integrated
Learning (CLIL), where a subject and a second language are learned at once — and
a matching literature on legal English for non-native speakers.

---

## 2. What the app already has, measured

Better than I expected, and worth stating before proposing anything:

| capability | state |
|---|---|
| Readability gate | Flesch-Kincaid grade 8–10, median sentence ≤ 16 words, none over 30, enforced on all 156 lessons |
| Glossary | 499 terms, each with **three tiers** — plain `gloss`, `intermediate`, `advanced` — plus `source` and `aliases` |
| Gloss delivery | `Term.jsx` shows gloss + "In short" on hover/tap, with "Going deeper" expandable |
| Glossary density gate | Refuses walls of marked terms: 8+ marks inside 12 words each fails |
| Spaced repetition | FSRS, on **cards only** |
| Guided primary reading | 84 entries that point at the text and say what to look for, never reproducing it |

The three-tier gloss is genuinely unusual and is the right shape. Most apps ship
one definition.

---

## 3. What the research says

**The 98% threshold.** Comprehension tracks the proportion of running words a
reader already knows. Below 80% comprehension is "next to impossible"; 90% is
where readers outnumber non-readers; 95% is where most learners can guess from
context; **98% is the level at which a learner reads with adequate comprehension
and for pleasure** (Hu & Nation). This is the single most useful number in the
literature because it is measurable against a real corpus.

**General vocabulary alone does not get you there.** The New General Service List
— 2,809 high-frequency words — covers about 90–92% of general English text. Its
own coverage data shows the first 2,000 words reaching 83% of a 10-million-word
sample, and that **95%+ is reached only when a specialised list is added on top**.
Specialised lists take it to 97–98.5%. So the architecture that works is
*general frequency + domain list*, not either alone.

**A domain list for law already exists, and is almost exactly the size of this
one.** Corpus work on judicial vocabulary produced a list of 498 headwords
covering 13% of a legal corpus, validated against the Harvard Law Corpus and
Black's Law Dictionary. This app's glossary is 499 entries. That is a coincidence,
but an instructive one: it suggests the glossary is already roughly the right
*size* for its job.

**Glosses work, and first-language glosses work better.** Meta-analyses of
textual and hypertext glosses find positive effects on vocabulary acquisition.
Where L1 and L2 glosses have been compared directly, **L1 glosses produced
significantly higher scores on reading comprehension, immediate vocabulary
recognition and delayed retention.** Multimedia and video glosses did *not* help
comprehension in at least one study and video annotation hurt it — so richer is
not automatically better.

**Repetition is what converts an encounter into knowledge.** A word met once is
not learned. This is the principle behind graded readers and narrow reading:
texts engineered so that new vocabulary recurs inside otherwise comprehensible
context.

**Reading while listening helps.** Dual coding — text and synchronised audio
together — produces stronger memory traces and benefits L2 readers and
less-skilled readers specifically. One caveat from the same literature: audio
support increased reading *time* without improving comprehension scores in a
dyslexia study, so it is an accessibility and fluency tool rather than a
comprehension shortcut.

**The problem this corpus was built to solve is the documented one.** Research
into legal-case reading at a Malaysian public university found lecturers
reporting a significant gap in students' legal reading skills, and that
**"students often rely excessively on textbooks, undermining their understanding
of original legal texts."** That is precisely what the guided reading tiers
exist to correct, and it is worth knowing the diagnosis is independently attested.

---

## 4. The measured gaps in *this* corpus

Numbers computed over all 156 lessons' prose, including rule blocks.

**The glossary covers 46.4% of running words** — every occurrence of a term or
alias — and 15.5% of distinct word forms. For a domain list sitting on top of
general English, that is healthy.

**Median glossed term appears 9 times in the prose.** That is in the band where
incidental acquisition actually happens. The glossary is not decorative.

Three findings that are defects rather than observations:

**(a) 1,860 words appear exactly once in the whole corpus and are not glossed.**
Single-exposure words are 30% of the vocabulary (1,943 of 6,425 forms). A word
met once, unexplained, is a word that costs comprehension and teaches nothing.

**(b) ~~187 glossed terms never appear in lesson prose at all.~~ Withdrawn —
the figure was wrong twice over, and the corrected finding is more interesting.**

The 187 came from counting `freq.get(term)` against a token frequency table.
`freq` is keyed on single words, so **every one of the 173 multi-word terms** —
"quantum meruit", "actus reus", "adverse inference" — scored zero automatically
and was counted as unused. Checking all of a term's `aliases` word-by-word
instead gives **11**, not 187.

And 11 overstates it too. Those 11 were measured against `content/lessons/`
only, which was until 2026-09-11 the sole surface with glossary linking at all.
Checked against the whole corpus — quiz, cards, problems, statutes, extracts —
only **three terms are genuine orphans**: `calibration`, `frustration` and
`quantum-meruit`.

Two of those three are the real finding. **Frustration and quantum meruit are
substantive doctrines that this corpus defines and never teaches.** That is a
content gap in the contract module, not glossary dead weight, and it is the
opposite conclusion to the one the broken measurement supported — which would
have been to delete them.

*Recorded rather than quietly fixed, because the failure is this repo's standard
one: a metric that returned a plausible number against the wrong object. A
single-token lookup cannot see a two-word key, and nothing about the output said
so.*

**(c) Nothing schedules vocabulary.** This is the big one. FSRS drives cards;
**no term is ever scheduled, tested or brought back.** A reader who looks up
*estoppel* on three separate days looks it up cold three times, and the app never
notices they do not know it. The app already owns a working spaced-repetition
scheduler and does not point it at the 499 things a second-language reader most
needs to retain.

---

## 5. Options, ranked by evidence strength against cost

### Tier 1 — strong evidence, uses machinery that already exists

**1. Schedule the glossary.** Point FSRS at terms the reader has actually looked
up. A lookup is an honest signal of not-knowing — stronger than anything the app
currently collects. Card format writes itself from existing fields: prompt from
`term`, answer from `gloss`, elaboration from `intermediate`/`advanced`, and
`source` is already there. This closes (c), costs no new content, and is the
single highest-value item here.

**2. Fix what the glossary measurements actually show.** Not "retire 187 unused
terms" — see (b); that finding is withdrawn. What survives is: teach the three
orphans (`frustration` and `quantum meruit` are doctrines the corpus defines and
never covers), and gloss the highest-value words from the single-exposure tail.
Only the second is a glossary job; the first is content.

**3. Show the reader their own coverage.** The 98% threshold is only useful if
someone can see where they stand. Per-lesson: "you have looked up 4 terms here"
is honest and cheap. Avoid inventing a proficiency score the app cannot measure.

### Tier 2 — strong evidence, needs a decision first

**4. First-language glosses.** The best-supported single intervention in the
gloss literature, and the most expensive: it requires knowing the reader's L1,
and Malaysia's realistic set is Malay, Mandarin and Tamil. Three translations
of 499 terms is 1,497 items that must be verified by someone who reads both
languages — and an unverified translation of a legal term of art is exactly the
class of error this corpus refuses everywhere else. **Do not start this without a
translator.** Adding `gloss_ms` to the schema and leaving it null is a cheap,
honest first step that commits nothing.

**5. Read-while-listening.** Dual coding is well supported and browser
speech synthesis is free. Treat it as fluency and accessibility support, not as
a comprehension fix, and measure nothing about it that the literature does not
support.

### Tier 3 — plausible, and I would not do them yet

**6. LLM text simplification.** Current research shows learners report better
"flow" and retention with simplified texts, but also that proprietary models
"often fail to reach the lowest readability levels while preserving meaning."
On a law site, meaning-drift *is* the failure — a simplified statement of a rule
that is subtly wrong looks exactly like a correct one. The corpus already
enforces grade 8–10 by gate; that is simplification done once, by hand, where it
can be checked.

**7. Grading lessons by CEFR level.** Attractive and unreliable: published
graded-reader CEFR designations vary widely between publishers for the same
nominal level. The existing Flesch-Kincaid gate is cruder and honest about being
crude.

---

## 6. Recommendation

**Do Tier 1.** All three items use machinery the app already owns, none requires
new content of a kind nobody can verify, and item 1 closes the gap between what
this app knows about its reader and what it does with that knowledge.

**Put item 4 to a person, not a plan.** First-language glossing has the best
evidence in the whole review and cannot be done honestly without a bilingual
reader. That is a staffing question, the same shape as the Penal Code
verification: a decision alone changes nothing, someone has to do the work.

**Leave Tier 3.** Both items trade a checkable weakness for an uncheckable one.

---

## 7. Sources

- Hu & Nation, vocabulary coverage thresholds — via New General Service List Project, <https://www.newgeneralservicelist.com/coverage>
- New General Service List, <https://www.newgeneralservicelist.com/new-general-service-list> and <https://en.wikipedia.org/wiki/New_General_Service_List>
- Academic Word List, <https://en.wikipedia.org/wiki/Academic_Word_List>
- A Corpus-Based Judicial Vocabulary List, <https://ouci.dntb.gov.ua/en/works/7WjmVNYa/>
- Keywords in Written Academic Legal Texts: A Corpus-Based Study, <https://ccsenet.org/journal/index.php/ijel/article/download/0/0/39050/39806>
- Vocabulary glossing: a meta-analysis, <https://files.eric.ed.gov/fulltext/EJ1135927.pdf>
- The effect of textual glosses on L2 vocabulary acquisition: a meta-analysis, <https://journals.sagepub.com/doi/abs/10.1177/13621688211011511>
- Effects of L1 and L2 Hypertext Glosses on Reading Comprehension and Vocabulary Retention, <https://www.academia.edu/37496406/>
- Multimedia Gloss Presentation, Frontiers in Psychology, <https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.602520/full>
- Aligning linguistic complexity with CEFR levels, Studies in SLA, Cambridge, <https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/aligning-linguistic-complexity-with-the-difficulty-of-english-texts-for-l2-learners-based-on-cefr-levels/DB604DB02A205F0F172D6024137CBFE8>
- Scaffolding in Content and Language Integrated Learning (CLIL), <https://www.tandfonline.com/doi/full/10.1080/09571736.2019.1705879>
- LLM-Driven Text Simplification and Its Effects on Extensive Reading in EFL Learners, <https://link.springer.com/chapter/10.1007/978-3-032-29755-6_48>
- LLM-based Text Simplification and its Effect on User Comprehension, <https://arxiv.org/pdf/2505.01980v1>
- The Reading of Legal Cases Among Law Students, <https://www.academia.edu/5690883/>
- The Challenges in the Reading of Legal Cases: Lecturers' Perspective, <https://www.academia.edu/17944919/>
- Text-to-speech, literacy and recall, ReadSpeaker, <https://www.readspeaker.com/blog/learning-science-text-to-speech-digital-education/>
- Dual visual-auditory text presentation, <https://pmc.ncbi.nlm.nih.gov/articles/PMC8062718/>
- Audio-support and reading comprehension in dyslexia, <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9187546/>
