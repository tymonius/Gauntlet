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

[#1633 — Separate Factions source from public URL layout](https://github.com/tymonius/Gauntlet/pull/1633) is merged. It moved the Factions application to `apps/factions/`, preserved `/factions/`, and reclassified homepage-only Factions styling into shared `assets/` ownership.

The earlier cleanup stack from #1456 through #1539 remains useful review/history evidence, but current `main` advanced substantially while it was open. Do not merge that old stack wholesale over newer digital-engine, Rules Arbiter, onboarding, card-pipeline, or release work. Re-land still-valid cleanup decisions deliberately against current `main`.

## Current tranche: Deckbuilder source/deployment separation

Deckbuilder is the fifth concrete Phase 3 application migration:

- canonical Deckbuilder source moves from `deckbuilder/` to `apps/deckbuilder/`;
- the public compatibility contract remains `/deckbuilder/`;
- GitHub Pages explicitly stages `apps/deckbuilder/` into the deployed `/deckbuilder/` tree;
- `/apps/` itself remains source-only and must never be published;
- publication validation materializes `/deckbuilder/` from canonical source before checking the player-facing contract;
- Card Authority, publishing metadata, analytics routing, and live-publication triggers use `apps/deckbuilder/`;
- Deckbuilder custom-print, production-print, preview, and TTS-export code remain with the application because they register directly into and operate through the Deckbuilder runtime rather than functioning as independent production tools;
- repository-local browser journeys materialize `apps/deckbuilder/` at a temporary `/deckbuilder/` route before serving, preserving the same parent-relative/public-root behavior used in production;
- browser/public links and the canonical URL remain `/deckbuilder/`.

No intentional gameplay, deck construction behavior, rendering behavior, current authority, frozen-release content, or public-URL change belongs in this tranche.

## Architectural decisions now established

- **Source paths and public URLs are independent.** A stable deployed URL does not require a matching root source directory.
- **`apps/` is a first-class maintained-source boundary.** Current Card Reference, Deckbuilder, Factions, Start, and Playtest source live there; subsequent application migrations should follow the same pattern rather than create compatibility aliases at repository root.
- **App-integrated print/export code stays with its owning application.** A feature is not production tooling merely because it prints or exports; the Deckbuilder print/TTS features are runtime extensions of the Deckbuilder itself.
- **Cross-application assets should be classified by actual ownership, not historical directory placement.** Homepage-only Factions presentation belongs with shared/public assets rather than inside the Factions application.
- **Pages is an explicit deployment artifact.** It materializes stable routes from canonical source boundaries and must not mirror the repository wholesale.
- **Historical compatibility stays explicit.** `legacy/`, frozen releases, and versioned public compatibility sources are not current authority.
- **Behavior-preserving architecture cleanup stays separate from gameplay/product changes.**
- **Generated-output lifecycle is a separate architectural question.** Do not combine binary/artifact retention changes with otherwise mechanical source moves unless required.

## Next top-down queue

After the Deckbuilder migration is green and merged:

1. Inspect the remaining mixed-role application/package roots, starting with the Rulebook boundary (`rulebook/`) and shared rendering/UI dependencies, before choosing the next move.
2. Address the `game-data/` package boundary after confirming all current authority consumers and historical adapters.
3. Continue production-tool consolidation toward `tools/` only after caller/lifecycle classification is clear.
4. Audit asset/generated-output lifecycle after source ownership is stable.
5. Only then begin repository-wide individual-file cleanup: dead files, stale tests, naming, factoring, comments, formatting, and local organization.

## Resume protocol

1. Read this file.
2. Read [#1430](https://github.com/tymonius/Gauntlet/issues/1430).
3. Inspect merged #1562, #1571, #1626, and #1633 plus the current structural PR, including CI and review comments.
4. Reconcile against current `main` before carrying forward any older cleanup branch.
5. Continue the highest-level unresolved architectural work before descending into local file cleanup.
6. Update this file when the current tranche, architectural decisions, or next-step queue materially changes.

## Removal condition

Delete this file when #1430 is complete and close the tracker at the same time.
