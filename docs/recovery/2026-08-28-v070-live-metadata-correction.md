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

The frozen releases/v0.7.0/ package remains unchanged. Its manifest hashes continue to identify the exact published snapshot.

The live complete authority at game-data/current-game.json is corrected so current tooling does not continue propagating the stale summary fields. A regression test now derives card counts and total Deckbuilding Value from the actual playable-card records and requires the summary metadata and faction card_count fields to match.

This is a metadata-consistency correction to the live authority, not a retroactive rewrite of the published v0.7.0 package.

## Follow-through

The next published release must be generated from a complete current authority that already passes the summary-consistency regression. Its frozen canonical data and manifest will therefore contain corrected metadata from the outset.
