import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { applyGameAction } from './reducer';
import { createValidSetup } from './test-helpers';

function createAttritionActionSetup(): GameState {
  return initializeGame(createValidSetup({
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: ['card-attrition', 'p1-card-2', 'p1-card-3', 'p1-battle-1', 'p1-battle-2', 'p1-battle-3'],
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: ['p2-card-1', 'p2-card-2', 'p2-card-3', 'p2-battle-1', 'p2-battle-2', 'p2-battle-3'],
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
  }));
}

function createAttritionBattleReadyGame(): GameState {
  const game = createAttritionActionSetup();

  return {
    ...game,
    phase: 'movement' as const,
    players: {
      ...game.players,
      player_1: {
        ...game.players.player_1,
        zones: {
          ...game.players.player_1.zones,
          assetBank: ['card-attrition'],
        },
      },
      player_2: {
        ...game.players.player_2,
        occupiedSpaceId: 'space-1',
      },
    },
    board: {
      ...game.board,
      spaces: game.board.spaces.map((space) => {
        if (space.id === 'space-1') return { ...space, occupant: 'player_2' as const };
        if (space.id === 'player_2-heartland') return { ...space, occupant: undefined };
        return space;
      }),
    },
  };
}

describe('Attrition Action Asset', () => {
  it('remains banked after the turn ends', () => {
    const actionPhase = applyGameAction(createAttritionActionSetup(), { type: 'draw_card', playerId: 'player_1' }).state;
    const played = applyGameAction(actionPhase, { type: 'play_action_card', playerId: 'player_1', cardId: 'card-attrition' }).state;
    const ended = applyGameAction(played, { type: 'end_turn', playerId: 'player_1' }).state;

    expect(played.players.player_1.zones.assetBank).toContain('card-attrition');
    expect(ended.players.player_1.zones.assetBank).toContain('card-attrition');
    expect(ended.players.player_1.zones.discard).not.toContain('card-attrition');
  });

  it("sends the losing opponent's played battle-drawn card to the Graveyard", () => {
    const battleStarted = applyGameAction(createAttritionBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1PassedHand = applyGameAction(battleStarted, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;
    const p2PassedHand = applyGameAction(p1PassedHand, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2PassedHand, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    const p2Drew = applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    const p1PassedDrawPlay = applyGameAction(p2Drew, { type: 'pass_battle_draw_play', playerId: 'player_1' }).state;
    const p2PlayedDraw = applyGameAction(p1PassedDrawPlay, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'p2-battle-1' }).state;
    const p1Rolled = applyGameAction(p2PlayedDraw, { type: 'roll_battle_die', playerId: 'player_1', value: 6 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 1 }).state;
    const resolved = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(resolved.players.player_2.zones.graveyard).toContain('p2-battle-1');
    expect(resolved.players.player_2.zones.discard).toContain('p2-battle-2');
    expect(resolved.players.player_2.zones.discard).toContain('p2-battle-3');
  });
});
