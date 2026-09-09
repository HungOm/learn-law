#!/usr/bin/env python3
"""Generate and verify the Warta colour system.

Colour in this app is not decoration. It is the only channel that tells a
learner whether they got a thing right, whether a matter is outstanding, and
whether a rule is the law or a trap. So the palette is *specified* here — in
OKLCH, where a lightness step means the same thing to the eye at every hue —
and sRGB hex is a build product, not something anyone types.

What this file guarantees:

  * every text role clears its WCAG contrast floor against every surface it is
    allowed to sit on, in both themes;
  * every non-text role that carries meaning (meter tracks, focus rings,
    borders that separate rather than decorate) clears 3:1, per WCAG 1.4.11;
  * the four signal colours stay separable under protanopia, deuteranopia and
    tritanopia, so a red/green answer verdict is never the only cue *and* never
    collapses into one colour for the ~1 in 12 men who would otherwise see it
    that way.

Usage:

    python3 tools/palette.py            # verify; non-zero exit on failure
    python3 tools/palette.py --report   # the full contrast table
    python3 tools/palette.py --emit     # regenerate src/styles/palette.css

`--emit` is the only way src/styles/palette.css should ever change. It is
generated; edit the spec below instead.
"""

import argparse
import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "styles" / "palette.css"

# --------------------------------------------------------------------------
# colour space
# --------------------------------------------------------------------------

def _srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _lin_to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def _cbrt(v):
    return v ** (1 / 3) if v >= 0 else -((-v) ** (1 / 3))


def oklch_to_lin(L, C, H):
    """OKLCH -> linear sRGB. May land outside [0,1]; callers gamut-map."""
    a = C * math.cos(math.radians(H))
    b = C * math.sin(math.radians(H))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    return (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )


def lin_to_oklab(r, g, b):
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = _cbrt(l), _cbrt(m), _cbrt(s)
    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def oklch(hex_str):
    L, a, b = lin_to_oklab(*hex_to_lin(hex_str))
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def _in_gamut(rgb, eps=1e-4):
    return all(-eps <= c <= 1 + eps for c in rgb)


def oklch_to_hex(L, C, H):
    """Gamut-map by reducing chroma, which preserves lightness and hue.

    Clipping RGB channels instead would shift both — a clipped red loses
    lightness, which is exactly the property every contrast check downstream
    depends on.
    """
    lo, hi = 0.0, C
    if not _in_gamut(oklch_to_lin(L, C, H)):
        for _ in range(48):
            mid = (lo + hi) / 2
            if _in_gamut(oklch_to_lin(L, mid, H)):
                lo = mid
            else:
                hi = mid
        C = lo
    rgb = oklch_to_lin(L, C, H)
    return "#" + "".join(
        f"{round(min(1.0, max(0.0, _lin_to_srgb(c))) * 255):02X}" for c in rgb
    )


def hex_to_lin(hex_str):
    h = hex_str.lstrip("#")
    return tuple(_srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))


def luminance(hex_str):
    r, g, b = hex_to_lin(hex_str)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


# --------------------------------------------------------------------------
# colour vision deficiency (Machado, Oliveira & Fernandes 2009, severity 1.0)
# --------------------------------------------------------------------------

CVD = {
    "protanopia": (
        (0.152286, 1.052583, -0.204868),
        (0.114503, 0.786281, 0.099216),
        (-0.003882, -0.048116, 1.051998),
    ),
    "deuteranopia": (
        (0.367322, 0.860646, -0.227968),
        (0.280085, 0.672501, 0.047413),
        (-0.011820, 0.042940, 0.968881),
    ),
    "tritanopia": (
        (1.255528, -0.076749, -0.178779),
        (-0.078411, 0.930809, 0.147602),
        (0.004733, 0.691367, 0.303900),
    ),
}


def simulate(hex_str, kind):
    r, g, b = hex_to_lin(hex_str)
    m = CVD[kind]
    return tuple(m[i][0] * r + m[i][1] * g + m[i][2] * b for i in range(3))


