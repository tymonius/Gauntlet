import { describe, expect, test } from 'vitest';
import {
  beginNormalV070Movement,
  createV070TurnState,
} from './rules';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  drawV070Cards,
  reduceV070TurnAction,
} from './turn-engine';

const input = {
  gameId: 'turn-test',
  seed: 'turn-seed',
  players: {
    A: { name: 'Alpha', starterDeckId: 'military-general-forward-doctrine' },
    B: { name: 'Bravo', starterDeckId: 'diplomats-ambassador-open-channels' },
  },
} as const;

function readyGame(firstPlayer: 'A' | 'B' = 'A'): V070GameState {
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
    value: firstPlayer === 'A' ? 6 : 1,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: firstPlayer === 'B' ? 6 : 1,
  });
  return state;
}

function reachMovement(state: V070GameState, playerId: 'A' | 'B'): V070GameState {
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId });
  return state;
}

describe('v0.7.0 turn lifecycle', () => {
  test('runs Capture → Draw → Opening → Movement → Denouement → Cleanup in order', () => {
    let state = readyGame('A');

    expect(state.turnState?.phase).toBe('capture');
    state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
    expect(state.turnState?.phase).toBe('draw');

    const beforeHand = state.players.A.zones.hand.length;
    state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
    expect(state.players.A.zones.hand).toHaveLength(beforeHand + 1);
    expect(state.turnState?.phase).toBe('opening');

    state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
    expect(state.turnState?.phase).toBe('movement');
    expect(state.turnState?.movementSequenceOpen).toBe(true);
    expect(state.turnState?.movementRemaining).toBe(1);

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });
    expect(state.turnState?.phase).toBe('denouement');

    state = reduceV070TurnAction(state, { type: 'pass_denouement', playerId: 'A' });
    expect(state.turnState?.phase).toBe('cleanup');

    const excess = Math.max(0, state.players.A.zones.hand.length - 3);
    state = reduceV070TurnAction(state, {
      type: 'complete_cleanup',
      playerId: 'A',
      discardInstanceIds: state.players.A.zones.hand.slice(0, excess),
    });

    expect(state.activePlayer).toBe('B');
    expect(state.turnNumber).toBe(2);
    expect(state.turnState?.phase).toBe('capture');
  });

  test('normal Capture advances only the next opposing Territory on the Front Line', () => {
    let state = readyGame('A');
    state.players.A.position = 4;
    state.board[0].occupant = null;
    state.board[4].occupant = 'A';

    state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });

    expect(state.board.map(space => space.controller))
      .toEqual(['A', 'A', 'A', 'A', 'B', 'B']);
    expect(state.players.A.controlledTerritories).toHaveLength(4);
    expect(state.turnState?.phase).toBe('draw');
  });

  test('capturing the opponent final Territory wins immediately', () => {
    let state = readyGame('A');
    for (let index = 0; index < 5; index += 1) state.board[index].controller = 'A';
    state.board[5].controller = 'B';
    state.players.A.position = 5;
    state.players.A.controlledTerritories = state.board.slice(0, 5).map(space => space.territoryId);

    state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });

    expect(state.stage).toBe('ended');
    expect(state.winner).toBe('A');
    expect(state.turnState).toBeNull();
    expect(state.events[state.events.length - 1]?.payload).toEqual({ route: 'final_territory_capture' });
  });

  test('Draw reshuffles the public Discard Pile deterministically when required', () => {
    const first = readyGame('A');
    const second = structuredClone(first) as V070GameState;
    for (const state of [first, second]) {
      const player = state.players.A;
      player.zones.discardPile.push(...player.zones.drawPile.splice(0));
      player.zones.hand = [];
    }

    const firstResult = drawV070Cards(first, 'A', 3, 'test');
    const secondResult = drawV070Cards(second, 'A', 3, 'test');

    expect(firstResult.drawn).toEqual(secondResult.drawn);
    expect(firstResult.reshuffles).toBe(1);
    expect(first.players.A.reshuffleCount).toBe(1);
    expect(first.players.A.zones.discardPile).toHaveLength(0);
  });

  test('ordinary movement updates Position and settled board occupancy', () => {
    let state = reachMovement(readyGame('A'), 'A');

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(state.players.A.position).toBe(1);
    expect(state.board[0].occupant).toBeNull();
    expect(state.board[1].occupant).toBe('A');
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.battle).toBeNull();
  });

  test('entering the opponent Position initiates Onset and consumes the movement sequence', () => {
    let state = readyGame('A');
    state.players.A.position = 2;
    state.players.B.position = 3;
    state.board.forEach(space => { space.occupant = null; });
    state.board[2].occupant = 'A';
    state.board[3].occupant = 'B';
    state = reachMovement(state, 'A');

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(state.players.A.position).toBe(3);
    expect(state.battle).toMatchObject({
      stage: 'onset',
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 2,
      contestedPosition: 3,
      lastStand: false,
    });
    expect(state.turnState?.battleInitiated).toBe(true);
    expect(state.turnState?.movementSequenceOpen).toBe(false);
    expect(state.turnState?.phase).toBe('movement');
  });

  test('a separate Advance beyond the opponent end initiates a Last Stand when legal', () => {
    let state = readyGame('A');
    state.players.A.position = 5;
    state.players.B.position = 6;
    state.board.forEach(space => { space.occupant = null; });
    state.board[5].occupant = 'A';
    state.turnState = beginNormalV070Movement({
      ...createV070TurnState(),
      phase: 'movement',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(state.battle).toMatchObject({
      stage: 'onset',
      lastStand: true,
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 5,
      contestedPosition: 6,
    });
  });

  test('Cleanup requires the exact number of excess Hand cards', () => {
    let state = reachMovement(readyGame('A'), 'A');
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });
    state = reduceV070TurnAction(state, { type: 'pass_denouement', playerId: 'A' });

    const handCount = state.players.A.zones.hand.length;
    const excess = Math.max(0, handCount - 3);
    expect(excess).toBeGreaterThan(0);
    expect(() => reduceV070TurnAction(state, {
      type: 'complete_cleanup',
      playerId: 'A',
      discardInstanceIds: [],
    })).toThrow(`Cleanup requires exactly ${excess} Hand discard`);

    const discards = state.players.A.zones.hand.slice(0, excess);
    state = reduceV070TurnAction(state, {
      type: 'complete_cleanup',
      playerId: 'A',
      discardInstanceIds: discards,
    });
    const discard = discards[0];
    expect(state.players.A.zones.hand).toHaveLength(3);
    expect(state.players.A.zones.discardPile).toContain(discard);
  });

  test('rejects turn actions from the inactive player', () => {
    const state = readyGame('A');
    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'B',
    })).toThrow('It is not B’s turn.');
  });
});
