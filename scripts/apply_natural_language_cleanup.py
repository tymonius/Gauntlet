from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, replacements: dict[str, str]) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    missing: list[str] = []
    for old, new in replacements.items():
        if old not in text:
            missing.append(old)
        text = text.replace(old, new)
    if missing:
        raise SystemExit(
            f"Missing expected text in {path}:\n" + "\n---\n".join(missing)
        )
    target.write_text(text, encoding="utf-8")


replace(
    "README.md",
    {
        "They then advance, fight battles, enter Occupation on enemy-controlled Territories, survive Counterattacks, capture ground, and attempt to run the Gauntlet.":
            "They then advance, fight battles, become occupiers of enemy-controlled Territories, survive Counterattacks, capture ground, and attempt to run the Gauntlet.",
        "To run the Gauntlet, a player must defeat the opponent on their final Territory, enter Occupation there and capture it, advance beyond the Territory column, force the opponent to make a Last Stand, and win the resulting battle.":
            "To run the Gauntlet, a player must defeat the opponent on their final Territory, become its occupier and capture it, advance beyond the Territory column, force the opponent to make a Last Stand, and win the resulting battle.",
    },
)

replace(
    "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
    {
        "Winning an attack does not capture a Territory immediately. The attacker enters Occupation and must remain there through the opponent's turn to capture it at the start of their next turn.":
            "Winning an attack does not capture a Territory immediately. The attacker becomes the occupier and must remain there through the opponent's turn to capture it at the start of their next turn.",
        "Playing or using one printed effect does not activate the card's other printed effects unless a rule says otherwise.":
            "Only the printed effect being used applies unless a rule says otherwise.",
        "Setting a Gambit or choosing a Tactic places the card in battle. It does not take effect immediately. Gambits and Tactics take effect at their normal reveal stages even when an effect causes them to become face up early, unless that effect says otherwise.":
            "Setting a Gambit or choosing a Tactic places the card in battle without applying its effect immediately. Gambit and Tactic effects apply at their normal reveal stages even when an effect causes the card to become face up early, unless that effect says otherwise.",
        "An Action Opportunity is the point during a turn when a player may play one card for its Action effect, perform one Faction Action, or discard one Asset they control.":
            "An Action Opportunity is the point during a turn when a player may play one card for its Action effect, use one Faction Action, or discard one Asset they control.",
        "- perform one available **Faction Action**; or":
            "- use one available **Faction Action**; or",
        "During your Action Opportunity, play one card for its Action effect, perform a Faction Action, or discard one Asset you control.":
            "During your Action Opportunity, play one card for its Action effect, use a Faction Action, or discard one Asset you control.",
        "4. put it in the Discard Pile unless it becomes an Asset, becomes an Overlay attached to a Territory, or specifies another destination.":
            "4. put it in the Discard Pile unless it becomes an Asset, becomes an Overlay attached to a Territory, or its effect tells you to put it elsewhere.",
        "- An inactive Asset still counts unless a rule says otherwise.":
            "- Every banked Asset counts toward the limit unless a rule says otherwise.",
        "### Activating and discarding Assets":
            "### Using and discarding Assets",
        "Use **activate** when using an Asset's printed ability. If the effect requires the Asset to be discarded, put it in its owner's Discard Pile unless stated otherwise.":
            "Using an Asset does not use an Action Opportunity unless expressly stated otherwise. If using it requires the Asset to be discarded, put it in its owner's Discard Pile unless stated otherwise.",
        "If that position is an opposing Territory the attacker does not control, the attacker enters Occupation.":
            "If that position is an opposing Territory the attacker does not control, the attacker becomes its occupier.",
        "Then battle cards go to their normal destinations.":
            "Then clear the battle cards as described below.",
        "4. Carry out normal retreat and Occupation, including replacements.":
            "4. Carry out normal retreat and determine whether the winner becomes the occupier, including replacements.",
        "7. Move battle cards to their destinations.":
            "7. Clear the battle cards.",
        "8. Apply effects triggered by those destinations.":
            "8. Apply effects triggered by cards leaving battle or entering another zone.",
        "- a winning attacker takes the contested position and enters Occupation if it is an opposing Territory they do not control; and":
            "- a winning attacker takes the contested position and becomes its occupier if it is an opposing Territory they do not control; and",
        "#### Normal card destinations":
            "#### Clearing battle cards",
        "During the destination step:":
            "When battle cards are cleared:",
        "A card-specific instruction overrides the normal destination.":
            "If a card tells you to put it somewhere else, follow the card.",
        "A card returned to its **source** returns to the zone from which it entered battle unless another rule gives it a different destination.":
            "A card returned to its **source** returns to the zone from which it entered battle unless another rule says otherwise.",
        "#### Result and destination triggers":
            "#### Result and card-movement triggers",
        "Effects triggered by cards entering a destination occur after the cards move there.":
            "Effects triggered by cards entering Hand, a Discard Pile, a Graveyard, or another zone occur after the cards move there.",
        "Effects at the **end of the Aftermath** occur after normal destinations and destination-triggered effects.":
            "Effects at the **end of the Aftermath** occur after the battle cards are cleared and effects triggered by those moves are applied.",
        "- Carry out withdrawal movement, then normal battle destinations and cleanup.":
            "- Carry out withdrawal movement, then clear the battle cards and complete the Aftermath.",
        "- a defending player moves one position toward their own end, and the attacker takes the contested position, entering Occupation if it is an opposing Territory they do not control;":
            "- a defending player moves one position toward their own end, and the attacker takes the contested position, becoming its occupier if it is an opposing Territory they do not control;",
        "- no battle-card destinations or cleanup occur.":
            "- no battle-card movement or Aftermath occurs.",
        "The winner enters Occupation on the final Territory.":
            "The winner becomes the occupier of the final Territory.",
        "Most games can be played from the Learn to Play rules. Use this chapter when cards or faction abilities interact at the same timing, reveal information early, add or replace battle cards, copy effects, or change normal destinations.":
            "Most games can be played from the Learn to Play rules. Use this chapter when cards or faction abilities interact at the same timing, reveal information early, add or replace battle cards, copy effects, or change where battle cards go.",
        "- Card text changes a card's normal destination only to the extent stated.":
            "- When card text changes where a card goes, only the stated change applies.",
        "- An effect applies only at its stated timing. Revealing a card early does not cause a later portion of its effect to take effect early.":
            "- An effect applies only at its stated timing. Revealing a card early does not apply a later portion of its effect early.",
        "- follow the normal Tactic destination unless stated otherwise.":
            "- put it in its owner's Discard Pile during the Aftermath unless stated otherwise.",
        "A negated card has no effect but remains in battle and keeps its role and normal destination unless stated otherwise.":
            "A negated card has no effect but remains in battle. Unless stated otherwise, a negated Gambit still goes to its owner's Graveyard and a negated Tactic still goes to its owner's Discard Pile.",
        "An effect cannot be negated after it takes effect.":
            "An effect cannot be negated after it has been applied.",
        "Ownership does not change, so a removed Overlay still goes to its owner's destination.":
            "Ownership does not change, so when an Overlay is removed, put it in its owner's Discard Pile unless its text says otherwise.",
        "A **Faction Ability** is any special rule granted by a faction. A Faction Ability may be passive, triggered, or actively used. A **Faction Action** is a Faction Ability that explicitly uses an Action Opportunity.":
            "A **Faction Ability** is any special rule granted by a faction. A **Faction Action** is a Faction Ability that explicitly uses an Action Opportunity.",
        "immediately before you entered Occupation.":
            "immediately before you became its occupier.",
        "instead of playing an Action card.":
            "instead of playing a card for its Action effect.",
        "- Leveraged Buyout collateral goes to the Graveyard after purchase or instead of its normal battle destination.":
            "- Leveraged Buyout collateral used from battle goes to the Graveyard after the purchase.",
        "- If the binding effect ends and gives no destination, put the bound card in its owner's Graveyard.":
            "- If the binding effect ends without telling you where to put the bound card, put it in its owner's Graveyard.",
        "> Once per turn, when the Action, Gambit, Tactic, or Battle effect of an Arcane card you play, set, or choose takes effect, you may move one card from your Graveyard to your Discard Pile.":
            "> Once per turn, after applying the Action, Gambit, Tactic, or Battle effect of an Arcane card you played, set, or chose, you may move one card from your Graveyard to your Discard Pile.",
        "A copied effect does not trigger Invocation unless the Arcane card is itself played, set, or chosen again and its printed effect takes effect.":
            "A copied effect does not trigger Invocation unless the Arcane card is itself played, set, or chosen again and its printed effect is applied.",
        "> **Completion:** On a later turn, complete this Rite when the Gambit, Tactic, or Battle effect of another card with the bound Hand card's title takes effect during a battle.":
            "> **Completion:** On a later turn, complete this Rite after the Gambit, Tactic, or Battle effect of another card with the bound Hand card's title is applied during a battle.",
        "after winning a battle that caused you to enter Occupation on a Territory":
            "after winning a battle that made you the occupier of a Territory",
        "A Gambit entering the Graveyard during normal destinations does not trigger Materia Prima merely because it came from Hand.":
            "A Gambit does not trigger Materia Prima merely because it moves from battle to your Graveyard during the Aftermath.",
        "spend the listed Conviction to perform one Purge":
            "spend the listed Conviction to use one Purge",
        "A Purge performed without using an Action Opportunity, such as one permitted by Final Judgment, is a Faction Ability at that timing rather than a Faction Action. It does not consume an Action Opportunity and does not count against the once-per-turn Action-Opportunity Purge limit.":
            "Final Judgment lets you Purge without using an Action Opportunity. That Purge does not consume an Action Opportunity and does not count against the once-per-turn limit on Purges used through Action Opportunities.",
        "You may perform no more than one Purge through Action Opportunities that turn.":
            "You may use no more than one Purge through Action Opportunities that turn.",
        "after cards follow their destinations":
            "after the battle cards have been cleared and effects triggered by those moves have been applied",
        "**Action Opportunity:** The normal opportunity to play one Action card, perform one Faction Action, or discard one Asset.":
            "**Action Opportunity:** The normal opportunity to play one card for its Action effect, use one Faction Action, or discard one Asset.",
        "**Faction Ability:** Any special rule granted by a faction. It may be passive, triggered, or actively used.":
            "**Faction Ability:** Any special rule granted by a faction.",
        "**Aftermath:** The part of a battle after the winner is determined, including result effects, retreat, Occupation, card destinations, and follow-up effects.":
            "**Aftermath:** The part of a battle after the winner is determined, including result effects, retreat, any change in who is the occupier, clearing battle cards, and follow-up effects.",
    },
)

