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
<<<<<<< ours
- twelve-card Military, Diplomat, Inquisition, Financier, and Intelligence packages;
- Intelligence Mission requirements and exact card text;
- Military, Diplomat, Inquisition, and Intelligence supplemental-component specifications and printable sheets;
- definitive Military, Diplomat, Inquisition, Financier, and Intelligence faction guides in Markdown, DOCX, and PDF formats.
=======
- twelve-card Military, Diplomat, Inquisition, and Mystics packages;
- Military, Diplomat, Inquisition, and Mystics supplemental-component specifications;
- definitive Military, Diplomat, Inquisition, and Mystics faction guides in Markdown, DOCX, and PDF formats;
- selected twelve-card Financier pool and package audit.
>>>>>>> theirs

Remaining blockers:

- Decide whether **Siege Weaponry** becomes **Bombardment**.
<<<<<<< ours
- Finalize Witchcraft copied-effect eligibility.
- Define impossible-target and source-dependent copied effects generally, including Treason.
- Complete the Mystics twelve-card package.
- Decide remaining Arcane-trait assignments.
- Playtest the Financier and Intelligence definitive guides and complete the Financier printable package and both factions' remaining physical-review work.
=======
- Roll stable Mystics copied-effect, bound-card, additional-Battle-card, and Overlay clarifications into the preliminary core rulebook.
- Consolidate the selected Financier pool into a definitive guide and production package.
- Complete Intelligence Mission requirements, including **Assassins**, and select the full Intelligence package.
>>>>>>> theirs
- Playtest and physically review completed packages.
- Integrate Mystics and later completed factions into the development deckbuilder and printable faction-sheet tooling.
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

Definitive source: `../releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md`. The adjacent PDF and DOCX are release-formatted editions. Earlier Mystics rules and card drafts are superseded where they conflict with the definitive guide.

Closed package and production decisions:

- The package contains twelve cards with a **1 / 3 / 4 / 3 / 1** curve, total value 36, and average value 3.00.
- The roster is **Dark Omens; Accursed Wager; Fate's Toll; Grave Ward; Spirit Hollow; Soul for Soul; Rend the Veil; Paths of Shadow; Witchcraft; Black Covenant; Circle of Bones; Necromancy**.
- All twelve cards have the **Arcane** trait.
- **Necromancy** is the Unique cost-5 statement card.
- The leaders are **Alchemist** and **Spirit Walker**.
- Their abilities are **Catalysis** and **The Circle Holds**.
- The three Rites are **Rite of Echoes, Rite of Blood, and Rite of Crossing**.
- The supplemental set uses one selected Leader Card, one Mystics Reference, and three double-sided Rite cards.
- Completed Rites are flipped to their completed faces; no token or resource tracker is used.
- Witchcraft's eligible-effect boundary and the package's bounded copied-effect rules are defined in the definitive guide.

Open questions:

- Are the three Rites comparably difficult and interactive?
- Is one begun but incomplete Rite at a time correct?
- Do Rite of Echoes, Rite of Blood, and Rite of Crossing resolve cleanly in physical play?
- Are Invocation and Transmutation strong without creating excessive swings?
- Are Alchemist and Spirit Walker comparably strong across conventional and Ritual-focused decks?
- Does Necromancy recur too easily through Rend the Veil, Soul for Soul, Grave Ward, Spirit Hollow, or Invocation?
- Does Alchemist plus Grave Ward preserve sacrifice value too efficiently?
- Are Fate's Toll and Circle of Bones correctly priced under Catalysis?
- Does Black Covenant's additional-Action and hand-commitment sequencing remain clear?
- Does Rend the Veil at cost 3 outperform Neutral Arcane Knowledge at cost 4?
- Does the all-twelve Arcane assignment make Blasphemy an oppressive counter rather than healthy matchup pressure?
- Are Spirit Hollow and Circle of Bones compelling contested locations without excessive tracking?
- Does all player-facing text remain legible at standard card size?

---

## Financiers

