# Gauntlet Digital Prototype Roadmap

**Status:** Active development roadmap and current migration snapshot.  
**Current tabletop authority:** v0.6.3 — Third Playtest Revision  
**Scope:** Machine-readable game data, rules engine, CLI, GUI, playtest telemetry, and future remote play.

---

## 1. Purpose

The digital project exists to reduce the friction of Gauntlet playtesting:

- no repeated printing and cutting after every card update;
- remote or asynchronous testing;
- automatic enforcement of difficult timing and destination rules;
- rapid card-text iteration;
- structured logs and telemetry; and
- a shared source of truth between printable cards, Deckbuilder, Rules Arbiter, simulator, and digital play.

The digital prototype should remain a testing tool before it becomes a polished commercial game client.

---

## 2. Product layers

### A. Canonical game data

The current published machine-readable source is:

- `releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json`

It is generated from the v0.6.3 governing release sources and carries the current cards, Territories, factions, Leaders, deck-construction data, and related identifiers. It is authoritative for the published v0.6.3 release but must not be edited independently of its governing sources.

### B. Deckbuilder

The public Deckbuilder is a browser production tool for constructing, validating, saving, importing, exporting, and printing Decks. The current public default follows v0.6.3 release data.

Historical pre-faction modes and saved Deck formats may remain available for compatibility, but they must stay explicitly versioned. Old v0.5 Decks must never be silently treated as v0.6.3 Decks.

### C. Rules engine

The `/src` tree contains framework-neutral engine scaffolding and testable state logic. It preserves substantial earlier implementation work, but it is **not yet a complete v0.6.3 digital edition**.

A current engine must own:

- hidden and public information;
- legal actions;
- turn flow;
- movement;
- battles;
- Gambits, Reserves, and Tactics;
- card destinations;
- Actions, Assets, and Overlays;
- occupation and capture;
- Asset-bank limits;
- faction resources and additional victory systems; and
- win-condition evaluation.

### D. Development interfaces

- guided CLI for exercising engine flow and exporting logs;
- browser GUI for clickable local testing;
- later multiplayer or remote interface.

---

## 3. Current repository status

### Canonical release data exists

The earlier roadmap statement that no canonical v0.6 dataset existed is obsolete. v0.6.3 is published with canonical JSON, rulebook, six faction guides, a complete card and Territory reference, starter Deck data, and release manifests.

Digital implementation work must therefore synchronize to the published v0.6.3 package rather than reconstructing current rules from card-review notes or stale v0.5 records.

### Legacy data starter

The `/data` folder contains early machine-readable starter records and schema notes. It is legacy scaffolding, not current authority. Reuse schema ideas where useful, but do not let `/data` override the v0.6.3 release sources.

### TypeScript engine scaffold

The `/src` tree includes earlier work on authoritative and public/private state views, setup validation, turn and battle reducers, draw and reshuffle behavior, card cancellation and destinations, an Action framework, Asset-bank enforcement, Territory occupation/capture, win-condition evaluation, CLI logging, and browser development interfaces.

Those milestones remain useful architecture and regression evidence. Their existence does not prove v0.6.3 compatibility. Old fixture Decks, identifiers, terminology, and rule assumptions must be audited explicitly against the current release.

The former Condition-zone removal remains a durable architectural direction: persistent current effects should use the current canonical mechanisms—such as Assets, Territory Overlays, immediate resolution, or explicit card-specific state—rather than reintroducing a generic Condition zone.

---

## 4. Source-of-truth rules

Avoid maintaining several manually divergent current card databases.

For v0.6.3 digital work, use this hierarchy:

1. `releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md` for shared rules;
2. the six Markdown guides under `releases/v0.6.3/faction-guides/` for faction, Leader, and supplemental-component rules;
3. `releases/v0.6.3/Gauntlet_v0.6.3_Card_and_Territory_Reference.md` for exact playable-card and Territory text; and
4. `releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json` as the generated machine-readable release dataset and stable identifier source.

The implementation must not invent current text from stale v0.5 data, superseded working rules, or old implementation ledgers.

### Saved deck and game compatibility

Every saved Deck or game should permanently record:

