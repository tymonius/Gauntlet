import type { InitializeGameInput } from './initialize';

export function createValidSetup(overrides: Partial<InitializeGameInput> = {}): InitializeGameInput {
  return {
    id: 'test-game',
    version: '0.5.6',
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: ['p1-card-1', 'p1-card-2', 'p1-card-3', 'p1-card-4'],
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: ['p2-card-1', 'p2-card-2', 'p2-card-3', 'p2-card-4'],
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
    ...overrides,
  };
}
