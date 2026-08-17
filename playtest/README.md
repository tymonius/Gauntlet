# Gauntlet Playtest Tools

**Current canonical tabletop release:** v0.6.3 — Third Playtest Revision  
**Coded-session service baseline:** v0.6.3

Public pages:

- Printable sheet: `https://gauntlet.run/playtest/`
- Formal session page: `https://gauntlet.run/playtest/session/?code=<SESSION-TOKEN>`
- Coded batch generator: `https://gauntlet.run/playtest/batch/`

This directory contains the routine human-playtest questionnaire and its linked formal-session workflow. The certified reconstructed v0.6.3 package does not contain the withdrawn release's standalone Formal Playtest Sheet PDF; use the live `/playtest/` print source for current v0.6.3 sessions.

The browser pages and coded-session infrastructure are active development surfaces rather than immutable release artifacts. New sessions created by the live workflow use the v0.6.3 runtime contract, while older stored sessions retain their persisted rules version and remain addressable by their existing session tokens.

## Printable sheet

The current v0.6.3 printable playtest sheet is the live browser surface:

- `https://gauntlet.run/playtest/`

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

### Version and serial contract

New v0.6.3 standalone and table-game sessions use serials such as:

```text
G063-ABCD2345
```

Game-night event containers use the `EV063-…` prefix. The session service reports `v0.6.3` from its health endpoint and stores the rules version with each session.

Older v0.6.1 records are not rewritten during the cutover. Reading an existing session returns the rules version and serial already stored with that record, preserving historical attribution. They are historical records, not a supported path for creating new v0.6.1 sessions or new current play through the legacy ruleset.

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
/playtest/?serial=G063-ABCD2345&qr=<URL-ENCODED-QR-IMAGE-URL>
```

- `serial` replaces the blank sheet-serial line.
- `qr` supplies the QR-code image displayed in the reserved square.
- With neither parameter, the page renders a blank reusable worksheet with a placeholder QR area.

The batch generator does not depend on remote QR-image URLs. It creates QR images in the browser and inserts them directly into cloned copies of the governing sheet template.

## Digital session page

The session page allows participants to:

- join as a player, facilitator, or observer, with an optional name or playtest ID;
- record game start, completion, or a stopped-game reason;
- save short factual session notes;
- ask the Rules Arbiter with automatic session linkage; and
- view the session's participant and Arbiter-question counts.

A session opened with its private host URL also exposes the close-and-retire control. Closed sessions remain readable but reject new participants and playtest events.

The session page displays the rules version stored on the session record. The embedded unversioned Rules Arbiter is the current v0.6.3 Arbiter; legacy v0.6.1 session records are retained for historical review rather than automatically reopening historical adjudication behavior. Explicitly versioned Arbiter routes remain separate compatibility/history surfaces.

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

The session service links interactions into the playtest-session records. New formal sessions are v0.6.3 and therefore align with the current unversioned Arbiter. Explicitly versioned legacy Arbiter routes remain available as separate historical/compatibility surfaces; the existence of a stored `G061-…` record does not automatically switch the current embedded widget to a legacy ruleset.

The Rules Arbiter must not invent precedence. Where the current adjudication system makes a provisional ruling, it must distinguish that ruling from written canon and retain it for review.

## Interpretation rule

Record what happened before proposing a fix. One unusual game is evidence, not a verdict; deterministic exploits, impossible resolutions, or repeatable play blockers warrant faster escalation.

The complete testing standard remains [`docs/Gauntlet_Playtest_Targets_and_Metrics.md`](../docs/Gauntlet_Playtest_Targets_and_Metrics.md).
