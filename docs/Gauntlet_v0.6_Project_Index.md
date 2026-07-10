# Gauntlet v0.6 Project Index

**Status:** Project navigation and source-of-truth map.

This file is the starting point for future Gauntlet development sessions. At the start of a new chat, read this file first, then the active working file listed below.

---

## Source-of-truth hierarchy

1. **`docs/Gauntlet_v0.6_Working_Rules.md`** — current v0.6 rules framework, faction mechanics, leader abilities, resources, alternate victories, and global watchlists.
2. **`docs/Gauntlet_v0.6_Card_Review_Log.md`** — card-by-card v0.6 card migration and review decisions. A card decision is not durable until it is recorded here.
3. **`docs/Gauntlet_Design_Principles_and_Guardrails.md`** — design principles used to evaluate proposed changes.
4. **`docs/Gauntlet_v0.6_Open_Questions.md`** — unresolved issues, contradictions, and tabled decisions.
5. **`docs/Gauntlet_v0.6_Project_Audit.md`** — audit trail comparing repo documentation against prior conversation decisions.
6. **`docs/Gauntlet_v0.6_Conversation_Audit_Leads.md`** — prior-conversation leads that still need verification or later incorporation.
7. **`docs/Gauntlet_v0.6_Leader_Design_Bible.md`** — production-facing visual direction for all twelve v0.6 faction leaders, including illustration direction, 3D miniature silhouettes, faction-pair contrast, and guardrails.
8. **`docs/Gauntlet_v0.6_Character_Design_Sheet_Log.md`** — log of generated character design sheets and useful iteration notes from the leader visual design pass.
9. **`docs/Gauntlet_v0.6_Leader_Archetype_and_Visual_Notes.md`** — leader archetype and visual direction notes; not rules text.
10. **`docs/Gauntlet_Repo_Inventory.md`** — working inventory of repo files and fetched/inspected sources.
11. **`docs/Gauntlet_v0.6_Rules_Cleanup.md`** — low-risk v0.6 cleanup items unless superseded by the working rules.
12. **`docs/Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`** — parked Diplomat overhaul concepts for v0.6.1.
13. **`releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — current canonical pre-v0.6 card order and card text baseline for review.

---

## Current active workflow

**Current phase:** v0.6 card review, with audit consolidation continuing when needed.

Before resuming in a new chat, read this index and the card review log.

Already completed:

- Assimilation corrected in the main card review log.
- Insurrection recorded in the main card review log.
- Invasion reviewed and recorded as Advanced Neutral / Watchlist.
- Liberation reviewed and recorded as Advanced Neutral / Watchlist with revised Battle direction mirroring Invasion from the counterattack side.
- Manifest Destiny's current permanent-Territory effect rejected; the card name is retained for redesign.
- New Frontier reserved as a separate future card name.
- Militias reviewed and recorded as a Military faction card with its Asset limited to the first qualifying battle each turn.
- Monetary Crisis reviewed and recorded as a cost-2 Financier faction card with its Battle effect assigned to battle cleanup.
- Necromancy reviewed and recorded as a cost-5 Arcane faction card with the Arcane trait; the non-Necromancy targeting restriction was removed.
- New Recruits reviewed and recorded as a cost-1 Core Neutral card with both effects unchanged.
- Palisade Wall reviewed and recorded as a cost-2 Core Neutral defensive counterplay card.
- Patriotism reviewed and recorded as a cost-3 Military faction card; Homeland Advantage protection removed and only one copy may be banked at a time.
- Protracted Siege reviewed and recorded as a cost-4 Advanced Neutral Territory Overlay that delays a scheduled capture.
- Rallying Cry reviewed and recorded as a cost-1 Core Neutral card with both effects unchanged.
- Redemption reviewed and recorded as a cost-2 Core Neutral card whose Action banks it as an Asset until voluntarily used.
- Reinforcements reviewed and recorded as a cost-2 Core Neutral card whose Action banks it as an Asset that can be discarded during the player's turn for one additional Action.
- A post-review Condition reduction pass was added to the rules-cleanup plan, prioritizing Assets, Overlays, or immediate resolution where cleaner.
- Leader archetype / visual design notes promoted to their own durable file.
- Leader production design bible added as `docs/Gauntlet_v0.6_Leader_Design_Bible.md`.
- Generated character design sheets logged in `docs/Gauntlet_v0.6_Character_Design_Sheet_Log.md`.
- Multiplayer v0.7 leads added to the v0.7 Parking Lot.

---

## Session protocol

1. Read this index.
2. Read the active working file named above.
3. State the current checkpoint before doing design work.
4. Treat chat as workspace only; treat `/docs` and canonical release data as project memory.
5. Do not say a decision is logged unless a repo file was actually updated.
6. For card review, fetch the current card text from canonical data before analyzing it.
7. For faction-lock recommendations, always evaluate:
   - neutral-pool impact, and
   - duplication or strange interaction with the destination faction's mechanics.
8. When adding or materially modifying files, update this project index in the same work session.

---

## Current checkpoint

- Last fully documented reviewed card: **Reinforcements**.
- Next card: **Resistance**.
- Current work: continue card review while preserving any major audit discoveries in the appropriate repo document.
