import baseWorker from "./index.js";

const DEFAULT_ORIGIN = "https://gauntlet.run";
const CURRENT_RULES_VERSION = "v0.7.0";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CREATION_LIMIT_PER_DAY = 12;

const FACTIONS = Object.freeze({
  military: Object.freeze({ name: "Military", leaders: Object.freeze({ general: "General", commandant: "Commandant" }) }),
  diplomats: Object.freeze({ name: "Diplomats", leaders: Object.freeze({ ambassador: "Ambassador", senator: "Senator" }) }),
  financiers: Object.freeze({ name: "Financiers", leaders: Object.freeze({ banker: "Banker", executive: "Executive" }) }),
  intelligence: Object.freeze({ name: "Intelligence", leaders: Object.freeze({ ranger: "Ranger", spymaster: "Spymaster" }) }),
  mystics: Object.freeze({ name: "Mystics", leaders: Object.freeze({ alchemist: "Alchemist", "spirit-walker": "Spirit Walker" }) }),
  inquisition: Object.freeze({ name: "Inquisition", leaders: Object.freeze({ "grand-inquisitor": "Grand Inquisitor", "witch-hunter": "Witch Hunter" }) })
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

    if (url.pathname === "/health" && request.method === "GET") {
      const base = await baseWorker.fetch(request, env);
      if (!base.ok) return base;
      const payload = await base.json();
      return json({
        ...payload,
        trackedPlaytestsSupported: true,
        digitalFeedbackSupported: true,
        automaticTrackedClosureSupported: true
      }, 200, base.headers);
    }

    if (!url.pathname.startsWith("/api/tracked-games")) {
      return baseWorker.fetch(request, env);
    }

    const origin = allowedOrigin(request, env);
    const headers = responseHeaders(origin);
    if (request.headers.get("origin") && !origin) {
      return json({ error: "Origin not allowed" }, 403, responseHeaders(null));
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    try {
      requireDatabase(env);
      if (url.pathname === "/api/tracked-games" && request.method === "POST") {
        return await createTrackedGame(request, env, headers);
      }

      const match = url.pathname.match(/^\/api\/tracked-games\/([^/]+)(?:\/(join|event|arbiter|result|response|review))?$/);
      if (!match) return json({ error: "Not found" }, 404, headers);
      const token = match[1];
      const action = match[2] || "read";
      if (!TOKEN_PATTERN.test(token)) throw new HttpError(400, "Invalid tracked-game code");

      if (action === "read" && request.method === "GET") return await readTrackedGame(token, env, headers);
      if (action === "join" && request.method === "POST") return await joinTrackedGame(token, request, env, headers);
      if (action === "event" && request.method === "POST") return await recordTrackedEvent(token, request, env, headers);
      if (action === "arbiter" && request.method === "POST") return await linkTrackedArbiter(token, request, env, headers);
      if (action === "result" && request.method === "POST") return await submitSharedResult(token, request, env, headers);
      if (action === "response" && request.method === "POST") return await submitPlayerResponse(token, request, env, headers);
      if (action === "review" && request.method === "GET") return await readTrackedReview(token, request, env, headers);
      return json({ error: "Method not allowed" }, 405, headers);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, headers);
      console.error("tracked-playtest-worker", error);
      return json({ error: "Internal service error" }, 500, headers);
    }
  }
};

