import { describe, expect, test } from 'vitest';
import {
  appendV070Event,
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { currentV070MovementStep } from './rules';

const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'give-chase',
    seed: 'give-chase-seed',
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

function advanceToDenouement(state: V070GameState): V070GameState {
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
  return state;
}

function injectHand(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `give-chase-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function recordCompletedBattle(
  state: V070GameState,
  attacker: 'A' | 'B',
  winner: 'A' | 'B',
  suffix: string,
): void {
  const defender = attacker === 'A' ? 'B' : 'A';
  appendV070Event(state, {
    type: 'battle_initiated',
    actor: attacker,
    visibility: 'public',
    payload: {
      attacker,
      defender,
      attackerOrigin: attacker === 'A' ? 1 : 4,
      contestedPosition: 2,
      fixture: suffix,
    },
  });
  appendV070Event(state, {
    type: 'battle_outcome',
    visibility: 'public',
    payload: {
      winner,
      loser: winner === 'A' ? 'B' : 'A',
      method: 'total',
      tiebreakRounds: 0,
      fixture: suffix,
    },
  });
  appendV070Event(state, {
    type: 'battle_aftermath_complete',
    visibility: 'public',
    payload: {
      positions: { A: 2, B: 3 },
      fixture: suffix,
    },
  });
}

describe('v0.7.0 Give Chase Action', () => {
  test('after a battle A initiated and won this turn, starts one mandatory Advance and sends the source to Graveyard', () => {
    let state = openingForA();
    recordCompletedBattle(state, 'A', 'A', 'qualifying');
    state = advanceToDenouement(state);

    const source = injectHand(
      state,
      'A',
      'military-give-chase',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.players.A.zones.hand).not.toContain(source);
    expect(state.players.A.zones.discardPile).not.toContain(source);
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceSource).toBe('effect');
    expect(currentV070MovementStep(state.turnState!)).toEqual({
      source: 'Give Chase',
      choiceRestriction: 'advance_required',
      battleRestriction: 'allowed',
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    })).toThrow(/requires an Advance/);

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(state.players.A.position).toBe(1);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
  });

  test('winning a battle initiated by the opponent does not qualify', () => {
    let state = openingForA();
    recordCompletedBattle(state, 'B', 'A', 'defended-win');
    state = advanceToDenouement(state);
    const source = injectHand(
      state,
      'A',
      'military-give-chase',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/requires a battle you initiated and won this turn/);

    expect(state.players.A.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('initiating a battle but losing it does not qualify', () => {
    let state = openingForA();
    recordCompletedBattle(state, 'A', 'B', 'lost');
    state = advanceToDenouement(state);
    const source = injectHand(
      state,
      'A',
      'military-give-chase',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/requires a battle you initiated and won this turn/);

    expect(state.players.A.zones.hand).toContain(source);
  });

  test('an earlier qualifying initiated win still qualifies after another completed battle', () => {
    let state = openingForA();
    recordCompletedBattle(state, 'A', 'A', 'qualifying-first');
    recordCompletedBattle(state, 'B', 'A', 'defended-later');
    state = advanceToDenouement(state);

    const source = injectHand(
      state,
      'A',
      'military-give-chase',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.players.A.zones.graveyard).toContain(source);
    expect(currentV070MovementStep(state.turnState!)).toEqual({
      source: 'Give Chase',
      choiceRestriction: 'advance_required',
      battleRestriction: 'allowed',
    });
  });

  test('a qualifying win from a prior turn does not cross the current turn boundary', () => {
    let state = openingForA();
    recordCompletedBattle(state, 'A', 'A', 'prior-turn');

    state.turnNumber += 1;
    appendV070Event(state, {
      type: 'turn_started',
      actor: 'A',
      visibility: 'public',
      payload: {
        turnNumber: state.turnNumber,
        phase: state.turnState?.phase,
      },
    });
    state = advanceToDenouement(state);

    const source = injectHand(
      state,
      'A',
      'military-give-chase',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/requires a battle you initiated and won this turn/);
  });

  test('Give Chase is Denouement-only even after a qualifying win', () => {
    const state = openingForA();
    recordCompletedBattle(state, 'A', 'A', 'qualifying');
    const source = injectHand(
      state,
      'A',
      'military-give-chase',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    })).toThrow(/only during Denouement/);

    expect(state.players.A.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('the mandatory Advance may initiate a new battle', () => {
    let state = openingForA();
    recordCompletedBattle(state, 'A', 'A', 'qualifying');
    state = advanceToDenouement(state);

    state.players.A.position = 1;
    state.players.B.position = 2;
    for (const territory of state.board) territory.occupant = null;
    state.board[1].occupant = 'A';
    state.board[2].occupant = 'B';

    const source = injectHand(
      state,
      'A',
      'military-give-chase',
      'source',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(state.battle).not.toBeNull();
    expect(state.battle?.attacker).toBe('A');
    expect(state.battle?.defender).toBe('B');
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.events.some(event =>
      event.type === 'battle_initiated'
      && (event.payload as { movementStepSource?: string })
        ?.movementStepSource === 'Give Chase'
    )).toBe(true);
  });
});
