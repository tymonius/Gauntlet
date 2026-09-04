# Repository Cleanup Working Context

> **Temporary working document.** Keep this file only while the repo-wide cleanup/reorganization is in progress. Delete it when the cleanup project is complete.

## What we are doing

This is a **repo-wide cleanup and architectural reorganization of Gauntlet**.

The work is intentionally **top-down**. The goal is not to make individual files prettier first; it is to make the repository's architecture understandable, deliberate, and internally consistent before descending into local cleanup.

The governing question is:

> **Should this thing exist, where should it live, and what architectural role/authority does it have?**

Only after those questions are settled should we spend time on file-level cleanup.

## Order of operations

1. **Repository architecture**
   - identify the major systems and public/deployed surfaces;
   - establish clear top-level ownership and lifecycle boundaries;
   - distinguish authoritative, active, transitional, generated, historical, and obsolete material;
   - eliminate misleading or ambiguous structure.

2. **Subsystem architecture**
   - examine each major subsystem in turn (digital engine, playtest/browser surfaces, canonical game data, deckbuilder, Rules Arbiter, release/version infrastructure, docs/governance/traceability, tooling/CI/recovery/history, etc.);
   - determine the authoritative implementation and intended boundary for each;
   - consolidate overlapping or superseded implementations.

3. **Implementation consolidation / quarantine**
   - move historical implementations out of active boundaries when they still need to be preserved;
   - remove genuinely obsolete material when preservation is unnecessary;
   - update imports, scripts, CI, documentation, and traceability so they agree with the new structure;
   - preserve behavior unless a cleanup tranche explicitly intends a behavior change.

4. **Individual-file cleanup**
   - only after the architecture is settled, clean up dead/duplicate files, stale tests, naming, oversized or misplaced modules, obsolete comments/references, local organization, formatting, and similar file-level issues.

## Important working principles

- **Architecture first, files second.** Do not drift into piecemeal file cleanup while larger ownership/boundary questions remain unresolved.
- **One clear authority per concern.** Duplicate implementations or competing sources of truth should be reconciled deliberately.
- **Historical material must look historical.** If old code/data must remain for provenance, reproducibility, or migration evidence, quarantine it behind an explicit legacy/history boundary rather than leaving it mixed with maintained code.
- **Do not confuse a current tranche with the overall project.** Digital-engine cleanup is one part of the repo-wide reorganization, not the project itself.
- **Preserve behavior by default.** Structural cleanup should not silently alter gameplay, canonical rules, public URLs, or deployed behavior.
- **Update dependent boundaries together.** Moves/reclassification may require coordinated changes to CI, scripts, imports, governance/traceability, documentation, tests, and release tooling.
- **Prefer deletion or consolidation over creating new permanent scaffolding.** This file itself is temporary and exists only to maintain continuity across chat threads during the cleanup.

## Current tranche

As of **2026-09-04**, the active cleanup tranche is:

- **PR #1427 — Quarantine legacy v0.6 playable engine**
  - https://github.com/tymonius/Gauntlet/pull/1427
  - branch: `cleanup/quarantine-v06-playable-engine`
  - purpose: move the earlier playable v0.6-era `cards`, `effects`, `state`, `types`, and `dev` architecture out of active `src/` into `legacy/digital-engine-v06/`;
  - preserve the archived implementation/test trees and historical runners;
  - keep active TypeScript/Vitest/CI boundaries focused on maintained source;
  - update documentation and traceability so archived v0.6 engine code is no longer represented as current engine authority;
  - **not** intended to promote new v0.7 behavior or alter current gameplay/public runtime behavior.

This PR is **one architectural cleanup tranche inside the broader repo cleanup**.

## Resume protocol for a new chat thread

When asked to "continue the repo cleanup" or equivalent:

1. Read this file first.
2. Inspect the current/open cleanup PR(s), especially the PR named in **Current tranche**.
3. Inspect recent merged cleanup PRs as needed to understand what architectural decisions have already landed.
4. Re-establish the repo-level architectural objective before making changes.
5. Continue the current tranche if it is unfinished; otherwise identify the next highest-level architectural cleanup target.
6. Do **not** require the user to re-explain that the project is repo-wide, top-down cleanup.
7. Update this file when the active tranche or durable cleanup strategy materially changes.
8. Delete this file when the repo-wide cleanup project is complete.
