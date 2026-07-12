# Gauntlet v0.6 Card Metadata

**Status:** Consolidated metadata rollup through card 54, **Arcane Knowledge**.

`card-reviews/STATUS.md` records the live checkpoint. Standalone review files remain the detailed provenance for decisions made after the previous rollup.

This file replaces the combined labels **Core Neutral** and **Advanced Neutral / Watchlist** with separate metadata fields. Those older labels in historical source material do not define gameplay categories.

## Metadata fields

- **Allegiance** — whether the card is Neutral or belongs to a named faction. This affects deck access.
- **Starter eligible** — whether the card is recommended for introductory or starter decks. This does not affect normal deck-construction legality.
- **Complexity** — teaching and rules-load rating: **Basic** or **Advanced**.
- **Watchlist** — a specific balance, pacing, wording, or interaction concern to test. A watchlist entry does not make a card illegal or advanced by itself.

Use **TBD** where the card has been faction-placed but starter-deck suitability has not yet been decided.

## Reviewed-card registry

| # | Card | Allegiance | Starter eligible | Complexity | Watchlist |
|---:|---|---|---|---|---|
| 1 | Witchcraft | Arcane | TBD | Advanced | Copied-effect wording and eligible-effect boundaries |
| 2 | Armistice | Neutral | No | Advanced | Global battle suppression, alternate-win stalling, and draw-engine support |
| 3 | Assassins | Intelligence | TBD | Advanced | Mission requirement and disruption density |
| 4 | Assimilation | Neutral | No | Advanced | Immediate-capture density and overlap with capture shortcuts |
| 5 | Attrition | Neutral | No | Advanced | Long-game card denial and Inquisition overlap |
| 6 | Blockade | Diplomats | No | Advanced | Sanctions redesign pending |
| 7 | Brothers in Arms | Military | TBD | Advanced | Cancellation-proofing interactions |
| 8 | Capital Gains | Financiers | TBD | Advanced | Faction-infrastructure redesign and cost |
| 9 | Capital Punishment | Neutral | No | Basic | Hard-removal density and post-battle Action combinations |
| 10 | Conscription | Neutral | Yes | Basic | None |
| 11 | Contraband | Neutral | Yes | Basic | None |
| 12 | Counterintelligence | Neutral | Yes | Basic | Recheck cost after Intelligence is finalized |
| 13 | Court Martial | Neutral | Yes | Basic | Retreat stacking and board-edge interactions |
| 14 | Decoys | Neutral | Yes | Basic | Scope of cancellation protection |
| 15 | Disruption | Neutral | Yes | Basic | Neutral hand-disruption and cancellation density |
| 16 | Entrenchment | Neutral | Yes | Basic | Trigger scope |
| 17 | Fealty | Neutral | Yes | Basic | None |
| 18 | Fog of War | Intelligence | TBD | Advanced | Random-selection timing |
| 19 | Fortifications | Neutral | Yes | Basic | Additional-withdrawal wording |
| 20 | Illegal Occupation | Neutral | Yes | Basic | None |
| 21 | Insurrection | Neutral | No | Advanced | Chaotic reset and cross-faction disruption |
| 22 | Invasion | Neutral | No | Advanced | Military tempo stacking |
| 23 | Liberation | Neutral | No | Advanced | Counterattack efficiency and tempo |
| 24 | Manifest Destiny | TBD | No | Advanced | Full redesign required |
| 25 | Militias | Military | TBD | Basic | Defensive stacking |
| 26 | Monetary Crisis | Financiers | TBD | Advanced | Repeated hand resets |
| 27 | Necromancy | Arcane | TBD | Advanced | Recursion and Arcane-system interactions |
| 28 | New Recruits | Neutral | Yes | Basic | Possible automatic inclusion |
| 29 | Palisade Wall | Neutral | Yes | Basic | Defensive Asset suppression and overlap with Fortified Pass |
| 30 | Patriotism | Military | TBD | Advanced | Defensive stacking and doubling interactions |
| 31 | Protracted Siege | Neutral | No | Advanced | Excessive game length |
| 32 | Rallying Cry | Neutral | Yes | Basic | None |
| 33 | Redemption | Neutral | Yes | Basic | None |
| 34 | Reinforcements | Neutral | Yes | Basic | Action economy and late-battle timing |
| 35 | Resistance | Neutral | No | Advanced | Counterattack stacking and occupation-delay pressure |
| 36 | Revolution | Neutral | No | Advanced | Extreme hand swings, battle reversal, and simultaneous-use timing |
| 37 | Rousing Speech | Neutral | Yes | Basic | None |
| 38 | Sabotage | Neutral | Yes | Basic | Neutral cancellation density and overlap with Disruption and Intelligence Interference |
| 39 | Scorched Earth | Neutral | No | Advanced | Repeated Ruins replacement, Graveyard interactions, and limited removal |
| 40 | Scouting Report | Neutral | No | Advanced | Extra battle-drawn play, special-reveal sequencing, and Intelligence information stacking |
| 41 | Sedition | Neutral | Yes | Basic | Neutral Asset-removal density |
| 42 | Shock and Awe | Military | No | Advanced | Immediate-capture density, Command exhaustion, leader-Order overlap, and chained movement |
| 43 | Siege Weaponry | Neutral | No | Advanced | Persistent Territory suppression, Ruins replacement, and matchup dependence |
| 44 | Spies | Intelligence | No | Advanced | Persistent hand exposure, special-reveal sequencing, reselection, and Surveillance overlap |
| 45 | Stand Ground | Neutral | Yes | Basic | Forced-movement boundary with required retreat and voluntary withdrawal |
| 46 | Strategic Withdrawal | Neutral | No | Advanced | Movement stacking, card recovery, and retreat-versus-withdrawal sequencing |
| 47 | Supplies | Neutral | Yes | Basic | Low-cost deck smoothing and automatic-inclusion pressure |
| 48 | Tariffs | Financiers | No | Advanced | Action economy, delayed draw suppression, multiple-copy incentives, and voluntary Asset removal |
| 49 | Sequestration | Neutral | No | Advanced | Mass Asset resets, comeback strength, and Asset-heavy faction engines |
| 50 | Treason | Intelligence | No | Advanced | Copied-effect timing, cancellation interactions, source-dependent effects, and Surveillance/Interference |
| 51 | Tyranny | Inquisition | No | Advanced | Repeatable suppression, opponent-selected targets, multi-part Battle cards, and negation timing |
| 52 | Valor | Neutral | Yes | Basic | Multiple-copy stacking and repeated loss-trigger draws |
| 53 | War Crimes | Inquisition | No | Advanced | Loss-trigger suppression, forced-retreat stacking, matchup dependence, and comeback-card interactions |
| 54 | Arcane Knowledge | Neutral | No | Advanced | Graveyard toolbox flexibility, premium Battle effects, and copied-effect chains |

## Name and trait notes

- The v0.5.7 card **Arcane Knowledge** is named **Witchcraft** in v0.6.
- The v0.5.7 card **Witchcraft** is named **Arcane Knowledge** in v0.6.
- **Arcane Knowledge** (#54) has the **Arcane** trait despite Neutral allegiance. Trait and allegiance are separate fields.

## Current rollup state

The playable-card review is complete through all 54 source cards. Remaining card work concerns exact-text blockers, faction-package construction, cost-curve auditing, and canonical-data production rather than unreviewed source cards.
