import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

JSON.parse(fs.readFileSync('config/release-lifecycle.json', 'utf8'));

const removedV063Root = 'releases/v0.6.3-reconstructed/';
const removedV062Root = 'releases/v0.6.2/';
const retiredPublicCandidatePaths = [
  'v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data_Candidate.json',
  'v0.6.3/data/starter-decks-candidate.js',
  'v0.6.3/deckbuilder/app.js',
  'v0.6.3/deckbuilder/starter-adapter.js',
  'v0.6.3/reference/app.js',
  'v0.6.3/rules-arbiter/app.js',
  'v0.6.3/styles.css',
];
const retiredV063PackageFiles = [
  'Gauntlet_v0.6.3_Active_Player_Marker.pdf',
  'Gauntlet_v0.6.3_Complete_Card_Reference.md',
  'Gauntlet_v0.6.3_Faction_Teaching_Cards.pdf',
  'Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
  'Gauntlet_v0.6.3_Faction_and_Component_Guide.pdf',
  'Gauntlet_v0.6.3_First_Game_Guide.md',
  'Gauntlet_v0.6.3_First_Game_Guide.pdf',
  'Gauntlet_v0.6.3_Formal_Playtest_Sheet.pdf',
  'Gauntlet_v0.6.3_Player_Mat.pdf',
  'Gauntlet_v0.6.3_Print_Manifest.json',
  'Gauntlet_v0.6.3_Reference_Guide.md',
  'Gauntlet_v0.6.3_Reference_Guide.pdf',
  'Gauntlet_v0.6.3_Release_Notes.md',
  'Gauntlet_v0.6.3_Returning_Player_Changes.md',
  'Gauntlet_v0.6.3_Returning_Player_Changes.pdf',
  'Gauntlet_v0.6.3_Tableside_Pack.pdf',
];

const frozenOrHistorical = (filePath) =>
  filePath.startsWith('docs/recovery/') ||
  filePath.startsWith('artifacts/reconstruction/') ||
  filePath.startsWith('artifacts/v0.6.3/') ||
  filePath.startsWith('publication/v0.6.3/') ||
  filePath === 'governance/traceability.json';

const frozenCandidateSurfaces = new Set([
  'card-design/generated/v0.6.3/long-card-review-catalog.js',
]);

// These scripts enforce phase-specific reconstruction/candidate states that
// intentionally predate publication. They are retained as provenance and are
// not current release tooling.
const frozenCandidateScripts = new Set([
  'scripts/build-clean-v063-downstream-data.mjs',
  'scripts/validate-clean-v063-downstream-data.mjs',
  'scripts/validate-reconstruction-version-plan.mjs',
  'scripts/build-v062-release.mjs',
  'scripts/build-v063-print-candidate-html.mjs',
  'scripts/build-v063-release-candidate.mjs',
  'scripts/validate-v063-release-candidate.mjs',
  'scripts/render-v063-print-candidate.mjs',
  'scripts/validate-v063-print-candidate.mjs',
  'scripts/build-v063-cross-surface-closeout.mjs',
  'scripts/validate-v063-cross-surface-closeout.mjs',
  'scripts/validate-v063-print-visual-regressions.mjs',
  'scripts/generate-v063-canonical-data-candidate.mjs',
  'scripts/generate-v063-player-facing-candidates.mjs',
  'scripts/generate-v063-production-card-preview.mjs',
  'scripts/validate-v063-canonical-data-candidate.mjs',
  'scripts/validate-v063-canonical-promotion-boundary.mjs',
  'scripts/validate-v063-shared-rules.mjs',
]);

// These current files intentionally name removed paths only to detect/reject
// their reintroduction. They must never read from or publish to those paths.
const removalGuards = new Set([
  '.github/workflows/pr-quality-gate.yml',
  '.github/workflows/release-history-integrity.yml',
  'scripts/validate-clean-v062-digital.mjs',
  'scripts/validate-clean-v063-rules-arbiter.mjs',
  'scripts/validate-current-public-contract.mjs',
  'scripts/validate-release-path-normalization.mjs',
]);

// This contract is evaluated at the historical v0.6.2 GitHub Release target
// commit, where the old package path genuinely existed. It is not a HEAD-time
// path dependency.
const historicalTargetContracts = new Set([
  'config/github-release-contract.json',
]);

