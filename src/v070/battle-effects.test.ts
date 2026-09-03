import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  reduceV070BattleAction,
  cardEligibleForV070BattleRole,
} from './battle-engine';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';

const input = {
  gameId: 'effect-test',
  seed: 'effect-seed',
  players: {
    A: { name: 'Alpha', starterDeckId: 'military-general-forward-doctrine' },
    B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
  },
} as const;

function activeBattle(): V070GameState {
  let state = createV070StarterGame(input);
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
  // Reveal-effect tests use a neutral contested Territory.
  state.board[3].blank = true;

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  return state;
}

function instanceByCardId(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
): string {
  const item = Object.values(state.cardInstances).find(instance =>
    instance.owner === owner && instance.cardId === cardId,
  );
  if (!item) throw new Error(`Fixture has no ${cardId} for ${owner}.`);
  return item.instanceId;
}

function moveToHand(state: V070GameState, owner: 'A' | 'B', instanceId: string): void {
  const player = state.players[owner];
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones.hand.push(instanceId);
}

function unsupportedGambit(state: V070GameState, owner: 'A' | 'B'): string {
  const item = Object.values(state.cardInstances).find(instance =>
    instance.owner === owner
    && cardEligibleForV070BattleRole(instance.cardId, 'gambit')
    && !v070BattleEffectHandler(instance.cardId),
  );
  if (!item) throw new Error(`Fixture has no unsupported Gambit for ${owner}.`);
  return item.instanceId;
}

