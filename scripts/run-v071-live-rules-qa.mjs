import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const endpoint = process.env.GAUNTLET_RULES_QA_ENDPOINT
  || "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/rules";
const benchmarkPath = resolve("rules-assistant/evals/rules-arbiter-evals.v071.json");
const outputPath = resolve(process.env.GAUNTLET_RULES_QA_OUTPUT
  || "artifacts/rules-qa/v071-live-answer-run.json");
const concurrency = Math.max(1, Math.min(Number(process.env.GAUNTLET_RULES_QA_CONCURRENCY) || 4, 8));
const requestTimeoutMs = Math.max(5000, Number(process.env.GAUNTLET_RULES_QA_TIMEOUT_MS) || 45000);

const benchmark = JSON.parse(readFileSync(benchmarkPath, "utf8"));
const startedAt = new Date().toISOString();
const runStamp = Date.now().toString(36);

function sourceText(source) {
  return [
    source?.title,
    source?.excerpt,
    source?.sourcePath,
    source?.canonicalId,
    source?.id
  ].filter(Boolean).join("\n").toLowerCase();
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
    const normalized = String(pattern).toLowerCase();
    if (!haystacks.some((text) => text.includes(normalized))) {
      failures.push('citations: expected governing source pattern "' + pattern + '" not selected');
    }
  }

  if (item.expectedTopic) {
    const terms = significantTopicTerms(item.expectedTopic);
    const lowerAnswer = answer.toLowerCase();
    if (terms.length && !terms.some((term) => lowerAnswer.includes(term))) {
      failures.push('continuity: answer does not appear to address expected topic "' + item.expectedTopic + '"');
    }
  }

  if (/\b(?:v0\.6\.[0-9]|battle hand|defender'?s advantage)\b/i.test(answer)) {
    warnings.push("terminology: answer may contain retired or older-edition language");
  }

  return { failures, warnings };
}

async function postCase(item, index) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const sessionId = "qa_v071_" + String(index + 1).padStart(3, "0") + "_" + runStamp;
  const body = {
    question: item.question,
    history: Array.isArray(item.history) ? item.history : [],
    sessionId,
    rulesVersion: benchmark.rulesVersion
  };
  const begin = performance.now();

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

    const latencyMs = Math.round(performance.now() - begin);
    const transportFailures = [];
    if (!response.ok) transportFailures.push("http: " + response.status);
    if (!payload) transportFailures.push("http: response was not JSON");
    const inspected = payload ? inspectAnswer(item, payload) : { failures: [], warnings: [] };

    return {
      id: item.id,
      category: item.category,
      question: item.question,
      history: item.history || [],
      expectedClassification: item.expectedClassification,
      expectedSourcePatterns: item.expectedSourcePatterns || [],
      expectedTopic: item.expectedTopic || null,
      sessionId,
      httpStatus: response.status,
      latencyMs,
      payload,
      rawResponse: payload ? null : responseText.slice(0, 4000),
      failures: [...transportFailures, ...inspected.failures],
      warnings: inspected.warnings
    };
  } catch (error) {
    return {
      id: item.id,
      category: item.category,
      question: item.question,
      history: item.history || [],
      expectedClassification: item.expectedClassification,
      expectedSourcePatterns: item.expectedSourcePatterns || [],
      expectedTopic: item.expectedTopic || null,
      sessionId,
      httpStatus: null,
      latencyMs: Math.round(performance.now() - begin),
      payload: null,
      rawResponse: null,
      failures: ["request: " + (error?.name || "Error") + ": " + (error?.message || String(error))],
      warnings: []
    };
  } finally {
    clearTimeout(timeout);
  }
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
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

const results = await runPool(benchmark.cases);
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
  endpoint,
  startedAt,
  completedAt: new Date().toISOString(),
  concurrency,
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
