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

  it('starts a battle when moving into an occupied enemy space', () => {
    const game = initializeGame(createValidSetup());
    const contestedGame = {
      ...game,
      phase: 'movement' as const,
      board: {
        ...game.board,
        spaces: game.board.spaces.map((space) =>
          space.id === 'space-1' ? { ...space, occupant: 'player_2' as const } : space,
        ),
      },
    };

    const { state } = applyGameAction(contestedGame, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' });

    expect(state.phase).toBe('battle');
    expect(state.battle).toMatchObject({
      stage: 'hand_commit',
      location: 'space-1',
      attacker: { playerId: 'player_1' },
      defender: { playerId: 'player_2' },
    });
  });

  it('runs the basic battle flow through attacker victory', () => {
    const game = initializeGame(createValidSetup({
      players: [
        {
          id: 'player_1',
          name: 'Player One',
          deck: ['p1-card-1', 'p1-card-2', 'p1-card-3', 'p1-battle-1', 'p1-battle-2', 'p1-battle-3', 'p1-battle-4'],
          territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
        },
        {
          id: 'player_2',
          name: 'Player Two',
          deck: ['p2-card-1', 'p2-card-2', 'p2-card-3', 'p2-battle-1', 'p2-battle-2', 'p2-battle-3', 'p2-battle-4'],
          territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
        },
      ],
    }));
    const contestedGame = {
      ...game,
      phase: 'movement' as const,
      board: {
        ...game.board,
        spaces: game.board.spaces.map((space) =>
          space.id === 'space-1' ? { ...space, occupant: 'player_2' as const } : space,
        ),
      },
    };

    const battleStarted = applyGameAction(contestedGame, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1Passed = applyGameAction(battleStarted, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;
    const p2Passed = applyGameAction(p1Passed, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2Passed, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    const p2Drew = applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    const p1Selected = applyGameAction(p2Drew, { type: 'play_battle_draw_card', playerId: 'player_1', cardId: 'p1-battle-1' }).state;
    const p2Selected = applyGameAction(p1Selected, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'p2-battle-1' }).state;
    const p1Rolled = applyGameAction(p2Selected, { type: 'roll_battle_die', playerId: 'player_1', value: 6 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 1 }).state;
    const resolved = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(resolved.battle).toBeUndefined();
    expect(resolved.phase).toBe('action_after_movement');
    expect(resolved.board.spaces[0].occupant).toBeUndefined();
    expect(resolved.board.spaces[1].occupant).toBe('player_1');
    expect(resolved.board.spaces[1].capturePendingBy).toBe('player_1');
    expect(resolved.players.player_1.zones.discard).toEqual(['p1-battle-1', 'p1-battle-2', 'p1-battle-3']);
    expect(resolved.players.player_2.zones.discard).toEqual(['p2-battle-1', 'p2-battle-2', 'p2-battle-3']);
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
