# Gauntlet Digital Engine Work

This directory contains the preserved legacy prototype plus the incremental migration toward the current published Gauntlet rules.

## Current authority boundary

The published digital-rules baseline is **v0.7.0**. Engine-facing released content is loaded from:

- `releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json`
- `releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json`

The release manifest identifies `digital_rules: v0.7.0`. The published package is authoritative. Transitional v0.6.4 candidate bundles and earlier releases remain provenance and implementation history, not the current engine content source.

## Migration layers

- `content/v070.ts` — published v0.7.0 content index and release-contract validation.
- `v064/` — transitional Onset implementation developed against the former v0.6.4 candidate. Reuse only after checking each procedure against v0.7.0.
- `v063/` — substantial validated procedure library from the v0.6.3 migration: setup, turn flow, Front Line/Capture, movement, retreat/withdrawal, battle outcome, Last Stand, copied/repeated effects, Arcane Knowledge, Manifest Destiny, dynamic Territories/Deeds, and all printed Territory/Arena procedures.
- `content/v063.ts` — immutable v0.6.3 release adapter retained for historical/versioned regression tests.
- `state/`, `effects/`, `cards/`, `cli/`, and `gui/` — pre-faction/earlier playable architecture. Useful scaffolding, but not presumed v0.7.0-compatible.

The current live behavioral surface still contains transitional v0.6.4 wiring. It must not be described as v0.7.0-compatible until the released Onset/Terms contract and all dependent procedures are audited and promoted deliberately.

Issue #741 tracks completion of the playable engine against the current released rules.

## v0.7.0 content delta

The current release contains:

- 142 playable titles;
- 52 Neutral cards;
- 15 cards in each of six factions;
- 25 Territories/Arenas;
- 12 Leaders.

Relative to the v0.6.3 baseline, v0.7.0 adds 15 cards, retires **No Martyrs**, formalizes Onset/Terms timing, and raises the Diplomat Peace Treaty threshold to six ratified Proposals. Current behavior must come from the released v0.7.0 contract, not from old tests or candidate terminology.

## Development commands

From the repository root:

```bash
npm install
npm run typecheck
npm test
npm run dev:cli
npm run dev:gui
```

The broad development commands still exercise legacy/versioned code as well as current migration work. Passing them demonstrates repository consistency, not complete v0.7.0 parity.

## Reuse policy

Reuse architecture and procedures deliberately. A historical handler is evidence, not authority. New or retained gameplay behavior must be checked against the published v0.7.0 Rulebook and canonical data before it is exposed through the current engine surface.
