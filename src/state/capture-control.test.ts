import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import { applyGameAction } from './reducer';
import { createValidSetup } from './test-helpers';

function createCaptureGame() {
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

function withPlayerOneThreateningEnemyTerritory() {
  const game = createCaptureGame();

  return {
    ...game,
    phase: 'movement' as const,
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
        if (space.id === 'space-3') return { ...space, occupant: 'player_1' as const };
        return space;
      }),
    },
  };
}

describe('Territory capture and control flow', () => {
  it('marks an enemy Territory pending capture when occupied', () => {
    const moved = applyGameAction(withPlayerOneThreateningEnemyTerritory(), {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-4',
    }).state;

    const capturedSpace = moved.board.spaces.find((space) => space.id === 'space-4');
    expect(capturedSpace?.controller).toBe('player_2');
    expect(capturedSpace?.capturePendingBy).toBe('player_1');
    expect(moved.players.player_1.controlledTerritories).not.toContain('p2-territory-3');
  });

  it('confirms pending captures at the start of the capturing player\'s next turn', () => {
    const pending = applyGameAction(withPlayerOneThreateningEnemyTerritory(), {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: 'space-4',
    }).state;
    const playerTwoTurn = applyGameAction(pending, { type: 'end_turn', playerId: 'player_1' }).state;
    const playerOneNextTurn = applyGameAction(playerTwoTurn, { type: 'end_turn', playerId: 'player_2' }).state;

    const capturedSpace = playerOneNextTurn.board.spaces.find((space) => space.id === 'space-4');
    expect(capturedSpace?.controller).toBe('player_1');
    expect(capturedSpace?.capturePendingBy).toBeUndefined();
    expect(playerOneNextTurn.players.player_1.controlledTerritories).toContain('p2-territory-3');
    expect(playerOneNextTurn.players.player_2.controlledTerritories).not.toContain('p2-territory-3');
  });

  it('clears a pending capture when the original controller retakes the Territory', () => {
    const game = createCaptureGame();
    const retakeReady = {
      ...game,
      activePlayer: 'player_2' as const,
      priorityPlayer: 'player_2' as const,
      phase: 'movement' as const,
      players: {
        ...game.players,
        player_2: {
          ...game.players.player_2,
          occupiedSpaceId: 'space-5',
        },
      },
      board: {
        ...game.board,
        spaces: game.board.spaces.map((space) => {
          if (space.id === 'player_2-heartland') return { ...space, occupant: undefined };
          if (space.id === 'space-5') return { ...space, occupant: 'player_2' as const };
          if (space.id === 'space-4') return { ...space, capturePendingBy: 'player_1' as const };
          return space;
        }),
      },
    };

    const retaken = applyGameAction(retakeReady, { type: 'move_player', playerId: 'player_2', toSpaceId: 'space-4' }).state;
    const retakenSpace = retaken.board.spaces.find((space) => space.id === 'space-4');

    expect(retakenSpace?.controller).toBe('player_2');
    expect(retakenSpace?.capturePendingBy).toBeUndefined();
  });

  it('creates an Asset Bank discard choice when capture reduces the losing player\'s bank limit', () => {
    const game = withPlayerOneThreateningEnemyTerritory();
    const loadedBank = {
      ...game,
      players: {
        ...game.players,
        player_2: {
          ...game.players.player_2,
          zones: {
            ...game.players.player_2.zones,
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
    const playerOneNextTurn = applyGameAction(playerTwoTurn, { type: 'end_turn', playerId: 'player_2' }).state;

    expect(playerOneNextTurn.pendingAssetBankDiscards?.player_2).toEqual({
      playerId: 'player_2',
      limit: 2,
      discardCount: 1,
      options: ['asset-1', 'asset-2', 'asset-3'],
    });
    expect(playerOneNextTurn.priorityPlayer).toBe('player_2');
  });
});
