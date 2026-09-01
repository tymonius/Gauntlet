import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070BattleAction } from './battle-engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  suppressV070PrintedTerritoryDuringMovement,
} from './territories';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'territory-battle-core',
    seed: 'territory-battle-core-seed',
    players: {
      A: { name: 'Attacker', starterDeckId: militaryA },
      B: { name: 'Defender', starterDeckId: militaryB },
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

function injectHandCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `territory-battle-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function beginBattle(
  territoryId: string,
  controller: 'A' | 'B' | null,
  beforeAdvance?: (state: V070GameState) => void,
): V070GameState {
  let state = openingForA();
  const contested = state.board[3];
  contested.territoryId = territoryId;
  contested.controller = controller;

  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  beforeAdvance?.(state);
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  expect(state.battle?.attacker).toBe('A');
  expect(state.battle?.defender).toBe('B');

  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  expect(state.battleRuntime?.stage).toBe('set_gambits');
  return state;
}

describe('v0.7.0 core battle Territory effects', () => {
  test('Garrison gives its defending controller +1 Reserve', () => {
    let state = beginBattle(
      'territory-garrison',
      'B',
    );

    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(1);
    expect(state.battleRuntime?.participants.A.reserveBonus).toBe(0);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });

    expect(state.battleRuntime?.participants.A.reserve).toHaveLength(3);
    expect(state.battleRuntime?.participants.B.reserve).toHaveLength(4);
  });

  test('High Ground grants the defender Advantage', () => {
    const state = beginBattle(
      'territory-high-ground',
      'A',
    );

    expect(state.battleRuntime?.participants.B.advantage).toBe(1);
    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
    expect(state.battleRuntime?.activePrintedTerritoryAtOnset)
      .toEqual({
        territoryInstanceId: state.board[3].territoryInstanceId,
        territoryId: 'territory-high-ground',
      });
  });

  test('Watchtower makes the attacker set first and face up while its controller defends', () => {
    let state = openingForA();
    state.board[3].territoryId = 'territory-watchtower';
    state.board[3].controller = 'B';
    const gambit = injectHandCard(
      state,
      'A',
      'neutral-rallying-cry',
      'watchtower-gambit',
    );

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

    expect(state.battleRuntime?.gambitOrderOverride).toEqual({
      source: 'watchtower',
      firstPlayer: 'A',
      secondPlayer: 'B',
      nextPlayer: 'A',
      firstCommitmentFaceUp: true,
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    })).toThrow(/A must make the next Gambit choice/);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: gambit,
    });

    expect(state.battleRuntime?.participants.A.gambit)
      .toEqual(expect.objectContaining({
        instanceId: gambit,
        faceUp: true,
      }));
    expect(state.events.some(event =>
      event.type === 'gambit_identity'
      && event.visibility === 'public'
      && (event.payload as { instanceId?: string })?.instanceId === gambit
    )).toBe(true);
  });

  test('Exposed Flank prevents the occupier from setting a Gambit during a Counterattack', () => {
    let state = beginBattle(
      'territory-exposed-flank',
      'A',
    );
    const gambit = injectHandCard(
      state,
      'B',
      'neutral-rallying-cry',
      'occupier-gambit',
    );

    expect(state.battleRuntime?.gambitProhibitedPlayers).toEqual(['B']);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    expect(() => reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: gambit,
    })).toThrow(/B cannot set a Gambit/);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    expect(state.battleRuntime?.participants.B.gambit).toBeNull();
  });

  test.each([
    'territory-arena-spoils-of-war',
    'territory-arena-no-quarter',
    'territory-arena-single-combat',
    'territory-arena-grand-melee',
  ])('%s removes Defensive Edge', territoryId => {
    const state = beginBattle(territoryId, 'B');
    expect(state.battle?.defensiveEdgeRemoved).toBe(true);
  });

  test('Pathfinders-style suppression during Movement prevents a battle Territory effect from applying', () => {
    const state = beginBattle(
      'territory-high-ground',
      'B',
      current => {
        suppressV070PrintedTerritoryDuringMovement(
          current,
          'A',
          3,
          'test-pathfinders',
        );
      },
    );

    expect(state.battleRuntime?.participants.B.advantage).toBe(0);
    expect(state.battleRuntime?.activePrintedTerritoryAtOnset).toBeNull();
    expect(state.events.some(event =>
      event.type === 'territory_battle_effect_applied'
      && (event.payload as { territoryId?: string })?.territoryId ===
        'territory-high-ground'
    )).toBe(false);
  });
});
