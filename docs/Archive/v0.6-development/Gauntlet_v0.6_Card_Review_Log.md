# Gauntlet v0.6 Card Review Log

**Status:** Consolidated migration log through all 54 v0.5.7 playable cards.  
**Source order:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`.

This file records the current v0.6 cost, allegiance direction, approved wording, and remaining exact-text work. `Gauntlet_v0.6_Card_Metadata.md` is authoritative for starter eligibility, complexity, and watchlist fields.

Conditions are retired in v0.6. Former Condition effects have been converted to Assets, Overlays, immediate effects, or deferred redesigns.

---

## Reviewed cards

### 1. Witchcraft

**v0.5.7 source name:** Arcane Knowledge  
**Cost:** 5  
**Allegiance:** Mystics

> **Action:** Bank Witchcraft as an Asset. Once per turn during a battle, Witchcraft may use the eligible Battle effect of one other card you played in that battle.
>
> **Battle:** Witchcraft may use the eligible Battle effect of one other card you played in this battle.

Final eligible-effect wording remains unresolved. General anti-recursion rules prohibit selecting an effect that would itself resolve another Battle effect.

---

### 2. Armistice

**Cost:** 4  
**Allegiance:** Neutral

> **Action:** Bank Armistice as an Asset. While Armistice is active, neither player can initiate a battle. At the beginning of each of your turns, after your normal draw, discard two cards from your hand or discard Armistice. Armistice cannot be voluntarily discarded at any other time.

**Battle direction:** Resolve cancellation first. If Armistice remains active, end the battle without a winner, return the attacker to the space they entered from, stop unresolved Battle effects, put the other Battle cards still in play in their owners' discard piles, and put Armistice in its owner's Graveyard.

---

### 3. Assassins

**Cost:** 4  
**Allegiance:** Intelligence

Preserve targeted hand disruption and severe hand-commitment punishment. Its Intelligence Mission requirement must be appropriately difficult. Watch disruption density with Spies, Scouting Report, Sabotage, Treason, Surveillance, Interference, and Special Operation.

---

### 4. Assimilation

**Cost:** 4  
**Allegiance:** Neutral

> **Action:** Bank Assimilation as an Asset. After you win a battle you initiated on a Territory your opponent controls, you may place Assimilation in your Graveyard. If you do, capture that Territory immediately instead of occupying it.
>
> **Battle:** If you win this battle as the attacker on a Territory your opponent controls, capture that Territory immediately instead of occupying it. Place Assimilation in your Graveyard after the capture resolves.

Assimilation grants immediate capture only; it does not grant follow-up movement.

---

### 5. Attrition

**Cost:** 3  
**Allegiance:** Neutral

Keep as shared card-economy pressure rather than faction-locking it to Inquisition. Its Asset punishes opposing played battle-drawn cards after losses; its Battle effect pressures the opponent's full initial battle draw. Watch long-game denial and overlap with Condemnation.

---

### 6. Blockade

**Cost:** 4  
**Allegiance:** Diplomats

Rework as a **Sanctions** card tied to refused Terms and accepted settlement rather than generic delayed hand denial. Exact implementation remains deferred to the Diplomat faction-card pass.

---

### 7. Brothers in Arms

**Cost:** 4  
**Allegiance:** Military

Reward using a hand-origin Battle card and a battle-drawn card in the same battle. Keep it distinct from capture acceleration. Final text must clarify hand-origin terminology and cancellation interaction; Brothers in Arms itself remains cancellable.

---

### 8. Capital Gains

**Cost:** 3 provisional  
**Allegiance:** Financiers

Preserve an investment-and-payoff structure, but redesign the payoff around Capital, Treasury, Deeds, or other Financier infrastructure rather than generic delayed card draw. Exact text remains unresolved.

---

### 9. Capital Punishment

**Cost:** 4  
**Allegiance:** Neutral

> **Action:** If you won a battle this turn, choose one opposing Asset and place it in its owner's Graveyard.
>
> **Battle:** Choose one active opposing Battle card. It has no effect during this battle. During battle cleanup, if you won, place the chosen card in its owner's Graveyard instead of its normal destination.

If the Capital Punishment player loses, the chosen card remains ineffective during the battle but follows its normal destination.

---

### 10. Conscription

**Cost:** 3  
**Allegiance:** Neutral

Keep as shared Asset deployment and battle-draw support. The Battle effect increases both initial battle-draw amount and battle-drawn play allowance when committed from hand before battle draw.

---

### 11. Contraband

**Cost:** 3  
**Allegiance:** Neutral

Keep as discard-pile recovery and tactical reuse. It cannot retrieve from the Graveyard. A retrieved Battle card is played in Contraband's place and follows its own destination rules.

---

### 12. Counterintelligence

**Cost:** 2  
**Allegiance:** Neutral

Keep as shared protection against look and reveal effects. It does not block revelation required by ordinary battle or Territory rules. Recheck cost after Intelligence is finalized.

---

### 13. Court Martial

**Cost:** 3  
**Allegiance:** Neutral

> **Action:** Bank Court Martial as an Asset. During battle cleanup, after an opponent loses a battle against you and completes their normal retreat, you may discard Court Martial. If you do, they retreat one additional space, if able.
>
> **Battle:** Your opponent gains disadvantage during this battle. If they lose, after completing their normal retreat, they retreat one additional space, if able.

---

### 14. Decoys

**Cost:** 3  
**Allegiance:** Neutral

Keep as shared protection against Asset removal and Battle-card cancellation. Limit Battle protection to cancellation rather than every effect that makes another card ineffective.

---

### 15. Disruption

**v0.5.7 source name:** Embargo  
**Cost:** 2  
**Allegiance:** Neutral

> **Action:** Your opponent discards one card from their hand at random.
>
> **Battle:** Cancel one active opposing Battle card. A canceled hand commitment returns to its owner's hand; a canceled battle-drawn card goes to its owner's discard pile.

The title **Embargo** is reserved for a future Diplomat Sanctions card.

---

### 16. Entrenchment

**Cost:** 2  
**Allegiance:** Neutral

Keep as defensive positioning and anti-advance pressure. Final text must resolve whether the Asset triggers only on adjacent entry or also when the opponent enters the controller's occupied space to initiate battle.

---

### 17. Fealty

**Cost:** 2  
**Allegiance:** Neutral

Keep as disadvantage protection and battle stabilization. The Action protects against opposing disadvantage effects; the Battle effect ignores one disadvantage or grants +1 if none applies.

---

### 18. Fog of War

**Cost:** 2  
**Allegiance:** Intelligence

Use a temporary Territory Overlay for the Action and one-sided random battle-draw selection for the Battle effect. Random selection occurs after effects determine how many battle-drawn cards may be played.

---

### 19. Fortifications

**Cost:** 3  
**Allegiance:** Neutral

Keep as shared defensive infrastructure. The Asset permits up to two battle-drawn plays while defending. The Battle effect gives +1 while defending and may allow an additional voluntary withdrawal after a loss.

---

### 20. Illegal Occupation

**Cost:** 3  
**Allegiance:** Neutral

Keep as pressure against occupation before capture. The Asset makes an opponent's Assets inactive while they occupy but do not control one of your Territories. The Battle effect applies during a counterattack and also grants advantage.

---

### 21. Insurrection

**Cost:** 4  
**Allegiance:** Neutral

Keep as a chaotic global hand/deck reset and situational offensive battle card. Exclude from starter decks and watch interactions with Graveyard pressure from Mystics and Inquisition Purification.

---

### 22. Invasion

**Cost:** 4  
**Allegiance:** Neutral

Keep as shared offensive tempo rather than Military-exclusive. Watch stacking with Onward, Rally, Rout, and other attack-tempo effects.

---

### 23. Liberation

**Cost:** 4  
**Allegiance:** Neutral

Keep as counterattack and comeback tempo.

> **Battle direction:** If you are counterattacking an opponent occupying a Territory you control, draw one additional battle card. You may play it in addition to your other Battle cards.

Avoid post-battle movement that duplicates Military Rout.

---

### 24. Manifest Destiny

**Cost:** TBD  
**Allegiance:** TBD

Retain the title but fully redesign the effect. Do not insert a permanent blank Territory into the Gauntlet; that mechanic disrupts board geometry, Asset limits, Deeds, Special Operation thresholds, pacing, and breakthrough distance.

---

### 25. Militias

**Cost:** 3  
**Allegiance:** Military

> **Action direction:** Bank Militias as an Asset. During the first battle each turn on a Territory you control, your opponent gains disadvantage.
>
> **Battle direction:** Your opponent gains disadvantage. If this battle is on a Territory you control, they gain double disadvantage instead.

---

### 26. Monetary Crisis

**Cost:** 2  
**Allegiance:** Financiers

> **Action direction:** Each player discards their hand, then draws two cards.
>
> **Battle direction:** During battle cleanup, each player discards down to one card.

Financiers create asymmetry through Treasury preparation rather than an additional printed benefit.

---

### 27. Necromancy

**Cost:** 5  
**Allegiance:** Mystics  
**Trait:** Arcane

> **Action direction:** Return one card from your Graveyard to your hand. Place Necromancy in your Graveyard instead of discard.
>
> **Battle direction:** During battle cleanup, return one card from your Graveyard to your hand.

Remove the restriction against retrieving another Necromancy.

---

### 28. New Recruits

**Cost:** 1  
**Allegiance:** Neutral

> **Action:** Discard one other card from your hand, then draw two cards.
>
> **Battle:** Add +1 to your battle total.

---

### 29. Palisade Wall

**Cost:** 2  
**Allegiance:** Neutral

> **Action:** Bank Palisade Wall as an Asset. When a battle begins in which you are the defender, you may discard Palisade Wall. If you do, your opponent's banked Assets are inactive during that battle.
>
> **Battle:** If you are the defender, choose one active opposing Battle card committed from hand. It has no effect during this battle. If there is no such card, gain advantage instead.

---

### 30. Patriotism

**Cost:** 3  
**Allegiance:** Military

> **Action direction:** Bank Patriotism as an Asset. You may have only one banked Patriotism. During battles on a Territory you control, double the first +1 or advantage granted by one of your Battle cards.
>
> **Battle direction:** If defending a Territory you control, gain advantage.

The Asset does not double Homeland Advantage, Heartland defense, Orders, or opposing disadvantage.

---

### 31. Protracted Siege

**Cost:** 4  
**Allegiance:** Neutral

Use a visible, expendable Territory Overlay. Each copy delays one scheduled start-of-turn capture only, then is discarded. Immediate-capture effects bypass it unless they explicitly use the normal schedule.

---

### 32. Rallying Cry

**Cost:** 1  
**Allegiance:** Neutral

> **Action:** Draw one card.
>
> **Battle:** Add +1 to your battle total.

---

### 33. Redemption

**Cost:** 2  
**Allegiance:** Neutral

> **Action direction:** Bank Redemption as an Asset. When an opposing effect places one or more of your other cards in your discard pile, you may discard Redemption to return one of those cards to your hand after the effect resolves.

The Battle effect similarly recovers one other negated Battle card that entered discard. Redemption cannot save itself or protect cards entering the Graveyard.

---

### 34. Reinforcements

**Cost:** 2  
**Allegiance:** Neutral

> **Action:** Bank Reinforcements as an Asset. During your turn, you may discard Reinforcements to play one additional Action card.
>
> **Battle:** After all other Battle cards are revealed, draw one additional battle card. You may immediately play it face up in addition to your other Battle cards if its Battle effect can still resolve.

---

### 35. Resistance

**Cost:** 3  
**Allegiance:** Neutral

Keep as repeatable counterattack support. The Asset increases initial battle draw during counterattacks. The Battle effect grants advantage and may bank Resistance after a counterattack victory, subject to Asset capacity.

---

### 36. Revolution

**Cost:** 4  
**Allegiance:** Neutral

> **Action:** Each player discards their hand, then draws cards equal to the number of cards the other player discarded.
>
> **Battle:** After all rerolls, you may exchange the players' final selected die results. Each player retains their own modifiers.

If both players exchange results, no exchange occurs.

---

### 37. Rousing Speech

**Cost:** 2  
**Allegiance:** Neutral

> **Action:** Bank Rousing Speech as an Asset. Whenever your opponent banks an Asset, you may draw one card, then discard one card.
>
> **Battle:** If your opponent has more face-up Assets than you do, gain advantage.

Turning an existing Asset face up does not count as banking it.

---

### 38. Sabotage

**Cost:** 2  
**Allegiance:** Neutral

> **Action:** Choose one face-up opposing Asset. Turn it face down until the start of your next turn.
>
> **Battle:** Cancel one active opposing Battle card. Place it in its owner's discard pile immediately.

The Action resolves and enters its normal destination immediately; the target Asset's face-down state tracks the duration.

---

### 39. Scorched Earth

**Cost:** 3  
**Allegiance:** Neutral

Convert into a persistent Ruins Overlay when its controller loses while defending controlled ground and must retreat. The ruined Territory's printed effect is inactive until the Overlay is removed. There is no universal Repair action in v0.6.

---

### 40. Scouting Report

**Cost:** 1  
**Allegiance:** Neutral

Keep finite shared reconnaissance. Its Battle effect reveals before other Battle cards, inspects one opposing face-down Battle card, and may replace Scouting Report with an unplayed card from its battle draw. The replacement counts as a battle-drawn play.

---

### 41. Sedition

**Cost:** 3  
**Allegiance:** Neutral

> **Action:** Your opponent chooses and discards one Asset they control.
>
> **Battle:** Your opponent chooses one face-up Asset they control. It is inactive during this battle. If they control no face-up Assets, add +1 to your battle total.

---

### 42. Shock and Awe

**Cost:** 5  
**Allegiance:** Military

Use a prepared Asset for an all-in immediate capture and one follow-up advance after winning an initiated battle on an enemy-controlled Territory. The effect consumes all Command after any Command gained from that battle.

---

### 43. Siege Weaponry

**Cost:** 4  
**Allegiance:** Neutral

Keep as shared offensive Territory denial that can become a Ruins Overlay after successful conquest. **Bombardment** is the leading replacement title so **Siege Weaponry** may be reserved for a future Engineer card.

---

### 44. Spies

**Cost:** 2  
**Allegiance:** Intelligence

> **Action:** Bank Spies as an Asset. Your opponent keeps their hand face up.

The Battle effect reveals before other Battle cards, exposes the opponent's actual hand commitment and selected battle-drawn card, and permits the Spies player to change their own battle-drawn selection. It does not reveal the opponent's entire battle draw.

---

### 45. Stand Ground

**Cost:** 2  
**Allegiance:** Neutral

> **Action:** Bank Stand Ground as an Asset. When an opposing card effect would move you, you may discard Stand Ground. If you do, ignore that effect's movement.
>
> **Battle:** If you are the defender, gain advantage.

It does not prevent normal required retreat or voluntary movement and withdrawal.

---

### 46. Strategic Withdrawal

**Cost:** 3  
**Allegiance:** Neutral

> **Action:** Return a banked Asset to your hand. If you do, gain one additional movement this turn.
>
> **Battle:** If you lose this battle, after retreating, you may withdraw one additional space. If you do, return one other card you played in this battle to your hand instead of placing it in its normal destination.

---

### 47. Supplies

**Cost:** 1  
**Allegiance:** Neutral

> **Action:** Bank Supplies as an Asset. At the beginning of your turn, you may discard Supplies. If you do, draw two additional cards.
>
> **Battle:** After this battle, draw two cards, then discard one card.

---

### 48. Tariffs

**Cost:** 3  
**Allegiance:** Financiers

> **Action:** Bank Tariffs as an Asset. Draw two cards. You may immediately play one additional Action card other than Tariffs.
>
> **Asset:** While Tariffs is banked, skip your normal draw. You cannot voluntarily discard Tariffs during the turn it is banked.
>
> **Battle:** Your opponent may discard one card from their hand. If they do not, add +1 to your battle total.

---

### 49. Sequestration

**v0.5.7 source name:** The Black Edict  
**Cost:** 4  
**Allegiance:** Neutral

> **Action:** Each player chooses one banked Asset they control to keep, if able, and discards the rest.
>
> **Battle:** All banked Assets are inactive during this battle.

**The Black Edict** is reserved for a future purpose-built Inquisition card.

---

### 50. Treason

**Cost:** 5  
**Allegiance:** Intelligence

> **Action:** Bank Treason as an Asset. During a battle involving you, after all Battle cards are revealed but before their effects resolve, you may discard Treason. If you do, choose one opposing Battle card. That card has no effect for its owner; place it in its owner's discard pile. Instead, resolve it as if you had played it.
>
> **Battle:** Reveal Treason before the other Battle cards. After they are revealed, choose one opposing Battle card. That card has no effect for its owner; place it in its owner's discard pile. Instead, resolve it as if you had played it.

General copied-effect handling for impossible targets and source-dependent text remains unresolved.

---

### 51. Tyranny

**Cost:** 4  
**Allegiance:** Inquisition

> **Action:** Bank Tyranny as an Asset. In each battle, after Battle cards are revealed, your opponent chooses one of their Battle cards that would add to their battle total or grant them advantage. That card is negated.
>
> **Battle:** During this battle, all opposing Battle cards that would add to your opponent's battle total or grant them advantage are negated.

---

### 52. Valor

**Cost:** 2  
**Allegiance:** Neutral

> **Action:** Bank Valor as an Asset. Whenever you lose a battle, after resolving any required retreat, draw one card.
>
> **Battle:** After the battle dice are rolled, if your battle total is lower than your opponent's, you may reroll your battle die. You must use the new result.

---

### 53. War Crimes

**Cost:** 3  
**Allegiance:** Inquisition

> **Action:** Bank War Crimes as an Asset. After your opponent loses a battle against you, you may discard War Crimes. If you do, none of their cards or abilities can trigger because of that loss or any resulting retreat. They retreat one additional space.
>
> **Battle:** If your opponent loses this battle, none of their cards or abilities can trigger because of that loss or any resulting retreat. They retreat one additional space.

---

### 54. Arcane Knowledge

**v0.5.7 source name:** Witchcraft  
**Cost:** 4  
**Allegiance:** Neutral  
**Trait:** Arcane

> **Action:** Return a card from your Graveyard to your discard pile.
>
> **Battle:** When Arcane Knowledge is revealed, choose a card in your Graveyard with a Battle effect that can resolve in this battle. Resolve that effect as if you had played it. Leave the chosen card in your Graveyard.

---

## Consolidated cross-card rules

- Gauntlet does not use Conditions in v0.6.
- Whenever a player could play an Action card during their turn, they may instead discard one banked Asset they control. This uses that Action opportunity and is not an Action-card play. An additional Action-card play may be exchanged for voluntary Asset removal unless a card says otherwise.
- A card effect that resolves another card's Battle effect cannot select a Battle effect that would itself resolve another card's Battle effect.
- A negated card has no effect and follows its normal destination unless an effect says otherwise.
- A Territory can have only one Ruins Overlay; a new Ruins Overlay replaces the old one and sends the old Overlay to its owner's Graveyard.

## Remaining exact-text blockers

- Fully redesign Manifest Destiny.
- Finalize Blockade / Sanctions.
- Finalize Capital Gains around Financier infrastructure.
- Resolve whether Siege Weaponry is renamed Bombardment.
- Finalize Witchcraft's eligible copied-effect wording.
- Define copied or appropriated effects with impossible targets or source-dependent text.
- Complete Intelligence Mission requirements and faction-package construction.
