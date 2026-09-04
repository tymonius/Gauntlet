# Gauntlet v0.6.3 Shared Rules Test Matrix

**Status:** Normative source-layer acceptance matrix  
**Baseline:** Gauntlet v0.6.2  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Governing candidate:** [Gauntlet v0.6.3 Shared Rules Candidate](Gauntlet_v0.6.3_Shared_Rules_Candidate.md)

These scenarios govern the v0.6.3 setup and Run the Gauntlet revisions. Later structured-data, player-surface, Rules Arbiter, print, and digital work must preserve the same outcomes.

---

## A. Starting position and Territory state

### V063-S01 — Tokens start on the Gauntlet

**Given:** Setup is complete.  
**Then:** Each Player Token is on the Territory at that player's own end of the Gauntlet, not immediately before the Gauntlet.

### V063-S02 — Starting Territory remains controlled

**Given:** A player begins on the Territory at their own end.  
**Then:** The Territory remains controlled by that player because it faces them.

### V063-S03 — Territory arrangement follows opening selection

**Given:** A player has not yet arranged their three Territories.  
**When:** The player completes the draw-four-discard-one opening selection.  
**Then:** The player secretly arranges their Territories with the three-card opening Hand and face-up opening discard known.

### V063-S04 — Setup placement is not movement

**Given:** A Player Token is placed on its starting Territory during setup.  
**Then:** The placement is not an Advance, Hold, Fall Back, retreat, withdrawal, or other movement.

### V063-S05 — Setup placement is not entering

**Given:** A Territory has an effect that triggers when a player enters it.  
**When:** The owner's token is placed there during setup.  
**Then:** The enter-triggered effect does not occur.

### V063-S06 — Continuous Territory effect applies on first turn

**Given:** A player's starting Territory has a continuous effect and its requirements are satisfied.  
**Then:** The effect applies normally during the first turn.

### V063-S07 — Beginning-of-turn effect applies on first turn

**Given:** A player's starting Territory has an effect that applies at the beginning or start of that player's turn.  
**Then:** The effect may apply during the player's first turn.

### V063-S08 — Territory ordering uses opening information

**Given:** A player has completed opening selection.  
**Then:** The player may use the known opening Hand and opening discard when choosing which Territory will be at their own end and how the other two Territories are ordered.

---

## B. Opening Hand selection

### V063-S09 — Draw four

**Given:** Faction setup and Deck modifications are complete.  
**When:** A player prepares the opening Hand.  
**Then:** The player shuffles the remaining cards in the Deck to form the Draw Pile and draws four cards.

### V063-S10 — Discard exactly one

**Given:** A player has drawn four opening cards.  
**Then:** The player chooses exactly one of those four and places it face up in the Discard Pile.

### V063-S11 — Opening Hand remains three

**Given:** A player has completed the opening discard.  
**Then:** The other three cards form the player's opening Hand.

### V063-S12 — Discard Pile exists before first turn

**Given:** Setup is complete.  
**Then:** Each player normally has one face-up card in the Discard Pile before the first turn begins.

### V063-S13 — Opening selection precedes initiative

**Given:** Both players are preparing their opening state.  
**Then:** Both complete opening selection and Territory arrangement before either player rolls to determine who takes the first turn.

### V063-S14 — First-player roll cannot inform setup choices

**Given:** A player would choose a different discard or Territory order if they knew they were first or second.  
**Then:** That information is unavailable because the roll occurs only after both opening selection and Territory arrangement are complete.

### V063-S15 — Mandatory procedure

**Given:** A player likes all four opening cards.  
**Then:** The player must still discard one; the procedure is not an optional mulligan.

### V063-S16 — Opening discard is not a card-effect discard

**Given:** An effect triggers when a player discards a card as a cost or effect.  
**When:** The player makes the opening discard during setup.  
**Then:** That effect does not trigger unless it expressly refers to the opening discard or setup.

### V063-S17 — First-turn Discard Pile interaction

