import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const militaryStarter = 'military-commandant-holdfast';
const financierStarter = 'financiers-banker-sound-investment';

function openingForFinancierB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'speculation-action',
    seed: 'speculation-action-seed',
    players: {
      A: { name: 'Opponent', starterDeckId: militaryStarter },
      B: { name: 'Financier', starterDeckId: financierStarter },
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
  cardId: string,
  suffix: string,
): string {
  const instanceId = `test-B-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'B',
  };
  state.players.B.zones.hand.push(instanceId);
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

function placeSpeculation(
  state: V070GameState,
): {
  state: V070GameState;
  source: string;
  targetPosition: number;
  targetInstanceId: string;
} {
  const source = injectHandCard(
    state,
    'financiers-speculation',
    'source',
  );
  state = reduceV070TurnAction(state, {
    type: 'play_action_card',
    playerId: 'B',
    cardInstanceId: source,
  });

  const pendingEvent = [...state.events].reverse().find(event =>
    event.type === 'action_effect_choice_pending'
    && (event.payload as { kind?: string })?.kind ===
      'speculation_territory_target'
  );
  const positions = (pendingEvent?.payload as {
    territoryPositions?: number[];
  })?.territoryPositions ?? [];
  expect(positions.length).toBeGreaterThan(0);

  const targetPosition = positions[0];
  const target = state.board.find(
    territory => territory.position === targetPosition,
  )!;
  state = reduceV070TurnAction(state, {
    type: 'choose_speculation_territory_target',
    playerId: 'B',
    territoryPosition: targetPosition,
  });

  return {
    state,
    source,
    targetPosition,
    targetInstanceId: target.territoryInstanceId,
  };
}

describe('v0.7.0 Speculation Action', () => {
  test('rejects before spending when every Territory is controlled or occupied by the Financier', () => {
    const state = openingForFinancierB();
    for (const territory of state.board) territory.controller = 'B';
    const source = injectHandCard(
      state,
      'financiers-speculation',
      'invalid',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/neither control nor occupy/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('places the physical card face up beside a stable eligible Territory and not in an Asset/Overlay zone', () => {
    const placed = placeSpeculation(openingForFinancierB());
    const state = placed.state;

    expect(state.speculations).toEqual([{
      instanceId: placed.source,
      owner: 'B',
      territoryInstanceId: placed.targetInstanceId,
      placedTurn: state.turnNumber,
    }]);
    expect(state.players.B.zones.hand).not.toContain(placed.source);
    expect(state.players.B.zones.assetBank).not.toContain(placed.source);
    expect(state.players.B.zones.discardPile).not.toContain(placed.source);
    expect(state.players.B.zones.graveyard).not.toContain(placed.source);
    expect(state.overlays.some(
      overlay => overlay.instanceId === placed.source,
    )).toBe(false);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();

    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(opponentView.speculations).toEqual([
      expect.objectContaining({
        instanceId: placed.source,
        cardId: 'financiers-speculation',
        owner: 'B',
        territoryInstanceId: placed.targetInstanceId,
        territoryPosition: placed.targetPosition,
      }),
    ]);
  });

  test('at the start of the owner next turn, controlling the tracked Territory gains 2 Capital and discards Speculation', () => {
    let placed = placeSpeculation(openingForFinancierB());
    let state = placed.state;
    const capitalBefore = state.players.B.financiers!.capital;

    state = completeRestOfTurn(state, 'B');
    expect(state.activePlayer).toBe('A');

    state = advanceToCleanup(state, 'A');
    const target = state.board.find(
      territory =>
        territory.territoryInstanceId === placed.targetInstanceId,
    )!;
    target.controller = 'B';

    state = completeCleanup(state, 'A');

    expect(state.activePlayer).toBe('B');
    expect(state.turnState?.phase).toBe('capture');
    expect(state.players.B.financiers!.capital).toBe(capitalBefore + 2);
    expect(state.speculations).toEqual([]);
    expect(state.players.B.zones.discardPile).toContain(placed.source);
    expect(state.players.B.zones.graveyard).not.toContain(placed.source);

    const resolved = [...state.events].reverse().find(event =>
      event.type === 'speculation_resolved'
      && (event.payload as { instanceId?: string })?.instanceId ===
        placed.source
    );
    expect(resolved?.payload).toEqual(expect.objectContaining({
      territoryInstanceId: placed.targetInstanceId,
      succeeded: true,
      capitalGained: 2,
      destination: 'discard',
    }));

    const turnStartedIndex = state.events.findIndex(event =>
      event.type === 'turn_started'
      && event.actor === 'B'
      && (event.payload as { turnNumber?: number })?.turnNumber ===
        state.turnNumber
    );
    const resolvedIndex = state.events.findIndex(event =>
      event.type === 'speculation_resolved'
      && (event.payload as { instanceId?: string })?.instanceId ===
        placed.source
    );
    expect(resolvedIndex).toBeGreaterThan(turnStartedIndex);
  });

  test('at the start of the owner next turn, failing to control or occupy the tracked Territory puts Speculation in the Graveyard', () => {
    let placed = placeSpeculation(openingForFinancierB());
    let state = placed.state;
    const capitalBefore = state.players.B.financiers!.capital;

    state = completeRestOfTurn(state, 'B');
    expect(state.activePlayer).toBe('A');
    state = completeRestOfTurn(state, 'A');

    expect(state.activePlayer).toBe('B');
    expect(state.players.B.financiers!.capital).toBe(capitalBefore);
    expect(state.speculations).toEqual([]);
    expect(state.players.B.zones.graveyard).toContain(placed.source);
    expect(state.players.B.zones.discardPile).not.toContain(placed.source);

    const resolved = [...state.events].reverse().find(event =>
      event.type === 'speculation_resolved'
      && (event.payload as { instanceId?: string })?.instanceId ===
        placed.source
    );
    expect(resolved?.payload).toEqual(expect.objectContaining({
      succeeded: false,
      capitalGained: 0,
      destination: 'graveyard',
    }));
  });

  test('target legality is revalidated after Action-play reactions before placement', () => {
    let state = openingForFinancierB();
    const source = injectHandCard(
      state,
      'financiers-speculation',
      'stale',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const pendingEvent = [...state.events].reverse().find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { kind?: string })?.kind ===
        'speculation_territory_target'
    );
    const position = (pendingEvent?.payload as {
      territoryPositions?: number[];
    }).territoryPositions![0];
    const target = state.board.find(
      territory => territory.position === position,
    )!;
    target.controller = 'B';

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_speculation_territory_target',
      playerId: 'B',
      territoryPosition: position,
    })).toThrow(/currently neither control nor occupy/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'speculation_territory_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
  });

  test('tracking follows Territory instance identity when numeric positions shift', () => {
    let placed = placeSpeculation(openingForFinancierB());
    const state = placed.state;
    const tracked = state.speculations[0];

    for (const territory of state.board) {
      if (territory.position >= placed.targetPosition) {
        territory.position += 1;
      }
    }

    const view = viewV070GameForPlayer(state, 'A');
    expect(view.speculations[0]).toEqual(expect.objectContaining({
      territoryInstanceId: tracked.territoryInstanceId,
      territoryPosition: placed.targetPosition + 1,
    }));
  });
});