replace(
    "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md",
    {
        "- the attacker enters Occupation on that Territory; and":
            "- the attacker becomes the occupier of that Territory; and",
        "8. **Aftermath.** Carry out retreat and Occupation, apply other result effects, move cards to their destinations, and carry out follow-up movement.":
            "8. **Aftermath.** Carry out retreat, determine whether the winner becomes the occupier, apply other result effects, clear the battle cards, and carry out follow-up movement.",
        "# Aftermath and destinations":
            "# Aftermath and clearing battle cards",
        "- a winning attacker takes the contested position and enters Occupation if it is an opposing Territory they do not control;":
            "- a winning attacker takes the contested position and becomes its occupier if it is an opposing Territory they do not control;",
        "Card text may change these destinations.":
            "A card may tell you to put it somewhere else.",
        "When a card has several printed effects, using one effect does not activate the others.":
            "When a card has several printed effects, only the effect being used applies.",
    },
)

replace(
    "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    {
        "After winning as the attacker and entering Occupation on an enemy Territory":
            "After winning as the attacker and becoming the occupier of an enemy Territory",
        "- you want sacrifices and card destinations to create new opportunities; or":
            "- you want sacrifices and cards moving between zones to create new opportunities; or",
        "After winning a battle and moving cards to their destinations, the Grand Inquisitor may perform a discounted Purge.":
            "After winning a battle and clearing the battle cards, the Grand Inquisitor may use a discounted Purge.",
    },
)

