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

describe('v0.6.2 public faction overviews', () => {
  test('send players to the published versioned tools', () => {
    for (const path of factionPaths) {
      const html = read(path);
      expect(html).toContain('· v0.6.2 faction guide');
      expect(html).toContain('href="../../v0.6.2/rulebook/"');
      expect(html).toContain('href="../../v0.6.2/deckbuilder/"');
      expect(html).toContain('Current playtest edition: v0.6.2.');
      expect(html).not.toContain('href="../../rulebook/"');
      expect(html).not.toContain('href="../../deckbuilder/"');
      expect(html).not.toContain('Unpublished pre-release playtest project.');
    }
  });

  test('uses the adopted Financier timing and contiguous-control result', () => {
    const html = read('factions/financiers/index.html');
    expect(html).toContain('Begin with 2 Capital.');
    expect(html).toContain('After Capture and its effects, but before Draw');
    expect(html).toContain('one Action during both Opening and Denouement');
    expect(html).toContain('A successful purchase advances your Front Line by one Territory, if able; it never creates isolated control.');
    expect(html).not.toContain('during an Action Opportunity after movement');
    expect(html).not.toContain('immediately gives you control');
  });

  test('uses Denouement for Intelligence Missions and adopted Inquisition Action timing', () => {
    const intelligence = read('factions/intelligence/index.html');
    expect(intelligence).toContain('later Denouement Faction Action to complete it');
    expect(intelligence).not.toContain('later Action Opportunity to complete it');

    const inquisition = read('factions/inquisition/index.html');
    expect(inquisition).toContain('Purge is a Faction Action during Opening or Denouement.');
    expect(inquisition).toContain('never two Actions in the same phase');
    expect(inquisition).toContain('no Opening or Denouement is inserted first');
    expect(inquisition).not.toContain('The first Action spent to Purge each turn grants 1 additional Action');
    expect(inquisition).not.toContain('no Action Opportunity occurs first');
  });

  test('states Front Line and Guardians effects without obsolete shorthand', () => {
    const military = read('factions/military/index.html');
    expect(military).toContain('Fortify advances your Front Line by one Territory');
    expect(military).not.toContain('Fortify captures enemy-controlled ground');

    const mystics = read('factions/mystics/index.html');
    expect(mystics).toContain('value at least 1 for the first Rite, 2 for the second, 3 for the third, or 4 for the Ritual');
  });

  test('keeps the homepage construction rule at minimum 30 and maximum 60', () => {
    const homepage = read('index.html');
    expect(homepage).toContain('build a Deck of at least 30 cards with no more than 60 total value');
    expect(homepage).not.toContain('build a 30-card Deck totaling 60 value');
  });
});
