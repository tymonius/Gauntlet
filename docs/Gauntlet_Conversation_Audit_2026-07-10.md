# Gauntlet Conversation Audit — 2026-07-10

**Status:** Completed source-by-source audit of the exported Gauntlet conversation set.  
**Purpose:** Compare the full exported conversations against current repository memory, identify missing or stale material, and promote durable information into the appropriate source-of-truth documents.

---

## 1. Audit scope

The ChatGPT export contained **211 conversations** split across three JSON shards. The extraction manifest selected the following nine Gauntlet-related conversations:

1. `Gauntlet Card Review`
2. `Gauntlet Game Development pt2`
3. `Digital Gauntlet Playtesting`
4. `Faction Leader Archetypes`
5. `Asset Bank Rule Impact`
6. `Gauntlet Game Development`
7. `Deckbuilder Tool Design`
8. `Gauntlet Lore Development`
9. `Gauntlet vs Old King's Crown`

All eight priority titles were present. The ninth conversation was included because its title also contained **Gauntlet**.

The audit compared those transcripts against:

- current `/docs` files;
- v0.5.6 and v0.5.7 release data;
- current card-review logs and metadata;
- the deckbuilder implementation and README;
- the digital prototype source, CLI, GUI, and package scripts;
- the current v0.6 faction and leader framework;
- the v0.7 parking lot.

---

## 2. Classification method

Each meaningful item was classified as:

- **Documented/current** — current repo already reflects the latest approved direction.
- **Documented/stale or incomplete** — repo contains the topic but understates, contradicts, or predates later work.
- **Conversation-only** — important information was not durably recorded.
- **Work-in-progress** — potentially useful but not approved as final.
- **Rejected or superseded** — historical idea that should not be revived as current merely because it appears in chat.

User approvals and corrections were weighted above assistant proposals. Later explicit decisions were weighted above earlier exploratory discussion. Canonical release data remains authoritative for a released version, while the current v0.6 logs and working rules supersede older migration guesses.

---

## 3. Executive findings

### The strongest areas of repository memory

The following were already well represented:

- current six-faction v0.6 architecture;
- current leader roster and mechanics;
- current card-review process and decisions;
- v0.5.7 physical-rules clarifications;
- deckbuilder behavior and v0.5/v0.6 mode separation;
- multiplayer ideas parked for v0.7;
- production-facing leader designs.

### The largest gaps found

Four categories needed durable promotion:

1. **Playtest targets and simulation conclusions** — important pacing thresholds, card-lifecycle evidence, and telemetry requirements were scattered through a very long conversation.
2. **Development history and superseded core directions** — the repo described what the current game does, but not sufficiently why earlier systems were rejected.
3. **Lore direction and rejected setting premises** — the entire lore discussion remained effectively chat-only.
4. **Digital prototype status** — repository code had progressed well beyond its early README descriptions.

Those gaps have now been addressed through new or updated documents listed below.

### General conclusion

No hidden conversation contained a newer approved core ruleset that supersedes the current repository. Most apparent conflicts were earlier proposals, abandoned experiments, old terminology, or superseded card text.

The audit did find important rationale and project state that would have been lost without the export. Those items are now durable.

---

## 4. Source-by-source findings

## 4.1 Gauntlet Card Review

### Documented/current

- Assassins remains Intelligence, harsh by design, with an appropriately difficult Mission still to be developed.
- Card reviews must use exact current canonical text and cost.
- Faction-lock recommendations must assess both neutral-pool impact and interaction with the proposed faction's mechanics.
- Assimilation was corrected back to Neutral.
- Later reviewed cards supersede earlier classification guesses.
- The card review now uses separate metadata fields rather than treating Core Neutral and Advanced Neutral as gameplay classes.

### Superseded material

- Early provisional suggestions such as Military Attrition or other faction homes were later reconsidered and must not override the current card logs.
- Earlier references to `Advanced Neutral / Watchlist` are legacy shorthand. Current metadata separates allegiance, starter eligibility, complexity, and watchlist concern.
- The exported conversation ends before the current repository checkpoint. Current review decisions through Sabotage are newer than the export.

### Current status

No unrecorded approved card decision was found that should override the active card review logs. Card review is intentionally paused after **Sabotage** and should resume at **Scorched Earth** after audit review.

---

## 4.2 Gauntlet Game Development pt2

This was the largest and most consequential transcript. It contains simulations, card lifecycle work, faction architecture, release planning, terminology, comparison work, and later audit activity.

### Documented/current

- battle-drawn cards normally recycle to discard while hand commitments go to the Graveyard;
- partial draws are legal;
- Homeland Advantage and separate Heartland defense are current;
- Asset-bank capacity equals Territories controlled;
- v0.6 uses six factions with visible, interactive progress systems;
- Military remains the baseline conquest faction;
- factions should create parallel progress and remain connected to Gauntlet events;
- faction symbols and major leader mechanics are documented;
- multiplayer and future Engineer concepts are parked for v0.7;
- v0.5.7 is the final pre-faction cleanup baseline.