**Given:** A first-turn rule or effect may legally use a card in the Discard Pile.  
**Then:** It may interact with the card deliberately placed there during setup.

---

## C. Normal victory terminology

### V063-S18 — Capture route is running the Gauntlet

**Given:** A player captures the Territory at the opponent's end.  
**Then:** That player has run the Gauntlet and wins immediately.

### V063-S19 — Last Stand battle route is running the Gauntlet

**Given:** A player forces the opponent to make a Last Stand and wins the resulting battle.  
**Then:** That player has run the Gauntlet and wins immediately.

### V063-S20 — Both are normal shared victory routes

**Given:** A player-facing summary explains the normal victory condition.  
**Then:** It presents final-Territory capture and Last Stand victory as two ways to run the Gauntlet, not one normal victory and one exceptional alternate victory.

### V063-S21 — Faction alternate victories remain separate

**Given:** A faction wins through its faction-specific victory condition.  
**Then:** That victory is not automatically labeled running the Gauntlet unless its rule expressly says so.

---

## D. Final-Territory capture victory

### V063-S22 — Normal Capture wins before Draw

**Given:** A player begins the turn occupying the opponent's final Territory and the normal Capture step adds it to the player's Front Line.  
**Then:** The player immediately runs the Gauntlet and wins before the Draw step.

### V063-S23 — Immediate-capture ability wins

**Given:** A Leader ability legally captures the opponent's final Territory outside the normal Capture step.  
**Then:** The player immediately runs the Gauntlet and wins.

### V063-S24 — Card capture effect wins

**Given:** A playable-card effect legally advances the player's Front Line to include the opponent's final Territory.  
**Then:** The player immediately runs the Gauntlet and wins.

### V063-S25 — Faction capture effect wins

**Given:** A faction rule legally captures the opponent's final Territory.  
**Then:** The player immediately runs the Gauntlet and wins.

### V063-S26 — Territory capture effect wins

**Given:** A Territory effect legally causes capture of the opponent's final Territory.  
**Then:** The player immediately runs the Gauntlet and wins.

### V063-S27 — No final-Territory suppression

**Given:** An effect normally captures a Territory immediately.  
**When:** The affected Territory is the opponent's final Territory.  
**Then:** The capture is not delayed, converted into Occupation, or postponed until the next Capture step merely because it can win.

### V063-S28 — Commandant payoff remains intact

**Given:** The Commandant legally uses Fortify or another approved immediate-capture ability on the opponent's final Territory.  
**Then:** The ability can produce immediate victory through the capture route.

### V063-S29 — Front Line continuity still required

**Given:** An effect cannot legally create non-contiguous control under the Front Line rules.  
**Then:** The final-Territory victory rule does not waive that legality requirement. The capture must first be legal.

### V063-S30 — Capture consequences resolve consistently

**Given:** Capturing the final Territory also changes orientation, Front Line, Asset capacity, Deeds, or another mandatory state.  
**Then:** The legal capture and its required immediate consequences resolve consistently, and the player wins before a later phase or voluntary procedure.

---

## E. Last Stand access

### V063-S31 — Losing defender retreats beyond the Gauntlet

**Given:** A player loses while defending the Territory at their own end.  
**Then:** That player retreats beyond their end under the inherited edge-of-Gauntlet retreat rules.

### V063-S32 — Attacker occupies the uncaptured final Territory

**Given:** The attacker wins on the opponent's final Territory and the Territory still faces the opponent.  
**Then:** The attacker remains there as occupier unless another effect moves them.

### V063-S33 — Prior control not required

**Given:** The opponent is beyond the Gauntlet and the attacker is on the opponent-controlled final Territory.  
**Then:** The attacker may force the opponent to make a Last Stand through a new legal Advance without first capturing or controlling that Territory.

### V063-S34 — Separate movement sequence required

**Given:** The attacker has just won the battle that forced the opponent beyond the Gauntlet.  
**Then:** The movement sequence that created that battle is over. The attacker cannot use leftover movement from it to force the opponent to make a Last Stand.

