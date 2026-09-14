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

## Architecture baseline now merged

- [#1559](https://github.com/tymonius/Gauntlet/pull/1559) made top-level repository ownership/lifecycle machine-readable.
- [#1562](https://github.com/tymonius/Gauntlet/pull/1562), [#1571](https://github.com/tymonius/Gauntlet/pull/1571), [#1626](https://github.com/tymonius/Gauntlet/pull/1626), [#1633](https://github.com/tymonius/Gauntlet/pull/1633), and [#1641](https://github.com/tymonius/Gauntlet/pull/1641) established `apps/` as the canonical maintained application-source boundary while preserving stable public URLs through explicit deployment staging.
- [#1683](https://github.com/tymonius/Gauntlet/pull/1683) moved the complete current gameplay-authority package from the retired root `game-data/` source boundary to `packages/game-data/` while preserving the stable browser `/game-data/` route.
- [#1691](https://github.com/tymonius/Gauntlet/pull/1691) made the Pages/public-route graph contract-driven.
- [#1699](https://github.com/tymonius/Gauntlet/pull/1699), [#1709](https://github.com/tymonius/Gauntlet/pull/1709), and [#1713](https://github.com/tymonius/Gauntlet/pull/1713) completed recovered asset/generated-output cleanup under [#1672](https://github.com/tymonius/Gauntlet/issues/1672).
- Recovered cleanup issues #1670, #1671, #1672, and #1673 are complete.
- Historical v0.6.x reconstruction/publication sources that still need preservation live under explicit recovery/history boundaries rather than masquerading as current authority.

The older cleanup stack remains useful design evidence only. Re-land still-valid ideas deliberately against current `main`; do not merge stale branches over newer engine, Rules Arbiter, publication, or rendering work.

## Current tranche: informational application-source consolidation

The current structural tranche moves the remaining simple informational public surfaces—About, Accessibility, Changelog, Contact, FAQ, Press, and Privacy—under the canonical `apps/` source boundary while preserving `/about/`, `/accessibility/`, `/changelog/`, `/contact/`, `/faq/`, `/press/`, and `/privacy/` as stable public URLs through `config/publication-boundary.json`.

This tranche is intentionally behavior-preserving:

- HTML bytes move without content changes;
- `/contact/thanks/` remains a managed nested route;
- the seven obsolete root source directories disappear;
- publication validation, sparse-checkout inputs, and accessibility tests follow the canonical source locations;
- the architecture contract no longer marks those seven root directories as transitional because they no longer exist.

No gameplay or product behavior change belongs in this tranche.

## Architectural decisions now established

- **Source paths and public URLs are independent.** Stable deployed URLs do not require matching root source directories.
- **`apps/` is the maintained application-source boundary.** Current player-facing application and informational-page source lives there unless a subsystem has an explicitly documented transitional boundary.
- **`packages/` is a maintained shared-source boundary.** Current gameplay authority lives at `packages/game-data/`; browser consumers retain `/game-data/` through materialization/staging.
- **Pages is an explicit deployment artifact.** It must not become a repository mirror, and new source roots are non-public unless the publication contract deliberately includes them.
- **Historical compatibility stays explicit.** `legacy/`, frozen releases, and versioned historical sources are not current authority even when their public URLs remain supported.
- **App-integrated print/export stays with the owning app.** A runtime feature is not production tooling merely because it prints or exports.
- **Behavior-preserving architecture cleanup remains separate from gameplay/product changes.**

## Next top-down queue

After the informational-app tranche is green and merged:

1. Inspect the `rulebook/` boundary and separate current rules authority from browser/production support before relocating either role.
2. Inspect the Rules Arbiter implementation/data/export placement once ongoing functional work is stable enough that cleanup will not collide with it.
3. Inspect `card-design/` and shared rendering/UI dependencies for genuine reusable package boundaries versus production authoring tools.
4. Continue production-tool consolidation toward `tools/` only after caller/lifecycle classification is clear.
5. Audit governance/traceability and CI paths that still encode transitional locations.
6. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read #1430 and the current open cleanup PR/issue.
2. Read this file and `docs/Repository_Architecture.md`.
3. Reconcile all proposed structural work against current `main` before carrying forward any older branch.
4. Continue the highest-level unresolved architectural work before descending into local file cleanup.
5. Update this file whenever the active tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
