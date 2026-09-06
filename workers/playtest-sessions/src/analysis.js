import trackedWorker from "./tracked.js";

const DEFAULT_ORIGIN = "https://gauntlet.run";
const ANALYSIS_SCHEMA_VERSION = "gauntlet-tracked-analysis-v1";
const RATING_KEYS = Object.freeze([
  "expectationMatch",
  "leaderDistinction",
  "fun",
  "pacing",
  "meaningfulDecisions",
  "battleTension",
  "rulesClarity",
  "factionClarity",
  "tableOrganization"
]);

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
      const base = await trackedWorker.fetch(request, env);
      if (!base.ok) return base;
      const payload = await base.json();
      return json({
        ...payload,
        compiledAnalysisSupported: true,
        analysisExportSchema: ANALYSIS_SCHEMA_VERSION
      }, 200, base.headers);
    }

    if (url.pathname !== "/api/tracked-analysis") {
      return trackedWorker.fetch(request, env);
    }

    const origin = allowedOrigin(request, env);
    const headers = responseHeaders(origin);
    if (request.headers.get("origin") && !origin) {
      return json({ error: "Origin not allowed" }, 403, responseHeaders(null));
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, headers);

    try {
      requireDatabase(env);
      requireOwnerAuthorization(request, env);
      const games = await readTrackedAnalysis(env.DB);
      return json({
        schemaVersion: ANALYSIS_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        summary: summarizeGames(games),
        games
      }, 200, headers);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, headers);
      console.error("tracked-analysis-worker", error);
      return json({ error: "Internal service error" }, 500, headers);
    }
  }
};

export async function readTrackedAnalysis(db) {
  const [sessionsResult, playersResult, resultsResult, arbiterResult, eventsResult] = await Promise.all([
    db.prepare(
      `SELECT id, sheet_serial, rules_version, status, created_at, closed_at, metadata_json
         FROM playtest_sessions
        WHERE session_kind = 'game'
          AND json_extract(metadata_json, '$.mode') = 'tracked'
        ORDER BY created_at DESC`
    ).all(),
    db.prepare(
      `SELECT p.session_id, p.id AS participant_id, p.display_name, p.seat_index,
              p.faction, p.leader, p.selection_reason, p.joined_at,
              r.faction_interest, r.expectation_match, r.leader_distinction,
              r.fun, r.pacing, r.meaningful_decisions, r.battle_tension,
              r.rules_clarity, r.faction_clarity, r.table_organization,
              r.play_again, r.felt_decided_when, r.agency_after_decided,
              r.decisive_cause, r.comments, r.submitted_at AS response_submitted_at,
              r.updated_at AS response_updated_at
         FROM playtest_participants p
         JOIN playtest_sessions s ON s.id = p.session_id
         LEFT JOIN playtest_participant_responses r ON r.participant_id = p.id
        WHERE s.session_kind = 'game'
          AND json_extract(s.metadata_json, '$.mode') = 'tracked'
          AND p.role = 'player'
          AND p.seat_index IS NOT NULL
        ORDER BY s.created_at DESC, p.seat_index ASC`
    ).all(),
    db.prepare(
      `SELECT r.*
         FROM playtest_session_results r
         JOIN playtest_sessions s ON s.id = r.session_id
        WHERE s.session_kind = 'game'
          AND json_extract(s.metadata_json, '$.mode') = 'tracked'
        ORDER BY r.submitted_at DESC`
    ).all(),
    db.prepare(
      `SELECT a.session_id, a.interaction_id, a.classification,
              a.question_excerpt, a.answer_excerpt, a.source_json,
              a.linked_at, a.participant_id,
              p.display_name, p.seat_index
         FROM playtest_arbiter_links a
         JOIN playtest_sessions s ON s.id = a.session_id
         LEFT JOIN playtest_participants p ON p.id = a.participant_id
        WHERE s.session_kind = 'game'
          AND json_extract(s.metadata_json, '$.mode') = 'tracked'
        ORDER BY a.linked_at ASC`
    ).all(),
    db.prepare(
      `SELECT e.session_id, e.event_type, e.event_json, e.created_at
         FROM playtest_session_events e
         JOIN playtest_sessions s ON s.id = e.session_id
        WHERE s.session_kind = 'game'
          AND json_extract(s.metadata_json, '$.mode') = 'tracked'
        ORDER BY e.created_at ASC, e.rowid ASC`
    ).all()
  ]);

  const sessions = rowsFromResult(sessionsResult);
  const playersBySession = groupRows(rowsFromResult(playersResult), "session_id");
  const resultsBySession = new Map(rowsFromResult(resultsResult).map((row) => [row.session_id, row]));
  const arbiterBySession = groupRows(rowsFromResult(arbiterResult), "session_id");
  const eventsBySession = groupRows(rowsFromResult(eventsResult), "session_id");

  return sessions.map((session) => {
    const players = (playersBySession.get(session.id) || []).map(mapPlayer);
    const result = resultsBySession.get(session.id);
    return {
      sessionId: session.id,
      sheetSerial: session.sheet_serial,
      rulesVersion: session.rules_version,
      status: session.status,
      createdAt: session.created_at,
      closedAt: session.closed_at || null,
      metadata: parseJsonObject(session.metadata_json),
      result: result ? mapResult(result) : null,
      players,
      arbiterQuestions: (arbiterBySession.get(session.id) || []).map(mapArbiterQuestion),
      events: (eventsBySession.get(session.id) || []).map((event) => ({
        eventType: event.event_type,
        data: parseJsonObject(event.event_json),
        createdAt: event.created_at
      }))
    };
  });
}

