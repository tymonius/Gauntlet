# Gauntlet v0.6 Military Card Pool

**Status:** Authoritative working exact-text source for the selected twelve-card v0.6 Military package.  
**Purpose:** Consolidate the current Military card names, costs, complexity, uniqueness, exact text, package structure, and playtest watchlist in one active document.

Use this document with:

- `Gauntlet_v0.6_Working_Rules.md` for Command, Orders, leaders, battle timing, Assets, Overlays, and Territory rules;
- `Gauntlet_v0.6_Faction_Card_Design_Guide.md` for package standards;
- `Gauntlet_v0.6_Military_Design_Notes.md` for identity, strategic rationale, weaknesses, and package evaluation;
- `Gauntlet_v0.6_Neutral_Card_Pool.md` for shared cards and interaction checks.

This file supersedes `Gauntlet_v0.6_Military_Card_Pool_Draft.md`, `card-reviews/MILITARY_DRAFT_REVIEW_NOTES.md`, the inherited-candidate audit, release-selection notes, and individual approval sidecars wherever current Military costs or exact text differ. Those files remain design provenance only.

---

## Package summary

| Cost | Cards |
|---:|---|
| 1 | Unbroken Ranks |
| 2 | Battlefield Promotion; Encampment; Rearguard; Brothers in Arms |
| 3 | Field Command; Reserve Force; Give Chase |
| 4 | Hold the Line; Countercharge; War Crimes |
| 5 | Shock and Awe |
| **Total** | **12 cards** |

- **Total unique-card value:** 35
- **Average cost:** 2.92
- **Curve:** 1 / 4 / 3 / 3 / 1 at costs 1–5
- **Unique card:** Shock and Awe
- **Cut from the release package:** Standing Orders

The curve is slightly cheaper than the default 1 / 3 / 4 / 3 / 1 planning baseline. The additional cost-2 card is retained because Brothers in Arms creates a more distinctive combined-arms decision than Standing Orders' general Order discount.

---

# Cost 1

## Unbroken Ranks

**Cost:** 1  
**Complexity:** Basic  
**Primary threads:** Command discipline; restraint; momentum versus consolidation

> **Action:** Bank Unbroken Ranks as an Asset. After you win a battle during which you used no Orders, you may discard Unbroken Ranks. If you do, gain 1 Command.
>
> **Battle:** After you win this battle, if you used no Orders during it, gain 1 Command.

Unbroken Ranks rewards the Military player for trusting position, cards, and preparation rather than spending Command to secure the current battle. Its Command gain occurs before the player decides whether to use a post-victory Order arising from that victory.

---

# Cost 2

## Battlefield Promotion

**Cost:** 2  
**Complexity:** Basic  
**Primary threads:** Force preservation; battle-draw conversion; successful operations

> **Action:** Play only after you win a battle. Choose one card you played from battle draw during that battle. Return it from your discard pile to your hand.
>
> **Battle:** During battle cleanup, if you win, return one other card you played from battle draw to your hand instead of placing it in your discard pile.

Battlefield Promotion turns a card that appeared unpredictably through battle draw into a reliable card in hand. Cost 2 reflects conditional card preservation after a victory rather than Command generation or direct battle strength.

## Encampment

**Cost:** 2  
**Complexity:** Advanced  
**Card form:** Territory Overlay  
**Primary threads:** Prepared operations; positional commitment; Command discipline

> **Action:** Place Encampment as an Overlay on the revealed Territory you currently occupy and control.
>
> **Overlay:** At the end of your turn, if you occupy and control this Territory, gain 1 Command.
>
> When an opponent gains control of this Territory, place Encampment in its owner's Graveyard.
>
> **Battle:** During battle cleanup, if you won this battle while defending a revealed Territory you control, place Encampment on that Territory as an Overlay instead of placing it in its normal destination.

