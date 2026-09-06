#!/usr/bin/env python3
"""Reject v0.6.1 faction-sheet PDFs with extra or blank trailing pages."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

EXPECTED_PAGES = {
    "military": 2,
    "diplomats": 4,
    "financiers": 3,
    "intelligence": 2,
    "mystics": 4,
    "inquisition": 2,
}


def command_output(*args: str) -> str:
    result = subprocess.run(args, check=True, capture_output=True, text=True)
    return result.stdout


def page_count(pdf: Path) -> int:
    info = command_output("pdfinfo", str(pdf))
    match = re.search(r"(?m)^Pages:\s+(\d+)\s*$", info)
    if not match:
        raise RuntimeError(f"Could not determine page count for {pdf}")
    return int(match.group(1))


def page_text(pdf: Path, page: int) -> str:
    return command_output(
        "pdftotext",
        "-f",
        str(page),
        "-l",
        str(page),
        str(pdf),
        "-",
    )


def validate(directory: Path) -> list[str]:
    errors: list[str] = []
    for faction, expected in EXPECTED_PAGES.items():
        pdf = directory / f"{faction}.pdf"
        if not pdf.is_file() or pdf.stat().st_size == 0:
            errors.append(f"Missing faction-sheet PDF: {pdf}")
            continue

        try:
            actual = page_count(pdf)
        except (RuntimeError, subprocess.CalledProcessError) as exc:
            errors.append(str(exc))
            continue

        if actual != expected:
            errors.append(f"{faction}.pdf has {actual} pages; expected {expected}")

        try:
            final_text = page_text(pdf, actual)
        except subprocess.CalledProcessError as exc:
            errors.append(f"Could not extract final page from {faction}.pdf: {exc}")
            continue

        if not final_text.strip():
            errors.append(f"{faction}.pdf ends with a blank page")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", nargs="?", default="/tmp/v061-faction-sheets")
    args = parser.parse_args()

    errors = validate(Path(args.directory))
    if errors:
        print("Faction-sheet PDF validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Validated six faction-sheet PDFs with exact page counts and nonblank final pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
