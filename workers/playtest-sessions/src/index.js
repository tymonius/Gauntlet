const DEFAULT_ORIGIN = "https://gauntlet.run";
const CURRENT_RULES_VERSION = "v0.6.1";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
const SERIAL_PATTERN = /^G061-[A-Z0-9]{6,12}$/;
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
          onboardingSupported: true
        }, 200, headers);
      }

      if (url.pathname === "/api/sessions" && request.method === "POST") {
        requireCreatorAuthorization(request, env);
        return await createSession(request, env, headers);
      }

      const match = url.pathname.match(/^\/api\/sessions\/([^/]+)(?:\/(join|close|event|arbiter|onboarding))?$/);
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

  let serial;
  if (body.sheetSerial) {
    serial = cleanSerial(body.sheetSerial);
    const duplicate = await env.DB.prepare(
      "SELECT 1 AS found FROM playtest_sessions WHERE sheet_serial = ?"
    ).bind(serial).first();
    if (duplicate) throw new HttpError(409, "That sheet serial is already assigned.");
  } else {
    serial = await uniqueSerial(env.DB);
  }

  const token = randomToken(32);
  const hostKey = randomToken(40);
  const tokenHash = await sha256(token);
  const hostKeyHash = await sha256(hostKey);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const metadata = sanitizeMetadata(body.metadata);

  await env.DB.prepare(
    `INSERT INTO playtest_sessions
      (id, token_hash, host_key_hash, sheet_serial, rules_version, status, created_at, metadata_json)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`
  ).bind(id, tokenHash, hostKeyHash, serial, rulesVersion, now, JSON.stringify(metadata)).run();

  await insertEvent(env.DB, id, "session_created", { rulesVersion, serial }, now);

  const siteOrigin = cleanOrigin(env.PUBLIC_SITE_ORIGIN || DEFAULT_ORIGIN);
  const joinUrl = `${siteOrigin}/playtest/session/?code=${encodeURIComponent(token)}`;
  const hostUrl = `${joinUrl}&host=${encodeURIComponent(hostKey)}`;
  const onboardingUrl = `${siteOrigin}/playtest/onboarding/?code=${encodeURIComponent(token)}`;
  const onboardingHostUrl = `${onboardingUrl}&host=${encodeURIComponent(hostKey)}`;

  return json({
    sessionId: id,
    sheetSerial: serial,
    rulesVersion,
    status: "open",
    joinToken: token,
    hostKey,
    joinUrl,
    hostUrl,
    onboardingUrl,
    onboardingHostUrl,
    createdAt: now
  }, 201, headers);
}

async function readSession(token, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  const counts = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM playtest_participants WHERE session_id = ?) AS participant_count,
       (SELECT COUNT(*) FROM playtest_arbiter_links WHERE session_id = ?) AS arbiter_count`
  ).bind(session.id, session.id).first();
  return json(publicSession(session, counts), 200, headers);
}

async function joinSession(token, request, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  requireOpenSession(session);

  const body = await readJson(request);
  const participantId = crypto.randomUUID();
  const displayName = cleanString(body.displayName || "", 80) || null;
  const role = ["player", "facilitator", "observer"].includes(body.role) ? body.role : "player";
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

async function closeSession(token, request, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  const body = await readJson(request);
  await requireHostAuthorization(body.hostKey, session);
  if (session.status === "closed") return json(publicSession(session), 200, headers);

  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE playtest_sessions SET status = 'closed', closed_at = ? WHERE id = ?"
  ).bind(now, session.id).run();
  await insertEvent(env.DB, session.id, "session_closed", {}, now);

  return json({ ...publicSession(session), status: "closed", closedAt: now }, 200, headers);
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

  const participantResult = await env.DB.prepare(
    `SELECT id, display_name, joined_at
       FROM playtest_participants
      WHERE session_id = ? AND role = 'player'
      ORDER BY joined_at ASC`
  ).bind(session.id).all();
  const eventResult = await env.DB.prepare(
    `SELECT event_json, created_at
       FROM playtest_session_events
      WHERE session_id = ? AND event_type = 'onboarding_choice'
      ORDER BY created_at ASC, rowid ASC`
  ).bind(session.id).all();

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

  return json({
    session: publicSession(session, { participant_count: participants.length }),
    choices,
    pendingParticipants,
    generatedAt: new Date().toISOString()
  }, 200, headers);
}

async function normalizeOnboardingChoice(value, sessionId, db) {
  const input = sanitizeMetadata(value);
  const participantId = cleanString(input.participantId || "", 64);
  if (!UUID_PATTERN.test(participantId)) throw new HttpError(400, "A valid participantId is required");

  const participant = await db.prepare(
    `SELECT id, role FROM playtest_participants WHERE id = ? AND session_id = ?`
  ).bind(participantId, sessionId).first();
  if (!participant || participant.role !== "player") {
    throw new HttpError(404, "Player registration was not found for this session");
  }

  const faction = cleanString(input.faction || "", 32).toLowerCase();
  const leader = cleanString(input.leader || "", 80);
  if (!Object.prototype.hasOwnProperty.call(FACTION_LEADERS, faction)) {
    throw new HttpError(400, "Choose a valid faction");
  }
  if (!FACTION_LEADERS[faction].includes(leader)) {
    throw new HttpError(400, "Choose a valid Leader for that faction");
  }
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

async function linkArbiterRecord(token, request, env, headers) {
  requireDatabase(env);
  const session = await requireSession(token, env.DB);
  const body = await readJson(request);
  const interactionId = cleanString(body.interactionId || "", 120);
  if (!UUID_PATTERN.test(interactionId)) throw new HttpError(400, "A valid interactionId is required");

  const interaction = await env.DB.prepare(
    "SELECT id FROM rules_interactions WHERE id = ?"
  ).bind(interactionId).first();
  if (!interaction) throw new HttpError(404, "Rules Arbiter interaction not found");

  const classification = ["explicit", "inferred", "unresolved"].includes(body.classification)
    ? body.classification
    : null;
  const now = new Date().toISOString();

  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO playtest_arbiter_links
      (id, session_id, interaction_id, classification, question_excerpt, answer_excerpt, source_json, linked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    session.id,
    interactionId,
    classification,
    cleanString(body.question, 300) || null,
    cleanString(body.answer, 500) || null,
    JSON.stringify(Array.isArray(body.sources) ? body.sources.slice(0, 10) : []),
    now
  ).run();

  if (Number(result?.meta?.changes || 0) > 0) {
    await env.DB.prepare(
      "UPDATE rules_interactions SET playtest_session_id = ?, sheet_serial = ?, updated_at = ? WHERE id = ?"
    ).bind(session.id, session.sheet_serial, now, interactionId).run();
    await insertEvent(env.DB, session.id, "arbiter_linked", { interactionId, classification }, now);
  }

  return json({ ok: true, interactionId, linkedAt: now }, 201, headers);
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
            created_at, closed_at, metadata_json
       FROM playtest_sessions WHERE token_hash = ?`
  ).bind(tokenHash).first();
}

function publicSession(session, counts = {}) {
  return {
    sessionId: session.id,
    sheetSerial: session.sheet_serial,
    rulesVersion: session.rules_version,
    status: session.status,
    createdAt: session.created_at,
    closedAt: session.closed_at || null,
    participantCount: Number(counts?.participant_count || 0),
    arbiterQuestionCount: Number(counts?.arbiter_count || 0)
  };
}

async function uniqueSerial(db) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const serial = `G061-${randomCode(8)}`;
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
  if (!SERIAL_PATTERN.test(serial)) throw new HttpError(400, "Invalid v0.6.1 sheet serial");
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
