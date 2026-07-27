import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { initializeGame } from './initialize';
import { applyGameAction } from './apply';
import { setFactionResource } from './resources';

// Covers multi-card collateral and sequential acquisition resolution.
const financierDeck = [
  'financiers-leveraged-buyout',
  'financiers-corner-the-market',
  'financiers-monetary-crisis',
  'financiers-liquidation',
  'financiers-underwriting',
  'financiers-capital-gains',
  'financiers-tariffs',
  'financiers-divestment',
  'financiers-margin-loan',
  'financiers-foreclosure',
];

function game(): GameState {
  const state = initializeGame({
    id: 'financier-acquisitions', version: 'v0.6.0', shuffleDecks: false, openingHandSize: 8,
    players: [
      { id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: financierDeck, territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10'], territories: ['t4', 't5', 't6'] },
    ],
  });
  for (const space of state.board.spaces) space.revealed = true;
  state.phase = 'action_after_movement';
  return state;
}

describe('Financier acquisition Action cards', () => {
  it('uses unrestricted collateral to complete Leveraged Buyout', () => {
    let state = game();
    const target = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_2')!;
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-leveraged-buyout' }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'leveraged_buyout_target' });
    expect(buildGuidedOptions(state).some((option) => option.action.type === 'resolve_financier_choice' && option.action.spaceId === target.id)).toBe(true);

    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'select', spaceId: target.id }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'leveraged_buyout_collateral', spaceId: target.id, cost: 2 });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', cardIds: ['financiers-monetary-crisis'] }).state;
    expect(state.players.player_1.financiers?.deedsOwned).toContain(target.id);
    expect(state.players.player_1.zones.graveyard).toContain('financiers-monetary-crisis');
    expect(state.players.player_1.resources?.capital?.value).toBe(0);
    expect(state.pendingFinancierChoice).toBeUndefined();
  });

  it('allows Leveraged Buyout collateral to pay the entire cost from Treasury', () => {
    let state = game();
    const treasuryCardId = 'financiers-corner-the-market';
    const treasuryCardIndex = state.players.player_1.zones.hand.indexOf(treasuryCardId);
    expect(treasuryCardIndex).toBeGreaterThanOrEqual(0);
    state.players.player_1.zones.hand.splice(treasuryCardIndex, 1);
    state.players.player_1.financiers!.treasury.push(treasuryCardId);
    const target = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_2')!;
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-leveraged-buyout', targets: [{ kind: 'space', spaceId: target.id }] }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'leveraged_buyout_collateral', spaceId: target.id });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', cardIds: [treasuryCardId] }).state;
    expect(state.players.player_1.financiers?.treasury).not.toContain(treasuryCardId);
    expect(state.players.player_1.zones.graveyard).toContain(treasuryCardId);
    expect(state.players.player_1.financiers?.deedsOwned).toContain(target.id);
  });

  it('chains Corner the Market purchases and recalculates each Deed cost', () => {
    let state = game();
    setFactionResource(state, 'player_1', 'capital', 10, 'test');
    const ownSpaces = state.board.spaces.filter((space) => space.kind === 'territory' && space.controller === 'player_1');
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-corner-the-market' }).state;
    expect(state.pendingFinancierChoice?.kind).toBe('corner_the_market_purchase');

    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', spaceId: ownSpaces[0].id }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'deed_purchase', cost: 1, continuation: 'corner_the_market' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'capital' }).state;
    expect(state.pendingFinancierChoice?.kind).toBe('corner_the_market_purchase');

    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', spaceId: ownSpaces[1].id }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'deed_purchase', cost: 1, continuation: 'corner_the_market' });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'capital' }).state;
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'pass' }).state;

    expect(state.players.player_1.financiers?.deedsOwned).toEqual(expect.arrayContaining([ownSpaces[0].id, ownSpaces[1].id]));
    expect(state.players.player_1.resources?.capital?.value).toBe(8);
    expect(state.pendingFinancierChoice).toBeUndefined();
  });

  it('can achieve Controlling Interest during Corner the Market', () => {
    let state = game();
    setFactionResource(state, 'player_1', 'capital', 100, 'test');
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-corner-the-market' }).state;

    while (state.phase !== 'game_over') {
      const pending = state.pendingFinancierChoice;
      if (!pending) throw new Error('Corner the Market ended before Controlling Interest.');
      if (pending.kind === 'corner_the_market_purchase') {
        state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', spaceId: pending.spaceOptions[0] }).state;
      } else if (pending.kind === 'deed_purchase') {
        state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'capital' }).state;
      } else {
        throw new Error(`Unexpected pending choice: ${pending.kind}`);
      }
    }

    expect(state.winner).toBe('player_1');
    expect(state.players.player_1.financiers?.deedsOwned).toHaveLength(6);
  });
});