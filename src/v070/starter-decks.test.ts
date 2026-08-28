import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import { V070_STARTER_DECK_SOURCE, v070StarterDecks } from './starter-decks';

describe('v0.7.0 released starter Decks', () => {
  test('binds all twelve released starter packages', () => {
    expect(V070_STARTER_DECK_SOURCE)
      .toBe('releases/v0.7.0/Gauntlet_v0.7.0_Starter_Decks.json');
    expect(v070StarterDecks.size).toBe(12);
  });

  test('provides exactly two starters for each faction', () => {
    const counts = new Map<string, number>();
    for (const starter of v070StarterDecks.values()) {
      counts.set(
        starter.definition.factionId,
        (counts.get(starter.definition.factionId) ?? 0) + 1,
      );
    }
    for (const faction of v070CanonicalContent.content.factions) {
      expect(counts.get(faction.id)).toBe(2);
    }
  });

  test('resolves every starter to 30 physical card copies and three Territories', () => {
    for (const starter of v070StarterDecks.values()) {
      const count = starter.cards.reduce((total, entry) => total + entry.quantity, 0);
      const value = starter.cards.reduce(
        (total, entry) => total + entry.card.cost * entry.quantity,
        0,
      );
      expect(count).toBe(30);
      expect(value).toBeLessThanOrEqual(60);
      expect(starter.territories).toHaveLength(3);
      expect(new Set(starter.territories.map(territory => territory.id)).size).toBe(3);
    }
  });

  test('includes current v0.7.0 additions and never the retired No Martyrs card', () => {
    const cardIds = [...v070StarterDecks.values()]
      .flatMap(starter => starter.cards.map(entry => entry.card.id));

    for (const id of [
      'military-war-witch',
      'diplomats-diplomatic-divination',
      'diplomats-plenipotentiary',
      'financiers-war-bonds',
      'intelligence-spectral-surveillance',
    ]) {
      expect(cardIds).toContain(id);
    }
    expect(cardIds).not.toContain('inquisition-no-martyrs');
  });
});
