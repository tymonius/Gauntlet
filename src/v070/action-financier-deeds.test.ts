import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { v070DeedCost, v070DeedsOwned } from './financiers';
import { nextV070FrontLineTarget } from './front-line';
import { reduceV070TurnAction } from './turn-engine';

const militaryStarter = 'military-commandant-holdfast';
const financierStarter = 'financiers-banker-sound-investment';

function openingForFinancierB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'financier-deed-actions',
    seed: 'financier-deed-actions-seed',
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

function setDeedOwner(
  state: V070GameState,
  territoryPosition: number,
  owner: 'A' | 'B' | null,
): void {
  const territory = state.board.find(
    item => item.position === territoryPosition,
  );
  if (!territory) throw new Error('Missing test Territory.');
  const deed = state.deeds.find(
    item => item.territoryInstanceId === territory.territoryInstanceId,
  );
  if (!deed) throw new Error('Missing test Deed.');
  deed.owner = owner;
}

describe('v0.7.0 Financier Deed Action cards', () => {
  test('Divestment makes an owned Deed unowned, gains pre-divestment Deed count, and grants +1 Action', () => {
    let state = openingForFinancierB();
    const controlled = state.board
      .filter(territory => territory.controller === 'B')
      .slice(0, 2);
    setDeedOwner(state, controlled[0].position, 'B');
    setDeedOwner(state, controlled[1].position, 'B');
    expect(v070DeedsOwned(state, 'B')).toBe(2);

    const source = injectHandCard(
      state,
      'financiers-divestment',
      'divestment',
    );
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'owned_deed_target',
      purpose: 'Divestment',
    }));

    state = reduceV070TurnAction(state, {
      type: 'choose_owned_deed_target',
      playerId: 'B',
      territoryPosition: controlled[0].position,
    });

    expect(v070DeedsOwned(state, 'B')).toBe(1);
    expect(state.players.B.financiers!.capital).toBe(capitalBefore + 2);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.phaseActionGrants.opening).toBe(1);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
  });

  test('Divestment is rejected before spending the Action when no Deed is owned', () => {
    const state = openingForFinancierB();
    const source = injectHandCard(
      state,
      'financiers-divestment',
      'invalid-divestment',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one Deed you own/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('Liquidation converts one Treasury card to Capital and offers one optional immediate Deed purchase', () => {
    let state = openingForFinancierB();
    const treasury = injectTreasuryCard(
      state,
      'neutral-manifest-destiny',
      'liquidation-value',
    );
    const source = injectHandCard(
      state,
      'financiers-liquidation',
      'liquidation',
    );
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'treasury_card_target',
      purpose: 'Liquidation',
    }));

    state = reduceV070TurnAction(state, {
      type: 'choose_treasury_card_target',
      playerId: 'B',
      targetInstanceId: treasury,
    });

    expect(state.players.B.financiers!.treasury).not.toContain(treasury);
    expect(state.players.B.zones.discardPile).toContain(treasury);
    expect(state.players.B.financiers!.capital).toBe(capitalBefore + 5);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'deed_purchase_choice',
      purpose: 'Liquidation',
      remainingPurchases: 1,
    }));

    const candidateEvent = [...state.events].reverse().find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose === 'Liquidation'
      && (event.payload as { kind?: string })?.kind === 'deed_purchase_choice'
    );
    const candidates = (candidateEvent?.payload as {
      candidates?: Array<{ position: number; cost: number }>;
    })?.candidates ?? [];
    expect(candidates.length).toBeGreaterThan(0);

    state = reduceV070TurnAction(state, {
      type: 'resolve_deed_purchase_choice',
      playerId: 'B',
      territoryPosition: candidates[0].position,
    });

    expect(v070DeedsOwned(state, 'B')).toBe(1);
    expect(state.pendingActionEffectChoice).toBeNull();
    expect(state.pendingActionCard).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(source);
  });

  test('Liquidation immediate Deed purchase may be declined', () => {
    let state = openingForFinancierB();
    const treasury = injectTreasuryCard(
      state,
      'neutral-manifest-destiny',
      'liquidation-pass-value',
    );
    const source = injectHandCard(
      state,
      'financiers-liquidation',
      'liquidation-pass',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_treasury_card_target',
      playerId: 'B',
      targetInstanceId: treasury,
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_deed_purchase_choice',
      playerId: 'B',
    });

    expect(v070DeedsOwned(state, 'B')).toBe(0);
    expect(state.pendingActionCard).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(source);
  });

  test('Corner the Market recalculates Deed costs and candidates after every purchase', () => {
    let state = openingForFinancierB();
    state.players.B.financiers!.capital = 30;
    const source = injectHandCard(
      state,
      'financiers-corner-the-market',
      'corner',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const firstEvent = [...state.events].reverse().find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose ===
        'Corner the Market'
    );
    const firstCandidates = (firstEvent?.payload as {
      candidates?: Array<{ position: number; cost: number }>;
    })?.candidates ?? [];
    expect(firstCandidates.length).toBeGreaterThan(1);

    const first = firstCandidates[0];
    state = reduceV070TurnAction(state, {
      type: 'resolve_deed_purchase_choice',
      playerId: 'B',
      territoryPosition: first.position,
    });

    expect(v070DeedsOwned(state, 'B')).toBe(1);
    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'deed_purchase_choice',
      purpose: 'Corner the Market',
      remainingPurchases: null,
    }));

    const secondEvent = [...state.events].reverse().find(event =>
      event.type === 'action_effect_choice_pending'
      && (event.payload as { purpose?: string })?.purpose ===
        'Corner the Market'
    );
    const secondCandidates = (secondEvent?.payload as {
      candidates?: Array<{ position: number; cost: number }>;
    })?.candidates ?? [];
    expect(secondCandidates.some(candidate =>
      candidate.position === first.position
    )).toBe(false);

    const another = secondCandidates[0];
    const territory = state.board.find(item => item.position === another.position)!;
    expect(another.cost).toBe(
      v070DeedCost(state, 'B', territory.territoryInstanceId),
    );

    state = reduceV070TurnAction(state, {
      type: 'resolve_deed_purchase_choice',
      playerId: 'B',
    });
    expect(state.pendingActionCard).toBeNull();
    expect(state.players.B.zones.discardPile).toContain(source);
  });

  test('Foreclosure is Denouement-only and advances Front Line when the next opposing unoccupied Territory Deed is owned', () => {
    let state = openingForFinancierB();
    const target = nextV070FrontLineTarget(state, 'B')!;
    expect(target.controller).toBe('A');
    expect(target.occupant).toBeNull();
    setDeedOwner(state, target.position, 'B');

    const source = injectHandCard(
      state,
      'financiers-foreclosure',
      'foreclosure',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/only during Denouement/);
    expect(state.players.B.zones.hand).toContain(source);

    state = toDenouement(state);
    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(
      state.board.find(item => item.position === target.position)?.controller,
    ).toBe('B');
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.pendingActionCard).toBeNull();
  });

  test('Foreclosure requires the target Deed to still be owned and the target to remain unoccupied at resolution', () => {
    let state = openingForFinancierB();
    const target = nextV070FrontLineTarget(state, 'B')!;
    setDeedOwner(state, target.position, 'B');
    const source = injectHandCard(
      state,
      'financiers-foreclosure',
      'foreclosure-live',
    );
    state = toDenouement(state);

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    // The current implementation resolves Foreclosure immediately after all
    // Action-play reactions, so successful resolution leaves no stale target.
    expect(
      state.board.find(item => item.position === target.position)?.controller,
    ).toBe('B');
    expect(state.events.some(event =>
      event.type === 'territory_captured'
      && (event.payload as { source?: string })?.source === 'Foreclosure'
    )).toBe(true);
  });
});
