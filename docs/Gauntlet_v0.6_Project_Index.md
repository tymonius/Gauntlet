# Gauntlet v0.6 Project Index

**Status:** Active source-of-truth map and development checkpoint.

Read this file first when resuming v0.6 work.

---

## Active source hierarchy

### Rules and cards

1. **`Gauntlet_v0.6_Working_Rules.md`** — current v0.6 rules framework, faction mechanics, leaders, resources, alternate victories, withdrawal, persistent-effect categories, and product scope.
2. **`card-reviews/STATUS.md`** — authoritative live card-review checkpoint.
3. **`card-reviews/`** — standalone approved card reviews beginning with card 48; these are authoritative until the next batch rollup.
4. **`Gauntlet_v0.6_Card_Metadata.md`** — consolidated card allegiance, starter eligibility, complexity, and watchlist rollup.
5. **`Gauntlet_v0.6_Card_Review_Log.md`** — consolidated card-by-card migration decisions and wording direction through the latest rollup boundary.
6. **`Gauntlet_v0.6_Open_Questions.md`** — unresolved current rules, card, faction, testing, and release questions.
7. **`../releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — authoritative pre-v0.6 card order and source text for migration.
8. **`v0.5.7_rules_clarifications.md`** — physical-rules clarifications discovered through digital implementation.

### Design rationale and testing

9. **`Gauntlet_Design_Principles_and_Guardrails.md`** — current design constraints for core rules, factions, cards, complexity, components, pacing, and digital work.
10. **`Gauntlet_Development_History_and_Superseded_Directions.md`** — why the v0.5 rebuild occurred and which older systems are not current.
11. **`Gauntlet_Playtest_Targets_and_Metrics.md`** — pacing benchmarks, simulation conclusions, telemetry, and human-playtest questions.
12. **`Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`** — Diplomat changes explicitly held for v0.6.1.
13. **`Gauntlet_v0.7_Parking_Lot.md`** — Engineers, multiplayer, Day/Night, and other post-v0.6 concepts.

### Digital development

14. **`Gauntlet_Digital_Prototype_Roadmap.md`** — canonical data, deckbuilder, rules engine, CLI, GUI, telemetry, and remote-play roadmap.
15. **`../deckbuilder/README.md`** — current v0.5 deckbuilder behavior, consolidated implementation structure, and versioned upgrade path.
16. **`../src/README.md`** — current TypeScript engine and development-interface status.
17. **`../data/README.md`** — starter-data scope and source-of-truth warning.

### Setting and production

18. **`Gauntlet_Lore_Development_Notes.md`** — current WIP setting direction, open questions, and rejected premises.
19. **`Gauntlet_v0.6_Leader_Design_Bible.md`** — active production-facing leader and miniature direction.
20. **`Game_Design_Glossary.md`** — shared design terminology.

### Historical archive

`Archive/` contains completed audits and superseded historical records that remain useful for provenance. Archive material does not override active rules, canonical data, or current design documents.

Current archived records include:

- completed 2026-07-10 conversation audit;
- early leader archetype notes;
- character design sheet generation log.

---

## Repository and workflow status

The consolidation pass is complete. A lightweight per-card workflow is now active.

Completed changes include:

- created `docs/Archive/` with an archive policy;
- moved completed audits and historical visual-development records into the archive;
- removed obsolete audit trackers, conversation-lead trackers, migration worksheets, correction addenda, and connector inventory files;
- consolidated earlier card-review work into one Review Log and Metadata registry through card 47;
- introduced `docs/card-reviews/` so future approved cards can be logged in small standalone files;
- made `docs/card-reviews/STATUS.md` the live checkpoint;
- set batch rollups for every five approved cards, the end of a review session, or a release checkpoint;
- stopped requiring README, Project Index, consolidated-log, and metadata rewrites after every individual card;
- absorbed Withdrawal and Condition-reduction rules into the Working Rules and removed the cleanup sidecar;
- rewrote Open Questions to contain only active unresolved work;
- rewrote the Design Principles to use current metadata and faction language;
- consolidated the deckbuilder's incremental CSS files into `components.css`;
- consolidated the deckbuilder's browser, randomization, and print scripts into `features.js`;
- retained `/data` and `/src` because they are active digital-development scaffolds, with their non-authoritative status clearly documented;
- left versioned `/releases` packages unchanged as historical release snapshots.

---

## Current development checkpoint

### Card review

- Last mechanically reviewed card: **Supplies**.
- Next card: **Tariffs**.
- Consolidated rollup coverage: cards 1–47, through Supplies.
- Beginning with Tariffs, approved reviews are recorded in `docs/card-reviews/` and rolled up in batches.
- Scorched Earth remains a cost-3 Neutral Ruins Overlay card; its former Asset-destruction and bank-lock effects were removed.
- Siege Weaponry is Neutral at cost 4, deploys from the Asset bank onto an adjacent enemy Territory before movement, suppresses its printed effect for the turn, and becomes Ruins after successful capture or battle victory.
- **Bombardment** is the leading replacement title; **Siege Weaponry** may be reserved for a future Engineer card.
- Spies is an Intelligence card at cost 2. Its Asset exposes the opponent's hand; its Battle effect reveals only the opponent's actual hand commitment and chosen battle-drawn card before allowing the Spies player to change their own battle-drawn selection.
- Stand Ground remains Neutral at cost 2. Its Action is now a prepared one-use Asset that can be discarded to ignore the movement portion of one opposing card effect; it does not prevent normal required retreat or voluntary movement.
- Strategic Withdrawal remains Neutral at cost 3. Its Action returns a banked Asset to hand for additional movement; its Battle effect trades an additional withdrawal after a loss for recovering one other card played in that battle.
- Supplies remains Neutral at cost 1. Its Action is a stored one-use Asset that may remain banked until its controller chooses, at the beginning of a future turn, to discard it and draw two additional cards; its Battle effect remains draw two, then discard one after battle.
- A Territory is either ruined or not. Placing a new Ruins Overlay on an already ruined Territory sends the existing Overlay to its owner's Graveyard and replaces it.
- **Repair** is reserved for the future Engineer faction rather than becoming a universal v0.6 action.
- Do not inflate individual card costs merely to populate the 5-cost tier. After the full card review, audit the cost curve and identify or design faction capstones while constructing the faction decks.
- After migration, complete the Condition reduction pass, integrate finalized cross-card rules such as Ruins into the Working Rules, audit faction cost curves and capstones, and create canonical v0.6 data.

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

- The v0.5 browser deckbuilder is functional and has six tracked files: README, HTML, two CSS files, and two JavaScript files.
- The TypeScript engine, CLI, and browser GUI are development scaffolds, not a complete digital edition.
- The next digital target must be chosen explicitly: complete v0.5.7 first or create a separate v0.6-development mode.
- Do not silently migrate saved decks across the v0.5/v0.6 boundary.

### Lore and production

- Lore remains intentionally incremental and non-canonical beyond the current direction document.
- The Leader Design Bible is the active visual source of truth.
- Earlier archetype and generated-sheet records are archived.

---

## Repository protocol

1. Treat chat as workspace; write durable decisions into the repository.
2. Use released canonical data for its matching version.
3. For card review, fetch exact v0.5.7 source text before analysis.
4. Before faction-locking a card, assess both neutral-pool impact and interaction with the destination faction's mechanics.
5. After approval, create or update one standalone card file and update `card-reviews/STATUS.md`.
6. Roll standalone reviews into the consolidated Review Log and Metadata registry after every five approved cards, at session end, or before a release checkpoint.
7. Do not update the root README after each card; update this Project Index only for material milestones or rollups.
8. Keep rules, testing rationale, lore, production direction, and implementation state in their designated documents.
9. Remove or archive temporary worksheets, addenda, trackers, and continuation files once their information is consolidated.
10. Do not claim a decision is logged until the repository update succeeds.

---

## Immediate next step

Continue v0.6 card review at **Tariffs** using `card-reviews/TEMPLATE.md` and record the approved decision as `card-reviews/048-tariffs.md`.
