import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { createV070TurnState } from './rules';
import { reduceV070TurnAction } from './turn-engine';

const input = {
  gameId: 'v072-intelligence-economy',
  seed: 'v072-intelligence-economy-seed',
  players: {
    A: { name: 'Alpha', starterDeckId: 'intelligence-ranger-field-operations' },
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

function instanceWithEffect(
  state: V070GameState,
  playerId: 'A' | 'B',
  effectLabel: string,
  predicate: (text: string) => boolean = () => true,
): string {
  const instance = Object.values(state.cardInstances).find(card => {
    if (card.owner !== playerId) return false;
    const canonical = v070CanonicalContent.cardsById.get(card.cardId);
    return canonical?.effects.some(effect =>
      effect.label === effectLabel && predicate(effect.text)
    ) ?? false;
  });
  if (!instance) {
    throw new Error(`Missing ${effectLabel} card for ${playerId}`);
  }
  return instance.instanceId;
}

function missionInstance(state: V070GameState): string {
  return instanceWithEffect(state, 'A', 'Mission');
}

function ordinaryActionInstance(
  state: V070GameState,
  excludedInstanceIds: readonly string[] = [],
): string {
  const excluded = new Set(excludedInstanceIds);
  const candidates = Object.values(state.cardInstances).filter(card => {
    if (card.owner !== 'A' || excluded.has(card.instanceId)) return false;
    const canonical = v070CanonicalContent.cardsById.get(card.cardId);
    return canonical?.effects.some(effect => effect.label === 'Action') ?? false;
  });

  for (const candidate of candidates) {
    const probe = structuredClone(state) as V070GameState;
    moveToHand(probe, 'A', candidate.instanceId);
    denouementAfterOpeningAction(probe);
    try {
      reduceV070TurnAction(probe, {
        type: 'play_action_card',
        playerId: 'A',
        cardInstanceId: candidate.instanceId,
      });
    } catch (error) {
      if (error instanceof Error
        && error.message === 'No Actions remain this turn.') {
        return candidate.instanceId;
      }
    }
  }

  throw new Error('Missing a Denouement-legal ordinary Action for A');
}

function moveToHand(state: V070GameState, playerId: 'A' | 'B', instanceId: string): void {
  const zones = state.players[playerId].zones;
  for (const zone of [
    zones.drawPile,
    zones.hand,
    zones.discardPile,
    zones.graveyard,
    zones.assetBank,
    zones.removed,
  ]) {
    const index = zone.indexOf(instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  zones.hand.push(instanceId);
}

function denouementAfterOpeningAction(state: V070GameState): void {
  state.activePlayer = 'A';
  state.turnState = {
    ...createV070TurnState(),
    phase: 'denouement',
    actionsAvailable: 0,
    actionsTaken: { opening: 1, denouement: 0 },
  };
}

describe('v0.7.2 Intelligence economy and Operational Capacity', () => {
  test('gains start-of-turn Intel equal to Operation Progress on a real turn transition', () => {
    let state = readyGame('A');
    state.activePlayer = 'B';
    state.turnState = {
      ...createV070TurnState(),
      phase: 'cleanup',
    };
    state.players.B.zones.hand = state.players.B.zones.hand.slice(0, 3);
    state.players.A.intelligence!.operationProgress = 3;
    state.players.A.intelligence!.intel = 2;

    state = reduceV070TurnAction(state, {
      type: 'complete_cleanup',
      playerId: 'B',
      discardInstanceIds: [],
    });

    expect(state.activePlayer).toBe('A');
    expect(state.players.A.intelligence!.operationProgress).toBe(3);
    expect(state.players.A.intelligence!.intel).toBe(5);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'intel_changed',
      actor: 'A',
      payload: expect.objectContaining({
        amount: 3,
        balance: 5,
        reason: 'Operation Progress at start of turn',
      }),
    }));
  });

  test('Operational Capacity permits Start Mission after the normal Opening Action was used', () => {
    let state = readyGame('A');
    const mission = missionInstance(state);
    moveToHand(state, 'A', mission);
    denouementAfterOpeningAction(state);

    state = reduceV070TurnAction(state, {
      type: 'intelligence_start_mission',
      playerId: 'A',
      cardInstanceId: mission,
    });

    expect(state.players.A.intelligence!.activeMission?.instanceId).toBe(mission);
    expect(state.turnState?.actionsTaken).toEqual({ opening: 1, denouement: 1 });
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'operational_capacity_used',
      actor: 'A',
      payload: expect.objectContaining({
        phase: 'denouement',
        operation: 'Start Mission',
      }),
    }));
  });

  test('Operational Capacity permits Complete Mission after an Opening Action and preserves normal rewards', () => {
    let state = readyGame('A');
    const mission = missionInstance(state);
    moveToHand(state, 'A', mission);
    state.players.A.zones.hand.splice(state.players.A.zones.hand.indexOf(mission), 1);
    state.players.A.intelligence!.activeMission = {
      instanceId: mission,
      startedTurn: 0,
      satisfiedTurn: 0,
      progressFlags: [],
    };
    state.players.A.intelligence!.operationProgress = 1;
    state.players.A.intelligence!.intel = 0;
    denouementAfterOpeningAction(state);

    state = reduceV070TurnAction(state, {
      type: 'intelligence_complete_mission',
      playerId: 'A',
    });

    expect(state.players.A.intelligence!.activeMission).toBeNull();
    expect(state.players.A.intelligence!.operationProgress).toBe(2);
    expect(state.players.A.intelligence!.intel).toBeGreaterThan(0);
    expect(state.turnState?.actionsTaken).toEqual({ opening: 1, denouement: 1 });
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'operational_capacity_used',
      actor: 'A',
      payload: expect.objectContaining({
        operation: 'Complete Mission',
      }),
    }));
  });

  test('Operational Capacity cannot be converted into an ordinary Denouement card Action', () => {
    const state = readyGame('A');
    const actionCard = ordinaryActionInstance(state);
    moveToHand(state, 'A', actionCard);
    denouementAfterOpeningAction(state);

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: actionCard,
    })).toThrow('No Actions remain this turn.');
  });

  test('Operational Capacity still allows at most one Action in Denouement', () => {
    let state = readyGame('A');
    const mission = missionInstance(state);
    const actionCard = ordinaryActionInstance(state, [mission]);
    moveToHand(state, 'A', mission);
    moveToHand(state, 'A', actionCard);
    denouementAfterOpeningAction(state);

    state = reduceV070TurnAction(state, {
      type: 'intelligence_start_mission',
      playerId: 'A',
      cardInstanceId: mission,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: actionCard,
    })).toThrow('No Actions remain this turn.');
    expect(state.turnState?.actionsTaken.denouement).toBe(1);
  });
});
