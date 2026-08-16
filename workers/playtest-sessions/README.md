# Gauntlet Playtest Session Service

**Implementation baseline:** v0.6.3 — Third Playtest Revision  
**Current canonical tabletop release:** v0.6.3 — Third Playtest Revision

This Cloudflare Worker and D1-backed API powers the onboarding and coded formal-session workflow for the current v0.6.3 playtest release. New game sessions use `G063-…` serials; new game-night event containers use `EV063-…` serials. The runtime reports `v0.6.3` from `/health` and stores the rules version with every session.

Existing v0.6.1 records are not rewritten during the cutover. Reads return each record's persisted rules version and serial, so historical sessions retain their original attribution and can continue to use explicitly versioned Rules Arbiter compatibility routes.

The service separates two different records:

- an **event session** is the shared game-night invitation, onboarding roster, and organizer dashboard;
- a **game session** is one particular match between up to two players, opened from one unique table or sheet QR code.

Rules Arbiter interactions attach to the game session and the player seat that submitted the question. They never attach to the shared event record.

Standalone coded playtest sheets remain supported. A session created without an event parent behaves as the existing independent formal-session workflow.

## Data storage

The service uses the existing `gauntlet-rules-assistant` D1 database so formal sessions and Rules Arbiter records can be linked without duplicating the interaction database.

Migrations are applied in sequence:

```text
rules-assistant/migrations/0001_rules_interactions.sql
rules-assistant/migrations/0002_review_export_checkpoints.sql
rules-assistant/migrations/0003_playtest_sessions.sql
rules-assistant/migrations/0004_event_game_sessions.sql
```

Migration 0004 adds:

- event-versus-game session classification;
- child-game relationships;
- event participant identity-token hashes;
- two numbered player seats per game;
- carried faction and Leader selections; and
- player attribution on Rules Arbiter links and stored interactions.

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

The production Worker name is `gauntlet-playtest-sessions`.

Before creating sessions, set the facilitator-only creation secret:

```bash
npx wrangler secret put SESSION_ADMIN_TOKEN
```

The batch generator sends that secret as a bearer token. It is entered for the current browser session only and is never included in a printed QR code or returned by a public endpoint.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Service, database, creation, onboarding, event-game, and player-attribution capability check |
| `POST` | `/api/sessions` | Create a standalone game session or explicit event session; requires `SESSION_ADMIN_TOKEN` |
| `GET` | `/api/sessions/:token` | Read public session status, type, parent event, players, and counts |
| `POST` | `/api/sessions/:token/join` | Join onboarding, a standalone session, or one of two child-game player seats |
| `POST` | `/api/sessions/:token/event` | Record a supported onboarding or game event |
| `GET` | `/api/sessions/:token/onboarding` | Read the event roster and latest choices; requires the event host key |
| `POST` | `/api/sessions/:eventToken/games` | Create one to twenty child game sessions; requires the event host key |
| `GET` | `/api/sessions/:eventToken/games` | Read child-game statuses, seats, and Arbiter counts; requires the event host key |
| `POST` | `/api/sessions/:eventToken/games/:gameId/close` | Close a child game through the event dashboard; requires the event host key |
| `GET` | `/api/sessions/:gameToken/event-participants` | Read the completed event roster for the low-friction table identity picker |
| `POST` | `/api/sessions/:gameToken/arbiter` | Link a Rules Arbiter interaction to the game and asking player |
| `POST` | `/api/sessions/:token/close` | Close registration or retire a standalone/game code; requires that session's host key |

New `/api/sessions` requests accept only the current `v0.6.3` creation version. Reads are version-preserving rather than version-normalizing: an older record remains older data.

## Player workflow

### Before game night

Everyone opens the same onboarding URL. The browser:

1. registers the player against the event;
2. receives a private participant identity token;
3. stores that token locally; and
4. records the player's latest faction and Leader choice.

Only the token hash is written to D1. A participant may revise their choice until event registration is closed.

### At the table

The organizer creates and prints one QR card per expected game. Both players scan the same table code.

The table page uses this order:

1. **Recognized browser:** show the saved name, faction, and Leader with one `Join game` button.
2. **Unrecognized browser:** show the event roster so the player taps their name.
3. **Late addition:** allow a manual name, faction, and Leader only when the player was not onboarded.

Each child game has exactly two player seats. The same event participant may join a later child game and receives a new game-specific participant ID for that match.

### During play

The session page intercepts successful Rules Arbiter responses and links them with:

- the child game session;
- the printed sheet or table serial; and
- the game-specific participant ID for the asking player.

The event record rejects game activity and Rules Arbiter links, preventing questions from multiple simultaneous matches from being combined.

The session page passes the stored session rules version when it asks the Rules Arbiter. Current sessions therefore use v0.6.3, while a historical v0.6.1 session can still resolve through the explicitly versioned v0.6.1 compatibility route.

## Organizer workflow

The private onboarding host page contains two distinct sections:

- **Game-night roster:** each participant's latest faction and Leader choice;
- **Table sessions:** child game creation, QR rendering, player-seat status, closure, printing, and public-link manifest download.

Public child-game join URLs are returned only when those games are created. The browser keeps them in local storage and can download a public table manifest. Raw child host keys are not needed because the event host key can review and close every child game.

Closing event registration freezes onboarding but does not prevent the host from creating table sessions afterward. This supports collecting choices before the preparation deadline and generating match codes later at the event.

## Security model

- Raw session tokens, host keys, and participant identity tokens are never stored; only SHA-256 hashes are written to D1.
- Session creation requires a separately configured facilitator secret.
- Public child-game reads expose status, serial, version, aggregate counts, and occupied player seats.
- Event roster and child-game administration require the event host key.
- A saved identity token must match its event participant before one-tap joining.
- The roster picker requires an explicit player confirmation and is intended for the shared physical event context.
- Child games accept no more than two player seats.
- Event records reject game lifecycle events and Rules Arbiter links.
- Child-game Arbiter links require a participant seated in that game.
- CORS is limited by `ALLOWED_ORIGINS`.
- Closed game codes cannot accept future joins or playtest events.

## Production setup

1. Review and apply all four remote migrations in numeric order.
2. Deploy this directory as a separate Cloudflare Worker project using `wrangler.toml`.
3. Set `SESSION_ADMIN_TOKEN` with `wrangler secret put` or the Cloudflare dashboard.
4. Confirm `/health` reports v0.6.3 with `database`, `sessionCreationConfigured`, `onboardingSupported`, `eventGamesSupported`, and `playerAttributionSupported` all true.
5. Test current standalone creation (`G063-…`), current event creation (`EV063-…`), event onboarding, identity continuity, roster fallback, child-game creation, two-seat limits, player-attributed Arbiter linkage, child closure, and coded sheets.
6. Confirm at least one stored v0.6.1 session can still be read and returns its original version/serial without rewriting the record.
7. Deploy the static onboarding, host, batch, and session pages only after the Worker passes the above checks.
8. Generate table QR codes only after the production endpoint passes the above checks.
