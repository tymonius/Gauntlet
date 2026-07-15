# Gauntlet v0.6 Open Questions

**Status:** Active tracker for unresolved v0.6 design and production decisions.  
**Purpose:** Keep only questions that can still change the v0.6 rules, faction cards, faction packages, testing plan, or release materials.

Closed audit items, historical rationale, and post-v0.6 concepts belong in their dedicated documents rather than here.

---

## Card migration and canonical data

The 54-card playable-source review, 12-card Neutral expansion, 50-card Neutral pool, 25-card Territory review, current non-faction Condition cleanup, and twelve-card Military, Diplomat, and Inquisition packages are complete. Conditions are retired as a v0.6 game concept.

The final Neutral curve is 11 / 19 / 11 / 8 / 1. `Gauntlet_v0.6_Neutral_Card_Pool.md` is authoritative for current Neutral costs and exact text.

The current Military curve is 1 / 4 / 3 / 3 / 1. `Gauntlet_v0.6_Military_Card_Pool.md` is authoritative for current Military costs and exact text.

The current Diplomat curve is 1 / 3 / 5 / 2 / 1. `Gauntlet_v0.6_Diplomat_Card_Pool.md` is authoritative for current Diplomat card costs and exact text. `Gauntlet_v0.6_Diplomat_Supplemental_Cards.md` is authoritative for the Leader Cards, Proposal / Treaty Article cards, Terms reference, and Influence components.

The current Inquisition curve is 1 / 3 / 4 / 2 / 2. `Gauntlet_v0.6_Inquisition_Card_Pool.md` is authoritative for current Inquisition card costs and exact text. `Gauntlet_v0.6_Inquisition_Supplemental_Cards.md` is authoritative for the Leader Cards, doctrine and Purge references, and Conviction tracker.

Remaining blockers before canonical v0.6 data can be authoritative:

- Decide whether **Siege Weaponry** is renamed **Bombardment**.
- Finalize **Capital Gains** around Financier infrastructure.
- Finalize Witchcraft's eligible copied-effect wording.
- Define copied or appropriated effects with impossible targets or source-dependent text.
- Finish Intelligence Mission requirements, including an appropriately difficult Mission for **Assassins**.
- Complete the Arcane, Financier, and Intelligence twelve-card packages and audit each final curve and cost-5 statement card.
- Decide final Arcane-trait assignments beyond the currently approved cards.
- Playtest the completed Military, Diplomat, and Inquisition packages and verify their physical-card legibility.
- Create canonical v0.6 card, Territory, faction, leader, deckbuilding, and recommended-deck data after these decisions are stable.

Before faction-locking any Neutral card, continue asking:

1. What shared tool leaves the Neutral pool?
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

### Closed faction-package baseline decisions

- Each v0.6 faction targets **12 unique playable cards**.
- Existing faction-designated cards receive no protected or grandfathered place in the completed package.
- Faction pools deliberately lean more expensive and strategically consequential than the Neutral pool.
- The default planning curve is **1 / 3 / 4 / 3 / 1** at costs 1–5, for 36 total unique-card value and a 3.0 average cost.
- The curve is a planning baseline rather than a rigid quota; strategic completeness, card quality, and fun may justify faction-specific deviations.
- Every faction must have access to at least one optional, game-defining cost-5 statement card.
- Additional cost-5 and other premium cards are permitted when they support genuinely distinct ambitions rather than one obvious mandatory package.

### Closed Military-package decisions

- The Military release pool contains exactly 12 cards.
- The curve is **1 / 4 / 3 / 3 / 1**, with 35 total unique-card value and a 2.92 average cost.
- Battlefield Promotion is cost 2.
- Shock and Awe is the Unique cost-5 statement card.
- War Crimes belongs to Military rather than Inquisition.
- Militias and Patriotism are retired from the v0.6 playable pool.
- Standing Orders is deferred; Brothers in Arms occupies the final release slot.

### Closed Diplomat-package and framework decisions

