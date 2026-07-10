# Gauntlet Repo Inventory

**Status:** Working inventory updated after the 2026-07-10 conversation audit.

This inventory is based on visible directory listings, known repository paths, and files successfully fetched through the GitHub connector. It is not a guaranteed recursive tree listing.

---

## Root

Known entries:

- `.github/workflows/`
- `data/`
- `deckbuilder/`
- `docs/`
- `releases/`
- `src/`
- `.gitignore`
- `README.md`
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`

Fetched root files:

- `.gitignore`
- `README.md`
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`

`package.json` currently provides:

```text
npm run typecheck
npm test
npm run test:watch
npm run dev:cli
npm run dev:gui
```

Pending:

- recursive inventory of `.github/workflows/` if needed for implementation work.

---

## `/data`

Known and fetched:

- `data/README.md`
- `data/cards.json`
- `data/game_config.json`
- `data/recommended_decks.json`
- `data/schema.md`
- `data/territories.json`

Current status:

- early digital-data starter;
- useful for schema and implementation scaffolding;
- not automatically authoritative for v0.5.7 or v0.6;
- released canonical data lives under the matching `/releases` folder;
- v0.6 canonical data has not yet been created.

---

## `/deckbuilder`

Known and fetched:

- `deckbuilder/README.md`
- `deckbuilder/app.js`
- `deckbuilder/card-browser.css`
- `deckbuilder/card-browser.js`
- `deckbuilder/deck-compact.css`
- `deckbuilder/deck-compact.js`
- `deckbuilder/index.html`
- `deckbuilder/layout-columns.css`
- `deckbuilder/metric-cleanup.css`
- `deckbuilder/print-cost-align.js`
- `deckbuilder/print-font-standard.js`
- `deckbuilder/print-layout.js`
- `deckbuilder/print-state-source.js`
- `deckbuilder/random-deck.js`
- `deckbuilder/styles.css`
- `deckbuilder/territory-browser.css`
- `deckbuilder/territory-browser.js`
- `deckbuilder/territory-cleanup.css`
- `deckbuilder/validation-top.css`

Current status:

- static browser deckbuilder for the v0.5 pre-faction line;
- loads canonical v0.5.6 data;
- supports duplicate cards, deck metrics, Territory selection, validation, local saves, JSON import/export, text export, random decks, and print-to-PDF;
- future direction is a separate versioned v0.6+ rules/data mode within the shared UI shell;
- saved decks should not silently migrate across versions.

---

## `/docs`

### Rules, cards, and design

- `docs/Game_Design_Glossary.md`
- `docs/Gauntlet_Design_Principles_and_Guardrails.md`
- `docs/Gauntlet_Development_History_and_Superseded_Directions.md`
- `docs/Gauntlet_Playtest_Targets_and_Metrics.md`
- `docs/Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`
- `docs/Gauntlet_v0.6_Card_Metadata.md`
- `docs/Gauntlet_v0.6_Card_Migration_Worksheet.md`
- `docs/Gauntlet_v0.6_Card_Review_Log.md`
- `docs/Gauntlet_v0.6_Card_Review_Log_35_onward.md`
- `docs/Gauntlet_v0.6_Open_Questions.md`
- `docs/Gauntlet_v0.6_Rules_Cleanup.md`
- `docs/Gauntlet_v0.6_Working_Rules.md`
- `docs/Gauntlet_v0.7_Parking_Lot.md`
- `docs/v0.5.7_rules_clarifications.md`

### Audit and navigation

- `docs/Gauntlet_Conversation_Audit_2026-07-10.md`
- `docs/Gauntlet_v0.6_Conversation_Audit_Leads.md`
- `docs/Gauntlet_v0.6_Project_Audit.md`
- `docs/Gauntlet_v0.6_Project_Index.md`
- `docs/Gauntlet_Repo_Inventory.md`

### Digital development

- `docs/Gauntlet_Digital_Prototype_Roadmap.md`

### Lore and production design

- `docs/Gauntlet_Lore_Development_Notes.md`
- `docs/Gauntlet_v0.6_Character_Design_Sheet_Log.md`
- `docs/Gauntlet_v0.6_Leader_Archetype_and_Visual_Notes.md`
- `docs/Gauntlet_v0.6_Leader_Design_Bible.md`

### Historical or transition files

- `docs/Gauntlet_v0.6_Card_Review_Log_Addendum_2026-07-09.md`

The project index defines the current hierarchy. Historical addenda should not override the merged current logs.

---

## `/releases`

Known release folders:

- `releases/v0.3.0/`
- `releases/v0.3.1/`
- `releases/v0.4.0/`
- `releases/v0.5.3/`
- `releases/v0.5.4/`
- `releases/v0.5.5/`
- `releases/v0.5.6/`
- `releases/v0.5.7/`

### v0.5.6 fetched text files

- `releases/v0.5.6/README.md`
- `releases/v0.5.6/CONTRIBUTING.md`
- `releases/v0.5.6/COPYRIGHT.md`
- `releases/v0.5.6/Gauntlet_v0.5.6_Canonical_Data.json`
- `releases/v0.5.6/Gauntlet_v0.5.6_Playtest_Deck_Lists.md`
- `releases/v0.5.6/Gauntlet_v0.5.6_Release_Notes.md`
- `releases/v0.5.6/build_gauntlet_v056.py`

Known generated/binary package contents include the playtest guide, master card pool, four-deck set, forms, and print-and-play package.

### v0.5.7 fetched text files

- `releases/v0.5.7/README.md`
- `releases/v0.5.7/CONTRIBUTING.md`
- `releases/v0.5.7/COPYRIGHT.md`
- `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`
- `releases/v0.5.7/Gauntlet_v0.5.7_Playtest_Deck_Lists.md`

Known generated/binary package contents include the playtest guide, master card pool, four-deck set, forms, and print-and-play package.

Older release folders are intentionally not inventoried in detail unless historical reconstruction requires them.

---

## `/src`

Known top-level entries:

- `src/cards/`
- `src/cli/`
- `src/effects/`
- `src/gui/`
- `src/state/`
- `src/types/`
- `src/README.md`

Fetched examples:

- `src/README.md`
- `src/cli/dev-runner.ts`
- `src/gui/dev-server.ts`

Current status:

- framework-neutral TypeScript rules-engine scaffold;
- includes authoritative/private state work, reducers, legal actions, battle and turn flow, Asset-bank handling, occupation/capture, win evaluation, guided CLI, session logging, and a local browser GUI;
- CLI and GUI examples still use small `0.5.6-dev` placeholder decks;
- full v0.5.7 and v0.6 implementation status must be verified module by module rather than inferred from the existence of a development interface.

Pending technical inventory when needed:

- `src/cards/`
- `src/cli/`
- `src/effects/`
- `src/gui/`
- `src/state/`
- `src/types/`
- tests associated with those modules.

The digital roadmap, not this inventory, defines implementation priorities.

---

## Inventory limitations

The GitHub connector used for this audit fetches known files but did not provide a reliable recursive repository-tree listing. This document should therefore be updated when new paths are discovered or when a full tree becomes available.

A missing path in this inventory does not prove the file is absent from the repository.
