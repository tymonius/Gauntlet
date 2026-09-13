import { readFile, writeFile } from 'node:fs/promises';

const GUIDE = 'rulebook/player-guide/player-guide.md';
const CONTRACT = 'config/rules-surface-contract.json';

function replaceExact(text, before, after, label) {
  const first = text.indexOf(before);
  if (first === -1) throw new Error(`Missing expected ${label} text.`);
  if (text.indexOf(before, first + before.length) !== -1) {
    throw new Error(`Expected exactly one ${label} occurrence.`);
  }
  return text.slice(0, first) + after + text.slice(first + before.length);
}

let guide = await readFile(GUIDE, 'utf8');

guide = replaceExact(
  guide,
  'That is the shared game. Your faction adds one more layer—its own resource, tools, style of play, and sometimes another way to win. Learn the shared game first, then read the short guide for the faction you are playing.',
  'That is the shared game. Your faction adds one more layer—its own tools, resource or progression system, style of play, and sometimes another way to win. Learn the shared game first, then read the short guide for the faction you are playing.',
  'faction-layer description',
);

guide = replaceExact(
  guide,
  '- **Reaction** — play the card when the trigger or timing printed in its Reaction effect occurs. A Reaction does not spend your normal Action unless it specifically says that it does.',
  '- **Reaction** — use its directly permitted effect when the printed trigger occurs. A Reaction does not spend your normal Action unless it specifically says that it does; follow any printed source, timing, and destination.',
  'Reaction description',
);

guide = replaceExact(
  guide,
  '- **Fall Back** — move one position toward your own end.\n\nA **position** is a place your Player Token can occupy along the Gauntlet, including the spaces just beyond either end when the game pushes a player that far.',
  '- **Fall Back** — move one position toward your own end.\n\nYou cannot voluntarily Fall Back beyond your own end of the Gauntlet. If an effect grants additional movement, resolve it one position at a time; Player Tokens cannot move through or past one another.\n\nA **position** is a place your Player Token can occupy along the Gauntlet, including the spaces just beyond either end when the game pushes a player that far.',
  'movement legality reminder',
);

guide = replaceExact(
  guide,
  'That delay matters: your opponent gets a chance to drive you back before you turn battlefield position into permanent control.\n\n### Capture',
  'That delay matters: your opponent gets a chance to drive you back before you turn battlefield position into permanent control.\n\nIf the controller of a Territory initiates a battle against an opponent occupying that Territory, that battle is a **Counterattack**.\n\n### Capture',
  'Counterattack definition',
);

guide = replaceExact(
  guide,
  'Intelligence works through **Missions**. Completing ordinary Missions builds **Operation Progress** and earns **Intel**, while surveillance and interference tools help it learn about and disrupt the opponent\'s plans.',
  'Intelligence works through **Missions**. Completing ordinary Missions builds **Operation Progress** and earns **Intel**. At the start of each of its turns, an Intelligence player also gains Intel equal to their Operation Progress. Surveillance and interference tools help it learn about and disrupt the opponent\'s plans.',
  'Intelligence economy overview',
);

await writeFile(GUIDE, guide);

let contract = await readFile(CONTRACT, 'utf8');
contract = replaceExact(
  contract,
  '            "core.cards",\n            "core.components"',
  '            "core.cards",\n            "core.card-zones",\n            "core.components"',
  'cards-and-play-area dependencies',
);
contract = replaceExact(
  contract,
  '            "core.battle.reserve-size",\n            "core.battle.battle-total"',
  '            "core.battle.reserve-size",\n            "core.battle.reserve",\n            "core.battle.battle-total"',
  'battle dependencies',
);
contract = replaceExact(
  contract,
  '            "core.battlefield.front-line",\n            "core.battlefield.occupation"',
  '            "core.battlefield.front-line",\n            "core.battlefield.occupation",\n            "core.battlefield.counterattack"',
  'ground dependencies',
);
await writeFile(CONTRACT, contract);
