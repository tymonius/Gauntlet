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
import { V070_REARGUARD_ID } from './rearguard';
import {
  queueV070FogOfWarBattleChoice,
  returnV070FogOfWarBattleCards,
} from './fog-of-war-return';
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

describe('Normal battle reveal integrates post-Tactics physical card returns', () => {
  test('defers a Gambit, opens the opponent choice, and suppresses returned Tactics', () => {
    const { state, fog, normalGambit, reserveTactic, handTactic } = fixture();
    state.battleRuntime!.participants.B.additionalGambits = [];
    state.battleRuntime!.stage = 'reveal_gambits';
    const gambits = reduceV070BattleAction(state, {
      type: 'reveal_gambits', playerId: 'A',
    });
    expect(gambits.battleRuntime!.stage).toBe('choose_tactics');
    expect(gambits.battleRuntime!.participants.B.battleModifier).toBe(1);
    expect(gambits.battleRuntime!.deferredFogOfWarGambitCommitments)
      .toContainEqual(expect.objectContaining({ instanceId: fog.instanceId }));
    gambits.battleRuntime!.stage = 'reveal_tactics';
    const revealed = reduceV070BattleAction(gambits, {
      type: 'reveal_tactics', playerId: 'A',
    });
    expect(revealed.battleRuntime!.pendingFogOfWarBattleRevealChoice)
      .toMatchObject({ owner: 'A', opponent: 'B', sourceInstanceId: fog.instanceId });
    expect(revealed.battleRuntime!.participants.B.battleModifier).toBe(1);
    const returned = reduceV070BattleAction(revealed, {
      type: 'resolve_fog_of_war_battle', playerId: 'B',
      choice: 'all_tactics',
    });
    expect(returned.battleRuntime!.participants.B.battleModifier).toBe(1);
    expect(returned.battleRuntime!.participants.B.gambit?.instanceId)
      .toBe(normalGambit.instanceId);
    expect(returned.battleRuntime!.participants.B.reserve).toContain(reserveTactic.instanceId);
    expect(returned.players.B.zones.hand).toContain(handTactic.instanceId);
    expect(returned.battleRuntime!.pendingFogOfWarBattleRevealChoice).toBeNull();
    expect(returned.battleRuntime!.pendingRevealEffectEncounteredAt).toBeNull();
    expect(returned.events.some(event =>
      event.type === 'battle_card_effect_applied'
      && [reserveTactic.instanceId, handTactic.instanceId].includes(
        (event.payload as { instanceId?: string }).instanceId ?? '',
      ),
    )).toBe(false);
  });

  test('a Fog Tactic resolves before ordinary Tactics and the opponent can return a Gambit', () => {
    const { state, fog, reserveTactic } = fixture();
    const runtime = state.battleRuntime!;
    runtime.participants.B.additionalTactics = [];
    runtime.participants.A.gambit = null;
    runtime.participants.A.tactic = { ...fog, role: 'tactic', sourceZone: 'reserve' };
    runtime.participants.B.additionalGambits = [];
    runtime.stage = 'reveal_gambits';
    const gambits = reduceV070BattleAction(state, {
      type: 'reveal_gambits', playerId: 'A',
    });
    gambits.battleRuntime!.stage = 'reveal_tactics';
    const revealed = reduceV070BattleAction(gambits, {
      type: 'reveal_tactics', playerId: 'A',
    });
    expect(revealed.battleRuntime!.pendingFogOfWarBattleRevealChoice?.kind)
      .toBe('fog_of_war');
    const returned = reduceV070BattleAction(revealed, {
      type: 'resolve_fog_of_war_battle', playerId: 'B',
      choice: 'one_gambit',
      targetInstanceId: revealed.battleRuntime!.participants.B.gambit!.instanceId,
    });
    expect(returned.battleRuntime!.participants.B.gambit).toBeNull();
    expect(returned.battleRuntime!.participants.B.battleModifier).toBe(2);
    expect(returned.battleRuntime!.participants.B.tactic?.instanceId)
      .toBe(reserveTactic.instanceId);
    expect(returned.battleRuntime!.pendingRevealEffectEncounteredAt).toBeNull();
  });

  test('returns a deferred-registration Tactic before its ordinary handler registers', () => {
    const { state, fog, reserveTactic } = fixture();
    const runtime = state.battleRuntime!;
    state.cardInstances[reserveTactic.instanceId].cardId = V070_REARGUARD_ID;
    runtime.participants.B.additionalGambits = [];
    runtime.participants.B.additionalTactics = [];
    runtime.stage = 'reveal_gambits';
    const gambits = reduceV070BattleAction(state, {
      type: 'reveal_gambits', playerId: 'A',
    });
    gambits.battleRuntime!.stage = 'reveal_tactics';
    const revealed = reduceV070BattleAction(gambits, {
      type: 'reveal_tactics', playerId: 'A',
    });
    expect(revealed.battleRuntime!.pendingFogOfWarBattleRevealChoice?.kind)
      .toBe('fog_of_war');
    const returned = reduceV070BattleAction(revealed, {
      type: 'resolve_fog_of_war_battle', playerId: 'B',
      choice: 'all_tactics',
    });
    expect(returned.events.some(event =>
      event.type === 'battle_card_effect_applied'
      && (event.payload as { instanceId?: string }).instanceId
        === reserveTactic.instanceId,
    )).toBe(false);
    expect(returned.battleRuntime!.participants.B.reserve)
      .toContain(reserveTactic.instanceId);
    expect(returned.battleRuntime!.battleCardAftermathAssetBanks)
      .not.toContainEqual(expect.objectContaining({
        sourceInstanceId: reserveTactic.instanceId,
      }));
  });


});

