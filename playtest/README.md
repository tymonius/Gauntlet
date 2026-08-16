# Gauntlet Playtest Tools

**Current canonical tabletop release:** v0.6.3 — Third Playtest Revision  
**Coded-session service baseline:** v0.6.1 pending runtime migration

Public pages:

- Printable sheet: `https://gauntlet.run/playtest/`
- Formal session page: `https://gauntlet.run/playtest/session/?code=<SESSION-TOKEN>`
- Coded batch generator: `https://gauntlet.run/playtest/batch/`

This directory contains the routine human-playtest questionnaire and its linked formal-session workflow. For the tagged v0.6.3 release artifact, use [`releases/v0.6.3/Gauntlet_v0.6.3_Formal_Playtest_Sheet.pdf`](../releases/v0.6.3/Gauntlet_v0.6.3_Formal_Playtest_Sheet.pdf).

The browser pages and coded-session infrastructure are active development surfaces rather than immutable release artifacts. The session Worker still reports v0.6.1 and uses `G061-…` serials; those labels are a known migration blocker and must not be mistaken for the current rules version. The unversioned public Rules Arbiter follows v0.6.3.

## Printable sheet

The release-canonical printable sheet for the current rules package is:

- [`Gauntlet_v0.6.3_Formal_Playtest_Sheet.pdf`](../releases/v0.6.3/Gauntlet_v0.6.3_Formal_Playtest_Sheet.pdf)

Print on Letter paper at Actual Size / 100%, with browser or printer headers and footers disabled.

The live `/playtest/` page is the browser source used by the playtest workflow. Update its HTML/CSS source rather than editing generated PDFs independently.

## Unique session codes

Each coded formal sheet receives:

- one unique join QR code;
- one short human-readable sheet serial;
- one linked digital session record; and
- one private host key retained in the facilitator's batch manifest.

The batch generator creates the digital session before printing. Scanning a sheet opens or joins that pre-existing session. Rules Arbiter questions asked through the linked session are attached automatically. Closing the session preserves its record but blocks future joins and playtest events, retiring the printed QR code.

The human-readable serial is a fallback for damaged QR codes, manual session lookup, and reconciliation between a paper sheet and digital records.

### Current coded-session limitation

The session service was implemented for v0.6.1 and has not yet completed its v0.6.3 migration. Its current runtime contract still uses serials such as:

```text
G061-000123
```

and reports `v0.6.1` from its health/session metadata. Preserve that format while using the current service. Migrating the runtime constant, serial pattern, tests, and stored-session version assumptions must happen together before new sessions can be represented as v0.6.3-native.

### Coded batch procedure

1. Deploy and configure the playtest-session Worker described in [`workers/playtest-sessions/README.md`](../workers/playtest-sessions/README.md).
2. Open `/playtest/batch/` and enter the number of sheets, an optional batch label, and the facilitator creation key.
3. Generate the batch. Every resulting session is live immediately.
4. Download the private host manifest before printing or leaving the page.
5. Print the rendered sheets.
6. After each session, open its host URL from the manifest and close it. The QR code is then retired.

The QR contains only the public join URL. The host key and host URL appear only in the downloaded facilitator manifest and must not be distributed with the player sheets.

### Print-page parameters

The single-sheet print source accepts optional query parameters:

```text
/playtest/?serial=G061-000123&qr=<URL-ENCODED-QR-IMAGE-URL>
```

- `serial` replaces the blank sheet-serial line.
- `qr` supplies the QR-code image displayed in the reserved square.
- With neither parameter, the page renders a blank reusable worksheet with a placeholder QR area.

`G061-…` is shown here because it is the current session-service contract, not because v0.6.1 remains the canonical tabletop release.

The batch generator does not depend on remote QR-image URLs. It creates QR images in the browser and inserts them directly into cloned copies of the governing sheet template.

## Digital session page

The session page allows participants to:

- join as a player, facilitator, or observer, with an optional name or playtest ID;
- record game start, completion, or a stopped-game reason;
- save short factual session notes;
- ask the Rules Arbiter with automatic session linkage; and
- view the session's participant and Arbiter-question counts.

A session opened with its private host URL also exposes the close-and-retire control. Closed sessions remain readable but reject new participants and playtest events.

Because the session service still carries v0.6.1 metadata, session records should not be described as v0.6.3-native until that runtime migration is complete. The rules question itself is handled by the current unversioned Rules Arbiter unless an explicitly versioned legacy route is requested.

## What the sheet captures

### Session identity and timing

- date, session/group, facilitator, sheet serial, and digital session link;
- instruction and setup time;
- game time;
- total session time;
- time spent on rules lookup; and
- test type.

### Players and onboarding

- faction, Leader, and Deck used by each player;
- whether the Deck was recommended, modified, or custom;
- whether each player saw the faction introduction before selection; and
- whether that introduction prepared the player for the faction.

### Outcome and completion status

- first player, winner or no winner, rounds, battles, and Rules Arbiter questions;
- victory route; and
- whether the session ended through normal victory, concession, external interruption, rules blocker, component/technical failure, or another reason.

External-interruption sessions should be retained for qualitative, onboarding, rules, and production evidence but excluded from completed-game pacing, victory-route, and matchup-balance statistics.

### Ratings and diagnostic feedback

- overall fun;
- pacing;
- meaningful decisions;
- battle tension;
- rules clarity;
- faction and Leader clarity;
- table organization;
- replay interest;
- snowballing, futile attacks, repetitive battles, lost agency, card-flow problems, or rules/component interruptions; and
- short written feedback on strengths, weaknesses, confusion, balance, memorable decisions, and the next issue to investigate.

## Rules Arbiter linkage

Every linked Arbiter record should retain:

- exact question and answer;
- rules version actually used for the ruling;
- cited source and section;
- answer classification and confidence;
- session identifier and sheet serial;
- whether the ruling changed play; and
- reviewer correction or follow-up.

The session service links interactions into the playtest-session records. Legacy v0.6.1 routes remain available for compatibility, while the unversioned public Rules Arbiter follows v0.6.3. Do not infer the Arbiter rules version solely from a legacy `G061-…` session serial.

The Rules Arbiter must not invent precedence. Where the current adjudication system makes a provisional ruling, it must distinguish that ruling from written canon and retain it for review.

## Interpretation rule

Record what happened before proposing a fix. One unusual game is evidence, not a verdict; deterministic exploits, impossible resolutions, or repeatable play blockers warrant faster escalation.

The complete testing standard remains [`docs/Gauntlet_Playtest_Targets_and_Metrics.md`](../docs/Gauntlet_Playtest_Targets_and_Metrics.md).
