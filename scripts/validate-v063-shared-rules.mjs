import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ledgerPath = 'docs/Gauntlet_v0.6.3_Implementation_Ledger.md';
const candidatePath = 'docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md';
const matrixPath = 'docs/Gauntlet_v0.6.3_Shared_Rules_Test_Matrix.md';

const ledger = readFileSync(ledgerPath, 'utf8');
const candidate = readFileSync(candidatePath, 'utf8');
const matrix = readFileSync(matrixPath, 'utf8');

const requiredCandidateText = [
  'Place each Player Token on the Territory at that player\'s end of the Gauntlet.',
  'does not count as entering the Territory',
  'Shuffle the remaining cards in your Deck to form your Draw Pile.',
  'Draw four cards, choose one card from those four, and place it face up in your Discard Pile.',
  'After seeing your opening Hand and opening discard, secretly arrange your three Territory Cards',
  'After both players have chosen their opening discard and arranged their Territories',
  'A player runs the Gauntlet and wins immediately when that player either captures the Territory at the opponent\'s end of the Gauntlet or wins the opponent\'s Last Stand.',
  'The advancing player does not need to control or have captured the final Territory before initiating the Last Stand.',
  'The attacker must receive another movement sequence from a rule or effect.',
  'Any legal immediate capture of the final Territory can win.',
  'Before you commit cards to a battle, look beyond your Hand.',
  "DON'T FORGET THE BOARD"
];

for (const text of requiredCandidateText) {
  assert(candidate.includes(text), `Missing required v0.6.3 candidate text: ${text}`);
}

const requiredLedgerText = [
  'After choosing the opening discard and seeing the resulting three-card opening Hand, each player secretly arranges their three Territories.',
  'This preserves the information-order principle adopted for testing in issue #487',
  'Both are running the Gauntlet.',
  'Do not create a victory-only exception',
  'the **General** can exploit follow-up movement',
  'the **Commandant** can exploit immediate-capture effects',
  'the v0.6.3 First Game Guide / Learn to Play material teaches the battle-start Territory-and-Assets habit',
  'the published v0.6.2 package remains unchanged.'
];

for (const text of requiredLedgerText) {
  assert(ledger.includes(text), `Missing required v0.6.3 ledger text: ${text}`);
}

const forbiddenCandidateText = [
  'Place each token immediately before the Territory',
  'Each player draws three cards.',
  'Place the remaining card face down beneath the Draw Pile',
  'requires the opponent\'s final Territory to be controlled',
  'the normal way to win is to run the Gauntlet and win the final Last Stand battle',
  'Playable Deck'
];

for (const text of forbiddenCandidateText) {
  assert(!candidate.toLowerCase().includes(text.toLowerCase()), `Obsolete wording remains in v0.6.3 candidate: ${text}`);
}

assert(!matrix.includes('Playable Deck'), 'Obsolete Playable Deck terminology remains in the v0.6.3 normative test matrix');

const ids = [...matrix.matchAll(/### (V063-S\d{2})\b/g)].map((match) => match[1]);
assert.equal(ids.length, 50, `Expected 50 normative v0.6.3 scenarios, found ${ids.length}`);
assert.equal(new Set(ids).size, 50, 'Duplicate v0.6.3 scenario IDs found');

const expectedIds = Array.from({ length: 50 }, (_, index) => `V063-S${String(index + 1).padStart(2, '0')}`);
assert.deepEqual(ids, expectedIds, 'v0.6.3 scenario IDs must be sequential from V063-S01 through V063-S50');

const requiredMatrixText = [
  'Territory arrangement follows opening selection',
  'Territory ordering uses opening information',
  'Opening selection precedes initiative',
  'Capture route is running the Gauntlet',
  'Last Stand route is running the Gauntlet',
  'Immediate-capture ability wins',
  'Prior control not required',
  'Separate movement sequence required',
  'Published v0.6.2 remains immutable'
];

for (const text of requiredMatrixText) {
  assert(matrix.includes(text), `Missing required v0.6.3 matrix coverage: ${text}`);
}

if (process.env.GITHUB_BASE_REF) {
  const baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
  const changedFiles = execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);

  const modifiesV063SharedRuleSources = changedFiles.some((path) =>
    [ledgerPath, candidatePath, matrixPath].includes(path)
  );

  if (modifiesV063SharedRuleSources) {
    const modifiedV062ReleaseFiles = changedFiles.filter((path) => path.startsWith('releases/v0.6.2/'));
    assert.deepEqual(
      modifiedV062ReleaseFiles,
      [],
      `v0.6.3 shared-rule source changes must not modify immutable v0.6.2 release files: ${modifiedV062ReleaseFiles.join(', ')}`
    );
  }
}

console.log('v0.6.3 shared-rule source validation passed: 50 scenarios, informed Territory arrangement, Deck terminology, opening rules, Run the Gauntlet routes, battle reminder, and v0.6.2 boundary verified.');
