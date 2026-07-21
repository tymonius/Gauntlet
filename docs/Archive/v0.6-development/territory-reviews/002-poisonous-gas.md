# 002. Poisonous Gas

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

> During a battle on this Territory, each player may play no more than one card and must place one card from their battle draw in their Graveyard. A battle-draw card played during that battle satisfies this requirement.

## v0.6 decision

- **Complexity:** Advanced
- **Watchlist:** Graveyard pressure, low-deck edge cases, and destination-changing effects

> During a battle on Poisonous Gas, each player may play no more than one Battle card. A card played from battle draw goes to its owner's Graveyard instead of its normal destination. If a player does not play a card from battle draw, during battle cleanup they place one unplayed card from that draw in their Graveyard.

## Rationale

- Keep the mechanic unchanged while making the two possible cases explicit.
- A player who uses a battle-drawn card sends that played card to the Graveyard.
- A player who does not use a battle-drawn card instead sacrifices one unplayed card from that draw during cleanup.
- Retain the one-card limit so the hazard cannot be overwhelmed through card volume.
