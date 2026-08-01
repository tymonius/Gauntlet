from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULEBOOK = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"
FIRST_GAME = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md"
INTRODUCTIONS = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md"
NEUTRAL = ROOT / "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md"
CHANGELOG = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md"
GUIDES = sorted((ROOT / "releases/v0.6.1/faction-guides").glob("**/*.md"))
PATHS = [
    ROOT / "README.md",
    RULEBOOK,
    FIRST_GAME,
    INTRODUCTIONS,
    NEUTRAL,
    ROOT / "docs/Gauntlet_v0.6.1_Territory_Pool.md",
    CHANGELOG,
    *GUIDES,
]


def replace_in(path: Path, replacements: dict[str, str]) -> None:
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    for old, new in replacements.items():
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


COMMON = {
    "An Action Opportunity is the point during a turn when a player may play one card for its Action effect or perform a rule or faction action that explicitly uses that opportunity.":
        "An Action Opportunity is the point during a turn when a player may play one card for its Action effect, perform one Faction Action, or discard one Asset they control.",
    "card's card value": "card's value",
    "its card value": "its value",
    "Financier faction action": "Financier Faction Action",
    "another Financier faction action": "another Financier Faction Action",
    "| Faction action |": "| Faction Action |",
    "after resolving required retreat": "after you retreat",
    "Stop resolving remaining Battle effects.": "Do not apply any remaining Battle effects.",
    "After resolving the Capture step and all effects that occur after it":
        "After completing the Capture step and applying all effects that occur after it",
    "an delayed Gambit effect": "a delayed Gambit effect",
    "conduct the battle effect of a card": "apply the Battle effect of a card",
    "after that Order is used": "after that Order takes effect",
    "does not apply another card's effect or another copied effect":
        "does not copy another card's effect or another copied effect",
    "apply its effect immediately after Black Covenant":
        "apply its effect immediately after applying Black Covenant",
}

for path in PATHS:
    replace_in(path, COMMON)
    if path.exists():
        text = path.read_text(encoding="utf-8")
        text = text.replace("faction action", "Faction Action")
        path.write_text(text, encoding="utf-8")

replace_in(
    RULEBOOK,
    {
        "The loser retreats, and the winner occupies or keeps the contested position.":
            "The loser retreats, and the winner takes or keeps the contested position.",
        "At the start of the turn, if the active player occupies a Territory they do not control, they capture it by rotating the Territory to face them.":
            "At the start of the turn, if the active player is the occupier of a Territory, they capture it by rotating the Territory to face them.",
        "A Territory occupied but not controlled does not increase the limit.":
            "A Territory where you are the occupier does not increase the limit.",
        "Entering an occupied position begins a battle.":
            "Entering the opponent's position begins a battle.",
        "### Entering an occupied Territory": "### Entering the opponent's position",
        "Move the attacking token into the contested Territory before the battle. Before the battle outcome is determined, the defender remains the occupant. If the attacker wins, the defender retreats and the attacker becomes the occupant.":
            "Move the attacking token into the contested position before the battle. Before the battle outcome is determined, the defender remains there. If the attacker wins, the defender retreats and the attacker takes the contested position. If that position is an opposing Territory the attacker does not control, the attacker enters Occupation.",
        "a winning attacker occupies the contested position;":
            "a winning attacker takes the contested position and enters Occupation if it is an opposing Territory they do not control;",
        "Effects that require the final occupied position occur after retreat and occupation.":
            "Effects that require the final position occur after retreat and Occupation.",
        "a defending player moves one position toward their own end, and the attacker occupies the contested position;":
            "a defending player moves one position toward their own end, and the attacker takes the contested position, entering Occupation if it is an opposing Territory they do not control;",
        "Control does not require occupation.":
            "Control does not require a Player Token to be present.",
        "When a player loses while occupying the final Territory at their end, they retreat beyond the Territory column. The winner occupies the final Territory.":
            "When a player loses while at the final Territory at their end, they retreat beyond the Territory column. The winner enters Occupation on the final Territory.",
        "If the winner still occupies the final Territory at the start of their next turn, they capture it during the Capture step.":
            "If the winner is still the occupier of the final Territory at the start of their next turn, they capture it during the Capture step.",
        "1. **Capture:** capture an opposing Territory you still occupy.":
            "1. **Capture:** capture an opposing Territory where you are still the occupier.",
        "Effects that expressly apply before other Gambit effects are applied first. After that, apply remaining Gambit effects using the shared-timing rule in Chapter 11.":
            "First apply any effects that expressly apply before other Gambit effects. Then apply the remaining Gambit effects using the shared-timing rule in Chapter 11.",
        "After selecting the die result, apply rerolls and changes to the die result in their specified order.":
            "After selecting the die result, make any rerolls and apply any changes to the die result in their specified order.",
        "Only effects not yet applied whose timing remains available can be applied.":
            "Only effects whose timing remains available and that have not yet been applied may be applied.",
        "4. conduct the battle and its Aftermath.":
            "4. continue the battle through the Aftermath.",
        "9. Apply effects at the end of the Aftermath, including follow-up movement.":
            "9. Apply end-of-Aftermath effects, including any that grant follow-up movement.",
        "A copied effect does not trigger Invocation unless the Arcane card itself applies another printed effect through being played, set, or chosen again.":
            "A copied effect does not trigger Invocation unless the Arcane card is itself played, set, or chosen again and its printed effect takes effect.",
        "This gain is outside the normal once-per-turn Conviction gain but cannot exceed 4. An Arcane card whose effect is applied only through a copied effect is not played or revealed as a Gambit or Tactic and does not trigger Blasphemy unless the effect says otherwise. Arcane is a trait, not faction allegiance.":
            "This gain is outside the normal once-per-turn Conviction gain but cannot exceed 4. Merely copying an Arcane card's effect does not count as playing or revealing that card and does not trigger Blasphemy unless the effect says otherwise. Arcane is a trait, not faction allegiance.",
    },
)

