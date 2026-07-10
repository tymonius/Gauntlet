# Gauntlet v0.6 Project Index

**Status:** Project navigation and source-of-truth map.

This file is the starting point for future Gauntlet development sessions. At the start of a new chat, read this file first, then the active working files listed below.

---

## Source-of-truth hierarchy

1. **`docs/Gauntlet_v0.6_Working_Rules.md`** — current v0.6 rules framework, faction mechanics, leader abilities, resources, alternate victories, and global watchlists.
2. **`docs/Gauntlet_v0.6_Card_Metadata.md`** — authoritative card allegiance, starter eligibility, complexity, and card-specific watchlist concerns. This supersedes the combined labels Core Neutral and Advanced Neutral / Watchlist.
3. **`docs/Gauntlet_v0.6_Card_Review_Log.md`** — detailed card-by-card v0.6 migration decisions for cards 1–34.
4. **`docs/Gauntlet_v0.6_Card_Review_Log_35_onward.md`** — active continuation of the detailed card review log beginning with Resistance.
5. **`docs/Gauntlet_Design_Principles_and_Guardrails.md`** — design principles used to evaluate proposed changes.
6. **`docs/Gauntlet_v0.6_Open_Questions.md`** — unresolved issues, contradictions, and tabled decisions.
7. **`docs/Gauntlet_v0.6_Project_Audit.md`** — audit trail comparing repo documentation against prior conversation decisions.
8. **`docs/Gauntlet_v0.6_Conversation_Audit_Leads.md`** — prior-conversation leads that still need verification or later incorporation.
9. **`docs/Gauntlet_v0.6_Leader_Design_Bible.md`** — production-facing visual direction for all twelve v0.6 faction leaders, including illustration direction, 3D miniature silhouettes, faction-pair contrast, and guardrails.
10. **`docs/Gauntlet_v0.6_Character_Design_Sheet_Log.md`** — log of generated character design sheets and useful iteration notes from the leader visual design pass.
11. **`docs/Gauntlet_v0.6_Leader_Archetype_and_Visual_Notes.md`** — leader archetype and visual direction notes; not rules text.
12. **`docs/Gauntlet_Repo_Inventory.md`** — working inventory of repo files and fetched/inspected sources.
13. **`docs/Gauntlet_v0.6_Rules_Cleanup.md`** — low-risk v0.6 cleanup items unless superseded by the working rules.
14. **`docs/Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`** — parked Diplomat overhaul concepts for v0.6.1.
15. **`releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — current canonical pre-v0.6 card order and card text baseline for review.

---

## Current active workflow

**Current phase:** Comprehensive audit of prior ChatGPT Gauntlet conversations against repository documentation. Card review is paused.

Before resuming in a new chat, read this index, the project audit, the conversation audit leads, and the relevant card-review files.

Audit classifications:

- Already documented/current.
- Documented but stale or conflicting.
- Conversation-only; needs repository entry.
- Work in progress / parking lot.
- Rejected; do not revive.

Priority conversations:

1. Gauntlet Card Review.
2. Gauntlet Game Development pt2.
3. Digital Gauntlet Playtesting.
4. Faction Leader Archetypes.
5. Asset Bank Rule Impact.
6. Gauntlet Game Development.
7. Deckbuilder Tool Design.
8. Gauntlet Lore Development — separate lore from rules.

Already completed:

- Card review completed through Sabotage.
- Sabotage recorded as Neutral, starter-eligible, Basic, cost 2; its Action no longer creates a Condition and its Battle effect uses standardized cancellation wording.
- Resistance recorded as Neutral, not starter-eligible, Advanced, cost 3, with counterattack stacking and occupation-delay pressure on the watchlist.
- Revolution recorded as Neutral, not starter-eligible, Advanced, cost 4, with extreme hand swings and battle-result reversal on the watchlist.
- Rousing Speech recorded as Neutral, starter-eligible, Basic, cost 2, with no initial watchlist concern.
- Card metadata was split into four independent fields: allegiance, starter eligibility, complexity, and watchlist concern. The old combined Core Neutral and Advanced Neutral / Watchlist labels are deprecated.
- A post-review Condition reduction pass was added to the rules-cleanup plan, prioritizing Assets, Overlays, or immediate resolution where cleaner.
- Manifest Destiny's current permanent-Territory effect was rejected; the card name is retained for redesign.
- New Frontier is reserved as a separate future card name.
- Leader production design bible and generated character-design-sheet log were added.
- Multiplayer v0.7 leads were added to the v0.7 Parking Lot.

---

## Session protocol

1. Read this index.
2. During the audit, compare conversation findings against the source-of-truth hierarchy rather than treating old conversation text as automatically current.
3. Classify each finding using the five audit classifications above.
4. Keep lore findings separate from rules and mechanics.
5. Treat chat as workspace only; treat `/docs` and canonical release data as project memory.
6. Do not say an audit finding or card decision is logged unless the relevant repository file has actually been updated.
7. When the audit is complete, return to card review at **Scorched Earth**.
8. When adding or materially modifying files, update this project index in the same work session.

---

## Current checkpoint

- Last fully documented reviewed card: **Sabotage**.
- Card review resume point: **Scorched Earth**.
- Current work: obtain a manageable subset of the ChatGPT export and complete the comprehensive conversation-to-repository audit.