def delta_e_ok(lin_a, lin_b):
    """Euclidean distance in OKLab. ~0.02 is a just-noticeable difference."""
    a = lin_to_oklab(*lin_a)
    b = lin_to_oklab(*lin_b)
    return math.dist(a, b)


# --------------------------------------------------------------------------
# the specification
# --------------------------------------------------------------------------
#
# Four hues, and no more. Each carries exactly one meaning; two roles may share
# a hue only if they share a meaning. A fifth hue for "caution" was considered
# and rejected: it would have had to sit between oxide (28) and gold (83),
# which is the one place on this wheel where a new hue is hardest to tell from
# its neighbours — and hardest of all under protanopia. Mayer's coherence
# principle points the same way: in material built for learning, every extra
# colour is extra processing that is not about the law.

HUE = {
    "navy":    251.0,  # authority, structure, the text itself
    "sage":    177.0,  # good standing: correct, cleared, settled
    "oxide":    28.0,  # correction: wrong, overruled, out of time
    "gold":     83.0,  # earned mastery, and nothing else
    "neutral":  95.0,  # warm paper stock; a reprint is not printed on blue
    # Chart series are a separate family on purpose — see --viz-series-* below.
    "viz-blue": 250.0,
    "viz-warm":  45.0,
    "viz-teal": 168.0,
}

# The load-bearing constraint, and the reason the lightness column below is not
# eyeballed: dichromacy flattens hue but leaves lightness intact. Two signals
# that differ only in hue become one colour; two that differ in lightness stay
# two. So the signals are spaced down the lightness axis first, and given their
# hue second.

# (name, L, C, hue-key). Lightness is the load-bearing number: it is what the
# contrast checks below are actually testing.
LIGHT = [
    ("paper",        0.988, 0.003, "neutral"),
    ("raise",        1.000, 0.000, "neutral"),
    ("sunk",         0.962, 0.005, "neutral"),
    ("rule",         0.873, 0.013, "neutral"),
    ("rule-strong",  0.630, 0.012, "neutral"),
    ("muted",        0.480, 0.012, "navy"),
    ("ink",          0.279, 0.036, "navy"),
    ("ink-strong",   0.190, 0.040, "navy"),
    # Signals, spaced ~0.12 apart in L. Wrong sits below correct: a red flag is
    # the heavier mark in a law report, and the heavier mark is the darker one.
    ("oxide",        0.420, 0.120, "oxide"),
    ("sage",         0.540, 0.072, "sage"),
    ("gold",         0.620, 0.112, "gold"),
    # Text-weight variants. The plain signal above is for borders, rings and
    # fills, which need 3:1; these are for words, which need 4.5:1.
    ("oxide-strong", 0.330, 0.130, "oxide"),
    ("sage-strong",  0.390, 0.078, "sage"),
    ("gold-text",    0.520, 0.105, "gold"),
    ("viz-1",        0.500, 0.130, "viz-blue"),
    ("viz-2",        0.580, 0.160, "viz-warm"),
    ("viz-3",        0.620, 0.100, "viz-teal"),
]

DARK = [
    ("paper",        0.207, 0.012, "navy"),
    ("raise",        0.241, 0.014, "navy"),
    ("sunk",         0.170, 0.010, "navy"),
    ("rule",         0.345, 0.017, "navy"),
    ("rule-strong",  0.530, 0.020, "navy"),
    ("muted",        0.700, 0.014, "navy"),
    # Body text stops at L 0.905 rather than going to white. On a dark ground a
    # 20:1 pair haloes; the eye reads the glow instead of the letterform.
    ("ink",          0.905, 0.008, "neutral"),
    ("ink-strong",   0.960, 0.006, "neutral"),
    ("oxide",        0.560, 0.120, "oxide"),
    ("sage",         0.700, 0.078, "sage"),
    ("gold",         0.830, 0.115, "gold"),
    ("oxide-strong", 0.720, 0.100, "oxide"),
    ("sage-strong",  0.860, 0.070, "sage"),
    ("gold-text",    0.830, 0.115, "gold"),
    ("viz-1",        0.660, 0.130, "viz-blue"),
    ("viz-2",        0.720, 0.140, "viz-warm"),
    ("viz-3",        0.780, 0.095, "viz-teal"),
]


