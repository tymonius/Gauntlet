import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_REVOLUTION_BATTLE_TEXT,
  V070_REVOLUTION_ID,
} from './post-roll-exchange-cards';
import { V070_VALOR_ID } from './post-roll-reroll-cards';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'post-roll-exchange',
    seed: 'post-roll-exchange-seed',
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
  const instanceId = `post-roll-exchange-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function revealToOutcome(
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
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

describe('current v0.7.2 Revolution battle effect', () => {
  test('binds unchanged frozen/current authority and the both-exchange rule', () => {
    expect(V070_REVOLUTION_ID).toBe('neutral-revolution');
    expect(V070_REVOLUTION_BATTLE_TEXT).toBe(
      "After all rerolls, you may exchange the players' final selected die results. Each player retains their own modifiers.",
    );
    expect(v070CanonicalContent.cardsById.get(V070_REVOLUTION_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_REVOLUTION_BATTLE_TEXT);
    expect(currentCanonicalContent.cardsById.get(V070_REVOLUTION_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_REVOLUTION_BATTLE_TEXT);
    expect(currentCanonicalContent.cardsById.get(V070_REVOLUTION_ID)?.rules_notes)
      .toContain('If both players exchange results, no exchange occurs.');
    expect(v070BattleEffectHandler(V070_REVOLUTION_ID)?.expectedText)
      .toBe(V070_REVOLUTION_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_REVOLUTION_ID);
  });

  test('exchanges final selected dice while each player retains their own modifier', () => {
    let state = startBattle();
    const revolution = injectHand(
      state,
      'A',
      V070_REVOLUTION_ID,
      'single',
    );
    state = revealToOutcome(state, revolution);

    state.battleRuntime!.participants.A.battleModifier = 2;
    state.battleRuntime!.participants.B.battleModifier = -1;

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [2],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [5],
    });

    expect(state.battle?.winner).toBeNull();
    expect(state.battleRuntime?.pendingBattlePostRollExchangeChoice)
      .toEqual({
        playerId: 'A',
        candidateSourceInstanceIds: [revolution],
      });

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_post_roll_exchange',
      playerId: 'A',
      sourceInstanceId: revolution,
    });

    expect(state.battleRuntime?.participants.A.selectedBattleDie).toBe(5);
    expect(state.battleRuntime?.participants.B.selectedBattleDie).toBe(2);
    expect(state.battleRuntime?.participants.A.battleTotal).toBe(7);
    expect(state.battleRuntime?.participants.B.battleTotal).toBe(1);
    expect(state.battle?.winner).toBe('A');
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_selected_dice_exchanged',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: revolution,
        sourceCardId: V070_REVOLUTION_ID,
        attackerModifier: 2,
        defenderModifier: -1,
      }),
    }));
  });

  test('opposing Revolution exchanges alternate under shared timing and cancel when both are used', () => {
    let state = startBattle();
    const aRevolution = injectHand(
      state,
      'A',
      V070_REVOLUTION_ID,
      'both-a',
    );
    const bRevolution = injectHand(
      state,
      'B',
      V070_REVOLUTION_ID,
      'both-b',
    );
    state = revealToOutcome(state, aRevolution, bRevolution);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [2],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [5],
    });

    expect(state.battleRuntime?.pendingBattlePostRollExchangeChoice)
      .toEqual({
        playerId: 'A',
        candidateSourceInstanceIds: [aRevolution],
      });

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_post_roll_exchange',
      playerId: 'A',
      sourceInstanceId: aRevolution,
    });

    expect(state.battle?.winner).toBeNull();
    expect(state.battleRuntime?.participants.A.selectedBattleDie).toBe(5);
    expect(state.battleRuntime?.participants.B.selectedBattleDie).toBe(2);
    expect(state.battleRuntime?.pendingBattlePostRollExchangeChoice)
      .toEqual({
        playerId: 'B',
        candidateSourceInstanceIds: [bRevolution],
      });

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_post_roll_exchange',
      playerId: 'B',
      sourceInstanceId: bRevolution,
    });

    expect(state.battleRuntime?.participants.A.selectedBattleDie).toBe(2);
    expect(state.battleRuntime?.participants.B.selectedBattleDie).toBe(5);
    expect(state.battle?.winner).toBe('B');
    expect(state.events.filter(
      event => event.type === 'battle_selected_dice_exchanged',
    )).toHaveLength(2);
  });

  test('Revolution waits until an available Valor reroll is resolved or declined', () => {
    let state = startBattle();
    const revolution = injectHand(
      state,
      'A',
      V070_REVOLUTION_ID,
      'after-valor',
    );
    const valor = injectHand(
      state,
      'B',
      V070_VALOR_ID,
      'valor-first',
    );
    state = revealToOutcome(state, revolution, valor);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [5],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });

    expect(state.battleRuntime?.pendingBattlePostRollChoice).toEqual({
      playerId: 'B',
      candidateSourceInstanceIds: [valor],
    });
    expect(state.battleRuntime?.pendingBattlePostRollExchangeChoice)
      .toBeNull();

    state = reduceV070BattleAction(state, {
      type: 'pass_battle_post_roll_reroll',
      playerId: 'B',
      sourceInstanceId: valor,
    });

    expect(state.battle?.winner).toBeNull();
    expect(state.battleRuntime?.pendingBattlePostRollExchangeChoice)
      .toEqual({
        playerId: 'A',
        candidateSourceInstanceIds: [revolution],
      });

    state = reduceV070BattleAction(state, {
      type: 'pass_battle_post_roll_exchange',
      playerId: 'A',
      sourceInstanceId: revolution,
    });

    expect(state.battle?.winner).toBe('A');
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_post_roll_exchange_declined',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: revolution,
        sourceCardId: V070_REVOLUTION_ID,
      }),
    }));
  });
});