- The Diplomat release pool contains exactly 12 cards.
- The curve is **1 / 3 / 5 / 2 / 1**, with 35 total unique-card value and a 2.92 average cost.
- The three formal Sanctions are Censure, Embargo, and Blockade.
- Recognition of Claims is archived outside the release package.
- Diplomats begin with 1 Influence.
- Proposals use listed Influence Stakes rather than ordinary costs.
- Proposal stakes are distributed 3 / 4 / 2 across stakes 0 / 1 / 2.
- Accepted newly ratified Proposals return the stake and generate additional Influence equal to that stake.
- Refused and imposed newly ratified Proposals normally return the stake and generate 1 Influence unless the Proposal says otherwise.
- Leverage may spend any amount of available Influence before dice in a battle following refused Terms for +1 battle total per Influence.
- Cordiality is the final Ambassador ability name.
- Political Capital may trade up to one hand card per staked Influence recovered.
- The supplemental set uses two Leader Cards, nine double-sided Proposal / Treaty Article cards, one double-sided Diplomat Reference, and Influence tokens.

### Closed Inquisition-package and component decisions

- The Inquisition release pool contains exactly 12 cards.
- The curve is **1 / 3 / 4 / 2 / 2**, with 37 total unique-card value and a 3.08 average cost.
- The selected roster is Accusation, Confession, Penance, Divine Mercy, No Martyrs, Excommunication, Guilt by Association, Act of Faith, Tyranny, Burning at the Stake, Heresy, and Hellfire.
- The Arcane-trait trigger is named **Blasphemy**.
- The 1-Conviction Purge retains its top-discard option and may instead condemn up to two discard cards with combined value 2 or less.
- Heresy is an Inquisition card with the Arcane trait and permits one additional copied-effect layer before the chain must stop.
- The supplemental set uses Grand Inquisitor or Witch Hunter, one Inquisition Doctrine reference, one Purge Reference, one 0–4 Conviction tracker, and one marker.
- The seventeen card faces fit on two ordinary 9-up print sheets with one unused slot and no duplex alignment.

---

## Military

The selected package and exact text are consolidated in `Gauntlet_v0.6_Military_Card_Pool.md`. The design rationale and package audit are in `Gauntlet_v0.6_Military_Design_Notes.md`.

Open balance, timing, and production questions:

- Is maximum Command 2 correct with Unbroken Ranks, Encampment, Field Command, and Shock and Awe?
- Are General and Commandant comparably strong with the same twelve-card pool?
- Does Rout create excessive chain-battle turns when combined with Give Chase, Countercharge, Invasion, and other movement effects?
- Does Fortify bypass the normal counterattack window too often?
- Does Military receive too many capture-timing shortcuts when combined with Neutral cards such as Assimilation and Invasion?
- Is Battlefield Promotion appropriately priced at 2?
- Do Brothers in Arms and Reserve Force provide too much post-reveal commitment reliability?
- Is Give Chase's cumulative battle-draw penalty clear and sufficient?
- Does Hold the Line's immediate-capture failure penalty adequately balance its defensive reinforcement?
- Do Rearguard's reaction and returned-card handling resolve cleanly against every immediate pursuit effect?
- Do unrestricted out-of-turn battles from Countercharge create turn-structure problems?
- Does War Crimes create excessive long-game card denial or retreat pressure?
- Are Shock and Awe's Breakthrough and Consolidate choices comparably attractive across board states and both leaders?
- Do the current texts fit physical cards legibly without losing essential timing information?

---

## Diplomats

The staking, accepted-ratification growth, imposition, Leverage, and Treaty Article framework is the v0.6 baseline. The active rationale is in `Gauntlet_v0.6_Diplomat_Design_Notes.md`; playable-card exact text is in `Gauntlet_v0.6_Diplomat_Card_Pool.md`; and player-facing supplemental components are in `Gauntlet_v0.6_Diplomat_Supplemental_Cards.md`.

Open balance, timing, and production questions:

- Is beginning with 1 Influence correct?
- Is the five-Article Peace Treaty threshold correct?
- Are nine double-sided Proposal / Treaty Article cards manageable and legible?
- Are accepted effects attractive enough that refusal is not automatic even though paid acceptance also grows Influence?
- Does accepted Influence equal to the listed stake create healthy progression or excessive snowballing?
- Are Open Channels, Mutual Disarmament, Prisoner Exchange, and Rebuilding Pact correctly placed at stake 1?
- Are Ultimatum and Diplomatic Recognition correctly placed at stake 2?
- Does uncapped Leverage produce memorable commitments rather than deterministic battles?
- Does Leverage make Gunboat Diplomacy or other battle bonuses automatic inclusions?
- What are the average, upper-quartile, and maximum Influence totals held and spent in one battle?
- Are repeated already-ratified Proposals tactically useful without enabling card-specific Influence farming?
- Are Ambassador and Senator comparably strong under the same economy and card pool?
- Is Political Capital's one-card-per-Influence exchange appropriately costly with the three-card hand limit?
- Does Safe Conduct return high stakes too safely after significant Leverage spending?
- Does Nonbinding Resolution create meaningful ratification-versus-Influence decisions at every Proposal tier?
- Do repeated Sanctions and Blockade-based Influence gains push Leverage beyond its intended practical range?
- Do the full Leader Card and reference texts fit standard cards legibly?

