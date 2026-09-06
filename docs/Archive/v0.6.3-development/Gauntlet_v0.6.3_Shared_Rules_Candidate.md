# Gauntlet v0.6.3 Shared Rules Candidate

**Status:** Adopted v0.6.3 shared-rule text awaiting full propagation  
**Baseline:** [Gauntlet v0.6.2](../releases/v0.6.2-withdrawn/README.md)  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Implementation ledger:** [Gauntlet v0.6.3 Implementation Ledger](Gauntlet_v0.6.3_Implementation_Ledger.md)

This document governs the adopted v0.6.3 changes to setup, starting position, opening Hand selection, Territory arrangement, the final Territory, Last Stand access, the normal shared victory condition, and the player-facing battle-start reminder.

All v0.6.2 rules not expressly replaced here remain inherited during v0.6.3 development. v0.6.2 remains the sole canonical published playtest release until v0.6.3 is assembled and released.

---

# 1. Setup

## How it works

Prepare faction components, then shuffle the remaining cards in your Deck to form your Draw Pile. Draw four, choose one to discard, and keep the other three as your opening Hand.

After seeing your opening selection, secretly arrange your three Territories. Form and reveal the six-Territory Gauntlet, place each Player Token on the Territory at that player's own end, and then roll to determine the first player.

## Complete rules

Prepare the game in this order:

1. **Prepare faction components.** Place Leaders, trackers, references, supplemental components, and apply any setup rules that add cards to or remove cards from the Deck.
2. **Prepare Draw Piles and opening Hands.** Shuffle the remaining cards in your Deck to form your Draw Pile. Draw four cards, choose one card from those four, and place it face up in your Discard Pile. The other three cards form your opening Hand.
3. **Arrange Territories.** After seeing your opening Hand and opening discard, secretly arrange your three Territory Cards in a line facing you.
4. **Form the Gauntlet.** Join both Territory lines to create one six-Territory column.
5. **Reveal Territories.** Reveal all six simultaneously. They remain face up unless an effect says otherwise.
6. **Place Player Tokens.** Place each Player Token on the Territory at that player's end of the Gauntlet.
7. **Determine first player.** After both players have chosen their opening discard and arranged their Territories, each player rolls one die. The higher result takes the first turn. Reroll ties.

### Starting Territory

Placing a Player Token during setup:

- is not movement;
- does not count as entering the Territory; and
- does not trigger an effect that occurs when the Territory is entered.

An effect that applies continuously, at the beginning of a turn, at the start of a turn, during Capture, or during another named phase may apply during the first turn normally when its requirements are satisfied.

### Opening selection and Territory arrangement

The discarded card forms the player's Discard Pile before the first turn begins.

The player chooses the opening discard without knowing who will take the first turn. This procedure is mandatory and does not count as discarding for the cost or effect of another card unless a rule expressly refers to the opening discard.

Territory arrangement occurs after the player has chosen the opening discard and knows the three-card opening Hand. A player may therefore use the known opening Hand and Discard Pile when deciding the order of their Territories.

---

# 2. Running the Gauntlet

## How it works

There are two normal ways to run the Gauntlet:

- capture the Territory at your opponent's end; or
- force the opponent to make a Last Stand and win the resulting battle.

Either result wins the game immediately.

## Complete rules

> **Run the Gauntlet:** A player runs the Gauntlet and wins immediately when that player either captures the Territory at the opponent's end of the Gauntlet or forces the opponent to make a Last Stand and wins the resulting battle.

Both routes are the normal shared victory condition. Rules and player-facing text may distinguish the **capture route** from the **Last Stand battle route**, but both are running the Gauntlet.

Faction-specific alternate victories remain separate victory conditions unless their rules expressly describe them otherwise.

---

# 3. Final-Territory Capture Victory

## How it works

If your Front Line reaches and captures the Territory at your opponent's end of the Gauntlet, you immediately run the Gauntlet and win.

## Complete rules

When a player captures the Territory at the opponent's end of the Gauntlet, that player immediately runs the Gauntlet and wins the game.

This victory check occurs as part of resolving the legal capture. It does not wait for a later phase, step, turn, or additional battle.

The capture may occur through:

- the normal Capture step;
- a Leader ability;
- a faction ability;
- a playable-card effect;
- a Territory effect; or
- any other rule that legally captures that Territory or advances the player's Front Line to include it.

A capture effect is not suspended, delayed, or treated differently merely because the captured Territory is the opponent's final Territory.

If multiple consequences occur from the same capture, resolve the capture and its required control, orientation, Front Line, and immediate capture consequences. The player then wins before proceeding to a later phase or voluntary procedure unless a specific simultaneous-resolution rule requires another order.

---

# 4. Forcing the Opponent to Make a Last Stand

## How it works

After you win on the opponent's final Territory and force the opponent beyond the Gauntlet, an effect that gives you another movement sequence may let you Advance beyond the Gauntlet and force the opponent to make a Last Stand immediately.

You do not need to control the final Territory first. You do need a separate legal Advance after the battle that forced the opponent beyond the Gauntlet.

## Complete rules

