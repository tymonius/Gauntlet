import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { viewV070GameForPlayer } from './views';

const input = {
  gameId: 'military-leaders-test',
  seed: 'military-leaders-seed',
  players: {
    A: { name: 'Alpha', starterDeckId: 'military-general-forward-doctrine' },
    B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
  },
} as const;

function readyGame(): V070GameState {
  let state = createV070StarterGame(input);
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'A',
    value: 6,
  });
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function activeBattle(): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].blank = true;

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function noCardBattleAtOutcome(): V070GameState {
  let state = activeBattle();
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  return reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
}

describe('v0.7.0 Military leaders', () => {
  test('initializes public Command state only for Military players', () => {
    const state = readyGame();
    expect(state.players.A.military).toEqual({
      command: 0,
      commandGainTurn: null,
    });
    expect(state.players.B.military).toEqual({
      command: 0,
      commandGainTurn: null,
    });
    expect(viewV070GameForPlayer(state, 'A').players.B.military).toEqual(
      state.players.B.military,
    );
  });

  test('General Onward spends Command to add one normal Movement step', () => {
    let state = readyGame();
    state.players.A.military!.command = 1;
    state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
    state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
    state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });

    const before = state.turnState!.movementStepQueue.length;
    state = reduceV070TurnAction(state, {
      type: 'use_general_onward',
      playerId: 'A',
    });

    expect(state.players.A.military?.command).toBe(0);
    expect(state.turnState?.movementStepQueue).toHaveLength(before + 1);
    expect(state.turnState?.movementStepQueue.at(-1)?.source).toBe('General Onward');
  });

  test('Rally and Entrench spend Command before dice and add +1', () => {
    let state = noCardBattleAtOutcome();
    state.players.A.military!.command = 1;
    state.players.B.military!.command = 1;

    state = reduceV070BattleAction(state, {
      type: 'use_general_rally',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_commandant_entrench',
      playerId: 'B',
    });

    expect(state.players.A.military?.command).toBe(0);
    expect(state.players.B.military?.command).toBe(0);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
  });

  test('first battle win each turn grants Command before the Rout window', () => {
    let state = noCardBattleAtOutcome();
    state.players.A.military!.command = 1;

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });

    expect(state.players.A.military?.command).toBe(2);
    expect(state.players.A.military?.commandGainTurn).toBe(state.turnNumber);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battleRuntime?.aftermathCardsCleared).toBe(true);
    expect(state.battleRuntime?.routWindowOpen).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'use_general_rout',
      playerId: 'A',
    });
    expect(state.players.A.military?.command).toBe(0);
    expect(state.battle).toBeNull();
    expect(state.turnState?.movementSequenceSource).toBe('effect');
    expect(state.turnState?.movementStepQueue[0]?.source).toBe('General Rout');

    // Keep the follow-up battle focused on Military sequencing, not a printed Territory.
    state.board.forEach(space => { space.blank = true; });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });
    expect(state.battle?.attacker).toBe('A');

    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });

    expect(state.players.A.military?.command).toBe(0);
  });

  test('a defensive win on the opponent turn grants Command and can pay for Repel', () => {
    let state = noCardBattleAtOutcome();

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [3],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [3],
    });

    expect(state.battle?.winner).toBe('B');
    expect(state.players.B.military?.command).toBe(1);
    const before = state.battle!.positions.A;

    state = reduceV070BattleAction(state, {
      type: 'use_commandant_repel',
      playerId: 'B',
    });

    expect(state.players.B.military?.command).toBe(0);
    expect(state.battle!.positions.A).not.toBe(before);
  });
});
