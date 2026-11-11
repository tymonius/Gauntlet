import { describe, expect, test } from 'vitest';
import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  negateV070BattleCardEffect,
} from './battle-effect-status';
import {
  V070_COUNTERCHARGE_ASSET_TEXT,
  V070_COUNTERCHARGE_BATTLE_TEXT,
  V070_COUNTERCHARGE_ID,
  stageV070CounterchargeBattleEffect,
  v070CounterchargeAftermathCandidates,
} from './countercharge-battle';

function battle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'countercharge-preparation',
    seed: 'countercharge-preparation-seed',
    players: {
      A: { name: 'Attacker', starterDeckId: 'military-general-forward-doctrine' },
      B: { name: 'Defender', starterDeckId: 'military-commandant-holdfast' },
    },
  });
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId,
      cardInstanceId: state.players[playerId].openingSelection[0]!,
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
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset', playerId: 'A',
  });
}

function revealCountercharge(state: V070GameState): [V070GameState, string] {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics', playerId: 'A',
  });
  // This is an isolated staging test, not a live reveal test. Countercharge
  // correctly halts the real reducer until its full handler is registered.
  // Inject a physical revealed commitment only after the supported battle
  // envelope completes its reveal, without pretending the card is playable.
  const participant = state.battleRuntime!.participants.B;
  const tactic = participant.reserve.shift()!;
  state.cardInstances[tactic].cardId = V070_COUNTERCHARGE_ID;
  participant.tactic = {
    instanceId: tactic,
    sourceZone: 'reserve',
    owner: 'B',
    role: 'tactic',
    faceUp: true,
  };
  stageV070CounterchargeBattleEffect(state, 'B', tactic);
  return [state, tactic];
}

function settle(state: V070GameState, winner: 'A' | 'B'): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A', values: [winner === 'A' ? 6 : 1],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B', values: [winner === 'B' ? 6 : 1],
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  // This module tests the post-clear eligibility contract; the production
  // Aftermath scheduler still owns actual battle-card cleanup and movement.
  state.battleRuntime!.aftermathCardsCleared = true;
  return state;
}

function addAsset(state: V070GameState, owner: 'A' | 'B'): string {
  const instanceId = state.players[owner].zones.hand[0]!;
  const hand = state.players[owner].zones.hand;
  hand.splice(hand.indexOf(instanceId), 1);
  state.cardInstances[instanceId].cardId = V070_COUNTERCHARGE_ID;
  state.players[owner].zones.assetBank.push(instanceId);
  return instanceId;
}

describe('Countercharge preparation (not a registered battle effect)', () => {
  test('locks both modes to frozen and current authority', () => {
    for (const content of [v070CanonicalContent, currentCanonicalContent]) {
      const card = content.cardsById.get(V070_COUNTERCHARGE_ID);
      expect(card?.effects.find(effect => effect.label === 'Asset')?.text)
        .toBe(V070_COUNTERCHARGE_ASSET_TEXT);
      expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_COUNTERCHARGE_BATTLE_TEXT);
    }
  });

  test('only the winning non-initiator has an eligible mandatory battle effect', () => {
    let [state, tactic] = revealCountercharge(battle());
    expect(v070CounterchargeAftermathCandidates(state)).toEqual([]);
    state = settle(state, 'B');
    expect(v070CounterchargeAftermathCandidates(state)).toEqual([{
      owner: 'B',
      sourceInstanceId: tactic,
      sourceMode: 'battle',
      optional: false,
    }]);
    expect(state.activePlayer).toBe('A');
  });

  test('a winning attacker gets no Countercharge movement and enemy Assets stay ineligible', () => {
    let [state] = revealCountercharge(battle());
    addAsset(state, 'A');
    addAsset(state, 'B');
    state = settle(state, 'A');
    expect(v070CounterchargeAftermathCandidates(state)).toEqual([]);
  });

  test('a banked active Asset is optional; a face-down Asset is not offered', () => {
    let state = battle();
    const first = addAsset(state, 'B');
    // Distinct physical copies, not title-based deduplication.
    const second = addAsset(state, 'B');
    state.assetFaceStates.push({
      instanceId: second,
      owner: 'B',
      faceUp: false,
      changedBy: 'A',
      sourceInstanceId: null,
      reason: 'test',
      appliedTurn: state.turnNumber,
      restoreAtPlayer: 'B',
    });
    const [revealed, tactic] = revealCountercharge(state);
    const settled = settle(revealed, 'B');
    expect(v070CounterchargeAftermathCandidates(settled)).toEqual([
      {
        owner: 'B',
        sourceInstanceId: tactic,
        sourceMode: 'battle',
        optional: false,
      },
      {
        owner: 'B',
        sourceInstanceId: first,
        sourceMode: 'asset',
        optional: true,
      },
    ]);
  });

  test('negated and forged physical sources cannot create eligible grants', () => {
    let [state, tactic] = revealCountercharge(battle());
    const pre = structuredClone(state);
    expect(() => stageV070CounterchargeBattleEffect(
      state, 'A', tactic,
    )).toThrow(/live, non-negated commitment/);
    expect(state).toEqual(pre);
    // Repeated staging does not duplicate one physical card.
    stageV070CounterchargeBattleEffect(state, 'B', tactic);
    expect(state.battleRuntime?.counterchargeBattleSourceInstanceIds)
      .toEqual([tactic]);
    negateV070BattleCardEffect(
      state, tactic, state.battleRuntime!.participants.A.reserve[0]!,
      'test-negation',
    );
    state = settle(state, 'B');
    expect(v070CounterchargeAftermathCandidates(state)).toEqual([]);
  });

  test('does not declare a follow-up movement during earlier Aftermath stages', () => {
    let [state] = revealCountercharge(battle());
    state = settle(state, 'B');
    state.battleRuntime!.aftermathCardsCleared = false;
    expect(v070CounterchargeAftermathCandidates(state)).toEqual([]);
  });
});
