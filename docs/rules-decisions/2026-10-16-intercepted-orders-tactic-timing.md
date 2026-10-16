# Accepted design decision: Intercepted Orders becomes Tactic-only

**Decision date:** 2026-10-16  
**Status:** Designer-approved change awaiting the next versioned gameplay authority and rules publication. This record does not supersede the current, frozen published card.  
**Tracking:** [issue #1939](https://github.com/tymonius/Gauntlet/issues/1939)

## Decision

Change the Intelligence card **Intercepted Orders** from **Gambit/Tactic** to **Tactic**. Its **Asset** mode remains unchanged.

The present Gambit/Tactic mode can be committed and revealed before normal Tactic selection, when the opposing Tactic the effect must return may not yet exist. Restricting it to the Tactic role ensures both players have committed Tactics before the effect becomes eligible.

**The Tactic-only heading is necessary but not quite sufficient by itself.** Its effect still needs to reveal opposing **face-down** Tactics and potentially return one before its normal effect applies. Give it an explicit pre-normal-Tactic-reveal timing, consistent with the existing Confession precedent.

## Approved target card effect

**Tactic:**

> After Tactics are chosen, before they are normally revealed, reveal this card if it is face down. Reveal each opposing face-down Tactic and the opponent's Reserve. Return 1 opposing Tactic to that Reserve; it cannot be chosen again this battle. The opponent may choose 1 eligible replacement from the Reserve.

**Asset (unchanged):**

> When the opponent forms their Reserve, before they choose Tactics, you may discard this card to reveal that Reserve and choose 1 card they cannot choose this battle.

This decision does not create another Surveillance or Interference window on replacement. The existing shared replacement and reveal rules, including Counterintelligence as applicable, continue to govern.

## Expected implementation behavior

1. Intercepted Orders is eligible as a **Tactic from Reserve**, not as a Gambit from Hand.
2. After both players finish their normal Tactic choices, its pre-reveal effect reveals the Intercepted Orders card if face down.
3. Before ordinary Tactic effects are applied, reveal all opposing face-down Tactics and the opposing Reserve under applicable reveal protections.
4. Choose an opposing committed Tactic to return to the opposing Reserve, making that specific card ineligible to be chosen again in that battle.
5. Opponent may choose one eligible replacement Tactic from Reserve according to the normal replacement rules.
6. Resolve any other pre-reveal interference under the existing controller-ordering rules. Do not allow a returned Tactic's effect to apply before its removal, and do not rerun an already-passed reveal/response window.

The timing model follows **Confession**, already implemented in `src/v070/confession-battle.ts`, rather than attempting to execute Tactic interference at the earlier Gambit reveal.

## Release and engine checklist

- [x] Decide that this effect is **Tactic-only**.
- [x] Specify **after Tactics are chosen, before normal reveal**.
- [x] Preserve the existing Asset effect and return/replacement consequence.
- [ ] At the next governed gameplay release, update **`packages/game-data/current-game.json`**, changing `effects[1].label` from `Gambit/Tactic` to `Tactic`, inserting the pre-reveal timing in the text, removing the `gambit_tactic` mirror and adding the `tactic` mirror.
- [ ] Align current rules/next-release publication and generated card faces, ensuring old published releases remain immutable.
- [ ] Implement and regression-test the Tactic pre-reveal flow in the digital engine, including opponent with zero/one/multiple Tactics, reveal protections, competing pre-reveal effects (Confession/Scouting Report), valid/invalid replacements, and fallback when no valid target exists.
- [ ] Update the current digital-engine registration surface key from `intelligence-intercepted-orders::1::Gambit/Tactic` to `intelligence-intercepted-orders::1::Tactic`; **do not increase executable battle parity until the behavior is genuinely implemented**.
- [ ] Close issue #1939 after canonical authority, publication, and engine implementation are complete.

## Scope

This is a forward-looking **accepted design change**, not a claim that the already-published release contains a Tactic-only Intercepted Orders. Do not edit a frozen release in place or silently claim engine implementation from this decision record.
