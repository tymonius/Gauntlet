import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const RULE_HEADING = '### Choosing among options';
const ACCEPTED_RULE = 'When a rule or effect requires a choice, choose from the options that are actually available. If no valid option is available, that choice is ignored.';

async function read(path) {
  return readFile(path, 'utf8');
}

test('current and published v0.7.1 rulebooks define the accepted available-choice rule', async () => {
  const [current, published] = await Promise.all([
    read('rulebook/player-facing/current-rulebook.md'),
    read('releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md'),
  ]);

  for (const source of [current, published]) {
    expect(source).toContain(RULE_HEADING);
    expect(source).toContain(ACCEPTED_RULE);
  }
});

test('Penance and Property Dues rely on the shared choice rule instead of card-specific exceptions', async () => {
  const data = JSON.parse(await read('game-data/current-game.json'));
  const cards = data.gameplay?.cards || data.cards || [];
  const find = id => cards.find(card => card.id === id);
  const penance = find('inquisition-penance');
  const propertyDues = find('financiers-property-dues');

  expect(penance).toBeTruthy();
  expect(propertyDues).toBeTruthy();
  expect(JSON.stringify(penance)).toContain('The opponent chooses one:');
  expect(JSON.stringify(propertyDues)).toContain('choose one:');
  expect(JSON.stringify(penance)).not.toContain('if able');
  expect(JSON.stringify(propertyDues)).not.toContain('if able');
});
