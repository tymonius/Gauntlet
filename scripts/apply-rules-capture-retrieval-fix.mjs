import { readFileSync, writeFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, value) {
  writeFileSync(path, value);
}

function requireChange(condition, message) {
  if (!condition) throw new Error(message);
}

const localSearchPath = "rules-assistant/local-search.js";
let localSearch = read(localSearchPath);
if (!localSearch.includes('aliases: ["normal capture", "capture step", "front line", "occupation control"]')) {
  const start = localSearch.indexOf("const QUERY_PHRASE_ALIASES = [");
  const end = localSearch.indexOf("\n];", start);
  requireChange(start >= 0 && end > start, "Could not locate QUERY_PHRASE_ALIASES");
  const addition = `,\n  {\n    pattern: /\\b(?:capture|captured)\\b.*\\bterritor(?:y|ies)\\b|\\bterritor(?:y|ies)\\b.*\\b(?:capture|captured)\\b/i,\n    aliases: ["normal capture", "capture step", "front line", "occupation control"]\n  }`;
  localSearch = localSearch.slice(0, end) + addition + localSearch.slice(end);
  write(localSearchPath, localSearch);
}

const retrievalQaPath = "rules-assistant/v071-retrieval-qa.test.mjs";
let retrievalQa = read(retrievalQaPath);
if (!retrievalQa.includes("item.expectedTopSourcePatterns")) {
  const marker = "      if (item.expectedTopic) {";
  requireChange(retrievalQa.includes(marker), "Could not locate retrieval topic assertion");
  const block = `      if (Array.isArray(item.expectedTopSourcePatterns)) {\n        const topThree = haystacks.slice(0, 3);\n        for (const pattern of item.expectedTopSourcePatterns) {\n          const normalized = String(pattern).toLowerCase();\n          expect(\n            topThree.some((text) => text.includes(normalized)),\n            [\n              \`${"${item.id}"}: expected top-three source pattern "${"${pattern}"}" was not retrieved.\`,\n              \`Query: ${"${query}"}\`,\n              "Top three:",\n              ...sources.slice(0, 3).map((source, index) => \`  ${"${index + 1}"}. ${"${source.title}"} [${"${source.canonicalId || source.id}"}]\`)\n            ].join("\\n")\n          ).toBe(true);\n        }\n      }\n\n`;
  retrievalQa = retrievalQa.replace(marker, block + marker);
  write(retrievalQaPath, retrievalQa);
}

const benchmarkPath = "rules-assistant/evals/rules-arbiter-evals.v071.json";
const benchmark = JSON.parse(read(benchmarkPath));
const captureCase = benchmark.cases.find((item) => item.id === "core-capture");
requireChange(captureCase, "Could not locate core-capture benchmark case");
captureCase.expectedTopSourcePatterns = ["Normal Capture", "Front Line"];
write(benchmarkPath, `${JSON.stringify(benchmark, null, 2)}\n`);

const workerPath = "rules-assistant/worker-v071.js";
let worker = read(workerPath);
if (!worker.includes('BEHAVIOR_REVISION = "v071-qa-20260906-3"')) {
  const oldRevision = 'BEHAVIOR_REVISION = "v071-qa-20260906-2"';
  requireChange(worker.includes(oldRevision), "Unexpected current v0.7.1 behavior revision");
  worker = worker.replace(oldRevision, 'BEHAVIOR_REVISION = "v071-qa-20260906-3"');
  write(workerPath, worker);
}

const ledgerPath = "artifacts/rules-refinement/resolution-ledger.json";
const ledger = JSON.parse(read(ledgerPath));
const entryId = "occupied-territory-capture-retrieval-v071";
if (!ledger.entries.some((entry) => entry.id === entryId)) {
  const now = new Date().toISOString();
  ledger.updatedAt = now;
  ledger.entries.push({
    id: entryId,
    status: "resolved",
    rootCause: "retrieval",
    interactionIds: ["6d69603b-0299-4029-a325-b45014c8f901"],
    caseIds: ["core-capture"],
    resolutionSurface: "arbiter_retrieval",
    summary: "Promote the governing v0.7.1 Normal Capture and Front Line authority for Territory-capture questions and require those passages to appear in the top three retrieval results.",
    resolvedAt: now,
    binding: {
      behaviorRevision: "v071-qa-20260906-3"
    }
  });
  write(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
}
