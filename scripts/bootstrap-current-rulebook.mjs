import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyReleaseCandidateRulebook } from '../rulebook/release-candidate.js';
import { applyFactionFeatureTerminology } from '../rulebook/faction-feature-terminology.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readText = relative => readFile(resolve(ROOT, relative), 'utf8').then(text => text.replace(/\r\n/g, '\n'));
const readJson = relative => readText(relative).then(JSON.parse);

function replaceChapter11(source, chapter11) {
  const startMarker = '# 11. Detailed Card and Timing Rules';
  const endMarker = '# 12. Overlays and Other Shared Card Rules';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error('Current Rulebook bootstrap could not locate Chapter 11 boundaries.');
  const replacement = chapter11.trim();
  if (!replacement.startsWith(startMarker)) throw new Error('Player-facing Chapter 11 source has the wrong heading.');
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

function insertCardAnatomy(source, anatomy) {
  const marker = '## Printed card effects';
  if (!source.includes(marker)) throw new Error('Current Rulebook bootstrap could not locate Printed card effects.');
  if (source.includes('## Card anatomy')) throw new Error('Current Rulebook bootstrap found Card anatomy already inserted.');
  return source.replace(marker, `${anatomy.trim()}\n\n${marker}`);
}

const [baseRulebook, manifest, proposals, arcaneSymbol, ruleChanges, chapter11, cardAnatomy] = await Promise.all([
  readText('releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md'),
  readJson('game-data/current-game.json'),
  readJson('docs/v0.6.4-diplomat-proposals.json'),
  readJson('docs/v0.6.4-arcane-symbol.json'),
  readJson('docs/v0.6.4-rules.json'),
  readText('rulebook/player-facing/chapter-11.md'),
  readText('rulebook/player-facing/card-anatomy.md'),
]);

const currentGame = {
  ...manifest,
  proposals: proposals.proposals || [],
  arcaneSymbol,
  ruleChanges,
};

let currentRulebook = applyReleaseCandidateRulebook(baseRulebook, currentGame);

// #903 was authored before the Terms rule source itself adopted Faction Feature.
// Normalize this one already-migrated sentence only for the one-time bootstrap;
// the committed current Rulebook becomes the maintained source after this script.
currentRulebook = currentRulebook.replace(
  'Terms are a Diplomat Faction Feature marked No Action, resolved during Onset',
  'Terms are a Diplomat faction procedure resolved during Onset',
);
currentRulebook = applyFactionFeatureTerminology(currentRulebook);
currentRulebook = replaceChapter11(currentRulebook, chapter11);
currentRulebook = insertCardAnatomy(currentRulebook, cardAnatomy);

const forbidden = [
  /\bFaction Actions?\b/u,
  /\bFaction Abilit(?:y|ies)\b/u,
  /\bfaction procedure\b/iu,
  /\bpending(?:-|\s+)battle\b/iu,
];
for (const pattern of forbidden) {
  if (pattern.test(currentRulebook)) throw new Error(`Current Rulebook bootstrap left retired terminology: ${pattern}.`);
}
if (!currentRulebook.includes('# 5. Actions, Faction Features, Leader Abilities, and Assets')) {
  throw new Error('Current Rulebook bootstrap did not install the Faction Feature chapter.');
}
if (!currentRulebook.includes('## Card anatomy')) {
  throw new Error('Current Rulebook bootstrap did not install Card anatomy.');
}

await writeFile(resolve(ROOT, 'rulebook/player-facing/current-rulebook.md'), `${currentRulebook.trim()}\n`);
console.log('Materialized rulebook/player-facing/current-rulebook.md from the accepted current-development rules.');
