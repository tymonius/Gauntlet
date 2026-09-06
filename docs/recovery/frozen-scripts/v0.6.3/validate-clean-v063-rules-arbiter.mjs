import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const sha256 = (path) => crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
const parse = (path) => JSON.parse(read(path));

const ROOT = "artifacts/reconstruction/clean-v0.6.3/rules-arbiter";
const AUTHORITY_SET_ID = "64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49";
const RULEBOOK_SHA256 = "7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643";
const CANONICAL_DATA_SHA256 = "641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c";
const RULEBOOK_PATH = "artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md";
const CANONICAL_PATH = "artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json";
const ARBITER_PAGE_PATH = `${ROOT}/index.html`;

const lifecycle = parse("config/release-lifecycle.json");
const authority = parse("artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json");
const downstream = parse("artifacts/reconstruction/clean-v0.6.3/downstream/manifest.json");
const manifest = parse(`${ROOT}/manifest.json`);
const canonical = parse(CANONICAL_PATH);
const corpus = read(`${ROOT}/corpus.js`);
const worker = read(`${ROOT}/worker.js`);
const app = read(`${ROOT}/app.js`);
const page = read(ARBITER_PAGE_PATH);
const boundary = read(`${ROOT}/source-boundary.md`);
const wrangler = read(`${ROOT}/wrangler.toml`);
const publicWidget = read("rules-assistant/widget.js");
const publicEntry = read("rules-assistant/worker-entry.js");
const analyticsSync = read("scripts/sync-google-analytics.mjs");

assert.equal(lifecycle.current_release, "v0.6.1", "v0.6.1 must remain current/public");
assert.equal(lifecycle.releases?.["v0.6.2"]?.status, "withdrawn");
assert.equal(lifecycle.releases?.["v0.6.3"]?.status, "withdrawn");
assert.equal(lifecycle.releases?.["v0.6.3"]?.public_cutover, false);

assert.equal(authority.authority_set_id, AUTHORITY_SET_ID, "complete authority ID drifted");
assert.equal(downstream.authority_set_id, AUTHORITY_SET_ID, "downstream authority binding drifted");
assert.equal(downstream.publication_unlocked, false, "downstream publication must remain locked");
assert.equal(downstream.public_current_release, "v0.6.1");
assert.equal(sha256(RULEBOOK_PATH), RULEBOOK_SHA256, "clean Rulebook hash drifted");
assert.equal(sha256(CANONICAL_PATH), CANONICAL_DATA_SHA256, "clean canonical-data hash drifted");

assert.equal(canonical.cards?.length, 128, "clean canonical data must contain 128 cards");
assert.equal(canonical.territories?.length, 25, "clean canonical data must contain 25 Territories");
assert.equal(canonical.factions?.length, 6, "clean canonical data must contain six factions");
assert.equal(
  canonical.factions.reduce((count, faction) => count + (Array.isArray(faction?.leaders) ? faction.leaders.length : 0), 0),
  12,
  "clean canonical data must contain twelve Leaders"
);
assert(JSON.stringify(canonical).includes(AUTHORITY_SET_ID), "canonical data must carry the repaired authority ID");

assert.equal(manifest.target, "clean-v0.6.3-rules-arbiter");
assert.equal(manifest.authority_set_id, AUTHORITY_SET_ID);
assert.equal(manifest.certified_rulebook?.sha256, RULEBOOK_SHA256);
assert.equal(manifest.downstream_prerequisite?.canonical_data_sha256, CANONICAL_DATA_SHA256);
assert.equal(manifest.semantic_policy?.deterministic_v063_rulings, 0);
assert.equal(manifest.semantic_policy?.gameplay_specific_worker_prompt_rules, false);
assert.equal(manifest.semantic_policy?.answers_derive_from_bound_clean_sources, true);
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, "v0.6.1");
assert.equal(manifest.public_worker_route_modified, false);

for (const marker of [
  "clean-v0.6.3-reconstruction",
  AUTHORITY_SET_ID,
  RULEBOOK_PATH,
  CANONICAL_PATH
]) {
  assert(corpus.includes(marker), `Clean corpus missing required binding: ${marker}`);
}
assert(corpus.includes("buildRulesCorpus"), "Clean corpus must reuse only generic corpus construction");
assert(corpus.includes("validateCleanV063Inputs"), "Clean corpus must validate source identity/counts");

