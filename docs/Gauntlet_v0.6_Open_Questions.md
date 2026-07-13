# Gauntlet v0.6 Open Questions

**Status:** Active tracker for unresolved v0.6 design and production decisions.  
**Purpose:** Keep only questions that can still change the v0.6 rules, faction cards, faction packages, testing plan, or release materials.

Closed audit items, historical rationale, and post-v0.6 concepts belong in their dedicated documents rather than here.

---

## Card migration and canonical data

The 54-card playable-source review, 12-card Neutral expansion, 50-card Neutral pool, 25-card Territory review, and current non-faction Condition cleanup are complete. Conditions are retired as a v0.6 game concept.

The final Neutral curve is 11 / 19 / 11 / 8 / 1. `Gauntlet_v0.6_Neutral_Card_Pool.md` is authoritative for current Neutral costs and exact text.

Remaining blockers before canonical v0.6 data can be authoritative:

- Decide whether **Siege Weaponry** is renamed **Bombardment**.
- Finalize **Blockade / Sanctions** during the Diplomat faction-card pass.
- Finalize **Capital Gains** around Financier infrastructure.
- Finalize Witchcraft's eligible copied-effect wording.
- Define copied or appropriated effects with impossible targets or source-dependent text.
- Finish Intelligence Mission requirements, including an appropriately difficult Mission for **Assassins**.
- Complete faction packages, faction cost-curve audits, and any needed faction capstones.
- Decide final Arcane-trait assignments beyond the currently approved cards.
- Create canonical v0.6 card, Territory, faction, leader, deckbuilding, and recommended-deck data after these decisions are stable.

Before faction-locking any neutral card, continue asking:

1. What shared tool leaves the neutral pool?
2. Do other factions still need that tool for counterplay, pacing, emergency defense, comeback potential, or basic interaction?
3. Does the destination faction already perform the same job through its core mechanic?
4. Does the card duplicate, bypass, or create strange interactions with that mechanic?

### Closed Neutral-pool decisions

- The Neutral pool contains exactly 50 cards.
- Manifest Destiny is the Unique Neutral cost-5 capstone.
- Resourcefulness is the cost-1-card build-around.
- Counterworks provides one-use Overlay prevention and temporary suppression.
- Neutral may place specific Overlays, prevent one placement, and temporarily suppress an Overlay in a defined window.
- Repair, permanent dismantling, movement, upgrading, recurrence, connected infrastructure, and Overlay-network victory progress remain reserved for the future Engineer faction.

---

## Military

- Is maximum Command 2 correct?
- Are General and Commandant comparably strong?
- Does Rout create excessive chain-battle turns?
- Does Fortify bypass the normal counterattack window too often?
- Does Military receive too many capture-timing shortcuts when combined with Neutral cards such as Assimilation and Invasion?
- What should the final eight-card Military package and cost curve be?

---

## Diplomats

The staking, imposition, and Treaty Article framework is now the v0.6 baseline. The active rationale and design direction are in `Gauntlet_v0.6_Diplomat_Design_Notes.md`.

Open v0.6 and production questions:

- Is starting at 0 Influence correct, or does it delay paid Proposals too much?
- Is the five-Article Peace Treaty threshold correct?
- Are nine Proposals manageable as a supplemental reference?
- Are accepted effects attractive enough that refusal is not automatic?
- Are refused effects dangerous enough without making Terms one-sided?
- Do Rebuilding Pact, Ultimatum, and Diplomatic Recognition justify their Influence stakes?
- Should any accepted Proposal explicitly generate Influence?
- Are repeated already-ratified Proposals tactically useful without enabling Influence farming?
- Replace **Good Offices** with a stronger Ambassador ability name.
- Test whether Ambassador and Senator are comparably strong under the staking model.
- Determine the final form and size of the Sanctions card family.
- Decide whether Sanctions remain distinctly Diplomatic or whether Financiers receive a separate economic-pressure implementation.
- Decide whether **Demilitarized Zone** is a Proposal, faction card, Overlay, or later concept.
- What should the final eight-card Diplomat package and cost curve be?

---

## Inquisition

- Is maximum Conviction 4 correct?
- Are Purge costs and targets appropriately priced?
- Does Condemnation make Purification viable without making ordinary battles hopeless?
- Does Heresy pressure Arcane without creating a hard-counter matchup?
- Does Grand Inquisitor create excessive post-battle Purge pressure?
- Is Witch Hunter's Relentless Pursuit timing and cost clear and fair?
- Watch overlap with Attrition, Insurrection, and hard-cancellation effects.
- Design the future Inquisition card **The Black Edict**.
- What should the final eight-card Inquisition package and cost curve be?

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
- Finalize Witchcraft's copied-effect eligibility wording.
- Decide final Arcane-trait assignments.
- What should the final eight-card Arcane package and cost curve be?

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
- Finalize Capital Gains around Capital, Treasury, Deeds, or other Financier infrastructure.
- What should the final eight-card Financier package and cost curve be?

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
- What should the final eight-card Intelligence package and cost curve be?

---

## Cross-faction testing

- Do all six factions remain recognizably engaged with movement, battle, occupation, capture, and breakthrough?
- Do alternate victories create visible parallel pressure rather than solitaire progress?
- Are paired leaders comparably strong within each faction?
- Does the Territory-scaled Asset bank accelerate games without making comebacks implausible?
- Does any matchup routinely remove the losing player's ability to make meaningful decisions?
- Does Resourcefulness create healthy low-cost archetypes without producing excessive card advantage?
- Does Counterworks provide enough Overlay counterplay without weakening future Engineer identity?

Use `Gauntlet_Playtest_Targets_and_Metrics.md` for the quantitative and qualitative data to collect.

---

## Product and release planning

- Should the v0.6 playtest package include printable leader cards, faction reference cards, resource trackers, and suggested decks for every leader?
- Should resource tracks appear directly on leader cards or on separate faction references?
- How should official leader and faction decklists be formatted?
- A future starter product may contain the Neutral pool, Military, and perhaps one additional faction, while a complete product contains the full card pool with sufficient multiples. This remains a product lead, not a v0.6 rules decision.

---

## Resolution protocol

When a question is decided:

1. write the decision into the relevant active source of truth;
2. remove it from this file or replace it with a clearly labeled watchlist item;
3. update the Project Index if the source hierarchy or active checkpoint changes.