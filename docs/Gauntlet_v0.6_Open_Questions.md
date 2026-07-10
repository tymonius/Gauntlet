# Gauntlet v0.6 Open Questions

**Status:** Active tracker for unresolved v0.6 design and production decisions.  
**Purpose:** Keep only questions that can still change the v0.6 rules, cards, faction packages, testing plan, or release materials.

Closed audit items, historical rationale, and post-v0.6 concepts belong in their dedicated documents rather than here.

---

## Card migration and canonical data

- Complete card review beginning with **Scorched Earth**.
- Decide final wording for reviewed cards whose direction is approved but text remains provisional.
- Finish Intelligence Mission requirements, including an appropriately difficult Mission for **Assassins**.
- Decide which cards receive the **Arcane** trait.
- Complete the post-review Condition reduction pass:
  - prefer Assets for player-owned persistent effects;
  - prefer Overlays for Territory-local effects;
  - resolve and discard immediately when persistence is unnecessary;
  - retain Conditions only where neither alternative represents the timing cleanly.
- Create canonical v0.6 card, Territory, faction, leader, deckbuilding, and recommended-deck data once migration is stable enough.

Before faction-locking any neutral card, continue asking:

1. What shared tool leaves the neutral pool?
2. Do other factions still need that tool for counterplay, pacing, emergency defense, comeback potential, or basic interaction?
3. Does the destination faction already perform the same job through its core mechanic?
4. Does the card duplicate, bypass, or create strange interactions with that mechanic?

---

## Military

- Is maximum Command 2 correct?
- Are General and Commandant comparably strong?
- Does Rout create excessive chain-battle turns?
- Does Fortify bypass the normal counterattack window too often?
- Does Military receive too many capture-timing shortcuts when combined with neutral cards such as Assimilation and Invasion?

---

## Diplomats

The current Terms / Influence / Peace Treaty framework remains the v0.6 baseline. The larger economy redesign is parked in `Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`.

Open v0.6 and production questions:

- Replace **Good Offices** with a stronger Ambassador ability name.
- Determine the final form of the Sanctions card family.
- Decide whether Sanctions remain distinctly Diplomatic or whether Financiers receive a separate economic-pressure implementation.
- Decide whether **Demilitarized Zone** is a Proposal, faction card, Overlay, or later concept.
- Test the five-Article Peace Treaty threshold and the nine-Proposal reference load.
- Test whether Ambassador and Senator are comparably strong.

---

## Inquisition

- Is maximum Conviction 4 correct?
- Are Purge costs and targets appropriately priced?
- Does Condemnation make Purification viable without making ordinary battles hopeless?
- Does Heresy pressure Arcane without creating a hard-counter matchup?
- Does Grand Inquisitor create excessive post-battle Purge pressure?
- Is Witch Hunter's Relentless Pursuit timing and cost clear and fair?
- Watch overlap with Attrition, Insurrection, and hard-cancellation effects.

---

## Arcane

- Finalize names for Rites, Invocation, Transmutation, and both leader abilities.
- Are the three Rites comparably difficult to begin and complete?
- Is one begun-but-incomplete Rite at a time the correct limit?
- Does Rite of Echoes create worthwhile duplicate-card deckbuilding without excessive handling?
- Is Rite of Blood viable before Transmutation and satisfying afterward?
- Does Rite of Crossing resolve cleanly through occupation and control changes?
- Are Invocation and Transmutation powerful enough without undoing Graveyard pressure or creating excessive battle swings?
- Are Alchemist and Spirit Walker comparably strong?

---

## Financiers

- Is Capital accumulation fast enough without becoming a runaway engine?
- Is the Capital-limit formula easy to track?
- Does Treasury create planning rather than disconnected setup?
- Are Deed cost and buyout premiums intuitive and interactive, including mirror matches?
- Is Play the Market appropriately swingy?
- Is progressive Subsidize understandable and balanced?
- Should Line of Credit collateral remain discard-bound or go to the Graveyard?
- Does Hostile Takeover create too much immediate-control snowballing?
- Are Banker and Executive comparably strong?

---

## Intelligence

- Write and calibrate Mission requirements for Intelligence faction cards.
- Ensure higher-value cards receive appropriately difficult or risky Missions.
- Test whether one Active Mission at a time is the correct limit.
- Test whether Operation Progress greater than opposing Territories is the correct Special Operation readiness threshold.
- Test Special Operation failure and final Intel-cost formulas under both strong and weak board positions.
- Decide whether Intel needs a maximum.
- Ensure Surveillance and Interference remain disruptive rather than destructive.
- Watch density around reveal, hand knowledge, cancellation, Sabotage, Treason, Scouting Report, and Special Operation.
- Test Ranger and Spymaster for comparable strength and distinct play.

---

## Cross-faction testing

- Do all six factions remain recognizably engaged with movement, battle, occupation, capture, and breakthrough?
- Do alternate victories create visible parallel pressure rather than solitaire progress?
- Are paired leaders comparably strong within each faction?
- Does the Territory-scaled Asset bank accelerate games without making comebacks implausible?
- Does any matchup routinely remove the losing player's ability to make meaningful decisions?

Use `Gauntlet_Playtest_Targets_and_Metrics.md` for the quantitative and qualitative data to collect.

---

## Product and release planning

- Should the v0.6 playtest package include printable leader cards, faction reference cards, resource trackers, and suggested decks for every leader?
- Should resource tracks appear directly on leader cards or on separate faction references?
- How should official leader and faction decklists be formatted?
- A future starter product may contain the neutral core, Military, and perhaps one additional faction, while a complete product contains the full card pool with sufficient multiples. This remains a product lead, not a v0.6 rules decision.

---

## Resolution protocol

When a question is decided:

1. write the decision into the relevant active source of truth;
2. remove it from this file or replace it with a clearly labeled watchlist item;
3. update the Project Index if the source hierarchy or active checkpoint changes.
