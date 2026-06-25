import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { applyGameAction } from './reducer';
import { createValidSetup } from './test-helpers';

function createBattleReadyGame(): GameState {
  const game = initializeGame(createValidSetup({
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

  return {
    ...game,
    phase: 'movement' as const,
    players: {
      ...game.players,
      player_2: {
        ...game.players.player_2,
        occupiedSpaceId: 'space-1',
      },
    },
    board: {
      ...game.board,
      spaces: game.board.spaces.map((space) => {
        if (space.id === 'space-1') return { ...space, controller: 'player_2' as const, occupant: 'player_2' as const };
        if (space.id === 'player_2-heartland') return { ...space, occupant: undefined };
        return space;
      }),
    },
  };
}

describe('Attrition battle effect', () => {
  it('sends losing opponent battle-drawn cards to Graveyard', () => {
    const battleStarted = applyGameAction(createBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1Committed = applyGameAction(battleStarted, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'card-attrition' }).state;
    const p2PassedHand = applyGameAction(p1Committed, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2PassedHand, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    const p2Drew = applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    const p1PassedPlay = applyGameAction(p2Drew, { type: 'pass_battle_draw_play', playerId: 'player_1' }).state;
    const p2Played = applyGameAction(p1PassedPlay, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'p2-battle-1' }).state;
    const p1Rolled = applyGameAction(p2Played, { type: 'roll_battle_die', playerId: 'player_1', value: 6 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 1 }).state;
    const resolved = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(resolved.players.player_1.zones.graveyard).toContain('card-attrition');
    expect(resolved.players.player_2.zones.graveyard).toEqual(['p2-battle-1', 'p2-battle-2', 'p2-battle-3']);
    expect(resolved.players.player_2.zones.discard).toEqual([]);
    expect(resolved.log.some((event) => event.type === 'effect_resolved')).toBe(true);
  });

  it('does not change destinations if the Attrition player loses', () => {
    const battleStarted = applyGameAction(createBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1Committed = applyGameAction(battleStarted, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'card-attrition' }).state;
    const p2PassedHand = applyGameAction(p1Committed, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2PassedHand, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    const p2Drew = applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    const p1PassedPlay = applyGameAction(p2Drew, { type: 'pass_battle_draw_play', playerId: 'player_1' }).state;
    const p2Played = applyGameAction(p1PassedPlay, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'p2-battle-1' }).state;
    const p1Rolled = applyGameAction(p2Played, { type: 'roll_battle_die', playerId: 'player_1', value: 1 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 6 }).state;
    const resolved = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_2' }).state;

    expect(resolved.players.player_2.zones.graveyard).toEqual([]);
    expect(resolved.players.player_2.zones.discard).toEqual(['p2-battle-1', 'p2-battle-2', 'p2-battle-3']);
  });
});
