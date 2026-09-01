import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  assertV070ForcedAssetChoicesSupported,
} from './assets';
import { v070BindingsForHost } from './bindings';
import {
  v070CapitalLimit,
  v070TreasuryValue,
} from './financiers';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const militaryStarter = 'military-commandant-holdfast';
const financierStarter = 'financiers-banker-sound-investment';

function openingForFinancierB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'margin-loan-action',
    seed: 'margin-loan-action-seed',
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
  zone: 'hand' | 'assetBank' | 'treasury',
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
    state.players.B.zones[zone].push(instanceId);
  }
  return instanceId;
}

describe('v0.7.0 Margin Loan initial Action', () => {
  test('requires another Hand or Treasury card before spending the Action', () => {
    const state = openingForFinancierB();
    state.players.B.zones.hand = [];
    state.players.B.financiers!.treasury = [];
    const source = inject(
      state,
      'financiers-margin-loan',
      'hand',
      'source',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires one other card in your Hand or Treasury/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('banks, binds Hand collateral face up, gains value +2 Capital, and grants +1 Action', () => {
    let state = openingForFinancierB();
    const source = inject(
      state,
      'financiers-margin-loan',
      'hand',
      'source',
    );
    const collateral = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'hand-collateral',
    );
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    expect(state.players.B.zones.assetBank).toContain(source);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'margin_loan_collateral_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_margin_loan_collateral_target',
      playerId: 'B',
      targetInstanceId: collateral,
    });

    expect(state.players.B.zones.hand).not.toContain(collateral);
    expect(v070BindingsForHost(state, source)).toEqual([
      expect.objectContaining({
        cardInstanceId: collateral,
        owner: 'B',
        faceUp: true,
        purpose: 'Margin Loan',
      }),
    ]);
    expect(state.players.B.financiers!.capital).toBe(capitalBefore + 7);
    expect(state.turnState?.actionsAvailable).toBe(1);
    expect(state.turnState?.phaseActionGrants.opening).toBe(1);
    expect(state.pendingActionCard).toBeNull();
    expect(state.pendingActionEffectChoice).toBeNull();

    const opponentView = viewV070GameForPlayer(state, 'A');
    expect(
      opponentView.bindings.find(binding => binding.hostId === source)?.card,
    ).toEqual({
      instanceId: collateral,
      cardId: 'neutral-manifest-destiny',
    });
  });

  test('Treasury collateral leaves Treasury, remains public as collateral, and immediately lowers Treasury value and Capital limit', () => {
    let state = openingForFinancierB();
    const source = inject(
      state,
      'financiers-margin-loan',
      'hand',
      'source',
    );
    const collateral = inject(
      state,
      'neutral-manifest-destiny',
      'treasury',
      'treasury-collateral',
    );
    const treasuryBefore = v070TreasuryValue(state, 'B');
    const limitBefore = v070CapitalLimit(state, 'B');
    const capitalBefore = state.players.B.financiers!.capital;

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_margin_loan_collateral_target',
      playerId: 'B',
      targetInstanceId: collateral,
    });

    expect(state.players.B.financiers!.treasury).not.toContain(collateral);
    expect(v070TreasuryValue(state, 'B')).toBe(treasuryBefore - 5);
    expect(v070CapitalLimit(state, 'B')).toBe(limitBefore - 5);
    expect(state.players.B.financiers!.capital).toBe(capitalBefore + 7);
    expect(v070BindingsForHost(state, source)).toEqual([
      expect.objectContaining({
        cardInstanceId: collateral,
        faceUp: true,
        purpose: 'Margin Loan',
      }),
    ]);
  });

  test('banking at the Asset limit resolves shared replacement before collateral selection', () => {
    let state = openingForFinancierB();
    const replace = inject(
      state,
      'neutral-counterintelligence',
      'assetBank',
      'replace',
    );
    inject(state, 'neutral-fortifications', 'assetBank', 'keep-1');
    inject(state, 'neutral-fealty', 'assetBank', 'keep-2');
    const source = inject(
      state,
      'financiers-margin-loan',
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

    expect(state.pendingActionEffectChoice).toEqual(expect.objectContaining({
      kind: 'pending_asset_bank_replacement',
      sourceActionInstanceId: source,
      purpose: 'Margin Loan',
    }));

    state = reduceV070TurnAction(state, {
      type: 'choose_pending_asset_bank_replacement',
      playerId: 'B',
      replaceAssetInstanceId: replace,
    });

    expect(state.players.B.zones.assetBank).toContain(source);
    expect(state.players.B.zones.assetBank).not.toContain(replace);
    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'margin_loan_collateral_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });

    state = reduceV070TurnAction(state, {
      type: 'choose_margin_loan_collateral_target',
      playerId: 'B',
      targetInstanceId: collateral,
    });
    expect(v070BindingsForHost(state, source)).toHaveLength(1);
    expect(state.pendingActionCard).toBeNull();
  });

  test('collateral target is revalidated after banking', () => {
    let state = openingForFinancierB();
    const source = inject(
      state,
      'financiers-margin-loan',
      'hand',
      'source',
    );
    const collateral = inject(
      state,
      'neutral-manifest-destiny',
      'hand',
      'stale',
    );

    state = reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    });

    const index = state.players.B.zones.hand.indexOf(collateral);
    state.players.B.zones.hand.splice(index, 1);
    state.players.B.zones.discardPile.push(collateral);

    expect(() => reduceV070TurnAction(state, {
      type: 'choose_margin_loan_collateral_target',
      playerId: 'B',
      targetInstanceId: collateral,
    })).toThrow(/still be in your Hand or Treasury/);

    expect(state.pendingActionEffectChoice).toEqual({
      kind: 'margin_loan_collateral_target',
      playerId: 'B',
      sourceActionInstanceId: source,
    });
  });

  test('forced Removal remains explicitly unsupported until Margin Loan repayment/default lifecycle is implemented', () => {
    let state = openingForFinancierB();
    const source = inject(
      state,
      'financiers-margin-loan',
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
    state = reduceV070TurnAction(state, {
      type: 'choose_margin_loan_collateral_target',
      playerId: 'B',
      targetInstanceId: collateral,
    });

    expect(() => assertV070ForcedAssetChoicesSupported(state, 'B'))
      .toThrow(/margin-loan.*unsupported/i);
  });
});
