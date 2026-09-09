# Testing policy

Gauntlet intentionally keeps historical code and regression material in the repository, so test discovery and the maintained regression gate are not the same thing.

## Maintained Vitest suite

`npm test` and `npx vitest run` run the maintained Vitest suite through `vitest.config.ts`.

A test is maintained by default unless it is in one of two explicit classes:

- `legacy/**` — retained historical engine snapshots. These are not current CI authority.
- `tests/vitest-quarantine.json` — non-legacy tests that are currently stale, broken, or bound to a removed surface. Every quarantined test is named explicitly with a reason.

New tests therefore enter the maintained suite automatically. There is no maintained-test allowlist to forget to update.

The 2026-09-09 baseline that motivated this policy contained 573 discoverable Vitest files. Of those, 156 were under `legacy/`, 57 non-legacy files were failing and are explicitly quarantined, and 360 files formed the initial maintained green suite.

## Quarantine policy

Quarantine is visible test debt, not a second archive. A test should leave quarantine by either:

1. being updated to assert the current contract and passing in the maintained suite, or
2. being formally retired/moved with the historical surface it covers.

Do not add a failing current test to quarantine merely to make CI green. The quarantine entry must explain why the test is temporarily outside the maintained gate.

Run `node scripts/validate-vitest-classification.mjs` to verify that every quarantine entry is unique, tracked, non-legacy, and still names a Vitest file.

## All-discovered diagnostic run

To intentionally attempt every discoverable test, including historical and quarantined files, run:

```bash
npx vitest run --config vitest.discovered.config.ts
```

This is an archaeology/cleanup diagnostic. It is not expected to be green and is not a release gate.

## Full regression

`.github/workflows/full-regression.yml` runs the maintained Vitest classification check and `npm run test:full`. The latter combines the maintained Vitest suite with typechecking and the repository's additional current-contract checks.
