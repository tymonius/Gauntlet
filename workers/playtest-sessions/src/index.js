const DEFAULT_ORIGIN = "https://gauntlet.run";
const CURRENT_RULES_VERSION = "v0.7.0";
const GAME_SERIAL_PREFIX = "G070";
const EVENT_SERIAL_PREFIX = "EV070";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
const SERIAL_PATTERN = /^G070-[A-Z0-9]{6,12}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FACTION_LEADERS = Object.freeze({
  military: ["General", "Commandant"],
  diplomats: ["Ambassador", "Senator"],
  financiers: ["Banker", "Executive"],
  intelligence: ["Ranger", "Spymaster"],
  mystics: ["Alchemist", "Spirit Walker"],
  inquisition: ["Grand Inquisitor", "Witch Hunter"]
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);
    const headers = responseHeaders(origin);

    if (request.headers.get("origin") && !origin) {
      return json({ error: "Origin not allowed" }, 403, responseHeaders(null));
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return json({
          ok: true,
          service: "gauntlet-playtest-sessions",
          version: CURRENT_RULES_VERSION,
          database: Boolean(env.DB),
          sessionCreationConfigured: Boolean(env.SESSION_ADMIN_TOKEN),
          onboardingSupported: true,
          eventGamesSupported: true,
          playerAttributionSupported: true
        }, 200, headers);
      }

      if (url.pathname === "/api/sessions" && request.method === "POST") {
        requireCreatorAuthorization(request, env);
        return await createSession(request, env, headers);
      }

      const gameRoute = url.pathname.match(/^\/api\/sessions\/([^/]+)\/games(?:\/([0-9a-f-]{36})\/close)?$/i);
      if (gameRoute) {
        const token = gameRoute[1];
        const gameId = gameRoute[2] || "";
        if (!TOKEN_PATTERN.test(token)) throw new HttpError(400, "Invalid session code");
        if (gameId && request.method === "POST") {
          return await closeEventGame(token, gameId, request, env, headers);
        }
        if (!gameId && request.method === "GET") {
          return await readEventGames(token, request, env, headers);
        }
        if (!gameId && request.method === "POST") {
          return await createEventGames(token, request, env, headers);
        }
        return json({ error: "Method not allowed" }, 405, headers);
      }

      const match = url.pathname.match(/^\/api\/sessions\/([^/]+)(?:\/(join|close|event|arbiter|onboarding|event-participants))?$/);
      if (!match) return json({ error: "Not found" }, 404, headers);

      const token = match[1];
      const action = match[2] || "read";
      if (!TOKEN_PATTERN.test(token)) throw new HttpError(400, "Invalid session code");

      if (action === "read" && request.method === "GET") {
        return await readSession(token, env, headers);
      }
      if (action === "join" && request.method === "POST") {
        return await joinSession(token, request, env, headers);
      }
      if (action === "close" && request.method === "POST") {
        return await closeSession(token, request, env, headers);
      }
      if (action === "event" && request.method === "POST") {
        return await recordEvent(token, request, env, headers);
      }
      if (action === "arbiter" && request.method === "POST") {
        return await linkArbiterRecord(token, request, env, headers);
      }
      if (action === "onboarding" && request.method === "GET") {
        return await readOnboardingChoices(token, request, env, headers);
      }
      if (action === "event-participants" && request.method === "GET") {
        return await readEventParticipants(token, env, headers);
      }

      return json({ error: "Method not allowed" }, 405, headers);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status, headers);
      }
      console.error("playtest-session-worker", error);
      return json({ error: "Internal service error" }, 500, headers);
    }
  }
};

