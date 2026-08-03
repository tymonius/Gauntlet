import journalWorker from "./journal.js";
import { summarizeGames } from "./analysis.js";

const DEFAULT_ORIGIN = "https://gauntlet.run";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FACTIONS = Object.freeze({
  military: new Set(["general", "commandant"]),
  diplomats: new Set(["ambassador", "senator"]),
  financiers: new Set(["banker", "executive"]),
  intelligence: new Set(["ranger", "spymaster"]),
  mystics: new Set(["alchemist", "spirit-walker"]),
  inquisition: new Set(["grand-inquisitor", "witch-hunter"])
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
      const base = await journalWorker.fetch(request, env);
      if (!base.ok) return base;
      const payload = await base.json();
      return json({
        ...payload,
        manualSessionClosureSupported: true,
        sessionCancellationSupported: true,
        standaloneFeedbackSupported: true
      }, 200, base.headers);
    }

    if (url.pathname === "/api/tracked-analysis" && request.method === "GET") {
      return enhanceAnalysis(request, env);
    }

    if (url.pathname === "/api/standalone-feedback") {
      if (request.method === "OPTIONS") return preflight(request, env);
      if (request.method !== "POST") return methodNotAllowed(request, env);
      return submitStandaloneFeedback(request, env);
    }

    const closeMatch = url.pathname.match(/^\/api\/tracked-games\/([^/]+)\/close$/);
    if (closeMatch) {
      if (request.method === "OPTIONS") return preflight(request, env);
      if (request.method !== "POST") return methodNotAllowed(request, env);
      return closeTrackedSession(closeMatch[1], request, env);
    }

    const publicStateMatch = url.pathname.match(/^\/api\/tracked-games\/([^/]+)$/);
    if (publicStateMatch && request.method === "GET") {
      const base = await journalWorker.fetch(request, env);
      if (!base.ok) return base;
      const payload = await base.json();
      const metadata = await readMetadataByToken(publicStateMatch[1], env?.DB);
      return json(augmentSessionState(payload, metadata), 200, base.headers);
    }

    const reviewMatch = url.pathname.match(/^\/api\/tracked-games\/([^/]+)\/review$/);
    if (reviewMatch && request.method === "GET") {
      const base = await journalWorker.fetch(request, env);
      if (!base.ok) return base;
      const payload = await base.json();
      const metadata = await readMetadataByToken(reviewMatch[1], env?.DB);
      return json({ ...payload, session: augmentSessionState(payload.session, metadata) }, 200, base.headers);
    }

    return journalWorker.fetch(request, env);
  }
};

async function enhanceAnalysis(request, env) {
  const base = await journalWorker.fetch(request, env);
  if (!base.ok) return base;
  const payload = await base.json();
  const allGames = Array.isArray(payload.games) ? payload.games : [];
  const cancelledGames = allGames.filter((game) => game.metadata?.closureType === "cancelled");
  const games = allGames
    .filter((game) => game.metadata?.closureType !== "cancelled")
    .map((game) => ({
      ...game,
      collectionMode: collectionModeFromMetadata(game.metadata),
      playedOn: cleanString(game.metadata?.playedOn, 20) || null,
      standaloneContext: game.metadata?.standaloneContext || null,
      closureType: cleanString(game.metadata?.closureType, 40) || null
    }));
  const collectionModes = games.reduce((counts, game) => {
    counts[game.collectionMode] = (counts[game.collectionMode] || 0) + 1;
    return counts;
  }, {});
  const caveats = Array.isArray(payload.caveats) ? [...payload.caveats] : [];
  if (collectionModes["standalone-feedback"]) {
    caveats.push(
      "Standalone feedback records contain one respondent's recollection and game context. They do not include a tracked timeline, a verified opponent, or a shared result."
    );
  }
  if (cancelledGames.length) {
    caveats.push(`${cancelledGames.length} cancelled session${cancelledGames.length === 1 ? " was" : "s were"} excluded from compiled analysis.`);
  }
  return json({
    ...payload,
    summary: {
      ...summarizeGames(games),
      collectionModes,
      cancelledSessionCount: cancelledGames.length
    },
    caveats,
    games
  }, 200, base.headers);
}

