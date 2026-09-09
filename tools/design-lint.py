#!/usr/bin/env python3
"""Enforce the Warta design rules.

DESIGN.md states the rules; this file is why they hold. Several people and
sessions build UI in this repository at once, and a rule that lives only in a
document is a rule that decays the first time someone is in a hurry.

What it refuses:

  1. a raw colour anywhere but the generated palette — a hex value in a
     component is a colour that no contrast check will ever see again;
  2. a --w-* primitive outside palette.css — primitives are private, and
     reaching past the semantic role means the role no longer describes what
     the app actually does;
  3. a token that no longer exists — the pre-Warta names, which now resolve to
     nothing and fail silently as `color: unset`;
  4. text below the 11px floor, or 11px used for something other than a short
     uppercase label — the readership includes children and adults returning
     to study;
  5. a border-radius off the scale;
  6. drift between the generated palette and the two files that cannot use a
     CSS variable: the favicon and the theme-color meta tags;
  7. a stylesheet that declares tokens, or a font file named by url(), that is
     not actually reachable from the app's entry point — the failure mode that defeats rule 6. Rules 1-6 read
     files on disk, so a palette full of correct values still passes them after
     someone deletes the one @import that puts it in front of the browser;
  8. a var() naming a token nothing declares;
  9. two semantic misuses that rules 1-8 cannot see, because every value
     involved is a legitimate token used legitimately — they are only wrong
     given what the element MEANS. Both were found by reading a colleague's
     stylesheet rather than by any tool, which is why they are here now. CSS treats an undefined custom
     property as valid and simply drops the declaration, so a typo or a token
     removed under someone's feet produces no error anywhere — it just quietly
     stops being styled. This is the check that catches a rename mid-flight.

Escape hatch, for the rare case with a real reason:

    color: #ff0000;  /* design-lint: allow — reason */

Run:  python3 tools/design-lint.py
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PALETTE = ROOT / "src" / "styles" / "palette.css"
FAVICON = ROOT / "public" / "favicon.svg"
INDEX = ROOT / "index.html"

ALLOW = re.compile(r"design-lint:\s*allow")
HEX = re.compile(r"#[0-9A-Fa-f]{3,8}\b")
PRIMITIVE = re.compile(r"var\(\s*--w-")
FONT_SIZE = re.compile(r"font-size\s*:\s*([0-9.]+)(rem|px|em)")
RADIUS = re.compile(r"border-radius\s*:\s*([^;{}]+)")

# The tokens Warta replaced. They resolve to nothing now, which CSS treats as a
# non-error, so the only way to catch them is to look.
GONE = {
    "--paper": "--surface-page",
    "--raise": "--surface-raised",
    "--ink": "--text-primary",
    "--muted": "--text-secondary",
    "--rule": "--border-hairline",
    "--sage": "--signal-correct (or --signal-correct-text for words)",
    "--oxide": "--signal-wrong (or --signal-wrong-text for words)",
    "--gold": "--signal-mastery (or --signal-mastery-text for words)",
    "--serif": "--font-serif",
    "--sans": "--font-sans",
    "--rail": "--rail-width",
}
GONE_RE = re.compile(r"var\(\s*(" + "|".join(re.escape(k) for k in GONE) + r")\s*[),]")

FLOOR_PX = 11.0          # --type-2xs
SENTENCE_FLOOR_PX = 12.0 # --type-xs: the smallest size allowed to be a sentence
RADIUS_OK = {"0", "0px", "2px", "4px", "8px", "999px", "50%"}


def sources():
    for pat in ("src/**/*.css", "src/**/*.jsx", "src/**/*.js"):
        for f in sorted(ROOT.glob(pat)):
            if f.resolve() != PALETTE.resolve():
                yield f


def lint_file(path, errors):
    rel = path.relative_to(ROOT)
    lines = path.read_text().splitlines()
    in_comment = False

    for i, line in enumerate(lines, 1):
        prev = lines[i - 2] if i >= 2 else ""
        if ALLOW.search(line) or ALLOW.search(prev):
            continue

        # Track /* */ so a hex quoted in prose does not count as a value.
        stripped = line
        if in_comment:
            if "*/" in line:
                stripped = line.split("*/", 1)[1]
                in_comment = False
            else:
                continue
        if "/*" in stripped:
            head, tail = stripped.split("/*", 1)
            if "*/" in tail:
                stripped = head + tail.split("*/", 1)[1]
            else:
                stripped, in_comment = head, True
        if stripped.lstrip().startswith("//"):
            continue

        for m in HEX.finditer(stripped):
            errors.append(
                f"{rel}:{i}  raw colour {m.group(0)} — use a semantic role from "
                f"palette.css, or regenerate the palette if the colour is new"
            )
        if PRIMITIVE.search(stripped):
            errors.append(
                f"{rel}:{i}  --w-* primitive used outside palette.css — "
                f"primitives are private; use the semantic role"
            )
        for m in GONE_RE.finditer(stripped):
            tok = m.group(1)
            errors.append(f"{rel}:{i}  {tok} no longer exists — use {GONE[tok]}")

        for m in FONT_SIZE.finditer(stripped):
            val, unit = float(m.group(1)), m.group(2)
            px = val * 16 if unit in ("rem", "em") else val
            if px < FLOOR_PX:
                errors.append(
                    f"{rel}:{i}  font-size {m.group(1)}{unit} is {px:.1f}px, below the "
                    f"{FLOOR_PX:.0f}px floor — use a --type-* token"
                )
            elif px < SENTENCE_FLOOR_PX:
                errors.append(
                    f"{rel}:{i}  font-size {m.group(1)}{unit} — use var(--type-2xs), and "
                    f"only for a short uppercase label; sentences start at --type-xs"
                )

        for m in RADIUS.finditer(stripped):
            for part in m.group(1).split():
                part = part.strip()
                if not part or part.startswith("var(") or part in RADIUS_OK:
                    continue
                errors.append(
                    f"{rel}:{i}  border-radius {part} is off the scale — "
                    f"use --radius-sm/md/lg/pill/circle"
                )


def lint_drift(errors):
    """The favicon and the theme-color meta cannot reference a CSS variable, so
    they are the two places the palette can silently drift out of sync."""
    if not PALETTE.exists():
        errors.append("src/styles/palette.css is missing — run tools/palette.py --emit")
        return
    text = PALETTE.read_text()
    blocks = text.split(":root")
    light = dict(re.findall(r"--w-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})", blocks[1]))
    dark = dict(re.findall(r"--w-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})", text.split('data-theme="dark"')[1]))

    if FAVICON.exists():
        fav = FAVICON.read_text()
        for want, why in ((light["ink"], "the seal ground"), (dark["gold"], "the scales")):
            if want.upper() not in fav.upper():
                errors.append(
                    f"public/favicon.svg is out of sync with the palette: {why} "
                    f"should be {want}. The favicon cannot use a CSS variable, so it "
                    f"has to be updated by hand when the palette moves."
                )
    if INDEX.exists():
        idx = INDEX.read_text()
        for want, scheme in ((light["paper"], "light"), (dark["paper"], "dark")):
            pat = rf'theme-color"\s+content="({want})"\s+media="\(prefers-color-scheme:\s*{scheme}\)"'
            if not re.search(pat, idx, re.I):
                errors.append(
                    f'index.html theme-color for {scheme} should be {want} '
                    f'— it is the page surface and it has drifted from the palette'
                )


# A meter track is information: an empty bar and a full one differ only by that
# line, so it needs the 3:1 non-text floor, not the 1.4:1 hairline. And work
# that is due is an invitation, not a correction — colouring a daily queue with
# the verdict red makes an ordinary morning look like a page of mistakes, and
# spends a signal colour on a state that has not gone wrong.
TRACK_SEL = re.compile(r"(?:-track|-bar\b|\bmeter|xpbar|qbar|bigbar|minibar|runbar)")
TRACK_VAL = re.compile(r"(?:background|stroke)\s*:\s*var\(\s*--border-hairline\s*\)")
DUE_SEL = re.compile(r"(?:\.is-due|-due\b)")
DUE_VAL = re.compile(r"var\(\s*--signal-wrong(?:-text)?\s*\)")

BLOCK = re.compile(r"([^{}]+)\{([^{}]*)\}")


def lint_semantics(errors):
    """Catch the two misuses where every token is valid but the meaning is not."""
    for f in sorted(ROOT.glob("src/**/*.css")):
        if f.resolve() == PALETTE.resolve():
            continue
        text = f.read_text()
        rel = f.relative_to(ROOT)
        for m in BLOCK.finditer(text):
            sel, body = m.group(1).strip(), m.group(2)
            if ALLOW.search(sel) or ALLOW.search(body):
                continue
            line = text[: m.start()].count("\n") + 1
            if TRACK_SEL.search(sel) and TRACK_VAL.search(body):
                errors.append(
                    f"{rel}:{line}  `{sel.splitlines()[-1].strip()}` is a meter track "
                    f"using --border-hairline (1.4:1). A track carries information — "
                    f"an empty bar and a full one differ only by it — so it needs "
                    f"--border-strong, which clears the 3:1 non-text floor."
                )
            if DUE_SEL.search(sel) and DUE_VAL.search(body):
                errors.append(
                    f"{rel}:{line}  `{sel.splitlines()[-1].strip()}` colours due work "
                    f"with the verdict red. Due work is an invitation, not a "
                    f"correction — use --text-strong with --weight-semi. See "
                    f"DESIGN.md 2.6."
                )


def lint_reachable(errors):
    """Walk the stylesheet graph from the JS entry points and check that the
    token files are actually in it.

    Every other rule here reads files on disk. That is exactly the wrong
    instrument for this failure: delete `@import './palette.css'` from
    tokens.css and every rule above still passes — palette.css is still on
    disk, still declares every role, still verifies — while the browser
    receives no tokens at all and CSS reports nothing, because an undefined
    custom property is dropped silently. Found by site-39 reading DESIGN.md
    against the wiring rather than trusting it.
    """
    seen, queue = set(), []
    for pat in ("src/**/*.jsx", "src/**/*.js"):
        for f in sorted(ROOT.glob(pat)):
            for m in re.finditer(r"""import\s+['"]([^'"]+\.css)['"]""", f.read_text()):
                queue.append((f.parent / m.group(1)).resolve())
    while queue:
        css = queue.pop()
        if css in seen or not css.exists():
            continue
        seen.add(css)
        for m in re.finditer(r"""@import\s+(?:url\()?['"]([^'"]+\.css)['"]""", css.read_text()):
            queue.append((css.parent / m.group(1)).resolve())

    # Same failure class, one level out: a url() naming a file that is not
    # there. The @font-face is parsed, the face is registered, nothing errors,
    # and the text silently renders in a fallback stack — which is exactly the
    # signal (serif for the law, sans for the apparatus) the design leans on.
    # Raised by site-39 when the fonts were brought in-house.
    for css in sorted(seen):
        base = css.parent
        for m in re.finditer(r"""url\(\s*['"]?([^'")]+)['"]?\s*\)""", css.read_text()):
            ref = m.group(1).strip()
            if ref.startswith(("http:", "https:", "data:", "#")):
                continue
            if not (base / ref).resolve().exists():
                errors.append(
                    f"{css.relative_to(ROOT)}  url({ref}) does not exist — the "
                    f"@font-face registers, nothing errors, and the text renders "
                    f"in a fallback stack"
                )

    for required in ("palette.css", "tokens.css"):
        path = (ROOT / "src" / "styles" / required).resolve()
        if path not in seen:
            errors.append(
                f"src/styles/{required} is not reachable from any JS entry point. "
                f"Its tokens are declared but never served, so every var() that "
                f"names one silently resolves to nothing. Check the @import chain: "
                f"main.jsx -> tokens.css -> palette.css."
            )


def lint_undefined(errors):
    """Every var(--x) must be declared somewhere in the stylesheet set, or in a
    style attribute built in JS. Undefined custom properties fail silently."""
    declared, refs = set(), []
    for f in sorted(ROOT.glob("src/**/*.css")):
        text = f.read_text()
        declared |= set(re.findall(r"(--[a-zA-Z0-9-]+)\s*:", text))
    for pat in ("src/**/*.css", "src/**/*.jsx", "src/**/*.js"):
        for f in sorted(ROOT.glob(pat)):
            for i, line in enumerate(f.read_text().splitlines(), 1):
                for m in re.finditer(r"var\(\s*(--[a-zA-Z0-9-]+)", line):
                    refs.append((f.relative_to(ROOT), i, m.group(1)))
    for rel, i, tok in refs:
        if tok not in declared:
            errors.append(
                f"{rel}:{i}  var({tok}) is not declared anywhere — an undefined "
                f"custom property is dropped silently, so this renders unstyled"
            )


def main():
    errors = []
    for f in sources():
        lint_file(f, errors)
    lint_drift(errors)
    lint_reachable(errors)
    lint_undefined(errors)
    lint_semantics(errors)

    if errors:
        print("design-lint: FAILED", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        print(f"\n{len(errors)} problem(s). See DESIGN.md.", file=sys.stderr)
        return 1
    n = sum(1 for _ in sources())
    print(f"design-lint: OK — {n} files, 9 rules")
    return 0


if __name__ == "__main__":
    sys.exit(main())