export function summarizeGames(games) {
  const responses = [];
  const factions = new Map();
  const leaders = new Map();
  const rulesVersions = new Map();
  const playModes = new Map();
  const diagnosticFlags = new Map();
  const decisionPoints = new Map();
  const agencyAfterDecided = new Map();
  const completion = { completed: 0, stopped: 0, pending: 0 };
  const victoryRoutes = new Map();
  let closedGames = 0;
  let resultCount = 0;
  let durationTotal = 0;
  let durationCount = 0;
  let arbiterQuestionCount = 0;
  let playerCount = 0;

  for (const game of games) {
    rulesVersions.set(game.rulesVersion, (rulesVersions.get(game.rulesVersion) || 0) + 1);
    const playMode = ["tts", "physical"].includes(game.metadata?.playMode) ? game.metadata.playMode : "unspecified";
    playModes.set(playMode, (playModes.get(playMode) || 0) + 1);
    for (const event of game.events || []) {
      if (event.eventType !== "diagnostic_flag" || !event.data?.flag) continue;
      diagnosticFlags.set(event.data.flag, (diagnosticFlags.get(event.data.flag) || 0) + 1);
    }
    if (game.status === "closed") closedGames += 1;
    arbiterQuestionCount += game.arbiterQuestions.length;
    playerCount += game.players.length;
    if (game.result) {
      resultCount += 1;
      completion[game.result.completionStatus] = (completion[game.result.completionStatus] || 0) + 1;
      if (Number.isFinite(game.result.durationMinutes)) {
        durationTotal += game.result.durationMinutes;
        durationCount += 1;
      }
      if (game.result.victoryRoute) {
        victoryRoutes.set(game.result.victoryRoute, (victoryRoutes.get(game.result.victoryRoute) || 0) + 1);
      }
    } else {
      completion.pending += 1;
    }

    for (const player of game.players) {
      const won = Boolean(game.result?.winnerParticipantId && game.result.winnerParticipantId === player.participantId);
      const faction = ensureGroup(factions, player.faction);
      const leader = ensureGroup(leaders, player.leader);
      faction.players += 1;
      leader.players += 1;
      faction.games.add(game.sessionId);
      leader.games.add(game.sessionId);
      if (won) {
        faction.wins += 1;
        leader.wins += 1;
      }
      if (!player.response) continue;
      responses.push(player.response);
      const decisionPoint = player.response.feltDecidedWhen || "never";
      const agency = player.response.agencyAfterDecided || "not_applicable";
      decisionPoints.set(decisionPoint, (decisionPoints.get(decisionPoint) || 0) + 1);
      agencyAfterDecided.set(agency, (agencyAfterDecided.get(agency) || 0) + 1);
      addResponseToGroup(faction, player.response);
      addResponseToGroup(leader, player.response);
    }
  }

  const averages = averageRatings(responses);
  const playAgainYes = responses.filter((response) => response.playAgain).length;
  return {
    gameCount: games.length,
    closedGameCount: closedGames,
    openGameCount: games.length - closedGames,
    resultCount,
    playerCount,
    responseCount: responses.length,
    responseCompletionRate: playerCount ? round(responses.length / playerCount, 4) : null,
    playAgainYes,
    playAgainRate: responses.length ? round(playAgainYes / responses.length, 4) : null,
    averageDurationMinutes: durationCount ? round(durationTotal / durationCount, 2) : null,
    arbiterQuestionCount,
    completion,
    victoryRoutes: Object.fromEntries(victoryRoutes),
    rulesVersions: Object.fromEntries(rulesVersions),
    playModes: Object.fromEntries(playModes),
    diagnosticFlags: Object.fromEntries(diagnosticFlags),
    decisionPoints: Object.fromEntries(decisionPoints),
    agencyAfterDecided: Object.fromEntries(agencyAfterDecided),
    ratingAverages: averages,
    factions: finalizeGroups(factions),
    leaders: finalizeGroups(leaders)
  };
}