replace_in(
    FIRST_GAME,
    {
        "If you still occupy an opposing Territory from the previous turn":
            "If you are still the occupier of an opposing Territory from the previous turn",
        "the attacker occupies that Territory;": "the attacker enters Occupation on that Territory;",
        "the defender gets their next turn to counterattack.":
            "the controller gets their next turn to initiate a Counterattack.",
        "If the attacker still occupies the Territory": "If the attacker is still the occupier of the Territory",
        "a winning attacker occupies the contested position;":
            "a winning attacker takes the contested position and enters Occupation if it is an opposing Territory they do not control;",
        "remain there through the opponent's counterattack opportunity;":
            "remain there through the opponent's Counterattack opportunity;",
        "Establish the attacker, defender, and contested position. apply effects such as Terms.":
            "Establish the attacker, defender, and contested position. Apply effects such as Terms.",
    },
)

replace_in(
    NEUTRAL,
    {
        "while occupying a Territory you do not control": "while you are the occupier of a Territory",
        "If you are defending a Territory you occupy but do not control":
            "If you are defending while you are the occupier of the contested Territory",
        "While the opponent occupies a Territory you control without controlling it":
            "While the opponent is the occupier of a Territory you control",
        "If you are counterattacking an opponent occupying a Territory you control":
            "If this battle is a Counterattack",
        "After you win a counterattack against an opponent occupying a Territory you control":
            "After you win a Counterattack",
        "if they still occupy it": "if they are still the occupier",
        "capture that Territory instead of occupying it":
            "capture that Territory instead of entering Occupation",
    },
)

replace_in(
    INTRODUCTIONS,
    {
        "After winning as the attacker and occupying an enemy Territory":
            "After winning as the attacker and entering Occupation on an enemy Territory",
    },
)

