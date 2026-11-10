import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';
import { beginV070OffTurnEffectMovement } from './off-turn-movement';

const step = {
  source: 'off-turn-test-grant',
  choiceRestriction: 'advance_only',
  battleRestriction: 'allowed',
} as const;

function ready(offTurnPosition = 4): V070GameState {
  let state = createV070StarterGame({
    gameId: 'off-turn-movement-regression',
    seed: 'off-turn-movement-seed',
    players: {
      A: { name: 'Turn owner', starterDeckId: 'military-commandant-holdfast' },
      B: { name: 'Off-turn mover', starterDeckId: 'military-general-forced-march' },
    },
  });
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
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
  expect(state.activePlayer).toBe('A');
  state.turnState!.phase = 'denouement';
  state.players.A.position = 2;
  state.players.B.position = offTurnPosition;
  state.board.forEach(territory => {
    territory.occupant = null;
    territory.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[offTurnPosition].occupant = 'B';
  return state;
}

describe('off-turn effect-granted movement foundation', () => {
  test('allows the designated non-active player to Advance while preserving the turn owner', () => {
    const state = ready(4);
    const turnNumber = state.turnNumber;
    beginV070OffTurnEffectMovement(state, 'B', step);
    expect(viewV070GameForPlayer(state, 'A').turnState?.effectMovementController)
      .toBe('B');
    const next = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    });
    expect(next.activePlayer).toBe('A');
    expect(next.turnNumber).toBe(turnNumber);
    expect(next.turnState?.phase).toBe('denouement');
    expect(next.players.B.position).toBe(3);
    expect(next.board[3].occupant).toBe('B');
    expect(next.battle).toBeNull();
    expect(next.turnState?.effectMovementController).toBeUndefined();
    expect(next.turnState?.movementSequenceOpen).toBe(false);
  });

  test('creates a follow-up battle with the mover as attacker but the other player still owning the turn', () => {
    const state = ready(3);
    beginV070OffTurnEffectMovement(state, 'B', step);
    const next = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    });
    expect(next.activePlayer).toBe('A');
    expect(next.battle).toEqual(expect.objectContaining({
      attacker: 'B',
      defender: 'A',
      attackerOrigin: 3,
      contestedPosition: 2,
    }));
    expect(next.turnState?.effectMovementController).toBeUndefined();
    expect(next.events.some(event =>
      event.type === 'battle_initiated'
      && event.actor === 'B'
      && (event.payload as { attacker?: string }).attacker === 'B'
    )).toBe(true);
  });

  test('rejects both active-player hijacking and unrelated off-turn actions atomically', () => {
    const state = ready();
    beginV070OffTurnEffectMovement(state, 'B', step);
    const snapshot = structuredClone(state);
    expect(() => reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'A', choice: 'advance',
    })).toThrow(/designated player/);
    expect(state).toEqual(snapshot);
    expect(() => reduceV070TurnAction(state, {
      type: 'pass_denouement', playerId: 'B',
    })).toThrow(/not B.s turn/);
    expect(state).toEqual(snapshot);
  });

  test('Hold closes the permission; no stale player may move on a later turn action', () => {
    const state = ready();
    beginV070OffTurnEffectMovement(state, 'B', step);
    const next = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'hold',
    });
    expect(next.turnState?.effectMovementController).toBeUndefined();
    expect(next.turnState?.movementSequenceOpen).toBe(false);
    expect(next.activePlayer).toBe('A');
    expect(() => reduceV070TurnAction(next, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    })).toThrow(/not B.s turn/);
  });

  test('invalid setup and nested movement are rejected without any mutation', () => {
    const state = ready();
    const snapshot = structuredClone(state);
    expect(() => beginV070OffTurnEffectMovement(state, 'A', step))
      .toThrow(/other than the turn owner/);
    expect(state).toEqual(snapshot);
    beginV070OffTurnEffectMovement(state, 'B', step);
    const nested = structuredClone(state);
    expect(() => beginV070OffTurnEffectMovement(state, 'B', step))
      .toThrow(/current movement sequence/);
    expect(state).toEqual(nested);
  });

  test('required Advance prevents Hold for a mandatory movement grant', () => {
    const state = ready();
    beginV070OffTurnEffectMovement(state, 'B', {
      ...step, choiceRestriction: 'advance_required',
    });
    const before = structuredClone(state);
    expect(() => reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'hold',
    })).toThrow(/requires an Advance/);
    expect(state).toEqual(before);
  });
});
