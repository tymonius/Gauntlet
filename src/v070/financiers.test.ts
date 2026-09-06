import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  applyV070FinancierAfterCapture,
  buyV070Deed,
  v070CapitalLimit,
  v070DeedCost,
  v070DeedsOwned,
  v070TreasuryValue,
} from './financiers';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const militaryStarter = 'military-commandant-holdfast';
const financierStarter = 'financiers-banker-sound-investment';

function setupForFinancierB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'financier-economy-core',
    seed: 'financier-economy-core-seed',
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

  expect(state.turnState?.phase).toBe('capture');
  expect(state.activePlayer).toBe('B');
  return state;
}

function openingForFinancierB(): V070GameState {
  let state = setupForFinancierB();
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

function toDenouement(state: V070GameState): V070GameState {
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'B',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'B',
    choice: 'hold',
  });
  expect(state.turnState?.phase).toBe('denouement');
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

function injectTreasuryCard(
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
  state.players.B.financiers!.treasury.push(instanceId);
  return instanceId;
}

describe('v0.7.0 Financier economy core', () => {
  test('Financiers begin with 2 Capital, an empty Treasury, and one unowned Deed per Territory', () => {
    const state = setupForFinancierB();

    expect(state.players.B.financiers).toEqual({
      capital: 2,
      treasury: [],
      financialCapacityTurn: null,
      financialCapacityUsedTurn: null,
      financierFeatureActionSpentTurn: null,
      deedPurchaseTurn: null,
      hostileTakeoverTurn: null,
      hostileTakeoverTerritoryInstanceId: null,
    });
    expect(state.deeds).toHaveLength(6);
    expect(state.deeds.every(deed => deed.owner === null)).toBe(true);
    expect(
      new Set(state.deeds.map(deed => deed.territoryInstanceId)),
    ).toEqual(
      new Set(state.board.map(territory => territory.territoryInstanceId)),
    );
    expect(v070CapitalLimit(state, 'B')).toBe(3);
  });

  test('Treasury is a public outside-zone store that raises the Capital limit by card value', () => {
    let state = openingForFinancierB();
    const card = injectHandCard(
      state,
      'neutral-manifest-destiny',
      'treasury',
    );
    const limitBefore = v070CapitalLimit(state, 'B');

    state = toDenouement(state);
    state = reduceV070TurnAction(state, {
      type: 'financier_place_treasury',
      playerId: 'B',
      cardInstanceId: card,
    });

    expect(state.players.B.financiers!.treasury).toContain(card);
    expect(state.players.B.zones.hand).not.toContain(card);
    expect(state.players.B.zones.discardPile).not.toContain(card);
    expect(state.players.B.zones.graveyard).not.toContain(card);
    expect(v070TreasuryValue(state, 'B')).toBe(5);
    expect(v070CapitalLimit(state, 'B')).toBe(limitBefore + 5);

    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(opponentView.players.B.financiers?.treasury).toContainEqual({
      instanceId: card,
      cardId: 'neutral-manifest-destiny',
    });
  });

  test('Buy / Buy Out Deed uses the released capped cost formula and spends Capital', () => {
    let state = openingForFinancierB();
    state = toDenouement(state);

    const currentPosition = state.players.B.position!;
    const current = state.board.find(
      territory => territory.position === currentPosition,
    )!;
    expect(current.controller).toBe('B');
    expect(v070DeedCost(state, 'B', current.territoryInstanceId)).toBe(1);

    state = reduceV070TurnAction(state, {
      type: 'financier_buy_deed',
      playerId: 'B',
      territoryPosition: currentPosition,
    });

    expect(state.players.B.financiers?.capital).toBe(1);
    expect(
      state.deeds.find(
        deed => deed.territoryInstanceId === current.territoryInstanceId,
      )?.owner,
    ).toBe('B');
    expect(v070DeedsOwned(state, 'B')).toBe(1);
  });

  test('Income after Capture grants 1 Capital per owned Deed and may exceed the limit temporarily', () => {
    const state = setupForFinancierB();
    state.players.B.financiers!.capital = 2;
    const territory = state.board.find(item => item.controller === 'B')!;
    state.deeds.find(
      deed => deed.territoryInstanceId === territory.territoryInstanceId,
    )!.owner = 'B';

    applyV070FinancierAfterCapture(state, 'B');

    expect(state.players.B.financiers!.capital).toBe(3);
    expect(state.events.some(event =>
      event.type === 'capital_changed'
      && (event.payload as { reason?: string })?.reason ===
        'Financier Income after Capture'
    )).toBe(true);
  });

  test('Financial Capacity supplies a cross-phase second Action only when a Financier Feature satisfies its condition', () => {
    let state = setupForFinancierB();
    injectTreasuryCard(
      state,
      'neutral-manifest-destiny',
      'capacity',
    );

    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'B',
    });
    expect(state.players.B.financiers?.financialCapacityTurn)
      .toBe(state.turnNumber);

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });
    const firstAction = injectHandCard(
      state,
      'neutral-rallying-cry',
      'first-action',
    );
    const treasuryCard = injectHandCard(
      state,
      'neutral-fealty',
      'capacity-feature',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: firstAction,
    });
    expect(state.turnState?.actionsAvailable).toBe(0);

    state = toDenouement(state);
    state = reduceV070TurnAction(state, {
      type: 'financier_place_treasury',
      playerId: 'B',
      cardInstanceId: treasuryCard,
    });

    expect(state.turnState?.actionsTaken).toEqual({
      opening: 1,
      denouement: 1,
    });
    expect(state.players.B.financiers?.financialCapacityUsedTurn)
      .toBe(state.turnNumber);
    expect(state.players.B.financiers?.financierFeatureActionSpentTurn)
      .toBe(state.turnNumber);
  });

  test('Financial Capacity cannot be consumed by a second ordinary Action when no Financier Feature was used', () => {
    let state = setupForFinancierB();
    injectTreasuryCard(
      state,
      'neutral-manifest-destiny',
      'capacity',
    );
    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    const first = injectHandCard(
      state,
      'neutral-rallying-cry',
      'first',
    );
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: first,
    });
    state = toDenouement(state);

    const second = injectHandCard(
      state,
      'neutral-rallying-cry',
      'second',
    );
    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: second,
    })).toThrow(/Financial Capacity.*Financier Faction Feature/);

    expect(state.players.B.zones.hand).toContain(second);
    expect(state.players.B.financiers?.financialCapacityUsedTurn).toBeNull();
  });

  test('Play the Market keeps excess Capital until Cleanup, then the public Capital limit is enforced', () => {
    let state = openingForFinancierB();
    const wager = injectHandCard(
      state,
      'neutral-manifest-destiny',
      'market',
    );
    state = toDenouement(state);

    state = reduceV070TurnAction(state, {
      type: 'financier_play_market',
      playerId: 'B',
      cardInstanceId: wager,
      roll: 6,
    });
    expect(state.players.B.financiers?.capital).toBe(12);
    expect(v070CapitalLimit(state, 'B')).toBe(3);
    expect(state.players.B.zones.discardPile).toContain(wager);

    state = reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId: 'B',
    });
    const excess = Math.max(0, state.players.B.zones.hand.length - 3);
    state = reduceV070TurnAction(state, {
      type: 'complete_cleanup',
      playerId: 'B',
      discardInstanceIds: state.players.B.zones.hand.slice(0, excess),
    });

    expect(state.players.B.financiers?.capital).toBe(3);
  });

  test('a Play the Market roll of 1 moves the discarded card to Graveyard and gains no Capital', () => {
    let state = openingForFinancierB();
    const wager = injectHandCard(
      state,
      'neutral-manifest-destiny',
      'market-loss',
    );
    state = toDenouement(state);

    state = reduceV070TurnAction(state, {
      type: 'financier_play_market',
      playerId: 'B',
      cardInstanceId: wager,
      roll: 1,
    });

    expect(state.players.B.financiers?.capital).toBe(2);
    expect(state.players.B.zones.discardPile).not.toContain(wager);
    expect(state.players.B.zones.graveyard).toContain(wager);
  });

  test('owning every current Deed immediately wins through Controlling Interest', () => {
    const state = setupForFinancierB();
    state.players.B.financiers!.capital = 100;

    for (const territory of state.board) {
      buyV070Deed(
        state,
        'B',
        territory.territoryInstanceId,
        'Controlling Interest test',
      );
    }

    expect(state.stage).toBe('ended');
    expect(state.winner).toBe('B');
    expect(state.events.some(event =>
      event.type === 'game_won'
      && (event.payload as { route?: string })?.route ===
        'controlling_interest'
    )).toBe(true);
  });
});
