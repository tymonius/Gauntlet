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

    const sourceCanonical = JSON.parse(read('releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json'));
    const correctedCanonical = applyV070CanonicalCorrections(sourceCanonical);
    expect(correctedCanonical.gameplay.factions.find((faction: { id?: string }) => faction.id === 'mystics').victory)
      .toContain('Ritual of Ascension');
  });
});
