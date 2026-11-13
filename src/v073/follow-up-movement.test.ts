import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from '../v070/engine';
import { reduceV070TurnAction } from '../v070/turn-engine';
import { reduceV070BattleAction } from '../v070/battle-engine';
import {
  stageV070CounterchargeBattleEffect,
} from '../v070/countercharge-battle';
import {
  v073ChooseFollowUpGrant,
  v073CollectFollowUpGrants,
  v073CompleteFollowUpGrant,
  v073CreateFollowUpQueue,
  v073DeclineFollowUpGrant,
  v073OfferedFollowUpGrants,
  type V073FollowUpGrant,
} from './follow-up-movement';

const giveChase = (sourceInstanceId: string): V073FollowUpGrant => ({
  key: 'give-chase:' + sourceInstanceId,
  owner: 'A', kind: 'give-chase-battle',
  sourceInstanceId, optional: true,
});
const rout: V073FollowUpGrant = {
  key: 'general-rout:A', owner: 'A', kind: 'general-rout',
  sourceInstanceId: null, optional: true,
};
const countercharge = (sourceInstanceId: string, optional: boolean): V073FollowUpGrant => ({
  key: 'countercharge-' + (optional ? 'asset:' : 'battle:') + sourceInstanceId,
  owner: 'B',
  kind: optional ? 'countercharge-asset' : 'countercharge-battle',
  sourceInstanceId,
  optional,
});

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'v073-follow-up',
    seed: 'v073-follow-up-seed',
    players: {
      A: { name: 'Attacker', starterDeckId: 'military-general-forward-doctrine' },
      B: { name: 'Defender', starterDeckId: 'military-commandant-holdfast' },
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
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });
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
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
  return state;
}

function settle(state: V070GameState, winner: 'A' | 'B'): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'A',
    values: [winner === 'A' ? 6 : 1],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'B',
    values: [winner === 'B' ? 6 : 1],
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  // Candidate scheduler test: current-release reducer is deliberately not
  // wired to unsupported effects, so only the eligibility window is staged.
  state.battleRuntime!.aftermathCardsCleared = true;
  return state;
}

function addBattleCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  role: 'gambit' | 'tactic' = 'tactic',
): string {
  const participant = state.battleRuntime!.participants[owner];
  const sourceId = participant.reserve.shift()!;
  state.cardInstances[sourceId].cardId = cardId;
  const commitment = {
    instanceId: sourceId,
    sourceZone: 'reserve' as const,
    owner,
    role,
    faceUp: true,
  };
  if (role === 'tactic' && !participant.tactic) {
    participant.tactic = commitment;
  } else if (role === 'tactic') {
    participant.additionalTactics.push(commitment);
  } else {
    participant.additionalGambits.push(commitment);
  }
  return sourceId;
}

function addAsset(state: V070GameState, owner: 'A' | 'B'): string {
  const sourceId = state.players[owner].zones.hand.pop()!;
  state.cardInstances[sourceId].cardId = 'military-countercharge';
  state.players[owner].zones.assetBank.push(sourceId);
  return sourceId;
}