### Conversation-only or underdocumented before this audit

- individual player turns versus rounds needed explicit durable clarification;
- preliminary pacing targets and percentile reporting standards were not centralized;
- simulation evidence for the battle-card lifecycle was scattered;
- human-playtest and telemetry requirements were only partially preserved;
- the exact Asset-bank rule's snowball risk and the non-adopted minimum-2 comparison were not documented strongly enough as a matched pair;
- historical version rationale was fragmented.

### Promoted during this audit

- `docs/Gauntlet_Playtest_Targets_and_Metrics.md`
- `docs/Gauntlet_Development_History_and_Superseded_Directions.md`

### Work-in-progress retained as such

- exact faction balance;
- final faction names where still tabled;
- final card lists and Missions;
- final product packaging;
- future optional modules.

---

## 4.3 Digital Gauntlet Playtesting

### Documented/current

- digital development should begin with structured game data and a framework-neutral rules engine;
- deckbuilder and rules engine are distinct tools;
- hidden information requires public/private views;
- the same engine should serve CLI and GUI legal-action flows;
- digital implementation should expose physical-rules ambiguities;
- v0.5.7 rules clarifications record several ambiguities discovered through code;
- repository scripts expose test, typecheck, CLI, and GUI development modes.

### Documented/stale before this audit

- `data/README.md` described the project as an early data starter without clearly warning that it was not current canonical v0.6 data.
- `src/README.md` described only the earliest types/state scaffolding even though conversation and code history had added battle flow, Actions, Conditions, Asset-bank enforcement, occupation/capture, win evaluation, CLI logging, and a GUI.

### Current technical limitation

The CLI and GUI still initialize small `0.5.6-dev` example decks with placeholder IDs. The engine is not yet a complete implementation of v0.5.7 or the developing v0.6 factions.

### Promoted or corrected during this audit

- `docs/Gauntlet_Digital_Prototype_Roadmap.md`
- updated `src/README.md`
- updated `data/README.md`

---

## 4.4 Faction Leader Archetypes

### Documented/current

The current production-facing leader work is substantially preserved in:

- `docs/Gauntlet_v0.6_Leader_Archetype_and_Visual_Notes.md`
- `docs/Gauntlet_v0.6_Leader_Design_Bible.md`
- `docs/Gauntlet_v0.6_Character_Design_Sheet_Log.md`

This includes:

- the full twelve-leader roster;
- Colonial / early-modern-adjacent shared visual language;
- the mounted General on a white horse;
- Commandant visual contrast;
- Grand Inquisitor and Witch Hunter hat/material distinction;
- Alchemist laboratory direction and jeweler's loupe;
- Spirit Walker antlered ritual silhouette and cultural-appropriation guardrails;
- heavier, more aggressive Executive;
- Ranger direction combining Robert Rogers with expeditionary exploration;
- Spymaster terminology and design.

### Work-in-progress

- final archetypal reference figures for several leaders;
- final art for some designs;
- replacement for the placeholder Diplomat ability name `Good Offices`;
- some final ability names and production details.

### Audit decision

No leader mechanic should be changed merely because a visual archetype suggests something different. The Working Rules remain authoritative for mechanics.

---

## 4.5 Asset Bank Rule Impact

### Documented/current

- Asset-bank capacity equals Territories controlled;
- occupied Territories do not count until capture;
- Heartlands do not count;
- players discard down immediately if capacity contracts;
- Asset-bank scaling is intended to shorten games and connect infrastructure to board progress;
- four-player 2v2, cross-board, and FFA/Arena concepts are parked for v0.7.

### Important simulation finding

The exact rule shortened simulated games but also reduced comebacks and increased blowouts in the tested agent policies. A minimum-2 variant softened that effect.

### Final status

The minimum-2 variant was **not adopted**. It remains a reserved controlled comparison, not a current rule.

This distinction is now explicit in `docs/Gauntlet_Playtest_Targets_and_Metrics.md` and `docs/Gauntlet_Development_History_and_Superseded_Directions.md`.

---

## 4.6 Gauntlet Game Development

This transcript contains the original reconstruction of the old game and the full v0.5 core redesign process.

### Demonstrated problem

The user's earlier overhaul notes were responses to actual stalemate-heavy multiplayer playtests, not abstract brainstorming. That makes the redesign rationale durable project history.

### Adopted directions

- no movement rolls;
- intentional advance, remain, or withdraw choices;
- occupation before capture;
- defender counterattack window;
- start-of-turn capture if occupation survives;
- optional hand commitment plus three-card battle draw;
- limited battle-draw play;
- attacker effect order;
- Graveyard as permanent-loss zone;
- one Action or Battle play per turn;
- hand limit 3;
- face-down Territories revealed through exploration/contact;
- player-selected Territories remain hidden until revealed;
- core Territory, battle, and movement framework that developed into v0.5.3–v0.5.7.

