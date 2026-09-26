import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  cardEligibleForV070BattleRole,
  reduceV070BattleAction,
} from './battle-engine';
import {
  V070_BATTLEFIELD_PROMOTION_BATTLE_TEXT,
  V070_BATTLEFIELD_PROMOTION_ID,
  V070_SECOND_LINE_BATTLE_TEXT,
  V070_SECOND_LINE_ID,
  V070_SALVAGE_BATTLE_TEXT,
  V070_SALVAGE_ID,
} from './aftermath-destination-cards';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'aftermath-destination-cards',
    seed: 'aftermath-destination-cards-seed',
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

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone?: 'hand',
): string {
  const instanceId = `aftermath-destination-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  if (zone) state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function revealGambits(
  state: V070GameState,
  aCard?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aCard,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function revealTactics(
  state: V070GameState,
  aCard?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: aCard,
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

function resolveOutcome(
  state: V070GameState,
  aDie: number,
  bDie: number,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [aDie],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [bDie],
  });
}

describe('current v0.7.2 pre-clear Aftermath destination cards', () => {
  test('binds Battlefield Promotion, Second Line, and Salvage to unchanged frozen/current authority', () => {
    expect(V070_BATTLEFIELD_PROMOTION_ID)
      .toBe('military-battlefield-promotion');
    expect(V070_BATTLEFIELD_PROMOTION_BATTLE_TEXT).toBe(
      'In the Aftermath, if you win, return one other Tactic you chose to your Hand instead of putting it in your Discard Pile.',
    );
    expect(V070_SECOND_LINE_ID).toBe('neutral-reserves');
    expect(V070_SECOND_LINE_BATTLE_TEXT).toBe(
      'In the Aftermath, you may place one card remaining in your Reserve on top of your Draw Pile instead of putting it in your Discard Pile.',
    );
    expect(V070_SALVAGE_ID).toBe('neutral-salvage');
    expect(V070_SALVAGE_BATTLE_TEXT).toBe(
      'In the Aftermath, if you win, you may put one card remaining in your Reserve in your Hand instead of your Discard Pile, then discard one card from your Hand.',
    );

    for (const [cardId, text] of [
      [V070_BATTLEFIELD_PROMOTION_ID, V070_BATTLEFIELD_PROMOTION_BATTLE_TEXT],
      [V070_SECOND_LINE_ID, V070_SECOND_LINE_BATTLE_TEXT],
      [V070_SALVAGE_ID, V070_SALVAGE_BATTLE_TEXT],
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

  test('Battlefield Promotion automatically returns the sole other chosen Tactic after a win', () => {
    let state = startBattle();
    const promotion = inject(
      state,
      'A',
      V070_BATTLEFIELD_PROMOTION_ID,
      'promotion-gambit',
      'hand',
    );
    state = revealGambits(state, promotion);

    const tactic = state.battleRuntime!.participants.A.reserve[0];
    expect(tactic).toBeDefined();
    state.cardInstances[tactic].cardId = 'neutral-rallying-cry';
    expect(cardEligibleForV070BattleRole(
      state.cardInstances[tactic].cardId,
      'tactic',
    )).toBe(true);

    state = revealTactics(state, tactic);
    state = resolveOutcome(state, 6, 1);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.hand).toContain(tactic);
    expect(state.players.A.zones.discardPile).not.toContain(tactic);
    expect(state.players.A.zones.graveyard).toContain(promotion);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_aftermath_destination_selected',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: promotion,
        sourceCardId: V070_BATTLEFIELD_PROMOTION_ID,
        targetInstanceId: tactic,
        destination: 'hand',
      }),
    }));
  });

  test('Battlefield Promotion does nothing on a loss', () => {
    let state = startBattle();
    const promotion = inject(
      state,
      'A',
      V070_BATTLEFIELD_PROMOTION_ID,
      'promotion-loss',
      'hand',
    );
    state = revealGambits(state, promotion);
    const tactic = state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[tactic].cardId = 'neutral-rallying-cry';

    state = revealTactics(state, tactic);
    state = resolveOutcome(state, 1, 6);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.hand).not.toContain(tactic);
    expect(state.players.A.zones.discardPile).toContain(tactic);
    expect(state.players.A.zones.graveyard).toContain(promotion);
  });

  test('Battlefield Promotion cannot return itself when it is the only chosen Tactic', () => {
    let state = startBattle();
    state = revealGambits(state);

    const promotion = inject(
      state,
      'A',
      V070_BATTLEFIELD_PROMOTION_ID,
      'promotion-tactic',
    );
    state.battleRuntime!.participants.A.reserve.unshift(promotion);

    state = revealTactics(state, promotion);
    state = resolveOutcome(state, 6, 1);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.hand).not.toContain(promotion);
    expect(state.players.A.zones.discardPile).toContain(promotion);
    expect(state.battleRuntime).toBeNull();
  });

  test('Second Line may put one remaining Reserve card on top of the Draw Pile', () => {
    let state = startBattle();
    const secondLine = inject(
      state,
      'A',
      V070_SECOND_LINE_ID,
      'second-line-use',
      'hand',
    );
    state = revealGambits(state, secondLine);
    state = revealTactics(state);
    const candidates = [...state.battleRuntime!.participants.A.reserve];
    expect(candidates.length).toBeGreaterThan(0);
    const target = candidates[0];

    state = resolveOutcome(state, 6, 1);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toEqual(expect.objectContaining({
      playerId: 'A',
      candidateSourceInstanceIds: [secondLine],
    }));
    const options = [...state.events].reverse().find(event =>
      event.type === 'battle_aftermath_controlled_effect_choice_options'
      && event.actor === 'A'
    );
    expect(options?.payload).toEqual(expect.objectContaining({
      optionalSourceInstanceIds: [secondLine],
      destinationTargetOptions: [
        expect.objectContaining({
          sourceInstanceId: secondLine,
          targetInstanceIds: candidates,
        }),
      ],
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: secondLine,
      targetInstanceId: target,
    });

    expect(state.players.A.zones.drawPile[0]).toBe(target);
    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.players.A.zones.graveyard).toContain(secondLine);
  });

  test('Second Line may be declined, leaving Reserve cleanup unchanged', () => {
    let state = startBattle();
    const secondLine = inject(
      state,
      'A',
      V070_SECOND_LINE_ID,
      'second-line-pass',
      'hand',
    );
    state = revealGambits(state, secondLine);
    state = revealTactics(state);
    const candidates = [...state.battleRuntime!.participants.A.reserve];

    state = resolveOutcome(state, 6, 1);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'pass_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: secondLine,
    });

    for (const instanceId of candidates) {
      expect(state.players.A.zones.discardPile).toContain(instanceId);
    }
    expect(state.players.A.zones.graveyard).toContain(secondLine);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_aftermath_controlled_effect_declined',
      payload: expect.objectContaining({
        sourceInstanceId: secondLine,
        sourceCardId: V070_SECOND_LINE_ID,
      }),
    }));
  });

  test('Salvage may return one Reserve card to Hand after a win, then requires one Hand discard', () => {
    let state = startBattle();
    const salvage = inject(
      state,
      'A',
      V070_SALVAGE_ID,
      'salvage-use',
      'hand',
    );
    const otherHand = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'salvage-other-hand',
      'hand',
    );

    state = revealGambits(state, salvage);
    state = revealTactics(state);
    const candidates = [...state.battleRuntime!.participants.A.reserve];
    expect(candidates.length).toBeGreaterThan(0);
    const target = candidates[0];

    state = resolveOutcome(state, 6, 1);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toEqual(expect.objectContaining({
      playerId: 'A',
      candidateSourceInstanceIds: [salvage],
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: salvage,
      targetInstanceId: target,
    });

    expect(state.players.A.zones.hand).toContain(target);
    expect(state.players.A.zones.discardPile).not.toContain(target);
    expect(state.players.A.zones.graveyard).toContain(salvage);
    expect(
      state.battleRuntime?.battleCardAftermathHandDiscardRequirements,
    ).toEqual([
      expect.objectContaining({
        owner: 'A',
        sourceInstanceId: salvage,
        sourceCardId: V070_SALVAGE_ID,
        prompted: true,
      }),
    ]);

    const options = [...state.events].reverse().find(event =>
      event.type === 'battle_card_aftermath_hand_discard_options'
      && event.actor === 'A'
    );
    expect(options?.payload).toEqual(expect.objectContaining({
      sourceInstanceId: salvage,
      sourceCardId: V070_SALVAGE_ID,
      candidateInstanceIds: expect.arrayContaining([target, otherHand]),
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_hand_discard',
      playerId: 'A',
      cardInstanceId: otherHand,
    });

    expect(state.players.A.zones.hand).toContain(target);
    expect(state.players.A.zones.hand).not.toContain(otherHand);
    expect(state.players.A.zones.discardPile).toContain(otherHand);
    expect(state.battleRuntime).toBeNull();
  });

  test('Salvage may be declined, and does not trigger after a loss', () => {
    let declined = startBattle();
    const declinedSalvage = inject(
      declined,
      'A',
      V070_SALVAGE_ID,
      'salvage-decline',
      'hand',
    );
    declined = revealGambits(declined, declinedSalvage);
    declined = revealTactics(declined);
    const reserve = [...declined.battleRuntime!.participants.A.reserve];
    declined = resolveOutcome(declined, 6, 1);
    declined = reduceV070BattleAction(declined, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    declined = reduceV070BattleAction(declined, {
      type: 'pass_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: declinedSalvage,
    });

    for (const instanceId of reserve) {
      expect(declined.players.A.zones.discardPile).toContain(instanceId);
    }
    expect(declined.battleRuntime).toBeNull();

    let lost = startBattle();
    const lostSalvage = inject(
      lost,
      'A',
      V070_SALVAGE_ID,
      'salvage-loss',
      'hand',
    );
    lost = revealGambits(lost, lostSalvage);
    lost = revealTactics(lost);
    lost = resolveOutcome(lost, 1, 6);
    lost = reduceV070BattleAction(lost, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(lost.battleRuntime).toBeNull();
    expect(lost.players.A.zones.graveyard).toContain(lostSalvage);
    expect(lost.events.some(event =>
      event.type === 'battle_card_aftermath_hand_discard_pending'
      && event.actor === 'A'
    )).toBe(false);
  });

});
