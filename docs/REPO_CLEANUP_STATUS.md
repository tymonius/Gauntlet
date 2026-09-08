# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-09-08

## Governing objective

Clean up and reorganize the **entire Gauntlet repository** from the top down. Establish ownership and lifecycle boundaries first, consolidate implementations second, and defer individual-file cleanup until placement is settled.

The controlling question remains:

> **Should this thing exist here at all, and what architectural role does it serve?**

Do not polish files that may later move, merge, regenerate, archive, or disappear.

## Durable tracking

Master tracker: [#1430 — Repository cleanup and architecture reorganization](https://github.com/tymonius/Gauntlet/issues/1430)

Human architecture map: [`docs/Repository_Architecture.md`](Repository_Architecture.md)

Machine architecture contract: [`config/repository-architecture.json`](../config/repository-architecture.json)

GitHub/repository state is authoritative. This file is only the compact handoff.

## Current architecture baseline

[#1559 — Make repository architecture machine-readable on current main](https://github.com/tymonius/Gauntlet/pull/1559)

This re-lands the top-level architecture guard cleanly on current `main` instead of force-merging the old stacked cleanup branches. Every root directory has an explicit lifecycle role, target architectural group, and transition status; Governance Integrity checks the machine contract, actual root tree, and human architecture document together.

The earlier cleanup stack from #1456 through #1539 remains useful review/history evidence, but current `main` advanced substantially while it was open. Do not merge that old stack wholesale over newer digital-engine, Rules Arbiter, onboarding, or card-pipeline work. Re-land still-valid cleanup decisions deliberately against current `main`.

## Current tranche: application source/deployment separation

[#1562 — Separate Playtest source from public URL layout](https://github.com/tymonius/Gauntlet/pull/1562), stacked on #1559.

Playtest is the first concrete Phase 3 application migration:

- canonical repository source moves byte-for-byte from `playtest/` to `apps/playtest/`;
- the public compatibility contract remains `/playtest/`;
- GitHub Pages explicitly stages `apps/playtest/` into the deployed `/playtest/` tree;
- `/apps/` itself is source-only and must never be published;
- repository-source tests, validators, generation, and CI use `apps/playtest/`;
- browser/public links continue to use `/playtest/` or equivalent relative routes;
- generated Playtest PDFs/images remain co-located for this tranche so the source move is not mixed with generated-artifact lifecycle work.

No intentional gameplay, session-service, product behavior, or public-URL change belongs in this tranche.

## Architectural decisions now established

- **Source paths and public URLs are independent.** A stable deployed URL does not require a matching root source directory.
- **`apps/` is a first-class maintained-source boundary.** New current application migrations should use it rather than create compatibility aliases at repository root.
- **Pages is an explicit deployment artifact.** It materializes stable routes from canonical source boundaries and must not mirror the repository wholesale.
- **Historical compatibility stays explicit.** `legacy/`, frozen releases, and versioned public compatibility sources are not current authority.
- **Behavior-preserving architecture cleanup stays separate from gameplay/product changes.**
- **Generated-output lifecycle is a separate architectural question.** Do not combine binary/artifact retention changes with otherwise mechanical source moves unless required.

## Next top-down queue

After the Playtest migration is green and merged:

1. Select the next cohesive current application root for source/deployment separation, favoring a low-coupling player-facing surface that can validate the `apps/` pattern without a broad functional refactor. `start/` and `card-reference/` are the leading candidates; inspect actual dependency breadth before choosing.
2. Continue migrating current application source toward `apps/` while preserving deployed URLs through Pages staging.
3. Then address shared package boundaries (`game-data`, Rulebook authority, shared rendering/UI) where current roots mix authority, app, and production roles.
4. Continue production-tool consolidation toward `tools/` only after caller/lifecycle classification is clear.
5. Audit asset/generated-output lifecycle after source ownership is stable.
6. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read this file.
2. Read [#1430](https://github.com/tymonius/Gauntlet/issues/1430).
3. Inspect #1559 and the current structural PR named above, including CI and review comments.
4. Reconcile against current `main` before carrying forward any older cleanup branch.
5. Continue the highest-level unresolved architectural work before descending into local file cleanup.
6. Update this file when the current tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
