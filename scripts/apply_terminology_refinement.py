from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULEBOOK = ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"

CURRENT_TEXT_TARGETS = [
    ROOT / "README.md",
    RULEBOOK,
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    ROOT / "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
    ROOT / "docs/Gauntlet_v0.6.1_Territory_Pool.md",
]
CURRENT_TEXT_TARGETS.extend(sorted((ROOT / "releases/v0.6.1/faction-guides").glob("**/*.md")))


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one occurrence, found {count}")
    return text.replace(old, new, 1)


def replace_all_current_value_terms() -> None:
    for path in CURRENT_TEXT_TARGETS:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        text = text.replace("deckbuilding values", "card values")
        text = text.replace("deckbuilding value", "card value")
        text = text.replace("Deckbuilding Value", "Card Value")
        path.write_text(text, encoding="utf-8")


def refine_rulebook_structure() -> None:
    text = RULEBOOK.read_text(encoding="utf-8")

    text = text.replace(
        "A Player Token shows the position that player occupies. Occupation and control are related but are not the same; Chapter 8 explains how control changes.",
        "A Player Token shows the player's position. Occupation and control are related but are not the same; Chapter 8 explains how control changes.",
    )

    text = replace_once(
        text,
        "A **position** is any location a Player Token may occupy:\n",
        "A **position** is any space where a Player Token may be placed:\n",
        "Position definition",
    )

    text = replace_once(
        text,
        "During an Action Opportunity, the player may:\n\n- play one card for its Action effect; or\n- perform one rule or faction action that explicitly uses an Action Opportunity.\n",
        "During an Action Opportunity, the player may:\n\n- play one card for its Action effect;\n- perform one available **Faction Action**; or\n- discard one Asset they control.\n",
        "Action Opportunity options",
    )

    text = text.replace(
        "During your Action Opportunity, play one card for its Action effect or use a faction action.",
        "During your Action Opportunity, play one card for its Action effect, perform a Faction Action, or discard one Asset you control.",
    )

    text = replace_once(
        text,
        "## How Factions Work\n\nEach Deck belongs to one faction and uses one of that faction's two Leaders. The faction determines which faction cards may be included, which supplemental components are prepared, which public resources or progress are tracked, and which faction-specific actions and procedures are available.\n",
        "## How Factions Work\n\nEach Deck belongs to one faction and uses one of that faction's two Leaders. The faction determines which faction cards may be included, which supplemental components are prepared, which public resources or progress are tracked, and which faction-specific actions and procedures are available.\n\nA **Faction Ability** is any special rule granted by a faction. A Faction Ability may be passive, triggered, or actively used. A **Faction Action** is a Faction Ability that explicitly uses an Action Opportunity.\n",
        "Faction terminology",
    )

    text = replace_once(
        text,
        "Resolve each battle in this order:\n\n1. Resolve opening effects.\n2. Set Gambits.\n3. Set Hands aside and form Reserves.\n4. Reveal Gambits.\n5. Choose Tactics.\n6. Reveal Tactics.\n7. Resolve the battle.\n8. Resolve the Aftermath of the battle.\n",
        "Conduct each battle in this order:\n\n1. Apply opening effects.\n2. Set Gambits.\n3. Set Hands aside and form Reserves.\n4. Reveal Gambits.\n5. Choose Tactics.\n6. Reveal Tactics.\n7. Determine the Outcome.\n8. Proceed to the Aftermath.\n",
        "Battle sequence",
    )

    text = text.replace("### 7. Resolve the battle", "### 7. Determine the Outcome")

    old_occupation = """### Occupation

A player normally occupies the position containing their token. During an unresolved attack, the defender remains the occupant until the result is resolved.

A player may occupy a Territory controlled by the opponent.

### Capture

At the start of a player's turn, if they occupy a Territory they do not control, they capture it by rotating the Territory to face them.

A captured Territory remains under that player's control until the opponent captures it or an effect changes control.

### Counterattack window

Because ordinary capture occurs at the start of the occupying player's next turn, the current controller normally receives one turn to drive the occupier away.
"""
    new_occupation = """### Occupation

**Occupation** is the state in which a player's token is on an opposing Territory that player does not control. A player in Occupation is the **occupier**.

During a battle initiated by entry into an occupied Territory, the defender remains in that position until the outcome is determined. If the attacker wins, the attacker becomes the occupier when the defender retreats.

### Capture

At the start of a player's turn, if they are the occupier of a Territory, they capture it by rotating the Territory to face them.

A captured Territory remains under that player's control until the opponent captures it or an effect changes control.

### Counterattack

A **Counterattack** is a battle initiated by the controller of a Territory against an opponent who is the occupier of that Territory.

Because ordinary capture occurs at the start of the occupier's next turn, the controller normally receives one turn to initiate a Counterattack and drive the occupier away.
"""
    text = replace_once(text, old_occupation, new_occupation, "Occupation and Counterattack rules")

    text = text.replace(
        "Winning an attack does not capture a Territory immediately. The attacker must remain there through the opponent's turn and capture it at the start of their next turn. This creates a counterattack window and makes control change through sustained pressure rather than one die roll.",
        "Winning an attack does not capture a Territory immediately. The attacker enters Occupation and must remain there through the opponent's turn to capture it at the start of their next turn. This gives the controller an opportunity to Counterattack and makes control change through sustained pressure rather than one die roll.",
    )

    glossary_anchor = "**Action Opportunity:** The normal opportunity to play one Action card or perform a rule or faction action that explicitly uses it.\n"
    glossary_replacement = """**Action Opportunity:** The normal opportunity to play one Action card, perform one Faction Action, or discard one Asset.

**Faction Ability:** Any special rule granted by a faction. It may be passive, triggered, or actively used.

**Faction Action:** A Faction Ability that explicitly uses an Action Opportunity.
"""
    text = replace_once(text, glossary_anchor, glossary_replacement, "Action/Faction glossary")

    occupation_glossary_anchor = "**Occupation:** The position currently held by a Player Token. Occupation and control are separate.\n"
    occupation_glossary_replacement = """**Occupation:** The state in which a player's token is on an opposing Territory that player does not control.

**Occupier:** A player in Occupation.
"""
    text = replace_once(text, occupation_glossary_anchor, occupation_glossary_replacement, "Occupation glossary")

    counterattack_anchor = "**Control:** The player a Territory faces controls it.\n"
    text = replace_once(
        text,
        counterattack_anchor,
        counterattack_anchor + "\n**Counterattack:** A battle initiated by the controller of a Territory against the occupier of that Territory.\n",
        "Counterattack glossary",
    )

    position_glossary_old = "**Position:** A Territory or off-board location a Player Token may occupy.\n"
    position_glossary_new = "**Position:** A Territory or off-board space where a Player Token may be placed.\n"
    text = replace_once(text, position_glossary_old, position_glossary_new, "Position glossary")

    RULEBOOK.write_text(text, encoding="utf-8")


