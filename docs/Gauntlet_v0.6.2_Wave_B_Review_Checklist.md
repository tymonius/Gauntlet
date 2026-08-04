# Gauntlet v0.6.2 Wave B Review Checklist

Use this checklist when reviewing the Wave B faction/component candidate and compatibility audit.

## Source boundary

- [ ] Published v0.6.1 files are unchanged.
- [ ] Unchanged v0.6.1 faction and component text is inherited rather than duplicated.
- [ ] Every v0.6.2 replacement is explicit and takes precedence only within the candidate source set.

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
- [ ] All five Intelligence Faction Actions are labeled Denouement.
- [ ] Intelligence card timing and Territory-visibility replacements are complete.
- [ ] Extraordinary Rendition's bound-card and first-discard rules are complete.
- [ ] Guardians of the Circle, Black Covenant, Nature's Altar, and Rite of Crossing match accepted timing.
- [ ] Relentless Pursuit creates no Action phase before its pending battle.
- [ ] Martyrdom preserves the battle result while changing remaining-Reserve destinations.
- [ ] No Martyrs suppresses opposing Martyrdom in an Inquisition mirror.

## Neutral and Territory review

- [ ] Neutral remains 50 cards and each faction reaches 13.
- [ ] Every new card has the accepted cost, restriction, and modes.
- [ ] Landslide triggers only from retreat and may chain.
- [ ] Forced March, Advance Guard, Entrenchment, Palisade Wall, Reinforcements, Strategic Withdrawal, Insurrection, and Liberation use the new Action model.
- [ ] Assimilation, Protracted Siege, and Manifest Destiny preserve contiguous Front Line control.
- [ ] Counterintelligence contains no hidden-Territory rule.
- [ ] Refuge triggers from Fall Back, not retreat or withdrawal.
- [ ] Obsolete `revealed Territory` qualifiers are removed from revised text.
- [ ] Quicksand, Difficult Terrain, Command Tent, Smuggler's Pass, and all Arenas use v0.6.2 terminology.

## Validation

- [ ] The 85 primary and 26 compatibility scenarios are present and combine into 111 unique Wave B scenarios.
- [ ] `npm test` runs the Wave A and Wave B validators.
- [ ] The full repository test suite and generated-source checks pass.
