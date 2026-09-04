import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DEFAULT_BENCHMARK = "rules-assistant/evals/rules-arbiter-evals.v071.json";
const ALLOWED_CLASSIFICATIONS = new Set(["explicit", "inferred", "provisional", "out_of_scope"]);

export function mergeRegressionCandidates(benchmark, bundle) {
  if (!benchmark || benchmark.schema !== "gauntlet.rules-arbiter-evals.v2" || !Array.isArray(benchmark.cases)) {
    throw new Error("Benchmark must be a gauntlet.rules-arbiter-evals.v2 object.");
  }
  if (!bundle || bundle.schema !== "gauntlet.rules-regression-candidates.v1" || !Array.isArray(bundle.candidates)) {
    throw new Error("Candidate file must use gauntlet.rules-regression-candidates.v1.");
  }

  const existingIds = new Set(benchmark.cases.map((item) => String(item.id || "")));
  const existingInteractionIds = new Set(
    benchmark.cases.map((item) => String(item.interactionId || "")).filter(Boolean)
  );
  const added = [];
  const skipped = [];
  const manual = [];

  for (const candidate of bundle.candidates) {
    const interactionId = String(candidate?.interactionId || "").trim();
    if (!interactionId) {
      manual.push({ interactionId: "", reason: "missing interactionId" });
      continue;
    }
    if (existingInteractionIds.has(interactionId)) {
      skipped.push({ interactionId, reason: "already represented in benchmark" });
      continue;
    }

    const fixture = candidate?.suggestedFixture;
    if (!candidate?.fixtureReadiness?.ready || !fixture) {
      manual.push({
        interactionId,
        reason: (candidate?.fixtureReadiness?.missing || ["fixture not ready"]).join(", ")
      });
      continue;
    }

    const normalized = {
      id: String(fixture.id || `review-${interactionId.slice(0, 8)}`).trim(),
      category: String(fixture.category || "live-regression").trim(),
      question: String(fixture.question || candidate.question || "").trim(),
      expectedClassification: String(fixture.expectedClassification || "").trim(),
      expectedSourcePatterns: Array.isArray(fixture.expectedSourcePatterns)
        ? [...new Set(fixture.expectedSourcePatterns.map(String).map((value) => value.trim()).filter(Boolean))]
        : [],
      interactionId,
      origin: String(fixture.origin || "review-audit-regression-candidate").trim()
    };

    if (Array.isArray(fixture.history) && fixture.history.length) {
      normalized.history = fixture.history
        .map((item) => ({
          role: item?.role === "assistant" ? "assistant" : "user",
          content: String(item?.content || "").trim(),
          ...(item?.rulingStatus ? { rulingStatus: String(item.rulingStatus).trim() } : {})
        }))
        .filter((item) => item.content);
    }

    if (!normalized.question) {
      manual.push({ interactionId, reason: "missing question" });
      continue;
    }
    if (!ALLOWED_CLASSIFICATIONS.has(normalized.expectedClassification)) {
      manual.push({ interactionId, reason: "missing or invalid expected classification" });
      continue;
    }
    if (normalized.expectedClassification === "out_of_scope") {
      manual.push({ interactionId, reason: "out-of-scope fixtures require manual benchmark handling" });
      continue;
    }
    if (!normalized.expectedSourcePatterns.length) {
      manual.push({ interactionId, reason: "missing governing source patterns" });
      continue;
    }
    if (normalized.category === "conversation" && !normalized.history?.length) {
      manual.push({ interactionId, reason: "conversation fixture has no history" });
      continue;
    }

    let id = normalized.id;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${normalized.id}-${suffix}`;
      suffix += 1;
    }
    normalized.id = id;
    existingIds.add(id);
    existingInteractionIds.add(interactionId);
    benchmark.cases.push(normalized);
    added.push(normalized);
  }

  if (benchmark.cases.length > 150) {
    throw new Error(
      `Ingest would grow the v0.7.1 benchmark to ${benchmark.cases.length} cases; the current QA foundation caps it at 150. Prune or consolidate cases first.`
    );
  }

  return { benchmark, added, skipped, manual };
}

function parseArgs(argv) {
  const positional = [];
  let benchmarkPath = DEFAULT_BENCHMARK;
  let check = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--benchmark") {
      benchmarkPath = argv[index + 1];
      index += 1;
    } else if (arg === "--check") {
      check = true;
    } else {
      positional.push(arg);
    }
  }
  return { candidatePath: positional[0] || "", benchmarkPath, check };
}

function main() {
  const { candidatePath, benchmarkPath, check } = parseArgs(process.argv.slice(2));
  if (!candidatePath) {
    console.error(
      "Usage: node scripts/ingest-rules-regression-candidates.mjs <candidate-json> [--benchmark <path>] [--check]"
    );
    process.exit(2);
  }

  const bundle = JSON.parse(readFileSync(candidatePath, "utf8"));
  const benchmark = JSON.parse(readFileSync(benchmarkPath, "utf8"));
  const result = mergeRegressionCandidates(benchmark, bundle);

  if (!check && result.added.length) {
    writeFileSync(benchmarkPath, `${JSON.stringify(result.benchmark, null, 2)}\n`, "utf8");
  }

  console.log(`Regression candidates: ${bundle.candidates.length}`);
  console.log(`Added: ${result.added.length}`);
  console.log(`Already covered: ${result.skipped.length}`);
  console.log(`Needs manual fixture work: ${result.manual.length}`);
  for (const item of result.manual) {
    console.log(`  - ${item.interactionId || "unknown"}: ${item.reason}`);
  }
  if (check) console.log("Check mode: benchmark was not modified.");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