describe('v0.7.0 audited reveal-effect registry', () => {
  test('locks every supported handler to the released canonical effect text', () => {
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toEqual(expect.arrayContaining([
      'mystics-accursed-wager',
      'mystics-circle-of-bones',
      'neutral-battlefield-plunder',
      'neutral-manifest-destiny',
      'neutral-new-recruits',
      'neutral-rallying-cry',
      'diplomats-gunboat-diplomacy',
      'neutral-forced-march',
      'neutral-stand-ground',
      'neutral-entrenchment',
      'neutral-advance-guard',
      'neutral-contingency-plan',
      'neutral-consolidation',
      'neutral-foothold',
      'neutral-insurrection',
      'neutral-illegal-occupation',
      'neutral-sequestration',
      'neutral-conscription',
      'neutral-tactical-planning',
      'intelligence-disinformation',
      'neutral-rousing-speech',
      'neutral-resourcefulness',
      'neutral-fealty',
    ]));

    for (const cardId of V070_SUPPORTED_REVEAL_EFFECT_IDS) {
      const handler = v070BattleEffectHandler(cardId);
      const card = v070CanonicalContent.cardsById.get(cardId);
      expect(handler).toBeDefined();
      expect(card).toBeDefined();
      expect(card!.effects.some(effect => effect.text === handler!.expectedText)).toBe(true);
    }
  });

  test('applies direct Battle Total modifiers and continues instead of halting', () => {
    let state = activeBattle();
    const recruits = instanceByCardId(state, 'A', 'neutral-new-recruits');
    moveToHand(state, 'A', recruits);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: recruits,
    });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
  });

  test('applies attacker and defender conditions from the actual battle roles', () => {
    let state = activeBattle();
    const forcedMarch = instanceByCardId(state, 'A', 'neutral-forced-march');
    const standGround = instanceByCardId(state, 'B', 'neutral-stand-ground');
    moveToHand(state, 'A', forcedMarch);
    moveToHand(state, 'B', standGround);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: forcedMarch,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: standGround,
    });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });

    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.participants.B.advantage).toBe(1);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });

  test('preserves attacker-first shared timing for supported reveal effects', () => {
    let state = activeBattle();
    const recruits = instanceByCardId(state, 'A', 'neutral-new-recruits');
    const entrenchment = instanceByCardId(state, 'B', 'neutral-entrenchment');
    moveToHand(state, 'A', recruits);
    moveToHand(state, 'B', entrenchment);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: recruits,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: entrenchment,
    });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });

    const applied = state.events
      .filter(event => event.type === 'battle_card_effect_applied')
      .slice(-2)
      .map(event => (event.payload as { cardId: string }).cardId);
    expect(applied).toEqual(['neutral-new-recruits', 'neutral-entrenchment']);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.participants.A.disadvantage).toBe(1);
  });

  test('Fealty removes one existing Disadvantage before falling back to its +1 modifier', () => {
    let state = activeBattle();
    const fealty = instanceByCardId(state, 'B', 'neutral-fealty');
    moveToHand(state, 'B', fealty);
    state.battleRuntime!.participants.B.disadvantage = 2;

    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: fealty,
    });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });

    expect(state.battleRuntime?.participants.B.disadvantage).toBe(1);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(0);
  });

  test('does not partially apply supported cards when another revealed effect is unsupported', () => {
    let state = activeBattle();
    const recruits = instanceByCardId(state, 'A', 'neutral-new-recruits');
    const unsupported = unsupportedGambit(state, 'B');
    moveToHand(state, 'A', recruits);
    moveToHand(state, 'B', unsupported);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: recruits,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: unsupported,
    });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });

    expect(state.battleRuntime?.stage).toBe('halted');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
    expect(state.battleRuntime?.unsupportedEffects.some(effect =>
      effect.instanceId === unsupported,
    )).toBe(true);
  });

  test('Advance Guard gains Advantage only for an attacker who did not set a Gambit', () => {
    // As a Gambit, Advance Guard itself means the attacker did set a Gambit.
    let gambitState = activeBattle();
    const asGambit = instanceByCardId(gambitState, 'A', 'neutral-advance-guard');
    moveToHand(gambitState, 'A', asGambit);
    gambitState = reduceV070BattleAction(gambitState, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: asGambit,
    });
    gambitState = reduceV070BattleAction(gambitState, { type: 'set_gambit', playerId: 'B' });
    gambitState = reduceV070BattleAction(gambitState, { type: 'reveal_gambits', playerId: 'A' });
    expect(gambitState.battleRuntime?.participants.A.advantage).toBe(0);

    // The same printed effect can matter as a Tactic after passing on Gambit.
    let tacticState = activeBattle();
    tacticState = reduceV070BattleAction(tacticState, { type: 'set_gambit', playerId: 'A' });
    tacticState = reduceV070BattleAction(tacticState, { type: 'set_gambit', playerId: 'B' });
    tacticState = reduceV070BattleAction(tacticState, { type: 'reveal_gambits', playerId: 'A' });

    const tactic = instanceByCardId(tacticState, 'A', 'neutral-advance-guard');
    const reserve = tacticState.battleRuntime!.participants.A.reserve;
    const existingReserveIndex = reserve.indexOf(tactic);
    if (existingReserveIndex >= 0) {
      [reserve[0], reserve[existingReserveIndex]] = [reserve[existingReserveIndex], reserve[0]];
    } else {
      const displaced = reserve[0];
      for (const zone of [
        tacticState.players.A.zones.drawPile,
        tacticState.players.A.zones.hand,
        tacticState.players.A.zones.discardPile,
        tacticState.players.A.zones.graveyard,
        tacticState.players.A.zones.assetBank,
        tacticState.players.A.zones.removed,
      ]) {
        const index = zone.indexOf(tactic);
        if (index >= 0) zone.splice(index, 1);
      }
      reserve[0] = tactic;
      tacticState.players.A.zones.drawPile.push(displaced);
    }

    tacticState = reduceV070BattleAction(tacticState, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: tactic,
    });
    tacticState = reduceV070BattleAction(tacticState, { type: 'choose_tactic', playerId: 'B' });
    tacticState = reduceV070BattleAction(tacticState, { type: 'reveal_tactics', playerId: 'A' });

    expect(tacticState.battleRuntime?.participants.A.advantage).toBe(1);
    expect(tacticState.battleRuntime?.stage).toBe('outcome');
  });
});
