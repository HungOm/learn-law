// The glossary, and the machinery that links prose to it.
//
// Terms are not marked up in the content. A lesson author writes "the ratio
// decidendi is…" in plain prose and the linker finds it, which matters because
// the alternative — hand-tagging every occurrence of 189 terms across 40-odd
// lessons — is a job nobody finishes and everybody forgets to redo when a term
// is added.

import doc from '../../content/glossary.json';

export const KINDS = doc.kinds;
export const TERMS = doc.terms;

export const byId = Object.fromEntries(TERMS.map(t => [t.id, t]));

/** alias (lower-cased) → term id. The content check enforces uniqueness. */
const aliasToId = new Map();
for (const t of TERMS) for (const a of t.aliases) aliasToId.set(a.toLowerCase(), t.id);

// One regex for every alias, longest first. JS alternation is leftmost-*first*
// rather than leftmost-longest, so the ordering is what stops "prima facie"
// matching inside "prima facie case".
//
// The boundaries are a captured leading character and a negative lookahead
// rather than \b, for two reasons: several aliases end in a bracket ("Article
// 4(1)"), where \b does not do what you want, and lookbehind is still not
// something to rely on in every browser this has to run in.
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ALIASES = [...aliasToId.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
const RE = new RegExp(`(^|[^A-Za-z0-9-])(${ALIASES.map(escape).join('|')})(?![A-Za-z0-9-])`, 'gi');

/**
 * Split `text` into plain strings and `{term}` marks.
 *
 * `seen` is a Set of term ids the caller carries across a whole lesson: a term
 * is linked the first time it appears and left alone afterwards. Linking every
 * occurrence turns a page of exposition into a page of underlines, which is
 * both ugly and useless — by the fourth "consideration" the reader has either
 * looked it up or decided not to.
 */
export function tokenise(text, seen = null) {
  const s = String(text ?? '');
  if (!s) return [];
  const out = [];
  const local = new Set();   // ids already marked inside THIS passage
  let last = 0;
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(s)) !== null) {
    const [, lead, alias] = m;
    const id = aliasToId.get(alias.toLowerCase());
    const start = m.index + lead.length;
    // Whether this term is still available, and to whom.
    //
    // `seen` used to be a Set that this function ADDED to, which made the
    // function impure: running it twice on the same text returned marks the
    // first time and nothing the second. React StrictMode double-invokes
    // renders in development and throws the first result away, so in `npm run
    // dev` every term vanished — pass one claimed them all, pass two found them
    // taken. Production builds do not double-render, so this was invisible in
    // `dist` and broken in the only server anybody actually reads the app in.
    //
    // It is now a Map from term id to the text that claimed it, so re-running
    // the same text is idempotent: the claim it already holds is still its own.
    // `local` keeps the other half of the old behaviour — a term marks once
    // within a single passage, not on every occurrence in it.
    const claimedBy = seen ? seen.get(id) : undefined;
    if (!id || local.has(id) || (claimedBy !== undefined && claimedBy !== s)) {
      // Step past this alias, but not past the character after it — an alias
      // can end one character before the next one begins.
      RE.lastIndex = start + alias.length;
      continue;
    }
    local.add(id);
    if (seen) seen.set(id, s);
    if (start > last) out.push(s.slice(last, start));
    out.push({ id, text: s.slice(start, start + alias.length) });
    last = start + alias.length;
    RE.lastIndex = last;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** Terms grouped by kind, in the order the glossary declares kinds. */
export function byKind() {
  return Object.keys(KINDS).map(kind => ({
    kind,
    label: KINDS[kind],
    terms: TERMS.filter(t => t.kind === kind),
  })).filter(g => g.terms.length);
}

/** Substring search over term, gloss and aliases, for the palette and index. */
export function search(q, limit = 30) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits = [];
  for (const t of TERMS) {
    const inTerm = t.term.toLowerCase().indexOf(needle);
    const inAlias = t.aliases.some(a => a.toLowerCase().includes(needle));
    const inGloss = t.gloss.toLowerCase().includes(needle);
    if (inTerm === 0) hits.push([0, t]);
    else if (inTerm > 0 || inAlias) hits.push([1, t]);
    else if (inGloss) hits.push([2, t]);
  }
  return hits.sort((a, b) => a[0] - b[0] || a[1].term.localeCompare(b[1].term))
    .slice(0, limit).map(([, t]) => t);
}

export default { TERMS, byId, KINDS, tokenise, byKind, search };
