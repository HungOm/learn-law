/**
 * The reading assignment for one lesson, derived from that lesson's own text.
 *
 * The gap: a lesson had no reading. Reading lived a level up, on the module, so
 * a reader working through a lesson was never told what to open beside it —
 * which is most of the difference between a study app and a course.
 *
 * The obvious fix was to author a list per lesson. That is the wrong fix here,
 * and the reason is this repo's oldest rule: a citation nobody can chase is
 * worse than no citation, and on a law site a wrong one looks exactly like a
 * right one. Sixty-four hand-written reading lists would be sixty-four chances
 * to invent a section number.
 *
 * So nothing here is authored. Every lesson already states its authorities: each
 * `rule` block carries a `source`, and those are real, already through
 * `check:content` and `check:prose`, and already the thing the lesson rests on.
 * Measured across the corpus: 188 sources over 64 lessons, of which 48 lessons
 * (75%) yield at least one statute or case. `l-formation` gives Contracts Act
 * ss 2(a), 4(1) and 4(2) plus Macon Works — which IS the reading for that
 * lesson, written by whoever wrote the lesson.
 *
 * The sixteen with none are the method and study lessons. They have no statutory
 * authority because there is none to have, and inventing one for the sake of a
 * full page would be the failure this whole approach avoids.
 */

/* A law-report citation — `[2010] 2 MLJ 1` — or a party line. Deliberately
   narrow: a false case is worse than a missed one, so `v` only counts when
   followed by a capitalised party. */
const CASE = /\[\d{4}\]\s*\d*\s*[A-Z][A-Za-z]{1,6}\b|\bv\s+[A-Z]/;

/* A statute, a provision, or an instrument. `Schedule` is in because Malaysian
   criminal procedure turns on the First Schedule as much as on any section. */
const STATUTE = /\b(Act|Code|Constitution|Rules of Court|Enactment|Ordinance|Schedule)\b|\bss?\s*\d|\bArt(?:icle)?\s*\d/;

/**
 * @param lesson  a loaded lesson, with `sections[].body[]`
 * @returns { statutes, cases, secondary } — each a de-duplicated string list in
 *          the order the lesson introduces them, which is the order to read them
 */
export function authorities(lesson) {
  const out = { statutes: [], cases: [], secondary: [] };
  if (!lesson || !Array.isArray(lesson.sections)) return out;

  for (const section of lesson.sections) {
    for (const block of section.body || []) {
      const source = block && typeof block.source === 'string' && block.source.trim();
      if (!source) continue;
      // Case first: a source naming a case that construes a section is read as
      // the case, because that is the document you open.
      const bucket = CASE.test(source) ? out.cases
        : STATUTE.test(source) ? out.statutes
          : out.secondary;
      if (!bucket.includes(source)) bucket.push(source);
    }
  }
  return out;
}

/** Whether a lesson has anything to read at all. Sixteen legitimately do not. */
export function hasReading(lesson) {
  const a = authorities(lesson);
  return a.statutes.length > 0 || a.cases.length > 0;
}

/**
 * How long the reading is likely to take, stated as a range rather than a
 * number. A section of an Act is minutes; a Federal Court judgment is not, and
 * a single figure would be a claim the app cannot support. The floor exists so
 * a lesson with one short provision does not report "0 minutes".
 */
export function estimate(lesson) {
  const a = authorities(lesson);
  const low = a.statutes.length * 3 + a.cases.length * 15;
  const high = a.statutes.length * 6 + a.cases.length * 40;
  if (!low) return null;
  return { low: Math.max(5, low), high: Math.max(10, high) };
}

/**
 * The Act a citation belongs to, or null.
 *
 * Deliberately NOT fuzzy, and deliberately only the Act — never the provision.
 * The test is exact containment of a known Act title within the citation
 * string, against the closed list in books.json, longest title first so
 * "Interpretation Acts 1948 and 1967" is not beaten by a shorter substring.
 * "Contracts Act 1950, s 26" contains "Contracts Act 1950" and resolves; a
 * citation naming an Act the app does not carry resolves to null and the
 * citation stays plain text.
 *
 * Matching the ACT is safe in a way that matching the PROVISION is not. An Act
 * title is a proper name from a fixed list of twelve; a section number is a
 * token that recurs across every Act in the book, and pairing the wrong one
 * with a citation would send a reader to a real provision that is not theirs —
 * the kind of near-miss nobody checks. Which is why the card this feeds opens
 * the Act and asks the reader to find the section themselves.
 */
export function actIdFor(citation, statutes) {
  if (typeof citation !== 'string' || !Array.isArray(statutes)) return null;
  let best = null;
  for (const s of statutes) {
    const title = s && typeof s.title === 'string' ? s.title : null;
    if (!title || !citation.includes(title)) continue;
    if (!best || title.length > best.title.length) best = s;
  }
  return best ? best.id : null;
}
