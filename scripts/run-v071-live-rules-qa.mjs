import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const endpoint = process.env.GAUNTLET_RULES_QA_ENDPOINT
  || "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/rules";
const benchmarkPath = resolve("rules-assistant/evals/rules-arbiter-evals.v071.json");
const outputPath = resolve(process.env.GAUNTLET_RULES_QA_OUTPUT
  || "artifacts/rules-qa/v071-live-answer-run.json");
const concurrency = Math.max(1, Math.min(Number(process.env.GAUNTLET_RULES_QA_CONCURRENCY) || 1, 8));
const requestTimeoutMs = Math.max(5000, Number(process.env.GAUNTLET_RULES_QA_TIMEOUT_MS) || 45000);
const maxAttempts = Math.max(1, Math.min(Number(process.env.GAUNTLET_RULES_QA_MAX_ATTEMPTS) || 2, 8));
const interCaseDelayMs = Math.max(0, Number(process.env.GAUNTLET_RULES_QA_INTER_CASE_DELAY_MS) || 500);
const requestedCaseLimit = Number(process.env.GAUNTLET_RULES_QA_LIMIT);
const caseLimit = Number.isFinite(requestedCaseLimit) && requestedCaseLimit > 0
  ? Math.max(1, Math.floor(requestedCaseLimit))
  : null;
const retryableStatuses = new Set([429, 502, 503, 504]);

const benchmark = JSON.parse(readFileSync(benchmarkPath, "utf8"));
const benchmarkCases = caseLimit ? benchmark.cases.slice(0, caseLimit) : benchmark.cases;
const startedAt = new Date().toISOString();
const runStamp = Date.now().toString(36);

function normalizeQaText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function sourceText(source) {
  return normalizeQaText([
    source?.title,
    source?.excerpt,
    source?.sourcePath,
    source?.canonicalId,
    source?.id
  ].filter(Boolean).join("\n"));
}

function significantTopicTerms(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !["the", "and", "that", "this", "does", "work"].includes(term));
}