async function createTrackedGame(request, env, headers) {
  const body = await readJson(request);
  const displayName = cleanString(body.displayName, 80);
  if (!displayName) throw new HttpError(400, "Enter your name");
  const choice = cleanChoice(body.faction, body.leader);
  const selectionReason = cleanString(body.selectionReason, 1000);
  if (!selectionReason) throw new HttpError(400, "Describe what made this faction or Leader appeal to you");
  await enforceCreationLimit(request, env);

  const now = new Date().toISOString();
  const sessionId = crypto.randomUUID();
  const participantId = crypto.randomUUID();
  const token = randomToken(32);
  const hostKey = randomToken(40);
  const participantToken = randomToken(32);
  const serial = await uniqueSerial(env.DB);
  const requestedMode = cleanString(body.playMode, 16);
  const playMode = ["physical", "tts"].includes(requestedMode) ? requestedMode : "unspecified";
  const metadata = {
    mode: "tracked",
    playMode,
    creationSource: cleanString(body.creationSource || "public-site", 80),
    selectionSource: cleanString(body.selectionSource || "self-selected", 80)
  };

  await env.DB.prepare(
    `INSERT INTO playtest_sessions
      (id, token_hash, host_key_hash, sheet_serial, rules_version, status, created_at,
       metadata_json, session_kind, event_session_id)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?, 'game', NULL)`
  ).bind(
    sessionId,
    await sha256(token),
    await sha256(hostKey),
    serial,
    CURRENT_RULES_VERSION,
    now,
    JSON.stringify(metadata)
  ).run();

  await env.DB.prepare(
    `INSERT INTO playtest_participants
      (id, session_id, display_name, role, joined_at, identity_token_hash,
       seat_index, faction, leader, selection_reason)
     VALUES (?, ?, ?, 'player', ?, ?, 1, ?, ?, ?)`
  ).bind(
    participantId,
    sessionId,
    displayName,
    now,
    await sha256(participantToken),
    choice.faction,
    choice.leader,
    selectionReason
  ).run();

  await insertEvent(env.DB, sessionId, "session_created", {
    rulesVersion: CURRENT_RULES_VERSION,
    serial,
    sessionKind: "game",
    mode: "tracked",
    playMode
  }, now);
  await insertEvent(env.DB, sessionId, "participant_joined", {
    participantId,
    seatIndex: 1,
    faction: choice.faction,
    leader: choice.leader,
    selectionReason,
    identityMethod: "tracked_creator"
  }, now);

  const siteOrigin = cleanOrigin(env.PUBLIC_SITE_ORIGIN || DEFAULT_ORIGIN);
  const joinUrl = `${siteOrigin}/playtest/tracked/?code=${encodeURIComponent(token)}`;
  const reviewUrl = `${joinUrl}&host=${encodeURIComponent(hostKey)}`;
  return json({
    sessionId,
    sheetSerial: serial,
    rulesVersion: CURRENT_RULES_VERSION,
    status: "open",
    lifecycleState: "joining",
    joinToken: token,
    hostKey,
    joinUrl,
    reviewUrl,
    participantId,
    participantToken,
    seatIndex: 1,
    faction: choice.faction,
    leader: choice.leader,
    playMode,
    createdAt: now
  }, 201, headers);
}

async function readTrackedGame(token, env, headers) {
  const session = await requireTrackedSession(token, env.DB);
  return json(await trackedPublicState(session, env.DB), 200, headers);
}

