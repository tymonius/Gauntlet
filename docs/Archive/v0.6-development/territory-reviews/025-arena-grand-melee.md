# 025. Arena: Grand Melee

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

> Homeland Advantage does not apply, and tied battle rolls are rerolled. Each player draws four battle cards instead of three and may play up to two of them.

## v0.6 decision

- **Complexity:** Advanced
- **Watchlist:** Multiple Battle-effect interactions and effects that modify battle-draw size or battle-drawn play allowances

> During battles on Grand Melee, Homeland Advantage does not apply. If battle totals are tied, reroll the battle dice. Each player draws one additional card for their initial battle draw and may play one additional card from that draw.

## Rationale

- Preserve the Arena rule that removes Homeland Advantage and forces unresolved ties to be rerolled.
- Refer to tied battle totals rather than tied die results, because card effects may create the tie.
- Express both benefits additively so they combine cleanly with other effects that increase battle-draw size or allow additional battle-drawn card plays.
- Leave each player's normal hand commitment unchanged and separately governed.
- Players may still play fewer battle-drawn cards than allowed, including zero.
