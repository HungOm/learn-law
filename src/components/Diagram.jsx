import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Diagrams for lesson prose.
 *
 * All of them are inline SVG drawn against the app's CSS variables rather than
 * hard-coded colour, so they follow the theme without a second copy. They carry
 * no data the prose does not already state — a diagram here is a re-encoding of
 * a structure that is hard to hold in a sentence (a hierarchy, an order of
 * steps, a branch), never a decoration and never a claim the text does not make.
 *
 * Every one is given a `<title>` and a text alternative, because a structure
 * that is only available as a picture is a structure some readers do not get.
 */
export default function Diagram({ kind, title, caption, alt, ...rest }) {
  const Body = KINDS[kind];
  const [boxRef, boxW] = useBoxWidth();
  if (!Body) return null;
  // `alt` reaches the reader through the SVG's aria-label, not as visible text.
  // The scroll box needs a name of its own: `title` is what a sighted reader
  // sees above the figure, so it is what the box should announce.
  const label = title || alt || `${kind} diagram`;
  return (
    <motion.figure
      className={`dia dia-${kind}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {title && <figcaption className="dia-title">{title}</figcaption>}
      {/* The figure is wider than the reading column on a phone and scrolls
          inside this box. A scroll container with nothing focusable in it is
          reachable by keyboard only through Chrome's focusable-scrollers
          behaviour, which is borrowed rather than declared: WebKit does not
          implement it, so on iOS Safari the figure cannot be reached at all,
          and in Chrome it disappears the moment anything focusable is added
          inside — silently, with nothing in the gates to catch it. The
          tabIndex makes the stop explicit, and the role and label stop it
          announcing as an unnamed generic the reader cannot identify.

          `.table-wrap` carries the identical treatment in Blocks.jsx,
          Chart.jsx and Insight.jsx for the same reason. Change all four or
          none of them: a scroll box that is focusable in one place and not
          the next is worse than either, because the reader learns a rule that
          then fails. The stop is unconditional rather than tied to whether
          the box currently overflows — a ResizeObserver toggling tabIndex
          fails silently when it desynchronises, leaving a scrolling box
          unreachable with nothing in the gates to notice. */}
      <div className="dia-body" ref={boxRef} tabIndex={0} role="group" aria-label={label}>
        {boxW > 0 && <Body {...rest} note={alt} W={Math.max(MIN_W, boxW)} />}
      </div>
      {caption && <figcaption className="dia-caption">{caption}</figcaption>}
    </motion.figure>
  );
}

const draw = (i = 0) => ({
  initial: { opacity: 0, scale: 0.94 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true },
  transition: { delay: 0.06 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
});

/** Wrap a label onto lines of at most `n` characters, on word boundaries. */
function wrap(text, n) {
  // A word longer than the whole budget cannot be placed by word-breaking, and
  // an unbroken one runs straight out of the viewBox — where it is clipped, not
  // scrolled to. Statute citations and compound Malay place names both reach
  // this. Hard-break it rather than lose it.
  const words = String(text).split(/\s+/).flatMap(w => {
    if (w.length <= n) return [w];
    const parts = [];
    for (let i = 0; i < w.length; i += n) parts.push(w.slice(i, i + n));
    return parts;
  });
  const lines = [];
  let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= n) line += ' ' + w;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The verdict glyph: a tick or a cross, drawn.
 *
 * Colour cannot be the carrier here. The two verdict fills differ by a ΔE of
 * 0.024 in normal vision — below the just-noticeable difference — so the tint is
 * reinforcement for this, never a substitute.
 */
function Verdict({ x, y, r = 9, tone }) {
  if (tone !== 'correct' && tone !== 'wrong') return null;
  const k = r * 0.5;
  return (
    <g className={`dia-verdict is-${tone}`} aria-hidden="true">
      <circle cx={x} cy={y} r={r} className="dia-verdict-disc" />
      {tone === 'correct'
        ? <path d={`M ${x - k} ${y} l ${k * 0.75} ${k * 0.8} l ${k * 1.25} ${-k * 1.5}`} className="dia-verdict-mark" />
        : <path d={`M ${x - k * 0.8} ${y - k * 0.8} l ${k * 1.6} ${k * 1.6} M ${x + k * 0.8} ${y - k * 0.8} l ${-k * 1.6} ${k * 1.6}`}
            className="dia-verdict-mark" />}
    </g>
  );
}

// Roughly the advance width of the sans at 1 unit of font-size, measured
// against the rendered diagrams. Used to turn a box width into a character
// budget, with 14% held back so text never touches its border.
const CH = 0.45;
const budget = (boxW, size, pad = 0.86) => Math.max(8, Math.floor((boxW * pad) / (size * CH)));

// --------------------------------------------------------- one unit, one pixel
// Every diagram is drawn against a viewBox as wide as the box it is rendered
// into, so a viewBox unit IS a CSS pixel and `fontSize={15}` is 15px on screen.
//
// It used to be drawn at a fixed 760 units and squeezed into whatever space
// there was, which made every font size a RATIO — `size x (rendered / 760)` —
// and a 14-unit note came out at 10px on a phone. The fix then was a
// `min-width` on `.dia-svg` pinning the render wide enough for the ratio to
// clear the 12px floor, and the cost was that every figure scrolled sideways
// on a phone. That trade is now refused: figures fit the screen.
//
// Drawing 1:1 removes the whole class of problem rather than re-tuning it.
// There is no ratio, so there is no floor arithmetic, no constant here that has
// to be kept in step with a stylesheet, and no way for a CSS change to silently
// shrink type. What it costs instead is LAYOUT: 326 units cannot hold four
// boxes across, so each kind below reflows on the width it is actually given.
const SZ = {
  label: 15,
  note: 13.5,
  head: 13.5,
  year: 14,
  num: 13,
};

// The width a diagram is drawn at, measured from the box it sits in. Below
// this a phone in portrait with the sheet's padding has nothing left to draw
// in, and the reflow rules stop being able to help.
const MIN_W = 260;

/** The rendered width of an element, tracked as it changes. */
function useBoxWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver !== 'function') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      // Round: a fractional viewBox changes on every scroll-bar flicker and
      // re-renders the whole figure for a difference nobody can see.
      setW(prev => (Math.abs(prev - next) > 0.5 ? Math.round(next) : prev));
    });
    ro.observe(node);
    setW(Math.round(node.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// ------------------------------------------------------- stacking the labels
// A label and its note are a vertical STACK, not two fixed offsets. They used
// to be literals tuned by eye against 15-unit type; raising the sizes for the
// floor made every label taller, and any label that wrapped to a second line
// was then written straight over its own note - 20 colliding pairs across the
// corpus, in `flow` worst of all. Nothing in the check chain can see that:
// design-lint reads units and cannot know where a baseline lands, and smoke
// reports no error because there is no error, only text on top of text.
//
// So the geometry is derived from SZ here. Raising a size moves the layout
// with it, and a box grows to fit what it actually contains rather than
// hoping the old height still works.
const LINE = 1.2;                    // a line box, as a multiple of font size
const ASC = 0.78;                    // baseline sits this far below a line's top
const PAD = 10;                      // inside a box, above and below
const GAP = 5;                       // between a label block and its note

const lineBox = size => size * LINE;
const linesOf = (text, chars) => wrap(String(text ?? ''), chars).length;
const stackH = (ll, nl) => ll * lineBox(SZ.label) + (nl ? GAP + nl * lineBox(SZ.note) : 0);

/** `top` anchors the block by its top edge; `y` still centres it, for the
 *  cases that genuinely want a centred label and have nothing under it. */
function Lines({ text, x, y, top, size = SZ.label, lh = lineBox(size), chars = 22, className = 'dia-label', anchor }) {
  const lines = wrap(text, chars);
  const first = top != null ? top + size * ASC : y - ((lines.length - 1) * lh) / 2;
  // Inline rather than a class: `.dia-label { text-anchor: middle }` is a
  // stylesheet rule, and a stylesheet beats an SVG presentation attribute -
  // the same way `.dia-num`'s font-size silently overruled this file's. A
  // style property is the one thing that wins without owning plates.css.
  return (
    <text x={x} y={first} className={className} fontSize={size}
      style={anchor ? { textAnchor: anchor } : undefined}>
      {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>{l}</tspan>)}
    </text>
  );
}

// ---------------------------------------------------------------- hierarchy
// Rows of boxes, highest authority at the top, joined by a spine. Used for the
// court hierarchy and for anything else where "above" means "binds".

function Hierarchy({ rows = [], note, W }) {
  // A row of two on a 326px phone is two 150px boxes holding nine characters a
  // line. One per row is not a degraded version of the diagram — for a
  // hierarchy it is the same claim, since "above" still means "binds".
  const perRow = Math.max(1, Math.floor((W + 16) / (180 + 16)));
  const laid = rows.flatMap(row => {
    const nodes = Array.isArray(row) ? row : [row];
    if (nodes.length <= perRow) return [nodes];
    const out = [];
    for (let i = 0; i < nodes.length; i += perRow) out.push(nodes.slice(i, i + perRow));
    return out;
  });
  const geom = laid.map(nodes => {
    const boxW = Math.min(300, (W - 40 - (nodes.length - 1) * 16) / nodes.length);
    return {
      boxW,
      nodes,
      cells: nodes.map(n => {
        const ll = linesOf(n.label, budget(boxW, SZ.label));
        const nl = n.note ? linesOf(n.note, budget(boxW, SZ.note)) : 0;
        return { ll, nl, h: stackH(ll, nl) };
      }),
    };
  });
  const boxH = Math.max(64, ...geom.flatMap(g => g.cells.map(c => c.h + 2 * PAD)));
  const rowH = boxH + 20;
  const H = laid.length * rowH + 20;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dia-svg" role="img" aria-label={note || 'hierarchy'}>
      {geom.map((g, r) => {
        const total = g.nodes.length * g.boxW + (g.nodes.length - 1) * 16;
        const x0 = (W - total) / 2;
        const y = 12 + r * rowH;
        return (
          <g key={r}>
            {r > 0 && (
              <line x1={W / 2} y1={y - 12} x2={W / 2} y2={y} className="dia-spine" />
            )}
            {g.nodes.map((n, i) => {
              const c = g.cells[i];
              const x = x0 + i * (g.boxW + 16);
              const top = y + (boxH - c.h) / 2;
              return (
                <motion.g key={i} {...draw(r * 2 + i)}>
                  <rect x={x} y={y} width={g.boxW} height={boxH} rx={3}
                    className={`dia-box ${n.tone ? `is-${n.tone}` : ''}`} />
                  <Verdict x={x + g.boxW - 14} y={y + 14} r={9} tone={n.tone} />
                  <Lines text={n.label} x={x + g.boxW / 2} top={top} chars={budget(g.boxW, SZ.label)} />
                  {n.note && (
                    <Lines text={n.note} x={x + g.boxW / 2} top={top + c.ll * lineBox(SZ.label) + GAP}
                      size={SZ.note} chars={budget(g.boxW, SZ.note)} className="dia-note" />
                  )}
                </motion.g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- flow
// Steps in order, left to right, wrapping to a second line where needed.

function Flow({ steps = [], note, W }) {
  // 190 units is the narrowest a step box can be and still hold a label of a
  // few words with its note; below that the budget collapses to single words.
  const fit = Math.max(1, Math.floor((W + 30) / (190 + 30)));
  const perRow = Math.min(steps.length, steps.length > 4 ? Math.min(fit, Math.ceil(steps.length / 2)) : fit);
  const rows = [];
  for (let i = 0; i < steps.length; i += perRow) rows.push(steps.slice(i, i + perRow));
  const gap = 30;
  // The badge holds a two-digit numeral at SZ.num, so it is sized from the
  // type rather than left at the radius that suited 12-unit digits.
  const BADGE = Math.max(11, SZ.num * 0.45 + 5);
  const headroom = 2 * BADGE + 8;
  const geom = rows.map(row => {
    const boxW = (W - 24 - (row.length - 1) * gap) / row.length;
    return {
      row, boxW,
      cells: row.map(s2 => {
        const ll = linesOf(s2.label, budget(boxW, SZ.label));
        const nl = s2.note ? linesOf(s2.note, budget(boxW, SZ.note)) : 0;
        return { ll, nl, h: stackH(ll, nl) };
      }),
    };
  });
  // The badge sits in the top-left corner, so the stack starts BELOW it rather
  // than being centred through it - that collision is what a taller numeral
  // produced once the CSS override on .dia-num was removed.
  const boxH = Math.max(74, ...geom.flatMap(g => g.cells.map(c => c.h + headroom + PAD)));
  const rowH = boxH + 34;
  const H = rows.length * rowH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dia-svg" role="img" aria-label={note || 'sequence of steps'}>
      <defs>
        <marker id="dia-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="dia-arrowhead" />
        </marker>
      </defs>
      {geom.map((g, r) => {
        const y = r * rowH + 12;
        return (
          <g key={r}>
            {g.row.map((s2, i) => {
              const c = g.cells[i];
              const x = 12 + i * (g.boxW + gap);
              const cx = x + 4 + BADGE;
              const cy = y + 4 + BADGE;
              const top = y + headroom + (boxH - headroom - PAD - c.h) / 2;
              return (
                <motion.g key={i} {...draw(r * perRow + i)}>
                  <rect x={x} y={y} width={g.boxW} height={boxH} rx={3} className="dia-box" />
                  <circle cx={cx} cy={cy} r={BADGE} className="dia-num-bg" />
                  <text x={cx} y={cy + SZ.num * 0.35} className="dia-num" fontSize={SZ.num}>{r * perRow + i + 1}</text>
                  <Lines text={s2.label} x={x + g.boxW / 2} top={top} chars={budget(g.boxW, SZ.label)} />
                  {s2.note && (
                    <Lines text={s2.note} x={x + g.boxW / 2} top={top + c.ll * lineBox(SZ.label) + GAP}
                      size={SZ.note} chars={budget(g.boxW, SZ.note)} className="dia-note" />
                  )}
                  {i < g.row.length - 1 && (
                    <line x1={x + g.boxW + 5} y1={y + boxH / 2} x2={x + g.boxW + gap - 5} y2={y + boxH / 2}
                      className="dia-arrow" markerEnd="url(#dia-arrow)" />
                  )}
                </motion.g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- branch
// One question, several answers. The shape of most classification problems:
// how possession was obtained, which limb of s 300, which mode of commencement.

function Branch({ question, branches = [], note, W }) {
  const n = branches.length;
  // The question box was 380 units wide against a 760-unit drawing. Drawn 1:1
  // that is wider than a phone, so it takes the width it is given.
  const qW = Math.min(380, W - 24);
  const qy = 10;
  const qChars = budget(qW, SZ.label);
  const qLines = linesOf(question, qChars);
  const qH = Math.max(44, qLines * lineBox(SZ.label) + 2 * PAD);

  // Four branches across a phone is four 70-unit boxes: a column of single
  // words. Wrapping to rows keeps each branch readable, and a branch nobody
  // can read is not a branch. 170 is the narrowest box that still holds a
  // short phrase with its condition above it.
  const perRow = Math.max(1, Math.min(n, Math.floor((W + 14) / (170 + 14))));
  const rows = [];
  for (let i = 0; i < n; i += perRow) rows.push(branches.slice(i, i + perRow));

  const geom = rows.map(row => {
    const boxW = Math.min(230, (W - 24 - (row.length - 1) * 14) / row.length);
    const condChars = budget(boxW, SZ.note, 0.9);
    const condLines = Math.max(1, ...row.map(b => (b.cond ? linesOf(b.cond, condChars) : 1)));
    const cells = row.map(b => {
      const ll = linesOf(b.label, budget(boxW, SZ.label));
      const nl = b.note ? linesOf(b.note, budget(boxW, SZ.note)) : 0;
      return { ll, nl, h: stackH(ll, nl) };
    });
    return {
      row, boxW, condChars,
      condH: condLines * lineBox(SZ.note),
      boxH: Math.max(74, ...cells.map(c => c.h + 2 * PAD)),
      cells,
    };
  });

  let cursor = qy + qH + 30;
  const placed = geom.map(g => {
    const top = cursor + g.condH;
    cursor = top + g.boxH + 22;
    return { ...g, top };
  });
  const H = cursor - 14;
  const lastTop = placed[placed.length - 1]?.top ?? qy + qH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dia-svg" role="img" aria-label={note || question}>
      <motion.g {...draw(0)}>
        <rect x={(W - qW) / 2} y={qy} width={qW} height={qH} rx={Math.min(22, qH / 2)} className="dia-box is-question" />
        <Lines text={question} x={W / 2} top={qy + (qH - qLines * lineBox(SZ.label)) / 2} chars={qChars} />
      </motion.g>

      {/* One spine down the middle when the branches wrap, rather than a
          separate elbow from the question to every box: at four rows the
          elbows cross each other and read as a circuit diagram. */}
      {placed.length > 1 && (
        <line x1={W / 2} y1={qy + qH} x2={W / 2} y2={lastTop - 6} className="dia-arrow" />
      )}

      {placed.map((g, r) => {
        const total = g.row.length * g.boxW + (g.row.length - 1) * 14;
        const x0 = (W - total) / 2;
        return g.row.map((b, i) => {
          const c = g.cells[i];
          const x = x0 + i * (g.boxW + 14);
          const cx = x + g.boxW / 2;
          const condTop = g.top - 10 - g.condH;
          const from = placed.length > 1 ? g.top - 16 : qy + qH + 16;
          return (
            <motion.g key={`${r}-${i}`} {...draw(r * perRow + i + 1)}>
              <path
                d={placed.length > 1
                  ? `M ${W / 2} ${from} H ${cx} V ${condTop - 6}`
                  : `M ${W / 2} ${qy + qH} V ${from} H ${cx} V ${condTop - 6}`}
                className="dia-arrow" fill="none" />
              <Lines text={b.cond} x={cx} top={condTop} size={SZ.note} chars={g.condChars} className="dia-cond" />
              <rect x={x} y={g.top} width={g.boxW} height={g.boxH} rx={3}
                className={`dia-box ${b.tone ? `is-${b.tone}` : ''}`} />
              <Verdict x={x + g.boxW - 16} y={g.top + 16} r={10} tone={b.tone} />
              <Lines text={b.label} x={cx} top={g.top + (g.boxH - c.h) / 2} chars={budget(g.boxW, SZ.label)} />
              {b.note && (
                <Lines text={b.note} x={cx} top={g.top + (g.boxH - c.h) / 2 + c.ll * lineBox(SZ.label) + GAP}
                  size={SZ.note} chars={budget(g.boxW, SZ.note)} className="dia-note" />
              )}
            </motion.g>
          );
        });
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- timeline
// Dated events on an axis. Every entry carries a real date; a timeline with an
// invented one would be the app asserting a fact it cannot support.

function Timeline({ events = [], note, W }) {
  // The year column was 112 units against a 760-unit drawing — 15%. On a 326px
  // phone a fixed 112 is a third of the width spent on a four-digit year, so it
  // scales — but not below what the year itself needs. The year is anchored
  // `end` against the spine, so a gutter narrower than the text runs it off the
  // left edge into negative x, where it is clipped rather than scrolled to:
  // measured at 390px before this was derived, three years off the edge.
  // CH is the advance of average PROSE. A year is semibold and tabular, which
  // is wider: measured, "1965" at 14 units is 33.6 units across, or 0.60 per
  // unit of font-size against prose's 0.45. Using CH here under-reserved the
  // gutter by a quarter and put three years at x = -3.6.
  const CH_NUM = 0.62;
  const yearW = Math.max(28, ...events.map(e => String(e.year || '').length * CH_NUM * SZ.year));
  const tx = Math.max(Math.round(yearW + 36), Math.min(112, Math.round(W * 0.15)));
  const spineX = tx - 20;
  // These used to be unwrapped <text>. A case name is long - "Adorna
  // Properties v Boonsom Boonyanit" is 38 characters before the note starts -
  // and an unwrapped label simply ran out through the right edge of the
  // viewBox, where it is clipped rather than scrolled to.
  const lc = budget(W - tx - 12, SZ.label);
  const nc = budget(W - tx - 12, SZ.note);
  const rows = events.map(e => {
    const ll = linesOf(e.label, lc);
    const nl = e.note ? linesOf(e.note, nc) : 0;
    return { e, ll, nl, h: stackH(ll, nl) };
  });
  const step = Math.max(58, ...rows.map(r => r.h + 30));
  const H = 44 + events.length * step;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dia-svg" role="img" aria-label={note || 'timeline'}>
      <line x1={spineX} y1={14} x2={spineX} y2={H - 14} className="dia-spine" />
      {rows.map((r, i) => {
        const y = 32 + i * step;
        const top = y - 10;
        return (
          <motion.g key={i} {...draw(i)}>
            <text x={spineX - 14} y={y + 4} className="dia-year" fontSize={SZ.year} textAnchor="end">{r.e.year}</text>
            {r.e.tone === 'correct' || r.e.tone === 'wrong'
              ? <Verdict x={spineX} y={y} r={10} tone={r.e.tone} />
              : <circle cx={spineX} cy={y} r={5} className="dia-dot" />}
            <Lines text={r.e.label} x={tx} top={top} chars={lc} className="dia-label is-left" />
            {r.e.note && (
              <Lines text={r.e.note} x={tx} top={top + r.ll * lineBox(SZ.label) + GAP}
                size={SZ.note} chars={nc} className="dia-note is-left" />
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- matrix
// A 2-by-N grid. The bailable/seizable cross-tabulation is the reason this
// exists: two independent classifications that students reliably conflate.

function Matrix({ cols = [], rows = [], cells = [], note, W }) {
  // Same lesson as the timeline's year column: a gutter that scales with the
  // width still has to hold its own text. "Non-bailable" is 81 units, and a
  // 72-unit gutter put it at x = -21.
  const rowLabelW = Math.max(0, ...rows.map(r => String(r).length * CH * SZ.head));
  const labelW = Math.max(72, Math.min(Math.round(W * 0.34), Math.round(rowLabelW + 24)));
  const rowChars = budget(labelW - 16, SZ.head);

  // A cross-classification needs both axes visible at once to make its point,
  // and at four columns on a phone each cell is 45 units — three characters a
  // line, with the columns touching. Below a viable cell the grid becomes a
  // LIST of the same cells, each naming its own row and column: the same
  // claims, in an order a narrow screen can hold. It is not the diagram, and
  // pretending a 45-unit column is the diagram would be worse.
  const MIN_CELL = 110;
  const asList = (W - labelW - 12) / Math.max(1, cols.length) < MIN_CELL;
  if (asList) {
    const cw = W - 24;
    const items = [];
    rows.forEach((r, ri) => cols.forEach((c, ci) => {
      const cell = (cells[ri] || [])[ci] || {};
      const ll = linesOf(cell.label || '\u2014', budget(cw, SZ.label));
      const nl = cell.note ? linesOf(cell.note, budget(cw, SZ.note)) : 0;
      items.push({ r, c, cell, ll, nl, h: stackH(ll, nl) + lineBox(SZ.head) + GAP });
    }));
    let y = 8;
    const placed = items.map(it => { const top = y; y += it.h + 2 * PAD + 14; return { ...it, top }; });
    const HL = y;
    return (
      <svg viewBox={`0 0 ${W} ${HL}`} className="dia-svg" role="img" aria-label={note || 'matrix'}>
        {placed.map((it, i) => {
          const inner = it.top + PAD;
          return (
            <motion.g key={i} {...draw(i)}>
              <rect x={12} y={it.top} width={cw} height={it.h + 2 * PAD} rx={3}
                className={`dia-cell ${it.cell.tone ? `is-${it.cell.tone}` : ''}`} />
              <Verdict x={W - 30} y={inner + 10} r={9} tone={it.cell.tone} />
              <Lines text={`${it.r} \u00b7 ${it.c}`} x={24} top={inner} anchor="start"
                size={SZ.head} chars={budget(cw - 40, SZ.head)} className="dia-head" />
              <Lines text={it.cell.label || '\u2014'} x={24} top={inner + lineBox(SZ.head) + GAP}
                chars={budget(cw - 24, SZ.label)} className="dia-label is-left" />
              {it.cell.note && (
                <Lines text={it.cell.note} x={24}
                  top={inner + lineBox(SZ.head) + GAP + it.ll * lineBox(SZ.label) + GAP}
                  size={SZ.note} chars={budget(cw - 24, SZ.note)} className="dia-note is-left" />
              )}
            </motion.g>
          );
        })}
      </svg>
    );
  }
  const cellW = (W - labelW - 12) / cols.length;
  const geom = rows.map((_, ri) => cols.map((__, ci) => {
    const cell = (cells[ri] || [])[ci] || {};
    const ll = linesOf(cell.label || '\u2014', budget(cellW, SZ.label));
    const nl = cell.note ? linesOf(cell.note, budget(cellW, SZ.note)) : 0;
    return { ll, nl, h: stackH(ll, nl) };
  }));
  const cellH = Math.max(78, ...geom.flat().map(c => c.h + 2 * PAD + 8));
  const H = 34 + rows.length * cellH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dia-svg" role="img" aria-label={note || 'matrix'}>
      {cols.map((c, i) => (
        <text key={i} x={labelW + i * cellW + cellW / 2} y={20} className="dia-head" fontSize={SZ.head}>{c}</text>
      ))}
      {rows.map((r, ri) => (
        <g key={ri}>
          <Lines text={r} x={labelW - 12} y={34 + ri * cellH + cellH / 2}
            size={SZ.head} chars={rowChars} className="dia-head is-right" />
          {cols.map((_, ci) => {
            const cell = (cells[ri] || [])[ci] || {};
            const c = geom[ri][ci];
            const x = labelW + ci * cellW;
            const y = 34 + ri * cellH;
            const top = y + (cellH - c.h) / 2;
            return (
              <motion.g key={ci} {...draw(ri * cols.length + ci)}>
                <rect x={x + 3} y={y + 3} width={cellW - 6} height={cellH - 6} rx={3}
                  className={`dia-cell ${cell.tone ? `is-${cell.tone}` : ''}`} />
                <Verdict x={x + cellW - 17} y={y + 17} r={9} tone={cell.tone} />
                <Lines text={cell.label || '\u2014'} x={x + cellW / 2} top={top} chars={budget(cellW, SZ.label)} />
                {cell.note && (
                  <Lines text={cell.note} x={x + cellW / 2} top={top + c.ll * lineBox(SZ.label) + GAP}
                    size={SZ.note} chars={budget(cellW, SZ.note)} className="dia-note" />
                )}
              </motion.g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- stack
// A pyramid of authority: what outranks what. Width carries rank, not quantity,
// so it is labelled as a hierarchy rather than a chart.

function Stack({ layers = [], note, W }) {
  const maxW = Math.min(560, W - 40);
  const minW = Math.max(140, Math.min(300, maxW * 0.55));
  // Same unwrapped-text defect as the timeline had, and worse here: the top
  // layer of the pyramid is the NARROWEST box, so the label with the least
  // room is the one drawn at the apex.
  const rows = layers.map((l, i) => {
    const w = minW + ((maxW - minW) * i) / Math.max(1, layers.length - 1);
    const lc = budget(w - 28, SZ.label);
    const nc = budget(w - 28, SZ.note);
    const ll = linesOf(l.label, lc);
    const nl = l.note ? linesOf(l.note, nc) : 0;
    return { l, w, lc, nc, ll, nl, h: stackH(ll, nl) };
  });
  const boxH = Math.max(52, ...rows.map(r => r.h + 2 * PAD));
  const layerH = boxH + 8;
  const H = layers.length * layerH + 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dia-svg" role="img" aria-label={note || 'hierarchy of authority'}>
      {rows.map((r, i) => {
        const x = (W - r.w) / 2;
        const y = 4 + i * layerH;
        const top = y + (boxH - r.h) / 2;
        return (
          <motion.g key={i} {...draw(i)}>
            <rect x={x} y={y} width={r.w} height={boxH} rx={3}
              className={`dia-box ${i === 0 ? 'is-apex' : ''}`} />
            <Lines text={r.l.label} x={x + 14} top={top} chars={r.lc} className="dia-label is-left" />
            {r.l.note && (
              <Lines text={r.l.note} x={x + 14} top={top + r.ll * lineBox(SZ.label) + GAP}
                size={SZ.note} chars={r.nc} className="dia-note is-left" />
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- spectrum
// A labelled axis. Built for the standards of proof, where the point is that
// the two standards sit at different places on one continuum of confidence.

function Spectrum({ from, to, marks = [], note, W }) {
  const x0 = 40;
  const x1 = W - 40;
  // Marks alternate above and below the bar, so a label's only real
  // competition is the next mark on ITS OWN side. The character budget comes
  // from that gap rather than from a fixed number: a fixed 18 was fine for the
  // two- and three-mark spectra in the corpus and put two labels 1 unit into
  // each other at five. Near the ends a label is anchored to its tick instead
  // of centred on it, because a centred label at `at: 0` hangs half its width
  // off the viewBox.
  const at = m => Math.min(1, Math.max(0, m.at));
  const xOf = m => x0 + (x1 - x0) * at(m);
  const anchorOf = m => (at(m) < 0.15 ? 'start' : at(m) > 0.85 ? 'end' : undefined);
  const plan = marks.map((m, i) => {
    const mine = xOf(m);
    const sameSide = marks.filter((_, j) => j % 2 === i % 2 && j !== i).map(xOf);
    const left = Math.max(x0 - 40, ...sameSide.filter(v => v < mine));
    const right = Math.min(x1 + 40, ...sameSide.filter(v => v > mine));
    const a = anchorOf(m);
    // Half of each gap, not all of it: the neighbour is reaching into the same
    // space from the other side. Giving each mark the whole gap is what put
    // two labels 127 units through each other on the first attempt at this.
    const room = a === 'start' ? (right - mine) / 2
      : a === 'end' ? (mine - left) / 2
      : Math.min(mine - left, right - mine);
    const chars = Math.max(10, budget(room, SZ.label, 0.9));
    return { m, x: mine, anchor: a, chars, room, up: i % 2 === 0, lines: linesOf(m.label, chars) };
  });
  const heightOf = up => {
    const list = plan.filter(q => q.up === up);
    return list.length ? Math.max(...list.map(q => q.lines)) * lineBox(SZ.label) : 0;
  };
  // Alternating above and below buys room only while the marks are far apart.
  // Five marks on a phone leaves ~57 units a side, and a label narrow enough to
  // fit is too narrow to read — measured as a 19-unit overlap between the first
  // and third. When it is that tight the labels stop competing for the axis and
  // go underneath it in order, numbered against their ticks.
  // 110 units, not 90: at 90 the five-mark case cleared the threshold by a
  // single unit and then overlapped by 19, because the budget is an estimate of
  // text width and the rendered text is wider than the estimate. The threshold
  // is where a centred label is worth reading, not where it barely fits.
  const listed = plan.some(q => q.room < 110);
  const upH = heightOf(true);
  const downH = heightOf(false);

  if (listed) {
    const barY2 = 30;
    const lw = W - 40;
    const lc = budget(lw - 26, SZ.label);
    let y = barY2 + 42;
    const items = plan.map((q, i) => {
      const lines = linesOf(q.m.label, lc);
      const top = y;
      y += lines * lineBox(SZ.label) + GAP + 6;
      return { q, i, top };
    });
    const HL = y + 8;
    return (
      <svg viewBox={`0 0 ${W} ${HL}`} className="dia-svg" role="img" aria-label={note || 'spectrum'}>
        <defs>
          <linearGradient id="dia-spec" x1="0" x2="1">
            <stop offset="0%" className="dia-spec-a" />
            <stop offset="100%" className="dia-spec-b" />
          </linearGradient>
        </defs>
        <rect x={x0} y={barY2} width={x1 - x0} height={8} rx={4} fill="url(#dia-spec)" />
        <text x={x0} y={barY2 - 10} className="dia-note is-left" fontSize={SZ.note}>{from}</text>
        <text x={x1} y={barY2 - 10} className="dia-note is-right" fontSize={SZ.note}>{to}</text>
        {items.map(({ q, i }) => (
          <motion.g key={`t${i}`} {...draw(i)}>
            <line x1={q.x} y1={barY2 - 6} x2={q.x} y2={barY2 + 14} className="dia-spine" />
            {q.m.tone === 'correct' || q.m.tone === 'wrong'
              ? <Verdict x={q.x} y={barY2 + 4} r={9} tone={q.m.tone} />
              : <circle cx={q.x} cy={barY2 + 4} r={5} className="dia-dot" />}
            <text x={q.x} y={barY2 + 30} className="dia-num-list" textAnchor="middle"
              fontSize={SZ.note} style={{ fill: 'var(--text-secondary)' }}>{i + 1}</text>
          </motion.g>
        ))}
        {items.map(({ q, i, top }) => (
          <motion.g key={`l${i}`} {...draw(i)}>
            <text x={20} y={top + SZ.label * ASC} className="dia-note" textAnchor="start"
              fontSize={SZ.note} style={{ fill: 'var(--text-secondary)' }}>{i + 1}</text>
            <Lines text={q.m.label} x={38} top={top} anchor="start" chars={lc} className="dia-label" />
          </motion.g>
        ))}
      </svg>
    );
  }
  // The bar sits below whatever the tallest label above it needs, and the axis
  // words below it clear the labels hanging underneath - both derived, because
  // a wrapped mark label used to run off the top of the viewBox and a two-line
  // one used to land on top of the axis word.
  const barY = Math.max(94, 8 + upH + 24);
  const axisBase = barY + 28;
  const downTop = axisBase + 14;
  const H = Math.max(192, downTop + downH + 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dia-svg" role="img" aria-label={note || 'spectrum'}>
      <defs>
        <linearGradient id="dia-spec" x1="0" x2="1">
          <stop offset="0%" className="dia-spec-a" />
          <stop offset="100%" className="dia-spec-b" />
        </linearGradient>
      </defs>
      <rect x={x0} y={barY} width={x1 - x0} height={8} rx={4} fill="url(#dia-spec)" />
      <text x={x0} y={axisBase} className="dia-note is-left" fontSize={SZ.note}>{from}</text>
      <text x={x1} y={axisBase} className="dia-note is-right" fontSize={SZ.note}>{to}</text>
      {plan.map((q, i) => {
        const own = q.lines * lineBox(SZ.label);
        return (
          <motion.g key={i} {...draw(i)}>
            <line x1={q.x} y1={q.up ? barY - 18 : barY + 8} x2={q.x} y2={q.up ? barY : barY + 22} className="dia-spine" />
            {q.m.tone === 'correct' || q.m.tone === 'wrong'
              ? <Verdict x={q.x} y={barY + 4} r={10} tone={q.m.tone} />
              : <circle cx={q.x} cy={barY + 4} r={5.5} className="dia-dot" />}
            <Lines text={q.m.label} x={q.x} top={q.up ? barY - 24 - own : downTop}
              chars={q.chars} anchor={q.anchor} />
          </motion.g>
        );
      })}
    </svg>
  );
}

const KINDS = { hierarchy: Hierarchy, flow: Flow, branch: Branch, timeline: Timeline, matrix: Matrix, stack: Stack, spectrum: Spectrum };

export const DIAGRAM_KINDS = Object.keys(KINDS);
