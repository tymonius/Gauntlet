# Gauntlet Digital Roadmap

**Status:** Active post-v0.6.0 roadmap.  
**Purpose:** Define the path from the current physical-game sources and browser tools to a versioned digital rules implementation.

The [official v0.6.0 rulebook](../releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md), definitive faction guides, Neutral pool, and Territory pool remain authoritative. Digital behavior must follow those sources and generated canonical data.

---

## 1. Current layers

### Canonical content

- `releases/v0.6.0/Gauntlet_v0.6.0_Canonical_Data.json`
- canonical Markdown rule and card sources
- generated release manifest

This layer defines versioned content and identifiers.

### Browser tools

- `deckbuilder/`
- `faction-sheets/`

These tools build Decks and render physical components. They are production tools, not rules engines.

### Legacy prototype

- `src/`
- `data/`

These files preserve a pre-v0.6 TypeScript experiment and starter data. They remain useful for architecture and tests but do not implement the canonical faction-era game.

---

## 2. Next supported target

The next engine milestone should support **v0.6.0 explicitly** rather than extending the legacy mixed-version state.

Before adding more interfaces:

1. define a versioned schema generated from canonical data;
2. map every shared rule to a legal state transition;
3. model player-specific hidden information;
4. implement setup, turns, movement, battles, occupation, control, capture, and Last Stand;
5. represent normal card destinations and Battle Hands exactly;
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
- Battle Hand formation and commitments;
- Defender's Advantage and the separate Last Stand bonus;
- retreat, occupation, capture, and running the Gauntlet;
- Draw Pile, hand, Battle Hand, Discard Pile, Graveyard, and Asset Bank;
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

Every implementation change should be checked against canonical source text, generated counts, deterministic replay tests, hidden-information boundaries, card-destination invariants, victory-route tests, matched physical-game examples, and [Playtest Targets and Metrics](Gauntlet_Playtest_Targets_and_Metrics.md).

Engine behavior never overrides the physical rules. An implementation mismatch is either a software defect or evidence that the source rule needs clarification.
