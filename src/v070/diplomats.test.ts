import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_EXECUTABLE_PROPOSAL_IDS,
  eligibleV070Proposals,
} from './diplomats';
import { viewV070GameForPlayer } from './views';

type StarterPair = {
  A: string;
  B: string;
};

const ambassadorPair: StarterPair = {
  A: 'diplomats-ambassador-open-channels',
  B: 'military-commandant-holdfast',
};

const senatorPair: StarterPair = {
  A: 'diplomats-senator-procedure-endures',
  B: 'military-commandant-holdfast',
};

function startedGame(pair: StarterPair = ambassadorPair): V070GameState {
  let state = createV070StarterGame({
    gameId: 'terms-test',
    seed: 'terms-seed',
    players: {
      A: { name: 'Diplomat', starterDeckId: pair.A },
      B: { name: 'Opponent', starterDeckId: pair.B },
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
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'A', value: 6 });
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'B', value: 1 });
  return state;
}

function activeBattle(pair: StarterPair = ambassadorPair): V070GameState {
  let state = startedGame(pair);
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  return state;
}

function proceedToOutcome(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
  return state;
}

describe('v0.7.0 Diplomat Terms runtime', () => {
  test('binds nine released Proposals and the six-Article victory threshold', () => {
    expect(v070CanonicalContent.proposalsById.size).toBe(9);
    expect(v070CanonicalContent.content.faction_rules.diplomats.peace_treaty_threshold).toBe(6);
    expect(V070_EXECUTABLE_PROPOSAL_IDS).toEqual([
      'de-escalation',
      'orderly-withdrawal',
      'capitulation',
      'open-channels',
      'mutual-disarmament',
      'prisoner-exchange',
      'rebuilding-pact',
      'ultimatum',
      'diplomatic-recognition',
    ]);

    const state = startedGame();
    expect(state.players.A.diplomats).toEqual({
      influence: 1,
      ratifiedProposals: [],
      cordialityUsedTurn: null,
      politicalCapitalUsedTurn: null,
      detenteUsedTurn: null,
    });
    expect(state.players.B.diplomats).toBeNull();
  });

  test('gives a single Diplomat the Terms opportunity and requires it to resolve before Gambits', () => {
    let state = activeBattle();

    expect(() => reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    })).toThrow('Resolve or pass the current Terms opportunity');

    state = reduceV070BattleAction(state, { type: 'pass_terms', playerId: 'A' });
    expect(state.battleRuntime?.terms.stage).toBe('closed');

    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });

  test('uses attacker-first Terms priority in a Diplomat mirror', () => {
    let state = createV070StarterGame({
      gameId: 'mirror',
      seed: 'mirror-seed',
      players: {
        A: { name: 'A', starterDeckId: 'diplomats-ambassador-open-channels' },
        B: { name: 'B', starterDeckId: 'diplomats-senator-procedure-endures' },
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
    state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'A', value: 6 });
    state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'B', value: 1 });
    state.players.A.position = 2;
    state.players.B.position = 3;
    state.board.forEach(space => { space.occupant = null; });
    state.board[2].occupant = 'A';
    state.board[3].occupant = 'B';
    state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
    state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
    state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
    state = reduceV070TurnAction(state, { type: 'choose_movement', playerId: 'A', choice: 'advance' });

    state = reduceV070BattleAction(state, { type: 'pass_terms', playerId: 'A' });
    expect(state.battleRuntime?.terms.stage).toBe('opportunity');
    expect(state.battleRuntime?.terms.priorityPlayer).toBe('B');

    state = reduceV070BattleAction(state, { type: 'pass_terms', playerId: 'B' });
    expect(state.battleRuntime?.terms.stage).toBe('closed');
  });

  test('accepted Terms end during Onset, ratify once, return the Stake, and trigger Cordiality', () => {
    let state = activeBattle();
    const handBefore = state.players.A.zones.hand.length;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'orderly-withdrawal',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.battle).toBeNull();
    expect(state.battleRuntime).toBeNull();
    expect(state.players.A.position).toBe(2);
    expect(state.players.B.position).toBe(3);
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.players.A.diplomats?.ratifiedProposals).toEqual(['orderly-withdrawal']);
    expect(state.players.A.diplomats?.influence).toBe(2);
    expect(state.players.A.zones.hand.length).toBe(handBefore + 1);
    expect(state.events.some(event => event.type === 'cordiality_triggered')).toBe(true);
  });

  test('Open Channels refusal reveals the opponent Hand privately and grants +1 Reserve', () => {
    let state = activeBattle();

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'open-channels',
    });
    expect(state.players.A.diplomats?.influence).toBe(0);

    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });
    expect(state.battleRuntime?.participants.A.reserveBonus).toBe(1);

    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });

    expect(state.battleRuntime?.participants.A.reserve).toHaveLength(4);
    expect(state.battleRuntime?.participants.B.reserve).toHaveLength(3);

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');
    expect(aView.events.some(event => event.type === 'hand_revealed')).toBe(true);
    expect(bView.events.some(event => event.type === 'hand_revealed')).toBe(false);
  });

  test('refused Orderly Withdrawal and Leverage modify battle total and impose a new Proposal on a win', () => {
    let state = activeBattle();
    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'orderly-withdrawal',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });

    state = proceedToOutcome(state);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);

    expect(() => reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [2],
    })).toThrow('Resolve Leverage');

    state = reduceV070BattleAction(state, {
      type: 'use_leverage',
      playerId: 'A',
      bonus: 1,
    });
    expect(state.players.A.diplomats?.influence).toBe(0);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [4],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.players.A.diplomats?.ratifiedProposals).toEqual(['orderly-withdrawal']);
    expect(state.players.A.diplomats?.influence).toBe(2);
  });

  test('Senator Political Capital recovers staked Influence with Hand cards after losing refused Terms', () => {
    let state = activeBattle(senatorPair);
    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'open-channels',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });
    state = proceedToOutcome(state);
    state = reduceV070BattleAction(state, { type: 'use_leverage', playerId: 'A', bonus: 0 });

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });

    expect(state.battleRuntime?.terms.stage).toBe('political_capital');
    expect(state.battleRuntime?.terms.politicalCapitalPending).toBe(true);
    expect(state.players.A.diplomats?.influence).toBe(0);

    const recoveryCard = state.players.A.zones.hand[0];
    state = reduceV070BattleAction(state, {
      type: 'resolve_political_capital',
      playerId: 'A',
      cardInstanceIds: [recoveryCard],
    });

    expect(state.players.A.diplomats?.influence).toBe(1);
    expect(state.players.A.diplomats?.politicalCapitalUsedTurn).toBe(state.turnNumber);
    expect(state.players.A.zones.graveyard).toContain(recoveryCard);
    expect(state.battleRuntime?.terms.politicalCapitalPending).toBe(false);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battle).toBeNull();
  });

  test('wins Peace Treaty after Capture with six different ratified Proposals', () => {
    let state = startedGame();
    state.players.A.diplomats!.ratifiedProposals = [
      'de-escalation',
      'orderly-withdrawal',
      'capitulation',
      'open-channels',
      'mutual-disarmament',
      'ultimatum',
    ];

    state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });

    expect(state.stage).toBe('ended');
    expect(state.winner).toBe('A');
    expect(state.turnState).toBeNull();
    expect(state.events.at(-1)).toEqual(expect.objectContaining({
      type: 'game_won',
      actor: 'A',
      payload: expect.objectContaining({
        route: 'peace_treaty',
        ratifiedProposals: 6,
      }),
    }));
  });
});
