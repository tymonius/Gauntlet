# Gauntlet v0.6.3 Playtest Tools

Public current playtest surfaces:

- Printable sheet: `https://gauntlet.run/playtest/`
- Formal session page: `https://gauntlet.run/playtest/session/?code=<SESSION-TOKEN>`
- Coded batch generator: `https://gauntlet.run/playtest/batch/`
- Game-night host/onboarding tools under `https://gauntlet.run/playtest/`

The current formal playtest workflow records **v0.6.3** as its rules version. Newly created sheet/event/game serials use the **G063** prefix. Historical G061 records remain readable and retain their original version identity.

## Version integrity

The playtest sheet, browser batch/event creators, session UI, and production playtest-session Worker must agree with `../config/current-release.json`. This is enforced by `scripts/validate-current-release-integrity.mjs`.

The production Worker entry point is `workers/playtest-sessions/src/current-release.js`. It is a compatibility boundary around the established playtest service stack: old sessions continue to resolve normally, while new formal, event, table, tracked, and standalone-feedback creation is normalized to the current release.

## Unique session codes

Each formal printed sheet receives one unique join QR code, one human-readable sheet serial, one linked digital session record, and one private host key retained by the facilitator. Closing the session preserves the record but blocks future joins/events and retires the QR code.

Example current serial:

```text
G063-ABCD2345
```

The human-readable serial remains a fallback for damaged QR codes and reconciliation.

## Coded batch procedure

1. Confirm the playtest-session Worker `/health` reports `v0.6.3`.
2. Open `/playtest/batch/` and enter the number of sheets, optional batch label, and facilitator creation key.
3. Generate the batch. Every generated session is live immediately.
4. Download the private host manifest before printing or leaving the page.
5. Print the sheets.
6. Close each session after play; its QR code is then retired.

The downloaded manifest contains private host controls and must not be distributed with player sheets.

## Rules Arbiter linkage

Questions asked through a current playtest session use the current public Rules Arbiter and are linked to the session record. The stored playtest session retains the rules-version identity under which the game was created. Historical records are never relabeled during a later release cutover.

## Interpretation rule

Record what happened before proposing a fix. One unusual game is evidence, not a verdict. Deterministic exploits, impossible resolutions, or repeatable play blockers warrant faster escalation.

The broader testing standard remains [`../docs/Gauntlet_Playtest_Targets_and_Metrics.md`](../docs/Gauntlet_Playtest_Targets_and_Metrics.md).