def remove_resolve_language(path: Path) -> None:
    text = path.read_text(encoding="utf-8")

    exact = {
        "use Complete rules to resolve precise questions": "use Complete rules to answer precise questions",
        "Resolve instructions in the order written": "Follow instructions in the order written",
        "resolve instructions in the order written": "follow instructions in the order written",
        "determines which effect resolves": "determines which effect applies",
        "does not resolve immediately": "does not take effect immediately",
        "resolve at their normal reveal stages": "take effect at their normal reveal stages",
        "resolves at its normal reveal stage": "takes effect at its normal reveal stage",
        "Resolve any battle immediately": "Conduct any battle immediately",
        "Resolve effects and victory checks": "Apply effects and check victory conditions",
        "Resolve end-of-turn effects": "Apply end-of-turn effects",
        "resolve the Action effect": "apply the Action effect",
        "resolve it one position at a time": "move one position at a time",
        "During the unresolved battle": "Before the battle outcome is determined",
        "First resolve effects": "First apply effects",
        "resolve the card effects": "apply the card effects",
        "Resolve effects that occur": "Apply effects that occur",
        "Effects that expressly resolve before other Gambit effects resolve first": "Effects that expressly apply before other Gambit effects are applied first",
        "resolve remaining Gambit effects": "apply remaining Gambit effects",
        "resolves at this stage": "takes effect at this stage",
        "Resolve their effects": "Apply their effects",
        "Resolve all effects": "Apply all effects",
        "resolve rerolls and changes": "apply rerolls and changes",
        "If a tie is not resolved by Defender's Advantage or another effect": "If Defender's Advantage or another effect does not break the tie",
        "After the dice determine a winner, resolve the consequences of the battle": "After the dice determine a winner, proceed to the Aftermath",
        "Resolve the Aftermath in this order": "During the Aftermath, follow these steps in order",
        "resolve immediate result triggers": "apply immediate result triggers",
        "Resolve normal retreat and occupation": "Carry out normal retreat and Occupation",
        "Resolve additional retreats and final-position effects": "Carry out additional retreats and apply final-position effects",
        "Resolve other Aftermath effects": "Apply other Aftermath effects",
        "Resolve effects triggered by those destinations": "Apply effects triggered by those destinations",
        "Resolve effects at the end of the Aftermath": "Apply effects at the end of the Aftermath",
        "Additional retreats resolve one position at a time": "Carry out additional retreats one position at a time",
        "Do not resolve remaining Battle effects": "Do not apply remaining Battle effects",
        "Resolve withdrawal movement": "Carry out withdrawal movement",
        "Resolve any remaining instructions": "Follow any remaining instructions",
        "An effect resolves only at its stated timing": "An effect applies only at its stated timing",
        "resolve early": "take effect early",
        "after it has resolved": "after it has taken effect",
        "effects resolve at the same time": "effects would apply at the same time",
        "the attacker resolves one effect": "the attacker applies one effect",
        "the defender resolves one effect": "the defender applies one effect",
        "Simultaneous reveal does not mean simultaneous resolution": "Simultaneous reveal does not mean effects are applied simultaneously",
        "resolve only effects whose timing remains available": "apply only effects whose timing remains available",
        "Only unresolved effects whose timing remains available can resolve": "Only effects not yet applied whose timing remains available can be applied",
        "after it resolves": "after it takes effect",
        "When instructed to resolve another card's printed effect": "When instructed to apply another card's printed effect",
        "the player resolving it": "the player applying it",
        "whose text is being resolved": "whose text is being applied",
        "resolve only the specified effect": "apply only the specified effect",
        "resolves another effect": "applies another effect",
        "until the Terms resolve": "until the Terms conclude",
        "When the Terms resolve": "When the Terms conclude",
        "when the Terms resolve": "when the Terms conclude",
        "resolve the Proposal's **Accepted** effect": "apply the Proposal's **Accepted** effect",
        "resolve the Proposal's **Refused** effect": "apply the Proposal's **Refused** effect",
        "resolve the Refused effect": "apply the Refused effect",
        "resolve the Accepted effect": "apply the Accepted effect",
        "resolve card destinations": "move cards to their destinations",
        "resolving card destinations": "moving cards to their destinations",
        "after resolving card destinations": "after moving cards to their destinations",
        "resolve one purchase fully": "complete one purchase fully",
        "resolve the purchase": "complete the purchase",
        "purchase resolves": "purchase is completed",
        "resolves the purchase": "completes the purchase",
        "resolve a Purge": "perform a Purge",
        "resolving a Purge": "performing a Purge",
        "resolve the Purge": "perform the Purge",
        "resolve an Order": "use an Order",
        "resolving an Order": "using an Order",
        "resolve the Order": "use the Order",
        "resolve a Rite": "complete a Rite",
        "resolving a Rite": "completing a Rite",
        "resolve the Rite": "complete the Rite",
        "resolve a Mission": "complete a Mission",
        "resolving a Mission": "completing a Mission",
        "resolve the Mission": "complete the Mission",
    }
    for old, new in exact.items():
        text = text.replace(old, new)

    text = re.sub(r"\bresolve effects\b", "apply effects", text, flags=re.IGNORECASE)
    text = re.sub(r"\bresolve an effect\b", "apply an effect", text, flags=re.IGNORECASE)
    text = re.sub(r"\bresolve the effect\b", "apply the effect", text, flags=re.IGNORECASE)
    text = re.sub(r"\bresolve this effect\b", "apply this effect", text, flags=re.IGNORECASE)
    text = re.sub(r"\beffect resolves\b", "effect applies", text, flags=re.IGNORECASE)
    text = re.sub(r"\beffects resolve\b", "effects apply", text, flags=re.IGNORECASE)
    text = re.sub(r"\beffect has resolved\b", "effect has taken effect", text, flags=re.IGNORECASE)
    text = re.sub(r"\beffects have resolved\b", "effects have taken effect", text, flags=re.IGNORECASE)
    text = re.sub(r"\bunresolved effects\b", "effects not yet applied", text, flags=re.IGNORECASE)
    text = re.sub(r"\bresolution of (an?|the) effect\b", r"application of \1 effect", text, flags=re.IGNORECASE)

    text = re.sub(r"\bresolve (?:a|the|this|that|each) battle\b", "conduct the battle", text, flags=re.IGNORECASE)
    text = re.sub(r"\bbattle resolves\b", "battle ends", text, flags=re.IGNORECASE)
    text = re.sub(r"\bbattle has resolved\b", "battle has ended", text, flags=re.IGNORECASE)
    text = re.sub(r"\bfully resolved battle\b", "completed battle", text, flags=re.IGNORECASE)
    text = re.sub(r"\bresolve (?:a|the) tie\b", "break the tie", text, flags=re.IGNORECASE)
    text = re.sub(r"\btie is resolved\b", "tie is broken", text, flags=re.IGNORECASE)

    path.write_text(text, encoding="utf-8")


