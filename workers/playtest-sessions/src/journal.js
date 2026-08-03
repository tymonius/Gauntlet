import integrityWorker from "./integrity.js";

const DEFAULT_ORIGIN = "https://gauntlet.run";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NOTE_CATEGORIES = new Set([
  "rules_confusion",
  "balance_concern",
  "great_moment",
  "frustration",
  "component_issue",
  "strategic_observation",
  "other"
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
      const base = await integrityWorker.fetch(request, env);
      if (!base.ok) return base;
      const payload = await base.json();
      return json({
        ...payload,
        playtestJournalSupported: true,
        retrospectiveFeedbackSupported: true,
        privatePlayerNotesSupported: true
      }, 200, base.headers);
    }

    if (url.pathname === "/api/tracked-analysis" && request.method === "GET") {
      const base = await integrityWorker.fetch(request, env);
      if (!base.ok) return base;
      const payload = await base.json();
      const games = Array.isArray(payload.games)
        ? payload.games.map((game) => ({
            ...game,
            collectionMode: collectionModeFromMetadata(game.metadata),
            playedOn: cleanString(game.metadata?.playedOn, 20) || null
          }))
        : [];
      const collectionModes = games.reduce((counts, game) => {
        counts[game.collectionMode] = (counts[game.collectionMode] || 0) + 1;
        return counts;
      }, {});
      const caveats = Array.isArray(payload.caveats) ? [...payload.caveats] : [];
      if (collectionModes.retrospective) {
        caveats.push(
          "Retrospective records were entered after play. Their reported results and questionnaire responses are usable, but live timing, linked Rules Arbiter activity, and reconstructed note timing should not be treated as contemporaneous tracking."
        );
      }
      return json({
        ...payload,
        summary: { ...payload.summary, collectionModes },
        caveats,
        games
      }, 200, base.headers);
    }

    if (url.pathname === "/api/retrospective-games") {
      if (request.method === "OPTIONS") return preflight(request, env);
      if (request.method !== "POST") return methodNotAllowed(request, env);
      return createRetrospectiveGame(request, env);
    }

    const noteMatch = url.pathname.match(/^\/api\/tracked-games\/([^/]+)\/notes$/);
    if (noteMatch) {
      if (request.method === "OPTIONS") return preflight(request, env);
      if (!new Set(["GET", "POST"]).has(request.method)) return methodNotAllowed(request, env);
      return handlePlayerNotes(noteMatch[1], request, env);
    }

    return integrityWorker.fetch(request, env);
  }
};

async function createRetrospectiveGame(request, env) {
  const origin = allowedOrigin(request, env);
  const headers = responseHeaders(origin);
  if (request.headers.get("origin") && !origin) return json({ error: "Origin not allowed" }, 403, responseHeaders(null));

  try {
    requireDatabase(env);
    const body = await readJson(request);
    const playedOn = cleanString(body.playedOn, 20);
    if (!DATE_PATTERN.test(playedOn)) throw new HttpError(400, "Choose the date the game was played");

    const upstreamUrl = new URL(request.url);
    upstreamUrl.pathname = "/api/tracked-games";
    upstreamUrl.search = "";
    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.set("content-type", "application/json");
    upstreamHeaders.delete("content-length");
    const upstream = await integrityWorker.fetch(new Request(upstreamUrl.toString(), {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({
        displayName: body.displayName,
        faction: body.faction,
        leader: body.leader,
        creationSource: "retrospective-page",
        selectionSource: "retrospective-entry"
      })
    }), env);

    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok) return json(payload || { error: "The retrospective record could not be created" }, upstream.status, upstream.headers);

    const now = new Date().toISOString();
    const row = await env.DB.prepare("SELECT metadata_json FROM playtest_sessions WHERE id = ?")
      .bind(payload.sessionId).first();
    const metadata = parseJsonObject(row?.metadata_json);
    metadata.mode = "tracked";
    metadata.collectionMode = "retrospective";
    metadata.playedOn = playedOn;
    metadata.recordedAt = now;
    metadata.liveTracking = false;
    await env.DB.prepare("UPDATE playtest_sessions SET metadata_json = ? WHERE id = ?")
      .bind(JSON.stringify(metadata), payload.sessionId).run();

    await insertEvent(env.DB, payload.sessionId, "game_started", {
      participantId: payload.participantId,
      retrospective: true,
      playedOn,
      approximate: true,
      recordedAt: now
    }, now);

    const joinUrl = withQuery(payload.joinUrl, "retrospective", "1");
    const reviewUrl = withQuery(payload.reviewUrl, "retrospective", "1");
    return json({
      ...payload,
      collectionMode: "retrospective",
      playedOn,
      joinUrl,
      reviewUrl
    }, 201, upstream.headers);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status, headers);
    console.error("retrospective-playtest", error);
    return json({ error: "Internal service error" }, 500, headers);
  }
}

