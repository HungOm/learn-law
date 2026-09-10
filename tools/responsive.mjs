/**
 * Load the app at six viewport widths and assert its GEOMETRY.
 *
 * This exists because a whole class of failure walked past every gate we had.
 * At 1920px the app rendered as a ~660px column pinned to the left edge with
 * roughly 1030px of dead space beside it, and the curriculum map was cut off
 * mid-row. Content, palette, design-lint, prose, density and icons all inspect
 * files. `smoke.mjs` runs the real thing, but asks whether it MOUNTED — heading
 * outline, accessible names, console errors — and a layout can be catastrophically
 * wrong while every one of those answers is yes. Nothing in this repo looked at
 * where anything actually landed on the screen.
 *
 * It asserts geometry, never pixels. A screenshot diff would fail on every
 * legitimate copy edit and teach people to ignore it; these checks only fire on
 * a fact a reader would notice — content they cannot reach, content that cannot
 * be scrolled to, a window mostly empty, a control too small for a finger.
 *
 * NOT in the `npm run check` chain, deliberately. Run it directly:
 *
 *     npm run build && node tools/responsive.mjs      # --all for every finding
 *
 * The build step is not a convenience. This harness can only ever see the tree
 * that is in `dist/`, so against a stale build it reports, with total
 * confidence, on a layout nobody is looking at any more — and the numbers look
 * exactly as authoritative as correct ones. That is the same trap as the two
 * below, one level further out: measuring something adjacent to the question
 * and reading the answer as though it were the question. It prints the build's
 * timestamp on every run so the mistake is visible rather than silent.
 *
 * WHAT THIS COVERS, and what it does not. It walks the fixed routes below plus
 * one lesson for every distinct figure kind present in the content, at each
 * width. That is a sample, not the corpus: 55 lessons share a handful of
 * layouts, so a defect in a layout is caught, and a defect in one lesson's
 * particular content is not. It says nothing about prose, correctness, or
 * whether a figure asserts something true — `check:content` and `check:prose`
 * own those. Read an OK from this file as "no layout regression in the shapes
 * sampled", never as "the change is fine".
 *
 * WHY IT CHECKS FOR COLLISIONS, which looks like an odd thing for a layout
 * harness to do. Diagram labels were once drawn on top of their own notes on
 * 20 figures at a time, and every gate we had read a value that was
 * individually correct while it happened: `design-lint` saw font sizes in
 * viewBox units and could not know where a baseline landed; `smoke` saw no
 * error, because nothing threw; this file saw no overflow, because the text was
 * inside its box. The labels were the right size, in the right boxes, and
 * written on top of each other — and that stayed true through 27 figures and
 * then 82. Nothing was wrong with any measurement. They were measurements of
 * the wrong thing, so the check that closes it has to look at the relation
 * between two elements rather than at either one.
 *
 * EVERY RESULT HERE IS A CHROME RESULT. The candidate list below finds Chrome
 * or Chromium and nothing else, so an OK means "no regression in Blink". Text
 * metrics, and therefore every wrap, every box height derived from a line
 * count, and every collision verdict above, differ between engines. WebKit on
 * an iPhone is the single most likely place for this corpus to be read and the
 * one place nothing in this repo has ever measured. Read the pass accordingly,
 * and do not let a green run stand in for a claim about Safari.
 *
 * Skips with a warning, not a failure, when the driver or Chrome is missing:
 * the other gates must stay runnable on a machine without a browser.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Widths chosen for what CHANGES at each, not for named devices: small phone,
// large phone, tablet portrait, tablet landscape / small laptop, desktop, and
// the wide desktop where the dead-space bug lived.
const WIDTHS = [360, 600, 780, 1024, 1440, 1920];

// The fixed part of the walk: the distinct layout shapes — index list, long
// prose, quiz chrome, dense figures, settings form, and the curriculum map that
// was clipped.
const BASE_ROUTES = [
  '#/', '#/lessons', '#/lesson/l-courts', '#/review', '#/quiz',
  '#/problems', '#/progress', '#/settings', '#/module/m-study-method',
  '#/cases', '#/case/x-tan-ying-hong',
];

const FIGURE_BLOCKS = new Set(['table', 'chart', 'diagram', 'steps', 'compare', 'figure']);

/**
 * One lesson per distinct figure kind, DERIVED from the content rather than
 * listed here.
 *
 * Two failures argue for deriving it. A hand-written list rots: it names the
 * lessons that happened to have figures on the day someone wrote it, and it
 * goes on passing while new kinds appear that it never loads. And a sample of
 * nine routes cannot speak for a change that touched thirty-two lessons — when
 * 54 figures landed across the corpus, the only lesson this file walked was
 * `l-courts`, which already had one. It reported OK, and that OK was about
 * nothing. A gate that looks authoritative and is not is worse than no gate,
 * because it converts "nobody checked" into "it passed".
 *
 * Deriving it also makes an absence visible: a kind that no content exercises
 * simply produces no route, which is the honest answer rather than a silent
 * pass. `matrix` is in that position at the time of writing.
 */
