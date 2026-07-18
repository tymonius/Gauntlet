# Gauntlet v0.6 Preliminary Core Rules

> **Preliminary release source — not yet canonical data.**  
> This document is the shared rulebook intended to accompany the definitive v0.6 faction guides. It consolidates the v0.5.7 core rules, current v0.6 rules decisions, and faction-integration rules into one self-contained player-facing draft. Faction guides govern faction-specific rules and override this document only where they explicitly say so.

## Current package status

The following faction inserts are complete and may be used with this draft:

- **Military** — General or Commandant
- **Diplomats** — Ambassador or Senator
- **Inquisition** — Grand Inquisitor or Witch Hunter
<<<<<<< ours
- **Financiers** — Banker or Executive

Mystics and Intelligence remain in development. This draft should not be treated as the final v0.6 canonical release until all six faction packages, cross-card interactions, physical review, and canonical data are complete.
=======
- **Mystics** — Alchemist or Spirit Walker

Financiers and Intelligence remain in release development. This draft should not be treated as the final v0.6 canonical release until all six faction packages, cross-card interactions, physical review, and canonical data are complete.
>>>>>>> theirs

---

# 1. Game overview

Gauntlet is a two-player tactical card-and-territory game. Each player commands a faction, builds a deck, contributes three Territories to a shared battlefield, and attempts to advance through the opposing line.

Players draw and play cards, establish Assets, reveal and exploit Territories, fight battles, occupy enemy ground, survive counterattacks, and capture positions. Every faction may win by **running the Gauntlet**: defeat the opponent in their Heartland. Some factions also have a public alternate victory condition described in their faction guide.

## The central objective

> Advance across the six Territories of the Gauntlet and defeat the opposing player in their Heartland.

Territorial progress is meaningful but reversible. An attacker who wins on enemy ground occupies it first; the defender normally receives one turn to counterattack before the Territory is captured.

---

# 2. Rules hierarchy

When rules conflict, apply them in this order:

1. A specific card or Territory effect.
2. The selected faction guide and Leader Card.
3. These core rules.

A specific effect overrides a general rule only to the extent stated. Impossible instructions, source-dependent Battle effects, and effects that resolve or repeat other Battle effects follow the bounded rules in section 13. Faction guides may define a specific one-layer exception.

## Definitive faction sources

Use the corresponding definitive faction guide for all faction resources, leaders, alternate victories, supplemental components, and faction-card text:

- `faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`
- `faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`
- `faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`
<<<<<<< ours
- `faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`
=======
- `faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md`
>>>>>>> theirs

---

# 3. Components

A two-player game requires:

- one constructed deck per player;
- three selected Territories per player;
- one selected Leader Card per player;
- any supplemental cards required by the selected faction;
- one player token per player;
- at least two standard six-sided dice;
- the six-Territory Gauntlet layout with a Heartland at each end.

## Playable cards

Game cards consist of main-deck cards and separately selected Territories. Main-deck cards normally have:

- a title;
- a deckbuilding value;
- an **Action** effect;
- a **Battle** effect;
- any traits, uniqueness, or reminder text.

A card may have no usable effect at a particular time. A card can be played only when its text and the rules permit it.

## Supplemental cards

Supplemental cards are kept with a deck for setup, tracking, or reference. Examples include:

- Leader Cards;
- faction references;
- resource trackers;
- Proposal / Treaty Article cards;
- Rite cards and faction references;
- Order, Purge, turn, battle, and capture references.

Supplemental cards:

- do not count toward deck size or deckbuilding value;
- are not shuffled into the deck;
- are not cards in play;
- cannot be drawn, played, discarded, banked, captured, revealed, sent to the Graveyard, or affected unless a rule specifically says otherwise;
- may be double-sided and need not use the normal card back.

## Heartlands

Heartlands are the endpoints of the battlefield. They are not cards and are not Territories.

Heartlands:

- are not selected during deck construction;
- cannot be revealed, controlled, occupied, captured, banked, discarded, or sent to the Graveyard as cards;
- cannot receive Territory effects or Overlays unless a rule specifically permits it;
- do not count for effects that count Territories;
- do not increase Asset-bank limits;
- have no Deeds or other Territory ownership components.

---

# 4. Deck construction

Before play, each player constructs a main deck, chooses a faction and leader, and selects three Territories.

## Main deck

