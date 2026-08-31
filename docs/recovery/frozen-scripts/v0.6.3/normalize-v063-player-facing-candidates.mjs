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
    text = replaceRequired(
      text,
      '- **Resource:** Capital; begin with 2 for the v0.6.2 test.',
      '- **Resource:** Capital; begin with 2.',
      'First Game Financier starting Capital'
    );
    text = replaceRequired(
      text,
      'The published Deckbuilder and `/start/` flow use this release\'s canonical data and starter catalog.',
      'The v0.6.3 development Deckbuilder and `/v0.6.3/start/` flow use the v0.6.3 candidate data and adapted starter catalog.',
      'First Game starter browser boundary'
    );
    text = replaceRequired(
      text,
      `For the v0.6.2 release:\n\n1. The Official Rulebook and specific component text govern play.\n2. \`Gauntlet_v0.6.2_Starter_Decks.json\` governs the twelve recommended starter compositions.\n3. This document governs first-game and tableside presentation.\n4. v0.6.1 remains available as an immutable historical release package.`,
      `For the v0.6.3 release candidate:\n\n1. The v0.6.3 Rulebook candidate and specific component text govern candidate play and review.\n2. \`Gauntlet_v0.6.3_Starter_Decks.json\` governs the twelve recommended starter compositions in the assembled source candidate.\n3. This document governs v0.6.3 first-game and tableside candidate presentation.\n4. v0.6.2 remains the immutable published playtest release until the publication cutover is completed.`,
      'First Game authority and release boundary'
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

console.log('Normalized v0.6.3 player-facing candidate structure, Action summaries, section numbering, current Financier starting-Capital wording, and First Game release boundary.');