async function createSession(request, env, headers) {
  requireDatabase(env);
  const body = await readJson(request);
  const rulesVersion = cleanString(body.rulesVersion || CURRENT_RULES_VERSION, 24);
  if (rulesVersion !== CURRENT_RULES_VERSION) {
    throw new HttpError(400, `This service creates ${CURRENT_RULES_VERSION} sessions only.`);
  }

  const sessionKind = body.sessionKind === "event" || body.type === "event" ? "event" : "game";
  const serial = body.sheetSerial
    ? await requireUniqueSerial(cleanSerial(body.sheetSerial), env.DB)
    : await uniqueSerial(env.DB, sessionKind === "event" ? EVENT_SERIAL_PREFIX : GAME_SERIAL_PREFIX);
  const record = await createSessionRecord(env.DB, {
    rulesVersion,
    serial,
    metadata: sanitizeMetadata(body.metadata),
    sessionKind,
    eventSessionId: null
  });

  return json(sessionCreationResponse(record, env), 201, headers);
}

async function createSessionRecord(db, { rulesVersion, serial, metadata, sessionKind, eventSessionId }) {
  const token = randomToken(32);
  const hostKey = randomToken(40);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO playtest_sessions
      (id, token_hash, host_key_hash, sheet_serial, rules_version, status, created_at,
       metadata_json, session_kind, event_session_id)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`
  ).bind(
    id,
    await sha256(token),
    await sha256(hostKey),
    serial,
    rulesVersion,
    now,
    JSON.stringify(metadata || {}),
    sessionKind,
    eventSessionId
  ).run();

  await insertEvent(db, id, "session_created", {
    rulesVersion,
    serial,
    sessionKind,
    eventSessionId
  }, now);

  return {
    id,
    token,
    hostKey,
    serial,
    rulesVersion,
    status: "open",
    createdAt: now,
    sessionKind,
    eventSessionId
  };
}

function sessionCreationResponse(record, env) {
  const siteOrigin = cleanOrigin(env.PUBLIC_SITE_ORIGIN || DEFAULT_ORIGIN);
  const joinUrl = `${siteOrigin}/playtest/session/?code=${encodeURIComponent(record.token)}`;
  const hostUrl = `${joinUrl}&host=${encodeURIComponent(record.hostKey)}`;
  const onboardingUrl = `${siteOrigin}/playtest/onboarding/?code=${encodeURIComponent(record.token)}`;
  const onboardingHostUrl = `${onboardingUrl}&host=${encodeURIComponent(record.hostKey)}`;

  return {
    sessionId: record.id,
    sheetSerial: record.serial,
    rulesVersion: record.rulesVersion,
    status: record.status,
    sessionKind: record.sessionKind,
    eventSessionId: record.eventSessionId,
    joinToken: record.token,
    hostKey: record.hostKey,
    joinUrl,
    hostUrl,
    onboardingUrl,
    onboardingHostUrl,
    createdAt: record.createdAt
  };
}

async function readSession(token, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  const counts = await sessionCounts(session.id, env.DB);
  const players = session.event_session_id ? await readGameSeats(session.id, env.DB) : [];
  return json({ ...publicSession(session, counts), players }, 200, headers);
}

async function joinSession(token, request, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  requireOpenSession(session);
  const body = await readJson(request);

  if (session.event_session_id) {
    return await joinEventGame(session, body, env.DB, headers);
  }

  if (session.session_kind === "event" || body.purpose === "onboarding") {
    await ensureEventContainer(session, env.DB);
    return await joinEventParticipant(session, body, env.DB, headers);
  }

  const participantId = crypto.randomUUID();
  const displayName = cleanString(body.displayName || "", 80) || null;
  const role = normalizeRole(body.role);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO playtest_participants (id, session_id, display_name, role, joined_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(participantId, session.id, displayName, role, now).run();
  await insertEvent(env.DB, session.id, "participant_joined", { participantId, role }, now);

  return json({
    session: publicSession(session),
    participantId,
    joinedAt: now
  }, 201, headers);
}

async function joinEventParticipant(session, body, db, headers) {
  const participantId = crypto.randomUUID();
  const participantToken = randomToken(32);
  const displayName = cleanString(body.displayName || "", 80) || null;
  const role = normalizeRole(body.role);
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO playtest_participants
      (id, session_id, display_name, role, joined_at, identity_token_hash)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(participantId, session.id, displayName, role, now, await sha256(participantToken)).run();
  await insertEvent(db, session.id, "participant_joined", {
    participantId,
    role,
    purpose: "onboarding"
  }, now);

  return json({
    session: publicSession(session),
    participantId,
    participantToken,
    joinedAt: now
  }, 201, headers);
}

async function joinEventGame(session, body, db, headers) {
  const role = normalizeRole(body.role);
  if (role !== "player") {
    return await joinNonPlayer(session, body, db, headers);
  }

  let eventParticipantId = cleanString(body.eventParticipantId || "", 64);
  let displayName = "";
  let faction = "";
  let leader = "";
  let identityMethod = "guest";

  if (eventParticipantId) {
    if (!UUID_PATTERN.test(eventParticipantId)) {
      throw new HttpError(400, "A valid event participant is required");
    }
    const eventParticipant = await db.prepare(
      `SELECT id, display_name, identity_token_hash
         FROM playtest_participants
        WHERE id = ? AND session_id = ? AND role = 'player'`
    ).bind(eventParticipantId, session.event_session_id).first();
    if (!eventParticipant) throw new HttpError(404, "That player is not on this event roster");

    const choice = await latestChoiceForParticipant(session.event_session_id, eventParticipantId, db);
    if (!choice) throw new HttpError(409, "That player has not completed onboarding");

    const suppliedToken = cleanString(body.participantToken || "", 120);
    if (suppliedToken && eventParticipant.identity_token_hash) {
      if (!constantTimeEqual(await sha256(suppliedToken), eventParticipant.identity_token_hash)) {
        throw new HttpError(403, "Saved player identity did not match this event");
      }
      identityMethod = "saved_identity";
    } else if (body.confirmedRosterSelection === true) {
      identityMethod = "roster_selection";
    } else if (!eventParticipant.identity_token_hash) {
      identityMethod = "legacy_identity";
    } else {
      throw new HttpError(400, "Confirm the selected player before joining");
    }

    displayName = eventParticipant.display_name || "Unnamed player";
    faction = choice.faction;
    leader = choice.leader;
  } else {
    eventParticipantId = "";
    displayName = cleanString(body.displayName || "", 80);
    if (!displayName) throw new HttpError(400, "Enter a player name");
    const guestChoice = cleanFactionLeader(body.faction, body.leader);
    faction = guestChoice.faction;
    leader = guestChoice.leader;
  }

  if (eventParticipantId) {
    const existing = await db.prepare(
      `SELECT id, display_name, seat_index, faction, leader, joined_at
         FROM playtest_participants
        WHERE session_id = ? AND event_participant_id = ?`
    ).bind(session.id, eventParticipantId).first();
    if (existing) {
      return json({
        session: publicSession(session),
        participantId: existing.id,
        eventParticipantId,
        displayName: existing.display_name,
        seatIndex: Number(existing.seat_index),
        faction: existing.faction,
        leader: existing.leader,
        identityMethod,
        joinedAt: existing.joined_at
      }, 200, headers);
    }
  }

  const seatRows = rowsFromResult(await db.prepare(
    `SELECT seat_index FROM playtest_participants
      WHERE session_id = ? AND role = 'player' AND seat_index IS NOT NULL
      ORDER BY seat_index ASC`
  ).bind(session.id).all());
  const occupied = new Set(seatRows.map((row) => Number(row.seat_index)));
  const seatIndex = [1, 2].find((seat) => !occupied.has(seat));
  if (!seatIndex) throw new HttpError(409, "Both player seats in this game are already filled");

  const participantId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO playtest_participants
      (id, session_id, display_name, role, joined_at, event_participant_id,
       seat_index, faction, leader)
     VALUES (?, ?, ?, 'player', ?, ?, ?, ?, ?)`
  ).bind(
    participantId,
    session.id,
    displayName,
    now,
    eventParticipantId || null,
    seatIndex,
    faction,
    leader
  ).run();
  await insertEvent(db, session.id, "participant_joined", {
    participantId,
    eventParticipantId: eventParticipantId || null,
    seatIndex,
    faction,
    leader,
    identityMethod
  }, now);

  return json({
    session: publicSession(session),
    participantId,
    eventParticipantId: eventParticipantId || null,
    displayName,
    seatIndex,
    faction,
    leader,
    identityMethod,
    joinedAt: now
  }, 201, headers);
}