A legal main deck contains:

- at least **30 cards**;
- no more than **60 total deckbuilding value**.

Unless marked **Unique**, a card may appear in any quantity permitted by the available card pool. A Unique card is limited to one copy per deck.

## Faction legality

Choose one faction for the deck. The main deck may contain:

- Neutral cards; and
- cards belonging to the selected faction.

It may not contain cards belonging exclusively to another faction unless a rule specifically allows it.

Choose one leader from the selected faction. The Leader Card is supplemental and does not count toward the 30-card minimum or 60-value maximum.

## Territories

Select exactly **three different Territories**.

- No more than one selected Territory may be an **Arena**.
- Territories are not shuffled into the main deck.
- Territories do not count toward the main-deck card minimum or deckbuilding-value maximum.
- Both players may select the same Territory titles unless a scenario says otherwise.

---

# 5. Setup

1. **Present Territories.** Each player reveals the identities of their three selected Territories.
2. **Build the Gauntlet.** Each player secretly arranges their three Territories face down in a line extending from their Heartland toward the center. Join the two three-card lines to form a six-Territory battlefield between the Heartlands.
3. **Establish control.** Each player controls the three Territories on their side of the Gauntlet, even while they remain face down.
4. **Place tokens.** Each player places their token in their own Heartland.
5. **Prepare decks.** Shuffle the main deck and draw three cards.
6. **Prepare faction components.** Place the chosen Leader Card, faction tracker, references, and other required supplemental cards as directed by the faction guide.
7. **Choose the first player.** Determine the first player randomly. Reroll or repeat the random method if tied.

Each player's starting hand limit is three. Faction setup may establish a starting resource or additional public components.

---

# 6. Game areas and card zones

Each player maintains the following areas:

## Deck

The face-down draw pile.

## Hand

Private cards available for Action play, Battle commitment, or other effects. The normal hand limit is three.

## Discard pile

A face-up recyclable pile. When the deck cannot complete a draw, shuffle the discard pile to form a new deck and continue drawing.

## Graveyard

A face-up permanent-loss pile. The Graveyard is never reshuffled unless an effect specifically moves a card out of it.

## Asset bank

The public area containing banked Assets controlled by that player.

## Other faction or effect areas

Some rules create additional areas, such as a Treasury, Active Mission, Special Operation, bound-card area, or Treaty Article display. These areas follow the rules that create them and are not automatically part of the deck, discard pile, Graveyard, or Asset bank.

---

# 7. Turn sequence

A turn proceeds in this order.

## 1. Start of turn

Resolve these events in order:

1. **Capture:** If you begin your turn occupying an enemy-controlled Territory, capture it unless an effect delays or prevents capture.
2. **After-capture checks and effects:** Resolve faction victories, income, and effects that occur at the start of the turn after captures.
3. **Normal draw:** Draw one card, plus or minus any applicable effects.
4. **After-draw checks and effects:** Resolve effects that occur after the normal draw attempt.

## 2. Action window before movement

You may use your normal Action opportunity now, unless you reserve it for after movement.

## 3. Movement phase

Choose to advance, hold, or voluntarily withdraw. Resolve any battle caused by movement immediately.

## 4. Action window after movement

If you have not used your normal Action opportunity, you may use it now.

## 5. End of turn

Resolve end-of-turn effects, then discard down to the three-card hand limit.

## Normal Action opportunity

During your turn, you may normally play **one Action card**, either before or after movement. This limit is independent from Battle-card plays.

Whenever you could use the normal Action opportunity, you may instead perform one rule or faction action that explicitly replaces playing an Action card, such as:

- voluntarily revealing a Territory you occupy and control;
- voluntarily discarding one banked Asset;
- using a faction action such as Purge;
- beginning or completing a faction objective where permitted.

An effect that grants an additional Action-card play creates an additional Action opportunity unless it says otherwise. When an effect tells a player to **take an extra action**, it grants one additional Action opportunity that turn; it may be used for any normal Action replacement but does not grant movement unless the effect specifically says so.

---

# 8. Drawing, reshuffling, and hand limit

When drawing cards:

1. Draw as many as possible from the deck.
2. If more cards are required and the discard pile is not empty, shuffle the discard pile to form a new deck.
3. Continue drawing until the requested number is drawn or no cards remain available.
4. Cards already drawn during that draw action are never shuffled back into the deck.
5. The Graveyard is never reshuffled.

