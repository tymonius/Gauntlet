# Historical digital-engine migration snapshots

This subtree preserves versioned digital-engine migration implementations that have been superseded by promoted engine code but remain useful as historical implementation evidence.

## v0.6.4

`v0.6.4/` contains the retired Onset/movement transition implementation formerly under `src/v064/`. Its relevant shared battle and movement procedures were audited into the promoted v0.7.0 rules layer before this archival move.

The archived source and test blobs are retained byte-for-byte, including their original relative imports into the v0.6.2/v0.6.3 migration layers. They are provenance snapshots rather than an in-place executable package and are intentionally outside the active `src/**/*.ts` typecheck/test boundary.

Do not add new engine behavior here. Revalidated behavior belongs in the maintained promoted engine layer.