### V063-S35 — Follow-up movement can force the opponent to make a Last Stand

**Given:** After forcing the opponent beyond the Gauntlet, a rule or effect grants the attacker another movement sequence.  
**When:** The attacker Advances beyond the opponent's end.  
**Then:** The opponent makes a Last Stand.

### V063-S36 — General payoff remains intact

**Given:** A General Order or other legal follow-up movement effect grants another movement sequence after the opponent is forced beyond the Gauntlet.  
**Then:** The General may use that sequence to immediately force the opponent to make a Last Stand.

### V063-S37 — Merely standing on the final Territory is not a Last Stand

**Given:** The opponent is beyond the Gauntlet and the attacker remains on the final Territory.  
**Then:** No Last Stand begins until the attacker legally Advances beyond the opponent's end.

### V063-S38 — No follow-up movement means counterattack window remains

**Given:** The attacker forces the opponent beyond the Gauntlet but receives no new movement sequence.  
**Then:** The attacker remains on the final Territory and the opponent receives the normal turn and response opportunity.

### V063-S39 — Surviving response can lead to capture victory

**Given:** The attacker remains on the final Territory through the opponent's response turn.  
**When:** The attacker's next Capture step legally captures it.  
**Then:** The attacker immediately runs the Gauntlet and wins through the capture route.

### V063-S40 — Last Stand victory is immediate

**Given:** The attacker forces the opponent to make a Last Stand and wins the resulting battle.  
**Then:** The attacker immediately runs the Gauntlet and wins without also needing to capture the final Territory.

### V063-S41 — Last Stand Defensive Edge remains inherited

**Given:** A Last Stand begins and no effect removes Defensive Edge.  
**Then:** The defender has Defensive Edge under the inherited v0.6.2 Last Stand rules.

### V063-S42 — Last Stand loss uses inherited result

**Given:** The attacker loses the resulting Last Stand battle.  
**Then:** Resolve the inherited v0.6.2 Last Stand loss, retreat, and destination rules. The v0.6.3 victory revision does not silently replace them.

---

## F. Cross-surface wording gates

### V063-S43 — No token-before-Gauntlet setup

No active v0.6.3 player-facing or digital setup source may instruct players to place tokens immediately before their first Territories.

### V063-S44 — No setup-entry trigger

No active v0.6.3 source may treat placement on the starting Territory during setup as entering that Territory or trigger an enter effect from that placement.

### V063-S45 — No random three-card opening

No active v0.6.3 source may instruct players simply to draw three opening cards without the draw-four-discard-one procedure.

### V063-S46 — No initiative before opening decisions

No active v0.6.3 source may determine first player before both opening selection and Territory arrangement are complete.

### V063-S47 — No final-control prerequisite for Last Stand

No active v0.6.3 source may require the attacker to control or capture the opponent's final Territory before a new legal Advance can force the opponent to make a Last Stand.

### V063-S48 — No Last-Stand-only definition of running the Gauntlet

No active v0.6.3 source may define running the Gauntlet solely as winning a Last Stand.

### V063-S49 — Immediate-capture effects remain consistent

All active v0.6.3 Leader, faction, card, Territory, Rules Arbiter, and digital sources must permit a legal immediate capture of the final Territory to win.

### V063-S50 — Published v0.6.2 remains immutable

The v0.6.3 source layer must not modify files under `releases/v0.6.2-withdrawn/`.

---

## Acceptance summary

The source layer passes when all 50 scenarios are represented and later implementations can demonstrate:

- correct starting position and first-turn Territory behavior;
- opening selection before informed Territory arrangement;
- first-turn Territory applicability without false enter triggers;
- draw four, discard one, keep three before initiative;
- final-Territory capture and Last Stand victory as equal Run the Gauntlet routes;
- consistent immediate-capture victory;
- Last Stand access through a separate legal Advance without prior final-Territory control; and
- preservation of the immutable v0.6.2 release boundary.