for path in GUIDES:
    replace_in(
        path,
        {
            "remains in or occupies the contested position": "remains at or takes the contested position",
            "You remain in or occupy the contested position": "You remain at or take the contested position",
            "defending a counterattack on a Territory you occupy that the opponent controlled immediately before you occupied it":
                "defending a Counterattack while you are the occupier of a Territory the opponent controlled immediately before you entered Occupation",
            "Deed ownership is independent of who occupies or controls the Territory":
                "Deed ownership is independent of token position and Territory control",
            "Deed ownership is independent of Territory occupation and control":
                "Deed ownership is independent of token position and Territory control",
            "You occupy it but do not control it": "You are the occupier",
            "You neither control nor occupy it": "You neither control it nor are its occupier",
            "now occupy that enemy Territory": "are now the occupier of that enemy Territory",
            "Treat the Territory as occupied but not controlled for the cost calculation":
                "Treat yourself as the occupier, but not the controller, for the cost calculation",
            "control, occupation, capture": "control, Occupation, capture",
            "caused you to occupy a Territory": "caused you to enter Occupation on a Territory",
            "if you still occupy or control that Territory":
                "if you are still the occupier or now control that Territory",
            "A copied effect does not trigger Invocation unless the Arcane card itself applies another printed effect through being played, set, or chosen again.":
                "A copied effect does not trigger Invocation unless the Arcane card is itself played, set, or chosen again and its printed effect takes effect.",
            "This gain is outside the normal once-per-turn Conviction gain but cannot exceed 4. An Arcane card whose effect is applied only through a copied effect is not played or revealed as a Gambit or Tactic and does not trigger Blasphemy unless the effect says otherwise. Arcane is a trait, not faction allegiance.":
                "This gain is outside the normal once-per-turn Conviction gain but cannot exceed 4. Merely copying an Arcane card's effect does not count as playing or revealing that card and does not trigger Blasphemy unless the effect says otherwise. Arcane is a trait, not faction allegiance.",
        },
    )

replace_in(
    CHANGELOG,
    {
        "Battles now resolve in this order:": "Battles now proceed in this order:",
        "7. resolve the battle; and": "7. determine the outcome; and",
        "8. resolve the Aftermath of the battle.": "8. proceed to the Aftermath.",
        "Effects that expressly resolve before other effects at that stage resolve first.":
            "Effects that expressly apply before other effects at that stage are applied first.",
        "Added attacker-first alternating resolution": "Added attacker-first alternating application",
        "simultaneous resolution": "effects being applied simultaneously",
        "effects cannot be negated after they resolve": "effects cannot be negated after they take effect",
        "using faction abilities, and resolving effects": "using Faction Abilities, and applying effects",
        "Terms now resolve during opening effects": "Terms now conclude during opening effects",
    },
)

text = CHANGELOG.read_text(encoding="utf-8")
bullet = (
    "- **Terminology refinement:** Distinguished Position from Occupation; defined Occupier and Counterattack; "
    "renamed deckbuilding value to card value; defined Faction Ability and Faction Action; renamed the battle "
    "step Determine the Outcome; and replaced overloaded uses of ‘resolve’ with operation-specific language.\n"
)
anchor = "## Post-release playtest changes\n\n"
if bullet not in text:
    text = text.replace(anchor, anchor + bullet + "\n", 1)
CHANGELOG.write_text(text, encoding="utf-8")

# Audits.
rulebook_text = RULEBOOK.read_text(encoding="utf-8")
required = [
    "A **position** is any space where a Player Token may be placed:",
    "**Occupation** is the state in which a player's token is on an opposing Territory",
    "A **Counterattack** is a battle initiated by the controller of a Territory",
    "A **Faction Ability** is any special rule granted by a faction.",
    "A **Faction Action** is a Faction Ability that explicitly uses an Action Opportunity.",
    "### 7. Determine the Outcome",
    "During the Aftermath, follow these steps in order:",
    "no more than **60 total card value**",
]
missing = [item for item in required if item not in rulebook_text]
if missing:
    raise SystemExit(f"Missing agreed terminology: {missing}")

resolve_pattern = re.compile(r"\bresolve(?:s|d)?\b|\bresolving\b|\bresolution\b", re.I)
leftovers: list[str] = []
for path in PATHS:
    if not path.exists():
        continue
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        audit_line = line.replace("Nonbinding Resolution", "")
        if resolve_pattern.search(audit_line):
            leftovers.append(f"{path.relative_to(ROOT)}:{number}: {line}")
if leftovers:
    raise SystemExit("Remaining overloaded resolve terminology:\n" + "\n".join(leftovers[:200]))

forbidden = [
    "card's card value",
    "its card value",
    "an delayed",
    ". apply effects",
    "conduct the battle effect",
    "faction action",
    "Faction action",
]
issues: list[str] = []
for path in PATHS:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for phrase in forbidden:
        if phrase in text:
            issues.append(f"{path.relative_to(ROOT)}: {phrase}")
if issues:
    raise SystemExit("Mechanical wording artifacts remain:\n" + "\n".join(issues))