async function joinNonPlayer(session, body, db, headers) {
  const participantId = crypto.randomUUID();
  const displayName = cleanString(body.displayName || "", 80) || null;
  const role = normalizeRole(body.role);
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO playtest_participants (id, session_id, display_name, role, joined_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(participantId, session.id, displayName, role, now).run();
  await insertEvent(db, session.id, "participant_joined", { participantId, role }, now);
  return json({ session: publicSession(session), participantId, joinedAt: now }, 201, headers);
}

async function closeSession(token, request, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  const body = await readJson(request);
  await requireHostAuthorization(body.hostKey, session);
  if (session.status === "closed") return json(publicSession(session), 200, headers);

  const now = new Date().toISOString();
  await closeSessionRecord(session.id, env.DB, now);
  return json({ ...publicSession(session), status: "closed", closedAt: now }, 200, headers);
}

async function closeSessionRecord(sessionId, db, now = new Date().toISOString()) {
  await db.prepare(
    "UPDATE playtest_sessions SET status = 'closed', closed_at = ? WHERE id = ?"
  ).bind(now, sessionId).run();
  await insertEvent(db, sessionId, "session_closed", {}, now);
}

async function recordEvent(token, request, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  requireOpenSession(session);

  const body = await readJson(request);
  const allowed = new Set([
    "game_started",
    "game_stopped",
    "game_completed",
    "rules_lookup",
    "sheet_reconciled",
    "onboarding_choice",
    "note"
  ]);
  const eventType = cleanString(body.eventType || "", 48);
  if (!allowed.has(eventType)) throw new HttpError(400, "Unsupported event type");

  if (eventType === "onboarding_choice") {
    await ensureEventContainer(session, env.DB);
  } else if (session.session_kind === "event" && eventType !== "note") {
    throw new HttpError(409, "Game activity must be recorded in a table game session");
  }

  const now = new Date().toISOString();
  const data = eventType === "onboarding_choice"
    ? await normalizeOnboardingChoice(body.data, session.id, env.DB)
    : sanitizeMetadata(body.data);
  await insertEvent(env.DB, session.id, eventType, data, now);
  return json({ ok: true, eventType, recordedAt: now }, 201, headers);
}

async function readOnboardingChoices(token, request, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  const hostKey = request.headers.get("x-host-key") || new URL(request.url).searchParams.get("host");
  await requireHostAuthorization(hostKey, session);
  await ensureEventContainer(session, env.DB);

  const roster = await buildOnboardingRoster(session.id, env.DB);
  return json({
    session: publicSession(session, { participant_count: roster.totalParticipants }),
    choices: roster.choices,
    pendingParticipants: roster.pendingParticipants,
    generatedAt: new Date().toISOString()
  }, 200, headers);
}

async function buildOnboardingRoster(sessionId, db) {
  const participantResult = await db.prepare(
    `SELECT id, display_name, joined_at
       FROM playtest_participants
      WHERE session_id = ? AND role = 'player'
      ORDER BY joined_at ASC`
  ).bind(sessionId).all();
  const eventResult = await db.prepare(
    `SELECT event_json, created_at
       FROM playtest_session_events
      WHERE session_id = ? AND event_type = 'onboarding_choice'
      ORDER BY created_at ASC, rowid ASC`
  ).bind(sessionId).all();

  const participants = rowsFromResult(participantResult);
  const latestByParticipant = new Map();
  for (const row of rowsFromResult(eventResult)) {
    const choice = parseJsonObject(row.event_json);
    if (!choice || !UUID_PATTERN.test(choice.participantId || "")) continue;
    latestByParticipant.set(choice.participantId, {
      faction: choice.faction,
      leader: choice.leader,
      reason: choice.reason || "",
      introConfirmed: choice.introConfirmed === true,
      selectionMode: choice.selectionMode || "self_selected",
      submittedAt: row.created_at
    });
  }

  const choices = [];
  const pendingParticipants = [];
  for (const participant of participants) {
    const choice = latestByParticipant.get(participant.id);
    if (!choice) {
      pendingParticipants.push({
        participantId: participant.id,
        displayName: participant.display_name || "Unnamed player",
        joinedAt: participant.joined_at
      });
      continue;
    }
    choices.push({
      participantId: participant.id,
      displayName: participant.display_name || "Unnamed player",
      joinedAt: participant.joined_at,
      ...choice
    });
  }

  return {
    choices,
    pendingParticipants,
    totalParticipants: participants.length
  };
}

async function latestChoiceForParticipant(sessionId, participantId, db) {
  const result = await db.prepare(
    `SELECT event_json, created_at
       FROM playtest_session_events
      WHERE session_id = ? AND event_type = 'onboarding_choice'
      ORDER BY created_at DESC, rowid DESC`
  ).bind(sessionId).all();
  for (const row of rowsFromResult(result)) {
    const choice = parseJsonObject(row.event_json);
    if (choice?.participantId === participantId) {
      return { ...choice, submittedAt: row.created_at };
    }
  }
  return null;
}

async function normalizeOnboardingChoice(value, sessionId, db) {
  const input = sanitizeMetadata(value);
  const participantId = cleanString(input.participantId || "", 64);
  if (!UUID_PATTERN.test(participantId)) throw new HttpError(400, "A valid participantId is required");

  const participant = await db.prepare(
    `SELECT id, role FROM playtest_participants WHERE id = ? AND session_id = ?`
  ).bind(participantId, sessionId).first();
  if (!participant || participant.role !== "player") {
    throw new HttpError(404, "Player registration was not found for this event");
  }

  const { faction, leader } = cleanFactionLeader(input.faction, input.leader);
  if (input.introConfirmed !== true) {
    throw new HttpError(400, "Confirm that the First Game Introduction was read");
  }

  const displayName = cleanString(input.displayName || "", 80);
  if (displayName) {
    await db.prepare(
      "UPDATE playtest_participants SET display_name = ? WHERE id = ? AND session_id = ?"
    ).bind(displayName, participantId, sessionId).run();
  }

  return {
    participantId,
    faction,
    leader,
    reason: cleanString(input.reason || "", 500),
    introConfirmed: true,
    selectionMode: "self_selected"
  };
}

async function createEventGames(token, request, env, headers) {
  requireDatabase(env);
  const eventSession = await requireSession(token, env.DB);
  const body = await readJson(request);
  const hostKey = request.headers.get("x-host-key") || body.hostKey;
  await requireHostAuthorization(hostKey, eventSession);
  await ensureEventContainer(eventSession, env.DB);

  const count = Number(body.count);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new HttpError(400, "Choose between 1 and 20 table sessions");
  }

  const metadata = sanitizeMetadata(body.metadata);
  const created = [];
  for (let index = 0; index < count; index += 1) {
    const record = await createSessionRecord(env.DB, {
      rulesVersion: eventSession.rules_version,
      serial: await uniqueSerial(env.DB),
      metadata: {
        ...metadata,
        tableIndex: index + 1,
        createdFromEvent: eventSession.id
      },
      sessionKind: "game",
      eventSessionId: eventSession.id
    });
    await insertEvent(env.DB, eventSession.id, "game_session_created", {
      gameSessionId: record.id,
      sheetSerial: record.serial,
      tableIndex: index + 1
    }, record.createdAt);
    created.push(sessionCreationResponse(record, env));
  }

  return json({
    event: publicSession(eventSession),
    games: created,
    generatedAt: new Date().toISOString()
  }, 201, headers);
}

