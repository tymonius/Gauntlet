import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  SEMANTIC_GRADING_MODE,
  semanticCaseMap,
  semanticFailures,
  summarizeSemanticResults,
  validateSemanticBenchmark
} from "./v071-semantic-rules-qa-support.mjs";

const benchmarkPath = resolve(
  process.env.GAUNTLET_RULES_QA_BENCHMARK
  || "rules-assistant/evals/rules-arbiter-evals.v071.json"
);
const inputPath = resolve(
  process.env.GAUNTLET_RULES_QA_SEMANTIC_INPUT
  || process.env.GAUNTLET_RULES_QA_OUTPUT
  || "artifacts/rules-qa/v071-live-answer-run.json"
);
const outputPath = resolve(process.env.GAUNTLET_RULES_QA_SEMANTIC_OUTPUT || inputPath);
const requestTimeoutMs = Math.max(5000, Number(process.env.GAUNTLET_RULES_QA_TIMEOUT_MS) || 45000);
const maxAttempts = Math.max(1, Math.min(Number(process.env.GAUNTLET_RULES_QA_MAX_ATTEMPTS) || 4, 8));
const retryableStatuses = new Set([429, 502, 503, 504]);
const useGitHubActionsOidc = process.env.GAUNTLET_RULES_QA_USE_GITHUB_OIDC === "true";
const qaOidcAudience = "gauntlet-rules-assistant-live-qa";
let cachedQaOidcToken = null;
let cachedQaOidcExpiresAt = 0;

const benchmark = JSON.parse(readFileSync(benchmarkPath, "utf8"));
const report = JSON.parse(readFileSync(inputPath, "utf8"));

if (benchmark.gradingMode !== SEMANTIC_GRADING_MODE) {
  console.log(`Semantic QA: benchmark gradingMode is ${benchmark.gradingMode || "legacy"}; preserving legacy grading unchanged.`);
  if (report?.summary?.benchmarkStatus === "failed") process.exitCode = 1;
} else {
  const benchmarkFailures = validateSemanticBenchmark(benchmark);
  if (benchmarkFailures.length) {
    throw new Error(`Invalid semantic-v1 benchmark:\n- ${benchmarkFailures.join("\n- ")}`);
  }
  if (!Array.isArray(report?.results)) throw new Error("Semantic QA input report has no results array.");
  if (report.rulesVersion !== benchmark.rulesVersion) {
    throw new Error(`Semantic QA report version ${report.rulesVersion || "missing"} does not match benchmark ${benchmark.rulesVersion || "missing"}.`);
  }

  const casesById = semanticCaseMap(benchmark);
  const missingResultIds = [...casesById.keys()].filter((id) => !report.results.some((result) => result?.id === id));
  const unexpectedResultIds = report.results.map((result) => result?.id).filter((id) => !casesById.has(id));
  if (missingResultIds.length || unexpectedResultIds.length) {
    throw new Error([
      missingResultIds.length ? `Semantic QA report is missing benchmark cases: ${missingResultIds.join(", ")}` : null,
      unexpectedResultIds.length ? `Semantic QA report contains unexpected cases: ${unexpectedResultIds.join(", ")}` : null
    ].filter(Boolean).join("\n"));
  }

  const semanticEndpoint = process.env.GAUNTLET_RULES_QA_SEMANTIC_ENDPOINT
    || new URL("/api/qa/semantic-evaluate", report.endpoint).toString();

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
    if (!response.ok) throw new Error(`GitHub Actions OIDC token request failed with HTTP ${response.status}.`);
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

  async function requestAttempt(body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const headers = {
        "Content-Type": "application/json",
        "Origin": "https://gauntlet.run",
        "User-Agent": "Gauntlet-v0.7.1-semantic-live-QA"
      };
      const qaOidcToken = await getGitHubActionsQaOidcToken();
      if (qaOidcToken) headers["X-Gauntlet-QA-OIDC"] = qaOidcToken;
      const response = await fetch(semanticEndpoint, {
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

  async function evaluateCase(item, result, index) {
    const answer = String(result?.payload?.answer || "").trim();
    if (!answer) {
      return {
        evaluation: null,
        failures: ["infrastructure: semantic evaluation skipped because candidate answer is unavailable"]
      };
    }

    const body = {
      caseId: item.id,
      question: item.question,
      history: Array.isArray(item.history) ? item.history : [],
      answer,
      rulingStatus: String(result?.payload?.rulingStatus || ""),
      semanticCriteria: item.semanticCriteria,
      forbiddenSemanticClaims: item.forbiddenSemanticClaims || []
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
        const delayMs = status != null && status >= 500 ? 3000 * attempts : 1200 * attempts;
        console.log(`SEMANTIC RETRY ${String(index + 1).padStart(3, "0")}/${report.results.length} ${item.id} (${delayMs} ms)`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    if (!last?.response) {
      return {
        evaluation: null,
        failures: [`infrastructure: semantic evaluator request failed (${last?.error?.name || "request error"})`]
      };
    }
    if (!last.response.ok || !last.payload) {
      return {
        evaluation: last.payload,
        failures: [
          `infrastructure: semantic evaluator returned HTTP ${last.response.status}`,
          ...(!last.payload ? ["infrastructure: semantic evaluator response was not JSON"] : [])
        ]
      };
    }
    return {
      evaluation: last.payload,
      failures: semanticFailures(last.payload)
    };
  }

  const gradedResults = [];
  for (let index = 0; index < report.results.length; index += 1) {
    const result = report.results[index];
    const item = casesById.get(result.id);
    const semantic = await evaluateCase(item, result, index);
    const failures = [...(result.failures || []), ...semantic.failures];
    const graded = {
      ...result,
      semanticEvaluation: semantic.evaluation,
      failures
    };
    gradedResults.push(graded);
    console.log(`${failures.length ? "FAIL" : "PASS"} SEMANTIC ${String(index + 1).padStart(3, "0")}/${report.results.length} ${result.id}`);
    for (const failure of semantic.failures) console.log(`  - ${failure}`);
  }

  const failed = gradedResults.filter((result) => result.failures.length);
  const preSemanticSummary = report.summary || null;
  const semanticSummary = summarizeSemanticResults(gradedResults);
  const gradedReport = {
    ...report,
    schema: "gauntlet.rules-arbiter-live-qa.semantic.v1",
    legacyReportSchema: report.schema || null,
    gradingMode: SEMANTIC_GRADING_MODE,
    semanticEndpoint,
    semanticGradedAt: new Date().toISOString(),
    preSemanticSummary,
    summary: {
      total: gradedResults.length,
      passed: gradedResults.length - failed.length,
      failed: failed.length,
      passRate: gradedResults.length ? (gradedResults.length - failed.length) / gradedResults.length : 0,
      benchmarkStatus: failed.length ? "failed" : "passed",
      semantic: semanticSummary
    },
    results: gradedResults
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(gradedReport, null, 2) + "\n");
  console.log(`Semantic live QA: ${gradedReport.summary.passed}/${gradedReport.summary.total} passed.`);
  console.log(`Semantic verdicts: ${semanticSummary.pass} pass, ${semanticSummary.fail} fail, ${semanticSummary.review} review.`);
  console.log(`Report: ${outputPath}`);
  if (failed.length) process.exitCode = 1;
}
