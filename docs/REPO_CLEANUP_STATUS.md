# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-10-07

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
- the v071 Worker itself remains in `rules-assistant/` for a later tranche because its behavior module is referenced broadly by historical regression and current refinement support.

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

## Known documentation drift

`docs/Repository_Architecture.md` still contains some pre-#1735 Browser Rulebook examples that describe source under `apps/rulebook/`. The machine contracts and current repository state are authoritative; align that human document in a follow-up rather than using its stale examples as premises for new moves.

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
