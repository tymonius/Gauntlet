# 048. Tariffs

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

**Cost:** 3

**Action:**

> Play Tariffs as a Condition. Draw two cards. You may immediately play one additional Action card. At the beginning of your next turn, skip your normal draw, then discard Tariffs.

**Battle:**

> Your opponent may discard one card from their hand. If they do not, add +1 to your battle total.

**Reminder:**

> Multiple Tariffs may chain, but the skipped-draw penalty does not stack.

## v0.6 decision

- **Cost:** 3
- **Allegiance:** Financiers
- **Starter eligible:** No
- **Complexity:** Advanced
- **Watchlist:** Action economy, delayed draw suppression, multiple-copy incentives, and interaction with voluntary Asset removal

### Action

> Bank Tariffs as an Asset. Draw two cards. You may immediately play one additional Action card other than Tariffs.

### Asset

> While Tariffs is banked, skip your normal draw. You cannot voluntarily discard Tariffs during the turn it is banked.

### Battle

> Your opponent may discard one card from their hand. If they do not, add +1 to your battle total.

## Approved core-rule amendment

Whenever you could play an Action card during your turn, you may instead discard one banked Asset you control.

- This uses that Action opportunity.
- It is not playing an Action card.
- An effect granting an additional Action-card play may instead be used to discard a banked Asset.
- A card may prohibit or delay its own voluntary removal, as Tariffs does.

This amendment is authoritative from this review and should be integrated into `../Gauntlet_v0.6_Working_Rules.md` at the next rules rollup.

## Assessment

### Neutral-pool impact

Moving Tariffs to Financiers does not remove a necessary shared function. Neutral retains simple draw, filtering, stored draw, and additional-Action support through Rallying Cry, New Recruits, Supplies, and Reinforcements. Tariffs combines immediate cards, Action tempo, and a continuing liability, which is more faction-defining than foundational.

### Faction-system interaction

Tariffs expresses the Financiers' leverage and delayed-payoff identity without directly using Capital or Treasury. It grants value immediately while creating an ongoing liability that consumes Asset capacity, suppresses normal income in cards, and eventually costs an Action opportunity to remove.

### Rationale

- Converting Tariffs from a Condition to an Asset makes the liability visible, interactive, and subject to Asset-bank pressure.
- The player may choose how long to carry the liability rather than having it expire automatically.
- Prohibiting same-turn voluntary removal guarantees that the borrowed value cannot be taken and erased immediately.
- Excluding Tariffs from its own additional Action-card play prevents chaining multiple copies through the printed bonus.
- Allowing any Action opportunity to be exchanged for voluntary Asset removal keeps the rule consistent and permits Tariffs' bonus to clear a different Asset.
- Cost 3 remains appropriate for immediate draw and tempo balanced by persistent skipped draws and later removal cost.

## Follow-up

- Integrate the approved voluntary Asset-discard rule into the Working Rules at the next rules rollup.
- Test whether multiple banked Tariffs remain attractive despite the inability to chain them directly and the need to remove each separately.
