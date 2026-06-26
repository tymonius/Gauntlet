import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import { applyGameAction, GameActionError } from './reducer';
import { createValidSetup } from './test-helpers';

describe('Action card framework', () => {
  it('plays Attrition as an Action into Conditions and spends the action', () => {
    const game = initializeGame(createValidSetup({
      players: [
        {
          id: 'player_1',
          name: 'Player One',
          deck: ['card-attrition', 'p1-card-2', 'p1-card-3', 'p1-card-4'],
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
    const actionPhase = applyGameAction(game, { type: 'draw_card', playerId: 'player_1' }).state;
    const played = applyGameAction(actionPhase, { type: 'play_action_card', playerId: 'player_1', cardId: 'card-attrition' }).state;

    expect(played.players.player_1.zones.hand).not.toContain('card-attrition');
    expect(played.players.player_1.zones.conditions).toContain('card-attrition');
    expect(played.players.player_1.actionsRemaining).toBe(0);
    expect(played.players.player_1.hasPlayedActionThisTurn).toBe(true);
  });

  it('plays Fortifications as an Action into the Asset Bank', () => {
    const game = initializeGame(createValidSetup({
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
    const actionPhase = applyGameAction(game, { type: 'draw_card', playerId: 'player_1' }).state;
    const played = applyGameAction(actionPhase, { type: 'play_action_card', playerId: 'player_1', cardId: 'card-fortifications' }).state;

    expect(played.players.player_1.zones.assetBank).toContain('card-fortifications');
    expect(played.players.player_1.zones.hand).not.toContain('card-fortifications');
  });

  it('rejects Battle-only cards as Actions', () => {
    const game = initializeGame(createValidSetup({
      players: [
        {
          id: 'player_1',
          name: 'Player One',
          deck: ['card-valor', 'p1-card-2', 'p1-card-3', 'p1-card-4'],
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
    const actionPhase = applyGameAction(game, { type: 'draw_card', playerId: 'player_1' }).state;

    expect(() => applyGameAction(actionPhase, { type: 'play_action_card', playerId: 'player_1', cardId: 'card-valor' })).toThrow(GameActionError);
  });

  it('rejects a second card play after playing an Action card', () => {
    const game = initializeGame(createValidSetup({
      players: [
        {
          id: 'player_1',
          name: 'Player One',
          deck: ['card-attrition', 'card-fortifications', 'p1-card-3', 'p1-card-4'],
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
    const actionPhase = applyGameAction(game, { type: 'draw_card', playerId: 'player_1' }).state;
    const played = applyGameAction(actionPhase, { type: 'play_action_card', playerId: 'player_1', cardId: 'card-attrition' }).state;

    expect(() => applyGameAction(played, { type: 'play_action_card', playerId: 'player_1', cardId: 'card-fortifications' })).toThrow(GameActionError);
  });
});
