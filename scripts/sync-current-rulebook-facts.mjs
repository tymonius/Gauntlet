import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, loadCurrentGameAuthority } from './current-game-authority.mjs';
import {
  synchronizeRuleFactMarkers,
  validateKnownRulebookClaims,
} from '../rulebook/player-facing/rule-facts.js';

const RULEBOOK = resolve(ROOT, 'rulebook/player-facing/current-rulebook.md');
const write = process.argv.includes('--write');

const [authority, source] = await Promise.all([
  loadCurrentGameAuthority(),
  readFile(RULEBOOK, 'utf8').then(value => value.replace(/\r\n/g, '\n')),
]);

const { output, changes, facts } = synchronizeRuleFactMarkers(source, authority);

if (write) {
  if (changes.length) {
    await writeFile(RULEBOOK, output);
    console.log(`Updated ${changes.length} tracked Rulebook fact occurrence(s).`);
    for (const change of changes) {
      console.log(`- ${change.id}: ${change.current} -> ${change.expected}`);
    }
  } else {
    console.log('Tracked Rulebook facts are already synchronized.');
  }
  validateKnownRulebookClaims(output, authority);
} else {
  if (changes.length) {
    const detail = changes
      .map(change => `${change.id}: ${change.current} -> ${change.expected}`)
      .join('\n- ');
    throw new Error(
      `Current Rulebook contains stale tracked facts. Run npm run rules:facts:sync.\n- ${detail}`,
    );
  }
  validateKnownRulebookClaims(source, authority);
  console.log(
    `Current Rulebook fact contract passed (${Object.keys(facts).length} structured facts; ` +
    `${Object.values(facts).join(', ')}).`,
  );
}
