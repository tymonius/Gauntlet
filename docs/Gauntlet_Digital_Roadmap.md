# Gauntlet Digital Roadmap

**Status:** Active post-v0.6.3 roadmap.  
**Purpose:** Define the path from the current physical-game sources and browser tools to a versioned digital rules implementation.

The [official v0.6.3 rulebook](../releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md), the six faction guides under `releases/v0.6.3/faction-guides/`, the [Card and Territory Reference](../releases/v0.6.3/Gauntlet_v0.6.3_Card_and_Territory_Reference.md), and generated canonical data are authoritative. Digital behavior must follow those sources.

The detailed legacy-to-v0.6 subsystem assessment and acceptance criteria are maintained in the [v0.6 Digital Migration Audit](Gauntlet_v0.6_Digital_Migration_Audit.md).

---

## 1. Current layers

### Canonical content

- `releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json`
- `releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md`
- `releases/v0.6.3/faction-guides/*/Gauntlet_v0.6.3_*_Faction_Guide.md`
- `releases/v0.6.3/Gauntlet_v0.6.3_Card_and_Territory_Reference.md`
- `releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json`

This layer defines the current versioned content and identifiers.

### Browser tools

- `deckbuilder/`
- `faction-sheets/`

These tools build Decks and render physical components. They are production tools, not rules engines.

### Legacy prototype

- `src/`
- `data/`

These files preserve an earlier TypeScript experiment and starter data. They remain useful for architecture and tests but must not be treated as an implementation of the current v0.6.3 rules unless explicitly synchronized and validated against the release sources.

---

## 2. Next supported target

The next engine milestone should support **v0.6.3 explicitly** rather than extending the legacy mixed-version state.

Before adding more interfaces:

1. define a versioned schema generated from v0.6.3 canonical data;
2. map every shared rule to a legal state transition;
3. model player-specific hidden information;
4. implement setup, turns, movement, battles, occupation, control, capture, and running the Gauntlet;
5. represent Gambits, Reserves, Tactics, and normal card destinations exactly;
6. identify unsupported card effects explicitly; and
7. save the rules version with every game, Deck, and log.

Do not silently migrate legacy saved data or infer missing faction behavior.

---

## 3. Engine boundaries

The engine should own legal-action generation, state validation, deterministic transitions, random-event requests and recorded results, card-zone changes, timing windows, victory evaluation, and player-specific views.

Interfaces should request legal actions from the engine, display only permitted state, collect choices, avoid reproducing legality independently, and surface manual-resolution or unsupported-effect warnings.

Canonical content generation, engine logic, and interface code should remain separate.

---

## 4. Implementation order

### Phase A — canonical core

- setup and Deck validation;
- turn sequence and Action Opportunities;
- movement and occupied-position battles;
- Gambit, Reserve, and Tactic handling;
- current battle tiebreak and defensive procedures;
- retreat, occupation, capture, and running the Gauntlet;
- Draw Pile, Hand, Reserve, Discard Pile, Graveyard, and Asset Bank;
- Assets, Overlays, and Territory orientation.

### Phase B — shared card framework

- effect registry keyed to canonical card IDs;
- target validation and partial resolution;
- cancellation and negation;
- copied and repeated Battle effects;
- destination overrides;
- manual-resolution fallback with explicit state annotations.

### Phase C — factions

Implement one complete faction at a time, including both Leaders and supplemental components, in canonical order: Military, Diplomats, Financiers, Intelligence, Mystics, and Inquisition.

A faction is not complete until its additional victory condition, trackers, hidden information, and all twelve cards are supported or explicitly marked manual.

### Phase D — interfaces and telemetry

- guided local interface;
- save/load;
- reproducible logs;
- playtest metrics export;
- local two-player hot-seat mode;
- remote play only after deterministic local games are stable.

---

## 5. Validation

Every implementation change should be checked against the v0.6.3 canonical source text, generated counts, deterministic replay tests, hidden-information boundaries, card-destination invariants, victory-route tests, matched physical-game examples, and [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md).

Engine behavior never overrides the physical rules. An implementation mismatch is either a software defect or evidence that the source rule needs clarification.
