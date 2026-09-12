import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  applyBenchmarkCorrections,
  classifyTransportInfrastructure,
  buildContinuityText,
  normalizeQaText,
  significantTopicTerms,
  sourceText,
  validateClassificationExpectations
} from "./v071-live-rules-qa-support.mjs";

const endpoint = process.env.GAUNTLET_RULES_QA_ENDPOINT
  || "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/rules";
const benchmarkPath = resolve("rules-assistant/evals/rules-arbiter-evals.v071.json");
const benchmarkCorrectionsPath = resolve("rules-assistant/evals/rules-arbiter-evals.v071-corrections.json");
const outputPath = resolve(process.env.GAUNTLET_RULES_QA_OUTPUT
  || "artifacts/rules-qa/v071-live-answer-run.json");
const concurrency = Math.max(1, Math.min(Number(process.env.GAUNTLET_RULES_QA_CONCURRENCY) || 1, 8));
const requestTimeoutMs = Math.max(5000, Number(process.env.GAUNTLET_RULES_QA_TIMEOUT_MS) || 45000);
const maxAttempts = Math.max(1, Math.min(Number(process.env.GAUNTLET_RULES_QA_MAX_ATTEMPTS) || 4, 8));
const interCaseDelayMs = Math.max(0, Number(process.env.GAUNTLET_RULES_QA_INTER_CASE_DELAY_MS) || 500);
const requestedCaseLimit = Number(process.env.GAUNTLET_RULES_QA_LIMIT);
const caseLimit = Number.isFinite(requestedCaseLimit) && requestedCaseLimit > 0
  ? Math.max(1, Math.floor(requestedCaseLimit))
  : null;
