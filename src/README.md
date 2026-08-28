# Gauntlet Digital Engine Work

This directory contains the preserved legacy prototype plus the incremental migration toward the current published Gauntlet rules.

## Current authority boundary

The published digital-rules baseline is **v0.7.0**. Engine-facing released content is loaded from:

- `releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json`
- `releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json`

The release manifest identifies `digital_rules: v0.7.0`. The published package is authoritative. Transitional v0.6.4 candidate bundles and earlier releases remain provenance and implementation history, not the current engine content source.

## Migration layers

- `content/v070.ts` — published v0.7.0 content index and release-contract validation.
- `v070/rules.ts` — released v0.7.0 shared turn, movement, Onset, withdrawal, battle-outcome, and Last Stand surface.
- `v064/` — transitional Onset implementation retained as historical migration evidence after its relevant shared procedures were audited into `v070/rules.ts`.
- `v063/` — substantial validated procedure library from the v0.6.3 migration: setup, Front Line/Capture, copied/repeated effects, Arcane Knowledge, Manifest Destiny, dynamic Territories/Deeds, and all printed Territory/Arena procedures. These remain explicitly versioned until individually revalidated against v0.7.0.
- `content/v063.ts` — immutable v0.6.3 release adapter retained for historical/versioned regression tests.
- `state/`, `effects/`, `cards/`, `cli/`, and `gui/` — pre-faction/earlier playable architecture. Useful scaffolding, but not presumed v0.7.0-compatible.

The live `content/current.ts` boundary now identifies v0.7.0 and exposes the released v0.7.0 shared-rules API. Older procedure libraries remain visible only under their explicit versioned names until promoted deliberately.

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