const isPreRecoveryScript = (filePath) => filePath.endsWith('.pre-recovery.mjs');

const allowedRemovedV063Reference = (filePath) =>
  removalGuards.has(filePath) ||
  frozenCandidateScripts.has(filePath) ||
  frozenOrHistorical(filePath);

const allowedRemovedV062Reference = (filePath) =>
  removalGuards.has(filePath) ||
  historicalTargetContracts.has(filePath) ||
  frozenCandidateSurfaces.has(filePath) ||
  frozenCandidateScripts.has(filePath) ||
  isPreRecoveryScript(filePath) ||
  filePath.startsWith('releases/v0.6.2-withdrawn/') ||
  filePath.startsWith('releases/v0.6.3-withdrawn/') ||
  frozenOrHistorical(filePath);

const allowedRetiredV063FilenameReference = (filePath, text = '') =>
  filePath === 'scripts/validate-release-path-normalization.mjs' ||
  filePath.startsWith('releases/v0.6.3-withdrawn/') ||
  frozenCandidateScripts.has(filePath) ||
  frozenOrHistorical(filePath) ||
  text.includes('artifacts/v0.6.3/print-candidate/') ||
  text.includes('artifacts/v0.6.3/release-candidate/') ||
  (filePath === 'config/reconstruction-version-plan.json' && text.includes('releases/v0.6.3-withdrawn/'));

function pathExistsInHead(relative) {
  try {
    execFileSync('git', ['cat-file', '-e', `HEAD:${String(relative).replace(/^\/+|\/+$/g, '')}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function grepLiteral(needle) {
  try {
    const output = execFileSync(
      'git',
      ['grep', '-n', '-F', needle, 'HEAD', '--'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (!output) return [];
    return output.split(/\r?\n/).map((line) => {
      const match = line.match(/^HEAD:(.*?):(\d+):(.*)$/);
      assert(match, `Could not parse git grep result: ${line}`);
      return { path: match[1], line: Number(match[2]), text: match[3] };
    });
  } catch (error) {
    if (error?.status === 1) return [];
    throw error;
  }
}

function rejectUnexpected(label, matches, allowed) {
  const unexpected = matches.filter((match) => !allowed(match.path, match.text));
  if (!unexpected.length) return;
  const detail = unexpected.map((match) => `${match.path}:${match.line}: ${match.text.trim()}`).join('\n');
  throw new Error(`${label} remains in active/unclassified repository content:\n${detail}`);
}

assert.equal(pathExistsInHead(removedV062Root), false, `${removedV062Root} must not exist after release-path normalization.`);
assert.equal(pathExistsInHead(removedV063Root), false, `${removedV063Root} must not exist after release-path normalization.`);
for (const candidatePath of retiredPublicCandidatePaths) {
  assert.equal(pathExistsInHead(candidatePath), false, `${candidatePath} is retired candidate material and must not remain in the current-version public namespace.`);
}

const removedV063Matches = grepLiteral(removedV063Root);
rejectUnexpected('Removed reconstructed-package path', removedV063Matches, allowedRemovedV063Reference);

const removedV062Matches = grepLiteral(removedV062Root);
rejectUnexpected('Removed v0.6.2 package path', removedV062Matches, allowedRemovedV062Reference);

let retiredFilenameMatches = 0;
for (const filename of retiredV063PackageFiles) {
  const matches = grepLiteral(filename);
  retiredFilenameMatches += matches.length;
  rejectUnexpected(`Retired original-v0.6.3 package filename ${filename}`, matches, allowedRetiredV063FilenameReference);
}

console.log(
  `Release-path normalization passed: removed package roots and ${retiredPublicCandidatePaths.length} retired public candidate path(s) are absent; ` +
  `${removedV063Matches.length} old v0.6.3 reconstructed-path reference(s) are confined to removal guards/frozen provenance; ` +
  `${removedV062Matches.length} old v0.6.2 path reference(s) are confined to removal guards/historical targets/frozen provenance; ` +
  `${retiredFilenameMatches} retired original-v0.6.3 filename reference(s) are confined to frozen/withdrawn provenance surfaces.`,
);
