# 022. Arena: Spoils of War

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

> Homeland Advantage does not apply, and tied battle rolls are rerolled. After the battle, the winner may add one unplayed card from their battle draw to their hand instead of discarding it.

## v0.6 decision

- **Complexity:** Basic
- **Watchlist:** Battle-draw increases and repeatable winner advantage

> During battles on Spoils of War, Homeland Advantage does not apply. If battle totals are tied, reroll the battle dice. During battle cleanup, the winner may put one unplayed card from their battle draw into their hand instead of discarding it.

## Rationale

- Preserve the Arena rule that removes Homeland Advantage and forces unresolved ties to be rerolled.
- Refer to tied battle totals rather than tied die results, because card effects may create the tie.
- Place the reward explicitly during battle cleanup.
- Allow the winner to retain only an unplayed card from their own battle draw.
- The retained card enters hand and is therefore subject to the normal hand limit during cleanup.
