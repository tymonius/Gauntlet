# Gauntlet v0.6 Project Index

**Status:** Project navigation and source-of-truth map.

This file is the starting point for future Gauntlet development sessions. Read it first, then the active files named under the current checkpoint.

---

## Source-of-truth hierarchy

### Current v0.6 rules and cards

1. **`docs/Gauntlet_v0.6_Working_Rules.md`** — current v0.6 faction framework, leaders, resources, mechanics, and alternate victories.
2. **`docs/Gauntlet_v0.6_Card_Metadata.md`** — card allegiance, starter eligibility, complexity, and watchlist metadata.
3. **`docs/Gauntlet_v0.6_Card_Review_Log.md`** — detailed migration decisions for cards 1–34.
4. **`docs/Gauntlet_v0.6_Card_Review_Log_35_onward.md`** — active continuation beginning with Resistance.
5. **`docs/Gauntlet_v0.6_Rules_Cleanup.md`** — low-risk cleanup decisions and post-review Condition reduction.
6. **`docs/Gauntlet_v0.6_Open_Questions.md`** — unresolved current decisions.
7. **`releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json`** — authoritative pre-v0.6 card order and source text for migration.

### Design rationale and testing

8. **`docs/Gauntlet_Design_Principles_and_Guardrails.md`** — design principles used to evaluate proposed changes.
9. **`docs/Gauntlet_Development_History_and_Superseded_Directions.md`** — why the v0.5 rebuild occurred and which older ideas are not current.
10. **`docs/Gauntlet_Playtest_Targets_and_Metrics.md`** — pacing targets, simulation conclusions, telemetry, and human-playtest questions.
11. **`docs/v0.5.7_rules_clarifications.md`** — physical-rules clarifications exposed by digital implementation.

### Audit and project memory

12. **`docs/Gauntlet_Conversation_Audit_2026-07-10.md`** — completed source-by-source audit of the exported Gauntlet conversations.
13. **`docs/Gauntlet_v0.6_Project_Audit.md`** — current audit status and durable findings.
14. **`docs/Gauntlet_v0.6_Conversation_Audit_Leads.md`** — remaining WIP and future conversation-derived leads.
15. **`docs/Gauntlet_Repo_Inventory.md`** — working repository inventory.

### Digital tools

16. **`docs/Gauntlet_Digital_Prototype_Roadmap.md`** — data, deckbuilder, rules-engine, CLI, GUI, telemetry, and remote-play roadmap.
17. **`deckbuilder/README.md`** — current v0.5 deckbuilder behavior and upgrade path.
18. **`src/README.md`** — current TypeScript engine and development-interface status.
19. **`data/README.md`** — starter-data status and source-of-truth warning.

### Setting and production design

20. **`docs/Gauntlet_Lore_Development_Notes.md`** — current WIP lore direction, open questions, and rejected premises.
21. **`docs/Gauntlet_v0.6_Leader_Design_Bible.md`** — production-facing art and miniature direction.
22. **`docs/Gauntlet_v0.6_Character_Design_Sheet_Log.md`** — generated character-design iterations.
23. **`docs/Gauntlet_v0.6_Leader_Archetype_and_Visual_Notes.md`** — historical and fictional archetype references.

### Parked future work

24. **`docs/Gauntlet_v0.6.1_Diplomat_Overhaul_Notes.md`** — Diplomat overhaul held for v0.6.1.
25. **`docs/Gauntlet_v0.7_Parking_Lot.md`** — Engineers, multiplayer, Day/Night, and other post-v0.6 concepts.

---

## Comprehensive conversation audit status

The 2026-07-10 ChatGPT export contained 211 conversations across three JSON shards. All eight priority Gauntlet conversations were found, plus one additional Gauntlet comparison conversation.

Reviewed:

1. Gauntlet Card Review
2. Gauntlet Game Development pt2
3. Digital Gauntlet Playtesting
4. Faction Leader Archetypes
5. Asset Bank Rule Impact
6. Gauntlet Game Development
7. Deckbuilder Tool Design
8. Gauntlet Lore Development
9. Gauntlet vs Old King's Crown

**Status: complete.**

Major gaps recovered and promoted:

- playtest pacing targets, telemetry, and simulation conclusions;
- v0.5 redesign history and rejected/superseded systems;
- current lore direction and rejected setting premises;
- current digital prototype architecture, implementation state, and limitations.

The audit found no newer hidden approved ruleset that supersedes the current repository. Remaining tasks are active design and implementation work, not undiscovered chat decisions.

---

## Current card-review checkpoint

Last fully documented card: **Sabotage**.

Sabotage is:

- Neutral;
- starter-eligible;
- Basic complexity;
- cost 2;
- Action: temporarily turns one face-up opposing Asset face down without creating a Condition;
- Battle: cancels one active opposing Battle card and places it in discard.

Card review resume point: **Scorched Earth**.

---

## Current active workflow

**Current phase:** Audit integration is complete. Review the audit summary, then resume v0.6 card review at Scorched Earth.

Before resuming card review, read:

1. this index;
2. `docs/Gauntlet_Conversation_Audit_2026-07-10.md` if audit context is relevant;
3. `docs/Gauntlet_v0.6_Card_Metadata.md`;
4. both card-review logs;
5. the exact Scorched Earth text from v0.5.7 canonical data.

---

## Session protocol

1. Treat chat as workspace only; treat repository sources as durable memory.
2. For card review, fetch exact current text and cost from v0.5.7 canonical data.
3. Decide separately:
   - allegiance;
   - starter eligibility;
   - complexity;
   - watchlist concern;
   - cost and detailed rule direction.
4. Before faction-locking, assess both neutral-pool impact and interaction with the destination faction's mechanics.
5. Distinguish approved decisions from WIP, rejected, and superseded ideas.
6. Keep lore separate from rules unless an explicit design decision connects them.
7. Do not claim something is logged until the repository update succeeds.
8. Update this index when the source hierarchy or active checkpoint materially changes.

---

## Current checkpoint

- Exported-conversation audit: **complete**.
- Last fully documented reviewed card: **Sabotage**.
- Next card: **Scorched Earth**.
- Immediate next step: present the audit findings, then return to card review when directed.