Encampment follows the universal Overlay rules. While exposed, it supersedes the effect immediately beneath it. Leaving the Territory does not dismantle it, temporary enemy occupation does not remove it, and it is removed when an opponent gains control of that Territory.

## Rearguard

**Cost:** 2  
**Complexity:** Advanced  
**Primary threads:** Force preservation; retreat; limiting pursuit

> **Action:** Bank Rearguard as an Asset. After you lose a battle and retreat, when your opponent would use an Order or card effect to enter the space you occupy during that turn, you may discard Rearguard. If you do, they cannot use that Order or card effect. No Command is spent, and any card used for that effect is returned to its owner's hand.
>
> **Battle:** During battle cleanup, if you lose and retreat, bank Rearguard as an Asset instead of placing it in its normal destination.

Rearguard does not reverse the loss or restore the contested Territory. It preserves the defeated force by preventing one announced immediate pursuit into the space it occupies.

## Brothers in Arms

**Cost:** 2  
**Complexity:** Advanced  
**Primary threads:** Combined arms; commitment timing; battle-draw coordination

> **Action:** Bank Brothers in Arms as an Asset. Before you commit a Battle card from hand, you may discard Brothers in Arms. If you do, delay your commitment until after your initial battle draw. Then you may play one Battle card from your hand and one card from that draw face up together, if both Battle effects can still resolve. You must play both or neither.
>
> **Battle:** If Brothers in Arms is revealed in your initial battle draw and you did not commit a Battle card from hand, you may play one Battle card from your hand face up with it. If you do, play Brothers in Arms as your card from battle draw.

The hand card is the player's one normal commitment from hand, and the card selected from the initial battle draw is the player's normal battle-drawn play. Brothers in Arms does not create a third Battle-card play.

---

# Cost 3

## Field Command

**Cost:** 3  
**Complexity:** Advanced  
**Primary threads:** Command discipline; leader-dependent sequencing; combined Orders

> **Action:** Bank Field Command as an Asset. After you use a 1-Command Order, you may discard Field Command. If you do, you may use your leader's other 1-Command Order once this turn at its next legal timing without spending Command.
>
> **Battle:** After you use a 1-Command Order during this battle, you may use your leader's other 1-Command Order once this turn at its next legal timing without spending Command. If you do, place Field Command in your Graveyard after that Order resolves.

Field Command combines Onward with Rally for the General or Entrench with Repel for the Commandant. The first Order must be paid for normally, and the second still requires its normal legal timing.

## Reserve Force

**Cost:** 3  
**Complexity:** Advanced  
**Primary threads:** Prepared operations; delayed commitment; force allocation

> **Action:** Bank Reserve Force as an Asset and place one other Battle card from your hand face down beneath it. After Battle cards are revealed in a battle involving you, you may discard Reserve Force. If you do, play the stored card face up as an additional Battle card, if its Battle effect can still resolve. During battle cleanup, place the stored card in your Graveyard instead of its normal destination. If Reserve Force leaves play before the stored card is deployed, place the stored card in your Graveyard.
>
> **Battle:** After all Battle cards are revealed, you may replace Reserve Force with one Battle card from your hand whose Battle effect can still resolve. If you do, place Reserve Force in your Graveyard and play the chosen card face up. If you do not, place Reserve Force in your discard pile during battle cleanup instead of its normal destination.

The Action form is visible preparation that commits an Asset slot and a second card. The Battle form is a provisional commitment that can be replaced after the battlefield is revealed.

## Give Chase

**Cost:** 3  
**Complexity:** Advanced  
**Primary threads:** Pursuit; momentum; overextension

> **Action:** Play only after you win a battle you initiated. Move one space toward the opponent's Heartland. This movement may initiate a battle. If it does, you cannot commit a Battle card from hand or use Orders during that battle. During your initial battle draw, draw one fewer card for each battle beyond the first that you already fought this turn. This may reduce your battle draw to zero. Place Give Chase in your Graveyard after this movement.
>
> **Battle:** During battle cleanup, if you win this battle and initiated it, after the opponent retreats, move one space toward their Heartland. This movement may initiate a battle. If it does, you cannot commit a Battle card from hand or use Orders during that battle. During your initial battle draw, draw one fewer card for each battle beyond the first that you already fought this turn. This may reduce your battle draw to zero. Place Give Chase in your Graveyard after this movement.

