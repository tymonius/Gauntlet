# 024. Arena: Single Combat

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

> Homeland Advantage does not apply, and tied battle rolls are rerolled. Neither player's Assets apply during the battle.

## v0.6 decision

- **Complexity:** Basic
- **Watchlist:** Asset-reliant strategies and effects resolving immediately before battle

> During battles on Single Combat, Homeland Advantage does not apply. If battle totals are tied, reroll the battle dice. All banked Assets are inactive during the battle.

## Rationale

- Preserve the Arena rule that removes Homeland Advantage and forces unresolved ties to be rerolled.
- Refer to tied battle totals rather than tied die results, because card effects may create the tie.
- Use the established inactive terminology for Assets.
- Apply the suppression symmetrically to both players.
- Effects that resolved before the battle are not retroactively undone.