for (const marker of [
  "Use only the supplied clean source passages",
  "Do not use outside knowledge, withdrawn Gauntlet releases, historical candidate text",
  "explicit",
  "inferred",
  "provisional",
  "out_of_scope",
  "deterministicRuleAnswers: false",
  "formalPlaytestLinking: false"
]) {
  assert(worker.includes(marker), `Clean worker missing operational boundary: ${marker}`);
}
assert(!worker.includes("resolveV063DeterministicRuling"), "Clean worker must not use candidate deterministic rulings");
assert(!app.includes("resolveV063DeterministicRuling"), "Clean browser app must not use candidate deterministic rulings");
assert(!app.includes("gauntlet-rules-assistant.tymon-scott.workers.dev"), "Clean app must not default to production endpoint");
assert(app.includes("GAUNTLET_CLEAN_V063_RULES_ARBITER_ENDPOINT"), "Clean app must require an explicit isolated endpoint");

for (const marker of [
  '<meta name="robots" content="noindex,nofollow" />',
  "Rules Arbiter",
  "current public v0.6.1 Rules Arbiter",
  "There are no deterministic v0.6.3 rulings",
  AUTHORITY_SET_ID
]) {
  assert(page.includes(marker), `Clean Rules Arbiter page missing: ${marker}`);
}
assert(!page.includes("G-8YYYZJGGPE"), "Noindex reconstruction page must not carry the production analytics tag");
assert(
  analyticsSync.includes(`"${ARBITER_PAGE_PATH}"`),
  "Analytics synchronization must explicitly exclude the noindex clean Rules Arbiter page"
);
assert(
  analyticsSync.includes('"artifacts/reconstruction/clean-v0.6.3/browser-rulebook/index.html"'),
  "Existing clean Browser Rulebook analytics exclusion must remain intact"
);

const runtime = [corpus, worker, app].join("\n");
const forbiddenRuntimeMarkers = [
  "v063-development-corpus",
  "rules-deterministic-v063",
  "worker-v063-candidate",
  "artifacts/v0.6.3/",
  "releases/v0.6.3/",
  "releases/v0.6.2/",
  "v0.6.3/rules-arbiter/",
  "Setup order is faction preparation",
  "Running the Gauntlet has two equal normal routes",
  "Smuggler's Pass is renamed Smuggler's Run",
  "Reserves is renamed Second Line",
  "Margin Loan may remain banked",
  "V063_DETERMINISTIC_CASE_COUNT"
];
for (const marker of forbiddenRuntimeMarkers) {
  assert(!runtime.includes(marker), `Forbidden withdrawn/hard-coded semantic marker in clean runtime: ${marker}`);
}

assert(boundary.includes("19 hand-written deterministic rulings"));
assert(boundary.includes("explicitly forbidden as semantic inputs"));
assert(boundary.includes("no gameplay-specific answer text in the worker prompt"));
assert(wrangler.includes('name = "gauntlet-rules-arbiter-clean-v063-reconstruction"'));
assert(wrangler.includes('main = "worker.js"'));
assert(!wrangler.includes('name = "gauntlet-rules-assistant"'), "isolated worker must not reuse the production worker name");