async function readEventGames(token, request, env, headers) {
  requireDatabase(env);
  const eventSession = await requireSession(token, env.DB);
  const hostKey = request.headers.get("x-host-key") || new URL(request.url).searchParams.get("host");
  await requireHostAuthorization(hostKey, eventSession);
  await ensureEventContainer(eventSession, env.DB);

  const result = await env.DB.prepare(
    `SELECT id, token_hash, host_key_hash, sheet_serial, rules_version, status,
            created_at, closed_at, metadata_json, session_kind, event_session_id
       FROM playtest_sessions
      WHERE event_session_id = ?
      ORDER BY created_at ASC`
  ).bind(eventSession.id).all();

  const games = [];
  for (const game of rowsFromResult(result)) {
    const counts = await sessionCounts(game.id, env.DB);
    const players = await readGameSeats(game.id, env.DB);
    games.push({ ...publicSession(game, counts), players });
  }

  return json({
    event: publicSession(eventSession),
    games,
    generatedAt: new Date().toISOString()
  }, 200, headers);
}

async function closeEventGame(token, gameId, request, env, headers) {
  requireDatabase(env);
  const eventSession = await requireSession(token, env.DB);
  const body = await readJson(request);
  const hostKey = request.headers.get("x-host-key") || body.hostKey;
  await requireHostAuthorization(hostKey, eventSession);
  await ensureEventContainer(eventSession, env.DB);
  if (!UUID_PATTERN.test(gameId)) throw new HttpError(400, "Invalid game session ID");

  const game = await findSessionById(gameId, env.DB);
  if (!game || game.event_session_id !== eventSession.id) {
    throw new HttpError(404, "Game session not found for this event");
  }
  if (game.status !== "closed") await closeSessionRecord(game.id, env.DB);
  const refreshed = await findSessionById(game.id, env.DB);
  return json(publicSession(refreshed, await sessionCounts(game.id, env.DB)), 200, headers);
}

