# Gauntlet v0.6 Diplomat Supplemental Cards

**Status:** Authoritative working component specification for the v0.6 Diplomat Leader Cards, Proposal / Treaty Article cards, Terms reference, and sliding Influence Tracker.  
**Purpose:** Define the exact player-facing text, physical relationship, and production behavior of the Diplomat supplemental components.

Use this document with:

- `Gauntlet_v0.6_Working_Rules.md` for the complete Terms, battle, withdrawal, capture, and victory rules;
- `Gauntlet_v0.6_Leader_Design_Bible.md` for Ambassador and Senator art direction;
- `Gauntlet_v0.6_Diplomat_Card_Pool.md` for the twelve playable Diplomat cards;
- `../faction-sheets/diplomat.html` for the current printable rendering.

Supplemental cards do not count toward deck size or deckbuilding value, are not shuffled into the deck, and are not cards in play.

---

## Component set

A Diplomat deck uses:

1. one selected Leader Card: **Ambassador** or **Senator**;
2. one shared **Influence Tracker** placed beneath that Leader Card;
3. nine double-sided **Proposal / Treaty Article cards**;
4. one double-sided **Diplomat Reference card**.

Diplomats do not use Influence tokens. Available Influence is displayed by sliding the selected Leader Card over the Influence Tracker. When Influence is staked, spent, lost, returned, recovered, or gained, move the Leader Card to the new available amount.

The nine Proposal cards begin Proposal side up. When a Proposal is newly ratified, flip it to its Treaty Article side after the Terms resolve. A ratified Proposal may still be offered for its tactical effects, so both sides repeat the Proposal's full rules text.

---

## Shared setup and faction rules

Both Leader Cards include the following shared text:

> **Setup:** Place your Influence Tracker beneath this card and set it to 1. Place your nine Proposal cards Proposal side up.
>
> **Leverage:** Before dice are rolled in a battle following refused Terms, you may spend any amount of available Influence. Gain +1 to your battle total for each Influence spent.
>
> **Peace Treaty:** At the start of your turn, after captures, if five different Proposals are ratified as Treaty Articles, you win.

A Diplomat may have up to **10 Influence**. Influence cannot fall below 0. Any Influence gained beyond 10 is lost.

Influence shown on the tracker is available Influence. To stake a Proposal, lower the tracker by its listed Influence Stake. That amount remains staked and unavailable until the Terms resolve. The Proposal card itself records how much is currently staked, so no separate stake marker is needed.

When an outcome returns or recovers staked Influence, raise the tracker by that amount. If the stake is lost, the tracker remains at its reduced value.

---

## Ambassador

**Faction:** Diplomats  
**Card type:** Supplemental Leader Card  
**Player-facing phrase:** *Words first. War last.*

> **Setup:** Place your Influence Tracker beneath this card and set it to 1. Place your nine Proposal cards Proposal side up.
>
> **Leverage:** Before dice are rolled in a battle following refused Terms, you may spend any amount of available Influence. Gain +1 to your battle total for each Influence spent.
>
> **Cordiality:** Once per turn, after the opponent accepts Terms you offered, draw one card.
>
> **Peace Treaty:** At the start of your turn, after captures, if five different Proposals are ratified as Treaty Articles, you win.

### Production direction

- Use `images/ambassador.png`, cropped to emphasize the central standing figure and open-handed gesture.
- Preserve the treaty paper, refined coat, and approachable diplomatic posture.
- Use navy, ivory, parchment, wax-seal, laurel, and polished-wood visual language.
- The composition should emphasize personal persuasion, trust, and voluntary agreement.

---

## Senator

**Faction:** Diplomats  
**Card type:** Supplemental Leader Card  
**Player-facing phrase:** *Procedure endures.*

> **Setup:** Place your Influence Tracker beneath this card and set it to 1. Place your nine Proposal cards Proposal side up.
>
> **Leverage:** Before dice are rolled in a battle following refused Terms, you may spend any amount of available Influence. Gain +1 to your battle total for each Influence spent.
>
> **Political Capital:** Once per turn, when you would lose staked Influence because you lost the battle after refused Terms, you may send up to that many cards from your hand to your Graveyard. Recover 1 of that staked Influence for each card sent this way; lose the rest.
>
> **Peace Treaty:** At the start of your turn, after captures, if five different Proposals are ratified as Treaty Articles, you win.

