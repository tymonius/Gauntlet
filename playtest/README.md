# Gauntlet v0.6.1 Playtest Tools

Public pages:

- Printable sheet: `https://gauntlet.run/playtest/`
- Formal session page: `https://gauntlet.run/playtest/session/?code=<SESSION-TOKEN>`
- Coded batch generator: `https://gauntlet.run/playtest/batch/`

This directory contains the official routine human-playtest questionnaire and its linked formal-session workflow for the v0.6.1 playtest release. The questionnaire is designed to be printed on one side of Letter paper and completed by hand after a completed or stopped session.

Until v0.6.1 is published, the public site may continue to display the previous published sheet from `main`. The v0.6.1 source is being validated in PR #260.

## Printable PDF

- `Gauntlet_v0.6.1_Playtest_Sheet.pdf` — generated release artifact.

Print on Letter paper at Actual Size / 100%, with browser or printer headers and footers disabled.

The PDF is generated from `index.html` and `styles.css` by `.github/workflows/render-playtest-sheet.yml`. Update the HTML/CSS source rather than editing the PDF independently.

## Unique session codes

Each formal printed sheet receives:

- one unique join QR code;
- one short human-readable sheet serial;
- one linked digital session record; and
- one private host key retained in the facilitator's batch manifest.

The batch generator creates the digital session before printing. Scanning a sheet opens or joins that pre-existing session. Rules Arbiter questions asked through the linked session are attached automatically. Closing the session preserves its record but blocks future joins and playtest events, retiring the printed QR code.

The human-readable serial is a fallback for damaged QR codes, manual session lookup, and reconciliation between a paper sheet and digital records.

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

The batch generator does not depend on remote QR-image URLs. It creates QR images in the browser and inserts them directly into cloned copies of the governing sheet template.

## Digital session page

The session page allows participants to:

- join as a player, facilitator, or observer, with an optional name or playtest ID;
- record game start, completion, or a stopped-game reason;
- save short factual session notes;
- ask the v0.6.1 Rules Arbiter with automatic session linkage; and
- view the session's participant and Arbiter-question counts.

A session opened with its private host URL also exposes the close-and-retire control. Closed sessions remain readable but reject new participants and playtest events.

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

Every linked Arbiter record retains:

- exact question and answer;
- v0.6.1 rules version;
- cited source and section;
- classification as **Explicit**, **Inferred**, or **Unresolved**;
- session identifier and sheet serial;
- whether the ruling changed play; and
- reviewer correction or follow-up.

The governing `rules-assistant/worker-v061.js` stores the formal-session context with the interaction and links it into `playtest_arbiter_links`. The session page also performs an idempotent linkage request after a successful answer, so loss of one linkage path does not silently detach the ruling from the sheet.

The Rules Arbiter must not invent precedence. An unresolved interaction remains unresolved until a governing source is amended.

## Interpretation rule

Record what happened before proposing a fix. One unusual game is evidence, not a verdict; deterministic exploits, impossible resolutions, or repeatable play blockers warrant faster escalation.

The complete testing standard remains [`docs/Gauntlet_Playtest_Targets_and_Metrics.md`](../docs/Gauntlet_Playtest_Targets_and_Metrics.md).