If the deck and discard pile cannot provide the full requested draw, draw as many cards as possible.

A player may temporarily exceed the hand limit. Unless a rule says otherwise, discard down to three only during end-of-turn cleanup.

---

# 9. Actions, Assets, and persistent effects

## Playing an Action effect

To play a card's Action effect:

1. play it from hand during a legal Action window;
2. pay or satisfy any stated cost or requirement;
3. resolve its Action text;
4. place it in the discard pile unless it becomes an Asset or Overlay or specifies another destination.

## Assets

A card is an Asset only when its effect banks it in the Asset bank.

A player's Asset-bank limit equals the number of Territories they control.

- Occupied enemy Territories do not count until captured.
- Heartlands do not count.
- If control changes and a player's limit falls below their number of banked Assets, that player immediately chooses and discards Assets until within the new limit.
- An inactive Asset still occupies an Asset-bank slot unless a rule says otherwise.

## Voluntary Asset removal

Whenever a player could play an Action card during their turn, they may instead discard one banked Asset they control.

- This uses that Action opportunity.
- It is not playing an Action card.
- A card may prohibit or delay its own voluntary removal.

## Conditions are retired

Gauntlet v0.6 does not use Conditions as a general card category. Persistent playable-card effects use:

- **Assets**, which belong to a player and use Asset-bank capacity;
- **Overlays**, which attach visibly to a Territory; or
- immediate or explicitly self-tracking resolution.

---

# 10. Territories

## Control

A player controls a Territory when it faces that player.

- Each player controls their three starting Territories.
- Control does not require the controlling player's token to remain there.
- Control changes only through capture or a specific effect.
- Rotating a Territory to face its new controller records the change.

## Face-down Territories

A face-down Territory has no active printed effect.

When an opponent enters a face-down Territory:

1. reveal it before any battle or other entry-triggered resolution;
2. keep the movement that entered it completed;
3. apply the revealed text from that point forward unless the Territory explicitly affects the revealing movement.

Revealed Territories remain face up.

## Voluntary reveal

During a normal Action window, a player occupying and controlling a face-down Territory may reveal it instead of playing an Action card.

- Revealing it uses the normal Action opportunity.
- Its ongoing effect becomes active immediately.
- An optional effect that is legal at that timing may be used as part of the reveal.
- A Territory cannot be voluntarily revealed merely because it is controlled; the controller must also occupy it.

## Active Territory text

A face-up Territory's printed effect is active unless its text states otherwise or an Overlay or effect suppresses it.

Control and occupation matter only when the Territory's text specifically refers to them.

---

# 11. Movement

During the Movement phase, choose one:

- **Advance:** Move one space toward the opponent's Heartland.
- **Hold:** Remain in place.
- **Voluntarily withdraw:** Move one space toward your own Heartland.

Movement does not require a roll.

## General movement rules

- Players cannot move through or past one another.
- A player in their own Heartland cannot voluntarily withdraw.
- A player may stop before using all movement granted by an effect.
- A player cannot change direction during the same Movement phase unless an effect explicitly permits it.
- Entering an occupied space begins a battle and normally ends the current movement sequence.
- Forced movement, retreat, and movement created by an effect follow their own text.

## Entering an unoccupied Territory

- Entering an unoccupied Territory you control does not change its control.
- Entering an unoccupied enemy-controlled Territory captures it immediately: reveal it if needed, rotate it to face you, and apply resulting control changes.

## Withdrawal

When a player **withdraws**, move that player one space away from the opposing player and toward their own Heartland, if able.

- If the attacker withdraws from a battle, they return to the space they entered from, if able.
- If the defender withdraws, they move one space toward their own Heartland and the attacker remains in or occupies the battle space.
- If both players withdraw, move the attacker first, then the defender.
- Withdrawal is not retreat unless a rule specifically says otherwise.

---

# 12. Battles

A battle begins when a player enters a space occupied by the opponent or when an effect explicitly begins one.

The moving or initiating player is the **attacker**. The player already in the contested space is the **defender**.

## Battle sequence

### 1. Begin-battle effects

Reveal a face-down contested Territory if required. Resolve effects that occur when the battle begins or before Battle cards are committed. A faction mechanic such as Terms may replace the battle before commitments occur.

### 2. Hand commitments

In order:

