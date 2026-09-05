import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mergeRegressionCandidates } from "./ingest-rules-regression-candidates.mjs";
import { refinementScaffold } from "../rules-assistant/refinement-scaffold.js";

const DEFAULT_BENCHMARK = "rules-assistant/evals/rules-arbiter-evals.v071.json";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: options.inherit ? "inherit" : "pipe", ...options });
  if (result.error) throw result.error;
  return result;
}

function filterRegressionBundle(bundle, ids) {
  const wanted = new Set(ids.map(String));
  return {
    ...bundle,
    candidates: (bundle.candidates || []).filter((item) => wanted.has(String(item?.interactionId || "")))
  };
}

export function buildRefinementPlan(scaffold, regressionBundle, benchmark) {
  if (!scaffold || scaffold.schema !== "gauntlet.rules-refinement-scaffold.v1") {
    throw new Error("Scaffold must use gauntlet.rules-refinement-scaffold.v1.");
  }
  let attached = scaffold;
  let filteredBundle = null;
  let merge = null;
  if (regressionBundle) {
    attached = refinementScaffold.attachRegressionCandidates(scaffold, regressionBundle);
    filteredBundle = filterRegressionBundle(regressionBundle, scaffold.cluster.interactionIds || []);
    if (benchmark) merge = mergeRegressionCandidates(clone(benchmark), filteredBundle);
  }
  const counts = merge ? {
    addedCount: merge.added.length,
    skippedCount: merge.skipped.length,
    manualCount: merge.manual.length
  } : {
    addedCount: Number(attached.regression?.readyCount || 0),
    skippedCount: 0,
    manualCount: Number(attached.regression?.manualCount || 0)
  };
  const materialized = refinementScaffold.withMaterializationResult(attached, counts);
  return {
    scaffold: materialized,
    filteredBundle,
    merge,
    publicManifest: refinementScaffold.toPublicManifest(materialized)
  };
}

function parseArgs(argv) {
  const options = { scaffoldPath: "", regressionPath: "", benchmarkPath: DEFAULT_BENCHMARK, apply: false, openPr: false, base: "main" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("-") && !options.scaffoldPath) options.scaffoldPath = arg;
    else if (arg === "--regressions") options.regressionPath = argv[++i] || "";
    else if (arg === "--benchmark") options.benchmarkPath = argv[++i] || DEFAULT_BENCHMARK;
    else if (arg === "--base") options.base = argv[++i] || "main";
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--open-pr") { options.openPr = true; options.apply = true; }
    else if (arg === "--check") options.apply = false;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function ensureCleanRepository() {
  const status = run("git", ["status", "--porcelain"]);
  if (status.status !== 0) throw new Error(status.stderr || "Could not inspect git status.");
  if (String(status.stdout || "").trim()) throw new Error("Refinement scaffolding requires a clean working tree.");
}

function baselineCommand(benchmarkPath) {
  return ["vitest", "related", "--run", "--passWithNoTests", benchmarkPath];
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  if (!options.scaffoldPath) {
    console.error("Usage: node scripts/scaffold-rules-refinement-pr.mjs <scaffold-json> --regressions <bundle-json> [--apply] [--open-pr] [--benchmark <path>] [--base <branch>]");
    process.exit(2);
  }

  const scaffold = JSON.parse(readFileSync(options.scaffoldPath, "utf8"));
  const regressionBundle = options.regressionPath ? JSON.parse(readFileSync(options.regressionPath, "utf8")) : null;
  const benchmark = JSON.parse(readFileSync(options.benchmarkPath, "utf8"));
  const initial = buildRefinementPlan(scaffold, regressionBundle, benchmark);

  console.log(`Root cause: ${initial.scaffold.label}`);
  console.log(`Affected interactions: ${initial.scaffold.cluster.count}`);
  console.log(`Suggested branch: ${initial.scaffold.branch.suggestedName}`);
  if (initial.merge) {
    console.log(`Regression fixtures ready to add: ${initial.merge.added.length}`);
    console.log(`Already covered: ${initial.merge.skipped.length}`);
    console.log(`Needs manual fixture work: ${initial.merge.manual.length}`);
  } else {
    console.log("No reviewed regression bundle supplied; check-only scaffold cannot be materialized.");
  }

  if (!options.apply) {
    console.log("Check mode: no branch, benchmark, manifest, commit, or PR was created.");
    return;
  }
  if (!regressionBundle || !initial.merge) {
    throw new Error("--apply requires a reviewed gauntlet.rules-regression-candidates.v1 bundle via --regressions.");
  }

  ensureCleanRepository();
  const branch = initial.scaffold.branch.suggestedName;
  const switchResult = run("git", ["switch", "-c", branch, options.base], { inherit: true });
  if (switchResult.status !== 0) throw new Error(`Could not create branch ${branch}.`);

  if (initial.merge.added.length) {
    writeFileSync(options.benchmarkPath, `${JSON.stringify(initial.merge.benchmark, null, 2)}\n`, "utf8");
  }

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const baselineArgs = baselineCommand(options.benchmarkPath);
  const baselineResult = run(npx, baselineArgs, { inherit: true });
  const baseline = {
    command: `npx ${baselineArgs.join(" ")}`,
    exitCode: Number(baselineResult.status ?? 1),
    result: baselineResult.status === 0 ? "pass" : "fail"
  };
  const finalizedScaffold = refinementScaffold.withMaterializationResult(initial.scaffold, {
    addedCount: initial.merge.added.length,
    skippedCount: initial.merge.skipped.length,
    manualCount: initial.merge.manual.length,
    baseline
  });
  const publicManifest = refinementScaffold.toPublicManifest(finalizedScaffold);
  const stamp = String(finalizedScaffold.generatedAt || new Date().toISOString()).slice(0, 10);
  const manifestPath = `rules-assistant/refinement-manifests/${finalizedScaffold.rootCause}-${stamp}.json`;
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(publicManifest, null, 2)}\n`, "utf8");

  const bodyPath = resolve(".git", "gauntlet-rules-refinement-pr-body.md");
  writeFileSync(bodyPath, `${finalizedScaffold.pullRequest.body}\n`, "utf8");
  const addPaths = [manifestPath];
  if (initial.merge.added.length) addPaths.push(options.benchmarkPath);
  if (run("git", ["add", ...addPaths], { inherit: true }).status !== 0) throw new Error("Could not stage refinement scaffold.");
  if (run("git", ["commit", "-m", finalizedScaffold.branch.commitMessage], { inherit: true }).status !== 0) throw new Error("Could not commit refinement scaffold.");

  console.log(`Created refinement branch ${branch}.`);
  console.log(`Public manifest: ${manifestPath}`);
  console.log(`Deterministic baseline: ${baseline.result.toUpperCase()} (exit ${baseline.exitCode}).`);
  if (baseline.result === "fail") console.log("A failing deterministic baseline is expected when the new regression reproduces the systemic bug; implement the fix before marking the PR ready.");

  if (options.openPr) {
    const gh = process.platform === "win32" ? "gh.exe" : "gh";
    const push = run("git", ["push", "-u", "origin", branch], { inherit: true });
    if (push.status !== 0) throw new Error("Could not push refinement scaffold branch.");
    const pr = run(gh, ["pr", "create", "--draft", "--base", options.base, "--head", branch, "--title", finalizedScaffold.pullRequest.title, "--body-file", bodyPath], { inherit: true });
    if (pr.status !== 0) throw new Error("Could not open draft refinement PR with gh.");
  }
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : "";
if (invoked && invoked === resolve(fileURLToPath(import.meta.url))) main();
