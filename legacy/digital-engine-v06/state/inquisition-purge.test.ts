import { describe, expect, it } from 'vitest';
import type { GameState } from '../types/v06';
import { applyGameAction } from './apply-inquisition';
import { initializeGame } from './initialize';
import {
  canUseInquisitionPurge,
  legalInquisitionPurgeOptions,
  useInquisitionPurge,
} from './inquisition-purge';
import { toPrivateGameView, toPublicGameView } from './views';

function game(leaderName = 'Fanatic'): GameState {
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
        deck: ['inquisition-accusation', 'inquisition-confession'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-contingency-plan', 'card-counterintelligence', 'card-advance-guard'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.resources!.conviction!.value = 4;
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
  return state;
}

describe('canonical Inquisition Purge', () => {
  it('offers the four costs only when their targets exist', () => {
    const state = game();
    state.players.player_2.zones.discard = ['card-contingency-plan', 'card-advance-guard'];
    state.players.player_2.zones.assetBank = ['card-fortifications'];
    state.players.player_2.zones.hand = ['card-counterintelligence'];

    expect(canUseInquisitionPurge(state, 'player_1')).toBe(true);
    expect(legalInquisitionPurgeOptions(state, 'player_1')).toEqual(expect.arrayContaining([
      { mode: 'discard_top_to_graveyard', cost: 1 },
      { mode: 'discard_value_to_graveyard', cost: 1, cardIds: ['card-contingency-plan'] },
      { mode: 'discard_value_to_graveyard', cost: 1, cardIds: ['card-advance-guard'] },
      { mode: 'asset_to_graveyard', cost: 2, cardId: 'card-fortifications' },
      { mode: 'opponent_choose_hand_to_graveyard', cost: 3 },
      { mode: 'choose_hand_to_graveyard', cost: 4, cardId: 'card-counterintelligence' },
    ]));
  });

  it('pays one Conviction to move the top discard to the Graveyard', () => {
    let state = game();
    state.players.player_2.zones.discard = ['card-contingency-plan', 'card-advance-guard'];

    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'discard_top_to_graveyard',
    }).state;

    expect(state.players.player_2.zones.discard).toEqual(['card-contingency-plan']);
    expect(state.players.player_2.zones.graveyard).toContain('card-advance-guard');
    expect(state.players.player_1.resources?.conviction?.value).toBe(3);
    expect(state.players.player_1.actionsRemaining).toBe(0);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(true);
  });

  it('pays one Conviction to choose up to two discards with combined value two or less', () => {
    let state = game();
    state.players.player_2.zones.discard = [
      'card-contingency-plan',
      'card-counterintelligence',
      'card-advance-guard',
    ];

    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'discard_value_to_graveyard',
      cardIds: ['card-contingency-plan', 'card-counterintelligence'],
    }).state;

    expect(state.players.player_2.zones.discard).toEqual(['card-advance-guard']);
    expect(state.players.player_2.zones.graveyard).toEqual(expect.arrayContaining([
      'card-contingency-plan',
      'card-counterintelligence',
    ]));
  });

  it('rejects a discard selection whose combined value exceeds two', () => {
    const state = game();
    state.players.player_2.zones.discard = ['card-contingency-plan', 'card-advance-guard'];

    expect(() => useInquisitionPurge(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'discard_value_to_graveyard',
      cardIds: ['card-contingency-plan', 'card-advance-guard'],
    })).toThrow(/canonical Purge effect/);
  });

  it('pays two Conviction to move an opposing Asset to the Graveyard', () => {
    let state = game();
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'asset_to_graveyard',
      cardId: 'card-fortifications',
    }).state;

    expect(state.players.player_2.zones.assetBank).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toContain('card-fortifications');
    expect(state.players.player_1.resources?.conviction?.value).toBe(2);
  });

  it('pays three Conviction and lets the opponent privately choose a hand card', () => {
    let state = game();
    state.players.player_2.zones.hand = ['card-contingency-plan', 'card-counterintelligence'];

    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'opponent_choose_hand_to_graveyard',
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'purge_hand_choice',
      playerId: 'player_2',
      inquisitorId: 'player_1',
      handOptions: ['card-contingency-plan', 'card-counterintelligence'],
    });
    expect(state.priorityPlayer).toBe('player_2');
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_2',
      cardId: 'card-counterintelligence',
    }).state;

    expect(state.players.player_2.zones.hand).toEqual(['card-contingency-plan']);
    expect(state.players.player_2.zones.graveyard).toContain('card-counterintelligence');
    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.priorityPlayer).toBe('player_1');
  });

  it('pays four Conviction to choose an opposing hand card directly', () => {
    let state = game();
    state.players.player_2.zones.hand = ['card-contingency-plan', 'card-counterintelligence'];

    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'choose_hand_to_graveyard',
      cardId: 'card-counterintelligence',
    }).state;

    expect(state.players.player_2.zones.hand).toEqual(['card-contingency-plan']);
    expect(state.players.player_2.zones.graveyard).toContain('card-counterintelligence');
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
  });

  it('cannot Purge again after consuming the normal Action Opportunity', () => {
    let state = game('Grand Inquisitor');
    state.players.player_2.zones.discard = ['card-contingency-plan', 'card-counterintelligence'];
    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'discard_top_to_graveyard',
    }).state;

    expect(canUseInquisitionPurge(state, 'player_1')).toBe(false);
    expect(legalInquisitionPurgeOptions(state, 'player_1')).toEqual([]);
  });

  it('blocks unrelated actions until the cost-three response resolves', () => {
    let state = game();
    state.players.player_2.zones.hand = ['card-contingency-plan'];
    state = applyGameAction(state, {
      type: 'use_inquisition_purge',
      playerId: 'player_1',
      mode: 'opponent_choose_hand_to_graveyard',
    }).state;

    expect(() => applyGameAction(state, {
      type: 'end_turn',
      playerId: 'player_1',
    })).toThrow(/pending Inquisition choice/);
  });
});
