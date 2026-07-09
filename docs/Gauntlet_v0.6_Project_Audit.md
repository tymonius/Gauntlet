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

### `/docs`

- `docs/Gauntlet_v0.6_Working_Rules.md` — primary v0.6 rules framework.
- `docs/Gauntlet_v0.6_Card_Review_Log.md` — main card review log through Illegal Occupation.
- `docs/Gauntlet_Design_Principles_and_Guardrails.md` — design principles and card/faction guardrails.
- `docs/Gauntlet_v0.6_Rules_Cleanup.md` — withdrawal cleanup, Diplomat proposal name cleanup, Assimilation destination cleanup, and v0.6.1 hold items.
- `docs/Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md` — parked v0.6.1 Diplomat overhaul notes.
- `docs/Gauntlet_v0.6_Project_Index.md` — project source-of-truth index created during this audit.
- `docs/Gauntlet_v0.6_Open_Questions.md` — open question tracker created during this audit.
- `docs/Gauntlet_v0.6_Card_Review_Log_Addendum_2026-07-09.md` — audit addendum for Assimilation, Insurrection, and Invasion.

### `/releases`

- `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json` — current canonical pre-v0.6 card order and baseline text.
- `releases/v0.5.6/Gauntlet_v0.5.6_Canonical_Data.json` — prior canonical data used earlier in card review.

**Inventory limitation:** The current GitHub connector exposes file fetches by known path but not a direct repository tree/listing action. A complete file inventory still needs to be built from known paths, commit history, and any available repository browser/listing method.

---

## Verified documented/current items

### v0.6 faction framework

The v0.6 Working Rules already document six factions:

- Military — Command, Orders, direct conquest pressure.
- Diplomats — Terms, Influence, Treaty Articles, Peace Treaty.
- Inquisition — Conviction, Condemnation, Purge, Purification.
- Arcane — Rites, Invocation, Transmutation, Ritual victory.
- Financiers — Capital, Treasury, Deeds, Controlling Interest.
- Intelligence — Intel, Missions, Surveillance, Interference, Special Operation.

Status: **Documented/current**.

### Core design guardrails

The design principles already document that core teaches Gauntlet, factions express different ways of winning Gauntlet, and before moving a neutral card into a faction we must check whether other factions still need the shared tool.

Status: **Documented/current**.

### Diplomat v0.6.1 overhaul

The v0.6.1 Diplomat overhaul notes already document:

- Terms / Influence staking model.
- Loss of Face replacement or redesign.
- Proposal recalibration around accept/refuse incentives.
- Demilitarized Zone as a future Proposal/card question.
- v0.6 should not be blocked by the full Diplomat overhaul.

Status: **Documented/current**.

---

## Documented/stale or conflicting items

### Assimilation

Main card review log currently says Assimilation is a Military faction card. Later review direction says Assimilation should stay Neutral because it is a shared anti-siege / anti-stalemate breakthrough tool.

Status: **Documented/stale**.

Resolution recorded in dated addendum:

- `docs/Gauntlet_v0.6_Card_Review_Log_Addendum_2026-07-09.md`

Still needed:

- Merge the addendum correction into the main card review log.

### Card review checkpoint

Main card review log currently ends with Next Card: Insurrection. Later conversation states Insurrection was decided and should be logged.

Status: **Documented/stale / behind**.

Resolution recorded in dated addendum:

- Insurrection = Advanced Neutral / Watchlist.
- Invasion = tabled until audit complete.

Still needed:

- Merge into main card review log.

---

## Conversation-only leads to verify

These items came from prior conversation memory and should be checked against repo docs before being treated as final.

### Insurrection preference

Prior discussion favored the chaotic global reshuffle version of Insurrection.

Status: **Conversation-only lead, now captured in addendum**.

### Invasion concern

Invasion may be redundant if locked to Military because Military already has Command / Orders that advance, modify attacks, and chain battle momentum.

Status: **Conversation-only lead, now captured in open questions and addendum**.

### Assassins Mission hook

Assassins was approved as Intelligence, harsh by design, and should receive an appropriately difficult Mission hook later.

Status: **Documented/current in card review log, but Mission remains WIP**.

### Engineers / Overlay note

A prior commit indicates Engineers may later specialize in Overlays but should not monopolize the card type. This affects Fog of War and future Overlay cards.

Status: **Partly documented in Fog of War card review note; future faction idea remains WIP**.

---

## Audit backlog

### Repo inventory

- Build a complete file inventory from repository contents if a directory listing becomes available.
- Until then, continue using known paths and commit history.

### Card review consistency

- Merge Assimilation correction into main card review log.
- Merge Insurrection into main card review log.
- Keep Invasion tabled until audit is complete.
- Continue card review only after the audit backlog is stable.

### Faction docs

- Confirm whether all leader archetype/name/design notes are documented somewhere durable.
- Confirm whether future factions such as Engineers or Legal are intended to remain speculative only.
- Confirm whether faction symbols are final for v0.6 or still working.

### Diplomat docs

- Confirm whether Sanctions should get its own design note file or remain under v0.6.1 Diplomat overhaul notes.
- Confirm whether Demilitarized Zone is intended as Proposal, faction card, Overlay, or open.

### Card text implementation

- Review whether v0.6 card decisions are reflected only in the review log or also need to be pushed into canonical v0.6 data.
- Once review decisions are complete, create or update v0.6 canonical card data rather than relying on v0.5.7 metadata.

---

## Current audit checkpoint

- Project index created.
- Open questions tracker created.
- Audit tracker created.
- Card review addendum created for Assimilation / Insurrection / Invasion.
- Main card review log still needs addendum merge.
- Invasion remains tabled.
