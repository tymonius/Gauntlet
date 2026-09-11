import { describe, expect, test } from 'vitest';
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
import {
  V070_WITCHCRAFT_BATTLE_TEXT,
  V070_WITCHCRAFT_ID,
} from './witchcraft-battle';
import {
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import { pendingV070BattleRevealEffectOrderChoice } from './battle-reveal-order';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'witchcraft-battle',
    seed: 'witchcraft-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-commandant-holdfast',
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

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `witchcraft-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function revealSingleGambit(
  cardId: string,
  suffix = 'gambit',
): { state: V070GameState; source: string } {
  let state = startBattle();
  const source = injectCard(state, 'A', cardId, suffix);
  state.players.A.zones.hand.push(source);
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: source,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
  expect(state.battleRuntime?.stage).toBe('choose_tactics');
  return { state, source };
}

function addTacticToReserve(
  state: V070GameState,
  cardId: string,
  suffix: string,
): string {
  const instanceId = injectCard(state, 'A', cardId, suffix);
  state.battleRuntime?.participants.A.reserve.push(instanceId);
  return instanceId;
}

function revealTactics(
  state: V070GameState,
  tacticInstanceId: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: tacticInstanceId,
  });

  while ((state.battleRuntime?.participants.A.tacticChoicesMade ?? 0)
    < (state.battleRuntime?.participants.A.tacticLimit ?? 0)) {
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    });
  }
  while ((state.battleRuntime?.participants.B.tacticChoicesMade ?? 0)
    < (state.battleRuntime?.participants.B.tacticLimit ?? 0)) {
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B',
    });
  }

  return reduceV070BattleAction(state, {
    type: 'reveal_tactics', playerId: 'A',
  });
}

function finishBattle(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'A', values: [6],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'B', values: [1],
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath', playerId: 'A',
  });
}

describe('v0.7.0 Witchcraft battle effect', () => {
  test('binds to released authority and is registered for reveal resolution', () => {
    expect(V070_WITCHCRAFT_BATTLE_TEXT).toBe(
      'After Tactics are revealed, repeat one other Gambit or Tactic effect you control in this battle that can apply now. If none can apply, gain Advantage. In the Aftermath, put this card in your Graveyard.',
    );
    expect(v070CanonicalContent.cardsById.get(V070_WITCHCRAFT_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_WITCHCRAFT_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_WITCHCRAFT_ID)?.expectedText)
      .toBe(V070_WITCHCRAFT_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_WITCHCRAFT_ID);
  });

  test('repeats another controlled effect without moving its physical source and graveyards Witchcraft in the Aftermath', () => {
    let { state, source: target } = revealSingleGambit(
      'neutral-new-recruits',
      'repeat-target',
    );
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);

    const witchcraft = addTacticToReserve(
      state,
      V070_WITCHCRAFT_ID,
      'repeat-source',
    );
    state = revealTactics(state, witchcraft);

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'witchcraft',
        owner: 'A',
        sourceInstanceId: witchcraft,
        candidateInstanceIds: [target],
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_witchcraft_battle',
      playerId: 'B',
      targetInstanceId: target,
    })).toThrow(/controller/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_witchcraft_battle',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.gambit?.instanceId).toBe(target);
    expect(state.battleRuntime?.participants.A.tactic?.instanceId).toBe(witchcraft);
    expect(state.deferredBattleAftermathDestinationEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceInstanceId: witchcraft,
          targetInstanceIds: [witchcraft],
          destination: 'graveyard',
          condition: 'always',
        }),
      ]),
    );
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'witchcraft_battle_effect_repeated',
        actor: 'A',
        payload: expect.objectContaining({
          sourceInstanceId: witchcraft,
          targetInstanceId: target,
          targetCardId: 'neutral-new-recruits',
        }),
      }),
    ]));

    state = finishBattle(state);
    expect(state.players.A.zones.graveyard).toContain(witchcraft);
  });

  test('a Witchcraft set as the Gambit waits until after Tactics are revealed', () => {
    let { state, source: witchcraft } = revealSingleGambit(
      V070_WITCHCRAFT_ID,
      'deferred-source',
    );

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.deferredWitchcraftGambitCommitments)
      .toEqual([expect.objectContaining({ instanceId: witchcraft, role: 'gambit' })]);
    expect(state.deferredBattleAftermathDestinationEffects ?? [])
      .not.toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceInstanceId: witchcraft }),
      ]));
    expect(state.events.some(event =>
      event.type === 'witchcraft_battle_fallback_advantage'
    )).toBe(false);

    const target = addTacticToReserve(
      state,
      'neutral-new-recruits',
      'deferred-target',
    );
    state = revealTactics(state, target);

    const order = pendingV070BattleRevealEffectOrderChoice(state);
    expect(order?.playerId).toBe('A');
    expect(order?.candidateInstanceIds).toEqual(
      expect.arrayContaining([witchcraft, target]),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_reveal_effect_order',
      playerId: 'A',
      sourceInstanceId: target,
    });
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'witchcraft',
        sourceInstanceId: witchcraft,
        candidateInstanceIds: [target],
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_witchcraft_battle',
      playerId: 'A',
      targetInstanceId: target,
    });
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
  });

  test('does not repeat a Gambit-only trigger whose timing already passed', () => {
    let { state } = revealSingleGambit(
      'neutral-conscription',
      'past-trigger',
    );
    const reserveAfterGambit = [
      ...(state.battleRuntime?.participants.A.reserve ?? []),
    ];
    const tacticLimitAfterGambit =
      state.battleRuntime?.participants.A.tacticLimit;

    const witchcraft = addTacticToReserve(
      state,
      V070_WITCHCRAFT_ID,
      'fallback-source',
    );
    state = revealTactics(state, witchcraft);

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
    expect(state.battleRuntime?.participants.A.reserve)
      .toEqual(reserveAfterGambit);
    expect(state.battleRuntime?.participants.A.tacticLimit)
      .toBe(tacticLimitAfterGambit);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'witchcraft_battle_fallback_advantage',
        actor: 'A',
        payload: expect.objectContaining({
          sourceInstanceId: witchcraft,
          advantageGained: 1,
        }),
      }),
    ]));
  });
});
