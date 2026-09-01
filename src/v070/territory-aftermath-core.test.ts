import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070BattleAction } from './battle-engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function openingForA(
  territoryId: string,
  controller: 'A' | 'B',
): V070GameState {
  let state = createV070StarterGame({
    gameId: `territory-aftermath-${territoryId}`,
    seed: `territory-aftermath-${territoryId}-seed`,
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
  for (const territory of state.board) {
    territory.occupant = null;
  }
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[2].blank = true;
  state.board[3].territoryId = territoryId;
  state.board[3].controller = controller;
  state.board[3].blank = false;

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
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
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  expect(state.battleRuntime?.stage).toBe('set_gambits');
  return state;
}

function injectHandCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `territory-aftermath-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function resolveBattle(
  state: V070GameState,
  winner: 'A' | 'B',
  gambits: Partial<Record<'A' | 'B', string>> = {},
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: gambits.A,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: gambits.B,
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
    values: [winner === 'A' ? 6 : 1],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [winner === 'B' ? 6 : 1],
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  expect(state.battle?.winner).toBe(winner);
  return state;
}

describe('v0.7.0 core Territory Aftermath effects', () => {
  test('Field Hospital controller may send one of their battle cards to Discard instead of Graveyard', () => {
    let state = openingForA('territory-field-hospital', 'A');
    const gambit = injectHandCard(
      state,
      'A',
      'neutral-rallying-cry',
      'field-hospital-gambit',
    );
    state = resolveBattle(state, 'B', { A: gambit });

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime?.pendingTerritoryAftermathChoice)
      .toEqual(expect.objectContaining({
        kind: 'field_hospital',
        playerId: 'A',
        candidateInstanceIds: [gambit],
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_territory_aftermath_choice',
      playerId: 'A',
      cardInstanceId: gambit,
    });

    expect(state.players.A.zones.discardPile).toContain(gambit);
    expect(state.players.A.zones.graveyard).not.toContain(gambit);
    expect(state.battle).toBeNull();
  });

  test('Field Hospital choice is optional and declining preserves the normal Graveyard destination', () => {
    let state = openingForA('territory-field-hospital', 'A');
    const gambit = injectHandCard(
      state,
      'A',
      'neutral-rallying-cry',
      'field-hospital-decline',
    );
    state = resolveBattle(state, 'B', { A: gambit });
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_territory_aftermath_choice',
      playerId: 'A',
    });

    expect(state.players.A.zones.graveyard).toContain(gambit);
    expect(state.players.A.zones.discardPile).not.toContain(gambit);
  });

  test('Old Battlefield controller may send one Reserve card to Graveyard instead of Discard', () => {
    let state = openingForA('territory-old-battlefield', 'B');
    state = resolveBattle(state, 'A');
    const reserve = [...state.battleRuntime!.participants.B.reserve];
    expect(reserve).toHaveLength(3);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    const ownerView = viewV070GameForPlayer(state, 'B');
    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(
      ownerView.battleRuntime?.pendingTerritoryAftermathChoice
        ?.candidateInstanceIds,
    ).toEqual(reserve);
    expect(
      opponentView.battleRuntime?.pendingTerritoryAftermathChoice
        ?.candidateInstanceIds,
    ).toBeUndefined();
    expect(
      opponentView.battleRuntime?.pendingTerritoryAftermathChoice
        ?.candidateCount,
    ).toBe(3);

    const chosen = reserve[0];
    state = reduceV070BattleAction(state, {
      type: 'resolve_territory_aftermath_choice',
      playerId: 'B',
      cardInstanceId: chosen,
    });

    expect(state.players.B.zones.graveyard).toContain(chosen);
    for (const other of reserve.slice(1)) {
      expect(state.players.B.zones.discardPile).toContain(other);
    }
  });

  test('Arena: Spoils of War winner may return one Reserve card to Hand instead of Discard', () => {
    let state = openingForA(
      'territory-arena-spoils-of-war',
      'B',
    );
    state = resolveBattle(state, 'A');
    const reserve = [...state.battleRuntime!.participants.A.reserve];
    const chosen = reserve[1];

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battleRuntime?.pendingTerritoryAftermathChoice)
      .toEqual(expect.objectContaining({
        kind: 'spoils_of_war',
        playerId: 'A',
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_territory_aftermath_choice',
      playerId: 'A',
      cardInstanceId: chosen,
    });

    expect(state.players.A.zones.hand).toContain(chosen);
    expect(state.players.A.zones.discardPile).not.toContain(chosen);
    for (const other of reserve.filter(id => id !== chosen)) {
      expect(state.players.A.zones.discardPile).toContain(other);
    }
  });

  test('Arena: No Quarter makes a losing defender Retreat one additional Position when able', () => {
    let state = openingForA(
      'territory-arena-no-quarter',
      'B',
    );
    state = resolveBattle(state, 'A');

    // B normally retreats from 3 to 4; No Quarter adds one more to 5.
    expect(state.battle?.positions.B).toBe(5);
    expect(state.events.some(event =>
      event.type === 'territory_aftermath_retreat'
      && (event.payload as { loser?: string; from?: number; to?: number })
        ?.loser === 'B'
      && (event.payload as { from?: number })?.from === 4
      && (event.payload as { to?: number })?.to === 5
    )).toBe(true);
  });

  test('Arena: No Quarter extra Retreat stops at the player end if another Position is unavailable', () => {
    let state = openingForA(
      'territory-arena-no-quarter',
      'B',
    );
    state.players.A.position = 4;
    state.players.B.position = 5;
    for (const territory of state.board) territory.occupant = null;
    state.board[4].occupant = 'A';
    state.board[5].occupant = 'B';
    state.board[5].territoryId = 'territory-arena-no-quarter';
    state.board[5].controller = 'B';

    // Rebuild the active battle at the endpoint-friendly positions.
    state.battle!.attackerOrigin = 4;
    state.battle!.contestedPosition = 5;
    state.battle!.positions = { A: 4, B: 5 };
    state.battleRuntime = null;
    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    state = resolveBattle(state, 'A');

    // B's normal retreat reaches 6 and the extra retreat cannot go farther.
    expect(state.battle?.positions.B).toBe(6);
    expect(state.events.filter(event =>
      event.type === 'territory_aftermath_retreat'
    )).toHaveLength(0);
  });

  test('Pathfinders suppression disables both optional Aftermath choices and No Quarter extra Retreat', () => {
    let state = openingForA(
      'territory-arena-no-quarter',
      'B',
    );
    state.territoryEffectSuppressions.push({
      source: 'pathfinders',
      sourceActionInstanceId: 'test-pathfinders',
      playerId: 'A',
      territoryInstanceId: state.board[3].territoryInstanceId,
      turnNumber: state.turnNumber,
      scope: 'movement',
    });
    // Reinitialize battle runtime so the suppression is observed at Onset.
    state.battleRuntime = null;
    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    state = resolveBattle(state, 'A');

    expect(state.battle?.positions.B).toBe(4);
    expect(state.events.some(event =>
      event.type === 'territory_aftermath_retreat'
    )).toBe(false);
  });
});
