import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const HTML_SURFACES = [
  'v0.6.2/start/index.html',
  'v0.6.2/deckbuilder/index.html',
  'v0.6.2/reference/index.html',
];

const APP_SURFACES = [
  'v0.6.2/start/app.js',
  'v0.6.2/deckbuilder/app.js',
  'v0.6.2/reference/app.js',
];

describe('published v0.6.2 player surfaces', () => {
  test('identify v0.6.2 as published rather than a development candidate', () => {
    for (const path of HTML_SURFACES) {
      const text = read(path);
      expect(text).toContain('current canonical playtest edition');
      expect(text).not.toContain('v0.6.2 candidate');
      expect(text).not.toContain('development preview');
      expect(text).not.toContain('published v0.6.1 remains canonical');
      expect(text).not.toContain('Loading candidate data');
    }

    expect(read('v0.6.2/deckbuilder/index.html')).toContain('Published Deckbuilder');
    expect(read('v0.6.2/reference/index.html')).toContain('Published canonical reference');
  });

  test('loads canonical data and starter Decks from the immutable published release package', () => {
    for (const path of APP_SURFACES) {
      const text = read(path);
      expect(text).toContain('../../releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Canonical_Data.json');
      expect(text).not.toContain('../../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json');
      expect(text).not.toContain('loadV062CanonicalData(');
    }

    for (const path of ['v0.6.2/start/app.js', 'v0.6.2/deckbuilder/app.js']) {
      const text = read(path);
      expect(text).toContain('../../releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Starter_Decks.json');
      expect(text).not.toContain('Gauntlet_v0.6.2_Starter_Decks_Candidate.json');
    }
  });

  test('keeps custom construction at the actual minimum/maximum rule while starters remain exact 30/60', () => {
    const deckbuilder = read('v0.6.2/deckbuilder/app.js');
    expect(deckbuilder).toContain('if (count < 30)');
    expect(deckbuilder).toContain('if (value > 60)');
    expect(deckbuilder).toContain('Legal v0.6.2 Deck.');
    expect(deckbuilder).not.toContain('Legal v0.6.2 candidate Deck.');

    const changes = read('releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Returning_Player_Changes.md');
    expect(changes).toContain('at least 30 cards and no more than 60 total deckbuilding value');
    expect(changes).toContain('recommended starter Decks are exact 30-card, 60-value lists');
    expect(changes).not.toContain('A constructed Deck remains 30 cards with a total deckbuilding value of 60.');
  });
});
