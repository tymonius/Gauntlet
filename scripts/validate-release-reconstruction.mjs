import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const fail = (message) => {
  throw new Error(`[release-reconstruction] ${message}`);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const ledgerPath = "config/reconstruction-ledger.json";
const lifecyclePath = "config/release-lifecycle.json";
const canonicalPath = "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json";
const rulebookPath = "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md";

const ledger = readJson(ledgerPath);
const lifecycle = readJson(lifecyclePath);
const canonical = readJson(canonicalPath);
const rulebook = readText(rulebookPath);

assert(ledger.schema_version === 1, "unsupported reconstruction ledger schema");
assert(ledger.program_issue === 587, "reconstruction must remain anchored to issue #587");
assert(ledger.baseline_release === "v0.6.1", "baseline release must be v0.6.1");
assert(ledger.publication_unlocked === false, "publication must remain locked during reconstruction audit");
assert(ledger.target_release === null, "target release number must remain undecided during the baseline/audit stage");

assert(lifecycle.current_release === "v0.6.1", "current release must remain v0.6.1 during reconstruction");
assert(lifecycle.releases?.["v0.6.1"]?.status === "current", "v0.6.1 must be lifecycle current");
for (const release of ["v0.6.2", "v0.6.3"]) {
  const record = lifecycle.releases?.[release];
  assert(record?.status === "withdrawn", `${release} must remain withdrawn`);
  assert(record?.artifacts_preserved === true, `${release} artifacts must remain preserved`);
  assert(record?.public_cutover === false, `${release} may not be a public cutover target`);
}

assert(Array.isArray(ledger.baseline_sources) && ledger.baseline_sources.length >= 9, "baseline source inventory is incomplete");
for (const source of ledger.baseline_sources) {
  assert(typeof source === "string" && source.startsWith("releases/v0.6.1/"), `baseline source is outside v0.6.1: ${source}`);
  assert(fs.existsSync(path.join(ROOT, source)), `baseline source does not exist: ${source}`);
}

assert(canonical.version === "v0.6.1", "canonical baseline does not report v0.6.1");
assert(Array.isArray(canonical.factions), "v0.6.1 canonical data is missing factions");
assert(canonical.factions.length === ledger.semantic_invariants.faction_count, `expected ${ledger.semantic_invariants.faction_count} factions`);
const leaderCount = canonical.factions.reduce((total, faction) => total + (Array.isArray(faction.leaders) ? faction.leaders.length : 0), 0);
assert(leaderCount === ledger.semantic_invariants.leader_count, `expected ${ledger.semantic_invariants.leader_count} Leaders, found ${leaderCount}`);

for (const faction of canonical.factions) {
  assert(typeof faction.source === "string" && faction.source.length > 0, `${faction.name} is missing a dedicated faction authority source`);
  assert(ledger.baseline_sources.includes(faction.source), `${faction.name} faction guide is not declared as a baseline source: ${faction.source}`);
  assert(fs.existsSync(path.join(ROOT, faction.source)), `${faction.name} faction guide does not exist: ${faction.source}`);
  assert(Array.isArray(faction.leaders) && faction.leaders.length === 2, `${faction.name} must expose exactly two Leaders in the baseline`);
}

assert(rulebook.includes("# Part III — Factions"), "v0.6.1 baseline Rulebook must retain a dedicated Factions part");
assert(rulebook.includes("their Leaders, components, procedures, and alternate victories"), "baseline Rulebook must describe faction material as complete procedures, not migration notes");

const generalStart = rulebook.indexOf("\n## General\n");
const commandantStart = rulebook.indexOf("\n## Commandant\n", generalStart + 1);
const diplomatsStart = rulebook.indexOf("\n# Diplomats", commandantStart + 1);
assert(generalStart >= 0, "General section missing from v0.6.1 Rulebook");
assert(commandantStart > generalStart, "Commandant section missing or not separated from General");
const generalSection = rulebook.slice(generalStart, commandantStart);
const commandantSection = rulebook.slice(commandantStart, diplomatsStart > commandantStart ? diplomatsStart : rulebook.length);

for (const [leader, orders] of Object.entries(ledger.semantic_invariants.military_leader_ownership)) {
  const section = leader === "General" ? generalSection : commandantSection;
  for (const order of orders) {
    assert(section.includes(`**${order} —`), `${order} is not explicitly owned by ${leader} in the v0.6.1 authority`);
  }
}
for (const order of ledger.semantic_invariants.military_leader_ownership.General) {
  assert(!commandantSection.includes(`**${order} —`), `${order} is incorrectly duplicated into Commandant authority`);
}
for (const order of ledger.semantic_invariants.military_leader_ownership.Commandant) {
  assert(!generalSection.includes(`**${order} —`), `${order} is incorrectly duplicated into General authority`);
}

assert(Array.isArray(ledger.decision_statuses), "decision status enum is missing");
const allowedStatuses = new Set(ledger.decision_statuses);
assert(["pending", "adopt", "revise", "reject"].every((status) => allowedStatuses.has(status)), "decision status enum is incomplete");
assert(Array.isArray(ledger.changes) && ledger.changes.length > 0, "post-v0.6.1 change inventory is empty");

const ids = new Set();
for (const change of ledger.changes) {
  assert(typeof change.id === "string" && change.id.length > 0, "change is missing an id");
  assert(!ids.has(change.id), `duplicate change id: ${change.id}`);
  ids.add(change.id);
  assert(typeof change.title === "string" && change.title.length > 0, `${change.id} is missing a title`);
  assert(typeof change.source_release === "string" && change.source_release.length > 0, `${change.id} is missing source_release`);
  assert(allowedStatuses.has(change.status), `${change.id} has invalid status ${change.status}`);
  assert(Number.isInteger(change.audit_issue) && change.audit_issue > 0, `${change.id} is missing an audit issue`);
  assert(Array.isArray(change.evidence) && change.evidence.length > 0, `${change.id} has no evidence references`);
  assert(Array.isArray(change.affected_surfaces) && change.affected_surfaces.length > 0, `${change.id} has no affected-surface inventory`);

  for (const evidence of change.evidence) {
    if (typeof evidence === "string" && evidence.startsWith("releases/")) {
      assert(fs.existsSync(path.join(ROOT, evidence)), `${change.id} evidence path does not exist: ${evidence}`);
    }
  }

  if (change.status !== "pending") {
    const decision = change.decision;
    assert(decision && typeof decision === "object", `${change.id} cannot leave pending without a decision record`);
    for (const field of ledger.required_decision_evidence) {
      assert(decision[field], `${change.id} decision is missing ${field}`);
    }
    assert(decision.outcome === change.status, `${change.id} decision outcome must match status`);
  }
}

assert(ledger.semantic_invariants.source_authority_must_be_self_contained === true, "self-contained authority invariant must remain enabled");
assert(ledger.semantic_invariants.migration_material_may_not_be_core_rules === true, "migration/core-rules separation invariant must remain enabled");
assert(ledger.semantic_invariants.downstream_generation_requires_approved_authority === true, "downstream generation gate must remain enabled");

console.log(`[release-reconstruction] baseline ${ledger.baseline_release} verified`);
console.log(`[release-reconstruction] ${canonical.factions.length} factions / ${leaderCount} Leaders verified`);
console.log(`[release-reconstruction] ${ledger.changes.length} post-baseline change groups quarantined or decision-tracked`);
console.log("[release-reconstruction] publication remains locked");
