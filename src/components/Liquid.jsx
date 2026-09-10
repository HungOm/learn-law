import { useId } from 'react';

/**
 * Warta — the liquid field.
 *
 * A page of this app is a statute reprint, and a reprint is mostly ink on
 * paper. Applied across fifty-five lessons that produced a wall of near-black
 * column: nothing on screen changed for minutes of scrolling, which is a poor
 * thing to hand a twelve-year-old or an adult reading after a shift.
 *
 * The coherence principle rules out decoration; it never argued for monochrome
 * (DESIGN.md 2.11). So this layer is not decoration. It is painted in module
 * colour and it says one thing: *which part of the curriculum you are in*.
 * That is the same claim the module chip and the breadcrumb already make, in a
 * form you can read from across the room and without reading at all.
 *
 * What it must never become:
 *
 *   - an identifier. Twenty-four categories is far past what colour can carry
 *     (DESIGN.md 2.9), so the module's NAME is on screen every time this is,
 *     and it is the name that identifies. The field is reinforcement.
 *   - data. No orb count, size, speed or position means a quantity. Nothing
 *     here is readable as progress, mastery or due work.
 *   - gold. --signal-mastery means the learner earned something, and a
 *     background has earned nothing. It is not reachable from this file.
 *
 * How it is built, and why:
 *
 *   - Colour comes only from --module-ink / --module-tint, resolved from the
 *     data-module attribute by palette.css. No component in this file names a
 *     colour.
 *   - Everything is aria-hidden and pointer-events: none. A reader on a screen
 *     reader gets the module name, which is the whole content of this layer.
 *   - Animation is CSS, never framer-motion and never JS. base.css already
 *     kills every CSS animation under prefers-reduced-motion, so the
 *     preference is honoured here for free and cannot be forgotten. Only
 *     `transform` is animated, so the work stays on the compositor.
 *   - There is no filter: blur() on the ambient layer. A blurred fixed element
 *     is re-rasterised every frame, and this audience is phone-first in
 *     Malaysia on low-end Android. A radial-gradient with a soft stop is
 *     already soft and costs one paint. The one place a real blur is used —
 *     the goo — is gated to >=1024px in liquid.css.
 *
 * Styles live in src/styles/liquid.css, imported from main.jsx after base.css.
 */

/* Six is enough to fill a viewport without any two ever resolving into a
   pattern, and few enough that a cheap phone composites them in one pass.
   liquid.css sizes and places each one; the two smallest are dropped below
   640px. */
const ORB_COUNT = 6;

/* Only used when the caller has no catalogue to hand — the first render before
   content resolves, or a route that does not know its modules. Six ids spread
   across the twenty-four so the field is varied rather than one hue. An id that no
   longer exists is not a failure: it simply matches no [data-module] rule and
   inherits the root default. */
const FALLBACK = [
  'm01-malaysian-legal-system',
  'm04-criminal-law',
  'm06-contract',
  'm08-property',
  'm11-civil-procedure',
  'm13-legal-reasoning',
];

/**
 * Which module each orb is painted in.
 *
 * With a focus — a module or lesson page — every orb takes that one colour, so
 * the field *narrows*: the whole page is Property, and it looks like it. With
 * no focus — home, the index, progress — the orbs are sampled evenly across
 * the curriculum, which reads as the spread of the whole syllabus. Even
 * sampling matters: consecutive modules are guaranteed only ΔE 0.14 apart,
 * while modules four apart are much further, so a spread sample is visibly
 * six colours rather than a gradient.
 */
function fieldModules(modules, focus) {
  if (focus) return Array(ORB_COUNT).fill(focus);
  const pool = modules.length ? modules : FALLBACK;
  const span = Math.max(pool.length - 1, 0);
  return Array.from(
    { length: ORB_COUNT },
    (_, i) => pool[Math.round((i * span) / (ORB_COUNT - 1))],
  );
}

/**
 * The ambient field: fixed, full-viewport, behind everything.
 *
 * @param modules  module ids from the app catalogue, e.g. 'm08-property'.
 * @param focus    a single module id to narrow the field to, or null.
 * @param goo      include the desktop-only metaball layer. Default true.
 *
 * The caller mounts exactly one of these, above the routes, and changes
 * `focus` as the reader moves. It is a background — never a landmark, never
 * focusable, never in the tab order.
 */
export default function LiquidField({ modules = [], focus = null, goo = true }) {
  const ids = fieldModules(modules, focus);
  return (
    <div className="liquid-field" aria-hidden="true">
      {ids.map((id, i) => (
        <span
          key={i}
          className={`liquid-orb liquid-orb-${i + 1}`}
          data-module={id || undefined}
        />
      ))}
      {goo && <LiquidGoo module={focus || ids[0]} />}
    </div>
  );
}

/* Five circles, placed so that at rest some pairs already overlap and others
   do not. The goo filter thresholds the blurred alpha, so an overlapping pair
   fuses into one body with a neck between them and a separating pair pinches
   apart — the merging IS the effect, and it only happens where circles are
   close enough to begin with. Kept inside y 120..480 of the 600 viewBox
   because preserveAspectRatio="slice" crops the short axis. */
