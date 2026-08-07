# Gauntlet v0.6.3 General Card Rules Candidate

**Status:** Adopted v0.6.3 rules for card-language centralization, awaiting full release propagation  
**Release tracker:** [Issue #528](https://github.com/tymonius/Gauntlet/issues/528)  
**Card-language review:** [Issue #405](https://github.com/tymonius/Gauntlet/issues/405)  
**Implementation PR:** [PR #540](https://github.com/tymonius/Gauntlet/pull/540)

This document centralizes procedures that were repeatedly restated on individual cards. The purpose is to make cards state only their exceptional information while preserving the mechanics of the published v0.6.2 cards and the already adopted v0.6.3 revisions.

All inherited shared rules remain in force unless expressly revised below.

---

## 1. Inherent banking Action

A card with an **Asset** or **Activate** effect has an inherent banking Action:

> **Bank:** As an Action, play this card from your Hand and bank it.

This inherent Action does not need to be printed on the card.

If a card has a printed Action effect that provides a special banking procedure, use that printed Action instead of the inherent banking Action. A special banking Action may impose costs, bind cards, draw cards, grant another Action, limit copies, or otherwise change what happens when that card is banked.

For rules and effects that refer to an Action effect that banks a card, the inherent banking Action counts as an Action effect that banks that card.

Cards whose only printed Action was `Bank this card.` therefore omit that Action section in v0.6.3. Special banking cards retain their printed Action text.

---

## 2. Directly permitted card procedures do not spend another Action

The inherited **Directly permitted procedures** rule applies to card use as well as faction procedures.

When a rule or effect directly instructs or permits a player to play, bank, place, reveal, or otherwise use a card at a stated timing, that procedure is part of resolving the rule or effect. It does not spend or require another Action unless the instruction expressly says that it does.

Cards therefore do not need phrases such as:

- `without spending an Action`;
- `without spending another Action`;
- `without taking an Action`; or
- `without taking additional Actions`.

An effect that expressly says **as an Action**, **take an Action**, or otherwise identifies an Action still uses the applicable Action permission.

---

## 3. Effect-granted movement and new movement sequences

When an effect grants movement, apply the inherited movement rules unless the effect says otherwise.

- If the effect modifies a movement sequence already in progress, the granted movement remains part of that sequence.
- If the effect instructs a player to move or Advance at a timing when no movement sequence is in progress, it begins a new movement sequence.
- Effect-granted movement can create a pending battle and can initiate a legal Last Stand unless the effect expressly says that it cannot.
- When movement creates a pending battle, that movement sequence ends and unused movement from it is lost under the normal rule.

Cards therefore do not need affirmative text such as `This movement may start a battle` or `This movement may create a pending battle`.

Negative exceptions remain printed, including `This movement cannot create a pending battle` or `This movement cannot start a battle`.

---

## 4. Additional Tactics use the shared Tactic rules

The inherited additional-Tactic rule supplies eligibility, face state, and timing.

When an effect permits an **additional Tactic**:

- it must be eligible for the Tactic role;
- if chosen before Tactics are revealed, it is set face down with the other chosen Tactics;
- if chosen after Tactics are revealed, it is played face up;
- only effects whose timing remains available may apply;
- choosing it does not reopen an earlier choice, reveal, or response window; and
- it uses the normal Tactic destination unless an effect gives another destination.

Card text therefore needs to identify only the source, quantity, timing, and any exception. For example, `Choose an additional Tactic from your Hand` is sufficient when no other exception applies.

---

## 5. Sanctions

A card whose title begins **Sanctions:** is a **Sanction**.

When a Sanction is played, placed, or banked because an opponent refused its owner's Terms:

- that opponent remains the opponent associated with that Sanction for as long as it remains in play; and
- unless the Sanction says otherwise, after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile.

A Sanction may state another removal condition in addition to this default.

Cards therefore do not need to repeat instructions to identify the refusing opponent or the default removal after that opponent later accepts the owner's Terms.

---

## 6. Reveal-stage interference

A **reveal-stage interference effect** is an effect of a revealed Gambit or Tactic that reveals, negates, returns, discards, replaces, or otherwise prevents another Gambit or Tactic at that same reveal stage from applying normally.

At each Gambit or Tactic reveal stage:

1. resolve all reveal-stage interference effects before ordinary effects at that stage;
2. when multiple interference effects remain at the same timing, use the normal shared-timing rule among them; and
3. after interference is complete, resolve the remaining ordinary effects using the normal shared-timing rule.

An effect still cannot negate or cancel a card after that card's effect has applied.

This rule does **not** give general priority to every effect beginning `When revealed`. A reveal effect that merely applies its own effect, copies another effect, or replaces its own card remains an ordinary reveal effect unless it interferes with another Gambit or Tactic at that same stage.

This centralizes the repeated priority clauses on **Assassins, Capital Punishment, Disruption, Palisade Wall, Sabotage, Scouting Report,** and **Tyranny**, and it allows an eligible negation of **Armistice** to resolve before Armistice's ordinary effect without a special sentence on Armistice itself.

---

## 7. Card-text consequences

The v0.6.3 card-language build may therefore remove:

- a printed `Action: Bank this card.` when that is the card's entire banking Action;
- redundant no-Action disclaimers on directly permitted card procedures;
- affirmative statements that effect-granted movement may create a battle;
- repeated additional-Tactic eligibility and face-state instructions;
- repeated Sanction identification/default-expiration clauses; and
- repeated reveal-priority clauses covered by reveal-stage interference.

Card-specific costs, restrictions, destinations, timing differences, negative exceptions, title-matching rules, and other deviations remain printed.