replace(
    "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md",
    {
        "- Clarified that effects cannot be negated after they take effect.":
            "- Clarified that effects cannot be negated after they have been applied.",
        "- Added a complete Aftermath order covering result, withdrawal replacement, retreat, Occupation, additional retreat, card destinations, destination triggers, and follow-up movement.":
            "- Added a complete Aftermath order covering result, withdrawal replacement, retreat, changes in Occupation, additional retreat, clearing battle cards, effects triggered by that movement, and follow-up movement.",
        "- Normal card destinations are now stated centrally:":
            "- The rules now state directly where battle cards go:",
        "- Added standard verbs for setting Gambits, choosing Tactics, playing cards, activating Assets, using Faction Abilities, and applying effects.":
            "- Added standard verbs for setting Gambits, choosing Tactics, playing cards, using Assets and Faction Abilities, and applying effects.",
        "- Final Judgment occurs after normal card destinations, allowing the normal Conviction gain first.":
            "- Final Judgment occurs after the battle cards are cleared, allowing the normal Conviction gain first.",
    },
)

replace(
    "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
    {
        "- **Discard** means put the card in its owner's Discard Pile unless another destination is stated.":
            "- **Discard** means put the card in its owner's Discard Pile unless the card says otherwise.",
        "- A negated card has no effect and follows its normal destination unless stated otherwise.":
            "- A negated card has no effect. Unless stated otherwise, a negated Gambit still goes to its owner's Graveyard and a negated Tactic still goes to its owner's Discard Pile.",
        "place Scorched Earth on that Territory as a Ruins Overlay instead of putting it in its normal destination.":
            "place Scorched Earth on that Territory as a Ruins Overlay; do not put it in a Graveyard or Discard Pile.",
        "return one other card you controlled in this battle to your Hand instead of putting it in its normal destination.":
            "return one other card you controlled in this battle to your Hand rather than putting it in a Graveyard or Discard Pile.",
        "put every card from their initial Reserve in their Graveyard instead of its normal destination.":
            "put every card remaining from their initial Reserve in their Graveyard rather than their Discard Pile.",
        "put the chosen card in your Graveyard unless its text gives another destination.":
            "put the chosen card in your Graveyard unless its text tells you to put it elsewhere.",
        "place Protracted Siege on that Territory as an Overlay instead of putting it in its normal destination.":
            "place Protracted Siege on that Territory as an Overlay; do not put it in a Graveyard or Discard Pile.",
        "bank Resistance as an Asset instead of putting it in its normal destination.":
            "bank Resistance as an Asset; do not put it in a Graveyard or Discard Pile.",
        "> **Action:** Bank Resourcefulness as an Asset. You may have only one banked Resourcefulness. The first time during each of your turns that the Action, Gambit, Tactic, or Battle effect of a cost-1 card you play, set, or choose takes effect, draw one card.":
            "> **Action:** Bank Resourcefulness as an Asset. You may have only one banked Resourcefulness. The first time during each of your turns that you apply the Action, Gambit, Tactic, or Battle effect of a cost-1 card you played, set, or chose, draw one card.",
        "capture that Territory instead of entering Occupation.":
            "capture that Territory rather than becoming its occupier.",
        "put the chosen card in its owner's Graveyard instead of its normal destination.":
            "put the chosen card in its owner's Graveyard.",
        "turn Bombardment face down; it becomes a Ruins Overlay instead of putting it in its normal destination.":
            "turn Bombardment face down; it becomes a Ruins Overlay and does not go to a Graveyard or Discard Pile.",
        "It becomes a blank Territory under your control instead of putting it in its normal destination.":
            "It becomes a blank Territory under your control and does not go to a Graveyard or Discard Pile.",
    },
)

