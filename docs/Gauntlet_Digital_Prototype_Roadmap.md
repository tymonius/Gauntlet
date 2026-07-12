# Gauntlet Digital Prototype Roadmap

**Status:** Active development roadmap and audit snapshot.  
**Scope:** Machine-readable game data, rules engine, CLI, GUI, playtest telemetry, and future remote play.

---

## 1. Purpose

The digital project exists to reduce the friction of Gauntlet playtesting:

- no repeated printing and cutting after every card update;
- remote or asynchronous testing;
- automatic enforcement of difficult timing and destination rules;
- rapid card-text iteration;
- structured logs and telemetry;
- a shared source of truth between printable cards, deckbuilder, simulator, and digital play.

The digital prototype should remain a testing tool before it becomes a polished commercial game client.

---

## 2. Product layers

Treat the digital work as related but distinct layers.

### A. Canonical game data

Versioned machine-readable records for:

- cards;
- Territories;
- factions;
- leaders;
- deck-construction rules;
- recommended decks;
- global game configuration;
- timing and destination metadata.

### B. Deckbuilder

A lightweight static browser tool for constructing, validating, saving, importing, exporting, and printing decks.

The deckbuilder is not the rules engine.

### C. Rules engine

Framework-neutral TypeScript state and reducer logic for:

- hidden and public information;
- legal actions;
- turn flow;
- movement;
- battles;
- card commitment and battle draw;
- card destinations;
- Actions, Assets, and Overlays;
- occupation and capture;
- Asset-bank limits;
- win-condition evaluation.

### D. Development interfaces

- guided CLI for exercising engine flow and exporting logs;
- browser GUI for clickable local testing;
- later multiplayer or remote interface.

---

## 3. Current repository status

The repository already contains more than an initial data stub.

### Deckbuilder

The `/deckbuilder` app supports the v0.5 pre-faction ruleset, including:

- canonical card and Territory loading;
- search and filtering;
- duplicates;
- card-count and point validation;
- Territory and Arena rules;
- unique-card limits;
- local saves;
- JSON import/export;
- text export;
- print-to-PDF layout.

The intended v0.6 upgrade is a separate rules/data mode using the shared UI shell. Old v0.5 decks should not be silently migrated into v0.6.

### Data starter

The `/data` folder contains early machine-readable starter records and schema notes. It is not the current authoritative v0.6 card source.

### TypeScript engine

The `/src` tree contains framework-neutral engine scaffolding and testable state logic.

Implemented development milestones include:

- authoritative and public/private state views;
- setup validation and initialization;
- turn and battle reducers;
- battle commitments and battle draw;
- partial draws and reshuffling;
- Homeland Advantage and Heartland defense;
- card cancellation and destination handling;
- initial specific Battle effects;
- Action-card framework and legal Action affordances;
- Asset-bank enforcement and persistent Assets;
- player-selected Asset-bank discard-down;
- Territory occupation, capture, and control changes;
- centralized win-condition evaluation;
- start-of-turn automation;
- guided CLI;
- CLI session logging;
- browser development GUI.

The former Condition zone has been removed from the state model, reducers, public/private views, CLI, GUI, and affected tests. Persistent v0.6 effects must use Assets, Territory Overlays, immediate resolution, or explicit card-specific self-tracking.

The root package scripts currently expose:

```text
npm run dev:cli
npm run dev:gui
npm test
npm run typecheck
```

### Important limitation

The CLI and GUI still initialize small `0.5.6-dev` example decks with placeholders. The existence of an engine feature does not prove that the full current card pool or v0.6 factions are implemented correctly.

The prototype is an engine and interface scaffold, not yet a complete digital edition.

---

## 4. Source-of-truth rules

Avoid maintaining several manually divergent card databases.

### Versioned authority

For a released ruleset, the matching canonical release data should control card names, costs, text, deck limits, and Territory data.

For v0.6 development:

- approved card-review decisions live in the Card Review Log and Metadata registry until canonical v0.6 data is created;
- approved Territory wording and general rules live in the Territory review files and Working Rules;
- the digital engine must not invent final v0.6 text from stale v0.5 records;
- a v0.6 digital mode should not be declared current until its data and rules implementation are synchronized with the v0.6 working sources.

No canonical v0.6 dataset exists yet because several exact card texts, Intelligence Missions, and faction packages remain unresolved.

### Saved deck compatibility

Every saved deck should permanently record:

- game version;
- ruleset mode;
- faction and leader, where applicable;
- card IDs and quantities;
- Territory IDs.

Do not automatically migrate decks across a major rules boundary such as v0.5 to v0.6. Offer explicit import, conversion review, or read-only legacy mode instead.

---

## 5. Architecture guardrails

### Pure engine first

Keep game-state logic separate from display code.