async function joinTrackedGame(token, request, env, headers) {
  const session = await requireTrackedSession(token, env.DB);
  requireOpen(session);
  const body = await readJson(request);

  if (body.participantId || body.participantToken) {
    const participant = await requireParticipant(session.id, body.participantId, body.participantToken, env.DB);
    return json({
      session: await trackedPublicState(session, env.DB),
      participantId: participant.id,
      participantToken: cleanString(body.participantToken, 120),
      displayName: participant.display_name,
      seatIndex: Number(participant.seat_index),
      faction: participant.faction,
      leader: participant.leader,
      joinedAt: participant.joined_at
    }, 200, headers);
  }

  const resultExists = await env.DB.prepare(
    "SELECT 1 AS found FROM playtest_session_results WHERE session_id = ?"
  ).bind(session.id).first();
  if (resultExists) throw new HttpError(409, "This game has already entered feedback");

  const displayName = cleanString(body.displayName, 80);
  if (!displayName) throw new HttpError(400, "Enter your name");
  const choice = cleanChoice(body.faction, body.leader);
  const selectionReason = cleanString(body.selectionReason, 1000);
  if (!selectionReason) throw new HttpError(400, "Describe what made this faction or Leader appeal to you");
  const occupiedRows = rowsFromResult(await env.DB.prepare(
    `SELECT seat_index FROM playtest_participants
      WHERE session_id = ? AND role = 'player' AND seat_index IS NOT NULL`
  ).bind(session.id).all());
  const occupied = new Set(occupiedRows.map((row) => Number(row.seat_index)));
  const seatIndex = [1, 2].find((seat) => !occupied.has(seat));
  if (!seatIndex) throw new HttpError(409, "Both player seats are already filled");

  const participantId = crypto.randomUUID();
  const participantToken = randomToken(32);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO playtest_participants
      (id, session_id, display_name, role, joined_at, identity_token_hash,
       seat_index, faction, leader, selection_reason)
     VALUES (?, ?, ?, 'player', ?, ?, ?, ?, ?, ?)`
  ).bind(
    participantId,
    session.id,
    displayName,
    now,
    await sha256(participantToken),
    seatIndex,
    choice.faction,
    choice.leader,
    selectionReason
  ).run();
  await insertEvent(env.DB, session.id, "participant_joined", {
    participantId,
    seatIndex,
    faction: choice.faction,
    leader: choice.leader,
    selectionReason,
    identityMethod: "tracked_join"
  }, now);

  return json({
    session: await trackedPublicState(session, env.DB),
    participantId,
    participantToken,
    displayName,
    seatIndex,
    faction: choice.faction,
    leader: choice.leader,
    joinedAt: now
  }, 201, headers);
}

async function recordTrackedEvent(token, request, env, headers) {
  const session = await requireTrackedSession(token, env.DB);
  requireOpen(session);
  const body = await readJson(request);
  const participant = await requireParticipant(session.id, body.participantId, body.participantToken, env.DB);
  const eventType = cleanString(body.eventType, 48);
  const allowed = new Set(["game_started", "game_completed", "game_stopped", "note", "diagnostic_flag"]);
  if (!allowed.has(eventType)) throw new HttpError(400, "Unsupported tracked-game event");

  const players = await readPlayers(session.id, env.DB);
  if (eventType === "game_started" && players.length !== 2) {
    throw new HttpError(409, "Both players must join before the game starts");
  }

  const now = new Date().toISOString();
  const data = sanitizeMetadata(body.data);
  if (eventType === "diagnostic_flag") {
    const allowedFlags = new Set([
      "dont_know_what_happens_next",
      "rule_unclear",
      "no_meaningful_option",
      "feels_decided",
      "repeated_or_futile_battle",
      "component_or_tts_problem"
    ]);
    const flag = cleanString(data.flag, 64);
    if (!allowedFlags.has(flag)) throw new HttpError(400, "Choose a supported diagnostic flag");
    data.flag = flag;
  }
  data.participantId = participant.id;
  await insertEvent(env.DB, session.id, eventType, data, now);
  return json({ ok: true, eventType, recordedAt: now, session: await trackedPublicState(session, env.DB) }, 201, headers);
}

async function linkTrackedArbiter(token, request, env, headers) {
  const session = await requireTrackedSession(token, env.DB);
  requireOpen(session);
  const body = await readJson(request);
  const participant = await requireParticipant(session.id, body.participantId, body.participantToken, env.DB);
  const interactionId = cleanString(body.interactionId, 120);
  if (!UUID_PATTERN.test(interactionId)) throw new HttpError(400, "A valid interactionId is required");

  const interaction = await env.DB.prepare("SELECT id FROM rules_interactions WHERE id = ?")
    .bind(interactionId).first();
  if (!interaction) throw new HttpError(404, "Rules Arbiter interaction not found");

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
    participant.id
  ).run();

  if (Number(result?.meta?.changes || 0) > 0) {
    await env.DB.prepare(
      `UPDATE rules_interactions
          SET playtest_session_id = ?, sheet_serial = ?, playtest_participant_id = ?, updated_at = ?
        WHERE id = ?`
    ).bind(session.id, session.sheet_serial, participant.id, now, interactionId).run();
    await insertEvent(env.DB, session.id, "arbiter_linked", {
      interactionId,
      classification,
      participantId: participant.id
    }, now);
  }
  return json({ ok: true, interactionId, participantId: participant.id, linkedAt: now }, 201, headers);
}

async function submitSharedResult(token, request, env, headers) {
  const session = await requireTrackedSession(token, env.DB);
  requireOpen(session);
  const body = await readJson(request);
  const participant = await requireParticipant(session.id, body.participantId, body.participantToken, env.DB);
  const players = await readPlayers(session.id, env.DB);
  if (players.length !== 2) throw new HttpError(409, "Both players must join before results are submitted");
  const playerIds = new Set(players.map((player) => player.participantId));
  const result = normalizeSharedResult(body.result, playerIds);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO playtest_session_results
      (session_id, submitted_by_participant_id, completion_status,
       first_player_participant_id, winner_participant_id, victory_route,
       duration_minutes, rounds, battles, stop_reason, package_unmodified,
       variant_used, production_issue, strongest_moment, confusing_point,
       important_observation, submitted_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       submitted_by_participant_id = excluded.submitted_by_participant_id,
       completion_status = excluded.completion_status,
       first_player_participant_id = excluded.first_player_participant_id,
       winner_participant_id = excluded.winner_participant_id,
       victory_route = excluded.victory_route,
       duration_minutes = excluded.duration_minutes,
       rounds = excluded.rounds,
       battles = excluded.battles,
       stop_reason = excluded.stop_reason,
       package_unmodified = excluded.package_unmodified,
       variant_used = excluded.variant_used,
       production_issue = excluded.production_issue,
       strongest_moment = excluded.strongest_moment,
       confusing_point = excluded.confusing_point,
       important_observation = excluded.important_observation,
       updated_at = excluded.updated_at`
  ).bind(
    session.id,
    participant.id,
    result.completionStatus,
    result.firstPlayerParticipantId,
    result.winnerParticipantId,
    result.victoryRoute,
    result.durationMinutes,
    result.rounds,
    result.battles,
    result.stopReason,
    result.packageUnmodified ? 1 : 0,
    result.variantUsed ? 1 : 0,
    result.productionIssue || null,
    result.strongestMoment,
    result.confusingPoint,
    result.importantObservation,
    now,
    now
  ).run();
  await insertEvent(env.DB, session.id, "shared_result_submitted", {
    participantId: participant.id,
    completionStatus: result.completionStatus
  }, now);
  await maybeFinalize(session, env.DB);
  return json({ ok: true, session: await trackedPublicState(await requireTrackedSession(token, env.DB), env.DB) }, 201, headers);
}

