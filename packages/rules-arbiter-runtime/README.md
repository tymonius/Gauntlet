# Rules Arbiter shared runtime

Maintained implementation shared by live current/candidate Workers, still-served historical Workers and compatibility fallbacks. This package is runtime support, not gameplay or release authority.

- `rules-status.js`: current and legacy interaction status and answer-mode normalization, scope recovery.
- `rules-history.js`: stored session history and diagnostic context.
- `rules-persistence.js`: version-compatible interaction/source/diagnostic persistence, importing only sibling status helpers.

Consumers import these modules directly. They do not import deployed Worker entrypoints, browser UI, or release-specific corpora. The D1 migration sequence and executor remain governed separately by `config/shared-d1-schema.json`. Protected Worker deployment, historical regression and independent live-publication verification watch this package.

The initial extraction preserves all three original Git blobs exactly. Do not infer new gameplay mechanics from these operational helpers; current gameplay authority remains `packages/game-data/current-game.json`.