function mapPlayer(row) {
  return {
    participantId: row.participant_id,
    displayName: row.display_name || "Unnamed player",
    seatIndex: Number(row.seat_index),
    faction: row.faction,
    leader: row.leader,
    selectionReason: row.selection_reason || "",
    joinedAt: row.joined_at,
    response: row.response_submitted_at ? {
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
      submittedAt: row.response_submitted_at,
      updatedAt: row.response_updated_at
    } : null
  };
}

function mapResult(row) {
  return {
    submittedByParticipantId: row.submitted_by_participant_id,
    completionStatus: row.completion_status,
    firstPlayerParticipantId: row.first_player_participant_id || null,
    winnerParticipantId: row.winner_participant_id || null,
    victoryRoute: row.victory_route || null,
    durationMinutes: Number(row.duration_minutes),
    rounds: row.rounds == null ? null : Number(row.rounds),
    battles: row.battles == null ? null : Number(row.battles),
    stopReason: row.stop_reason || "",
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

function mapArbiterQuestion(row) {
  return {
    interactionId: row.interaction_id,
    classification: row.classification || null,
    question: row.question_excerpt || "",
    answer: row.answer_excerpt || "",
    sources: parseJsonArray(row.source_json),
    linkedAt: row.linked_at,
    participantId: row.participant_id || null,
    displayName: row.display_name || null,
    seatIndex: row.seat_index == null ? null : Number(row.seat_index)
  };
}

function ensureGroup(map, key) {
  if (!map.has(key)) {
    map.set(key, {
      players: 0,
      games: new Set(),
      responses: 0,
      wins: 0,
      playAgainYes: 0,
      ratingTotals: Object.fromEntries(RATING_KEYS.map((rating) => [rating, 0]))
    });
  }
  return map.get(key);
}

function addResponseToGroup(group, response) {
  group.responses += 1;
  if (response.playAgain) group.playAgainYes += 1;
  for (const key of RATING_KEYS) group.ratingTotals[key] += Number(response[key] || 0);
}

function finalizeGroups(map) {
  return Object.fromEntries(Array.from(map.entries()).map(([key, group]) => [key, {
    playerCount: group.players,
    gameCount: group.games.size,
    responseCount: group.responses,
    wins: group.wins,
    winRate: group.players ? round(group.wins / group.players, 4) : null,
    playAgainRate: group.responses ? round(group.playAgainYes / group.responses, 4) : null,
    ratingAverages: Object.fromEntries(RATING_KEYS.map((rating) => [
      rating,
      group.responses ? round(group.ratingTotals[rating] / group.responses, 2) : null
    ]))
  }]));
}

function averageRatings(responses) {
  return Object.fromEntries(RATING_KEYS.map((key) => {
    const values = responses.map((response) => Number(response[key])).filter(Number.isFinite);
    return [key, values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length, 2) : null];
  }));
}

function groupRows(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}

function rowsFromResult(result) {
  return Array.isArray(result?.results) ? result.results : [];
}

function parseJsonObject(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function requireDatabase(env) {
  if (!env.DB) throw new HttpError(503, "D1 binding DB is not configured");
}

function requireOwnerAuthorization(request, env) {
  const expected = cleanString(env.SESSION_ADMIN_TOKEN || "", 256);
  if (!expected) throw new HttpError(503, "Playtest analysis access is not configured");
  const bearer = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const supplied = bearer || cleanString(request.headers.get("x-session-admin") || "", 256);
  if (!supplied || !constantTimeEqual(supplied, expected)) {
    throw new HttpError(401, "Playtest analysis authorization failed");
  }
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
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-session-admin",
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

function cleanString(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
