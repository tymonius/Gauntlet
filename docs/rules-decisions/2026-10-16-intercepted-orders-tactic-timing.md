# Accepted design decision: Intercepted Orders becomes Tactic-only

**Decision date:** 2026-10-16  
**Status:** Designer-approved proposed card text for a future versioned gameplay release. The currently published card and rules remain unchanged.  
**Tracking:** [issue #1939](https://github.com/tymonius/Gauntlet/issues/1939)

## Decision

Change the Intelligence card **Intercepted Orders** from **Gambit/Tactic** to **Tactic**, preserving its **Asset** effect.

The designer considered and rejected both (a) immediate face-up Tactic play, which might resolve before the defender chooses a Tactic, and (b) a custom `after Tactics are chosen, before normal reveal` opening. The final direction is to **omit the timing sentence entirely**, relying on the ordinary Tactic reveal stage. The earlier instruction to reveal opposing committed face-down Tactics was also removed.

**Subsequent designer ruling (2026-10-16):** Because normal Tactics and the opponent's Reserve have already been revealed by the time Intercepted Orders permits a replacement, **the replacement Tactic enters play face up**. This is a binding card-specific face-state ruling for the future release; the approved printed effect text below is unchanged.

## Approved target card text

**Tactic:**

> Reveal the opponent's Reserve. Return 1 opposing Tactic to that Reserve; it cannot be chosen again this battle. The opponent may choose 1 eligible replacement from the Reserve.

**Asset (unchanged):**

> When the opponent forms their Reserve, before they choose Tactics, you may discard this card to reveal that Reserve and choose 1 card they cannot choose this battle.

## Current-rule timing analysis

- Intercepted Orders is eligible only as a **Tactic** chosen from Reserve, not as a Gambit chosen from Hand. Its effect occurs at the **ordinary Tactic reveal stage**, after both players finish normal Tactic choices.
- The current Rulebook's **Reveal-stage interference** procedure puts effects that return, replace, or otherwise prevent an opposing Tactic's normal resolution **ahead of ordinary effects at that stage**. Accordingly, the target Tactic can be returned before its ordinary effect resolves.
- The final text reveals the **opponent's Reserve**, not opposing committed face-down Tactics separately. At the normal Tactic reveal stage, opposing Tactics follow the normal reveal procedure. If multiple opposing Tactics exist, the return instruction selects one; it does not return all of them.
- If the opponent has not committed a Tactic, there is no legal target for the return instruction. The Reserve reveal remains a separately printed instruction.
- **Replacement face state (approved):** the chosen replacement is placed **face up** in the vacated Tactic role, whether the returned card occupied the normal or additional Tactic slot. The player may still decline to replace it.
- Face-up replacement does **not** reopen earlier Tactic choice, reveal, Surveillance, or Interference windows. Under the existing replacement rule, only effects whose timing remains available and that have not already applied may resolve. Same-stage processing belongs to the normal reveal-effect scheduler.
- Existing reveal protection, ordering, replacement, and Interference rules continue to apply as printed. No additional windows or timing override should be inferred from the decision.

This choice eliminates the early-Gambit timing problem described in #1939 without introducing a new immediate-play or pre-reveal procedure.

## Release and implementation checklist

- [x] Approve **Tactic** instead of **Gambit/Tactic**.
- [x] Remove the opening custom timing sentence entirely.
- [x] Remove the phrase `each opposing face-down Tactic and` from the reveal sentence.
- [x] Preserve the Asset, Reserve reveal, return/re-selection restriction, and replacement instructions.
- [x] Approve face-up entry for any replacement Tactic, without reopening earlier timing windows.
- [ ] Integrate with the next governed gameplay release: update **`packages/game-data/current-game.json`** `effects[1].label` to `Tactic`, use the approved text, remove the `gambit_tactic` mirror and introduce a matching `tactic` mirror.
- [ ] Align the next published rulebook/card faces/public surfaces without mutating a previously published package, including the face-up replacement clarification in appropriate maintained rules.
- [ ] Implement and regression-test the normal Tactic-reveal interference behavior in the digital engine, including zero, one, or multiple opposing Tactics; return and ineligibility; eligible replacement; reveal protections; and shared interference ordering.
- [ ] Update the digital-engine unsupported surface key from `intelligence-intercepted-orders::1::Gambit/Tactic` to `intelligence-intercepted-orders::1::Tactic` when canonical gameplay authority changes, without falsely increasing executable parity.
- [ ] Close #1939 only when updated authority, release presentation, and tested engine behavior are complete.

## Scope

This is an approved future-release card revision, **not** a claim that the current frozen publication or digital engine already implements it.
