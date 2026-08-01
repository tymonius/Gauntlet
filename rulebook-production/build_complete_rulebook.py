#!/usr/bin/env python3
"""Build the complete Rulebook HTML and attach layout normalization."""

from __future__ import annotations

from pathlib import Path

import build_rulebook

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "full-rulebook.html"


def main() -> None:
    build_rulebook.main()
    content = OUTPUT.read_text(encoding="utf-8")
    marker = '<script type="module" src="paginate_rulebook.mjs"></script>'
    replacement = (
        '<script src="normalize_rulebook_layout.js"></script>\n'
        '<script type="module" src="paginate_rulebook.mjs"></script>'
    )
    if marker not in content:
        raise RuntimeError("Could not attach Rulebook layout normalization before pagination.")
    OUTPUT.write_text(content.replace(marker, replacement, 1), encoding="utf-8")
    print(f"attached layout normalization to {OUTPUT}")


if __name__ == "__main__":
    main()
