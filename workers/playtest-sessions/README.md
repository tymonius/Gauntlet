# Gauntlet Playtest Session Service

Cloudflare Worker and D1-backed API for unique v0.6.1 formal-playtest sessions.

Each printed sheet receives one single-use join token and a short human-readable serial. The token opens or joins the digital session associated with that physical sheet. Closing the session retires the token for future joins while preserving its records.

The same session can also support the game-night onboarding pilot. Participants use a choice-first onboarding page to select a faction and Leader, read a consolidated First Game Introduction, and submit or revise their choice before the organizer prepares physical materials.

## Data storage

The service uses the existing `gauntlet-rules-assistant` D1 database so formal sessions and Rules Arbiter records can be linked without duplicating the interaction database.

Migrations are applied in sequence:

```text
rules-assistant/migrations/0001_rules_interactions.sql
rules-assistant/migrations/0002_review_export_checkpoints.sql
rules-assistant/migrations/0003_playtest_sessions.sql
```

The onboarding pilot stores validated selections as append-only `onboarding_choice` session events. The organizer roster returns only the latest choice from each registered player, so this pilot does not require another migration.

Apply migrations from this directory:

```bash
npm install
npm run db:migrate:local
npm run db:migrate:remote
```

The remote migrations change the production database and should be run only after reviewing the SQL.

## Development

```bash
npm install
npm run db:migrate:local
npm run dev
```

The production worker name is `gauntlet-playtest-sessions`.

Before creating sessions, set the facilitator-only creation secret:

```bash
npx wrangler secret put SESSION_ADMIN_TOKEN
```

The batch generator sends that secret as a bearer token. It is entered for the current browser session only and is never included in a printed QR code or returned by the API.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Service, rules-version, database, creation-configuration, and onboarding-support check |
| `POST` | `/api/sessions` | Create a session and return standard and onboarding join/host URLs; requires `SESSION_ADMIN_TOKEN` |
| `GET` | `/api/sessions/:token` | Read public session status and counts |
| `POST` | `/api/sessions/:token/join` | Join an open session |
| `POST` | `/api/sessions/:token/event` | Record a supported playtest event, including a validated `onboarding_choice` |
| `GET` | `/api/sessions/:token/onboarding` | Read the organizer roster and latest submitted choices; requires `X-Host-Key` or `host` query parameter |
| `POST` | `/api/sessions/:token/arbiter` | Link a Rules Arbiter interaction |
| `POST` | `/api/sessions/:token/close` | Close and retire the session token; requires the host key |

## Game-night onboarding flow

Creating a session now returns:

- `onboardingUrl` — participant invitation;
- `onboardingHostUrl` — private organizer roster.

The participant page registers the player through the normal join endpoint and records an `onboarding_choice` event containing:

- participant ID;
- selected faction;
- selected Leader;
- optional reason for the choice;
- confirmation that the First Game Introduction was read; and
- server-controlled `self_selected` selection mode.

Faction and Leader combinations are validated by the Worker. A later submission by the same participant supersedes the earlier one in the organizer roster without deleting the historical event.

The host-only roster endpoint returns:

- each player's latest submitted choice;
- players who joined but have not submitted;
- session identity and status; and
- a generation timestamp for the roster view.

## Security model

- Raw join tokens and host keys are never stored; only SHA-256 hashes are written to D1.
- Session creation requires a separately configured facilitator secret.
- Session creation returns the raw token and host key once.
- Public reads expose status, serial, version, timestamps, and aggregate counts only.
- The onboarding roster requires the per-session host key.
- Closing requires the per-session host key.
- CORS is limited by `ALLOWED_ORIGINS`.
- Tokens cannot join or record new playtest events after closure.
- Onboarding choices must reference a registered player in the same session and a valid faction/Leader pair.
- Rules Arbiter links must reference an interaction already stored in the shared D1 database.

## Production setup

1. Review and apply the remote migrations in numeric order.
2. Deploy this directory as a separate Cloudflare Worker project using `wrangler.toml`.
3. Set `SESSION_ADMIN_TOKEN` with `wrangler secret put` or the Cloudflare dashboard.
4. Confirm `https://gauntlet-playtest-sessions.tymon-scott.workers.dev/health` reports v0.6.1, `database: true`, `sessionCreationConfigured: true`, and `onboardingSupported: true`.
5. Test authorized and unauthorized session creation, joining, onboarding choice validation and revision, host roster access, event recording, Rules Arbiter linkage, closure, and rejected post-closure joins.
6. Deploy the static `/playtest/onboarding/` page only after the Worker endpoint is live.
7. Generate uniquely coded sheets or game-night invitation links only after the production endpoint passes the above checks.
