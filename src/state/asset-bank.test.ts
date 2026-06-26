import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import { applyGameAction, GameActionError } from './reducer';
import { createValidSetup } from './test-helpers';

function createAssetGame() {
  return initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: ['card-fortifications', 'p1-card-2', 'p1-card-3', 'p1-card-4'],
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

describe('Asset Bank enforcement', () => {
  it('rejects banking Fortifications when the Asset Bank is full', () => {
    const game = createAssetGame();
    const actionPhase = {
      ...game,
      phase: 'action_before_movement' as const,
      players: {
        ...game.players,
        player_1: {
          ...game.players.player_1,
          controlledTerritories: [],
        },
      },
    };

    expect(() => applyGameAction(actionPhase, { type: 'play_action_card', playerId: 'player_1', cardId: 'card-fortifications' }))
      .toThrow(GameActionError);
  });

  it('banks Fortifications while capacity remains', () => {
    const game = createAssetGame();
    const actionPhase = { ...game, phase: 'action_before_movement' as const };
    const played = applyGameAction(actionPhase, { type: 'play_action_card', playerId: 'player_1', cardId: 'card-fortifications' }).state;

    expect(played.players.player_1.zones.assetBank).toEqual(['card-fortifications']);
    expect(played.players.player_1.zones.discard).not.toContain('card-fortifications');
  });

  it('discards down to the current Asset Bank limit at end of turn', () => {
    const game = createAssetGame();
    const overLimit = {
      ...game,
      phase: 'action_after_movement' as const,
      players: {
        ...game.players,
        player_1: {
          ...game.players.player_1,
          controlledTerritories: ['p1-territory-1'],
          zones: {
            ...game.players.player_1.zones,
            assetBank: ['card-fortifications', 'asset-extra'],
          },
        },
      },
    };

    const ended = applyGameAction(overLimit, { type: 'end_turn', playerId: 'player_1' }).state;

    expect(ended.players.player_1.zones.assetBank).toEqual(['card-fortifications']);
    expect(ended.players.player_1.zones.discard).toContain('asset-extra');
  });
});