1. the attacker commits up to one eligible Battle card from hand face down, or passes;
2. the defender commits up to one eligible Battle card from hand face down, or passes.

A hand commitment is optional. A battle-drawn card is not a hand commitment.

### 3. Initial battle draw and selection

Each player has a normal initial battle-draw amount of three cards, modified by applicable effects.

In order:

1. the attacker draws their battle-draw amount and chooses up to one eligible card from it to play face down, or passes;
2. the defender does the same.

A player may always play fewer battle-drawn cards than allowed, including zero. Keep unplayed battle-drawn cards separate until battle cleanup.

### 4. Special reveal and normal reveal

Resolve any effect that occurs before normal reveal. Then reveal all played Battle cards.

### 5. Resolve pre-roll Battle effects

Resolve applicable effects in timing order. Unless an effect establishes another order, the attacker's effects resolve before the defender's within the same timing window.

Negation, cancellation, replacement, and source-changing effects are resolved before effects that depend on the affected card where necessary.

### 6. Roll battle dice

Each player normally rolls one six-sided die.

#### Advantage and disadvantage

Combine all instances of advantage and disadvantage before rolling. They cancel one-for-one.

- For each net advantage, roll one additional die and use the highest result.
- For each net disadvantage, roll one additional die and use the lowest result.

After selecting the die result, resolve rerolls and die-result changes in their specified order, then apply numerical modifiers to determine each battle total.

### 7. Determine the winner

The higher battle total wins.

#### Homeland Advantage

A defender has Homeland Advantage while defending any space they control. If the battle totals are tied, that defender wins.

If neither player resolves the tie through Homeland Advantage, both players reroll. Cards already played remain in effect.

#### Heartland defense

While defending their own Heartland, a player adds **+1 to their battle total**. This is separate from and stacks with Homeland Advantage.

### 8. Resolve result and after-battle effects

Resolve effects triggered by winning, losing, retreat, remaining, occupation, or the battle ending. Unless another order is specified, resolve the attacker's effects before the defender's within the same timing window.

### 9. Retreat and occupation

Unless an effect says otherwise:

- the loser retreats one space toward their own Heartland;
- the winner remains in or moves onto the contested space;
- an attacker who wins on an enemy-controlled Territory occupies it but does not capture it yet;
- a defender who wins remains in the contested space;
- a counterattacker who wins retakes physical possession of a Territory they already control.

### 10. Battle cleanup

Move cards to their normal destinations, then discard all unplayed battle-drawn cards.

---

# 13. Battle-card destinations and status

## Normal destinations

- A Battle card committed from hand normally goes to its owner's Graveyard after battle.
- A Battle card played from battle draw normally goes to its owner's discard pile after battle.
- Unplayed battle-drawn cards go to their owner's discard pile.
- A Battle card replayed from a discard pile or Graveyard normally goes to the Graveyard after battle unless the effect says otherwise.

## Negated cards

A **negated** card has no effect. Unless the negating effect says otherwise, it remains played and follows its normal destination.

## Canceled cards

When a played card is canceled and the canceling effect does not specify another destination:

- a canceled hand commitment returns to its owner's hand;
- a canceled battle-drawn card goes to its owner's discard pile.

## Effects that resolve or repeat other Battle effects

An effect that resolves or repeats another card's Battle effect cannot choose an effect that would play another Battle card or resolve or repeat another Battle effect unless it explicitly permits one additional layer. An additional layer cannot create another layer.

When a Battle effect resolves an additional time:

- make all choices again;
- pay all costs again;
- apply source-dependent instructions only when they can legally function;
- apply instructions that change the source card's destination or status only once.

An impossible instruction does not prevent the rest of an otherwise legal effect from resolving unless that instruction is a required cost or target. These limits prevent indefinite recursive chains while permitting explicitly bounded exceptions.

---

# 14. Occupation, counterattack, and capture

## Occupation

When an attacker wins a battle on an enemy-controlled Territory:

- the defender retreats;
- the attacker remains on the Territory;
- the Territory continues facing its current controller;
- the attacker **occupies** it without controlling it.

Occupation is the one-turn window before normal capture. Occupied enemy Territories do not increase the occupier's Asset-bank limit and do not reduce the controller's limit until capture.

## Counterattack

On the original controller's next turn, they may advance to counterattack the occupying opponent. This is a normal battle:

