# 050. Treason

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

**Cost:** 5

**Action:**

> Play Treason as a Condition affecting your opponent. During their next battle, after Battle cards are revealed, choose one eligible card they committed from hand. That card has no effect; place it in its owner's discard pile immediately. Treason uses that card's Battle effect for you. Then discard Treason.

**Battle:**

> Choose one eligible opposing non-cancellation Battle card. That card has no effect; place it in its owner's discard pile immediately. Treason uses that card's Battle effect for you.

## v0.6 decision

- **Cost:** 5
- **Allegiance:** Intelligence
- **Starter eligible:** No
- **Complexity:** Advanced
- **Watchlist:** copied-effect timing, cancellation-card interactions, source-dependent effects, and interactions with Surveillance and Interference

### Action

> Bank Treason as an Asset. During a battle involving you, after all Battle cards are revealed but before their effects resolve, you may discard Treason. If you do, choose one opposing Battle card. That card has no effect for its owner; place it in its owner's discard pile. Instead, resolve it as if you had played it.

### Battle

> Reveal Treason before the other Battle cards. After they are revealed, choose one opposing Battle card. That card has no effect for its owner; place it in its owner's discard pile. Instead, resolve it as if you had played it.

## Assessment

### Neutral-pool impact

Treason is not a foundational shared effect. Its combination of advance preparation, hidden-information exploitation, denial, and appropriation strongly supports Intelligence identity and would be unusually disruptive as universal access.

### Faction-system interaction

Treason complements but does not duplicate Surveillance and Interference. Surveillance reveals information. Interference removes an inspected card while allowing a replacement from the same source. Treason acts after reveal, allows no replacement, discards the chosen card, and turns that card's effect against its owner.

### Rationale

- Convert the Action from a temporary Condition into a banked Asset so the prepared betrayal remains visible, interactive, and subject to Asset-bank pressure.
- Allow the Asset to wait for a worthwhile target instead of expiring automatically in the opponent's next battle.
- Use the phrase **resolve it as if you had played it** to make clear that the chosen opposing effect changes sides.
- Permit cancellation cards as targets. Treason's explicit after-reveal, before-resolution timing is sufficient to let the Treason player resolve the stolen cancellation from their own perspective.
- Retain cost 5 because Treason simultaneously denies an opposing card, changes its destination, and gains its effect.

## Follow-up

- During comprehensive rules cleanup, define how copied or appropriated effects handle impossible targets, card-source references, and other effects that cannot function meaningfully from the new player's perspective.
- Test Treason against cancellation-heavy and high-value Battle packages.
