#!/usr/bin/env python3
from pathlib import Path

REPLACEMENTS = {
    "README.md": [
        (
            "To run the Gauntlet, a player must defeat the opponent on their final Territory, occupy and capture it, advance beyond the Territory column, and win the opponent's Last Stand.",
            "To run the Gauntlet, a player must defeat the opponent on their final Territory, occupy and capture it, advance beyond the Territory column, force the opponent to make a Last Stand, and win the resulting battle.",
        ),
    ],
    "docs/Gauntlet_Design_Principles_and_Guardrails.md": [
        (
            "- defeating the opponent in their Last Stand.",
            "- forcing the opponent to make a Last Stand and winning the resulting battle.",
        ),
    ],
    "docs/Gauntlet_Playtest_Targets_and_Metrics.md": [
        (
            "5. Last Stands won by attacker and defender.",
            "5. Last Stand battles won by the attacker and defender.",
        ),
    ],
    "docs/Gauntlet_v0.6_Digital_Migration_Audit.md": [
        (
            "Generalize location beyond Territory spaces, especially Last Stand",
            "Generalize location beyond Territory spaces, especially Last Stand battles",
        ),
        (
            "Defender wins ties only when defending a Territory they control, and during Last Stand",
            "Defender wins ties only when defending a Territory they control or during a Last Stand battle",
        ),
        (
            "Defender has Defender's Advantage and +1 during Last Stand",
            "The defender has Defender's Advantage and +1 during a Last Stand battle",
        ),
        (
            "Force opponent beyond final Territory, capture final Territory, advance beyond column, then win Last Stand",
            "Force the opponent beyond the final Territory, capture it, advance beyond the column, force the opponent to make a Last Stand, then win the resulting battle",
        ),
        (
            "| Last Stand | Add | Not modeled | Separate battle beyond Gauntlet after final Territory is captured; defender +1 and wins ties; defender victory sends attacker back to final Territory | Add explicit Last Stand initiation, battle context, outcome, and retry loop |",
            "| Last Stand | Add | Not modeled | After the final Territory is captured, advancing beyond the Gauntlet forces the opponent to make a Last Stand; in the resulting battle, the defender gains +1 and wins ties; a defender victory sends the attacker back to the final Territory | Add an explicit Last Stand battle context, outcome, and retry loop |",
        ),
        (
            "Standard Last Stand victory plus faction additional victory conditions",
            "Standard victory through a Last Stand battle plus faction additional victory conditions",
        ),
        (
            "Victory requires forcing the opponent beyond the Gauntlet, capturing the final Territory, advancing beyond it, and winning Last Stand.",
            "Victory requires forcing the opponent beyond the Gauntlet, capturing the final Territory, advancing beyond it, forcing the opponent to make a Last Stand, and winning the resulting battle.",
        ),
        (
            "Defender's Advantage depends on control of the contested Territory or Last Stand context.",
            "Defender's Advantage depends on control of the contested Territory or a Last Stand battle context.",
        ),
        (
            "- Implement Last Stand initiation, +1, tie rule, outcomes, and repeat attempts.",
            "- Implement the transition into a Last Stand battle, its +1 and tie rules, its outcomes, and repeat attempts.",
        ),
        (
            "canonical Last Stand route.",
            "canonical Last Stand battle route.",
        ),
        (
            "final-Territory and Last Stand state.",
            "final-Territory and Last Stand battle state.",
        ),
        (
            "- the final Territory must be captured before Last Stand can be initiated;",
            "- the final Territory must be captured before the opponent can be forced to make a Last Stand;",
        ),
        (
            "- Last Stand grants the defender Defender's Advantage and +1;",
            "- during a Last Stand battle, the defender has Defender's Advantage and +1;",
        ),
        (
            "- an attacking Last Stand win ends the game;",
            "- an attacker victory in a Last Stand battle ends the game;",
        ),
        (
            "- a defending Last Stand win returns the attacker to the final Territory and play continues;",
            "- a defender victory in a Last Stand battle returns the attacker to the final Territory and play continues;",
        ),
    ],
    "index.html": [
        (
            "Build a faction Deck, form the battlefield from your Territories, and fight through the opponent's line before defeating them in their Last Stand.",
            "Build a faction Deck, form the battlefield from your Territories, and fight through the opponent's line before forcing them to make a Last Stand and winning the resulting battle.",
        ),
        (
            "<p>Capture the opponent's final Territory, advance beyond the column, and win their Last Stand.</p>",
            "<p>Capture the opponent's final Territory, advance beyond the column, force the opponent to make a Last Stand, and win the resulting battle.</p>",
        ),
    ],
    "releases/v0.6.0/Gauntlet_v0.6.0_Changelog.md": [
        (
            "- Retained the established final-battle sequence under the name Last Stand.",
            "- Retained the established battle beyond the Gauntlet under the name Last Stand.",
        ),
        (
            "- Clarified that winning on the final Territory does not immediately begin the Last Stand.",
            "- Clarified that winning on the final Territory does not immediately force the opponent to make a Last Stand.",
        ),
        (
            "- Defender's Advantage remains the tie rule; the Last Stand's +1 is a separate bonus.",
            "- Defender's Advantage remains the tie rule; the +1 granted during a Last Stand battle is a separate bonus.",
        ),
    ],
    "releases/v0.6.0/Gauntlet_v0.6.0_Release_Notes.md": [
        (
            "3. advance beyond the Territory column; and",
            "3. advance beyond the Territory column, forcing the opponent to make a Last Stand; and",
        ),
        (
            "4. defeat the opponent in their Last Stand.",
            "4. win the resulting battle.",
        ),
        (
            "During a Last Stand, the defender has Defender's Advantage and adds +1 to their battle total.",
            "During a Last Stand battle, the defender has Defender's Advantage and adds +1 to their battle total.",
        ),
    ],
    "releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md": [
        (
            "Victory belongs to the player who successfully runs the Gauntlet. To do so, advance through a contested line of Territories, overcome the opponent's defenses, and defeat them in a final Last Stand beyond the end of the Gauntlet. Along the way, capture Territories, develop Assets, employ faction mechanics, and decide when valuable cards are worth committing permanently to battle.",
            "Victory belongs to the player who successfully runs the Gauntlet. To do so, advance through a contested line of Territories, overcome the opponent's defenses, and force them to make a Last Stand beyond the end of the Gauntlet. Win the resulting battle to run the Gauntlet. Along the way, capture Territories, develop Assets, employ faction mechanics, and decide when valuable cards are worth committing permanently to battle.",
        ),
        (
            "The defending player also has Defender's Advantage during their Last Stand.",
            "The defending player also has Defender's Advantage during a Last Stand battle.",
        ),
        (
            "To run the Gauntlet, advance through the full Territory column, force the opponent beyond their end of the Gauntlet, capture the final Territory, and win the opponent's Last Stand.",
            "To run the Gauntlet, advance through the full Territory column, force the opponent beyond their end of the Gauntlet, capture the final Territory, force the opponent to make a Last Stand, and win the resulting battle.",
        ),
        (
            "During that turn's Movement step, they may advance beyond the final Territory to initiate the opponent's Last Stand.",
            "During that turn's Movement step, they may advance beyond the final Territory, forcing the opponent to make a Last Stand.",
        ),
        (
            "When a player advances beyond the final Territory to battle an opponent who has been forced beyond their end of the Gauntlet, that battle is the defending player's **Last Stand**.",
            "When a player advances beyond the final Territory to battle an opponent who has been forced beyond their end of the Gauntlet, the defending player makes a **Last Stand**.",
        ),
        (
            "During a Last Stand:",
            "During this battle:",
        ),
        (
            "If the attacking player wins the Last Stand, they have run the Gauntlet and immediately win the game.",
            "If the attacking player wins the battle, they have run the Gauntlet and immediately win the game.",
        ),
        (
            "**Defender's Advantage:** The defending player wins a tied battle total when they control the contested Territory or are defending during their Last Stand.",
            "**Defender's Advantage:** The defending player wins a tied battle total when they control the contested Territory or are defending during a Last Stand battle.",
        ),
        (
            "**Last Stand:** The battle fought beyond a player's end of the Gauntlet after that player has been forced beyond the Territory column.",
            "**Last Stand:** The defender's response when an opponent advances beyond the final Territory after forcing them beyond the Territory column. This begins a Last Stand battle.",
        ),
        (
            "**Run the Gauntlet:** Advance through the Territory column, capture the opponent's final Territory, and win the opponent's Last Stand.",
            "**Run the Gauntlet:** Advance through the Territory column, capture the opponent's final Territory, force the opponent to make a Last Stand, and win the resulting battle.",
        ),
        (
            "4. Advance beyond it to initiate the opponent's Last Stand.",
            "4. Advance beyond it; the opponent makes a Last Stand.",
        ),
        (
            "5. The defender has Defender's Advantage and +1.",
            "5. During this battle, the defender has Defender's Advantage and +1.",
        ),
        (
            "6. Win the Last Stand to run the Gauntlet and win the game.",
            "6. Win the battle to run the Gauntlet and win the game.",
        ),
    ],
    "releases/v0.6.0/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md": [
        (
            "Effects that require a Territory do not apply during a Last Stand beyond the Gauntlet.",
            "Effects that require a Territory do not apply during a Last Stand battle beyond the Gauntlet.",
        ),
        (
            "- Territory-only effects do not apply during a Last Stand beyond the Gauntlet.",
            "- Territory-only effects do not apply during a Last Stand battle beyond the Gauntlet.",
        ),
    ],
    "scripts/build-v0.6.0-release.mjs": [
        (
            "'4. Advance beyond it to initiate the opponent’s Last Stand.',",
            "'4. Advance beyond it; the opponent makes a Last Stand.',",
        ),
        (
            "'5. The defender has Defender’s Advantage and +1.',",
            "'5. During this battle, the defender has Defender’s Advantage and +1.',",
        ),
        (
            "'6. Win the Last Stand to run the Gauntlet and win.', '',",
            "'6. Win the battle to run the Gauntlet and win.', '',",
        ),
        (
            "victory: 'Capture the opponent’s final Territory, advance beyond it, and win the opponent’s Last Stand.',",
            "victory: 'Capture the opponent’s final Territory, advance beyond it, force the opponent to make a Last Stand, and win the resulting battle.',",
        ),
        (
            "defender_advantage: 'The defending player wins tied battle totals when defending a Territory they control or during their Last Stand.'",
            "defender_advantage: 'The defending player wins tied battle totals when defending a Territory they control or during a Last Stand battle.'",
        ),
    ],
    "src/state/apply.ts": [
        (
            "A player advances beyond the Gauntlet only to initiate the opponent’s Last Stand.",
            "A player advances beyond the Gauntlet only to force the opponent to make a Last Stand.",
        ),
        (
            "The final Territory must be captured before initiating the opponent’s Last Stand.",
            "The final Territory must be captured before the opponent can be forced to make a Last Stand.",
        ),
        (
            "${game.players[winner].name} won ${game.players[defeatedPlayer].name}’s Last Stand and ran the Gauntlet.",
            "${game.players[winner].name} defeated ${game.players[defeatedPlayer].name} in a Last Stand battle and ran the Gauntlet.",
        ),
    ],
    "src/state/v06-last-stand.test.ts": [
        (
            "ends the game only when the attacker wins the opponent’s Last Stand",
            "ends the game only when the attacker wins a Last Stand battle",
        ),
    ],
}

changed = []
for filename, replacements in REPLACEMENTS.items():
    path = Path(filename)
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in replacements:
        count = text.count(old)
        if count != 1:
            raise SystemExit(f"Expected exactly one occurrence in {filename}: {old!r}; found {count}")
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        changed.append(filename)

print("Updated files:")
for filename in changed:
    print(f"- {filename}")
