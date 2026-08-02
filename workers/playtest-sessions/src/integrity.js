import analysisWorker, { readTrackedAnalysis, summarizeGames } from "./analysis.js";

const DEFAULT_ORIGIN = "https://gauntlet.run";
const INTEGRITY_SCHEMA_VERSION = "gauntlet-playtest-integrity-v1";
const REASON_CODES = new Set(["test", "duplicate", "incomplete", "invalid", "corrupted", "other"]);

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
      const base = await analysisWorker.fetch(request, env);
      if (!base.ok) return base;
      const payload = await base.json();
      return json({
        ...payload,
        analysisExclusionsSupported: true,
        analysisExclusionSchema: INTEGRITY_SCHEMA_VERSION
      }, 200, base.headers);
    }

    if (url.pathname === "/api/tracked-analysis" && request.method === "GET") {
      const base = await analysisWorker.fetch(request, env);
      if (!base.ok) return base;
      try {
        const payload = await base.json();
        const rows = await readExclusions(env.DB);
        const integrity = buildIntegrityView(payload.games || [], rows);
        return json({
          ...payload,
          integritySchemaVersion: INTEGRITY_SCHEMA_VERSION,
          summary: summarizeGames(integrity.activeGames),
          games: integrity.activeGames,
          exclusionSummary: integrity.summary
        }, 200, base.headers);
      } catch (error) {
        console.error("tracked-analysis-integrity", error);
        return json({ error: "Playtest integrity data could not be loaded" }, 500, base.headers);
      }
    }

    if (url.pathname !== "/api/tracked-analysis/exclusions") {
      return analysisWorker.fetch(request, env);
    }

    const origin = allowedOrigin(request, env);
    const headers = responseHeaders(origin);
    if (request.headers.get("origin") && !origin) {
      return json({ error: "Origin not allowed" }, 403, responseHeaders(null));
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (!new Set(["GET", "POST"]).has(request.method)) {
      return json({ error: "Method not allowed" }, 405, headers);
    }

    try {
      requireDatabase(env);
      const authorization = await authorizeThroughAnalysis(request, env);
      if (!authorization.ok) return authorization;

      if (request.method === "POST") {
        const body = await readJson(request);
        await applyIntegrityAction(env.DB, body);
      }

      const games = await readTrackedAnalysis(env.DB);
      const rows = await readExclusions(env.DB);
      const integrity = buildIntegrityView(games, rows);
      return json({
        schemaVersion: INTEGRITY_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        summary: integrity.summary,
        activeGames: integrity.activeGames,
        excludedGames: integrity.excludedGames,
        excludedResponses: integrity.excludedResponses,
        history: integrity.history
      }, 200, headers);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, headers);
      console.error("tracked-analysis-exclusions", error);
      return json({ error: "Internal service error" }, 500, headers);
    }
  }
};

export async function readExclusions(db) {
  const result = await db.prepare(
    `SELECT id, target_type, target_id, session_id, reason_code, reason_note,
            excluded_by, excluded_at, restored_by, restored_at
       FROM playtest_analysis_exclusions
      ORDER BY excluded_at DESC`
  ).all();
  return Array.isArray(result?.results) ? result.results.map(mapExclusion) : [];
}

export function buildIntegrityView(games, exclusionRows) {
  const history = exclusionRows.map(normalizeExclusion);
  const active = history.filter((row) => !row.restoredAt);
  const activeGameExclusions = new Map(
    active.filter((row) => row.targetType === "game").map((row) => [row.targetId, row])
  );
  const activeResponseExclusions = new Map(
    active.filter((row) => row.targetType === "response").map((row) => [row.targetId, row])
  );
  const activeGames = [];
  const excludedGames = [];
  const excludedResponses = [];

  for (const sourceGame of games) {
    const gameExclusion = activeGameExclusions.get(sourceGame.sessionId);
    if (gameExclusion) {
      excludedGames.push({ exclusion: gameExclusion, game: clone(sourceGame) });
      continue;
    }

    const game = clone(sourceGame);
    for (const player of game.players || []) {
      const responseExclusion = activeResponseExclusions.get(player.participantId);
      if (!responseExclusion || !player.response) continue;
      excludedResponses.push({
        exclusion: responseExclusion,
        game: {
          sessionId: game.sessionId,
          sheetSerial: game.sheetSerial,
          rulesVersion: game.rulesVersion,
          status: game.status,
          createdAt: game.createdAt
        },
        player: clone(player)
      });
      player.response = null;
    }
    activeGames.push(game);
  }

  return {
    activeGames,
    excludedGames,
    excludedResponses,
    history,
    summary: {
      activeGameCount: activeGames.length,
      excludedGameCount: excludedGames.length,
      excludedResponseCount: excludedResponses.length,
      activeExclusionCount: active.length,
      historyCount: history.length
    }
  };
}

