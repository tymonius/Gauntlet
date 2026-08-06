# Gauntlet v0.6.2 Faction and Component Compatibility Audit

**Status:** Normative Wave B inherited-source propagation  
**Primary candidate:** `Gauntlet_v0.6.2_Faction_and_Component_Candidate.md`  
**Tracker:** [Issue #494](https://github.com/tymonius/Gauntlet/issues/494)

This audit supplies exact v0.6.2 replacements for inherited v0.6.1 faction, Neutral-card, and Territory text whose meaning depends on retired timing, movement, visibility, tie, or control rules. It does not modify the published v0.6.1 release. Where this audit supplies replacement text, that text is part of the Wave B normative source set.

---

# 1. Intelligence

## Faction Actions — Denouement

Each Intelligence Faction Action costs one Action and is legal only during Denouement:

> **Start a Mission — Denouement:** Place one eligible Intelligence card from Hand face down as your Active Mission.

> **Complete a Mission — Denouement:** Reveal a satisfied Active Mission, gain its Mission reward, and put it in your Discard Pile.

> **Abort a Mission — Denouement:** Reveal the Active Mission, spend Intel equal to its value, and put it in your Discard Pile.

> **Start a Special Operation — Denouement:** When ready, place one eligible Intelligence card from Hand face down as your Special Operation.

> **Complete a Special Operation — Denouement:** Reveal a satisfied, ready Special Operation, pay its Intel cost, and win the game.

All descriptive and technical Mission procedures that previously said **during an Action Opportunity after movement** use **during Denouement, as an Action**.

Mission Control remains a Faction Ability that directly permits starting a Mission without taking an Action. It does not create an Action phase or additional Action.

## Fieldcraft

Replace the exception sentence with:

> Fieldcraft does not alter Territory control, Occupation, Capture, Defensive Edge, Last Stand bonuses, or limits calculated from Territories.

## Counterintelligence

All Territories are revealed during setup. Remove Territory revelation from Counterintelligence's scope.

> Counterintelligence prevents an opposing effect from revealing a Hand, Reserve, or face-down battle card. It prevents the entire opposing revealing effect, not only the information portion. Rules-mandated reveals are unaffected.

## Fog of War

Replace its Action mode with:

> **Action:** Place Fog of War as an Overlay on a Territory. Remove it after the next battle fought there. During that battle, the controller of this Territory sets their Gambit and chooses their Tactics after the opponent's corresponding choice, regardless of who initiated the battle.

Its Battle and Mission modes are unchanged.

## Reconnaissance

Replace its Use timing with:

> **Use:** During Onset in a battle you initiated, you may discard this card to reveal the opponent's Hand. You may then withdraw or continue the attack.

Its Battle and Mission modes are unchanged.

## Sleeper Network

Replace its Use mode with:

> **Use:** During Opening or Denouement, as an Action, put this card in your Graveyard and reveal its bound cards. Play each whose Action effect can apply now, one at a time and in any order, without taking additional Actions. Discard the rest.

The Asset mode may still play one eligible bound card without taking an Action when an opposing effect would cause Sleeper Network to leave play.

---

# 2. Mystics

## Arcane pool

All 13 Mystics cards, including Nature's Altar, have the Arcane trait.

## Rite of Crossing

Replace its beginning timing with:

> **Beginning restriction:** You may take the Begin a Rite Faction Action for Rite of Crossing during Denouement only after winning a battle that turn that made you the occupier of a Territory the opponent controlled immediately before that battle.

Nature's Altar does not waive this specialized beginning restriction. The Altar permits the Begin a Rite Faction Action during Opening only when the chosen Rite is otherwise legal to begin at that timing; therefore Rite of Crossing still requires the qualifying battle and normally cannot be begun through Nature's Altar before that battle occurs.

## Ritual procedures

All descriptive and technical Ritual procedures that previously said **during an Action Opportunity after movement** use **during Denouement, as an Action**.

---

# 3. Inquisition

## Relentless Pursuit

Replace the Leader ability with:

> **Relentless Pursuit:** Once per turn, at the end of the Aftermath of a battle an opponent initiated against you and lost, you may spend 2 Conviction. End their turn, then advance one Position. This movement may create a pending battle; you are the attacker. Do not create an Opening or Denouement phase before that pending battle.

Accepted Terms may still prevent the resulting battle from reaching Onset.

## No Martyrs and Martyrdom

No Martyrs applies to Martyrdom in an Inquisition mirror.

> If the winning player controls an applicable No Martyrs effect, the losing opponent cannot play or benefit from Martyrdom because Martyrdom is an effect controlled by the losing player and triggered by that loss.

No Martyrs does not suppress harmful consequences controlled by the winner or the normal loss and retreat.

---

# 4. Neutral cards

## Counterintelligence

Replace its Asset mode with:

> **Asset:** Opposing effects cannot reveal your Hand, Reserve, or face-down Gambits or Tactics. This does not prevent reveals required by the rules.

Its Battle mode is unchanged. Remove all references to face-down Territories.

## Forced March

Replace its Action mode with:

> **Action — Opening:** During your Movement this turn, you may move one additional Position. This additional movement cannot create a pending battle.

Its Battle mode is unchanged.

## Advance Guard

Replace its Action mode with:

> **Action — Opening:** During your Movement this turn, you may move one additional Position. If that additional movement creates a pending battle, you cannot set a Gambit in that battle.

Its Battle mode is unchanged.

## Entrenchment

Replace the final clause of its Asset mode with:

> When the opponent advances onto a Territory adjacent to your Player Token, their movement ends and they cannot play a card for its Action effect during Denouement that turn.

## Palisade Wall

Replace its Use timing with:

> **Use:** During Onset while you are the defender, you may discard this card. If you do, the opponent's banked Assets are inactive during that battle.

Its Battle mode is unchanged.

## Reinforcements

Replace its Use mode with:

> **Use:** During Opening or Denouement, you may discard this card. If you do, you may take one additional Action during that phase.

## Strategic Withdrawal

Replace its Action mode with:

> **Action:** Return one banked Asset you control to your Hand. If you do, gain one additional Position of movement this turn. If you play Strategic Withdrawal during Denouement after your normal Movement has ended, begin a new Movement sequence with up to one Position of movement.

This movement may create a pending battle. Its Battle mode remains movement after a normal retreat and is not itself another retreat.

## Insurrection

Replace the end of its Action mode with:

> Draw three cards. After this Action resolves, you may take one additional Action during this phase.

## Liberation

Replace the end of its Asset mode with:

> After you win a Counterattack, draw one card. During your Denouement that turn, you may take one additional Action, even if you take another Action during that phase.

## Assimilation

Replace its Use and Battle results with:

> **Use:** During the Aftermath of a battle you initiated and won on a Territory the opponent controls, you may put this card in your Graveyard. If you do, advance your Front Line by one Territory, if able, instead of becoming the occupier.
>
> **Battle:** During the Aftermath, if you win as the attacker on a Territory the opponent controls, advance your Front Line by one Territory, if able, instead of becoming the occupier. Put this card in your Graveyard after the Front Line advance.

Assimilation cannot create isolated control.

## Protracted Siege

Replace the card with:

> **Action:** Bank this card.
>
> **Use:** When an opponent would add a Territory you control to their Front Line during Capture, you may place this card on that Territory as an Overlay. If you do, prevent that Front Line advance.
>
> **Battle:** During the Aftermath, if you lose while defending a Territory you control, place this card on the contested Territory as an Overlay. The next time the opponent would add this Territory to their Front Line during Capture, prevent that Front Line advance.
>
> **Overlay:** After Protracted Siege prevents one Front Line advance, or if the opposing Player Token leaves this Territory first, put Protracted Siege in its owner's Graveyard.

The opponent may add the Territory normally during a later Capture step if their Player Token remains on or beyond it.

## Manifest Destiny

The Action mode remains unchanged because adding the card at the player's own end preserves contiguous control.

Replace the Battle mode with:

> **Battle:** During the Aftermath, if you win as the attacker and inserting Manifest Destiny between the contested Territory and the Position from which you attacked would place it immediately beyond your Front Line, insert it there. It becomes a blank Territory under your control.

If the inserted Territory would not immediately join the player's Front Line, the Battle effect cannot insert it. Manifest Destiny never creates isolated control.

---

# 5. Territory compatibility

## Refuge

Replace its effect with:

> After a player voluntarily Falls Back onto Refuge, they draw one card.

Retreat and withdrawal do not trigger Refuge.

## Existing Wave B Territory replacements

The primary candidate already supplies exact v0.6.2 text for:

- Quicksand;
- Difficult Terrain;
- Command Tent;
- Smuggler's Pass; and
- all four Arenas.

---

# 6. Audit completion rules

Later full-guide and structured-data propagation must remove or replace every inherited occurrence covered here. A compatibility alias may retain an obsolete term only for search, migration, or Rules Arbiter query recognition; it must not appear as current player-facing rules text.
