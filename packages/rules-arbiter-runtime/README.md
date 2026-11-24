# Rules Arbiter shared runtime

Maintained implementation shared by live current/candidate Workers, still-served historical Workers and compatibility fallbacks. This package is runtime support, not gameplay or release authority.

- `rules-status.js`: current and legacy interaction status and answer-mode normalization, scope recovery.
- `rules-history.js`: stored session history and diagnostic context.
- `rules-persistence.js`: version-compatible interaction/source/diagnostic persistence, importing only sibling status helpers.
- `local-search.js`: dependency-free document construction, retrieval and lexical fallback, shared with the browser.
- `rules-intelligence.js`, `rules-packets.js`, `rules-deterministic.js`: question analysis, source packets and deterministic adjudication; all inter-module imports stay inside the package.
- `rules-plan-enrichment.js`, `rules-openai.js`: plan enrichment and model-call support for the reachable smart fallback.

Consumers import these modules directly. They do not import deployed Worker entrypoints, browser UI, or release-specific corpora. The D1 migration sequence and executor remain governed separately by `config/shared-d1-schema.json`. Protected Worker deployment, historical regression and independent live-publication verification watch this package.

The interaction and retrieval/adjudication extractions preserve all nine original implementation Git blobs exactly. The public `/rules-assistant/local-search.js` route materializes the package implementation itself, not the repository-only forwarding module. The latter preserves the existing sibling import of the dual-use published corpus loader and historical import paths. Other package files remain source-only. Do not infer new gameplay mechanics from these operational helpers; current gameplay authority remains `packages/game-data/current-game.json`.