replace(
    "docs/Gauntlet_v0.6.1_Territory_Pool.md",
    {
        "During the Aftermath of a battle on Field Hospital, when battle cards move to their destinations, its controller may put one card they controlled in that battle that would enter their Graveyard in their Discard Pile instead.":
            "During the Aftermath of a battle on Field Hospital, when the battle cards are cleared, its controller may put one card they controlled in that battle that would enter their Graveyard in their Discard Pile instead.",
    },
)

replace(
    "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
    {
        "immediately before you entered Occupation.":
            "immediately before you became its occupier.",
        "put Gunboat Diplomacy in your Discard Pile instead of its normal destination.":
            "put Gunboat Diplomacy in your Discard Pile.",
    },
)

replace(
    "releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md",
    {
        "instead of playing an Action card.":
            "instead of playing a card for its Action effect.",
        "- Leveraged Buyout collateral goes to the Graveyard after purchase or instead of its normal battle destination.":
            "- Leveraged Buyout collateral used from battle goes to the Graveyard after the purchase.",
        "put Speculation in your Graveyard instead of its normal destination.":
            "put Speculation in your Graveyard.",
        "Each contributes payment equal to its value and goes to your Graveyard instead of its normal destination.":
            "Each contributes payment equal to its value and goes to your Graveyard after the purchase.",
    },
)

