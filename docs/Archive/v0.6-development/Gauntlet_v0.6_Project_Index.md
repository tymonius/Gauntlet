# Gauntlet v0.6 Project Index

**Status:** Active source-of-truth map and development checkpoint.

Read this file first when resuming v0.6 work.

---

## Active source hierarchy

### Rules, cards, and Territories

- **`../releases/v0.6/Gauntlet_v0.6_Preliminary_Core_Rules.md`** — self-contained, release-facing shared rulebook draft intended to accompany completed faction guides. It consolidates the v0.5.7 core baseline and approved v0.6 core decisions, but is not yet canonical.

1. **`Gauntlet_v0.6_Working_Rules.md`** — active v0.6 development-rules framework and superset. Later approved decisions recorded in definitive faction guides govern their factions until shared rules are rolled into the preliminary core rulebook.
2. **`Gauntlet_v0.6_Neutral_Card_Pool.md`** — authoritative names, costs, metadata, and exact text for all 50 Neutral cards.
3. **`Gauntlet_v0.6_Territory_Pool.md`** — authoritative names, complexity, watchlists, status, and exact text for all 25 Territories and Arenas.
4. **`../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`** — definitive Military faction source: Military rules, General, Commandant, Orders, Command tracker, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are the release-formatted editions.
5. **`../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`** — definitive Diplomat faction source: rules, Ambassador, Senator, Influence, Terms, Proposals / Treaty Articles, references, tracker, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are release-formatted editions.
6. **`../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`** — definitive Inquisition faction source: Inquisition rules, Grand Inquisitor, Witch Hunter, Conviction, doctrine, Purge, Purification, supplemental components, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are the release-formatted editions.
7. **`../releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md`** — definitive Mystics faction source: rules, Alchemist, Spirit Walker, Rites, Ritual, Invocation, Transmutation, supplemental components, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are release-formatted editions.
8. **`../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md`** — definitive Financier faction source: rules, Banker, Executive, Capital, Treasury, Deeds, Play the Market, Subsidize, Controlling Interest, components, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are the release-formatted editions.
9. **`../releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md`** — definitive Intelligence faction source: Intelligence rules, Ranger, Spymaster, Intel, Missions, Operation Progress, Surveillance, Interference, Special Operation, references, tracker, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are release-formatted editions.
10. **`card-reviews/STATUS.md`** — live playable-card checkpoint and unresolved blockers.
11. **`Gauntlet_v0.6_Card_Metadata.md`** — consolidated allegiance, starter, complexity, uniqueness, and watchlist metadata for 122 current playable designs.
12. **`card-reviews/COST_CURVE_AND_NEUTRAL_POOL_AUDIT.md`** — completed Neutral pool audit.
13. **`Gauntlet_v0.6_Card_Review_Log.md`** — migration provenance for all 54 v0.5.7 source cards.
14. **`card-reviews/CONDITION_AUDIT.md`** — Condition retirement and conversion provenance.
15. **`card-reviews/`** — detailed historical reviews and approval sidecars for unfinished or unconsolidated packages.
16. **`territory-reviews/STATUS.md`** — Territory-review and consolidation checkpoint.
17. **`territory-reviews/GENERAL_RULES.md`** — Territory activation and suppression-rule provenance.
18. **`territory-reviews/`** — individual design and approval provenance for all 25 v0.5.7 Territories and Arenas.
19. **`Gauntlet_v0.6_Open_Questions.md`** — unresolved rules, card, testing, and release decisions.
20. **`../releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — historical pre-v0.6 canonical source.
21. **`v0.5.7_rules_clarifications.md`** — physical-rules clarifications from digital implementation.

No canonical v0.6 data exists yet. The preliminary core rulebook is the current player-facing shared-rules snapshot; the Working Rules remain the active development superset. All six definitive faction guides override earlier development records and split package documents. Remaining work concerns shared copied-effect validation, focused package testing, physical production, and canonical data.

### Design rationale and testing

22. **`Gauntlet_Design_Principles_and_Guardrails.md`** — core design constraints.
23. **`Gauntlet_v0.6_Faction_Card_Design_Guide.md`** — faction-pool construction and approval standard.
24. **`Gauntlet_Playtest_Targets_and_Metrics.md`** — pacing, telemetry, and human-playtest standards.
25. **`Gauntlet_Development_History_and_Superseded_Directions.md`** — historical rationale and retired systems.
26. **`Gauntlet_v0.7_Parking_Lot.md`** — Engineers, multiplayer, and other post-v0.6 concepts.

Completed-package drafts and sidecars remain provenance only where retained. Military development notes, drafts, audits, selection notes, and approval sidecars were removed after consolidation. The split Diplomat pool, design-note, and supplemental-component documents, the split Inquisition pool, design-note, supplemental-component, and working-guide documents, the split Financier pool and design notes, the split Intelligence exact-text pool, and earlier Mystics drafts were likewise removed after consolidation into their definitive guides.

### Digital development

27. **`Gauntlet_Digital_Prototype_Roadmap.md`** — canonical data, deckbuilder, engine, interface, telemetry, and remote-play roadmap.
28. **`../deckbuilder/README.md`** — stable v0.5 deckbuilder.
29. **`../deckbuilder-v0.6/README.md`** — six-faction v0.6 development deckbuilder scope, live-source behavior, print packages, and next implementation steps.
30. **`../src/README.md`** — TypeScript engine and interface status.
31. **`../data/README.md`** — starter-data scope and source warning.

### Setting and production

32. **`Gauntlet_Lore_Development_Notes.md`** — current incremental setting direction.
33. **`Gauntlet_v0.6_Leader_Design_Bible.md`** — leader art and miniature direction.
34. **`../releases/v0.6/faction-guides/`** — definitive release-guide packages for all six factions.
35. **`../faction-sheets/README.md`** — printable faction-sheet sources and instructions for all six factions.
36. **`../images/`** — leader portraits and matching production sketches.
37. **`Game_Design_Glossary.md`** — shared terminology.

### Historical archive

`Archive/` contains completed audits and superseded records that remain useful. Archive material never overrides active rules, definitive faction guides, exact-text pools, canonical data, or current design documents.

---

## Current development checkpoint

### Playable cards

- All **54** v0.5.7 playable source cards have migration records.
- The Neutral pool is complete at **50** cards.
- Military, Diplomats, Inquisition, Mystics, Financiers, and Intelligence are complete at **12** cards each and have definitive release guides.
- Militias and Patriotism are retired.
- The project contains **122 current playable designs**: 50 Neutral and 12 for each of the six factions.

### Neutral checkpoint

- Curve: **11 / 19 / 11 / 8 / 1**.
- Total value: 119; average: 2.38.
- **Manifest Destiny** is the Unique cost-5 capstone.
- **Resourcefulness** is the low-cost build-around.
- **Counterworks** provides narrow shared Overlay counterplay.
- Deep Overlay infrastructure remains reserved for Engineers.

### Military checkpoint

- Curve: **1 / 4 / 3 / 3 / 1**.
- Total value: 35; average: 2.92.
- Roster: **Unbroken Ranks; Battlefield Promotion; Encampment; Rearguard; Brothers in Arms; Field Command; Reserve Force; Give Chase; Hold the Line; Countercharge; War Crimes; Shock and Awe**.
- **Shock and Awe** is the Unique cost-5 statement card.
- **War Crimes** is Military; **Standing Orders** is deferred.
- The supplemental set uses either leader plus one shared sliding Command tracker.
- `../faction-sheets/military.html` is the printable package derived from the definitive guide.
- `../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md` is the definitive source; adjacent PDF and DOCX are release editions.

### Diplomat checkpoint

- Curve: **1 / 3 / 5 / 2 / 1**.
- Total value: 35; average: 2.92.
- Roster: **Clemency; Trade Concessions; Safe Conduct; Neutral Observers; Good Faith; Demilitarized Zone; Diplomatic Latitude; Nonbinding Resolution; Sanctions: Censure; Gunboat Diplomacy; Sanctions: Embargo; Sanctions: Blockade**.
- **Sanctions: Blockade** is the cost-5 statement card.
- **Cordiality** is the Ambassador ability; **Recognition of Claims** is archived.
- The supplemental set uses both leaders, nine Proposal / Treaty Article cards, references, and the sliding Influence tracker.
- `../faction-sheets/diplomat.html` is the printable package derived from the definitive guide.
- `../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md` is the definitive source; adjacent PDF and DOCX are release editions.

### Inquisition checkpoint

- Curve: **1 / 3 / 4 / 2 / 2**.
- Total value: 37; average: 3.08.
- Roster: **Accusation; Confession; Penance; Divine Mercy; No Martyrs; Excommunication; Guilt by Association; Act of Faith; Tyranny; Burning at the Stake; Heresy; Hellfire**.
- **Heresy** has the Arcane trait and permits one bounded additional copied-effect layer.
- **Hellfire** divides Conviction between battle strength and Purification pressure.
- The supplemental set uses either leader, two references, and one shared sliding 0–4 Conviction tracker. No token is used.
- `../faction-sheets/inquisition.html` is the printable package derived from the definitive guide.
- `../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` is the definitive source; adjacent PDF and DOCX are release editions.

### Mystics checkpoint

- Curve: **1 / 3 / 4 / 3 / 1**.
- Total value: 36; average: 3.00.
- Roster: **Dark Omens; Accursed Wager; Fate's Toll; Grave Ward; Spirit Hollow; Soul for Soul; Rend the Veil; Paths of Shadow; Witchcraft; Black Covenant; Circle of Bones; Necromancy**.
- All twelve cards have the **Arcane** trait.
- **Necromancy** is the Unique cost-5 statement card.
- The leaders are **Alchemist** and **Spirit Walker**; their abilities are **Materia Prima** and **Guardians of the Circle**.
- The shared progression is three public Rites; the first completion unlocks Invocation, the second unlocks Transmutation, and the third wins by Ritual.
- The supplemental set uses one selected leader, one Mystics Reference, and three double-sided Rite cards. No token or resource tracker is used.
- The guide defines bound cards, Graveyard entry, exchanges, additional Battle-card sources, repeated Battle effects, eligible copied effects, Overlay ownership, and dormant removal conditions.
- `../faction-sheets/mystics.html` is the three-sheet printable package with duplex incomplete/completed Rite faces.
- `../releases/v0.6/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md` is the definitive source; matching PDF and DOCX are the release editions.
- Mystics is integrated into the v0.6 deckbuilder, including random decks, leader selection, faction components, Overlay treatment, and duplex Rite printing.

### Financier checkpoint

- Curve: **1 / 3 / 4 / 3 / 1**.
- Total value: 36; average: 3.00.
- Roster: **Speculation; Monetary Crisis; Liquidation; Underwriting; Capital Gains; Tariffs; Divestment; Margin Loan; Leveraged Buyout; Foreclosure; Property Dues; Corner the Market**.
- **Corner the Market** is the Unique cost-5 statement card.
- Deed base costs and opposing-owner buyout premiums stop scaling after 6.
- Manifest Destiny Territories receive normal Deeds and expand Controlling Interest.
- The supplemental set uses either leader, one Financier Reference, one public Capital Tracker, and eight identical full-size generic Deed Cards in a shared supply.
- `../faction-sheets/financier.html` is the three-sheet printable package using dedicated Banker and Executive leader-card crops under `../images/leader-cards/`; the third 9-up sheet contains eight full-size Deed Cards and one blank slot.
- `../releases/v0.6/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md` is the definitive Financier source; the adjacent DOCX and PDF are release-formatted editions using the Banker and Executive sketches under `../images/sketches/`.

### Intelligence checkpoint

- Curve: **1 / 3 / 4 / 3 / 1**.
- Total value: 36; average: 3.0.
- Roster: **Exfiltration; Spies; Fog of War; Disinformation; Operational Reassessment; Intercepted Orders; Reconnaissance; Deep Cover; Assassins; Treason; Subversion; Sleeper Network**.
- Mission cards: **Spies; Fog of War; Disinformation; Reconnaissance; Assassins; Subversion**.
- **Treason** is cost 4 and remains dependent on the project-wide copied-effect rules.
- **Sleeper Network** is the Unique cost-5 statement card.
- **Spies, Fog of War, Disinformation, Deep Cover, and Sleeper Network** are the initial package watchlist.
- The supplemental set uses either leader, a Mission Reference, an Operations Reference, and a dual Intel / Operation Progress tracker with two cut-out markers.
- `../faction-sheets/intelligence.html` is the two-sheet printable package using dedicated Ranger and Spymaster leader-card crops under `../images/leader-cards/`.
- `../releases/v0.6/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md` is the definitive Intelligence source; the adjacent DOCX and PDF are release-formatted editions.
- `Gauntlet_v0.6_Intelligence_Card_Pool.md` has been consolidated into the definitive guide and removed.

### Remaining blockers

- Decide whether **Siege Weaponry** becomes **Bombardment**.
- Validate impossible-target and source-dependent copied-effect handling generally, including Treason.
- Playtest and physically review the Mystics, Financier, and Intelligence definitive guides and printable packages.
- Playtest and physically review all completed packages before canonical v0.6 data is created.

### Territories and core rules

- All **25** v0.5.7 Territories and Arenas have been reviewed and consolidated in `Gauntlet_v0.6_Territory_Pool.md`.
- The pool contains **21 standard Territories** and **4 Arenas**, with 18 Basic and 7 Advanced designs.
- Territory activation, suppression, Overlays, dormant lower Overlays, and Ruins are consolidated in the Working Rules.
- Current Territory watchlists include Old Battlefield, Grand Melee, and Monastery.
- The Working Rules and preliminary core rulebook include independent Action and hand-commitment limits, voluntary Asset removal, no Conditions, Asset/Overlay persistence, negation, bounded copied-effect handling, revised Diplomat rules, current Inquisition and Financier rules, and stable Mystics bound-card, repeated-effect, and Overlay clarifications.
- `../releases/v0.6/Gauntlet_v0.6_Preliminary_Core_Rules.md` is the self-contained player-facing shared-rules draft and contains integration summaries for Military, Diplomats, Inquisition, Mystics, and Financiers.

### Factions

- Military — General / Commandant
- Diplomats — Ambassador / Senator
- Inquisition — Grand Inquisitor / Witch Hunter
- Mystics — Alchemist / Spirit Walker
- Financiers — Banker / Executive
- Intelligence — Ranger / Spymaster

Faction packages target **12 unique cards**, use **1 / 3 / 4 / 3 / 1** as a planning baseline rather than a quota, and include at least one optional cost-5 statement card.

### Digital work

- The TypeScript engine, CLI, and GUI remain development scaffolds.
- The v0.6 development deckbuilder is live under `../deckbuilder-v0.6/` and reads the active Neutral, all six definitive faction-guide, and Territory Markdown sources at runtime.
- It supports all six factions and twelve leaders, Neutral-plus-faction legality, playable-card count/value validation, all 25 Territories, local saves, JSON/text export, random valid test-deck generation, and browser print output.
- All six factions include their required leaders and supplemental components in Current deck and Print / PDF output, including duplex Diplomat Proposal/Treaty cards and Mystics Rite cards.
- Do not silently migrate v0.5 saved decks into v0.6.

### Lore and production

- Lore remains incremental and non-canonical beyond the active notes.
- The Leader Design Bible is the visual source of truth.
- `images/` contains portraits and production sketches for all twelve leaders.
- Browser-printable packages for all six factions are under `faction-sheets/`.
- Definitive guide packages for all six factions are under `releases/v0.6/faction-guides/` in Markdown, DOCX, and PDF formats.

---

## Repository protocol

1. Treat chat as workspace; write durable decisions into the repository.
2. Use released canonical data for its matching version.
3. Use definitive faction guides and completed exact-text pool documents before migration provenance.
4. Use the preliminary core rulebook as the player-facing shared-rules snapshot and the Working Rules as the active development superset until canonical v0.6 data exists.
5. Assess Neutral-pool impact before faction-locking a shared card.
6. Record approved decisions in the relevant active source.
7. Update rollups at material checkpoints.
8. Keep rules, rationale, lore, production, and implementation in their designated documents.
9. Archive or remove superseded working records once consolidated.
10. Do not claim a decision is logged until the repository update succeeds.
11. Do not create canonical v0.6 data by silently resolving open questions.

---

## Immediate next step

Playtest and physically review the complete six-faction deckbuilder and printable packages, resolve the remaining copied-effect and naming blockers, and then prepare canonical v0.6 data and release integration.
