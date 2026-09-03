import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  assertV070ForcedAssetChoicesSupported,
  removeV070AssetForced,
} from './assets';
import { v070BindingsForHost } from './bindings';
import {
  v070CapitalLimit,
  v070TreasuryValue,
} from './financiers';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';
import { createV070TurnState } from './rules';

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

function beginLaterFinancierTurn(state: V070GameState): V070GameState {
  state.turnNumber += 2;
  state.activePlayer = 'B';
  state.turnState = createV070TurnState();
  return state;
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

  test('after later-turn income, leaving the loan outstanding keeps it banked and blocks the turn draw', () => {
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
    state = beginLaterFinancierTurn(state);

    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'B',
    });

    expect(state.turnState?.phase).toBe('draw');
    expect(state.pendingMarginLoanChoice).toEqual({
      playerId: 'B',
      hostInstanceIds: [source],
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_margin_loan_after_income',
      playerId: 'B',
      assetInstanceId: source,
      choice: 'leave',
    });

    expect(state.pendingMarginLoanChoice).toBeNull();
    expect(state.players.B.zones.assetBank).toContain(source);
    const handCountBeforeDraw = state.players.B.zones.hand.length;

    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });

    expect(state.players.B.zones.hand).toHaveLength(handCountBeforeDraw);
    expect(state.turnState?.phase).toBe('opening');
    expect(
      state.events.some(event =>
        event.type === 'margin_loan_turn_draw_blocked'
      ),
    ).toBe(true);
  });

  test('repayment after income spends collateral value +3, returns collateral to Hand, discards the loan, and restores the turn draw', () => {
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
    state.players.B.financiers!.capital = 20;
    state = beginLaterFinancierTurn(state);
    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'B',
    });

    const capitalBeforeRepay = state.players.B.financiers!.capital;
    state = reduceV070TurnAction(state, {
      type: 'resolve_margin_loan_after_income',
      playerId: 'B',
      assetInstanceId: source,
      choice: 'repay',
    });

    expect(state.players.B.financiers!.capital).toBe(
      capitalBeforeRepay - 8,
    );
    expect(state.players.B.zones.assetBank).not.toContain(source);
    expect(state.players.B.zones.discardPile).toContain(source);
    expect(state.players.B.zones.hand).toContain(collateral);
    expect(v070BindingsForHost(state, source)).toEqual([]);
    expect(state.pendingMarginLoanChoice).toBeNull();

    const handCountBeforeDraw = state.players.B.zones.hand.length;
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });
    expect(state.players.B.zones.hand.length).toBeGreaterThan(
      handCountBeforeDraw,
    );
    expect(state.turnState?.phase).toBe('opening');
  });

  test('voluntary Default after income puts the loan and collateral in the Graveyard and restores the turn draw', () => {
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
    state = beginLaterFinancierTurn(state);
    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'B',
    });
    state = reduceV070TurnAction(state, {
      type: 'resolve_margin_loan_after_income',
      playerId: 'B',
      assetInstanceId: source,
      choice: 'default',
    });

    expect(state.players.B.zones.assetBank).not.toContain(source);
    expect(state.players.B.zones.graveyard).toEqual(
      expect.arrayContaining([source, collateral]),
    );
    expect(v070BindingsForHost(state, source)).toEqual([]);
    expect(state.pendingMarginLoanChoice).toBeNull();

    const handCountBeforeDraw = state.players.B.zones.hand.length;
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId: 'B',
    });
    expect(state.players.B.zones.hand.length).toBeGreaterThan(
      handCountBeforeDraw,
    );
  });

  test('forced Removal immediately Defaults the Margin Loan regardless of the forced destination', () => {
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
      .not.toThrow();

    removeV070AssetForced(
      state,
      'B',
      source,
      'discard',
      'test forced Removal',
    );

    expect(state.players.B.zones.assetBank).not.toContain(source);
    expect(state.players.B.zones.discardPile).not.toContain(source);
    expect(state.players.B.zones.graveyard).toEqual(
      expect.arrayContaining([source, collateral]),
    );
    expect(v070BindingsForHost(state, source)).toEqual([]);
    expect(
      state.events.some(event =>
        event.type === 'margin_loan_defaulted'
        && (
          event.payload as { removed?: boolean } | undefined
        )?.removed === true
      ),
    ).toBe(true);
  });
});