const { loadCleanV063RulesCorpus } = await import("../artifacts/reconstruction/clean-v0.6.3/rules-arbiter/corpus.js");
const loadedCorpus = await loadCleanV063RulesCorpus({
  rulebookUrl: "https://clean.example/rulebook.md",
  canonicalDataUrl: "https://clean.example/canonical-data.json",
  rulebookBrowserUrl: "https://clean.example/browser-rulebook/",
  fetchImpl: async (url) => {
    if (String(url).endsWith("/rulebook.md")) {
      return new Response(read(RULEBOOK_PATH), { status: 200 });
    }
    if (String(url).endsWith("/canonical-data.json")) {
      return new Response(read(CANONICAL_PATH), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response("not found", { status: 404 });
  }
});
assert.equal(loadedCorpus.version, "clean-v0.6.3-reconstruction");
assert.equal(loadedCorpus.authoritySetId, AUTHORITY_SET_ID);
assert(loadedCorpus.documents.length > 100, "clean corpus should materialize a substantial rules corpus");
assert(loadedCorpus.documents.some((document) => document.kind === "rulebook"));
assert(loadedCorpus.documents.some((document) => document.kind !== "rulebook"));
assert(
  loadedCorpus.documents.every((document) =>
    !String(document.sourcePath || "").includes("releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json")
  ),
  "clean corpus must not expose inherited v0.6.1 canonical-data source paths"
);
assert(
  !loadedCorpus.documents.some((document) => document.title === "Canonical v0.6.1 release summary"),
  "clean corpus must not retain an inherited v0.6.1 summary label"
);

assert(publicWidget.includes('version: "v0.6.1"'), "current public widget must remain v0.6.1");
assert(publicEntry.includes('import worker from "./worker-v061.js";'), "current public entry must remain pinned to v0.6.1");
assert(!publicEntry.includes("clean-v063"), "current public entry must not route to reconstruction worker");

const changed = changedFiles();
const arbiterSurfaceChanged = changed.some((path) => path.startsWith(`${ROOT}/`));

if (arbiterSurfaceChanged) {
  const allowedPrefixes = [
    `${ROOT}/`,
    "scripts/validate-clean-v063-rules-arbiter.mjs",
    "scripts/sync-google-analytics.mjs",
    ".github/workflows/build-clean-v063-rules-arbiter.yml"
  ];
  const unexpected = changed.filter((path) => !allowedPrefixes.some((allowed) =>
    allowed.endsWith("/") ? path.startsWith(allowed) : path === allowed
  ));
  assert.deepEqual(unexpected, [], `Clean Rules Arbiter diff escaped reconstruction boundary: ${unexpected.join(", ")}`);

  const requiredChanged = [
    `${ROOT}/index.html`,
    `${ROOT}/styles.css`,
    `${ROOT}/app.js`,
    `${ROOT}/corpus.js`,
    `${ROOT}/worker.js`,
    `${ROOT}/manifest.json`,
    `${ROOT}/source-boundary.md`,
    `${ROOT}/validation-status.md`,
    `${ROOT}/wrangler.toml`,
    "scripts/validate-clean-v063-rules-arbiter.mjs",
    "scripts/sync-google-analytics.mjs",
    ".github/workflows/build-clean-v063-rules-arbiter.yml"
  ];
  for (const path of requiredChanged) {
    assert(changed.includes(path), `Expected clean Rules Arbiter file missing from diff: ${path}`);
  }
} else {
  const forbiddenArbiterChanges = changed.filter((path) =>
    path.startsWith("rules-assistant/") || path === ".github/workflows/build-clean-v063-rules-arbiter.yml"
  );
  assert.deepEqual(
    forbiddenArbiterChanges,
    [],
    `Dependency-triggered clean Rules Arbiter validation must not modify public or workflow Arbiter files: ${forbiddenArbiterChanges.join(", ")}`
  );
}

console.log(
  arbiterSurfaceChanged
    ? `Clean v0.6.3 Rules Arbiter validated: ${changed.length}-file isolated reconstruction, repaired authority/canonical hashes pinned, zero deterministic v0.6.3 rulings, noindex analytics exclusion explicit, public v0.6.1 routing unchanged.`
    : `Clean v0.6.3 Rules Arbiter dependency validation passed: shared dependency changed, existing clean surface remains valid, public v0.6.1 routing unchanged.`
);

function changedFiles() {
  try {
    if (process.env.GITHUB_BASE_REF) {
      return execFileSync("git", ["diff", "--name-only", "HEAD^1", "HEAD"], { encoding: "utf8" })
        .split(/\r?\n/).filter(Boolean);
    }
    return execFileSync("git", ["diff", "--name-only", "HEAD~1", "HEAD"], { encoding: "utf8" })
      .split(/\r?\n/).filter(Boolean);
  } catch (error) {
    console.error("Could not determine clean Rules Arbiter diff boundary", error);
    process.exit(1);
  }
}