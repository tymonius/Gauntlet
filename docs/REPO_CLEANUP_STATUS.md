# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-09-10

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

This re-landed the top-level architecture guard cleanly on current `main` instead of force-merging the old stacked cleanup branches. Every root directory has an explicit lifecycle role, target architectural group, and transition status; Governance Integrity checks the machine contract, actual root tree, and human architecture document together.

[#1562 — Separate Playtest source from public URL layout](https://github.com/tymonius/Gauntlet/pull/1562) is merged. It established the Phase 3 source/deployment-separation pattern by moving canonical Playtest source to `apps/playtest/` while preserving the stable public `/playtest/` route through explicit Pages staging.

[#1571 — Separate Start source from public URL layout](https://github.com/tymonius/Gauntlet/pull/1571) is merged. It applied the same boundary to Start, moving canonical source to `apps/start/` while preserving `/start/`.

[#1626 — Separate Card Reference source from public URL layout](https://github.com/tymonius/Gauntlet/pull/1626) is merged. It moved canonical Card Reference source to `apps/card-reference/` while preserving `/card-reference/` and hardened source-path retirement checks.

The earlier cleanup stack from #1456 through #1539 remains useful review/history evidence, but current `main` advanced substantially while it was open. Do not merge that old stack wholesale over newer digital-engine, Rules Arbiter, onboarding, card-pipeline, or release work. Re-land still-valid cleanup decisions deliberately against current `main`.

## Current tranche: Factions source/deployment separation

Factions is the fourth concrete Phase 3 application migration:

- canonical Factions application source moves from `factions/` to `apps/factions/`;
- the public compatibility contract remains `/factions/` and `/factions/<faction>/`;
- GitHub Pages explicitly stages `apps/factions/` into the deployed `/factions/` tree;
- `/apps/` itself remains source-only and must never be published;
- publication validation materializes `/factions/` from canonical source before checking the player-facing contract;
- source-aware tests, accessibility coverage, publishing metadata, analytics routing, and live-publication triggers use `apps/factions/`;
- `factions/homepage.css` was identified as root-homepage presentation rather than Factions application source and is reclassified as `assets/homepage-factions.css`;
- browser/public links continue to use `/factions/` or equivalent relative routes.

No intentional gameplay, faction behavior, current authority, frozen-release content, or public-URL change belongs in this tranche.

## Architectural decisions now established

- **Source paths and public URLs are independent.** A stable deployed URL does not require a matching root source directory.
- **`apps/` is a first-class maintained-source boundary.** Current Card Reference, Factions, Start, and Playtest source live there; subsequent application migrations should follow the same pattern rather than create compatibility aliases at repository root.
- **Cross-application assets should be classified by actual ownership, not historical directory placement.** Homepage-only Factions presentation belongs with shared/public assets rather than inside the Factions application.
- **Pages is an explicit deployment artifact.** It materializes stable routes from canonical source boundaries and must not mirror the repository wholesale.
- **Historical compatibility stays explicit.** `legacy/`, frozen releases, and versioned public compatibility sources are not current authority.
- **Behavior-preserving architecture cleanup stays separate from gameplay/product changes.**
- **Generated-output lifecycle is a separate architectural question.** Do not combine binary/artifact retention changes with otherwise mechanical source moves unless required.

## Next top-down queue

After the Factions migration is green and merged:

1. Inspect `deckbuilder/` as the next major current application candidate; classify its renderer/print/tooling dependencies before deciding whether it can move cleanly to `apps/deckbuilder/` or needs an application/tooling split first.
2. Continue migrating clear current application source toward `apps/` while preserving deployed URLs through Pages staging.
3. Then address shared package boundaries (`game-data`, Rulebook authority, shared rendering/UI) where current roots mix authority, app, and production roles.
4. Continue production-tool consolidation toward `tools/` only after caller/lifecycle classification is clear.
5. Audit asset/generated-output lifecycle after source ownership is stable.
6. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read this file.
2. Read [#1430](https://github.com/tymonius/Gauntlet/issues/1430).
3. Inspect merged #1562, #1571, and #1626 plus the current structural PR, including CI and review comments.
4. Reconcile against current `main` before carrying forward any older cleanup branch.
5. Continue the highest-level unresolved architectural work before descending into local file cleanup.
6. Update this file when the current tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
