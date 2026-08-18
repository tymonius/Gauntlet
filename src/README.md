# Gauntlet Digital Engine Work

This directory contains both the preserved legacy rules-engine prototype and the incremental migration toward the current published Gauntlet rules.

## Current authority boundary

The published rules baseline is **v0.6.3**. Engine-facing v0.6.3 content in `src/content/v063.ts` is loaded from the immutable release package:

- `releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json`
- `releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json`

The release manifest identifies the binding Rulebook source as `artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md`; the published package carries the corresponding Rulebook PDF. The release contract is authoritative. Pre-publication browser candidates are historical/provenance inputs, not the active engine content source.

## Migration layers

- `v063/` — current incremental v0.6.3 rule/card procedures and tests.
- `content/v063.ts` — published v0.6.3 content index for engine migration work.
- `v062/` — earlier versioned migration work retained as implementation history and selectively reused by the v0.6.3 layer.
- `state/`, `effects/`, `cards/`, `cli/`, and `gui/` — pre-v0.6 prototype architecture and interfaces. These remain useful implementation material but are **not** presumed v0.6.3-compatible.

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
