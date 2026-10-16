# Accepted design decision: Intercepted Orders becomes Tactic-only

**Decision date:** 2026-10-16  
**Status:** Designer-approved proposed text for the next versioned gameplay release; published card and rules are unchanged.  
**Tracking:** [issue #1939](https://github.com/tymonius/Gauntlet/issues/1939)

## Decision

Change the Intelligence card **Intercepted Orders** from **Gambit/Tactic** to **Tactic**, and retain the pre-normal-Tactic-reveal timing. Its **Asset** mode remains unchanged.

The designer briefly considered an opening that read `Play this Tactic face up; it takes effect immediately.`, but **reverted that proposal** because ordinary Tactic choices are made attacker first, defender second: an attacker's immediate effect can run before the defender has chosen any Tactic. Instead, return to the explicit **after both players choose Tactics, before they are normally revealed** timing.

The designer also directed that the phrase `each opposing face-down Tactic and` be **deleted** from the reveal sentence, leaving only the reveal of the opponent's Reserve.

## Revised target card effect

**Tactic:**

> After Tactics are chosen, before they are normally revealed, reveal this card if it is face down. Reveal the opponent's Reserve. Return 1 opposing Tactic to that Reserve; it cannot be chosen again this battle. The opponent may choose 1 eligible replacement from the Reserve.

**Asset (unchanged):**

> When the opponent forms their Reserve, before they choose Tactics, you may discard this card to reveal that Reserve and choose 1 card they cannot choose this battle.

## Timing and mechanics

- The Tactic cannot be committed as a Gambit. Its effect occurs **after normal Tactic choices have been made**, so a target Tactic can already exist whether Intercepted Orders belongs to the attacker or defender.
- It reveals **the opponent's Reserve**, not the opposing committed face-down Tactics. The effect's removal and replacement instructions remain as written.
- **Important unresolved precision:** If the opponent has multiple face-down committed Tactics, the revised text does not specify whether the controller chooses a target blind, whether some other reveal is required, or how the target is identified. Do not silently assume that the committed Tactics have been revealed; the designer explicitly removed that instruction. Confirm targeting semantics before implementing ambiguous multi-Tactic cases.
- If the opponent chose no Tactic, the return instruction has no applicable target. The card still contains a Reserve reveal instruction; how a zero-target case flows through any choice window must follow the game's existing effect-resolution rules.
- Existing reveal protections, shared timing, and replacement rules remain applicable. Do not create extra Surveillance or Interference opportunities on a replacement without authoritative rules text.

The pre-normal reveal timing has an existing engine precedent in **Confession** (`src/v070/confession-battle.ts`). That precedent does not license applying Confession's separate reveal behavior to Intercepted Orders.

## Release and engine checklist

- [x] Approve **Tactic** rather than **Gambit/Tactic**.
- [x] Reject immediate face-up play; restore the explicit **post-choice, pre-reveal** timing.
- [x] Remove exactly `each opposing face-down Tactic and` from the reveal instruction.
- [x] Preserve the existing Asset, Tactic return, re-selection prohibition, and replacement text.
- [ ] Confirm target selection among multiple face-down opposing Tactics, without silently reintroducing their reveal.
- [ ] For the next governed gameplay release, update `packages/game-data/current-game.json`: change `effects[1].label` to `Tactic`, apply the revised exact Tactic text, remove the `gambit_tactic` mirror and add a matching `tactic` mirror.
- [ ] Align authoritative rules, next-version printed card and release/public surfaces, keeping published packages frozen.
- [ ] Implement and regression-test Tactic-only pre-normal-reveal execution: attacker/defender ordering, zero/one/multiple opposing Tactics, Reserve disclosure, reveal protections, card-return restriction, replacement, and interactions with other pre-reveal effects.
- [ ] Update the current digital-engine registration surface key to `intelligence-intercepted-orders::1::Tactic`; **do not claim increased executable parity until implementation is complete**.
- [ ] Close issue #1939 only when authority, publication, and implementation are complete.

## Scope

This is a forward-looking approved design revision. Do not overwrite the currently published card or claim the revised battle effect is already implemented.
