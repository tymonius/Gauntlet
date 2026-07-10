# Gauntlet v0.6 Project Audit

**Status:** Exported conversation audit completed; broader implementation audit remains ongoing.  
**Purpose:** Track whether important Gauntlet decisions, rationale, rejected directions, and active work are durably represented in the repository.

---

## 1. Audit method

1. Treat `/docs`, canonical release data, and explicit implementation files as durable project memory.
2. Treat chat history as evidence to classify, not as automatically authoritative rules.
3. Prefer later explicit user decisions over earlier proposals.
4. Distinguish:
   - **Documented/current**
   - **Documented/stale or incomplete**
   - **Conversation-only**
   - **Work-in-progress**
   - **Rejected or superseded**
5. Promote durable information to the appropriate source-of-truth document.
6. Do not claim a decision is logged until the repository update succeeds.

---

## 2. Exported conversation audit

The 2026-07-10 ChatGPT export contained 211 conversations across three JSON shards. The extraction process found all eight priority Gauntlet conversations plus one additional Gauntlet comparison conversation.

Reviewed sources:

1. Gauntlet Card Review
2. Gauntlet Game Development pt2
3. Digital Gauntlet Playtesting
4. Faction Leader Archetypes
5. Asset Bank Rule Impact
6. Gauntlet Game Development
7. Deckbuilder Tool Design
8. Gauntlet Lore Development
9. Gauntlet vs Old King's Crown

Detailed source-by-source findings are in:

- `docs/Gauntlet_Conversation_Audit_2026-07-10.md`

**Conversation-audit status:** **Complete for the exported Gauntlet set.**

---

## 3. Current source-of-truth map

### Rules and design

- `docs/Gauntlet_v0.6_Working_Rules.md` — current faction and leader rules framework.
- `docs/Gauntlet_Design_Principles_and_Guardrails.md` — current design constraints.
- `docs/Gauntlet_v0.6_Rules_Cleanup.md` — low-risk cleanup and Condition-reduction plan.
- `docs/Gauntlet_Development_History_and_Superseded_Directions.md` — why the v0.5 rebuild happened and which older directions should not be revived casually.

### Card migration

- `docs/Gauntlet_v0.6_Card_Metadata.md` — allegiance, starter eligibility, complexity, and watchlist metadata.
- `docs/Gauntlet_v0.6_Card_Review_Log.md` — detailed decisions for cards 1–34.
- `docs/Gauntlet_v0.6_Card_Review_Log_35_onward.md` — active continuation beginning with Resistance.
- `releases/v0.5.7/Gauntlet_v0.5.7_Canonical_Data.json` — pre-v0.6 source text and review order.

### Audit and unresolved work

- `docs/Gauntlet_Conversation_Audit_2026-07-10.md` — completed exported-conversation audit.
- `docs/Gauntlet_v0.6_Conversation_Audit_Leads.md` — remaining verified WIP and future leads.
- `docs/Gauntlet_v0.6_Open_Questions.md` — unresolved current decisions.
- `docs/Gauntlet_v0.7_Parking_Lot.md` — post-v0.6 concepts.

### Playtesting and digital work

- `docs/Gauntlet_Playtest_Targets_and_Metrics.md` — pacing targets, telemetry, and simulation conclusions.
- `docs/Gauntlet_Digital_Prototype_Roadmap.md` — engine, data, deckbuilder, CLI, GUI, and remote-play roadmap.
- `docs/v0.5.7_rules_clarifications.md` — physical-rules clarifications exposed by digital implementation.

### Setting and production design

- `docs/Gauntlet_Lore_Development_Notes.md` — current lore direction, open questions, and rejected premises.
- `docs/Gauntlet_v0.6_Leader_Archetype_and_Visual_Notes.md` — historical and fictional archetype references.
- `docs/Gauntlet_v0.6_Leader_Design_Bible.md` — production-facing character and miniature direction.
- `docs/Gauntlet_v0.6_Character_Design_Sheet_Log.md` — generated visual iteration log.

---

## 4. Verified documented/current decisions

### Core Gauntlet structure

- no movement rolls;
- intentional movement choices;
- occupation before capture;
- normal defender counterattack window;
- start-of-turn capture if occupation survives;
- optional hand commitment plus battle draw;
- one Action or Battle card per turn unless an effect says otherwise;
- hand limit 3;
- hand commitments normally go to the Graveyard;
- played battle-drawn cards normally go to discard;
- Homeland Advantage resolves controlled-space ties for the defender;
- own-Heartland defense separately grants +1;
- Asset-bank limit equals Territories controlled;
- Heartlands are not Territories or cards.