async function closeTrackedSession(token, request, env) {
  const origin = allowedOrigin(request, env);
  const headers = responseHeaders(origin);
  if (request.headers.get("origin") && !origin) return json({ error: "Origin not allowed" }, 403, responseHeaders(null));

  try {
    requireDatabase(env);
    if (!TOKEN_PATTERN.test(token)) throw new HttpError(400, "Invalid tracked-game code");
    const body = await readJson(request);
    const session = await requireSession(token, env.DB);
    const hostKey = cleanString(request.headers.get("x-host-key") || body.hostKey, 160);
    await requireHost(hostKey, session);

    const disposition = body.disposition === "cancel" ? "cancel" : "close";
    const closureType = disposition === "cancel" ? "cancelled" : "manual-close";
    const reason = cleanString(body.reason, 300) || null;
    const metadata = parseJsonObject(session.metadata_json);

    if (session.status === "closed") {
      if (!metadata.closureType) throw new HttpError(409, "This session is already complete");
      const state = await readPublicState(token, request, env);
      return json(augmentSessionState(state, metadata), 200, headers);
    }

    const now = new Date().toISOString();
    metadata.closureType = closureType;
    metadata.closureReason = reason;
    metadata.manuallyClosedAt = now;
    metadata.analysisEligible = closureType !== "cancelled";
    if (closureType === "cancelled") metadata.cancelled = true;

    await env.DB.prepare(
      "UPDATE playtest_sessions SET status = 'closed', closed_at = ?, metadata_json = ? WHERE id = ? AND status = 'open'"
    ).bind(now, JSON.stringify(metadata), session.id).run();
    await insertEvent(env.DB, session.id, closureType === "cancelled" ? "tracked_session_cancelled" : "tracked_session_closed_manually", {
      closureType,
      reason
    }, now);

    const state = await readPublicState(token, request, env);
    return json({ ok: true, session: augmentSessionState(state, metadata) }, 200, headers);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status, headers);
    console.error("tracked-session-closure", error);
    return json({ error: "Internal service error" }, 500, headers);
  }
}

async function submitStandaloneFeedback(request, env) {
  const origin = allowedOrigin(request, env);
  const headers = responseHeaders(origin);
  if (request.headers.get("origin") && !origin) return json({ error: "Origin not allowed" }, 403, responseHeaders(null));

  let created = null;
  try {
    requireDatabase(env);
    const body = await readJson(request);
    const playedOn = cleanString(body.playedOn, 20);
    validatePlayedOn(playedOn);
    const context = normalizeStandaloneContext(body.context);
    const response = body.response && typeof body.response === "object" && !Array.isArray(body.response)
      ? body.response
      : {};

    const createUrl = new URL(request.url);
    createUrl.pathname = "/api/tracked-games";
    createUrl.search = "";
    const createHeaders = new Headers(request.headers);
    createHeaders.set("content-type", "application/json");
    createHeaders.delete("content-length");
    const createResponse = await journalWorker.fetch(new Request(createUrl.toString(), {
      method: "POST",
      headers: createHeaders,
      body: JSON.stringify({
        displayName: body.displayName,
        faction: body.faction,
        leader: body.leader,
        creationSource: "standalone-feedback-page",
        selectionSource: "standalone-feedback"
      })
    }), env);
    created = await createResponse.json().catch(() => null);
    if (!createResponse.ok) return json(created || { error: "Feedback record could not be created" }, createResponse.status, createResponse.headers);

    const now = new Date().toISOString();
    const row = await env.DB.prepare("SELECT metadata_json FROM playtest_sessions WHERE id = ?")
      .bind(created.sessionId).first();
    const metadata = parseJsonObject(row?.metadata_json);
    metadata.mode = "tracked";
    metadata.collectionMode = "standalone-feedback";
    metadata.playedOn = playedOn;
    metadata.recordedAt = now;
    metadata.liveTracking = false;
    metadata.standaloneFeedback = true;
    metadata.standaloneContext = context;
    await env.DB.prepare("UPDATE playtest_sessions SET metadata_json = ? WHERE id = ?")
      .bind(JSON.stringify(metadata), created.sessionId).run();

    const responseUrl = new URL(request.url);
    responseUrl.pathname = `/api/tracked-games/${encodeURIComponent(created.joinToken)}/response`;
    responseUrl.search = "";
    const responseHeadersValue = new Headers(request.headers);
    responseHeadersValue.set("content-type", "application/json");
    responseHeadersValue.delete("content-length");
    const responseResult = await journalWorker.fetch(new Request(responseUrl.toString(), {
      method: "POST",
      headers: responseHeadersValue,
      body: JSON.stringify({
        participantId: created.participantId,
        participantToken: created.participantToken,
        response
      })
    }), env);
    const responsePayload = await responseResult.json().catch(() => null);
    if (!responseResult.ok) {
      await discardStandaloneShell(created.sessionId, metadata, env.DB);
      return json(responsePayload || { error: "Feedback could not be submitted" }, responseResult.status, responseResult.headers);
    }

    metadata.closureType = "standalone-feedback";
    metadata.manuallyClosedAt = now;
    metadata.analysisEligible = true;
    await env.DB.prepare(
      "UPDATE playtest_sessions SET status = 'closed', closed_at = ?, metadata_json = ? WHERE id = ?"
    ).bind(now, JSON.stringify(metadata), created.sessionId).run();
    await insertEvent(env.DB, created.sessionId, "standalone_feedback_submitted", {
      participantId: created.participantId,
      playedOn,
      collectionMode: "standalone-feedback"
    }, now);

    return json({
      ok: true,
      receipt: created.sheetSerial,
      submittedAt: now,
      playedOn,
      collectionMode: "standalone-feedback"
    }, 201, headers);
  } catch (error) {
    if (created?.sessionId) {
      try {
        const row = await env.DB.prepare("SELECT metadata_json FROM playtest_sessions WHERE id = ?").bind(created.sessionId).first();
        await discardStandaloneShell(created.sessionId, parseJsonObject(row?.metadata_json), env.DB);
      } catch {}
    }
    if (error instanceof HttpError) return json({ error: error.message }, error.status, headers);
    console.error("standalone-feedback", error);
    return json({ error: "Internal service error" }, 500, headers);
  }
}

