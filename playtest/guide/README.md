# Game-night playtest guide

`/playtest/guide/` is the authoritative operational walkthrough for the event-based game-night workflow.

It has two role views:

- `?role=host` — event creation, invitations, roster preparation, table QR codes, live game management, and closure;
- `?role=participant` — faction and Leader selection, table joining, Rules Arbiter use, and postgame feedback.

The guide intentionally distinguishes four page types:

1. Host Home — private organizer launcher and event creation;
2. Event Dashboard — one event's roster and child game management;
3. Participant Onboarding — public pre-event selection and First Game Introduction;
4. Table Session — one two-player game and its player-attributed Rules Arbiter record.

When changing any of those workflows, update the guide and `tests/playtest-game-night-guide.test.ts` in the same pull request. Keep one-code-per-game language explicit, and never instruct participants to use a URL containing a private `host` parameter.

Print styles show only the active role. The Host view includes a one-page control checklist; the Participant view includes a one-page table quick-start.
