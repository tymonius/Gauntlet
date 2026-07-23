import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import { applyGameAction } from './apply';

const financierDeck = [
  'financiers-speculation',
  'financiers-monetary-crisis',
  'financiers-liquidation',
  'financiers-underwriting',
  'financiers-divestment',
  'financiers-foreclosure',
  'financiers-property-dues',
  'financiers-corner-the-market',
];

function game(openingHandSize = 8): GameState {
  const state = initializeGame({
    id: 'financier-action-cards', version: 'v0.6.0', shuffleDecks: false, openingHandSize,
    players: [
      { id: 'player_1', name: 'Financier', factionId: 'financiers', leaderName: 'Banker', deck: financierDeck, territories: ['t1', 't2', 't3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'], territories: ['t4', 't5', 't6'] },
    ],
  });
  for (const space of state.board.spaces) space.revealed = true;
  state.phase = 'action_after_movement';
  return state;
}

function resetAction(state: GameState): void {
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
  state.phase = 'action_after_movement';
  state.priorityPlayer = 'player_1';
}

describe('Financier Action cards', () => {
  it('tracks and resolves Speculation at the start of the Financier’s next turn', () => {
    let state = game();
    const target = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_2')!;
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-speculation', targets: [{ kind: 'space', spaceId: target.id }] }).state;
    expect(state.players.player_1.financiers?.speculations).toMatchObject([{ spaceId: target.id }]);
    expect(state.players.player_1.zones.removed).not.toContain('financiers-speculation');

    target.occupant = 'player_1';
    state.board.spaces.find((space) => space.id === target.id)!.occupant = 'player_1';
    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'end_turn', playerId: 'player_2' }).state;
    expect(state.players.player_1.resources?.capital?.value).toBe(2);
    expect(state.players.player_1.zones.discard).toContain('financiers-speculation');
    expect(state.players.player_1.financiers?.speculations).toEqual([]);
  });

  it('resolves Monetary Crisis symmetrically', () => {
    let state = game(3);
    const oldHands = Object.fromEntries(Object.values(state.players).map((player) => [player.id, [...player.zones.hand]]));
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-monetary-crisis' }).state;
    expect(state.players.player_1.zones.hand).toHaveLength(2);
    expect(state.players.player_2.zones.hand).toHaveLength(2);
    for (const player of Object.values(state.players)) expect(player.zones.discard).toEqual(expect.arrayContaining(oldHands[player.id]));
  });

  it('Liquidation converts Treasury value and opens an action-free Deed purchase', () => {
    let state = game();
    state.players.player_1.financiers!.treasury = ['financiers-corner-the-market'];
    const target = state.board.spaces.find((space) => space.kind === 'territory' && space.controller === 'player_2')!;
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-liquidation', targets: [{ kind: 'card', cardId: 'financiers-corner-the-market', owner: 'player_1' }] }).state;
    expect(state.players.player_1.resources?.capital?.value).toBe(5);
    expect(state.pendingFinancierChoice?.kind).toBe('liquidation_purchase');
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'purchase', spaceId: target.id }).state;
    expect(state.pendingFinancierChoice).toMatchObject({ kind: 'deed_purchase', spaceId: target.id, consumeAction: false });
    state = applyGameAction(state, { type: 'resolve_financier_choice', playerId: 'player_1', choice: 'capital' }).state;
    expect(state.players.player_1.financiers?.deedsOwned).toContain(target.id);
    expect(state.players.player_1.actionsRemaining).toBe(0);
  });

  it('Divestment relinquishes a Deed, gains its prior portfolio size, and grants an extra action', () => {
    let state = game();
    state.players.player_1.financiers!.deedsOwned = ['space-1', 'space-2'];
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-divestment', targets: [{ kind: 'space', spaceId: 'space-1' }] }).state;
    expect(state.players.player_1.financiers?.deedsOwned).toEqual(['space-2']);
    expect(state.players.player_1.resources?.capital?.value).toBe(2);
    expect(state.players.player_1.actionsRemaining).toBe(1);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(false);
  });

  it('Foreclosure converts an adjacent owned Deed into control', () => {
    let state = game();
    const target = state.board.spaces.find((space) => space.kind === 'territory' && space.index === 4)!;
    state.players.player_1.financiers!.deedsOwned = [target.id];
    delete target.occupant;
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-foreclosure', targets: [{ kind: 'space', spaceId: target.id }] }).state;
    expect(state.board.spaces.find((space) => space.id === target.id)?.controller).toBe('player_1');
    expect(state.players.player_1.controlledTerritories).toContain(target.territoryId);
    expect(state.players.player_2.controlledTerritories).not.toContain(target.territoryId);
  });

  it('banks Underwriting and Property Dues as Assets', () => {
    let state = game();
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-underwriting' }).state;
    expect(state.players.player_1.zones.assetBank).toContain('financiers-underwriting');
    resetAction(state);
    state = applyGameAction(state, { type: 'play_action_card', playerId: 'player_1', cardId: 'financiers-property-dues' }).state;
    expect(state.players.player_1.zones.assetBank).toContain('financiers-property-dues');
  });
});
