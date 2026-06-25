import { describe, expect, it } from 'vitest';
import { initializeGame } from './initialize';
import { applyGameAction, GameActionError } from './reducer';
import { createValidSetup } from './test-helpers';


describe('applyGameAction', () => {
  it('draws a card for the active player and advances out of turn_start', () => {
    const game = initializeGame(createValidSetup());
    const { state, result } = applyGameAction(game, { type: 'draw_card', playerId: 'player_1' });

    expect(result?.drawnCards).toEqual(['p1-card-4']);
    expect(state.players.player_1.zones.hand).toEqual(['p1-card-1', 'p1-card-2', 'p1-card-3', 'p1-card-4']);
    expect(state.players.player_1.zones.deck).toEqual([]);
    expect(state.phase).toBe('action_before_movement');
    expect(game.players.player_1.zones.hand).toEqual(['p1-card-1', 'p1-card-2', 'p1-card-3']);
  });

  it('rejects actions from the inactive player', () => {
    const game = initializeGame(createValidSetup());

    expect(() => applyGameAction(game, { type: 'draw_card', playerId: 'player_2' })).toThrow(GameActionError);
  });

  it('reveals a controlled territory', () => {
    const game = initializeGame(createValidSetup());
    const { state } = applyGameAction(game, { type: 'reveal_space', playerId: 'player_1', spaceId: 'space-1' });

    expect(state.board.spaces[1].revealed).toBe(true);
  });

  it('moves to an adjacent space during movement', () => {
    const game = initializeGame(createValidSetup());
    const movementGame = { ...game, phase: 'movement' as const };
    const { state } = applyGameAction(movementGame, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' });

    expect(state.players.player_1.occupiedSpaceId).toBe('space-1');
    expect(state.board.spaces[0].occupant).toBeUndefined();
    expect(state.board.spaces[1].occupant).toBe('player_1');
    expect(state.phase).toBe('action_after_movement');
  });

  it('ends the active player turn', () => {
    const game = initializeGame(createValidSetup());
    const { state } = applyGameAction(game, { type: 'end_turn', playerId: 'player_1' });

    expect(state.activePlayer).toBe('player_2');
    expect(state.priorityPlayer).toBe('player_2');
    expect(state.turn).toBe(2);
    expect(state.phase).toBe('turn_start');
  });
});
