# Gauntlet v0.6 Open Questions

**Status:** Active tracker for unresolved v0.6 design and production decisions.  
**Purpose:** Keep only questions that can still change rules, cards, packages, testing, or release materials.

Closed decisions and historical rationale belong in their dedicated documents.

---

## Canonical-data blockers

Completed:

- all 54 v0.5.7 playable-source migration reviews;
- 50-card Neutral pool;
- all 25 Territory and Arena reviews;
- Condition retirement;
- twelve-card Military, Diplomat, Inquisition, Financier, and Intelligence packages;
- Intelligence Mission requirements and exact card text;
- Military, Diplomat, and Inquisition supplemental-component specifications and printable sheets;
- definitive Military, Diplomat, and Inquisition faction guides in Markdown, DOCX, and PDF formats.

Remaining blockers:

- Decide whether **Siege Weaponry** becomes **Bombardment**.
- Finalize Witchcraft copied-effect eligibility.
- Define impossible-target and source-dependent copied effects generally, including Treason.
- Complete the Mystics twelve-card package.
- Decide remaining Arcane-trait assignments.
- Synchronize approved Financier rules clarifications into the Working Rules.
- Playtest the Financier and Intelligence card pools and complete their definitive faction guides, supplemental components, printable sheets, and physical reviews.
- Playtest and physically review completed packages.
- Create canonical v0.6 card, Territory, faction, leader, deckbuilding, and recommended-deck data after these decisions stabilize.

---

## Closed faction-package baseline

- Each faction targets **12 unique playable cards**.
- Existing faction-designated cards receive no protected slots.
- Faction pools deliberately lean more expensive than Neutral.
- The default planning curve is **1 / 3 / 4 / 3 / 1**, but strategic completeness may justify deviations.
- Each faction needs at least one optional cost-5 statement card.

---

## Military

Definitive source: `../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`. The adjacent PDF and DOCX are the release-formatted editions. Earlier split Military pool, design, supplemental, selection, and approval documents have been consolidated and removed.

Open questions:

- Is maximum Command 2 correct?
- Are General and Commandant comparably strong?
- Does Rout create excessive chain-battle turns?
- Does Fortify bypass too many counterattack windows?
- Is Battlefield Promotion correctly priced at 2?
- Do Brothers in Arms and Reserve Force provide too much post-reveal reliability?
- Is Give Chase's cumulative battle-draw penalty sufficient and clear?
- Does Hold the Line's failure penalty balance its defensive strength?
- Does Rearguard resolve cleanly against every pursuit effect?
- Do Countercharge battles create turn-structure problems?
- Does War Crimes create excessive denial or retreat pressure?
- Are Shock and Awe's two victory options comparably attractive?
- Do all texts fit and resolve cleanly in physical play?

---

## Diplomats

Definitive source: `../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`. The adjacent PDF and DOCX are release-formatted editions. Earlier split Diplomat pool, design, and supplemental documents have been consolidated and removed.

Open questions:

- Is beginning with 1 Influence correct?
- Is the five-Article Peace Treaty threshold correct?
- Are nine double-sided Proposal / Treaty Article cards manageable and legible?
- Are accepted effects attractive enough that refusal is not automatic?
- Do Trade Concessions and Nonbinding Resolution provide enough replacement draw for out-of-turn Diplomat interactions without creating excessive card advantage?
- Does accepted Influence growth snowball too quickly?
- Are Proposal stakes correctly distributed?
- Does uncapped Leverage create memorable commitments rather than deterministic battles?
- Are repeated ratified Proposals tactically useful without enabling farming?
- Are Ambassador and Senator comparably strong?
- Is Political Capital appropriately costly with a three-card hand limit?
- Do Safe Conduct, Nonbinding Resolution, and Sanctions create problematic combinations?
- Do the Leader and reference cards remain legible?

---

## Inquisition

Definitive source: `../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`. The adjacent PDF and DOCX are release-formatted editions. Earlier split Inquisition pool, design, supplemental, and working-guide documents have been consolidated and removed.

Closed production decisions:

- The package contains twelve cards with a **1 / 3 / 4 / 2 / 2** curve.
- **Heresy** and **Hellfire** are distinct cost-5 statement cards.
- The supplemental set uses two leaders, two single-sided references, and one shared sliding 0–4 Conviction tracker.
- The Leader Card is the Conviction pointer; no token or marker is used.
- Player-facing text has received a dedicated concision pass without mechanical changes.

Open questions:

- Is maximum Conviction 4 correct?
- Are Purge costs and targets correctly priced?
- Does Condemnation make Purification viable without making battles hopeless?
- Does Blasphemy pressure Mystic decks without creating a hard counter?
- Does Final Judgment create excessive post-battle Purge pressure?
- Is Relentless Pursuit's timing and cost clear and fair?
- Are Grand Inquisitor and Witch Hunter comparably strong?
- Does a 60-card cost-1-heavy deck provide healthy counterplay to Purification?
- Are **Divine Mercy, Tyranny, and Burning at the Stake** too broadly efficient?
- Does Heresy resolve cleanly with every copied-effect card?
- Does Hellfire create satisfying Conviction allocation rather than obvious spending?
- Are the four sliding Conviction positions stable and unambiguous?
- Does all player-facing text remain clear at standard card size?

