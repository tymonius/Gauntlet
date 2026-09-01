import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  v070DeedCost,
  v070DeedOwner,
} from './financiers';
import { reduceV070TurnAction } from './turn-engine';

const militaryStarter = 'military-commandant-holdfast';
const financierStarter = 'financiers-banker-sound-investment';

function openingForFinancierB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'leveraged-buyout-action',
    seed: 'leveraged-buyout-action-seed',
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

function inject(
  state: V070GameState,
  cardId: string,
  zone: 'hand' | 'treasury',
  suffix: string,
): string {
  const instanceId = `test-B-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'B',
  };
  if (zone === 'treasury') {
    state.players.B.financiers!.treasury.push(instanceId);
  } else {
    state.players.B.zones.hand.push(instanceId);
  }
  return instanceId;
}

function latestTerritoryPositions(state: V070GameState): number[] {
  const event = [...state.events].reverse().find(candidate =>
    candidate.type === 'action_effect_choice_pending'
    && (candidate.payload as { kind?: string })?.kind ===
      'leveraged_buyout_deed_target'
  );
  return (event?.payload as { territoryPositions?: number[] })
    ?.territoryPositions ?? [];
}

function targetTerritory(
  state: V070GameState,
  position: number,
) {
  const territory = state.board.find(candidate =>
    candidate.position === position
  );
  if (!territory) throw new Error('Missing test Territory.');
  return territory;
}

describe('v0.7.0 Leveraged Buyout Action', () => {
  test('rejects before spending the Action when no Deed is payable with Capital plus all available collateral', () => {
    const state = openingForFinancierB();
    state.players.B.financiers!.capital = 0;
    state.players.B.financiers!.treasury = [];
    state.players.B.zones.hand = [];
    const source = inject(
      state,
      'financiers-leveraged-buyout',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one Deed you can currently purchase/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('can buy a Deed entirely with Capital by choosing zero collateral', () => {
    let state = openingForFinancierB();
    state.players.B.financiers!.capital = 20;
    const source = inject(
      state,
      'financiers-leveraged-buyout',
      'hand',
      'source',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    const position = latestTerritoryPositions(state)[0];
    expect(position).toBeDefined();
    const territory = targetTerritory(state, position);
    const cost = v070DeedCost(
      state,
      'B',
      territory.territoryInstanceId,
    );
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'choose_leveraged_buyout_deed_target',
      playerId: 'B',
      territoryPosition: position,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_leveraged_buyout_collateral',
      playerId: 'B',
      collateralInstanceIds: [],
    });

    expect(v070DeedOwner(state, territory.territoryInstanceId)).toBe('B');
    expect(state.players.B.financiers!.capital).toBe(capitalBefore - cost);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
  });

  test('Hand collateral can pay the entire cost and goes to the Graveyard after purchase', () => {
    let state = openingForFinancierB();
    state.players.B.financiers!.capital = 0;
    state.players.B.zones.hand = [];
    const source = inject(
      state,
      'financiers-leveraged-buyout',
      'hand',
      'source',
    );
    const collateral = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'collateral',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    const position = latestTerritoryPositions(state)[0];
    expect(position).toBeDefined();
    const territory = targetTerritory(state, position);

    state = reduceV070TurnAction(state, {
      type: 'choose_leveraged_buyout_deed_target',
      playerId: 'B',
      territoryPosition: position,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_leveraged_buyout_collateral',
      playerId: 'B',
      collateralInstanceIds: [collateral],
    });

    expect(state.players.B.financiers!.capital).toBe(0);
    expect(state.players.B.zones.hand).not.toContain(collateral);
    expect(state.players.B.zones.graveyard).toContain(collateral);
    expect(v070DeedOwner(state, territory.territoryInstanceId)).toBe('B');

    const resolved = [...state.events].reverse().find(event =>
      event.type === 'leveraged_buyout_resolved'
    );
    expect(resolved?.payload).toEqual(expect.objectContaining({
      capitalPaid: 0,
      collateralValue: 5,
      collateralCards: [
        expect.objectContaining({
          instanceId: collateral,
          cardId: 'neutral-manifest-destiny',
        }),
      ],
    }));
  });

  test('Treasury collateral is removed to the Graveyard and only the uncovered balance is paid in Capital', () => {
    let state = openingForFinancierB();
    state.players.B.financiers!.capital = 10;
    const source = inject(
      state,
      'financiers-leveraged-buyout',
      'hand',
      'source',
    );
    const collateral = inject(
      state,
      'neutral-rallying-cry',
      'treasury',
      'treasury-collateral',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    const position = latestTerritoryPositions(state)[0];
    expect(position).toBeDefined();
    const territory = targetTerritory(state, position);
    const cost = v070DeedCost(
      state,
      'B',
      territory.territoryInstanceId,
    );
    const collateralValue = 1;
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'choose_leveraged_buyout_deed_target',
      playerId: 'B',
      territoryPosition: position,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_leveraged_buyout_collateral',
      playerId: 'B',
      collateralInstanceIds: [collateral],
    });

    expect(state.players.B.financiers!.treasury).not.toContain(collateral);
    expect(state.players.B.zones.graveyard).toContain(collateral);
    expect(state.players.B.financiers!.capital).toBe(
      capitalBefore - Math.max(0, cost - collateralValue),
    );
  });

  test('unused collateral value is lost rather than converted to Capital', () => {
    let state = openingForFinancierB();
    state.players.B.financiers!.capital = 7;
    const source = inject(
      state,
      'financiers-leveraged-buyout',
      'hand',
      'source',
    );
    const collateral = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'overpay',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    const position = latestTerritoryPositions(state)[0];
    const territory = targetTerritory(state, position);
    const cost = v070DeedCost(
      state,
      'B',
      territory.territoryInstanceId,
    );
    expect(cost).toBeLessThanOrEqual(5);
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'choose_leveraged_buyout_deed_target',
      playerId: 'B',
      territoryPosition: position,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_leveraged_buyout_collateral',
      playerId: 'B',
      collateralInstanceIds: [collateral],
    });

    expect(state.players.B.financiers!.capital).toBe(capitalBefore);
    const resolved = [...state.events].reverse().find(event =>
      event.type === 'leveraged_buyout_resolved'
    );
    expect(resolved?.payload).toEqual(expect.objectContaining({
      collateralValue: 5,
      collateralApplied: cost,
      unusedCollateralValue: 5 - cost,
    }));
  });

  test('collateral is revalidated and duplicate collateral is rejected without consuming the pending purchase', () => {
    let state = openingForFinancierB();
    state.players.B.financiers!.capital = 0;
    state.players.B.zones.hand = [];
    const source = inject(
      state,
      'financiers-leveraged-buyout',
      'hand',
      'source',
    );
    const collateral = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'collateral',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    const position = latestTerritoryPositions(state)[0];
    state = reduceV070TurnAction(state, {
      type: 'choose_leveraged_buyout_deed_target',
      playerId: 'B',
      territoryPosition: position,
    });

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_leveraged_buyout_collateral',
      playerId: 'B',
      collateralInstanceIds: [collateral, collateral],
    })).toThrow(/same collateral card twice/);

    const index = state.players.B.zones.hand.indexOf(collateral);
    state.players.B.zones.hand.splice(index, 1);
    state.players.B.zones.discardPile.push(collateral);

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_leveraged_buyout_collateral',
      playerId: 'B',
      collateralInstanceIds: [collateral],
    })).toThrow(/still be in your Hand or Treasury/);

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'leveraged_buyout_collateral',
      sourceActionInstanceId: source,
    }));
  });

  test('buying the final required Deed can win through Controlling Interest and still clears the pending Action', () => {
    let state = openingForFinancierB();
    state.players.B.financiers!.capital = 50;

    const finalDeed = state.deeds.at(-1)!;
    for (const deed of state.deeds) {
      deed.owner = deed === finalDeed ? null : 'B';
    }
    const finalTerritory = state.board.find(territory =>
      territory.territoryInstanceId === finalDeed.territoryInstanceId
    )!;

    const source = inject(
      state,
      'financiers-leveraged-buyout',
      'hand',
      'source',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(latestTerritoryPositions(state)).toContain(finalTerritory.position);
    state = reduceV070TurnAction(state, {
      type: 'choose_leveraged_buyout_deed_target',
      playerId: 'B',
      territoryPosition: finalTerritory.position,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_leveraged_buyout_collateral',
      playerId: 'B',
      collateralInstanceIds: [],
    });

    expect(state.stage).toBe('ended');
    expect(state.winner).toBe('B');
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.events.some(event =>
      event.type === 'game_won'
      && (event.payload as { route?: string })?.route ===
        'controlling_interest'
    )).toBe(true);
  });
});
