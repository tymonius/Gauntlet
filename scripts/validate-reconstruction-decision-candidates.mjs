import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
const fail = (message) => {
  throw new Error(`[reconstruction-decisions] ${message}`);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const candidates = readJson("config/reconstruction-decision-candidates.json");
const ledger = readJson("config/reconstruction-ledger.json");
const leaderAuthority = readJson("config/leader-authority-v061.json");
const lifecycle = readJson("config/release-lifecycle.json");

assert(candidates.schema_version === 1, "unsupported candidate schema");
assert(candidates.program_issue === 587, "candidate set must remain anchored to #587");
assert(candidates.audit_issue === 588, "candidate set must remain anchored to #588");
assert(candidates.baseline_release === "v0.6.1", "candidate baseline must remain v0.6.1");
assert(candidates.authority_build_unlocked === false, "authority build may not be unlocked by recommendation normalization");
assert(candidates.publication_unlocked === false, "publication may not be unlocked by recommendation normalization");
assert(lifecycle.current_release === "v0.6.1", "v0.6.1 must remain current while decisions are recommendations only");
assert(ledger.publication_unlocked === false, "reconstruction ledger publication lock must remain closed");
assert(ledger.target_release === null, "target release number must remain undecided at recommendation-normalization stage");

const allowed = new Set(candidates.allowed_recommendations);
assert(allowed.size === candidates.allowed_recommendations.length, "duplicate allowed recommendation value");
for (const required of ["adopt", "revise", "reject", "preserve", "adopt_selectively", "defer"]) {
  assert(allowed.has(required), `missing allowed recommendation ${required}`);
}
assert(candidates.required_human_adoption_status === "pending", "normalized candidates must require pending human adoption");
assert(Array.isArray(candidates.decisions) && candidates.decisions.length >= 40, "decision normalization is unexpectedly incomplete");

const ids = new Set();
const categories = new Map();
const auditIssues = new Set();
const recommendations = new Map();
for (const decision of candidates.decisions) {
  assert(typeof decision.id === "string" && decision.id.length > 0, "decision missing id");
  assert(!ids.has(decision.id), `duplicate decision id: ${decision.id}`);
  ids.add(decision.id);
  assert(Number.isInteger(decision.audit_issue), `${decision.id} missing audit_issue`);
  assert([593, 594, 595, 596, 597, 598, 599].includes(decision.audit_issue), `${decision.id} points outside focused audit lanes`);
  auditIssues.add(decision.audit_issue);
  assert(typeof decision.category === "string" && decision.category.length > 0, `${decision.id} missing category`);
  categories.set(decision.category, (categories.get(decision.category) || 0) + 1);
  assert(allowed.has(decision.recommendation), `${decision.id} has invalid recommendation ${decision.recommendation}`);
  recommendations.set(decision.recommendation, (recommendations.get(decision.recommendation) || 0) + 1);
  assert(decision.human_adoption_status === "pending", `${decision.id} must remain pending human adoption`);
  assert(typeof decision.summary === "string" && decision.summary.length > 0, `${decision.id} missing summary`);
  assert(typeof decision.baseline_interaction_review === "string" && decision.baseline_interaction_review.length > 0, `${decision.id} missing baseline interaction review`);
  assert(Array.isArray(decision.evidence) && decision.evidence.length > 0, `${decision.id} missing evidence`);
  assert(Array.isArray(decision.semantic_assertions) && decision.semantic_assertions.length > 0, `${decision.id} missing semantic assertions`);
  assert(Array.isArray(decision.affected_surfaces) && decision.affected_surfaces.length > 0, `${decision.id} missing affected surfaces`);
}

for (const issue of [593, 594, 595, 596, 597, 598, 599]) {
  assert(auditIssues.has(issue), `no normalized decisions from audit #${issue}`);
}

for (const category of [
  "shared-rules",
  "setup-victory",
  "card-rules",
  "card-mechanics",
  "card-pool",
  "factions-leaders",
  "territories-identities",
  "starters-onboarding"
]) {
  assert(categories.has(category), `missing decision category ${category}`);
}

for (const recommendation of ["adopt", "revise", "reject", "preserve", "adopt_selectively", "defer"]) {
  assert(recommendations.has(recommendation), `normalization never exercises ${recommendation}; likely lost an audit disposition`);
}

const requiredDecisionIds = [
  "rules-action-economy-rebuild",
  "rules-pending-battle-terms-onset",
  "rules-front-line-control",
  "rules-defensive-edge",
  "rules-tiebreak-roll",
  "setup-v062-bottom-deck-opening",
  "setup-draw4-discard1-keep3",
  "setup-start-on-own-end-territory",
  "victory-final-territory-capture",
  "victory-independent-last-stand",
  "cards-role-headings",
  "cards-asset-only-banked-heading",
  "cards-inherent-bank-action",
  "cards-asset-removed-event",
  "cards-bind-defaults",
  "cards-apply-repeat-effects",
  "cards-no-winner-cleanup",
  "card-protracted-siege-revision",
  "card-margin-loan-persistent",
  "cards-405-umbrella-disposition",
  "pool-expand-to-128",
  "pool-landslide",
  "pool-invasion-military",
  "pool-detente",
  "pool-compound-interest",
  "pool-extraordinary-rendition",
  "pool-natures-altar",
  "pool-martyrdom",
  "faction-military-leader-ownership",
  "leader-commandant-fortify-front-line",
  "faction-diplomat-influence-economy",
  "faction-diplomat-leverage-curve",
  "faction-financier-starting-capital-2",
  "leader-executive-hostile-takeover-front-line",
  "faction-intelligence-full-restatement",
  "faction-mystics-baseline-progression",
  "faction-inquisition-purge-phase-model",
  "territories-preserve-25",
  "territories-shared-rule-compatibility",
  "identity-smugglers-run",
  "identity-second-line",
  "identity-stable-id-policy",
  "starters-12-leader-specific",
  "starters-v063-final-compositions",
  "starters-territory-order-metadata",
  "onboarding-regenerate-from-authority"
];
for (const id of requiredDecisionIds) {
  assert(ids.has(id), `missing required normalized decision ${id}`);
}

const forbiddenUmbrellaIds = [
  "v062-new-card-identities",
  "v062-defensive-edge-tiebreak-roll",
  "post-v061-faction-leader-revisions",
  "v063-card-text-review-405",
  "v063-territory-identity-migrations",
  "post-v061-starter-onboarding"
];
for (const id of forbiddenUmbrellaIds) {
  assert(!ids.has(id), `coarse umbrella id ${id} may not be used as a normalized decision`);
}

const byId = Object.fromEntries(candidates.decisions.map((decision) => [decision.id, decision]));
assert(byId["setup-v062-bottom-deck-opening"].recommendation === "reject", "superseded v0.6.2 opening procedure must be recommended for rejection");
assert(byId["rules-action-economy-rebuild"].recommendation === "defer", "broader Action economy must remain deferred pending integrated faction review");
assert(byId["rules-pending-battle-terms-onset"].recommendation === "defer", "pending-battle/Terms mechanics must remain deferred pending integrated review");
assert(byId["cards-405-umbrella-disposition"].recommendation === "reject", "#405 may not be blanket-adopted as one mechanics decision");
assert(byId["leader-commandant-fortify-front-line"].recommendation === "revise", "Fortify must remain an explicit Front Line revision candidate");
assert(byId["leader-executive-hostile-takeover-front-line"].recommendation === "revise", "Hostile Takeover must remain an explicit Front Line revision candidate");
assert(byId["faction-intelligence-full-restatement"].recommendation === "preserve", "Intelligence must be reconstructed from its complete v0.6.1 authority");
assert(byId["starters-v063-final-compositions"].recommendation === "defer", "starter compositions must remain downstream until canonical reconstruction exists");

const canonicalLeaderNames = new Set(leaderAuthority.factions.flatMap((faction) => faction.leaders.map((leader) => leader.name)));
assert(canonicalLeaderNames.size === 12, "v0.6.1 Leader authority must still expose 12 unique Leaders");
for (const name of ["General", "Commandant", "Ambassador", "Senator", "Banker", "Executive", "Ranger", "Spymaster", "Alchemist", "Spirit Walker", "Grand Inquisitor", "Witch Hunter"]) {
  assert(canonicalLeaderNames.has(name), `missing baseline Leader ${name}`);
}

console.log(`[reconstruction-decisions] ${candidates.decisions.length} fine-grained audit recommendations validated`);
console.log(`[reconstruction-decisions] focused audits covered: ${[...auditIssues].sort((a, b) => a - b).join(", ")}`);
console.log("[reconstruction-decisions] no recommendation is adopted gameplay authority; human adoption remains pending");
console.log("[reconstruction-decisions] authority build and publication remain locked");
