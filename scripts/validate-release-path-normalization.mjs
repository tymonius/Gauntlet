import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const legacyCurrentPath = 'v0.6.3-reconstructed';
const withdrawnV062Path = 'releases/v0.6.2/';
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

const allowedLegacyReference = (path) =>
  path === 'config/release-lifecycle.json' ||
  path === 'scripts/validate-current-public-contract.mjs' ||
  path === 'scripts/validate-release-path-normalization.mjs' ||
  frozenOrHistorical(path);

const allowedWithdrawnV062Reference = (path) =>
  path === 'scripts/validate-release-path-normalization.mjs' ||
  frozenOrHistorical(path);

const allowedRetiredV063FilenameReference = (path) =>
  path === 'scripts/validate-release-path-normalization.mjs' ||
  path.startsWith('releases/v0.6.3-withdrawn/') ||
  frozenOrHistorical(path);

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

const legacyMatches = grepLiteral(legacyCurrentPath);
rejectUnexpected('Legacy reconstructed-package path', legacyMatches, allowedLegacyReference);

const withdrawnV062Matches = grepLiteral(withdrawnV062Path);
rejectUnexpected('Bare withdrawn v0.6.2 release path', withdrawnV062Matches, allowedWithdrawnV062Reference);

let retiredFilenameMatches = 0;
for (const filename of retiredV063PackageFiles) {
  const matches = grepLiteral(filename);
  retiredFilenameMatches += matches.length;
  rejectUnexpected(`Retired original-v0.6.3 package filename ${filename}`, matches, allowedRetiredV063FilenameReference);
}

console.log(
  `Release-path normalization passed: ${legacyMatches.length} legacy v0.6.3 reconstructed-path reference(s), ` +
  `${withdrawnV062Matches.length} bare withdrawn v0.6.2 path reference(s), and ${retiredFilenameMatches} retired original-v0.6.3 filename reference(s) ` +
  'are confined to explicit compatibility or frozen/withdrawn provenance surfaces.',
);