- the returning player is the attacker;
- the occupying player is the defender;
- Homeland Advantage belongs to the defender only if the defender controls the space, which an occupier normally does not.

The original controller may choose not to counterattack.

## Delayed capture

If the occupying player still occupies the Territory at the start of their next turn, they capture it before drawing or moving:

1. rotate the Territory to face the occupying player;
2. that player now controls it;
3. recalculate both players' Asset-bank limits immediately;
4. resolve any capture triggers;
5. continue the turn.

A specific effect may capture immediately, delay capture, or prevent capture.

---

# 15. Overlays and Ruins

An **Overlay** is placed face up over a revealed Territory. Overlays cannot be placed on Heartlands unless a rule specifically allows it.

- Only the top exposed Overlay is active.
- The active Overlay supersedes the printed effect of the card immediately beneath it.
- If another Overlay lies beneath it, that lower Overlay is dormant: its text is inactive and any expiration timer pauses.
- Changing control does not remove or rearrange Overlays.
- When the top Overlay is removed, the next exposed Overlay becomes active; if none remains, the Territory's printed effect becomes active again.
- A removed Overlay follows the destination stated by its effect or its normal destination if none is stated.
- Unless an Overlay says otherwise, its owner makes all choices for its effect. Changing control of the Territory does not transfer ownership of the Overlay.
- A printed condition that removes an Overlay remains active while that Overlay is dormant beneath another Overlay.

## Ruins

A Ruins Overlay makes the underlying Territory's printed effect inactive while exposed.

- A Territory is either ruined or not; it cannot be doubly ruined.
- If a new Ruins Overlay is placed on a Territory that already has one, place the existing Ruins Overlay in its owner's Graveyard, then place the new one.
- Ruins remain until removed by an effect.
- There is no universal Repair action in v0.6.

---

# 16. Victory

## Running the Gauntlet

Every faction may win through normal breakthrough.

> When you attack the opponent in their Heartland and win that battle, you immediately win the game.

A Heartland cannot be captured. The battle itself determines victory.

## Faction victories

Some factions have an alternate victory condition described in their definitive guide and displayed publicly on their Leader Card or faction references.

- Alternate-victory progress must remain public unless a rule specifically makes part of it hidden.
- Complete the victory check at the timing stated by the faction guide.
- Running the Gauntlet remains available even to factions with an alternate victory.

### Completed faction victories

| Faction | Victory paths |
|---|---|
| Military | Run the Gauntlet only |
| Diplomats | Run the Gauntlet or Peace Treaty |
| Inquisition | Run the Gauntlet or Purification |
<<<<<<< ours
| Financiers | Run the Gauntlet or Controlling Interest |
=======
| Mystics | Run the Gauntlet or Ritual |
>>>>>>> theirs

---

# 17. Completed faction integration

This section is only an integration summary. The definitive faction guides contain the complete rules and exact text.

## Military

- Choose the **General** or **Commandant**.
- Begin with 0 Command; maximum 2.
- The first time each turn the Military player wins a battle, gain 1 Command.
- Spend Command on the chosen leader's Orders.
- Military has no alternate victory condition.

## Diplomats

- Choose the **Ambassador** or **Senator**.
- Begin with 1 Influence; maximum 10.
- Before a battle involving the Diplomat, the Diplomat may offer eligible Terms by staking the Proposal's listed Influence.
- Accepted or imposed Proposals may become Treaty Articles.
- At the start of the Diplomat's turn after captures, five different ratified Articles win by Peace Treaty.

## Inquisition

- Choose the **Grand Inquisitor** or **Witch Hunter**.
- Begin with 0 Conviction; maximum 4.
- The first time each turn one or more opposing cards enter the Graveyard after a battle involving the Inquisition, gain 1 Conviction.
- Condemnation sends opposing played battle-drawn cards to the Graveyard after battle.
- Spend Conviction on Purges and leader or card effects.
- At the beginning of the opponent's turn, after their normal draw attempt, the Inquisition wins by Purification if the opponent draws no cards because both deck and discard pile are empty.

<<<<<<< ours
## Financiers

- Choose the **Banker** or **Executive**.
- Begin with 0 Capital and an empty Treasury.
- Capital limit equals controlled Territories plus the total value of cards in Treasury.
- Buy Deeds with Capital; base Deed cost and opposing-owner buyout premium stop scaling after 6.
- Gain 1 Capital per owned Deed at the start of the turn after captures.
- Spend Capital through Subsidize for escalating battle bonuses.
- Immediately win by Controlling Interest when you own the Deeds to every Territory currently in the Gauntlet.
=======
## Mystics