replace(
    "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md",
    {
        "spend the listed Conviction to perform one Purge":
            "spend the listed Conviction to use one Purge",
        "A Purge performed without using an Action Opportunity, such as one permitted by Final Judgment, is a Faction Ability at that timing rather than a Faction Action. It does not consume an Action Opportunity and does not count against the once-per-turn Action-Opportunity Purge limit.":
            "Final Judgment lets you Purge without using an Action Opportunity. That Purge does not consume an Action Opportunity and does not count against the once-per-turn limit on Purges used through Action Opportunities.",
        "instead of playing an Action card.":
            "instead of playing a card for its Action effect.",
        "You may perform no more than one Purge through Action Opportunities that turn.":
            "You may use no more than one Purge through Action Opportunities that turn.",
        "after cards follow their destinations":
            "after the battle cards have been cleared and effects triggered by those moves have been applied",
        "Withdrawal does not activate No Martyrs.":
            "Withdrawal does not trigger No Martyrs.",
        "- Blasphemy triggers from opposing Arcane Action cards and revealed Arcane Gambits or Tactics.":
            "- Blasphemy triggers from opposing Arcane cards played for their Action effects and from revealed Arcane Gambits or Tactics.",
        "- Final Judgment occurs after battle-card destinations and is separate from the Action-Opportunity Purge limit.":
            "- Final Judgment occurs after the battle cards are cleared and is separate from the Action-Opportunity Purge limit.",
    },
)

replace(
    "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md",
    {
        "Withdrawal uses normal battle destinations unless another effect says otherwise.":
            "After withdrawal, Gambits still go to their owners' Graveyards, and Tactics and cards remaining in Reserve still go to their owners' Discard Piles unless another effect says otherwise.",
        "> **Battle:** Opposing banked Assets cannot be activated and their effects cannot be applied during this battle.":
            "> **Battle:** Opposing banked Assets have no effect during this battle.",
        "> **Mission:** Complete after you win a battle in which an opposing banked Asset was activated or had its effect applied and none of your banked Assets were activated or had their effects applied.":
            "> **Mission:** Complete after you win a battle in which an opposing banked Asset had an effect and none of your banked Assets had an effect.",
        "> **Activate:** At the start of your turn, you may put Sleeper Network in your Graveyard.":
            "> **Use:** At the start of your turn, you may put Sleeper Network in your Graveyard.",
    },
)

replace(
    "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
    {
        "place Encampment on that Territory as an Overlay instead of putting it in its normal destination.":
            "place Encampment on that Territory as an Overlay.",
        "bank Rearguard as an Asset instead of putting it in its normal destination.":
            "bank Rearguard as an Asset.",
        "put Reserve Force in your Discard Pile during the Aftermath of the battle instead of its normal destination.":
            "put Reserve Force in your Discard Pile during the Aftermath of the battle.",
        "Put Give Chase in your Graveyard instead of its normal destination.":
            "Put Give Chase in your Graveyard.",
        "put Hold the Line in your Graveyard instead of its normal destination.":
            "put Hold the Line in your Graveyard.",
        "put Countercharge in your Graveyard instead of its normal destination":
            "put Countercharge in your Graveyard",
        "put War Crimes in your Graveyard instead of its normal destination.":
            "put War Crimes in your Graveyard.",
        "put Shock and Awe in your Graveyard instead of its normal destination.":
            "put Shock and Awe in your Graveyard.",
    },
)

