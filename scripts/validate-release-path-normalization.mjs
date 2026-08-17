import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

JSON.parse(fs.readFileSync('config/release-lifecycle.json', 'utf8'));

const removedV063Root = 'releases/v0.6.3-reconstructed/';
const removedV062Root = 'releases/v0.6.2/';
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

// These scripts enforce phase-specific reconstruction/candidate states that
// intentionally predate publication. They are retained as provenance and are
// not current release tooling.
const frozenCandidateScripts = new Set([
  'scripts/build-clean-v063-downstream-data.mjs',
  'scripts/validate-clean-v063-downstream-data.mjs',
  'scripts/validate-reconstruction-version-plan.mjs',
  'scripts/build-v063-print-candidate-html.mjs',
  'scripts/build-v063-release-candidate.mjs',
  'scripts/validate-v063-release-candidate.mjs',
  'scripts/render-v063-print-candidate.mjs',
  'scripts/validate-v063-print-candidate.mjs',
  'scripts/build-v063-cross-surface-closeout.mjs',
  'scripts/validate-v063-cross-surface-closeout.mjs',
  'scripts/validate-v063-print-visual-regressions.mjs',
]);

const allowedRemovedV063Reference = (filePath) =>
  filePath === 'scripts/validate-release-path-normalization.mjs' ||
  frozenCandidateScripts.has(filePath) ||
  frozenOrHistorical(filePath);

const allowedRemovedV062Reference = (filePath) =>
  filePath === 'scripts/validate-release-path-normalization.mjs' ||
  filePath.startsWith('releases/v0.6.2-withdrawn/') ||
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
  `Release-path normalization passed: removed package roots are absent; ` +
  `${removedV063Matches.length} old v0.6.3 reconstructed-path reference(s) are confined to frozen provenance; ` +
  `${removedV062Matches.length} old v0.6.2 path reference(s) are confined to withdrawn/frozen provenance; ` +
  `${retiredFilenameMatches} retired original-v0.6.3 filename reference(s) are confined to frozen/withdrawn provenance surfaces.`,
);
