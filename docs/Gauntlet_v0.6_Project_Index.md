# Gauntlet v0.6 Project Index

**Status:** Active source-of-truth map and development checkpoint.

Read this file first when resuming v0.6 work.

---

## Active source hierarchy

### Rules, cards, and Territories

1. **`Gauntlet_v0.6_Working_Rules.md`** — current v0.6 rules framework, faction mechanics, leaders, resources, alternate victories, Assets, Overlays, Territory activation, Ruins, and product scope.
2. **`Gauntlet_v0.6_Neutral_Card_Pool.md`** — authoritative working names, costs, complexity, traits, uniqueness, and exact text for all 50 Neutral cards.
3. **`Gauntlet_v0.6_Military_Card_Pool.md`** — authoritative working names, costs, complexity, uniqueness, exact text, package audit, and playtest watchlist for all 12 Military cards.
4. **`card-reviews/STATUS.md`** — authoritative live playable-card checkpoint and unresolved card blockers.
5. **`Gauntlet_v0.6_Card_Metadata.md`** — consolidated allegiance, starter eligibility, complexity, and watchlists for the current 73 playable-card designs and retired migration entries.
6. **`card-reviews/COST_CURVE_AND_NEUTRAL_POOL_AUDIT.md`** — completed Neutral pool-size, cost-curve, repricing, and addition audit.
7. **`card-reviews/MILITARY_V0.6_RELEASE_SELECTION.md`** — completed Military roster selection, final cost profile, and Standing Orders cut decision.
8. **`Gauntlet_v0.6_Card_Review_Log.md`** — migration provenance for all 54 v0.5.7 source cards. It does not override completed exact-text pool documents.
9. **`card-reviews/CONDITION_AUDIT.md`** — detailed provenance for retiring Conditions and converting former Condition effects.
10. **`card-reviews/`** — standalone detailed review provenance, including approved Neutral additions, Military approval sidecars, inherited-candidate audits, and historical draft review.
11. **`territory-reviews/STATUS.md`** — authoritative Territory-review checkpoint.
12. **`territory-reviews/GENERAL_RULES.md`** — approved general Territory activation and suppression rules.
13. **`territory-reviews/`** — standalone reviews for all 25 v0.5.7 Territories and Arenas.
14. **`Gauntlet_v0.6_Open_Questions.md`** — unresolved current rules, faction-card, testing, and release questions.
15. **`../releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — authoritative historical pre-v0.6 source order and text for migration only.
16. **`v0.5.7_rules_clarifications.md`** — physical-rules clarifications discovered through digital implementation.

No canonical v0.6 data exists yet. Active v0.6 documents govern development until the remaining five faction packages, exact-text blockers, Intelligence Missions, copied-effect rules, and package testing are resolved.

### Design rationale and testing

17. **`Gauntlet_Design_Principles_and_Guardrails.md`** — current design constraints for core rules, factions, cards, complexity, components, pacing, and digital work.
18. **`Gauntlet_v0.6_Faction_Card_Design_Guide.md`** — active construction and review standard for faction card pools, including creative strategy, open-ended synergy, no-grandfathering, leader integration, the twelve-card package target, premium-leaning cost baseline, anti-patterns, and package approval criteria.
19. **`Gauntlet_v0.6_Military_Design_Notes.md`** — finalized Military identity, strategic threads, leader integration, intended weaknesses, Neutral boundaries, completed-package rationale, and testing priorities.
20. **`Gauntlet_Playtest_Targets_and_Metrics.md`** — pacing benchmarks, simulation conclusions, telemetry, and human-playtest questions.
21. **`Gauntlet_v0.6_Diplomat_Design_Notes.md`** — active rationale, implementation guidance, Sanctions direction, and testing questions for the integrated v0.6 Diplomat framework.
22. **`Gauntlet_Development_History_and_Superseded_Directions.md`** — why the v0.5 rebuild occurred and which older systems are not current.
23. **`Gauntlet_v0.7_Parking_Lot.md`** — Engineers, multiplayer, Day/Night, and other post-v0.6 concepts.

The following Military files are historical provenance and do not override the active Military Card Pool or Design Notes:

- `Gauntlet_v0.6_Military_Card_Pool_Draft.md`;
- `card-reviews/MILITARY_DRAFT_REVIEW_NOTES.md`;
- `card-reviews/MILITARY_INHERITED_CANDIDATE_AUDIT.md`;
- individual Military approval sidecars.

### Digital development

24. **`Gauntlet_Digital_Prototype_Roadmap.md`** — canonical data, deckbuilder, rules engine, CLI, GUI, telemetry, and remote-play roadmap.
25. **`../deckbuilder/README.md`** — current v0.5 deckbuilder behavior and versioned upgrade path.
26. **`../src/README.md`** — current TypeScript engine and development-interface status.
27. **`../data/README.md`** — starter-data scope and source-of-truth warning.

### Setting and production

28. **`Gauntlet_Lore_Development_Notes.md`** — current WIP setting direction, open questions, and rejected premises.
29. **`Gauntlet_v0.6_Leader_Design_Bible.md`** — active production-facing leader and miniature direction.
30. **`Game_Design_Glossary.md`** — shared design terminology.

### Historical archive

`Archive/` contains completed audits and superseded historical records that remain useful for provenance. Archive material and superseded Military drafts do not override active rules, exact-text pool documents, canonical data, or current design documents.

---

## Current development checkpoint

### Playable cards

- All **54** v0.5.7 playable source cards have migration-review records.
- **12 new Neutral cards** have been approved.
- The Neutral pool is complete at **50 unique cards**.
- The Military pool is complete at **12 unique cards**.
- Militias and Patriotism are retired from the current playable pool.
- Nine new Military designs have been added beyond the retained source cards Brothers in Arms, Shock and Awe, and War Crimes.
- The project therefore contains **73 current playable-card designs**: 50 Neutral, 12 Military, and 11 retained cards assigned to the five unfinished factions.

Neutral checkpoint:

- Final curve: **11 cost-1 / 19 cost-2 / 11 cost-3 / 8 cost-4 / 1 cost-5**.
- Total unique-card value: 119.
- Average cost: 2.38.
- **Manifest Destiny** is the Unique Neutral cost-5 Territory-expansion capstone.
- **Resourcefulness** is the final low-cost-card build-around.
- **Counterworks** provides narrow Neutral Overlay prevention and temporary suppression.
- Repair, permanent dismantling, movement, upgrading, recurrence, connected infrastructure, and Overlay-network victory progress remain reserved for the future Engineer faction.

Military checkpoint:

- Final selected curve: **1 cost-1 / 4 cost-2 / 3 cost-3 / 3 cost-4 / 1 cost-5**.
- Total unique-card value: 35.
- Average cost: 2.92.
- Selected roster: **Unbroken Ranks; Battlefield Promotion; Encampment; Rearguard; Brothers in Arms; Field Command; Reserve Force; Give Chase; Hold the Line; Countercharge; War Crimes; Shock and Awe**.
- **Shock and Awe** is the Unique cost-5 statement card.
- **War Crimes** is Military rather than Inquisition.
- **Standing Orders** is deferred and not in the release pool.
- The package remains subject to playtesting, physical-card templating, and playtest-driven balance or wording changes before canonical data is frozen.

Other integrated card decisions:

- The Arcane Knowledge / Witchcraft name swap is integrated into metadata and exact-text sources.
- Conditions are retired as a v0.6 game concept.
- Former Condition effects have been converted to Assets, Overlays, immediate effects, or deferred faction redesigns.

Remaining exact-text or design blockers:

- Blockade / Sanctions requires its Diplomat implementation under the integrated Terms and staking framework.
- Capital Gains requires its Financier-infrastructure redesign.
- Siege Weaponry may be renamed Bombardment.
- Witchcraft needs final copied-effect eligibility wording.
- General impossible-target and source-dependent copied-effect handling remains unresolved.
- Intelligence Mission requirements remain incomplete.
- The Diplomat, Inquisition, Arcane, Financier, and Intelligence packages remain incomplete.
- Each completed package still requires playtesting and production templating before canonical v0.6 data is created.

### Territories

- All **25** v0.5.7 Territories and Arenas have been reviewed.
- General face-up, face-down, control, occupation, Overlay replacement, suppression, and Ruins rules are consolidated into the Working Rules.
- Current targeted watchlists include Old Battlefield value, Grand Melee stacking, and Monastery's Arcane pressure.
- Faction-specific Territories are tabled for later consideration and are not part of the current v0.6 baseline.

### Core rules consolidation

The Working Rules now include:

- independent Action-card and Battle hand-commitment limits;
- voluntary Asset removal using an Action opportunity;
- no Condition zone or Condition card category;
- Asset and Overlay persistence;
- the universal rule that the top exposed Overlay supersedes the printed effect immediately beneath it;
- dormant lower Overlays whose effects and expiration timers pause until exposed again;
- general Territory activation and suppression;
- Ruins replacement and persistence;
- the definition of negated;
- the anti-recursion rule for effects that resolve other Battle effects;
- the revised Diplomat Influence-staking, imposition, Treaty Article, Proposal, and Senator rules as part of v0.6.

### Factions

The six working factions are:

- Military — General / Commandant;
- Diplomats — Ambassador / Senator;
- Inquisition — Grand Inquisitor / Witch Hunter;
- Arcane — Alchemist / Spirit Walker;
- Financiers — Banker / Executive;
- Intelligence — Ranger / Spymaster.

Current faction rules are in the Working Rules. The revised Diplomat framework is part of the initial v0.6 baseline rather than a deferred v0.6.1 overhaul. Balance, names, Missions, the five remaining card packages, and several thresholds remain under active testing or development.

Faction package construction and review should follow `Gauntlet_v0.6_Faction_Card_Design_Guide.md`. The current v0.6 baseline is:

- **12 unique playable cards per faction**;
- no grandfathered release slots for previously faction-designated cards;
- a premium-leaning default curve of **1 / 3 / 4 / 3 / 1** at costs 1–5;
- at least one optional, game-defining cost-5 statement card per faction;
- permission to deviate from the default curve or include additional premium cards when the completed strategic vocabulary is stronger, more varied, and more fun as a result.

Military is the first completed faction card package. Its active exact text is in `Gauntlet_v0.6_Military_Card_Pool.md`; its rationale and test plan are in `Gauntlet_v0.6_Military_Design_Notes.md`.

### Digital work

- The TypeScript state model, reducer, public/private views, CLI, and browser GUI no longer contain a Condition zone.
- The small implemented Attrition persistent effect now uses the Asset Bank rather than Conditions.
- Tests and Action destination previews were updated for the Asset conversion.
- The engine, CLI, and GUI remain development scaffolds, not a complete v0.6 digital edition.
- The next digital target must still be chosen explicitly: complete v0.5.7 first or create a separate v0.6-development mode.
- Do not silently migrate saved decks across the v0.5/v0.6 boundary.

### Lore and production

- Lore remains intentionally incremental and non-canonical beyond the current direction document.
- The Leader Design Bible is the active visual source of truth.
- Earlier archetype and generated-sheet records are archived.

---

## Repository protocol

1. Treat chat as workspace; write durable decisions into the repository.
2. Use released canonical data for its matching version.
3. For v0.6 Neutral card questions, use `Gauntlet_v0.6_Neutral_Card_Pool.md` first.
4. For v0.6 Military card questions, use `Gauntlet_v0.6_Military_Card_Pool.md` first.
5. For migration provenance, use the Card Review Log and standalone reviews.
6. Before faction-locking a card, assess both Neutral-pool impact and interaction with the destination faction's mechanics.
7. Record approved decisions in the relevant active source.
8. Update rollups and this Project Index at material milestones rather than after every minor discussion.
9. Keep rules, testing rationale, lore, production direction, and implementation state in their designated documents.
10. Remove or archive temporary worksheets, addenda, trackers, and continuation files once their information is consolidated.
11. Do not claim a decision is logged until the repository update succeeds.
12. Do not create canonical v0.6 data by silently resolving open design questions.

---

## Immediate next step

Begin or continue one of the five remaining faction packages while adding Military to package-level playtesting and physical-card templating. Reopen the Military roster only if testing reveals a clear strategic, balance, wording, or production failure.
