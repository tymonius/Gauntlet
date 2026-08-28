# Gauntlet Playtest Tools

**Current canonical tabletop release:** v0.7.0 — Illustrated Cards & Tabletop Simulator  
**Current session-service baseline:** v0.7.0

The playtest subsystem supports three collection modes around one common evidence pipeline:

1. **Self-serve tracked playtest** — the default public workflow. Two players create/join one tracked game, choose factions and Leaders, play in Tabletop Simulator or physically, link Rules Arbiter questions, record live diagnostic flags, submit one shared result, and submit separate private player responses.
2. **Facilitated game-night playtest** — organizer-created events, rosters, child game sessions, table QR codes, and controlled matchups.
3. **Standalone / retrospective feedback** — records feedback for games that were not tracked live without inventing a verified shared timeline.

The public entry point is:

```text
https://gauntlet.run/playtest/
```

Use the physical tabletop when both players are together in person. Use Tabletop Simulator when the players are in different locations. Both routes use the same tracked-session, Rules Arbiter, feedback, and analysis pipeline.

## Public self-serve playtest path

The ordinary journey is:

1. open `/playtest/`;
2. continue through `/start/` to browse factions and choose a Leader;
3. create a public tracked game at `/playtest/tracked/`;
4. share the join link with the second player;
5. use the physical tabletop if the players are together, or the v0.7.0 TTS Workshop mod if they are remote;
6. record the game start;
7. ask Rules Arbiter questions from the joined player device;
8. optionally record timestamped diagnostic flags during play;
9. submit the shared factual result; and
10. have both players submit their private responses.

The tracked game closes automatically after exactly one shared result and both player responses are present.

New tracked sessions use `G070-…` serials. Public creation is rate-limited and does not require the facilitator secret.

## Live diagnostic flags

During a tracked game, either authenticated player may mark:

- I don't know what happens next;
- a rule is unclear;
- I have no meaningful option;
- this feels decided;
- a battle feels repeated or futile; or
- a component / TTS problem occurred.

These are timestamped observations, not diagnoses. The analysis record retains the submitting player and time.

The private postgame response also records when the result first felt decided, whether meaningful decisions remained afterward, and what the player believes most determined the result. This directly supports the winner/loser experience investigation without exposing one player's answers to the other through the public session view.

## Tabletop Simulator

Current public Workshop item:

```text
https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635
```

For remote v0.7.0 self-serve tests, each player uses the locked TTS starter kit matching the Leader selected in the tracked session.

Deckbuilder → TTS custom-Deck import remains gated to v0.7.1. The self-serve session and feedback pipeline is transport-independent and will also support the native digital client later.

## Physical play

Self-serve physical play remains supported.

- Use `/start/` and the Deckbuilder for faction/Leader selection and printable starter packages.
- Use the same `/playtest/tracked/` session for timing, Arbiter linkage, live flags, results, and private feedback.
- The printable formal questionnaire is preserved at `/playtest/sheet/`.
- The coded batch generator remains at `/playtest/batch/`.

The batch generator uses the dedicated `/playtest/sheet/` template rather than the public playtest portal.

## Facilitated game nights

The existing event workflow remains available:

- `/playtest/host/` — organizer home;
- `/playtest/onboarding/` — event participant faction/Leader selection;
- `/playtest/guide/` — organizer/player guide;
- `/playtest/session/` — coded formal game session;
- `/playtest/batch/` — coded sheet generation.

New current event containers use `EV070-…`; current game sessions use `G070-…`.

Organizer-created top-level sessions still require `SESSION_ADMIN_TOKEN`. That secret is not used by the public tracked-game API.

## Feedback and analysis

- `/playtest/feedback/` — standalone one-player feedback.
- `/playtest/retrospective/` — reconstruct a game with explicit retrospective provenance.
- `/playtest/analysis/` — protected compiled research view/export.
- `/playtest/analysis/integrity/` — data-integrity/exclusion controls.

Tracked records preserve:

- rules version;
- play transport;
- faction and Leader selections;
- player seats;
- lifecycle events;
- diagnostic flags;
- linked Rules Arbiter questions;
- shared result;
- separate player responses; and
- automatic/manual closure provenance.

Older stored v0.6.1/v0.6.3 records are not rewritten. Reads remain version-preserving.

## Version and serial contract

New current records:

```text
G070-ABCD2345
EV070-ABCD2345
```

Historical `G061`, `G063`, `EV061`, and `EV063` records remain historical evidence.

## Governing principle

Record what happened before proposing a fix. One unusual game is evidence, not a verdict. Deterministic exploits, impossible resolutions, and repeatable blockers warrant faster escalation; balance, pacing, snowballing, and faction-experience claims require repeated observations.

The complete testing standard remains [Gauntlet Playtest Targets and Metrics](../docs/Gauntlet_Playtest_Targets_and_Metrics.md).