async function readEventParticipants(token, env, headers) {
  requireDatabase(env);
  const gameSession = await requireSession(token, env.DB);
  if (!gameSession.event_session_id) {
    throw new HttpError(404, "This game is not linked to an onboarding event");
  }
  const eventSession = await findSessionById(gameSession.event_session_id, env.DB);
  if (!eventSession) throw new HttpError(404, "The linked event was not found");
  const roster = await buildOnboardingRoster(eventSession.id, env.DB);

  return json({
    event: publicSession(eventSession),
    game: publicSession(gameSession, await sessionCounts(gameSession.id, env.DB)),
    participants: roster.choices.map((choice) => ({
      participantId: choice.participantId,
      displayName: choice.displayName,
      faction: choice.faction,
      leader: choice.leader
    }))
  }, 200, headers);
}

async function linkArbiterRecord(token, request, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  if (session.session_kind === "event") {
    throw new HttpError(409, "Rules Arbiter questions must be linked to a table game session");
  }

  const body = await readJson(request);
  const interactionId = cleanString(body.interactionId || "", 120);
  if (!UUID_PATTERN.test(interactionId)) throw new HttpError(400, "A valid interactionId is required");

  const interaction = await env.DB.prepare(
    "SELECT id FROM rules_interactions WHERE id = ?"
  ).bind(interactionId).first();
  if (!interaction) throw new HttpError(404, "Rules Arbiter interaction not found");

  let participantId = cleanString(body.participantId || "", 64) || null;
  if (session.event_session_id) {
    if (!participantId || !UUID_PATTERN.test(participantId)) {
      throw new HttpError(400, "Join the game before asking the Rules Arbiter");
    }
    const participant = await env.DB.prepare(
      `SELECT id FROM playtest_participants
        WHERE id = ? AND session_id = ? AND role = 'player'`
    ).bind(participantId, session.id).first();
    if (!participant) throw new HttpError(404, "Player seat was not found for this game");
  } else if (participantId && !UUID_PATTERN.test(participantId)) {
    throw new HttpError(400, "Invalid participantId");
  }

  const classification = ["explicit", "inferred", "unresolved"].includes(body.classification)
    ? body.classification
    : null;
  const now = new Date().toISOString();

  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO playtest_arbiter_links
      (id, session_id, interaction_id, classification, question_excerpt, answer_excerpt,
       source_json, linked_at, participant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    session.id,
    interactionId,
    classification,
    cleanString(body.question, 300) || null,
    cleanString(body.answer, 500) || null,
    JSON.stringify(Array.isArray(body.sources) ? body.sources.slice(0, 10) : []),
    now,
    participantId
  ).run();

  if (Number(result?.meta?.changes || 0) > 0) {
    await env.DB.prepare(
      `UPDATE rules_interactions
          SET playtest_session_id = ?, sheet_serial = ?, playtest_participant_id = ?, updated_at = ?
        WHERE id = ?`
    ).bind(session.id, session.sheet_serial, participantId, now, interactionId).run();
    await insertEvent(env.DB, session.id, "arbiter_linked", {
      interactionId,
      classification,
      participantId
    }, now);
  }

  return json({ ok: true, interactionId, participantId, linkedAt: now }, 201, headers);
}

