import { describe, expect, test } from 'vitest';
import {
  V070GameActionError,
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';

const input = {
  gameId: 'test-game',
  seed: 'fixed-seed',
  players: {
    A: {
      name: 'Alpha',
      starterDeckId: 'military-general-forward-doctrine',
    },
    B: {
      name: 'Bravo',
      starterDeckId: 'diplomats-ambassador-open-channels',
    },
  },
} as const;

function afterOpeningSelection(): V070GameState {
  let state = createV070StarterGame(input);
  state = reduceV070SetupAction(state, {
    type: 'choose_opening_discard',
    playerId: 'A',
    cardInstanceId: state.players.A.openingSelection[0],
  });
  state = reduceV070SetupAction(state, {
    type: 'choose_opening_discard',
    playerId: 'B',
    cardInstanceId: state.players.B.openingSelection[0],
  });
  return state;
}

function afterTerritoryArrangement(): V070GameState {
  let state = afterOpeningSelection();
  state = reduceV070SetupAction(state, {
    type: 'arrange_territories',
    playerId: 'A',
    territoryIds: state.players.A.territoryCandidates,
  });
  state = reduceV070SetupAction(state, {
    type: 'arrange_territories',
    playerId: 'B',
    territoryIds: state.players.B.territoryCandidates,
  });
  return state;
}

describe('v0.7.0 authoritative setup state', () => {
  test('instantiates two 30-card physical Decks with unique instance identity', () => {
    const state = createV070StarterGame(input);
    expect(state.rulesVersion).toBe('v0.7.0');
    expect(Object.keys(state.cardInstances)).toHaveLength(60);
    expect(new Set(Object.keys(state.cardInstances)).size).toBe(60);

    for (const playerId of ['A', 'B'] as const) {
      const player = state.players[playerId];
      expect(player.openingSelection).toHaveLength(4);
      expect(player.zones.drawPile).toHaveLength(26);
      expect(player.zones.hand).toHaveLength(0);
      expect(player.zones.discardPile).toHaveLength(0);
    }
  });

  test('uses deterministic shuffling for replayable setup', () => {
    const first = createV070StarterGame(input);
    const second = createV070StarterGame(input);
    expect(first.players.A.openingSelection).toEqual(second.players.A.openingSelection);
    expect(first.players.A.zones.drawPile).toEqual(second.players.A.zones.drawPile);
    expect(first.players.B.openingSelection).toEqual(second.players.B.openingSelection);

    const different = createV070StarterGame({ ...input, seed: 'different-seed' });
    expect(different.players.A.zones.drawPile).not.toEqual(first.players.A.zones.drawPile);
  });

  test('requires each player to discard exactly one of the four opening cards', () => {
    let state = createV070StarterGame(input);
    const discarded = state.players.A.openingSelection[1];
    const kept = state.players.A.openingSelection.filter(id => id !== discarded);

    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId: 'A',
      cardInstanceId: discarded,
    });

    expect(state.players.A.openingSelection).toEqual([]);
    expect(state.players.A.zones.discardPile).toEqual([discarded]);
    expect(state.players.A.zones.hand).toEqual(kept);
    expect(state.setup?.stage).toBe('opening_selection');

    expect(() => reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId: 'A',
      cardInstanceId: kept[0],
    })).toThrow(V070GameActionError);
  });

  test('advances to Territory arrangement only after both opening choices', () => {
    const state = afterOpeningSelection();
    expect(state.setup?.stage).toBe('territory_arrangement');
    expect(state.players.A.zones.hand).toHaveLength(3);
    expect(state.players.B.zones.hand).toHaveLength(3);
    expect(state.players.A.zones.discardPile).toHaveLength(1);
    expect(state.players.B.zones.discardPile).toHaveLength(1);
  });

  test('locks exactly the three released starter Territories for each player', () => {
    let state = afterOpeningSelection();

    expect(() => reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId: 'A',
      territoryIds: [
        state.players.A.territoryCandidates[0],
        state.players.A.territoryCandidates[1],
        state.players.B.territoryCandidates[0],
      ],
    })).toThrow(V070GameActionError);

    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId: 'A',
      territoryIds: [...state.players.A.territoryCandidates].reverse(),
    });
    expect(state.players.A.territoryOrder)
      .toEqual([...state.players.A.territoryCandidates].reverse());
  });

  test('rerolls tied first-player rolls without changing locked setup', () => {
    let state = afterTerritoryArrangement();
    state = reduceV070SetupAction(state, {
      type: 'roll_first_player',
      playerId: 'A',
      value: 4,
    });
    state = reduceV070SetupAction(state, {
      type: 'roll_first_player',
      playerId: 'B',
      value: 4,
    });

    expect(state.stage).toBe('setup');
    expect(state.setup?.stage).toBe('first_player');
    expect(state.setup?.firstPlayerRolls).toEqual({});
    expect(state.players.A.territoryOrder).not.toBeNull();
    expect(state.players.B.territoryOrder).not.toBeNull();
  });

  test('forms the six-Territory Gauntlet and starts Capture after a decisive roll', () => {
    let state = afterTerritoryArrangement();
    const aOrder = [...state.players.A.territoryOrder!];
    const bOrder = [...state.players.B.territoryOrder!];

    state = reduceV070SetupAction(state, {
      type: 'roll_first_player',
      playerId: 'A',
      value: 6,
    });
    state = reduceV070SetupAction(state, {
      type: 'roll_first_player',
      playerId: 'B',
      value: 2,
    });

    expect(state.stage).toBe('playing');
    expect(state.setup).toBeNull();
    expect(state.activePlayer).toBe('A');
    expect(state.turnNumber).toBe(1);
    expect(state.turnState?.phase).toBe('capture');
    expect(state.players.A.position).toBe(0);
    expect(state.players.B.position).toBe(5);

    expect(state.board.map(space => space.territoryId))
      .toEqual([...aOrder, ...bOrder.reverse()]);
    expect(state.board.map(space => space.controller))
      .toEqual(['A', 'A', 'A', 'B', 'B', 'B']);
    expect(state.board.map(space => space.occupant))
      .toEqual(['A', null, null, null, null, 'B']);
  });

  test('does not mutate the input state when applying setup actions', () => {
    const original = createV070StarterGame(input);
    const snapshot = structuredClone(original);
    reduceV070SetupAction(original, {
      type: 'choose_opening_discard',
      playerId: 'A',
      cardInstanceId: original.players.A.openingSelection[0],
    });
    expect(original).toEqual(snapshot);
  });
});
