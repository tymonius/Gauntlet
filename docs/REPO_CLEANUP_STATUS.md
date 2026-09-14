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
- Rules publication source registry: [`config/rules-publication-sources.json`](../config/rules-publication-sources.json)

## Architecture baseline now merged

- [#1559](https://github.com/tymonius/Gauntlet/pull/1559) made top-level ownership/lifecycle machine-readable.
- [#1562](https://github.com/tymonius/Gauntlet/pull/1562), [#1571](https://github.com/tymonius/Gauntlet/pull/1571), [#1626](https://github.com/tymonius/Gauntlet/pull/1626), [#1633](https://github.com/tymonius/Gauntlet/pull/1633), and [#1641](https://github.com/tymonius/Gauntlet/pull/1641) established `apps/` as the maintained application-source boundary while preserving public URLs through deployment staging.
- [#1683](https://github.com/tymonius/Gauntlet/pull/1683) moved current gameplay authority to `packages/game-data/` while preserving `/game-data/`.
- [#1691](https://github.com/tymonius/Gauntlet/pull/1691) made the Pages/public-route graph contract-driven.
- [#1699](https://github.com/tymonius/Gauntlet/pull/1699), [#1709](https://github.com/tymonius/Gauntlet/pull/1709), and [#1713](https://github.com/tymonius/Gauntlet/pull/1713) completed recovered asset/generated-output cleanup under [#1672](https://github.com/tymonius/Gauntlet/issues/1672).
- [#1716](https://github.com/tymonius/Gauntlet/pull/1716) consolidated remaining simple informational public surfaces under `apps/`.
- [#1723](https://github.com/tymonius/Gauntlet/pull/1723) separated Browser Rulebook application source into `apps/rulebook/` while preserving `/rulebook/`.
- [#1724](https://github.com/tymonius/Gauntlet/pull/1724) established the active three-layer `/rules/` architecture.
- [#1727](https://github.com/tymonius/Gauntlet/pull/1727) retired completed rules-migration scaffolding while preserving still-consumed historical correction modules.
- [#1729](https://github.com/tymonius/Gauntlet/pull/1729) added a fingerprinted retirement crosswalk proving the legacy monolithic Rulebook is covered by the active rules architecture; route retirement remains separate.
- [#1731](https://github.com/tymonius/Gauntlet/pull/1731) moved the Player's Guide, Faction Guides/template, and Comprehensive Rules into `packages/rules/` and centralized active rules-source paths in the publication registry.
- [#1734](https://github.com/tymonius/Gauntlet/pull/1734) moved active editorial/pedagogy/dependency publication support into `packages/rules/publication/`, closed the Pages trigger gap for `packages/rules/**`, and reclassified `rulebook/` as transitional historical compatibility.
- Recovered cleanup issues #1670, #1671, #1672, and #1673 are complete.

Older cleanup branches remain design evidence only. Re-land still-valid ideas deliberately against current `main`; do not merge stale branches over newer engine, Rules Arbiter, publication, or rendering work.

## Current tranche: remove current logic from the legacy Rulebook boundary

The maintained implementation formerly at `rulebook/player-facing/rule-facts.js` is not historical compatibility code. It derives and validates facts from `packages/game-data/current-game.json` and synchronizes current rules prose. Its implementation therefore belongs with maintained rules support under `packages/rules/`.

This tranche is deliberately structural:

- move the maintained `rule-facts.js` implementation unchanged to `packages/rules/rule-facts.js`;
- update current governance validation and the lifecycle-selected v0.7.1 Rulebook renderer to consume the packaged helper directly;
- retain `rulebook/player-facing/rule-facts.js` only as a tiny compatibility re-export for preserved version-pinned tooling such as the v0.7.0 renderer;
- correct stale authority language in `legacy/README.md`;
- update architecture contracts so `rulebook/` no longer owns maintained current rule-fact logic;
- leave legacy monolithic Rulebook content, historical v0.6.3/v0.7.0 correction inputs, Chapter 11 support, and QR assets untouched pending their own lifecycle decisions.

After this tranche, no maintained current rule-fact implementation remains under `rulebook/`; the old path is compatibility-only.

## Architectural decisions now established

- **Gameplay authority is singular.** Canonical gameplay authority is `packages/game-data/current-game.json`; active technical/teaching rules documents and helpers are governed projections/support, not an independent mechanics authority.
- **`apps/` is the maintained application-source boundary.** Public URLs do not dictate repository source placement.
- **`packages/` is the maintained shared-source boundary.** It contains current gameplay authority (`packages/game-data/`) and durable active rules source/support (`packages/rules/`).
- **Pages is an explicit deployment artifact.** New source roots are non-public unless the publication contract deliberately materializes them.
- **The monolithic Browser Rulebook is transitional legacy coverage.** Its app lives in `apps/rulebook/`; its retirement coverage is mechanically proved, but route retirement remains a separate deliberate change.
- **Historical release/support source stays intact until it can move as a coherent historical unit.** A version-specific file is not dead merely because it is not current gameplay authority.
- **`legacy/public-versions/` is specifically historical browser-source material staged to stable versioned URLs.** Do not mix renderer/validation support inputs into that boundary merely because they share a version number.
- **Behavior-preserving architecture cleanup remains separate from gameplay/product changes.**

## Verified residual `rulebook/` classification

- `player-facing/current-rulebook.md` — legacy monolithic Rulebook compatibility/publication source; not gameplay authority.
- `player-facing/chapter-11.md` + `player-facing/corrections.js` — verified v0.6.3 historical support consumed by the preserved v0.6.3 validation/reconstruction path.
- `player-facing/v070-corrections.js` — verified v0.7.0 historical renderer support.
- `player-facing/rule-facts.js` — transitional compatibility re-export only; maintained implementation lives at `packages/rules/rule-facts.js`.
- `assets/qr/` — lifecycle not yet proven; do not classify as dead/unused without consumer evidence.

## Next top-down queue

1. Finish the `packages/rules/rule-facts.js` move and prove governance, the current Rulebook renderer, and full CI stay green.
2. Classify/consolidate the verified v0.6.3 and v0.7.0 historical Rulebook support with their true historical tooling owners; do not put tooling inputs under `legacy/public-versions/`, which is a staged browser-source boundary.
3. Prove the lifecycle/consumers for `rulebook/assets/qr/` before moving or deleting it.
4. Decide legacy `/rulebook/` route retirement/redirect/archive behavior separately from source placement, using the #1729 crosswalk as evidence rather than deleting the route implicitly.
5. Inspect Rules Arbiter implementation/data/export placement once ongoing functional work is stable enough that cleanup will not collide with it.
6. Inspect `card-design/` and shared rendering/UI dependencies for genuine reusable package boundaries versus production authoring tools.
7. Continue production-tool consolidation toward `tools/` only after caller/lifecycle classification is clear.
8. Audit governance/traceability and CI paths that still encode transitional locations.
9. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read #1430 and the current open cleanup PR/issue.
2. Read this file and `docs/Repository_Architecture.md`.
3. Reconcile all proposed structural work against current `main` before carrying forward any older branch.
4. Continue the highest-level unresolved architectural work before descending into local file cleanup.
5. Update this file whenever the active tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
