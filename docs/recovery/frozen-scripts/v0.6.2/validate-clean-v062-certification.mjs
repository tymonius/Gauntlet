import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PLAN_PATH = 'config/reconstruction-version-plan.json';
const MANIFEST_PATH = 'artifacts/reconstruction/clean-v0.6.2/certification/authority-set.json';
const REVIEW_PATH = 'artifacts/reconstruction/clean-v0.6.2/certification/semantic-certification.md';
const RULEBOOK_PATH = 'artifacts/reconstruction/clean-v0.6.2/rulebook/Gauntlet_v0.6.2_Rulebook.md';
const FACTION_ROOT = 'artifacts/reconstruction/clean-v0.6.2/faction-guides';
const LIFECYCLE_PATH = 'config/release-lifecycle.json';

const factions = [
  { chapter: 13, slug: 'military', label: 'Military', file: 'Gauntlet_v0.6.2_Military_Faction_Guide.md' },
  { chapter: 14, slug: 'diplomat', label: 'Diplomats', file: 'Gauntlet_v0.6.2_Diplomat_Faction_Guide.md' },
  { chapter: 15, slug: 'financier', label: 'Financiers', file: 'Gauntlet_v0.6.2_Financier_Faction_Guide.md' },
  { chapter: 16, slug: 'intelligence', label: 'Intelligence', file: 'Gauntlet_v0.6.2_Intelligence_Faction_Guide.md' },
  { chapter: 17, slug: 'mystics', label: 'Mystics', file: 'Gauntlet_v0.6.2_Mystics_Faction_Guide.md' },
  { chapter: 18, slug: 'inquisition', label: 'Inquisition', file: 'Gauntlet_v0.6.2_Inquisition_Faction_Guide.md' },
];
const expectedAuthorityPaths = [
  RULEBOOK_PATH,
  ...factions.map(({ slug, file }) => `${FACTION_ROOT}/${slug}/${file}`),
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const readJson = (rel) => JSON.parse(read(rel));
const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
const fail = (message) => {
  console.error(`clean-v062-certification: ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

function normalizeIntegratedFaction(text) {
  return text
    .replaceAll('Do not create immediate or additional Action Opportunities or Action Windows.', 'Do not create additional Action phases or implicit same-phase Action permissions.')
    .replaceAll('Do not create immediate or additional Action phases or Action Windows.', 'Do not create additional Action phases or implicit same-phase Action permissions.')
    .replaceAll('Action Windows', 'Action phases')
    .replaceAll('Action Window', 'Action phase')
    .replaceAll('Action windows', 'Action phases')
    .replaceAll('Action window', 'Action phase')
    .replaceAll('using the Front Line rules in Section 6.', 'using the Front Line rules in Chapter 8.')
    .replaceAll('Follow the Action rules in Section 2.', 'Follow the Action rules in Chapter 5.')
    .replaceAll('The pending-battle and Terms procedure in Section 4 occurs before the battle reaches Onset.', 'The pending-battle and Terms procedure in Chapter 7 occurs before the battle reaches Onset.')
    .replaceAll('During an Denouement', 'During Denouement')
    .replaceAll('during an Denouement', 'during Denouement')
    .replace('### How it works\n', '## How it works\n')
    .replace('### Complete rules\n', '## Complete rules\n')
    .replace('### Faction Actions\n', '## Faction Actions\n');
}

function factionChapter({ chapter, slug, label, file }) {
  const guide = read(`${FACTION_ROOT}/${slug}/${file}`);
  const start = guide.search(/^# 1\. /m);
  const canonical = guide.search(/^# \d+\. Canonical /m);
  if (start < 0 || canonical < 0 || canonical <= start) {
    fail(`cannot isolate authority sections for ${label}`);
    return '';
  }
  const body = guide.slice(start, canonical).trimEnd();
  const lines = body.split('\n');
  const rendered = [];
  let firstTop = true;
  for (const line of lines) {
    const top = /^# \d+\. (.+)$/.exec(line);
    if (top) {
      if (firstTop) {
        rendered.push(`# ${chapter}. ${label}`);
        firstTop = false;
      } else {
        rendered.push(`## ${top[1]}`);
      }
      continue;
    }
    if (line.startsWith('### ')) {
      rendered.push(`#${line}`);
      continue;
    }
    if (line.startsWith('## ')) {
      rendered.push(`#${line}`);
      continue;
    }
    rendered.push(line);
  }
  return normalizeIntegratedFaction(rendered.join('\n').trimEnd());
}

