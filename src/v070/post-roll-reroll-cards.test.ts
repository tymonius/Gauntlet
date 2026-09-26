import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_FATES_TOLL_BATTLE_TEXT,
  V070_FATES_TOLL_ID,
  V070_VALOR_BATTLE_TEXT,
  V070_VALOR_ID,
} from './post-roll-reroll-cards';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';

function startBattle(options: {
  contestedTerritoryId?: string;
} = {}): V070GameState {
  let state = createV070StarterGame({
    gameId: 'post-roll-rerolls',
    seed: 'post-roll-rerolls-seed',
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
  if (options.contestedTerritoryId) {
    state.board[3].territoryId = options.contestedTerritoryId;
    state.board[3].blank = false;
  }

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
  const instanceId = `post-roll-${owner}-${suffix}`;
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

describe('current v0.7.2 post-roll reroll battle effects', () => {
  test('binds Valor and Fate\'s Toll to unchanged frozen/current battle authority', () => {
    expect(V070_VALOR_ID).toBe('neutral-valor');
    expect(V070_VALOR_BATTLE_TEXT).toBe(
      "After battle dice are rolled, if your battle total is lower than the opponent's, you may reroll your battle die.",
    );
    expect(V070_FATES_TOLL_ID).toBe('mystics-fate-s-toll');
    expect(V070_FATES_TOLL_BATTLE_TEXT).toBe(
      'After you roll, you may put one other card from your Hand in your Graveyard to reroll.',
    );

    for (const [cardId, text] of [
      [V070_VALOR_ID, V070_VALOR_BATTLE_TEXT],
      [V070_FATES_TOLL_ID, V070_FATES_TOLL_BATTLE_TEXT],
    ] as const) {
      expect(v070CanonicalContent.cardsById.get(cardId)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(text);
      expect(currentCanonicalContent.cardsById.get(cardId)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(text);
      expect(v070BattleEffectHandler(cardId)?.expectedText).toBe(text);
      expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(cardId);
    }
  });

  test('Fate\'s Toll opens immediately after its owner rolls and before the opponent may roll', () => {
    let state = startBattle();
    const toll = injectHand(
      state,
      'A',
      V070_FATES_TOLL_ID,
      'fates-toll',
    );
    const cost = injectHand(
      state,
      'A',
      'neutral-rallying-cry',
      'fates-toll-cost',
    );
    state = revealToOutcome(state, toll);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [2],
    });

    expect(state.battleRuntime?.pendingBattlePostRollChoice).toEqual({
      playerId: 'A',
      candidateSourceInstanceIds: [toll],
    });
    expect(() => reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [4],
    })).toThrow(/pending post-roll reroll/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_post_roll_reroll',
      playerId: 'A',
      sourceInstanceId: toll,
      value: 5,
      costInstanceId: cost,
    });

    expect(state.players.A.zones.hand).not.toContain(cost);
    expect(state.players.A.zones.graveyard).toContain(cost);
    expect(state.battleRuntime?.participants.A.selectedBattleDie).toBe(5);
    expect(state.battleRuntime?.participants.A.battleTotal).toBe(5);
    expect(state.battleRuntime?.pendingBattlePostRollChoice).toBeNull();

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [4],
    });

    expect(state.battle?.winner).toBe('A');
    expect(state.battleRuntime?.stage).toBe('aftermath');
  });

  test('Valor opens only after both battle totals exist and can reverse the result', () => {
    let state = startBattle();
    const valor = injectHand(
      state,
      'A',
      V070_VALOR_ID,
      'valor',
    );
    state = revealToOutcome(state, valor);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    expect(state.battleRuntime?.pendingBattlePostRollChoice).toBeNull();
    expect(state.battle?.winner).toBeNull();

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [5],
    });

    expect(state.battleRuntime?.pendingBattlePostRollChoice).toEqual({
      playerId: 'A',
      candidateSourceInstanceIds: [valor],
    });

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_post_roll_reroll',
      playerId: 'A',
      sourceInstanceId: valor,
      value: 6,
    });

    expect(state.battle?.winner).toBe('A');
    expect(state.battleRuntime?.participants.A.selectedBattleDie).toBe(6);
    expect(state.battleRuntime?.participants.A.battleTotal).toBe(6);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_die_rerolled',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: valor,
        sourceCardId: V070_VALOR_ID,
        previousSelected: 1,
        rerolledSelected: 6,
        battleTotal: 6,
      }),
    }));
  });

  test('Valor is unavailable when its owner is not behind', () => {
    let state = startBattle();
    const valor = injectHand(
      state,
      'A',
      V070_VALOR_ID,
      'valor-ahead',
    );
    state = revealToOutcome(state, valor);

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

    expect(state.battle?.winner).toBe('A');
    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_post_roll_reroll_unavailable',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: valor,
        sourceCardId: V070_VALOR_ID,
        timing: 'after_battle_dice',
      }),
    }));
  });

  test('Monastery suppresses Fate\'s Toll before it can open an after-roll window', () => {
    let state = startBattle({
      contestedTerritoryId: 'territory-monastery',
    });
    const toll = injectHand(
      state,
      'A',
      V070_FATES_TOLL_ID,
      'monastery-toll',
    );
    injectHand(
      state,
      'A',
      'neutral-rallying-cry',
      'monastery-cost',
    );
    state = revealToOutcome(state, toll);

    expect(state.battleRuntime?.battleCardPostRollRerolls).toEqual([]);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [2],
    });
    expect(state.battleRuntime?.pendingBattlePostRollChoice).toBeNull();

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [4],
    });

    expect(state.battle?.winner).toBe('B');
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_effect_suppressed',
      actor: 'A',
      payload: expect.objectContaining({
        instanceId: toll,
        cardId: V070_FATES_TOLL_ID,
        reason: 'Monastery',
      }),
    }));
  });
});