- UI asks the engine for legal actions.
- UI submits actions to reducers or a public game API.
- UI should not reproduce legality rules independently.
- Tests should exercise engine state without requiring a browser.

### Public and private views

The authoritative state may contain hidden information. Each player-facing interface should receive only the legal private view for that player plus public state.

This is essential before remote multiplayer.

### Incremental effect automation

Do not block useful playtesting until every card is executable.

Prioritize:

1. battle sequence;
2. card destinations;
3. movement, occupation, and capture;
4. Asset-bank limits;
5. common Actions and Assets;
6. Territory effects and Overlays;
7. faction resources and victory systems;
8. unusual card exceptions.

Unimplemented effects must be visible and explicit. The engine should not silently pretend an unknown card has resolved correctly.

### Deterministic logs

A development session should be reproducible where practical through:

- initial state;
- deck order or seed;
- ordered action log;
- errors and rejected actions;
- final state;
- rules/data version.

---

## 6. Physical-rule clarifications discovered digitally

Digital implementation exposed several rules that required explicit physical clarification. These are now documented in the v0.5.7 clarification file:

- Homeland Advantage applies while defending any controlled space.
- Heartland defense separately grants +1.
- tied battles reroll unless Homeland Advantage resolves the tie.
- draw as many cards as possible and reshuffle only the discard pile.
- partial draws are legal.
- battle-draw amount may be modified.
- players may pass during hand commitment and may play fewer battle-drawn cards than allowed.
- battle-drawn cards are not hand commitments.
- Watchtower reveals the attacker's normal hand commitment to both players.
- canceled hand commitments return to hand; canceled battle-drawn cards go to discard.

v0.6 development has also clarified:

- Action-card plays and Battle hand commitments use independent allowances;
- voluntary Asset removal uses an Action opportunity;
- Conditions do not exist in v0.6;
- Territory printed effects are governed by face-up state and their own text;
- Ruins are Territory Overlays and only one may occupy a Territory;
- negated cards have no effect but normally retain their destination;
- effects that resolve another Battle effect cannot recurse through another such effect.

Continue treating digital implementation as a rules-clarity test. Any ambiguity found by code should be resolved in physical rules documentation, not only buried in engine behavior.

---

## 7. Current audit findings

### Documented/current

- Static v0.5 deckbuilder requirements and major UI decisions.
- Separate v0.5 and v0.6+ data/rules modes.
- Version-tagged saved decks and no silent cross-version migration.
- Framework-neutral engine direction.
- CLI and GUI development entry points.
- v0.5.7 physical rules clarifications discovered through implementation.
- Full v0.6 playable-card and Territory review checkpoints.
- Condition retirement in the active rules and development state model.
- Current `/src` implementation status and limitations in `src/README.md`.

### Documented/stale or transitional

- `/data` remains starter scaffolding rather than current v0.6 canonical data.
- Development examples still identify themselves as `0.5.6-dev` even though v0.5.7 is the latest pre-faction release and v0.6 development is active.
- The implemented card subset still uses some v0.5 IDs and behavior that must be replaced or versioned before a v0.6-development mode is authoritative.

### Work-in-progress

- full current card/Territory implementation;
- full v0.5.7 synchronization;
- canonical v0.6 data;
- v0.6 faction implementation;
- persistent game save/load;
- remote multiplayer;
- polished UI;
- automated playtest telemetry dashboard.

---

## 8. Next implementation sequence

1. Choose the next supported digital rules target explicitly: complete v0.5.7 or begin a separate v0.6-development mode.
2. Resolve the remaining v0.6 exact-text and faction-package blockers before treating any v0.6 data as canonical.
3. Replace placeholder development decks with validated canonical deck data for the chosen mode.
4. Run an end-to-end guided game through the GUI and log every missing or incorrect interaction.
5. Implement the remaining common Territory and card effects in priority order.
6. Add clear placeholders or manual-resolution hooks for effects not yet automated.
7. Add playtest telemetry based on `Gauntlet_Playtest_Targets_and_Metrics.md`.
8. Add save/load for local sessions.
9. Add network transport only after authoritative/private-state boundaries are stable.
10. Build polished player onboarding only after the ruleset selected for the client is reasonably frozen.

---

## 9. Definition of a useful playable prototype

A digital build is ready for meaningful remote or local playtesting when it can:

- create legal decks from a named canonical version;
- initialize a complete six-Territory board;
- enforce hidden hands and commitments;
- execute normal turn and battle flow;
- handle partial draws and destinations;
- resolve occupation, counterattack, capture, and Heartland victory;
- enforce Asset-bank capacity and discard choices;
- represent persistent effects through Assets and Overlays without a Condition zone;
- identify every unimplemented effect before it matters;
- save a reproducible log;
- complete a full game without direct state editing.

It does not need final art, animation, matchmaking, accounts, or a commercial-grade interface to meet this milestone.