async function ensureEventContainer(session, db) {
  if (session.session_kind === "event") return session;
  if (session.event_session_id) {
    throw new HttpError(409, "A table game cannot be converted into an event");
  }

  const activity = await db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM playtest_session_events
         WHERE session_id = ? AND event_type IN ('game_started', 'game_stopped', 'game_completed')) AS game_events,
       (SELECT COUNT(*) FROM playtest_arbiter_links WHERE session_id = ?) AS arbiter_links`
  ).bind(session.id, session.id).first();
  if (Number(activity?.game_events || 0) > 0 || Number(activity?.arbiter_links || 0) > 0) {
    throw new HttpError(409, "This session already contains game activity and cannot become an event");
  }

  const now = new Date().toISOString();
  await db.prepare(
    "UPDATE playtest_sessions SET session_kind = 'event' WHERE id = ?"
  ).bind(session.id).run();
  await insertEvent(db, session.id, "session_promoted_to_event", {}, now);
  session.session_kind = "event";
  return session;
}

async function sessionCounts(sessionId, db) {
  return db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM playtest_participants WHERE session_id = ?) AS participant_count,
       (SELECT COUNT(*) FROM playtest_arbiter_links WHERE session_id = ?) AS arbiter_count`
  ).bind(sessionId, sessionId).first();
}

