# 053. War Crimes

**Status:** Approved  
**Source:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## v0.5.7 source

**Cost:** 4

**Action:**

> Bank War Crimes as an Asset. Whenever your opponent loses a battle against you, they cannot benefit from effects they control that trigger because they lost or retreated. Cards they played during that battle must go to their Graveyard unless an opposing effect moves them elsewhere.

**Battle:**

> If your opponent loses this battle, they cannot benefit from effects they control that trigger because they lost or retreated. Cards they played during this battle must go to their Graveyard unless an opposing effect moves them elsewhere. They must retreat one additional tile.

**Reminder:**

> The additional retreat is forced and does not trigger Refuge.

## v0.6 decision

- **Cost:** 3
- **Allegiance:** Inquisition
- **Starter eligible:** No
- **Complexity:** Advanced
- **Watchlist:** Loss-trigger suppression, forced-retreat stacking, matchup dependence, and interaction with comeback cards

### Action

> Bank War Crimes as an Asset. After your opponent loses a battle against you, you may discard War Crimes. If you do, none of their cards or abilities can trigger because of that loss or any resulting retreat. They retreat one additional space.

### Battle

> If your opponent loses this battle, none of their cards or abilities can trigger because of that loss or any resulting retreat. They retreat one additional space.

## Assessment

### Neutral-pool impact

War Crimes is not necessary shared counterplay. Its purpose is to deny a defeated opponent access to recovery effects and compound their loss with additional forced movement, which is appropriately faction-specific.

### Faction-system interaction

War Crimes fits the Inquisition's punitive identity by suppressing effects such as Valor and Strategic Withdrawal after a loss. It no longer repeats the faction's broader Graveyard-routing mechanics, and its prepared Asset is consumed rather than creating an indefinite lockout.

### Rationale

- Convert the Action from a permanent suppression Asset into a visible one-use Asset to avoid repeated shutdown of comeback effects.
- Remove the Graveyard-routing clause because Inquisition already handles opposing Battle-card destinations through its broader faction mechanics, and the clause created unnecessary precedence questions.
- Replace **cannot benefit from effects they control** with **none of their cards or abilities can trigger** so it is clear that the effects do not occur at all.
- Apply the suppression to both the loss and any resulting retreat, including the additional retreat caused by War Crimes.
- Reduce cost from 4 to 3 because the Asset is conditional on the opponent losing, does not help cause that loss, and is consumed when used.
- Omit the reminder text; the card's operative text is sufficient for the reviewed version.

## Follow-up

- Test War Crimes against Valor, Strategic Withdrawal, Refuge-related effects, and other loss-compensation packages.
- Test stacking with other forced-movement effects to ensure a single victory does not produce excessive displacement.