function lessonsByFigureKind() {
  const dir = join('content', 'lessons');
  const byKind = new Map();
  for (const file of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const lesson of data.lessons || []) {
      for (const section of lesson.sections || []) {
        for (const b of section.body || []) {
          if (!FIGURE_BLOCKS.has(b.t)) continue;
          const kind = b.t === 'diagram' ? `diagram:${b.kind}` : b.t;
          if (!byKind.has(kind)) byKind.set(kind, lesson.id);
        }
      }
    }
  }
  return byKind;
}

const FIGURE_KINDS = lessonsByFigureKind();
const FIGURE_ROUTES = [...new Set(FIGURE_KINDS.values())]
  .map((id) => `#/lesson/${id}`)
  .filter((r) => !BASE_ROUTES.includes(r));
const ROUTES = [...BASE_ROUTES, ...FIGURE_ROUTES];

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];

// Above this width there is enough room that a mostly-empty window is a bug
// rather than a reading measure doing its job.
const WIDE = 1280;
const TAP_MIN = 44;
// Sub-pixel: a 44px declaration can compute to 43.99 after a transform or a
// fractional layout. Failing that would be noise about nothing.
const EPS = 0.5;

let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { console.log('responsive: SKIPPED — playwright-core not installed (npm i)'); process.exit(0); }

const exe = CHROME_CANDIDATES.find(existsSync);
if (!exe) { console.log('responsive: SKIPPED — no Chrome found'); process.exit(0); }

