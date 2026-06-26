import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { applyGameAction } from './index';
import { createValidSetup } from './test-helpers';

function createPipelineGame(): GameState {
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

function withPlayerOneThreateningEnemyTerritory(): GameState {
  const game = createPipelineGame();

  return {
    ...game,
    phase: 'movement',
    players: {
      ...game.players,
      player_1: {
        ...game.players.player_1,
        occupiedSpaceId: 'space-3',
      },
    },
    board: {
      ...game.board,
      spaces: game.board.spaces.map((space) => {
        if (space.id === 'player_1-heartland') return { ...space, occupant: undefined };
        if (space.id === 'space-3') return { ...space, occupant: 'player_1' };
        return space;
      }),
    },
  };
}

describe('turn-start pipeline', () => {
  it('confirms pending captures when turn priority returns to the capturing player', () => {
    const pending = applyGameAction(withPlayerOneThreateningEnemyTerritory(), {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-4',
    }).state;
    const playerTwoTurn = applyGameAction(pending, { type: 'end_turn', playerId: 'player_1' }).state;
    const playerOneTurnStart = applyGameAction(playerTwoTurn, { type: 'end_turn', playerId: 'player_2' }).state;

    expect(playerOneTurnStart.phase).toBe('turn_start');
    expect(playerOneTurnStart.board.spaces.find((space) => space.id === 'space-4')?.controller).toBe('player_1');
    expect(playerOneTurnStart.players.player_1.controlledTerritories).toContain('p2-territory-3');
  });

  it('stops at turn start if capture confirmation creates a required Asset Bank discard choice', () => {
    const loadedBank: GameState = {
      ...withPlayerOneThreateningEnemyTerritory(),
      players: {
        ...withPlayerOneThreateningEnemyTerritory().players,
        player_2: {
          ...withPlayerOneThreateningEnemyTerritory().players.player_2,
          zones: {
            ...withPlayerOneThreateningEnemyTerritory().players.player_2.zones,
            assetBank: ['asset-1', 'asset-2', 'asset-3'],
          },
        },
      },
    };
    const pending = applyGameAction(loadedBank, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-4',
    }).state;
    const playerTwoTurn = applyGameAction(pending, { type: 'end_turn', playerId: 'player_1' }).state;
    const blockedAtTurnStart = applyGameAction(playerTwoTurn, { type: 'end_turn', playerId: 'player_2' }).state;

    expect(blockedAtTurnStart.phase).toBe('turn_start');
    expect(blockedAtTurnStart.priorityPlayer).toBe('player_2');
    expect(blockedAtTurnStart.pendingAssetBankDiscards?.player_2?.discardCount).toBe(1);
  });

  it('allows draw to advance from turn start after automatic start-of-turn work is clear', () => {
    const game = createPipelineGame();
    const drawn = applyGameAction(game, { type: 'draw_card', playerId: 'player_1' }).state;

    expect(drawn.phase).toBe('action_before_movement');
    expect(drawn.players.player_1.zones.hand.length).toBeGreaterThan(0);
  });
});