const GOO_CIRCLES = [
  { cx: 176, cy: 232, r: 142 },
  { cx: 330, cy: 300, r: 108 },
  { cx: 458, cy: 218, r: 126 },
  { cx: 248, cy: 402, r: 100 },
  { cx: 424, cy: 418, r: 122 },
];

/**
 * The large liquid objects: an SVG metaball layer in module colour.
 *
 * Five circles drift under a gooey filter — a heavy blur, then a steep alpha
 * ramp that turns the blur's soft shoulder back into a hard edge. Two circles
 * that come near each other fuse across the gap and then tear apart again,
 * which is the only cheap way to get something that moves like liquid rather
 * than like six divs.
 *
 * This is the expensive layer, and honestly so: the blur sits inside an
 * animated subtree, so it is recomputed every frame. liquid.css therefore
 * hides it below 1024px, where the audience actually is. It is an enhancement
 * for people on a desktop, not a thing the design depends on.
 *
 * The filter id is derived from useId(): two of these can be mounted at once —
 * the ambient field and a section — and a shared '#goo' would have the second
 * instance silently steal the first's filter. useId's colons are stripped
 * because the id is spliced into a url() fragment.
 *
 * @param module     module id to paint in, or null to inherit.
 * @param className  extra classes, for a caller placing this in a section.
 */
export function LiquidGoo({ module = null, className = '' }) {
  const gooId = `liquid-goo-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg
      className={className ? `liquid-goo ${className}` : 'liquid-goo'}
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid slice"
      data-module={module || undefined}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* userSpaceOnUse with an explicit region, rather than the default
            bounding-box region: the group's bbox changes on every frame as the
            circles drift, and a filter region that has to be recomputed from
            it is recomputed 60 times a second. A fixed region is both cheaper
            and stops the blur being clipped at the group's edge. */}
        <filter
          id={gooId}
          filterUnits="userSpaceOnUse"
          x="-150"
          y="-150"
          width="900"
          height="900"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="b" />
          {/* Identity on RGB; alpha multiplied by 22 and offset by -10, so
              everything below a=0.4545 vanishes and everything above snaps
              opaque. That threshold is what makes the blur read as a surface
              with a skin instead of as a smudge. */}
          <feColorMatrix
            in="b"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
          />
        </filter>
      </defs>
      <g filter={`url(#${gooId})`}>
        {GOO_CIRCLES.map((c, i) => (
          <g key={i} className={`liquid-goo-blob liquid-goo-blob-${i + 1}`}>
            <circle cx={c.cx} cy={c.cy} r={c.r} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * A brand colour block: a large module-tinted panel with a liquid edge.
 *
 * For a page or section head. Three layers, and the order is the whole safety
 * argument:
 *
 *   1. the panel, --module-tint. Body text on the softest tint is verified at
 *      12.8:1 light / 12.0:1 dark.
 *   2. the pour — an opaque --module-ink band bleeding off the left edge with
 *      an organic right edge. NOTHING is ever set on this. It is confined to
 *      the block's left padding, which is wider than the band can grow, so no
 *      text can reach it at any viewport width.
 *   3. the swell — a large --module-ink blob at --liquid-alpha-soft sweeping
 *      the panel, which text DOES sit over. Re-measured across all TWENTY-FOUR
 *      modules in both themes after the palette resize — the original figure
 *      covered sixteen, and resizing the set moves every hue, so the old
 *      measurement was void rather than merely incomplete. --text-primary over
 *      tint + 12% ink bottoms out at 10.72:1 light (module 07) and 9.37:1 dark
 *      (module 15), comfortably past the AAA 7:1 floor.
 *
 * The measurement is also the constraint: at the same 12% wash
 * --text-secondary bottoms out at 4.81:1 light and 4.64:1 dark, under its 5:1
 * floor at twenty-four modules exactly as it was at sixteen. So a brand block
 * sets --text-primary on its contents and secondary text does not go in one.
 * Use .brandblock-kicker for the eyebrow — it is the metadata line, set in the
 * apparatus face at label size, in an ink that survives the wash.
 *
 * @param module     module id; supplies --module-tint and --module-ink.
 * @param children   the head content. Primary-ink text only.
 * @param className  extra classes for the caller's layout.
 */
export function BrandBlock({ module, children, className = '' }) {
  return (
    <div
      className={className ? `brandblock ${className}` : 'brandblock'}
      data-module={module || undefined}
    >
      {/* Both shapes stretch to the panel (preserveAspectRatio="none"), so the
          curves are drawn once and fit any block without a second path. They
          overrun their viewBoxes on every bleeding edge — the pour runs from
          y=-60 to y=460 in a 400-tall box — so the drift animation can never
          slide a gap into view. */}
      <svg
        className="brandblock-edge"
        viewBox="0 0 120 400"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="brandblock-pour"
          d="M0 -60 H86 C114 10 58 74 82 140 C106 206 44 244 72 312 C94 366 56 396 98 460 H0 Z"
        />
      </svg>
      <svg
        className="brandblock-wash"
        viewBox="0 0 400 260"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="brandblock-swell"
          d="M460 -40 C300 6 372 92 286 132 C206 170 292 226 196 300 H460 Z"
        />
      </svg>
      <div className="brandblock-body">{children}</div>
    </div>
  );
}