async function submitPlayerResponse(token, request, env, headers) {
  const session = await requireTrackedSession(token, env.DB);
  requireOpen(session);
  const body = await readJson(request);
  const participant = await requireParticipant(session.id, body.participantId, body.participantToken, env.DB);
  const response = normalizePlayerResponse(body.response, participant.selection_reason);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO playtest_participant_responses
      (participant_id, session_id, faction_interest, expectation_match,
       leader_distinction, fun, pacing, meaningful_decisions, battle_tension,
       rules_clarity, faction_clarity, table_organization, play_again,
       felt_decided_when, agency_after_decided, decisive_cause, comments,
       submitted_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(participant_id) DO UPDATE SET
       faction_interest = excluded.faction_interest,
       expectation_match = excluded.expectation_match,
       leader_distinction = excluded.leader_distinction,
       fun = excluded.fun,
       pacing = excluded.pacing,
       meaningful_decisions = excluded.meaningful_decisions,
       battle_tension = excluded.battle_tension,
       rules_clarity = excluded.rules_clarity,
       faction_clarity = excluded.faction_clarity,
       table_organization = excluded.table_organization,
       play_again = excluded.play_again,
       felt_decided_when = excluded.felt_decided_when,
       agency_after_decided = excluded.agency_after_decided,
       decisive_cause = excluded.decisive_cause,
       comments = excluded.comments,
       updated_at = excluded.updated_at`
  ).bind(
    participant.id,
    session.id,
    response.factionInterest,
    response.expectationMatch,
    response.leaderDistinction,
    response.fun,
    response.pacing,
    response.meaningfulDecisions,
    response.battleTension,
    response.rulesClarity,
    response.factionClarity,
    response.tableOrganization,
    response.playAgain ? 1 : 0,
    response.feltDecidedWhen,
    response.agencyAfterDecided,
    response.decisiveCause || null,
    response.comments || null,
    now,
    now
  ).run();
  await insertEvent(env.DB, session.id, "player_response_submitted", {
    participantId: participant.id
  }, now);
  await maybeFinalize(session, env.DB);
  return json({ ok: true, session: await trackedPublicState(await requireTrackedSession(token, env.DB), env.DB) }, 201, headers);
}

async function readTrackedReview(token, request, env, headers) {
  const session = await requireTrackedSession(token, env.DB);
  const url = new URL(request.url);
  const hostKey = request.headers.get("x-host-key") || url.searchParams.get("host");
  await requireHost(hostKey, session);
  const state = await trackedPublicState(session, env.DB);
  const result = await env.DB.prepare(
    "SELECT * FROM playtest_session_results WHERE session_id = ?"
  ).bind(session.id).first();
  const responses = rowsFromResult(await env.DB.prepare(
    `SELECT r.*, p.display_name, p.seat_index, p.faction, p.leader
       FROM playtest_participant_responses r
       JOIN playtest_participants p ON p.id = r.participant_id
      WHERE r.session_id = ? ORDER BY p.seat_index ASC`
  ).bind(session.id).all());
  const arbiterLinks = rowsFromResult(await env.DB.prepare(
    `SELECT a.interaction_id, a.classification, a.question_excerpt, a.answer_excerpt,
            a.source_json, a.linked_at, a.participant_id,
            p.display_name, p.seat_index
       FROM playtest_arbiter_links a
       LEFT JOIN playtest_participants p ON p.id = a.participant_id
      WHERE a.session_id = ? ORDER BY a.linked_at ASC`
  ).bind(session.id).all()).map((row) => ({
    ...row,
    sources: parseJsonArray(row.source_json)
  }));
  const events = rowsFromResult(await env.DB.prepare(
    `SELECT event_type, event_json, created_at
       FROM playtest_session_events WHERE session_id = ?
      ORDER BY created_at ASC, rowid ASC`
  ).bind(session.id).all()).map((row) => ({
    eventType: row.event_type,
    data: parseJsonObject(row.event_json),
    createdAt: row.created_at
  }));

  return json({
    session: state,
    result: result ? mapResult(result) : null,
    responses: responses.map(mapResponse),
    arbiterLinks,
    events,
    generatedAt: new Date().toISOString()
  }, 200, headers);
}

async function maybeFinalize(session, db) {
  const counts = await db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM playtest_participants
         WHERE session_id = ? AND role = 'player' AND seat_index IS NOT NULL) AS players,
       (SELECT COUNT(*) FROM playtest_session_results WHERE session_id = ?) AS results,
       (SELECT COUNT(*) FROM playtest_participant_responses WHERE session_id = ?) AS responses`
  ).bind(session.id, session.id, session.id).first();
  if (Number(counts?.players || 0) !== 2 || Number(counts?.results || 0) !== 1 || Number(counts?.responses || 0) !== 2) return false;
  const now = new Date().toISOString();
  const update = await db.prepare(
    "UPDATE playtest_sessions SET status = 'closed', closed_at = ? WHERE id = ? AND status = 'open'"
  ).bind(now, session.id).run();
  if (Number(update?.meta?.changes || 0) > 0) {
    await insertEvent(db, session.id, "tracked_session_submitted", {}, now);
    return true;
  }
  return false;
}

