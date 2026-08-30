#!/usr/bin/env python3
"""Normalize the restructured v0.6.1 Rulebook after faction synchronization.

This pass removes faction-specific terminology from the shared learn-to-play and
technical chapters, improves cross-references, fixes heading hierarchy, and removes
duplicate horizontal rules introduced while migrating the old top-level chapters.
"""

from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULEBOOK = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"

REPLACEMENTS = (
    (
        "\n![Gauntlet hero sketch](<images/sketches/hero sketch.png>)\n",
        "\n",
    ),
    (
        "On your turn, draw a card, take one Action Opportunity before or after moving, and advance, hold, or withdraw.",
        "On your turn, draw a card, take one Action before or after moving, and advance, hold, or withdraw.",
    ),
    (
        "put it in the Discard Pile unless it becomes an Asset or Overlay or specifies another destination.",
        "put it in the Discard Pile unless it becomes an Asset, becomes an Overlay attached to a Territory, or specifies another destination. Overlays are explained in Chapter 12.",
    ),
    (
        "Resolve remaining Gambit effects using the shared-timing rule below.",
        "Resolve remaining Gambit effects using the shared-timing rule in Chapter 11.",
    ),
    (
        "After that, resolve remaining Gambit effects using the shared-timing rule below.",
        "After that, resolve remaining Gambit effects using the shared-timing rule in Chapter 11.",
    ),
    (
        "Reveal all Tactics simultaneously. Resolve their effects using the shared-timing rule.",
        "Reveal all Tactics simultaneously. Resolve their effects using the shared-timing rule in Chapter 11.",
    ),
    (
        "Resolve any remaining instructions from the effect or accepted Terms after that movement.",
        "Resolve any remaining instructions from the effect after that movement.",
    ),
    (
        "do not reopen Tactic choices, reveal timing, Surveillance, or Interference;",
        "do not reopen Tactic choices, reveal timing, or response opportunities;",
    ),
    (
        "the revised choice does not create another reveal, Surveillance, Interference, or replacement opportunity unless stated otherwise.",
        "the revised choice does not create another reveal, response, or replacement opportunity unless stated otherwise.",
    ),
    (
        "Supplemental components have no deckbuilding value and are not eligible as Gambits, Tactics, costs, collateral, Transmutation cards, Treasury cards, or other playable cards unless a rule explicitly says otherwise.",
        "Supplemental components have no deckbuilding value and are not eligible as Gambits, Tactics, costs, or other playable cards unless a rule explicitly says otherwise.",
    ),
    (
        "Keep any attached or bound cards with it so both players can identify the relationship.",
        "Keep any cards attached to a supplemental component with it so both players can identify the relationship.",
    ),
    (
        "# Part III — Factions\n\n# 13. Factions\n\n## How Factions Work",
        "# Part III — Factions\n\n## How Factions Work",
    ),
    (
        "Then read the subsection for the faction and Leader used in the game.",
        "Then read the chapter for the faction and Leader used in the game.",
    ),
    (
        "The relevant faction subsection identifies its exact package and starting state.",
        "The relevant faction chapter identifies its exact package and starting state.",
    ),
    (
        "the procedure stated in the relevant faction subsection",
        "the procedure stated in the relevant faction chapter",
    ),
    (
        "## Battle timing and card interaction\n\n## Shared-timing rule",
        "## Battle timing and card interaction\n\n### Shared-timing rule",
    ),
    ("\n## Multiple and additional Gambits or Tactics\n", "\n### Multiple and additional Gambits or Tactics\n"),
    ("\n## Replacements and revisions\n", "\n### Replacements and revisions\n"),
    ("\n## Reveal and information\n", "\n### Reveal and information\n"),
    ("\n## Negation\n", "\n### Negation\n"),
    ("\n## Copied effects\n", "\n### Copied effects\n"),
    ("\n---\n\n## Withdrawal and Retreat", "\n\n## Withdrawal and Retreat"),
    ("after that movement.\n#### Retreat", "after that movement.\n\n#### Retreat"),
    (
        "\n---\n\nGauntlet v0.6.1 © 2026 Tymon Scott. All rights reserved.\n\n---\n\n# Glossary",
        "\n---\n\n# Glossary",
    ),
)


def generate(current: str) -> str:
    text = current
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)

    duplicate = "\n\n---\n\n---\n\n"
    while duplicate in text:
        text = text.replace(duplicate, "\n\n---\n\n")

    text = text.replace("\n---\n\n# How to Use This Rulebook", "\n\n# How to Use This Rulebook", 1)
    return text.rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if normalization would change the Rulebook.")
    args = parser.parse_args()

    current = RULEBOOK.read_text(encoding="utf-8")
    generated = generate(current)

    if args.check:
        if generated != current:
            raise SystemExit("v0.6.1 Rulebook content normalization is not current")
        print("v0.6.1 Rulebook content normalization is current.")
        return 0

    if generated != current:
        RULEBOOK.write_text(generated, encoding="utf-8")
        print(f"Normalized {RULEBOOK.relative_to(ROOT)}")
    else:
        print("v0.6.1 Rulebook content already normalized.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
