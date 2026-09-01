import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070BattleAction } from './battle-engine';
import { insertV070ControlledTerritory } from './gauntlet';
import {
  V070_EXECUTABLE_ACTION_CARD_IDS,
  reduceV070TurnAction,
} from './turn-engine';
import {
  v070PrintedTerritoryEffectActive,
} from './territories';
import { v070CanonicalContent } from '../content/v070';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'pathfinders-action',
    seed: 'pathfinders-action-seed',
    players: {
      A: { name: 'Pathfinder', starterDeckId: militaryA },
      B: { name: 'Opponent', starterDeckId: militaryB },
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

  state.players.A.position = 2;
  state.players.B.position = 3;
  for (const territory of state.board) territory.occupant = null;
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[2].territoryId = 'territory-garrison';
  state.board[3].territoryId = 'territory-high-ground';
  state.board[3].controller = 'B';

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

function injectPathfinders(state: V070GameState): string {
  const instanceId = 'test-A-neutral-pathfinders';
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: 'neutral-pathfinders',
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

function playAndChoose(
  state: V070GameState,
  territoryPosition: number,
): { state: V070GameState; source: string } {
  const source = injectPathfinders(state);
  state = reduceV070TurnAction(state, {
    type: 'play_action_card',
    playerId: 'A',
    cardInstanceId: source,
  });
  expect(state.pendingActionEffectChoice).toEqual({
    kind: 'territory_effect_suppression_target',
    playerId: 'A',
    sourceActionInstanceId: source,
    purpose: 'Pathfinders',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_territory_effect_suppression_target',
    playerId: 'A',
    territoryPosition,
  });
  return { state, source };
}

describe('v0.7.0 Pathfinders Action', () => {
  test('chooses any current Territory and records a public turn-scoped movement suppression', () => {
    const played = playAndChoose(openingForA(), 3);
    const state = played.state;
    const target = state.board[3];

    expect(state.territoryEffectSuppressions).toEqual([{
      source: 'pathfinders',
      sourceActionInstanceId: played.source,
      playerId: 'A',
      territoryInstanceId: target.territoryInstanceId,
      turnNumber: state.turnNumber,
      scope: 'movement',
    }]);
    expect(state.players.A.zones.discardPile).toContain(played.source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(v070PrintedTerritoryEffectActive(
      state,
      target,
      'A',
      'movement',
    )).toBe(false);
    expect(state.events.some(event =>
      event.type === 'territory_effect_suppressed'
      && (event.payload as { source?: string })?.source ===
        'Pathfinders'
    )).toBe(true);
  });

  test('the Action suppresses High Ground in a battle initiated during that Movement', () => {
    let played = playAndChoose(openingForA(), 3);
    let state = played.state;

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'advance',
    });
    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });

    expect(state.battleRuntime?.activePrintedTerritoryAtOnset)
      .toBeNull();
    expect(state.battleRuntime?.participants.B.advantage).toBe(0);
  });

  test('the chosen Territory remains suppressed by stable instance identity if positions shift', () => {
    const played = playAndChoose(openingForA(), 3);
    const state = played.state;
    const targetInstanceId = state.board[3].territoryInstanceId;

    insertV070ControlledTerritory(
      state,
      'A',
      1,
      {
        territoryInstanceId: 'pathfinders-inserted-territory',
        territoryId: 'manifest-destiny-blank-territory',
        contributedBy: 'A',
        blank: true,
      },
      'Pathfinders test insertion',
    );

    const shifted = state.board.find(
      territory => territory.territoryInstanceId === targetInstanceId,
    )!;
    expect(shifted.position).toBe(4);
    expect(v070PrintedTerritoryEffectActive(
      state,
      shifted,
      'A',
      'movement',
    )).toBe(false);
  });

  test('the suppression expires during the owner’s Cleanup', () => {
    let played = playAndChoose(openingForA(), 3);
    let state = played.state;

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });
    state = reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId: 'A',
    });

    const excess = Math.max(
      0,
      state.players.A.zones.hand.length - 3,
    );
    state = reduceV070TurnAction(state, {
      type: 'complete_cleanup',
      playerId: 'A',
      discardInstanceIds:
        state.players.A.zones.hand.slice(0, excess),
    });

    expect(state.territoryEffectSuppressions).toEqual([]);
  });

  test('rejects a stale Territory position while preserving the pending choice', () => {
    let state = openingForA();
    const source = injectPathfinders(state);
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'A',
      cardInstanceId: source,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_territory_effect_suppression_target',
      playerId: 'A',
      territoryPosition: 99,
    })).toThrow(/currently in the Gauntlet/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'territory_effect_suppression_target',
      playerId: 'A',
      sourceActionInstanceId: source,
      purpose: 'Pathfinders',
    });
  });

  test('all released cards with a printed Action effect are now registered as executable', () => {
    const releasedActionIds = v070CanonicalContent.content.cards
      .filter(card =>
        card.effects.some(effect => effect.label === 'Action')
      )
      .map(card => card.id)
      .sort();
    const executable = [...V070_EXECUTABLE_ACTION_CARD_IDS].sort();

    expect(releasedActionIds).toHaveLength(72);
    expect(executable).toEqual(releasedActionIds);
  });
});
