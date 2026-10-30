import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { v070CanonicalContent } from '../content/v070';
import { V070_FOG_OF_WAR_ID } from './fog-of-war';
import { returnV070UnappliedFogOfWarBattleCards } from './fog-of-war-return';
import type { V070BattleCardCommitment } from './battle-types';
import { appendV070Event } from './engine';
import { v070BattleEffectHandler } from './battle-effects';
import { markV070BattleCardEffectApplied } from './battle-effect-status';
import { withV070CopiedEffectApplication } from './copied-effect-runtime';
import {
  applyV070ReversibleBattleNumericEffect,
} from './battle-reversible-numeric-effects';

function battle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'commitment-provenance-regression',
    seed: 'commitment-provenance-regression',
    players: {
      A: { name: 'Alpha', starterDeckId: 'mystics-alchemist-first-principles' },
      B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
    },
  });
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId, cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId, territoryIds: state.players[playerId].territoryCandidates,
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
  state.board.forEach(space => { space.occupant = null; space.blank = true; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';
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
  expect(state.battle?.attacker).toBe('A');
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset', playerId: 'A',
  });
  expect(state.battleRuntime).not.toBeNull();
  state.battleRuntime!.stage = 'reveal_tactics';
  return state;
}

function fixture() {
  const state = battle();
  const battleCardId = [...v070CanonicalContent.cardsById.values()]
    .find(card => card.effects.some(effect =>
      effect.label === 'Gambit/Tactic'
      && effect.text === '+1 Battle Total.'
    ))?.id;
  if (!battleCardId) throw new Error('No eligible battle-card fixture.');
  function add(
    owner: 'A' | 'B',
    suffix: string,
    role: 'gambit' | 'tactic',
    sourceZone: 'hand' | 'reserve',
    cardId: string = battleCardId!,
  ): V070BattleCardCommitment {
    const instanceId = 'fog-source-' + suffix;
    state.cardInstances[instanceId] = { instanceId, owner, cardId };
    return { instanceId, owner, role, sourceZone, faceUp: true };
  }
  const fog = add('A', 'effect', 'gambit', 'hand', V070_FOG_OF_WAR_ID);
  const normalGambit = add('B', 'normal-gambit', 'gambit', 'hand');
  const extraGambit = add('B', 'extra-gambit', 'gambit', 'hand');
  const reserveTactic = add('B', 'reserve-tactic', 'tactic', 'reserve');
  const handTactic = add('B', 'hand-tactic', 'tactic', 'hand');
  const runtime = state.battleRuntime!;
  runtime.participants.A.gambit = fog;
  runtime.participants.B.gambit = normalGambit;
  runtime.participants.B.additionalGambits = [extraGambit];
  runtime.participants.B.tactic = reserveTactic;
  runtime.participants.B.additionalTactics = [handTactic];
  runtime.battleCardAftermathDestinationOverrides.push({
    sourceCardId: battleCardId, playerId: 'B',
    instanceId: handTactic.instanceId, destination: 'graveyard',
  });
  return { state, fog, normalGambit, extraGambit, reserveTactic, handTactic };
}

