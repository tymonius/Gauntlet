# Gauntlet v0.6 Project Index

**Status:** Active source-of-truth map and development checkpoint.

Read this file first when resuming v0.6 work.

---

## Active source hierarchy

### Rules, cards, and Territories

1. **`Gauntlet_v0.6_Working_Rules.md`** — current v0.6 rules framework, faction mechanics, leaders, resources, alternate victories, Assets, Overlays, Territory activation, Ruins, and product scope.
2. **`card-reviews/STATUS.md`** — authoritative live playable-card checkpoint and unresolved card blockers.
3. **`Gauntlet_v0.6_Card_Review_Log.md`** — consolidated decisions and wording direction for all 54 v0.5.7 playable cards.
4. **`Gauntlet_v0.6_Card_Metadata.md`** — consolidated allegiance, starter eligibility, complexity, and watchlists for all 54 reviewed cards.
5. **`card-reviews/CONDITION_AUDIT.md`** — detailed provenance for retiring Conditions and converting former Condition effects.
6. **`card-reviews/`** — standalone detailed review provenance, including cards 48–54.
7. **`territory-reviews/STATUS.md`** — authoritative Territory-review checkpoint.
8. **`territory-reviews/GENERAL_RULES.md`** — approved general Territory activation and suppression rules.
9. **`territory-reviews/`** — standalone reviews for all 25 v0.5.7 Territories and Arenas.
10. **`Gauntlet_v0.6_Open_Questions.md`** — unresolved current rules, card, faction, testing, and release questions.
11. **`../releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — authoritative pre-v0.6 source order and text for migration.
12. **`v0.5.7_rules_clarifications.md`** — physical-rules clarifications discovered through digital implementation.

No canonical v0.6 data exists yet. Active v0.6 documents govern development until the remaining exact-text and faction-package blockers are resolved and a canonical release dataset is created.

### Design rationale and testing

13. **`Gauntlet_Design_Principles_and_Guardrails.md`** — current design constraints for core rules, factions, cards, complexity, components, pacing, and digital work.
14. **`Gauntlet_Development_History_and_Superseded_Directions.md`** — why the v0.5 rebuild occurred and which older systems are not current.
15. **`Gauntlet_Playtest_Targets_and_Metrics.md`** — pacing benchmarks, simulation conclusions, telemetry, and human-playtest questions.
16. **`Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`** — Diplomat changes explicitly held for v0.6.1.
17. **`Gauntlet_v0.7_Parking_Lot.md`** — Engineers, multiplayer, Day/Night, and other post-v0.6 concepts.

### Digital development

18. **`Gauntlet_Digital_Prototype_Roadmap.md`** — canonical data, deckbuilder, rules engine, CLI, GUI, telemetry, and remote-play roadmap.
19. **`../deckbuilder/README.md`** — current v0.5 deckbuilder behavior and versioned upgrade path.
20. **`../src/README.md`** — current TypeScript engine and development-interface status.
21. **`../data/README.md`** — starter-data scope and source-of-truth warning.

### Setting and production

22. **`Gauntlet_Lore_Development_Notes.md`** — current WIP setting direction, open questions, and rejected premises.
23. **`Gauntlet_v0.6_Leader_Design_Bible.md`** — active production-facing leader and miniature direction.
24. **`Game_Design_Glossary.md`** — shared design terminology.

### Historical archive

`Archive/` contains completed audits and superseded historical records that remain useful for provenance. Archive material does not override active rules, canonical data, or current design documents.

---

## Current development checkpoint

### Playable cards

- All **54** v0.5.7 playable cards have been mechanically reviewed for v0.6.
- The consolidated Card Review Log and Metadata registry now cover cards 1–54.
- The Arcane Knowledge / Witchcraft name swap is integrated into both rollups.
- Conditions are retired as a v0.6 game concept.
- Former Condition effects have been converted to Assets, Overlays, immediate effects, or deferred faction redesigns.
- The Condition audit is complete for current non-faction cards.

Remaining exact-text or design blockers:

- Manifest Destiny requires a full redesign.
- Blockade / Sanctions requires its Diplomat implementation.
- Capital Gains requires its Financier-infrastructure redesign.
- Siege Weaponry may be renamed Bombardment.
- Witchcraft needs final copied-effect eligibility wording.
- General impossible-target and source-dependent copied-effect handling remains unresolved.
- Intelligence Mission requirements and faction packages remain incomplete.
- Faction cost curves and capstone needs still require audit.

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
- the anti-recursion rule for effects that resolve other Battle effects.

### Factions

The six working factions are:

- Military — General / Commandant;
- Diplomats — Ambassador / Senator;
- Inquisition — Grand Inquisitor / Witch Hunter;
- Arcane — Alchemist / Spirit Walker;
- Financiers — Banker / Executive;
- Intelligence — Ranger / Spymaster.

Current faction rules are in the Working Rules. Balance, names, Missions, card packages, and several thresholds remain under active testing or development.

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
3. For migration questions, fetch exact v0.5.7 source text before analysis.
4. Before faction-locking a card, assess both neutral-pool impact and interaction with the destination faction's mechanics.
5. Record approved decisions in the relevant standalone or consolidated source.
6. Update rollups and this Project Index at material milestones rather than after every minor discussion.
7. Keep rules, testing rationale, lore, production direction, and implementation state in their designated documents.
8. Remove or archive temporary worksheets, addenda, trackers, and continuation files once their information is consolidated.
9. Do not claim a decision is logged until the repository update succeeds.
10. Do not create canonical v0.6 data by silently resolving open design questions.

---

## Immediate next step

Resolve the remaining exact-text blockers and complete the six faction card packages. Once those are stable, create the first canonical v0.6 dataset and use it to drive the deckbuilder and digital-development mode.
