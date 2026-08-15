import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  findV063LastStandTerminologyViolations,
  normalizeV063LastStandText,
} from '../rules-assistant/v063-last-stand-language.js';

const root = process.cwd();
const write = process.argv.includes('--write');

// Current/adopted source and player-facing surfaces only. Certified reconstruction
// inputs and withdrawn/versioned release evidence are intentionally excluded.
const targets = [
  'docs/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md',
  'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md',
  'docs/Gauntlet_v0.6.3_Implementation_Ledger.md',
  'docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md',
  'docs/Gauntlet_v0.6.3_Shared_Rules_Test_Matrix.md',
  'index.html',
  'start/index.html',
  'factions/military/index.html',
  'releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.md',
  'releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Canonical_Data.json',
  'v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json',
];

const certifiedInputs = [
  'artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md',
  'artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json',
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
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

let failures = 0;

for (const relativePath of targets) {
  const original = read(relativePath);
  const normalized = normalizeV063LastStandText(original);

  if (write && normalized !== original) {
    fs.writeFileSync(path.join(root, relativePath), normalized, 'utf8');
    console.log(`Updated ${relativePath}`);
  } else if (!write && normalized !== original) {
    console.error(`${relativePath}: contains v0.6.3 Last Stand wording that the shared PR #171 transform would change`);
    failures += 1;
  }

  failures += reportViolations(relativePath, normalized);
}

// The certified clean-v0.6.3 inputs are immutable evidence. Prove that the same
// publication transform converts them into compliant current/public language,
// but never rewrite those files here.
for (const relativePath of certifiedInputs) {
  const normalized = normalizeV063LastStandText(read(relativePath));
  const count = reportViolations(`${relativePath} (after publication transform)`, normalized);
  if (count) failures += count;
}

const requiredAssertions = [
  [
    'docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md',
    'force the opponent to make a Last Stand and win the resulting battle',
  ],
  [
    'releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.md',
    'The resulting contest is a **Last Stand battle**.',
  ],
  [
    'releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Canonical_Data.json',
    'force the opponent to make a Last Stand',
  ],
];

for (const [relativePath, required] of requiredAssertions) {
  const text = normalizeV063LastStandText(read(relativePath));
  if (!text.includes(required)) {
    console.error(`${relativePath}: missing required PR #171 terminology: ${JSON.stringify(required)}`);
    failures += 1;
  }
}

if (failures) {
  console.error(`v0.6.3 Last Stand terminology validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(write
  ? 'Applied and validated PR #171 Last Stand terminology on current v0.6.3 surfaces.'
  : 'Validated PR #171 Last Stand terminology on current v0.6.3 surfaces.');