describe('Post-Tactics physical source-return primitive (unapplied cards only)', () => {
  test('returns exactly one chosen Gambit to Hand and leaves the other commitments intact', () => {
    const { state, fog, normalGambit, extraGambit, reserveTactic } = fixture();
    const returned = returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId,
      { choice: 'one_gambit', targetInstanceId: extraGambit.instanceId },
    );
    expect(returned).toEqual([extraGambit.instanceId]);
    expect(state.players.B.zones.hand).toContain(extraGambit.instanceId);
    expect(state.battleRuntime!.participants.B.gambit?.instanceId)
      .toBe(normalGambit.instanceId);
    expect(state.battleRuntime!.participants.B.additionalGambits).toEqual([]);
    expect(state.battleRuntime!.participants.B.tactic?.instanceId)
      .toBe(reserveTactic.instanceId);
  });

  test('returns all Tactics to their distinct Reserve and Hand sources', () => {
    const { state, fog, reserveTactic, handTactic, normalGambit } = fixture();
    const returned = returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    );
    expect(returned).toEqual([reserveTactic.instanceId, handTactic.instanceId]);
    expect(state.battleRuntime!.participants.B.reserve)
      .toContain(reserveTactic.instanceId);
    expect(state.players.B.zones.hand).toContain(handTactic.instanceId);
    expect(state.battleRuntime!.participants.B.tactic).toBeNull();
    expect(state.battleRuntime!.participants.B.additionalTactics).toEqual([]);
    expect(state.battleRuntime!.participants.B.gambit?.instanceId)
      .toBe(normalGambit.instanceId);
    expect(state.battleRuntime!.battleCardAftermathDestinationOverrides)
      .not.toContainEqual(expect.objectContaining({
        instanceId: handTactic.instanceId,
      }));
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'fog_of_war_battle_cards_returned',
      payload: expect.objectContaining({
        choice: 'all_tactics',
        returned: expect.arrayContaining([
          expect.objectContaining({
            instanceId: reserveTactic.instanceId, sourceZone: 'reserve',
          }),
          expect.objectContaining({
            instanceId: handTactic.instanceId, sourceZone: 'hand',
          }),
        ]),
      }),
    }));
  });

  test('reverses only a selected Gambit contribution after the printed effect applied', () => {
    const { state, fog, normalGambit, extraGambit } = fixture();
    const a = state.battleRuntime!.participants.B;
    for (const card of [normalGambit, extraGambit]) {
      const cardId = state.cardInstances[card.instanceId].cardId;
      const handler = v070BattleEffectHandler(cardId);
      if (!handler) throw new Error('Missing printed numeric card handler.');
      handler.apply({ state, owner: 'B', opponent: 'A', commitment: card });
      markV070BattleCardEffectApplied(state, card.instanceId);
      appendV070Event(state, {
        type: 'battle_card_effect_applied', actor: 'B', visibility: 'public',
        payload: { instanceId: card.instanceId, cardId, role: 'gambit', timing: 'reveal' },
      });
    }
    const before = a.battleModifier;
    expect(before).toBe(2);
    returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId,
      { choice: 'one_gambit', targetInstanceId: extraGambit.instanceId },
    );
    expect(a.battleModifier).toBe(1);
    expect(state.battleRuntime!.appliedBattleCardEffectInstanceIds)
      .toContain(normalGambit.instanceId);
    expect(state.battleRuntime!.appliedBattleCardEffectInstanceIds)
      .not.toContain(extraGambit.instanceId);
    expect(state.events.some(event =>
      event.type === 'battle_card_numeric_effect_reversed'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId
        === extraGambit.instanceId,
    )).toBe(true);
  });

  test('preserves a separate copied numeric effect when the printed source returns', () => {
    const { state, fog, extraGambit } = fixture();
    const cardId = state.cardInstances[extraGambit.instanceId].cardId;
    const card = v070CanonicalContent.cardsById.get(cardId);
    const printed = card?.effects.find(effect => effect.label === 'Gambit/Tactic');
    const handler = v070BattleEffectHandler(cardId);
    if (!card || !printed || !handler) throw new Error('Missing fixture handler.');
    handler.apply({
      state, owner: 'B', opponent: 'A', commitment: extraGambit,
    });
    markV070BattleCardEffectApplied(state, extraGambit.instanceId);
    withV070CopiedEffectApplication(state, {
      cardId, cardName: card.name, label: 'Gambit/Tactic',
      text: printed.text, controller: 'B', chainDepth: 1,
      sourceCardMovesMerelyBecauseCopied: false,
      printedEffectOrCallerMayMoveSource: true,
      sourceCardIsPlayedSetOrChosen: false,
      sourceEventTriggers: false, remakeChoices: true,
      repayCosts: true, chainAllowsFurtherCopiedApplication: false,
    }, () => {
      handler.apply({
        state, owner: 'B', opponent: 'A', commitment: extraGambit,
      });
    }, extraGambit.instanceId);
    expect(state.battleRuntime!.participants.B.battleModifier).toBe(2);
    returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId,
      { choice: 'one_gambit', targetInstanceId: extraGambit.instanceId },
    );
    expect(state.battleRuntime!.participants.B.battleModifier).toBe(1);
  });

  test('reverses numeric effects from mixed Hand/Reserve Tactics together', () => {
    const { state, fog, reserveTactic, handTactic } = fixture();
    const b = state.battleRuntime!.participants.B;
    for (const card of [reserveTactic, handTactic]) {
      applyV070ReversibleBattleNumericEffect(
        state, card.instanceId, state.cardInstances[card.instanceId].cardId,
        'B', 'battleModifier', 1,
      );
      markV070BattleCardEffectApplied(state, card.instanceId);
    }
    b.battleModifier += 4; // Independent modifier must survive the return.
    returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    );
    expect(b.battleModifier).toBe(4);
    expect(b.reserve).toContain(reserveTactic.instanceId);
    expect(state.players.B.zones.hand).toContain(handTactic.instanceId);
  });

  test('rejects an applied untracked effect atomically even beside reversible cards', () => {
    const { state, fog, reserveTactic, handTactic } = fixture();
    applyV070ReversibleBattleNumericEffect(
      state, reserveTactic.instanceId,
      state.cardInstances[reserveTactic.instanceId].cardId,
      'B', 'battleModifier', 1,
    );
    markV070BattleCardEffectApplied(state, reserveTactic.instanceId);
    markV070BattleCardEffectApplied(state, handTactic.instanceId);
    const before = structuredClone(state);
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/applied effect/);
    expect(state).toEqual(before);
  });

  test('rejects applied effects before changing any card or battle state', () => {
    const { state, fog, reserveTactic } = fixture();
    state.battleRuntime!.appliedBattleCardEffectInstanceIds = [
      reserveTactic.instanceId,
    ];
    const before = structuredClone(state);
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/applied effect/);
    expect(state).toEqual(before);
  });

  test('rejects a missing origin before partially returning mixed-source Tactics', () => {
    const { state, fog } = fixture();
    delete state.battleRuntime!.participants.B.additionalTactics[0].sourceZone;
    const before = structuredClone(state);
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/source zone was not recorded/);
    expect(state).toEqual(before);
  });

  test('rejects an unresolved reveal queue before it can replay a returned effect', () => {
    const { state, fog, handTactic } = fixture();
    state.battleRuntime!.pendingRevealEffectEncounteredAt = 'reveal_tactics';
    state.battleRuntime!.pendingRevealEffectCommitments = [handTactic];
    const before = structuredClone(state);
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/Resolve pending battle-card reveal effects/);
    expect(state).toEqual(before);
  });

  test('rejects ineligible opponents and incorrect source cards', () => {
    const { state, fog } = fixture();
    const before = structuredClone(state);
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'B', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/own committed battle card/);
    expect(state).toEqual(before);
    state.battleRuntime!.participants.B.tactic = null;
    state.battleRuntime!.participants.B.additionalTactics = [];
    expect(() => returnV070UnappliedFogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'one_gambit', targetInstanceId: 'none' },
    )).toThrow(/Gambit and a Tactic/);
  });
});
