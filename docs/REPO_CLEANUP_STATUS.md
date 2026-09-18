# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-09-16

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

## Current tranche — local card-design publication-boundary alignment

The first physical authoring/compositor extraction audit found one remaining source-placement dependency outside Pages: `scripts/card-design-server.mjs` served URL paths directly from repository paths. That meant moving a browser tool behind the stable `/card-design/` route would preserve production Pages behavior but break the local authoring server.

This tranche removes that second coupling before files move:

- local static requests resolve through the same `config/publication-boundary.json` contract used for staged publication;
- `/card-design/` remains the local entrypoint even when a mapped file's maintained source moves elsewhere;
- local artwork-authoring writes now target canonical `packages/game-data/current-game.json` rather than the retired pre-package path;
- the existing publication-route regression test locks the local server to the shared resolver.

After this lands, the verified first physical extraction remains the artwork authoring/compositor cluster: the seven `artwork-*` browser files can move together behind stable `/card-design/` file mappings without changing deployed URLs or the local authoring entrypoint.

## Card-design lifecycle state

`card-design/` remains a transitional production-tooling root, but its major roles are now classified:

- maintained design standards live under `docs/card-design/`;
- historical design studies/review notes live under `legacy/card-design-studies/`;
- v0.6.3 long-review and reference-copy provenance lives under `legacy/card-design-v0.6.3/`;
- the maintained reference-copy subtree selected by current component authority remains under `card-design/reference-copy/`;
- pure shared rendering model authority lives under `packages/rendering/`;
- browser rendering runtime remains under `card-design/` pending a deliberate tooling relocation now that the public route is independently materialized;
- authoring, review, compositor, and family-specific presentation tooling remains under `card-design/` pending a separate tools-boundary audit.

## Rules boundary state

- Canonical gameplay authority is `packages/game-data/current-game.json`.
- Maintained active rules source/support lives under `packages/rules/`.
- The monolithic Browser Rulebook source is archived under `legacy/rulebook-browser/`, but `/rulebook/` intentionally remains a release-transition route until the v0.7.2 lifecycle cutover.
- `rulebook/` is residual historical compatibility/publication support, not current rules authority.
- Rulebook QR assets remain active Player Guide publication support.

## Known documentation drift

`docs/Repository_Architecture.md` still contains some pre-#1735 Browser Rulebook examples that describe source under `apps/rulebook/`. The machine contracts and current repository state are authoritative; align that human document in a follow-up rather than using its stale examples as premises for new moves.

## Next top-down queue

1. Finish local card-design server alignment with the publication contract so source moves preserve both staged Pages and local authoring behavior.
2. Move the verified artwork authoring/compositor cluster out of the transitional `card-design/` source root behind stable `/card-design/` file mappings, updating its workflow/tests and establishing the maintained tooling boundary.
3. Audit the remaining review/inspection and family-specific presentation tooling before deciding the next card-design extraction.
4. Complete the `/rulebook/` release-route cutover only when release lifecycle authority advances; do not collapse the transition early.
5. Inspect Rules Arbiter implementation/data/export placement once ongoing functional work is stable enough that cleanup will not collide with it.
6. Continue production-tool consolidation (`scripts/`, `media/`, `tts/`, related tooling) only after callers and lifecycle are classified.
7. Audit governance/traceability and CI paths that still encode transitional locations.
8. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read #1430 and the current open cleanup PR/issue.
2. Read this file, the machine architecture contract, and the publication boundary.
3. Treat current `main` and GitHub as authoritative when any prose document lags.
4. Continue the highest-level unresolved architectural work before descending into local cleanup.
5. Update this file whenever the active tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
