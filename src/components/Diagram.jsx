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
      <div className="dia-body" tabIndex={0} role="group" aria-label={label}>
        <Body {...rest} note={alt} />
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
  const words = String(text).split(/\s+/);
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

// ------------------------------------------------------------- the type floor
// An SVG `fontSize` is in viewBox units, so it is a ratio and not a size: what
// the reader actually sees is `size x (rendered width / VB)`. Every diagram
// here is drawn against a 760-unit viewBox, and `.dia-svg` carries a pinned
// `min-width` inside its `overflow-x: auto` box, so the narrowest any label
// ever renders is that width over 760 of its unit size. At the sizes this file
// used before, and the 34rem the pin used to be, a 14-unit note came out at
// 10.0px and a 12-unit step number at 8.6px.
//
// DESIGN.md section 3 puts the floor at 12px for anything that reads as a
// sentence; 11px is for short uppercase labels only, and nothing in these
// diagrams is uppercase, so 12px is the floor for all of it. `check:design`
// cannot catch this - it is arithmetic between a JSX attribute and a CSS
// min-width in another file, which is why the rule is written down rather than
// linted, and why the pin is named here as a constant that has to be kept in
// step with plates.css rather than left implicit.
//
// The sizes below sit at 13.5-14.5px rather than exactly on the 12px floor.
// These are labels read at arm's length on a phone, inside a box the reader is
// already scrolling sideways; the floor is where text stops being legible, not
// where it becomes comfortable.
const VB = 760;
const MIN_RENDERED = 608;                                  // 38rem, the min-width on .dia-svg
const units = px => Math.round((px * VB / MIN_RENDERED) * 10) / 10;
const SZ = {
  label: units(14.5),                                      // 18.1 units -> 14.5px
  note: units(13.5),                                       // 16.9 units -> 13.5px
  head: units(13.5),                                       // 16.9 units -> 13.5px
  year: units(14),                                         // 17.5 units -> 14.0px
  num: units(13.5),                                        // 16.9 units -> 13.5px
};

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

function Hierarchy({ rows = [], note }) {
  const W = 760;
  const geom = rows.map(row => {
    const nodes = Array.isArray(row) ? row : [row];
    const boxW = Math.min(300, (W - 40 - (nodes.length - 1) * 16) / nodes.length);
    return {
      nodes, boxW,
      cells: nodes.map(n => {
        const ll = linesOf(n.label, budget(boxW, SZ.label));
        const nl = n.note ? linesOf(n.note, budget(boxW, SZ.note)) : 0;
        return { ll, nl, h: stackH(ll, nl) };
      }),
    };
  });
  const boxH = Math.max(64, ...geom.flatMap(g => g.cells.map(c => c.h + 2 * PAD)));
  const rowH = boxH + 20;
  const H = rows.length * rowH + 20;
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

function Flow({ steps = [], note }) {
  const perRow = steps.length > 4 ? Math.ceil(steps.length / 2) : steps.length;
  const rows = [];
  for (let i = 0; i < steps.length; i += perRow) rows.push(steps.slice(i, i + perRow));
  const W = 760;
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

function Branch({ question, branches = [], note }) {
  const W = 760;
  const n = branches.length;
  const boxW = Math.min(230, (W - 24 - (n - 1) * 14) / n);
  const total = n * boxW + (n - 1) * 14;
  const x0 = (W - total) / 2;
  const qy = 10;
  const qChars = budget(380, SZ.label);
  const qLines = linesOf(question, qChars);
  const qH = Math.max(44, qLines * lineBox(SZ.label) + 2 * PAD);
  const condChars = budget(boxW, SZ.note, 0.9);
  const condLines = Math.max(1, ...branches.map(b => (b.cond ? linesOf(b.cond, condChars) : 1)));
  const condH = condLines * lineBox(SZ.note);
  const by = qy + qH + 30 + condH;
  const cells = branches.map(b => {
    const ll = linesOf(b.label, budget(boxW, SZ.label));
    const nl = b.note ? linesOf(b.note, budget(boxW, SZ.note)) : 0;
    return { ll, nl, h: stackH(ll, nl) };
  });
  const boxH = Math.max(74, ...cells.map(c => c.h + 2 * PAD));
  const H = by + boxH + 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dia-svg" role="img" aria-label={note || question}>
      <motion.g {...draw(0)}>
        <rect x={W / 2 - 190} y={qy} width={380} height={qH} rx={Math.min(22, qH / 2)} className="dia-box is-question" />
        <Lines text={question} x={W / 2} top={qy + (qH - qLines * lineBox(SZ.label)) / 2} chars={qChars} />
      </motion.g>
      {branches.map((b, i) => {
        const c = cells[i];
        const x = x0 + i * (boxW + 14);
        const cx = x + boxW / 2;
        const condTop = by - 10 - condH;
        return (
          <motion.g key={i} {...draw(i + 1)}>
            <path d={`M ${W / 2} ${qy + qH} V ${qy + qH + 16} H ${cx} V ${condTop - 6}`} className="dia-arrow" fill="none" />
            <Lines text={b.cond} x={cx} top={condTop} size={SZ.note} chars={condChars} className="dia-cond" />
            <rect x={x} y={by} width={boxW} height={boxH} rx={3}
              className={`dia-box ${b.tone ? `is-${b.tone}` : ''}`} />
            <Verdict x={x + boxW - 16} y={by + 16} r={10} tone={b.tone} />
            <Lines text={b.label} x={cx} top={by + (boxH - c.h) / 2} chars={budget(boxW, SZ.label)} />
            {b.note && (
              <Lines text={b.note} x={cx} top={by + (boxH - c.h) / 2 + c.ll * lineBox(SZ.label) + GAP}
                size={SZ.note} chars={budget(boxW, SZ.note)} className="dia-note" />
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- timeline
// Dated events on an axis. Every entry carries a real date; a timeline with an
// invented one would be the app asserting a fact it cannot support.

function Timeline({ events = [], note }) {
  const W = 760;
  const tx = 112;
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
      <line x1={92} y1={14} x2={92} y2={H - 14} className="dia-spine" />
      {rows.map((r, i) => {
        const y = 32 + i * step;
        const top = y - 10;
        return (
          <motion.g key={i} {...draw(i)}>
            <text x={78} y={y + 4} className="dia-year" fontSize={SZ.year} textAnchor="end">{r.e.year}</text>
            {r.e.tone === 'correct' || r.e.tone === 'wrong'
              ? <Verdict x={92} y={y} r={10} tone={r.e.tone} />
              : <circle cx={92} cy={y} r={5} className="dia-dot" />}
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

function Matrix({ cols = [], rows = [], cells = [], note }) {
  const W = 760;
  const labelW = 150;
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
          <text x={labelW - 12} y={34 + ri * cellH + cellH / 2 + 4} className="dia-head is-right" fontSize={SZ.head}>{r}</text>
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

function Stack({ layers = [], note }) {
  const W = 760;
  const maxW = 560;
  const minW = 300;
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

function Spectrum({ from, to, marks = [], note }) {
  const W = 760;
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
    return { m, x: mine, anchor: a, chars, up: i % 2 === 0, lines: linesOf(m.label, chars) };
  });
  const heightOf = up => {
    const list = plan.filter(q => q.up === up);
    return list.length ? Math.max(...list.map(q => q.lines)) * lineBox(SZ.label) : 0;
  };
  const upH = heightOf(true);
  const downH = heightOf(false);
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