describe('Post-Tactics physical source-return primitive (completed effects persist)', () => {
  test('returns exactly one chosen Gambit to Hand and leaves the other commitments intact', () => {
    const { state, fog, normalGambit, extraGambit, reserveTactic } = fixture();
    const returned = returnV070FogOfWarBattleCards(
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
    const returned = returnV070FogOfWarBattleCards(
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

  test('returns an applied Gambit while preserving its completed printed effect', () => {
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
    returnV070FogOfWarBattleCards(
      state, 'A', fog.instanceId,
      { choice: 'one_gambit', targetInstanceId: extraGambit.instanceId },
    );
    expect(a.battleModifier).toBe(2);
    expect(state.battleRuntime!.appliedBattleCardEffectInstanceIds)
      .toContain(normalGambit.instanceId);
    expect(state.battleRuntime!.appliedBattleCardEffectInstanceIds)
      .toContain(extraGambit.instanceId);
    expect(state.players.B.zones.hand).toContain(extraGambit.instanceId);
    expect(state.events.some(event =>
      event.type === 'battle_card_numeric_effect_reversed'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId
        === extraGambit.instanceId,
    )).toBe(false);
  });

  test('preserves original and copied numeric effects when the source returns', () => {
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
    returnV070FogOfWarBattleCards(
      state, 'A', fog.instanceId,
      { choice: 'one_gambit', targetInstanceId: extraGambit.instanceId },
    );
    expect(state.battleRuntime!.participants.B.battleModifier).toBe(2);
  });

  test('preserves applied numeric effects from mixed Hand/Reserve Tactics', () => {
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
    returnV070FogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    );
    expect(b.battleModifier).toBe(6);
    expect(b.reserve).toContain(reserveTactic.instanceId);
    expect(state.players.B.zones.hand).toContain(handTactic.instanceId);
  });

  test('returns an applied untracked effect without retroactive cancellation', () => {
    const { state, fog, reserveTactic, handTactic } = fixture();
    applyV070ReversibleBattleNumericEffect(
      state, reserveTactic.instanceId,
      state.cardInstances[reserveTactic.instanceId].cardId,
      'B', 'battleModifier', 1,
    );
    markV070BattleCardEffectApplied(state, reserveTactic.instanceId);
    markV070BattleCardEffectApplied(state, handTactic.instanceId);
    const returned = returnV070FogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    );
    expect(returned).toEqual([reserveTactic.instanceId, handTactic.instanceId]);
    expect(state.battleRuntime!.participants.B.battleModifier).toBe(1);
    expect(state.battleRuntime!.appliedBattleCardEffectInstanceIds)
      .toContain(reserveTactic.instanceId);
    expect(state.battleRuntime!.appliedBattleCardEffectInstanceIds)
      .toContain(handTactic.instanceId);
  });

  test('returns a Tactic with an already-applied effect without erasing history', () => {
    const { state, fog, reserveTactic } = fixture();
    state.battleRuntime!.appliedBattleCardEffectInstanceIds = [
      reserveTactic.instanceId,
    ];
    const returned = returnV070FogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    );
    expect(returned).toContain(reserveTactic.instanceId);
    expect(state.battleRuntime!.appliedBattleCardEffectInstanceIds)
      .toContain(reserveTactic.instanceId);
  });

  test('rejects a missing origin before partially returning mixed-source Tactics', () => {
    const { state, fog } = fixture();
    delete state.battleRuntime!.participants.B.additionalTactics[0].sourceZone;
    const before = structuredClone(state);
    expect(() => returnV070FogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/source zone was not recorded/);
    expect(state).toEqual(before);
  });

  test('the target player resolves a queued post-Tactics choice and cancels pending Tactic effects', () => {
    const { state, fog, reserveTactic, handTactic } = fixture();
    const runtime = state.battleRuntime!;
    runtime.pendingRevealEffectEncounteredAt = 'reveal_tactics';
    runtime.pendingRevealEffectClass = 'ordinary';
    runtime.pendingRevealEffectCommitments = [reserveTactic, handTactic];
    expect(queueV070FogOfWarBattleChoice(state, 'A', fog.instanceId)).toBe(true);
    expect(runtime.pendingFogOfWarBattleRevealChoice).toMatchObject({
      kind: 'fog_of_war', opponent: 'B',
    });
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_fog_of_war_battle',
      playerId: 'A', choice: 'all_tactics',
    })).toThrow(/opponent/);
    const next = reduceV070BattleAction(state, {
      type: 'resolve_fog_of_war_battle',
      playerId: 'B', choice: 'all_tactics',
    });
    expect(next.players.B.zones.hand).toContain(handTactic.instanceId);
    expect(next.battleRuntime!.participants.B.reserve).toContain(reserveTactic.instanceId);
    expect(next.battleRuntime!.participants.B.battleModifier).toBe(0);
    expect(next.battleRuntime!.pendingRevealEffectEncounteredAt).toBeNull();
    expect(next.battleRuntime!.pendingFogOfWarBattleRevealChoice).toBeNull();
  });

  test('a queued source return preserves prior Gambit effects while later Tactics resolve', () => {
    const { state, fog, extraGambit, reserveTactic } = fixture();
    const runtime = state.battleRuntime!;
    applyV070ReversibleBattleNumericEffect(
      state, extraGambit.instanceId,
      state.cardInstances[extraGambit.instanceId].cardId,
      'B', 'battleModifier', 1,
    );
    markV070BattleCardEffectApplied(state, extraGambit.instanceId);
    runtime.pendingRevealEffectEncounteredAt = 'reveal_tactics';
    runtime.pendingRevealEffectClass = 'ordinary';
    runtime.pendingRevealEffectCommitments = [reserveTactic];
    expect(queueV070FogOfWarBattleChoice(state, 'A', fog.instanceId)).toBe(true);
    const next = reduceV070BattleAction(state, {
      type: 'resolve_fog_of_war_battle',
      playerId: 'B', choice: 'one_gambit',
      targetInstanceId: extraGambit.instanceId,
    });
    expect(next.players.B.zones.hand).toContain(extraGambit.instanceId);
    expect(next.battleRuntime!.participants.B.battleModifier).toBe(2);
    expect(next.battleRuntime!.pendingRevealEffectEncounteredAt).toBeNull();
  });

  test('the opponent must have both roles; invalid choices keep the pending state', () => {
    const { state, fog } = fixture();
    const runtime = state.battleRuntime!;
    expect(queueV070FogOfWarBattleChoice(state, 'A', fog.instanceId)).toBe(true);
    const before = structuredClone(state);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_fog_of_war_battle',
      playerId: 'B', choice: 'one_gambit', targetInstanceId: 'not-in-battle',
    })).toThrow(/Gambit/);
    expect(state).toEqual(before);
    runtime.participants.B.tactic = null;
    runtime.participants.B.additionalTactics = [];
    runtime.pendingFogOfWarBattleRevealChoice = null;
    runtime.fogOfWarBattleRevealChoiceOpen = false;
    expect(queueV070FogOfWarBattleChoice(state, 'A', fog.instanceId)).toBe(false);
  });

  test('rejects an unresolved reveal queue before it can replay a returned effect', () => {
    const { state, fog, handTactic } = fixture();
    state.battleRuntime!.pendingRevealEffectEncounteredAt = 'reveal_tactics';
    state.battleRuntime!.pendingRevealEffectCommitments = [handTactic];
    const before = structuredClone(state);
    expect(() => returnV070FogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/Resolve pending battle-card reveal effects/);
    expect(state).toEqual(before);
  });

  test('rejects returns after dice have already been submitted', () => {
    const { state, fog, reserveTactic } = fixture();
    state.battleRuntime!.participants.B.battleDice = [4];
    state.battleRuntime!.participants.B.selectedBattleDie = 4;
    const before = structuredClone(state);
    expect(() => returnV070FogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/before either player rolls battle dice/);
    expect(state).toEqual(before);
    expect(state.battleRuntime!.participants.B.tactic?.instanceId)
      .toBe(reserveTactic.instanceId);
  });

  test('rejects ineligible opponents and incorrect source cards', () => {
    const { state, fog } = fixture();
    const before = structuredClone(state);
    expect(() => returnV070FogOfWarBattleCards(
      state, 'B', fog.instanceId, { choice: 'all_tactics' },
    )).toThrow(/own committed battle card/);
    expect(state).toEqual(before);
    state.battleRuntime!.participants.B.tactic = null;
    state.battleRuntime!.participants.B.additionalTactics = [];
    expect(() => returnV070FogOfWarBattleCards(
      state, 'A', fog.instanceId, { choice: 'one_gambit', targetInstanceId: 'none' },
    )).toThrow(/Gambit and a Tactic/);
  });
});
