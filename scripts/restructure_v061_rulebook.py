#!/usr/bin/env python3
"""Restructure the v0.6.1 Rulebook into a sequential teaching document.

This is a content migration, not a design pass. It preserves the current shared rules
and definitive faction material while changing the order in which a new player meets
those rules. The resulting source has four major parts:

1. Learn to Play
2. Complete Shared Rules
3. Factions
4. Reference

The script is intentionally idempotent. Once the new structure is present, --check
verifies it and a normal run leaves it unchanged.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULEBOOK = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"

PART_I = "# Part I — Learn to Play"
PART_II = "# Part II — Complete Shared Rules"
PART_III = "# Part III — Factions"
PART_IV = "# Part IV — Reference"
FACTION_START = "<!-- GENERATED FACTION CONTENT START -->"
FACTION_END = "<!-- GENERATED FACTION CONTENT END -->"


def top_section(text: str, heading: str) -> str:
    matches = list(re.finditer(r"(?m)^# .+$", text))
    for index, match in enumerate(matches):
        if match.group(0).strip() != heading:
            continue
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        return text[match.start():end].strip()
    raise RuntimeError(f"Missing top-level section: {heading}")


def strip_top_heading(section: str) -> str:
    return section.split("\n", 1)[1].strip() if "\n" in section else ""


def rename_top(section: str, heading: str) -> str:
    body = strip_top_heading(section)
    return f"{heading}\n\n{body}".rstrip()


def subsection(text: str, start: str, end: str | None = None) -> str:
    start_match = re.search(rf"(?m)^{re.escape(start)}\s*$", text)
    if not start_match:
        raise RuntimeError(f"Missing subsection: {start}")
    body_start = start_match.end()
    if end:
        end_match = re.search(rf"(?m)^{re.escape(end)}\s*$", text[body_start:])
        if not end_match:
            raise RuntimeError(f"Missing subsection boundary: {end}")
        body_end = body_start + end_match.start()
    else:
        body_end = len(text)
    return text[body_start:body_end].strip()


def demote_headings(text: str, levels: int = 1) -> str:
    def repl(match: re.Match[str]) -> str:
        return "#" * (len(match.group(1)) + levels) + match.group(2)

    return re.sub(r"(?m)^(#{1,5})(\s+)", repl, text)


def promote_headings(text: str, levels: int = 1) -> str:
    def repl(match: re.Match[str]) -> str:
        return "#" * max(1, len(match.group(1)) - levels) + match.group(2)

    return re.sub(r"(?m)^(#{2,6})(\s+)", repl, text)


def remove_block(text: str, start: str, end: str | None = None) -> str:
    start_match = re.search(rf"(?m)^{re.escape(start)}\s*$", text)
    if not start_match:
        return text
    if end:
        end_match = re.search(rf"(?m)^{re.escape(end)}\s*$", text[start_match.end():])
        if not end_match:
            raise RuntimeError(f"Missing removal boundary: {end}")
        stop = start_match.end() + end_match.start()
    else:
        stop = len(text)
    return (text[: start_match.start()] + text[stop:]).strip()


def clean_section(section: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", section.strip())


def build_new_source(current: str) -> str:
    if PART_I in current:
        return current.rstrip() + "\n"

    welcome = strip_top_heading(top_section(current, "# Welcome to Gauntlet"))
    welcome = re.sub(
        r"\n*This rulebook is written in two layers\..+?do not contradict one another\.\s*",
        "\n",
        welcome,
        flags=re.S,
    ).strip()

    conventions = top_section(current, "# Rules Conventions")
    convention_complete = subsection(conventions, "## Complete rules", "## Playing cards")

    components = top_section(current, "# 1. Components")
    component_general_use = subsection(
        components,
        "#### General use",
        "#### Military package",
    )

    deckbuilding = rename_top(top_section(current, "# 2. Building a Deck"), "# 10. Constructing a Deck")
    setup = rename_top(top_section(current, "# 3. Setup"), "# 3. Setup")
    turn = rename_top(top_section(current, "# 4. Turn Structure"), "# 4. Your Turn")
    movement = rename_top(top_section(current, "# 5. Movement"), "# 6. Movement and Position")
    movement = movement.replace(
        "follow-up movement must come from an Order, card, or other specific effect.",
        "follow-up movement must come from a card, Leader ability, or other specific effect.",
    )

    battles = top_section(current, "# 6. Battles")
    battle_body = strip_top_heading(battles)
    technical_marker = "### Shared-timing rule"
    if technical_marker not in battle_body:
        raise RuntimeError("Could not separate procedural and technical battle rules")
    battle_core, battle_technical = battle_body.split(technical_marker, 1)
    battle_technical = technical_marker + battle_technical
    battle_core = battle_core.replace(
        "A mechanic such as Terms may prevent the pending battle.",
        "A faction, Leader, card, or Territory effect may prevent the pending battle.",
    )

    aftermath = strip_top_heading(top_section(current, "# 7. The Aftermath of the Battle"))
    withdrawal = strip_top_heading(top_section(current, "# 8. Withdrawal and Retreat"))
    withdrawal = re.sub(
        r"\n*If a battle following refused Terms ends through withdrawal,.+?unless a specific rule says otherwise\.\s*",
        "\n",
        withdrawal,
        flags=re.S,
    ).strip()

    territory = rename_top(top_section(current, "# 9. Territory Control"), "# 8. Territory Control and Capture")
    running = rename_top(top_section(current, "# 10. Running the Gauntlet"), "# 9. Running the Gauntlet")
    actions = rename_top(top_section(current, "# 12. Actions and Assets"), "# 5. Actions and Assets")
    overlays = rename_top(top_section(current, "# 13. Overlays"), "# 12. Overlays and Other Shared Card Rules")

    battle_chapter = clean_section(
        "# 7. Battles\n\n"
        + battle_core.strip()
        + "\n\n## The Aftermath\n\n"
        + demote_headings(aftermath, 1)
        + "\n\n## Withdrawal and Retreat\n\n"
        + demote_headings(withdrawal, 1)
    )

    technical_chapter = clean_section(
        "# 11. Detailed Card and Timing Rules\n\n"
        "## How it works\n\n"
        "Most games can be played from the Learn to Play rules. Use this chapter when cards or faction abilities interact at the same timing, reveal information early, add or replace battle cards, copy effects, or change normal destinations.\n\n"
        "## Complete rules\n\n"
        + convention_complete
        + "\n\n## Battle timing and card interaction\n\n"
        + promote_headings(battle_technical, 1)
    )

    faction_intro = clean_section(
        f"{PART_III}\n\n"
        "# 13. Factions\n\n"
        "## How Factions Work\n\n"
        "Each Deck belongs to one faction and uses one of that faction's two Leaders. The faction determines which faction cards may be included, which supplemental components are prepared, which public resources or progress are tracked, and which faction-specific actions and procedures are available.\n\n"
        "Every faction may still win by running the Gauntlet. Some factions also have an alternate victory condition. An alternate victory applies only when its complete faction rules are satisfied.\n\n"
        "Read the shared Learn to Play rules first. Then read the subsection for the faction and Leader used in the game. Players do not need to learn every other faction before their first game, but both players should be able to inspect all public faction rules and components in use.\n\n"
        "## Faction Components\n\n"
        "Faction packages use Leader Cards, reference cards, trackers, double-sided progress cards, shared supplies, or other public components. The relevant faction subsection identifies its exact package and starting state.\n\n"
        "Reference cards summarize procedures but do not replace the rulebook. If shortened reference text omits a detail, follow the complete faction rules below.\n\n"
        "### General use\n\n"
        + component_general_use
        + f"\n\n{FACTION_START}\n{FACTION_END}"
    )

    quick_battle = strip_top_heading(top_section(current, "# Quick Battle Reference"))

    front_matter = f"""# GAUNTLET

