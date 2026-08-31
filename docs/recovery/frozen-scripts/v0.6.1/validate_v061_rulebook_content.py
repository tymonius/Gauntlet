#!/usr/bin/env python3
"""Validate v0.6.1 Rulebook teaching order and first-use discipline."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULEBOOK = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"

FACTION_CHAPTERS = (
    (13, "Military"),
    (14, "Diplomats"),
    (15, "Financiers"),
    (16, "Intelligence"),
    (17, "Mystics"),
    (18, "Inquisition"),
)

REQUIRED_ORDER = (
    "# Welcome to Gauntlet",
    "# How to Use This Rulebook",
    "# Game at a Glance",
    "# How to Win",
    "# Golden Rules",
    "# Part I — Learn to Play",
    "# 1. Components",
    "# 2. Cards, Zones, and the Play Area",
    "# 3. Setup",
    "# 4. Your Turn",
    "# 5. Actions and Assets",
    "# 6. Movement and Position",
    "# 7. Battles",
    "## The Aftermath",
    "## Withdrawal and Retreat",
    "# 8. Territory Control and Capture",
    "# 9. Running the Gauntlet",
    "# Part II — Complete Shared Rules",
    "# 10. Constructing a Deck",
    "# 11. Detailed Card and Timing Rules",
    "# 12. Overlays and Other Shared Card Rules",
    "# Part III — Factions",
    "# 13. Military",
    "# 14. Diplomats",
    "# 15. Financiers",
    "# 16. Intelligence",
    "# 17. Mystics",
    "# 18. Inquisition",
    "# Part IV — Reference",
    "# Quick Turn Reference",
    "# Quick Battle Reference",
    "# Glossary",
    "# Copyright and Playtest Use",
)

FACTION_TERMS = (
    "Command Tracker",
    "Influence Tracker",
    "Proposal",
    "Treaty Article",
    "Stake",
    "Capital Ledger",
    "Deed Cards",
    "Treasury",
    "Mission Reference Card",
    "Operations Reference Card",
    "Operation Progress",
    "Special Operation",
    "Surveillance",
    "Interference",
    "Rite of Echoes",
    "Rite of Blood",
    "Rite of Crossing",
    "Transmutation",
    "Ritual of Ascendance",
    "Conviction Tracker",
    "Purge Reference Card",
    "Controlling Interest",
    "Purification",
)

FACTION_INTRO_FORBIDDEN = (
    "collateral",
    "Transmutation",
    "Treasury",
    "Proposal",
    "Rite",
    "Mission",
    "Purge",
)

FORBIDDEN_STRUCTURE = (
    "# 13. Factions",
    "# 14. Military",
    "# 15. Diplomats",
    "# 16. Financiers",
    "# 17. Intelligence",
    "# 18. Mystics",
    "# 19. Inquisition",
    "# 15. Standard Language and Reference Rules",
    "Use these verbs consistently:",
    "Avoid generic phrases such as",
    "shared-timing rule below",
)


def main() -> int:
    text = RULEBOOK.read_text(encoding="utf-8")

    positions = []
    for marker in REQUIRED_ORDER:
        position = text.find(marker)
        if position < 0:
            raise SystemExit(f"Rulebook content audit: missing {marker!r}")
        positions.append(position)
    if positions != sorted(positions):
        raise SystemExit("Rulebook content audit: required sections are not in teaching order")

    for phrase in FORBIDDEN_STRUCTURE:
        if phrase in text:
            raise SystemExit(f"Rulebook content audit: obsolete structure remains: {phrase}")

    factions_index = text.index("# Part III — Factions")
    generated_index = text.index("<!-- GENERATED FACTION CONTENT START -->")
    universal = text[:factions_index]
    faction_intro = text[factions_index:generated_index]
    for phrase in FACTION_TERMS:
        if phrase in universal:
            raise SystemExit(
                f"Rulebook content audit: faction-specific term appears before Part III: {phrase}"
            )
    for phrase in FACTION_INTRO_FORBIDDEN:
        if phrase in faction_intro:
            raise SystemExit(
                f"Rulebook content audit: faction-specific example appears before its chapter: {phrase}"
            )

    chapter_two = text.index("# 2. Cards, Zones, and the Play Area")
    setup = text.index("# 3. Setup")
    first_use_markers = {
        "Action Opportunity": "### Actions and Action Opportunities",
        "Gambit": "- **Gambit:**",
        "Reserve": "### Reserve",
        "Tactic": "- **Tactic:**",
    }
    for term, marker in first_use_markers.items():
        location = text.find(marker)
        if location < chapter_two or location > setup:
            raise SystemExit(
                f"Rulebook content audit: {term} is not defined before Setup"
            )

    battle = text.index("# 7. Battles")
    aftermath = text.index("## The Aftermath")
    withdrawal = text.index("## Withdrawal and Retreat")
    territory = text.index("# 8. Territory Control and Capture")
    if not (battle < aftermath < withdrawal < territory):
        raise SystemExit("Rulebook content audit: battle result sequence is fragmented")
    if "\n---\n" in text[aftermath:withdrawal]:
        raise SystemExit("Rulebook content audit: Aftermath and Withdrawal are visually separated")

    if "\n\n---\n\n---\n\n" in text:
        raise SystemExit("Rulebook content audit: duplicate section dividers remain")

    if text.count("<!-- GENERATED FACTION CONTENT START -->") != 1:
        raise SystemExit("Rulebook content audit: generated faction start marker is invalid")
    if text.count("<!-- GENERATED FACTION CONTENT END -->") != 1:
        raise SystemExit("Rulebook content audit: generated faction end marker is invalid")

    for chapter, faction in FACTION_CHAPTERS:
        if len(re.findall(rf"(?m)^# {chapter}\. {re.escape(faction)}$", text)) != 1:
            raise SystemExit(
                f"Rulebook content audit: {faction} is not exactly one numbered faction chapter"
            )
        if re.search(rf"(?m)^## {re.escape(faction)}$", text):
            raise SystemExit(
                f"Rulebook content audit: {faction} remains a subsection instead of a chapter"
            )

    required_notice = (
        "Gauntlet is an unpublished playtest project.",
        "Copyright © 2026 Tymon Scott. All rights reserved.",
        "provided for private review and playtesting only",
        "may not be copied, redistributed, sold, republished",
    )
    for phrase in required_notice:
        if phrase not in text:
            raise SystemExit(f"Rulebook content audit: copyright notice is missing {phrase!r}")
    if text.count("Copyright © 2026 Tymon Scott. All rights reserved.") != 1:
        raise SystemExit("Rulebook content audit: copyright notice is duplicated")

    defender_tie = re.search(
        r"Defender's Advantage:\*\*\s+This is a tie rule",
        text,
    )
    if not defender_tie:
        raise SystemExit("Rulebook content audit: PR #336 Defender's Advantage clarification is missing")
    if "Defender's Advantage does not grant an additional die" not in text:
        raise SystemExit("Rulebook content audit: PR #336 additional-die clarification is missing")

    print("v0.6.1 Rulebook teaching order, first-use discipline, faction chapters, and copyright content validated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
