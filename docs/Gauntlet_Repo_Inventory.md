# Gauntlet Repo Inventory

**Status:** Working inventory.

This inventory is based on visible directory listings provided on 2026-07-09, plus files successfully fetched through the GitHub connector.

---

## Root directory

Visible root entries:

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

Pending root directory inventories:

- `.github/workflows/`

---

## `/data` directory

Visible entries:

- `README.md`
- `cards.json`
- `game_config.json`
- `recommended_decks.json`
- `schema.md`
- `territories.json`

Fetched files:

- `data/README.md`
- `data/cards.json`
- `data/game_config.json`
- `data/recommended_decks.json`
- `data/schema.md`
- `data/territories.json`

Notes:

- This folder is a v0.5.6 digital-data starter, not the v0.6 card source of truth.
- `effect.kind` entries are currently stubs for later executable handlers.

---

## `/deckbuilder` directory

Visible entries:

- `README.md`
- `app.js`
- `card-browser.css`
- `card-browser.js`
- `deck-compact.css`
- `deck-compact.js`
- `index.html`
- `layout-columns.css`
- `metric-cleanup.css`
- `print-cost-align.js`
- `print-font-standard.js`
- `print-layout.js`
- `print-state-source.js`
- `random-deck.js`
- `styles.css`
- `territory-browser.css`
- `territory-browser.js`
- `territory-cleanup.css`
- `validation-top.css`

Fetched files:

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

Notes:

- The current deckbuilder targets the v0.5 pre-faction line and loads canonical v0.5.6 data.
- The intended upgrade path is a separate v0.6+ mode once factions and leaders are stable.

---

## `/docs` directory

Visible entries:

- `Game_Design_Glossary.md`
- `Gauntlet_Design_Principles_and_Guardrails.md`
- `Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`
- `Gauntlet_v0.6_Card_Migration_Worksheet.md`
- `Gauntlet_v0.6_Card_Review_Log.md`
- `Gauntlet_v0.6_Card_Review_Log_Addendum_2026-07-09.md`
- `Gauntlet_v0.6_Open_Questions.md`
- `Gauntlet_v0.6_Project_Audit.md`
- `Gauntlet_v0.6_Project_Index.md`
- `Gauntlet_v0.6_Rules_Cleanup.md`
- `Gauntlet_v0.6_Working_Rules.md`
- `Gauntlet_v0.7_Parking_Lot.md`
- `v0.5.7_rules_clarifications.md`

Fetched files:

- `docs/Game_Design_Glossary.md`
- `docs/Gauntlet_Design_Principles_and_Guardrails.md`
- `docs/Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`
- `docs/Gauntlet_v0.6_Card_Migration_Worksheet.md`
- `docs/Gauntlet_v0.6_Card_Review_Log.md`
- `docs/Gauntlet_v0.6_Card_Review_Log_Addendum_2026-07-09.md`
- `docs/Gauntlet_v0.6_Open_Questions.md`
- `docs/Gauntlet_v0.6_Project_Audit.md`
- `docs/Gauntlet_v0.6_Project_Index.md`
- `docs/Gauntlet_v0.6_Rules_Cleanup.md`
- `docs/Gauntlet_v0.6_Working_Rules.md`
- `docs/Gauntlet_v0.7_Parking_Lot.md`
- `docs/v0.5.7_rules_clarifications.md`

---

## `/releases` directory

Visible entries:

- `v0.3.0/`
- `v0.3.1/`
- `v0.4.0/`
- `v0.5.3/`
- `v0.5.4/`
- `v0.5.5/`
- `v0.5.6/`
- `v0.5.7/`

Fetched files so far:

- `releases/v0.5.6/Gauntlet_v0.5.6_Canonical_Data.json`
- `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`

Pending release subdirectory inventories:

- `releases/v0.3.0/`
- `releases/v0.3.1/`
- `releases/v0.4.0/`
- `releases/v0.5.3/`
- `releases/v0.5.4/`
- `releases/v0.5.5/`
- `releases/v0.5.6/`
- `releases/v0.5.7/`

---

## `/src` directory

Visible entries:

- `cards/`
- `cli/`
- `effects/`
- `gui/`
- `state/`
- `types/`
- `README.md`

Fetched files:

- `src/README.md`

Pending source subdirectory inventories:

- `src/cards/`
- `src/cli/`
- `src/effects/`
- `src/gui/`
- `src/state/`
- `src/types/`

Notes:

- `src/README.md` describes this as early digital rules-engine scaffolding, with priority on testable game-state code before UI.

---

## Inventory notes

The GitHub connector currently fetches files by known path but has not provided a direct repository tree listing in this session. Directory inventories below the visible folders still need to be filled from directory screenshots, known paths, or another reliable listing method.