## Official Rulebook

**Version 0.6.1 — First Playtest Revision**

![Gauntlet hero sketch](<images/sketches/hero sketch.png>)

---

# Welcome to Gauntlet

{welcome}

# How to Use This Rulebook

The rulebook is organized to teach the game in the order a new player needs it.

- **Part I — Learn to Play** explains the shared game from components through victory.
- **Part II — Complete Shared Rules** contains deck construction and technical interaction rules.
- **Part III — Factions** explains the six factions, their Leaders, components, procedures, and alternate victories.
- **Part IV — Reference** provides compact turn and battle sequences, a glossary, and the copyright and playtest-use notice.

Major chapters use two layers. **How it works** teaches the ordinary rule in direct language. **Complete rules** gives exact timing, exceptions, and edge cases. Read the How it works layer first when learning; use Complete rules to resolve precise questions.

# Game at a Glance

Each player begins just outside their end of a six-Territory battlefield. On your turn, draw a card, take one Action Opportunity before or after moving, and advance, hold, or withdraw. Entering the opponent's position begins a battle.

In battle, each player may risk one card from Hand as a Gambit, then draws a temporary three-card Reserve and may choose one card as a Tactic. Card effects and dice determine the winner. The loser retreats, and the winner occupies or keeps the contested position.

Winning an attack does not capture a Territory immediately. The attacker must remain there through the opponent's turn and capture it at the start of their next turn. This creates a counterattack window and makes control change through sustained pressure rather than one die roll.