### Production direction

- Use `images/senator.png`, cropped to emphasize the central standing figure and raised hand.
- Preserve the formal document, dark coat, ivory cravat, and institutional orator posture.
- Use navy, ivory, parchment, columns, wax-seal, and laurel visual language.
- The composition should emphasize procedure, legitimacy, and the sacrifice of political resources to preserve standing.

---

## Influence Tracker

**Card type:** Supplemental resource tracker  
**Format:** Standard 2.5 × 3.5-inch card, designed to sit directly beneath either Diplomat Leader Card.  
**Range:** 0–10 Influence.

### Use

The selected Leader Card slides vertically over the Influence Tracker:

- **0 Influence:** the Leader Card and tracker are fully aligned; the tracker is covered;
- **1–10 Influence:** slide the Leader Card upward until its bottom edge aligns with the numbered registration line;
- when Influence changes, move the Leader Card immediately to the new available amount.

The bottom edge of the Leader Card is the resource pointer. No separate Influence token or marker is used.

When offering a paid Proposal:

1. read the Proposal's printed Influence Stake;
2. lower the tracker by that amount;
3. resolve the Terms;
4. return, recover, or lose that stake according to the outcome by adjusting the tracker.

Only one Terms offer can be resolving at a time, and the offered Proposal visibly lists the amount at risk. This makes a separate stake marker unnecessary.

### Tracker face

The tracker should include:

- a clear **Diplomat Influence** title;
- ten horizontal registration lines labeled 1 through 10;
- a subtle reminder that fully covering the tracker represents 0;
- repeated alignment guidance showing that the Leader Card's bottom edge is the pointer;
- Diplomat navy, ivory, parchment, wax-seal, laurel, and restrained gold visual language.

The tracker should not repeat the full Terms procedure, Leverage rule, or Peace Treaty condition. Those remain on the Leader and Reference cards.

### Physical testing watchlist

- Verify that the Leader Card remains stable and readable at high Influence values, especially 8–10.
- Confirm that all ten registration positions are visually distinct at normal table distance.
- Test sleeved and unsleeved use.
- Confirm that ordinary handling does not accidentally shift the displayed Influence value.
- Consider a shared oversized sleeve or simple player-board channel only if loose cards prove unreliable in playtesting.

---

## Proposal / Treaty Article cards

Each card is double-sided:

- **Proposal side:** title, Influence Stake, requirement, Accepted effect, and Refused effect;
- **Treaty Article side:** a prominent **Ratified Treaty Article** banner plus the same title, stake, requirement, Accepted effect, and Refused effect.

A Treaty Article side remains fully usable because already-ratified Proposals may still be offered. It cannot count toward Peace Treaty again and does not generate the normal newly-ratified Influence rewards again.

### 1. De-escalation

**Influence Stake:** 0

> **Accepted:** Both players withdraw. The opponent draws one card.
>
> **Refused:** Draw one card.

### 2. Orderly Withdrawal

**Influence Stake:** 0  
**Requirement:** You must be attacking.

> **Accepted:** You withdraw. The opponent remains in or occupies the battle space. The opponent draws one card.
>
> **Refused:** Gain +1 to your battle total in the resulting battle.

### 3. Capitulation

**Influence Stake:** 0  
**Requirement:** You must be defending.

> **Accepted:** You withdraw. The opponent remains in or occupies the battle space. The opponent draws one card.
>
> **Refused:** If you lose the resulting battle, draw two cards.

### 4. Open Channels

**Influence Stake:** 1  
**Requirement:** You must have at least one card in hand.

> **Accepted:** Each player reveals their hand. Then both players withdraw. The opponent draws one card.
>
> **Refused:** Look at the opponent's hand. During this battle's battle draw, draw one additional card before choosing which battle-drawn card to play.

### 5. Mutual Disarmament

**Influence Stake:** 1  
**Requirement:** Both players must have at least one card in hand.

> **Accepted:** Each player discards one card from hand. Then the opponent draws one card. Both players withdraw.
>
> **Refused:** You may discard one card from hand. If you do, during this battle's battle draw, draw one additional card before choosing which battle-drawn card to play.

### 6. Prisoner Exchange

**Influence Stake:** 1  
**Requirement:** Each player must have at least one card in their Graveyard.

