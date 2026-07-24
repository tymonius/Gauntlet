#!/usr/bin/env python3
from pathlib import Path

path = Path("releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        "Victory belongs to the player who successfully runs the Gauntlet. To do so, advance through a contested line of Territories, overcome the opponent's defenses, and force them to make a Last Stand beyond the end of the Gauntlet. Win the resulting battle to run the Gauntlet. Along the way, capture Territories, develop Assets, employ faction mechanics, and decide when valuable cards are worth committing permanently to battle.",
        "Victory belongs to the player who runs the Gauntlet: cross the Territories, overcome the opponent's defenses, force them to make a Last Stand beyond the Gauntlet, and win the resulting battle. Along the way, capture Territories, develop Assets, employ faction mechanics, and decide when valuable cards are worth committing permanently to battle.",
    ),
    (
        "To run the Gauntlet, advance through the full Territory column, force the opponent beyond their end of the Gauntlet, capture the final Territory, force the opponent to make a Last Stand, and win the resulting battle.",
        "To run the Gauntlet, cross the Territory column, force the opponent beyond it, capture their final Territory, then force them to make a Last Stand and win the resulting battle.",
    ),
    (
        "When a player advances beyond the final Territory to battle an opponent who has been forced beyond their end of the Gauntlet, the defending player makes a **Last Stand**.",
        "When a player advances beyond the final Territory to battle the opponent beyond the Gauntlet, the defender makes a **Last Stand**.",
    ),
    (
        "**Last Stand:** The defender's response when an opponent advances beyond the final Territory after forcing them beyond the Territory column. This begins a Last Stand battle.",
        "**Last Stand:** The defender's response when an opponent advances beyond their captured final Territory. It begins a Last Stand battle.",
    ),
    (
        "**Run the Gauntlet:** Advance through the Territory column, capture the opponent's final Territory, force the opponent to make a Last Stand, and win the resulting battle.",
        "**Run the Gauntlet:** Capture the opponent's final Territory, force them to make a Last Stand, and win the resulting battle.",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one occurrence: {old!r}; found {count}")
    text = text.replace(old, new)

path.write_text(text, encoding="utf-8")
print(f"Compacted {path}")
