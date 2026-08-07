# Gauntlet v0.6.2 Shared Rules Candidate

**Status:** Adopted shared-rule text awaiting integration into the complete v0.6.2 rulebook and reference package  
**Baseline:** Gauntlet v0.6.1  
**Release tracker:** [Issue #470](https://github.com/tymonius/Gauntlet/issues/470)  
**Wave A tracker:** [Issue #489](https://github.com/tymonius/Gauntlet/issues/489)

This document is the governing development source for the shared-rule changes adopted for Gauntlet v0.6.2. It replaces the corresponding v0.6.1 rules during v0.6.2 implementation, but it is not yet a published standalone rulebook. Rules not addressed here continue to use the v0.6.1 governing sources until the complete v0.6.2 package is assembled.

Published v0.6.1 remains canonical for current playtesting until v0.6.2 is released.

---

# 1. Turn Structure

## How it works

Complete every turn in this order:

> **Capture → Draw → Opening → Movement → Denouement → Cleanup**

You normally take one Action per turn. Take it during either your **Opening** or your **Denouement**.

During Movement, choose to **Advance**, **Hold**, or **Fall Back**. Conduct any battle immediately. After Movement and any resulting battle are complete, proceed to the Denouement.

## Complete rules

### Capture

Resolve the active player's Capture step using the Front Line rules in Section 6.

Apply effects and check victory conditions that occur after Capture before drawing.

### Draw

Draw one card using the normal Draw Pile and Discard Pile rules.

### Opening

Opening is the Action phase before Movement.

The active player may take their Action during Opening if the chosen Action is legal during that phase.

### Movement

The active player chooses Advance, Hold, or Fall Back. Resolve movement one position at a time and conduct any battle caused by movement immediately.

When movement begins a battle, that movement sequence ends and all unused movement from that sequence is lost.

### Denouement

Denouement is the Action phase after Movement and any battle caused by it.

The active player may take their Action during Denouement if they did not take it during Opening and the chosen Action is legal during Denouement.

A rule or effect may permit an additional Action or permit an Action despite one having already been taken. Follow the Action rules in Section 2.

### Cleanup

Apply end-of-turn effects and discard down to the normal Hand limit. All unused Actions and turn-limited Action permissions expire when the turn ends.

Pass the shared active-player marker after Cleanup when that component is in use.

---

# 2. Actions, Faction Actions, and Faction Abilities

## How it works

Each turn, take one Action during either your Opening or your Denouement.

An Action may be used to:

- play one card from Hand for its **Action** effect;
- take one legal **Faction Action**; or
- discard one Asset you control.

A **Faction Ability** occurs at its stated timing and does not use your Action unless it expressly says otherwise.

## Complete rules

### Normal Action limit

The active player normally takes one Action total during the turn.

No more than one Action may normally be taken during Opening, and no more than one Action may normally be taken during Denouement.

The two limits are independent:

1. the total number of Actions the player may take that turn; and
2. the number of Actions the player may take during a particular phase.

### Additional Actions

An effect that says a player may take one additional Action that turn increases the total number of Actions available that turn. It does not change the normal limit of one Action in each phase.

Unless another effect expressly permits otherwise, a player with two Actions available must take one during Opening and one during Denouement.

An effect intended to permit more than one Action during the same phase must say so directly. For example:

> You may take one additional Action this turn. You may take both Actions during your Denouement.

Permission to take more Actions during a phase does not itself grant an additional Action unless the effect also says that it does.

### Directly permitted procedures

A rule or effect may directly permit a card play, faction procedure, or other operation at a stated timing outside Opening or Denouement.

A directly permitted procedure:

- occurs at the stated timing;
- does not count as taking an Action unless the effect expressly says it does;
- does not consume the player's normal Action; and
- does not create another Action phase or Action window.

State these effects in terms of the procedure the player may perform. Do not create immediate or additional Action Opportunities or Action Windows.

### Playing a card for its Action effect

To play a card for its Action effect:

1. take an Action during a phase in which that Action is legal;
2. play the card from Hand;
3. satisfy all requirements and costs;
4. resolve the Action effect; and
5. put the card in the Discard Pile unless it becomes an Asset, becomes an Overlay, or its effect gives another destination.

### Faction Action

A **Faction Action** is a faction-specific option a player may choose when taking an Action.

Every Faction Action entry states whether it is legal during:

- Opening;
- Denouement; or
- either phase.

Taking a Faction Action counts as the player's Action for the turn unless a rule expressly permits another Action.

### Faction Ability

A **Faction Ability** is a faction-specific effect used or triggered at its stated timing.

A Faction Ability does not count as taking an Action unless it expressly says otherwise.

Faction references must group Faction Actions separately from Faction Abilities and print the legal phase beside every Faction Action.

### Discarding an Asset as an Action

During Opening or Denouement, a player may take an Action to discard one Asset they control.

Using an Asset does not take an Action unless the Asset or another rule expressly says otherwise.

### Replacing an Asset

When banking an Asset at the Asset limit, the player may discard one Asset they control to make room and bank the new Asset as part of the same effect.

This replacement is not a separate Action. An effect that prevents an Asset from leaving play also prevents replacing it this way. Any consequence of the replaced Asset leaving play still occurs.

### Inquisition Purge exception

The shared Action rules support this faction-specific exception:

> **Purge — Faction Action, Opening or Denouement:** Spend the listed Conviction to perform one Purge. You may take one Action during both your Opening and your Denouement, provided that one of those Actions is Purge.

Purge may be taken as a Faction Action no more than once per turn. It never permits two Actions during the same phase.

A Purge directly permitted by Final Judgment during the Aftermath is a Faction Ability. It does not count as taking the Purge Faction Action and does not activate or consume the two-phase permission above.

---

# 3. Movement and Position

## How it works

During Movement, choose one:

- **Advance:** move one position toward the opponent's end.
- **Hold:** remain in your current position.
- **Fall Back:** move one position toward your own end.

Entering the opponent's position creates a pending battle.

## Complete rules

A position is any space where a Player Token may be placed under the v0.6.1 positioning rules.

A player cannot voluntarily Fall Back beyond their own end of the Gauntlet. Player Tokens cannot move through or past one another.

If an effect grants additional movement, resolve it one position at a time unless the effect says otherwise.

Entering the opponent's position:

1. move the attacking token into the contested position;
2. establish the attacker, defender, contested position, and the attacker's previous position; and
3. create a pending battle.

The pending-battle and Terms procedure in Section 4 occurs before the battle reaches Onset.

When movement creates a pending battle, the current movement sequence ends and all unused movement in that sequence is lost, even if the pending battle is later prevented by Terms or another effect.

A player moves again after a battle only when a rule or effect directly permits another movement sequence.

---

# 4. Pending Battles, Terms, and Onset

## How it works

The pre-battle sequence is:

> **Pending battle → Terms → Onset → Gambits**

Establish the attacker, defender, and contested position before Terms are offered.

If Terms are accepted, apply the Proposal's Accepted effect. The battle never reaches Onset and does not begin.

If Terms are refused or none are offered, proceed to Onset. The battle begins during Onset.

## Complete rules

### Pending battle

A pending battle exists after the attacker, defender, contested position, and attacker's previous position have been established but before the battle reaches Onset.

Rules and effects that occur when a battle would begin resolve during this pending-battle timing unless their text gives another timing.

A pending battle is not yet a battle. Battle, victory, loss, and Aftermath triggers do not occur unless the battle reaches Onset.

### Terms

When a pending battle involves a Diplomat, resolve the Terms procedure, including any applicable mirror priority, before Onset.

If Terms are accepted:

- apply the Proposal's Accepted effect;
- no battle begins;
- no Onset, Gambit, Reserve, Tactic, battle-result, victory, loss, retreat, or Aftermath trigger occurs; and
- move the players exactly as the Accepted effect instructs.

Unless a Proposal gives a different positional result, accepted Terms use this baseline:

> The attacker withdraws. The defender remains at the contested position.

Mutual Disarmament and other specialized positional Proposals retain their printed outcomes.

If Terms are refused or no Terms are offered, proceed to Onset.

### Onset

**Onset** is the formal opening stage of a battle. It is parallel to **Aftermath**, the battle's closing stage.

During Onset:

1. the pending battle becomes an active battle;
2. attacker and defender roles become fixed for that battle; and
3. resolve all effects that apply during Onset or when the battle begins, in the required order.

After all Onset effects resolve, proceed to Gambits.

Use **Onset** as the formal stage name. In ordinary prose, use constructions such as **during Onset** or **at the Onset of the battle**.

---

# 5. Battle Sequence and Outcome

## Battle sequence

Conduct an active battle in this order:

1. **Onset**
2. Set Gambits.
3. Set Hands aside and form Reserves.
4. Reveal Gambits.
5. Choose Tactics.
6. Reveal Tactics.
7. Determine the Outcome.
8. Proceed to the **Aftermath**.

Terms are not part of this sequence because they resolve before the battle reaches Onset.

## Determine the Outcome

Calculate each player's battle total under the ordinary battle rules.

The higher total wins.

### Defensive Edge

> **Defensive Edge:** When the defender has Defensive Edge, the defender wins tied battle totals.

The defender normally has Defensive Edge when:

- the defender controls the contested Territory; or
- the defender is making a Last Stand.

An effect may remove Defensive Edge, including an applicable Arena Territory effect. Defensive Edge is conditional; the defender does not have it merely because they are the defender.

If the tied totals are not resolved by Defensive Edge or another applicable tie-breaking rule, make a Tiebreak Roll.

### Tiebreak Roll

> Each player rolls one die. Do not apply advantage, disadvantage, card effects, numerical modifiers, or the previous battle totals. The higher roll wins. Reroll further ties.

A rule or effect may modify a Tiebreak Roll only if it expressly refers to a **Tiebreak Roll**.

The Tiebreak Roll is a separate sudden-death procedure. It is not a recalculation or reroll of the original battle totals.

---

# 6. Front Line, Occupation, and Capture

## How it works

Your controlled Territories always form one unbroken line from your own end of the Gauntlet. That line is your **Front Line**.

Your token may advance beyond your Front Line, but your control advances only from your own end. During Capture, if your token is beyond your Front Line, capture the next opposing Territory immediately beyond that line.

## Complete rules

### Front Line

A player's **Front Line** is the complete unbroken sequence of Territories they control beginning at their own end of the Gauntlet.

A player cannot control a Territory while an opponent-controlled Territory lies between it and that player's own end.

Position and control are separate:

- **Position** is where the Player Token is.
- **Control** is shown by Territory orientation.
- **Occupation** describes a token holding an opposing Territory or position under the occupation rules.
- **Front Line** is the player's contiguous controlled line from their own end.

A token may be several Territories beyond its Front Line without granting control of the intervening or occupied Territories.

### Normal Capture

During the Capture step, if the active player's token is beyond their Front Line, identify the next opponent-controlled Territory immediately beyond that Front Line.

If the token is on or beyond that Territory, capture it by rotating it to face the active player.

Normal Capture advances the Front Line by no more than one Territory per turn, regardless of how far the token has advanced.

The Territory captured during the Capture step is not necessarily the Territory containing the active player's token.

Resolve all capture effects, control changes, Asset-limit changes, Deed interactions, and victory checks using the Territory actually added to the Front Line.

### Immediate capture effects

An effect that captures a Territory outside the normal Capture step cannot create non-contiguous control.

Unless the effect expressly advances the Front Line more than once, interpret or rewrite it to:

> Advance that player's Front Line one Territory.

Card- and faction-specific wording is implemented in Wave B.

### Final Territory and Last Stand

A player does not control the opponent's final Territory until it has been added to that player's Front Line.

Access to the normal Last Stand victory sequence requires the opponent's final Territory to be controlled as part of the advancing player's Front Line. Deep token position alone is not sufficient.

---

# 7. Withdrawal and Retreat

## How it works

Retreat and withdrawal move a player the same way. The difference is why the player leaves:

> **A losing player retreats; a player who leaves without losing withdraws.**

Fall Back is the ordinary backward Movement choice and is neither retreat nor withdrawal.

## Complete rules

### Shared positional procedure

Unless an effect says otherwise, when a player retreats or withdraws from a battle:

- an attacker returns to the position from which they entered the contested position; and
- a defender moves one position toward their own end.

After applying that movement:

- if only the attacker withdrew, the defender remains in the contested position;
- if only the defender withdrew, the attacker remains in the contested position and becomes its occupier if it is an opposing Territory they do not control; and
- if both players withdraw, move the attacker first, then the defender, and neither becomes the occupier because of that withdrawal.

Specific edge-of-Gauntlet and effect instructions continue to override this general procedure.

### Retreat

A player retreats because they lost a battle.

The battle has a winner and loser. Apply victory, loss, retreat, Occupation, and other result-dependent effects normally.

Retreat does not count as ordinary movement or withdrawal for effects unless an effect says otherwise.

### Withdrawal

A player withdraws when a pending or active battle ends without determining a winner.

There is no winner or loser. Victory, loss, and retreat triggers do not occur.

If withdrawal prevents a pending battle before Onset, no battle or Aftermath occurs.

If an active battle ends by withdrawal at any time after Onset, carry out the withdrawal and complete the remaining non-result steps of the Aftermath. Clear any committed battle cards using their normal destinations. Result-dependent triggers do not occur because the battle has no winner or loser.

Withdrawal does not count as Fall Back or ordinary movement for effects unless an effect says otherwise.

---

# 8. Compact Shared Reference

## Turn

> **Capture → Draw → Opening → Movement → Denouement → Cleanup**

- Take one Action during either Opening or Denouement.
- Normally take no more than one Action in either phase.
- An Action may play an Action card, take a legal Faction Action, or discard an Asset.
- Faction Abilities occur at their own timings and do not use an Action unless stated.
- Movement: Advance, Hold, or Fall Back.

## Pending battle and battle

> **Pending battle → Terms → Onset → Gambits → Reserves → reveal Gambits → choose Tactics → reveal Tactics → Outcome → Aftermath**

- Accepted Terms prevent the battle from reaching Onset.
- Onset begins the battle.
- A defender with Defensive Edge wins tied battle totals.
- The defender normally has Defensive Edge while controlling the contested Territory or making a Last Stand, unless an effect removes it.
- Otherwise make an unmodified Tiebreak Roll.

## Retreat and withdrawal

- Losing player: retreat.
- Leave without a winner: withdraw.
- Attacker returns to the position from which they entered.
- Defender moves one position toward their own end.
- If only the defender withdraws, the attacker remains and becomes the occupier when applicable.
- If both withdraw, move the attacker first; neither becomes the occupier because of the withdrawal.
- Before Onset, withdrawal prevents the battle and no Aftermath occurs.
- After Onset, complete the remaining non-result Aftermath steps and clear any committed battle cards normally.

## Front Line

- Control is always contiguous from your own end.
- Position may extend beyond control.
- During Capture, add the next opposing Territory beyond your Front Line if your token is on or beyond it.
- Normal Capture adds at most one Territory per turn.

---

# 9. Glossary Replacements

## Action

One of the ordinary choices a player may take during Opening or Denouement. A player normally takes one Action total each turn.

## Opening

The Action phase before Movement.

## Denouement

The Action phase after Movement and any resulting battle.

## Faction Action

A faction-specific option chosen when taking an Action. Its entry states whether it is legal during Opening, Denouement, or either phase.

## Faction Ability

A faction-specific effect used or triggered at its stated timing. It does not count as taking an Action unless expressly stated.

## Fall Back

The ordinary Movement choice that moves a player one position toward their own end.

## Pending battle

The pre-battle state after attacker, defender, contested position, and the attacker's previous position are established but before Onset.

## Onset

The formal opening stage of an active battle, parallel to Aftermath as its closing stage.

## Defensive Edge

A conditional benefit that causes the defender to win tied battle totals. The surrounding rules and effects determine whether the defender has it.

## Tiebreak Roll

A separate unmodified one-die roll by each player used when tied battle totals remain unresolved after applicable tie-breaking rules.

## Front Line

A player's unbroken sequence of controlled Territories beginning at their own end of the Gauntlet.

## Retreat

Displacement after losing a battle.

## Withdraw

Leave or prevent a pending or active battle without determining a winner.

---

# 10. Obsolete Shared Language

Remove or migrate these player-facing formulations in v0.6.2 sources:

| Obsolete formulation | v0.6.2 treatment |
|---|---|
| Action Opportunity | Use Opening, Denouement, or direct procedural permission. |
| Action Window | Use Opening or Denouement. Do not create additional windows. |
| spend an Action | Prefer take an Action. Preserve spend only for actual resources or costs. |
| immediate/additional Action Opportunity | State the permitted procedure or additional Action directly. |
| withdraw as an ordinary Movement choice | Use Fall Back. |
| opening effects / battle opening | Use Onset when referring to the battle stage. |
| Battle Onset | Use Onset as the formal stage name. |
| Defender's Advantage | Use Defensive Edge. |
| reroll tied battle totals with effects active | Use the separate unmodified Tiebreak Roll. |
| capture the occupied Territory | Apply the Front Line Capture rule. |

Historical notes, migration explanations, exact quotations, and deliberate compatibility aliases may retain obsolete terms when clearly labeled as such.
