import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  v070ActiveMissionCanCompleteThisTurn,
} from './intelligence';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const militaryStarter = 'military-commandant-holdfast';
const intelligenceStarter = 'intelligence-ranger-field-operations';

function openingForIntelligenceB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'operational-reassessment-action',
    seed: 'operational-reassessment-action-seed',
    players: {
      A: { name: 'Opponent', starterDeckId: militaryStarter },
      B: { name: 'Intelligence', starterDeckId: intelligenceStarter },
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
    value: 1,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 6,
  });
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'B',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'B',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function injectHandCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `test-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function advanceToCleanup(
  state: V070GameState,
  playerId: 'A' | 'B',
): V070GameState {
  if (state.turnState?.phase === 'capture') {
    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId,
    });
  }
  if (state.turnState?.phase === 'draw') {
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId,
    });
  }
  if (state.turnState?.phase === 'opening') {
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId,
    });
  }
  if (state.turnState?.phase === 'movement') {
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId,
      choice: 'hold',
    });
  }
  if (state.turnState?.phase === 'denouement') {
    state = reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId,
    });
  }
  expect(state.turnState?.phase).toBe('cleanup');
  return state;
}

function completeCleanup(
  state: V070GameState,
  playerId: 'A' | 'B',
): V070GameState {
  const hand = state.players[playerId].zones.hand;
  const excess = Math.max(0, hand.length - 3);
  return reduceV070TurnAction(state, {
    type: 'complete_cleanup',
    playerId,
    discardInstanceIds: hand.slice(0, excess),
  });
}

function completeRestOfTurn(
  state: V070GameState,
  playerId: 'A' | 'B',
): V070GameState {
  return completeCleanup(
    advanceToCleanup(state, playerId),
    playerId,
  );
}

function startMissionInCurrentDenouement(
  state: V070GameState,
  missionInstanceId: string,
): V070GameState {
  if (state.turnState?.phase === 'opening') {
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
  }
  if (state.turnState?.phase === 'movement') {
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'hold',
    });
  }
  expect(state.turnState?.phase).toBe('denouement');
  return reduceV070TurnAction(state, {
    type: 'intelligence_start_mission',
    playerId: 'B',
    cardInstanceId: missionInstanceId,
  });
}

function withMissionAtNextBOpening(): {
  state: V070GameState;
  oldMission: string;
} {
  let state = openingForIntelligenceB();
  const oldMission = injectHandCard(
    state,
    'B',
    'intelligence-assassins',
    'old-mission',
  );
  state = startMissionInCurrentDenouement(state, oldMission);
  expect(v070ActiveMissionCanCompleteThisTurn(state, 'B')).toBe(false);

  state = completeRestOfTurn(state, 'B');
  expect(state.activePlayer).toBe('A');
  state = completeRestOfTurn(state, 'A');
  expect(state.activePlayer).toBe('B');
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'B',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'B',
  });
  expect(state.turnState?.phase).toBe('opening');
  expect(v070ActiveMissionCanCompleteThisTurn(state, 'B')).toBe(true);
  return { state, oldMission };
}

describe('v0.7.0 Intelligence Mission foundation and Operational Reassessment', () => {
  test('Intelligence starts with zero Intel and Operation Progress and no hidden operation card', () => {
    const state = openingForIntelligenceB();
    expect(state.players.B.intelligence).toEqual({
      intel: 0,
      operationProgress: 0,
      activeMission: null,
      specialOperation: null,
      missionControlUsedTurn: null,
    });
    expect(state.players.A.intelligence).toBeNull();
  });

  test('Start Mission is a Denouement Action and keeps Mission identity private from the opponent', () => {
    let state = openingForIntelligenceB();
    const mission = injectHandCard(
      state,
      'B',
      'intelligence-spies',
      'mission',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'intelligence_start_mission',
      playerId: 'B',
      cardInstanceId: mission,
    })).toThrow(/Expected denouement phase/);

    state = startMissionInCurrentDenouement(state, mission);

    expect(state.players.B.intelligence?.activeMission).toEqual({
      instanceId: mission,
      startedTurn: state.turnNumber,
    });
    expect(state.players.B.zones.hand).not.toContain(mission);
    expect(state.turnState?.actionsAvailable).toBe(0);
    expect(v070ActiveMissionCanCompleteThisTurn(state, 'B')).toBe(false);

    const ownerView = viewV070GameForPlayer(state, 'B');
    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(ownerView.players.B.intelligence?.activeMission).toEqual({
      set: true,
      startedTurn: state.turnNumber,
      card: {
        instanceId: mission,
        cardId: 'intelligence-spies',
      },
    });
    expect(opponentView.players.B.intelligence?.activeMission).toEqual({
      set: true,
      startedTurn: state.turnNumber,
    });
    expect(JSON.stringify(opponentView)).not.toContain(mission);
    expect(JSON.stringify(opponentView)).not.toContain(
      'intelligence-spies',
    );
  });

  test('Start Mission rejects ineligible cards and a second Active Mission before spending an Action', () => {
    let state = openingForIntelligenceB();
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'hold',
    });
    const ineligible = injectHandCard(
      state,
      'B',
      'intelligence-operational-reassessment',
      'ineligible',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'intelligence_start_mission',
      playerId: 'B',
      cardInstanceId: ineligible,
    })).toThrow(/eligible Intelligence Mission card/);
    expect(state.turnState?.actionsAvailable).toBe(1);

    const mission = injectHandCard(
      state,
      'B',
      'intelligence-spies',
      'first',
    );
    state = reduceV070TurnAction(state, {
      type: 'intelligence_start_mission',
      playerId: 'B',
      cardInstanceId: mission,
    });
    state.turnState!.actionsAvailable = 1;

    const second = injectHandCard(
      state,
      'B',
      'intelligence-subversion',
      'second',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'intelligence_start_mission',
      playerId: 'B',
      cardInstanceId: second,
    })).toThrow(/only one Active Mission/);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.players.B.zones.hand).toContain(second);
  });

  test('Operational Reassessment rejects before spending without an Active Mission or without another eligible Mission in Hand', () => {
    let state = openingForIntelligenceB();
    let source = injectHandCard(
      state,
      'B',
      'intelligence-operational-reassessment',
      'no-active',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires an Active Mission/);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.players.B.zones.hand).toContain(source);

    const prepared = withMissionAtNextBOpening();
    state = prepared.state;
    state.players.B.zones.hand = [];
    source = injectHandCard(
      state,
      'B',
      'intelligence-operational-reassessment',
      'no-replacement',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/another eligible Intelligence Mission card/);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.players.B.intelligence?.activeMission?.instanceId)
      .toBe(prepared.oldMission);
  });

  test('Operational Reassessment returns the old Mission, starts a different hidden Mission, and prevents same-turn completion', () => {
    const prepared = withMissionAtNextBOpening();
    let state = prepared.state;
    const source = injectHandCard(
      state,
      'B',
      'intelligence-operational-reassessment',
      'source',
    );
    const replacement = injectHandCard(
      state,
      'B',
      'intelligence-subversion',
      'replacement',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'operational_reassessment_mission_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
    const publicPending = [...state.events].reverse().find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { kind?: string })?.kind ===
        'operational_reassessment_mission_target'
    );
    expect(publicPending?.payload).toEqual(expect.objectContaining({
      purpose: 'Operational Reassessment',
      candidateCount: 1,
    }));
    expect(JSON.stringify(publicPending?.payload)).not.toContain(
      replacement,
    );

    const privateOptions = [...state.events].reverse().find(event =>
      event.type === 'action_effect_choice_options'
      && event.visibility === 'B'
      && (event.payload as { kind?: string })?.kind ===
        'operational_reassessment_mission_target'
    );
    expect(privateOptions?.payload).toEqual(expect.objectContaining({
      targetInstanceIds: [replacement],
    }));

    state = reduceV070TurnAction(state, {
      type: 'choose_operational_reassessment_mission_target',
      playerId: 'B',
      targetInstanceId: replacement,
    });

    expect(state.players.B.zones.hand).toContain(prepared.oldMission);
    expect(state.players.B.zones.hand).not.toContain(replacement);
    expect(state.players.B.intelligence?.activeMission).toEqual({
      instanceId: replacement,
      startedTurn: state.turnNumber,
    });
    expect(v070ActiveMissionCanCompleteThisTurn(state, 'B')).toBe(false);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();

    const ownerView = viewV070GameForPlayer(state, 'B');
    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(ownerView.players.B.intelligence?.activeMission?.card)
      .toEqual({
        instanceId: replacement,
        cardId: 'intelligence-subversion',
      });
    expect(opponentView.players.B.intelligence?.activeMission).toEqual({
      set: true,
      startedTurn: state.turnNumber,
    });
    expect(JSON.stringify(opponentView)).not.toContain(replacement);
    expect(JSON.stringify(opponentView)).not.toContain(
      'intelligence-subversion',
    );
  });

  test('Operational Reassessment revalidates the replacement and preserves the original Mission if it leaves Hand', () => {
    const prepared = withMissionAtNextBOpening();
    let state = prepared.state;
    const source = injectHandCard(
      state,
      'B',
      'intelligence-operational-reassessment',
      'source-stale',
    );
    const replacement = injectHandCard(
      state,
      'B',
      'intelligence-spies',
      'replacement-stale',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const index = state.players.B.zones.hand.indexOf(replacement);
    state.players.B.zones.hand.splice(index, 1);
    state.players.B.zones.discardPile.push(replacement);

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_operational_reassessment_mission_target',
      playerId: 'B',
      targetInstanceId: replacement,
    })).toThrow(/still in your Hand/);

    expect(state.players.B.intelligence?.activeMission?.instanceId)
      .toBe(prepared.oldMission);
    expect(state.players.B.zones.hand).not.toContain(prepared.oldMission);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'operational_reassessment_mission_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
  });
});
