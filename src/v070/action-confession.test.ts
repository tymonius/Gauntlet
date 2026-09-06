import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';

const inquisitionStarter = 'inquisition-grand-inquisitor-final-judgment';
const militaryStarter = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'confession',
    seed: 'confession-seed',
    players: {
      A: { name: 'Inquisition', starterDeckId: inquisitionStarter },
      B: { name: 'Military', starterDeckId: militaryStarter },
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
  state.players.B.position = 2;
  state.board.forEach(space => { space.occupant = null; });
  state.board[1].occupant = 'A';
  state.board[2].occupant = 'B';

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

function clearHand(
  state: V070GameState,
  playerId: 'A' | 'B',
): void {
  state.players[playerId].zones.drawPile.push(
    ...state.players[playerId].zones.hand,
  );
  state.players[playerId].zones.hand = [];
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `confession-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function beginBattleAfterOpening(state: V070GameState): V070GameState {
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  const origin = state.players.A.position!;
  const tollPayment =
    state.board.find(space => space.position === origin)?.territoryId ===
      'territory-toll-bridge'
      ? inject(
          state,
          'A',
          'neutral-rallying-cry',
          'hand',
          'toll-payment',
        )
      : undefined;
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
    territoryDiscardInstanceId: tollPayment,
  });
  expect(state.battle?.attacker).toBe('A');
  expect(state.battle?.defender).toBe('B');
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

describe('v0.7.0 Confession Action', () => {
  test('a single eligible Gambit in the revealed Hand is mandated automatically', () => {
    let state = openingForA();
    clearHand(state, 'B');
    const gambit = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'gambit',
    );
    inject(
      state,
      'B',
      'mystics-threefold-vision',
      'hand',
      'action-only',
    );
    const source = inject(
      state,
      'A',
      'inquisition-confession',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.turnState?.gambitMandates).toEqual([
      {
        playerId: 'B',
        instanceId: gambit,
        sourceInstanceId: source,
      },
    ]);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'confession_gambit_mandated'
      && (event.payload as { instanceId?: string })?.instanceId === gambit
    )).toBe(true);
  });

  test('multiple eligible Gambits create a public active-player choice', () => {
    let state = openingForA();
    clearHand(state, 'B');
    const first = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'first',
    );
    const second = inject(
      state,
      'B',
      'neutral-advance-guard',
      'hand',
      'second',
    );
    const source = inject(
      state,
      'A',
      'inquisition-confession',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'confession_gambit_target',
      playerId: 'A',
      opponentId: 'B',
      sourceActionInstanceId: source,
      candidateInstanceIds: [first, second],
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_confession_gambit_target',
      playerId: 'A',
      targetInstanceId: second,
    });

    expect(state.turnState?.gambitMandates).toEqual([
      {
        playerId: 'B',
        instanceId: second,
        sourceInstanceId: source,
      },
    ]);
  });

  test('if the opponent sets a Gambit while the mandate is able, they must set the named card', () => {
    let state = openingForA();
    clearHand(state, 'B');
    const mandated = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'mandated',
    );
    const other = inject(
      state,
      'B',
      'neutral-advance-guard',
      'hand',
      'other',
    );
    const source = inject(
      state,
      'A',
      'inquisition-confession',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_confession_gambit_target',
      playerId: 'A',
      targetInstanceId: mandated,
    });
    state = beginBattleAfterOpening(state);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: other,
    })).toThrow(/Confession requires every still-able mandated Gambit/);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: mandated,
    });

    expect(state.battleRuntime?.participants.B.gambit)
      .toEqual(expect.objectContaining({
        instanceId: mandated,
        owner: 'B',
      }));
  });

  test('Confession does not force the opponent to set a Gambit; passing remains legal', () => {
    let state = openingForA();
    clearHand(state, 'B');
    const mandated = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'mandated',
    );
    const source = inject(
      state,
      'A',
      'inquisition-confession',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    expect(state.turnState?.gambitMandates[0]?.instanceId).toBe(mandated);
    state = beginBattleAfterOpening(state);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });

    expect(state.battleRuntime?.participants.B.gambit).toBeNull();
  });

  test('if the mandated card is no longer able, another eligible Gambit may be set', () => {
    let state = openingForA();
    clearHand(state, 'B');
    const mandated = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'mandated',
    );
    const other = inject(
      state,
      'B',
      'neutral-advance-guard',
      'hand',
      'other',
    );
    const source = inject(
      state,
      'A',
      'inquisition-confession',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_confession_gambit_target',
      playerId: 'A',
      targetInstanceId: mandated,
    });

    state.players.B.zones.hand =
      state.players.B.zones.hand.filter(id => id !== mandated);
    state.players.B.zones.discardPile.push(mandated);

    state = beginBattleAfterOpening(state);
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: other,
    });

    expect(state.battleRuntime?.participants.B.gambit)
      .toEqual(expect.objectContaining({ instanceId: other }));
  });

  test('Counterintelligence prevents the entire Confession effect', () => {
    let state = openingForA();
    const counter = inject(
      state,
      'B',
      'neutral-counterintelligence',
      'assetBank',
      'counter',
    );
    const source = inject(
      state,
      'A',
      'inquisition-confession',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.assetBank).toContain(counter);
    expect(state.turnState?.gambitMandates).toEqual([]);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.events.some(event =>
      event.type === 'hand_revealed'
      && (event.payload as { purpose?: string })?.purpose === 'Confession'
    )).toBe(false);
    expect(state.events.some(event =>
      event.type === 'counterintelligence_prevented_reveal'
      && (event.payload as { purpose?: string })?.purpose === 'Confession'
    )).toBe(true);
  });

  test('different simultaneous still-able mandates make setting any Gambit illegal, while passing remains legal', () => {
    let state = openingForA();
    clearHand(state, 'B');
    const first = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'hand',
      'first',
    );
    const second = inject(
      state,
      'B',
      'neutral-advance-guard',
      'hand',
      'second',
    );
    state.turnState!.gambitMandates = [
      {
        playerId: 'B',
        instanceId: first,
        sourceInstanceId: 'confession-one',
      },
      {
        playerId: 'B',
        instanceId: second,
        sourceInstanceId: 'confession-two',
      },
    ];

    state = beginBattleAfterOpening(state);
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: first,
    })).toThrow(/Confession requires every still-able mandated Gambit/);
    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: second,
    })).toThrow(/Confession requires every still-able mandated Gambit/);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    expect(state.battleRuntime?.participants.B.gambit).toBeNull();
  });
});
