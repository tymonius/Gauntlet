import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { currentV070MovementStep } from './rules';

const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'invasion',
    seed: 'invasion-seed',
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
  return state;
}

function injectHand(
  state: V070GameState,
  cardId: string,
  suffix: string,
): string {
  const instanceId = `invasion-A-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

describe('v0.7.0 Invasion Action', () => {
  test('during Opening, queues two optional Advance-only steps after normal movement', () => {
    let state = openingForA();
    const source = injectHand(state, 'military-invasion', 'source');

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.turnState?.pendingNormalMovementSteps).toEqual([
      {
        source: 'Invasion',
        choiceRestriction: 'advance_only',
        battleRestriction: 'allowed',
      },
      {
        source: 'Invasion',
        choiceRestriction: 'advance_only',
        battleRestriction: 'allowed',
      },
    ]);
    expect(state.players.A.zones.discardPile).toContain(source);

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });

    expect(state.turnState?.movementStepQueue.map(step => step.source))
      .toEqual(['normal', 'Invasion', 'Invasion']);
  });

  test('may use one bonus Advance and decline the second with Hold', () => {
    let state = openingForA();
    const source = injectHand(state, 'military-invasion', 'source');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });
    expect(currentV070MovementStep(state.turnState!)).toEqual({
      source: 'Invasion',
      choiceRestriction: 'advance_only',
      battleRestriction: 'allowed',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });
    expect(currentV070MovementStep(state.turnState!)).toEqual({
      source: 'Invasion',
      choiceRestriction: 'advance_only',
      battleRestriction: 'allowed',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });

    expect(state.players.A.position).toBe(2);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
  });

  test('may decline both bonus Advances after taking normal movement', () => {
    let state = openingForA();
    const source = injectHand(state, 'military-invasion', 'source');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });
    expect(currentV070MovementStep(state.turnState!)).toEqual({
      source: 'Invasion',
      choiceRestriction: 'advance_only',
      battleRestriction: 'allowed',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });

    expect(state.players.A.position).toBe(1);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
  });

  test('may use both bonus Advances', () => {
    let state = openingForA();
    const source = injectHand(state, 'military-invasion', 'source');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(state.players.A.position).toBe(3);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
  });

  test('Invasion bonus movement cannot be used to Fall Back', () => {
    let state = openingForA();
    const source = injectHand(state, 'military-invasion', 'source');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'fall_back',
    })).toThrow(/may only be used to Advance/);

    expect(currentV070MovementStep(state.turnState!)).toEqual({
      source: 'Invasion',
      choiceRestriction: 'advance_only',
      battleRestriction: 'allowed',
    });
  });

  test('a bonus Advance may initiate a battle and unused Invasion movement is then lost', () => {
    let state = openingForA();
    state.players.A.position = 0;
    state.players.B.position = 2;
    for (const territory of state.board) territory.occupant = null;
    state.board[0].occupant = 'A';
    state.board[2].occupant = 'B';

    const source = injectHand(state, 'military-invasion', 'source');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(state.battle).not.toBeNull();
    expect(state.battle?.attacker).toBe('A');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
    expect(state.turnState?.movementRemaining).toBe(0);
    expect(state.events.some(event =>
      event.type === 'battle_initiated'
      && (event.payload as { movementStepSource?: string })
        ?.movementStepSource === 'Invasion'
    )).toBe(true);
  });

  test('played during Denouement, Invasion resolves but cannot reopen the completed Movement phase', () => {
    let state = openingForA();
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });
    expect(state.turnState?.phase).toBe('denouement');

    const source = injectHand(state, 'military-invasion', 'source');
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
    expect(state.turnState?.pendingNormalMovementSteps).toEqual([]);
    expect(state.events.some(event =>
      event.type === 'action_effect_incomplete'
      && (event.payload as { purpose?: string; reason?: string })
        ?.purpose === 'Invasion'
      && (event.payload as { reason?: string })?.reason
        === 'movement_phase_already_passed'
    )).toBe(true);
  });
});
