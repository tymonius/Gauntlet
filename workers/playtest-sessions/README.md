# Gauntlet Playtest Session Service

Cloudflare Worker and D1-backed API for formal sessions, game-night onboarding, tracked games, standalone feedback, and Rules Arbiter linkage.

**New sessions are created as v0.6.3** and receive **G063** serials. Historical v0.6.1 sessions remain readable with their original stored version and G061 serials.

## Current-release compatibility boundary

The production entry point in `wrangler.toml` is `src/current-release.js`. The established service stack beneath it still contains historical v0.6.1 creation constants because those modules also document and support the original schema behavior. The adapter prevents those legacy defaults from escaping into newly created data:

- `/health` reports v0.6.3;
- new formal/event/table sessions are persisted as v0.6.3;
- new tracked and standalone-feedback records are persisted as v0.6.3;
- generated current serials are stored/returned as G063;
- non-creation requests are delegated without rewriting historical records.

This boundary is validated against `../../config/current-release.json` by the repository-wide release-integrity gate.

## Data storage

The service uses the `gauntlet-rules-assistant` D1 database. Existing migrations remain valid; changing the current release does not rewrite historical session rows.

## Production checks

Before using new formal sessions:

1. deploy the Worker from this directory;
2. confirm `/health` reports `v0.6.3`, database availability, session creation configuration, onboarding support, event-game support, and player attribution support;
3. create a test session and confirm its stored/returned rules version is v0.6.3 and its serial begins `G063-`;
4. confirm an old G061 session can still be read without its version changing;
5. exercise event onboarding, child-game creation, tracked creation, standalone feedback, and Rules Arbiter linkage.

The production Worker name remains `gauntlet-playtest-sessions`. `SESSION_ADMIN_TOKEN` remains required for facilitator-created sessions, and CORS remains limited by `ALLOWED_ORIGINS`.

## Security model

Raw session tokens, host keys, and participant identity tokens are not stored. Public reads expose session state and aggregate information; organizer controls require host credentials. Child games accept no more than two player seats, and closed codes reject new playtest activity.
