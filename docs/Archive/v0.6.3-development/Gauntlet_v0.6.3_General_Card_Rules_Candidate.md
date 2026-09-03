# Gauntlet v0.6.3 General Card Rules Candidate

**Status:** Adopted v0.6.3 rules for card-language centralization, awaiting full release propagation  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Card-language review:** [Issue #405](https://github.com/tymonius/Gauntlet/issues/405)  
**Implementation PR:** [PR #540](https://github.com/tymonius/Gauntlet/pull/540)

This document centralizes procedures repeatedly restated on individual cards. Cards should state exceptional information while these shared rules govern routine procedures.

All inherited shared rules remain in force unless expressly revised below.

### Gambit and Tactic effect headings

v0.6.3 no longer uses **Battle** as a printed effect heading.

- **Gambit/Tactic** means the same printed effect is available when the card is committed as either a Gambit or a Tactic. On the card face, this heading is stacked as `Gambit/` over `Tactic` to preserve the narrow heading column.
- **Gambit** means the effect is available only when the card is committed as a Gambit.
- **Tactic** means the effect is available only when the card is committed as a Tactic.

The heading identifies eligible battle-card roles; it does not change the effect's printed timing. An effect applies only when its stated timing is reached. If a Gambit or Tactic effect states no later timing, it applies when that card is revealed in that role.

In general prose, use **Gambit effect**, **Tactic effect**, or **Gambit or Tactic effect** as applicable. When a card directly refers to its own printed **Gambit/Tactic** heading, it may say **its Gambit/Tactic effect**.

---

## 1. Inherent banking Action and Asset text

A card with an **Asset** effect has an inherent banking Action:

> **Bank:** As an Action, play this card from your Hand and bank it.

This inherent Action does not need to be printed on the card.

**Asset is the only banked-card effect heading in v0.6.3.** Asset text may be continuous, triggered, optional, or expressly usable as an Action while the card is banked. The former **Activate** heading is retired. An Asset ability that says `as an Action` still uses the applicable Action permission.

If a card has a printed Action effect that provides a special banking procedure, use that procedure instead. A special banking Action may impose costs, bind cards, draw cards, grant another Action, limit copies, or otherwise change what happens when the card is banked.

For rules and effects that refer to an Action effect that banks a card, the inherent Bank Action counts as such an effect.

Cards whose only printed Action was `Bank this card.` therefore omit that Action section in v0.6.3.

---

## 2. Directly permitted card procedures do not spend another Action

When a rule or effect directly instructs or permits a player to play, bank, place, reveal, or otherwise use a card at a stated timing, that procedure is part of resolving that rule or effect. It does not spend or require another Action unless expressly stated.

Cards therefore do not need phrases such as:

- `without spending an Action`;
- `without spending another Action`;
- `without taking an Action`; or
- `without taking additional Actions`.

An instruction that expressly says **as an Action**, **take an Action**, or otherwise identifies an Action still uses the applicable Action permission.

### Battle scope in standard v0.6.3

The standard v0.6.3 game is 1v1, so every battle involves both players. A battle-timed effect on a player's card therefore does not need to say `in a battle involving you`. The printed timing and other conditions still determine whether the effect can apply.

---

## 3. Effect-granted movement and new movement sequences

When an effect grants movement, apply the normal movement rules unless it says otherwise.

- If the effect modifies a movement sequence already in progress, the granted movement remains part of that sequence.
- If the effect grants movement while no movement sequence is in progress, it begins a new movement sequence.
- Effect-granted movement may create a pending battle and may force the opponent to make a Last Stand unless expressly prohibited.
- When movement creates a pending battle, that movement sequence ends and unused movement from it is lost normally.

Cards therefore do not need affirmative text saying that granted movement may start or create a battle. Negative exceptions remain printed.

---

## 4. Additional Tactics use the shared Tactic rules

When an effect permits an **additional Tactic**:

- it must be eligible for the Tactic role;
- before Tactics are revealed, it is set face down with the other chosen Tactics;
- after Tactics are revealed, it is played face up;
- only timing still available may apply;
- choosing it does not reopen an earlier choice, reveal, or response window; and
- it uses the normal Tactic destination unless an effect gives another destination.

Unless an effect says otherwise, the source of a Tactic is the player's **Reserve**.

Multiple applicable `+N Reserve` and `+N Tactic` instructions add together unless a rule or effect expressly says otherwise.

---

## 5. Terms, Reactions, and Sanctions

### Terms effects

A **Terms** effect is used at the point printed on the card while its owner is offering Terms. Using a Terms effect does not spend or require an Action unless the card expressly says otherwise.

Outcome words such as **Accepted —** and **Refused —** may appear inside a Terms effect to divide its resolution. They are not separate standard-card effect headings.

### Reactions

A **Reaction** is played from Hand when its printed trigger occurs. Playing a Reaction does not spend or require an Action unless the card expressly says otherwise. Resolve the Reaction at the timing printed on the card.

### Sanctions

A card whose title begins **Sanctions:** is a **Sanction**.

Immediately after an opponent refuses your Terms, you may play a Sanction from your Hand at no cost unless that Sanction says otherwise. The Sanction's printed text determines whether it is banked, placed as an Overlay, or resolves in another way. A Sanction may also override this default timing or procedure.

When a Sanction is played, placed, or banked because an opponent refused its owner's Terms:

- that opponent remains associated with that Sanction for as long as it remains in play; and
- unless the Sanction says otherwise, after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile.

A Sanction may state additional removal conditions. Cards therefore do not need to repeat the refusal trigger, identification of the refusing opponent, no-cost play, or the default expiration after later acceptance.

---

## 6. Asset Removal

**Remove** is a defined Asset event. An Asset is **Removed** when a rule or effect forces it to leave play.

- Removal applies regardless of the destination or the natural verb used by the rule or effect. An instruction may `discard` an Asset, put it in a Graveyard, return it to a Hand, or otherwise make it leave play and still cause Removal.
- If a player's Asset limit decreases below the number of Assets they have banked, every Asset they are forced to discard to return within that limit is Removed. A forced choice of which Asset leaves play still counts as Removal.
- Voluntarily discarding, spending, returning, or otherwise using one of your own Assets does **not** count as Removal unless a rule expressly says otherwise.
- An Asset leaving play through its own normal resolution, expiration, or self-removal condition does **not** count as Removal unless a rule expressly says otherwise.
- **Remove** does not itself assign a destination. Follow the rule or effect that caused the Removal.

Cards should still use the clearest natural instruction for the physical result. For example, `discard 1 Asset` is preferable to forcing the word `Remove` into the sentence when discard is the actual instruction. Use **Remove/Removed** when another rule or effect cares that involuntary Asset loss occurred.

Capitalized **Remove/Removed** carries this defined meaning. Lowercase `remove` may continue to appear in ordinary English with its contextual meaning.

### Asset ownership language

When ownership is already clear from the sentence, prefer:

- `your Asset` / `your Assets`;
- `opposing Asset` / `opposing Assets`; and
- `their Asset` / `their Assets`.

Do not write `Asset you control`, `Assets you control`, `Asset they control`, or equivalent control boilerplate unless a genuine ownership or control ambiguity requires it.

### Bound cards

**Bind** attaches one card to another for as long as the relevant effect requires.

- Unless an effect gives a different instruction, when a card leaves play, cards bound to it are put in their owners' Discard Piles.
- If a rule or card sets a maximum number of cards that may be bound to a card and that maximum decreases below the number currently bound, immediately choose and discard excess bound cards until the limit is satisfied.
- A card-specific destination or resolution for a bound card overrides these defaults.

---

## 7. Reveal-stage interference

A **reveal-stage interference effect** is an effect of a revealed Gambit or Tactic that reveals, negates, returns, discards, replaces, or otherwise prevents another Gambit or Tactic at that same reveal stage from applying normally.

At each Gambit or Tactic reveal stage:

1. resolve reveal-stage interference before ordinary effects at that stage;
2. if multiple interference effects remain at the same timing, use the normal shared-timing rule among them; and
3. after interference is complete, resolve the remaining ordinary effects normally.

An effect still cannot negate or cancel a card after that card's effect has applied.

This does **not** give general priority to every `When revealed` effect. An effect that merely applies its own result, copies another effect, or replaces its own card remains an ordinary reveal effect unless it interferes with another Gambit or Tactic at that same stage.

---

## 8. Compact card shorthand

Routine quantitative instructions may use compact shorthand when timing, subject, source, and eligible set remain unambiguous.

### Reserve and Tactics

`+N Reserve` adds N cards to the player's Reserve at the stated timing. During Reserve formation, it increases the normal Reserve size by N.

`−N Reserve` reduces that quantity by N. Any applicable minimum remains printed.

`+N Tactic` permits N additional Tactics under the shared additional-Tactic rule.

**Reserve is the default Tactic source.** Do not print `from Reserve` merely to restate the default. Print another source only when it overrides or narrows the default, such as:

- `+1 Tactic from Hand`
- `+1 Tactic from those cards`
- `+1 Tactic using the stored card`

A standard combined effect may therefore read:

> `+1 Reserve, +1 Tactic.`

### Cards

`+N Card` / `+N Cards` means draw N cards from your Draw Pile into your Hand.

If another player receives the draw, identify that player. If the cards go somewhere other than the Hand, state that destination instead of using this shorthand.

Optional compound procedures may remain in natural language when shorthand would obscure what is optional.

### Actions

`+N Action` grants N additional Actions during the **current phase**. If another phase is intended, state that phase.

This inherits the same-phase additional-Action rule established for v0.6.2: it expands the number of Actions permitted in that phase rather than reopening a phase that has ended.

### Resources

`+N Capital`, `+N Influence`, `+N Command`, and `+N Conviction` mean gain that amount of the named resource.

Do **not** use negative resource shorthand for costs, payments, losses, or reductions when their rules meaning differs. Continue to write `spend`, `pay`, `lose`, or the applicable instruction.

`Resource = N` sets that resource to N. Examples include `Command = 2` and `Conviction = 4`.

### Battle total

`+N Battle Total` adds N to your battle total.

### Retreat

`Retreat +N` increases the distance of the retreat identified by that clause by N Positions. It modifies that retreat; it does not create a separate retreat.

If the affected player is not otherwise clear, identify them.

### Advantage and disadvantage

Card faces retain natural instruction wording:

- `gain advantage` = gain **one instance of advantage**;
- `gain double advantage` = gain **two instances of advantage**;
- `gain disadvantage` = gain **one instance of disadvantage**.

These are additive instructions, not binary statuses.

Instances from separate cards, Territory effects, faction abilities, and other effects **stack**. No later source replaces an earlier one unless an effect expressly says so. Before rolling battle dice, combine all advantage and disadvantage affecting each player and cancel opposing instances one-for-one.

- If **N advantage** remains, roll **N + 1 dice** and use the highest result.
- If **N disadvantage** remains, roll **N + 1 dice** and use the lowest result.
- If neither remains, roll normally.

There is no fixed stacking cap unless a rule or effect expressly creates one. Two separate effects that each say `gain advantage` therefore produce double advantage; double advantage plus one disadvantage leaves one net advantage.

Effects that ignore or prevent **one disadvantage** affect only one instance unless they say otherwise.

The words `Advantage`, `Double Advantage`, and `Disadvantage` may still be used as rules terms when discussing the mechanic, but card-facing instructions use the natural `gain ...` form unless another sentence structure requires equivalent wording.

### Front Line

Use **`Advance Front Line N`**, not `+N Front Line`, to advance the Front Line by N Territories.

Card-specific qualifications such as `if able` and replacement of Occupation remain printed when they matter.

### Condition prefixes

When a condition governs the entire following clause, cards may use concise prefixes such as:

- `Attacker —`
- `Defender —`
- `Counterattack —`
- `Win —`
- `Lose —`

The prefix scopes only the clause that follows it. More complex conditions remain in natural language.

---

## 9. Rerolls use the new result

When a rule or effect causes a die to be rerolled, the reroll replaces the result it rerolls and the new result is used unless the rule or effect expressly says otherwise.

Cards therefore do not need to repeat `use the new result` or `you must use the new result` after a reroll instruction.

---

## 10. Applying and repeating another effect

When an effect tells you to **apply** another card's effect or **repeat** an effect, resolve that effect as a new application at the current timing.

- The effect must be able to apply at the current timing, with its printed conditions and legal targets satisfied.
- The player instructed to apply or repeat the effect controls that application.
- Make all choices again and pay all costs again for each new application.
- Applying another card's effect does not play, set, choose, or otherwise move the source card unless the instruction expressly says so. The source card remains in its current zone.
- Because the source card was not played, set, or chosen again, triggers that care about those events do not occur merely because its effect was applied or repeated.
- A copied or repeated effect may create one further application if its own printed text instructs it to do so. That further application cannot create another copied or repeated effect in the same chain.

Cards therefore do not need phrases such as `as though you played it`, `as though you controlled it`, repeated instructions to leave the source card in its zone, or card-specific reminders to remake choices and repay costs.

---

## 11. Battles ending without a winner

When a rule or effect ends a battle **without a winner**:

- neither player wins or loses that battle; withdrawal is not a loss;
- after the battle-ending instruction resolves, unresolved Gambit or Tactic effects from that battle do not apply unless the ending effect expressly says otherwise;
- effects that already applied are not undone;
- complete any remaining non-result Aftermath procedures that are still applicable;
- clear committed cards and cards remaining in Reserve normally unless the ending effect gives them another destination; and
- apply normal positional consequences, including Occupation when applicable, based on the Player Tokens that remain after any instructed withdrawal.

An effect conditioned on a player winning or losing does not apply when the battle ends without a winner.

Cards that end a battle without a winner therefore do not need to restate ordinary cleanup, that withdrawal is not a loss, or that already-applied effects remain applied.

---

## 12. Card-text consequences

The v0.6.3 card-language build may remove or replace:

- a printed `Action: Bank this card.` when that is the card's entire banking Action;
- the former `Activate` heading by folding all banked-card abilities into `Asset`;
- redundant `in a battle involving you` wording in the standard 1v1 card pool;
- redundant no-Action disclaimers on directly permitted card procedures;
- affirmative statements that effect-granted movement may create a battle;
- repeated additional-Tactic eligibility, face-state, timing, destination, and default-Reserve-source instructions;
- repeated Reserve/Tactic quantity sentences represented by numeric shorthand;
- routine draw, extra-Action, fixed resource-gain, battle-total, retreat, resource-setting, and Front Line sentences represented by the shorthand above;
- repeated `use the new result` text after rerolls;
- repeated Sanction identification/default-expiration clauses;
- repeated reveal-priority clauses covered by reveal-stage interference;
- copied/repeated-effect reminders covered by the shared application rule;
- battle-ending cleanup/result reminders covered by the shared no-winner rule;
- redundant `Asset(s) you control` / `Asset(s) they control` wording where ownership is already clear;
- long forced-Asset-loss descriptions when the defined **Removed** event states the needed trigger more directly; and
- `place this card as an Overlay` on a physical Overlay card in favor of the shorter `place this Overlay`.

Advantage/Disadvantage is deliberately **not** reduced to a bare card-facing status label; cards retain `gain advantage`, `gain double advantage`, or equivalent natural wording while the shared stacking rule governs how instances combine.

Card-specific costs, restrictions, nondefault sources, destinations, timing differences, negative exceptions, title-matching rules, unusual movement, and other deviations remain printed.
