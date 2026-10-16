# Accepted design decision: Intercepted Orders becomes Tactic-only

**Decision date:** 2026-10-16  
**Status:** Designer-approved role and proposed card wording for the next versioned gameplay release. **Timing edge case still open**; this record does not supersede the frozen published card.  
**Tracking:** [issue #1939](https://github.com/tymonius/Gauntlet/issues/1939)

## Decision

Change the Intelligence card **Intercepted Orders** from **Gambit/Tactic** to **Tactic**. Its **Asset** mode remains unchanged.

The designer subsequently revised the proposed timing language from a pre-normal-reveal trigger to **face-up immediate play**. This is a meaningful mechanical change, not merely an editorial rephrasing.

## Designer's revised target card effect

**Tactic:**

> Play this Tactic face up; it takes effect immediately. Reveal each opposing face-down Tactic and the opponent's Reserve. Return 1 opposing Tactic to that Reserve; it cannot be chosen again this battle. The opponent may choose 1 eligible replacement from the Reserve.

**Asset (unchanged):**

> When the opponent forms their Reserve, before they choose Tactics, you may discard this card to reveal that Reserve and choose 1 card they cannot choose this battle.

## Timing analysis and unresolved case

The current shared battle sequence commits normal Tactics **attacker first, defender second**, and normally reveals them afterward. The revised opening explicitly overrides ordinary face-down commitment and normal reveal timing, making the Tactic take effect **as it is chosen face up**.

- **When the defender uses Intercepted Orders:** the attacker's chosen Tactic, if any, already exists and may be returned before normal reveal.
- **When the attacker uses Intercepted Orders:** the defender has not yet made their normal Tactic choice. Unless another effect has already committed an opposing Tactic, there may be **no opposing Tactic to return**. The effect can still say to reveal the opponent's Reserve, but how much of the removal/replacement procedure must resolve when no target exists has not been explicitly ruled.
- The earlier suggested wording, `After Tactics are chosen, before they are normally revealed`, avoided this asymmetry. It is **superseded** by the designer's requested face-up immediate wording here.

Consequently, this revision establishes the **requested printed wording** but does **not fully resolve the timing concern in issue #1939**. Do not treat the lack of an opposing Tactic as implicit permission to wait until the opponent chooses one. That would contradict `takes effect immediately` and require a separate explicit ruling.

Also review how face-up commitment interacts with Intelligence's **Direct Interference** response window and applicable Counterintelligence protection. Existing generic timing rules apply unless the next-release authority explicitly establishes an exception. No additional Surveillance or Interference window should be invented from the replacement alone.

## Release and engine checklist

- [x] Record the designer's decision to use **Tactic** rather than **Gambit/Tactic**.
- [x] Record the designer's revised **face-up immediate** wording verbatim.
- [x] Preserve the existing Asset effect and return/replacement text.
- [ ] Resolve whether attack-side Intercepted Orders intentionally reveals Reserve without returning a Tactic when the defender has not yet chosen one, or whether additional targeting/timing text is required.
- [ ] At the next governed gameplay release, update **`packages/game-data/current-game.json`**, changing `effects[1].label` to `Tactic`, updating the printed text, replacing the `gambit_tactic` mirror with the `tactic` mirror, and retaining canonical current-game single-source authority.
- [ ] Align current rules and next-release publication with generated card faces while preserving frozen historical releases.
- [ ] Implement and regression-test the **face-up-on-choice, immediate** Tactic flow in the digital engine, including attacker and defender selection order, no opposing Tactic, eligible return and replacement, Intelligence Direct Interference, and multiple Tactic/extra Tactic cases.
- [ ] Update the engine registration surface key to `intelligence-intercepted-orders::1::Tactic`; **do not increase executable battle parity until actual implementation is verified**.
- [ ] Close issue #1939 after authority, publication, and behavior are all verified.

## Scope

This is a forward-looking **accepted proposed card text**, not a claim that the already-published release includes a Tactic-only Intercepted Orders. Do not modify a frozen release in place or silently register unimplemented engine behavior.