const retryableStatuses = new Set([429, 502, 503, 504]);
const workerResourceLimitBackoffMs = [15_000, 30_000, 60_000];
const useGitHubActionsOidc = process.env.GAUNTLET_RULES_QA_USE_GITHUB_OIDC === "true";
const qaOidcAudience = "gauntlet-rules-assistant-live-qa";
let cachedQaOidcToken = null;
let cachedQaOidcExpiresAt = 0;

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
  if (!requestUrl || !requestToken) {
    throw new Error("GitHub Actions OIDC was requested but id-token credentials are unavailable.");
  }

  const url = new URL(requestUrl);
  url.searchParams.set("audience", qaOidcAudience);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${requestToken}` },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`GitHub Actions OIDC token request failed with HTTP ${response.status}.`);
  }
  const payload = await response.json();
  const token = String(payload?.value || "").trim();
  const expiresAt = jwtExpiryMs(token);
  if (!token || expiresAt <= Date.now() + 30_000) {
    throw new Error("GitHub Actions returned an invalid or already-expiring QA OIDC token.");
  }
  cachedQaOidcToken = token;
  cachedQaOidcExpiresAt = expiresAt;
  return token;
}

const benchmarkBase = JSON.parse(readFileSync(benchmarkPath, "utf8"));
const benchmarkCorrections = JSON.parse(readFileSync(benchmarkCorrectionsPath, "utf8"));
const benchmark = applyBenchmarkCorrections(benchmarkBase, benchmarkCorrections);
const benchmarkValidationFailures = validateClassificationExpectations(benchmark);
if (benchmarkValidationFailures.length) {
  throw new Error("Invalid live QA benchmark:\n- " + benchmarkValidationFailures.join("\n- "));
}

function selectBenchmarkCases(cases, limit) {
  if (!limit) return cases;

  const byId = new Map(cases.map((item) => [item.id, item]));
  const selected = [];
  const seen = new Set();

  for (const id of Array.isArray(benchmark.smokeCaseIds) ? benchmark.smokeCaseIds : []) {
    const item = byId.get(id);
    if (!item || seen.has(id)) continue;
    selected.push(item);
    seen.add(id);
    if (selected.length >= limit) return selected;
  }

  for (const item of cases) {
    if (seen.has(item.id)) continue;
    selected.push(item);
    seen.add(item.id);
    if (selected.length >= limit) break;
  }

  return selected;
}

const benchmarkCases = selectBenchmarkCases(benchmark.cases, caseLimit);
const startedAt = new Date().toISOString();
const runStamp = Date.now().toString(36);

function inspectChiefJusticeVoice(answer) {
  const failures = [];
  const warnings = [];
  const text = String(answer || "").trim();

  if (!text) return { failures, warnings };

  if (/^\s*(?:sure|absolutely|certainly|basically|yep|yeah|okay)[,!.:\s-]/i.test(text)) {
    failures.push("voice: answer opens with canned or conspicuously modern conversational filler");
  }
  if (/\b(?:no problem|happy to help|great question|you(?:'|’)re right)\b/i.test(text)) {
    failures.push("voice: answer uses customer-service or chatbot-style conversational filler");
  }
  if (/\b(?:whereas|hereby|heretofore|henceforth|hear ye)\b/i.test(text)) {
    failures.push("voice: answer uses prohibited faux-legal or archaic language");
  }
  if (/\b(?:i am|i(?:'|’)m)\s+(?:the\s+)?chief justice\b/i.test(text) || /\blitigant\b/i.test(text)) {
    failures.push("voice: answer roleplays the Chief Justice or addresses the player as a litigant");
  }
  if (text.length > 1400) {
    warnings.push("voice: answer is unusually long for a table ruling");
  }

  return { failures, warnings };
}

function inspectAnswer(item, payload) {
  const failures = [];
  const warnings = [];
  const answer = String(payload?.answer || "");
  const normalizedAnswer = normalizeQaText(answer);
  const sources = Array.isArray(payload?.sources) ? payload.sources : [];
  const rulingStatus = String(payload?.rulingStatus || "");

  if (["local-budget-fallback", "local-source-lookup"].includes(payload?.executionPath)) {
    failures.push("infrastructure: production model path unavailable (" + payload.executionPath + ")");
  }

  if (payload?.version !== benchmark.rulesVersion) {
    failures.push("version: expected " + benchmark.rulesVersion + ", received " + (payload?.version || "missing"));
  }
  if (rulingStatus !== item.expectedClassification) {
    const basis = item.classificationBasis ? " (" + item.classificationBasis + ")" : "";
    failures.push("classification: expected " + item.expectedClassification + basis + ", received " + (rulingStatus || "missing"));
  }
  if (!answer.trim()) failures.push("answer: empty");

  if (/\*\*|__|\x60/.test(answer) || /^\s*#{1,6}\s/m.test(answer)) {
    failures.push("presentation: answer contains unsupported Markdown syntax");
  }
  if (["explicit", "inferred"].includes(rulingStatus) && /^\s*table ruling:/i.test(answer)) {
    failures.push('presentation: explicit/inferred answer uses the provisional-sounding "Table ruling" label');
  }
  if (["explicit", "inferred"].includes(rulingStatus) && /\b(?:supplied passages|supplied text|supplied sources|available passages?|available sources?|retrieved passages?|retrieved sources?)\b/i.test(answer)) {
    failures.push("presentation: written-rule answer exposes internal source/retrieval framing");
  }

  if (["explicit", "inferred"].includes(rulingStatus) && sources.length < 1) {
    failures.push("citations: written-rule answer has no selected source");
  }
  if (rulingStatus === "out_of_scope" && sources.length) {
    failures.push("citations: out-of-scope answer should not cite rules sources");
  }
  if (rulingStatus === "provisional" && !/^Provisional Arbiter Ruling:/i.test(answer)) {
    failures.push("presentation: provisional answer is not visibly labeled");
  }

  const haystacks = sources.map(sourceText);
  for (const pattern of item.expectedSourcePatterns || []) {
    const normalized = normalizeQaText(pattern);
    if (!haystacks.some((text) => text.includes(normalized))) {
      failures.push('citations: expected governing source pattern "' + pattern + '" not selected');
    }
  }

  for (const pattern of item.expectedAnswerPatterns || []) {
    const normalized = normalizeQaText(pattern);
    if (!normalizedAnswer.includes(normalized)) {
      failures.push('answer: expected pattern "' + pattern + '" was not present');
    }
  }

  for (const pattern of item.forbiddenAnswerPatterns || []) {
    const normalized = normalizeQaText(pattern);
    if (normalized && normalizedAnswer.includes(normalized)) {
      failures.push('answer: forbidden pattern "' + pattern + '" was present');
    }
  }

  if (item.expectedTopic) {
    const terms = significantTopicTerms(item.expectedTopic);
    const continuityText = buildContinuityText(answer, sources);
    if (terms.length && !terms.some((term) => continuityText.includes(term))) {
      failures.push('continuity: answer and selected sources do not appear to address expected topic "' + item.expectedTopic + '"');
    }
  }

  if (/\b(?:v0\.6\.[0-9]|battle hand|defender'?s advantage)\b/i.test(answer)) {
    warnings.push("terminology: answer may contain retired or older-edition language");
  }

  if (payload?.executionPath === "model") {
    const voice = inspectChiefJusticeVoice(answer);
    failures.push(...voice.failures);
    warnings.push(...voice.warnings);
  }

  return { failures, warnings };
}

async function requestAttempt(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const headers = {
      "Content-Type": "application/json",
      "Origin": "https://gauntlet.run",
      "User-Agent": "Gauntlet-v0.7.1-live-QA"
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
    try {
      payload = JSON.parse(responseText);
    } catch {
    }
    return { response, responseText, payload, error: null };
  } catch (error) {
    return { response: null, responseText: "", payload: null, error };
  } finally {
    clearTimeout(timeout);
  }
}

async function runInfrastructurePreflight() {
  const result = await postCase(benchmarkCases[0], 0);
  const modelPathFailure = result.failures.find((failure) => failure.startsWith("infrastructure:"));
  if (result.httpStatus === 200 && result.payload && !modelPathFailure) {
    return { failure: null, result };
  }

  return {
    failure: {
      httpStatus: result.httpStatus,
      errorCode: result.payload?.errorCode || null,
      upstreamStatus: Number.isInteger(result.payload?.upstreamStatus) ? result.payload.upstreamStatus : null,
      upstreamCategory: result.payload?.upstreamCategory || null,
      error: result.payload?.error || result.failures[0] || "Unknown production endpoint failure",
      rawResponse: result.payload ? null : result.rawResponse
    },
    result
  };
}

function isWorkerResourceLimitFailure(last) {
  if (last?.response?.status !== 503) return false;
  const details = [last?.responseText, last?.payload?.error, last?.payload?.errorCode]
    .filter(Boolean)
    .join(" ");
  return /worker exceeded resource limits|error\s*code:\s*1102/i.test(details);
}

function retryDelayMs(last, attempt) {
  const status = last?.response?.status || null;
  if (isWorkerResourceLimitFailure(last)) {
    return workerResourceLimitBackoffMs[Math.min(attempt - 1, workerResourceLimitBackoffMs.length - 1)];
  }
  return status != null && status >= 500 ? 3000 * attempt : 1200 * attempt;
}

async function postCase(item, index) {
  const sessionId = "qa_v071_" + String(index + 1).padStart(3, "0") + "_" + runStamp;
  const body = {
    question: item.question,
    history: Array.isArray(item.history) ? item.history : [],
    sessionId,
    rulesVersion: benchmark.rulesVersion
  };
  const begin = performance.now();
  let last = null;
  let attempts = 0;

  for (attempts = 1; attempts <= maxAttempts; attempts += 1) {
    last = await requestAttempt(body);
    const status = last.response?.status || null;
    const retryableError = last.error?.name === "AbortError"
      || last.error?.name === "TypeError";
    const retryableResponse = status != null && retryableStatuses.has(status);
    if (!retryableError && !retryableResponse) break;

    if (attempts < maxAttempts) {
      const delayMs = retryDelayMs(last, attempts);
      console.log(
        "RETRY " + String(index + 1).padStart(3, "0") + "/" + benchmarkCases.length
        + " " + item.id + " after "
        + (status ? "HTTP " + status : (last.error?.name || "request error"))
        + " (" + delayMs + " ms)"
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const attemptsUsed = Math.min(attempts, maxAttempts);
  const latencyMs = Math.round(performance.now() - begin);
  if (last?.response) {
    const transportFailures = [];
    if (!last.response.ok) transportFailures.push("http: " + last.response.status);
    if (!last.payload) transportFailures.push("http: response was not JSON");
    const infrastructureFailure = classifyTransportInfrastructure(last.response.status, last.responseText, last.payload);
    if (infrastructureFailure) transportFailures.push(infrastructureFailure);
    const inspected = last.payload ? inspectAnswer(item, last.payload) : { failures: [], warnings: [] };

    return {
      id: item.id,
      category: item.category,
      question: item.question,
      history: item.history || [],
      expectedClassification: item.expectedClassification,
      classificationBasis: item.classificationBasis || null,
      expectedSourcePatterns: item.expectedSourcePatterns || [],
      expectedAnswerPatterns: item.expectedAnswerPatterns || [],
      forbiddenAnswerPatterns: item.forbiddenAnswerPatterns || [],
      expectedTopic: item.expectedTopic || null,
      sessionId,
      attempts: attemptsUsed,
      httpStatus: last.response.status,
      latencyMs,
      payload: last.payload,
      rawResponse: last.payload ? null : last.responseText.slice(0, 4000),
      failures: [...transportFailures, ...inspected.failures],
      warnings: inspected.warnings
    };
  }

  const error = last?.error;
  return {
    id: item.id,
    category: item.category,
    question: item.question,
    history: item.history || [],
    expectedClassification: item.expectedClassification,
    classificationBasis: item.classificationBasis || null,
    expectedSourcePatterns: item.expectedSourcePatterns || [],
    expectedAnswerPatterns: item.expectedAnswerPatterns || [],
    forbiddenAnswerPatterns: item.forbiddenAnswerPatterns || [],
    expectedTopic: item.expectedTopic || null,
    sessionId,
    attempts: attemptsUsed,
    httpStatus: null,
    latencyMs,
    payload: null,
    rawResponse: null,
    failures: ["request: " + (error?.name || "Error") + ": " + (error?.message || String(error))],
    warnings: []
  };
}

async function runPool(items, startIndex = 0) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      const absoluteIndex = startIndex + index;
      results[index] = await postCase(items[index], absoluteIndex);
      const status = results[index].failures.length ? "FAIL" : "PASS";
      console.log(status + " " + String(absoluteIndex + 1).padStart(3, "0") + "/" + benchmarkCases.length + " " + items[index].id + " (" + results[index].latencyMs + " ms)");
      for (const failure of results[index].failures) console.log("  - " + failure);
      if (interCaseDelayMs > 0 && next < items.length) {
        await new Promise((resolve) => setTimeout(resolve, interCaseDelayMs));
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

const preflight = await runInfrastructurePreflight();
const infrastructureFailure = preflight.failure;
if (infrastructureFailure) {
  const report = {
    schema: "gauntlet.rules-arbiter-live-qa.v1",
    rulesVersion: benchmark.rulesVersion,
    benchmarkCorrections: benchmarkCorrections.cases.map((item) => item.id),
    endpoint,
    startedAt,
    completedAt: new Date().toISOString(),
    concurrency,
    maxAttempts,
    interCaseDelayMs,
    infrastructureFailure,
    summary: {
      total: benchmarkCases.length,
      attempted: 1,
      passed: 0,
      failed: 0,
      warned: 0,
      passRate: null,
      benchmarkStatus: "not_run",
      classifications: {}
    },
    results: [preflight.result]
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
  console.error(
    "\nLive Rules Arbiter QA benchmark was not run because the production endpoint failed preflight."
    + "\nHTTP status: " + (infrastructureFailure.httpStatus ?? "none")
    + "\nError code: " + (infrastructureFailure.errorCode || "unavailable")
    + "\nUpstream status: " + (infrastructureFailure.upstreamStatus ?? "unavailable")
    + "\nUpstream category: " + (infrastructureFailure.upstreamCategory || "unavailable")
    + "\nError: " + infrastructureFailure.error
  );
  console.log("Report: " + outputPath);
  process.exit(1);
}

const remainingResults = benchmarkCases.length > 1
  ? await runPool(benchmarkCases.slice(1), 1)
  : [];
const results = [preflight.result, ...remainingResults];
const failed = results.filter((item) => item.failures.length);
const warned = results.filter((item) => item.warnings.length);
const voiceFailed = results.filter((item) => item.failures.some((failure) => failure.startsWith("voice:")));
const voiceWarned = results.filter((item) => item.warnings.some((warning) => warning.startsWith("voice:")));
const classifications = {};
for (const item of results) {
  const actual = item.payload?.rulingStatus || "no_response";
  classifications[actual] = (classifications[actual] || 0) + 1;
}
const benchmarkInfrastructureFailures = results.filter((item) =>
  item.failures.some((failure) => failure.startsWith("infrastructure:"))
);
const benchmarkInfrastructureFailure = benchmarkInfrastructureFailures.length
  ? {
      affectedCases: benchmarkInfrastructureFailures.length,
      firstCaseId: benchmarkInfrastructureFailures[0].id,
      error: benchmarkInfrastructureFailures[0].failures.find((failure) => failure.startsWith("infrastructure:"))
    }
  : null;

const report = {
  schema: "gauntlet.rules-arbiter-live-qa.v1",
  rulesVersion: benchmark.rulesVersion,
  benchmarkCaseCount: benchmark.cases.length,
  benchmarkCorrections: benchmarkCorrections.cases.map((item) => item.id),
  executedCaseCount: benchmarkCases.length,
  executedCaseIds: benchmarkCases.map((item) => item.id),
  endpoint,
  startedAt,
  completedAt: new Date().toISOString(),
  concurrency,
  maxAttempts,
  interCaseDelayMs,
  infrastructureFailure: benchmarkInfrastructureFailure,
  summary: {
    benchmarkStatus: benchmarkInfrastructureFailure ? "invalid_infrastructure" : (failed.length ? "failed" : "passed"),
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    warned: warned.length,
    passRate: results.length ? (results.length - failed.length) / results.length : 0,
    classifications,
    voice: {
      failedCases: voiceFailed.length,
      warnedCases: voiceWarned.length
    }
  },
  results
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log("\nLive Rules Arbiter QA: " + report.summary.passed + "/" + report.summary.total + " passed.");
console.log("Report: " + outputPath);
if (failed.length) process.exitCode = 1;
