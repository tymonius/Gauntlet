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
    production_links = (
        '<link rel="stylesheet" href="pagination-reserve.css" />\n'
        '<link rel="stylesheet" href="chapter-compaction.css" />\n'
        '<link rel="stylesheet" href="supplemental-reference.css" />\n'
    )
    if head_marker not in content:
        raise RuntimeError("Could not attach the production pagination styles.")
    content = content.replace(head_marker, f"{production_links}{head_marker}", 1)

    script_marker = '<script type="module" src="paginate_rulebook.mjs"></script>'
    script_replacement = (
        '<script src="normalize_rulebook_layout.js"></script>\n'
        '<script src="postprocess_rulebook.mjs"></script>\n'
        '<script type="module" src="paginate_rulebook.mjs"></script>'
    )
    if script_marker not in content:
        raise RuntimeError("Could not attach Rulebook layout controls around pagination.")
    content = content.replace(script_marker, script_replacement, 1)

    OUTPUT.write_text(content, encoding="utf-8")
    print(f"attached normalization, production pagination styles, and synchronous structural postprocessing to {OUTPUT}")


if __name__ == "__main__":
    main()