async function readGameSeats(sessionId, db) {
  const result = await db.prepare(
    `SELECT id AS participant_id, display_name, seat_index, faction, leader,
            event_participant_id, joined_at
       FROM playtest_participants
      WHERE session_id = ? AND role = 'player'
      ORDER BY seat_index ASC, joined_at ASC`
  ).bind(sessionId).all();
  return rowsFromResult(result).map((row) => ({
    participantId: row.participant_id,
    eventParticipantId: row.event_participant_id || null,
    displayName: row.display_name || "Unnamed player",
    seatIndex: row.seat_index == null ? null : Number(row.seat_index),
    faction: row.faction || null,
    leader: row.leader || null,
    joinedAt: row.joined_at
  }));
}

async function requireSession(token, db) {
  const session = await findSessionByToken(token, db);
  if (!session) throw new HttpError(404, "Session not found");
  return session;
}

function requireOpenSession(session) {
  if (session.status !== "open") throw new HttpError(409, "This session is closed");
}

async function requireHostAuthorization(value, session) {
  const hostKey = cleanString(value || "", 120);
  if (!hostKey || !constantTimeEqual(await sha256(hostKey), session.host_key_hash)) {
    throw new HttpError(403, "Invalid host key");
  }
}

async function findSessionByToken(token, db) {
  const tokenHash = await sha256(token);
  return db.prepare(
    `SELECT id, token_hash, host_key_hash, sheet_serial, rules_version, status,
            created_at, closed_at, metadata_json, session_kind, event_session_id
       FROM playtest_sessions WHERE token_hash = ?`
  ).bind(tokenHash).first();
}

async function findSessionById(id, db) {
  return db.prepare(
    `SELECT id, token_hash, host_key_hash, sheet_serial, rules_version, status,
            created_at, closed_at, metadata_json, session_kind, event_session_id
       FROM playtest_sessions WHERE id = ?`
  ).bind(id).first();
}

