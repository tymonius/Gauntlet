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

- [#1735](https://github.com/tymonius/Gauntlet/pull/1735) archived the Browser Rulebook source under `legacy/rulebook-browser/` while deliberately keeping `/rulebook/` materialized from it as the v0.7.1 release-transition bridge.
- [#1736](https://github.com/tymonius/Gauntlet/pull/1736) moved maintained current rule-fact derivation/synchronization into `packages/rules/rule-facts.js`; the old `rulebook/player-facing/rule-facts.js` path is compatibility-only.
- [#1740](https://github.com/tymonius/Gauntlet/pull/1740) repaired the TTS sparse checkout for the packaged rule-facts dependency.
- [#1739](https://github.com/tymonius/Gauntlet/pull/1739) archived the v0.6.3 long-card review source while preserving its `/card-design/...` URLs.
- [#1741](https://github.com/tymonius/Gauntlet/pull/1741) archived superseded Deed/Military design-study pages while preserving their public review URLs.
- [#1742](https://github.com/tymonius/Gauntlet/pull/1742) moved maintained card-design standards to `docs/card-design/` while preserving their public URLs.
- [#1749](https://github.com/tymonius/Gauntlet/pull/1749) archived the version-specific Capital Ledger review and tracker design notes after confirming they were historical evidence rather than current authority.
- [#1752](https://github.com/tymonius/Gauntlet/pull/1752) archived the complete v0.6.3 reference-copy subtree after verifying current component authority points only at v0.7.0 reference copy. The old public v0.6.3 paths remain materialized for provenance.

## Current tranche — shared rendering model package

Current PR: [#1753](https://github.com/tymonius/Gauntlet/pull/1753)

The first genuine `packages/rendering/` boundary is now narrow enough to implement without moving browser-specific rendering code mechanically.

Verified environment-neutral authority moving into the package:

- `packages/rendering/production-surface.mjs` — production card geometry and raster scale;
- `packages/rendering/face-authority.mjs` — canonical physical-face catalog, template identity, pairing, and back-policy model.

The established repository-root browser/TTS paths remain as thin compatibility adapters:

- `card-design/production-surface.mjs`
- `card-design/face-authority.mjs`

Because `packages/` remains source-only for GitHub Pages, `config/publication-boundary.json` materializes the package authority directly at the stable public URLs `/card-design/production-surface.mjs` and `/card-design/face-authority.mjs`. The in-place compatibility materializer deliberately preserves tracked adapters instead of overwriting repository source.

TTS and card-media sparse checkouts, plus Card Authority render scope, include `packages/rendering/` in the same tranche. `tests/rendering-package-boundary.test.ts` locks the ownership, adapter, publication, and CI contracts together.

## Rendering boundary still deliberately unresolved

Do **not** interpret `packages/rendering/` as permission to move the rest of `card-design/` wholesale.

The following remain environment- or presentation-specific and require their own dependency/consumer audit before any move:

- `card-design/face-spec.mjs` — mixes canonical face identity with browser/public asset dependencies and Node/browser authority routing;
- `card-design/face-template-registry.mjs`;
- `card-design/face-templates/*.mjs`;
- renderer pages/styles and authoring/compositor implementation.

The current package extraction is intentionally limited to the pure shared model layer.

## Card-design lifecycle state

`card-design/` remains a transitional production-tooling root, but its non-runtime material is now classified:

- maintained design standards live under `docs/card-design/`;
- historical design studies/review notes live under `legacy/card-design-studies/`;
- v0.6.3 long-review and reference-copy provenance lives under `legacy/card-design-v0.6.3/`;
- current v0.7.0 reference copy remains under `card-design/reference-copy/v0.7.0/`;
- pure shared rendering model authority is moving under `packages/rendering/`;
- browser-specific rendering and authoring implementation remains under `card-design/` pending further classification.

## Rules boundary state

- Canonical gameplay authority is `packages/game-data/current-game.json`.
- Maintained active rules source/support lives under `packages/rules/`.
- The monolithic Browser Rulebook source is archived under `legacy/rulebook-browser/`, but `/rulebook/` intentionally remains a release-transition route until the v0.7.2 lifecycle cutover.
- `rulebook/` is residual historical compatibility/publication support, not current rules authority.
- Rulebook QR assets remain active Player Guide publication support.

## Known documentation drift

`docs/Repository_Architecture.md` still contains some pre-#1735 Browser Rulebook examples that describe source under `apps/rulebook/`. The machine contracts and current repository state are authoritative; align that human document in a follow-up rather than using its stale examples as premises for new moves.

## Next top-down queue

1. Finish [#1753](https://github.com/tymonius/Gauntlet/pull/1753) and prove the package/adapters/publication/CI contract through repository tests, Card Authority, TTS, and Pages staging.
2. Audit the remaining `card-design/` renderer/template/authoring implementation by dependency role; do not move environment-specific code merely to reduce the root.
3. Complete the `/rulebook/` release-route cutover only when release lifecycle authority advances to v0.7.2; do not collapse the transition early.
4. Inspect Rules Arbiter implementation/data/export placement once ongoing functional work is stable enough that cleanup will not collide with it.
5. Continue production-tool consolidation (`scripts/`, `media/`, `tts/`, related tooling) only after callers and lifecycle are classified.
6. Audit governance/traceability and CI paths that still encode transitional locations.
7. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read #1430 and the current open cleanup PR/issue.
2. Read this file, the machine architecture contract, and the publication boundary.
3. Treat current `main` and GitHub as authoritative when any prose document lags.
4. Continue the highest-level unresolved architectural work before descending into local cleanup.
5. Update this file whenever the active tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