---

## Inquisition

The completed card package and exact text are consolidated in `Gauntlet_v0.6_Inquisition_Card_Pool.md`. The active rationale is in `Gauntlet_v0.6_Inquisition_Design_Notes.md`; player-facing supplemental components are in `Gauntlet_v0.6_Inquisition_Supplemental_Cards.md`; and the current printable package is under `faction-sheets/inquisition.html`.

Open balance, timing, and production questions:

- Is maximum Conviction 4 correct across both leaders and all package archetypes?
- Are the four Purge costs and targets appropriately priced?
- Is the revised 1-Conviction Purge enough to answer oversized low-cost decks without making compact decks too vulnerable?
- Does Condemnation make Purification credible without making ordinary battles hopeless?
- Does Blasphemy pressure Arcane-trait-heavy decks without creating a hard-counter matchup?
- Does Grand Inquisitor create excessive post-battle Purge pressure?
- Is Witch Hunter's Relentless Pursuit timing and 2-Conviction cost clear and fair?
- Does Divine Mercy become an automatic inclusion because of its cost-2 Battle bonus and Conviction conversion?
- Is Tyranny too universally useful despite its cost and Asset-mode Conviction requirement?
- Is Burning at the Stake too punishing against compact premium decks?
- Does Heresy produce memorable appropriation without creating impossible-target, source-dependent, or copied-effect disputes?
- Does Hellfire create meaningful division between battle strength and Purification pressure?
- Does No Martyrs remain useful across the completed faction ecosystem without invalidating profitable-loss strategies?
- Are Grand Inquisitor and Witch Hunter comparably strong with the same twelve-card pool?
- Is the two-reference-card structure faster and clearer than placing the complete faction rules on each Leader Card?
- Is the 0–4 Conviction tracker stable and legible with a single marker?
- Do all seventeen Inquisition card faces remain legible at standard card size?
- Watch overlap with Attrition, Insurrection, hard-cancellation effects, and future defeat-trigger cards.

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
- Which twelve Arcane cards earn places in the final package, and does its completed curve need to deviate from the planning baseline?

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
- Which twelve Financier cards earn places in the final package, and does its completed curve need to deviate from the planning baseline?

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
- Which twelve Intelligence cards earn places in the final package, and does its completed curve need to deviate from the planning baseline?

---

## Cross-faction testing

- Do all six factions remain recognizably engaged with movement, battle, occupation, capture, and breakthrough?
- Do alternate victories create visible parallel pressure rather than solitaire progress?
- Are paired leaders comparably strong within each faction?
- Does the Territory-scaled Asset bank accelerate games without making comebacks implausible?
- Does any matchup routinely remove the losing player's ability to make meaningful decisions?
- Does Resourcefulness create healthy low-cost archetypes without producing excessive card advantage?
- Does Counterworks provide enough Overlay counterplay without weakening future Engineer identity?
- Does the completed Military package preserve enough counterattack windows and comeback potential against every other faction?
- Does the Diplomat's uncapped Leverage preserve a meaningful direct-combat weakness outside refused Terms?
- Does the Inquisition's permanent card denial leave opponents meaningful tactical and deckbuilding counterplay?
- Is conventional breakthrough reliably the Inquisition's better response to oversized low-value decks?

Use `Gauntlet_Playtest_Targets_and_Metrics.md` for the quantitative and qualitative data to collect.

---

## Product and release planning

- How should official leader and faction decklists be formatted?
- What marker formats should Arcane, Financiers, and Intelligence use after their systems and supplemental components are finalized?
- A future starter product may contain the Neutral pool, Military, and perhaps one additional faction, while a complete product contains the full card pool with sufficient multiples. This remains a product lead, not a v0.6 rules decision.

---

## Resolution protocol

When a question is decided:

1. write the decision into the relevant active source of truth;
2. remove it from this file or replace it with a clearly labeled watchlist item;
3. update the Project Index if the source hierarchy or active checkpoint changes.