async function discardStandaloneShell(sessionId, metadata, db) {
  const now = new Date().toISOString();
  metadata.mode = "discarded";
  metadata.collectionMode = "standalone-feedback";
  metadata.analysisEligible = false;
  metadata.submissionFailed = true;
  await db.prepare("UPDATE playtest_sessions SET status = 'closed', closed_at = ?, metadata_json = ? WHERE id = ?")
    .bind(now, JSON.stringify(metadata), sessionId).run();
}

async function readPublicState(token, originalRequest, env) {
  const url = new URL(originalRequest.url);
  url.pathname = `/api/tracked-games/${encodeURIComponent(token)}`;
  url.search = "";
  const base = await journalWorker.fetch(new Request(url.toString(), {
    method: "GET",
    headers: originalRequest.headers
  }), env);
  const payload = await base.json().catch(() => null);
  if (!base.ok) throw new HttpError(base.status, payload?.error || "Tracked game could not be read");
  return payload;
}

async function readMetadataByToken(token, db) {
  if (!db || !TOKEN_PATTERN.test(token)) return {};
  const row = await db.prepare(
    "SELECT metadata_json FROM playtest_sessions WHERE token_hash = ? AND session_kind = 'game'"
  ).bind(await sha256(token)).first();
  return parseJsonObject(row?.metadata_json);
}

function augmentSessionState(state, metadata) {
  if (!state || !metadata?.closureType) return state;
  const cancelled = metadata.closureType === "cancelled";
  return {
    ...state,
    lifecycleState: cancelled ? "cancelled" : "closed",
    complete: false,
    closureType: metadata.closureType,
    closureReason: cleanString(metadata.closureReason, 300) || null,
    analysisEligible: metadata.analysisEligible !== false
  };
}

async function requireSession(token, db) {
  const row = await db.prepare(
    `SELECT id, status, host_key_hash, metadata_json
       FROM playtest_sessions
      WHERE token_hash = ? AND session_kind = 'game'`
  ).bind(await sha256(token)).first();
  if (!row) throw new HttpError(404, "Tracked game not found");
  const metadata = parseJsonObject(row.metadata_json);
  if (metadata.mode !== "tracked") throw new HttpError(404, "Tracked game not found");
  return row;
}

