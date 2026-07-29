# Gauntlet Playtest Session Service

Cloudflare Worker and D1-backed API for unique v0.6.1 formal-playtest sessions.

Each printed sheet receives one single-use join token and a short human-readable serial. The token opens or joins the digital session associated with that physical sheet. Closing the session retires the token for future joins while preserving its records.

## Data storage

The service uses the existing `gauntlet-rules-assistant` D1 database so formal sessions and Rules Arbiter records can be linked without duplicating the interaction database.

Migration:

```text
rules-assistant/migrations/0002_playtest_sessions.sql
```

Apply it from this directory:

```bash
npm install
npm run db:migrate:local
npm run db:migrate:remote
```

The remote migration changes the production database and should be run only after reviewing the SQL.

## Development

```bash
npm install
npm run db:migrate:local
npm run dev
```

The production worker name is `gauntlet-playtest-sessions`.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Service and rules-version check |
| `POST` | `/api/sessions` | Create a session and return join/host URLs |
| `GET` | `/api/sessions/:token` | Read public session status and counts |
| `POST` | `/api/sessions/:token/join` | Join an open session |
| `POST` | `/api/sessions/:token/event` | Record a supported playtest event |
| `POST` | `/api/sessions/:token/arbiter` | Link a Rules Arbiter interaction |
| `POST` | `/api/sessions/:token/close` | Close and retire the session token; requires the host key |

## Security model

- Raw join tokens and host keys are never stored; only SHA-256 hashes are written to D1.
- Session creation returns the raw token and host key once.
- Public reads expose status, serial, version, timestamps, and aggregate counts only.
- Closing requires the host key.
- CORS is limited by `ALLOWED_ORIGIN`.
- Tokens cannot join or record new playtest events after closure.

## Production setup

1. Apply the remote migration.
2. Deploy this directory as a separate Cloudflare Worker project using `wrangler.toml`.
3. Confirm `https://gauntlet-playtest-sessions.tymon-scott.workers.dev/health` reports v0.6.1.
4. Test session creation, joining, event recording, Rules Arbiter linkage, closure, and rejected post-closure joins.
5. Generate uniquely coded sheets only after the production endpoint passes the above checks.
