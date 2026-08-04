# Gauntlet v0.6.2 Wave B Review Checklist

Use this checklist when reviewing the faction and component candidate.

## Source boundary

- [ ] Published v0.6.1 files are unchanged.
- [ ] Unchanged v0.6.1 faction and component text is inherited rather than duplicated.
- [ ] Every v0.6.2 replacement is explicit and takes precedence only within the candidate.

## Shared-rule parity

- [ ] Opening and Denouement replace Action Opportunities correctly.
- [ ] Onset replaces battle opening-effects terminology.
- [ ] Fall Back, withdraw, and retreat remain distinct.
- [ ] Immediate Capture effects preserve contiguous Front Line control.
- [ ] Defensive Edge includes controlled-Territory defense and Last Stand.
- [ ] Arenas remove Defensive Edge and use a Tiebreak Roll.

## Faction review

- [ ] Military Invasion and its stacking interactions are complete.
- [ ] All nine Proposals are perspective-safe for the receiving player.
- [ ] Influence rewards and triangular Leverage costs are correct.
- [ ] Financial Capacity and Purge use the two-phase Action model.
- [ ] Extraordinary Rendition's bound-card and first-discard rules are complete.
- [ ] Guardians of the Circle, Black Covenant, and Nature's Altar match accepted text.
- [ ] Martyrdom preserves the battle result while changing remaining-Reserve destinations.

## Pool and Territory review

- [ ] Neutral remains 50 cards and each faction reaches 13.
- [ ] Every new card has the accepted cost, restriction, and modes.
- [ ] Landslide triggers only from retreat and may chain.
- [ ] Obsolete `revealed Territory` qualifiers are removed from revised text.
- [ ] Quicksand, Difficult Terrain, Command Tent, Smuggler's Pass, and all Arenas use v0.6.2 terminology.

## Validation

- [ ] All 85 Wave B scenarios are present and unique.
- [ ] `npm test` runs the Wave A and Wave B validators.
- [ ] The full repository test suite and generated-source checks pass.
