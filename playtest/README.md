# Gauntlet v0.6.0 Playtest Sheet

Public print page: `https://gauntlet.run/playtest/`

This directory contains the official routine human-playtest questionnaire for the canonical v0.6.0 release. It is designed to be printed on one side of Letter paper and completed by hand after a game.

## Printable PDF

- [`Gauntlet_v0.6.0_Playtest_Sheet.pdf`](Gauntlet_v0.6.0_Playtest_Sheet.pdf)

The PDF is generated from `index.html` and `styles.css` by `.github/workflows/render-playtest-sheet.yml`. Update the print source rather than editing the PDF independently.

## What the sheet captures

- matchup, faction, Leader, Deck, and starter-Deck use;
- winner, victory route, duration, rounds, battles, and rule lookups;
- quick player ratings for fun, pacing, meaningful decisions, battle tension, faction clarity, and replay interest;
- diagnostic flags for snowballing, futile attacks, repetitive battles, lost agency, card-flow problems, and rules or component interruptions; and
- short written feedback on strengths, weaknesses, confusion, balance, memorable decisions, and the next issue to investigate.

The sheet is the routine companion to [`docs/Gauntlet_Playtest_Targets_and_Metrics.md`](../docs/Gauntlet_Playtest_Targets_and_Metrics.md). That document retains the complete evidence targets and faction-specific metrics for deliberately instrumented testing sessions.

## Interpretation rule

Record what happened before proposing a fix. One unusual game is evidence, not a verdict; deterministic exploits, impossible resolutions, or repeatable play blockers warrant faster escalation.
