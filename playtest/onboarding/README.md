# Game-night onboarding pilot

This page supports a choice-first, no-quiz onboarding flow for an in-person Gauntlet playtest whose materials are prepared by the organizer.

Participant path:

1. Open one coded onboarding link.
2. Browse the six faction summaries and open any full faction guides that interest them.
3. Choose a faction and one of its two Leaders.
4. Read the consolidated First Game Introduction.
5. Confirm that the introduction was read and submit the choice.
6. Re-submit before the session closes to revise the choice.

Organizer path:

1. Create one normal coded playtest session with the existing facilitator session-creation flow.
2. Share the returned `onboardingUrl`, or replace `/playtest/session/` with `/playtest/onboarding/` in the public join URL.
3. Keep the returned `onboardingHostUrl`, or make the same path replacement in the host URL.
4. Open the host URL to view the latest submitted choice for each participant.
5. Download the roster as CSV when preparing Decks and faction components.
6. Close the session when selections should no longer change.

The host page displays the latest `onboarding_choice` event for each registered player. It intentionally stores revisions as append-only session events so the pilot does not require a new D1 migration.

## Local development

Serve the repository root over HTTP and provide a valid session code:

```text
http://localhost:8000/playtest/onboarding/?code=<join-token>
```

The page uses the production playtest-session Worker unless `window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT` is set before `app.js` loads.

The Worker must be deployed before the site page because the page requires:

- `onboarding_choice` event validation;
- `GET /api/sessions/:token/onboarding` for host roster access; and
- `X-Host-Key` in the CORS allowlist.