function inspectAnswer(item, payload) {
  const failures = [];
  const warnings = [];
  const answer = String(payload?.answer || "");
  const normalizedAnswer = normalizeQaText(answer);
  const sources = Array.isArray(payload?.sources) ? payload.sources : [];
  const rulingStatus = String(payload?.rulingStatus || "");

  if (payload?.version !== benchmark.rulesVersion) {
    failures.push("version: expected " + benchmark.rulesVersion + ", received " + (payload?.version || "missing"));
  }
  if (rulingStatus !== item.expectedClassification) {
    failures.push("classification: expected " + item.expectedClassification + ", received " + (rulingStatus || "missing"));
  }
  if (!answer.trim()) failures.push("answer: empty");

  if (/\*\*|__|\x60/.test(answer) || /^\s*#{1,6}\s/m.test(answer)) {
    failures.push("presentation: answer contains unsupported Markdown syntax");
  }
  if (["explicit", "inferred"].includes(rulingStatus) && /^\s*table ruling:/i.test(answer)) {
    failures.push('presentation: explicit/inferred answer uses the provisional-sounding "Table ruling" label');
  }
  if (["explicit", "inferred"].includes(rulingStatus) && /\b(?:supplied passages|supplied text|supplied sources)\b/i.test(answer)) {
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
    const continuityText = normalizeQaText(answer + "\n" + sources.map((source) => source?.title || "").join("\n"));
    if (terms.length && !terms.some((term) => continuityText.includes(term))) {
      failures.push('continuity: answer and selected sources do not appear to address expected topic "' + item.expectedTopic + '"');
    }
  }

  if (/\b(?:v0\.6\.[0-9]|battle hand|defender'?s advantage)\b/i.test(answer)) {
    warnings.push("terminology: answer may contain retired or older-edition language");
  }

  return { failures, warnings };
}

async function requestAttempt(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://gauntlet.run",
        "User-Agent": "Gauntlet-v0.7.1-live-QA"
      },
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
  const item = benchmarkCases[0];
  const body = {
    question: item.question,
    history: Array.isArray(item.history) ? item.history : [],
    sessionId: "qa_v071_preflight_" + runStamp,
    rulesVersion: benchmark.rulesVersion
  };

  let last = null;
  const attempts = Math.min(maxAttempts, 3);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await requestAttempt(body);
    if (last.response?.ok && last.payload) return null;

    if (attempt < attempts) {
      const delayMs = 2000 * attempt;
      console.log(
        "PREFLIGHT RETRY " + attempt + "/" + attempts + " after "
        + (last.response?.status ? "HTTP " + last.response.status : (last.error?.name || "request error"))
        + " (" + delayMs + " ms)"
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    httpStatus: last?.response?.status || null,
    errorCode: last?.payload?.errorCode || null,
    upstreamStatus: Number.isInteger(last?.payload?.upstreamStatus) ? last.payload.upstreamStatus : null,
    upstreamCategory: last?.payload?.upstreamCategory || null,
    error: last?.payload?.error || last?.error?.message || "Unknown production endpoint failure",
    rawResponse: last?.payload ? null : String(last?.responseText || "").slice(0, 4000)
  };
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
      const delayMs = 1200 * attempts;
      console.log(
        "RETRY " + String(index + 1).padStart(3, "0") + "/" + benchmarkCases.length
        + " " + item.id + " after "
        + (status ? "HTTP " + status : (last.error?.name || "request error"))
        + " (" + delayMs + " ms)"
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const latencyMs = Math.round(performance.now() - begin);
  if (last?.response) {
    const transportFailures = [];
    if (!last.response.ok) transportFailures.push("http: " + last.response.status);
    if (!last.payload) transportFailures.push("http: response was not JSON");
    const inspected = last.payload ? inspectAnswer(item, last.payload) : { failures: [], warnings: [] };

    return {
      id: item.id,
      category: item.category,
      question: item.question,
      history: item.history || [],
      expectedClassification: item.expectedClassification,
      expectedSourcePatterns: item.expectedSourcePatterns || [],
      expectedAnswerPatterns: item.expectedAnswerPatterns || [],
      forbiddenAnswerPatterns: item.forbiddenAnswerPatterns || [],
      expectedTopic: item.expectedTopic || null,
      sessionId,
      attempts,
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
    expectedSourcePatterns: item.expectedSourcePatterns || [],
    expectedAnswerPatterns: item.expectedAnswerPatterns || [],
    forbiddenAnswerPatterns: item.forbiddenAnswerPatterns || [],
    expectedTopic: item.expectedTopic || null,
    sessionId,
    attempts,
    httpStatus: null,
    latencyMs,
    payload: null,
    rawResponse: null,
    failures: ["request: " + (error?.name || "Error") + ": " + (error?.message || String(error))],
    warnings: []
  };
}

async function runPool(items) {
  const results = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await postCase(items[index], index);
      const status = results[index].failures.length ? "FAIL" : "PASS";
      console.log(status + " " + String(index + 1).padStart(3, "0") + "/" + items.length + " " + items[index].id + " (" + results[index].latencyMs + " ms)");
      for (const failure of results[index].failures) console.log("  - " + failure);
      if (interCaseDelayMs > 0 && next < items.length) {
        await new Promise((resolve) => setTimeout(resolve, interCaseDelayMs));
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

const infrastructureFailure = await runInfrastructurePreflight();
if (infrastructureFailure) {
  const report = {
    schema: "gauntlet.rules-arbiter-live-qa.v1",
    rulesVersion: benchmark.rulesVersion,
    endpoint,
    startedAt,
    completedAt: new Date().toISOString(),
    concurrency,
    maxAttempts,
    interCaseDelayMs,
    infrastructureFailure,
    summary: {
      total: benchmarkCases.length,
      attempted: 0,
      passed: 0,
      failed: 0,
      warned: 0,
      passRate: null,
      benchmarkStatus: "not_run",
      classifications: {}
    },
    results: []
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

const results = await runPool(benchmarkCases);
const failed = results.filter((item) => item.failures.length);
const warned = results.filter((item) => item.warnings.length);
const classifications = {};
for (const item of results) {
  const actual = item.payload?.rulingStatus || "no_response";
  classifications[actual] = (classifications[actual] || 0) + 1;
}

const report = {
  schema: "gauntlet.rules-arbiter-live-qa.v1",
  rulesVersion: benchmark.rulesVersion,
  benchmarkCaseCount: benchmark.cases.length,
  executedCaseCount: benchmarkCases.length,
  endpoint,
  startedAt,
  completedAt: new Date().toISOString(),
  concurrency,
  maxAttempts,
  interCaseDelayMs,
  infrastructureFailure: null,
  summary: {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    warned: warned.length,
    passRate: results.length ? (results.length - failed.length) / results.length : 0,
    classifications
  },
  results
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log("\nLive Rules Arbiter QA: " + report.summary.passed + "/" + report.summary.total + " passed.");
console.log("Report: " + outputPath);
if (failed.length) process.exitCode = 1;