The battle-draw reduction counts every additional battle already fought that turn, regardless of what caused it. The first battle of the turn is not counted.

---

# Cost 4

## Hold the Line

**Cost:** 4  
**Complexity:** Advanced  
**Primary threads:** Concentrated defense; visible risk; territorial commitment

> **Action:** Bank Hold the Line as an Asset. When a battle begins in which you are defending a Territory you control, before Battle cards are committed, you may place Hold the Line in your Graveyard. If you do, after all Battle cards are revealed, draw two additional battle cards and immediately play up to one of them face up, in addition to your other Battle cards, if its Battle effect can still resolve. If you lose, after you retreat, your opponent captures that Territory immediately.
>
> **Battle:** If you are defending a Territory you control, after all Battle cards are revealed, draw two additional battle cards and immediately play up to one of them face up, in addition to your other Battle cards, if its Battle effect can still resolve. If you lose, after you retreat, your opponent captures that Territory immediately. During battle cleanup, place Hold the Line in your Graveyard instead of its normal destination.

Hold the Line does not apply while defending a Heartland because Heartlands are not Territories. It concentrates defensive force by wagering the defender's normal counterattack window.

## Countercharge

**Cost:** 4  
**Complexity:** Advanced  
**Primary threads:** Defense into counterattack; initiative reversal; momentum

> **Action:** Bank Countercharge as an Asset. After you win a battle you did not initiate, you may place Countercharge in your Graveyard. If you do, after your opponent retreats, move one space toward their Heartland. This movement may initiate a battle.
>
> **Battle:** During battle cleanup, if you win this battle and did not initiate it, after your opponent retreats, move one space toward their Heartland. This movement may initiate a battle. Place Countercharge in your Graveyard after this movement.

The follow-up movement is unrestricted: if it initiates a battle, the countercharging player may commit from hand, use Orders, and receive normal battle draw. The new battle may occur during the opponent's turn.

## War Crimes

**Cost:** 4  
**Complexity:** Advanced  
**Primary threads:** Destructive exploitation; retreat pressure; sacrifice of normal victory benefits

> **Action:** Bank War Crimes as an Asset. After you win a battle, you may place War Crimes in your Graveyard. If you do, every card your opponent played from battle draw during that battle goes to their Graveyard instead of their discard pile, and they retreat one additional space. You cannot move, capture a Territory, or use an Order as a result of that victory.
>
> **Battle:** During battle cleanup, if you win, you may place every card your opponent played from battle draw during this battle in their Graveyard instead of their discard pile and make them retreat one additional space. If you do, you cannot move, capture a Territory, or use an Order as a result of this victory, and place War Crimes in your Graveyard instead of its normal destination.

War Crimes is now a Military card. It offers lasting harm only by surrendering the normal movement, immediate-capture, and Order exploitation available from that victory.

---

# Cost 5

## Shock and Awe

**Cost:** 5  
**Complexity:** Advanced  
**Unique:** Maximum one copy per deck  
**Primary threads:** Major offensive preparation; combined commitment; breakthrough versus consolidation

