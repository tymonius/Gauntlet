# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-11-13

## Governing objective

Clean up and reorganize the entire Gauntlet repository from the top down. Establish ownership and lifecycle boundaries first, consolidate implementations second, and defer local file cleanup until placement is settled.

The controlling question remains:

> **Should this thing exist here at all, and what architectural role does it serve?**

GitHub/current `main` is authoritative. This file is only the compact repository-local handoff.

## Durable tracking

- Master tracker: [#1430 — Repository cleanup and architecture reorganization](https://github.com/tymonius/Gauntlet/issues/1430)
- Human architecture map: [`docs/Repository_Architecture.md`](Repository_Architecture.md)
- Machine root-architecture contract: [`config/repository-architecture.json`](../config/repository-architecture.json)
- Public/deployment boundary contract: [`config/publication-boundary.json`](../config/publication-boundary.json)
- Active rules-surface contract: [`config/rules-surface-contract.json`](../config/rules-surface-contract.json)
- Rules publication source registry: [`config/rules-publication-sources.json`](../config/rules-publication-sources.json)

## Recent architecture now merged

Earlier application, public-route, game-data, asset, release-automation, and rules-source cleanup remains represented by the linked tracker and architecture documents. The most recent structural state is:

- [#1735](https://github.com/tymonius/Gauntlet/pull/1735) archived the Browser Rulebook source under `legacy/rulebook-browser/` while deliberately keeping `/rulebook/` materialized from it as the v0.7.1 release-transition bridge.
- [#1736](https://github.com/tymonius/Gauntlet/pull/1736) moved maintained current rule-fact derivation/synchronization into `packages/rules/rule-facts.js`; the old `rulebook/player-facing/rule-facts.js` path is compatibility-only.
- [#1740](https://github.com/tymonius/Gauntlet/pull/1740) repaired the TTS sparse checkout for the packaged rule-facts dependency.
- [#1739](https://github.com/tymonius/Gauntlet/pull/1739) archived the v0.6.3 long-card review source while preserving its `/card-design/...` URLs.
- [#1741](https://github.com/tymonius/Gauntlet/pull/1741) archived superseded Deed/Military design-study pages while preserving their public review URLs.
- [#1742](https://github.com/tymonius/Gauntlet/pull/1742) moved maintained card-design standards to `docs/card-design/` while preserving their public URLs.
- [#1749](https://github.com/tymonius/Gauntlet/pull/1749) archived the version-specific Capital Ledger review and tracker design notes after confirming they were historical evidence rather than current authority.
- DOC-HISTORICAL: [#1752](https://github.com/tymonius/Gauntlet/pull/1752) archived the complete v0.6.3 reference-copy subtree after verifying the then-current component authority pointed only at v0.7.0 reference copy. The old public v0.6.3 paths remain materialized for provenance.
- [#1753](https://github.com/tymonius/Gauntlet/pull/1753) established `packages/rendering/` as the environment-neutral physical-face model authority while preserving the established browser/TTS compatibility paths and public URLs.
- [#1757](https://github.com/tymonius/Gauntlet/pull/1757) closed the post-extraction dependency audit: the remaining canonical face pipeline is browser-specific production tooling, while authoring/review/compositor surfaces are a separate production-tooling role.
- [#1761](https://github.com/tymonius/Gauntlet/pull/1761) decoupled repository `card-design/` placement from the deployed `/card-design/` route while preserving package-owned rendering overrides and staged Pages behavior.
- [#1797](https://github.com/tymonius/Gauntlet/pull/1797) aligned the local card-design server with the same publication contract and corrected local artwork-authoring writes to canonical `packages/game-data/current-game.json`.

## Completed tranche — shared rendering model package

The shared-package seam is now implemented and verified through repository tests, governance, Card Authority canonical-face rendering, TTS generation/preview validation, and Pages staging.

Environment-neutral authority lives under the package:

- `packages/rendering/production-surface.mjs` — production card geometry and raster scale;
- `packages/rendering/face-authority.mjs` — canonical physical-face catalog, template identity, pairing, and back-policy model.

The established repository-root browser/TTS paths remain as thin compatibility adapters:

- `card-design/production-surface.mjs`
- `card-design/face-authority.mjs`

Because `packages/` remains source-only for GitHub Pages, `config/publication-boundary.json` materializes the package authority directly at the stable public URLs `/card-design/production-surface.mjs` and `/card-design/face-authority.mjs`. The in-place compatibility materializer deliberately preserves tracked adapters instead of overwriting repository source.

TTS and card-media sparse checkouts, plus Card Authority render scope, include `packages/rendering/`. `tests/rendering-package-boundary.test.ts` locks the ownership, adapter, publication, direct-consumer, and CI contracts together.

## Card-design rendering boundary audit

The post-extraction dependency audit confirms that the remaining canonical face pipeline is environment-specific production tooling, not additional shared package authority. See [`card-design/README.md`](../card-design/README.md) for the local map.

Verified classifications:

- `card-design/face-spec.mjs` is a browser/publication-aware presentation adapter: it resolves public stylesheet and artwork URLs, current visual authority, and environment-dependent art-direction imports.
- `card-design/face-template-registry.mjs` and `card-design/face-templates/*.mjs` are DOM renderer implementation; templates construct `HTMLElement` output and depend on browser globals.
- `card-design/face-preparation.mjs` is browser layout/render preparation using font loading, `Image`, computed styles, DOM measurement, and production fitting.
- `card-design/face-render.mjs` is browser orchestration using `window`, `document`, dynamic stylesheet/script loading, iframe inspection, and DOM output.
- `card-design/render-context.mjs` consumes the browser current-game bridge and therefore belongs with render runtime rather than environment-neutral package authority.
- artwork compositor/review/inspection and family-specific renderer surfaces are production authoring/render tooling and should be considered separately from shared model authority.

Do **not** move these modules into `packages/rendering/` merely to reduce the root. Any future physical move must target an appropriate browser/tooling boundary and preserve the deployed `/card-design/` import/publication contract.

## Completed tranche — card-design publication-route decoupling

The remaining physical split is blocked by a source/publication coupling: `card-design/` has historically been published directly as the `/card-design/` Pages directory. Before moving browser runtime or authoring/tooling files, source placement must be independent from the deployed route.

This tranche makes that boundary explicit without moving renderer code:

- `card-design` leaves `pages.publishedDirectories`;
- `config/publication-boundary.json` materializes source `card-design` onto the stable `/card-design/` public route during off-tree staging;
- explicit package-owned `/card-design/face-authority.mjs` and `/card-design/production-surface.mjs` file mappings continue to override the route copy after materialization;
- in-place compatibility materialization skips a route when source and destination resolve to the same repository directory, avoiding destructive self-materialization;
- `tests/card-design-publication-route.test.ts` locks the route, override ordering, and same-path guard.

This is a publication-boundary prerequisite only. Browser runtime, authoring/compositor tooling, gameplay data, and rendering behavior remain unchanged.

## Completed tranche — local card-design publication-boundary alignment

The first physical authoring/compositor extraction audit found one remaining source-placement dependency outside Pages: `scripts/card-design-server.mjs` served URL paths directly from repository paths. That meant moving a browser tool behind the stable `/card-design/` route would preserve production Pages behavior but break the local authoring server.

This tranche removes that second coupling before files move:

- local static requests resolve through the same `config/publication-boundary.json` contract used for staged publication;
- `/card-design/` remains the local entrypoint even when a mapped file's maintained source moves elsewhere;
- local artwork-authoring writes now target canonical `packages/game-data/current-game.json` rather than the retired pre-package path;
- the existing publication-route regression test locks the local server to the shared resolver.

With both deployed and local URL resolution decoupled from source placement, the verified first physical extraction is now safe.

## Completed tranche — artwork authoring/compositor extraction

The first classified production-tooling cluster is moving from the transitional `card-design/` source root to `tools/card-design/artwork-authoring/`.

Verified scope:

- seven browser files (`artwork-authoring-client.js`, `artwork-batch-publish-control.js`, `artwork-compositor-targets.js`, `artwork-compositor.css`, `artwork-compositor.js`, `artwork-crop.js`, and `artwork-publish-fetch-recovery.js`) move together;
- their public URLs remain unchanged under `/card-design/` through explicit `materializedFiles` mappings;
- local and CI render harnesses resolve those public URLs through the publication contract instead of repository placement;
- artwork-authoring workflow/tests follow the maintained source location;
- the Worker/browser working-branch authority path is corrected to canonical `packages/game-data/current-game.json`, while the intentionally stable browser fetch URL remains `/game-data/current-game.json`;
- `tools/` becomes an explicit non-transitional production-tooling root and remains source-only for Pages.

This extraction does not move the browser face-render runtime or the remaining review/inspection and family-specific presentation tooling.

## Completed tranche — review/catalog/inspection tooling extraction

The next classified production-tooling cluster moves the unified review catalog's browser assets and the shared card inspector out of the transitional `card-design/` source root into `tools/card-design/review/`.

Scope:

- move `card-review.js`, `card-review.css`, `card-inspector.js`, `card-inspector.css`, `catalog-filter.js`, `current-card-catalog.js`, and `card-catalog-shell.css` together;
- preserve their established `/card-design/` browser URLs through explicit publication-file mappings;
- keep `card-design/index.html` as the catalog entry surface for now;
- keep Card Reference and Deckbuilder on the shared inspector through the stable public `/card-design/card-inspector.*` URLs rather than repository-relative source placement;
- update source-reading tests and workflow triggers to the maintained tooling location;
- leave the canonical browser face-render runtime, family-specific renderer styles/scripts, compatibility render redirects, and maintained reference-copy subtree in `card-design/`.

This tranche is source-placement cleanup only; it does not change gameplay, face authority, or the public card-review routes.

## Completed tranche — card-design compatibility route archival

The canonical physical-face renderer has already replaced several older print/review entrypoints, but those stable browser URLs still matter for compatibility. Those redirect-only sources now live under `legacy/public-compatibility/card-design/` rather than masquerading as maintained renderer implementation.

Archived compatibility scope:

- `card-back-render.html`, `card-print-render.html`, `card-review-render.html`, `component-print-render.html`, `component-render.html`, `territory-print-render.html`, `territory-review-render.html`, and `leaders.html`;
- the shared `legacy-face-redirect.mjs` compatibility resolver used by the legacy face routes;
- every established `/card-design/...` URL is preserved through explicit `materializedFiles` mappings;
- source-reading tests now follow the archived repository locations while continuing to assert the stable public routes.

These files remain compatibility surfaces only. Canonical face rendering remains `/card-design/face-render.html`.

## Completed tranche — catalog-only family builder extraction

The ownership audit identified two family-specific JavaScript modules that are catalog-only despite canonical physical-face equivalents under `face-templates/`:

- `proposal-card.js`;
- `card-back.js`.

Their source now lives under `tools/card-design/review/` and their established `/card-design/...` browser URLs remain materialized.

The audit also established an important boundary: `rite-card.js` and `supplemental-card.js` remain in `card-design/` because current component authority still names them as production `renderSource.surface` values. They must not move until that authority contract is deliberately migrated.

## Completed tranche — superseded standalone renderer cleanup

The remaining presentation/runtime audit identified four JavaScript helpers that no longer belong in the maintained browser-rendering root:

- `playable-card-renderer.js` is a v0.6.3-era renderer still required only by historical long-card review tooling. Its source now lives under `legacy/card-design-v0.6.3/`, while `/card-design/playable-card-renderer.js` remains materialized for the historical browser review.
- `territory-card-renderer.js` had no repository consumers; canonical Territory rendering is implemented by `face-templates/territory.mjs` plus `face-preparation.mjs`.
- `leader-card-copy.js` had no live catalog/runtime consumer; canonical Leader markup now comes from `face-templates/leader.mjs`.
- `print-artwork-normalizer.js` was test-only after Deckbuilder printing switched to canonical FaceSpec artwork and had no production caller.

Current tests now assert the canonical FaceSpec templates/preparation pipeline instead of preserving superseded implementations for their own sake.

## Completed tranche — specimen/review lifecycle cleanup

The remaining standalone specimen/helper audit classified the non-runtime surfaces that were still mixed into `card-design/`:

- the v0.6.1 faction comparison specimen moved to `legacy/card-design-studies/`;
- the v0.6.4 Territory mockup moved under `legacy/v0.6.4-candidate/`;
- the complete typography specimen directory moved to `legacy/card-design-studies/typography/`;
- the Capital Ledger preview shell and its print-only stylesheet moved to `tools/card-design/review/` because they review the live production Ledger renderer rather than define gameplay or renderer authority;
- the colocated `card-inspector.test.mjs` moved under `tests/`.

All established `/card-design/...` browser URLs for the moved HTML/CSS studies and review shell remain materialized through the publication contract. Source-reading tests now follow lifecycle ownership instead of keeping obsolete repository placement alive.

## Completed tranche — review catalog entry extraction

The catalog/runtime seam audit established that the developer catalog entry page is review tooling, while `card-design.js` remains a mixed current runtime used by direct-rendered card specimens as well as historical long-card review tooling.

This tranche therefore moves only the catalog shell:

- `card-design/index.html` moves to `tools/card-design/review/index.html`;
- the public route remains `/card-design/` through an explicit `/card-design/index.html` publication mapping;
- the shared publication resolver now lets a directory URL resolve through an explicitly mapped `index.html`, keeping the local card-design server aligned with off-tree Pages staging;
- publishing-authority synchronization and source-reading tests follow the maintained review-tool source location.

The runtime stays put deliberately. Current catalog modules still create direct `.gauntlet-card` specimens that rely on `card-design.js` for parchment loading, adaptive fitting, and clone-based direct-card inspection, while historical long-card tooling also loads the same stable public script.

## Completed tranche — dead long-card injection removal

The first `card-design.js` decomposition pass separated live direct-card runtime behavior from historical review composition:

- removed the retired long-card review catalog array and DOM injection from the maintained runtime;
- retained parchment loading, production font preparation, adaptive card fitting, and direct-card/artwork inspection;
- retained the stable `/card-design/card-design.js` dependency used by archived long-card render tooling for fitting;
- changed the historical regression test to protect the archived review surface and assert that current runtime no longer owns its composition.

## Completed tranche — direct-card inspection convergence

Direct Card Design catalog inspection now belongs to the shared `tools/card-design/review/card-inspector.js` runtime:

- the shared inspector handles both URL-backed iframe faces and top-level direct DOM-card clones;
- direct-card activation is event-delegated and scoped to the Card Design developer catalog, so dynamically hydrated supplemental cards do not require per-node listeners;
- direct clone artwork inspection, focus restoration, and Escape/backdrop return-to-card behavior are owned by the shared inspector;
- the old clone/frame/lightbox inspector and modal CSS were removed from `card-design.js` and `card-design-refinement.css`;
- the supplemental reference-card hydration workaround for preserving inspection listeners was removed;
- `card-design.js` now owns parchment loading, production-font readiness, adaptive fitting, and resize/print refitting only.

Archived review pages still load the stable public `card-design.js` fitting runtime, but no longer inherit the current catalog inspector implicitly.

## Completed tranche — direct-card preparation ownership

The remaining direct-card browser-preparation runtime is review tooling rather than canonical face authority:

- `card-design.js` moved to `tools/card-design/review/card-design.js`;
- the stable public `/card-design/card-design.js` URL remains materialized through the publication contract;
- current review-catalog specimens continue to use it for parchment loading, production-font readiness, adaptive fitting, and resize/print refitting;
- archived long-card render tooling continues to consume the same stable public URL;
- canonical `packages/game-data/current-game.json` does not name this runtime, and canonical FaceSpec rendering does not depend on it.

At this point the remaining `card-design/` root is intentionally the canonical browser face/component presentation boundary plus its live family styles and active reference-copy support, not a catch-all review-tool directory.

## Completed tranche — Rules Arbiter browser app placement

The current Rules Arbiter browser shell is now classified as application source:

- moved the maintained browser shell and its local accessibility tests from `rules-arbiter/` to `apps/rules-arbiter/`;
- preserved the stable public `/rules-arbiter/` route through the publication boundary;
- removed the old top-level directory from direct Pages publication;
- updated current source-reading tests, publication sync, and CI path classification to follow the app source;
- verified the browser app and public widget both target the lifecycle-selected current Rules Arbiter/release corpus;
- corrected stale `rules-assistant/README.md` language that still described a historical Rules Arbiter release as current.

## Completed subtranche — Rules Assistant public-widget extraction

The browser-public Rules Arbiter widget presentation boundary is now separated from the mixed backend root:

- widget JavaScript/CSS, answer presentation, feedback styling, mobile overrides, and maintained co-located presentation tests live under `apps/rules-assistant-widget/`; two already-quarantined accessibility regressions remain at their existing path until the broader test-debt pass;
- stable `/rules-assistant/...` browser URLs are preserved through explicit publication-file mappings;
- `rules-assistant/` is no longer copied wholesale into GitHub Pages;
- the shared browser/runtime modules `local-search.js` and `v072-release-corpus.js` remain in the transitional root for now and are individually materialized;
- Pages/quality-gate/live-verification path routing follows the separated source boundary;
- backend/admin/eval/versioned source is no longer published merely because it shares the `rules-assistant/` root.

## Completed subtranche — Rules Assistant admin review/export extraction

The private review/dashboard cluster is now separated from the deployable backend root:

- admin dashboard composition, import, incremental-export, intelligence, triage, scaffold, and browser runtime helpers live under `tools/rules-assistant/admin/`;
- review export/checkpoint and review-intelligence handlers move with that private admin surface because they exist to support review operations rather than player-facing rulings;
- the Worker entry and refinement wrapper import those modules from the tooling boundary without changing the public/admin URLs;
- Rules Arbiter deployment now watches and syntax-checks the extracted tooling so a tooling change cannot miss production deployment;
- current source-reading tests follow the maintained tooling location while the test suites themselves remain in the existing Rules Assistant regression boundary.

## Completed subtranche — Rules Assistant refinement tooling extraction

The deterministic refinement engine is now separated from the deployed backend source boundary:

- triage, scaffold, privacy-safe snapshot, current-validity filtering, and resolution-ledger helpers live under `tools/rules-assistant/refinement/`;
- the deployed admin refinement wrapper imports the runtime-needed helpers from that tooling boundary, while repository scripts import scaffold/snapshot helpers from the same maintained source;
- generated refinement manifests now land under `artifacts/rules-refinement/manifests/`, matching the source-first validator's established artifact scan instead of creating a new source subtree under `rules-assistant/`;
- source-first governance now recognizes canonical `packages/game-data/current-game.json` rather than the retired pre-package path;
- Worker deployment and current-live verification follow both extracted Rules Assistant tooling boundaries.

## Completed subtranche — Rules Assistant QA/evaluation fixture extraction

The Rules Arbiter evaluation corpus is now separated from both runtime source and retained evidence:

- 74 executable JSON benchmark/regression/correction/clarification fixtures live under `tools/rules-assistant/qa/evals/`;
- 14 historical/manual Markdown QA audit reports live under `artifacts/rules-qa/audits/` as retained evidence rather than executable tooling;
- `rules-assistant/evals/` no longer exists;
- QA runners, refinement tooling, workflows, and current regression tests now read the maintained tooling path directly;
- fixture ownership is therefore independent from the deployable Worker root while preserving the exact benchmark data and workflow behavior.

## Completed subtranche — Rules Assistant v0.7.0 compatibility archive

The first live-routed historical Worker has been separated from the backend source root:

- `worker-v070.js` and `v070-public-corpus.js` now live under `legacy/rules-assistant/v070/`;
- the current `worker-entry.js` imports that legacy source and preserves the existing `/api/v070/*`, `/v070/*`, and `rulesVersion: v0.7.0` compatibility behavior; <!-- DOC-HISTORICAL -->
- no v0.7.0 gameplay or corpus content was rewritten; only source placement/import paths changed;
- Worker deployment, current-live verification, and historical-regression CI now treat `legacy/rules-assistant/**` as an imported production compatibility input;
- the remaining v0.6.x/v0.7.1 versioned implementations stay in the transitional root until their consumers are classified with the same standard.

## Completed subtranche — Rules Assistant v071 corpus archive

The frozen v071 release corpus loader is now separated from the transitional backend root:

- `v071-public-corpus.js` lives under `legacy/rules-assistant/v071/`;
- the still-routed v071 Worker, scope precheck, admin review intelligence, and refinement scaffold now consume the archived corpus source explicitly;
- deployment continues to watch and syntax-check the archived corpus because it remains a live compatibility dependency;
- regression tests that exercise the historical release corpus now read the archived source directly;
- the v071 Worker was left in place during this corpus-only move and then mechanically classified and archived in the following subtranche.

## Completed subtranche — Rules Assistant v071 Worker archive

The still-routed v071 compatibility Worker is now separated from the backend root without changing its behavior:

- `worker-v071.js` lives beside its frozen corpus under `legacy/rules-assistant/v071/`;
- the archived Worker imports only the maintained shared runtime helpers it still needs from `rules-assistant/` plus its local frozen corpus;
- `worker-entry.js` and the v071 scope precheck import the archived Worker while preserving the existing versioned route and requested-version dispatch;
- historical regression tests, live-publication/source-first contracts, and refinement hints now follow the archived source location;
- deployment and current-live verification already treat `legacy/rules-assistant/**` as a production compatibility dependency.

## Completed subtranche — Rules Assistant v063 compatibility archive

The certified v063 Rules Arbiter compatibility implementation is now separated from the backend root:

- `worker-v063.js` and `v063-public-corpus.js` live under `legacy/rules-assistant/v063/`;
- the current `worker-entry.js` preserves the explicit v063 rules/health routes and requested-version dispatch to the archived Worker;
- the archived corpus still uses the maintained shared retrieval runtime and the existing v063 publication-language normalizer; no certified source hashes or gameplay content changed;
- the v064 candidate corpus, Last Stand language validation, Playtest Session deployment triggers, and Rules Arbiter deployment checks now follow the archived corpus source;
- historical v063 build/finalization scripts remain preserved at their original assumptions and are not rewritten as current source authority.

## Completed subtranche — Rules Assistant v062 compatibility archive

The withdrawn v062 Rules Arbiter implementation and its candidate predecessor are now separated from the backend root:

- the published `worker-v062.js` / `v062-published-corpus.js`, candidate `worker-v062-candidate.js` / `v062-corpus.js`, and shared `rules-deterministic-v062.js` live together under `legacy/rules-assistant/v062/`;
- `worker-entry.js` preserves the explicit withdrawn v062 and candidate routes; neither is a current/unversioned authority;
- the archived Workers continue to depend on the maintained shared retrieval/persistence/v061 helper runtime rather than duplicating it;
- active v062 digital/withdrawal validators and the v062 candidate regression test now read the archived source directly;
- frozen recovery scripts and the historical v062 release builder retain their original source-path assumptions as recovery evidence and are not rewritten.

## Completed subtranche — Rules Assistant v063 candidate archive

The superseded v063 candidate stack is now co-located with the already archived published v063 compatibility implementation:

- `worker-v063-candidate.js`, `v063-development-corpus.js`, `rules-deterministic-v063.js`, `worker-entry-v063-candidate.js`, and `wrangler-v063-candidate.toml` live under `legacy/rules-assistant/v063/`;
- candidate implementation imports now resolve shared retrieval support from the maintained backend root while keeping candidate-only corpus/deterministic modules local;
- candidate/development regression tests and Last Stand language validation follow the archived source directly;
- the active v063 Last Stand validation workflow watches the archived v063 source so historical compatibility changes cannot bypass its checks;
- frozen recovery snapshots remain untouched.

## Completed subtranche — Rules Assistant v061 compatibility Worker archive

- `worker-v061.js` lives in `legacy/rules-assistant/v061/` while `worker-entry.js` retains the explicit v0.6.1 dispatch. <!-- DOC-HISTORICAL -->
- Earlier v062 archived Workers and maintained smart/reliable Workers retain their existing v061 helper imports at the new location.
- The historical v0.6.0 `worker.js` and shared retrieval remain in the backend root because the v061 Worker still depends on them.
- Regression tests and active deployment validation now read and check the archived source; recovery documents and hash-locked manifests are unchanged.

## Completed subtranche — Rules Assistant v064 candidate corpus archive

- The superseded v0.6.4 corpus implementation resides at `legacy/rules-assistant/v064/v064-candidate-corpus.js`; current production dispatch does not import it. <!-- DOC-HISTORICAL -->
- Its proposal/Territory regression tests import the archived corpus, which in turn imports the archived v063 corpus.
- Gameplay/current-release authority and published Worker routing were not changed.

## Completed subtranche — Rules Assistant test migration pilot

- The v061 Worker behavior tests, rules-intelligence benchmark, and game-night regression suite now live in `tests/rules-assistant/` rather than the production backend root.
- The existing `test:rules-assistant` script continues to cover tests at the transitional root, and the historical-regression workflow separately runs migrated tests in `tests/rules-assistant/`. The regular Vitest runner discovers both.
- Relative imports and fixture paths are retargeted without altering test assertions or historical game data.

## Completed subtranche — Rules Assistant v071/v072 QA suites migration

- Nine v071/v072 QA, verifier, precheck, remediation, and corpus tests have moved from `rules-assistant/` to `tools/rules-assistant/qa/tests/`, adjacent to the QA fixtures and outside the card-authority test-evidence inventory.
- Historical regression coverage continues through the dedicated workflow introduced by #1968, extended to the QA test directory; maintained imports/fixture paths were retargeted without changing test assertions.

## Completed subtranche — Rules Assistant Gate 3 blind QA suite extraction

- Fourteen historical v071 Gate 3 blind benchmark suites now live alongside their fixture corpus under `tools/rules-assistant/qa/tests/`, rather than the production `rules-assistant/` root.
- Imports, fixture readers and workflow inspection paths are retargeted for the new test location; assertions and historical frozen sources are unchanged.
- The historical-regression workflow introduced in #1969 already runs all `tools/rules-assistant/qa/tests/*.test.mjs` suites.

## Completed subtranche — Rules Assistant Gate 2 historical regression extraction

- Four v071 Gate 2 replay/regression tests have moved from the mixed backend root into `tools/rules-assistant/qa/tests/`, alongside the established historical QA fixture and regression suites.
- Imports and fixture readers now resolve the same archived v071 Worker and existing test assets from the QA location. Regression assertions, historical authority, and deployed runtime are unchanged.
- The existing historical-regression workflow executes these relocated tests; a separate boundary guard prevents their return to the active backend root.

## Completed subtranche — Rules Assistant Gate 3 remediation test extraction

- Eighteen v071 Gate 3 certification and remediation regression suites (A/B, C integration, and D through Q) now live under `tools/rules-assistant/qa/tests/` rather than the production backend root.
- Relative references to frozen v071 release evidence, archived Worker behavior, and retained shared backend helpers were mechanically retargeted without changing test assertions, authority data, or runtime implementation.
- The existing Rules Arbiter historical-regression workflow picks up the relocated test suites; a new boundary test verifies the layout.
- The supporting `v071-gate3-c-remediation.js` source remains in its existing root pending separate runtime-consumer classification; this tranche moves only tests.

## Completed subtranche — Rules Assistant v071 retrieval and continuity QA extraction

- Twenty historical v071 per-card, retrieval, clarification, state-continuity, and classification suites now reside in `tools/rules-assistant/qa/tests/` rather than the production backend root.
- Test assertions and archived release mechanics are unchanged; relocated tests resolve their frozen v071 source, existing backend helpers, and QA assets through corrected imports/paths.
- The existing historical regression workflow executes these suites, and a boundary regression test protects their new location.
- The v071 corpus-sync guard, remaining v071 review/retrieval tests, and current v072 runtime-adjacent tests are deferred for a separate consumer classification rather than moved indiscriminately.

## Completed subtranche — further maintained v071 historical test extraction

- Nineteen additional maintained v071 historical regression suites for publication, setup, workflow, retrieval, and card review have been moved to `tools/rules-assistant/qa/tests/` without changing assertions or frozen authority.
- The **quarantined** `rules-assistant/v071-corpus-sync-guard.test.mjs` deliberately remains at its original location, with its existing quarantine manifest entry intact. Its literal old-workflow assertions need separate rehabilitation or formal retirement; relocating it must not inadvertently reactivate it.
- A QA-local boundary guard permits only this documented quarantined v071 exception at the backend root and verifies historical test execution coverage. Other versioned Worker/runtime sources remain untouched.
- A broader maintained-Vitest baseline debt surfaced when experimenting with the quarantine manifest (36 failing test files in the full gate). This is separate from the behavior-preserving test relocation and requires a dedicated cleanup tranche; it is not resolved by altering the authority baseline or dismissing failures.

## Completed subtranche — pre-v071 historical compatibility regression tests

- Five v061/v062/v063 compatibility regression suites have been moved from `rules-assistant/` to `tools/rules-assistant/qa/tests/` alongside other historical Rules Arbiter QA.
- The tests continue to use archived version-specific Worker/corpus implementations and preserved release fixtures; imports, the v062 variable corpus-source reader, and the v063 reconstruction-root reader have been adjusted for the QA location.
- Current dispatcher code, frozen rule packages, and compatibility routes are unchanged. The dedicated historical-regression workflow executes these suites, with a QA-local boundary guard.

## Completed subtranche — Rules Assistant administrative regression-test boundary

- Seven active admin dashboard/refinement regression suites now live under `tools/rules-assistant/admin/tests/`, next to the existing admin implementation sources, rather than the mixed backend deployment root.
- The existing `test:rules-assistant` script is unchanged; the historical-regression workflow explicitly executes the relocated admin suites in a separate command and watches the admin test directory. This preserves coverage without triggering unrelated full-suite test debt from a `package.json` change.
- Imports still target the current Worker entrypoints and maintained admin modules; the deployed `admin-refinement-worker.js` and D1 schema remain in place.

## Completed subtranche — Rules Assistant refinement regression-test boundary

- Seven maintained refinement regression tests (current validity, filter order, loop, resolution ledger, scaffold, snapshot, triage) now live under `tools/rules-assistant/refinement/tests/`, beside maintained refinement implementation.
- The historical-regression workflow watches this directory and explicitly runs its test suites; `package.json` remains unchanged to avoid unrelated full-Vitest failures documented in #1822.
- Imports continue to reference maintained runtime helpers; assertions, active Worker and D1 migration logic remain unchanged.

## Completed subtranche — Rules Assistant benchmark and semantic-QA regression suites

- Seven older semantic-evaluator, blind benchmark/model-packet, and fallback-source-lookup regression suites now live under `tools/rules-assistant/qa/tests/` rather than beside live Worker sources.
- Test imports continue to resolve maintained backend helpers, intentionally historical frozen release evidence, and current app paths; no authority, assertions, API routes, or live Worker modules moved.
- Existing historical-regression workflow already watches and runs this QA test directory, preserving coverage.

## Completed subtranche — versioned Rules Arbiter candidate/final regression QA

- Eight versioned candidate/final corpus, workflow, Worker-port, authority-link and citation regression suites now reside under `tools/rules-assistant/qa/tests/` instead of the mixed backend root.
- Relative runtime imports and fixture-source readers are retargeted; exact-port comparison fixture strings and test assertions are deliberately preserved, as are current Workers and frozen game authority.
- Existing historical-regression CI discovers this QA test directory without changing the package scripts or public routes.

## Completed subtranche — administrative review/persistence regressions

- Three additional review-export/checkpoint, review-scope, and review-intelligence tests now reside beside maintained admin modules under `tools/rules-assistant/admin/tests/`.
- Imports and D1 migration fixtures were retargeted without changing assertions, production Worker entrypoints, or migrations.
- Existing historical regression CI already watches and explicitly runs the entire admin test directory; no package scripts or publication paths changed.

## Completed subtranche — Rules Assistant runtime-helper test separation

- Eight maintained runtime-helper, retrieval, status, deterministic-ruling, legacy regression, and persistence-contract test suites now live in `tools/rules-assistant/qa/tests/` rather than the deployed Worker source directory.
- Their shared runtime imports and historical fixture reads use corrected relative paths; tests' assertions, release files, current gameplay authority, and Worker code are unchanged.
- The established historical-regression workflow already watches and runs this QA directory, so no deployment contract or package-script changes are required.
- The four explicitly quarantined backend-root test files remain in place pending separate test rehabilitation.

## Completed subtranche — Rules Assistant Worker entrypoint/deployment regression tests

- Six maintained Worker-entrypoint, current/candidate route, corpus-health, QA gating, theme, and deployment workflow tests now reside in `tools/rules-assistant/qa/tests/`, separate from production Worker source.
- Source imports and the deployment-gate test's repository-root file reads were mechanically retargeted. Worker routing/health, deployment configuration, release lifecycle and D1 migrations remain unchanged.
- The existing historical-regression workflow covers this directory. Four intentionally quarantined test files and a minimal active source/QA boundary guard remain under `rules-assistant/`. The guard preserves a meaningful backend test command while quarantined tests await rehabilitation.

## Completed subtranche — QA-only voice smoke report source

- The manually approved production voice-smoke report validator now lives in `tools/rules-assistant/qa/v072-voice-smoke-report.js` instead of the deployed Worker source root.
- The live-QA script, manually dispatched paid-API workflow, and corresponding regression test reference the new QA-only source; its inspection logic and fixed smoke case selection are unchanged.
- This is a source ownership change, not a live model call or a change to published rules or Worker behavior.

## Completed subtranche — TTS publisher documentation identity reconciliation

- Reconciled the maintained TTS README and save-publisher instructions with the authoritative current-game identity, release lifecycle, and TTS publication target. Earlier candidate-only wording was explicitly distinguished from the current stable publication.
- Document-only changes: no changes to gameplay, save generation, Steam publication, manual-QA approval, generated assets, or package/workflow commands.
- Further TTS source relocation must preserve the current callers in package scripts, card-authority CI, and release-asset generation. No TTS runtime script was moved in this tranche.

## Current tranche — Rules Assistant backend/admin/eval/versioned split audit

The remaining `rules-assistant/` root is still architecturally mixed. Classify and separate:

- current Cloudflare Worker routing/deployment runtime, shared retrieval/runtime support, and D1 migrations;
- runtime-adjacent regression harnesses/tests that are still colocated with the backend;
- explicitly versioned historical/compatibility workers and corpora.

Do not move versioned worker/corpus files until their live routing, QA, and historical compatibility consumers are mechanically classified.

## Card-design lifecycle state

`card-design/` remains a transitional production-tooling root, but its major roles are now classified:

- maintained design standards live under `docs/card-design/`;
- historical design studies/review notes, including the v0.6.1 faction specimen and typography studies, live under `legacy/card-design-studies/`;
- v0.6.3 long-review, playable-renderer, and reference-copy provenance lives under `legacy/card-design-v0.6.3/`;
- the maintained reference-copy subtree selected by current component authority remains under `card-design/reference-copy/`;
- pure shared rendering model authority lives under `packages/rendering/`;
- canonical browser FaceSpec/component runtime remains under `card-design/`; direct-card review preparation now lives under `tools/card-design/review/`;
- artwork authoring/compositor source lives under `tools/card-design/artwork-authoring/` behind stable `/card-design/` URLs;
- review/catalog/inspection source, including the catalog entry page, direct-card preparation runtime, Proposal/card-back catalog builders, and the Capital Ledger preview shell, lives under `tools/card-design/review/` behind stable `/card-design/` URLs;
- compatibility-only render/review entrypoints live under `legacy/public-compatibility/card-design/` behind stable `/card-design/` URLs;
- canonical family styles, authority-linked renderer helpers, and the canonical browser face/component runtime remain under `card-design/`; review preparation and inspection are owned by `tools/card-design/review/`.

## Rules boundary state

- Canonical gameplay authority is `packages/game-data/current-game.json`.
- Maintained active rules source/support lives under `packages/rules/`.
- The Browser Rulebook implementation remains under `legacy/rulebook-browser/`, while the publication contract classifies `/rulebook/` as the current rules publication surface selected by release lifecycle.
- `rulebook/` remains residual compatibility/support material rather than gameplay authority.
- Rulebook QR assets remain active Player Guide publication support.

## Resolved documentation drift

The outdated Browser Rulebook source/publication examples in `docs/Repository_Architecture.md` were corrected in #1980. The current `/rulebook/` route is staged from `legacy/rulebook-browser/` under `config/publication-boundary.json`; the former `apps/rulebook/` example is no longer used.

## Completed subtranche — Card-media composition configuration boundary

- Promoted the maintained deterministic homepage/promotional composition configuration from `media/compositions.json` into `config/media-compositions.json`. The file contents, selected cards, canvas geometry, output profiles, and version identity are byte-for-byte unchanged.
- Updated the card-media composition generator, homepage showcase manifest builder, source-boundary regression, card-authority path trigger, media documentation, and human/machine architecture maps to read the single config authority.
- `media/generated/` remains the ignored export output location, and the published `/images/media/` URL and release/website staging are untouched. No production media assets were rebuilt or published by this change.

## Completed subtranche — TTS authoritative-save validator source boundary

- Moved the maintained authoritative TTS save-contract validator implementation to `tools/tts/validate-current-authoritative-save.mjs` while retaining its original `tts/validate-current-authoritative-save.mjs` command path as a thin module-import CLI shim.
- Retargeted the implementation's relative `scripts/` imports, tests that inspect validator logic, and the incremental TTS workflow's source-change classification and pull-request path filter.
- Existing `package.json` commands, historical `tts/validate-v070-authoritative-save.mjs` wrapper, generated `tts/generated/` outputs, and deployment paths stay unchanged. No validator checks/assertions or gameplay rules were altered.

## Completed subtranche — TTS game-data compatibility-route source boundary

- Separated the source of the temporary browser-compatible game-data route materializer into `tools/tts/run-with-game-data-route.mjs`, retaining `tts/run-with-game-data-route.mjs` as an export-forwarding, executable module shim for all established callers.
- Retargeted the one import-relative repository-root resolution to keep the same authoritative `packages/game-data/` source and transient `game-data/` route. Existing protection against overwriting a real route and guaranteed cleanup remain unchanged.
- Updated the source-inspection test, Card Authority render classification, TTS workflow path scope, and architecture/handoff documents. All package commands, public URLs, rule data, and generated outputs remain unchanged.

## Completed subtranche — TTS table-layout tooling source boundary

- Extracted the maintained TTS tabletop layout/placement implementation to `tools/tts/apply-table-layout.mjs`, preserving all exported calculation functions for tests through the original `tts/apply-table-layout.mjs` shim.
- Both the canonical module and original CLI entrypoint support direct execution. The same `main()` path and all existing layout validation, counts, positions, and generated-save writes are preserved; only the runner was made an explicit exported function for safe compatibility forwarding.
- The TTS build scope watches the new canonical source. Added regression coverage for the shim and updated human/machine architecture descriptions without changing package scripts, release behavior, or gameplay authority.

## Completed subtranche — TTS publication helper ownership

- Moved the maintained TTS face-publication parity and printed-version stamping helper from `scripts/tts-face-publication.mjs` to `tools/tts/tts-face-publication.mjs`, retaining the original import path as a named export-forwarding shim. The canonical module still calls the existing published-asset parity validator under `scripts/`; only its relative import changed.
- Moved the pure TTS Rulebook reader-order/de-imposition helper from `scripts/tts-rulebook-imposition.mjs` to `tools/tts/tts-rulebook-imposition.mjs`, likewise preserving its original import path as a named export-forwarding shim.
- The existing TTS generators and their gameplay/renderer/release behaviors are unchanged. Tests now exercise canonical exports while asserting that legacy imports are the same functions.
- The TTS build workflow explicitly watches both canonical helper paths and their shims, triggers card/Territory/Leader capture for face-publication changes, and stages rules PDFs for imposition changes. Card Authority also treats the face-publication helper as a rendered-face change.
- No canonical current-game, frozen release, TTS assets, generated output, or published URL was modified. Check CI and TTS/Pages QA before merging.

## Completed subtranche — TTS tracker capture and geometry source boundary

- Separate the maintained sliding-tracker capture and physical/snap geometry implementations under `tools/tts/`, leaving the original `scripts/` import paths as thin, exact export-forwarding compatibility modules.
- Adjust canonical imports to the retained browser production-surface authority; keep generator commands and emitted TTS representation unchanged. Migrate source-inspection tests to maintained files, update existing consumers where already inside `tools/tts/`, and add a compatibility/ownership regression.
- The incremental TTS workflow now treats physical geometry source edits as a full render (the prior no-op classification could miss Territory orientation and component changes), and watches/recaptures supplementals for changes to the tracker capture helper. Card Authority recognizes the canonical capture helper as a rendered-face input.
- Correct the sliding-tracker documentation to describe on-load Lua `setSnapPoints` registration from actual TTS bounds, rather than inaccurately claiming serialized `AttachedSnapPoints`.
- This tranche changes no canonical gameplay, published route, release artifact, rendered-card source authority, or production feature logic. It follows merged [#2008](https://github.com/tymonius/Gauntlet/pull/2008) and was completed in merged [#2009](https://github.com/tymonius/Gauntlet/pull/2009), after all applicable checks passed.

## Completed subtranche — TTS Deckbuilder importer tooling boundary

- The maintained Deckbuilder-to-TTS import implementation moves from the transitional `scripts/tts-deck-importer.mjs` root path into `tools/tts/tts-deck-importer.mjs`. Its sole existing relative import continues to resolve the same `scripts/generate-tts-save.mjs` hosted-URL helper.
- The old `scripts/tts-deck-importer.mjs` becomes an exact re-export shim, preserving the established save-assembler dependency and all eight named exports. Existing package commands and generated Lua/UI content are unchanged.
- The importer test suite now imports canonical tooling and checks that every compatibility export has identical identity. The TTS PR workflow watches both paths and retains its conservative full-render classification for importer changes, so asset/save validation cannot be bypassed by the source move.
- Machine and human architecture maps and the TTS README classify the new maintained tooling location. No gameplay authority, frozen release, public URL, deployment contract, or published Workshop package is modified.
- Merged as [#2011](https://github.com/tymonius/Gauntlet/pull/2011) after the PR Quality Gate, repository tests, governance, Card Authority, TTS render and preview checks passed.

## Completed subtranche — TTS physical-component contract validator boundary

- Move the maintained `scripts/tts-component-contract.mjs` implementation into `tools/tts/tts-component-contract.mjs`, retaining the canonical gameplay authority at `packages/game-data/current-game.json#componentContract` and the current physical-card validation behavior.
- Preserve the original `scripts/tts-component-contract.mjs` import and executable CLI path through a small forwarding shim. The canonical module also remains directly executable; both invoke the same exported validator runner, and `npm run tts:components:check` is unchanged.
- Retarget three source-inspection regression tests to the canonical maintained module, add export-identity and direct-CLI parity tests, and include both paths in the TTS PR workflow with conservative full-render classification.
- Reconciled the TTS README and human/machine architecture descriptions without changing gameplay data, frozen release assets, public URLs, or the published TTS save. Merged in [#2013](https://github.com/tymonius/Gauntlet/pull/2013) after the required tests, governance, Card Authority, and TTS render/preview checks passed.

## Completed subtranche — current TTS catalog source ownership and cross-consumer coverage

- Verified the maintained `scripts/tts-current-catalog.mjs` implementation provides release identity, the playable/Territory/Leader/starter derived catalog, and the `tts/generated/<version>/` and `tts/generated/current/` output contracts. It is a TTS catalog, but both maintained card-media generators import its `buildCatalog` API; `.github/workflows/deploy-pages.yml` also watches the catalog path because Pages builds card-media assets.
- Moved the sole implementation to `tools/tts/tts-current-catalog.mjs`, retargeting only its relative imports and repository-root URL resolution. Kept `scripts/tts-current-catalog.mjs` as the exact export-forwarding import boundary for all existing consumers. No caller import, public URL, package command, or output location was changed.
- Retargeted source-inspection tests to the maintained file; regression coverage checks the old and new exports are identical, their resolved repository/output roots agree, and TTS, Pages, Card Authority, and card-media use the same implementation.
- Both TTS and Pages workflows now watch either source location, while TTS conservatively forces a full render when the catalog authority changes. Card Authority also recognizes the catalog source as a face/media-render dependency.
- Repaired the active TTS release-target test's stale candidate-status expectations, using the canonical current-game identity and lifecycle-selected release target rather than a historical candidate assumption. The quarantined legacy TTS-current-release source inspection now points to maintained source while retaining its quarantine status pending a separate rehabilitation.
- No current-game data, frozen release evidence, generated files, Workshop save, or deployed URLs were changed. Merged in [#2014](https://github.com/tymonius/Gauntlet/pull/2014) after PR tests, governance, Card Authority, TTS render/preview, and Pages validation passed.

## Completed subtranche — Rules Arbiter semantic QA implementation ownership

- Audited the active deployment boundary: `rules-assistant/wrangler.toml` deploys `rules-assistant/admin-refinement-worker.js`, which layers `worker-entry.js` with admin refinement. The entrypoint serves public and historical/candidate routes, and also serves a live authorized `/api/qa/semantic-evaluate` endpoint. This endpoint is not a retired QA-only fixture; it must remain bundled and deployed.
- Move the maintained semantic evaluator/handler implementation to `tools/rules-assistant/qa/qa-semantic-evaluator.js`, keeping `rules-assistant/qa-semantic-evaluator.js` as an exact export-forwarding module for the unchanged Worker import. Only the relative path to the existing GitHub Actions QA authorization helper changes; evaluator prompts, validation, response status, verdict semantics, endpoint routing, and authentication remain unchanged.
- Retarget direct implementation/source-inspection QA regression tests to the maintained module. Add exact-export/route/authorization/CI contract checks that ensure the live Worker still uses the compatibility import.
- Explicitly watch both evaluator module paths in the production Rules Arbiter deployment workflow, add Node syntax validation for both, and extend the historical-regression workflow triggers to include the maintained evaluator path. This corrects a dependency-gap where updating that imported deployed handler would not trigger a production build.
- Keep admin/refinement ownership under `tools/rules-assistant/` and all current/historical/candidate Worker route contracts untouched. No gameplay, release corpus, model budget, security or QA evaluation changes. Merged in [#2019](https://github.com/tymonius/Gauntlet/pull/2019) after repository tests, historical regression, Card Authority, governance and the PR gate passed. The triggered production deploy surfaced a pre-existing blocker: its test command still used paths from before QA tests were moved to `tools/rules-assistant/qa/tests/`. No Worker deployment occurred on that run.

## Completed subtranche — deployed Rules Arbiter QA regression path repair

- Production deployment workflow run [43443135430](https://github.com/tymonius/Gauntlet/actions/runs/43443135430) failed during its predeploy validation: all eight `npx vitest run` arguments referenced nonexistent `rules-assistant/*.test.mjs` paths. The suites have already moved to `tools/rules-assistant/qa/tests/` and passed the historical-regression CI for #2019. This was not an evaluator logic or live-health failure.
- Retarget the eight exact predeploy QA test arguments to their maintained locations, preserving the same test set and all deployment, QA approval, Worker routing, and production-health commands.
- Add a regression contract that verifies each of the eight deployment-gate test paths resolves to a maintained file. This prevents another silent tooling move from breaking the production rollout step.
- Merged in [#2021](https://github.com/tymonius/Gauntlet/pull/2021) after PR checks passed. The subsequent production deployment reached and passed unversioned health, but the still-served candidate route failed corpus-health verification because it consumed promoted stable public source URLs. Tracked as [#2022](https://github.com/tymonius/Gauntlet/issues/2022).

## Completed subtranche — frozen historical candidate Worker corpus repair

- Restore the still-live candidate route from the exact pre-release source blobs recorded by `config/v072-release-freeze.json`. Both source blobs were independently verified at immutable commit `5f2012690e4574c4f675e3d13db642c6fb1db87f`. Embed their verbatim text under `legacy/rules-assistant/v072-candidate/`, not by changing stable `packages/game-data/current-game.json`.
- The candidate loader now hashes its embedded source pair against the recorded frozen authority-set ID before parsing, and serves immutable GitHub source permalinks in citations instead of moving current-game and Rulebook URLs. Its historical candidate identity and active route are retained.
- Explicit historical conflict: the earlier manual paid-QA replay fixture records a distinct authority ID (`faacd55458ec1595f480798449033a2c8705e018d828ae8034c5fe2b2a6f35b0`), whereas the final release-freeze source pair records `ab0125ae280accfb03d53bdadf5b6ae006f98aeab897e20a4b2269d89ed9eb84`. Keep the earlier replay pinned to its own benchmark provenance; its approval gates must not be repurposed for the final pre-release snapshot, and it must fail its old preflight rather than consume paid API calls against a mismatched route. <!-- DOC-HISTORICAL -->
- Add Git-blob SHA-1, combined SHA-256, offline corpus, candidate citation/route, and failure-closed regression coverage. Watch embedded sources in production deployment. Do not change stable or unversioned gameplay, candidate behavior code, Worker authentication, public routes, or freeze artifacts.
- Merged in [#2025](https://github.com/tymonius/Gauntlet/pull/2025) with all required PR checks green. [Production deployment #43448828444](https://github.com/tymonius/Gauntlet/actions/runs/43448828444) passed runtime validation, unversioned production health, historical candidate health and corpus, and frozen stable v0.7.2 health and corpus. [Incident #2022](https://github.com/tymonius/Gauntlet/issues/2022) is closed.

## Completed subtranche — Rules Arbiter GitHub Actions QA authorization ownership

- Audited the shared GitHub Actions OIDC authorization implementation in `rules-assistant/github-actions-qa-auth.js`. It is a live security policy imported by the current-release Worker, explicitly versioned compatibility and candidate Workers, semantic evaluator, and admin refinement Worker. It is not an archived candidate fixture.
- Move its unchanged implementation to `tools/rules-assistant/qa/github-actions-qa-auth.js`, leaving the original import path as an exact export-forwarding shim. The canonical semantic evaluator imports the maintained sibling directly, while all other Worker paths keep their established imports.
- The authorized-workflow allowlist, GitHub OIDC issuer/JWKS signature verification, token rejection rules, JWKS cache, and all runtime API behavior remain byte-for-byte unchanged in the maintained source. Add exact-export identity and rejection-parity regressions alongside existing authorization and historical suites.
- Add explicit canonical source path coverage to protected Worker deployment, historical regression, and current live-publication workflow scope detection. Syntax-check maintained source in predeployment validation. Do not skip any live or candidate health check.
- No gameplay/card rules, current-game authority, frozen release corpus, public endpoint, D1 schema, or model budget changes. Merged [#2027](https://github.com/tymonius/Gauntlet/pull/2027) after all required PR checks passed. The first protected deploy and independent live-publication runs failed at the Cloudflare Worker-version API with error `10013`; an isolated immediate retry failed identically. [Incident #2028](https://github.com/tymonius/Gauntlet/issues/2028) tracked the operational recovery. A later protected [deploy rerun #43451853807](https://github.com/tymonius/Gauntlet/actions/runs/43451853807) completed successfully, verifying unversioned, frozen candidate, and frozen published-release health/corpus routes. An independent [live-publication rerun #43453355168](https://github.com/tymonius/Gauntlet/actions/runs/43453355168) then passed current health, site publication contract, expected authority-set and corpus-refresh validation. #2028 is closed. The cause of Cloudflare's prior error is not established; do not attribute it to deployment concurrency, code, or a specific vendor incident without evidence.

## Current subtranche — remaining Rules Assistant runtime ownership and dependency classification

- Continue the top-down Rules Assistant split using the actual current import/route graph. Audit which root runtime helpers serve the deployed current Worker, explicit candidate or historical routes, browser fallback, admin/refinement tooling, and QA-only tests. Some helpers are shared, and moving a source without verifying all consumers can break protected production health.
- Prioritize classifying `rules-assistant/local-search.js`, `rules-assistant/rules-intelligence.js`, `rules-assistant/rules-status.js`, `rules-assistant/rules-history.js`, `rules-assistant/source-lookup-review.js`, and related small runtime modules before choosing the next physical relocation. Do not assume their role from names; verify exact consumers and exported behavior on current `main`.
- Keep canonical gameplay `packages/game-data/current-game.json`, explicit versioned compatibility routes, frozen release/candidate source identities, and existing QA authorization semantics unchanged during behavior-preserving architecture work. Ensure both protected Worker deploy and independent current-publication paths watch moved source modules; avoid unintended simultaneous deploys.
- Use one focused PR per mechanical boundary with direct export/import identity checks, consumer coverage, historical regression, governance, and production health verification. If Cloudflare API upload failure reappears, treat it as a deployment blocker rather than weakening these gates.

## Completed subtranche — versioned v071 scope-precheck implementation ownership

- Consumer classification on the current repository establishes that `rules-assistant/local-search.js` is shared by current release/candidate retrieval and historical compatibility; `rules-assistant/rules-intelligence.js` is shared by smart/reliable compatibility runtime and packet/deterministic analysis; `rules-assistant/rules-status.js` is imported by active persistence, smart-worker, and the v071 precheck; and `rules-assistant/rules-history.js` is imported by the smart-worker. These are shared runtime helpers and stay under the active backend root. The apparently old `smart-worker.js`/`reliable-worker.js` is still reachable via the entrypoint's compatibility fallback; do not retire it merely because its default version is older. <!-- DOC-HISTORICAL -->
- Unlike those shared helpers, `rules-assistant/v071-scope-precheck.js` is exclusively a v071-specific deterministic precheck used by the live admin-refinement entrypoint for matching requests. Move its maintained implementation unchanged to `legacy/rules-assistant/v071/v071-scope-precheck.js` next to the historical v071 Worker and frozen corpus; preserve the deployed import with a root-level exact export-forwarding shim. Adjust only the relocated module's relative imports, not its classification rules, release identity, response schema, persistence, CORS, or model bypass behavior. <!-- DOC-HISTORICAL -->
- The unversioned `rules-assistant/source-lookup-review.js` route is **still live** even though its payload sanitizer only accepts v071; the current browser page sends current-release v072 records. This source-backed mismatch was tracked in [#2032](https://github.com/tymonius/Gauntlet/issues/2032) and subsequently resolved by [#2036](https://github.com/tymonius/Gauntlet/pull/2036). Do **not** move it to legacy or change its accepted versions in this source-ownership PR. <!-- DOC-HISTORICAL -->
- Retarget v071 source-inspection and direct unit tests to the canonical archived implementation; add exact export-identity, deployed-entrypoint runtime behavior, and protected/independent deployment-trigger tests. Watch and syntax-check both old and new paths in protected Worker deployment, including the actual v071 precheck test suite; recognize archived compatibility helpers in current-publication changed-input classification. Historical regression already covers both folders.
- Kept canonical gameplay and all published/frozen corpora unchanged. [PR #2034](https://github.com/tymonius/Gauntlet/pull/2034) merged with all six required checks green; [protected Worker deployment #43477992885](https://github.com/tymonius/Gauntlet/actions/runs/43477992885) and [independent published-site verification #43477993214](https://github.com/tymonius/Gauntlet/actions/runs/43477993214) both completed successfully.

## Completed functional repair — live source-lookup review version alignment

- [#2032](https://github.com/tymonius/Gauntlet/issues/2032) identified a live mismatch: the current browser Rules Arbiter queues fallback reports with the release version derived from its frozen current corpus while the deployed `/api/source-lookup-review` handler still accepted only a historical release. The endpoint was reachable, but these current reports were rejected before D1 persistence.
- Repair only the accepted version contract: derive the current accepted version from `config/release-lifecycle.json`, retain explicit historical v0.7.1 acceptance so already-queued legacy submissions remain attributable to their actual version, and save the **submitted** validated `gameVersion`. No historical record is relabeled as current. <!-- DOC-HISTORICAL -->
- Keep all existing browser payload sizes, origin checks, sanitization, model-null/low-confidence source-lookup classification, D1 failure-closed behavior, and all published rules untouched. Reject unsupported versions including candidates; do not invoke AI for fallback-report capture.
- Add direct sanitizer/historical-replay tests and a routed deployed-Worker test against the actual browser payload. Make the deployment trigger watch both handler and lifecycle JSON; add predeployment source syntax/test and independent live-publication changed-input detection.
- The behavior fix was merged independently in [#2036](https://github.com/tymonius/Gauntlet/pull/2036) after all six PR checks passed. [Protected Worker deployment #43486153114](https://github.com/tymonius/Gauntlet/actions/runs/43486153114) verified production, candidate and frozen stable corpus health; [independent live-publication #43486153656](https://github.com/tymonius/Gauntlet/actions/runs/43486153656) passed current/historical health, deployed-site contract, published authority set and corpus refresh. [Issue #2032](https://github.com/tymonius/Gauntlet/issues/2032) is closed as completed. The behavior fix remains distinct from source-ownership [PR #2034](https://github.com/tymonius/Gauntlet/pull/2034). No live synthetic D1 record was written as part of verification.

## Next top-down queue

1. Complete the Rules Assistant public/backend/admin/eval/versioned-support split after mechanically classifying consumers.
2. Continue production-tool consolidation (`scripts/`, `media/`, `tts/`, related tooling) only after callers and lifecycle are classified.
3. Audit governance/traceability and CI paths that still encode transitional locations.
4. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read #1430 and the current open cleanup PR/issue.
2. Read this file, the machine architecture contract, and the publication boundary.
3. Treat current `main` and GitHub as authoritative when any prose document lags.
4. Continue the highest-level unresolved architectural work before descending into local cleanup.
5. Update this file whenever the active tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
