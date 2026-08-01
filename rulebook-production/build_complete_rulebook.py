#!/usr/bin/env python3
"""Build the complete Rulebook HTML and attach production layout controls."""

from __future__ import annotations

from pathlib import Path

import build_rulebook

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "full-rulebook.html"


def main() -> None:
    build_rulebook.main()
    content = OUTPUT.read_text(encoding="utf-8")

    head_marker = "</head>"
    reserve_link = '<link rel="stylesheet" href="pagination-reserve.css" />\n'
    if head_marker not in content:
        raise RuntimeError("Could not attach the pagination safety reserve.")
    content = content.replace(head_marker, f"{reserve_link}{head_marker}", 1)

    script_marker = '<script type="module" src="paginate_rulebook.mjs"></script>'
    script_replacement = (
        '<script src="normalize_rulebook_layout.js"></script>\n'
        '<script type="module" src="paginate_rulebook.mjs"></script>'
    )
    if script_marker not in content:
        raise RuntimeError("Could not attach Rulebook layout normalization before pagination.")
    content = content.replace(script_marker, script_replacement, 1)

    OUTPUT.write_text(content, encoding="utf-8")
    print(f"attached layout normalization and pagination reserve to {OUTPUT}")


if __name__ == "__main__":
    main()
