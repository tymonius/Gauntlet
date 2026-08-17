import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const lifecycle = JSON.parse(fs.readFileSync('config/release-lifecycle.json', 'utf8'));
const legacyCurrentPath = 'v0.6.3-reconstructed';
const legacyV062Path = 'releases/v0.6.2/';
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

const frozenOrHistorical = (path) =>
  path.startsWith('docs/recovery/') ||
  path.startsWith('artifacts/reconstruction/') ||
  path.startsWith('artifacts/v0.6.3/') ||
  path.startsWith('publication/v0.6.3/');

const frozenPrintCandidateScripts = new Set([
  'scripts/render-v063-print-candidate.mjs',
  'scripts/validate-v063-print-candidate.mjs',
]);

const explicitCompatibilityInfrastructure = new Set([
  '.github/workflows/pr-quality-gate.yml',
  '.github/workflows/release-history-integrity.yml',
  'config/release-lifecycle.json',
  'scripts/build-v063-rulebook-production.py',
  'scripts/validate-current-public-contract.mjs',
  'scripts/validate-release-path-normalization.mjs',
  'tests/reconstruction-publication-closeout.test.ts',
]);

const allowedLegacyReference = (path) =>
  explicitCompatibilityInfrastructure.has(path) || frozenOrHistorical(path);

const allowedRetiredV063FilenameReference = (path) =>
  path === 'scripts/validate-release-path-normalization.mjs' ||
  path.startsWith('releases/v0.6.3-withdrawn/') ||
  frozenPrintCandidateScripts.has(path) ||
  frozenOrHistorical(path);

function gitObject(relative) {
  return execFileSync('git', ['rev-parse', `HEAD:${String(relative).replace(/^\/+|\/+$/g, '')}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function assertAliasParity(version) {
  const release = lifecycle.releases?.[version];
  assert(release, `Missing lifecycle entry for ${version}.`);
  const aliases = release.legacy_package_aliases ?? [];
  if (!aliases.length) return;

  const authorityPath = release.status === 'current'
    ? release.current_package_path
    : release.historical_package_path;
  assert(authorityPath, `${version} declares compatibility aliases but no authority package path.`);
  const authorityTree = gitObject(authorityPath);

  for (const alias of aliases) {
    assert.equal(
      gitObject(alias),
      authorityTree,
      `${version} compatibility alias ${alias} drifted from authority package ${authorityPath}.`,
    );
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
  const unexpected = matches.filter((match) => !allowed(match.path));
  if (!unexpected.length) return;
  const detail = unexpected.map((match) => `${match.path}:${match.line}: ${match.text.trim()}`).join('\n');
  throw new Error(`${label} remains in active/unclassified repository content:\n${detail}`);
}

assertAliasParity('v0.6.2');
assertAliasParity('v0.6.3');

const legacyMatches = grepLiteral(legacyCurrentPath);
rejectUnexpected('Legacy reconstructed-package path', legacyMatches, allowedLegacyReference);

// The former v0.6.2 package path is intentionally retained as a byte-identical
// compatibility alias. Existing historical scripts, pages, and external URLs may
// continue to read it without breakage; authority remains the explicit -withdrawn
// path recorded in release lifecycle metadata. Current public surfaces are checked
// separately and are forbidden from treating v0.6.2 as current authority.
const legacyV062Matches = grepLiteral(legacyV062Path);

let retiredFilenameMatches = 0;
for (const filename of retiredV063PackageFiles) {
  const matches = grepLiteral(filename);
  retiredFilenameMatches += matches.length;
  rejectUnexpected(`Retired original-v0.6.3 package filename ${filename}`, matches, allowedRetiredV063FilenameReference);
}

console.log(
  `Release-path normalization passed: compatibility aliases match their lifecycle authority packages; ` +
  `${legacyMatches.length} legacy v0.6.3 reconstructed-path reference(s) are classified; ` +
  `${legacyV062Matches.length} legacy v0.6.2 path reference(s) remain URL-safe through exact-tree aliasing; ` +
  `${retiredFilenameMatches} retired original-v0.6.3 filename reference(s) are confined to frozen/withdrawn provenance surfaces.`,
);
