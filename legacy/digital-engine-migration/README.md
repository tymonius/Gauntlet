# Historical digital-engine migration snapshots

This subtree preserves versioned digital-engine migration implementations that have been superseded by promoted engine code but remain useful as historical implementation evidence.

## v0.6.2

`v0.6.2/` contains the superseded v0.6.2 rules/card/faction migration implementation and its tests formerly under `src/v062/`. The v0.6.3 snapshot owns the four type shapes it needed in its own rules module; no v0.6.2 bridge remains in active source.

The archived v0.6.2 source and tests are historical provenance, not active engine behavior, and are intentionally outside the default TypeScript/Vitest authority boundary.

## v0.6.3

The `procedures/` and `content/` subdirectories preserve the stale migration library, its release adapter, and all associated tests. These are historical snapshots, not maintained rules or an executable package. Their original relative imports and bytes are retained as evidence. Do not continue developing this old rules version.

The obsolete cross-surface closeout builder and validator are preserved under `docs/recovery/frozen-scripts/v0.6.3/` with blob locks in `config/release-locks.json`.

## v0.6.4

`v0.6.4/` contains the retired Onset/movement transition implementation formerly under `src/v064/`. Its relevant shared battle and movement procedures were audited into the promoted v0.7.0 rules layer before this archival move.

The `content/` subdirectory also preserves the retired candidate content adapter and its test from the active content directory. It had no maintained consumers and pulled reconstruction snapshots into the active TypeScript dependency graph. The promoted release adapter remains the engine content boundary.

The archived source and test blobs are retained byte-for-byte, including their original relative imports into the v0.6.2/v0.6.3 migration layers. They are provenance snapshots rather than an in-place executable package and are intentionally outside the active `src/**/*.ts` typecheck/test boundary.

Do not add new engine behavior here. Revalidated behavior belongs in the maintained promoted engine layer.
