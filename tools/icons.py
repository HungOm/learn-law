#!/usr/bin/env python3
"""Generate the PWA icons from the house mark, and fail if they have drifted.

DESIGN.md says the mark is one geometry used at three sizes, and that if the
drawing changes it changes in all three files. Installing to a home screen added
four more derivatives — the PNGs Android and iOS need, which a manifest cannot
build from an SVG. Those are generated, never hand-drawn.

The drift is silent in the usual way: change favicon.svg, and the home-screen
icon keeps showing the old mark with nothing erroring anywhere. So the source
hash is recorded beside the icons and `--check` fails when it no longer matches.

    python3 tools/icons.py            # regenerate
    python3 tools/icons.py --check    # verify only, exit 1 on drift
"""

import hashlib
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public/favicon.svg"
STAMP = ROOT / "public/.icons-from"
SIZES = (192, 512)

# The maskable variant re-renders the same geometry inside the 80% safe zone, so
# a circular Android mask cannot clip the scales. Same paths, different frame.
MASKABLE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="{bg}"/>
  <g transform="translate(50,50) scale(0.72) translate(-50,-50)">{inner}</g>
</svg>
"""


def build_maskable(svg: str) -> str:
    bg = re.search(r'<rect[^>]*fill="(#[0-9A-Fa-f]{6})"', svg).group(1)
    inner = svg[svg.index("</rect>") + 7 if "</rect>" in svg else svg.index("/>") + 2 :]
    inner = inner[: inner.rindex("</svg>")]
    return MASKABLE.format(bg=bg, inner=inner)


def render(svg_text: str, out: pathlib.Path, size: int) -> None:
    subprocess.run(
        ["rsvg-convert", "-w", str(size), "-h", str(size), "-o", str(out)],
        input=svg_text.encode(), check=True,
    )


def main(argv):
    check = "--check" in argv
    if not SRC.exists():
        print(f"icons: {SRC} is missing")
        return 1

    digest = hashlib.sha256(SRC.read_bytes()).hexdigest()
    targets = [ROOT / f"public/icon-{s}.png" for s in SIZES]
    targets += [ROOT / f"public/icon-maskable-{s}.png" for s in SIZES]

    if check:
        recorded = STAMP.read_text().strip() if STAMP.exists() else None
        missing = [t.name for t in targets if not t.exists()]
        if missing:
            print(f"icons: FAILED — missing {', '.join(missing)}. Run python3 tools/icons.py")
            return 1
        if recorded != digest:
            print("icons: FAILED — public/favicon.svg has changed since the PWA icons "
                  "were generated. The home-screen icon still shows the old mark and "
                  "nothing else will report it. Run python3 tools/icons.py")
            return 1
        print(f"icons: 4 PNGs current with favicon.svg ({digest[:12]})")
        return 0

    svg = SRC.read_text()
    maskable = build_maskable(svg)
    for size in SIZES:
        render(svg, ROOT / f"public/icon-{size}.png", size)
        render(maskable, ROOT / f"public/icon-maskable-{size}.png", size)
    STAMP.write_text(digest + "\n")
    print(f"icons: regenerated 4 PNGs from favicon.svg ({digest[:12]})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
