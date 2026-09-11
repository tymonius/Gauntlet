# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-09-11

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

[#1633 — Separate Factions source from public URL layout](https://github.com/tymonius/Gauntlet/pull/1633) is merged. It moved the Factions application to `apps/factions/`, preserved `/factions/`, and reclassified homepage-only Factions styling into shared `assets/` ownership.

[#1641 — Separate Deckbuilder source from public URL layout](https://github.com/tymonius/Gauntlet/pull/1641) is merged. It moved the complete maintained Deckbuilder application to `apps/deckbuilder/`, preserved `/deckbuilder/`, retained app-integrated print/export features with the Deckbuilder runtime, and extended public-route materialization across the source-separated application set.

The earlier cleanup stack from #1456 through #1539 remains useful review/history evidence, but current `main` advanced substantially while it was open. Do not merge that old stack wholesale over newer digital-engine, Rules Arbiter, onboarding, card-pipeline, or release work. Re-land still-valid cleanup decisions deliberately against current `main`.

## Current tranche: game-data shared-package separation

The first shared-package migration moves the complete current gameplay authority and its thin adapters from `game-data/` to `packages/game-data/` while preserving the browser-facing `/game-data/` route.

- canonical current gameplay authority becomes `packages/game-data/current-game.json`;
- its validation/runtime/art-direction adapters remain together in the same package;
- repository scripts, tests, and CI that inspect source use `packages/game-data/` directly;
- public browser consumers continue using `/game-data/` and relative `../game-data/` URLs;
- GitHub Pages and publication compatibility materialize `packages/game-data/` at the stable `/game-data/` route;
- `packages/` becomes a first-class non-transitional repository ownership boundary;
- frozen releases and historical versioned data paths remain untouched.

No intentional gameplay, authority-content, rendering, current-release, or public-URL change belongs in this tranche.

## Architectural decisions now established

- **Source paths and public URLs are independent.** A stable deployed URL does not require a matching root source directory.
- **`apps/` is a first-class maintained-source boundary.** Current Card Reference, Deckbuilder, Factions, Start, and Playtest source live there; subsequent application migrations should follow the same pattern rather than create compatibility aliases at repository root.
- **`packages/` is a first-class maintained shared-source boundary.** Current gameplay authority and its adapters live at `packages/game-data/`; public browser access remains `/game-data/` through staging rather than a root source alias.
- **App-integrated print/export code stays with its owning application.** A feature is not production tooling merely because it prints or exports; the Deckbuilder print/TTS features are runtime extensions of the Deckbuilder itself.
- **Cross-application assets should be classified by actual ownership, not historical directory placement.** Homepage-only Factions presentation belongs with shared/public assets rather than inside the Factions application.
- **Pages is an explicit deployment artifact.** It materializes stable routes from canonical source boundaries and must not mirror the repository wholesale.
- **Historical compatibility stays explicit.** `legacy/`, frozen releases, and versioned public compatibility sources are not current authority.
- **Behavior-preserving architecture cleanup stays separate from gameplay/product changes.**
- **Generated-output lifecycle is a separate architectural question.** Do not combine binary/artifact retention changes with otherwise mechanical source moves unless required.

## Next top-down queue

After the game-data package migration is green and merged:

1. Inspect the Rulebook boundary (`rulebook/`) and separate current rules authority from browser/production support before relocating either role.
2. Inspect `card-design/` and shared rendering/UI dependencies to identify the smallest genuine reusable packages (`rendering`, shared UI) versus production authoring tools.
3. Continue production-tool consolidation toward `tools/` only after caller/lifecycle classification is clear.
4. Audit asset/generated-output lifecycle after source ownership is stable.
5. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read this file.
2. Read [#1430](https://github.com/tymonius/Gauntlet/issues/1430).
3. Inspect merged #1562, #1571, #1626, #1633, and #1641 plus the current structural PR, including CI and review comments.
4. Reconcile against current `main` before carrying forward any older cleanup branch.
5. Continue the highest-level unresolved architectural work before descending into local file cleanup.
6. Update this file when the current tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