for (const required of [PLAN_PATH, MANIFEST_PATH, REVIEW_PATH, RULEBOOK_PATH, LIFECYCLE_PATH, ...expectedAuthorityPaths.slice(1)]) {
  assert(fs.existsSync(path.join(ROOT, required)), `missing required certification input ${required}`);
}
if (process.exitCode) process.exit();

const plan = readJson(PLAN_PATH);
const manifest = readJson(MANIFEST_PATH);
const lifecycle = readJson(LIFECYCLE_PATH);
const v062 = plan.targets?.['clean-v0.6.2'];
const v063 = plan.targets?.['clean-v0.6.3'];

assert(plan.publication_unlocked === false, 'publication must remain locked');
assert(v062?.status === 'authority_certified', 'clean v0.6.2 must be marked authority_certified');
assert(v063?.status === 'authority_build_approved', 'clean v0.6.3 must be marked authority_build_approved');
assert(v063?.authority_build_unlocked === true, 'clean v0.6.3 authority build must be unlocked');
assert(v063?.authority_base === 'clean-v0.6.2', 'clean v0.6.3 must derive from clean v0.6.2');
assert(v063?.unlock?.basis === 'certified_clean_v0.6.2_authority', 'clean v0.6.3 unlock basis is wrong');
assert(v063?.unlock?.publication_unlocked === false, 'clean v0.6.3 unlock must not unlock publication');

assert(manifest.schema_version === 1, 'unexpected certification manifest schema');
assert(manifest.target === 'clean-v0.6.2', 'certification target must be clean-v0.6.2');
assert(manifest.status === 'certified_on_merge', 'certification manifest must be certified_on_merge');
assert(manifest.authority_base === 'v0.6.1', 'certified authority base must be v0.6.1');
assert(manifest.publication_unlocked === false, 'certification manifest may not unlock publication');
assert(manifest.clean_v063_authority_build_unlocked_on_merge === true, 'manifest must unlock only clean v0.6.3 authority construction on merge');
assert(manifest.approvals?.faction_authority_pr === 609, 'manifest must pin PR #609');
assert(manifest.approvals?.faction_authority_merge_commit === 'ded1206b7bd9a83b4d32ce3f2ef063ee609d8461', 'manifest must pin PR #609 merge commit');
assert(manifest.approvals?.rulebook_authority_pr === 611, 'manifest must pin PR #611');
assert(manifest.approvals?.rulebook_authority_merge_commit === '5c8181c9a70af9dfdcd8b91153c80b6b6943e52e', 'manifest must pin PR #611 merge commit');
assert(v062?.certification?.authority_set_id === manifest.authority_set_id, 'version plan and certification manifest authority-set IDs must match');
assert(v063?.unlock?.authority_set_id === manifest.authority_set_id, 'v0.6.3 unlock must pin the same authority-set ID');

const manifestPaths = manifest.authority_files?.map((entry) => entry.path) ?? [];
assert(JSON.stringify(manifestPaths) === JSON.stringify(expectedAuthorityPaths), 'certification must bind exactly the Rulebook plus six faction guides in canonical order');

