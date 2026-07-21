# 006. Ruined Storehouse

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

> When drawing at the beginning of their turn, a player on this Territory may draw the top card of their discard pile instead of their deck.

## v0.6 decision

- **Complexity:** Basic
- **Watchlist:** Recurring access to strong cards and start-of-turn draw modifiers

> Once at the beginning of their turn, when a player on Ruined Storehouse would draw a card from their deck, they may draw the top card of their discard pile instead.

## Rationale

- Keep the effect to one substitution even when another effect increases the beginning-of-turn draw.
- The ability does nothing if the player skips their draw.
- The effect interacts only with the discard pile and never retrieves cards from the Graveyard.
