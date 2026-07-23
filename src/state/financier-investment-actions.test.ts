import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { initializeGame } from './initialize';
import { applyGameAction } from './apply';

const financierDeck = [
  'financiers-capital-gains',
  'financiers-tariffs',
  'financiers-margin-loan',
  'financiers-corner-the-market',
  'financiers-speculation',
  'financiers-liquidation',
  'financiers-underwriting',
  'financiers-property-dues',
];

function game(): GameState {
  const state = initializeGame({
    id: 'financier-investments', version: 'v0.6.0', shuffleDecks: false, openingHandSize: 8,
    players: [
      { id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: financierDeck, territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8'], territories: ['t4', 't5', 't6'] },
    ],
  });
  for (const space of state.board.spaces) space.revealed = true;
  state.phase = 'action_after_movement';
  return state;
}

function cycleToFinancierTurn(state: GameState): GameState {
  state = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;
  return applyGameAction(state, { type: 'end_turn', playerId: 'player_2' }).state;
}

describe('Financier investment Action cards', () => {
  it('matures Capital Gains after captures and income on the next turn', () => {
    let state = game();
    state.players.player_1.financiers!.treasury = ['financiers-corner-the-market'];
    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-capital-gains',
      targets: [{ kind: 'card', cardId: 'financiers-corner-the-market', owner: 'player_1' }],
    }).state;
    expect(state.players.player_1.financiers?.capitalGains).toHaveLength(1);
    expect(state.players.player_1.zones.removed).not.toContain('financiers-capital-gains');

    state = cycleToFinancierTurn(state);
    expect(state.players.player_1.financiers?.treasury).not.toContain('financiers-corner-the-market');
    expect(state.players.player_1.zones.hand).toContain('financiers-corner-the-market');
    expect(state.players.player_1.resources?.capital?.value).toBe(5);
    expect(state.players.player_1.zones.discard).toContain('financiers-capital-gains');
  });

  it('discards Capital Gains immediately if its Treasury card leaves early', () => {
    let state = game();
    state.players.player_1.financiers!.treasury = ['financiers-corner-the-market'];
    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-capital-gains',
      targets: [{ kind: 'card', cardId: 'financiers-corner-the-market', owner: 'player_1' }],
    }).state;
    state.players.player_1.financiers!.treasury = [];
    state.players.player_1.actionsRemaining = 1;
    state.players.player_1.hasPlayedActionThisTurn = false;
    state = applyGameAction(state, { type: 'place_treasury_card', playerId: 'player_1', cardId: 'financiers-speculation' }).state;
    expect(state.players.player_1.financiers?.capitalGains).toEqual([]);
    expect(state.players.player_1.zones.discard).toContain('financiers-capital-gains');
  });

  it('banks Tariffs, draws two, grants an extra action, and skips normal draws while banked', () => {
    let state = game();
    const handBefore = state.players.player_1.zones.hand.length;
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-tariffs' }).state;
    expect(state.players.player_1.zones.assetBank).toContain('financiers-tariffs');
    expect(state.players.player_1.zones.hand.length).toBe(handBefore - 1 + 2);
    expect(state.players.player_1.actionsRemaining).toBe(1);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(false);

    state = cycleToFinancierTurn(state);
    const nextHandBeforeDraw = state.players.player_1.zones.hand.length;
    state = applyGameAction(state, { type: 'draw_card', playerId: 'player_1' }).state;
    expect(state.players.player_1.zones.hand.length).toBe(nextHandBeforeDraw);
    expect(state.phase).toBe('action_before_movement');
    expect(state.log.some((event) => event.type === 'financier_tariffs_draw_skipped')).toBe(true);
  });

  it('does not allow the player to discard Tariffs during the turn it was banked', () => {
    let state = game();
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-tariffs' }).state;
    state.pendingAssetBankDiscards = {
      player_1: { playerId: 'player_1', limit: 0, discardCount: 1, options: ['financiers-tariffs'] },
    };
    expect(() => applyGameAction(state, { type: 'resolve_asset_bank_discard', playerId: 'player_1', cardIds: ['financiers-tariffs'] })).toThrow(/cannot cause Tariffs to leave play/i);
  });

  it('opens Margin Loan, gains liquidity, grants an extra action, and repays next turn', () => {
    let state = game();
    state.players.player_1.financiers!.deedsOwned = ['space-1'];
    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-margin-loan',
      targets: [{ kind: 'card', cardId: 'financiers-speculation', owner: 'player_1' }],
    }).state;
    expect(state.players.player_1.zones.assetBank).toContain('financiers-margin-loan');
    expect(state.players.player_1.zones.hand).not.toContain('financiers-speculation');
    expect(state.players.player_1.resources?.capital?.value).toBe(3);
    expect(state.players.player_1.actionsRemaining).toBe(1);

    state = cycleToFinancierTurn(state);
    expect(state.players.player_1.resources?.capital?.value).toBe(4);
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'margin_loan_repayment', repaymentCost: 4, collateralCardId: 'financiers-speculation' });
    expect(buildGuidedOptions(state).map((option) => option.label)).toEqual(expect.arrayContaining(['Repay Margin Loan for 4 Capital', 'Default and lose financiers-speculation']));

    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'repay' }).state;
    expect(state.players.player_1.resources?.capital?.value).toBe(0);
    expect(state.players.player_1.zones.hand).toContain('financiers-speculation');
    expect(state.players.player_1.zones.discard).toContain('financiers-margin-loan');
    expect(state.players.player_1.financiers?.marginLoans).toEqual([]);
  });

  it('defaults Margin Loan automatically if the Asset leaves play early', () => {
    let state = game();
    state = applyGameAction(state, {
      type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-margin-loan',
      targets: [{ kind: 'card', cardId: 'financiers-speculation', owner: 'player_1' }],
    }).state;
    state.players.player_1.zones.assetBank = [];
    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;
    expect(state.players.player_1.zones.graveyard).toEqual(expect.arrayContaining(['financiers-margin-loan', 'financiers-speculation']));
    expect(state.players.player_1.financiers?.marginLoans).toEqual([]);
  });
});
