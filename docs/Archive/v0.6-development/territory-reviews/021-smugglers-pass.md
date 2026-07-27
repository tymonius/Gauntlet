# 021. Smuggler's Pass

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

> While occupying and controlling this Territory, a player may, instead of playing an Action card, place one card from their hand face down next to it. The stored card does not count toward their hand limit. At the beginning of a later turn while they control this Territory, they may return it to their hand. Only one card may be stored here. If control changes, discard it.

## v0.6 decision

- **Complexity:** Advanced
- **Watchlist:** Hand-limit evasion, protected storage, and control-change timing

> As an Action while occupying and controlling Smuggler's Pass, you may stash one card from your hand face down underneath it. The stashed card does not count toward your hand limit. While you occupy and control Smuggler's Pass, you may play the stashed card as though it were in your hand; it counts as a card played from hand. At the beginning of your turn, if you control Smuggler's Pass, you may return the stashed card to your hand. If you lose control of Smuggler's Pass, place it in its owner's discard pile. Only one card may be stashed here.

## Rationale

- Preserve the hidden-cache identity rather than reducing the effect to a simple hand-limit increase.
- Put the card physically underneath the Territory so the storage location is clear and no separate zone or component is needed.
- Require both occupation and control to stash or directly play the card, preventing remote access to a protected extra hand slot.
- Allow retrieval at the beginning of a later turn while control is retained, even if the player is no longer occupying the Territory.
- A stashed Action uses a normal Action opportunity; a stashed Battle card may be committed during a battle there and follows normal hand-play destination rules.
- Losing control destroys access to the cache and sends the card to its owner's discard pile.