// Same stale-dist refusal as smoke.mjs, and for the same reason: if a build
// lands while preview is serving, every route fails to fetch its chunks and
// every geometry check below reports a catastrophe that is really a rebuild.
// A gate whose false failures imitate its true ones teaches people to ignore it.
const distIndex = 'dist/index.html';
if (!existsSync(distIndex)) {
  console.error('responsive: FAILED — no dist/index.html. Run `npm run build` first.');
  process.exit(1);
}
const html = readFileSync(distIndex, 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(m => m[1]);
const lazyRefs = [...readdirSync(join('dist', 'assets'))]
  .filter(f => f.endsWith('.js'))
  .flatMap(f => [...readFileSync(join('dist', 'assets', f), 'utf8')
    .matchAll(/["'`](?:\.\/|assets\/)?([A-Za-z0-9._-]+-[A-Za-z0-9_-]{8}\.js)["'`]/g)]
    .map(m => m[1]))
  .filter(f => !existsSync(join('dist', 'assets', f)));
const missing = refs.filter(r => !existsSync(join('dist', r.replace(/^\.?\//, ''))))
  .concat([...new Set(lazyRefs)].map(f => `assets/${f} (lazily imported)`));
if (missing.length) {
  console.error('responsive: FAILED — dist is stale: it references files that are not there.');
  missing.forEach(m => console.error(`  - ${m}`));
  console.error('  A build probably landed while preview was serving. Rebuild and retry.');
  process.exit(1);
}

const ALL = process.argv.includes('--all');
const builtAt = statSync(distIndex).mtime;
// Compared against `mtimeMs` below, and it must be read the same way. `.mtime`
// is a Date and `.getTime()` truncates to whole milliseconds, while `.mtimeMs`
// carries APFS's sub-millisecond precision — so the two were unequal on a file
// nobody had touched and the run reported INCONCLUSIVE almost every time. A
// guard that fires on every run is indistinguishable from no guard: it taught
// two sessions today to read "dist was rebuilt during the run" as noise, which
// is exactly what it must never become.
// Guarded on WHAT dist contains, not when it was written.
//
// The mtime moves whenever anybody rebuilds, and on a working copy carrying
// several sessions that is every couple of minutes — measured here: 23:10:39,
// 23:11:53, 23:11:57, with two of the three producing byte-identical output. So
// an mtime guard reports a rebuild that changed nothing and throws away a run
// that was perfectly valid. Vite names each asset by a hash of its contents, so
// the set of filenames index.html references is a content fingerprint: a no-op
// rebuild leaves it identical, a real change does not.
//
// Sensitised before being trusted, and the first attempt was worthless — a CSS
// comment appended to learn.css left the emitted stylesheet byte-identical
// because the minifier strips it, so the guard "failed to fire" on a change
// that had not reached the output. A real declaration moved two of the four
// hashes. A control that cannot distinguish "did not fire" from "nothing
// happened" proves nothing.
const fingerprint = () => [...readFileSync(distIndex, 'utf8')
  .matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(m => m[1]).sort().join(' ');
const startedWith = fingerprint();
const ageMin = Math.round((Date.now() - builtAt.getTime()) / 60000);
console.log(`measuring dist/ built ${builtAt.toTimeString().slice(0, 8)}` +
  `${ageMin > 10 ? ` — ${ageMin} minutes ago; rebuild if the tree has moved` : ''}`);
console.log(`${ROUTES.length} routes: ${BASE_ROUTES.length} fixed, ` +
  `${FIGURE_ROUTES.length} derived to cover ${FIGURE_KINDS.size} figure kinds ` +
  `(${[...FIGURE_KINDS.keys()].sort().join(', ')})\n`);

// A port of our own, per process.
//
// This used to be a fixed 4179 — one past smoke's 4178 — which is right about
// the sibling tools and says nothing about a second SESSION running the chain.
// With `--strictPort` vite exits rather than falling back, so when another
// session already held the port our preview never started; the readiness probe
// then succeeded against THEIR server, and the run died with
// ERR_CONNECTION_REFUSED the moment they finished. The `serverDead` guard below
// cannot catch that case, because the port answers before our own spawn fails.
// Deriving the port from the pid removes the collision instead of detecting it,
// and matches diagram-cases.mjs. The base stays above smoke's range.
const port = 4380 + (process.pid % 40);
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'],
  { stdio: 'ignore', detached: false });

// Whether OUR server is the one answering.
//
// `--strictPort` makes vite exit rather than pick another port, so if something
// already holds this one the spawn dies immediately — and the readiness probe
// below still succeeds, because the thing already on the port answers it. The
// run then walks somebody else's server until they stop, and fails with
// `ERR_CONNECTION_REFUSED` halfway through. That is what happened when a second
// copy of this file was running on the same port: the probe saw that copy's
// preview, the copy finished and took it down, and this one had no server left.
let serverDead = false;
server.on('exit', () => { serverDead = true; });
const base = `http://localhost:${port}/`;
const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * Runs in the page. Returns measurements only — every judgement is made below.
 * Takes a single options object because that is all `page.evaluate` will pass.
 */
function measure({ tapMin, eps }) {
  const vw = document.documentElement.clientWidth;
  const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
  const label = (el) => {
    const cls = (el.className || '').toString().trim().split(/\s+/).filter(Boolean)[0];
    return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (cls ? `.${cls}` : '');
  };
  // Two ancestors of context. `a 47x15` is unactionable; `nav.rail > ul > a`
  // says whether it is chrome or prose, which is the whole question.
  const path = (el) => {
    const parts = [];
    for (let n = el, i = 0; n && i < 3 && n !== document.body; n = n.parentElement, i++) {
      parts.unshift(label(n));
    }
    return parts.join(' > ');
  };
  // Out of the accessibility tree and off the screen: not a control anyone can
  // reach, so not a control that can be too small or clipped.
  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    if (el.offsetParent === null && cs.position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const pane = document.querySelector('.main') || document.querySelector('main')
    || document.getElementById('root');
  const pr = pane ? pane.getBoundingClientRect() : null;

  // The pane's own box is not the measurement that matters, and taking it for
  // one is how the first version of this file passed a tree whose content was
  // a 660px column against the left edge: `.main` stretched the full width
  // while everything inside it huddled in a third of that. What a reader sees
  // is where the TEXT lands, so measure the text.
  //
  // Median edges rather than the union: one full-bleed rule or figure would
  // otherwise report the whole viewport as used and hide the column behind it.
  // SUBSTANTIAL text only. A first attempt took the median of every
  // text-bearing block and reported 10% of a 1920px viewport, because a page
  // with a table has dozens of three-word cells and six paragraphs, so the
  // median describes a table cell rather than the reading column. The question
  // here is where a RUN of prose lands, so only blocks carrying a real run of
  // it are measured, and the answer is their full span.
  const PROSE_CHARS = 40;
  const blocks = [];
  if (pane) {
    for (const el of pane.querySelectorAll('*')) {
      if (!shown(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'inline') continue;   // a run inside a line, not a block
      // Its OWN text, not its descendants': otherwise every wrapper up the tree
      // qualifies on the strength of the paragraph buried inside it.
      const own = [...el.childNodes]
        .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      if (own.length < PROSE_CHARS) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      blocks.push(r);
    }
  }
  // Fewer than three and there is no reading column to speak of — an index of
  // short links, say. Reporting a percentage off one or two blocks would be a
  // number with no claim behind it, so the width judgement is skipped instead.
  const ink = blocks.length >= 3
    ? {
        left: Math.min(...blocks.map(r => r.left)),
        right: Math.max(...blocks.map(r => r.right)),
        n: blocks.length,
      }
    : null;

  // Below this, a vertical overflow is a rounding artefact or an animation frame
  // rather than a reader losing something. A lost line of body text is ~32px.
  const Y_MIN_LOSS = 24;
  // And the box has to BE a box. The first Y run reported 27 findings, every
  // one of them `.focusview-surface (139px of content in 0px)` — a reader that
  // is closed, collapsed to zero height with its contents still mounted. That
  // is a hidden region, not a severed one, and it is the standard idiom for
  // both. The failure this catches is content cut off by a container that has a
  // size and is too small for it; a container with no size is not showing
  // anything and is not claiming to.
  const Y_MIN_BOX = 24;
  const clipped = [];
  const truncated = [];
  for (const el of document.querySelectorAll('*')) {
    if (!shown(el)) continue;
    const cs = getComputedStyle(el);
    // Both axes. This looked at `overflowX` only for most of its life, and a
    // vertical clip then cost a reader roughly 400px of a lesson with all
    // fourteen gates green over it: `.focusview-body` was `overflow-y: auto`
    // inside a `position: fixed` reader, but a flex item defaults to
    // `min-height: auto` and will not shrink below its content, so the scroll
    // never engaged and the pane simply ran past the bottom of the screen. The
    // check was not wrong about anything it looked at. It could only ever fire
    // on one axis, and passed confidently on the other.
    //
    // The argument against adding Y is that a vertical clip is usually a scroll
    // container doing its job. It is not: `overflow-y: hidden` with taller
    // content is unreachable however much the document scrolls, because the box
    // does not grow. What genuinely produces noise on this axis is animation —
    // framer-motion collapses a region by animating height with `overflow:
    // hidden`, so a frame caught mid-collapse is clipped and about to stop
    // being. Hence Y_MIN_LOSS, which is set past anything a rounding artefact
    // or a nearly-finished animation produces and well under a lost paragraph.
    const axis = (cs.overflowX === 'hidden' || cs.overflowX === 'clip')
        && el.scrollWidth > el.clientWidth + 2 ? 'x'
      : (cs.overflowY === 'hidden' || cs.overflowY === 'clip')
        && el.clientHeight >= Y_MIN_BOX
        && el.scrollHeight > el.clientHeight + Y_MIN_LOSS ? 'y'
      : null;
    if (!axis) continue;
    // Clipping is only a defect when a reader LOSES something to it. A
    // full-bleed decorative layer overflows its box on purpose — that is what
    // makes it full-bleed — and the first version of this check reported the
    // liquid background 54 times, once per route per width, for working
    // exactly as designed. Findings like that are how a harness teaches people
    // to skim past it, so the bar is: the element must hold text or a control,
    // and must not be hidden from assistive tech, before its clipping counts.
    //
    // Note the coupling this creates: the liquid field is exempt here BECAUSE
    // it is aria-hidden, so dropping that attribute would silently restart 54
    // findings a run. The field's invariants live in DESIGN.md 2.12.
    if (el.closest('[aria-hidden="true"]')) continue;
    if (!el.textContent.trim() && !el.querySelector(FOCUSABLE)) continue;
    // A deliberate ellipsis is a different claim from content simply severed,
    // so it is reported separately rather than folded in as the same failure.
    // A deliberate cut announces itself: `text-overflow: ellipsis` on one axis,
    // `-webkit-line-clamp` on the other. Both say "there is more, and I know" —
    // a different claim from content simply severed, so they are reported
    // separately rather than folded in as the same failure.
    const deliberate = axis === 'x'
      ? cs.textOverflow === 'ellipsis'
      : cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
    const have = axis === 'x' ? el.scrollWidth : el.scrollHeight;
    const room = axis === 'x' ? el.clientWidth : el.clientHeight;
    (deliberate ? truncated : clipped)
      .push(`${label(el)} (${have}px of content in ${room}px, ${axis === 'x' ? 'across' : 'down'})`);
  }

  // Focusable, per DESIGN.md 3: a bounding-box sweep OVERcounts (it flags
  // legends like .quiz-key that only look like controls) and UNDERcounts (a
  // min-height fix leaves a target thin in the other dimension). Hence the
  // focusable filter, and hence checking both dimensions.
  // WCAG 2.5.5 exempts a target that sits inline in a sentence: it cannot be
  // padded without wrecking the line, and DESIGN.md 3 is explicit that a
  // min-height floor on one does positive HARM — an inline-block contributes to
  // the line box, so the fix ragged-edges the leading across the whole reading
  // surface while never touching the width that was actually under the floor.
  // The test is structural, not a class: is there other text in the parent for
  // this one to be inline *in*. Without it this check reports every
  // cross-reference in 55 lessons and gets ignored, which is the overcount
  // DESIGN.md warns about in as many words.
  //
  // The exemption has to be earned, though, and DESIGN.md 3 names the abuse:
  // "a comma-separated run of cross-references — See also X, Y, Z — is a row of
  // controls wearing prose clothing and gets no exemption." A test that only
  // asks "is there other text in the parent" hands those rows the exemption on
  // the strength of their separators. So prose must DOMINATE: enough of it to
  // be a sentence, and more of it than there is link text.
  const inlineInProse = (el) => {
    if (getComputedStyle(el).display !== 'inline') return false;
    const p = el.parentElement;
    if (!p) return false;
    const links = [...p.querySelectorAll('a[href],button')];
    const linkText = links.reduce((n, a) => n + a.textContent.trim().length, 0);
    const prose = p.textContent.trim().length - linkText;
    return prose >= 24 && prose > linkText;
  };

  const small = [];
  let exempt = 0;
  for (const el of document.querySelectorAll(FOCUSABLE)) {
    if (el.disabled || el.type === 'hidden' || !shown(el)) continue;
    if (el.closest('.tap-exempt')) { exempt++; continue; }
    if (inlineInProse(el)) { exempt++; continue; }
    const r = el.getBoundingClientRect();
    if (r.width + eps < tapMin || r.height + eps < tapMin) {
      small.push(`${path(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }

  // The widest thing sticking out past the viewport, so an overflow report says
  // what to go and look at rather than only that something is wrong.
  let worst = null;
  if (document.documentElement.scrollWidth > vw + 1) {
    for (const el of document.querySelectorAll('body *')) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && (!worst || r.right > worst.right)) {
        worst = { right: r.right, name: label(el) };
      }
    }
  }

  // Pairwise bounding-box intersection over each diagram's text. The 3-unit
  // floor keeps kerning and touching descenders from firing it; the real
  // failures ran from 10 to 120 units, so the threshold is not delicate.
  const collisions = [];
  for (const svg of document.querySelectorAll('svg.dia-svg')) {
    const ts = [];
    for (const t of svg.querySelectorAll('text')) {
      let bb = null;
      try { bb = t.getBBox(); } catch { /* not rendered */ }
      if (bb && bb.width > 0 && bb.height > 0) {
        ts.push({ bb, s: (t.textContent || '').trim().slice(0, 26) });
      }
    }
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i].bb, c = ts[j].bb;
        const ox = Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x);
        const oy = Math.min(a.y + a.height, c.y + c.height) - Math.max(a.y, c.y);
        if (ox > 3 && oy > 3) {
          collisions.push(`"${ts[i].s}" over "${ts[j].s}" by ${Math.round(ox)}x${Math.round(oy)}u`);
        }
      }
    }
  }

  return {
    vw,
    collisions: collisions.slice(0, 6),
    docScrollWidth: document.documentElement.scrollWidth,
    pane: pr ? { left: pr.left, right: pr.right, width: pr.width } : null,
    paneName: pane ? label(pane) : null,
    ink,
    exempt,
    overflowBy: Math.max(0, document.documentElement.scrollWidth - vw),
    worst,
    clipped: clipped.slice(0, 4),
    truncated: truncated.slice(0, 4),
    small: [...new Set(small)].slice(0, 6),
  };
}

/**
 * Open every lesson before measuring anything.
 *
 * Lessons are gated: until you have read the one before and passed its quiz,
 * `#/lesson/l-courts` renders a short "finish X to open this" card, not a
 * lesson. A fresh browser profile has no progress, so without this the harness
 * measures that card — six short lines — and reports its geometry as the
 * lesson's. The first version of this file did exactly that, and the numbers it
 * produced for the reading routes were numbers about a placeholder.
 *
 * That is the same mistake as the other three recorded here, in its most
 * expensive form yet: every check was working, the page was real, the app had
 * genuinely mounted — and the thing being measured was not the thing anyone
 * wanted measured. An empty database is a state a gate walks into by default,
 * so a gate that never seeds one only ever sees the empty-state view.
 *
 * `unlockAll` is a real user setting (Settings screen), not a test hook, so
 * this measures a configuration the app actually ships.
 */
async function unlockEverything(page) {
  try {
    await page.goto(base, { waitUntil: 'load' });
  } catch (err) {
    // Without this the raw goto error escapes as a stack trace and the useful
    // sentence — already written, twenty lines up — never prints.
    console.error(`responsive: FAILED — could not reach the preview on port ${port}.`);
    console.error(`  ${String(err).split('\n')[0]}`);
    console.error('  Nothing was measured. This is a harness failure, not a layout failure.');
    process.exit(1);
  }
  await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('lawstudy', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const t = db.transaction('meta', 'readwrite');
      t.objectStore('meta').put({ key: 'unlockAll', value: true });
      t.oncomplete = () => { db.close(); resolve(); };
      t.onerror = () => reject(t.error);
    };
  }));
  // The setting is read once, in the provider's init effect, so it only takes
  // hold on a fresh document.
  await page.reload({ waitUntil: 'load' });
}

// A machine-readable tally, printed on EVERY exit path.
//
// The findings list is capped at 60 without --all, and the INCONCLUSIVE branch
// exits before printing any of it. So anyone counting a category — which is
// exactly what the sensitised control does — can read a truncated or absent
// list as a zero, and by this file's own rule a zero means "the walk never
// reached the figures". It happened: a sensitised run that produced 212
// findings reported 0 collisions to a grep, because collisions fell past the
// cap. A missing or truncated count must not be indistinguishable from a real
// one, or the control silences itself.
const TALLY = { overflow: 0, clipped: 0, collisions: 0, small: 0, unnamed: 0 };
let tallyPrinted = false;
const printTally = () => {
  if (tallyPrinted) return;
  tallyPrinted = true;
  const total = Object.values(TALLY).reduce((a, c) => a + c, 0);
  console.log(`responsive: counts — ${Object.entries(TALLY)
    .map(([k, v]) => `${k}=${v}`).join(' ')} total=${total}`);
};
process.on('exit', printTally);

const failures = [];
const notes = [];
const rows = [];

try {
  // Wait for preview, and FAIL LOUDLY if it never answers.
  //
  // The first version gave up after 10s and carried on regardless, so a server
  // that had not started yet surfaced as `ERR_CONNECTION_REFUSED` from a
  // `page.goto` deep in the run — a crash that reads like a broken harness and
  // says nothing about why. It only ever happened inside `npm run check`, where
  // this runs immediately after `check:smoke` has just released its own preview
  // on the neighbouring port, so standalone runs never saw it. That is the
  // worst shape a gate failure can take: red for a reason unrelated to what it
  // checks, and only in the context where other people meet it.
  let up = false;
  for (let i = 0; i < 120 && !up && !serverDead; i++) {
    up = await fetch(base).then((r) => r.ok).catch(() => false);
    if (!up) await wait(250);
  }
  if (serverDead) {
    console.error(`responsive: FAILED — vite preview exited immediately on port ${port}.`);
    console.error('  Something else is bound to it (--strictPort does not fall back).');
    console.error('  Nothing was measured. This is a harness failure, not a layout failure.');
    process.exit(1);
  }
  if (!up) {
    console.error(`responsive: FAILED — vite preview did not answer on ${port} within 30s.`);
    console.error('  Nothing was measured. This is a harness failure, not a layout failure.');
    console.error('  If a preview is already bound to that port, stop it and re-run.');
    process.exit(1);
  }
  const browser = await chromium.launch({ executablePath: exe });

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await unlockEverything(page);
    let minPct = 100, worstRoute = '', clippedCount = 0, smallCount = 0, overflowCount = 0, collideCount = 0;

    for (const route of ROUTES) {
      await page.goto(base + route, { waitUntil: 'load' });
      // Web fonts change every box on the page. Measuring before they settle
      // reports the fallback face's geometry, which is not what ships.
      await page.evaluate(() => document.fonts.ready);
      await wait(450);

      // Page through a stepped lesson, measuring every step.
      //
      // Below 1024 a lesson paginates and only the current section is IN THE
      // DOM — `.lsec` is length 1, later sections are absent rather than
      // hidden. A walk that loads the route and stops therefore measures only
      // whatever happens to sit on step 1. Measured when this was added: 2 of
      // 12 figures across ten lessons, 17%, with the gate reporting OK for the
      // other ten because it never rendered them. Paging restores it to 12/12.
      for (let stepIdx = 0; stepIdx < 40; stepIdx++) {
      const m = await page.evaluate(measure, { tapMin: TAP_MIN, eps: EPS });
      const at = `${route} @${width}${stepIdx ? ` step ${stepIdx + 1}` : ''}`;

      if (m.overflowBy > 1) {
        overflowCount++;
        const who = m.worst ? ` — widest is ${m.worst.name}` : '';
        TALLY.overflow++;
        failures.push(`${at}  scrolls horizontally by ${Math.round(m.overflowBy)}px${who}`);
      }
      for (const c of m.clipped) {
        clippedCount++;
        TALLY.clipped++;
        failures.push(`${at}  content clipped and unreachable: ${c}`);
      }
      for (const c of m.collisions || []) {
        collideCount++;
        TALLY.collisions++;
        failures.push(`${at}  diagram text collides: ${c}`);
      }

      if (!m.pane) {
        failures.push(`${at}  no content pane found (.main / main / #root)`);
      } else if (!m.ink) {
        // Not a failure: some screens legitimately have no reading column.
        if (width >= WIDE) notes.push(`${at}  no prose column to measure (skipped)`);
      } else {
        const inkW = m.ink.right - m.ink.left;
        const pct = Math.round((inkW / m.vw) * 100);
        if (pct < minPct) { minPct = pct; worstRoute = route; }
        if (width >= WIDE) {
          const left = Math.round(m.ink.left);
          const right = Math.round(m.vw - m.ink.right);
          const paneW = Math.round(m.pane.width);
          // A NOTE, never a failure. A capped reading measure is correct — 68ch
          // is deliberate here and is not going to widen — so a rule that fires
          // on well-set prose is a rule people learn to ignore, and a gate
          // nobody believes is worse than no gate. This started life as a
          // failure and was demoted on exactly that argument.
          if (pct < 50) {
            notes.push(`${at}  text occupies ${pct}% of the ${m.vw}px viewport ` +
              `(${Math.round(inkW)}px wide, ${left}px / ${right}px gutters)`);
          }
          // A separate finding with a separate fix, which is why it is no
          // longer buried in the line above: the pane reserves width it never
          // uses. The answer to that is marginal apparatus in the space, not a
          // wider measure.
          if (paneW > inkW + 240) {
            notes.push(`${at}  ${m.paneName} is ${paneW}px holding ${Math.round(inkW)}px of text — ` +
              `${paneW - Math.round(inkW)}px reserved and unused`);
          }
          // The sharper signal, and the one that separates a capped reading
          // measure doing its job from a column shoved against one edge: a
          // centred measure has even gutters, this bug puts all the space on
          // one side. Reported even when the percentage passes, because a
          // 55%-wide column pinned left is still the same mistake.
          const gap = Math.abs(left - right);
          if (gap > 96 && gap > 0.25 * m.vw) {
            failures.push(`${at}  text is pinned to the ` +
              `${left < right ? 'left' : 'right'}: ${left}px / ${right}px gutters`);
          }
          // Truncation is normal in a narrow column and suspicious in a wide
          // one, where there was room to simply show the text.
          for (const t of m.truncated) notes.push(`${at}  truncated with room to spare: ${t}`);
        }
      }

      for (const s of m.small) {
        smallCount++;
        TALLY.small++;
        failures.push(`${at}  tap target under ${TAP_MIN}x${TAP_MIN}: ${s}`);
      }

      // Advance, and while we are driving the control, check that it announces.
      // Replacing the whole reading surface without moving focus leaves a
      // screen-reader user with no idea the content changed (WCAG 4.1.3); the
      // app moves focus to the new section heading, and this is the only gate
      // in a position to notice if that ever stops happening.
      const advanced = await page.evaluate(() => {
        const b = document.querySelector('.stepper-btn--next');
        if (!b || b.disabled) return false;
        b.click();
        return true;
      });
      if (!advanced) break;
      await wait(420);
      const landed = await page.evaluate(() => {
        const a = document.activeElement;
        return a ? `${a.tagName.toLowerCase()}.${String(a.className || '').split(' ')[0]}` : '(none)';
      });
      if (landed !== 'h2.lsec-h') {
        failures.push(`${route} @${width}  Next moved the page but focus landed on ${landed}, `
          + 'not the new section heading — the change is unannounced (WCAG 4.1.3)');
      }
      }
    }

    rows.push({ width, minPct, worstRoute, overflowCount, clippedCount, smallCount, collideCount });
    await page.close();
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
}

console.log(' width  text  narrowest at              overflow  clipped  small-targets  collisions');
for (const r of rows) {
  console.log(
    `${String(r.width).padStart(6)}` +
    `${(r.minPct + '%').padStart(6)}` +
    `  ${r.worstRoute.padEnd(24)}` +
    `${String(r.overflowCount).padStart(9)}` +
    `${String(r.clippedCount).padStart(9)}` +
    `${String(r.smallCount).padStart(15)}` +
    `${String(r.collideCount).padStart(12)}`);
}
console.log(`\n${ROUTES.length} routes x ${WIDTHS.length} widths; ` +
  `text % is the median text block's span as a share of the viewport, ` +
  `narrowest route at that width, against a 50% floor above ${WIDE}px`);

const uniqNotes = [...new Set(notes)];
if (uniqNotes.length) {
  console.log('\nnotes (not failures):');
  for (const n of ALL ? uniqNotes : uniqNotes.slice(0, 10)) console.log(`  - ${n}`);
  if (!ALL && uniqNotes.length > 10) console.log(`  ... and ${uniqNotes.length - 10} more (--all)`);
}

// A build landing DURING the walk is not a route failure.
//
// The stale-dist guard above runs before the browser starts, and it is right
// about the moment it runs: dist was consistent then. The race is a build
// landing while the walk is in flight, which replaces the hashed chunk
// filenames the pages are still fetching, and surfaces as `ERR_FAILED` against
// a route name — indistinguishable from a genuinely broken route, and it sends
// the next person hunting a defect that was never there.
//
// Seeding `unlockAll` widened this considerably: a locked lesson renders a
// panel that needs no module chunk, while a real lesson body pulls its
// code-split chunk on demand. Every lesson route is now lazy where two of them
// used to be inert. With several sessions building through an afternoon, this
// will fire.
const movedDuringRun = fingerprint() !== startedWith;
if (movedDuringRun) {
  const n = new Set(failures).size;
  if (n) {
    console.error(`responsive: INCONCLUSIVE — dist was rebuilt during the run, so these ${n} findings are probably artefacts of it.`);
    console.error('  Nothing here is evidence of a broken route. Rebuild and re-run.');
    process.exit(1);
  }
  console.log('responsive: note — dist was rebuilt during the run; it passed anyway.');
}

const uniqFailures = [...new Set(failures)];
if (uniqFailures.length) {
  console.error(`\nresponsive: FAILED — ${uniqFailures.length} findings`);
  for (const f of ALL ? uniqFailures : uniqFailures.slice(0, 60)) console.error(`  - ${f}`);
  if (!ALL && uniqFailures.length > 60) {
    console.error(`  ... and ${uniqFailures.length - 60} more (--all)`);
  }
  process.exit(1);
}
console.log('\nresponsive: OK — no overflow, clipping, collisions, dead space or undersized targets');
