# Game-night event onboarding

This page supports a choice-first, no-quiz onboarding flow for an in-person Gauntlet playtest whose materials are prepared by the organizer.

The complete organizer and participant walkthrough is published at:

```text
/playtest/guide/
```

## Participant path

1. Open the public onboarding link.
2. Enter a recognizable name.
3. Browse the six faction summaries and open any full faction guides that interest them.
4. Choose a faction and one of its two Leaders.
5. Read the consolidated First Game Introduction.
6. Confirm that the introduction was read and submit the choice.
7. Re-submit before registration closes to revise the choice.
8. At game night, join an individual child game through that table's QR code.

## Organizer path

1. Open `/playtest/host/`.
2. Create one game-night event with the facilitator creation key.
3. Share only the public participant onboarding link.
4. Use the private Event Dashboard to review the latest submitted choice for each participant.
5. Close event registration when choices should no longer change.
6. Download the roster CSV and prepare Decks and faction components.
7. Create one child table session per game, print its QR card, and retain the table manifest as a backup.
8. Verify both players at each table and close each child game after feedback is collected.

The event record is the roster and organizer container. It is not used as a game session. Each child table session has exactly two player seats, and Rules Arbiter questions are attributed to the child game and the player who submitted them.

Host Home stores private organizer URLs and locally created public table links only in the current browser. It must not be used on a public or shared computer.

## Local development

Serve the repository root over HTTP and provide a valid event code:

```text
http://localhost:8000/playtest/onboarding/?code=<join-token>
```

The page uses the production playtest-session Worker unless `window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT` is set before `app.js` loads.

The Worker must be deployed before the site pages because the workflow requires:

- protected top-level session creation;
- `onboarding_choice` validation;
- event promotion and child game creation;
- two-seat event-player joins;
- player-attributed Rules Arbiter links;
- host roster and game-status endpoints; and
- `X-Host-Key` in the CORS allowlist.