<<<<<<< ours
Definitive source: `../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`. The adjacent PDF and DOCX are the release-formatted editions. The earlier split Financier pool and design-note documents have been consolidated and removed.

Closed production decisions:

- The package contains twelve cards with a **1 / 3 / 4 / 3 / 1** curve, total value 36, and average value 3.00.
- **Corner the Market** is the Unique cost-5 statement card.
- Added Territories receive normal Deeds; Deed base costs and buyout premiums stop scaling after 6.
- **Take an extra action** grants a full additional Action opportunity.
- The package uses two Leader Cards, one Financier Reference, and a public Capital / Deed ledger or equivalent record rather than currency tokens.
=======
Authoritative working exact-text source: `Gauntlet_v0.6_Financier_Card_Pool.md`. Design rationale: `Gauntlet_v0.6_Financier_Design_Notes.md`.

Closed package decision:

- The selected package contains twelve cards with a **1 / 3 / 4 / 3 / 1** curve, total value 36, and average value 3.00.
>>>>>>> theirs

Open questions:

- Is Capital accumulation fast enough without becoming runaway?
- Is the Capital-limit formula easy to track physically?
- Does Treasury create planning rather than disconnected setup?
- Are Deed costs and buyout premiums intuitive, including mirrors and Manifest Destiny?
- Is Play the Market appropriately swingy?
- Is Subsidize understandable and balanced?
<<<<<<< ours
- Should Line of Credit collateral remain in discard rather than the Graveyard?
- Does Hostile Takeover snowball too quickly?
- Are Banker and Executive comparably strong?
- Do Tariffs, Divestment, and Margin Loan collectively erase intended Action pressure?
- Do repeated Monetary Crisis and stacked Property Dues create excessive denial?
- Are Divestment loops, Leveraged Buyout collateral, Foreclosure, and Capital Gains fair?
- Is Underwriting's standalone floor sufficient?
- Is the self-tracking burden of Speculation, Capital Gains, and Margin Loan acceptable?
- Does Corner the Market create a visible, dramatic finish?
=======
- Are Banker and Executive comparably strong?
- Do Tariffs, Divestment, and Margin Loan collectively erase intended Action pressure?
- Does repeated Monetary Crisis prevent meaningful hand planning?
- Is Underwriting too narrow compared with the rest of the package?
- Does Corner the Market end games after visible preparation rather than routine accumulation?
- Consolidate the selected rules, leaders, components, strategy, terminology, and card pool into one definitive release guide.

---
>>>>>>> theirs

## Intelligence

Definitive source: `../releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md`. The adjacent PDF and DOCX are release-formatted editions. The earlier split exact-text pool has been consolidated and removed.

Closed production decisions:

- The package contains twelve cards with a **1 / 3 / 4 / 3 / 1** curve, total value 36, and average value 3.0.
- Six cards have Mission requirements: **Spies, Fog of War, Disinformation, Reconnaissance, Assassins, and Subversion**.
- **Treason** is cost 4; **Sleeper Network** is the Unique cost-5 statement card.
- The supplemental set uses Ranger, Spymaster, a Mission Reference, an Operations Reference, and one dual Intel / Operation Progress tracker with two cut-out markers.
- The printable package uses two Letter-size 9-up sheets and dedicated leader-card crops.
- The definitive guide is packaged in matching Markdown, DOCX, and 13-page Letter PDF editions.

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
- Do the two references and dual tracker remain fast and legible in physical play?
- Does all player-facing text remain clear at standard card size, especially Sleeper Network?

---

## Cross-faction testing

- Do all factions remain engaged with movement, battle, occupation, capture, and running the Gauntlet?
- Do alternate victories create visible interactive pressure?
- Are paired leaders comparably strong?
- Does the Territory-scaled Asset bank accelerate games without killing comebacks?
- Does any matchup routinely remove meaningful decisions?
- Do completed packages preserve counterattack windows and comeback potential?
- Is Inquisition-versus-Mystics a healthy counter relationship rather than a hard lock?

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