async function trackedPublicState(session, db) {
  const players = await readPlayers(session.id, db);
  const result = await db.prepare(
    "SELECT completion_status, submitted_at FROM playtest_session_results WHERE session_id = ?"
  ).bind(session.id).first();
  const eventCounts = await db.prepare(
    `SELECT
       SUM(CASE WHEN event_type = 'game_started' THEN 1 ELSE 0 END) AS started,
       COUNT(*) AS event_count
       FROM playtest_session_events WHERE session_id = ?`
  ).bind(session.id).first();
  const arbiter = await db.prepare(
    "SELECT COUNT(*) AS count FROM playtest_arbiter_links WHERE session_id = ?"
  ).bind(session.id).first();
  const responseCount = players.filter((player) => player.responseSubmitted).length;
  let lifecycleState = "joining";
  if (session.status === "closed") lifecycleState = "submitted";
  else if (result) lifecycleState = "feedback";
  else if (Number(eventCounts?.started || 0) > 0) lifecycleState = "playing";
  else if (players.length === 2) lifecycleState = "ready";

  const metadata = parseJsonObject(session.metadata_json);
  return {
    sessionId: session.id,
    sheetSerial: session.sheet_serial,
    rulesVersion: session.rules_version,
    playMode: metadata.playMode || "physical",
    status: session.status,
    lifecycleState,
    createdAt: session.created_at,
    closedAt: session.closed_at || null,
    players,
    playerCount: players.length,
    resultSubmitted: Boolean(result),
    responseCount,
    arbiterQuestionCount: Number(arbiter?.count || 0),
    complete: session.status === "closed"
  };
}