- Choose the **Alchemist** or **Spirit Walker**.
- Prepare the Mystics Reference and the three double-sided Rite cards.
- Begin one Rite after movement instead of playing an Action card; only one Rite may be begun but incomplete at a time.
- The first completed Rite unlocks **Invocation**; the second unlocks **Transmutation**; the third immediately wins by **Ritual**.
- Invocation moves one chosen Graveyard card to discard when an Arcane card is played, once per turn.
- Transmutation sends one card from hand to the Graveyard before battle dice are rolled and adds its deckbuilding value to the battle total, once per turn.
- All twelve Mystics faction cards have the **Arcane** trait.
>>>>>>> theirs

---

# 18. Core terminology

| Term | Meaning |
|---|---|
| **Action opportunity** | The normal chance to play one Action card or use a rule that replaces it. |
| **Advance** | Move one space toward the opponent's Heartland. |
| **Arena** | A Territory subtype; no more than one may be selected per player. |
| **Asset** | A persistent card banked in a player's Asset bank. |
| **Arcane** | A printed card trait referenced by Mystics and Inquisition rules; separate from faction allegiance. |
| **Bound card** | A card held outside normal zones by a Rite or another effect. |
| **Attacker** | The player who initiates or moves into a battle. |
| **Battle draw** | Cards drawn specifically for selection during a battle. |
| **Capture** | Change control of a Territory and rotate it toward the new controller. |
| **Control** | Ownership recorded by which player a Territory faces. |
| **Defender** | The player occupying the contested space when a battle begins. |
| **Discard** | Place a card in its owner's discard pile. |
| **Graveyard** | Face-up permanent-loss pile that is not normally reshuffled. |
| **Heartland** | A player's endpoint and final defensive position; not a Territory. |
| **Homeland Advantage** | A defender controlling the battle space wins tied totals. |
| **Negate** | A played card has no effect but follows its normal destination. |
| **Occupy** | Be physically present on an enemy-controlled Territory without yet controlling it. |
| **Overlay** | A persistent card attached over a revealed Territory. |
| **Retreat** | Forced movement after losing a battle or through an effect. |
| **Supplemental card** | A non-playable leader, tracker, reference, or setup card kept with a deck. |
| **Unique** | Maximum one copy of that title per deck. |
| **Withdraw** | Move away from the opponent toward one's own Heartland; not automatically a retreat. |

---

# Appendix A. Turn quick reference

1. Capture occupied enemy Territory.
2. Resolve after-capture start-of-turn checks and effects.
3. Draw one card.
4. Resolve after-draw checks and effects.
5. Action before movement, if desired.
6. Advance, hold, or voluntarily withdraw; resolve any battle.
7. Action after movement, if the normal Action opportunity remains.
8. Resolve end-of-turn effects and discard down to three cards.

# Appendix B. Battle quick reference

1. Reveal the contested Territory and resolve begin-battle effects.
2. Attacker commits from hand or passes.
3. Defender commits from hand or passes.
4. Attacker draws and selects from battle draw or passes.
5. Defender draws and selects from battle draw or passes.
6. Resolve special reveal, then reveal all played Battle cards.
7. Resolve pre-roll effects; attacker before defender within the same timing.
8. Determine net advantage/disadvantage, roll, reroll or modify as directed, then calculate totals.
9. Resolve Homeland Advantage or reroll unresolved ties.
10. Resolve win/loss effects, retreat, occupation, and after-battle effects.
11. Move played and unplayed cards to their proper destinations.

# Appendix C. Preliminary release assembly

The intended v0.6 rule package is modular:

1. **Core Rules** — this document.
2. **Neutral Card Pool / Card Reference** — exact Neutral card text.
3. **Territory Reference** — exact Territory and Arena text.
4. **One faction guide per faction** — complete faction rules, leaders, components, strategy, and exact faction-card pool.
5. **General quick-reference cards.**
6. **Canonical data and recommended decklists** after all six factions and cross-card rules stabilize.

The core rulebook should not duplicate full faction mechanics or card pools. Faction inserts should not repeat general movement, battle, capture, Asset, Overlay, Heartland, or deck-construction rules except where a faction specifically changes them.