async function handlePlayerNotes(token, request, env) {
  const origin = allowedOrigin(request, env);
  const headers = responseHeaders(origin);
  if (request.headers.get("origin") && !origin) return json({ error: "Origin not allowed" }, 403, responseHeaders(null));

  try {
    requireDatabase(env);
    if (!TOKEN_PATTERN.test(token)) throw new HttpError(400, "Invalid tracked-game code");
    const session = await requireSession(token, env.DB);
    const body = request.method === "POST" ? await readJson(request) : null;
    const participantId = cleanString(
      body?.participantId || request.headers.get("x-participant-id") || new URL(request.url).searchParams.get("participantId"),
      160
    );
    const participantToken = cleanString(
      body?.participantToken || request.headers.get("x-participant-token") || new URL(request.url).searchParams.get("participantToken"),
      160
    );
    const participant = await requireParticipant(session.id, participantId, participantToken, env.DB);

    if (request.method === "GET") {
      const notes = await readOwnNotes(session.id, participant.id, env.DB);
      return json({
        sessionId: session.id,
        collectionMode: collectionModeFromMetadata(parseJsonObject(session.metadata_json)),
        notes
      }, 200, headers);
    }

    if (session.status !== "open") throw new HttpError(409, "This playtest is closed");
    const note = cleanString(body.note, 1000);
    if (!note) throw new HttpError(400, "Write a note before saving");
    const category = cleanString(body.category, 48).toLowerCase();
    if (!NOTE_CATEGORIES.has(category)) throw new HttpError(400, "Choose a valid note category");
    const round = optionalInteger(body.round, 0, 100, "Round must be between 0 and 100");
    const requestedElapsed = optionalInteger(body.elapsedMinutes, 0, 1440, "Elapsed time must be between 0 and 1440 minutes");
    const clientNoteId = cleanString(body.clientNoteId, 160) || crypto.randomUUID();

    const existing = await env.DB.prepare(
      `SELECT id FROM playtest_session_events
        WHERE session_id = ?
          AND event_type = 'player_note'
          AND json_extract(event_json, '$.participantId') = ?
          AND json_extract(event_json, '$.clientNoteId') = ?
        LIMIT 1`
    ).bind(session.id, participant.id, clientNoteId).first();
    if (existing) {
      const notes = await readOwnNotes(session.id, participant.id, env.DB);
      return json({ ok: true, duplicate: true, notes }, 200, headers);
    }

    const metadata = parseJsonObject(session.metadata_json);
    const collectionMode = collectionModeFromMetadata(metadata);
    const now = new Date().toISOString();
    const elapsedMinutes = requestedElapsed ?? await deriveElapsedMinutes(session.id, collectionMode, now, env.DB);
    await insertEvent(env.DB, session.id, "player_note", {
      participantId: participant.id,
      clientNoteId,
      category,
      note,
      round,
      elapsedMinutes,
      privateDuringPlay: true,
      collectionMode,
      source: collectionMode === "retrospective" ? "reconstructed" : "live"
    }, now);

    const notes = await readOwnNotes(session.id, participant.id, env.DB);
    return json({ ok: true, notes }, 201, headers);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status, headers);
    console.error("playtest-journal", error);
    return json({ error: "Internal service error" }, 500, headers);
  }
}

async function requireSession(token, db) {
  const row = await db.prepare(
    `SELECT id, status, created_at, metadata_json
       FROM playtest_sessions
      WHERE token_hash = ? AND session_kind = 'game'`
  ).bind(await sha256(token)).first();
  if (!row) throw new HttpError(404, "Tracked game not found");
  return row;
}

async function requireParticipant(sessionId, participantId, participantToken, db) {
  if (!participantId || !participantToken) throw new HttpError(401, "Participant credentials are required");
  const row = await db.prepare(
    `SELECT id, display_name, seat_index
       FROM playtest_participants
      WHERE id = ? AND session_id = ? AND identity_token_hash = ?`
  ).bind(participantId, sessionId, await sha256(participantToken)).first();
  if (!row) throw new HttpError(403, "Invalid participant credentials");
  return row;
}

async function readOwnNotes(sessionId, participantId, db) {
  const result = await db.prepare(
    `SELECT id, event_type, event_json, created_at
       FROM playtest_session_events
      WHERE session_id = ? AND event_type IN ('player_note', 'note')
      ORDER BY created_at ASC, rowid ASC`
  ).bind(sessionId).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  return rows.flatMap((row) => {
    const data = parseJsonObject(row.event_json);
    if (data.participantId !== participantId) return [];
    const text = cleanString(data.note, 1000);
    if (!text) return [];
    return [{
      id: row.id,
      clientNoteId: cleanString(data.clientNoteId, 160) || null,
      category: NOTE_CATEGORIES.has(data.category) ? data.category : "other",
      note: text,
      round: Number.isInteger(data.round) ? data.round : null,
      elapsedMinutes: Number.isInteger(data.elapsedMinutes) ? data.elapsedMinutes : null,
      source: cleanString(data.source, 32) || "live",
      createdAt: row.created_at
    }];
  });
}

async function deriveElapsedMinutes(sessionId, collectionMode, now, db) {
  if (collectionMode === "retrospective") return null;
  const start = await db.prepare(
    `SELECT created_at FROM playtest_session_events
      WHERE session_id = ? AND event_type = 'game_started'
      ORDER BY created_at ASC, rowid ASC LIMIT 1`
  ).bind(sessionId).first();
  if (!start?.created_at) return null;
  const elapsed = Math.round((Date.parse(now) - Date.parse(start.created_at)) / 60000);
  return Number.isInteger(elapsed) && elapsed >= 0 && elapsed <= 1440 ? elapsed : null;
}

async function insertEvent(db, sessionId, eventType, data, timestamp) {
  await db.prepare(
    `INSERT INTO playtest_session_events (id, session_id, event_type, event_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), sessionId, eventType, JSON.stringify(data || {}), timestamp).run();
}

function collectionModeFromMetadata(metadata) {
  return metadata?.collectionMode === "retrospective" ? "retrospective" : "live-tracked";
}

function withQuery(value, key, nextValue) {
  const url = new URL(value);
  url.searchParams.set(key, nextValue);
  return url.toString();
}

function optionalInteger(value, min, max, message) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new HttpError(400, message);
  return number;
}

function parseJsonObject(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
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

function requireDatabase(env) {
  if (!env?.DB) throw new HttpError(503, "Playtest database unavailable");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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
