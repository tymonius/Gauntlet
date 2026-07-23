import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { runPostActionAutomationPipeline } from './pipeline';
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

describe('post-action automation pipeline', () => {
  it('records turn-start automation and win-condition evaluation when unblocked', () => {
    const game = createGame();

    expect(runPostActionAutomationPipeline(game).steps).toEqual(['turn_start', 'intelligence_reconciliation', 'win_conditions']);
  });

  it('defers win-condition evaluation while Asset Bank discard choices are pending', () => {
    const game: GameState = {
      ...createGame(),
      pendingAssetBankDiscards: {
        player_1: {
          playerId: 'player_1',
          limit: 1,
          discardCount: 1,
          options: ['asset-1', 'asset-2'],
        },
      },
    };

    expect(runPostActionAutomationPipeline(game).steps).toEqual(['turn_start', 'intelligence_reconciliation']);
  });
});
