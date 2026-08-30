import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  findV063LastStandTerminologyViolations,
  normalizeV063LastStandOnlyText,
} from '../rules-assistant/v063-last-stand-language.js';

const root = process.cwd();
const RULEBOOK_SHA256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
const CANONICAL_SHA256 = '641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c';

const targets = [
  'docs/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md',
  'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md',
  'docs/Gauntlet_v0.6.3_Implementation_Ledger.md',
  'docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md',
  'docs/Gauntlet_v0.6.3_Shared_Rules_Test_Matrix.md',
  'index.html',
  'start/index.html',
  'factions/military/index.html',
  'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md',
  'releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json',
  'rules-assistant/rules-deterministic-v063.js',
  'scripts/build-clean-v063-publication-release.mjs',
  'scripts/generate-v063-canonical-data-candidate.mjs',
  'artifacts/reconstruction/v0.6.3-browser-candidate/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json',
];

const certifiedInputs = [
  ['artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md', RULEBOOK_SHA256],
  ['artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json', CANONICAL_SHA256],
];

function filePath(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(filePath(relativePath), 'utf8').replace(/\r\n/g, '\n');
}

function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath(relativePath))).digest('hex');
}

function reportViolations(relativePath, text) {
  const violations = findV063LastStandTerminologyViolations(text);
  for (const violation of violations) {
    const prefix = text.slice(0, violation.index);
    const line = prefix.split('\n').length;
    console.error(`${relativePath}:${line}: ${violation.label}: ${JSON.stringify(violation.match)}`);
  }
  return violations.length;
}

function requireText(relativePath, needle, label = needle) {
  const text = read(relativePath);
  if (!text.includes(needle)) {
    console.error(`${relativePath}: missing required ${label}`);
    return 1;
  }
  return 0;
}

function requireOrder(relativePath, first, second, label) {
  const text = read(relativePath);
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) {
    console.error(`${relativePath}: ${label}`);
    return 1;
  }
  return 0;
}

let failures = 0;

for (const relativePath of targets) {
  const original = read(relativePath);
  const normalized = normalizeV063LastStandOnlyText(original);
  if (normalized !== original) {
    console.error(`${relativePath}: contains v0.6.3 Last Stand wording that the shared PR #171 transform would change`);
    failures += 1;
  }
  failures += reportViolations(relativePath, original);
}

// Certified reconstruction evidence stays byte-for-byte immutable. Publication
// may normalize its terminology only after these exact bytes are verified.
for (const [relativePath, expectedHash] of certifiedInputs) {
  const actualHash = sha256(relativePath);
  if (actualHash !== expectedHash) {
    console.error(`${relativePath}: certified hash drifted: ${actualHash}`);
    failures += 1;
  }
  failures += reportViolations(`${relativePath} (after publication transform)`, normalizeV063LastStandOnlyText(read(relativePath)));
}

for (const [relativePath, required] of [
  ['docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md', 'force the opponent to make a Last Stand and win the resulting battle'],
  ['releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md', 'The resulting contest is a Last Stand battle.'],
  ['releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json', 'force the opponent to make a Last Stand'],
]) {
  failures += requireText(relativePath, required, `PR #171 terminology: ${JSON.stringify(required)}`);
}

// The current Browser Rulebook consumes its published release authority
// directly. Historical v0.6.3 publication transforms remain confined to the
// archived v0.6.3 corpus and publication tooling.
failures += requireText('rulebook/app.js', 'RELEASE_MANIFEST_URL', 'published release-manifest binding');
failures += requireText('rulebook/app.js', 'manifest?.binding_sources?.rulebook', 'manifest Rulebook binding');
failures += requireOrder(
  'rulebook/app.js',
  'const { rulebook, sourceUrl } = await loadReleaseManifest();',
  'if (actualHash !== rulebook.sha256)',
  'Rulebook must load its published binding before verifying the published source hash.',
);
failures += requireText('rulebook/app.js', 'return new TextDecoder().decode(bytes);', 'direct published Rulebook rendering');
failures += requireText('rules-assistant/v063-public-corpus.js', 'normalizeV063LastStandValue', 'structured Last Stand normalizer');
failures += requireOrder(
  'rules-assistant/v063-public-corpus.js',
  'validateV063Inputs({ rulebookMarkdown, canonicalData });',
  'const publishedRulebookMarkdown = publicRulebookSource(rulebookMarkdown);',
  'Rules Arbiter must validate certified inputs before applying publication terminology.',
);

// Publication owns semantic artifacts, not the version-controlled live UI.
const coreBuilder = read('scripts/build-clean-v063-publication-core-web.mjs');
for (const forbidden of ["prune('rulebook'", "prune('card-reference'"]) {
  if (coreBuilder.includes(forbidden)) {
    console.error(`scripts/build-clean-v063-publication-core-web.mjs: must not regenerate current web presentation (${forbidden}).`);
    failures += 1;
  }
}
const arbiterBuilder = read('scripts/build-clean-v063-publication-arbiter-web.mjs');
if (arbiterBuilder.includes("prune('rules-arbiter'")) {
  console.error('scripts/build-clean-v063-publication-arbiter-web.mjs: must not regenerate current Rules Arbiter presentation.');
  failures += 1;
}
failures += requireText('scripts/publication-utils.mjs', 'normalizeV063LastStandText', 'shared text publication normalizer');
failures += requireText('scripts/publication-utils.mjs', 'normalizeV063LastStandValue', 'shared structured publication normalizer');

if (failures) {
  console.error(`v0.6.3 Last Stand terminology validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('Validated PR #171 Last Stand terminology, certified authority integrity, post-verification publication transforms, and live-UI publication boundaries.');
