# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-09-13

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

## Architecture baseline now merged

- [#1559](https://github.com/tymonius/Gauntlet/pull/1559) made top-level repository ownership/lifecycle machine-readable.
- [#1562](https://github.com/tymonius/Gauntlet/pull/1562), [#1571](https://github.com/tymonius/Gauntlet/pull/1571), [#1626](https://github.com/tymonius/Gauntlet/pull/1626), [#1633](https://github.com/tymonius/Gauntlet/pull/1633), and [#1641](https://github.com/tymonius/Gauntlet/pull/1641) established `apps/` as the canonical maintained application-source boundary while preserving stable public URLs through explicit deployment staging.
- [#1683](https://github.com/tymonius/Gauntlet/pull/1683) moved the complete current gameplay-authority package from the retired root `game-data/` source boundary to `packages/game-data/` while preserving the stable browser `/game-data/` route.
- Historical v0.6.x reconstruction/publication sources that still need preservation live under explicit recovery/history boundaries rather than masquerading as current authority.

The older cleanup stack remains useful design evidence only. Re-land still-valid ideas deliberately against current `main`; do not merge stale branches over newer engine, Rules Arbiter, publication, or rendering work.

## Current tranche: public route and Pages publication boundary

[#1691 — Codify public route and Pages publication boundary](https://github.com/tymonius/Gauntlet/pull/1691) is the active structural PR, implementing the durable work preserved in [#1670](https://github.com/tymonius/Gauntlet/issues/1670).

This tranche makes the deployment graph explicit rather than leaving it duplicated across shell arrays and compatibility helpers:

- `config/publication-boundary.json` inventories directly published Pages roots, source-only repository roots, source-to-public route mappings, managed current-app deep links, and lifecycle-bound versioned routes;
- Pages staging consumes that contract and remains default-deny for new repository roots;
- local/public-route compatibility materialization consumes the same mapping rather than maintaining a second inventory;
- current application `index.html` routes are validated against the declared deep-link graph;
- staged local `href`/`src` references are checked and managed-route links must point to declared routes;
- versioned route status is derived from `config/release-lifecycle.json`, preventing historical or withdrawn releases from presenting themselves as current;
- current public URLs and current `config/` publication behavior remain unchanged unless separately audited and intentionally revised.

The tranche also corrects the preserved `/v0.6.3/` landing, which still described v0.6.3 as current even though lifecycle authority marks it historical.

No gameplay change belongs in this tranche.

## Architectural decisions now established

- **Source paths and public URLs are independent.** Stable deployed URLs do not require matching root source directories.
- **`apps/` is the maintained application-source boundary.** Current Card Reference, Deckbuilder, Factions, Rules, Start, and Playtest sources live there and deploy to stable routes.
- **`packages/` is a maintained shared-source boundary.** Current gameplay authority lives at `packages/game-data/`; browser consumers retain `/game-data/` through materialization/staging.
- **Pages is an explicit deployment artifact.** It must not become a repository mirror, and new source roots are non-public unless the publication contract deliberately includes them.
- **Historical compatibility stays explicit.** `legacy/`, frozen releases, and versioned historical sources are not current authority even when their public URLs remain supported.
- **App-integrated print/export stays with the owning app.** A runtime feature is not production tooling merely because it prints or exports.
- **Generated-output lifecycle remains a separate architectural question.** Do not mix binary-retention policy into otherwise mechanical source moves unless required.
- **Behavior-preserving architecture cleanup remains separate from gameplay/product changes.**

## Next top-down queue

After #1691 is green and merged:

1. Inspect the `rulebook/` boundary and separate current rules authority from browser/production support before relocating either role.
2. Resolve [#1671](https://github.com/tymonius/Gauntlet/issues/1671): retire obsolete renderer-family/compatibility/parity scaffolding after confirming the canonical face renderer has all live consumers.
3. Resolve [#1672](https://github.com/tymonius/Gauntlet/issues/1672): re-land asset/generated-output cleanup on current `main` only after source ownership is stable.
4. Resolve [#1673](https://github.com/tymonius/Gauntlet/issues/1673): retire version-specific release-refresh automation in favor of lifecycle-driven current-release automation.
5. Inspect `card-design/` and shared rendering/UI dependencies for genuine reusable package boundaries versus production authoring tools.
6. Continue production-tool consolidation toward `tools/` only after caller/lifecycle classification is clear.
7. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read #1430 and the current open cleanup PR/issue.
2. Read this file and `docs/Repository_Architecture.md`.
3. Reconcile all proposed structural work against current `main` before carrying forward any older branch.
4. Continue the highest-level unresolved architectural work before descending into local file cleanup.
5. Update this file whenever the active tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
