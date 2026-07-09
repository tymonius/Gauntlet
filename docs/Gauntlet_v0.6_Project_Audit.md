# Gauntlet v0.6 Project Audit

**Status:** Active audit tracker.

**Purpose:** Compare prior Gauntlet conversation decisions against the repo so important decisions do not remain buried in chat history.

---

## Audit method

1. Use `/docs` and canonical release files as the durable project memory.
2. Treat chat history and remembered context as leads to verify, not as final authority by itself.
3. Mark each item as one of:
   - **Documented/current** — repo matches current direction.
   - **Documented/stale** — repo has the topic but contradicts newer direction.
   - **Conversation-only** — important point appears in prior discussion but is not yet in repo.
   - **Work-in-progress** — useful idea, not finalized.
4. Convert durable decisions into the appropriate repo source-of-truth file.

---

## Files fetched / inspected so far

### Root

- `README.md` — general project overview and repository structure.
- `.gitignore`
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`

### `/docs`

- `docs/Game_Design_Glossary.md`
- `docs/Gauntlet_Design_Principles_and_Guardrails.md`
- `docs/Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`
- `docs/Gauntlet_v0.6_Card_Migration_Worksheet.md`
- `docs/Gauntlet_v0.6_Card_Review_Log.md`
- `docs/Gauntlet_v0.6_Card_Review_Log_Addendum_2026-07-09.md`
- `docs/Gauntlet_v0.6_Conversation_Audit_Leads.md`
- `docs/Gauntlet_v0.6_Leader_Archetype_and_Visual_Notes.md`
- `docs/Gauntlet_v0.6_Open_Questions.md`
- `docs/Gauntlet_v0.6_Project_Audit.md`
- `docs/Gauntlet_v0.6_Project_Index.md`
- `docs/Gauntlet_v0.6_Rules_Cleanup.md`
- `docs/Gauntlet_v0.6_Working_Rules.md`
- `docs/Gauntlet_v0.7_Parking_Lot.md`
- `docs/Gauntlet_Repo_Inventory.md`
- `docs/v0.5.7_rules_clarifications.md`

### `/data`

- `data/README.md`
- `data/cards.json`
- `data/game_config.json`
- `data/recommended_decks.json`
- `data/schema.md`
- `data/territories.json`

### `/deckbuilder`

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

### `/releases`

- `releases/v0.5.6/README.md`
- `releases/v0.5.6/CONTRIBUTING.md`
- `releases/v0.5.6/COPYRIGHT.md`
- `releases/v0.5.6/Gauntlet_v0.5.6_Canonical_Data.json`
- `releases/v0.5.6/Gauntlet_v0.5.6_Playtest_Deck_Lists.md`
- `releases/v0.5.6/Gauntlet_v0.5.6_Release_Notes.md`
- `releases/v0.5.6/build_gauntlet_v056.py`
- `releases/v0.5.7/README.md`
- `releases/v0.5.7/CONTRIBUTING.md`
- `releases/v0.5.7/COPYRIGHT.md`
- `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`
- `releases/v0.5.7/Gauntlet_v0.5.7_Playtest_Deck_Lists.md`

### `/src`

- `src/README.md`

**Inventory limitation:** The current GitHub connector exposes file fetches by known path but not a direct repository tree/listing action. A complete file inventory still needs to be built from known paths, commit history, screenshots, and any available repository browser/listing method.

---

## Verified documented/current items

### v0.6 faction framework

The v0.6 Working Rules document six factions:

- Military — Command, Orders, direct conquest pressure.
- Diplomats — Terms, Influence, Treaty Articles, Peace Treaty.
- Inquisition — Conviction, Condemnation, Purge, Purification.
- Arcane — Rites, Invocation, Transmutation, Ritual victory.
- Financiers — Capital, Treasury, Deeds, Controlling Interest.
- Intelligence — Intel, Missions, Surveillance, Interference, Special Operation.

Status: **Documented/current**.

### Current leader framework

The v0.6 Working Rules document the current leader roster and leader abilities:

- Military: General / Commandant.
- Diplomats: Ambassador / Senator.
- Inquisition: Grand Inquisitor / Witch Hunter.
- Arcane: Alchemist / Spirit Walker.
- Financiers: Banker / Executive.
- Intelligence: Ranger / Spymaster.

Status: **Documented/current** for mechanics. Visual/archetype notes are now separately documented.

### Core design guardrails

The design principles and current card review process now document that core teaches Gauntlet, factions express different ways of winning Gauntlet, and before moving a neutral card into a faction we must check whether other factions still need the shared tool.

Status: **Documented/current**.

### Diplomat v0.6.1 overhaul

The v0.6.1 Diplomat overhaul notes document:

- Terms / Influence staking model.
- Loss of Face replacement or redesign.
- Proposal recalibration around accept/refuse incentives.
- Demilitarized Zone as a future Proposal/card question.
- v0.6 should not be blocked by the full Diplomat overhaul.

Status: **Documented/current**.

### Multiplayer / v0.7 leads

The v0.7 Parking Lot now records:

- 2v2 dual-lane prototype.
- Cross-board / central Arena prototype.
- FFA / Arena variant.

Status: **Documented/current as v0.7+ parking-lot material**.

### Leader archetype and visual notes

Leader archetype and visual design notes have been promoted to `docs/Gauntlet_v0.6_Leader_Archetype_and_Visual_Notes.md`.

Status: **Documented/current as non-rules art-direction material**.

---

## Documented/stale or conflicting items

### Assimilation

Older main card review log entry classified Assimilation as Military. The current main card review log now corrects Assimilation to Advanced Neutral / Watchlist.

Status: **Resolved**.

### Card review checkpoint

Older main card review log ended with Next Card: Insurrection. The current main card review log now records Insurrection and tables Invasion.

Status: **Resolved**.

---

## Conversation-only leads now captured

### Insurrection preference

Prior discussion favored the chaotic global reshuffle version of Insurrection.

Status: **Captured in main card review log**.

### Invasion concern

Invasion may be redundant if locked to Military because Military already has Command / Orders that advance, modify attacks, and chain battle momentum.

Status: **Captured in main card review log and open questions; tabled pending audit completion**.

### Assassins Mission hook

Assassins was approved as Intelligence, harsh by design, and should receive an appropriately difficult Mission hook later.

Status: **Captured in card review log, but Mission requirement remains WIP**.

### Original faction naming / stale labels

Earlier references used Magic and Spy. Current labels are Arcane and Spymaster.

Status: **Captured in conversation audit leads and leader visual notes**.

### Deckbuilder split-mode requirement

Prior conversation called for separate v0.5 and v0.6+ tool modes because pre-faction and faction versions differ substantially.

Status: **Captured in conversation audit leads; partly documented in deckbuilder README**.

### Starter product packaging idea

Prior conversation suggested a later starter product might include core plus Military plus maybe one other faction, while a complete game would include the full card pool with enough multiples.

Status: **Captured in conversation audit leads as product lead, not a v0.6 rules decision**.

---

## Audit backlog

### Repo inventory

- Continue source subdirectory inventories:
  - `.github/workflows/`
  - `src/cards/`
  - `src/cli/`
  - `src/effects/`
  - `src/gui/`
  - `src/state/`
  - `src/types/`
- Confirm exact full filenames for truncated release-package zip/pdf names if needed.
- Older release folders v0.3.0 through v0.5.5 are intentionally deferred unless later needed.

### Faction docs

- Confirm whether future factions such as Engineers or Legal should remain speculative only.
- Confirm whether faction symbols are final for v0.6 or still working.

### Diplomat docs

- Confirm whether Sanctions should get its own design note file or remain under v0.6.1 Diplomat overhaul notes.
- Confirm whether Demilitarized Zone is intended as Proposal, faction card, Overlay, or open.

### Card text implementation

- Review whether v0.6 card decisions are reflected only in the review log or also need to be pushed into canonical v0.6 data.
- Once review decisions are complete, create or update v0.6 canonical card data rather than relying on v0.5.7 metadata.

### Conversation audit

- Continue checking prior Gauntlet-related memory against repo docs.
- Promote any durable rules decisions to Working Rules, Card Review Log, Open Questions, v0.7 Parking Lot, or another durable doc as appropriate.
- Keep speculative leads in `Conversation_Audit_Leads.md` until verified or closed.

---

## Current audit checkpoint

- Project index created and updated.
- Open questions tracker created and updated.
- Audit tracker created and updated.
- Repo inventory created and updated through visible root, docs, data, deckbuilder, v0.5.6/v0.5.7 release listings, and src top-level listing.
- Main card review log merged through Insurrection.
- Invasion remains tabled.
- Multiplayer/v0.7 leads added to v0.7 Parking Lot.
- Leader archetype / visual notes created.
- Continue audit before resuming card review at Invasion.