async function readPlayers(sessionId, db) {
  const rows = rowsFromResult(await db.prepare(
    `SELECT p.id AS participant_id, p.display_name, p.seat_index, p.faction,
            p.leader, p.selection_reason, p.joined_at,
            CASE WHEN r.participant_id IS NULL THEN 0 ELSE 1 END AS response_submitted
       FROM playtest_participants p
       LEFT JOIN playtest_participant_responses r ON r.participant_id = p.id
      WHERE p.session_id = ? AND p.role = 'player' AND p.seat_index IS NOT NULL
      ORDER BY p.seat_index ASC`
  ).bind(sessionId).all());
  return rows.map((row) => ({
    participantId: row.participant_id,
    displayName: row.display_name || "Unnamed player",
    seatIndex: Number(row.seat_index),
    faction: row.faction,
    leader: row.leader,
    selectionReasonCaptured: Boolean(cleanString(row.selection_reason, 1000)),
    joinedAt: row.joined_at,
    responseSubmitted: Number(row.response_submitted) === 1
  }));
}

async function requireTrackedSession(token, db) {
  const tokenHash = await sha256(token);
  const session = await db.prepare(
    `SELECT id, token_hash, host_key_hash, sheet_serial, rules_version, status,
            created_at, closed_at, metadata_json, session_kind, event_session_id
       FROM playtest_sessions WHERE token_hash = ?`
  ).bind(tokenHash).first();
  if (!session) throw new HttpError(404, "Tracked game not found");
  const metadata = parseJsonObject(session.metadata_json);
  if (metadata.mode !== "tracked") throw new HttpError(404, "Tracked game not found");
  return session;
}

async function requireParticipant(sessionId, participantIdValue, participantTokenValue, db) {
  const participantId = cleanString(participantIdValue, 64);
  const participantToken = cleanString(participantTokenValue, 120);
  if (!UUID_PATTERN.test(participantId) || !participantToken) {
    throw new HttpError(401, "Join this game from your own device before continuing");
  }
  const participant = await db.prepare(
    `SELECT id, session_id, display_name, role, joined_at, identity_token_hash,
            seat_index, faction, leader, selection_reason
       FROM playtest_participants WHERE id = ? AND session_id = ? AND role = 'player'`
  ).bind(participantId, sessionId).first();
  if (!participant || !participant.identity_token_hash) throw new HttpError(401, "Player access was not recognized");
  if (!constantTimeEqual(await sha256(participantToken), participant.identity_token_hash)) {
    throw new HttpError(403, "Player access did not match this game");
  }
  return participant;
}

async function requireHost(value, session) {
  const hostKey = cleanString(value, 120);
  if (!hostKey || !constantTimeEqual(await sha256(hostKey), session.host_key_hash)) {
    throw new HttpError(403, "Invalid review key");
  }
}

