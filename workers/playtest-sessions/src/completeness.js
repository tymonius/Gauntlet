import closureWorker from "./closure.js";

const FIRST_PLAYER_VALUES = new Set(["self", "opponent", "unknown"]);
const VICTORY_ROUTE_VALUES = new Set([
  "run_the_gauntlet",
  "faction_victory",
  "concession",
  "other",
  "unknown"
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      const base = await closureWorker.fetch(request, env);
      if (!base.ok) return base;
      const payload = await base.json();
      return json({ ...payload, completeStandaloneContextSupported: true }, 200, base.headers);
    }

    if (url.pathname !== "/api/standalone-feedback" || request.method !== "POST") {
      return closureWorker.fetch(request, env);
    }

    let body;
    try {
      body = await request.clone().json();
    } catch {
      return closureWorker.fetch(request, env);
    }

    const additionalContext = normalizeAdditionalContext(body?.context);
    const forwarded = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body)
    });
    const response = await closureWorker.fetch(forwarded, env);
    if (!response.ok || !env?.DB) return response;

    try {
      const payload = await response.clone().json();
      const receipt = cleanString(payload?.receipt, 80);
      if (!receipt) return response;

      const row = await env.DB.prepare(
        `SELECT id, metadata_json
           FROM playtest_sessions
          WHERE sheet_serial = ? AND session_kind = 'game'
          ORDER BY created_at DESC
          LIMIT 1`
      ).bind(receipt).first();
      if (!row?.id) return response;

      const metadata = parseJsonObject(row.metadata_json);
      metadata.standaloneContext = {
        ...(metadata.standaloneContext && typeof metadata.standaloneContext === "object"
          ? metadata.standaloneContext
          : {}),
        ...additionalContext
      };
      await env.DB.prepare(
        "UPDATE playtest_sessions SET metadata_json = ? WHERE id = ?"
      ).bind(JSON.stringify(metadata), row.id).run();
    } catch (error) {
      console.error("standalone-feedback-completeness", error);
    }

    return response;
  }
};

function normalizeAdditionalContext(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const completionStatus = cleanString(input.completionStatus, 24).toLowerCase();
  const firstPlayerPerspective = cleanString(input.firstPlayerPerspective, 24).toLowerCase();
  const requestedVictoryRoute = cleanString(input.victoryRoute, 40).toLowerCase();

  return {
    firstPlayerPerspective: FIRST_PLAYER_VALUES.has(firstPlayerPerspective)
      ? firstPlayerPerspective
      : "unknown",
    victoryRoute: completionStatus === "completed" && VICTORY_ROUTE_VALUES.has(requestedVictoryRoute)
      ? requestedVictoryRoute
      : null,
    battles: optionalInteger(input.battles, 0, 200),
    stopReason: completionStatus === "stopped"
      ? cleanString(input.stopReason, 300) || null
      : null
  };
}

function optionalInteger(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function cleanString(value, maxLength) {
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

function json(payload, status = 200, sourceHeaders = null) {
  const headers = sourceHeaders ? new Headers(sourceHeaders) : new Headers();
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload), { status, headers });
}