describe('candidate follow-up movement sequencing (not registered in v0.7.2)', () => {
  test('Give Chase is offered before Rout, with zero Order payment on expiration', () => {
    const queue = v073CreateFollowUpQueue([rout, giveChase('g1')]);
    expect(v073OfferedFollowUpGrants(queue).map(g => g.key)).toEqual(['give-chase:g1']);
    expect(() => v073ChooseFollowUpGrant(queue, rout.key))
      .toThrow(/not currently offered/);
    v073ChooseFollowUpGrant(queue, 'give-chase:g1');
    expect(v073OfferedFollowUpGrants(queue)).toEqual([]);
    v073CompleteFollowUpGrant(queue, true);
    expect(queue.resolved.map(g => g.key)).toEqual(['give-chase:g1']);
    expect(queue.expired.map(g => g.key)).toEqual([rout.key]);
    expect(queue.closed).toBe(true);
    // No Command is charged by staging, selection, or expiry.
    expect(queue.resolved[0]?.kind).toBe('give-chase-battle');
  });

  test('declining Give Chase leaves Rout available at its own cost', () => {
    const queue = v073CreateFollowUpQueue([rout, giveChase('g1')]);
    v073DeclineFollowUpGrant(queue, 'give-chase:g1');
    expect(v073OfferedFollowUpGrants(queue)).toEqual([rout]);
    expect(queue.declined.map(g => g.key)).toEqual(['give-chase:g1']);
    v073ChooseFollowUpGrant(queue, rout.key);
    v073CompleteFollowUpGrant(queue, false);
    expect(queue.closed).toBe(true);
    expect(queue.expired).toEqual([]);
  });

  test('non-battle Give Chase advance permits a later copy then Rout', () => {
    const queue = v073CreateFollowUpQueue([
      rout, giveChase('g1'), giveChase('g2'),
    ]);
    v073ChooseFollowUpGrant(queue, 'give-chase:g2');
    v073CompleteFollowUpGrant(queue, false);
    expect(v073OfferedFollowUpGrants(queue).map(g => g.key))
      .toEqual(['give-chase:g1']);
    v073ChooseFollowUpGrant(queue, 'give-chase:g1');
    v073CompleteFollowUpGrant(queue, false);
    expect(v073OfferedFollowUpGrants(queue)).toEqual([rout]);
  });

  test('a new battle expires even otherwise mandatory Countercharge copies', () => {
    const queue = v073CreateFollowUpQueue([
      countercharge('c1', false), countercharge('c2', false),
      countercharge('c3', true),
    ]);
    expect(() => v073DeclineFollowUpGrant(queue, 'countercharge-battle:c1'))
      .toThrow(/optional/);
    v073ChooseFollowUpGrant(queue, 'countercharge-asset:c3');
    v073CompleteFollowUpGrant(queue, true);
    expect(queue.expired.map(g => g.key)).toEqual([
      'countercharge-battle:c1', 'countercharge-battle:c2',
    ]);
    expect(queue.pending).toEqual([]);
    expect(v073OfferedFollowUpGrants(queue)).toEqual([]);
  });

  test('duplicate source keys or overlapping uncompleted movement are rejected', () => {
    expect(() => v073CreateFollowUpQueue([giveChase('g1'), giveChase('g1')]))
      .toThrow(/unique/);
    const queue = v073CreateFollowUpQueue([
      giveChase('g1'), giveChase('g2'),
    ]);
    v073ChooseFollowUpGrant(queue, 'give-chase:g1');
    expect(() => v073ChooseFollowUpGrant(queue, 'give-chase:g2'))
      .toThrow(/Resolve the current/);
    expect(() => v073CompleteFollowUpGrant(v073CreateFollowUpQueue([]), true))
      .toThrow(/No chosen/);
  });

  test('collects one physical Give Chase source and available General Rout for winning attacker', () => {
    let state = startBattle();
    const g1 = addBattleCard(state, 'A', 'military-give-chase');
    const g2 = addBattleCard(state, 'A', 'military-give-chase');
    state = settle(state, 'A');
    state.players.A.military!.command = 2;
    const list = v073CollectFollowUpGrants(state, [g1, g2, g1, 'not-a-commitment']);
    expect(list.map(g => g.key)).toEqual([
      'give-chase:' + g1, 'give-chase:' + g2, 'general-rout:A',
    ]);
    expect(list.every(g => g.owner === 'A')).toBe(true);
    expect(v073CollectFollowUpGrants(state, []).map(g => g.key))
      .toEqual(['general-rout:A']);
  });

  test('collects mandatory battle and optional banked Countercharge only for winning defender', () => {
    let state = startBattle();
    const c1 = addBattleCard(state, 'B', 'military-countercharge');
    stageV070CounterchargeBattleEffect(state, 'B', c1);
    const c2 = addAsset(state, 'B');
    state = settle(state, 'B');
    const list = v073CollectFollowUpGrants(state);
    expect(list.map(g => ({ key: g.key, optional: g.optional })))
      .toEqual([
        { key: 'countercharge-battle:' + c1, optional: false },
        { key: 'countercharge-asset:' + c2, optional: true },
      ]);
    expect(list.every(g => g.owner === 'B')).toBe(true);
    expect(v073CollectFollowUpGrants(state, [c1])).toEqual(list);
  });

  test('an attacker win does not activate defender Countercharge, nor defender win give Chase', () => {
    let state = startBattle();
    const c1 = addBattleCard(state, 'B', 'military-countercharge');
    stageV070CounterchargeBattleEffect(state, 'B', c1);
    const g1 = addBattleCard(state, 'A', 'military-give-chase');
    state = settle(state, 'B');
    expect(v073CollectFollowUpGrants(state, [g1]).map(g => g.kind))
      .toEqual(['countercharge-battle']);
  });
});
