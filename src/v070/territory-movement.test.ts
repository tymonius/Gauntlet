import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { placeV070OverlayFromHand } from './overlays';
import {
  suppressV070PrintedTerritoryDuringMovement,
  v070PrintedTerritoryEffectActive,
} from './territories';
import { reduceV070TurnAction } from './turn-engine';

const militaryGeneral = 'military-general-forward-doctrine';
const intelligenceRanger = 'intelligence-ranger-field-operations';

function openingForB(
  starterB = militaryGeneral,
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'territory-movement',
    seed: `territory-movement-${starterB}`,
    players: {
      A: {
        name: 'Opponent',
        starterDeckId: 'military-commandant-holdfast',
      },
      B: {
        name: 'Territory Player',
        starterDeckId: starterB,
      },
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
  expect(state.activePlayer).toBe('B');
  expect(state.turnState?.phase).toBe('capture');
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

function putBAt(
  state: V070GameState,
  position: number,
): void {
  for (const territory of state.board) territory.occupant = null;
  state.players.B.position = position;
  state.board.find(territory => territory.position === position)!.occupant =
    'B';
  const safeA = position <= 2
    ? state.board.length - 1
    : 0;
  state.players.A.position = safeA;
  state.board.find(territory => territory.position === safeA)!.occupant =
    'A';
}

function reachOpening(state: V070GameState): V070GameState {
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

describe('v0.7.0 movement and start-turn Territory effects', () => {
  test('Supply Depot grants its controller +1 Card on the first turn before Capture resolves', () => {
    let state = openingForB(militaryGeneral);
    const depot = state.board.find(
      territory => territory.territoryId === 'territory-supply-depot',
    )!;
    depot.controller = 'B';
    putBAt(state, depot.position);
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'B',
    });

    expect(state.players.B.zones.hand).toHaveLength(handBefore + 1);
    expect(state.turnState?.phase).toBe('draw');
    expect(state.turnState?.startTurnTerritoryEffectsApplied).toBe(true);
    expect(state.events.some(event =>
      event.type === 'territory_effect_applied'
      && (event.payload as { territoryId?: string })?.territoryId ===
        'territory-supply-depot'
    )).toBe(true);
  });

  test("King's Road grants one optional additional normal movement Position", () => {
    let state = openingForB(militaryGeneral);
    const road = state.board.find(
      territory => territory.territoryId === 'territory-king-s-road',
    )!;
    putBAt(state, road.position);
    state = reachOpening(state);

    expect(state.turnState?.territoryMovementBonus).toBe(1);
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });

    expect(state.turnState?.phase).toBe('movement');
    expect(state.turnState?.movementRemaining).toBe(2);
    expect(state.turnState?.movementStepQueue).toHaveLength(2);
  });

  test('Quicksand caps normal movement at one Position and removes movement increases', () => {
    let state = openingForB(militaryGeneral);
    const position = state.players.B.position!;
    const territory = state.board.find(
      candidate => candidate.position === position,
    )!;
    territory.territoryId = 'territory-quicksand';
    state = reachOpening(state);
    state.turnState!.territoryMovementBonus = 2;

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });

    expect(state.turnState?.movementRemaining).toBe(1);
    expect(state.turnState?.movementStepQueue).toHaveLength(1);
    expect(state.events.some(event =>
      event.type === 'territory_movement_restricted'
      && (event.payload as { territoryId?: string })?.territoryId ===
        'territory-quicksand'
    )).toBe(true);
  });

  test('entering Difficult Terrain ends movement and blocks only printed card Actions during Denouement', () => {
    let state = openingForB(intelligenceRanger);
    state = reachOpening(state);

    putBAt(state, 3);
    const destination = state.board.find(
      territory => territory.position === 2,
    )!;
    destination.territoryId = 'territory-difficult-terrain';
    state.turnState!.territoryMovementBonus = 1;

    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    expect(state.turnState?.movementRemaining).toBe(2);

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'advance',
    });

    expect(state.players.B.position).toBe(2);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.turnState?.movementSequenceOpen).toBe(false);
    expect(state.turnState?.denouementCardActionBlockedByTerritory)
      .toBe(true);

    const action = injectHandCard(
      state,
      'B',
      'neutral-rallying-cry',
      'blocked-action',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: action,
    })).toThrow(/Difficult Terrain prevents playing a card/);

    const mission = injectHandCard(
      state,
      'B',
      'intelligence-spies',
      'mission-feature',
    );
    state = reduceV070TurnAction(state, {
      type: 'intelligence_start_mission',
      playerId: 'B',
      cardInstanceId: mission,
    });
    expect(state.players.B.intelligence?.activeMission?.instanceId)
      .toBe(mission);
  });

  test('Toll Bridge requires a separate Hand discard to voluntarily Advance from it', () => {
    let state = reachOpening(openingForB(militaryGeneral));
    putBAt(state, 3);
    state.board.find(territory => territory.position === 3)!.territoryId =
      'territory-toll-bridge';
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    const payment = state.players.B.zones.hand[0];

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'advance',
    })).toThrow(/Toll Bridge requires discarding/);

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'advance',
      territoryDiscardInstanceId: payment,
    });

    expect(state.players.B.position).toBe(2);
    expect(state.players.B.zones.hand).not.toContain(payment);
    expect(state.players.B.zones.discardPile).toContain(payment);
  });

  test('falling back onto Refuge draws one card after arrival', () => {
    let state = reachOpening(openingForB(militaryGeneral));
    putBAt(state, 2);
    state.board.find(territory => territory.position === 3)!.territoryId =
      'territory-refuge';
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'B',
    });
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId: 'B',
      choice: 'fall_back',
    });

    expect(state.players.B.position).toBe(3);
    expect(state.players.B.zones.hand.length).toBe(handBefore + 1);
    expect(state.events.some(event =>
      event.type === 'territory_effect_applied'
      && (event.payload as { territoryId?: string })?.territoryId ===
        'territory-refuge'
    )).toBe(true);
  });

  test('an exposed Overlay supersedes the printed Territory effect and movement suppression is scoped to the chosen player and turn', () => {
    const state = openingForB(militaryGeneral);
    const territory = state.board.find(
      candidate => candidate.position === state.players.B.position,
    )!;
    territory.territoryId = 'territory-quicksand';

    expect(v070PrintedTerritoryEffectActive(
      state,
      territory,
      'B',
      'movement',
    )).toBe(true);

    suppressV070PrintedTerritoryDuringMovement(
      state,
      'B',
      territory.position,
      'test-pathfinders',
    );
    expect(v070PrintedTerritoryEffectActive(
      state,
      territory,
      'B',
      'movement',
    )).toBe(false);
    expect(v070PrintedTerritoryEffectActive(
      state,
      territory,
      'A',
      'movement',
    )).toBe(true);
    expect(v070PrintedTerritoryEffectActive(
      state,
      territory,
      'B',
      'start_turn',
    )).toBe(true);

    state.territoryEffectSuppressions = [];
    const overlay = injectHandCard(
      state,
      'B',
      'mystics-circle-of-bones',
      'overlay',
    );
    placeV070OverlayFromHand(
      state,
      'B',
      overlay,
      territory.position,
      'test',
    );
    expect(v070PrintedTerritoryEffectActive(
      state,
      territory,
      'B',
      'movement',
    )).toBe(false);
  });
});
