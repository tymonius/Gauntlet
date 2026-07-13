# Gauntlet v0.6 Project Index

**Status:** Active source-of-truth map and development checkpoint.

Read this file first when resuming v0.6 work.

---

## Active source hierarchy

### Rules, cards, and Territories

1. **`Gauntlet_v0.6_Working_Rules.md`** — current v0.6 rules framework, faction mechanics, leaders, resources, alternate victories, Assets, Overlays, Territory activation, Ruins, and product scope.
2. **`Gauntlet_v0.6_Neutral_Card_Pool.md`** — authoritative working names, costs, complexity, traits, uniqueness, and exact text for all 50 Neutral cards.
3. **`card-reviews/STATUS.md`** — authoritative live playable-card checkpoint and unresolved card blockers.
4. **`card-reviews/COST_CURVE_AND_NEUTRAL_POOL_AUDIT.md`** — completed Neutral pool-size, cost-curve, repricing, and addition audit.
5. **`Gauntlet_v0.6_Card_Metadata.md`** — consolidated allegiance, starter eligibility, complexity, and watchlists for all 66 approved playable-card designs.
6. **`Gauntlet_v0.6_Card_Review_Log.md`** — migration provenance for all 54 v0.5.7 source cards. It does not override the Neutral Card Pool where Neutral costs or exact text differ.
7. **`card-reviews/CONDITION_AUDIT.md`** — detailed provenance for retiring Conditions and converting former Condition effects.
8. **`card-reviews/`** — standalone detailed review provenance, including the approved Neutral additions and current faction-card audits.
9. **`territory-reviews/STATUS.md`** — authoritative Territory-review checkpoint.
10. **`territory-reviews/GENERAL_RULES.md`** — approved general Territory activation and suppression rules.
11. **`territory-reviews/`** — standalone reviews for all 25 v0.5.7 Territories and Arenas.
12. **`Gauntlet_v0.6_Open_Questions.md`** — unresolved current rules, faction-card, testing, and release questions.
13. **`../releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — authoritative historical pre-v0.6 source order and text for migration only.
14. **`v0.5.7_rules_clarifications.md`** — physical-rules clarifications discovered through digital implementation.

No canonical v0.6 data exists yet. Active v0.6 documents govern development until the remaining faction exact-text and package blockers are resolved and a canonical release dataset is created.

### Design rationale and testing

15. **`Gauntlet_Design_Principles_and_Guardrails.md`** — current design constraints for core rules, factions, cards, complexity, components, pacing, and digital work.
16. **`Gauntlet_v0.6_Faction_Card_Design_Guide.md`** — active construction and review standard for faction card pools, including creative strategy, open-ended synergy, no-grandfathering, leader integration, the twelve-card package target, premium-leaning cost baseline, anti-patterns, and package approval criteria.
17. **`Gauntlet_v0.6_Military_Design_Notes.md`** — active Military faction brief covering momentum versus consolidation, Command discipline, combined arms, maneuver, prepared operations, intended weaknesses, and inherited-candidate evaluation.
18. **`Gauntlet_v0.6_Military_Card_Pool_Draft.md`** — first complete twelve-card Military package draft, including Battlefield Promotion, the Bridgehead Overlay, rebuilt inherited concepts, proposed costs, provisional wording, and package watchlists. No card in the draft is yet approved exact text.
19. **`card-reviews/MILITARY_INHERITED_CANDIDATE_AUDIT.md`** — completed audit of Brothers in Arms, Militias, Patriotism, and Shock and Awe; recommendations await explicit approval before registry changes.
20. **`Gauntlet_Development_History_and_Superseded_Directions.md`** — why the v0.5 rebuild occurred and which older systems are not current.
21. **`Gauntlet_Playtest_Targets_and_Metrics.md`** — pacing benchmarks, simulation conclusions, telemetry, and human-playtest questions.
22. **`Gauntlet_v0.6_Diplomat_Design_Notes.md`** — active rationale, implementation guidance, Sanctions direction, and testing questions for the integrated v0.6 Diplomat framework.
23. **`Gauntlet_v0.7_Parking_Lot.md`** — Engineers, multiplayer, Day/Night, and other post-v0.6 concepts.

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

`Archive/` contains completed audits and superseded historical records that remain useful for provenance. Archive material does not override active rules, current exact-text documents, canonical data, or current design documents.

---

## Current development checkpoint

### Playable cards

- All **54** v0.5.7 playable cards have been mechanically reviewed for v0.6.
- **12 new Neutral cards** have been approved.
- The project therefore contains **66 approved playable-card designs**.
- The Neutral pool is complete at **50 unique cards**.
- The final Neutral curve is **11 cost-1 / 19 cost-2 / 11 cost-3 / 8 cost-4 / 1 cost-5**.
- The Neutral pool has 119 total unique deckbuilding value and a 2.38 average cost.
- **Manifest Destiny** is finalized as the Unique Neutral cost-5 Territory-expansion capstone.
- **Resourcefulness** is the final low-cost-card build-around.
- **Counterworks** provides narrow Neutral Overlay prevention and temporary suppression.
- Repair, permanent dismantling, movement, upgrading, recurrence, connected infrastructure, and Overlay-network victory progress remain reserved for the future Engineer faction.
- The Arcane Knowledge / Witchcraft name swap is integrated into the metadata and exact-text sources.
- Conditions are retired as a v0.6 game concept.
- Former Condition effects have been converted to Assets, Overlays, immediate effects, or deferred faction redesigns.

Remaining exact-text or design blockers:

- Blockade / Sanctions requires its Diplomat implementation under the integrated Terms and staking framework.
- Capital Gains requires its Financier-infrastructure redesign.
- Siege Weaponry may be renamed Bombardment.
- Witchcraft needs final copied-effect eligibility wording.
- General impossible-target and source-dependent copied-effect handling remains unresolved.
- Intelligence Mission requirements and all six faction packages remain incomplete.
- Each completed faction package still requires its faction-specific curve, premium-card, synergy, and leader-integration audit.

### Territories

- All **25** v0.5.7 Territories and Arenas have been reviewed.
- General face-up, face-down, control, occupation, suppression, and Ruins rules are consolidated into the Working Rules.
- Current targeted watchlists include Old Battlefield value, Grand Melee stacking, and Monastery's Arcane pressure.
- Faction-specific Territories are tabled for later consideration and are not part of the current v0.6 baseline.

### Core rules consolidation

The Working Rules now include:

- independent Action-card and Battle hand-commitment limits;
- voluntary Asset removal using an Action opportunity;
- no Condition zone or Condition card category;
- Asset and Overlay persistence;
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

Current faction rules are in the Working Rules. The revised Diplomat framework is part of the initial v0.6 baseline rather than a deferred v0.6.1 overhaul. Balance, names, Missions, card packages, and several thresholds remain under active testing or development.

Faction package construction and review should follow `Gauntlet_v0.6_Faction_Card_Design_Guide.md`. The current v0.6 baseline is:

- **12 unique playable cards per faction**;
- no grandfathered release slots for previously faction-designated cards;
- a premium-leaning default curve of **1 / 3 / 4 / 3 / 1** at costs 1–5;
- at least one optional, game-defining cost-5 statement card per faction;
- permission to deviate from the default curve or include additional premium cards when the completed strategic vocabulary is stronger, more varied, and more fun as a result.

Military's active design brief is established in `Gauntlet_v0.6_Military_Design_Notes.md`. The first complete Military package draft now contains twelve cards at a provisional **1 / 2 / 4 / 4 / 1** curve, 38 total unique-card value, and 3.17 average cost. It includes the user-selected name **Battlefield Promotion**, the **Bridgehead** Territory Overlay, rebuilt versions of Brothers in Arms, Militias, and Shock and Awe, and eight additional concepts. Patriotism remains excluded. No draft Military card is yet approved.

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
4. For migration provenance, use the Card Review Log and standalone reviews.
5. Before faction-locking a card, assess both neutral-pool impact and interaction with the destination faction's mechanics.
6. Record approved decisions in the relevant active source.
7. Update rollups and this Project Index at material milestones rather than after every minor discussion.
8. Keep rules, testing rationale, lore, production direction, and implementation state in their designated documents.
9. Remove or archive temporary worksheets, addenda, trackers, and continuation files once their information is consolidated.
10. Do not claim a decision is logged until the repository update succeeds.
11. Do not create canonical v0.6 data by silently resolving open design questions.

---

## Immediate next step

Review the twelve-card Military draft card by card, beginning with **Battlefield Promotion**, **Bridgehead**, **Brothers in Arms**, and **Shock and Awe**. Resolve duplicated delayed-movement roles, Command density, leader skew, and exact timing before any Military card is promoted into the approved registry or canonical pool.