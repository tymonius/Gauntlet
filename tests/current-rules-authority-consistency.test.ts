import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('current rules authority consistency', () => {
  it('keeps v0.7.1 faction summaries aligned with current-game card data', () => {
    const game = JSON.parse(read('game-data/current-game.json'));
    const rulebook = read('rulebook/player-facing/current-rulebook.md');

    const labels: Record<string, string> = {
      Military: 'Military',
      Diplomats: 'Diplomat',
      Financiers: 'Financier',
      Intelligence: 'Intelligence',
      Mystics: 'Mystics',
      Inquisition: 'Inquisition',
    };

    for (const [faction, singular] of Object.entries(labels)) {
      const count = game.gameplay.cards.filter((card: { allegiance?: string }) => card.allegiance === faction).length;
      expect(count, faction).toBe(15);
      expect(rulebook, faction).toContain(`| Faction pool | ${count} ${singular} card titles. |`);
    }

    const mysticsCards = game.gameplay.cards.filter((card: { allegiance?: string }) => card.allegiance === 'Mystics');
    expect(mysticsCards).toHaveLength(15);
    expect(mysticsCards.every((card: { trait?: string | null }) => card.trait === 'Arcane')).toBe(true);
    expect(rulebook).toContain('All fifteen Mystics cards have the Arcane trait.');

    expect(rulebook).toContain('| Unique card | Plenipotentiary, cost 4; maximum one copy per Deck. |');
    expect(rulebook).toContain('| Unique card | Martyrdom, cost 5; maximum one copy per Deck. |');
  });

  it('uses Ritual of Ascension consistently in current authority', () => {
    const gameText = read('game-data/current-game.json');
    const game = JSON.parse(gameText);
    const rulebook = read('rulebook/player-facing/current-rulebook.md');

    expect(gameText).not.toContain('Ritual of Ascendance');
    expect(rulebook).not.toContain('Ritual of Ascendance');
    expect(game.mystics.ritual.name).toBe('Ritual of Ascension');
    expect(game.gameplay.factions.find((faction: { id?: string }) => faction.id === 'mystics').victory)
      .toContain('Ritual of Ascension');
    expect(rulebook).toContain('Ritual of Ascension');
  });

  it('corrects the remaining v0.7.0 publication drift during materialization', async () => {
    const { applyV070CanonicalCorrections, applyV070RulebookCorrections } =
      await import('../rulebook/player-facing/v070-corrections.js');

    const sourceRulebook = read('releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md');
    const correctedRulebook = applyV070RulebookCorrections(sourceRulebook);
    expect(correctedRulebook).toContain('Ritual of Ascension');
    expect(correctedRulebook).not.toContain('Ritual of Ascendance');
    expect(correctedRulebook).toContain('| Unique card | Martyrdom, cost 5; maximum one copy per Deck. |');
    expect(correctedRulebook).toContain('| Unique card | Plenipotentiary, cost 4; maximum one copy per Deck. |');
    expect(correctedRulebook).toContain('| Faction pool | 15 Military card titles. |');
    expect(correctedRulebook).toContain('| Faction pool | 15 Diplomat card titles. |');
    expect(correctedRulebook).toContain('| Faction pool | 15 Financier card titles. |');
    expect(correctedRulebook).toContain('| Faction pool | 15 Intelligence card titles. |');
    expect(correctedRulebook).toContain('| Faction pool | 15 Mystics card titles. |');
    expect(correctedRulebook).toContain('| Faction pool | 15 Inquisition card titles. |');
    expect(correctedRulebook).toContain('All fifteen Mystics cards have the Arcane trait.');
    expect(correctedRulebook).not.toMatch(/\| Faction pool \| 13 /);
    expect(correctedRulebook).not.toContain('All thirteen Mystics cards');

    const sourceCanonical = JSON.parse(read('releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json'));
    const correctedCanonical = applyV070CanonicalCorrections(sourceCanonical);
    expect(correctedCanonical.gameplay.factions.find((faction: { id?: string }) => faction.id === 'mystics').victory)
      .toContain('Ritual of Ascension');

    const expectedCounts: Record<string, number> = {
      Neutral: 52,
      Military: 15,
      Diplomats: 15,
      Financiers: 15,
      Intelligence: 15,
      Mystics: 15,
      Inquisition: 15,
    };
    for (const [allegiance, count] of Object.entries(expectedCounts)) {
      expect(correctedCanonical.gameplay.card_pool_summary[allegiance].count).toBe(count);
      expect(correctedCanonical.gameplay.card_pool_summary[allegiance].total_value).toBe(
        correctedCanonical.gameplay.cards
          .filter((card: { allegiance?: string }) => card.allegiance === allegiance)
          .reduce((total: number, card: { cost?: number }) => total + Number(card.cost || 0), 0)
      );
    }
    for (const faction of correctedCanonical.gameplay.factions) {
      expect(faction.card_count).toBe(expectedCounts[faction.name]);
    }
    expect(correctedCanonical.gameplay.card_pool_summary.Diplomats.unique).toEqual(['Plenipotentiary']);
  });
});
