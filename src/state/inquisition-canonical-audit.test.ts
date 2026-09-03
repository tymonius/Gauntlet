import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { GameState, PlayerID } from '../types/v06';
import { buildPendingInquisitionOptions } from '../dev/inquisition-options';
import { applyGameAction } from './apply-inquisition';
import {
  FINAL_JUDGMENT_ABILITY_ID,
  RELENTLESS_PURSUIT_ABILITY_ID,
  resumeRelentlessPursuitTurnStart,
} from './inquisition-leaders';
import { initializeGame } from './initialize';
import { legalLeaderAbilitiesFor } from './leader-abilities';

const INQUISITION_CARDS = [
  ['inquisition-accusation', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-confession', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-penance', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-divine-mercy', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-no-martyrs', 'asset_bank', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-excommunication', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-guilt-by-association', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-act-of-faith', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-tyranny', 'asset_bank', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-burning-at-the-stake', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],
  ['inquisition-heresy', 'graveyard', ['battle_hand_commit', 'battle_draw_play']],
  ['inquisition-hellfire', 'discard', ['action', 'battle_hand_commit', 'battle_draw_play']],
] as const;

function game(leaderName: 'Grand Inquisitor' | 'Witch Hunter'): GameState {
  const state = initializeGame({
    id: `inquisition-audit-${leaderName}`,
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: leaderName,
        factionId: 'inquisition',
        leaderName,
        deck: INQUISITION_CARDS.map(([cardId]) => cardId),
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor', 'card-fortifications', 'card-attrition'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_after_movement';
  return state;
}

function clearOccupants(state: GameState): void {
  for (const space of state.board.spaces) space.occupant = undefined;
  for (const player of Object.values(state.players)) player.occupiedSpaceId = undefined;
}

function place(state: GameState, playerId: PlayerID, index: number): void {
  const space = state.board.spaces.find((candidate) => candidate.index === index)!;
  space.occupant = playerId;
  state.players[playerId].occupiedSpaceId = space.id;
}

function postBattle(
  state: GameState,
  winner: PlayerID,
  attacker: PlayerID,
  defender: PlayerID,
  retreatDirection: -1 | 1,
): void {
  const location = state.board.spaces.find((space) => space.index === 3)!;
  const origin = state.board.spaces.find((space) => space.index === 2)!;
  state.recentBattleResult = {
    battleId: 'audit-battle',
    turn: state.turn,
    winner,
    loser: winner === attacker ? defender : attacker,
    attacker,
    defender,
    location: location.id,
    attackerOrigin: origin.id,
    retreatDirection,
  };
  state.pendingLeaderAbilityWindow = {
    playerId: winner,
    timing: 'after_battle',
    battleId: 'audit-battle',
  };
  state.priorityPlayer = winner;
}

describe('canonical Inquisition audit', () => {
  it('registers every canonical card with its correct play window and hand destination', () => {
    for (const [cardId, handDestination, timings] of INQUISITION_CARDS) {
      const rule = getCardPlayRule(cardId);
      expect(rule, cardId).toBeDefined();
      expect(rule?.timings, cardId).toEqual(timings);
      expect(rule?.allowedOrigins, cardId).toEqual(['hand', 'battle_draw']);
      expect(rule?.defaultDestinationByOrigin.hand, cardId).toBe(handDestination);
      expect(rule?.defaultDestinationByOrigin.battle_draw, cardId).toBe('discard');
    }
  });

  it('registers Final Judgment and uses a discounted Purge without consuming an Action Opportunity', () => {
    let state = game('Grand Inquisitor');
    postBattle(state, 'player_1', 'player_1', 'player_2', 1);
    state.players.player_1.resources!.conviction!.value = 2;
    state.players.player_1.actionsRemaining = 1;
    state.players.player_1.hasPlayedActionThisTurn = false;
    state.players.player_2.zones.assetBank = ['card-fortifications'];

    expect(legalLeaderAbilitiesFor(state, 'player_1').map((option) => option.abilityId))
      .toContain(FINAL_JUDGMENT_ABILITY_ID);

    state = applyGameAction(state, {
      type: 'use_leader_ability',
      playerId: 'player_1',
      abilityId: FINAL_JUDGMENT_ABILITY_ID,
    }).state;

    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'final_judgment_purge',
      playerId: 'player_1',
    });
    const options = buildPendingInquisitionOptions(state, 'player_1')!;
    const assetOption = options.find((option) => option.action.type === 'resolve_inquisition_choice'
      && option.action.choice === 'asset_to_graveyard');
    expect(assetOption?.label).toContain('pay 1 Conviction');

    state = applyGameAction(state, assetOption!.action).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_1.actionsRemaining).toBe(1);
    expect(state.players.player_1.hasPlayedActionThisTurn).toBe(false);
    expect(state.players.player_2.zones.assetBank).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toContain('card-fortifications');
    expect(state.players.player_1.leaderAbilityUsage?.turn[FINAL_JUDGMENT_ABILITY_ID]).toBe(state.turn);
  });

  it('discounts a four-Conviction targeted hand Purge to three', () => {
    let state = game('Grand Inquisitor');
    postBattle(state, 'player_1', 'player_1', 'player_2', 1);
    state.players.player_1.resources!.conviction!.value = 3;
    state.players.player_2.zones.hand = ['card-valor'];

    state = applyGameAction(state, {
      type: 'use_leader_ability',
      playerId: 'player_1',
      abilityId: FINAL_JUDGMENT_ABILITY_ID,
    }).state;
    const choice = buildPendingInquisitionOptions(state, 'player_1')!.find((option) => (
      option.action.type === 'resolve_inquisition_choice'
      && option.action.choice === 'choose_hand_to_graveyard'
    ))!;
    state = applyGameAction(state, choice.action).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
    expect(state.players.player_2.zones.hand).toEqual([]);
    expect(state.players.player_2.zones.graveyard).toContain('card-valor');
  });

  it('executes Relentless Pursuit before the Witch Hunter normal turn-start draw', () => {
    let state = game('Witch Hunter');
    clearOccupants(state);
    place(state, 'player_2', 2);
    place(state, 'player_1', 4);
    state.activePlayer = 'player_2';
    postBattle(state, 'player_1', 'player_2', 'player_1', -1);
    state.players.player_1.resources!.conviction!.value = 2;

    expect(legalLeaderAbilitiesFor(state, 'player_1').map((option) => option.abilityId))
      .toContain(RELENTLESS_PURSUIT_ABILITY_ID);

    state = applyGameAction(state, {
      type: 'use_leader_ability',
      playerId: 'player_1',
      abilityId: RELENTLESS_PURSUIT_ABILITY_ID,
    }).state;

    expect(state.activePlayer).toBe('player_1');
    expect(state.turn).toBe(2);
    expect(state.phase).toBe('turn_start');
    expect(state.priorityPlayer).toBe('player_1');
    expect(state.players.player_1.occupiedSpaceId)
      .toBe(state.board.spaces.find((space) => space.index === 3)?.id);
    expect(state.players.player_1.movementRemaining).toBe(1);
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
  });

  it('starts a normal battle when Relentless Pursuit moves into the defeated opponent', () => {
    let state = game('Witch Hunter');
    clearOccupants(state);
    place(state, 'player_2', 3);
    place(state, 'player_1', 4);
    state.activePlayer = 'player_2';
    postBattle(state, 'player_1', 'player_2', 'player_1', -1);
    state.players.player_1.resources!.conviction!.value = 2;

    state = applyGameAction(state, {
      type: 'use_leader_ability',
      playerId: 'player_1',
      abilityId: RELENTLESS_PURSUIT_ABILITY_ID,
    }).state;

    expect(state.phase).toBe('battle');
    expect(state.battle).toMatchObject({
      attacker: { playerId: 'player_1' },
      defender: { playerId: 'player_2' },
      stage: 'hand_commit',
    });
    expect(state.inquisitionRelentlessPursuitResume).toEqual({ playerId: 'player_1', turn: 2 });

    state.battle = undefined;
    state.phase = 'action_after_movement';
    expect(resumeRelentlessPursuitTurnStart(state)).toBe(true);
    expect(state.phase).toBe('turn_start');
    expect(state.inquisitionRelentlessPursuitResume).toBeUndefined();
  });

  it('does not offer Relentless Pursuit without sufficient Conviction', () => {
    const state = game('Witch Hunter');
    clearOccupants(state);
    place(state, 'player_2', 2);
    place(state, 'player_1', 4);
    state.activePlayer = 'player_2';
    postBattle(state, 'player_1', 'player_2', 'player_1', -1);
    state.players.player_1.resources!.conviction!.value = 1;

    expect(legalLeaderAbilitiesFor(state, 'player_1').map((option) => option.abilityId))
      .not.toContain(RELENTLESS_PURSUIT_ABILITY_ID);
  });
});
