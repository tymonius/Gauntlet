import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { createValidSetup } from './test-helpers';
import { checkWinConditions, evaluateWinConditions } from './win';

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

describe('win condition evaluation', () => {
  it('does not report a winner while players occupy their own Heartlands', () => {
    expect(checkWinConditions(createGame())).toBeUndefined();
  });

  it('reports Heartland victory when a player occupies the opponent Heartland', () => {
    const game = createGame();
    const heartlandInvaded: GameState = {
      ...game,
      board: {
        ...game.board,
        spaces: game.board.spaces.map((space) => {
          if (space.id === 'player_1-heartland') return { ...space, occupant: undefined };
          if (space.id === 'player_2-heartland') return { ...space, occupant: 'player_1' };
          return space;
        }),
      },
    };

    expect(checkWinConditions(heartlandInvaded)).toEqual({
      winner: 'player_1',
      defeatedPlayer: 'player_2',
      reason: 'opponent_heartland_occupied',
      spaceId: 'player_2-heartland',
    });
  });

  it('applies Heartland victory to the game state', () => {
    const game = createGame();
    const heartlandInvaded: GameState = {
      ...game,
      phase: 'battle',
      priorityPlayer: 'player_2',
      pendingAssetBankDiscards: {
        player_2: {
          playerId: 'player_2',
          limit: 0,
          discardCount: 1,
          options: ['asset-1'],
        },
      },
      board: {
        ...game.board,
        spaces: game.board.spaces.map((space) => {
          if (space.id === 'player_1-heartland') return { ...space, occupant: undefined };
          if (space.id === 'player_2-heartland') return { ...space, occupant: 'player_1' };
          return space;
        }),
      },
    };

    const result = evaluateWinConditions(heartlandInvaded);

    expect(result?.winner).toBe('player_1');
    expect(heartlandInvaded.winner).toBe('player_1');
    expect(heartlandInvaded.phase).toBe('game_over');
    expect(heartlandInvaded.priorityPlayer).toBe('player_1');
    expect(heartlandInvaded.pendingAssetBankDiscards).toBeUndefined();
  });
});
