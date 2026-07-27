# Gauntlet Development Status

**Current canonical version:** v0.6.0 — Faction Framework Release  
**Release date:** July 20, 2026  
**Status:** Canonical pre-release playtest edition

Gauntlet v0.6.0 is published and is the sole current rules and card package for playtesting. Earlier working rules, preliminary rulebooks, review logs, and release trackers are preserved under `docs/Archive/` and are not active sources.

## Release baseline

The current package contains:

- six factions and twelve Leaders;
- 50 Neutral cards;
- 72 faction cards;
- 25 Territories, including four Arenas;
- the official rulebook and reference guide;
- printable cards and supplemental components;
- the v0.6 Deckbuilder;
- generated canonical JSON and manifest data.

The source hierarchy is listed in [docs/README.md](README.md).

## Current priorities

### 1. Physical and human playtesting

- Verify that every card, Leader, reference, tracker, Proposal, Deed, Rite, and Mission component is legible and practical at final printed size.
- Record game length, turn count, capture count, battle count, victory route, and stalled-turn frequency using [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md).
- Reopen a frozen rule or card only when testing reveals a specific gameplay, wording, balance, or production failure.

### 2. Shared-rules validation

- Confirm impossible-target and partial-resolution handling across the full pool.
- Validate source-dependent and copied Battle effects, especially Treason, Heresy, Witchcraft, Arcane Knowledge, and other bounded-repeat interactions.
- Confirm that Overlay stacking, dormant removal conditions, capture timing, and additional Action Opportunities remain consistent across faction packages.

### 3. Faction and Leader balance

- **Military:** Command pacing, General/Commandant parity, chain battles, retreat pressure, and capture shortcuts.
- **Diplomats:** Influence pacing, Proposal incentives, Peace Treaty progress, Leverage, and Ambassador/Senator parity.
- **Financiers:** Capital growth, Treasury usefulness, Deed clarity, Controlling Interest pacing, and Banker/Executive parity.
- **Intelligence:** Mission completion rates, Intel pacing, Special Operation recovery, information density, and Ranger/Spymaster parity.
- **Mystics:** Rite pacing, Graveyard recursion, Invocation and Transmutation strength, Ritual pressure, and Alchemist/Spirit Walker parity.
- **Inquisition:** Conviction pacing, Purge pricing, Purification viability, Arcane matchup pressure, and Grand Inquisitor/Witch Hunter parity.

### 4. Cross-faction health

- Ensure every faction remains engaged with movement, battle, occupation, capture, and running the Gauntlet.
- Confirm that additional victory conditions are visible, interactive, and disruptable.
- Identify matchups that routinely remove meaningful decisions or make one victory route nonviable.
- Watch the Inquisition–Mystics relationship for healthy counterplay rather than a hard lock.
- Confirm that Territory-scaled Asset capacity accelerates games without making recovery implausible.

### 5. Product and onboarding work

- Prepare tested suggested Decks for Leaders or factions.
- Determine the best faction pairing and component scope for a future starter product.
- Improve first-game teaching materials only after the canonical rules survive physical playtesting.

## Change discipline

When testing produces an approved change:

1. edit the governing canonical Markdown source;
2. update exact card or component text at the same source level;
3. regenerate canonical data and derived documents;
4. synchronize printable sheets and the Deckbuilder;
5. rerun automated and visual validation;
6. record the change in the next release changelog.

Do not restore an archived document as an active authority. Extract any still-useful rationale into the appropriate current source instead.