def validate() -> None:
    rulebook = RULEBOOK.read_text(encoding="utf-8")
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
    missing = [item for item in required if item not in rulebook]
    if missing:
        raise RuntimeError(f"Required terminology missing: {missing}")

    leftovers: list[str] = []
    for path in CURRENT_TEXT_TARGETS:
        if not path.exists():
            continue
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if re.search(r"\bresolve(?:s|d|ing)?\b|\bresolution\b", line, flags=re.IGNORECASE):
                leftovers.append(f"{path.relative_to(ROOT)}:{number}: {line}")
    if leftovers:
        raise RuntimeError("Unreworded resolve terminology remains:\n" + "\n".join(leftovers[:200]))

    stale_value: list[str] = []
    for path in CURRENT_TEXT_TARGETS:
        if path.exists() and re.search(r"deckbuilding value", path.read_text(encoding="utf-8"), flags=re.IGNORECASE):
            stale_value.append(str(path.relative_to(ROOT)))
    if stale_value:
        raise RuntimeError(f"Stale deckbuilding value terminology remains in {stale_value}")


def main() -> None:
    replace_all_current_value_terms()
    refine_rulebook_structure()
    for path in CURRENT_TEXT_TARGETS:
        if path.exists():
            remove_resolve_language(path)
    validate()


if __name__ == "__main__":
    main()
