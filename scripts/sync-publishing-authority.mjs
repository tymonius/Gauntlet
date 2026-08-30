import fs from 'node:fs';
import path from 'node:path';
import { loadPublishingAuthority, ROOT, synchronizePublishingFactMarkers } from './publishing-authority.mjs';

const mode = process.argv.includes('--write') ? 'write' : 'check';
const authority = await loadPublishingAuthority();

const targets = [
  {
    path: 'rulebook/player-facing/current-rulebook.md',
    expectedCounts: {
      'publisher.line': 1,
      'publisher.parent_line': 1,
      'imprint.statement': 1,
      'copyright.notice': 1,
    },
  },
  {
    path: 'README.md',
    expectedCounts: {
      'publisher.line': 1,
      'publisher.parent_line': 1,
      'copyright.notice': 1,
    },
  },
];

let changed = false;
for (const target of targets) {
  const absolute = path.join(ROOT, target.path);
  const source = fs.readFileSync(absolute, 'utf8');
  const synchronized = synchronizePublishingFactMarkers(source, authority, target.expectedCounts);
  if (!synchronized.changes.length) continue;

  changed = true;
  if (mode === 'write') {
    fs.writeFileSync(absolute, synchronized.output);
    console.log(`Synchronized publishing facts in ${target.path}.`);
  } else {
    console.error(`Publishing facts are stale in ${target.path}:`);
    for (const change of synchronized.changes) {
      console.error(`- ${change.id}: "${change.current}" -> "${change.expected}"`);
    }
  }
}

if (changed && mode === 'check') process.exitCode = 1;
if (!changed) console.log('Publishing authority is synchronized.');


const currentRulebookPath = path.join(ROOT, 'rulebook/player-facing/current-rulebook.md');
const currentRulebook = fs.readFileSync(currentRulebookPath, 'utf8');
const expectedLogoReference = `../../${authority.imprint.logo}`;
if (!currentRulebook.includes(`![TDS Games publisher mark](${expectedLogoReference})`)) {
  console.error('Current Rulebook must include the configured TDS Games publisher mark.');
  process.exitCode = 1;
}

const frozenV070Path = path.join(ROOT, 'releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md');
const frozenV070 = fs.readFileSync(frozenV070Path, 'utf8');
if (/TDS Games|Misty Hollow Enterprises/.test(frozenV070)) {
  console.error('Frozen v0.7.0 Rulebook must retain its original pre-TDS publishing identity.');
  process.exitCode = 1;
} else {
  console.log('Frozen v0.7.0 publishing identity remains unchanged.');
}
