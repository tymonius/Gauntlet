import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const fail = (message) => {
  console.error(`v063-recovered-decisions: ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const resolutions = readJson('config/reconstruction-version-resolutions.json');
const plan = readJson('config/reconstruction-version-plan.json');
const registry = readJson('governance/decision-registry.json');
const lifecycle = readJson('config/release-lifecycle.json');

assert(resolutions.publication_unlocked === false, 'resolution layer may not unlock publication');
assert(plan.publication_unlocked === false, 'version plan may not unlock publication');
assert(plan.targets?.['clean-v0.6.2']?.status === 'authority_certified', 'clean v0.6.2 must remain certified');
assert(plan.targets?.['clean-v0.6.3']?.authority_build_unlocked === true, 'clean v0.6.3 authority construction must remain unlocked');
assert(plan.targets?.['clean-v0.6.3']?.unlock?.basis === 'certified_clean_v0.6.2_authority', 'clean v0.6.3 must remain based on certified clean v0.6.2');

const recovered = resolutions['clean-v0.6.3']?.additional_recovered_decisions ?? [];
const expected = [
  {
    id: 'GNT-DEC-2026-0812-001',
    subject: 'neutral-armistice',
    ruleSnippets: ["start of its controller's Opening", 'Draw-suppression effects therefore cannot skip the upkeep'],
    summarySnippets: ["start of its controller's Opening", 'Draw-suppression effects therefore cannot skip the upkeep'],
  },
  {
    id: 'GNT-DEC-2026-0812-002',
    subject: 'neutral-manifest-destiny',
    ruleSnippets: ['normal Territory with a normal Deed', 'Controlling Interest rules apply unchanged'],
    summarySnippets: ['normal Territory with a normal Deed', 'creates no special Deed-pricing exception'],
  },
  {
    id: 'GNT-DEC-2026-0812-003',
    subject: 'neutral-contingency-plan',
    ruleSnippets: ['Removed under the defined involuntary Asset Removal event, regardless of cause', '+2 Battle Total'],
    summarySnippets: ['Removed under the defined involuntary Asset Removal event, regardless of the cause', '+2 Battle Total'],
  },
];

assert(recovered.length === expected.length, `clean v0.6.3 must contain exactly ${expected.length} recovered late decisions; found ${recovered.length}`);

const registryById = new Map((registry.decisions ?? []).map((decision) => [decision.id, decision]));
for (const item of expected) {
  const resolution = recovered.find((entry) => entry.id === item.id);
  assert(resolution, `missing recovered resolution ${item.id}`);
  assert(resolution?.subject === item.subject, `${item.id} resolution subject must be ${item.subject}`);
  assert(resolution?.version_disposition === 'adopt', `${item.id} must be adopted for clean v0.6.3`);
  assert(resolution?.evidence?.includes('https://github.com/tymonius/Gauntlet/pull/571'), `${item.id} resolution must cite PR #571`);
  for (const snippet of item.ruleSnippets) {
    assert(resolution?.rule?.includes(snippet), `${item.id} resolution rule missing ${JSON.stringify(snippet)}`);
  }

  const governing = registryById.get(item.id);
  assert(governing, `governance registry missing ${item.id}`);
  assert(governing?.status === 'canonicalized', `${item.id} governance record must be canonicalized`);
  assert(Array.isArray(governing?.subjects) && governing.subjects.length === 1 && governing.subjects[0] === item.subject, `${item.id} governance subject drifted`);
  assert(governing?.evidence?.includes('https://github.com/tymonius/Gauntlet/pull/571'), `${item.id} governance record must cite PR #571`);
  for (const snippet of item.summarySnippets) {
    assert(governing?.summary?.includes(snippet), `${item.id} governance summary missing ${JSON.stringify(snippet)}`);
  }

  const laterForSubject = (registry.decisions ?? []).filter((decision) =>
    decision.id !== item.id &&
    Array.isArray(decision.subjects) &&
    decision.subjects.includes(item.subject) &&
    typeof decision.recorded_on === 'string' &&
    decision.recorded_on > '2026-08-12' &&
    decision.status !== 'superseded'
  );
  assert(laterForSubject.length === 0, `${item.subject} has a later active governance decision that must be resolved explicitly: ${laterForSubject.map((decision) => decision.id).join(', ')}`);
}

const oldArmistice = registryById.get('GNT-DEC-2026-0730-005');
const currentArmistice = registryById.get('GNT-DEC-2026-0812-001');
assert(oldArmistice?.status === 'superseded', 'the earlier post-Draw Armistice decision must remain superseded');
assert(currentArmistice?.supersedes_decision_ids?.includes('GNT-DEC-2026-0730-005'), 'current Armistice decision must explicitly supersede the post-Draw decision');

assert(lifecycle.current_release === 'v0.6.1', 'v0.6.1 must remain current/public during reconstruction');
assert(lifecycle.releases?.['v0.6.2']?.status === 'withdrawn', 'v0.6.2 must remain withdrawn');
assert(lifecycle.releases?.['v0.6.3']?.status === 'withdrawn', 'v0.6.3 must remain withdrawn');

if (!process.exitCode) {
  console.log('Recovered clean v0.6.3 late decisions validated: Armistice, Manifest Destiny, and Contingency Plan are pinned to PR #571; publication remains locked.');
}
