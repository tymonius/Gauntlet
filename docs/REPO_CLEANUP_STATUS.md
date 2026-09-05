# Repository Cleanup Status

> **Temporary working document.** Delete this file when the repository-wide cleanup tracked by [#1430](https://github.com/tymonius/Gauntlet/issues/1430) is complete.

Last updated: 2026-09-05

## What we are doing

We are cleaning up and reorganizing the **entire Gauntlet repository**, not merely the digital engine.

The governing approach is **top-down architecture first, individual-file cleanup last**.

The objective is to make it obvious:

- what each major repository area is for;
- which implementation/source is authoritative;
- which paths are active, transitional, generated, deployed, historical, or obsolete;
- where a new change belongs;
- what may be safely retired, quarantined, consolidated, or regenerated.

The key question before touching an individual file is:

> **Should this thing exist here at all, and what architectural role does it serve?**

Do not spend cleanup effort polishing files that may later be moved, merged, regenerated, quarantined, or deleted.

## Order of work

1. **Repository architecture**
   - establish top-level ownership/lifecycle boundaries;
   - identify misleading, duplicated, or ambiguous major structures;
   - make the repository map understandable before local cleanup.

2. **Subsystem architecture**
   - digital engine;
   - player-facing browser/playtest surfaces;
   - canonical game/rules data and generated derivatives;
   - Deckbuilder;
   - Rules Arbiter;
   - release/version/publication infrastructure;
   - governance/traceability;
   - build/validation/CI/tooling;
   - recovery/migration/archive/legacy material.

3. **Implementation consolidation**
   - distinguish active code from historical/superseded implementations;
   - determine authority before moving or deleting anything;
   - promote, consolidate, quarantine, or retire implementations as appropriate;
   - update imports, scripts, tests, CI, traceability, and documentation to match the new boundaries.

4. **Individual-file cleanup**
   - dead or duplicate files;
   - stale tests;
   - naming and placement;
   - oversized or badly factored modules;
   - obsolete comments/references;
   - formatting and local organization.

## Operating principles

- Prefer one clear authoritative implementation per current concern.
- Historical snapshots and migration scaffolding must not masquerade as active architecture.
- Preserve useful historical/recovery evidence deliberately under explicit historical boundaries rather than leaving it intermixed with maintained code.
- Old does not automatically mean disposable; classify before deleting.
- Existing duplication does not justify preserving multiple active implementations; determine authority and consolidate.
- Keep behavior-preserving cleanup separate from intentional rules/product changes where practical.
- When an architectural boundary changes, update the machinery that encodes that boundary: imports, scripts, tests, CI, traceability, validation, and documentation.
- Do not descend into file-by-file beautification until the higher-level placement and ownership questions are settled.

## Tracking

Master tracker: [#1430 — Repository cleanup and architecture reorganization](https://github.com/tymonius/Gauntlet/issues/1430)

Cleanup PRs should link #1430. The issue is the durable queue/history; this file is the compact thread-handoff summary.

## Completed tranche

[#1427 — Quarantine legacy v0.6 playable engine](https://github.com/tymonius/Gauntlet/pull/1427) merged at `a630d550370d6f87ce069bcd6681901011130750`.

## Current tranche

PR: [#1456](https://github.com/tymonius/Gauntlet/pull/1456). Branch: `cleanup/archive-v062-migration`. Original archival commit: `564e1398`.

- Preserve all seven v0.6.2 migration implementation/test files under `legacy/digital-engine-migration/v0.6.2/`.
- Make v0.6.3 self-contained by moving its four required type shapes into its own rules module and removing the obsolete bridge.
- Point historical validation readers at the archive; archived snapshots remain excluded from CI changed-test routing. Full-suite discovery alignment belongs to the follow-up validation tranche.
- Keep gameplay behavior unchanged; compare the promoted engine entrypoint with release lifecycle/current authority for implementation lag.

Validation: TypeScript and all 130 focused tests pass; all seven archived blobs match their originals. The full maintained suite exposes pre-existing failures on unchanged main, including stale historical paths and obsolete renderer assertions. Full-suite discovery changes are separated from this archival PR so that repair can be reviewed explicitly.

Next: audit the remaining v0.6.3 procedure library and historical content adapters against promoted engine coverage. Preserve any still-unpromoted behavior until its role is settled. Gameplay parity work belongs to #741 and must not be silently folded into architectural cleanup.

## Follow-up tranche

PR: [#1458](https://github.com/tymonius/Gauntlet/pull/1458). Branch: `cleanup/archive-v064-content-adapter` (stacked on #1456). Preserve the unused candidate content adapter/test under the existing migration archive; no maintained consumer imports it. This removes the last active source import of reconstruction snapshots. The next tranche archives the remaining stale procedure library as requested.

## Stale procedure archival

PR: [#1459](https://github.com/tymonius/Gauntlet/pull/1459). Branch: `cleanup/archive-v063-procedures` (stacked on #1458). Per user direction, do not continue developing stale rules. The entire stale procedure library and content adapter/test are preserved outside active source, and its obsolete closeout scripts are frozen with their original blob identities. CI is green. The maintained engine implementation is unchanged.

## Historical adapter archival

PR: [#1466](https://github.com/tymonius/Gauntlet/pull/1466). Branch: `cleanup/archive-v06-content-adapters` (stacked on #1459). The remaining historical content adapters and shared legacy content types have moved from active `src/content/` into the historical engine package. Old package-level development, validation, release, print, preview, and data commands are removed while source remains for the tooling-lifecycle audit. Historical validators read the archived path.

Next: repair historical validation paths and audit browser/renderer ownership. Full-suite discovery remains a known validation-boundary debt, alongside baseline stale renderer assertions; do not mistake scoped green CI results for a fully green repository suite.

## Withdrawn release tooling freeze

PR: [#1467](https://github.com/tymonius/Gauntlet/pull/1467). Branch: `cleanup/freeze-v062-tooling` (stacked on #1466). The remaining v0.6.2 release builders, synchronizers, renderers, and validators have moved from active `scripts/` into frozen recovery evidence with blob locks. Active lifecycle validation continues to enforce the withdrawal, while the test boundary now checks that retired v0.6.2 tooling cannot reappear as maintained entrypoints. <!-- DOC-HISTORICAL -->

Next: validate this tranche in CI, then audit browser/renderer ownership and the stale renderer assertions exposed by the baseline full suite.

## Renderer compatibility consolidation

PR: [#1468](https://github.com/tymonius/Gauntlet/pull/1468). Branch: `cleanup/consolidate-renderer-aliases` (stacked on #1467). `card-design/face-render.html` remains the single physical-face renderer. Card Design print aliases and all TTS renderer compatibility pages now delegate through `card-design/legacy-face-redirect.mjs`; their public URLs and accepted query parameters remain available without duplicating render or redirect logic. Renderer authority and TTS tests now assert this boundary.

Next: validate this tranche in CI, then review the broader player-facing browser surface ownership separately from physical-card rendering.

## Playtest runtime documentation

Branch: `cleanup/playtest-runtime-docs` (stacked on #1468). The public playtest and session-service READMEs now identify the maintained authority files instead of presenting a retired release as the runtime baseline. Their new-session serial examples match the deployed worker contract, while older serial families remain explicitly historical.

Next: validate this documentation tranche, then determine whether the public and facilitated playtest UI modules share enough behavior to consolidate code without changing their distinct workflows.

## Architectural queue

Review in highest-level-first order. The result of a review may be "leave it alone."

1. Repository root / top-level directory ownership and lifecycle boundaries.
2. Active digital-engine boundary and remaining versioned migration layers.
3. Player-facing browser/playtest surface ownership and duplication.
4. Canonical rules/game-data ownership versus generated/derived copies.
5. Deckbuilder architecture and generated/static dependencies.
6. Rules Arbiter implementation, source-data, admin/review/export boundaries.
7. Release/version/publication infrastructure and historical release retention.
8. Governance/traceability ownership and historical-path handling.
9. Build, validation, CI, developer tooling, recovery scripts, and frozen historical tooling.
10. Archive/legacy/generated-output classification and remaining duplicate implementations.
11. Only after the above stabilize: repository-wide individual-file cleanup.

## Resume protocol for a fresh ChatGPT thread

When the previous thread is exhausted and the user says to continue the repo cleanup:

1. Read this file.
2. Read [#1430](https://github.com/tymonius/Gauntlet/issues/1430).
3. Inspect the current/open cleanup PR referenced here and its CI/comments.
4. Inspect the most recent cleanup PRs if needed to reconstruct exactly what changed.
5. Continue the highest-level unresolved architectural work; do **not** reinterpret the project as merely the subsystem represented by the current PR.
6. Before finishing a tranche, update this file if the current tranche, architectural decisions, or next-step queue materially changed.
7. Link the cleanup PR to #1430.

GitHub/repository state is authoritative for exact current implementation status. Chat/project memory is supplementary.

## Removal condition

Delete `docs/REPO_CLEANUP_STATUS.md` when the architecture cleanup tracked by #1430 is complete and the repository no longer needs a temporary handoff document. The issue should be closed at the same time.
