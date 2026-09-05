# Historical digital-engine migration snapshots

This subtree preserves versioned digital-engine migration implementations that have been superseded by promoted engine code but remain useful as historical implementation evidence.

## v0.6.2

`v0.6.2/` contains the superseded v0.6.2 rules/card/faction migration implementation and its tests formerly under `src/v062/`. The still-active v0.6.3 migration layer only requires a small set of its type shapes, which remain temporarily exposed through the type-only `src/v062/rules.ts` bridge until the v0.6.3 procedures are promoted or retired.

The archived v0.6.2 source and tests are historical provenance, not active engine behavior, and are intentionally outside the default TypeScript/Vitest authority boundary.

## v0.6.4

`v0.6.4/` contains the retired Onset/movement transition implementation formerly under `src/v064/`. Its relevant shared battle and movement procedures were audited into the promoted v0.7.0 rules layer before this archival move.

The archived source and test blobs are retained byte-for-byte, including their original relative imports into the v0.6.2/v0.6.3 migration layers. They are provenance snapshots rather than an in-place executable package and are intentionally outside the active `src/**/*.ts` typecheck/test boundary.

Do not add new engine behavior here. Revalidated behavior belongs in the maintained promoted engine layer.