> **Action:** Bank Shock and Awe as an Asset. When you initiate a battle on an enemy-controlled Territory, before Battle cards are committed, you may place Shock and Awe in your Graveyard. If you do, after all Battle cards are revealed, you may play one Battle card from your hand face up as an additional Battle card, if its Battle effect can still resolve. During battle cleanup:
>
> - If you lose, retreat one additional space after completing your normal retreat.
> - If you win, choose **Breakthrough** or **Consolidate**.
>
> **Breakthrough:** Choose only if your opponent can retreat one additional space. After their normal retreat, they retreat one additional space. Then move one space toward their Heartland. This movement cannot initiate a battle.
>
> **Consolidate:** Capture the contested Territory immediately, then set your Command to 2.
>
> After resolving the chosen option, you cannot move again, capture another Territory, or use an Order as a result of that victory.
>
> **Battle:** If you are attacking on an enemy-controlled Territory, after all Battle cards are revealed, you may play one Battle card from your hand face up as an additional Battle card, if its Battle effect can still resolve. During battle cleanup:
>
> - If you lose, retreat one additional space after completing your normal retreat.
> - If you win, choose **Breakthrough** or **Consolidate**.
>
> **Breakthrough:** Choose only if your opponent can retreat one additional space. After their normal retreat, they retreat one additional space. Then move one space toward their Heartland. This movement cannot initiate a battle.
>
> **Consolidate:** Capture the contested Territory immediately, then set your Command to 2.
>
> After resolving the chosen option, you cannot move again, capture another Territory, or use an Order as a result of that victory. During battle cleanup, place Shock and Awe in your Graveyard instead of its normal destination.

Shock and Awe is the Military statement card. It provides exceptional post-reveal commitment flexibility, punishes failure with a deeper retreat, and requires the victor to choose between a two-space positional breakthrough and immediate territorial consolidation with full Command.

---

## Package audit

### Strategic coverage

The selected pool supports:

- Command restraint and allocation through Unbroken Ranks and Field Command;
- positional Command infrastructure through Encampment;
- hand and battle-draw coordination through Brothers in Arms, Reserve Force, Hold the Line, Battlefield Promotion, and Shock and Awe;
- pursuit and overextension through Give Chase;
- force preservation through Rearguard and Battlefield Promotion;
- defense into counterattack through Countercharge;
- consolidation, destructive exploitation, and breakthrough as competing post-victory outcomes through War Crimes and Shock and Awe.

### Leader integration

- The **General** receives more ways to continue pressure, coordinate offensive commitments, and decide whether another advance is worth the risk.
- The **Commandant** receives prepared defense, immediate counterattack, positional Command, and stronger consolidation choices.
- Field Command changes directly between the leaders, while Encampment, Reserve Force, Battlefield Promotion, Brothers in Arms, War Crimes, and Shock and Awe remain broadly useful under either leader.

### Preserved weaknesses

The package does not give Military:

- an alternate victory condition;
- broad cancellation or hand surveillance;
- generic unconditional card draw;
- reliable passive Command without positional or victory requirements;
- routine capture shortcuts across the whole pool;
- automatic superiority in battle math.

Military must still win battles, expose cards and position, manage a maximum of 2 Command, and risk overextension to convert success into board advantage.

### Primary package playtest watchlist

1. Confirm that the 1 / 4 / 3 / 3 / 1 curve provides enough premium identity without making Military decks unusually cheap.
2. Test whether Battlefield Promotion at cost 2 creates healthy conditional preservation rather than routine card advantage.
3. Test whether Unbroken Ranks makes 2-Command post-victory Orders too reliable.
4. Verify timing for Field Command with Repel and other post-victory Orders.
5. Test Reserve Force and Brothers in Arms for excessive post-reveal commitment reliability.
6. Test cumulative battle fatigue on Give Chase across Rout, Invasion, Countercharge, and other extra-battle effects.
7. Verify that Hold the Line's immediate-capture penalty is visible and sufficiently dangerous.
8. Test unrestricted out-of-turn battles created by Countercharge.
9. Test whether War Crimes produces excessive long-game card denial or retreat pressure.
10. Compare Shock and Awe's Breakthrough and Consolidate choices across board positions and both leaders.
11. Confirm all cleanup destinations when several replacement effects apply to the same card.
12. Reconsider Standing Orders only if testing reveals a genuine Command-access gap in the selected package.