export async function applyIntegrityAction(db, body) {
  const action = cleanString(body?.action, 24).toLowerCase();
  const reviewer = cleanString(body?.reviewer, 80);
  if (!reviewer) throw new HttpError(400, "Reviewer name or initials are required");

  if (action === "exclude") {
    const targetType = cleanString(body?.targetType, 24).toLowerCase();
    const targetId = cleanString(body?.targetId, 160);
    const reasonCode = cleanString(body?.reasonCode, 32).toLowerCase();
    const reasonNote = cleanString(body?.reasonNote, 1000);
    if (!new Set(["game", "response"]).has(targetType)) throw new HttpError(400, "Invalid exclusion target");
    if (!targetId) throw new HttpError(400, "Exclusion target is required");
    if (!REASON_CODES.has(reasonCode)) throw new HttpError(400, "Invalid exclusion reason");
    if (reasonCode === "other" && !reasonNote) throw new HttpError(400, "A note is required for Other");

    const games = await readTrackedAnalysis(db);
    const target = findTarget(games, targetType, targetId);
    if (!target) throw new HttpError(404, targetType === "game" ? "Tracked game not found" : "Questionnaire response not found");

    const existing = await db.prepare(
      `SELECT id FROM playtest_analysis_exclusions
        WHERE target_type = ? AND target_id = ? AND restored_at IS NULL`
    ).bind(targetType, targetId).first();
    if (existing) throw new HttpError(409, "This record is already excluded");

    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO playtest_analysis_exclusions
        (id, target_type, target_id, session_id, reason_code, reason_note,
         excluded_by, excluded_at, restored_by, restored_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
    ).bind(
      crypto.randomUUID(), targetType, targetId, target.sessionId,
      reasonCode, reasonNote || null, reviewer, now
    ).run();
    return;
  }

  if (action === "restore") {
    const exclusionId = cleanString(body?.exclusionId, 160);
    if (!exclusionId) throw new HttpError(400, "Exclusion record is required");
    const existing = await db.prepare(
      `SELECT id FROM playtest_analysis_exclusions
        WHERE id = ? AND restored_at IS NULL`
    ).bind(exclusionId).first();
    if (!existing) throw new HttpError(404, "Active exclusion not found");
    await db.prepare(
      `UPDATE playtest_analysis_exclusions
          SET restored_by = ?, restored_at = ?
        WHERE id = ? AND restored_at IS NULL`
    ).bind(reviewer, new Date().toISOString(), exclusionId).run();
    return;
  }

  throw new HttpError(400, "Invalid integrity action");
}

function findTarget(games, targetType, targetId) {
  if (targetType === "game") {
    const game = games.find((item) => item.sessionId === targetId);
    return game ? { sessionId: game.sessionId } : null;
  }
  for (const game of games) {
    const player = (game.players || []).find((item) => item.participantId === targetId && item.response);
    if (player) return { sessionId: game.sessionId };
  }
  return null;
}

async function authorizeThroughAnalysis(request, env) {
  const url = new URL(request.url);
  url.pathname = "/api/tracked-analysis";
  url.search = "";
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.delete("content-type");
  return analysisWorker.fetch(new Request(url.toString(), { method: "GET", headers }), env);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

function mapExclusion(row) {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    sessionId: row.session_id,
    reasonCode: row.reason_code,
    reasonNote: row.reason_note || "",
    excludedBy: row.excluded_by,
    excludedAt: row.excluded_at,
    restoredBy: row.restored_by || null,
    restoredAt: row.restored_at || null
  };
}

function normalizeExclusion(row) {
  return row && row.targetType ? row : mapExclusion(row || {});
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireDatabase(env) {
  if (!env.DB) throw new HttpError(503, "D1 binding DB is not configured");
}

function cleanString(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
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
    "access-control-allow-headers": "authorization, content-type, x-session-admin",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "vary": "origin"
  };
  if (origin) headers["access-control-allow-origin"] = origin;
  return headers;
}

function json(body, status = 200, sourceHeaders = null) {
  const headers = new Headers(sourceHeaders || {});
  headers.set("cache-control", "no-store");
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}
