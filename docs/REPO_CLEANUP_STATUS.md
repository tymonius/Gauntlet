# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-09-14

## Governing objective

Clean up and reorganize the **entire Gauntlet repository** from the top down. Establish ownership and lifecycle boundaries first, consolidate implementations second, and defer individual-file cleanup until placement is settled.

The controlling question remains:

> **Should this thing exist here at all, and what architectural role does it serve?**

GitHub/current `main` is authoritative. This file is only the compact repository-local handoff.

## Durable tracking

- Master tracker: [#1430 — Repository cleanup and architecture reorganization](https://github.com/tymonius/Gauntlet/issues/1430)
- Human architecture map: [`docs/Repository_Architecture.md`](Repository_Architecture.md)
- Machine root-architecture contract: [`config/repository-architecture.json`](../config/repository-architecture.json)
- Public/deployment boundary contract: [`config/publication-boundary.json`](../config/publication-boundary.json)
- Active rules-surface contract: [`config/rules-surface-contract.json`](../config/rules-surface-contract.json)

## Architecture baseline now merged

- [#1559](https://github.com/tymonius/Gauntlet/pull/1559) made top-level repository ownership/lifecycle machine-readable.
- [#1562](https://github.com/tymonius/Gauntlet/pull/1562), [#1571](https://github.com/tymonius/Gauntlet/pull/1571), [#1626](https://github.com/tymonius/Gauntlet/pull/1626), [#1633](https://github.com/tymonius/Gauntlet/pull/1633), and [#1641](https://github.com/tymonius/Gauntlet/pull/1641) established `apps/` as the canonical maintained application-source boundary while preserving stable public URLs through explicit deployment staging.
- [#1683](https://github.com/tymonius/Gauntlet/pull/1683) moved the complete current gameplay-authority package from retired root `game-data/` to `packages/game-data/` while preserving `/game-data/`.
- [#1691](https://github.com/tymonius/Gauntlet/pull/1691) made the Pages/public-route graph contract-driven.
- [#1699](https://github.com/tymonius/Gauntlet/pull/1699), [#1709](https://github.com/tymonius/Gauntlet/pull/1709), and [#1713](https://github.com/tymonius/Gauntlet/pull/1713) completed recovered asset/generated-output cleanup under [#1672](https://github.com/tymonius/Gauntlet/issues/1672).
- [#1716](https://github.com/tymonius/Gauntlet/pull/1716) consolidated remaining simple informational public surfaces under `apps/`.
- [#1723](https://github.com/tymonius/Gauntlet/pull/1723) separated Browser Rulebook application source into `apps/rulebook/` while preserving `/rulebook/`.
- [#1724](https://github.com/tymonius/Gauntlet/pull/1724) established the active three-layer `/rules/` architecture: Player's Guide, Faction Guides, and Comprehensive Rules, with explicitly materialized source Markdown.
- [#1727](https://github.com/tymonius/Gauntlet/pull/1727) retired completed v0.6.4-candidate/terminology migration scaffolding while preserving still-consumed historical correction modules.
- Recovered cleanup issues #1670, #1671, #1672, and #1673 are complete.

Older cleanup branches remain design evidence only. Re-land still-valid ideas deliberately against current `main`; do not merge stale branches over newer engine, Rules Arbiter, publication, or rendering work.

## Current tranche: active rules-source package

The active Player's Guide, six Faction Guides, Faction Guide template, and Comprehensive Rules are durable maintained source shared by the `/rules/` application and publication system. They are being moved from mixed `rulebook/` subtrees into `packages/rules/` while preserving all deployed URLs through `config/publication-boundary.json`.

This tranche is deliberately mechanical:

- gameplay authority remains `packages/game-data/current-game.json`;
- rules text and mechanics are unchanged;
- `/rules/`, `/rules/sources/...`, and the transitional `/rulebook/player-guide/player-guide.md` review path remain stable;
- `apps/rules/routes.json` points to the packaged maintained sources;
- publication CI checks out the complete `packages/rules/` source package instead of one-off Rulebook source paths;
- the legacy monolithic Browser Rulebook remains under `rulebook/` during retirement-coverage work;
- historical v0.6.3/v0.7.0 correction support and Rulebook publication/editorial material stay in place until their owning lifecycles are handled coherently.

## Architectural decisions now established

- **Gameplay authority is singular.** Canonical gameplay authority is `packages/game-data/current-game.json`; active technical/teaching rules documents are governed projections, not an independent mechanics authority.
- **`apps/` is the maintained application-source boundary.** Public URLs do not dictate repository source placement.
- **`packages/` is the maintained shared-source boundary.** It contains both current gameplay authority (`packages/game-data/`) and durable active rules source (`packages/rules/`).
- **Pages is an explicit deployment artifact.** New source roots are non-public unless the publication contract deliberately materializes them.
- **The monolithic Browser Rulebook is transitional legacy coverage.** Its app lives in `apps/rulebook/`; its remaining source/support under `rulebook/` should not be mixed back into the active three-layer rules package.
- **Historical release/support source stays intact until it can move as a coherent historical unit.** A version-specific file is not dead merely because it is not current gameplay authority.
- **Behavior-preserving architecture cleanup remains separate from gameplay/product changes.**

## Next top-down queue

1. Finish the `packages/rules/` move and prove the publication/CI boundary is green.
2. Classify the remaining `rulebook/` publication/editorial, legacy monolithic Rulebook, QR assets, and version-specific support into coherent legacy/tooling/docs destinations.
3. Inspect Rules Arbiter implementation/data/export placement once ongoing functional work is stable enough that cleanup will not collide with it.
4. Inspect `card-design/` and shared rendering/UI dependencies for genuine reusable package boundaries versus production authoring tools.
5. Continue production-tool consolidation toward `tools/` only after caller/lifecycle classification is clear.
6. Audit governance/traceability and CI paths that still encode transitional locations.
7. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read #1430 and the current open cleanup PR/issue.
2. Read this file and `docs/Repository_Architecture.md`.
3. Reconcile all proposed structural work against current `main` before carrying forward any older branch.
4. Continue the highest-level unresolved architectural work before descending into local file cleanup.
5. Update this file whenever the active tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
