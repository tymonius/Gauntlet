#!/usr/bin/env python3
"""Pad a half-letter PDF to a multiple of four pages and impose it on Letter sheets.

The imposed output is ordered for duplex printing, short-edge flip, folding, and
saddle stitching. Each landscape Letter page contains two portrait half-letter
pages at their native size.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
from pathlib import Path

from pypdf import PdfReader, PdfWriter, Transformation
from pypdf._page import PageObject

HALF_WIDTH = 5.5 * 72
HALF_HEIGHT = 8.5 * 72
SHEET_WIDTH = 11 * 72
SHEET_HEIGHT = 8.5 * 72
TOLERANCE = 1.0


def page_size(page: PageObject) -> tuple[float, float]:
    return float(page.mediabox.width), float(page.mediabox.height)


def fit_transform(page: PageObject, slot: int) -> Transformation:
    width, height = page_size(page)
    scale = min(HALF_WIDTH / width, HALF_HEIGHT / height)
    x = slot * HALF_WIDTH + (HALF_WIDTH - width * scale) / 2
    y = (HALF_HEIGHT - height * scale) / 2
    return Transformation().scale(scale).translate(x, y)


def validate_half_letter(page: PageObject, number: int) -> None:
    width, height = page_size(page)
    if abs(width - HALF_WIDTH) > TOLERANCE or abs(height - HALF_HEIGHT) > TOLERANCE:
        raise ValueError(
            f"Input page {number} is {width:.2f} x {height:.2f} pt; "
            f"expected half-letter portrait ({HALF_WIDTH:.2f} x {HALF_HEIGHT:.2f} pt)."
        )


def write_reading_order(pages: list[PageObject], output: Path) -> None:
    writer = PdfWriter()
    for page in pages:
        writer.add_page(deepcopy(page))
    writer.add_metadata(
        {
            "/Title": "Gauntlet v0.6.0 Official Rulebook - Booklet Edition",
            "/Subject": "Half-letter reading-order booklet",
        }
    )
    with output.open("wb") as stream:
        writer.write(stream)


def write_imposed(pages: list[PageObject], output: Path) -> None:
    writer = PdfWriter()
    total = len(pages)

    for sheet in range(total // 4):
        front_left = total - 1 - 2 * sheet
        front_right = 2 * sheet
        back_left = 1 + 2 * sheet
        back_right = total - 2 - 2 * sheet

        for left_index, right_index in (
            (front_left, front_right),
            (back_left, back_right),
        ):
            spread = PageObject.create_blank_page(width=SHEET_WIDTH, height=SHEET_HEIGHT)
            left = deepcopy(pages[left_index])
            right = deepcopy(pages[right_index])
            spread.merge_transformed_page(left, fit_transform(left, 0), over=True)
            spread.merge_transformed_page(right, fit_transform(right, 1), over=True)
            writer.add_page(spread)

    writer.add_metadata(
        {
            "/Title": "Gauntlet v0.6.0 Official Rulebook - Print-Imposed Booklet",
            "/Subject": "Letter landscape; duplex short-edge; fold and saddle stitch",
        }
    )
    with output.open("wb") as stream:
        writer.write(stream)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_pdf", type=Path)
    parser.add_argument("reading_order_pdf", type=Path)
    parser.add_argument("imposed_pdf", type=Path)
    args = parser.parse_args()

    reader = PdfReader(str(args.input_pdf))
    source_pages = [deepcopy(page) for page in reader.pages]
    if not source_pages:
        raise ValueError("Input PDF has no pages.")

    for number, page in enumerate(source_pages, start=1):
        validate_half_letter(page, number)

    original_count = len(source_pages)
    padding = (-original_count) % 4
    pages = source_pages + [
        PageObject.create_blank_page(width=HALF_WIDTH, height=HALF_HEIGHT)
        for _ in range(padding)
    ]

    args.reading_order_pdf.parent.mkdir(parents=True, exist_ok=True)
    args.imposed_pdf.parent.mkdir(parents=True, exist_ok=True)
    write_reading_order(pages, args.reading_order_pdf)
    write_imposed(pages, args.imposed_pdf)

    print(
        f"Booklet imposition: {original_count} content pages + {padding} padding pages "
        f"= {len(pages)} booklet pages / {len(pages) // 2} imposed sheet sides."
    )


if __name__ == "__main__":
    main()