function normalizeSharedResult(value, playerIds) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const completionStatus = input.completionStatus === "stopped" ? "stopped" : "completed";
  const firstPlayerParticipantId = cleanPlayerId(input.firstPlayerParticipantId, playerIds, true);
  const winnerParticipantId = completionStatus === "completed"
    ? cleanPlayerId(input.winnerParticipantId, playerIds, false)
    : null;
  const allowedRoutes = new Set(["run_the_gauntlet", "faction_victory", "concession", "other"]);
  const victoryRoute = completionStatus === "completed" && allowedRoutes.has(input.victoryRoute)
    ? input.victoryRoute
    : completionStatus === "completed" ? "other" : null;
  const durationMinutes = boundedInteger(input.durationMinutes, 1, 1440, "Enter the game duration in minutes");
  const rounds = optionalInteger(input.rounds, 0, 100);
  const battles = optionalInteger(input.battles, 0, 200);
  const strongestMoment = cleanString(input.strongestMoment, 1500);
  const confusingPoint = cleanString(input.confusingPoint, 1500);
  const importantObservation = cleanString(input.importantObservation, 1500);
  if (!strongestMoment || !confusingPoint || !importantObservation) {
    throw new HttpError(400, "Complete the three shared observation fields");
  }
  const stopReason = completionStatus === "stopped" ? cleanString(input.stopReason, 300) : null;
  if (completionStatus === "stopped" && !stopReason) throw new HttpError(400, "Enter why the game stopped");
  return {
    completionStatus,
    firstPlayerParticipantId,
    winnerParticipantId,
    victoryRoute,
    durationMinutes,
    rounds,
    battles,
    stopReason,
    packageUnmodified: input.packageUnmodified !== false,
    variantUsed: input.variantUsed === true,
    productionIssue: cleanString(input.productionIssue, 1000),
    strongestMoment,
    confusingPoint,
    importantObservation
  };
}

function normalizePlayerResponse(value, selectionReasonValue) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const factionInterest = cleanString(selectionReasonValue || input.factionInterest, 1000);
  if (!factionInterest) throw new HttpError(400, "Describe why this faction or Leader interested you");
  return {
    factionInterest,
    expectationMatch: rating(input.expectationMatch),
    leaderDistinction: rating(input.leaderDistinction),
    fun: rating(input.fun),
    pacing: rating(input.pacing),
    meaningfulDecisions: rating(input.meaningfulDecisions),
    battleTension: rating(input.battleTension),
    rulesClarity: rating(input.rulesClarity),
    factionClarity: rating(input.factionClarity),
    tableOrganization: rating(input.tableOrganization),
    playAgain: input.playAgain === true,
    feltDecidedWhen: normalizeDecisionPoint(input.feltDecidedWhen),
    agencyAfterDecided: normalizeAgencyAfterDecided(input.agencyAfterDecided),
    decisiveCause: cleanString(input.decisiveCause, 1000),
    comments: cleanString(input.comments, 2000)
  };
}

function normalizeDecisionPoint(value) {
  const point = cleanString(value, 32);
  const allowed = new Set(["never", "early", "middle", "late", "at_end"]);
  if (!allowed.has(point)) throw new HttpError(400, "Choose when the result first felt decided");
  return point;
}

function normalizeAgencyAfterDecided(value) {
  const agency = cleanString(value, 32);
  const allowed = new Set(["yes", "some", "no", "not_applicable"]);
  if (!allowed.has(agency)) throw new HttpError(400, "Choose whether meaningful decisions remained");
  return agency;
}

function mapResult(row) {
  return {
    sessionId: row.session_id,
    submittedByParticipantId: row.submitted_by_participant_id,
    completionStatus: row.completion_status,
    firstPlayerParticipantId: row.first_player_participant_id,
    winnerParticipantId: row.winner_participant_id,
    victoryRoute: row.victory_route,
    durationMinutes: Number(row.duration_minutes),
    rounds: row.rounds == null ? null : Number(row.rounds),
    battles: row.battles == null ? null : Number(row.battles),
    stopReason: row.stop_reason,
    packageUnmodified: Number(row.package_unmodified) === 1,
    variantUsed: Number(row.variant_used) === 1,
    productionIssue: row.production_issue || "",
    strongestMoment: row.strongest_moment,
    confusingPoint: row.confusing_point,
    importantObservation: row.important_observation,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at
  };
}

function mapResponse(row) {
  return {
    participantId: row.participant_id,
    displayName: row.display_name,
    seatIndex: Number(row.seat_index),
    faction: row.faction,
    leader: row.leader,
    factionInterest: row.faction_interest,
    expectationMatch: Number(row.expectation_match),
    leaderDistinction: Number(row.leader_distinction),
    fun: Number(row.fun),
    pacing: Number(row.pacing),
    meaningfulDecisions: Number(row.meaningful_decisions),
    battleTension: Number(row.battle_tension),
    rulesClarity: Number(row.rules_clarity),
    factionClarity: Number(row.faction_clarity),
    tableOrganization: Number(row.table_organization),
    playAgain: Number(row.play_again) === 1,
    feltDecidedWhen: row.felt_decided_when || "never",
    agencyAfterDecided: row.agency_after_decided || "not_applicable",
    decisiveCause: row.decisive_cause || "",
    comments: row.comments || "",
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at
  };
}

