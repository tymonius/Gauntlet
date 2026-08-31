import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  insertV070ControlledTerritory,
  insertV070TerritoryAtFrontLine,
  insertV070TerritoryAtPlayerEnd,
  v070FrontLineInsertionPosition,
} from './gauntlet';
import {
  effectiveV070AssetLimit,
} from './assets';
import {
  v070CapitalLimit,
} from './financiers';

const militaryStarter = 'military-commandant-holdfast';
const financierStarter = 'financiers-banker-sound-investment';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'dynamic-gauntlet',
    seed: 'dynamic-gauntlet-seed',
    players: {
      A: { name: 'A', starterDeckId: militaryStarter },
      B: { name: 'B', starterDeckId: financierStarter },
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

  expect(state.board.map(territory => territory.position))
    .toEqual([0, 1, 2, 3, 4, 5]);
  return state;
}

describe('v0.7.0 dynamic Gauntlet insertion', () => {
  test('A-end insertion shifts numeric positions without moving either token off its existing Territory', () => {
    const state = readyGame();
    const aOccupiedInstance = state.board.find(
      territory => territory.occupant === 'A',
    )!.territoryInstanceId;
    const bOccupiedInstance = state.board.find(
      territory => territory.occupant === 'B',
    )!.territoryInstanceId;
    const aPositionBefore = state.players.A.position;
    const bPositionBefore = state.players.B.position;

    const result = insertV070TerritoryAtPlayerEnd(
      state,
      'A',
      {
        territoryInstanceId: 'manifest-A',
        territoryId: 'neutral-manifest-destiny',
        contributedBy: 'A',
        blank: true,
      },
      'test',
    );

    expect(result).toEqual({
      insertedPosition: 0,
      territoryInstanceId: 'manifest-A',
      playerTokenMovementOccurred: false,
      enteredTerritory: false,
    });
    expect(state.board.map(territory => territory.position))
      .toEqual([0, 1, 2, 3, 4, 5, 6]);

    const inserted = state.board[0];
    expect(inserted).toEqual(expect.objectContaining({
      territoryInstanceId: 'manifest-A',
      territoryId: 'neutral-manifest-destiny',
      controller: 'A',
      occupant: null,
      blank: true,
    }));

    const aOccupied = state.board.find(
      territory => territory.territoryInstanceId === aOccupiedInstance,
    )!;
    const bOccupied = state.board.find(
      territory => territory.territoryInstanceId === bOccupiedInstance,
    )!;
    expect(aOccupied.occupant).toBe('A');
    expect(bOccupied.occupant).toBe('B');
    expect(state.players.A.position).toBe(aOccupied.position);
    expect(state.players.B.position).toBe(bOccupied.position);
    expect(state.players.A.position).toBe(aPositionBefore! + 1);
    expect(state.players.B.position).toBe(bPositionBefore! + 1);
  });

  test('B-end insertion appends a controlled blank Territory without changing existing numeric token positions', () => {
    const state = readyGame();
    const aPositionBefore = state.players.A.position;
    const bPositionBefore = state.players.B.position;
    const deedsBefore = state.deeds.length;
    const assetLimitBefore = effectiveV070AssetLimit(state, 'B');
    const capitalLimitBefore = v070CapitalLimit(state, 'B');

    insertV070TerritoryAtPlayerEnd(
      state,
      'B',
      {
        territoryInstanceId: 'manifest-B',
        territoryId: 'neutral-manifest-destiny',
        contributedBy: 'B',
        blank: true,
      },
      'test',
    );

    expect(state.players.A.position).toBe(aPositionBefore);
    expect(state.players.B.position).toBe(bPositionBefore);
    expect(state.board.at(-1)).toEqual(expect.objectContaining({
      territoryInstanceId: 'manifest-B',
      position: 6,
      controller: 'B',
      occupant: null,
      blank: true,
    }));
    expect(state.deeds).toHaveLength(deedsBefore + 1);
    expect(state.deeds).toContainEqual({
      territoryInstanceId: 'manifest-B',
      owner: null,
    });
    expect(effectiveV070AssetLimit(state, 'B')).toBe(assetLimitBefore + 1);
    expect(v070CapitalLimit(state, 'B')).toBe(capitalLimitBefore + 1);
  });

  test('existing instance-ID attachments continue pointing to the same Territory after positions shift', () => {
    const state = readyGame();
    const attachedTerritory = state.board[2];
    state.overlays.push({
      instanceId: 'test-overlay',
      owner: 'A',
      territoryInstanceId: attachedTerritory.territoryInstanceId,
      placedTurn: state.turnNumber,
      sequence: state.nextOverlaySequence++,
    });

    insertV070TerritoryAtPlayerEnd(
      state,
      'A',
      {
        territoryInstanceId: 'inserted',
        territoryId: 'neutral-manifest-destiny',
        contributedBy: 'A',
        blank: true,
      },
      'test',
    );

    const sameTerritory = state.board.find(
      territory =>
        territory.territoryInstanceId === attachedTerritory.territoryInstanceId,
    )!;
    expect(sameTerritory.position).toBe(3);
    expect(state.overlays[0].territoryInstanceId)
      .toBe(sameTerritory.territoryInstanceId);
  });

  test('Front Line insertion uses the validated boundary on either side', () => {
    const aState = readyGame();
    expect(v070FrontLineInsertionPosition(aState, 'A')).toBe(3);
    insertV070TerritoryAtFrontLine(
      aState,
      'A',
      {
        territoryInstanceId: 'front-A',
        territoryId: 'neutral-manifest-destiny',
        contributedBy: 'A',
        blank: true,
      },
      'test',
    );
    expect(aState.board[3]).toEqual(expect.objectContaining({
      territoryInstanceId: 'front-A',
      controller: 'A',
    }));

    const bState = readyGame();
    expect(v070FrontLineInsertionPosition(bState, 'B')).toBe(3);
    insertV070TerritoryAtFrontLine(
      bState,
      'B',
      {
        territoryInstanceId: 'front-B',
        territoryId: 'neutral-manifest-destiny',
        contributedBy: 'B',
        blank: true,
      },
      'test',
    );
    expect(bState.board[3]).toEqual(expect.objectContaining({
      territoryInstanceId: 'front-B',
      controller: 'B',
    }));
  });

  test('insertion rejects invalid positions, duplicate instance ids, and pre-existing board gaps', () => {
    const state = readyGame();

    expect(() => insertV070ControlledTerritory(
      state,
      'A',
      -1,
      {
        territoryInstanceId: 'invalid',
        territoryId: 'neutral-manifest-destiny',
        contributedBy: 'A',
      },
    )).toThrow(/between existing Gauntlet Positions/);

    expect(() => insertV070ControlledTerritory(
      state,
      'A',
      1,
      {
        territoryInstanceId: state.board[0].territoryInstanceId,
        territoryId: 'neutral-manifest-destiny',
        contributedBy: 'A',
      },
    )).toThrow(/already in the Gauntlet/);

    state.board[2].position = 4;
    expect(() => insertV070ControlledTerritory(
      state,
      'A',
      1,
      {
        territoryInstanceId: 'gap-test',
        territoryId: 'neutral-manifest-destiny',
        contributedBy: 'A',
      },
    )).toThrow(/contiguous Position labels/);
  });

  test('the new Deed expands Controlling Interest instead of being silently ignored', () => {
    const state = readyGame();
    insertV070TerritoryAtPlayerEnd(
      state,
      'B',
      {
        territoryInstanceId: 'new-required-deed',
        territoryId: 'neutral-manifest-destiny',
        contributedBy: 'B',
        blank: true,
      },
      'test',
    );

    for (const deed of state.deeds) {
      if (deed.territoryInstanceId !== 'new-required-deed') {
        deed.owner = 'B';
      }
    }

    expect(state.deeds.filter(deed => deed.owner === 'B')).toHaveLength(6);
    expect(state.board).toHaveLength(7);
    expect(state.stage).toBe('playing');

    state.deeds.find(
      deed => deed.territoryInstanceId === 'new-required-deed',
    )!.owner = 'B';
    expect(state.deeds.every(deed => deed.owner === 'B')).toBe(true);
  });
});
