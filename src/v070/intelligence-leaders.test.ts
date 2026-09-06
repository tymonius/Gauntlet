import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { viewV070GameForPlayer } from './views';

type IntelligenceStarter =
  | 'intelligence-ranger-field-operations'
  | 'intelligence-spymaster-mission-network';

function readyGame(starter: IntelligenceStarter): V070GameState {
  let state = createV070StarterGame({
    gameId: 'intelligence-leaders-test',
    seed: 'intelligence-leaders-seed',
    players: {
      A: { name: 'Intelligence', starterDeckId: starter },
      B: { name: 'Opponent', starterDeckId: 'military-commandant-holdfast' },
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
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function toMovement(state: V070GameState): V070GameState {
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  return reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
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

function seedSatisfiedMission(
  state: V070GameState,
  cardId: string,
  satisfied: boolean,
): string {
  const instanceId = `test-A-active-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'A',
  };
  state.players.A.intelligence!.activeMission = {
    instanceId,
    startedTurn: 0,
    satisfiedTurn: satisfied ? state.turnNumber : null,
    progressFlags: [],
  };
  return instanceId;
}

function openBattle(
  state: V070GameState,
  territoryId?: string,
): V070GameState {
  state = toMovement(state);
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  if (territoryId) {
    state.board[3].territoryId = territoryId;
    state.board[3].blank = false;
  }

  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

describe('v0.7.0 Intelligence leaders', () => {
  test('Ranger Fieldcraft spends 1 Intel and suppresses a printed battle Territory effect for the turn', () => {
    let state = readyGame('intelligence-ranger-field-operations');
    state.players.A.intelligence!.intel = 1;
    state = openBattle(state, 'territory-high-ground');

    state = reduceV070BattleAction(state, {
      type: 'use_ranger_fieldcraft',
      playerId: 'A',
      territoryPosition: 3,
    });
    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });

    expect(state.players.A.intelligence?.intel).toBe(0);
    expect(state.players.A.intelligence?.fieldcraftUsedTurn)
      .toBe(state.turnNumber);
    expect(state.territoryEffectSuppressions).toContainEqual(
      expect.objectContaining({
        source: 'fieldcraft',
        playerId: 'A',
        territoryInstanceId: state.board[3].territoryInstanceId,
        scope: 'turn',
      }),
    );
    expect(state.battleRuntime?.participants.B.advantage).toBe(0);
  });

  test('a battle-based Mission is marked satisfied only after it was active on a later turn', () => {
    let state = readyGame('intelligence-spymaster-mission-network');
    seedSatisfiedMission(state, 'intelligence-disinformation', false);
    const opponentGambit = injectHandCard(
      state,
      'B',
      'neutral-new-recruits',
      'opponent-gambit',
    );
    state = openBattle(state);

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: opponentGambit,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });

    expect(state.players.A.intelligence?.activeMission?.satisfiedTurn)
      .toBe(state.turnNumber);
    expect(viewV070GameForPlayer(state, 'A').players.A.intelligence
      ?.activeMission?.satisfied).toBe(true);
    expect(viewV070GameForPlayer(state, 'B').players.A.intelligence
      ?.activeMission?.satisfied).toBeUndefined();
  });

  test('Spymaster Mission Control immediately starts another normal Mission after completion without another Action', () => {
    let state = readyGame('intelligence-spymaster-mission-network');
    const completed = seedSatisfiedMission(
      state,
      'intelligence-disinformation',
      true,
    );
    const nextMission = injectHandCard(
      state,
      'A',
      'intelligence-fog-of-war',
      'mission-control',
    );

    state = toMovement(state);
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });
    expect(state.turnState?.phase).toBe('denouement');

    state = reduceV070TurnAction(state, {
      type: 'intelligence_complete_mission',
      playerId: 'A',
      missionControlCardInstanceId: nextMission,
    });

    expect(state.players.A.zones.discardPile).toContain(completed);
    expect(state.players.A.intelligence?.operationProgress).toBe(1);
    expect(state.players.A.intelligence?.intel).toBe(2);
    expect(state.players.A.intelligence?.missionControlUsedTurn)
      .toBe(state.turnNumber);
    expect(state.players.A.intelligence?.activeMission).toEqual({
      instanceId: nextMission,
      startedTurn: state.turnNumber,
      satisfiedTurn: null,
      progressFlags: [],
    });
    expect(state.turnState?.actionsAvailable).toBe(0);
  });

  test('Mission Control cannot start a Mission that can complete on the same turn', () => {
    let state = readyGame('intelligence-spymaster-mission-network');
    seedSatisfiedMission(state, 'intelligence-disinformation', true);
    const nextMission = injectHandCard(
      state,
      'A',
      'intelligence-fog-of-war',
      'same-turn',
    );

    state = toMovement(state);
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'A',
      choice: 'hold',
    });
    state = reduceV070TurnAction(state, {
      type: 'intelligence_complete_mission',
      playerId: 'A',
      missionControlCardInstanceId: nextMission,
    });

    expect(state.players.A.intelligence?.activeMission?.startedTurn)
      .toBe(state.turnNumber);
    expect(state.players.A.intelligence?.activeMission?.satisfiedTurn)
      .toBeNull();
  });
});
