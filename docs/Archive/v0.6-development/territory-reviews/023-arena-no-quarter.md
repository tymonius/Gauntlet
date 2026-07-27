# 023. Arena: No Quarter

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

> Homeland Advantage does not apply, and tied battle rolls are rerolled. The loser retreats two tiles instead of one.

## v0.6 decision

- **Complexity:** Basic
- **Watchlist:** Retreat stacking and board-edge interactions

> During battles on No Quarter, Homeland Advantage does not apply. If battle totals are tied, reroll the battle dice. The loser retreats one additional space, if able.

## Rationale

- Preserve the Arena rule that removes Homeland Advantage and forces unresolved ties to be rerolled.
- Refer to tied battle totals rather than tied die results, because card effects may create the tie.
- Express the retreat increase additively so it combines cleanly with other retreat modifiers.
- Include "if able" so board-edge limitations resolve normally.