async function requireHost(value, session) {
  if (!value || !session.host_key_hash || !constantTimeEqual(await sha256(value), session.host_key_hash)) {
    throw new HttpError(403, "Only the session creator can close or cancel this session");
  }
}

function normalizeStandaloneContext(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const opponentFaction = cleanString(input.opponentFaction, 40).toLowerCase();
  const opponentLeader = cleanString(input.opponentLeader, 80).toLowerCase();
  if (opponentFaction && !FACTIONS[opponentFaction]) throw new HttpError(400, "Choose a valid opponent faction");
  if (opponentLeader && (!opponentFaction || !FACTIONS[opponentFaction].has(opponentLeader))) {
    throw new HttpError(400, "Choose a valid opponent Leader");
  }
  const completionStatus = new Set(["completed", "stopped", "unknown"]).has(input.completionStatus)
    ? input.completionStatus
    : "unknown";
  const outcomePerspective = new Set(["self", "opponent", "no_winner", "unknown"]).has(input.outcomePerspective)
    ? input.outcomePerspective
    : "unknown";
  const strongestMoment = cleanString(input.strongestMoment, 1500);
  const confusingPoint = cleanString(input.confusingPoint, 1500);
  const importantObservation = cleanString(input.importantObservation, 1500);
  if (!strongestMoment || !confusingPoint || !importantObservation) {
    throw new HttpError(400, "Complete the three playtest observation fields");
  }
  return {
    opponentFaction: opponentFaction || null,
    opponentLeader: opponentLeader || null,
    completionStatus,
    outcomePerspective,
    durationMinutes: optionalInteger(input.durationMinutes, 1, 1440, "Duration must be between 1 and 1440 minutes"),
    rounds: optionalInteger(input.rounds, 0, 100, "Rounds must be between 0 and 100"),
    packageUnmodified: input.packageUnmodified !== false,
    variantUsed: input.variantUsed === true,
    productionIssue: cleanString(input.productionIssue, 1000) || null,
    strongestMoment,
    confusingPoint,
    importantObservation
  };
}

function validatePlayedOn(value) {
  if (!DATE_PATTERN.test(value)) throw new HttpError(400, "Choose the date the game was played");
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed)) throw new HttpError(400, "Choose a valid play date");
  if (parsed > Date.now() + 86400000) throw new HttpError(400, "The play date cannot be in the future");
}

function collectionModeFromMetadata(metadata) {
  if (metadata?.collectionMode === "retrospective") return "retrospective";
  if (metadata?.collectionMode === "standalone-feedback") return "standalone-feedback";
  return "live-tracked";
}

function optionalInteger(value, min, max, message) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new HttpError(400, message);
  return number;
}

async function insertEvent(db, sessionId, eventType, data, timestamp) {
  await db.prepare(
    `INSERT INTO playtest_session_events (id, session_id, event_type, event_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), sessionId, eventType, JSON.stringify(data || {}), timestamp).run();
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "A JSON request body is required");
  }
}

function cleanString(value, maxLength = 1000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parseJsonObject(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function requireDatabase(env) {
  if (!env?.DB) throw new HttpError(503, "Playtest database unavailable");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = new Set(
    cleanString(env?.ALLOWED_ORIGINS || DEFAULT_ORIGIN, 2000)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  return allowed.has(origin) ? origin : null;
}

function responseHeaders(origin) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type,X-Participant-Id,X-Participant-Token,X-Host-Key,Authorization"
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return headers;
}

function json(payload, status = 200, sourceHeaders = null) {
  const headers = sourceHeaders ? new Headers(sourceHeaders) : responseHeaders(null);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload), { status, headers });
}

function preflight(request, env) {
  const origin = allowedOrigin(request, env);
  if (request.headers.get("origin") && !origin) return json({ error: "Origin not allowed" }, 403, responseHeaders(null));
  return new Response(null, { status: 204, headers: responseHeaders(origin) });
}

function methodNotAllowed(request, env) {
  const origin = allowedOrigin(request, env);
  return json({ error: "Method not allowed" }, 405, responseHeaders(origin));
}
