#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("html", type=Path)
    parser.add_argument("colophon_fragment", type=Path)
    parser.add_argument("back_cover", type=Path)
    args = parser.parse_args()

    html = args.html.read_text(encoding="utf-8")
    colophon = args.colophon_fragment.read_text(encoding="utf-8").strip()
    back_cover = args.back_cover.read_text(encoding="utf-8").strip()

    release_dir = args.back_cover.parent
    factions_divider = (
        release_dir / "rulebook-booklet-factions-divider.html"
    ).read_text(encoding="utf-8").strip()
    spread_css = (
        release_dir / "rulebook-booklet-spread-layout.css"
    ).read_text(encoding="utf-8").strip()

    # Keep this layout layer booklet-only without adding another stylesheet to
    # the shared Letter-PDF or DOCX generation paths.
    head_end = html.find("</head>")
    if head_end == -1:
        raise ValueError("Generated booklet HTML does not contain a closing head tag")
    style_block = f'<style id="booklet-spread-layout">\n{spread_css}\n</style>\n'
    html = html[:head_end] + style_block + html[head_end:]

    # The shared colophon source includes the page break needed by the standard
    # PDF and DOCX. The booklet inserts the same content directly between the
    # title page and generated table of contents, so that marker is removed.
    colophon = re.sub(
        r'^\s*<div class="page-break"></div>\s*',
        "",
        colophon,
        count=1,
    )
    colophon = colophon.replace(' id="copyright-and-use"', "", 1)
    inside_front = (
        '<section id="copyright-and-use" class="inside-front-cover" '
        'aria-label="Copyright and use">\n'
        f"{colophon}\n"
        "</section>"
    )

    toc_match = re.search(r'<nav id="TOC"[^>]*>', html)
    if not toc_match:
        raise ValueError("Generated booklet HTML does not contain a table of contents")
    html = html[: toc_match.start()] + inside_front + "\n" + html[toc_match.start() :]

    military_match = re.search(
        r'<section\b(?=[^>]*\bid="[^"]*-military")'
        r'(?=[^>]*\bclass="[^"]*\blevel1\b)[^>]*>',
        html,
    )
    if not military_match:
        raise ValueError("Generated booklet HTML does not contain the Military chapter")
    html = (
        html[: military_match.start()]
        + factions_divider
        + "\n"
        + html[military_match.start() :]
    )

    body_end = html.rfind("</body>")
    if body_end == -1:
        raise ValueError("Generated booklet HTML does not contain a closing body tag")
    html = html[:body_end] + back_cover + "\n" + html[body_end:]

    args.html.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    main()
