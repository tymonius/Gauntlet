#!/usr/bin/env python3
"""Adapt the approved Rulebook production system to the current v0.6.3 source.

This is intentionally a thin source/version adapter. The approved design and
pagination implementation remain in rulebook-design/ and rulebook-production/.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTION = ROOT / "rulebook-production"
CURRENT_RULEBOOK = ROOT / "releases" / "v0.6.3-reconstructed" / "Gauntlet_v0.6.3_Rulebook.md"
HTML = PRODUCTION / "full-rulebook.html"
RUNTIME_PAGINATOR = PRODUCTION / ".paginate_rulebook_runtime.mjs"

sys.path.insert(0, str(PRODUCTION))

import build_rulebook  # noqa: E402
import build_complete_rulebook  # noqa: E402


def replace_required(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise RuntimeError(f"Could not find expected {label} marker while adapting the approved Rulebook production output.")
    return source.replace(old, new)


def main() -> None:
    if not CURRENT_RULEBOOK.is_file():
        raise RuntimeError(f"Missing current Rulebook source: {CURRENT_RULEBOOK}")

    # The approved builder exposes its canonical Markdown path as a module-level
    # input. Point only that input at the current publication source; do not
    # duplicate or rewrite the design/pagination system.
    build_rulebook.RULEBOOK = CURRENT_RULEBOOK
    build_complete_rulebook.main()

    html = HTML.read_text(encoding="utf-8")
    html = replace_required(
        html,
        "Version 0.6.1 · First Playtest Revision",
        "Version 0.6.3",
        "approved cover version",
    )
    html = replace_required(
        html,
        "Gauntlet v0.6.1 Official Rulebook",
        "Gauntlet v0.6.3 Official Rulebook",
        "document title",
    )
    html = html.replace("GAUNTLET V0.6.1", "GAUNTLET V0.6.3")
    HTML.write_text(html, encoding="utf-8")

    paginator = RUNTIME_PAGINATOR.read_text(encoding="utf-8")
    paginator = replace_required(
        paginator,
        "GAUNTLET V0.6.1",
        "GAUNTLET V0.6.3",
        "folio version",
    )
    RUNTIME_PAGINATOR.write_text(paginator, encoding="utf-8")

    print(f"adapted approved Rulebook production system to {CURRENT_RULEBOOK.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
