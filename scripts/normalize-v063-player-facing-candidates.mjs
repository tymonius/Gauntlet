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

function replaceRequired(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Missing normalization marker: ${label}`);
  return text.replace(from, to);
}

function renumberTopLevelSections(text) {
  let number = 0;
  return text.replace(/^# \d+\. (.+)$/gm, (_, title) => `# ${++number}. ${title}`);
}

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

  if (name === 'Gauntlet_v0.6.3_Rulebook_Candidate.md') {
    text = replaceRequired(
      text,
      `An Action may be used to:\n\n- play one card from Hand for its **Action** effect;\n- take one legal **Faction Action**; or\n- discard one Asset you control.`,
      `An Action may be used to:\n\n- play one card from Hand for its **Action** effect;\n- bank one card from Hand using its inherent **Bank** Action if it has an Asset effect;\n- take one legal **Faction Action**; or\n- discard one of your Assets.`,
      'Rulebook Action summary'
    );
    text = renumberTopLevelSections(text);
  }

  if (name === 'Gauntlet_v0.6.3_First_Game_Guide_Candidate.md') {
    text = replaceRequired(
      text,
      `An Action may:\n\n- play a card for its Action effect;\n- take a legal Faction Action; or\n- discard one Asset the player controls.`,
      `An Action may:\n\n- play a card for its Action effect;\n- bank a card from Hand using its inherent Bank Action if it has an Asset effect;\n- take a legal Faction Action; or\n- discard one of the player's Assets.`,
      'First Game Action summary'
    );
    text = renumberTopLevelSections(text);
  }

  if (name === 'Gauntlet_v0.6.3_Reference_Guide_Candidate.md') {
    text = replaceRequired(
      text,
      `An Action may:\n\n- play one card for its **Action** effect;\n- take one legal **Faction Action**; or\n- discard one Asset you control.`,
      `An Action may:\n\n- play one card for its **Action** effect;\n- bank one card from Hand using its inherent **Bank** Action if it has an Asset effect;\n- take one legal **Faction Action**; or\n- discard one of your Assets.`,
      'Reference Action summary'
    );
  }

  fs.writeFileSync(target, text.replace(/\s+$/, '') + '\n', 'utf8');
}

console.log('Normalized v0.6.3 player-facing candidate structure, Action summaries, and section numbering.');
