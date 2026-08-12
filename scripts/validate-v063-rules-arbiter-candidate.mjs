import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const lifecycle = JSON.parse(read("config/release-lifecycle.json"));
const v063Withdrawn = lifecycle.current_release === "v0.6.2" &&
  lifecycle.releases?.["v0.6.3"]?.status === "withdrawn" &&
  lifecycle.releases?.["v0.6.3"]?.public_cutover === false;

const publicWidget = read("rules-assistant/widget.js");
const publicEntry = read("rules-assistant/worker-entry.js");
const corpus = read("rules-assistant/v063-development-corpus.js");
const deterministic = read("rules-assistant/rules-deterministic-v063.js");
const worker = read("rules-assistant/worker-v063-candidate.js");
const candidateEntry = read("rules-assistant/worker-entry-v063-candidate.js");
const wrangler = read("rules-assistant/wrangler-v063-candidate.toml");
const page = read("v0.6.3/rules-arbiter/index.html");
const app = read("v0.6.3/rules-arbiter/app.js");
const home = read("v0.6.3/index.html");

// Public v0.6.2 Arbiter stays untouched in behavior and routing.
assert(publicWidget.includes('version: "v0.6.2"'), "Public Rules Arbiter widget must remain v0.6.2");
assert(publicWidget.includes('./v062-published-corpus.js'), "Public widget must continue to load the published v0.6.2 corpus");
assert(publicEntry.includes('./worker-v062.js'), "Public worker entry must continue to route only to worker-v062.js");
assert(!publicEntry.includes('v063'), "Public worker entry must not route to the v0.6.3 candidate worker");

// Candidate corpus and worker identify themselves explicitly and use only the
// development browser/canonical candidate surfaces.
assert(corpus.includes('v0.6.3-candidate-2026-08-11'));
assert(corpus.includes('/v0.6.3/rulebook/'));
assert(corpus.includes('/v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json'));
assert(corpus.includes('/v0.6.3/reference/'));
assert(corpus.includes('publishedVersion = "v0.6.2"'));
assert(corpus.includes("Smuggler's Run"));
assert(corpus.includes('Second Line'));
assert(corpus.includes('While this remains banked, you may not draw at the start of your turn.'));
assert(deterministic.includes('V063_DETERMINISTIC_CASE_COUNT = 19'));
assert(deterministic.includes("Smuggler's Run is the v0.6.3 name"));
assert(deterministic.includes('Second Line is the v0.6.3 name'));
assert(deterministic.includes('Margin Loan may remain banked beyond your next turn'));
assert(worker.includes('V063_RULES_VERSION'));
assert(worker.includes('publishedVersion: "v0.6.2"'));
assert(worker.includes('candidate: true'));
assert(worker.includes('resolveV063DeterministicRuling'));
assert(worker.includes("Smuggler's Pass is renamed Smuggler's Run"));
assert(worker.includes('Reserves is renamed Second Line'));
assert(candidateEntry.includes('./worker-v063-candidate.js'));
assert.equal((candidateEntry.match(/worker-v062/g) || []).length, 0);
assert(wrangler.includes('name = "gauntlet-rules-assistant-v063-candidate"'));
assert(wrangler.includes('main = "worker-entry-v063-candidate.js"'));
assert(!wrangler.includes('gauntlet-rules-assistant"'), "Candidate worker must not reuse the production worker name");

// Development page remains unpublished and self-sufficient: local candidate
// lookup works without a deployed candidate worker endpoint.
for (const marker of [
  '<meta name="robots" content="noindex,nofollow">',
  'Unpublished v0.6.3 development Rules Arbiter',
  'v0.6.2 remains the canonical published playtest edition',
  'data-question="When do I arrange my Territories during setup?"',
  'data-question="Can capturing the opponent\'s final Territory win immediately?"',
  'data-question="How does the inherent Bank Action work?"',
  'data-question="Can Margin Loan stay banked past my next turn?"',
  '<link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />',
  'G-8YYYZJGGPE'
]) assert(page.includes(marker), `Candidate Rules Arbiter page missing: ${marker}`);
assert(app.includes('window.GAUNTLET_V063_RULES_ASSISTANT_ENDPOINT || ""'));
assert(app.includes('loadDevelopmentV063RulesCorpus'));
assert(app.includes('resolveV063DeterministicRuling'));
assert(app.includes('buildLocalFallbackAnswer'));
assert(app.includes('Configured endpoint did not identify itself as the v0.6.3 candidate Rules Arbiter'));
assert(!app.includes('gauntlet-rules-assistant.tymon-scott.workers.dev'), "Candidate page must not default to the public production worker");
assert(home.includes('href="rules-arbiter/"'));
assert(home.includes('public Rules Arbiter remains on the published v0.6.2 corpus'));
assert(home.includes('v0.6.3 development Rules Arbiter'));

if (process.env.GITHUB_BASE_REF) {
  const changed = execFileSync('git', ['diff', '--name-only', `origin/${process.env.GITHUB_BASE_REF}...HEAD`], { encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean);
  const alwaysForbidden = new Set([
    'rules-assistant/worker-v062.js',
    'rules-assistant/v062-published-corpus.js',
  ]);
  const currentRoutingFiles = new Set([
    'rules-assistant/widget.js',
    'rules-assistant/worker-entry.js',
  ]);
  const forbidden = changed.filter((path) =>
    path.startsWith('v0.6.2/') ||
    alwaysForbidden.has(path) ||
    (!v063Withdrawn && currentRoutingFiles.has(path))
  );
  assert.deepEqual(forbidden, [], `Candidate Rules Arbiter work must not modify public v0.6.2 Arbiter/release files: ${forbidden.join(', ')}`);

  if (v063Withdrawn) {
    const changedRouting = changed.filter((path) => currentRoutingFiles.has(path));
    for (const path of changedRouting) {
      assert(
        path === 'rules-assistant/widget.js' || path === 'rules-assistant/worker-entry.js',
        `Withdrawn-release rollback may only restore the public Arbiter routing files, found ${path}`
      );
    }
  }
}

console.log(`v0.6.3 Rules Arbiter candidate validated: separate corpus/worker/page, 19 deterministic rulings, local fallback, and public v0.6.2 Arbiter${v063Withdrawn ? ' restored under withdrawn-release lifecycle' : ' unchanged'}.`);
