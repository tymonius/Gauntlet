# Gauntlet Playtest Session Service

Cloudflare Worker and D1-backed API for unique v0.6.1 formal-playtest sessions.

Each printed sheet receives one single-use join token and a short human-readable serial. The token opens or joins the digital session associated with that physical sheet. Closing the session retires the token for future joins while preserving its records.

## Data storage

The service uses the existing `gauntlet-rules-assistant` D1 database so formal sessions and Rules Arbiter records can be linked without duplicating the interaction database.

Migrations are applied in sequence:

```text
rules-assistant/migrations/0001_rules_interactions.sql
rules-assistant/migrations/0002_review_export_checkpoints.sql
rules-assistant/migrations/0003_playtest_sessions.sql
```

Apply them from this directory:

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
| `GET` | `/health` | Service, rules-version, database, and creation-configuration check |
| `POST` | `/api/sessions` | Create a session and return join/host URLs; requires `SESSION_ADMIN_TOKEN` |
| `GET` | `/api/sessions/:token` | Read public session status and counts |
| `POST` | `/api/sessions/:token/join` | Join an open session |
| `POST` | `/api/sessions/:token/event` | Record a supported playtest event |
| `POST` | `/api/sessions/:token/arbiter` | Link a Rules Arbiter interaction |
| `POST` | `/api/sessions/:token/close` | Close and retire the session token; requires the host key |

## Security model

- Raw join tokens and host keys are never stored; only SHA-256 hashes are written to D1.
- Session creation requires a separately configured facilitator secret.
- Session creation returns the raw token and host key once.
- Public reads expose status, serial, version, timestamps, and aggregate counts only.
- Closing requires the per-session host key.
- CORS is limited by `ALLOWED_ORIGINS`.
- Tokens cannot join or record new playtest events after closure.
- Rules Arbiter links must reference an interaction already stored in the shared D1 database.

## Production setup

1. Review and apply the remote migrations in numeric order.
2. Deploy this directory as a separate Cloudflare Worker project using `wrangler.toml`.
3. Set `SESSION_ADMIN_TOKEN` with `wrangler secret put` or the Cloudflare dashboard.
4. Confirm `https://gauntlet-playtest-sessions.tymon-scott.workers.dev/health` reports v0.6.1, `database: true`, and `sessionCreationConfigured: true`.
5. Test authorized and unauthorized session creation, joining, event recording, Rules Arbiter linkage, closure, and rejected post-closure joins.
6. Generate uniquely coded sheets only after the production endpoint passes the above checks.
