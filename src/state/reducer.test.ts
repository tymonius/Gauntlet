import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { applyGameAction, GameActionError } from './reducer';
import { createValidSetup } from './test-helpers';

function createBattleReadyGame(): GameState {
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

function createUncontrolledDefenseBattleReadyGame(): GameState {
  const game = createBattleReadyGame();
  return {
    ...game,
    board: {
      ...game.board,
      spaces: game.board.spaces.map((space) => (
        space.id === 'space-1' ? { ...space, controller: 'player_1' as const } : space
      )),
    },
  };
}

function advanceToBattleDrawSelection(game: GameState): GameState {
  const battleStarted = applyGameAction(game, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
  const p1Passed = applyGameAction(battleStarted, { type: 'pass_battle_hand_commit', playerId: 'player_1' }).state;
  const p2Passed = applyGameAction(p1Passed, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
  const p1Drew = applyGameAction(p2Passed, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
  return applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
}

function advanceToDice(game: GameState): GameState {
  const battleDraw = advanceToBattleDrawSelection(game);
  const p1Selected = applyGameAction(battleDraw, { type: 'play_battle_draw_card', playerId: 'player_1', cardId: 'p1-battle-1' }).state;
  return applyGameAction(p1Selected, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'p2-battle-1' }).state;
}

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

  it('starts a battle with defender tie policy when defender controls the space', () => {
    const { state } = applyGameAction(createBattleReadyGame(), { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' });

    expect(state.phase).toBe('battle');
    expect(state.battle).toMatchObject({
      stage: 'hand_commit',
      location: 'space-1',
      attackerOrigin: 'player_1-heartland',
      tiePolicy: 'defender',
      attacker: { playerId: 'player_1', passedHandCommit: false, passedBattleDrawPlay: false },
      defender: { playerId: 'player_2', passedHandCommit: false, passedBattleDrawPlay: false },
    });
  });

  it('supports choosing no battle-draw card', () => {
    const battleDraw = advanceToBattleDrawSelection(createBattleReadyGame());
    const p1Passed = applyGameAction(battleDraw, { type: 'pass_battle_draw_play', playerId: 'player_1' }).state;
    const p2Selected = applyGameAction(p1Passed, { type: 'play_battle_draw_card', playerId: 'player_2', cardId: 'p2-battle-1' }).state;

    expect(p2Selected.battle?.stage).toBe('dice');
    expect(p2Selected.battle?.attacker.passedBattleDrawPlay).toBe(true);
    expect(p2Selected.battle?.attacker.battleDrawPlayed).toEqual([]);
    expect(p2Selected.battle?.defender.battleDrawPlayed[0]).toMatchObject({ cardId: 'p2-battle-1', faceDown: false });
  });

  it('runs the basic battle flow through attacker victory and defender retreat', () => {
    const p2Selected = advanceToDice(createBattleReadyGame());
    const p1Rolled = applyGameAction(p2Selected, { type: 'roll_battle_die', playerId: 'player_1', value: 6 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 1 }).state;
    const resolved = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(resolved.battle).toBeUndefined();
    expect(resolved.phase).toBe('action_after_movement');
    expect(resolved.board.spaces[0].occupant).toBeUndefined();
    expect(resolved.board.spaces[1].occupant).toBe('player_1');
    expect(resolved.board.spaces[2].occupant).toBe('player_2');
    expect(resolved.players.player_2.occupiedSpaceId).toBe('space-2');
    expect(resolved.board.spaces[1].capturePendingBy).toBe('player_1');
    expect(resolved.players.player_1.zones.discard).toEqual(['p1-battle-1', 'p1-battle-2', 'p1-battle-3']);
    expect(resolved.players.player_2.zones.discard).toEqual(['p2-battle-1', 'p2-battle-2', 'p2-battle-3']);
  });

  it('keeps the defender in place when the defender wins', () => {
    const p2Selected = advanceToDice(createBattleReadyGame());
    const p1Rolled = applyGameAction(p2Selected, { type: 'roll_battle_die', playerId: 'player_1', value: 1 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 6 }).state;
    const resolved = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_2' }).state;

    expect(resolved.board.spaces[0].occupant).toBe('player_1');
    expect(resolved.board.spaces[1].occupant).toBe('player_2');
    expect(resolved.players.player_1.occupiedSpaceId).toBe('player_1-heartland');
    expect(resolved.players.player_2.occupiedSpaceId).toBe('space-1');
    expect(resolved.board.spaces[1].capturePendingBy).toBeUndefined();
  });

  it('defender wins ties when defending a controlled space', () => {
    const p2Selected = advanceToDice(createBattleReadyGame());
    const p1Rolled = applyGameAction(p2Selected, { type: 'roll_battle_die', playerId: 'player_1', value: 4 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 4 }).state;
    const resolved = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_2' }).state;

    expect(resolved.battle).toBeUndefined();
    expect(resolved.board.spaces[1].occupant).toBe('player_2');
    expect(resolved.players.player_2.occupiedSpaceId).toBe('space-1');
  });

  it('rerolls ties when the defender does not control the space', () => {
    const p2Selected = advanceToDice(createUncontrolledDefenseBattleReadyGame());
    const p1Rolled = applyGameAction(p2Selected, { type: 'roll_battle_die', playerId: 'player_1', value: 4 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 4 }).state;
    const reroll = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(reroll.battle?.stage).toBe('dice');
    expect(reroll.battle?.tiePolicy).toBe('reroll');
    expect(reroll.battle?.attacker.diceRoll).toBeUndefined();
    expect(reroll.battle?.defender.diceRoll).toBeUndefined();
  });

  it('applies banked Fortifications during battle resolution', () => {
    const game = createBattleReadyGame();
    game.players.player_2.zones.assetBank.push('card-fortifications');
    const p2Selected = advanceToDice(game);
    const p1Rolled = applyGameAction(p2Selected, { type: 'roll_battle_die', playerId: 'player_1', value: 4 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 4 }).state;
    const resolved = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_2' }).state;

    expect(resolved.board.spaces[0].occupant).toBe('player_1');
    expect(resolved.board.spaces[1].occupant).toBe('player_2');
    expect(resolved.log.some((event) => event.type === 'effect_resolved')).toBe(true);
  });

  it('applies Valor during battle resolution', () => {
    const game = createBattleReadyGame();
    game.players.player_1.zones.hand[0] = 'card-valor';

    const battleStarted = applyGameAction(game, { type: 'move_player', playerId: 'player_1', toSpaceId: 'space-1' }).state;
    const p1Committed = applyGameAction(battleStarted, { type: 'commit_battle_hand_card', playerId: 'player_1', cardId: 'card-valor' }).state;
    const p2PassedHand = applyGameAction(p1Committed, { type: 'pass_battle_hand_commit', playerId: 'player_2' }).state;
    const p1Drew = applyGameAction(p2PassedHand, { type: 'draw_battle_cards', playerId: 'player_1' }).state;
    const p2Drew = applyGameAction(p1Drew, { type: 'draw_battle_cards', playerId: 'player_2' }).state;
    const p1PassedPlay = applyGameAction(p2Drew, { type: 'pass_battle_draw_play', playerId: 'player_1' }).state;
    const p2PassedPlay = applyGameAction(p1PassedPlay, { type: 'pass_battle_draw_play', playerId: 'player_2' }).state;
    const p1Rolled = applyGameAction(p2PassedPlay, { type: 'roll_battle_die', playerId: 'player_1', value: 3 }).state;
    const p2Rolled = applyGameAction(p1Rolled, { type: 'roll_battle_die', playerId: 'player_2', value: 4 }).state;
    const resolved = applyGameAction(p2Rolled, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(resolved.board.spaces[1].occupant).toBe('player_1');
    expect(resolved.players.player_1.zones.graveyard).toContain('card-valor');
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