# --------------------------------------------------------------------------
# module identity, and the honest limit on it
# --------------------------------------------------------------------------
#
# Sixteen modules, each with a colour. This is the one part of the system that
# is deliberately NOT held to the identifier floor, and the measurement is why:
#
#   16 hues evenly round the wheel   worst pair dE 0.002 under deuteranopia
#   4 bands x 4 lightness steps      worst pair dE 0.021
#   the best 4 hues obtainable       worst pair dE 0.067
#
# Sixteen categories is past what colour can carry, and so is four. Even the
# best four-hue set on the wheel does not reach 0.10. So module colour is
# REINFORCEMENT, never an identifier: the module's name is on screen every time
# its colour is, the colour aids orientation and recall for readers who can see
# it, and it costs nothing for readers who cannot. A module colour may never be
# the only thing distinguishing one module from another — no unlabelled
# colour-coded map, no legend-free chart keyed on module.
#
# What IS guaranteed: every tint keeps body text at AAA, every ink clears 4.5:1,
# and CONSECUTIVE modules differ sharply, so a listing reads as varied rather
# than as a gradient. Hue advances by a stride co-prime with the module count,
# which uses every hue while putting neighbours ~105 degrees apart.

MODULES = [
    "m-study-method", "m00-foundations", "m01-malaysian-legal-system",
    "m02-legal-research", "m03-constitutional", "m04-criminal-law",
    "m05-criminal-procedure", "m06-contract", "m07-tort", "m08-property",
    "m09-company", "m10-evidence", "m11-civil-procedure", "m12-administrative",
    "m13-legal-reasoning", "m14-statutory-interpretation",
    # The eight core subjects the curriculum was missing. Added as one block
    # rather than one at a time, deliberately: the hue of every module is
    # derived from its index and the count, so each addition re-colours the
    # whole app. Sized to 24 once so this happens once. Leave room here rather
    # than growing this list again — see docs/LLB-ROADMAP.md.
    "m15-equity-trusts", "m16-family", "m17-syariah", "m18-jurisprudence",
    "m19-commercial", "m20-employment", "m21-international", "m22-ethics",
]
# Co-prime with 24, and chosen over the other co-primes because 7 * (360/24)
# puts neighbours 105 degrees apart — the closest available to the 112 the
# sixteen-module palette had, so the "reads as varied, not as a gradient"
# property survives the resize.
STRIDE = 7

# Constant lightness across every module: no module outranks another.
MODULE_TINT = {"light": (0.958, 0.020), "dark": (0.250, 0.026)}
MODULE_INK = {"light": (0.460, 0.100), "dark": (0.760, 0.100)}


def module_hue(i):
    return (i * STRIDE % len(MODULES)) * (360.0 / len(MODULES))


def build_modules(theme):
    tl, tc = MODULE_TINT[theme]
    il, ic = MODULE_INK[theme]
    out = {}
    for i, mid in enumerate(MODULES):
        h = module_hue(i)
        out[f"mod-{i:02d}-tint"] = oklch_to_hex(tl, tc, h)
        out[f"mod-{i:02d}-ink"] = oklch_to_hex(il, ic, h)
    return out


# Block fills. A lesson is a long column, and without these every paragraph,
# example and list looks the same — a reader cannot see the shape of what they
# are about to read. Block type IS the lesson's structure, so marking it is
# signalling rather than decoration. Kept very low in chroma: these sit behind
# body text that must stay at AAA, and the readers are often tired and often on
# a phone at night. A saturated block would be worse than the monochrome.
BLOCK_FILLS = {
    "rule":       ("sage", 0.10),
    "caution":    ("oxide", 0.09),
    "example":    ("viz-1", 0.08),
    "predict":    ("viz-2", 0.09),
    "checkpoint": ("viz-3", 0.10),
}