- game version;
- ruleset mode where needed;
- faction and Leader;
- card IDs and quantities;
- Territory IDs; and
- any engine/schema version needed to replay the state safely.

Do not automatically migrate Decks or saved games across a major rules boundary. Offer explicit conversion review or read-only legacy behavior instead.

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

1. current turn and battle sequence;
2. card destinations;
3. movement, occupation, capture, and running the Gauntlet;
4. Asset-bank limits;
5. common Actions, Assets, and Overlays;
6. Territory effects;
7. faction resources and victory systems; and
8. unusual card exceptions.

Unimplemented effects must be visible and explicit. The engine must never silently pretend an unknown card has resolved correctly.

### Deterministic logs

A development session should be reproducible where practical through:

- initial state;
- deck order or seed;
- ordered action log;
- errors and rejected actions;
- final state; and
- rules/data version.

---

## 6. Historical rules-clarity evidence

Earlier digital implementation exposed several physical-rule ambiguities and helped drive later published clarifications. Historical v0.5.7 and v0.6 implementation notes remain useful regression evidence for issues such as draw/reshuffle behavior, hidden commitments, card destinations, persistent effects, cancellation/negation, copied effects, movement, and Territory state.

Treat those records as provenance. Current expected behavior must be derived from v0.6.3, not from the historical wording itself.

Continue using digital implementation as a rules-clarity test: when code exposes a genuine ambiguity in the current sources, resolve it in the physical rules pipeline rather than burying the answer only in engine behavior.

---

## 7. Current audit findings

### Current and authoritative

- v0.6.3 canonical release data exists.
- The public release and browser-tool defaults target v0.6.3.
- Current governing rules are versioned and available in the release package.
- Saved Decks and games must remain version-tagged.
- The framework-neutral engine direction and public/private state boundary remain valid.

### Legacy or transitional

- `/data` remains starter/legacy scaffolding rather than current canonical data.
- `/src` contains useful engine scaffolding but requires a complete v0.6.3 compatibility audit.
- Some development fixtures and effect handlers may still use pre-faction or earlier-v0.6 identifiers, terminology, or behavior.
- Version-specific historical tests and routes should remain version-specific rather than being globally renamed to v0.6.3.

### Work in progress

- full v0.6.3 engine synchronization;
- complete current card and Territory effect coverage;
- complete faction and Leader systems;
- persistent game save/load;
- reproducible telemetry tied to the current playtest standard;
- remote multiplayer;
- polished player UI; and
- automated playtest analysis.

---

## 8. Next implementation sequence

1. Make v0.6.3 the explicit supported engine target.
2. Generate or load engine-facing content from the v0.6.3 canonical dataset rather than legacy starter records.
3. Audit every existing reducer, fixture, identifier, and automated effect against the current rules.
4. Replace placeholder or legacy example Decks with validated v0.6.3 Deck data.
5. Run an end-to-end guided game and log every missing or incorrect interaction.
6. Implement remaining common Territory, card, faction, and Leader effects in priority order.
7. Add explicit manual-resolution hooks for effects not yet automated.
8. Add playtest telemetry based on `Gauntlet_Playtest_Targets_and_Metrics.md`.
9. Add version-safe save/load for local sessions.
10. Add network transport only after authoritative/private-state boundaries and deterministic replay are stable.

---

## 9. Definition of a useful v0.6.3 playable prototype

A digital build is ready for meaningful remote or local v0.6.3 playtesting when it can:

- create legal Decks from the v0.6.3 canonical data;
- initialize the complete current board state;
- enforce hidden Hands, Gambits, Reserves, and Tactics correctly;
- execute the current turn and battle flow;
- handle draws, reshuffles, destinations, cancellation, and negation correctly;
- resolve occupation, counterattack, capture, and running the Gauntlet;
- enforce Asset-bank capacity and persistent state;
- implement or visibly flag every current card, Territory, faction, Leader, and supplemental-component effect;
- evaluate all current victory routes;
- save a reproducible, version-tagged log; and
- complete a full game without direct state editing.

It does not need final art, animation, matchmaking, accounts, or a commercial-grade interface to meet this milestone.
