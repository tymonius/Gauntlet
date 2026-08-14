import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const lifecycle = JSON.parse(read('config/release-lifecycle.json'));
const currentVersion = String(lifecycle.current_release || '');
const factionPaths = [
  'factions/military/index.html',
  'factions/diplomats/index.html',
  'factions/financiers/index.html',
  'factions/intelligence/index.html',
  'factions/mystics/index.html',
  'factions/inquisition/index.html',
];

describe('current public faction overviews', () => {
  test('use the root current tools rather than versioned release routes', () => {
    for (const path of factionPaths) {
      const html = read(path);
      expect(html).toContain('href="../../rulebook/"');
      expect(html).toContain('href="../../deckbuilder/"');
      expect(html).not.toMatch(/href="\.\.\/\.\.\/(?:v\d|releases\/v)[^"]+\/(?:rulebook|deckbuilder)\//i);
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

  test('identifies the homepage with the lifecycle current release', () => {
    expect(currentVersion).not.toBe('');
    const homepage = read('index.html');
    expect(homepage).toContain(currentVersion);
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