### Faction framework

Current six factions:

- Military
- Diplomats
- Inquisition
- Arcane
- Financiers
- Intelligence

Current leaders:

- General / Commandant
- Ambassador / Senator
- Grand Inquisitor / Witch Hunter
- Alchemist / Spirit Walker
- Banker / Executive
- Ranger / Spymaster

The working rules document current resources, mechanics, leader abilities, and faction victory directions.

### Card review

- Current review decisions are durable through **Sabotage**.
- Card review is paused for audit integration.
- Next card after the pause is **Scorched Earth**.
- Older Core Neutral / Advanced Neutral labels are deprecated as card classes.
- Current metadata is separated into allegiance, starter eligibility, complexity, and watchlist concern.

### Tooling

- v0.5 deckbuilder is implemented as a static browser tool.
- v0.5 and v0.6+ should use separate versioned rules/data modes within a shared UI shell.
- saved decks retain their version and should not silently auto-migrate.
- digital engine remains framework-neutral with CLI and GUI development harnesses.

### Future scope

- Engineer and multiplayer concepts are parked for v0.7+.
- Day/Night remains post-v0.6 optional-module exploration.
- the full Diplomat overhaul remains held for v0.6.1.

---

## 5. Major gaps resolved by the exported audit

### Playtest benchmarks and telemetry

Previously scattered simulation conclusions are now centralized in:

- `docs/Gauntlet_Playtest_Targets_and_Metrics.md`

This includes individual-turn terminology, pacing targets, percentile reporting, card-lifecycle evidence, Asset-bank snowball monitoring, and human-playtest questions.

### Development history and rejected directions

Previously buried core-redesign rationale is now centralized in:

- `docs/Gauntlet_Development_History_and_Superseded_Directions.md`

This distinguishes current rules from round limits, breach markers, Foothold, universal immediate capture, fixed Asset limits, minimum-2 Asset capacity, old Active Effects terminology, and other superseded ideas.

### Lore

Previously conversation-only setting work is now preserved in:

- `docs/Gauntlet_Lore_Development_Notes.md`

This records current tone and institutional framing without pretending unfinished setting possibilities are canon.

### Digital prototype status

Previously stale source documentation has been corrected through:

- `docs/Gauntlet_Digital_Prototype_Roadmap.md`
- updated `src/README.md`
- updated `data/README.md`

---

## 6. Rejected or superseded directions protected from accidental revival

The audit confirms these are not current default rules or setting premises:

- routine movement rolls;
- normal round limit as the anti-stalemate solution;
- breach or exhaustion markers;
- Foothold as a current core rule;
- immediate capture after every attacking win;
- failed counterattack automatically causing capture;
- fixed Asset maximum;
- minimum-2 Asset capacity as current law;
- all Battle-card plays entering the Graveyard;
- old multi-card battle pileups;
- Active Effects terminology;
- Heartland cards;
- direct fantasy Old World / New World colonial analogue;
- Age of Claims as the definitive setting;
- one ancient-road cosmology or universal legendary prize.

These may be revisited only as explicit controlled proposals, not recovered from old chat as though still approved.

---

## 7. Remaining work

These are active project tasks rather than lost conversation decisions:

### Card and rules work

- resume card review at Scorched Earth;
- finish v0.6 card migration;
- develop outstanding Intelligence Missions;
- complete faction-card lists and wording;
- create canonical v0.6 data;
- complete post-review Condition reduction;
- resolve current open questions and v0.6.1 Diplomat issues.

### Testing

- run human v0.6 faction playtests;
- compare paired leaders;
- monitor Asset-bank contraction and comeback viability;
- validate alternate victories as visible parallel pressure;
- gather the metrics in the playtest targets document.

### Digital implementation

- complete the `/src` module/test inventory where useful;
- choose the next explicit supported digital target;
- replace placeholder development decks;
- synchronize engine behavior with complete canonical data;
- finish a full guided game without state editing;
- add telemetry, save/load, and only then remote multiplayer.

### Lore and production

- continue setting development one question at a time;
- finalize remaining ability names and art-direction questions;
- complete remaining leader and component designs.

---

## 8. Current audit checkpoint

- All exported Gauntlet conversations reviewed.
- All priority conversation titles found.
- Current repo state distinguished from superseded transcript material.
- Major missing rationale, lore, metrics, and digital status promoted to durable docs.
- Card review remains paused after Sabotage.
- Next card after audit acceptance: Scorched Earth.

The conversation-audit objective is complete. Future audits should be targeted at new conversations, implementation drift, or specific unresolved areas rather than re-reading this export from scratch.
