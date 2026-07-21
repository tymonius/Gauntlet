# 013. Supply Depot

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

> At the beginning of their turn, a player occupying and controlling this Territory draws two cards instead of one.

## v0.6 decision

- **Complexity:** Basic
- **Watchlist:** Draw acceleration and start-of-turn draw modifiers

> At the beginning of their turn, a player occupying and controlling Supply Depot draws one additional card as part of their normal draw.

## Rationale

- Preserve the mechanic while making the draw increase additive rather than replacing the normal draw amount.
- Allow Supply Depot to stack cleanly with other effects that modify the normal draw.
- Tying the additional card to the normal draw means the Territory provides no card if that draw is skipped.