def mix(a_hex, b_hex, pct):
    """color-mix(in srgb, a pct%, b), computed so it can be checked."""
    a = [int(a_hex.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
    b = [int(b_hex.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
    return "#" + "".join(f"{round(a[i] * pct + b[i] * (1 - pct)):02X}" for i in range(3))


def build(spec):
    return {name: oklch_to_hex(L, C, HUE[h]) for name, L, C, h in spec}


# --------------------------------------------------------------------------
# what must hold
# --------------------------------------------------------------------------
#
# AAA (7:1) for anything a learner reads for meaning, not the AA 4.5:1 floor.
# The audience is adults returning to study and children, on whatever screen
# they have; body copy is the one thing that must never be the hard part.

SURFACES = ("paper", "raise", "sunk")

TEXT_RULES = [
    # (token, floor, why)
    ("ink",          7.0, "body prose — AAA, this is the reading surface"),
    ("ink-strong",   7.0, "headings and emphasised body"),
    ("muted",        5.0, "secondary text: metadata, hints, captions"),
    ("sage-strong",  4.5, "verdict text: correct, cleared"),
    ("oxide-strong", 4.5, "verdict text: wrong, overruled"),
    ("gold-text",    4.5, "mastery labels — kickers, rank names"),
]

# WCAG 1.4.11: anything non-text that carries meaning needs 3:1. A meter track
# is not decoration — an empty track and a full one differ only by this.
NONTEXT_RULES = [
    ("rule-strong", 3.0, "meter and progress tracks, focus ring, active border"),
    ("gold",        3.0, "seal strokes, rank rings, crest linework"),
    ("sage",        3.0, "callout borders, ring fills, correct-answer band"),
    ("oxide",       3.0, "callout borders, life pips, wrong-answer band"),
    ("viz-1",       3.0, "chart series 1"),
    ("viz-2",       3.0, "chart series 2"),
    ("viz-3",       3.0, "chart series 3"),
]

# The signals a learner must tell apart at a glance, even with CVD. Colour is
# never the only cue in the UI (there is always a tick, a cross, a word), but
# the colours must not collapse into each other either.
SIGNALS = ("sage", "oxide", "gold", "ink")

# Chart series are checked as their own set. They never encode a verdict, so
# they are not checked against the signals — but they must separate from each
# other, because a legend is not a substitute for telling two lines apart.
SERIES = ("viz-1", "viz-2", "viz-3")
DELTA_FLOOR = 0.10

# The one discrimination this app cannot afford to get wrong. Every quiz, every
# review card and every marked problem answers a learner in these two colours,
# so they are held above the all-pairs floor: they must be far enough apart in
# lightness alone that the verdict survives with the hue channel gone entirely.
LIGHTNESS_PAIRS = [(("sage", "oxide"), 0.10, "the correct/wrong verdict")]


def check(theme, pal, failures, report):
    report.append(f"\n=== {theme} ===")
    report.append(f"{'token':<13}{'hex':<9}  " + "  ".join(f"{s:>9}" for s in SURFACES))
    for name in [n for n, *_ in (LIGHT if theme == "light" else DARK)]:
        row = f"{name:<13}{pal[name]:<9}  "
        row += "  ".join(f"{contrast(pal[name], pal[s]):8.2f}:1" for s in SURFACES)
        report.append(row)

    report.append("\n  text roles (floor -> worst surface):")
    for token, floor, why in TEXT_RULES:
        worst = min(SURFACES, key=lambda s: contrast(pal[token], pal[s]))
        c = contrast(pal[token], pal[worst])
        ok = c >= floor
        report.append(
            f"    {'PASS' if ok else 'FAIL'}  {token:<12} {c:5.2f}:1 vs {worst:<6}"
            f" (needs {floor}) — {why}"
        )
        if not ok:
            failures.append(f"{theme}: {token} is {c:.2f}:1 on {worst}, needs {floor}:1 ({why})")

    report.append("\n  non-text roles (WCAG 1.4.11, 3:1):")
    for token, floor, why in NONTEXT_RULES:
        worst = min(SURFACES, key=lambda s: contrast(pal[token], pal[s]))
        c = contrast(pal[token], pal[worst])
        ok = c >= floor
        report.append(
            f"    {'PASS' if ok else 'FAIL'}  {token:<12} {c:5.2f}:1 vs {worst:<6}"
            f" (needs {floor}) — {why}"
        )
        if not ok:
            failures.append(f"{theme}: {token} is {c:.2f}:1 on {worst}, needs {floor}:1 ({why})")

    mods = build_modules(theme)
    report.append(f"\n  module identity ({len(MODULES)}) — reinforcement, not identifier:")
    worst_tint = min(contrast(pal["ink"], mods[f"mod-{i:02d}-tint"]) for i in range(len(MODULES)))
    ok = worst_tint >= 7.0
    report.append(f"    {'PASS' if ok else 'FAIL'}  body text on the softest tint "
                  f"{worst_tint:5.2f}:1 (needs 7.0 — a tint may not cost AAA)")
    if not ok:
        failures.append(f"{theme}: a module tint drops body text to {worst_tint:.2f}:1, needs 7.0")

    worst_ink = min(min(contrast(mods[f"mod-{i:02d}-ink"], pal[s_]) for s_ in SURFACES)
                    for i in range(len(MODULES)))
    ok = worst_ink >= 4.5
    report.append(f"    {'PASS' if ok else 'FAIL'}  module ink (chips, rules) "
                  f"{worst_ink:5.2f}:1 (needs 4.5)")
    if not ok:
        failures.append(f"{theme}: a module ink is {worst_ink:.2f}:1, needs 4.5")

    adj = min(delta_e_ok(hex_to_lin(mods[f"mod-{i:02d}-ink"]),
                         hex_to_lin(mods[f"mod-{(i+1) % len(MODULES):02d}-ink"]))
              for i in range(len(MODULES)))
    ok = adj >= 0.10
    report.append(f"    {'PASS' if ok else 'FAIL'}  consecutive modules differ dE {adj:.3f} "
                  f"(needs 0.10 — a listing must read as varied)")
    if not ok:
        failures.append(f"{theme}: consecutive module colours differ by only dE={adj:.3f}")

    report.append("\n  block fills — signalling structure, must not cost contrast:")
    for name, (tok, pct) in BLOCK_FILLS.items():
        fill = mix(pal[tok], pal["raise"], pct)
        c = contrast(pal["ink"], fill)
        ok = c >= 7.0
        report.append(f"    {'PASS' if ok else 'FAIL'}  {name:11} {fill}  body text {c:5.2f}:1 (needs 7.0)")
        if not ok:
            failures.append(f"{theme}: the {name} block fill drops body text to {c:.2f}:1, needs 7.0")

    report.append("\n  lightness separation (survives total loss of hue):")
    for (a, b), floor, why in LIGHTNESS_PAIRS:
        d = abs(oklch(pal[a])[0] - oklch(pal[b])[0])
        ok = d >= floor
        report.append(
            f"    {'PASS' if ok else 'FAIL'}  {a}/{b} dL={d:.3f} (needs {floor}) — {why}"
        )
        if not ok:
            failures.append(
                f"{theme}: {a} and {b} differ by only dL={d:.3f}, needs {floor} ({why})"
            )

    report.append("\n  signal separation under colour-vision deficiency:")
    for group, label in ((SIGNALS, "signals"), (SERIES, "series ")):
      for kind in CVD:
        worst_pair, worst_d = None, 99.0
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                d = delta_e_ok(simulate(pal[a], kind), simulate(pal[b], kind))
                if d < worst_d:
                    worst_d, worst_pair = d, (a, b)
        ok = worst_d >= DELTA_FLOOR
        report.append(
            f"    {'PASS' if ok else 'FAIL'}  {label} {kind:<13} closest pair "
            f"{worst_pair[0]}/{worst_pair[1]} dE={worst_d:.3f} (needs {DELTA_FLOOR})"
        )
        if not ok:
            failures.append(
                f"{theme}: under {kind}, {worst_pair[0]} and {worst_pair[1]} "
                f"collapse to dE={worst_d:.3f}, needs {DELTA_FLOOR}"
            )


HEADER = """/* GENERATED by tools/palette.py — do not edit.
 *
 * Regenerate with:  python3 tools/palette.py --emit
 * Verify with:      python3 tools/palette.py
 *
 * Two tiers live here. The primitives (--w-*) are the struck colours; nothing
 * outside this file may reference them. The semantic roles below say what a
 * colour is *for*, and those are the only colour names the rest of the app is
 * allowed to use. If you find yourself wanting a colour that has no role,
 * the role is what is missing — add it here, not a hex value in a component.
 */
"""

ROLES = """
  /* ---- semantic roles: the only colour names components may use ---- */

  /* surfaces, back to front */
  --surface-page:    var(--w-paper);
  --surface-raised:  var(--w-raise);
  --surface-sunk:    var(--w-sunk);

  /* text, by how much of the reader's attention it is owed */
  --text-strong:     var(--w-ink-strong);
  --text-primary:    var(--w-ink);
  --text-secondary:  var(--w-muted);
  --text-inverse:    var(--w-paper);

  /* lines. --border-hairline separates; --border-strong means something */
  --border-hairline: var(--w-rule);
  --border-strong:   var(--w-rule-strong);
  --border-active:   var(--w-ink);

  /* the four signals */
  --signal-correct:      var(--w-sage);
  --signal-correct-text: var(--w-sage-strong);
  --signal-wrong:        var(--w-oxide);
  --signal-wrong-text:   var(--w-oxide-strong);
  --signal-mastery:      var(--w-gold);
  --signal-mastery-text: var(--w-gold-text);

  /* tinted fills, for the band behind a chosen answer */
  --fill-correct: color-mix(in srgb, var(--w-sage) 12%, var(--w-raise));
  --fill-wrong:   color-mix(in srgb, var(--w-oxide) 12%, var(--w-raise));
  --fill-mastery: color-mix(in srgb, var(--w-gold) 10%, var(--w-raise));

  /* chart series. Deliberately NOT the signal colours: a series is an identity,
     not a verdict, and a green line would be read as the right answer. Three is
     the cap — past three, facet the chart or use a table. Every series also
     carries a direct label or a distinct dash pattern; colour is the second cue,
     never the only one. */
  --viz-series-1: var(--w-viz-1);
  --viz-series-2: var(--w-viz-2);
  --viz-series-3: var(--w-viz-3);

  /* Attention without verdict: something to notice, where nothing has gone
     wrong. A due count, a pip on an outstanding module, an unread marker. It
     is deliberately NOT a new hue — see the rejected fifth hue above — because
     at the sizes this is used, salience is contrast, not colour. A 6px pip in
     --state-attention is 17.8:1 on light and 15.9:1 on dark; the same pip in
     the verdict red is 8.7:1 and 3.6:1. The honest colour is also the louder
     one, which is the happy case. */
  --state-attention: var(--w-ink-strong);

  /* figures, plates and engravings. An illustration needs a way to point at
     something — the marked passage, the limb of the section under discussion —
     and it may not use gold to do it, because gold means the learner earned
     something and a drawing has earned nothing. --figure-accent is the same
     ink as chart series 1; a plate and a chart never share a frame, so there
     is no ambiguity, and it inherits series 1's verified 3:1. */
  --figure-ink:    var(--w-ink);
  --figure-accent: var(--w-viz-1);
  --figure-wash:   color-mix(in srgb, var(--w-viz-1) 10%, var(--w-raise));

  /* Module identity. One per module, constant lightness so none
     outranks another. REINFORCEMENT ONLY — see the note in tools/palette.py:
     colour cannot identify this many categories, so the module name is always
     present and the colour never carries identity alone. --tint is a wash to
     sit behind text; --ink is for chips, rules and badges. */
  --module-tint: var(--w-mod-00-tint);
  --module-ink:  var(--w-mod-00-ink);

  /* Block type — the shape of a lesson, marked so a reader can scan it. This
     is signalling, not decoration: block type IS the structure. */
  --block-rule-fill:       color-mix(in srgb, var(--w-sage)  10%, var(--w-raise));
  --block-caution-fill:    color-mix(in srgb, var(--w-oxide)  9%, var(--w-raise));
  --block-example-fill:    color-mix(in srgb, var(--w-viz-1)  8%, var(--w-raise));
  --block-predict-fill:    color-mix(in srgb, var(--w-viz-2)  9%, var(--w-raise));
  --block-checkpoint-fill: color-mix(in srgb, var(--w-viz-3) 10%, var(--w-raise));
  --block-predict-ink:     var(--w-viz-2);
  --block-checkpoint-ink:  var(--w-viz-3);

  /* interaction */
  --focus-ring:      var(--w-sage-strong);
  --action-primary:  var(--w-ink);
  --action-on-primary: var(--w-paper);
  --scrim:           color-mix(in srgb, var(--w-ink-strong) 62%, transparent);
"""


def emit(light, dark):
    def block(pal, indent="  "):
        return "\n".join(f"{indent}--w-{k}: {v};" for k, v in pal.items())

    def modblock(theme, indent="  "):
        return "\n".join(f"{indent}--w-{k}: {v};" for k, v in build_modules(theme).items())

    return (
        HEADER
        + "\n:root {\n  /* ---- primitives: light ---- */\n"
        + block(light)
        + "\n\n  /* ---- module identity: light ---- */\n"
        + modblock("light")
        + "\n"
        + ROLES
        + "}\n"
        + "\n@media (prefers-color-scheme: dark) {\n  :root {\n"
        + "    /* ---- primitives: dark ---- */\n"
        + block(dark, "    ")
        + "\n\n    /* ---- module identity: dark ---- */\n"
        + modblock("dark", "    ")
        + "\n  }\n}\n"
        + "\n/* Put data-module=\"<moduleId>\" on any wrapper and everything inside it\n"
          "   picks up that module's colour. One attribute, no per-module CSS to\n"
          "   write, and no way to typo a colour into the wrong module. */\n"
        + "\n".join(
            f'[data-module="{mid}"] {{ --module-tint: var(--w-mod-{i:02d}-tint);'
            f' --module-ink: var(--w-mod-{i:02d}-ink); }}'
            for i, mid in enumerate(MODULES)
        )
        + "\n"
        + "\n/* An explicit choice always wins over the system preference. */\n"
        + ':root[data-theme="light"] {\n'
        + block(light) + "\n" + modblock("light")
        + "\n}\n"
        + ':root[data-theme="dark"] {\n'
        + block(dark) + "\n" + modblock("dark")
        + "\n}\n"
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--emit", action="store_true", help="regenerate src/styles/palette.css")
    ap.add_argument("--report", action="store_true", help="print the full contrast table")
    args = ap.parse_args()

    light, dark = build(LIGHT), build(DARK)
    failures, report = [], []
    check("light", light, failures, report)
    check("dark", dark, failures, report)

    if args.report:
        print("\n".join(report))

    if failures:
        print("\npalette: FAILED", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return 1

    if args.emit:
        OUT.write_text(emit(light, dark))
        print(f"palette: wrote {OUT.relative_to(ROOT)}")
    else:
        print(f"palette: OK — {len(TEXT_RULES)} text roles, {len(NONTEXT_RULES)} non-text "
              f"roles, {len(CVD)} CVD simulations, both themes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
