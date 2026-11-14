# v0.7.2 — Illustrated non-playable card artwork darkness audit

**Current game authority:** `packages/game-data/current-game.json`. This audit is complementary to [the playable-card darkness audit](current-playable-card-darkness-audit.md).

Measured **53 illustrated non-playable card fronts**: 25 Territories/Arenas, 12 Leaders, 9 Diplomat Proposals, 6 Mystics Rites, and 1 Ritual of Ascension. Three unique shared supplemental reverse illustrations are also ranked separately.

**Not ranked:** text-led references, trackers, ledger, and deed cards, and generated standard card backs. Those card faces have no unique original scene illustration to analyze.

Measurements are taken from current **source image files**, not an output print or full rendered card. Every image is downsampled to at most 256×256, converted to RGB, and scored using sRGB weighted luminance (0=black, 255=white). `Dark <64` represents the proportion of image pixels with brightness under 64/255. Absolute darkness does not by itself mean lost print detail.

## Findings

- **Grand Inquisitor (21.2)** and **Spymaster (23.9)** are the only illustrated non-playable fronts darker by average luminance than **Spectral Surveillance (25.9)**, the ninth darkest playable card. These should be the first two non-playable print-review candidates, but not automatically brightened.
- The darkest Rite is **Rite of Blood (35.7)**, the darkest Proposal is **Ultimatum (36.2)**, and the darkest Territory is **Smuggler's Run (44.3)**.
- The shared **ratified Proposal reverse** is dark (29.4) but should be reviewed separately as a shared reverse treatment, not counted as nine unique illustrations.

## Complete ranking (including shared reverse art)