# How to Win

The normal victory is to **run the Gauntlet**:

1. cross the Territory column;
2. force the opponent beyond their final Territory;
3. capture that final Territory;
4. advance beyond the Gauntlet to begin a Last Stand battle; and
5. win that battle.

Every faction can win this way. Some factions also have an alternate victory condition described in Part III.

# Golden Rules

- When a specific card, Leader, faction, Territory, or component rule conflicts with a general rule, follow the specific rule.
- **May** means an effect is optional. **Must** means it is required.
- Resolve instructions in the order written.
- Complete as much of an instruction as possible unless the missing part is a required cost, requirement, or target.

---
""".strip()

    components_chapter = """# 1. Components

## How it works

For a first game, use two prepared or recommended Decks. Each player needs one complete Deck, one Player Token, and a six-sided die. The two players' three-Territory sets join to form the six-position Gauntlet.

## Complete rules

Each player needs:

- one complete **Deck**;
- one **Player Token**; and
- one six-sided die.

The players may share a die.

A complete Deck contains:

- one faction;
- one Leader Card from that faction;
- one Playable Deck;
- three different Territory Cards; and
- any components required by that faction or Leader.

Together, both players' Territory Cards form the **Gauntlet**, a single six-Territory column. The exact construction requirements for a custom Deck appear in Chapter 10. Faction packages and their starting states appear in Part III.
""".strip()

    cards_and_zones = """# 2. Cards, Zones, and the Play Area

## How it works

Keep every group of cards visibly separate. Your Hand is the permanent private set of cards you hold between turns. Your Draw Pile supplies cards; the Discard Pile is recyclable; the Graveyard normally is not. Assets remain face up in your Asset Bank.

A battle creates three temporary areas: a Gambit set from Hand, a three-card Reserve drawn from the Draw Pile, and a Tactic chosen from that Reserve.

## Printed card effects

A card may have several printed effects. The way it is used determines which effect resolves.

- **Action:** play from Hand during an Action Opportunity.
- **Gambit:** set from Hand during a battle.
- **Tactic:** choose from Reserve during a battle.
- **Battle:** may be used as either a Gambit or a Tactic.

Playing or using one printed effect does not activate the card's other printed effects unless a rule says otherwise.

Setting a Gambit or choosing a Tactic places the card in battle. It does not resolve immediately. Gambits and Tactics resolve at their normal reveal stages even when an effect causes them to become face up early, unless that effect says otherwise.

Faction cards may contain other headings. Those headings use the procedure stated in the relevant faction subsection and do not make a card eligible as a Gambit or Tactic unless it also has a Gambit, Tactic, or Battle effect.

## Play area and zones

### Draw Pile

The face-down pile formed from the Playable Deck. Draw cards from its top.

### Hand

The private cards held by a player. The normal Hand limit is three at end-of-turn Cleanup. Setting the Hand physically aside during a battle does not move those cards to another zone.

### Discard Pile

A face-up pile of recyclable cards. When a Draw Pile cannot complete a draw, shuffle the Discard Pile to form a new Draw Pile.

### Graveyard

A face-up pile outside normal circulation. Cards there are not reshuffled unless an effect moves them.

### Asset Bank

The public area containing a player's banked Assets.

### Gambit area

The temporary area containing cards set from Hand as Gambits for the current battle. Gambits normally go to their owners' Graveyards during the Aftermath.

### Reserve

A temporary private zone formed during one battle. Each player normally draws three cards to form it. Reserve is separate from Hand, and its owner may inspect and arrange it freely. Cards remaining there normally go to the Discard Pile during the Aftermath.

### Tactic area

The temporary area containing cards chosen or added as Tactics for the current battle. Tactics normally go to their owners' Discard Piles during the Aftermath.

### Leader and faction area

Keep the Leader and all faction trackers, references, progress cards, and other public faction components together and visible. Part III explains each faction's exact arrangement.

### Territories and Player Tokens

Territory orientation shows control: the player a Territory faces controls it. A Player Token shows the position that player occupies. Occupation and control are related but are not the same; Chapter 8 explains how control changes.

