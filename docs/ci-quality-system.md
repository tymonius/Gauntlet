# Gauntlet CI Quality System

## Goal

Gauntlet CI should maximize defect detection without making failure routine.

A red required check must mean that the proposed change violates a current, durable contract that the check owns. Broad coverage is valuable, but broad coverage and universal merge blocking are different decisions.

The system therefore separates **what gets tested** from **what blocks every pull request**.

## Layers

### 1. Stable pull-request gates

Ordinary pull requests should expose a small, stable set of required checks:

- **Governance Integrity** — repository governance/audit invariants.
- **Test** — changed or related code tests, TypeScript checking when TypeScript changes, and asset-family checks only when their inputs change.
- **PR Quality Gate / Gate** — routes the pull request to the current-product contracts affected by its changed files and reports one stable final result.

Do not add a path-filtered subsystem workflow directly to branch protection. A required check that sometimes does not run can leave a pull request permanently pending. Route conditional checks through `PR Quality Gate` instead.

### 2. Conditional subsystem contracts

A subsystem contract runs when the changed files can affect that subsystem. Current examples include:

- current public publication contract;
- Start → Deckbuilder onboarding handoff;
- Rulebook booklet generation, geometry, and reproducibility.

A subsystem contract should answer a small number of durable questions about its own boundary. It should not freeze incidental copy, DOM structure, exact binary metadata, or implementation details unless those details are themselves part of the product contract.

### 3. Full regression

The full regression suite is retained and runs nightly or manually through **Full regression**.

Its purpose is to catch surprising cross-system regressions that change-based selection can miss. It is intentionally not a universal pull-request blocker.

A nightly failure is a signal to investigate. If it reveals a real current defect, add or improve the narrow contract that would have caught that defect at the appropriate boundary. Do not respond by making the entire nightly suite block every unrelated pull request.

### 4. Post-merge live verification

**Verify current live publication** runs after relevant changes reach `main`.

It verifies the exact GitHub Pages commit and then applies the same current-publication contract to the deployed site. Rules Arbiter deployment is performed only when Worker-owned inputs changed.

Pre-merge repository validation and post-merge production validation should test the same durable contract rather than maintain two unrelated checklists.

### 5. Historical and reconstruction tooling

Historical releases, withdrawn candidates, and reconstruction tooling are not current-product merge gates.

Keep a historical workflow only when it still has plausible forensic or rebuild value. Such workflows should normally be manual. Completed candidate/publishing pipelines should be removed from `.github/workflows`; Git history already preserves them.

Immutable historical evidence has a narrowly scoped integrity check. Current UI or gameplay changes should not re-prove old release candidates.

## Test design rules

A new required gate must have all of the following:

1. **Clear ownership.** Its name and implementation identify the subsystem or boundary it protects.
2. **A durable contract.** It tests behavior that should remain true across ordinary implementation changes.
3. **Relevant triggers.** It runs only when changed inputs can violate that contract, or is routed through the stable PR gate.
4. **Determinism.** Re-running the same revision should produce the same pass/fail result absent an explicitly external production check.
5. **Actionable failure.** A developer should be able to tell what class of problem needs attention from the failing check and error.
6. **Current relevance.** Release-specific assertions are retired, rewritten, or moved to historical tooling when the product lifecycle changes.

A test should be deleted or refactored when its assertion is no longer a product invariant. Do not change the product merely to satisfy an obsolete test.

Examples of assertions that generally do **not** belong in durable gates:

- exact marketing or instructional copy;
- absence of a feature that may later be intentionally added;
- exact generated PDF hashes when content/geometry/reproducibility are the real contract;
- reconstruction-state assumptions after publication;
- old-release current-version assertions;
- unrelated subsystem health checks triggered only because a shared file such as `package.json` changed.

## Test selection

`Test` is allowed to run broad coverage when the change itself is broad, such as test-runner configuration or package/dependency changes. For ordinary changes it should run changed tests and tests related to changed source modules.

Asset checks follow the same rule:

- analytics checks when analytics-bearing pages or analytics synchronization change;
- TTS checks when TTS inputs change;
- media checks when media inputs change.

This is selective execution, not reduced coverage. The nightly full regression remains the backstop.

## CI inventory

`scripts/audit-ci-workflows.mjs` inventories workflow files and automatic events. The report is diagnostic, not a merge threshold.

Use it to review:

- growth in the number of automatic pull-request workflows;
- workflows with broad triggers such as shared package files;
- version/candidate/reconstruction-named workflows that may have outlived their lifecycle;
- duplicated ownership of the same product boundary.

Filename heuristics identify items for human review; they are **not** evidence by themselves that a workflow is obsolete. For example, a historically named service may still own a current production backend.

## Branch protection

After this system is merged, protect `main` and require pull requests before merge.

Recommended required status checks:

- `Governance Integrity`
- `Test`
- `PR Quality Gate / Gate`

Do **not** directly require conditional subsystem jobs, full regression, historical checks, or post-merge live verification.

Recommended settings:

- require a pull request before merging;
- require the three stable status checks above;
- do not allow a failing required check to be bypassed casually;
- keep **Full regression** non-required;
- keep **Verify current live publication** post-merge rather than a PR requirement.

Whether to require a branch to be fully up to date before merging should be decided based on observed merge-conflict risk versus rerun churn; it is not necessary to make the rest of this model work.

## Failure-response rule

When CI fails, classify the failure before changing product code:

1. **Real defect:** fix the product/change.
2. **Real contract, bad checker:** fix the checker.
3. **Obsolete contract:** delete or retire the test/workflow.
4. **Wrong ownership/trigger:** move or narrow the check.
5. **Flake/external instability:** stabilize it or remove it from required PR gating.

The desired steady state is simple: broad testing still happens, but routine pull requests have few automatic workflows, and a red required check is unusual enough to command attention.