> **Accepted:** Each player may move one card from their Graveyard to their discard pile. Then both players withdraw.
>
> **Refused:** If you lose the resulting battle, you may move one card from your Graveyard to your discard pile.

### 7. Rebuilding Pact

**Influence Stake:** 1  
**Requirement:** You must have a card in hand that can be banked as an Asset.

> **Accepted:** Each player may bank one Asset from hand without using an Action. Then both players withdraw.
>
> **Refused:** After the battle, you may bank one Asset from hand without using an Action.

### 8. Ultimatum

**Influence Stake:** 2

> **Accepted:** The opponent withdraws. You remain in or occupy the battle space.
>
> **Refused:** Gain +1 to your battle total in the resulting battle. If you win, gain 2 Influence instead of the default 1 Influence for imposing a newly ratified Proposal.

### 9. Diplomatic Recognition

**Influence Stake:** 2  
**Requirement:** You must be defending a counterattack while occupying a Territory the opponent controlled immediately before you occupied it.

> **Accepted:** Capture that Territory immediately. The opponent withdraws, then draws two cards.
>
> **Refused:** Fight normally. If you win, capture that Territory immediately. Gain no Influence for imposing this Proposal.

---

## Diplomat Reference card

### Side A — Offering Terms

> **Before a battle involving you:**
>
> 1. Choose one eligible Proposal.
> 2. Lower your Influence Tracker by its listed Stake. That Influence is staked and unavailable until the Terms resolve.
> 3. The opponent accepts or refuses.
>
> **Accepted:** No battle occurs. Resolve the Accepted effect. If the Proposal is newly ratified, flip it to its Treaty Article side. Return the stake on the tracker. If newly ratified, gain Influence equal to the Proposal's listed Stake.
>
> **Refused:** Resolve the Refused effect and fight. Before dice, you may use Leverage.
>
> - **You win:** Impose the Proposal. If newly ratified, flip it. Return the stake. If newly ratified, gain 1 Influence unless the Proposal says otherwise.
> - **You lose:** Do not ratify. The tracker already reflects the lost stake. Political Capital may recover part or all of it.
> - **No winner:** Do not ratify. Return the stake on the tracker.

### Side B — Influence and Treaty Articles

> **Influence:** Track available Influence from 0 to 10 by sliding your Leader Card over the Influence Tracker.
>
> **Staking:** Lower the tracker by the offered Proposal's listed Stake. Only available Influence may be staked or spent.
>
> **Leverage:** Before dice in a battle following refused Terms, spend any amount of available Influence for +1 battle total each.
>
> **Accepted newly ratified Proposal:** Return the stake and gain additional Influence equal to the listed Stake.
>
> **Already-ratified Proposal:** May be offered again, but cannot count again or generate either normal newly-ratified Influence reward.
>
> **Peace Treaty:** At the start of your turn, after captures, five different Treaty Articles win the game.

---

## Print-sheet integration

`faction-sheets/diplomat.html` contains four Letter-size 3 × 3 sheets:

1. the first nine playable Diplomat cards;
2. the remaining three playable cards, both Leader Cards, both Reference faces, and one Influence Tracker;
3. all nine Proposal fronts;
4. all nine Treaty Article backs, mirrored horizontally for long-edge duplex alignment with sheet 3.

The two Reference faces may be sleeved or mounted back-to-back. The Leader Cards, Reference card, Proposal / Treaty Article cards, and Influence Tracker are supplemental open-information components and do not use the normal playable-card back.

---

## Initial physical and balance watchlist

- Confirm that both Leader Cards remain legible with Setup, Leverage, leader ability, and Peace Treaty text.
- Confirm that Proposal and Treaty Article sides are unmistakable across the table.
- Test whether repeating complete Proposal text on both sides remains readable at standard card size.
- Track whether beginning with 1 Influence gives useful choices without making early cost-2 Proposals too accessible.
- Track Influence gained from accepted newly ratified Proposals separately from imposition and faction-card gains.
- Track the largest single Leverage spend and whether uncapped per-battle spending creates satisfying climaxes or deterministic battles.
- Test whether the Senator's one-card-per-Influence recovery is appropriately costly with the three-card hand limit.
- Test whether the 10-Influence maximum is reached often enough to waste meaningful gains.
- Confirm that the slider remains practical at values 8–10 and that lowering the tracker cleanly represents a current stake.
