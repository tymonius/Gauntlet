# Gauntlet Digital Engine Work

This directory contains both the preserved legacy rules-engine prototype and the incremental migration toward the current published Gauntlet rules.

## Current authority boundary

The published rules baseline is **v0.6.3**. Engine-facing v0.6.3 content in `src/content/v063.ts` is loaded from the immutable release package:

- `releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json`
- `releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json`

The release manifest identifies the binding Rulebook source as `artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md`; the published package carries the corresponding Rulebook PDF. The release contract is authoritative. Pre-publication browser candidates are historical/provenance inputs, not the active engine content source.

## Migration layers

- `v063/` — current incremental v0.6.3 rule/card procedures and tests. The rules module owns the migrated v0.6.3 runtime surface for setup, Front Line/Capture, movement, retreat/withdrawal, battle outcome, and Last Stand. The card module owns the migrated shared card procedures plus Invasion, Landslide, Détente, Compound Interest, Extraordinary Rendition, Nature's Altar, and Martyrdom. `copied-effects.ts` owns the shared v0.6.3 apply/repeat contract, including physical source-instance references where later instructions need to move the exact selected card. `arcane-knowledge.ts` implements Arcane Knowledge without the legacy title whitelist or virtual battle-card replay, and `copied-effect-callers.ts` migrates Heresy, Rend the Veil, and Witchcraft onto that same contract. `gauntlet.ts` adds an ordered dynamic-Territory layer over the Front Line model, including normal Deeds, control-derived Asset/Capital limits, Deed income/cost, and Controlling Interest. `manifest-destiny.ts` uses that shared topology rather than treating Manifest Destiny as a special pseudo-Territory. `territories.ts` owns the non-battle and persistent Territory-effect runtime for Quicksand, Difficult Terrain, Disrupted Supply Lines, Ruined Storehouse, Supply Depot, Refuge, Command Tent, Monastery, King's Road, Toll Bridge, and Smuggler's Run. `territory-battles.ts` completes the published 25-Territory runtime with Poisonous Gas, Garrison, Field Hospital, Exposed Flank, High Ground, Fortified Pass, Insurgency, Watchtower, Old Battlefield, Training Grounds, and all four Arenas. None of these current modules re-export v0.6.2 runtime behavior.
- `content/v063.ts` — published v0.6.3 content index for engine migration work.
- `v062/` — earlier versioned migration work retained as implementation history. Stable structural types may still be shared deliberately, but current v0.6.3 rules and card behavior must not be inherited through blanket runtime exports.
- `state/`, `effects/`, `cards/`, `cli/`, and `gui/` — pre-v0.6 prototype architecture and interfaces. These remain useful implementation material but are **not** presumed v0.6.3-compatible. Their old replay/virtual-card implementations for Arcane Knowledge, Rend the Veil, and Witchcraft remain historical until those shells are explicitly wired to the active v0.6.3 procedures.

Issue #741 tracks the full synchronization of the playable engine with v0.6.3. The existence of a `v063/` adapter or passing tests for an implemented procedure does not imply complete engine parity; unsupported or stale legacy behavior must remain explicit until migrated and validated.

## Development commands

From the repository root:

```bash
npm install
npm run typecheck
npm test
npm run dev:cli
npm run dev:gui
```

The broad development commands still exercise legacy code as well as versioned migration code. Passing them demonstrates repository consistency, not completion of #741.

## Reuse policy

Reuse legacy architecture deliberately. New or retained gameplay behavior must be checked against the published v0.6.3 Rulebook and canonical data rather than inherited from an older prototype merely because a handler or test already exists.
