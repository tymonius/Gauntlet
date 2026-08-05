#!/usr/bin/env python3
"""Validate frozen v0.6.1 public and printable-reference surfaces.

Before v0.6.2, this script also synchronized the unversioned faction pages. Those
pages now describe the current v0.6.2 release and are owned by
``scripts/synchronize-v062-public-site.mjs``. The historical v0.6.1 workflow must
therefore validate only the preserved v0.6.1 browser, Deckbuilder, onboarding,
and printable-reference surfaces; it must never rewrite current faction pages.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HISTORICAL_PATHS = (
    "start/index.html",
    "playtest/onboarding/index.html",
    "playtest/player-mat/index.html",
    "deckbuilder/app.js",
    "deckbuilder/completed-factions.js",
    "deckbuilder/v061-supplementals.js",
    "deckbuilder/faction-components.js",
    "deckbuilder/print.js",
    "faction-sheets/v061-runtime.js",
    "faction-sheets/v061-release-runtime.js",
)

CURRENT_FACTION_PATHS = (
    "factions/military/index.html",
    "factions/diplomats/index.html",
    "factions/financiers/index.html",
    "factions/intelligence/index.html",
    "factions/mystics/index.html",
    "factions/inquisition/index.html",
)

REQUIRED_MARKERS = (
    "Action Opportunity",
    "Financial Capacity",
    "without spending an Action",
    "Supplemental reference — not a Playable Deck card",
)

FORBIDDEN_MARKERS = (
    "without using an Action Opportunity",
    "without using the Action opportunity",
    "instead of playing a card for its Action effect, spend Conviction",
    "Supplemental reference — no deckbuilding value",
)


def main() -> int:
    errors: list[str] = []
    texts: list[str] = []

    for relative_path in HISTORICAL_PATHS:
        path = ROOT / relative_path
        if not path.is_file():
            errors.append(f"Missing frozen v0.6.1 public surface: {relative_path}")
            continue
        texts.append(path.read_text(encoding="utf-8"))

    combined = "\n".join(texts)
    lowered = combined.lower()

    for marker in REQUIRED_MARKERS:
        if marker.lower() not in lowered:
            errors.append(f"Required frozen v0.6.1 wording is missing: {marker}")

    for marker in FORBIDDEN_MARKERS:
        if marker.lower() in lowered:
            errors.append(f"Obsolete frozen v0.6.1 wording remains: {marker}")

    # The current faction pages must exist, but this historical validator must
    # not interpret or mutate their v0.6.2 rules text.
    for relative_path in CURRENT_FACTION_PATHS:
        if not (ROOT / relative_path).is_file():
            errors.append(f"Missing current faction page: {relative_path}")

    if errors:
        print("Frozen v0.6.1 public-surface validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        "Validated frozen v0.6.1 browser, Deckbuilder, onboarding, and printable "
        "surfaces without touching current v0.6.2 faction pages."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
