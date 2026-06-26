import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { applyGameAction } from './index';
import { createValidSetup } from './test-helpers';

function createGame(): GameState {
  return initializeGame(createValidSetup({
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
  }));
}

describe('automatic win evaluation', () => {
  it('sets the winner automatically after moving into the opponent Heartland through the public state API', () => {
    const game = createGame();
    const heartlandAdjacent: GameState = {
      ...game,
      phase: 'movement',
      players: {
        ...game.players,
        player_1: {
          ...game.players.player_1,
          occupiedSpaceId: 'space-5',
        },
      },
      board: {
        ...game.board,
        spaces: game.board.spaces.map((space) => {
          if (space.id === 'player_1-heartland') return { ...space, occupant: undefined };
          if (space.id === 'space-5') return { ...space, occupant: 'player_1' };
          return space;
        }),
      },
    };

    const won = applyGameAction(heartlandAdjacent, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'player_2-heartland',
    }).state;

    expect(won.winner).toBe('player_1');
    expect(won.phase).toBe('game_over');
    expect(won.priorityPlayer).toBe('player_1');
  });
});
