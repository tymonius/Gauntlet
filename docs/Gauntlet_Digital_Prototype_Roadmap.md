# Gauntlet Digital Prototype Roadmap

**Status:** Active development roadmap and current migration snapshot.  
**Current digital-rules authority:** v0.7.0 — Illustrated Cards & Tabletop Simulator  
**Scope:** Machine-readable game data, rules engine, local development clients, playtest telemetry, and future remote play.

---

## 1. Purpose

The digital project exists to reduce the friction of Gauntlet playtesting:

- no repeated physical setup or manual rules bookkeeping;
- remote play;
- automatic enforcement of timing, hidden information, and card destinations;
- rapid rules/card iteration;
- deterministic logs and telemetry; and
- one released data contract shared by the engine and player-facing tools.

The first milestone is a reliable playtest client, not a polished commercial game.

---

## 2. Current authority

The published digital-rules authority is v0.7.0:

- `releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json`
- `releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md`
- `releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json`
- `releases/v0.7.0/Gauntlet_v0.7.0_Starter_Decks.json`

The release manifest explicitly identifies `digital_rules: v0.7.0`. Current engine work must derive identity, rules metadata, card text, Territory text, and starter Decks from the published v0.7.0 package rather than from historical candidate sources.

`game-data/current-game.json` remains useful as the project-level current-game authority and provenance record. Transitional v0.6.4 source bundles remain historical inputs, not the released engine authority.

---

## 3. Existing engine foundation

The repository already contains substantial reusable implementation work.

### Current/recent migration layers

- `src/content/v070.ts` — release-bound v0.7.0 content adapter and validation boundary.
- `src/v070/rules.ts` — released shared-rules surface for turn flow, movement, Onset, withdrawal, battle outcome, and Last Stand.
- `src/v064/` — transitional Onset migration retained as historical implementation evidence.
- `src/v063/` — validated procedures developed during the v0.6.3 parity migration, including setup, Front Line/Capture, copied/repeated effects, Arcane Knowledge, Manifest Destiny, dynamic Territories/Deeds, and all 25 Territory/Arena procedures.
- `src/state/`, `src/effects/`, `src/cards/`, `src/cli/`, and `src/gui/` — older playable-prototype architecture and interfaces. These remain useful scaffolding but are not presumed current-compatible.

The old parked branch `feature/v061-digital-engine-migration` is historical salvage material only. It diverged before thousands of later repository commits and must not be merged wholesale.

---

## 4. v0.7.0 migration boundary

v0.7.0 is not merely a visual/TTS release from the engine's perspective. The published contract includes rule and content changes that must be represented explicitly.

Known release deltas from the v0.6.3 engine baseline include:

- 142 playable cards instead of 128;
- 52 Neutral cards and 15 cards in each faction;
- 15 newly added cards and retirement of **No Martyrs**;
- explicit Onset procedure and battle-occurrence boundary;
- Terms during Onset;
- Diplomat Peace Treaty threshold of 6 ratified Proposals;
- current card/Territory wording and component contracts; and
- current v0.7.0 faction-feature and Leader metadata.

No `v063` or `v064` procedure becomes v0.7.0 behavior merely by re-exporting or renaming it. Each reusable behavior must be checked against the published v0.7.0 contract.

---

## 5. Architecture guardrails

### Pure authoritative engine

- UI asks the engine for legal actions.
- UI submits actions to the engine.
- UI does not duplicate legality rules.
- Game logic remains testable without a browser.

### Public/private views

The authoritative state may contain every hidden card and choice. Player views must expose only information legal for that viewer. This boundary must be complete before network multiplayer.

### Physical instance identity

Duplicate card titles, bound cards, stored cards, Gambits, Tactics, Reserve cards, Overlays, and dynamic Territories must retain physical instance identity wherever later instructions can refer to the exact card.

### Explicit unsupported behavior

Unimplemented effects must be visible and block or request manual resolution. The engine must never silently treat an unknown effect as resolved.

### Deterministic replay

A development game should record:

- rules/content version;
- initial Decks and Territory order;
- seed or shuffled order where applicable;
- ordered player actions and choices;
- rejected actions/errors;
- all random outcomes; and
- final state.

---

## 6. Implementation sequence

### Completed — released authority

1. Bind an engine content adapter directly to the v0.7.0 release manifest and canonical JSON.
2. Lock release counts, added/retired card identities, Onset metadata, and key v0.7.0 rule deltas in tests.
3. Update engine documentation and issue tracking to v0.7.0.

### Completed — current shared-rules surface

4. Replace the live `src/content/current.ts` candidate boundary with a v0.7.0 surface.
5. Audit the transitional Onset implementation against the released Onset, Terms, withdrawal, movement, battle, and Last Stand contract.
6. Promote those validated procedures into `src/v070/rules.ts`; keep all other historical procedures explicitly versioned until separately revalidated.

### Next — executable game state

7. Build/finish an authoritative v0.7.0 game-state reducer that owns setup, turn progression, movement, battles, Capture, zones, Assets, Overlays, faction resources, and victory.
8. Wire existing v0.6.3 procedure modules into that reducer only after v0.7.0 revalidation.
9. Add the 15 new v0.7.0 cards and retire No Martyrs from executable content.
10. Revalidate all existing card, Territory, Leader, and faction procedures against current text.

### Then — complete local playable client

11. Replace placeholder/legacy CLI and GUI setup with certified v0.7.0 starter Decks.
12. Complete private/public player views.
13. Expose legal actions and required choices through the development GUI.
14. Complete a full deterministic local game without direct state editing.

### Finally — multiplayer and telemetry

15. Add version-safe save/load and replay.
16. Add playtest telemetry based on `Gauntlet_Playtest_Targets_and_Metrics.md`.
17. Add network transport only after authoritative state and privacy boundaries are stable.
18. Add synchronization/reconnect tests and remote-play validation.

---

## 7. Definition of a useful v0.7.0 playable prototype

The digital build may claim v0.7.0 playtest compatibility when it can:

- initialize certified v0.7.0 Decks, Leaders, faction components, and Territories;
- execute current setup and turn flow;
- enforce hidden Hands, Gambits, Reserves, Tactics, and hidden faction components;
- execute Onset, Terms, Gambits, Reserves, Tactics, outcome, and Aftermath correctly;
- handle draws, reshuffles, destinations, cancellation, negation, copied/repeated effects, Assets, and Overlays;
- resolve movement, occupation, Capture, Front Lines, dynamic Territories, and Last Stand;
- enforce all six faction systems and twelve Leader abilities;
- implement or explicitly halt for every current card and Territory effect;
- evaluate Run the Gauntlet and all current additional victory routes;
- provide legal private/public views;
- save a deterministic, version-tagged replay log; and
- complete a full game without direct state editing.

Final art, animation, matchmaking, accounts, and commercial-grade UX are outside this milestone.
