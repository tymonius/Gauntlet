import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { resolveV070SupportedRevealEffects } from './battle-effects';
import { pendingV070BattleRevealEffectOrderChoice } from './battle-reveal-order';
import type { V070BattleCardCommitment } from './battle-types';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'battle-reveal-order',
    seed: 'battle-reveal-order-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'financiers-banker-sound-investment' },
      B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
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
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
  });

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset', playerId: 'A',
  });
}

function commitment(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): V070BattleCardCommitment {
  const instanceId = `reveal-order-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return { instanceId, owner, role: 'gambit', faceUp: true };
}

function appliedOrder(state: V070GameState, ids: readonly string[]): string[] {
  return state.events
    .filter(event => event.type === 'battle_card_effect_applied')
    .map(event => (event.payload as { instanceId?: string }).instanceId ?? '')
    .filter(instanceId => ids.includes(instanceId));
}

describe('v0.7.0 shared reveal effect ordering', () => {
  test('the active controller chooses among multiple effects, then priority alternates', () => {
    let state = startBattle();
    const firstA = commitment(state, 'A', 'neutral-new-recruits', 'new-recruits');
    const chosenA = commitment(state, 'A', 'neutral-rallying-cry', 'rallying-cry');
    const onlyB = commitment(state, 'B', 'diplomats-gunboat-diplomacy', 'gunboat');

    expect(resolveV070SupportedRevealEffects(
      state,
      [firstA, chosenA, onlyB],
      'reveal_gambits',
    )).toEqual([]);

    expect(pendingV070BattleRevealEffectOrderChoice(state)).toEqual({
      playerId: 'A',
      candidateInstanceIds: [firstA.instanceId, chosenA.instanceId],
    });
    expect(appliedOrder(state, [firstA.instanceId, chosenA.instanceId, onlyB.instanceId]))
      .toEqual([]);

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_reveal_effect_order',
      playerId: 'A',
      sourceInstanceId: chosenA.instanceId,
    });

    expect(pendingV070BattleRevealEffectOrderChoice(state)).toBeNull();
    expect(appliedOrder(state, [firstA.instanceId, chosenA.instanceId, onlyB.instanceId]))
      .toEqual([chosenA.instanceId, onlyB.instanceId, firstA.instanceId]);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(2);
  });

  test('an order choice blocks battle progress and only its controller may resolve it', () => {
    const state = startBattle();
    const firstA = commitment(state, 'A', 'neutral-new-recruits', 'block-new');
    const secondA = commitment(state, 'A', 'neutral-rallying-cry', 'block-rally');

    resolveV070SupportedRevealEffects(
      state,
      [firstA, secondA],
      'reveal_gambits',
    );

    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/pending reveal effects|applies next|reveal effects/i);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_battle_reveal_effect_order',
      playerId: 'B',
      sourceInstanceId: firstA.instanceId,
    })).toThrow(/player with reveal-effect priority/i);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_battle_reveal_effect_order',
      playerId: 'A',
      sourceInstanceId: 'not-a-candidate',
    })).toThrow(/not an eligible next reveal effect/i);
  });

  test('a single effect for the controller applies without opening an order choice', () => {
    const state = startBattle();
    const onlyA = commitment(state, 'A', 'neutral-new-recruits', 'single');

    resolveV070SupportedRevealEffects(state, [onlyA], 'reveal_gambits');

    expect(pendingV070BattleRevealEffectOrderChoice(state)).toBeNull();
    expect(appliedOrder(state, [onlyA.instanceId])).toEqual([onlyA.instanceId]);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
  });
});
