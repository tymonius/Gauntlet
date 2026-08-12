import legacyStack from "./completeness.js";

const CURRENT_RULES_VERSION = "v0.6.3";
const CURRENT_SERIAL_PREFIX = "G063";
const LEGACY_ENGINE_VERSION = "v0.6.1";
const LEGACY_SERIAL_PREFIX = "G061";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      const response = await legacyStack.fetch(request, env);
      return response.ok ? rewriteResponse(response) : response;
    }

    const creationMode = isCreationRequest(url.pathname, request.method);
    if (!creationMode) return legacyStack.fetch(request, env);

    let forwarded = request;
    if (url.pathname === "/api/sessions" && request.method === "POST") {
      const parsed = await readBody(request);
      if (!parsed.ok) return json({ error: "Invalid JSON request body" }, 400, request);
      const supplied = String(parsed.body.rulesVersion || CURRENT_RULES_VERSION).trim();
      if (supplied !== CURRENT_RULES_VERSION) {
        return json({ error: `This service creates ${CURRENT_RULES_VERSION} sessions only.` }, 400, request);
      }
      parsed.body.rulesVersion = LEGACY_ENGINE_VERSION;
      forwarded = requestWithJson(request, parsed.body);
    }

    const currentEnv = env?.DB ? { ...env, DB: currentCreationDatabase(env.DB) } : env;
    const response = await legacyStack.fetch(forwarded, currentEnv);
    return response.ok ? rewriteResponse(response) : response;
  }
};

function isCreationRequest(pathname, method) {
  if (method !== "POST") return false;
  return pathname === "/api/sessions"
    || /^\/api\/sessions\/[^/]+\/games$/.test(pathname)
    || pathname === "/api/tracked-games"
    || pathname === "/api/standalone-feedback";
}

async function readBody(request) {
  try {
    const text = await request.clone().text();
    return { ok: true, body: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: false, body: {} };
  }
}

function requestWithJson(request, body) {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body)
  });
}

function currentCreationDatabase(db) {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop !== "prepare") return Reflect.get(target, prop, receiver);
      return (sql) => wrapStatement(target.prepare(sql));
    }
  });
}

function wrapStatement(statement) {
  return new Proxy(statement, {
    get(target, prop, receiver) {
      if (prop !== "bind") return Reflect.get(target, prop, receiver);
      return (...values) => wrapBoundStatement(target.bind(...values.map(transformBoundValue)));
    }
  });
}

function wrapBoundStatement(statement) {
  return new Proxy(statement, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
}

function transformBoundValue(value) {
  if (typeof value !== "string") return value;
  return value
    .replaceAll(LEGACY_ENGINE_VERSION, CURRENT_RULES_VERSION)
    .replaceAll(`${LEGACY_SERIAL_PREFIX}-`, `${CURRENT_SERIAL_PREFIX}-`);
}

async function rewriteResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return response;
  const text = await response.text();
  const rewritten = text
    .replaceAll(LEGACY_ENGINE_VERSION, CURRENT_RULES_VERSION)
    .replaceAll(`${LEGACY_SERIAL_PREFIX}-`, `${CURRENT_SERIAL_PREFIX}-`);
  const headers = new Headers(response.headers);
  headers.set("content-length", String(new TextEncoder().encode(rewritten).byteLength));
  return new Response(rewritten, { status: response.status, statusText: response.statusText, headers });
}

function json(payload, status, request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

export const CURRENT_PLAYTEST_RULES_VERSION = CURRENT_RULES_VERSION;
export const CURRENT_PLAYTEST_SERIAL_PREFIX = CURRENT_SERIAL_PREFIX;