When a player loses a battle while positioned on the Territory at their own end of the Gauntlet, that player retreats beyond their end under the normal edge-of-Gauntlet retreat rules. The winner remains on the opposing final Territory unless another rule or effect moves them.

The winner is occupying that Territory while it remains controlled by the opponent.

A player forces the opponent to make a Last Stand when all of the following are true:

1. the opponent is positioned beyond their own end of the Gauntlet;
2. the advancing player is positioned on the Territory at the opponent's end;
3. a rule or effect grants the advancing player a new legal movement sequence; and
4. during that sequence, the advancing player Advances beyond the opponent's end of the Gauntlet.

The advancing player does not need to control or have captured the final Territory before forcing the opponent to make a Last Stand.

The movement sequence that caused the preceding battle ended when that battle was created. Unused movement from that sequence cannot carry the attacker directly into a Last Stand battle. The attacker must receive another movement sequence from a rule or effect.

Conduct the resulting battle under the inherited Last Stand battle rules. The defender normally has Defensive Edge while making a Last Stand unless an effect removes it.

If the attacker wins this battle, the attacker immediately runs the Gauntlet and wins the game.

If the attacker does not force the opponent to make a Last Stand, the attacker may remain on the opposing final Territory. The opponent may Counterattack or use any other legal response. If the attacker later captures the final Territory, the attacker wins through the capture route.

---

# 5. Clarifying examples

## Example A — ordinary capture route

Red wins a battle on Blue's final Territory. Blue retreats beyond the Gauntlet. Red has no effect granting another movement sequence, so Red remains on Blue's final Territory and occupies it.

Blue takes a turn and fails to dislodge Red. At the start of Red's next turn, Red's Capture step adds Blue's final Territory to Red's Front Line. Red captures it and immediately runs the Gauntlet. Red wins before drawing.

## Example B — immediate-capture route

The Commandant wins while occupying the opponent's final Territory and legally uses an ability that immediately captures that Territory. The Territory is added to the Commandant's Front Line. The Commandant immediately runs the Gauntlet and wins.

The ability is not delayed until the next Capture step and does not lose its capture effect because it reaches the final Territory.

## Example C — immediate Last Stand battle route

The General wins a battle on the opponent's final Territory and forces the opponent beyond the Gauntlet. That battle ends the movement sequence that created it.

A General Order then directly permits another movement sequence. During that sequence, the General Advances beyond the opponent's end and forces the opponent to make a Last Stand even though the final Territory still faces the opponent. If the General wins this battle, the General immediately runs the Gauntlet and wins.

## Example D — setup placement and Territory effects

A player begins on the Territory at their own end.

An effect that triggers when the Territory is entered does not trigger during setup. A continuous effect or an effect that applies at the beginning of the player's first turn may apply normally.

## Example E — informed Territory arrangement

A player draws four cards during setup, chooses one to place face up in the Discard Pile, and keeps the remaining three as the opening Hand. The player then arranges their Territories with both the opening Hand and opening discard known.

Only after both players have completed their opening selection and Territory arrangement do they roll for first player. A first-turn effect that can use the Discard Pile may interact with the chosen card under its normal rules.

---

# 6. Compact reference

## Setup

- Prepare faction components that affect the Deck.
- Shuffle the remaining Deck to form the Draw Pile.
- Draw four, discard one face up, and keep three.
- After seeing the opening selection, secretly arrange the three Territories.
- Form and reveal the Gauntlet.
- Place each Player Token on the Territory at that player's own end.
- Setup placement is not movement and does not count as entering.
- After both players complete opening selection and Territory arrangement, roll for first player.

## Run the Gauntlet

You run the Gauntlet and win immediately when you either:

- capture the Territory at your opponent's end; or
- force your opponent to make a Last Stand and win the resulting battle.

Any legal immediate capture of the final Territory can win.

After forcing the opponent beyond the Gauntlet, you may force the opponent to make a Last Stand with a separate legal Advance beyond their end. You do not need to control the final Territory first.

---

# 7. Player-Facing Editorial Additions — Battle Habit

This guidance is instructional rather than a new rule. It should be taught prominently in first-game material and reinforced in the complete Rulebook without becoming a numbered battle step.

## First Game Guide / Learn to Play — primary placement

Teach the habit as part of the first ordinary battle demonstration, before introducing the player's Gambit decision:

> **Before you commit cards to a battle, look beyond your Hand. Read the contested Territory and scan your Asset Bank. Those effects are easy to overlook once Gambits, Reserves, and Tactics begin, and some may matter at different points in the battle. Check when each effect can be used before you act.**

The shared tableside battle reference may summarize the same teaching point in its own instructional language, but should not simply repeat the Rulebook callout verbatim.

## Complete Rulebook — secondary callout

Place a visually distinct reminder near **Onset** or the beginning of the battle sequence. Do not add it as a numbered battle step:

> **DON'T FORGET THE BOARD**  
> Territory. Assets. Then Gambits.

The surrounding Rulebook text should make clear that this is a memory cue only. It does not alter the battle sequence, grant permission to use an effect, or change any printed timing.
