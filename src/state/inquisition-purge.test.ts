import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { applyGameAction } from './apply-inquisition';
import { initializeGame } from './initialize';
import {
  canUseInquisitionPurge,
  inquisitionPurgeCost,
  legalInquisitionPurgeOptions,
  useInquisitionPurge,
} from './inquisition-purge';

function game(leaderName = 'Zealot'): GameState {
  const state = initializeGame({
    id: 'inquisition-purge-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName,
        deck: ['card-valor', 'card-fortifications'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-attrition', 'card-valor', 'card-fortifications'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.resources!.conviction!.value = 4;
  return state;
}

describe('Inquisition Purge', () => {
  it('offers only modes supported by the opponent zones', () => {
    const state = game();
    state.players.player_2.zones.discard = ['card-attrition'];
    state.players.player_2.zones.hand = ['card-valor'];
    state.players.player_2.zones.graveyard = ['card-fortifications'];

    expect(canUseInquisitionPurge(state, 'player_1')).toBe(true);
    expect(inquisitionPurgeCost(state, 'player_1')).toBe(1);
    expect(legalInquisitionPurgeOptions(state, 'player_1')).toEqual(expect.arrayContaining([
      { mode: 'remove_discard_top', cost: 1 },
      { mode: 'random_hand_to_graveyard', cost: 1 },
      { mode: 'graveyard_to_deck_draw', cardId: 'card-fortifications', cost: 1 },
    ]));
  });

  it('removes the top Discard Pile card from the game', () => {
    let state = game();
    state.players.player_2.zones.discard = ['card-attrition', 'card-valor'];

    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'remove_discard_top',
    }).state;

    expect(state.players.player_2.zones.discard).toEqual(['card-attrition']);
    expect(state.players.player_2.zones.removed).toContain('card-valor');
    expect(state.players.player_1.resources?.conviction?.value).toBe(3);
  });

  it('moves a random hand card to the Graveyard deterministically with supplied randomness', () => {
    const state = game();
    state.players.player_2.zones.hand = ['card-attrition', 'card-valor', 'card-fortifications'];

    const affected = useInquisitionPurge(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'random_hand_to_graveyard',
    }, () => 0.5);

    expect(affected).toBe('card-valor');
    expect(state.players.player_2.zones.hand).toEqual(['card-attrition', 'card-fortifications']);
    expect(state.players.player_2.zones.graveyard).toContain('card-valor');
  });

  it('places the chosen Graveyard card beneath the Draw Pile and draws the top card', () => {
    let state = game();
    state.players.player_2.zones.graveyard = ['card-fortifications'];
    state.players.player_2.zones.deck = ['card-attrition', 'card-valor'];
    state.players.player_2.zones.hand = [];

    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'graveyard_to_deck_draw',
      cardId: 'card-fortifications',
    }).state;

    expect(state.players.player_2.zones.graveyard).toEqual([]);
    expect(state.players.player_2.zones.hand).toEqual(['card-attrition']);
    expect(state.players.player_2.zones.deck).toEqual(['card-valor', 'card-fortifications']);
    expect(state.winner).toBeUndefined();
  });

  it('does not consume or reopen the normal Action Opportunity', () => {
    let state = game();
    state.players.player_2.zones.discard = ['card-attrition'];
    state.players.player_1.actionsRemaining = 1;
    state.players.player_1.hasPlayedActionThisTurn = false;

    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'remove_discard_top',
    }).state;

    expect(state.players.player_1.actionsRemaining).toBe(1);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(false);
  });

  it('allows only one Purge per turn for a normal leader', () => {
    let state = game();
    state.players.player_2.zones.discard = ['card-attrition', 'card-valor'];
    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'remove_discard_top',
    }).state;

    expect(inquisitionPurgeCost(state, 'player_1')).toBeUndefined();
    expect(canUseInquisitionPurge(state, 'player_1')).toBe(false);
  });

  it('lets the Grand Inquisitor pay two Conviction for a second Purge', () => {
    let state = game('Grand Inquisitor');
    state.players.player_2.zones.discard = ['card-attrition', 'card-valor', 'card-fortifications'];
    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'remove_discard_top',
    }).state;

    expect(inquisitionPurgeCost(state, 'player_1')).toBe(2);
    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'remove_discard_top',
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_1.inquisition).toMatchObject({
      purgeUseTurn: state.turn,
      purgesUsedThisTurn: 2,
    });
    expect(inquisitionPurgeCost(state, 'player_1')).toBeUndefined();
  });

  it('resets Purge availability on a later turn', () => {
    const state = game();
    state.players.player_2.zones.discard = ['card-attrition'];
    useInquisitionPurge(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'remove_discard_top',
    });
    state.turn += 1;
    state.players.player_2.zones.discard = ['card-valor'];

    expect(inquisitionPurgeCost(state, 'player_1')).toBe(1);
    expect(canUseInquisitionPurge(state, 'player_1')).toBe(true);
  });
});
