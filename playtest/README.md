# Gauntlet v0.6.1 Playtest Sheet

Public print page: `https://gauntlet.run/playtest/`

This directory contains the official routine human-playtest questionnaire for the v0.6.1 playtest release. It is designed to be printed on one side of Letter paper and completed by hand after a completed or stopped session.

Until v0.6.1 is published, the public site may continue to display the v0.6.0 sheet from `main`. The v0.6.1 source is being validated in PR #260.

## Printable PDF

- `Gauntlet_v0.6.1_Playtest_Sheet.pdf` — generated release artifact.

Print on Letter paper at Actual Size / 100%, with browser or printer headers and footers disabled.

The PDF is generated from `index.html` and `styles.css` by `.github/workflows/render-playtest-sheet.yml`. Update the HTML/CSS source rather than editing the PDF independently.

## Unique session codes

Each formal printed sheet should receive:

- one unique single-use QR code;
- one short human-readable sheet serial; and
- one linked digital session record.

The first scan creates or opens the digital session associated with that sheet. Later scans join the same session. Rules Arbiter questions asked through the linked session should be attached automatically. Closing the session retires the QR code so it cannot be reused for another playtest.

The human-readable serial is a fallback for damaged QR codes, manual session lookup, and reconciliation between a paper sheet and digital records.

### Print-page parameters

The print source accepts optional query parameters for generated formal sheets:

```text
/playtest/?serial=G061-000123&qr=<URL-ENCODED-QR-IMAGE-URL>
```

- `serial` replaces the blank sheet-serial line.
- `qr` supplies the QR-code image displayed in the reserved square.
- With neither parameter, the page renders a blank reusable worksheet with a placeholder QR area.

A production batch generator should create unique values and render one PDF or printed copy per session. It must not reuse a code across sheets.

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

When the sheet is linked to a digital session, every Arbiter record should retain:

- exact question and answer;
- v0.6.1 rules version;
- cited source and section;
- classification as **Explicit**, **Inferred**, or **Unresolved**;
- session identifier and sheet serial;
- whether the ruling changed play; and
- reviewer correction or follow-up.

The Rules Arbiter must not invent precedence. An unresolved interaction remains unresolved until a governing source is amended.

## Interpretation rule

Record what happened before proposing a fix. One unusual game is evidence, not a verdict; deterministic exploits, impossible resolutions, or repeatable play blockers warrant faster escalation.

The complete testing standard remains [`docs/Gauntlet_Playtest_Targets_and_Metrics.md`](../docs/Gauntlet_Playtest_Targets_and_Metrics.md).
