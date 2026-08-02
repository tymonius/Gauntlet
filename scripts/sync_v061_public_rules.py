#!/usr/bin/env python3
"""Synchronize public v0.6.1 website and printable-reference rules copy.

The governing rulebook and faction guides remain authoritative. This script keeps
independent onboarding pages, faction summaries, Deckbuilder leader data, and
supplemental print references aligned with the current Action / Action
Opportunity model, binding rules, and recent faction adjustments.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SyncError(RuntimeError):
    pass


def replace_exact(path: str, old: str, new: str, *, all_occurrences: bool = False) -> bool:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if new in text and old not in text:
        return False
    if old not in text:
        raise SyncError(f"Missing synchronization marker in {path}: {old[:100]!r}")
    updated = text.replace(old, new) if all_occurrences else text.replace(old, new, 1)
    target.write_text(updated, encoding="utf-8")
    return True


def apply_replacements() -> list[str]:
    changed: set[str] = set()

    replacements: dict[str, list[tuple[str, str, bool]]] = {
        "start/index.html": [
            (
                '<article class="intro-card"><span>01</span><h3>Cards and zones</h3><p>Your <strong>hand</strong> is private. Your <strong>draw pile</strong> supplies cards; your <strong>discard pile</strong> can be recycled; your <strong>graveyard</strong> normally cannot. Face-up assets remain in your <strong>asset bank</strong>.</p><p>Cards may have an <strong>action</strong>, <strong>gambit</strong>, <strong>tactic</strong>, or flexible <strong>battle</strong> effect. An action is played from hand during your action opportunity. Gambits and tactics are committed during battle.</p></article>',
                '<article class="intro-card"><span>01</span><h3>Cards and zones</h3><p>Your <strong>Hand</strong> is private. Your <strong>Draw Pile</strong> supplies cards; your <strong>Discard Pile</strong> can be recycled; your <strong>Graveyard</strong> normally cannot. Face-up Assets remain in your <strong>Asset Bank</strong>.</p><p>Cards may have an <strong>Action</strong>, <strong>Gambit</strong>, <strong>Tactic</strong>, or flexible <strong>Battle</strong> effect. An Action is normally played from Hand by spending 1 Action during an Action Opportunity. Gambits are set from Hand; Tactics are chosen from Reserve.</p></article>',
                False,
            ),
            (
                '<article class="intro-card"><span>03</span><h3>Your turn</h3><ol><li><strong>Capture:</strong> capture enemy ground you still occupy from the previous turn.</li><li><strong>Draw:</strong> draw one card.</li><li><strong>Action before movement:</strong> use your action opportunity now or save it.</li><li><strong>Movement:</strong> advance, hold, or withdraw; resolve any battle immediately.</li><li><strong>Action after movement:</strong> use the opportunity here if you saved it.</li><li><strong>Cleanup:</strong> resolve end-of-turn effects and discard down to three cards in hand.</li></ol></article>',
                '<article class="intro-card"><span>03</span><h3>Your turn</h3><ol><li><strong>Capture:</strong> capture enemy ground you still occupy from the previous turn.</li><li><strong>Draw:</strong> draw one card.</li><li><strong>Action Opportunity before movement:</strong> spend up to 1 available Action now, or save it.</li><li><strong>Movement:</strong> advance, hold, or withdraw; resolve any battle immediately.</li><li><strong>Action Opportunity after movement:</strong> spend up to 1 available Action.</li><li><strong>Cleanup:</strong> resolve end-of-turn effects and discard down to three cards in Hand.</li></ol></article>',
                False,
            ),
            (
                '<article class="intro-card"><span>04</span><h3>Actions and assets</h3><p>During your action opportunity, play one card for its action or use a faction action that explicitly consumes the opportunity. Most one-time actions go to the discard pile.</p><p>Some cards become assets and remain in play. Your normal asset limit equals the number of territories you control.</p></article>',
                '<article class="intro-card"><span>04</span><h3>Actions and Assets</h3><p>During an Action Opportunity, spend 1 Action to play one card for its Action effect or use a Faction Action. Most one-time Action effects put their cards in the Discard Pile.</p><p>Some cards become Assets and remain in play. Your normal Asset limit equals the number of Territories you control.</p></article>',
                False,
            ),
            (
                '<article class="intro-card sequence-card"><span>06</span><h3>Battle sequence</h3><ol><li>Resolve effects that happen as the battle opens.</li><li>Each player may set one eligible hand card as a face-down gambit.</li><li>Set hands aside and draw three cards as each player\'s private reserve.</li><li>Reveal and resolve gambits.</li><li>Each player may choose one eligible reserve card as a face-down tactic.</li><li>Reveal and resolve tactics.</li><li>Roll dice and determine the higher battle total.</li><li>Resolve the aftermath.</li></ol><p>When totals tie while the defender controls the contested territory, Defender\'s Advantage means the defender wins.</p></article>',
                '<article class="intro-card sequence-card"><span>06</span><h3>Battle sequence</h3><ol><li>Resolve effects that happen as the battle opens.</li><li>Each player may set one eligible Hand card as a face-down Gambit.</li><li>Set Hands aside and draw three cards as each player\'s private Reserve.</li><li>Reveal and resolve Gambits.</li><li>Each player may choose one eligible Reserve card as a face-down Tactic.</li><li>Reveal and resolve Tactics.</li><li>Roll dice and determine the higher battle total.</li><li>Resolve the Aftermath.</li></ol><p>When totals tie while the defender controls the contested Territory, Defender\'s Advantage means the defender wins.</p></article>',
                False,
            ),
            (
                '<article class="intro-card"><span>07</span><h3>Aftermath</h3><p>The loser retreats. The winner takes or keeps the contested position. Gambits normally enter the graveyard; tactics and unused reserve cards normally enter the discard pile.</p><p>Return each player\'s permanent hand after the temporary battle cards have gone to their proper zones.</p></article>',
                '<article class="intro-card"><span>07</span><h3>Aftermath</h3><p>The loser retreats. The winner takes or keeps the contested position. Gambits normally enter the Graveyard; Tactics and cards remaining in Reserve normally enter the Discard Pile.</p><p>Return each player\'s permanent Hand after the temporary battle cards have been cleared.</p></article>',
                False,
            ),
        ],
        "playtest/onboarding/index.html": [
            (
                '<li><strong>Action:</strong> play from Hand during an Action Opportunity.</li>',
                '<li><strong>Action:</strong> normally play from Hand by spending 1 Action during an Action Opportunity.</li>',
                False,
            ),
            (
                '<p>An <strong>Action Opportunity</strong> is the point during your turn when you may play one card for its Action effect or perform a rule or faction action that explicitly uses that opportunity.</p>',
                '<p>An <strong>Action</strong> is a spendable allowance; you normally have 1 each turn. An <strong>Action Opportunity</strong> is a timing window when you may spend up to 1 available Action. A normal turn has one before movement and one after movement.</p>',
                False,
            ),
            (
                '<li><strong>Action before movement:</strong> use your one normal Action Opportunity now, or save it.</li>',
                '<li><strong>Action Opportunity before movement:</strong> spend up to 1 available Action now, or save it.</li>',
                False,
            ),
            (
                '<li><strong>Action after movement:</strong> use the Action Opportunity here if you did not use it before movement.</li>',
                '<li><strong>Action Opportunity after movement:</strong> spend up to 1 available Action.</li>',
                False,
            ),
            (
                '<p>During your Action Opportunity, play one card for its Action effect or use a faction action. Most one-time Actions go to the Discard Pile. Some cards become <strong>Assets</strong>, which stay in play and provide later effects.</p>',
                '<p>During an Action Opportunity, spend 1 Action to play one card for its Action effect or use a Faction Action. Most one-time Action effects put their cards in the Discard Pile. Some cards become <strong>Assets</strong>, which stay in play and provide later effects.</p>',
                False,
            ),
            (
                '<p>During the Aftermath, the loser retreats, the winner takes or keeps the contested position, and battle cards go to their normal destinations. Gambits normally go to the Graveyard. Tactics and unused Reserve cards normally go to the Discard Pile.</p>',
                '<p>During the Aftermath, the loser retreats and the winner takes or keeps the contested position. Gambits normally go to the Graveyard. Tactics and cards remaining in Reserve normally go to the Discard Pile.</p>',
                False,
            ),
        ],
        "playtest/player-mat/index.html": [
            (
                '<div class="zone-heading"><h3>Turn Reminder</h3><span>One normal Action Opportunity</span></div>',
                '<div class="zone-heading"><h3>Turn Reminder</h3><span>1 Action · two normal Action Opportunities</span></div>',
                False,
            ),
            (
                '<li>Action before movement <em>or</em></li>',
                '<li>Action Opportunity before movement</li>',
                False,
            ),
            (
                '<li>Action after movement</li>',
                '<li>Action Opportunity after movement</li>',
                False,
            ),
            (
                '<p>A battle ends the movement that started it. Move afterward only when a rule or effect permits it.</p>',
                '<p>Normally begin with 1 Action. Spend at most 1 during each opportunity; unspent Actions expire at turn end. A battle ends the movement that started it.</p>',
                False,
            ),
        ],
        "factions/inquisition/index.html": [
            (
                '<article><span>02</span><h3>Condemnation and Purge</h3><p>Condemnation changes normal Tactic cleanup. Purge spends Conviction at an Action Opportunity for escalating forms of permanent removal. On your turn, using one Action Opportunity to Purge lets you use the other normal Action Opportunity as well; you may perform no more than one Purge through Action Opportunities that turn.</p></article>',
                '<article><span>02</span><h3>Condemnation and Purge</h3><p>Condemnation changes normal Tactic cleanup. During an Action Opportunity, spend 1 Action and Conviction to Purge. The first Action spent to Purge each turn grants 1 additional Action that turn; at most 1 Action may be spent on Purge each turn.</p></article>',
                False,
            ),
            (
                '<div class="ability-summary"><strong>Leader ability</strong><p>Final Judgment: once per turn after winning a battle, Purge immediately without an Action Opportunity and reduce its Conviction cost by 1, to a minimum of 1. This Purge is separate from the Action-Opportunity Purge limit.</p></div>',
                '<div class="ability-summary"><strong>Leader ability</strong><p>Final Judgment: once per turn during the Aftermath of a battle you won, after battle cards are cleared, immediately Purge without spending an Action and reduce its Conviction cost by 1, to a minimum of 1. This neither grants the additional Action nor counts against the limit on Actions spent to Purge.</p></div>',
                False,
            ),
            (
                '<div class="ability-summary"><strong>Leader ability</strong><p>Relentless Pursuit: once per turn after an opponent loses a battle they initiated against you, spend 2 Conviction to end their turn, advance, and resolve any new battle immediately.</p></div>',
                '<div class="ability-summary"><strong>Leader ability</strong><p>Relentless Pursuit: once per turn, at the end of the Aftermath of a battle an opponent initiated against you and lost, spend 2 Conviction to end their turn and move one position toward their end. Any battle begins with you as attacker; no Action Opportunity occurs first.</p></div>',
                False,
            ),
        ],
        "factions/intelligence/index.html": [
            (
                '<div class="ability-summary"><strong>Leader ability</strong><p>Mission Control: once per turn, after completing a normal Mission, immediately start another eligible Mission from hand without using an Action Opportunity.</p></div>',
                '<div class="ability-summary"><strong>Leader ability</strong><p>Mission Control: once per turn, after completing a normal Mission, immediately start another eligible Mission from Hand without spending an Action. It cannot complete that turn and cannot be a Special Operation.</p></div>',
                False,
            ),
        ],
        "factions/financiers/index.html": [
            (
                '<article><span>01</span><h3>Capital and Treasury</h3><p>Place cards face up in Treasury to raise your Capital limit. Capital may exceed that limit temporarily, but excess is lost at the end of the turn.</p></article>\n        <article><span>02</span><h3>Deeds and income</h3><p>Buy Deeds independently of Territory control. The more Deeds you own, the more income you gain—and the more expensive the next purchase becomes.</p></article>\n        <article><span>03</span><h3>Play the Market and Subsidize</h3><p>Risk a card for variable Capital, or spend Capital before battle dice are rolled to increase your battle total.</p></article>',
                '<article><span>01</span><h3>Capital and Treasury</h3><p>Place cards face up in Treasury to raise your Capital limit. Capital may exceed that limit temporarily, but excess is lost at the end of the turn.</p></article>\n        <article><span>02</span><h3>Financial Capacity</h3><p>After the Capture step, if Treasury value exceeds Territories controlled, gain 1 additional Action that turn. If you spend both Actions, at least one must be spent on a Financier Faction Action.</p></article>\n        <article><span>03</span><h3>Deeds and leverage</h3><p>Buy Deeds independently of Territory control, risk cards through Play the Market, and spend Capital through Subsidize. Each owned Deed also produces income.</p></article>',
                False,
            ),
            (
                '<div class="ability-summary"><strong>Leader ability</strong><p>Hostile Takeover: after winning onto an enemy-controlled Territory, buy its Deed during the after-movement Action Opportunity; a successful purchase immediately takes control.</p></div>',
                '<div class="ability-summary"><strong>Leader ability</strong><p>Hostile Takeover: during an Action Opportunity after movement, after winning as the attacker that turn and becoming the occupier of that enemy Territory, spend 1 Action to buy or buy out its Deed. A successful purchase immediately gives you control.</p></div>',
                False,
            ),
        ],
        "factions/mystics/index.html": [
            (
                '<article><span>02</span><h3>Invocation</h3><p>After the first Rite, once per turn when you use an Arcane card, move one card from your Graveyard to your Discard Pile.</p></article>',
                '<article><span>02</span><h3>Invocation</h3><p>After the first Rite, once per turn after an Arcane card you played, set, or chose applies its effect, move one card from your Graveyard to your Discard Pile.</p></article>',
                False,
            ),
            (
                '<article><span>03</span><h3>Transmutation</h3><p>After the second Rite, once per turn before battle dice, sacrifice a card from hand and add its deckbuilding value to your battle total.</p></article>',
                '<article><span>03</span><h3>Transmutation</h3><p>After the second Rite, once per turn before battle dice, put one card from Hand in your Graveyard and add its value to your battle total.</p></article>',
                False,
            ),
            (
                '<p>The Spirit Walker can sacrifice an Arcane card to protect a begun Rite from the first battle-loss interruption of the turn.</p>',
                '<p>The Spirit Walker can sacrifice an Arcane card of sufficient value to protect a begun Rite or Ritual from the first battle-loss interruption of the turn.</p>',
                False,
            ),
            (
                '<div class="ability-summary"><strong>Leader ability</strong><p>Guardians of the Circle: after the first qualifying loss on your turn, sacrifice an Arcane card to keep the Rite from being interrupted.</p></div>',
                '<div class="ability-summary"><strong>Leader ability</strong><p>Guardians of the Circle: the first time on your turn that a battle loss would interrupt a begun Rite or Ritual, put an Arcane card from Hand in your Graveyard whose value is at least 1 plus your completed Rites to prevent that interruption.</p></div>',
                False,
            ),
        ],
        "start/app.js": [
            (
                'summary: "Convert Capital, Treasury cards, Deeds, leverage, and ownership into strategic power."',
                'summary: "Convert Capital, Treasury cards, Financial Capacity, Deeds, leverage, and ownership into strategic power."',
                False,
            ),
            (
                '{ id: "spirit-walker", name: "Spirit Walker", summary: "Advance ritual progression through invocation and spiritual momentum." }',
                '{ id: "spirit-walker", name: "Spirit Walker", summary: "Protect begun Rites and the Ritual by sacrificing Arcane cards of sufficient value." }',
                False,
            ),
        ],
        "deckbuilder/app.js": [
            (
                '["Condemnation", "Opposing played Tactics go to the Graveyard after battles involving you instead of discard."]',
                '["Condemnation", "Opposing Tactics go to the Graveyard during the Aftermath instead of the Discard Pile."]',
                True,
            ),
            (
                '["Final Judgment", "Once per turn after you win a battle, Purge immediately without using the Action opportunity and reduce its Conviction cost by 1, minimum 1."]',
                '["Final Judgment", "Once per turn during the Aftermath of a battle you won, after battle cards are cleared, Purge without spending an Action and reduce its Conviction cost by 1, minimum 1."]',
                False,
            ),
            (
                '["Capital limit", "Territories you control plus the total value of cards in your Treasury."],\n          ["Treasury", "Instead of playing an Action card after movement, place one card from hand face up in Treasury."]',
                '["Capital limit", "Territories you control plus the total card value in your Treasury."],\n          ["Financial Capacity", "After the Capture step, if Treasury value exceeds Territories controlled, gain 1 additional Action that turn; if both Actions are spent, one must be spent on a Financier Faction Action."],\n          ["Treasury", "During an Action Opportunity after movement, spend 1 Action to place one card from Hand face up in Treasury."]',
                True,
            ),
            (
                '["Hostile Takeover", "After winning a battle that caused you to occupy enemy Territory, use the after-movement Action opportunity to buy that Deed at occupied cost; success immediately gives you control."]',
                '["Hostile Takeover", "During an Action Opportunity after movement, after winning as the attacker and becoming the occupier of that enemy Territory, spend 1 Action to buy or buy out its Deed; success immediately gives you control."]',
                False,
            ),
            (
                '["Surveillance", "Once per battle, spend 1 Intel to look at one opposing face-down Battle card when it is committed or selected."]',
                '["Surveillance", "Once during the Gambit stage and once during the Tactic stage each battle, spend 1 Intel per opposing face-down card revealed."]',
                True,
            ),
            (
                '["Mission Control", "Once per turn after completing a normal Mission, immediately start another Mission from hand without using the Action opportunity. It cannot complete that turn or be the Special Operation."]',
                '["Mission Control", "Once per turn after completing a normal Mission, immediately start another eligible Mission from Hand without spending an Action. It cannot complete that turn or be the Special Operation."]',
                False,
            ),
            (
                'errors.push(`Remove ${pointTotal - 60} deckbuilding value.`);',
                'errors.push(`Remove ${pointTotal - 60} value.`);',
                False,
            ),
        ],
        "deckbuilder/completed-factions.js": [
            (
                '["Capital limit", "Territories you control plus the total deckbuilding value of cards in your Treasury."],\n            ["Treasury", "During an Action Opportunity after movement, place one card from Hand in Treasury instead of playing a card for its Action effect."]',
                '["Capital limit", "Territories you control plus the total card value in your Treasury."],\n            ["Financial Capacity", "After the Capture step, if Treasury value exceeds Territories controlled, gain 1 additional Action that turn; if both Actions are spent, one must be spent on a Financier Faction Action."],\n            ["Treasury", "During an Action Opportunity after movement, spend 1 Action to place one card from Hand face up in Treasury."]',
                True,
            ),
            (
                '["Hostile Takeover", "During an Action Opportunity after movement, after winning as attacker and occupying that enemy Territory, buy or buy out its Deed at occupied cost; success gives immediate control."]',
                '["Hostile Takeover", "During an Action Opportunity after movement, after winning as the attacker and becoming the occupier of that enemy Territory, spend 1 Action to buy or buy out its Deed; success gives immediate control."]',
                False,
            ),
            (
                '["Mission Control", "Once per turn after completing a normal Mission, start another normal Mission from Hand without using an Action Opportunity. It cannot complete that turn."]',
                '["Mission Control", "Once per turn after completing a normal Mission, start another eligible Mission from Hand without spending an Action. It cannot complete that turn and cannot be a Special Operation."]',
                False,
            ),
            (
                '["Rites", "Begin one incomplete Rite during an Action Opportunity after movement. A Rite cannot complete on the turn it begins."]',
                '["Rites", "During an Action Opportunity after movement, spend 1 Action to begin one incomplete Rite. It cannot complete that turn."]',
                True,
            ),
            (
                '["Guardians of the Circle", "The first time on your turn a battle loss would interrupt a begun Rite, put one Arcane card from Hand in your Graveyard to prevent that interruption."]',
                '["Guardians of the Circle", "The first time on your turn a battle loss would interrupt a begun Rite or Ritual, put one Arcane card from Hand in your Graveyard whose value is at least 1 plus your completed Rites to prevent that interruption."]',
                False,
            ),
            (
                '["Blasphemy", "Gain 1 Conviction when an opposing Arcane Action is played or an opposing Arcane Gambit or Tactic is revealed."]',
                '["Blasphemy", "Gain 1 Conviction when an opponent plays an Arcane card for its Action effect or an opposing Arcane Gambit or Tactic is revealed."]',
                True,
            ),
            (
                '["Final Judgment", "Once per turn after cards follow their destinations in a battle you won, Purge immediately without an Action Opportunity and reduce its cost by 1, minimum 1."]',
                '["Final Judgment", "Once per turn during the Aftermath of a battle you won, after battle cards are cleared, Purge without spending an Action and reduce its cost by 1, minimum 1."]',
                False,
            ),
        ],
        "deckbuilder/v061-supplementals.js": [
            (
                'accepted: "Each player may bank one eligible card from Hand as an Asset without using an Action Opportunity. Then both players withdraw.", refused: "During the Aftermath, you may bank one eligible card from Hand as an Asset without using an Action Opportunity."',
                'accepted: "Each player may bank one eligible card from Hand as an Asset without spending an Action. Then both players withdraw.", refused: "During the Aftermath, you may bank one eligible card from Hand as an Asset without spending an Action."',
                False,
            ),
            (
                '{ label: "Capital", text: "Minimum 0. Limit = Territories you control + total deckbuilding value in Treasury. Excess is reduced at the end of every turn, including an opponent\'s turn." },',
                '{ label: "Capital & Capacity", text: "Minimum 0. Limit = Territories controlled + total card value in Treasury; reduce excess at the end of every turn. After Capture effects, if Treasury value exceeds Territories controlled, gain 1 additional Action that turn; if both Actions are spent, one must be a Financier Faction Action." },',
                False,
            ),
            (
                '{ label: "Treasury", text: "During an Action Opportunity after movement, instead of playing an Action, place one Hand card face up in Treasury. Treasury is outside normal zones and is not the Asset Bank." },',
                '{ label: "Treasury", text: "During an Action Opportunity after movement, spend 1 Action to place one Hand card face up in Treasury. Treasury is outside normal zones and is not the Asset Bank." },',
                False,
            ),
            (
                '{ label: "Start", text: "During an Action Opportunity after movement, instead of playing an Action, place one eligible Hand card face down as the Active Mission. Only one; it cannot complete that turn." },',
                '{ label: "Start", text: "During an Action Opportunity after movement, spend 1 Action to place one eligible Hand card face down as the Active Mission. Only one; it cannot complete that turn." },',
                False,
            ),
            (
                '{ label: "Complete", text: "During a later after-movement Action Opportunity, reveal a satisfied Active Mission. Gain 1 Operation Progress and Intel equal to its value, then put it in the Discard Pile." },',
                '{ label: "Complete", text: "During a later after-movement Action Opportunity, spend 1 Action to reveal a satisfied Active Mission. Gain 1 Operation Progress and Intel equal to its value, then put it in the Discard Pile." },',
                False,
            ),
            (
                '{ label: "Abort or fail", text: "Abort during an after-movement Action Opportunity by revealing it and spending Intel equal to its value; discard it. A failed Mission is revealed and put in the Graveyard." },',
                '{ label: "Abort or fail", text: "During an after-movement Action Opportunity, spend 1 Action, reveal the Active Mission, and spend Intel equal to its value to abort it; discard it. A failed Mission is revealed and put in the Graveyard." },',
                False,
            ),
            (
                '{ label: "Special Operation", text: "Progress must exceed opposing controlled Territories. Start an eligible card face down. Maintain readiness, satisfy its requirement, then pay Territories in the Gauntlet minus card value, minimum 1 Intel, to win." }',
                '{ label: "Special Operation", text: "Progress must exceed opposing controlled Territories. Spend 1 Action after movement to start an eligible card face down. Later, while ready and satisfied, spend 1 Action after movement and pay Territories in the Gauntlet minus card value, minimum 1 Intel, to win." }',
                False,
            ),
            (
                '{ label: "Begin a Rite", text: "During an Action Opportunity after movement, instead of playing an Action, pay one incomplete Rite\'s beginning cost. Only one begun Rite; it cannot complete that turn; complete at most one per turn." },',
                '{ label: "Begin a Rite", text: "During an Action Opportunity after movement, spend 1 Action and pay one incomplete Rite\'s beginning cost. Only one begun Rite; it cannot complete that turn; complete at most one per turn." },',
                False,
            ),
            (
                '{ label: "Transmutation", text: "Once per turn before dice, put one Hand card in your Graveyard and add its deckbuilding value to your battle total. It is not played and its effects do not resolve." },',
                '{ label: "Transmutation", text: "Once per turn before dice, put one Hand card in your Graveyard and add its value to your battle total. It is not played and its effects do not resolve." },',
                False,
            ),
            (
                '{ label: "Bound cards", text: "Bound cards are outside normal zones and move only as instructed. If their binding ends without a destination, put them in their owner\'s Graveyard." }',
                '{ label: "Bound cards", text: "Bound cards are outside normal zones and move only as instructed. If a Rite or Ritual binding ends without another instruction, put those bound cards in their owners\' Graveyards." }',
                False,
            ),
            (
                'intro: "During an Action Opportunity, instead of playing a card for its Action effect, spend Conviction to choose one:"',
                'intro: "During an Action Opportunity, spend 1 Action and Conviction to choose one:"',
                False,
            ),
            (
                'reminder: "Final Judgment: Once per turn during the Aftermath of a battle the Grand Inquisitor won, after card destinations, Purge without an Action Opportunity and reduce the cost by 1, minimum 1."',
                'reminder: "The first Action spent to Purge each turn grants 1 additional Action; spend at most 1 Action on Purge each turn. Final Judgment: once per turn during the Aftermath of a battle the Grand Inquisitor won, after battle cards are cleared, Purge without spending an Action and reduce the cost by 1, minimum 1."',
                False,
            ),
            (
                'Supplemental reference — no deckbuilding value',
                'Supplemental reference — not a Playable Deck card',
                True,
            ),
        ],
        "deckbuilder/starter-decks.json": [
            (
                '"firstGameTip": "Place cards you can afford to delay in Treasury, then use Line of Credit or Liquidation to buy Deeds before your opponent expects it. Do not spend all Capital on battle bonuses."',
                '"firstGameTip": "Place cards you can afford to delay in Treasury. When Treasury value exceeds Territories controlled, Financial Capacity grants an additional Action; use Line of Credit or Liquidation to convert that tempo into Deeds."',
                False,
            ),
            (
                '"firstGameTip": "Save enough Capital or collateral to use Hostile Takeover after a successful attack. The deck is strongest when movement, battle, and acquisition happen in one turn."',
                '"firstGameTip": "Build Treasury value above your controlled Territories when possible so Financial Capacity can fund setup before movement and Hostile Takeover after a successful attack."',
                False,
            ),
            (
                '"firstGameTip": "Begin a Rite only when you can defend its requirement. Keep an Arcane card in hand while a battle loss could interrupt it so Guardians of the Circle remains available."',
                '"firstGameTip": "Keep an Arcane card in Hand whose value is at least 1 plus your completed Rites while a battle loss could interrupt a begun Rite or the Ritual."',
                False,
            ),
            (
                '"firstGameTip": "Use early Conviction to remove recyclable cards from the opponent\'s Discard Pile. After a battle win, Final Judgment makes even a low-cost Purge efficient."',
                '"firstGameTip": "The first Action you spend on Purge grants an additional Action that turn. Final Judgment is free, discounted, and separate, but does not grant that additional Action."',
                False,
            ),
        ],
    }

    for path, items in replacements.items():
        for old, new, all_occurrences in items:
            if replace_exact(path, old, new, all_occurrences=all_occurrences):
                changed.add(path)

    footer_replacements = {
        "deckbuilder/faction-components.js": [
            ("No deckbuilding value", "Not a Playable Deck card"),
        ],
        "deckbuilder/print.js": [
            ("Supplemental reference — no deckbuilding value", "Supplemental reference — not a Playable Deck card"),
            ("Supplemental tracker — no deckbuilding value", "Supplemental tracker — not a Playable Deck card"),
            ("Shared supplemental card — no deckbuilding value", "Shared supplemental card — not a Playable Deck card"),
            ("Pair with the incomplete side · no deckbuilding value", "Pair with the incomplete side · not a Playable Deck card"),
            ("Flip when complete · no deckbuilding value", "Flip when complete · not a Playable Deck card"),
        ],
        "faction-sheets/v061-runtime.js": [
            ("Supplemental reference — no deckbuilding value", "Supplemental reference — not a Playable Deck card"),
            ("Supplemental tracker — no deckbuilding value", "Supplemental tracker — not a Playable Deck card"),
            ("Supplemental ledger — no deckbuilding value", "Supplemental ledger — not a Playable Deck card"),
            ("Shared supplemental card — no deckbuilding value", "Shared supplemental card — not a Playable Deck card"),
            ("Pair with the incomplete side · no deckbuilding value", "Pair with the incomplete side · not a Playable Deck card"),
            ("Flip when complete · no deckbuilding value", "Flip when complete · not a Playable Deck card"),
        ],
        "faction-sheets/v061-release-runtime.js": [
            ("Supplemental reference — no deckbuilding value", "Supplemental reference — not a Playable Deck card"),
            ("Supplemental tracker — no deckbuilding value", "Supplemental tracker — not a Playable Deck card"),
            ("Supplemental ledger — no deckbuilding value", "Supplemental ledger — not a Playable Deck card"),
            ("Shared supplemental card — no deckbuilding value", "Shared supplemental card — not a Playable Deck card"),
            ("Pair with the incomplete side · no deckbuilding value", "Pair with the incomplete side · not a Playable Deck card"),
            ("Flip when complete · no deckbuilding value", "Flip when complete · not a Playable Deck card"),
        ],
    }

    for path, items in footer_replacements.items():
        for old, new in items:
            if replace_exact(path, old, new, all_occurrences=True):
                changed.add(path)

    return sorted(changed)


def validate() -> list[str]:
    errors: list[str] = []
    public_paths = [
        "start/index.html",
        "playtest/onboarding/index.html",
        "playtest/player-mat/index.html",
        "factions/inquisition/index.html",
        "factions/intelligence/index.html",
        "factions/financiers/index.html",
        "factions/mystics/index.html",
        "start/app.js",
        "deckbuilder/app.js",
        "deckbuilder/completed-factions.js",
        "deckbuilder/v061-supplementals.js",
        "deckbuilder/faction-components.js",
        "deckbuilder/print.js",
        "faction-sheets/v061-runtime.js",
        "faction-sheets/v061-release-runtime.js",
    ]
    combined = "\n".join((ROOT / path).read_text(encoding="utf-8") for path in public_paths)

    forbidden = [
        "without using an Action Opportunity",
        "without using the Action opportunity",
        "without an Action Opportunity",
        "instead of playing an Action",
        "instead of playing a card for its Action effect, spend Conviction",
        "deckbuilding value",
        "One normal Action Opportunity",
        "after card destinations",
    ]
    for phrase in forbidden:
        if phrase.lower() in combined.lower():
            errors.append(f"Obsolete public wording remains: {phrase}")

    required = [
        "1 Action · two normal Action Opportunities",
        "The first Action spent to Purge each turn grants 1 additional Action",
        "Financial Capacity",
        "without spending an Action",
        "value is at least 1 plus your completed Rites",
        "If a Rite or Ritual binding ends without another instruction",
        "Supplemental reference — not a Playable Deck card",
    ]
    for phrase in required:
        if phrase not in combined:
            errors.append(f"Required public wording is missing: {phrase}")

    return errors


def main() -> int:
    try:
        changed = apply_replacements()
    except SyncError as exc:
        print(f"Public rules synchronization failed: {exc}", file=sys.stderr)
        return 1

    errors = validate()
    if errors:
        print("Public rules validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    if changed:
        print("Updated:")
        for path in changed:
            print(f"- {path}")
    else:
        print("Public website and printable-reference rules were already synchronized.")
    print("Validated Action costs, Action Opportunity timing, binding, and recent faction rules.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
