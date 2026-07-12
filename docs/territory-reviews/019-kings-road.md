# 019. King's Road

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

> When a player starts their turn on this Territory, they have two movements during that turn's Movement phase instead of one.

## v0.6 decision

- **Complexity:** Basic
- **Watchlist:** Movement stacking and consecutive battle initiation

> A player who begins their turn on King's Road gains one additional movement during that turn's Movement phase.

## Rationale

- Preserve the extra-movement mechanic while making it additive rather than replacing the normal movement allowance.
- Allow King's Road to stack cleanly with other movement bonuses.
- Establish the benefit at the beginning of the turn, so it remains available after the player leaves King's Road.
- Each movement follows the normal movement and battle-initiation rules.
