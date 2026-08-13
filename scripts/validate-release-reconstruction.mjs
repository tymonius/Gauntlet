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
const normalizeAuthorityText = (value) => String(value || "")
  .replace(/^>\s?/gm, "")
  .replace(/\*\*/g, "")
  .replace(/\s+/g, " ")
  .trim();

function extractLeaderSection(guide, leaderName) {
  const marker = `\n## ${leaderName}\n`;
  const start = guide.indexOf(marker);
  assert(start >= 0, `${leaderName} section is missing from its faction guide`);
  const contentStart = start + marker.length;
  const nextH2 = guide.indexOf("\n## ", contentStart);
  const nextH1 = guide.indexOf("\n# ", contentStart);
  const ends = [nextH2, nextH1].filter((index) => index >= 0);
  const end = ends.length ? Math.min(...ends) : guide.length;
  return guide.slice(start, end);
}

const ledgerPath = "config/reconstruction-ledger.json";
const leaderAuthorityPath = "config/leader-authority-v061.json";
const lifecyclePath = "config/release-lifecycle.json";
const canonicalPath = "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json";
const rulebookPath = "releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md";

const ledger = readJson(ledgerPath);
const leaderAuthority = readJson(leaderAuthorityPath);
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

assert(leaderAuthority.schema_version === 1, "unsupported Leader authority schema");
assert(leaderAuthority.release === "v0.6.1", "Leader authority map must describe v0.6.1");
assert(Array.isArray(leaderAuthority.factions), "Leader authority map is missing factions");
assert(leaderAuthority.factions.length === ledger.semantic_invariants.faction_count, "Leader authority map must cover all six factions");

let mappedLeaderCount = 0;
let mappedAbilityCount = 0;
const mappedLeaderNames = new Set();
for (const authorityFaction of leaderAuthority.factions) {
  assert(typeof authorityFaction.source === "string" && authorityFaction.source.length > 0, `${authorityFaction.faction} authority is missing its source`);
  assert(ledger.baseline_sources.includes(authorityFaction.source), `${authorityFaction.faction} Leader authority source is not a declared baseline source`);
  assert(fs.existsSync(path.join(ROOT, authorityFaction.source)), `${authorityFaction.faction} Leader authority source does not exist`);

  const canonicalFaction = canonical.factions.find((faction) => faction.source === authorityFaction.source);
  assert(canonicalFaction, `${authorityFaction.faction} Leader authority does not map to a canonical v0.6.1 faction`);
  assert(Array.isArray(authorityFaction.leaders) && authorityFaction.leaders.length === 2, `${authorityFaction.faction} Leader authority must contain exactly two Leaders`);

  const guide = readText(authorityFaction.source);
  const factionSections = new Map();
  for (const leader of authorityFaction.leaders) {
    mappedLeaderCount += 1;
    assert(typeof leader.name === "string" && leader.name.length > 0, `${authorityFaction.faction} has a nameless Leader authority`);
    assert(!mappedLeaderNames.has(leader.name), `duplicate Leader authority: ${leader.name}`);
    mappedLeaderNames.add(leader.name);
    assert(canonicalFaction.leaders.some((candidate) => candidate.name === leader.name), `${leader.name} is not listed under ${canonicalFaction.name} in canonical v0.6.1 data`);
    assert(Array.isArray(leader.abilities) && leader.abilities.length > 0, `${leader.name} has no encoded Leader abilities`);

    const section = extractLeaderSection(guide, leader.name);
    factionSections.set(leader.name, section);
    const normalizedSection = normalizeAuthorityText(section);
    for (const ability of leader.abilities) {
      mappedAbilityCount += 1;
      assert(typeof ability.name === "string" && ability.name.length > 0, `${leader.name} has an unnamed ability`);
      assert(typeof ability.kind === "string" && ability.kind.length > 0, `${leader.name} / ${ability.name} is missing its ability kind`);
      assert(typeof ability.baseline_text === "string" && ability.baseline_text.length > 0, `${leader.name} / ${ability.name} is missing baseline text`);
      assert(normalizedSection.includes(normalizeAuthorityText(ability.baseline_text)), `${leader.name} / ${ability.name} baseline text is not present in the correct v0.6.1 Leader section`);
    }
  }

  for (const owner of authorityFaction.leaders) {
    for (const ability of owner.abilities) {
      for (const other of authorityFaction.leaders) {
        if (other.name === owner.name) continue;
        const otherSection = normalizeAuthorityText(factionSections.get(other.name));
        assert(!otherSection.includes(normalizeAuthorityText(ability.baseline_text)), `${owner.name} / ${ability.name} is duplicated into ${other.name}'s Leader section`);
      }
    }
  }
}

assert(mappedLeaderCount === ledger.semantic_invariants.leader_count, `Leader authority map covers ${mappedLeaderCount} Leaders instead of ${ledger.semantic_invariants.leader_count}`);
assert(mappedLeaderNames.size === leaderCount, "Leader authority map does not uniquely cover every canonical Leader");
for (const faction of canonical.factions) {
  for (const leader of faction.leaders) {
    assert(mappedLeaderNames.has(leader.name), `canonical Leader is missing from authority map: ${leader.name}`);
  }
}

const militaryAuthority = leaderAuthority.factions.find((faction) => faction.faction === "Military");
assert(militaryAuthority, "Military is missing from the Leader authority map");
for (const [leaderName, orders] of Object.entries(ledger.semantic_invariants.military_leader_ownership)) {
  const leader = militaryAuthority.leaders.find((candidate) => candidate.name === leaderName);
  assert(leader, `${leaderName} is missing from the Military Leader authority map`);
  const actual = leader.abilities.map((ability) => ability.name);
  assert(actual.length === orders.length && orders.every((order) => actual.includes(order)), `${leaderName} Order ownership does not match the reconstruction invariant`);
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
console.log(`[release-reconstruction] ${canonical.factions.length} factions / ${leaderCount} Leaders / ${mappedAbilityCount} Leader abilities verified`);
console.log(`[release-reconstruction] ${ledger.changes.length} post-baseline change groups quarantined or decision-tracked`);
console.log("[release-reconstruction] publication remains locked");