### Action Opportunity

An Action Opportunity is the point during a turn when a player may play one card for its Action effect or perform a rule or faction action that explicitly uses that opportunity. Chapter 4 explains when it occurs.
""".strip()

    quick_turn = """# Quick Turn Reference

1. **Capture:** capture an opposing Territory you still occupy.
2. **Draw:** draw one card.
3. **Action Opportunity before movement:** use it now or save it.
4. **Movement:** advance, hold, or withdraw; resolve any battle immediately.
5. **Action Opportunity after movement:** use it now if it was not used before movement.
6. **Cleanup:** resolve end-of-turn effects and discard down to three cards.
""".strip()

    glossary = """# Glossary

**Action Opportunity:** The normal opportunity to play one Action card or perform a rule or faction action that explicitly uses it.

**Aftermath:** The part of a battle after the winner is determined, including result effects, retreat, occupation, card destinations, and follow-up effects.

**Asset:** A persistent card banked face up in the Asset Bank.

**Control:** Ownership of a Territory for rules purposes, shown by the direction the Territory faces.

**Gambit:** An optional battle card set from Hand. It normally goes to the Graveyard during the Aftermath.

**Occupation:** The position currently held by a Player Token. A player may occupy a Territory they do not control.

**Reserve:** The temporary private cards drawn for one battle. Reserve is separate from Hand.

**Retreat:** Forced displacement after losing a battle. Retreat is not movement or withdrawal.

**Tactic:** An optional battle card chosen from Reserve. It normally goes to the Discard Pile during the Aftermath.

**Withdrawal:** Leaving or ending a battle without determining a winner, or voluntarily moving toward your own end during movement, as the relevant rule specifies.

**Last Stand:** The battle beyond the final Territory that an attacker must win to run the Gauntlet.
""".strip()

    copyright_notice = """# Copyright and Playtest Use

Gauntlet is an unpublished playtest project.

Copyright © 2026 Tymon Scott. All rights reserved.

Repository and release materials are provided for private review and playtesting only. They may not be copied, redistributed, sold, republished, or used to create commercial derivative works without written permission.
""".strip()

    parts = [
        front_matter,
        PART_I,
        components_chapter,
        cards_and_zones,
        setup,
        turn,
        actions,
        movement,
        battle_chapter,
        territory,
        running,
        PART_II,
        deckbuilding,
        technical_chapter,
        overlays,
        faction_intro,
        PART_IV,
        quick_turn,
        "# Quick Battle Reference\n\n" + quick_battle,
        glossary,
        copyright_notice,
    ]

    return "\n\n---\n\n".join(clean_section(part) for part in parts).rstrip() + "\n"


def validate_structure(text: str) -> None:
    required_order = (
        "# Welcome to Gauntlet",
        "# Game at a Glance",
        "# How to Win",
        PART_I,
        "# 1. Components",
        "# 2. Cards, Zones, and the Play Area",
        "# 3. Setup",
        "# 4. Your Turn",
        "# 5. Actions and Assets",
        "# 6. Movement and Position",
        "# 7. Battles",
        "# 8. Territory Control and Capture",
        "# 9. Running the Gauntlet",
        PART_II,
        "# 10. Constructing a Deck",
        "# 11. Detailed Card and Timing Rules",
        "# 12. Overlays and Other Shared Card Rules",
        PART_III,
        "# 13. Factions",
        FACTION_START,
        FACTION_END,
        PART_IV,
        "# Quick Turn Reference",
        "# Quick Battle Reference",
        "# Glossary",
        "# Copyright and Playtest Use",
    )
    positions = []
    for marker in required_order:
        position = text.find(marker)
        if position < 0:
            raise RuntimeError(f"Restructured Rulebook is missing {marker!r}")
        positions.append(position)
    if positions != sorted(positions):
        raise RuntimeError("Restructured Rulebook sections are not in teaching order")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the Rulebook still needs restructuring.")
    args = parser.parse_args()

    current = RULEBOOK.read_text(encoding="utf-8")
    generated = build_new_source(current)
    validate_structure(generated)

    if args.check:
        if generated != current:
            raise SystemExit("v0.6.1 Rulebook content structure is not current")
        print("v0.6.1 Rulebook content structure is current.")
        return 0

    if generated != current:
        RULEBOOK.write_text(generated, encoding="utf-8")
        print(f"Restructured {RULEBOOK.relative_to(ROOT)}")
    else:
        print("v0.6.1 Rulebook already uses the sequential teaching structure.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