---

## Mystics

- Finalize names for Rites, Invocation, Transmutation, and both leader abilities.
- Are the three Rites comparably difficult?
- Is one incomplete Rite at a time correct?
- Do Rite of Echoes, Rite of Blood, and Rite of Crossing resolve cleanly?
- Are Invocation and Transmutation strong without creating excessive swings?
- Are Alchemist and Spirit Walker comparably strong?
- Finalize Witchcraft copied-effect eligibility.
- Decide final Arcane-trait assignments.
- Select and audit the twelve-card package.

---

## Financiers

Active exact-text source: `Gauntlet_v0.6_Financier_Card_Pool.md`. `Gauntlet_v0.6_Financier_Design_Notes.md` records strategic rationale and audit findings.

Closed package decisions:

- The package contains twelve cards with a **1 / 3 / 4 / 3 / 1** curve, total value 36, and average value 3.0.
- The roster is **Speculation; Monetary Crisis; Liquidation; Underwriting; Capital Gains; Tariffs; Divestment; Margin Loan; Leveraged Buyout; Foreclosure; Property Dues; Corner the Market**.
- **Corner the Market** is the Unique cost-5 statement card.
- **Capital Gains** has been redesigned around Treasury investment and successful-battle preservation.
- The working exact-text source caps both Deed-cost components at 6 and defines **take an extra action** as an additional Action opportunity.

Open questions:

- Is Capital accumulation fast enough without becoming runaway?
- Do the Deed-cost and buyout-premium caps at 6 remain intuitive and sufficient?
- Does Treasury create planning rather than disconnected setup?
- Is Play the Market appropriately swingy?
- Is Subsidize understandable and balanced?
- Should Line of Credit collateral go to discard or Graveyard?
- Does Hostile Takeover snowball too quickly?
- Are Banker and Executive comparably strong?
- Do Tariffs, Divestment, and Margin Loan collectively erase intended Action pressure?
- Does repeated Monetary Crisis prevent opponents from assembling meaningful hands?
- Do multiple Property Dues Assets create excessive stacking from one advance?
- Is Divestment's sell-and-rebuy line too reliable?
- Do extra-Battle-card effects make Leveraged Buyout too efficient?
- Is Foreclosure sufficiently constrained by adjacency and prior Deed ownership?
- Does Corner the Market end games after visible preparation rather than abruptly from routine accumulation?
- Is the combined physical tracking burden of Speculation, Capital Gains, and Margin Loan acceptable?

---

## Intelligence

Active exact-text source: `Gauntlet_v0.6_Intelligence_Card_Pool.md`. It governs the approved roster, costs, Missions, exact player-facing card text, strategic audit, and initial watchlist until a definitive Intelligence faction guide supersedes it.

Closed package decisions:

- The package contains twelve cards with a **1 / 3 / 4 / 3 / 1** curve, total value 36, and average value 3.0.
- The roster is **Exfiltration; Spies; Fog of War; Disinformation; Operational Reassessment; Intercepted Orders; Reconnaissance; Deep Cover; Assassins; Treason; Subversion; Sleeper Network**.
- Six cards have Mission requirements: **Spies, Fog of War, Disinformation, Reconnaissance, Assassins, and Subversion**.
- **Treason** is cost 4.
- **Sleeper Network** is the Unique cost-5 statement card.
- **Spies, Fog of War, Disinformation, Deep Cover, and Sleeper Network** are the initial package watchlist.

Open questions:

- Are Ranger and Spymaster comparably strong with the shared pool?
- Are Mission completion rates appropriately separated by card value and difficulty?
- Does the one-Active-Mission limit create planning rather than dead turns?
- Are Special Operation readiness, failure, and final Intel cost correctly calibrated?
- Does Intel need a maximum?
- Do Surveillance and Interference remain disruptive rather than destructive?
- Does Spies become an automatic inclusion or make Surveillance and Scouting Report redundant?
- Is Fog of War underpriced as a persistent cost-2 Overlay with commitment-order control?
- Does Disinformation create sustained bluffing rather than a routine refusal to commit from hand?
- Is Deep Cover sufficiently useful outside matchups with early-reveal effects?
- Does Sleeper Network produce an ambitious but recoverable operation, and is its forced-removal trigger fair?
- Does Treason resolve cleanly under the final copied-effect rules?
- Do the leader, resource, Mission, and Special Operation references fit and remain fast to use at standard card size?

---

## Cross-faction testing

- Do all factions remain engaged with movement, battle, occupation, capture, and running the Gauntlet?
- Do alternate victories create visible interactive pressure?
- Are paired leaders comparably strong?
- Does the Territory-scaled Asset bank accelerate games without killing comebacks?
- Does any matchup routinely remove meaningful decisions?
- Do completed packages preserve counterattack windows and comeback potential?

Use `Gauntlet_Playtest_Targets_and_Metrics.md` for required data collection.

---

## Product and release planning

- Should every leader receive an official suggested deck?
- How should official leader and faction decklists be formatted?
- Which factions belong in a future starter product?

---

## Resolution protocol

When a question is decided:

1. write the decision into the relevant source of truth;
2. remove it here or replace it with a watchlist item;
3. update the Project Index when the source hierarchy or checkpoint changes.
