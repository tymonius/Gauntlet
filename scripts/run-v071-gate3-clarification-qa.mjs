import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const endpoint = process.env.GAUNTLET_RULES_QA_ENDPOINT
  || "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/rules";
const benchmarkPath = resolve(
  process.env.GAUNTLET_RULES_CLARIFICATION_BENCHMARK
  || "rules-assistant/evals/rules-arbiter-gate3-blind-a-clarifications.v071.json"
);
const outputPath = resolve(
  process.env.GAUNTLET_RULES_CLARIFICATION_OUTPUT
  || "artifacts/rules-qa/v071-gate3-blind-a-clarifications.json"
);
const requestTimeoutMs = Math.max(5000, Number(process.env.GAUNTLET_RULES_QA_TIMEOUT_MS) || 45000);
const maxAttempts = Math.max(1, Math.min(Number(process.env.GAUNTLET_RULES_QA_MAX_ATTEMPTS) || 4, 8));
const retryableStatuses = new Set([429, 502, 503, 504]);
const useGitHubActionsOidc = process.env.GAUNTLET_RULES_QA_USE_GITHUB_OIDC === "true";
const qaOidcAudience = "gauntlet-rules-assistant-live-qa";
let cachedQaOidcToken = null;
let cachedQaOidcExpiresAt = 0;

const benchmark = JSON.parse(readFileSync(benchmarkPath, "utf8"));
if (benchmark.rulesVersion !== "v0.7.1") throw new Error("Gate 3 clarification benchmark must target v0.7.1.");
if (!Array.isArray(benchmark.cases) || benchmark.cases.length < 1) throw new Error("Gate 3 clarification benchmark has no cases.");

function jwtExpiryMs(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString("utf8"));
    return Number(payload?.exp || 0) * 1000;
  } catch {
    return 0;
  }
}

async function getGitHubActionsQaOidcToken() {
  if (!useGitHubActionsOidc) return null;
  if (cachedQaOidcToken && cachedQaOidcExpiresAt > Date.now() + 60_000) return cachedQaOidcToken;
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) throw new Error("GitHub Actions OIDC credentials are unavailable.");

  const url = new URL(requestUrl);
  url.searchParams.set("audience", qaOidcAudience);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${requestToken}` },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`GitHub Actions OIDC token request failed with HTTP ${response.status}.`);
  const payload = await response.json();
  const token = String(payload?.value || "").trim();
  const expiresAt = jwtExpiryMs(token);
  if (!token || expiresAt <= Date.now() + 30_000) throw new Error("GitHub Actions returned an invalid QA OIDC token.");
  cachedQaOidcToken = token;
  cachedQaOidcExpiresAt = expiresAt;
  return token;
}

async function requestAttempt(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const headers = {
      "Content-Type": "application/json",
      "Origin": "https://gauntlet.run",
      "User-Agent": "Gauntlet-v0.7.1-Gate3-blind-clarification-QA"
    };
    const qaOidcToken = await getGitHubActionsQaOidcToken();
    if (qaOidcToken) headers["X-Gauntlet-QA-OIDC"] = qaOidcToken;
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const responseText = await response.text();
    let payload = null;
    try { payload = JSON.parse(responseText); } catch {}
    return { response, responseText, payload, error: null };
  } catch (error) {
    return { response: null, responseText: "", payload: null, error };
  } finally {
    clearTimeout(timeout);
  }
}

async function runCase(item, index) {
  const sessionId = `gate3_clarify_${String(index + 1).padStart(2, "0")}_${Date.now().toString(36)}`;
  const body = {
    question: item.question,
    history: Array.isArray(item.history) ? item.history : [],
    sessionId,
    rulesVersion: benchmark.rulesVersion
  };

  let last = null;
  let attempts = 0;
  for (attempts = 1; attempts <= maxAttempts; attempts += 1) {
    last = await requestAttempt(body);
    const status = last.response?.status || null;
    const retryableError = last.error?.name === "AbortError" || last.error?.name === "TypeError";
    const retryableResponse = status != null && retryableStatuses.has(status);
    if (!retryableError && !retryableResponse) break;
    if (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, status && status >= 500 ? 3000 * attempts : 1200 * attempts));
    }
  }

  const failures = [];
  const payload = last?.payload;
  const httpStatus = last?.response?.status || null;
  if (httpStatus !== 200) failures.push(`http: expected 200, received ${httpStatus ?? "none"}`);
  if (!payload) failures.push("http: response was not JSON");
  if (payload) {
    if (payload.version !== benchmark.rulesVersion) failures.push(`version: expected ${benchmark.rulesVersion}, received ${payload.version || "missing"}`);
    if (payload.behaviorRevision !== benchmark.behaviorRevision) {
      failures.push(`behavior: expected ${benchmark.behaviorRevision}, received ${payload.behaviorRevision || "missing"}`);
    }
    if (payload.responseType !== "clarification") failures.push(`responseType: expected clarification, received ${payload.responseType || "missing"}`);
    if (payload.rulingStatus !== "unresolved") failures.push(`rulingStatus: expected unresolved, received ${payload.rulingStatus || "missing"}`);
    if (payload.executionPath !== "deterministic-clarification") {
      failures.push(`executionPath: expected deterministic-clarification, received ${payload.executionPath || "missing"}`);
    }
    if (Array.isArray(payload.sources) && payload.sources.length) failures.push("citations: clarification should not cite rules sources");
    if (!String(payload.answer || "").trim()) failures.push("answer: clarification is empty");
    if (String(payload.answer || "").length > 700) failures.push("answer: clarification is too long for table use");
  }

  return {
    id: item.id,
    question: item.question,
    history: item.history || [],
    sessionId,
    attempts: Math.min(attempts, maxAttempts),
    httpStatus,
    payload,
    rawResponse: payload ? null : String(last?.responseText || "").slice(0, 4000),
    failures
  };
}

const startedAt = new Date().toISOString();
const results = [];
for (let index = 0; index < benchmark.cases.length; index += 1) {
  const result = await runCase(benchmark.cases[index], index);
  results.push(result);
  console.log(`${result.failures.length ? "FAIL" : "PASS"} ${String(index + 1).padStart(2, "0")}/${benchmark.cases.length} ${result.id}`);
  for (const failure of result.failures) console.log(`  - ${failure}`);
}

const failed = results.filter((item) => item.failures.length);
const report = {
  schema: "gauntlet.rules-arbiter-gate3-clarification-live-qa.v1",
  rulesVersion: benchmark.rulesVersion,
  tranche: benchmark.tranche,
  behaviorRevision: benchmark.behaviorRevision,
  authoritySetId: benchmark.authoritySetId,
  endpoint,
  startedAt,
  completedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    benchmarkStatus: failed.length ? "failed" : "passed"
  },
  results
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log(`Gate 3 clarification QA: ${report.summary.passed}/${report.summary.total} passed.`);
console.log(`Report: ${outputPath}`);
if (failed.length) process.exitCode = 1;
