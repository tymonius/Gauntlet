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

PR: [#1469](https://github.com/tymonius/Gauntlet/pull/1469). Branch: `cleanup/playtest-runtime-docs` (stacked on #1468). The public playtest and session-service READMEs now identify the maintained authority files instead of presenting a retired release as the runtime baseline. Their new-session serial examples match the deployed worker contract, while older serial families remain explicitly historical.

Next: validate this documentation tranche, then determine whether the public and facilitated playtest UI modules share enough behavior to consolidate code without changing their distinct workflows.

## Active playtest tooling name

PR: [#1470](https://github.com/tymonius/Gauntlet/pull/1470). Branch: `cleanup/rename-playtest-e2e` (stacked on #1469). The maintained formal-session end-to-end test now has a version-neutral filename matching its package command and active deployment workflow. Its implementation is unchanged; only the misleading retired-version name and references are corrected.

CI is green. Next: audit other active version-named validators individually before deciding whether they are current contracts or historical reconstruction tooling. The immediate boundary is the Rulebook production adapter described below.

## Version-neutral Rulebook production

PR: [#1479](https://github.com/tymonius/Gauntlet/pull/1479). Branch: `cleanup/version-agnostic-rulebook-production` (stacked on #1470). The user confirmed that durable, version-neutral architecture is a cleanup priority. The maintained v0.7.0 and v0.7.1 renderers now pass their source and release identity explicitly to `scripts/build-rulebook-production.py`; they no longer import the v0.6.3 wrapper, transient path, or renderer. The v0.6.3 entrypoint remains fixed as a historical compatibility wrapper.

This tranche also repairs the publication ownership boundary left after the root compatibility aliases were retired. Current and historical booklet paths address `legacy/v0.6.1-rulebook-publication/` directly, browser runners accept its repository URL prefix, and generated asset references resolve from canonical repository paths. The shared visual system remains identified as v0.6.1 provenance, while active adapters and workflows are independent of a stale rules version. <!-- DOC-HISTORICAL -->

Validation: all four PR workflows are green at `11036968`. The new production-boundary contract and related release/publication tests pass. The v0.7.1 browser pipeline passes source generation and the eight-page visual fidelity gate locally; final PDF pagination remains covered by its main-target release workflow because the local host cannot resolve the external Adobe Typekit resource.

## Withdrawn candidate tooling freeze

PR: [#1482](https://github.com/tymonius/Gauntlet/pull/1482). Branch: `cleanup/archive-v063-candidate-tooling` (stacked on #1479). The closed 17-script v0.6.3 card-normalization and candidate-authority pipeline has moved byte-for-byte from active `scripts/` into `docs/recovery/frozen-scripts/v0.6.3/`. Every preserved Git blob is release-locked. The maintained Last Stand terminology audit reads the one historical implementation file it examines from the archive and now normalizes checkout line endings before checking certified content hashes. <!-- DOC-HISTORICAL -->

The new boundary test rejects restored active entrypoints and verifies every frozen blob lock. Local validation passes: 7 focused tests, TypeScript, all 116 release-recovery locks, release-path normalization, the Last Stand terminology contract, and CI workflow inventory. All four PR workflows are green at `5dc9cbc2`.

Next: continue classifying active version-named validation and reconstruction commands. Prefer explicit authority/config inputs for maintained tools, archive closed withdrawn-release pipelines, and leave genuine historical reproduction contracts pinned. The immediate follow-up is the uncalled downstream reconstruction builder/validator pair, whose retired starter-catalog dependency makes it inoperable from the maintained tree.

## Downstream reconstruction tooling freeze

PR: [#1486](https://github.com/tymonius/Gauntlet/pull/1486). Branch: `cleanup/archive-v063-downstream-reconstruction` (stacked on #1482). The uncalled clean-v0.6.3 downstream-data builder and validator have moved unchanged into frozen recovery evidence. Their required starter-catalog module was already absent from the maintained tree, so leaving these files in `scripts/` advertised broken commands. Both Git blobs are release-locked, and a focused boundary test prevents the entrypoints from returning to maintained tooling. <!-- DOC-HISTORICAL -->

Local validation passes: 9 focused architecture tests, TypeScript, all 118 release-recovery locks, release-path normalization, rules-authority governance, and the maintained Last Stand terminology contract. All four PR workflows are green at `051497c0`.

Next: continue the caller-based classification of remaining version-named scripts. The retired browser-development generator/refiner/validator is the next closed pipeline; the manual reconstruction audit and current publication contract require separate treatment because they still have explicit workflows.

## Browser-development tooling freeze

PR: [#1487](https://github.com/tymonius/Gauntlet/pull/1487). Branch: `cleanup/archive-v063-browser-development` (stacked on #1486). The uncalled v0.6.3 browser-development builder, two refiners, and validator have moved unchanged into frozen recovery evidence. They target the removed development site and depend on source files no longer present in the maintained tree. All four Git blobs are release-locked, and a focused boundary test prevents these retired entrypoints from returning to active scripts. <!-- DOC-HISTORICAL -->

Local validation passes: 11 focused architecture tests, TypeScript, all 122 release-recovery locks, release-path normalization, rules-authority governance, and the maintained Last Stand terminology contract. All four PR workflows are green at `c383e777`.

Next: archive the 11 remaining orphaned v0.6.3 editorial/candidate utilities that have no workflow, package command, or maintained importer. Several require candidate or development-site inputs already removed from the active tree. Keep the explicitly invoked reconstruction and publication contracts separate.

## Orphaned editorial tooling freeze

PR: [#1504](https://github.com/tymonius/Gauntlet/pull/1504). Branch: `cleanup/archive-v063-orphaned-validators` (stacked on #1487). Eleven uncalled v0.6.3 editorial synchronizers and candidate validators have moved byte-for-byte into frozen recovery evidence. None had a workflow, package command, or maintained importer; several required withdrawn candidate artifacts or removed development-site inputs. All eleven Git blobs are release-locked, and a focused boundary test prevents their entrypoints from returning to active scripts. <!-- DOC-HISTORICAL -->

Local validation passes: 13 focused architecture tests, TypeScript, all 133 release-recovery locks, release-path normalization, rules-authority governance, and the maintained Last Stand terminology contract. All four PR workflows are green at `2f19be0f`.

Next: archive the ten remaining uncalled clean-v0.6.3 reconstruction builders and validators. Reconstruction and publication entrypoints that still have explicit workflow callers require consolidation or deliberate historical retention rather than caller-free archival.

## Orphaned reconstruction tooling freeze

PR: [#1506](https://github.com/tymonius/Gauntlet/pull/1506). Branch: `cleanup/archive-v063-orphaned-reconstruction` (stacked on #1504). Ten uncalled clean-v0.6.3 authority, Rulebook, digital, Deckbuilder, and certification builders or validators have moved unchanged into frozen recovery evidence. All ten Git blobs are release-locked. Stale exceptions for already archived candidate scripts are removed, leaving the historical-script exception set scoped to the one validator that still has an explicit manual-workflow caller. <!-- DOC-HISTORICAL -->

Local validation passes: 15 focused architecture tests, TypeScript, all 143 release-recovery locks, release-path normalization, rules-authority governance, and the maintained Last Stand terminology contract. All four PR workflows are green at `be25b0ae`.

Next: freeze the closed historical v0.6.3 publication-construction cluster, remove its unused live verifier from the maintained publication workflow checkout, and repoint the maintained terminology audit at frozen evidence. Keep the current release verifier and explicit historical booklet/forensic workflows separate. <!-- DOC-HISTORICAL -->

## Historical publication tooling freeze

PR: [#1508](https://github.com/tymonius/Gauntlet/pull/1508). Branch: `cleanup/archive-v063-publication-tooling` (stacked on #1506). Eleven closed v0.6.3 publication builders, renderers, validators, and the legacy live-publication verifier have moved unchanged into frozen recovery evidence. All eleven Git blobs are release-locked. The maintained current-publication workflow no longer checks out the unused version-specific live verifier, while the Last Stand terminology audit reads only its selected historical publisher evidence from the frozen archive. Cross-platform text hashing keeps the certified checks stable on LF and CRLF worktrees. <!-- DOC-HISTORICAL -->

Local validation passes: 20 focused tests, TypeScript, all 154 release-recovery locks, release-path normalization, rules-authority governance, the certified player Rulebook validator, and the maintained Last Stand terminology contract. All four PR workflows are green at `20757c1f`.

Next: make the maintained current-Rulebook booklet workflow independent of the v0.6.3-named production pipeline. Preserve the v0.6.3 booklet path as a historical reproduction contract, and route current releases through explicit current-authority inputs and version-neutral entrypoints. <!-- DOC-HISTORICAL -->

## Version-neutral current booklet routing

PR: [#1510](https://github.com/tymonius/Gauntlet/pull/1510). Branch: `cleanup/version-agnostic-current-booklet` (stacked on #1508). The maintained current-booklet entrypoint now resolves its release identity, package root, source builder, and renderer from `config/release-lifecycle.json`. The manual publisher delegates to the same reusable workflow and commits the complete generated current release payload. The v0.6.3 booklet workflow is explicitly named and routed as a historical reproduction contract, and the PR quality gate evaluates current and historical booklet changes separately. <!-- DOC-HISTORICAL -->

Local validation passes: 32 architecture-boundary tests, TypeScript, rules-authority governance, both maintained v0.6.3 language validators, and current lifecycle plan resolution. The end-to-end current build passes source materialization and the eight-page visual fidelity gate locally; final PDF pagination still requires the CI environment's external publication font access. All six automatic PR workflows are green at `d4621fa9`, and the manually dispatched [full PR quality gate](https://github.com/tymonius/Gauntlet/actions/runs/34011069422) passes both current and historical booklet renders. <!-- DOC-HISTORICAL -->

Next: validate both booklet contracts in GitHub Actions, then continue making maintained release publication orchestration lifecycle-driven. The remaining version-specific release builders and live-publication verifier should become release adapters behind current entrypoints rather than define maintained workflow identity.

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
