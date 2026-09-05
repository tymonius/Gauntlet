# Gauntlet Playtest Session Service

**Rules authority:** `game-data/current-game.json`
**Runtime identity:** `src/index.js`

This Cloudflare Worker and D1-backed API powers Gauntlet's tracked self-serve playtest, facilitated event, feedback, journal, closure, and analysis workflows.

New game sessions use `G071-…` serials; new event containers use `EV071-…`. The runtime reports its `CURRENT_RULES_VERSION` from `/health` and stores that rules version with every session.

Historical records are version-preserving. Existing `G061`, `G063`, `G070`, `EV061`, `EV063`, and `EV070` records are read with their stored version and serial rather than rewritten.

## Production Worker chain

`wrangler.toml` deploys `src/completeness.js`, which composes the complete service:

`completeness → closure → journal → integrity → analysis → tracked → base formal-session Worker`.

The public tracked-game API is distinct from facilitator session creation:

- `POST /api/tracked-games` is public, abuse-limited, and creates one two-player tracked game.
- `POST /api/sessions` creates facilitator-managed standalone/event sessions and requires `SESSION_ADMIN_TOKEN`.

## Shared D1 database

The service uses the same `gauntlet-rules-assistant` D1 database as the Rules Arbiter so interactions can be linked without duplicating records.

Migrations are applied in numeric order from `rules-assistant/migrations/`. The current playtest schema includes:

- 0003 — base playtest sessions;
- 0004 — event/game sessions and player attribution;
- 0005 — tracked results, private responses, public creation limits;
- later migrations — integrity, journal, closure/standalone feedback support; and
- 0010 — decision-point / post-decision-agency fields.

Use:

```bash
npm install
npm run db:migrate:local
npm run db:migrate:remote
```

The production GitHub workflow applies pending remote migrations **before** deploying the Worker.

## Current tracked self-serve playtest API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/tracked-games` | Publicly create one tracked game for the deployed rules version; rate-limited |
| GET | `/api/tracked-games/:token` | Read public lifecycle/player completion state |
| POST | `/api/tracked-games/:token/join` | Join one of two authenticated player seats |
| POST | `/api/tracked-games/:token/event` | Record lifecycle, note, or diagnostic event |
| POST | `/api/tracked-games/:token/arbiter` | Link a Rules Arbiter interaction to the asking player |
| POST | `/api/tracked-games/:token/result` | Submit the one shared factual result |
| POST | `/api/tracked-games/:token/response` | Submit one authenticated player's private response |
| GET | `/api/tracked-games/:token/review` | Creator-key protected complete game review |

Live tracked creation records `playMode` as `tts` or `physical`. The public self-serve UI requires an explicit choice: physical for players together in person, TTS for players in different locations. Retrospective or feedback-only records that do not establish a play method retain `unspecified` rather than being assigned a false transport.

Supported live diagnostic flags:

- `dont_know_what_happens_next`
- `rule_unclear`
- `no_meaningful_option`
- `feels_decided`
- `repeated_or_futile_battle`
- `component_or_tts_problem`

A tracked session automatically closes when it has two player seats, one shared result, and two private player responses.

## Facilitated event/session API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Current version and deployed capability contract |
| POST | `/api/sessions` | Create facilitator-managed game/event; requires `SESSION_ADMIN_TOKEN` |
| GET | `/api/sessions/:token` | Read public session status |
| POST | `/api/sessions/:token/join` | Join onboarding/game session |
| POST | `/api/sessions/:token/event` | Record supported event |
| GET | `/api/sessions/:token/onboarding` | Read event choices; host key required |
| POST | `/api/sessions/:eventToken/games` | Create child games; host key required |
| GET | `/api/sessions/:eventToken/games` | Read child games; host key required |
| POST | `/api/sessions/:eventToken/games/:gameId/close` | Close child game |
| GET | `/api/sessions/:gameToken/event-participants` | Read event roster for table join |
| POST | `/api/sessions/:gameToken/arbiter` | Link Arbiter interaction |
| POST | `/api/sessions/:token/close` | Close/retire facilitator session |

## Security and privacy

- Raw session tokens, host keys, and participant tokens are not stored; only SHA-256 hashes are persisted.
- Public tracked creation is rate-limited by a salted hash of request client characteristics.
- A tracked game has at most two authenticated player seats.
- Public game state exposes response completion, not private questionnaire content.
- Creator review requires the separate host/review key.
- Event administration requires its host key.
- Facilitator session creation requires the Worker secret.
- CORS is restricted to configured origins.
- Closed codes reject future joins/events.
- Rules Arbiter links require an authenticated player for tracked games.

## Production order

1. Validate all tests and static contracts.
2. Apply pending shared D1 migrations.
3. Deploy the Worker.
4. Verify `/health` matches `CURRENT_RULES_VERSION` and reports all required capability flags.
5. Smoke-test public tracked creation, two-player join, play-mode persistence, diagnostic event capture, shared result, separate responses, and automatic closure.
6. Smoke-test facilitator event/session creation and historical record reads.
7. Deploy/verify static playtest surfaces.

The public TTS Workshop path and physical tabletop path use the same tracked evidence pipeline.
