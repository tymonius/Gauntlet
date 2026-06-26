import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import { applyGameAction } from './reducer';
import { createValidSetup } from './test-helpers';
import { toPrivateGameView, toPublicGameView } from './views';

function createActionReadyGame() {
  const game = initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: ['card-attrition', 'card-fortifications', 'card-valor', 'p1-card-4'],
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

  return applyGameAction(game, { type: 'draw_card', playerId: 'player_1', count: 3 }).state;
}

describe('legal Action play affordances', () => {
  it('exposes playable Action cards with destination previews to the active player only', () => {
    const actionReady = createActionReadyGame();

    expect(toPrivateGameView(actionReady, 'player_1').legalActionPlays).toEqual([
      {
        action: 'play_action_card',
        cardId: 'card-attrition',
        origin: 'hand',
        destination: 'condition',
        requiresTarget: false,
      },
      {
        action: 'play_action_card',
        cardId: 'card-fortifications',
        origin: 'hand',
        destination: 'asset_bank',
        requiresTarget: false,
      },
    ]);
    expect(toPrivateGameView(actionReady, 'player_2').legalActionPlays).toBeUndefined();
    expect(toPublicGameView(actionReady).legalActionPlays).toBeUndefined();
  });

  it('does not expose Action plays outside Action phases', () => {
    const actionReady = createActionReadyGame();
    const movementPhase = { ...actionReady, phase: 'movement' as const };

    expect(toPrivateGameView(movementPhase, 'player_1').legalActionPlays).toBeUndefined();
  });

  it('does not expose Action plays after the player has spent their action', () => {
    const actionReady = createActionReadyGame();
    const played = applyGameAction(actionReady, { type: 'play_action_card', playerId: 'player_1', cardId: 'card-attrition' }).state;

    expect(toPrivateGameView(played, 'player_1').legalActionPlays).toBeUndefined();
  });
});