### Rejected or superseded directions

- default round limit and control tiebreak;
- breach and exhaustion markers;
- movement rolls;
- routine backward movement from movement dice;
- old multi-card battle pileups;
- all played Battle cards permanently entering the Graveyard;
- Active Effects terminology;
- several obsolete Territory and card prototypes.

### Promoted during this audit

`docs/Gauntlet_Development_History_and_Superseded_Directions.md` now protects those distinctions from accidental revival.

---

## 4.7 Deckbuilder Tool Design

### Documented/current

The implemented v0.5 deckbuilder reflects the conversation's major approved requirements:

- static browser app without a required backend;
- separate available-card and current-deck panes;
- duplicate-card support;
- separate Territory selection;
- card-count and point validation;
- Arena and unique-card enforcement;
- save/load in browser storage;
- JSON import/export;
- text export;
- print-to-PDF layout;
- random deck generation;
- compact card and Territory browsers;
- desktop/mobile font normalization;
- version-tagged saves;
- no silent v0.5-to-v0.6 migration.

### Future work

v0.6+ mode still needs:

- faction and leader selection;
- faction legality filtering;
- v0.6 canonical data;
- faction-specific supplemental-card handling;
- updated printable layout and validation.

### Audit decision

One shared UI with versioned data and separate rules modules remains the intended architecture. This does not mean one set of saved decks is legal across versions.

---

## 4.8 Gauntlet Lore Development

### Conversation-only before this audit

This was the clearest major documentation gap.

### Current approved direction

- use late-medieval / early-modern / Colonial-adjacent material culture without making the world a direct fantasy version of real history;
- avoid a simple Old World / New World colonial-power analogue;
- keep mystery, ruins, frontier danger, and strange forces as background texture without making exploration the entire game;
- do not overcenter Heartlands in the setting;
- build the setting slowly rather than writing a complete history in one pass;
- treat the six factions as institutions from a shared civilization;
- explore an overarching authority that collapsed, leaving the six institutions competing for control or legitimacy.

### Rejected directions

- Age of Claims as the definitive premise;
- formal colonial legal fiction as the reason every Gauntlet exists;
- one ancient-road cosmology explaining every match;
- one universal throne, vault, weapon, or sacred prize;
- mystery/expedition as the whole identity.

### Promoted during this audit

`docs/Gauntlet_Lore_Development_Notes.md`

The setting remains WIP. The new document preserves direction and rejections without pretending unfinished possibilities are canon.

---

## 4.9 Gauntlet vs Old King's Crown

### Durable comparison lesson

Gauntlet's distinct identity is:

- linear territorial campaign;
- movement and contact-driven battles;
- occupation, counterattack, and capture;
- physical advance and reversal;
- breakthrough pressure.

Old King's Crown was discussed as a useful comparison for hidden commitment, hand tension, and faction identity, but also as a warning against accumulating too many procedures and subsystems.

### Audit decision

No separate gameplay rule was approved in this conversation. Its useful lesson is already represented in the Design Principles and current development history:

> Borrow tension and meaningful commitment, not subsystem density. Gauntlet should remain about territory, pressure, counterattack, and breakthrough.

---

## 5. Repository changes made from this audit

### New durable documents

- `docs/Gauntlet_Playtest_Targets_and_Metrics.md`
- `docs/Gauntlet_Lore_Development_Notes.md`
- `docs/Gauntlet_Development_History_and_Superseded_Directions.md`
- `docs/Gauntlet_Digital_Prototype_Roadmap.md`
- `docs/Gauntlet_Conversation_Audit_2026-07-10.md`

### Updated documentation

- `src/README.md`
- `data/README.md`
- `docs/Gauntlet_v0.6_Project_Audit.md`
- `docs/Gauntlet_v0.6_Conversation_Audit_Leads.md`
- `docs/Gauntlet_v0.6_Project_Index.md`

The final three updates are the closing integration step for this report.

---

## 6. Remaining work that is not a hidden-conversation gap

The following remain real project tasks, but the audit found no lost final decision that resolves them automatically:

- complete v0.6 card review beginning again at Scorched Earth;
- create canonical v0.6 card, Territory, faction, and leader data;
- finalize Missions and faction card lists;
- finish Diplomat v0.6.1 redesign questions;
- test faction balance in human play;
- choose the next explicit digital rules target;
- synchronize the digital engine with a complete canonical dataset;
- finish technical repository inventory where helpful;
- continue lore development one decision at a time;
- finalize remaining art and ability-name questions.

---

## 7. Audit conclusion

The exported conversations have now been reviewed as a complete set rather than sampled from memory.

The repository already contained the newest rules and card-review state in most areas. The audit's main value was recovering rationale, rejected directions, simulation benchmarks, lore constraints, and digital implementation status that were not safely preserved.

Those categories are now documented. Future work can proceed from the repository without requiring the raw transcripts to remain active project memory.