| Rank | Card / art face | Category | Mean (0–255) | Pixels under 64 | Median | Source |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | Grand Inquisitor | Leader | 21.2 | 96.5% | 16 | `images/grand inquisitor.png` |
| 2 | Spymaster | Leader | 23.9 | 95.5% | 18 | `images/spymaster.png` |
| 3 | Proposal ratified (shared reverse) | Shared reverse art | 29.4 | 91.2% | 25 | `images/artwork/supplemental/diplomats/ratified-wax-seal.webp` |
| 4 | Rite of Blood | Rite | 35.7 | 83.3% | 29 | `images/artwork/cards/mystics/rites-and-rituals/rite-of-blood.png` |
| 5 | Ultimatum | Proposal | 36.2 | 85.9% | 21 | `images/artwork/cards/diplomats/proposals/ultimatum.png` |
| 6 | Ritual of Ascension | Ritual | 41.5 | 85.1% | 33 | `images/artwork/cards/mystics/rites-and-rituals/ritual-of-ascension.png` |
| 7 | Alchemist | Leader | 41.5 | 83.6% | 33 | `images/alchemist.png` |
| 8 | Rite of Equivalence | Rite | 41.6 | 80.3% | 27 | `images/artwork/cards/mystics/rites-and-rituals/rite-of-equivalence.png` |
| 9 | Executive | Leader | 42.3 | 81.1% | 27 | `images/executive.png` |
| 10 | Witch Hunter | Leader | 43.5 | 77.5% | 39 | `images/witch hunter.png` |
| 11 | Rite of Shattering | Rite | 43.7 | 78.3% | 28 | `images/artwork/cards/mystics/rites-and-rituals/rite-of-shattering.png` |
| 12 | Smuggler's Run | Territory / Arena | 44.3 | 81.8% | 37 | `images/artwork/cards/territories/smuggler-s-run.png` |
| 13 | Senator | Leader | 44.7 | 75% | 36 | `images/senator.png` |
| 14 | Banker | Leader | 46.9 | 79.1% | 33 | `images/banker.png` |
| 15 | Rite of Echoes | Rite | 49.8 | 66.9% | 39 | `images/artwork/cards/mystics/rites-and-rituals/rite-of-echoes.png` |
| 16 | Rite of Consecration | Rite | 50.1 | 72.6% | 45 | `images/artwork/cards/mystics/rites-and-rituals/rite-of-consecration.png` |
| 17 | Diplomatic Recognition | Proposal | 51.5 | 73.4% | 38 | `images/artwork/cards/diplomats/proposals/diplomatic-recognition.png` |
| 18 | Arena: Single Combat | Territory / Arena | 51.8 | 70% | 43 | `images/artwork/cards/territories/arena-single-combat.png` |
| 19 | Garrison | Territory / Arena | 52.3 | 67.2% | 45 | `images/artwork/cards/territories/garrison.png` |
| 20 | Insurgency | Territory / Arena | 53 | 68.5% | 44 | `images/artwork/cards/territories/insurgency.png` |
| 21 | Command Tent | Territory / Arena | 53.6 | 67.9% | 42 | `images/artwork/cards/territories/command-tent.png` |
| 22 | Arena: Spoils of War | Territory / Arena | 54.4 | 66.7% | 41 | `images/artwork/cards/territories/arena-spoils-of-war.png` |
| 23 | Disrupted Supply Lines | Territory / Arena | 60.9 | 61.4% | 54 | `images/artwork/cards/territories/disrupted-supply-lines.png` |
| 24 | Open Channels | Proposal | 61.4 | 63.7% | 38 | `images/artwork/cards/diplomats/proposals/open-channels.png` |
| 25 | Supply Depot | Territory / Arena | 61.8 | 63.5% | 45 | `images/artwork/cards/territories/supply-depot.jpg` |
| 26 | High Ground | Territory / Arena | 62.9 | 62.2% | 53 | `images/artwork/cards/territories/high-ground.jpg` |
| 27 | Spirit Walker | Leader | 64.6 | 55.1% | 59 | `images/spirit walker.png` |
| 28 | Difficult Terrain | Territory / Arena | 64.8 | 59.2% | 55 | `images/artwork/cards/territories/difficult-terrain.png` |
| 29 | Fortified Pass | Territory / Arena | 65.4 | 58.8% | 55 | `images/artwork/cards/territories/fortified-pass.png` |
| 30 | Monastery | Territory / Arena | 68 | 57.8% | 56 | `images/artwork/cards/territories/monastery.png` |
| 31 | Field Hospital | Territory / Arena | 68.6 | 54.8% | 57 | `images/artwork/cards/territories/field-hospital.png` |
| 32 | Mutual Disarmament | Proposal | 69.6 | 55% | 56 | `images/artwork/cards/diplomats/proposals/mutual-disarmament.png` |
| 33 | Arena: Grand Melee | Territory / Arena | 71.5 | 48.2% | 66 | `images/artwork/cards/territories/arena-grand-melee.png` |
| 34 | Refuge | Territory / Arena | 72.4 | 49.9% | 64 | `images/artwork/cards/territories/refuge.png` |
| 35 | Ambassador | Leader | 75.1 | 50.5% | 63 | `images/ambassador.png` |
| 36 | Ruined Storehouse | Territory / Arena | 77.5 | 57.5% | 54 | `images/artwork/cards/territories/ruined-storehouse.png` |
| 37 | Toll Bridge | Territory / Arena | 78.3 | 47.3% | 67 | `images/artwork/cards/territories/toll-bridge.png` |
| 38 | Rite of Crossing | Rite | 78.4 | 44.3% | 69 | `images/artwork/cards/mystics/rites-and-rituals/rite-of-crossing.png` |
| 39 | Poisonous Gas | Territory / Arena | 78.4 | 41.3% | 73 | `images/artwork/cards/territories/poisonous-gas.png` |
| 40 | Commandant | Leader | 80 | 46.4% | 68 | `images/commandant.png` |
| 41 | Arena: No Quarter | Territory / Arena | 82.4 | 38.6% | 75 | `images/artwork/cards/territories/arena-no-quarter.png` |
| 42 | Training Grounds | Territory / Arena | 84 | 35.3% | 78 | `images/artwork/cards/territories/training-grounds.png` |
| 43 | Rebuilding Pact | Proposal | 85.2 | 42.3% | 73 | `images/artwork/cards/diplomats/proposals/rebuilding-pact.png` |
| 44 | Capitulation | Proposal | 86.4 | 41.1% | 73 | `images/artwork/cards/diplomats/proposals/capitulation.png` |
| 45 | Old Battlefield | Territory / Arena | 87.2 | 34.7% | 83 | `images/artwork/cards/territories/old-battlefield.png` |
| 46 | Orderly Withdrawal | Proposal | 87.8 | 35.5% | 81 | `images/artwork/cards/diplomats/proposals/orderly-withdrawal.png` |
| 47 | Prisoner Exchange | Proposal | 88.4 | 39.3% | 75 | `images/artwork/cards/diplomats/proposals/prisoner-exchange.png` |
| 48 | Ranger | Leader | 89.3 | 39.7% | 76 | `images/ranger.png` |
| 49 | Exposed Flank | Territory / Arena | 94.5 | 27.6% | 85 | `images/artwork/cards/territories/exposed-flank.png` |
| 50 | General | Leader | 99.2 | 31.7% | 94 | `images/general.png` |
| 51 | King's Road | Territory / Arena | 99.6 | 28.8% | 93 | `images/artwork/cards/territories/king-s-road.png` |
| 52 | Quicksand | Territory / Arena | 101.3 | 21.7% | 105 | `images/artwork/cards/territories/quicksand.png` |
| 53 | De-escalation | Proposal | 102.8 | 28.9% | 86 | `images/artwork/cards/diplomats/proposals/de-escalation.png` |
| 54 | Watchtower | Territory / Arena | 103.8 | 33.6% | 91 | `images/artwork/cards/territories/watchtower.png` |
| 55 | Rite completed (shared reverse) | Shared reverse art | 169.6 | 3.6% | 182 | `images/artwork/supplemental/mystics/rite-completed.webp` |
| 56 | Ritual of Ascension (reverse) | Shared reverse art | 173.9 | 0.3% | 179 | `images/artwork/cardbacks/mystics/ritual-of-ascension.png` |

## Scope and limitations

- All 53 front artwork files were resolved against the current canonical gameplay/component data; the audit raises an error for missing sources.
- This ranks average *source* luminance. Final crop, actual image size, color-management and paper/ink can all change the printed impression.
- Do not use a fixed darkness cutoff to change illustrations without reviewing a print at card size.

Audit run: https://github.com/tymonius/Gauntlet/actions/runs/43388058595