function publicSession(session, counts = {}) {
  return {
    sessionId: session.id,
    sheetSerial: session.sheet_serial,
    rulesVersion: session.rules_version,
    status: session.status,
    sessionKind: session.session_kind || "game",
    eventSessionId: session.event_session_id || null,
    createdAt: session.created_at,
    closedAt: session.closed_at || null,
    participantCount: Number(counts?.participant_count || 0),
    arbiterQuestionCount: Number(counts?.arbiter_count || 0)
  };
}

async function requireUniqueSerial(serial, db) {
  const duplicate = await db.prepare(
    "SELECT 1 AS found FROM playtest_sessions WHERE sheet_serial = ?"
  ).bind(serial).first();
  if (duplicate) throw new HttpError(409, "That sheet serial is already assigned.");
  return serial;
}

async function uniqueSerial(db, prefix = GAME_SERIAL_PREFIX) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const serial = `${prefix}-${randomCode(8)}`;
    const existing = await db.prepare(
      "SELECT 1 AS found FROM playtest_sessions WHERE sheet_serial = ?"
    ).bind(serial).first();
    if (!existing) return serial;
  }
  throw new Error("Could not allocate a unique sheet serial");
}

async function insertEvent(db, sessionId, eventType, data, timestamp) {
  await db.prepare(
    `INSERT INTO playtest_session_events (id, session_id, event_type, event_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), sessionId, eventType, JSON.stringify(data || {}), timestamp).run();
}

function rowsFromResult(result) {
  return Array.isArray(result?.results) ? result.results : [];
}

function parseJsonObject(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function cleanFactionLeader(factionValue, leaderValue) {
  const faction = cleanString(factionValue || "", 32).toLowerCase();
  const leader = cleanString(leaderValue || "", 80);
  if (!Object.prototype.hasOwnProperty.call(FACTION_LEADERS, faction)) {
    throw new HttpError(400, "Choose a valid faction");
  }
  if (!FACTION_LEADERS[faction].includes(leader)) {
    throw new HttpError(400, "Choose a valid Leader for that faction");
  }
  return { faction, leader };
}

function normalizeRole(value) {
  return ["player", "facilitator", "observer"].includes(value) ? value : "player";
}

function requireDatabase(env) {
  if (!env.DB) throw new HttpError(503, "D1 binding DB is not configured");
}

function requireCreatorAuthorization(request, env) {
  const expected = cleanString(env.SESSION_ADMIN_TOKEN || "", 256);
  if (!expected) throw new HttpError(503, "Session creation is not configured");
  const bearer = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const supplied = bearer || cleanString(request.headers.get("x-session-admin") || "", 256);
  if (!supplied || !constantTimeEqual(supplied, expected)) {
    throw new HttpError(401, "Session creation authorization failed");
  }
}

async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON request body");
  }
}

export function cleanSerial(value) {
  const serial = cleanString(value, 32).toUpperCase();
  if (!SERIAL_PATTERN.test(serial)) throw new HttpError(400, "Invalid v0.7.0 sheet serial");
  return serial;
}

export function sanitizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output = {};
  for (const [key, item] of Object.entries(value).slice(0, 30)) {
    const cleanKey = cleanString(key, 64);
    if (!cleanKey) continue;
    if (typeof item === "string") output[cleanKey] = cleanString(item, 500);
    else if (typeof item === "number" && Number.isFinite(item)) output[cleanKey] = item;
    else if (typeof item === "boolean" || item === null) output[cleanKey] = item;
  }
  return output;
}

function cleanString(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanOrigin(value) {
  return new URL(value).origin;
}

function randomToken(bytes) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return base64Url(array);
}

function randomCode(length) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin) return origin;
  const configured = String(
    env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || `${DEFAULT_ORIGIN},http://localhost:8000,http://127.0.0.1:8000`
  ).split(",").map((value) => value.trim()).filter(Boolean);
  return configured.includes(origin) ? origin : null;
}

function responseHeaders(origin) {
  const headers = {
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-host-key, x-session-admin",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "vary": "origin"
  };
  if (origin) headers["access-control-allow-origin"] = origin;
  return headers;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}
