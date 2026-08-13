import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const factionPaths = [
  'factions/military/index.html',
  'factions/diplomats/index.html',
  'factions/financiers/index.html',
  'factions/intelligence/index.html',
  'factions/mystics/index.html',
  'factions/inquisition/index.html',
];

describe('restored v0.6.1 public faction overviews', () => {
  test('use the v0.6.1 root tools rather than withdrawn-release routes', () => {
    for (const path of factionPaths) {
      const html = read(path);
      expect(html).toContain('href="../../rulebook/"');
      expect(html).toContain('href="../../deckbuilder/"');
      expect(html).toContain('Unpublished playtest project.');
      expect(html).not.toContain('href="../../v0.6.2/rulebook/"');
      expect(html).not.toContain('href="../../v0.6.2/deckbuilder/"');
      expect(html).not.toContain('Current playtest edition: v0.6.2.');
    }
  });

  test('keeps Military Leader Orders visibly assigned to the correct Leader', () => {
    const html = read('factions/military/index.html');
    const general = html.slice(html.indexOf('id="general"'), html.indexOf('id="commandant"'));
    const commandant = html.slice(html.indexOf('id="commandant"'));

    for (const order of ['Onward', 'Rally', 'Rout']) expect(general).toContain(order);
    for (const order of ['Entrench', 'Repel', 'Fortify']) expect(commandant).toContain(order);
    for (const order of ['Entrench', 'Repel', 'Fortify']) expect(general).not.toContain(order);
  });

  test('keeps the restored homepage construction wording and v0.6.1 identity', () => {
    const homepage = read('index.html');
    expect(homepage).toContain('Current canonical playtest edition · v0.6.1');
    expect(homepage).toContain('build a deck of at least 30 cards within 60 value');
    expect(homepage).not.toContain('Current canonical playtest edition · v0.6.2');
  });

  test('keeps historical v0.6.1 synchronization away from current faction pages', () => {
    const historicalSync = read('scripts/sync_v061_public_rules.py');
    const historicalPaths = historicalSync.slice(
      historicalSync.indexOf('HISTORICAL_PATHS'),
      historicalSync.indexOf('CURRENT_FACTION_PATHS'),
    );

    expect(historicalPaths).not.toContain('factions/');
    expect(historicalSync).toContain('must never rewrite current faction pages');
  });
});