const recomputedEntries = expectedAuthorityPaths.map((file) => {
  const text = read(file);
  return {
    path: file,
    sha256: sha256(text),
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: text.split('\n').length,
  };
});
for (let i = 0; i < recomputedEntries.length; i += 1) {
  const expected = recomputedEntries[i];
  const recorded = manifest.authority_files?.[i];
  assert(recorded?.path === expected.path, `manifest path mismatch at authority index ${i}`);
  assert(recorded?.sha256 === expected.sha256, `SHA-256 mismatch for ${expected.path}`);
  assert(recorded?.bytes === expected.bytes, `byte-count mismatch for ${expected.path}`);
  assert(recorded?.lines === expected.lines, `line-count mismatch for ${expected.path}`);
}
const recomputedSetId = sha256(recomputedEntries.map((entry) => `${entry.path}:${entry.sha256}`).join('\n'));
assert(manifest.authority_set_id === recomputedSetId, 'authority-set ID does not match the seven certified files');

const rulebook = read(RULEBOOK_PATH);
for (const faction of factions) {
  const expected = factionChapter(faction);
  assert(rulebook.includes(expected), `Rulebook Part III drifted from the certified ${faction.label} guide after approved integration normalization`);
}

for (const forbidden of [
  'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Rulebook.md',
  'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
]) {
  assert(manifest.forbidden_authority_sources?.includes(forbidden), `manifest must quarantine ${forbidden}`);
  assert(!manifestPaths.includes(forbidden), `forbidden historical source entered the certified authority set: ${forbidden}`);
}

assert(rulebook.includes('**Version 0.6.2 — Clean Reconstruction Candidate**'), 'certified Rulebook version marker missing');
assert(rulebook.includes('Place the fourth card face down beneath the Draw Pile.'), 'v0.6.2 opening bottom-deck rule missing');
assert(rulebook.includes('**Capture → Draw → Opening → Movement → Denouement → Cleanup**'), 'v0.6.2 turn sequence missing');
assert(rulebook.includes('**Pending battle → Terms → Onset → Gambits**'), 'v0.6.2 pre-battle sequence missing');
assert(rulebook.includes('**Defensive Edge:** When the defender has Defensive Edge, the defender wins tied battle totals.'), 'Defensive Edge missing');
assert(rulebook.includes('Each player rolls one die. Do not apply advantage, disadvantage, card effects, numerical modifiers, or the previous battle totals.'), 'unmodified Tiebreak Roll missing');
assert(rulebook.includes("A player's **Front Line** is the complete unbroken sequence of Territories they control beginning at their own end of the Gauntlet."), 'Front Line definition missing');
assert(rulebook.includes("Capturing the opponent's final Territory is necessary but does not by itself win the game in v0.6.2."), 'cumulative v0.6.2 victory rule missing');
assert(!rulebook.includes('Second Line'), 'v0.6.3 Second Line title leaked into certified v0.6.2');
assert(!rulebook.includes("Smuggler's Run"), 'v0.6.3 Smuggler title leaked into certified v0.6.2');

const leaders = [
  '### General', '### Commandant', '### Ambassador', '### Senator', '### Banker', '### Executive',
  '### Ranger', '### Spymaster', '### Alchemist', '### Spirit Walker', '### Grand Inquisitor', '### Witch Hunter',
];
for (const leader of leaders) assert(rulebook.includes(leader), `certified Rulebook missing Leader ${leader}`);

const review = read(REVIEW_PATH);
assert(review.includes('certified on manual merge of this certification PR'), 'semantic certification approval effect missing');
assert(review.includes('publication remains separately locked'), 'semantic certification must preserve publication lock');

assert(lifecycle.current_release === 'v0.6.1', 'v0.6.1 must remain current/public');
assert(lifecycle.releases?.['v0.6.2']?.status === 'withdrawn', 'historical v0.6.2 package must remain withdrawn');
assert(lifecycle.releases?.['v0.6.3']?.status === 'withdrawn', 'historical v0.6.3 package must remain withdrawn');

if (!process.exitCode) {
  console.log(`Clean v0.6.2 authority set certified and pinned as ${manifest.authority_set_id}; clean v0.6.3 authority construction is unlocked; publication remains locked.`);
}
