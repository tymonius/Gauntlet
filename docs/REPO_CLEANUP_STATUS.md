# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-09-15

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

- [#1735](https://github.com/tymonius/Gauntlet/pull/1735) archived the Browser Rulebook source under `legacy/rulebook-browser/` while deliberately keeping `/rulebook/` materialized from it as the v0.7.1 release-transition bridge. The post-v0.7.2 redirect is prepared but dormant.
- [#1736](https://github.com/tymonius/Gauntlet/pull/1736) moved maintained current rule-fact derivation/synchronization into `packages/rules/rule-facts.js`; the old `rulebook/player-facing/rule-facts.js` path is compatibility-only.
- [#1740](https://github.com/tymonius/Gauntlet/pull/1740) repaired the TTS sparse checkout so the packaged rule-facts dependency is available to TTS validation.
- [#1739](https://github.com/tymonius/Gauntlet/pull/1739) moved the explicitly historical v0.6.3 long-card review source to `legacy/card-design-v0.6.3/` while preserving its stable `/card-design/...` URLs through the publication contract.
- [#1741](https://github.com/tymonius/Gauntlet/pull/1741) moved superseded Deed and Military design-study pages to `legacy/card-design-studies/`, again preserving their established public review URLs.

## Current tranche — card-design documentation boundary

Current PR: [#1742](https://github.com/tymonius/Gauntlet/pull/1742)

`card-design/` is still a transitional mixed production root, but historical review evidence and maintained documentation should not masquerade as executable rendering/authoring source.

This tranche moves two clearly maintained standards, content-identically, to `docs/card-design/`:

- `PARCHMENT_BACKGROUND_MAPPING.md` — current parchment source/rendering implementation documentation;
- `faction-feature-taxonomy.md` — current production-card component-language standard.

Their existing `/card-design/*.md` URLs remain materialized by `config/publication-boundary.json`.

`config/repository-architecture.json` now states the intended split explicitly:

- maintained runtime/rendering/authoring source remains under `card-design/` for now;
- maintained card-design documentation belongs under `docs/card-design/`;
- historical design studies belong under `legacy/`;
- the unresolved architectural target is the split between a true shared rendering package and production tooling.

## Verified shared-rendering seam

The repository already contains a genuine shared model boundary, not merely browser-page implementation:

- `card-design/face-authority.mjs`
- `card-design/face-spec.mjs`
- `card-design/production-surface.mjs`
- `card-design/face-template-registry.mjs`
- `card-design/face-templates/*.mjs`

`scripts/card-authority/model.mjs` directly consumes the face authority/spec/template registry, while browser rendering consumes the same family through `card-design/`.

Do **not** move this family mechanically into `packages/rendering/` yet. `packages/` is source-only in the publication contract, while browsers currently import rendering modules from `/card-design/`. A package move therefore needs an explicit development/publication import contract rather than a simple path rename.

## Deliberately unresolved card-design material

- `tracker-card-design-notes.md` mixes current physical/layout guidance with version-specific and mechanically specific rationale. Audit those mechanics against current gameplay authority before classifying it as maintained documentation or historical evidence.
- `capital-ledger-review.md` is explicitly version-specific production-review material and needs a consumer/lifecycle check before archival.
- `capital-ledger-preview.html` needs the same consumer/lifecycle classification before being treated as current tooling or historical review evidence.
- The remaining renderer/authoring implementation should be classified by dependency role before any `packages/rendering/` or `tools/` move.

## Rules boundary state

- Canonical gameplay authority is `packages/game-data/current-game.json`.
- Maintained active rules source/support lives under `packages/rules/`.
- The monolithic Browser Rulebook source is archived under `legacy/rulebook-browser/`, but `/rulebook/` intentionally remains a release-transition route until the v0.7.2 lifecycle cutover.
- `rulebook/` is residual historical compatibility/publication support, not current rules authority.
- Rulebook QR assets were verified during #1736 as active Player Guide publication support; do not classify them as dead merely because the surrounding root is transitional.

## Known documentation drift

`docs/Repository_Architecture.md` still contains some pre-#1735 examples that describe Browser Rulebook source under `apps/rulebook/`. The machine contracts and current repository state are authoritative; align that human document in a follow-up rather than using its stale examples as premises for new moves.

## Next top-down queue

1. Finish [#1742](https://github.com/tymonius/Gauntlet/pull/1742) and prove the documentation/publication split through CI and Pages staging.
2. Classify the remaining non-runtime material in `card-design/`, especially tracker notes and Capital Ledger review/preview artifacts, using current mechanics and actual consumers rather than filenames alone.
3. Design the source/publication contract required for a genuine `packages/rendering/` boundary; only then move the shared face/render model if the dependency graph still supports that split.
4. Complete the `/rulebook/` release-route cutover only when release lifecycle authority advances to v0.7.2; do not collapse the transition early.
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