function cleanChoice(factionValue, leaderValue) {
  const faction = cleanString(factionValue, 32).toLowerCase();
  const factionData = FACTIONS[faction];
  if (!factionData) throw new HttpError(400, "Choose a valid faction");
  const rawLeader = cleanString(leaderValue, 80);
  const leaderId = Object.prototype.hasOwnProperty.call(factionData.leaders, rawLeader)
    ? rawLeader
    : Object.entries(factionData.leaders).find(([, name]) => name === rawLeader)?.[0];
  if (!leaderId) throw new HttpError(400, "Choose a valid Leader for that faction");
  return { faction, leader: factionData.leaders[leaderId], leaderId };
}

function cleanPlayerId(value, playerIds, required) {
  const id = cleanString(value, 64);
  if (!id && !required) return null;
  if (!UUID_PATTERN.test(id) || !playerIds.has(id)) throw new HttpError(400, "Choose a player from this game");
  return id;
}

function rating(value) {
  return boundedInteger(value, 1, 5, "Complete every 1–5 rating");
}

function boundedInteger(value, minimum, maximum, message) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) throw new HttpError(400, message);
  return number;
}

function optionalInteger(value, minimum, maximum) {
  if (value === "" || value == null) return null;
  return boundedInteger(value, minimum, maximum, "Enter a valid whole number");
}

async function enforceCreationLimit(request, env) {
  const now = new Date().toISOString();
  const dayKey = now.slice(0, 10);
  const address = cleanString(request.headers.get("cf-connecting-ip") || "local", 120);
  const agent = cleanString(request.headers.get("user-agent") || "unknown", 300);
  const salt = cleanString(env.TRACKED_CREATION_SALT || "gauntlet-tracked-v070", 256);
  const clientHash = await sha256(`${salt}|${address}|${agent}`);
  const row = await env.DB.prepare(
    "SELECT created_count FROM playtest_public_creation_limits WHERE client_hash = ? AND day_key = ?"
  ).bind(clientHash, dayKey).first();
  if (Number(row?.created_count || 0) >= CREATION_LIMIT_PER_DAY) {
    throw new HttpError(429, "This browser has created too many tracked games today");
  }
  await env.DB.prepare(
    `INSERT INTO playtest_public_creation_limits (client_hash, day_key, created_count, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(client_hash, day_key) DO UPDATE SET
       created_count = created_count + 1,
       updated_at = excluded.updated_at`
  ).bind(clientHash, dayKey, now).run();
}

async function uniqueSerial(db) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const serial = `G070-${randomCode(8)}`;
    const existing = await db.prepare("SELECT 1 AS found FROM playtest_sessions WHERE sheet_serial = ?")
      .bind(serial).first();
    if (!existing) return serial;
  }
  throw new Error("Could not allocate a unique tracked-game serial");
}

async function insertEvent(db, sessionId, eventType, data, timestamp) {
  await db.prepare(
    `INSERT INTO playtest_session_events (id, session_id, event_type, event_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), sessionId, eventType, JSON.stringify(data || {}), timestamp).run();
}

function requireOpen(session) {
  if (session.status !== "open") throw new HttpError(409, "This tracked game is closed");
}

function requireDatabase(env) {
  if (!env.DB) throw new HttpError(503, "D1 binding DB is not configured");
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { throw new HttpError(400, "Invalid JSON request body"); }
}

function sanitizeMetadata(value) {
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

function rowsFromResult(result) {
  return Array.isArray(result?.results) ? result.results : [];
}

function parseJsonObject(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
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
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
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
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Host-Key",
    "Vary": "Origin"
  });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function json(payload, status, headersLike) {
  const headers = new Headers(headersLike || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers });
}
