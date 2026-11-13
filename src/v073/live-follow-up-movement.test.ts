import { describe, expect, test } from 'vitest';
import { createV070StarterGame, reduceV070SetupAction, type V070GameState } from '../v070/engine';
import { reduceV070TurnAction } from '../v070/turn-engine';
import { reduceV070BattleAction } from '../v070/battle-engine';
import { viewV070GameForPlayer } from '../v070/views';

function setup(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'candidate-follow-up-live',
    seed: 'candidate-follow-up-live-seed',
    players: {
      A: { name: 'General', starterDeckId: 'military-general-forward-doctrine' },
      B: { name: 'Commandant', starterDeckId: 'military-commandant-holdfast' },
    },
  });
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard', playerId,
      cardInstanceId: state.players[playerId].openingSelection[0]!,
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories', playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'A', value: 6 });
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'B', value: 1 });
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(territory => {
    territory.occupant = null;
    territory.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'choose_movement', playerId: 'A', choice: 'advance' });
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  return state;
}

function revealGambit(state: V070GameState, owner: 'A' | 'B', cardId: string): [V070GameState, string] {
  const instanceId = state.players[owner].zones.hand[0]!;
  state.cardInstances[instanceId].cardId = cardId;
  const other = owner === 'A' ? 'B' : 'A';
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A',
    ...(owner === 'A' ? { cardInstanceId: instanceId } : {}),
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B',
    ...(owner === 'B' ? { cardInstanceId: instanceId } : {}),
  });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
  expect(state.battleRuntime?.stage).not.toBe('halted');
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
  return [state, instanceId];
}

function settle(state: V070GameState, winner: 'A' | 'B'): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'A', values: [winner === 'A' ? 6 : 1],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'B', values: [winner === 'B' ? 6 : 1],
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return state;
}
function complete(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath', playerId: 'A',
  });
}
function asset(state: V070GameState, owner: 'A' | 'B'): string {
  const id = state.players[owner].zones.hand.pop()!;
  state.cardInstances[id].cardId = 'military-countercharge';
  state.players[owner].zones.assetBank.push(id);
  return id;
}
describe('actual v0.7.3 follow-up reducer integration', () => {
  test('winning attacker reveals Give Chase, starts a fresh restricted battle, and leaves Rout unpaid', () => {
    let [state, id] = revealGambit(setup(), 'A', 'military-give-chase');
    state = settle(state, 'A');
    state.players.A.military!.command = 2;
    state = complete(state);
    expect(state.battle).toBeNull();
    const offered = state.v073FollowUpQueue?.pending.map(g => g.kind);
    expect(offered).toEqual(['give-chase-battle', 'general-rout']);
    expect(viewV070GameForPlayer(state, 'A').pendingFollowUpMovement?.options[0]?.kind)
      .toBe('give-chase-battle');
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'A', grantKey: 'give-chase:' + id,
    });
    expect(state.players.A.military?.command).toBe(2);
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'A', choice: 'advance',
    });
    expect(state.battle?.attacker).toBe('A');
    expect(state.battle?.attackerGambitProhibited).toBe(true);
    expect(state.v073FollowUpQueue).toBeUndefined();
    expect(state.players.A.military?.command).toBe(2);
    expect(state.v073GiveChaseBattleRestriction?.reservePenalty).toBe(0);
    expect(() => reduceV070BattleAction(state, {
      type: 'use_general_rally', playerId: 'A',
    })).toThrow(/prohibits Orders/);
    expect(state.players.A.zones.graveyard).toContain(id);
  });

  test('declining optional Give Chase preserves a payable Rout', () => {
    let [state, id] = revealGambit(setup(), 'A', 'military-give-chase');
    state = settle(state, 'A');
    state.players.A.military!.command = 2;
    state = complete(state);
    state = reduceV070TurnAction(state, {
      type: 'decline_follow_up_movement', playerId: 'A',
      grantKey: 'give-chase:' + id,
    });
    expect(state.players.A.military?.command).toBe(2);
    expect(state.v073FollowUpQueue?.pending.map(g => g.kind)).toEqual(['general-rout']);
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'A', grantKey: 'general-rout:A',
    });
    expect(state.players.A.military?.command).toBe(0);
    expect(state.turnState?.movementSequenceOpen).toBe(true);
  });

  test('winning defender launches mandatory off-turn Countercharge with the turn owner unchanged', () => {
    let [state, id] = revealGambit(setup(), 'B', 'military-countercharge');
    state = settle(state, 'B');
    const turn = state.turnNumber;
    state = complete(state);
    expect(state.v073FollowUpQueue?.pending.map(g => g.kind)).toEqual(['countercharge-battle']);
    expect(() => reduceV070TurnAction(state, {
      type: 'decline_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-battle:' + id,
    })).toThrow(/Mandatory/);
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-battle:' + id,
    });
    expect(state.turnState?.effectMovementController).toBe('B');
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    });
    expect(state.activePlayer).toBe('A');
    expect(state.turnNumber).toBe(turn);
    expect(state.battle?.attacker).toBe('B');
    expect(state.v073FollowUpQueue).toBeUndefined();
  });

  test('a no-battle Countercharge movement leaves another physical grant available', () => {
    let state = setup();
    const a1 = asset(state, 'B');
    const a2 = asset(state, 'B');
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
    state = settle(state, 'B');
    state = complete(state);
    expect(state.v073FollowUpQueue?.pending.length).toBe(2);
    state.players.A.position = 0;
    state.board.forEach(t => { if (t.occupant === 'A') t.occupant = null; });
    state.board[0].occupant = 'A';
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-asset:' + a1,
    });
    expect(state.players.B.zones.graveyard).toContain(a1);
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    });
    expect(state.battle).toBeNull();
    expect(state.v073FollowUpQueue?.pending.map(g => g.sourceInstanceId)).toEqual([a2]);
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-asset:' + a2,
    });
    expect(state.players.B.zones.graveyard).toContain(a2);
  });

  test('forged unrelated actor cannot take the offered effect or move another player', () => {
    let [state, id] = revealGambit(setup(), 'B', 'military-countercharge');
    state = complete(settle(state, 'B'));
    const snap = structuredClone(state);
    expect(() => reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'A',
      grantKey: 'countercharge-battle:' + id,
    })).toThrow(/not offered/);
    expect(state).toEqual(snap);
  });
});
