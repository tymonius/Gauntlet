import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { currentV070MovementStep } from './rules';

const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'movement-action-consumers',
    seed: 'movement-action-consumers-seed',
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

  state.players.A.position = 1;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; });
  state.board[1].occupant = 'A';
  state.board[3].occupant = 'B';

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

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `movement-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

describe('v0.7.0 Advance Guard Action', () => {
  test('queues one additional normal-Movement step after the base step', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-advance-guard',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.turnState?.pendingNormalMovementSteps).toEqual([
      {
        source: 'Advance Guard',
        choiceRestriction: 'any',
        battleRestriction: 'allowed_no_gambit',
      },
    ]);
    expect(state.players.A.zones.discardPile).toContain(source);

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });

    expect(state.turnState?.movementStepQueue.map(step => step.source)).toEqual([
      'normal',
      'Advance Guard',
    ]);

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });

    expect(state.players.A.position).toBe(2);
    expect(currentV070MovementStep(state.turnState!)?.source).toBe('Advance Guard');
  });

  test('a battle initiated by the Advance Guard bonus prohibits only the attacker Gambit', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-advance-guard',
      'source',
    );
    const gambit = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'gambit',
    );
    const defenderGambit = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'defender-gambit',
    );

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

    expect(state.battle).toEqual(expect.objectContaining({
      attacker: 'A',
      defender: 'B',
      contestedPosition: 3,
      attackerGambitProhibited: true,
    }));
    expect(state.events.some(event =>
      event.type === 'battle_initiated'
      && (event.payload as {
        movementStepSource?: string;
        attackerGambitProhibited?: boolean;
      })?.movementStepSource === 'Advance Guard'
      && (event.payload as { attackerGambitProhibited?: boolean })
        ?.attackerGambitProhibited === true
    )).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: gambit,
    })).toThrow(/attacker cannot set a Gambit/);

    expect(state.players.A.zones.hand).toContain(gambit);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    expect(state.battleRuntime?.participants.A.gambit).toBeNull();

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: defenderGambit,
    });
    expect(state.battleRuntime?.participants.B.gambit).toEqual(
      expect.objectContaining({
        instanceId: defenderGambit,
        owner: 'B',
      }),
    );
  });

  test('the base movement step may still initiate an ordinary battle with Gambits allowed', () => {
    let state = openingForA();
    state.players.B.position = 2;
    state.board.forEach(space => { space.occupant = null; });
    state.board[1].occupant = 'A';
    state.board[2].occupant = 'B';

    const source = inject(
      state,
      'A',
      'neutral-advance-guard',
      'source',
    );

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

    expect(state.battle?.attackerGambitProhibited).toBe(false);
  });
});

describe('v0.7.0 Forced March Action', () => {
  test('queues one additional step that cannot initiate a battle', () => {
    let state = openingForA();
    const source = inject(
      state,
      'A',
      'neutral-forced-march',
      'source',
    );

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
    expect(state.players.A.position).toBe(2);
    expect(currentV070MovementStep(state.turnState!)).toEqual({
      source: 'Forced March',
      choiceRestriction: 'any',
      battleRestriction: 'prohibited',
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    })).toThrow(/cannot initiate a battle/);

    expect(state.players.A.position).toBe(2);
    expect(state.battle).toBeNull();
    expect(currentV070MovementStep(state.turnState!)?.source).toBe('Forced March');

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'fall_back',
    });
    expect(state.players.A.position).toBe(1);
    expect(state.turnState?.phase).toBe('denouement');
  });

  test('Forced March and Advance Guard are Opening-only Actions', () => {
    for (const cardId of [
      'neutral-forced-march',
      'neutral-advance-guard',
    ] as const) {
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

      const source = inject(state, 'A', cardId, 'late');
      expect(() => reduceV070TurnAction(state, {
        type: 'play_action_card',
        playerId: 'A',
        cardInstanceId: source,
      })).toThrow(/may be played only during Opening/);

      expect(state.players.A.zones.hand).toContain(source);
      expect(state.turnState?.actionsAvailable).toBe(1);
    }
  });
});
