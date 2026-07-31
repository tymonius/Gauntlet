#!/usr/bin/env python3
"""Impose the half-letter v0.6.1 rulebook onto duplex US Letter booklet sheets.

The input is a sequential 5.5 x 8.5 inch reader PDF. The output contains one
11 x 8.5 inch landscape page per printed side, ordered for folding and
saddle-stitching. The source is padded with blank pages to a multiple of four.
"""

from __future__ import annotations

import argparse
import copy
from pathlib import Path

from pypdf import PdfReader, PdfWriter, Transformation
from pypdf._page import PageObject

LETTER_WIDTH = 11 * 72
LETTER_HEIGHT = 8.5 * 72
HALF_WIDTH = LETTER_WIDTH / 2


def fitted_page(source: PageObject, x_offset: float) -> PageObject:
    page = copy.deepcopy(source)
    source_width = float(page.mediabox.width)
    source_height = float(page.mediabox.height)
    scale = min(HALF_WIDTH / source_width, LETTER_HEIGHT / source_height)
    x = x_offset + (HALF_WIDTH - source_width * scale) / 2
    y = (LETTER_HEIGHT - source_height * scale) / 2
    page.add_transformation(Transformation().scale(scale).translate(x, y))
    return page


def add_spread(writer: PdfWriter, left: PageObject, right: PageObject) -> None:
    spread = PageObject.create_blank_page(width=LETTER_WIDTH, height=LETTER_HEIGHT)
    spread.merge_page(fitted_page(left, 0))
    spread.merge_page(fitted_page(right, HALF_WIDTH))
    writer.add_page(spread)


def impose(source_path: Path, output_path: Path) -> tuple[int, int]:
    reader = PdfReader(source_path)
    if not reader.pages:
        raise RuntimeError("Reader PDF has no pages")

    pages = [copy.deepcopy(page) for page in reader.pages]
    source_width = float(pages[0].mediabox.width)
    source_height = float(pages[0].mediabox.height)
    while len(pages) % 4:
        pages.append(PageObject.create_blank_page(width=source_width, height=source_height))

    total = len(pages)
    writer = PdfWriter()
    for sheet in range(total // 4):
        # One-indexed booklet order:
        # front: last, first; back: second, second-last.
        front_left = total - (2 * sheet) - 1
        front_right = 2 * sheet
        back_left = (2 * sheet) + 1
        back_right = total - (2 * sheet) - 2
        add_spread(writer, pages[front_left], pages[front_right])
        add_spread(writer, pages[back_left], pages[back_right])

    writer.add_metadata(
        {
            "/Title": "Gauntlet v0.6.1 Official Rulebook — Booklet Edition",
            "/Subject": "Duplex short-edge, fold, and saddle-stitch booklet imposition",
            "/Creator": "Gauntlet release toolchain",
        }
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as handle:
        writer.write(handle)
    return len(reader.pages), total


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    original, padded = impose(args.source, args.output)
    print(
        f"Wrote {args.output} from {original} reader pages "
        f"({padded} pages after booklet padding; {padded // 4} sheets)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
