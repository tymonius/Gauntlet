import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const directory = path.join(root, 'artifacts/v0.6.3/player-facing');
const files = [
  'Gauntlet_v0.6.3_Rulebook_Candidate.md',
  'Gauntlet_v0.6.3_First_Game_Guide_Candidate.md',
  'Gauntlet_v0.6.3_Reference_Guide_Candidate.md',
  'Gauntlet_v0.6.3_Returning_Player_Changes_Candidate.md',
];

for (const name of files) {
  const target = path.join(directory, name);
  let text = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  let previous;
  do {
    previous = text;
    text = text
      .replace(/^(#{1,6} .+)\n\n\1$/gm, '$1')
      .replace(/---\n\n(#{1,6} .+)\n\n---\n\n\1/g, '---\n\n$1');
  } while (text !== previous);
  fs.writeFileSync(target, text.replace(/\s+$/, '') + '\n', 'utf8');
}

console.log('Normalized v0.6.3 player-facing candidate structure.');
