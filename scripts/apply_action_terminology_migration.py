#!/usr/bin/env python3
"""Apply the approved Action/Action Opportunity and binding terminology migration."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def save(relative: str, text: str) -> None:
    (ROOT / relative).write_text(text, encoding="utf-8")


def replace_required(text: str, old: str, new: str, *, label: str, count: int = 1) -> str:
    actual = text.count(old)
    if actual != count:
        raise RuntimeError(f"{label}: expected {count} occurrence(s), found {actual}: {old[:120]!r}")
    return text.replace(old, new, count)


def replace_if_present(text: str, old: str, new: str) -> str:
    return text.replace(old, new)


def migrate_rulebook() -> None:
    path = "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md"
    text = load(path)
    text = replace_required(
        text,
        "- **Action:** play from Hand during an Action Opportunity.",
        "- **Action:** normally play from Hand by spending 1 Action during an Action Opportunity.",
        label="rulebook printed Action",
    )
    text = replace_required(
        text,
        "### Action Opportunity\n\nAn Action Opportunity is the point during a turn when a player may play one card for its Action effect, use one Faction Action, or discard one Asset they control. Chapter 4 explains when it occurs.",
        "### Bound cards\n\nA bound card is outside normal zones.\n\n- A face-up bound card is public.\n- A face-down bound card may be inspected only by its owner.\n- A bound card cannot be played, moved, or affected except as instructed by the effect to which it is bound.\n- When the binding ends, follow that effect's instructions.\n\n### Actions and Action Opportunities\n\nAn **Action** is a spendable allowance. The active player normally has 1 Action each turn.\n\nAn **Action Opportunity** is a timing window when the active player may spend an Action. A normal turn has one before movement and one after movement. No more than 1 Action may be spent during the same Action Opportunity. Chapter 4 explains the available choices and effects that grant additional Actions or Action Opportunities.",
        label="rulebook first-use definitions",
    )
    text = replace_required(
        text,
        "On your turn, first capture an opposing Territory you held through the opponent's turn. Then draw a card. You may take one Action either before or after movement. During movement, advance, hold, or withdraw. Conduct any battle immediately. Finally, discard down to three cards.",
        "On your turn, first capture an opposing Territory you held through the opponent's turn. Then draw a card. You normally have 1 Action, which you may spend before or after movement. During movement, advance, hold, or withdraw. Conduct any battle immediately. Finally, discard down to three cards.",
        label="rulebook turn overview",
    )
    text = replace_required(
        text,
        "### Action Opportunities\n\nThe active player has one normal Action Opportunity each turn. It may be used before movement or, if unused, after movement.\n\nDuring an Action Opportunity, the player may:\n\n- play one card for its Action effect;\n- use one available **Faction Action**; or\n- discard one Asset they control.\n\nAn additional Action Opportunity permits one additional qualifying action at the stated timing. It does not grant movement unless stated.",
        "### Actions and Action Opportunities\n\nThe active player normally begins their turn with 1 Action. Their turn contains two normal Action Opportunities: one before movement and one after movement.\n\nDuring each Action Opportunity, the player may spend at most 1 available Action to:\n\n- play one card for its Action effect;\n- use one available **Faction Action**; or\n- discard one Asset they control.\n\nAn Action not spent before movement remains available after movement. Unspent Actions expire when the turn ends.\n\nGaining an Action does not create an Action Opportunity. Gaining an Action Opportunity does not grant an Action. An effect that grants both states both. An Action granted together with an immediate Action Opportunity expires when that opportunity ends. An additional Action Opportunity does not grant movement unless stated.",
        label="rulebook core action rules",
    )
    text = replace_required(
        text,
        "During your Action Opportunity, play one card for its Action effect, use a Faction Action, or discard one Asset you control. Most one-time Actions go to the Discard Pile. Some cards become **Assets**, which stay in play and provide later effects.",
        "During an Action Opportunity, spend 1 Action to play one card for its Action effect, use a Faction Action, or discard one Asset you control. Most one-time Action effects put their cards in the Discard Pile. Some cards become **Assets**, which stay in play and provide later effects.",
        label="rulebook actions overview",
    )
    text = replace_required(
        text,
        "To play a card for its Action effect:\n\n1. play it from Hand during an Action Opportunity;\n2. satisfy all requirements and costs;\n3. apply the Action effect; and",
        "Unless an effect says otherwise, to play a card for its Action effect:\n\n1. spend 1 Action during an Action Opportunity and play it from Hand;\n2. satisfy all requirements and costs;\n3. apply the Action effect; and",
        label="rulebook action procedure",
    )
    text = replace_required(
        text,
        "Using an Asset does not use an Action Opportunity unless expressly stated otherwise. If using it requires the Asset to be discarded, put it in its owner's Discard Pile unless stated otherwise.\n\nWhenever a player could play a card for its Action effect, they may instead discard one Asset they control. This uses the Action Opportunity.",
        "Using an Asset does not spend an Action unless expressly stated otherwise. If using it requires the Asset to be discarded, put it in its owner's Discard Pile unless stated otherwise.\n\nDuring an Action Opportunity, a player may spend 1 Action to discard one Asset they control instead of playing a card or using a Faction Action.",
        label="rulebook Asset action costs",
    )
    text = replace_required(
        text,
        "3. **Action Opportunity before movement:** use it now or save it.",
        "3. **Action Opportunity before movement:** spend up to 1 Action or save it.",
        label="quick reference before",
    )
    text = replace_required(
        text,
        "5. **Action Opportunity after movement:** use it now if it was not used before movement.",
        "5. **Action Opportunity after movement:** spend up to 1 available Action.",
        label="quick reference after",
    )
    text = replace_required(
        text,
        "**Action Opportunity:** The normal opportunity to play one card for its Action effect, use one Faction Action, or discard one Asset.\n\n**Faction Ability:** Any special rule granted by a faction.\n\n**Faction Action:** A Faction Ability that explicitly uses an Action Opportunity.",
        "**Action:** A spendable allowance. A player normally has 1 Action each turn.\n\n**Action Opportunity:** A timing window when a player may spend at most 1 Action. A normal turn has one before movement and one after movement.\n\n**Faction Ability:** Any special rule granted by a faction.\n\n**Faction Action:** A Faction Ability used by spending 1 Action during an Action Opportunity unless stated otherwise.",
        label="rulebook glossary",
    )
    save(path, text)


def migrate_neutral_and_territories() -> None:
    path = "docs/Gauntlet_v0.6.1_Neutral_Card_Pool.md"
    text = load(path)
    text = replace_required(
        text,
        "> **Use:** During your turn, you may discard this card to take another Action Opportunity.",
        "> **Use:** During your turn, you may discard this card to gain 1 Action, then immediately take another Action Opportunity.",
        label="Reinforcements",
    )
    text = replace_required(
        text,
        "> **Action:** Draw one card. You may immediately play one card from your Hand whose Action effect banks it, without using another Action Opportunity.",
        "> **Action:** Draw one card. You may immediately play one card from your Hand whose Action effect banks it without spending another Action.",
        label="Conscription",
    )
    text = replace_required(
        text,
        "> **Action:** Discard your Hand. Each player shuffles their Discard Pile into their Draw Pile. Draw three cards, then take another Action Opportunity.",
        "> **Action:** Discard your Hand. Each player shuffles their Discard Pile into their Draw Pile. Draw three cards, then gain 1 Action and immediately take another Action Opportunity.",
        label="Insurrection",
    )
    text = replace_required(
        text,
        "> **Asset:** After you win a Counterattack, draw one card, then take another Action Opportunity.",
        "> **Asset:** After you win a Counterattack, draw one card, then gain 1 Action and immediately take another Action Opportunity.",
        label="Liberation",
    )
    save(path, text)

    path = "docs/Gauntlet_v0.6.1_Territory_Pool.md"
    text = load(path)
    text = replace_required(
        text,
        "> If a player begins their turn occupying and controlling Command Tent, they may play one card for its Action effect during the Action Opportunity before movement and one card for its Action effect during the Action Opportunity after movement that turn.",
        "> If a player begins their turn occupying and controlling Command Tent, they may gain 1 additional Action that turn. If they do, both Actions may be spent only to play cards for their Action effects, one during each normal Action Opportunity.",
        label="Command Tent",
    )
    text = replace_required(
        text,
        "> During an Action Opportunity, while occupying and controlling Smuggler's Pass, a player may stash one card from their Hand face down beneath it instead of playing a card for its Action effect. The stashed card does not count toward the Hand limit.",
        "> During an Action Opportunity, while occupying and controlling Smuggler's Pass, a player may spend 1 Action to stash one card from their Hand face down beneath it. The stashed card does not count toward the Hand limit.",
        label="Smuggler's Pass",
    )
    save(path, text)


def migrate_financiers() -> None:
    path = "releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md"
    text = load(path)
    replacements = (
        ("| Financial Capacity | If Treasury value exceeds Territories controlled at the start of your turn, you may use both normal Action Opportunities; at least one must be a Financier Faction Action. |", "| Financial Capacity | If Treasury value exceeds Territories controlled at the start of your turn, gain 1 additional Action that turn; at least one Action must be spent on a Financier Faction Action. |"),
        ("Financiers have the following Faction Actions. Each uses one Action Opportunity and may be performed only after movement:", "Financiers have the following Faction Actions. Each costs 1 Action and may be used only during an Action Opportunity after movement:"),
        ("When Financial Capacity permits both normal Action Opportunities, at least one must be used for one of these Faction Actions. Line of Credit modifies a Deed purchase, and Subsidize modifies a battle; neither is a separate Faction Action.", "When Financial Capacity grants an additional Action, at least one Action spent that turn must be spent on one of these Faction Actions. Line of Credit modifies a Deed purchase, and Subsidize modifies a battle; neither is a separate Faction Action."),
        ("At the start of your turn, if the total card value in your Treasury is greater than the number of Territories you control, you may use both normal Action Opportunities that turn. At least one must be used for a Financier Faction Action.", "At the start of your turn, if the total card value in your Treasury is greater than the number of Territories you control, gain 1 additional Action that turn. At least one Action spent that turn must be spent on a Financier Faction Action."),
        ("During an Action Opportunity after movement, you may place a card in Treasury, buy a Deed, or Play the Market instead of playing a card for its Action effect.", "During an Action Opportunity after movement, you may spend 1 Action to place a card in Treasury, buy a Deed, or Play the Market."),
        ("If the Treasury value is greater, you may use both normal Action Opportunities that turn. If you use both, at least one must be used for a Financier Faction Action. If the before-movement opportunity was not used for a Financier Faction Action, the after-movement opportunity may be used only for one.", "If the Treasury value is greater, gain 1 additional Action that turn. You may spend at most 1 Action during each normal Action Opportunity. If you spend both Actions, at least one must be spent on a Financier Faction Action. If you spend an Action before movement, the Action spent after movement must be spent on a Financier Faction Action."),
        ("Qualifying Financier Faction Actions include placing a card in your Treasury, buying or buying out a Deed, Play the Market, Hostile Takeover, or another Financier Faction Action that explicitly uses an Action Opportunity.", "Qualifying Financier Faction Actions include placing a card in your Treasury, buying or buying out a Deed, Play the Market, Hostile Takeover, or another Financier Faction Action that costs 1 Action."),
        ("The two opportunities remain at their normal timings: one before movement and one after movement.", "The two normal Action Opportunities remain at their normal timings: one before movement and one after movement."),
        ("During an Action Opportunity after movement, instead of playing a card for its Action effect, place one card from your Hand face up in your Treasury.", "During an Action Opportunity after movement, spend 1 Action to place one card from your Hand face up in your Treasury."),
        ("During an Action Opportunity after movement, instead of playing a card for its Action effect, buy or buy out one Deed by paying its full cost.", "During an Action Opportunity after movement, spend 1 Action to buy or buy out one Deed by paying its full cost."),
        ("During an Action Opportunity after movement, instead of playing a card for its Action effect, discard one card from Hand and roll one die:", "During an Action Opportunity after movement, spend 1 Action, discard one card from Hand, and roll one die:"),
        ("### Additional Action Opportunities\n\nAn additional Action Opportunity permits one additional qualifying action at its legal timing. During an after-movement opportunity this may include Treasury, a Deed purchase, Play the Market, or Hostile Takeover. It does not grant movement.", "### Additional Action Opportunities\n\nAn additional Action Opportunity does not grant an Action. During an after-movement opportunity, you may spend 1 available Action on Treasury, a Deed purchase, Play the Market, Hostile Takeover, or another legal choice. It does not grant movement."),
        ("> **Hostile Takeover:** During an Action Opportunity after movement, if you won a battle as the attacker this turn and are now the occupier of that enemy Territory, you may buy or buy out its Deed instead of playing a card for its Action effect.", "> **Hostile Takeover:** During an Action Opportunity after movement, if you won a battle as the attacker this turn and are now the occupier of that enemy Territory, you may spend 1 Action to buy or buy out its Deed."),
        ("> **Action:** Bank this card. Draw two cards, then take another Action Opportunity this turn.", "> **Action:** Bank this card. Draw two cards, then gain 1 Action and immediately take another Action Opportunity."),
        ("> **Action:** Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so, then take another Action Opportunity this turn.", "> **Action:** Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so, then gain 1 Action and immediately take another Action Opportunity."),
        ("> **Action:** Choose one other card in your Hand or Treasury and place it beneath this card as collateral. Bank this card. Gain Capital equal to the collateral card's value plus 2, then take another Action Opportunity this turn.", "> **Action:** Choose one other card in your Hand or Treasury and place it beneath this card as collateral. Bank this card. Gain Capital equal to the collateral card's value plus 2, then gain 1 Action and immediately take another Action Opportunity."),
        ("- Financial Capacity: if Treasury value exceeds controlled Territories at the start-of-turn check, you may use both normal Action Opportunities; at least one must be a Financier Faction Action.", "- Financial Capacity: if Treasury value exceeds controlled Territories at the start-of-turn check, gain 1 additional Action that turn; at least one Action must be spent on a Financier Faction Action."),
    )
    for old, new in replacements:
        text = replace_required(text, old, new, label="Financier guide")
    save(path, text)


def migrate_inquisition() -> None:
    path = "releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md"
    text = load(path)
    replacements = (
        ("Spend Conviction on **Purges** that remove cards and Assets. On your turn, using an Action Opportunity to Purge allows you to use the other normal Action Opportunity as well.", "Spend Conviction on **Purges** that remove cards and Assets. The first time on your turn that you spend an Action to Purge, gain 1 additional Action that turn."),
        ("| Faction Actions | Purge. Using one through an Action Opportunity during your turn permits both normal Action Opportunities. |", "| Faction Actions | Purge. The first Action spent to Purge each turn grants 1 additional Action that turn. |"),
        ("**Purge is the Inquisition's only Faction Action.** During either normal Action Opportunity on your turn, spend the listed Conviction to Purge instead of playing a card for its Action effect.", "**Purge is the Inquisition's only Faction Action.** During an Action Opportunity on your turn, spend 1 Action and the listed Conviction to Purge."),
        ("When you use an Action Opportunity to Purge, you may use both normal Action Opportunities that turn. The other opportunity may be used normally, but only one Action Opportunity may be used to Purge that turn.", "The first time each turn that you spend an Action to Purge, gain 1 additional Action that turn. You may spend at most 1 Action on Purge each turn."),
        ("Final Judgment lets you Purge without using an Action Opportunity. That Purge does not consume an Action Opportunity and does not count against the once-per-turn limit on Purges used through Action Opportunities.", "Final Judgment lets you Purge without spending an Action. That Purge neither grants the additional Action nor counts against the limit of 1 Action spent on Purge each turn."),
        ("During an Action Opportunity, spend Conviction to Purge instead of playing a card for its Action effect. On your turn, you may use both the before- and after-movement Action Opportunities if one is used to Purge. Only one Action Opportunity may be used to Purge that turn.", "During an Action Opportunity, spend 1 Action and Conviction to Purge. The first Action spent to Purge each turn grants 1 additional Action that turn. You may spend at most 1 Action on Purge each turn."),
        ("During an Action Opportunity, instead of playing a card for its Action effect, spend Conviction to Purge:", "During an Action Opportunity, spend 1 Action and Conviction to Purge:"),
        ("On your turn, you may use both the before- and after-movement Action Opportunities if one is used to Purge. The other opportunity may be used normally. Only one Action Opportunity may be used to Purge each turn.\n\nA Purge uses an Action Opportunity but is not playing a card. A Purge permitted outside an Action Opportunity, such as Final Judgment, is separate and does not count against this limit.", "The first time each turn that you spend an Action to Purge, gain 1 additional Action that turn. You may spend at most 1 Action on Purge each turn.\n\nA Purge is not playing a card. A Purge permitted without spending an Action, such as Final Judgment, is separate and does not count against this limit."),
        ("> **Final Judgment:** Once per turn, during the Aftermath of a battle you won, after the battle cards have been cleared and effects triggered by those moves have been applied, you may immediately Purge without using an Action Opportunity.", "> **Final Judgment:** Once per turn, during the Aftermath of a battle you won, after the battle cards have been cleared and effects triggered by those moves have been applied, you may immediately Purge without spending an Action."),
        ("- On your turn, you may use both normal Action Opportunities if one is used to Purge; only one Action Opportunity may be used to Purge that turn.", "- The first Action spent to Purge each turn grants 1 additional Action that turn; at most 1 Action may be spent on Purge each turn."),
    )
    for old, new in replacements:
        text = replace_required(text, old, new, label="Inquisition guide")
    save(path, text)


def migrate_intelligence() -> None:
    path = "releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md"
    text = load(path)
    replacements = (
        ("Intelligence has the following Faction Actions. Each uses one Action Opportunity and may be performed only after movement:", "Intelligence has the following Faction Actions. Each costs 1 Action and may be used only during an Action Opportunity after movement:"),
        ("Surveillance, Interference, Fieldcraft, and Mission Control are Faction Abilities, not Faction Actions. Mission Control may start a Mission without using an Action Opportunity only because its text expressly permits it.", "Surveillance, Interference, Fieldcraft, and Mission Control are Faction Abilities, not Faction Actions. Mission Control may start a Mission without spending an Action only because its text expressly permits it."),
        ("During an Action Opportunity after movement, place an eligible card face down as your Active Mission instead of playing an Action. Once you have satisfied its requirement on a later turn, use another after-movement Action Opportunity to reveal and complete it.", "During an Action Opportunity after movement, spend 1 Action to place an eligible card face down as your Active Mission. Once you have satisfied its requirement on a later turn, spend 1 Action during another after-movement Action Opportunity to reveal and complete it."),
        ("During an Action Opportunity after movement, instead of playing a card for its Action effect, place one eligible Intelligence card from your Hand face down near your Leader as your **Active Mission**.", "During an Action Opportunity after movement, spend 1 Action to place one eligible Intelligence card from your Hand face down near your Leader as your **Active Mission**."),
        ("During an Action Opportunity after movement, instead of playing a card for its Action effect, reveal and complete the Active Mission if its requirement has been satisfied.", "During an Action Opportunity after movement, spend 1 Action to reveal and complete the Active Mission if its requirement has been satisfied."),
        ("During an Action Opportunity after movement, reveal the Active Mission and spend Intel equal to its value to abort it.", "During an Action Opportunity after movement, spend 1 Action, reveal the Active Mission, and spend Intel equal to its value to abort it."),
        ("During an Action Opportunity after movement, place that card face down as your Special Operation.", "During an Action Opportunity after movement, spend 1 Action to place that card face down as your Special Operation."),
        ("During an Action Opportunity after movement, if its requirement is satisfied and readiness remains valid, reveal it and pay:", "During an Action Opportunity after movement, if its requirement is satisfied and readiness remains valid, spend 1 Action, reveal it, and pay:"),
        ("> **Mission Control:** Once per turn, after completing a normal Mission, you may immediately start another eligible Mission from your Hand without using an Action Opportunity.", "> **Mission Control:** Once per turn, after completing a normal Mission, you may immediately start another eligible Mission from your Hand without spending an Action."),
        ("> **Action:** Bank this card with one other card from your Hand face down beneath it.\n>\n> **Asset:** At the end of each of your later turns, you may place one other card from your Hand face down beneath it.\n>\n> **Capacity:** Sleeper Network can hold no more cards than the number of Territories you control. If it holds too many, immediately put cards beneath it of your choice in your Discard Pile until within capacity.\n>\n> **Use:** At the start of your turn, you may put this card in your Graveyard. If you do, reveal the cards beneath it. Play each card whose Action effect can legally be applied, one at a time and in any order, without using Action Opportunities. Put the rest in your Discard Pile.\n>\n> **Compromised:** When an opposing effect would cause Sleeper Network to leave play, before it does, reveal the cards beneath it. You may play one card whose Action effect can legally be applied without using an Action Opportunity. Put the rest in your Discard Pile.\n>\n> **Other removal:** If this card leaves play for any other reason, put all cards beneath it in your Discard Pile.", "> **Action:** Bank this card and bind another card from your Hand to it face down.\n>\n> **Asset:** At the end of each later turn, you may bind a card from your Hand to it face down, up to the number of Territories you control.\n>\n> **Use:** During an Action Opportunity, spend 1 Action to put this card in your Graveyard and reveal its bound cards. Play each whose Action effect can apply now, one at a time and in any order, without spending Actions. Discard the rest.\n>\n> **Compromised:** Before an opposing effect causes this card to leave play, reveal its bound cards. You may play one whose Action effect can apply now without spending an Action. Discard the rest.\n\nIf Sleeper Network has more bound cards than Territories you control, immediately discard bound cards of your choice until within the limit. If it leaves play without applying its Use or Compromised effect, discard all cards bound to it."),
    )
    for old, new in replacements:
        text = replace_required(text, old, new, label="Intelligence guide")
    save(path, text)


def migrate_mystics() -> None:
    path = "releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md"
    text = load(path)
    replacements = (
        ("Mystics have the following Faction Actions. Each uses one Action Opportunity and may be performed only after movement:", "Mystics have the following Faction Actions. Each costs 1 Action and may be used only during an Action Opportunity after movement:"),
        ("During an Action Opportunity after movement, pay a Rite's beginning cost to begin it.", "During an Action Opportunity after movement, spend 1 Action and pay a Rite's beginning cost to begin it."),
        ("During an Action Opportunity after movement, instead of playing a card for its Action effect, begin one incomplete Rite by paying its beginning cost.", "During an Action Opportunity after movement, spend 1 Action to begin one incomplete Rite by paying its beginning cost."),
        ("### Bound cards\n\nA card bound to a Rite, Ritual, or another card is outside normal zones.\n\n- A face-up bound card is public.\n- A face-down bound card may be inspected only by its owner.\n- A bound card cannot be played, moved, or affected except as instructed by the effect to which it is bound.\n- If the binding effect ends without telling you where to put the bound card, put it in its owner's Graveyard.", "### Bound cards\n\nBound cards follow the shared rules. If a Rite or Ritual binding ends without another instruction, put its bound cards in their owners' Graveyards."),
        ("You may begin this Rite only during an Action Opportunity after movement after winning a battle", "You may begin this Rite only by spending 1 Action during an Action Opportunity after movement after winning a battle"),
        ("After completing all three Rites, use an Action Opportunity after movement to bind one Arcane card from your Hand, one from your Discard Pile, and one from your Graveyard.", "After completing all three Rites, spend 1 Action during an Action Opportunity after movement to bind one Arcane card from your Hand, one from your Discard Pile, and one from your Graveyard."),
        ("After completing all three Rites, during an Action Opportunity after movement, instead of playing a card for its Action effect, bind:", "After completing all three Rites, during an Action Opportunity after movement, spend 1 Action to bind:"),
    )
    for old, new in replacements:
        text = replace_required(text, old, new, label="Mystics guide")
    save(path, text)


def migrate_simple_faction_language() -> None:
    files = (
        "releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md",
        "releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md",
    )
    for path in files:
        text = load(path)
        text = replace_if_present(text, "do not use Action Opportunities", "do not spend Actions")
        text = replace_if_present(text, "does not use Action Opportunities", "does not spend Actions")
        text = replace_if_present(text, "Neither uses an Action Opportunity", "Neither spends an Action")
        text = replace_if_present(text, "still uses an Action Opportunity under the shared rules", "still costs 1 Action under the shared rules")
        text = replace_if_present(text, "without using an Action Opportunity", "without spending an Action")
        text = replace_if_present(text, "without using another Action Opportunity", "without spending another Action")
        save(path, text)


def migrate_style_and_supporting_docs() -> None:
    path = "docs/Gauntlet_Card_Text_Style_Guide.md"
    text = load(path)
    text = replace_required(
        text,
        "- **Action:** One-time instructions for playing the card during an Action Opportunity.",
        "- **Action:** One-time instructions normally played by spending 1 Action during an Action Opportunity.",
        label="style Action heading",
    )
    text = replace_required(
        text,
        "- **Additional action:** “take another Action Opportunity”",
        "- **Timing:** “during an Action Opportunity”\n- **Action cost:** “spend 1 Action”\n- **Free effect:** “without spending an Action”\n- **Additional Action:** “gain 1 Action”\n- **Additional opportunity:** “take another Action Opportunity”\n- **Both:** “gain 1 Action, then immediately take another Action Opportunity”",
        label="style Action templates",
    )
    save(path, text)

    path = "docs/Gauntlet_Editorial_Style_and_Capitalization_Guide.md"
    text = load(path)
    if "- Action;\n- Action Opportunity;" not in text:
        text = replace_required(text, "- Action Opportunity;", "- Action;\n- Action Opportunity;", label="editorial Action term")
    save(path, text)

    path = "docs/Gauntlet_Rules_Language_and_Editorial_Standard.md"
    text = load(path)
    text = replace_if_present(text, "Territory, and Action Opportunity.", "Territory, Action, and Action Opportunity.")
    save(path, text)

    path = "docs/Gauntlet_v0.6.1_Implementation_Ledger.md"
    text = load(path)
    text = replace_required(text, "- **Action:** played during an Action Opportunity.", "- **Action:** normally played by spending 1 Action during an Action Opportunity.", label="ledger Action heading")
    marker = "### Printed effect headings\n"
    insertion = "### Actions and Action Opportunities\n\nAn **Action** is a spendable allowance; an **Action Opportunity** is a timing window. A player normally has 1 Action and two normal Action Opportunities each turn, before and after movement. No more than 1 Action may be spent during the same Action Opportunity.\n\n"
    if insertion not in text:
        text = replace_required(text, marker, insertion + marker, label="ledger Action distinction")
    save(path, text)

    path = "docs/Gauntlet_Development_Status.md"
    text = load(path)
    text = replace_if_present(text, "When Treasury value exceeds Territories controlled, they may use both normal Action Opportunities that turn, provided at least one is used for a Financier faction action.", "When Treasury value exceeds Territories controlled, they gain 1 additional Action that turn, provided at least one Action is spent on a Financier Faction Action.")
    save(path, text)

    path = "releases/v0.6.1/Gauntlet_v0.6.1_Changelog.md"
    text = load(path)
    bullet = "- **Action terminology:** Distinguished spendable Actions from Action Opportunity timing windows; players may spend at most one Action during each opportunity.\n"
    if bullet not in text:
        anchor = "- **Terminology refinement:**"
        index = text.find(anchor)
        if index < 0:
            raise RuntimeError("changelog terminology anchor missing")
        line_end = text.find("\n", index)
        text = text[:line_end + 1] + bullet + text[line_end + 1:]
    save(path, text)


def migrate_current_player_facing_strings() -> None:
    replacements_by_file = {
        "start/index.html": (
            ("<h3>One action opportunity. One movement. Every advance matters.</h3>", "<h3>One Action. Two opportunities. Every advance matters.</h3>"),
            ("decide when to use your action opportunity", "decide when to spend your Action"),
        ),
        ".github/scripts/conversation_audit_review.py": (
            ("Last Stand|Action Opportunity|Reserve", "Last Stand|Action|Action Opportunity|Reserve"),
        ),
        "src/cards/diplomats.ts": (
            ("without using an Action Opportunity", "without spending an Action"),
        ),
        "src/state/inquisition-leaders.ts": (
            ("without using an Action Opportunity", "without spending an Action"),
        ),
        "card-design/faction-specimens.html": (
            ("without using an Action Opportunity", "without spending an Action"),
        ),
        "src/dev/guided-options.ts": (
            ("for an additional Action Opportunity", "to gain 1 Action and another Action Opportunity"),
        ),
        "src/state/neutral-conscription.ts": (
            ("without using another Action Opportunity", "without spending another Action"),
            ("never spends another Action Opportunity", "never spends another Action"),
        ),
        "src/state/neutral-insurrection.ts": (
            ("and gained an additional Action Opportunity with Insurrection.", "and gained 1 Action and another Action Opportunity with Insurrection."),
        ),
        "src/state/neutral-reinforcements.ts": (
            ("Reinforcements cannot create an additional Action Opportunity now.", "Reinforcements cannot grant an additional Action and Action Opportunity now."),
            ("discarded Reinforcements to take an additional Action Opportunity.", "discarded Reinforcements to gain 1 Action and take another Action Opportunity."),
        ),
    }
    for path, replacements in replacements_by_file.items():
        text = load(path)
        for old, new in replacements:
            if old not in text:
                raise RuntimeError(f"{path}: missing expected text {old!r}")
            text = text.replace(old, new)
        save(path, text)

    path = "src/state/neutral-liberation.ts"
    text = load(path)
    old = "and gained ${copies} additional Action Opportunity${copies === 1 ? '' : 's'} with Liberation after winning a counterattack."
    new = "and gained ${copies} Action${copies === 1 ? '' : 's'} and ${copies} additional Action Opportunity${copies === 1 ? '' : 's'} with Liberation after winning a counterattack."
    text = replace_required(text, old, new, label="Liberation log")
    save(path, text)


def migrate_sleeper_implementation() -> None:
    path = "src/types/intelligence.ts"
    text = load(path)
    text = replace_required(text, "  startOfferTurn?: number;", "  activationOfferKey?: string;", label="Sleeper offer state")
    save(path, text)

    path = "src/state/pipeline.ts"
    text = load(path)
    text = replace_required(text, "  maybeOpenSleeperNetworkStartTurnWindow,", "  maybeOpenSleeperNetworkActionOpportunityWindow,", label="pipeline import")
    text = replace_required(text, "  maybeOpenSleeperNetworkStartTurnWindow(game);", "  maybeOpenSleeperNetworkActionOpportunityWindow(game);", label="pipeline call")
    save(path, text)

    path = "src/state/intelligence-sleeper-network.ts"
    text = load(path)
    import_anchor = "import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';\n"
    imports = (
        "import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';\n"
        "import { insurrectionActionOpportunityActive, consumeInsurrectionActionOpportunity } from './neutral-insurrection';\n"
        "import { liberationActionOpportunityActive, consumeLiberationActionOpportunity } from './neutral-liberation';\n"
        "import { reinforcementsActionOpportunityActive, consumeReinforcementsActionOpportunity } from './neutral-reinforcements';\n"
    )
    text = replace_required(text, import_anchor, imports, label="Sleeper special opportunity imports")
    old_function = """export function maybeOpenSleeperNetworkStartTurnWindow(game: GameState): boolean {
  if (game.phase !== 'turn_start' || hasPendingWindow(game)) return false;
  const playerId = game.activePlayer;
  const state = network(game, playerId);
  if (!state || state.activation || !bankedAssetCardUseAllowed(game, playerId, SLEEPER_NETWORK) || state.bankedTurn >= game.turn || state.startOfferTurn === game.turn) return false;
  state.startOfferTurn = game.turn;
  game.pendingIntelligenceChoice = {
    kind: 'sleeper_network_activate',
    playerId,
    options: ['pass', 'activate'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}
"""
    new_function = """export function maybeOpenSleeperNetworkActionOpportunityWindow(game: GameState): boolean {
  if ((game.phase !== 'action_before_movement' && game.phase !== 'action_after_movement') || hasPendingWindow(game)) return false;
  const playerId = game.activePlayer;
  const player = game.players[playerId];
  const state = network(game, playerId);
  const offerKey = `${game.turn}:${game.phase}`;
  if (game.priorityPlayer !== playerId
    || player.actionsRemaining < 1
    || !state
    || state.activation
    || !bankedAssetCardUseAllowed(game, playerId, SLEEPER_NETWORK)
    || state.bankedTurn >= game.turn
    || state.activationOfferKey === offerKey) return false;
  state.activationOfferKey = offerKey;
  game.pendingIntelligenceChoice = {
    kind: 'sleeper_network_activate',
    playerId,
    options: ['pass', 'activate'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  return true;
}
"""
    text = replace_required(text, old_function, new_function, label="Sleeper activation window")
    helper_anchor = "function beginActivation(game: GameState, playerId: PlayerID, resumePriorityPlayer?: PlayerID): void {\n"
    helper = """function consumeActivationAction(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  if (game.activePlayer !== playerId
    || game.priorityPlayer !== playerId
    || (game.phase !== 'action_before_movement' && game.phase !== 'action_after_movement')
    || player.actionsRemaining < 1) {
    throw new SleeperNetworkError('Sleeper Network must be used by spending an Action during an Action Opportunity.');
  }
  player.actionsRemaining -= 1;
  player.hasPlayedActionThisTurn = true;
  if (reinforcementsActionOpportunityActive(game, playerId)) {
    consumeReinforcementsActionOpportunity(game, playerId);
  } else if (insurrectionActionOpportunityActive(game, playerId)) {
    consumeInsurrectionActionOpportunity(game, playerId);
  } else if (liberationActionOpportunityActive(game, playerId)) {
    consumeLiberationActionOpportunity(game, playerId);
  }
}

""" + helper_anchor
    text = replace_required(text, helper_anchor, helper, label="Sleeper consume Action helper")
    text = replace_required(
        text,
        "    if (action.choice !== 'activate') throw new SleeperNetworkError('Choose whether to activate Sleeper Network.');\n    beginActivation(game, action.playerId, pending.resumePriorityPlayer);",
        "    if (action.choice !== 'activate') throw new SleeperNetworkError('Choose whether to activate Sleeper Network.');\n    consumeActivationAction(game, action.playerId);\n    beginActivation(game, action.playerId, pending.resumePriorityPlayer);",
        label="Sleeper activation cost",
    )
    text = replace_if_present(text, "placed a card face down beneath Sleeper Network", "bound a card face down to Sleeper Network")
    text = replace_if_present(text, "placed ${cardId} face down beneath Sleeper Network", "bound ${cardId} face down to Sleeper Network")
    text = replace_if_present(text, "banked Sleeper Network with one hidden card", "banked Sleeper Network with one hidden bound card")
    text = replace_if_present(text, "from beneath Sleeper Network", "bound to Sleeper Network")
    text = replace_if_present(text, "the cards beneath it", "its bound cards")
    text = replace_if_present(text, "card beneath Sleeper Network", "card bound to Sleeper Network")
    save(path, text)

    path = "src/state/intelligence-sleeper-network.test.ts"
    text = load(path)
    old = """  it('offers activation before the normal turn-start draw on a later turn', () => {
    const state = bankNetwork(game());
    state.turn = 3;
    state.phase = 'turn_start';
    state.activePlayer = 'player_1';
    state.priorityPlayer = 'player_1';

    runPostActionAutomationPipeline(state);

    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_activate',
      playerId: 'player_1',
    });
    expect(() => applyGameAction(state, { type: 'draw_card', playerId: 'player_1' })).toThrow(/pending Intelligence choice/i);
  });

  it('activates into a legal Action queue and preserves the turn Action Opportunity', () => {
    let state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('card-valor');
    state.turn = 3;
    state.phase = 'turn_start';
    state.players.player_1.actionsRemaining = 1;
    runPostActionAutomationPipeline(state);
"""
    new = """  it('offers activation during an Action Opportunity on a later turn', () => {
    const state = bankNetwork(game());
    state.turn = 3;
    state.phase = 'turn_start';
    state.activePlayer = 'player_1';
    state.priorityPlayer = 'player_1';

    runPostActionAutomationPipeline(state);
    expect(state.pendingIntelligenceChoice).toBeUndefined();

    state.phase = 'action_before_movement';
    runPostActionAutomationPipeline(state);
    expect(state.pendingIntelligenceChoice).toMatchObject({
      kind: 'sleeper_network_activate',
      playerId: 'player_1',
    });
  });

  it('spends one Action to activate and resolves the bound Action queue without further Actions', () => {
    let state = bankNetwork(game());
    state.players.player_1.intelligence!.sleeperNetwork!.cards.push('card-valor');
    state.turn = 3;
    state.phase = 'action_before_movement';
    state.players.player_1.actionsRemaining = 1;
    runPostActionAutomationPipeline(state);
"""
    text = replace_required(text, old, new, label="Sleeper activation tests")
    text = replace_required(text, "    expect(state.phase).toBe('turn_start');\n    expect(state.players.player_1.actionsRemaining).toBe(1);\n    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(false);", "    expect(state.phase).toBe('action_before_movement');\n    expect(state.players.player_1.actionsRemaining).toBe(0);\n    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(true);", label="Sleeper Action assertions")
    text = text.replace("    state.phase = 'turn_start';\n    runPostActionAutomationPipeline(state);\n    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'activate' }).state;", "    state.phase = 'action_before_movement';\n    state.players.player_1.actionsRemaining = 1;\n    runPostActionAutomationPipeline(state);\n    state = applyGameAction(state, { type: 'resolve_intelligence_choice', playerId: 'player_1', choice: 'activate' }).state;", 1)
    save(path, text)


def migrate_tests_and_validation() -> None:
    path = "scripts/validate_v061_rulebook_content.py"
    text = load(path)
    text = replace_required(text, '"Action Opportunity": "### Action Opportunity",', '"Action Opportunity": "### Actions and Action Opportunities",', label="rulebook validator marker")
    save(path, text)

    path = "tests/player-facing-terminology.test.ts"
    text = load(path)
    insertion = """

  it("distinguishes Action costs from Action Opportunity timing", () => {
    expect(combined).not.toMatch(/without using (?:another |an )?Action Opportunit(?:y|ies)/i);
    expect(combined).not.toMatch(/(?:uses|using) (?:one|an) Action Opportunity/i);
    expect(combined).toMatch(/No more than 1 Action may be spent during the same Action Opportunity/i);
  });
"""
    anchor = "  it(\"describes Purge through use of Action Opportunities, not performance\", () => {\n    expect(combined).not.toMatch(/\\bPurge may be performed\\b/i);\n  });"
    text = replace_required(text, anchor, anchor + insertion, label="terminology tests")
    save(path, text)


def main() -> None:
    migrate_rulebook()
    migrate_neutral_and_territories()
    migrate_financiers()
    migrate_inquisition()
    migrate_intelligence()
    migrate_mystics()
    migrate_simple_faction_language()
    migrate_style_and_supporting_docs()
    migrate_current_player_facing_strings()
    migrate_sleeper_implementation()
    migrate_tests_and_validation()
    print("Applied Action/Action Opportunity and binding migration.")


if __name__ == "__main__":
    main()
