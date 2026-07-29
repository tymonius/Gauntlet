const DEFAULT_ORIGIN = "https://gauntlet.run";
const CURRENT_RULES_VERSION = "v0.6.1";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
const SERIAL_PATTERN = /^G061-[A-Z0-9]{6,12}$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return json({ ok: true, service: "gauntlet-playtest-sessions", version: CURRENT_RULES_VERSION }, 200, cors);
      }

      if (url.pathname === "/api/sessions" && request.method === "POST") {
        return await createSession(request, env, cors);
      }

      const match = url.pathname.match(/^\/api\/sessions\/([^/]+)(?:\/(join|close|event|arbiter))?$/);
      if (!match) return json({ error: "Not found" }, 404, cors);

      const token = match[1];
      const action = match[2] || "read";
      if (!TOKEN_PATTERN.test(token)) return json({ error: "Invalid session code" }, 400, cors);

      if (action === "read" && request.method === "GET") {
        return await readSession(token, env, cors);
      }
      if (action === "join" && request.method === "POST") {
        return await joinSession(token, request, env, cors);
      }
      if (action === "close" && request.method === "POST") {
        return await closeSession(token, request, env, cors);
      }
      if (action === "event" && request.method === "POST") {
        return await recordEvent(token, request, env, cors);
      }
      if (action === "arbiter" && request.method === "POST") {
        return await linkArbiterRecord(token, request, env, cors);
      }

      return json({ error: "Method not allowed" }, 405, cors);
    } catch (error) {
      console.error("playtest-session-worker", error);
      return json({ error: "Internal service error" }, 500, cors);
    }
  }
};

async function createSession(request, env, cors) {
  requireDatabase(env);
  const body = await readJson(request);
  const rulesVersion = cleanString(body.rulesVersion || CURRENT_RULES_VERSION, 24);
  if (rulesVersion !== CURRENT_RULES_VERSION) {
    return json({ error: `This service creates ${CURRENT_RULES_VERSION} sessions only.` }, 400, cors);
  }

  const token = randomToken(32);
  const hostKey = randomToken(40);
  const tokenHash = await sha256(token);
  const hostKeyHash = await sha256(hostKey);
  const serial = body.sheetSerial ? cleanSerial(body.sheetSerial) : await uniqueSerial(env.DB);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const metadata = sanitizeMetadata(body.metadata);

  await env.DB.prepare(
    `INSERT INTO playtest_sessions
      (id, token_hash, host_key_hash, sheet_serial, rules_version, status, created_at, metadata_json)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`
  ).bind(id, tokenHash, hostKeyHash, serial, rulesVersion, now, JSON.stringify(metadata)).run();

  await insertEvent(env.DB, id, "session_created", { rulesVersion, serial }, now);

  const origin = cleanOrigin(env.PUBLIC_SITE_ORIGIN || DEFAULT_ORIGIN);
  const joinUrl = `${origin}/playtest/session/?code=${encodeURIComponent(token)}`;
  const hostUrl = `${joinUrl}&host=${encodeURIComponent(hostKey)}`;

  return json({
    sessionId: id,
    sheetSerial: serial,
    rulesVersion,
    status: "open",
    joinToken: token,
    hostKey,
    joinUrl,
    hostUrl,
    createdAt: now
  }, 201, cors);
}

async function readSession(token, env, cors) {
  requireDatabase(env);
  const session = await findSessionByToken(token, env.DB);
  if (!session) return json({ error: "Session not found" }, 404, cors);

  const counts = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM playtest_participants WHERE session_id = ?) AS participant_count,
       (SELECT COUNT(*) FROM playtest_arbiter_links WHERE session_id = ?) AS arbiter_count`
  ).bind(session.id, session.id).first();

  return json(publicSession(session, counts), 200, cors);
}

async function joinSession(token, request, env, cors) {
  requireDatabase(env);
  const session = await findSessionByToken(token, env.DB);
  if (!session) return json({ error: "Session not found" }, 404, cors);
  if (session.status !== "open") return json({ error: "This session is closed" }, 409, cors);

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
  }, 201, cors);
}

async function closeSession(token, request, env, cors) {
  requireDatabase(env);
  const session = await findSessionByToken(token, env.DB);
  if (!session) return json({ error: "Session not found" }, 404, cors);

  const body = await readJson(request);
  const hostKey = cleanString(body.hostKey || "", 120);
  if (!hostKey || !constantTimeEqual(await sha256(hostKey), session.host_key_hash)) {
    return json({ error: "Invalid host key" }, 403, cors);
  }
  if (session.status === "closed") return json(publicSession(session), 200, cors);

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE playtest_sessions SET status = 'closed', closed_at = ? WHERE id = ?`
  ).bind(now, session.id).run();
  await insertEvent(env.DB, session.id, "session_closed", {}, now);

  return json({ ...publicSession(session), status: "closed", closedAt: now }, 200, cors);
}

async function recordEvent(token, request, env, cors) {
  requireDatabase(env);
  const session = await findSessionByToken(token, env.DB);
  if (!session) return json({ error: "Session not found" }, 404, cors);
  if (session.status !== "open") return json({ error: "This session is closed" }, 409, cors);

  const body = await readJson(request);
  const allowed = new Set([
    "game_started",
    "game_stopped",
    "game_completed",
    "rules_lookup",
    "sheet_reconciled",
    "note"
  ]);
  const eventType = cleanString(body.eventType || "", 48);
  if (!allowed.has(eventType)) return json({ error: "Unsupported event type" }, 400, cors);

  const now = new Date().toISOString();
  const data = sanitizeMetadata(body.data);
  await insertEvent(env.DB, session.id, eventType, data, now);
  return json({ ok: true, eventType, recordedAt: now }, 201, cors);
}

async function linkArbiterRecord(token, request, env, cors) {
  requireDatabase(env);
  const session = await findSessionByToken(token, env.DB);
  if (!session) return json({ error: "Session not found" }, 404, cors);

  const body = await readJson(request);
  const interactionId = cleanString(body.interactionId || "", 120);
  if (!interactionId) return json({ error: "interactionId is required" }, 400, cors);
  const classification = ["explicit", "inferred", "unresolved"].includes(body.classification)
    ? body.classification
    : null;
  const now = new Date().toISOString();

  await env.DB.prepare(
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
  await insertEvent(env.DB, session.id, "arbiter_linked", { interactionId, classification }, now);

  return json({ ok: true, interactionId, linkedAt: now }, 201, cors);
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
      `SELECT 1 AS found FROM playtest_sessions WHERE sheet_serial = ?`
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

function requireDatabase(env) {
  if (!env.DB) throw new Error("D1 binding DB is not configured");
}

async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON request body");
  }
}

function cleanSerial(value) {
  const serial = cleanString(value, 32).toUpperCase();
  if (!SERIAL_PATTERN.test(serial)) throw new Error("Invalid v0.6.1 sheet serial");
  return serial;
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

function cleanString(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanOrigin(value) {
  const url = new URL(value);
  return url.origin;
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
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join("");
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

function corsHeaders(request, env) {
  const allowed = cleanOrigin(env.ALLOWED_ORIGIN || DEFAULT_ORIGIN);
  const origin = request.headers.get("origin");
  return {
    "access-control-allow-origin": origin === allowed ? origin : allowed,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "vary": "origin"
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}
