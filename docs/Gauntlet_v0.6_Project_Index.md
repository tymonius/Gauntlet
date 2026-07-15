# Gauntlet v0.6 Project Index

**Status:** Active source-of-truth map and development checkpoint.

Read this file first when resuming v0.6 work.

---

## Active source hierarchy

### Rules, cards, and Territories

1. **`Gauntlet_v0.6_Working_Rules.md`** — current v0.6 rules framework, faction mechanics, leaders, resources, alternate victories, Assets, Overlays, Territories, and product scope.
2. **`Gauntlet_v0.6_Neutral_Card_Pool.md`** — authoritative names, costs, metadata, and exact text for all 50 Neutral cards.
3. **`Gauntlet_v0.6_Territory_Pool.md`** — authoritative names, complexity, watchlists, status, and exact text for all 25 Territories and Arenas.
4. **`../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md`** — definitive Military faction source: Military rules, General, Commandant, Orders, Command tracker, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are the release-formatted editions.
5. **`../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`** — definitive Diplomat faction source: rules, Ambassador, Senator, Influence, Terms, Proposals / Treaty Articles, references, tracker, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are release-formatted editions.
6. **`../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`** — definitive Inquisition faction source: Inquisition rules, Grand Inquisitor, Witch Hunter, Conviction, doctrine, Purge, Purification, supplemental components, strategy, terminology, and the canonical twelve-card pool. The adjacent PDF and DOCX are release-formatted editions.
7. **`card-reviews/STATUS.md`** — live playable-card checkpoint and unresolved blockers.
8. **`Gauntlet_v0.6_Card_Metadata.md`** — consolidated allegiance, starter, complexity, uniqueness, and watchlist metadata for 95 current playable designs.
9. **`card-reviews/COST_CURVE_AND_NEUTRAL_POOL_AUDIT.md`** — completed Neutral pool audit.
10. **`Gauntlet_v0.6_Card_Review_Log.md`** — migration provenance for all 54 v0.5.7 source cards.
11. **`card-reviews/CONDITION_AUDIT.md`** — Condition retirement and conversion provenance.
12. **`card-reviews/`** — detailed historical reviews and approval sidecars for unfinished or unconsolidated packages.
13. **`territory-reviews/STATUS.md`** — Territory-review and consolidation checkpoint.
14. **`territory-reviews/GENERAL_RULES.md`** — Territory activation and suppression-rule provenance.
15. **`territory-reviews/`** — individual design and approval provenance for all 25 v0.5.7 Territories and Arenas.
16. **`Gauntlet_v0.6_Open_Questions.md`** — unresolved rules, card, testing, and release decisions.
17. **`../releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — historical pre-v0.6 canonical source.
18. **`v0.5.7_rules_clarifications.md`** — physical-rules clarifications from digital implementation.

No canonical v0.6 data exists yet. Active v0.6 documents govern until the remaining three faction packages, exact-text blockers, Intelligence Missions, copied-effect rules, and package testing are resolved. For Military, Diplomats, and Inquisition, the definitive faction guides above override earlier development records and split package documents, which have been removed from the active repository.

### Design rationale and testing

19. **`Gauntlet_Design_Principles_and_Guardrails.md`** — core design constraints.
20. **`Gauntlet_v0.6_Faction_Card_Design_Guide.md`** — faction-pool construction and approval standard.
21. **`Gauntlet_Playtest_Targets_and_Metrics.md`** — pacing, telemetry, and human-playtest standards.
22. **`Gauntlet_Development_History_and_Superseded_Directions.md`** — historical rationale and retired systems.
23. **`Gauntlet_v0.7_Parking_Lot.md`** — Engineers, multiplayer, and other post-v0.6 concepts.

Completed-package drafts and sidecars remain provenance only where retained. Military development notes, drafts, audits, selection notes, and approval sidecars were removed after consolidation. The split Diplomat pool, design-note, and supplemental-component documents and the split Inquisition pool, design-note, supplemental-component, and working-guide documents were likewise removed after consolidation into their definitive guides.

### Digital development

24. **`Gauntlet_Digital_Prototype_Roadmap.md`** — canonical data, deckbuilder, engine, interface, telemetry, and remote-play roadmap.
25. **`../deckbuilder/README.md`** — stable v0.5 deckbuilder.
26. **`../deckbuilder-v0.6/README.md`** — v0.6 development deckbuilder scope, live-source behavior, omissions, and next implementation steps.
27. **`../src/README.md`** — TypeScript engine and interface status.
28. **`../data/README.md`** — starter-data scope and source warning.

### Setting and production

29. **`Gauntlet_Lore_Development_Notes.md`** — current incremental setting direction.
30. **`Gauntlet_v0.6_Leader_Design_Bible.md`** — leader art and miniature direction.
31. **`../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md`** — definitive Diplomat source and release-guide package.
32. **`../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md`** — definitive Inquisition source and release-guide package.
33. **`../faction-sheets/README.md`** — printable faction-sheet sources and instructions.
34. **`../images/`** — leader portraits and matching production sketches.
35. **`Game_Design_Glossary.md`** — shared terminology.

### Historical archive

`Archive/` contains completed audits and superseded records that remain useful. Archive material never overrides active rules, definitive faction guides, exact-text pools, canonical data, or current design documents.

---

## Current development checkpoint

### Playable cards

- All **54** v0.5.7 playable source cards have migration records.
- The Neutral pool is complete at **50** cards.
- Military, Diplomats, and Inquisition are complete at **12** cards each.
- Militias and Patriotism are retired.
- The project contains **95 current playable designs**: 50 Neutral, 12 Military, 12 Diplomat, 12 Inquisition, and 9 retained source designs assigned to Arcane, Financiers, and Intelligence.

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
- `../faction-sheets/military.html` is the printable card-and-component package derived from the definitive guide.
- `../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md` is the definitive Military source.
- The adjacent release files are `Gauntlet_v0.6_Military_Faction_Guide.pdf` and `Gauntlet_v0.6_Military_Faction_Guide.docx`.

### Diplomat checkpoint

- Curve: **1 / 3 / 5 / 2 / 1**.
- Total value: 35; average: 2.92.
- Roster: **Clemency; Trade Concessions; Safe Conduct; Neutral Observers; Good Faith; Demilitarized Zone; Diplomatic Latitude; Nonbinding Resolution; Sanctions: Censure; Gunboat Diplomacy; Sanctions: Embargo; Sanctions: Blockade**.
- **Sanctions: Blockade** is the cost-5 statement card.
- **Sanctions: Censure, Sanctions: Embargo, and Sanctions: Blockade** are the formal Sanctions.
- **Recognition of Claims** is archived.
- The supplemental set uses both leaders, nine Proposal / Treaty Article cards, references, and the sliding Influence tracker.
- `../faction-sheets/diplomat.html` is the printable card-and-component package derived from the definitive guide.
- `../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md` is the definitive Diplomat source.
- The adjacent release files are `Gauntlet_v0.6_Diplomat_Faction_Guide.pdf` and `Gauntlet_v0.6_Diplomat_Faction_Guide.docx`.

### Inquisition checkpoint

- Curve: **1 / 3 / 4 / 2 / 2**.
- Total value: 37; average: 3.08.
- Roster: **Accusation; Confession; Penance; Divine Mercy; No Martyrs; Excommunication; Guilt by Association; Act of Faith; Tyranny; Burning at the Stake; Heresy; Hellfire**.
- **Heresy** has the Arcane trait and permits one bounded additional copied-effect layer.
- **Hellfire** divides Conviction between battle strength and Purification pressure.
- **Divine Mercy, Tyranny, and Burning at the Stake** are the primary balance watchlist.
- The 1-Conviction Purge retains top-discard removal and adds a combined-value-2 option.
- Player-facing card text has received a dedicated concision pass without mechanical changes.
- The supplemental set uses either leader, two single-sided references, and one shared sliding 0–4 Conviction tracker. No token or marker is used.
- `../faction-sheets/inquisition.html` is the two-sheet printable package using the existing portraits under `images/`.
- `../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md` is the definitive Inquisition source; the adjacent DOCX and PDF are release-formatted editions using the Grand Inquisitor and Witch Hunter sketches under `../images/sketches/`.

### Remaining blockers

- Redesign **Capital Gains** around Financier infrastructure.
- Decide whether **Siege Weaponry** becomes **Bombardment**.
- Finalize Witchcraft copied-effect eligibility.
- Define impossible-target and source-dependent copied effects generally.
- Complete Intelligence Mission requirements.
- Complete Arcane, Financier, and Intelligence card packages.
- Playtest and physically review all completed packages before canonical v0.6 data is created.

### Territories and core rules

- All **25** v0.5.7 Territories and Arenas have been reviewed and consolidated in `Gauntlet_v0.6_Territory_Pool.md`.
- The pool contains **21 standard Territories** and **4 Arenas**, with 18 Basic and 7 Advanced designs.
- Territory activation, suppression, Overlays, dormant lower Overlays, and Ruins are consolidated in the Working Rules.
- The numbered files under `territory-reviews/` remain design and approval provenance rather than the active exact-text source.
- Current Territory watchlists include Old Battlefield, Grand Melee, and Monastery.
- The Working Rules include independent Action and hand-commitment limits, voluntary Asset removal, no Conditions, Asset/Overlay persistence, negation, bounded copied-effect handling, revised Diplomat rules, and the current Inquisition rules.

### Factions

- Military — General / Commandant
- Diplomats — Ambassador / Senator
- Inquisition — Grand Inquisitor / Witch Hunter
- Arcane — Alchemist / Spirit Walker
- Financiers — Banker / Executive
- Intelligence — Ranger / Spymaster

Faction packages target **12 unique cards**, use **1 / 3 / 4 / 3 / 1** as a planning baseline rather than a quota, and include at least one optional cost-5 statement card.

### Digital work

- The TypeScript engine, CLI, and GUI remain development scaffolds.
- The v0.6 development deckbuilder is live under `../deckbuilder-v0.6/` and reads the active Neutral, Military, Diplomat, and Inquisition Markdown sources at runtime.
- It supports completed faction and leader selection, Neutral-plus-faction legality, playable-card count/value validation, local saves, JSON import/export, and text export.
- Arcane, Financiers, and Intelligence remain disabled placeholders until their packages are complete.
- Territory selection, supplemental-component manifests, and print/PDF export remain pending.
- Do not silently migrate v0.5 saved decks into v0.6.

### Lore and production

- Lore remains incremental and non-canonical beyond the active notes.
- The Leader Design Bible is the visual source of truth.
- `images/` contains portraits and production sketches for all twelve leaders.
- Military, Diplomat, and Inquisition printable packages are under `faction-sheets/`.
- The definitive Military, Diplomat, and Inquisition guide packages are under `releases/v0.6/faction-guides/` in Markdown, DOCX, and PDF formats.
- Military, Diplomat, and Inquisition resources use sliding leader-over-tracker components; Inquisition uses no token.

---

## Repository protocol

1. Treat chat as workspace; write durable decisions into the repository.
2. Use released canonical data for its matching version.
3. Use definitive faction guides and completed exact-text pool documents before migration provenance.
4. Assess Neutral-pool impact before faction-locking a shared card.
5. Record approved decisions in the relevant active source.
6. Update rollups at material checkpoints.
7. Keep rules, rationale, lore, production, and implementation in their designated documents.
8. Archive or remove superseded working records once consolidated.
9. Do not claim a decision is logged until the repository update succeeds.
10. Do not create canonical v0.6 data by silently resolving open questions.

---

## Immediate next step

Continue Arcane, Financier, or Intelligence design while playtesting the completed Military, Diplomat, and Inquisition packages. In parallel, use the consolidated Territory pool to add Territory selection and supplemental-component manifests to the development deckbuilder so it can validate complete decks and generate the correct print package without creating premature canonical release data. Reopen a definitive faction package only when testing reveals a strategic, balance, wording, or production failure.
