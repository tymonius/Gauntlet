import { describe, expect, it } from 'vitest';
import { initializeGame } from '../state';
import { loadV06CanonicalContent, V06_RULES_VERSION } from './v06';

describe('v0.6 canonical content', () => {
  it('loads the finalized faction-era release and builds stable lookup indexes', () => {
    const canonical = loadV06CanonicalContent();

    expect(canonical.rulesVersion).toBe('v0.6.0');
    expect(canonical.content.factions).toHaveLength(6);
    expect(canonical.leadersByName).toHaveLength(12);
    expect(canonical.content.cards).toHaveLength(122);
    expect(canonical.content.territories).toHaveLength(25);
    expect(canonical.factionsById.get('military')?.leaders.map((leader) => leader.name)).toEqual([
      'General',
      'Commandant',
    ]);
    expect(canonical.leadersByName.get('Spirit Walker')?.factionId).toBe('mystics');
    expect(canonical.cardsById.get('neutral-rallying-cry')?.battle).toBe('Add +1 to your battle total.');
    expect(canonical.territoriesById.get('territory-arena-grand-melee')?.arena).toBe(true);
  });

  it('preserves the canonical rules version in initialized game state', () => {
    const game = initializeGame({
      version: V06_RULES_VERSION,
      shuffleDecks: false,
      players: [
        {
          id: 'player_1',
          name: 'Player One',
          deck: ['neutral-rallying-cry', 'neutral-new-recruits', 'neutral-forced-march'],
          territories: ['territory-quicksand', 'territory-garrison', 'territory-high-ground'],
        },
        {
          id: 'player_2',
          name: 'Player Two',
          deck: ['neutral-rallying-cry', 'neutral-new-recruits', 'neutral-forced-march'],
          territories: ['territory-watchtower', 'territory-supply-depot', 'territory-field-hospital'],
        },
      ],
    });

    expect(game.version).toBe(V06_RULES_VERSION);
  });
});
