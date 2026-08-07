# Gauntlet v0.6.2 Shared Rules Test Matrix

**Status:** Normative Wave A scenario specification  
**Governing candidate:** [Gauntlet v0.6.2 Shared Rules Candidate](Gauntlet_v0.6.2_Shared_Rules_Candidate.md)  
**Tracker:** [Issue #489](https://github.com/tymonius/Gauntlet/issues/489)

This matrix defines the minimum shared-rule scenarios that must agree across the complete v0.6.2 rulebook, compact references, structured data, automated tests, Rules Arbiter packets, browser tools, and digital implementation.

A scenario marked **Wave B dependency** requires exact card or faction text before its automated fixture can be finalized. The expected shared-rule behavior is nevertheless fixed here.

---

# A. Turn and Action Model

## A01 — Action during Opening

**Given:** The active player has taken no Action this turn.  
**When:** They play a legal Action card during Opening.  
**Expect:** The card resolves; the player's normal Action is used; they may not take another ordinary Action during Denouement.

## A02 — Save the Action for Denouement

**Given:** The active player takes no Action during Opening.  
**When:** Movement and any resulting battle end, and the player reaches Denouement.  
**Expect:** They may take one legal Action during Denouement.

## A03 — One additional Action without same-phase permission

**Given:** An effect says, “You may take one additional Action this turn.”  
**When:** The player has two Actions available.  
**Expect:** They may take one during Opening and one during Denouement; they may not take both during either phase.

## A04 — Two Actions expressly permitted during Denouement

**Given:** An effect grants one additional Action and says both Actions may be taken during Denouement.  
**When:** The player reaches Denouement without taking an Action during Opening.  
**Expect:** They may take two legal Actions during Denouement in the order they choose.

## A05 — Phase capacity without another Action

**Given:** An effect permits up to two Actions during Denouement but does not grant another Action.  
**When:** The player has only their normal Action.  
**Expect:** They may still take only one Action total.

## A06 — Directly permitted procedure outside the Action phases

**Given:** An effect directly permits a faction procedure during a battle or Aftermath and does not call it an Action.  
**When:** The procedure is performed.  
**Expect:** It does not consume the player's normal Action and does not create another Action phase or window.

## A07 — Legal Faction Action timing

**Given:** A Faction Action is labeled “Denouement.”  
**When:** The player attempts it during Opening.  
**Expect:** The procedure is illegal during Opening and remains available during Denouement if the player has not used the required Action.

## A08 — Faction Ability timing

**Given:** A Faction Ability triggers at a stated timing.  
**When:** Its condition is met.  
**Expect:** It resolves without consuming an Action unless its text expressly says otherwise.

## A09 — Asset discard as an Action

**Given:** The player controls an Asset and has not taken an Action.  
**When:** They choose to discard that Asset during Opening or Denouement.  
**Expect:** The Asset is discarded and the choice counts as their Action.

## A10 — Asset replacement at capacity

**Given:** A player is at their Asset limit and resolves an effect that would bank a new Asset.  
**When:** They discard an existing Asset to make room.  
**Expect:** The old Asset leaves and the new Asset is banked as one continuous resolution; no additional Action is required.

## A11 — Unused Action expiration

**Given:** A player reaches Cleanup with an unused normal or additional Action.  
**When:** The turn ends.  
**Expect:** The unused Action expires and cannot be carried into the next turn.

## A12 — Purge uses both phases

**Given:** The Inquisition uses Purge as a Faction Action once during the turn.  
**When:** One Action is taken in Opening and the other in Denouement, with one of them being Purge.  
**Expect:** Both Actions are legal; no phase contains more than one Action.

## A13 — Final Judgment Purge is not the Purge Faction Action

**Given:** Final Judgment directly permits a Purge during Aftermath.  
**When:** That Purge is performed.  
**Expect:** It does not consume the player's normal Action, does not count as the once-per-turn Purge Faction Action, and does not activate the two-phase permission.

---

# B. Movement and Pending Battles

## B01 — Ordinary movement choices

**Given:** The active player begins Movement.  
**When:** They choose Advance, Hold, or Fall Back.  
**Expect:** Exactly that ordinary Movement choice occurs; “withdraw” is not used for the backward Movement choice.

## B02 — Fall Back is not withdrawal

**Given:** An effect triggers when a player withdraws from a battle.  
**When:** The player chooses Fall Back during Movement.  
**Expect:** The withdrawal effect does not trigger.

## B03 — Entering the opponent's position

**Given:** The active player Advances into the opponent's position.  
**When:** The movement resolves.  
**Expect:** Move the attacker into the contested position, establish attacker, defender, contested position, and the attacker's previous position, then create a pending battle.

## B04 — Battle ends the movement sequence

**Given:** The player has unused movement remaining from an effect.  
**When:** A movement step creates a pending battle.  
**Expect:** The current movement sequence ends and all remaining movement in that sequence is lost.

## B05 — Accepted Terms do not restore unused movement

**Given:** Movement created a pending battle and unused movement was lost.  
**When:** Terms are accepted and prevent Onset.  
**Expect:** The battle does not begin, but the movement sequence remains ended and the lost movement is not restored.

## B06 — Later movement requires direct permission

**Given:** A battle or prevented battle has ended.  
**When:** No rule or effect permits another movement sequence.  
**Expect:** The player does not move again that turn merely because unused movement had existed earlier.

---

# C. Terms and Onset

## C01 — Pending battle is not yet a battle

**Given:** Attacker, defender, contested position, and previous position are established.  
**When:** The game is in the Terms timing before Onset.  
**Expect:** Battle, victory, loss, and Aftermath triggers have not begun.

## C02 — Accepted ordinary Terms

**Given:** A Proposal uses the ordinary accepted-position baseline.  
**When:** The receiving player accepts.  
**Expect:** Apply the Accepted effect; the attacker withdraws; the defender remains at the contested position; no battle reaches Onset.

## C03 — Accepted specialized Terms

**Given:** A Proposal specifies another positional result, such as Mutual Disarmament or a deliberate positional Proposal.  
**When:** It is accepted.  
**Expect:** Follow its printed Accepted result rather than the ordinary baseline.

## C04 — Accepted Terms suppress all battle stages

**Given:** Terms are accepted before Onset.  
**When:** The Accepted effect completes.  
**Expect:** No Onset, Gambit, Reserve, Tactic, Outcome, or Aftermath occurs.

## C05 — Refused Terms proceed to Onset

**Given:** Terms are offered during the pending battle.  
**When:** The receiving player refuses.  
**Expect:** Resolve the Proposal's Refused effect, then proceed to Onset unless that effect itself prevents the battle.

## C06 — No Terms offered

**Given:** A pending battle exists and no Terms are offered.  
**When:** The Terms timing passes.  
**Expect:** Proceed directly to Onset.

## C07 — Onset begins the battle

**Given:** A pending battle survives the Terms timing.  
**When:** Onset begins.  
**Expect:** The pending battle becomes an active battle, roles become fixed, and Onset effects resolve before Gambits are set.

## C08 — Onset terminology

**Given:** A player-facing shared-rule source refers to the battle's opening stage.  
**When:** Terminology validation runs.  
**Expect:** The source uses **Onset**, not opening effects, battle opening, or Battle Onset, except in labeled migration or historical text.

---

# D. Defensive Edge and Tiebreak Roll

## D01 — Controlled-Territory Defensive Edge

**Given:** Battle totals are tied, the defender controls the contested Territory, and no effect removes Defensive Edge.  
**When:** The Outcome is determined.  
**Expect:** The defender has Defensive Edge and wins the tied battle; no Tiebreak Roll occurs.

## D02 — Last Stand Defensive Edge

**Given:** Battle totals are tied while the defender is making a Last Stand, and no effect removes Defensive Edge.  
**When:** The Outcome is determined.  
**Expect:** The defender has Defensive Edge and wins the tied Last Stand battle even though no Territory is contested.

## D03 — Defensive Edge removed

**Given:** The defender would normally have Defensive Edge, but an applicable effect removes it.  
**When:** Battle totals are tied and no other tie-breaking rule resolves the tie.  
**Expect:** Defensive Edge does not resolve the battle; proceed to a Tiebreak Roll.

## D04 — Defender lacks Defensive Edge

**Given:** Battle totals are tied, the defender neither controls the contested Territory nor is making a Last Stand, and no effect grants Defensive Edge.  
**When:** No other tie-breaking rule resolves the tie.  
**Expect:** Proceed to a Tiebreak Roll.

## D05 — Tiebreak ignores original totals

**Given:** The original battle totals were tied after substantial card bonuses.  
**When:** A Tiebreak Roll occurs.  
**Expect:** Each player rolls one die; the prior totals are not added or compared again.

## D06 — Tiebreak ignores advantage and disadvantage

**Given:** One or both players had advantage or disadvantage during the battle.  
**When:** A Tiebreak Roll occurs.  
**Expect:** Each player rolls exactly one die unless an effect expressly modifies a Tiebreak Roll.

## D07 — Tiebreak ignores ordinary card effects and numerical modifiers

**Given:** Cards or abilities modified the original battle roll or total.  
**When:** A Tiebreak Roll occurs.  
**Expect:** Those effects do not modify the Tiebreak Roll unless they expressly refer to a Tiebreak Roll.

## D08 — Express Tiebreak modifier

**Given:** A future effect expressly says it modifies a Tiebreak Roll.  
**When:** Its condition is satisfied.  
**Expect:** Apply it according to its text.

## D09 — Further tied Tiebreak Roll

**Given:** Both players roll the same result on a Tiebreak Roll.  
**When:** The tie remains.  
**Expect:** Reroll the Tiebreak Roll until one result is higher.

## D10 — Defensive Edge terminology

**Given:** A v0.6.2 player-facing source describes the conditional defender tie benefit.  
**When:** Terminology validation runs.  
**Expect:** It uses **Defensive Edge**, not Defender's Advantage.

---

# E. Withdrawal and Retreat

## E01 — Losing attacker retreats

**Given:** The attacker loses the battle.  
**When:** The result is applied.  
**Expect:** The attacker retreats to the position from which they entered; win, loss, retreat, and result-dependent triggers occur normally.

## E02 — Losing defender retreats

**Given:** The defender loses the battle.  
**When:** The result is applied.  
**Expect:** The defender retreats one position toward their own end; result-dependent triggers occur normally.

## E03 — Pending-battle withdrawal

**Given:** An effect ends a pending battle before Onset without a winner.  
**When:** A player withdraws.  
**Expect:** Use the shared withdrawal position; no battle or Aftermath occurs; win, loss, and retreat triggers do not occur. If only the defender withdraws, the attacker remains in the contested position and becomes the occupier when applicable.

## E04 — Active-battle withdrawal before Outcome

**Given:** A battle reached Onset, but an effect ends it without determining a winner, before or after battle cards are committed.  
**When:** The player or players withdraw.  
**Expect:** Carry out withdrawal; complete the remaining non-result steps of the Aftermath; clear any committed battle cards using their normal destinations; and do not apply win, loss, or retreat triggers. If only the defender withdraws, the attacker remains in the contested position and becomes the occupier when applicable.

## E05 — Both players withdraw

**Given:** An effect makes both players withdraw.  
**When:** Positions are resolved.  
**Expect:** Move the attacker first, then the defender; neither becomes the occupier because of the withdrawal.

## E06 — Fall Back is neither retreat nor withdrawal

**Given:** A card or ability reacts to retreat or withdrawal.  
**When:** The player chooses Fall Back during Movement.  
**Expect:** Neither reaction occurs.

## E07 — Retreat is not ordinary movement

**Given:** An effect applies to ordinary movement.  
**When:** A player retreats after losing.  
**Expect:** The movement effect does not apply unless it expressly includes retreat.

## E08 — Withdrawal is not ordinary movement

**Given:** An effect applies to ordinary movement.  
**When:** A player withdraws from a pending or active battle.  
**Expect:** The movement effect does not apply unless it expressly includes withdrawal.

---

# F. Front Line Capture

## F01 — Ordinary contiguous Capture

**Given:** The active player's token occupies the next opposing Territory beyond their Front Line.  
**When:** Their Capture step occurs.  
**Expect:** Capture that Territory and advance the Front Line one Territory.

## F02 — Deep token position

**Given:** The active player's token is several opposing Territories beyond their Front Line.  
**When:** Their Capture step occurs.  
**Expect:** Capture only the next opposing Territory immediately beyond the Front Line, not the Territory containing the token.

## F03 — One Territory per normal Capture step

**Given:** The token remains several Territories beyond the Front Line.  
**When:** One Capture step resolves.  
**Expect:** The Front Line advances by no more than one Territory.

## F04 — Position does not grant control

**Given:** A token advances beyond one or more opponent-controlled Territories.  
**When:** No Capture or immediate Front Line effect occurs.  
**Expect:** The intervening and occupied Territories remain opponent-controlled.

## F05 — Control cannot become non-contiguous

**Given:** An effect would otherwise capture a deeper named or occupied Territory while an opponent-controlled Territory remains between it and the player's end.  
**When:** The effect resolves.  
**Expect:** It advances the player's Front Line according to its allowed amount and does not create isolated control. **Wave B dependency:** exact card wording.

## F06 — Asset limit follows actual control

**Given:** A token is deep beyond the Front Line but the Front Line has advanced only one Territory.  
**When:** Asset limit is checked.  
**Expect:** Count only controlled Territories, not occupied or bypassed Territories.

## F07 — Capture trigger uses the Territory added to the Front Line

**Given:** The token is deeper than the Territory captured during the Capture step.  
**When:** A capture-triggered effect resolves.  
**Expect:** The trigger refers to the Territory actually added to the Front Line.

## F08 — Deed and Income interactions use actual control

**Given:** A Financier token is beyond the Front Line.  
**When:** Deed ownership, Income, or Territory-control limits are evaluated.  
**Expect:** Use the contiguous controlled Territories, not token position. **Wave B dependency:** final faction wording.

## F09 — Retreat of an exposed vanguard

**Given:** A token is several Territories beyond its Front Line and loses a battle.  
**When:** It retreats.  
**Expect:** Move it under the normal retreat procedure; do not change control merely because the token crossed onto or behind the Front Line.

## F10 — Final Territory and Last Stand

**Given:** A token has moved beyond the opponent's final Territory but that Territory has not joined the player's Front Line.  
**When:** normal victory access is checked.  
**Expect:** The player has not yet secured the final Territory and cannot satisfy the normal Last Stand access requirement through position alone.

---

# G. Source and Terminology Gates

## G01 — Action Opportunity audit

Player-facing v0.6.2 shared sources must not use **Action Opportunity** except in labeled historical, migration, quotation, or compatibility text.

## G02 — Action Window audit

Player-facing v0.6.2 shared sources must not create or grant Action Windows. Use Opening, Denouement, an additional Action, same-phase permission, or a directly permitted procedure.

## G03 — Ordinary withdrawal audit

Ordinary backward Movement must use **Fall Back**. **Withdraw** must describe leaving or preventing a pending or active battle without a winner.

## G04 — Onset audit

The battle's opening stage must use **Onset**. **Opening** is reserved for the turn's pre-Movement Action phase.

## G05 — Defensive Edge audit

The conditional defender tie benefit must use **Defensive Edge**.

## G06 — Front Line audit

Shared Capture explanations must not say the occupied Territory is automatically captured when the token may be beyond the contiguous line.

## G07 — Tiebreak audit

No v0.6.2 source may describe unresolved tied battle totals as rerolling the original modified battle calculation.

## G08 — `revealed Territory` audit

Where all Territories begin revealed and revelation does not affect eligibility, use **Territory**, not **revealed Territory**. Preserve only genuine hidden-information, history, migration, or compatibility occurrences.

---

# H. Cross-Surface Acceptance Gate

Wave A is complete only when the following surfaces express the same expected behavior for every applicable scenario above:

- complete v0.6.2 rulebook candidate;
- compact reference guide;
- glossary and editorial terminology sources;
- player mat and active-player reference;
- canonical structured data and schemas;
- automated rules and scenario tests;
- Browser Rulebook and player references;
- Rules Arbiter source packets and deterministic regressions; and
- digital battle, movement, Capture, and Action implementations claiming v0.6.2 compatibility.

A passing Markdown review alone does not complete the release gate.