replace(
    "releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md",
    {
        "- If the binding effect ends and gives no destination, put the bound card in its owner's Graveyard.":
            "- If the binding effect ends without telling you where to put the bound card, put it in its owner's Graveyard.",
        "> Once per turn, when the Action, Gambit, Tactic, or Battle effect of an Arcane card you play, set, or choose takes effect, you may move one card from your Graveyard to your Discard Pile.":
            "> Once per turn, after applying the Action, Gambit, Tactic, or Battle effect of an Arcane card you played, set, or chose, you may move one card from your Graveyard to your Discard Pile.",
        "A copied effect does not trigger Invocation unless the Arcane card is itself played, set, or chosen again and its printed effect takes effect.":
            "A copied effect does not trigger Invocation unless the Arcane card is itself played, set, or chosen again and its printed effect is applied.",
        "> **Completion:** On a later turn, complete this Rite when the Gambit, Tactic, or Battle effect of another card with the bound Hand card's title takes effect during a battle.":
            "> **Completion:** On a later turn, complete this Rite after the Gambit, Tactic, or Battle effect of another card with the bound Hand card's title is applied during a battle.",
        "after winning a battle that caused you to enter Occupation on a Territory":
            "after winning a battle that made you the occupier of a Territory",
        "A Gambit entering the Graveyard during normal destinations does not trigger Materia Prima merely because it came from Hand.":
            "A Gambit does not trigger Materia Prima merely because it moves from battle to your Graveyard during the Aftermath.",
        "place Spirit Hollow as an Overlay on the contested Territory instead of putting it in its normal destination.":
            "place Spirit Hollow as an Overlay on the contested Territory.",
        "After the card-destination step of the Aftermath following a battle here":
            "After the battle cards are cleared during the Aftermath following a battle here",
        "put Witchcraft in your Graveyard instead of its normal destination.":
            "put Witchcraft in your Graveyard.",
        "place Circle of Bones as an Overlay on the contested Territory instead of putting it in its normal destination.":
            "place Circle of Bones as an Overlay on the contested Territory.",
        "after your other cards in battle follow their destinations":
            "after your other cards in battle have been cleared",
        "Necromancy follows its normal destination.":
            "Put Necromancy in your Graveyard if it was your Gambit, or in your Discard Pile if it was your Tactic.",
    },
)

# Final audit of current player-facing canonical sources.
paths = [
    ROOT / "README.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_First_Game_Guide.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Faction_Introductions.md",
    ROOT / "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md",
    ROOT / "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md",
    ROOT / "docs/Gauntlet_v0.6.1_Territory_Pool.md",
]
paths.extend(sorted((ROOT / "releases/v0.6.1/faction-guides").glob("**/*.md")))

patterns = {
    "activate": re.compile(r"\bactivat(?:e|es|ed|ing|ion|ions)\b", re.I),
    "destination": re.compile(r"\bdestination(?:s)?\b", re.I),
    "action card": re.compile(r"\bAction card(?:s)?\b", re.I),
    "perform faction action": re.compile(r"\bperform(?:s|ed|ing)?\b.*\bFaction Action\b|\bFaction Action\b.*\bperform(?:s|ed|ing)?\b", re.I),
    "perform purge": re.compile(r"\bperform(?:s|ed|ing)?\b.*\bPurge\b", re.I),
    "occupation as action": re.compile(r"\benter(?:s|ed|ing)? Occupation\b|\bcarry out .*Occupation\b", re.I),
    "effect takes effect": re.compile(r"\beffect(?:s)? .*take(?:s)? effect\b|\beffect takes effect\b", re.I),
    "active faction ability": re.compile(r"\bactively used\b", re.I),
    "inactive asset": re.compile(r"\binactive Asset\b", re.I),
    "category switching": re.compile(r"rather than a Faction Action|is a Faction Ability at that timing", re.I),
}

issues: list[str] = []
for path in paths:
    if not path.exists():
        continue
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        for name, pattern in patterns.items():
            if pattern.search(line):
                issues.append(f"{path.relative_to(ROOT)}:{number} [{name}] {line}")
if issues:
    raise SystemExit("Remaining forced terminology:\n" + "\n".join(issues[:300]))
