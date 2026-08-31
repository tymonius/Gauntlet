import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';

const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'controlled-territory-movement',
    seed: 'controlled-territory-movement-seed',
    players: {
      A: { name: 'A', starterDeckId: militaryStarter },
      B: { name: 'B', starterDeckId: militaryStarter },
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
    type: 'roll_first_player',
    playerId: 'A',
    value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  expect(state.turnState?.phase).toBe('opening');

  // Give A several controlled destinations on both sides of its current
  // position while keeping B beyond them unless a test overrides it.
  state.players.A.position = 1;
  state.players.B.position = 5;
  state.board.forEach((territory, index) => {
    territory.controller = index <= 3 ? 'A' : 'B';
    territory.occupant = null;
  });
  state.board[1].occupant = 'A';
  state.board[5].occupant = 'B';

  return state;
}

function injectHand(
  state: V070GameState,
  cardId: string,
  suffix: string,
): string {
  const instanceId = `controlled-move-A-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

describe('v0.7.0 Paths of Shadow Action', () => {
  test('moves to another controlled Territory without starting a battle and resolves to Discard', () => {
    let state = openingForA();
    const source = injectHand(
      state,
      'mystics-paths-of-shadow',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'controlled_territory_move_target',
      playerId: 'A',
      sourceActionInstanceId: source,
      purpose: 'Paths of Shadow',
      battleAllowed: false,
      sourceDestination: 'discard',
      candidatePositions: [0, 2, 3],
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_controlled_territory_move_target',
      playerId: 'A',
      territoryPosition: 3,
    });

    expect(state.players.A.position).toBe(3);
    expect(state.board[1].occupant).toBeNull();
    expect(state.board[3].occupant).toBe('A');
    expect(state.battle).toBeNull();
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.players.A.zones.graveyard).not.toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.turnState?.phase).toBe('opening');

    const moved = state.events.find(event =>
      event.type === 'player_moved'
      && (event.payload as { movementSource?: string })?.movementSource
        === 'Paths of Shadow'
    );
    const resolved = state.events.find(event =>
      event.type === 'action_card_resolved'
      && (event.payload as { instanceId?: string })?.instanceId === source
    );
    expect(moved).toBeDefined();
    expect(resolved).toBeDefined();
    expect(moved!.index).toBeLessThan(resolved!.index);
  });

  test('an opponent-occupied controlled Territory is excluded because Paths cannot start a battle', () => {
    let state = openingForA();
    state.players.B.position = 3;
    state.board[5].occupant = null;
    state.board[3].occupant = 'B';

    const source = injectHand(
      state,
      'mystics-paths-of-shadow',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    const pending = state.pendingActionEffectChoice;
    expect(pending).toEqual(expect.objectContaining({
      kind: 'controlled_territory_move_target',
      purpose: 'Paths of Shadow',
    }));
    expect(
      (pending as { candidatePositions: number[] }).candidatePositions,
    ).not.toContain(3);

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_controlled_territory_move_target',
      playerId: 'A',
      territoryPosition: 3,
    })).toThrow(/currently legal Territory you control/);

    expect(state.players.A.position).toBe(1);
    expect(state.battle).toBeNull();
  });

  test('cannot use the effect to pass through the opposing token', () => {
    let state = openingForA();
    state.players.B.position = 2;
    state.board[5].occupant = null;
    state.board[2].occupant = 'B';

    const source = injectHand(
      state,
      'mystics-paths-of-shadow',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(
      (state.pendingActionEffectChoice as {
        candidatePositions: number[];
      }).candidatePositions,
    ).toEqual([0]);
  });
});

describe('v0.7.0 Phantom Passage Action', () => {
  test('puts its source in Graveyard and moves to another controlled Territory', () => {
    let state = openingForA();
    const source = injectHand(
      state,
      'neutral-phantom-passage',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_controlled_territory_move_target',
      playerId: 'A',
      territoryPosition: 3,
    });

    expect(state.players.A.position).toBe(3);
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.players.A.zones.discardPile).not.toContain(source);
    expect(state.battle).toBeNull();

    const resolved = state.events.find(event =>
      event.type === 'action_card_resolved'
      && (event.payload as { instanceId?: string })?.instanceId === source
    );
    expect(resolved?.payload).toEqual(expect.objectContaining({
      destination: 'graveyard',
    }));
  });

  test('may move onto an opponent-occupied Territory A controls and thereby start a battle', () => {
    let state = openingForA();
    state.players.B.position = 3;
    state.board[5].occupant = null;
    state.board[3].occupant = 'B';
    state.board[3].controller = 'A';

    const source = injectHand(
      state,
      'neutral-phantom-passage',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    expect(
      (state.pendingActionEffectChoice as {
        candidatePositions: number[];
      }).candidatePositions,
    ).toContain(3);

    state = reduceV070TurnAction(state, {
      type: 'choose_controlled_territory_move_target',
      playerId: 'A',
      territoryPosition: 3,
    });

    expect(state.players.A.position).toBe(3);
    expect(state.players.B.position).toBe(3);
    expect(state.battle).toEqual(expect.objectContaining({
      attacker: 'A',
      defender: 'B',
      attackerOrigin: 1,
      contestedPosition: 3,
    }));
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.events.some(event =>
      event.type === 'battle_initiated'
      && (event.payload as { movementStepSource?: string })
        ?.movementStepSource === 'Phantom Passage'
    )).toBe(true);
  });

  test('requires another controlled Territory that is legally reachable before spending the Action', () => {
    const state = openingForA();
    state.board.forEach(territory => {
      territory.controller = 'B';
    });
    state.board[1].controller = 'A';

    const source = injectHand(
      state,
      'neutral-phantom-passage',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/requires another controlled Territory/);

    expect(state.players.A.zones.hand).toContain(source);
    expect(state.players.A.zones.graveyard).not.toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('rejecting an invalid target leaves the pending Action and source outside Graveyard', () => {
    let state = openingForA();
    const source = injectHand(
      state,
      'neutral-phantom-passage',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_controlled_territory_move_target',
      playerId: 'A',
      territoryPosition: 4,
    })).toThrow(/currently legal Territory you control/);

    expect(state.pendingActionCard).toEqual(expect.objectContaining({
      instanceId: source,
    }));
    expect(state.players.A.zones.graveyard).not.toContain(source);
    expect(state.players.A.position).toBe(1);
  });
});
