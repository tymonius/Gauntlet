# Gauntlet v0.6 Condition Audit

**Status:** Active post-review cleanup pass  
**Source baseline:** `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

## Project direction

Retire **Conditions** as a game concept in v0.6. Every former Condition must become:

- an **Asset** for a player-owned persistent effect;
- an **Overlay** for an effect attached to a Territory;
- an immediate or self-tracking effect when persistence does not require a separate game object; or
- a redesigned effect that no longer needs Condition handling.

Any conversion must preserve pacing, counterplay, visibility, and the intended cost of persistence.

## Approved during this audit

### Armistice

**Cost:** 4  
**Representation:** Renewable temporary Asset  
**Complexity:** Advanced  
**Watchlist:** Global battle suppression, alternate-win stalling, and draw-engine support

> **Action:** Bank Armistice as an Asset. While Armistice is active, neither player can initiate a battle. At the beginning of each of your turns, after your normal draw, discard two cards from your hand or discard Armistice. Armistice cannot be voluntarily discarded at any other time.

**Battle effect direction:** Preserve the previously approved battle-ending effect. Resolve cancellation first; if Armistice remains active, end the battle without a winner, return the attacker to the space they entered from, stop unresolved Battle effects, place the other Battle cards still in play in their owners' discard piles, and place Armistice in its owner's Graveyard.

**Rationale:**

- Asset status gives the ceasefire a visible, interactable game object and makes it compete for Asset-bank capacity.
- Other Assets already constrain opposing play, but Armistice is exceptional in globally preventing a core action and therefore remains Advanced and watchlisted.
- Two-card upkeep is deliberately greater than the normal one-card draw, so indefinite peace requires sustained card-economy investment rather than an arbitrary duration limit.
- The owner is also prevented from initiating battles.
- Prohibiting voluntary discard prevents the owner from benefiting from peace through the opponent's turn and then switching it off before acting.

### Assimilation

**Cost:** 4  
**Representation:** Prepared single-use Asset  
**Complexity:** Advanced  
**Watchlist:** Immediate-capture density and overlap with other capture shortcuts

> **Action:** Bank Assimilation as an Asset. After you win a battle you initiated on a Territory your opponent controls, you may place Assimilation in your Graveyard. If you do, capture that Territory immediately instead of occupying it.

> **Battle:** If you win this battle as the attacker on a Territory your opponent controls, capture that Territory immediately instead of occupying it. Place Assimilation in your Graveyard after the capture resolves.

**Rationale:**

- The Asset cleanly replaces the old same-turn Condition while keeping the effect visible and interactable.
- Holding the opportunity across turns is stronger than the old one-turn setup, but it occupies Asset-bank capacity and remains vulnerable to suppression and removal.
- Sending Assimilation to the Graveyard preserves the premium, non-repeatable character of immediate capture.
- Assimilation remains distinct from Shock and Awe because it grants only immediate capture and no follow-up movement.

### Capital Punishment

**Cost:** 4  
**Representation:** Immediate post-victory Action; no persistent object  
**Complexity:** Basic  
**Watchlist:** Hard-removal density and post-battle Action combinations

> **Action:** If you won a battle this turn, choose one opposing Asset and place it in its owner's Graveyard.

> **Battle:** Choose one active opposing Battle card. It has no effect during this battle. During battle cleanup, if you won, place the chosen card in its owner's Graveyard instead of its normal destination.

**Rationale:**

- The Action removes the old marked-target Condition and uses the battle victory itself as the prerequisite.
- Preserving the Action opportunity until after movement and winning a battle creates the intended setup cost without persistent tracking.
- The Battle effect must negate immediately so it can help determine the winner; victory gates only the permanent Graveyard destination.
- If the player loses, the chosen card still has no effect during the battle but follows its normal destination during cleanup.
- The victory rider matters primarily for battle-drawn cards, because hand commitments normally enter the Graveyard already.

### Court Martial

**Cost:** 3  
**Representation:** Optional single-use Asset  
**Complexity:** Basic  
**Watchlist:** Retreat stacking and board-edge interactions

> **Action:** Bank Court Martial as an Asset. During battle cleanup, after an opponent loses a battle against you and completes their normal retreat, you may discard Court Martial. If you do, they retreat one additional space, if able.

> **Battle:** Your opponent gains disadvantage during this battle. If they lose, after completing their normal retreat, they retreat one additional space, if able.

**Rationale:**

- The optional trigger lets the controller hold Court Martial for a strategically important loss instead of expiring after the opponent's next battle regardless of result.
- The banked Asset is visible and interactable, making the threat legible to both players.
- Resolving the additional retreat after the normal retreat keeps sequencing clear and preserves ordinary retreat resolution.
- The effect applies only after the opponent loses a battle against the controller, preventing unrelated battles from consuming it.

## Already resolved before this audit

The following v0.5.7 Condition uses were removed or converted during card review:

- **Protracted Siege** — Asset that becomes a Territory Overlay.
- **Redemption** — expendable Asset.
- **Reinforcements** — expendable Asset.
- **Sabotage** — resolves immediately; the target Asset's face-down state tracks duration.
- **Scorched Earth** — Asset that becomes a Ruins Overlay.
- **Shock and Awe** — prepared Asset.
- **Stand Ground** — expendable Asset.
- **Supplies** — one-use Asset.
- **Tariffs** — temporary Asset with delayed penalty.
- **Treason** — expendable Asset.

## Pending review now

1. **Disruption** (source card: Embargo)
2. **Palisade Wall**

## Deferred until faction-card redesign

- **Blockade / Sanctions** — exact Diplomat implementation remains unresolved.
- **Capital Gains** — payoff must first be reconnected to Financier infrastructure.

## Workflow

Review the remaining current candidates in source order. For each card:

1. choose Asset, Overlay, immediate resolution, or a full redesign;
2. preserve the previously approved card identity and balance direction where doing so remains sound;
3. log the approved result here;
4. roll the result into the consolidated card sources at the next migration checkpoint.
