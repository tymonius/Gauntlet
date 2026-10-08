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
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import {
  V070_RESERVE_FORCE_BATTLE_TEXT,
  V070_RESERVE_FORCE_ID,
} from './reserve-force-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'reserve-force-battle',
    seed: 'reserve-force-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-general-forward-doctrine',
      },
      B: {
        name: 'Bravo',
        starterDeckId: 'military-commandant-holdfast',
      },
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
    type: 'roll_first_player',
    playerId: 'A',
    value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
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
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

function injectHand(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `reserve-force-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function setAndRevealGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aGambit,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function chooseAndRevealTactics(
  state: V070GameState,
  aTactic?: string,
  bTactic?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: aTactic,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
    cardInstanceId: bTactic,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

function resolveBattleAndAftermath(
  state: V070GameState,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [6],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [1],
  });
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: 'A',
  });
}

describe('Reserve Force battle effect', () => {
  test('binds exact unchanged frozen/current authority and registers the surface', () => {
    expect(V070_RESERVE_FORCE_BATTLE_TEXT).toBe(
      'After Tactics are revealed, you may replace this card with up to two eligible cards from your Hand, face up. If replaced, put this card in your Graveyard; otherwise discard it in the Aftermath.',
    );
    for (const content of [v070CanonicalContent, currentCanonicalContent]) {
      expect(content.cardsById.get(V070_RESERVE_FORCE_ID)
        ?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_RESERVE_FORCE_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(V070_RESERVE_FORCE_ID)?.expectedText)
      .toBe(V070_RESERVE_FORCE_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_RESERVE_FORCE_ID);
  });

  test('a Gambit waits until after Tactics and uses the shared timing-aware Hand eligibility', () => {
    let state = startBattle();
    const source = injectHand(
      state,
      'A',
      V070_RESERVE_FORCE_ID,
      'deferred-gambit',
    );
    const usable = injectHand(
      state,
      'A',
      'neutral-rallying-cry',
      'usable',
    );
    const tooLate = injectHand(
      state,
      'A',
      'intelligence-disinformation',
      'too-late',
    );

    state = setAndRevealGambits(state, source);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.deferredReserveForceGambitCommitments)
      .toEqual([
        expect.objectContaining({
          instanceId: source,
          owner: 'A',
          role: 'gambit',
        }),
      ]);

    state = chooseAndRevealTactics(state);
    const pending = pendingV070BattleRevealChoice(state);
    expect(pending).toEqual(expect.objectContaining({
      kind: 'reserve_force',
      owner: 'A',
      sourceInstanceId: source,
      role: 'gambit',
    }));
    const candidates =
      (pending as { candidateInstanceIds: string[] }).candidateInstanceIds;
    expect(candidates).toContain(usable);
    expect(candidates).not.toContain(tooLate);
  });

  test('choosing no replacements leaves the card in battle and discards even a Gambit in the Aftermath', () => {
    let state = startBattle();
    const source = injectHand(
      state,
      'A',
      V070_RESERVE_FORCE_ID,
      'no-replacement',
    );
    state = setAndRevealGambits(state, source);
    state = chooseAndRevealTactics(state);

    state = reduceV070BattleAction(state, {
      type: 'resolve_reserve_force_battle',
      playerId: 'A',
      cardInstanceIds: [],
    });

    expect(state.battleRuntime?.participants.A.gambit?.instanceId)
      .toBe(source);
    expect(state.players.A.zones.graveyard).not.toContain(source);

    state = resolveBattleAndAftermath(state);
    expect(state.players.A.zones.discardPile).toContain(source);
    expect(state.players.A.zones.graveyard).not.toContain(source);
  });

  test('a Tactic can become two face-up Hand Tactics and both replacement effects resolve', () => {
    let state = setAndRevealGambits(startBattle());
    const source = state.battleRuntime!.participants.A.reserve[0]!;
    state.cardInstances[source].cardId = V070_RESERVE_FORCE_ID;

    const first = injectHand(
      state,
      'A',
      'neutral-rallying-cry',
      'first',
    );
    const second = injectHand(
      state,
      'A',
      'neutral-new-recruits',
      'second',
    );

    state = chooseAndRevealTactics(state, source);
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'reserve_force',
        sourceInstanceId: source,
        role: 'tactic',
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_reserve_force_battle',
      playerId: 'A',
      cardInstanceIds: [first, second],
    });

    const participant = state.battleRuntime!.participants.A;
    expect(participant.tactic?.instanceId).toBe(first);
    expect(participant.tactic?.faceUp).toBe(true);
    expect(participant.additionalTactics).toContainEqual(
      expect.objectContaining({
        instanceId: second,
        owner: 'A',
        role: 'tactic',
        faceUp: true,
      }),
    );
    expect(state.players.A.zones.hand).not.toContain(first);
    expect(state.players.A.zones.hand).not.toContain(second);
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(participant.battleModifier).toBe(2);
    expect(
      state.battleRuntime?.pendingReserveForceReplacementCommitments,
    ).toEqual([]);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();

    state = resolveBattleAndAftermath(state);
    expect(state.players.A.zones.discardPile).toContain(first);
    expect(state.players.A.zones.discardPile).toContain(second);
  });

  test('a nested replacement choice pauses the second replacement and resumes it first', () => {
    let state = setAndRevealGambits(startBattle());
    const source = state.battleRuntime!.participants.A.reserve[0]!;
    state.cardInstances[source].cardId = V070_RESERVE_FORCE_ID;

    const first = injectHand(
      state,
      'A',
      'inquisition-divine-mercy',
      'nested-first',
    );
    const second = injectHand(
      state,
      'A',
      'neutral-rallying-cry',
      'nested-second',
    );
    const mercyTarget =
      'reserve-force-B-divine-mercy-target';
    state.cardInstances[mercyTarget] = {
      instanceId: mercyTarget,
      cardId: 'neutral-new-recruits',
      owner: 'B',
    };
    state.players.B.zones.graveyard.push(mercyTarget);

    state = chooseAndRevealTactics(state, source);
    state = reduceV070BattleAction(state, {
      type: 'resolve_reserve_force_battle',
      playerId: 'A',
      cardInstanceIds: [first, second],
    });

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'divine_mercy',
        owner: 'A',
        sourceInstanceId: first,
      }),
    );
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(
      state.battleRuntime?.pendingReserveForceReplacementCommitments,
    ).toEqual([
      expect.objectContaining({ instanceId: second }),
    ]);

    state = reduceV070BattleAction(state, {
      type: 'resolve_divine_mercy_battle',
      playerId: 'A',
      targetInstanceId: mercyTarget,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(
      state.battleRuntime?.pendingReserveForceReplacementCommitments,
    ).toEqual([]);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(3);
    expect(state.players.B.zones.discardPile).toContain(mercyTarget);

    const secondApplied = state.events.find(event =>
      event.type === 'battle_card_effect_applied'
      && (event.payload as { instanceId?: string } | undefined)
        ?.instanceId === second
    );
    expect(secondApplied).toBeDefined();
  });

  test('rejects more than two replacements and duplicate physical cards', () => {
    let state = startBattle();
    const source = injectHand(
      state,
      'A',
      V070_RESERVE_FORCE_ID,
      'limit',
    );
    const first = injectHand(state, 'A', 'neutral-rallying-cry', 'limit-1');
    const second = injectHand(state, 'A', 'neutral-new-recruits', 'limit-2');
    const third = injectHand(state, 'A', 'neutral-rallying-cry', 'limit-3');
    state = setAndRevealGambits(state, source);
    state = chooseAndRevealTactics(state);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_reserve_force_battle',
      playerId: 'A',
      cardInstanceIds: [first, second, third],
    })).toThrow(/up to two/i);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_reserve_force_battle',
      playerId: 'A',
      cardInstanceIds: [first, first],
    })).toThrow(/different replacement/i);
  });
});
