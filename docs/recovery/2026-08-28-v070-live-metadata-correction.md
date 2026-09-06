# v0.7.0 live card-pool metadata correction

Date: August 28, 2026

## Discovery

After v0.7.0 publication, the complete current gameplay authority and frozen release canonical JSON were found to contain stale summary metadata inherited from the v0.6.3 baseline:

- gameplay.card_pool_summary reported 50 Neutral cards and 13 cards per faction; and
- each gameplay.factions[*].card_count reported 13.

The actual gameplay.cards array was already correct and contained the full published v0.7.0 pool:

- 52 Neutral cards;
- 15 Military cards;
- 15 Diplomats cards;
- 15 Financiers cards;
- 15 Intelligence cards;
- 15 Mystics cards; and
- 15 Inquisition cards.

Total playable cards: 142.

No playable-card identity, cost, text, effect, allegiance, starter Deck, Territory, Leader, faction rule, or other gameplay mechanic was missing or changed by this correction.

## Repair policy

The live complete authority at game-data/current-game.json is corrected so current tooling does not continue propagating the stale summary fields. A regression test derives card counts and total Deckbuilding Value from the actual playable-card records and requires the summary metadata and faction card_count fields to match.

Because v0.7.0 remains the current published release and its Rulebook/package are maintained through the post-release rematerialization workflow, the same metadata correction is also applied to the maintained v0.7.0 publication package. The repair changes only derived summaries and Rulebook pool counts; it does not add, remove, or alter any playable card.

The v0.7.0 materializer now derives card_pool_summary and faction card_count from gameplay.cards before regenerating the canonical JSON, manifest hashes, and Rulebook booklet.

## Follow-through

Future published releases must be generated from a complete current authority that already passes the summary-consistency regression. Published Rulebook pool counts must be checked against the actual canonical playable-card array rather than inherited summary metadata.
