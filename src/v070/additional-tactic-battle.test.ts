import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_INVASION_BATTLE_TEXT,
  V070_INVASION_ID,
  V070_LIBERATION_BATTLE_TEXT,
  V070_LIBERATION_ID,
  V070_REINFORCEMENTS_BATTLE_TEXT,
  V070_REINFORCEMENTS_ID,
} from './additional-tactic-battle';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';

function startBattle(
  contestedController: 'A' | 'B' = 'B',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'additional-tactics',
    seed: `additional-tactics-${contestedController}`,
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
  state.board[3].controller = contestedController;

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
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });

  expect(state.battle?.attacker).toBe('A');
  expect(state.battle?.defender).toBe('B');
  expect(state.battle?.defenderControlsContested)
    .toBe(contestedController === 'B');
  return state;
}

function injectHand(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `additional-tactic-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
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

function makeReserveEligible(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId = 'neutral-rallying-cry',
): string[] {
  const reserve = state.battleRuntime!.participants[playerId].reserve;
  for (const instanceId of reserve) {
    state.cardInstances[instanceId].cardId = cardId;
  }
  return [...reserve];
}

function revealNormalTactics(
  state: V070GameState,
  aTactic?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: aTactic,
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

describe('current v0.7.2 Reserve and additional-Tactic battle grants', () => {
  test('binds Invasion, Liberation, and Reinforcements to unchanged frozen/current authority', () => {
    expect(V070_INVASION_ID).toBe('military-invasion');
    expect(V070_INVASION_BATTLE_TEXT)
      .toBe('Attacker — +1 Reserve, +1 Tactic.');
    expect(V070_LIBERATION_ID).toBe('neutral-liberation');
    expect(V070_LIBERATION_BATTLE_TEXT)
      .toBe('Counterattack — +1 Reserve, +1 Tactic.');
    expect(V070_REINFORCEMENTS_ID).toBe('neutral-reinforcements');
    expect(V070_REINFORCEMENTS_BATTLE_TEXT).toBe(
      'After Tactics are revealed: +1 Reserve; +1 Tactic using that card.',
    );

    for (const [cardId, text] of [
      [V070_INVASION_ID, V070_INVASION_BATTLE_TEXT],
      [V070_LIBERATION_ID, V070_LIBERATION_BATTLE_TEXT],
      [V070_REINFORCEMENTS_ID, V070_REINFORCEMENTS_BATTLE_TEXT],
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

  test('Invasion as an attacker Gambit adds Reserve and a normal face-down Tactic choice', () => {
    let state = startBattle('B');
    const invasion = injectHand(
      state,
      'A',
      V070_INVASION_ID,
      'invasion-gambit',
    );
    state = revealGambits(state, invasion);

    const participant = state.battleRuntime!.participants.A;
    expect(participant.tacticLimit).toBe(2);
    expect(participant.reserve.length).toBe(
      v070CanonicalContent.content.battle.normal_reserve_size + 1,
    );

    makeReserveEligible(state, 'A');
    const [first, second] = participant.reserve;
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: first,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: second,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });

    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
    expect(state.battleRuntime?.participants.A.tactic?.faceUp).toBe(false);
    expect(state.battleRuntime?.participants.A.additionalTactics)
      .toContainEqual(expect.objectContaining({
        instanceId: second,
        faceUp: false,
      }));
  });

  test('Invasion used as a Tactic grants an optional face-up additional Tactic from Reserve', () => {
    let state = startBattle('B');
    state = revealGambits(state);
    makeReserveEligible(state, 'A');
    const invasion =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[invasion].cardId = V070_INVASION_ID;

    state = revealNormalTactics(state, invasion);

    const pending =
      state.battleRuntime?.pendingLateAdditionalTacticBattleRevealChoice;
    expect(pending).toEqual(expect.objectContaining({
      kind: 'late_additional_tactic',
      owner: 'A',
      sourceInstanceId: invasion,
      sourceCardId: V070_INVASION_ID,
    }));
    expect(pending?.candidateInstanceIds.length).toBeGreaterThan(0);

    const target = pending!.candidateInstanceIds[0];
    state = reduceV070BattleAction(state, {
      type: 'resolve_late_additional_tactic',
      playerId: 'A',
      cardInstanceId: target,
    });

    expect(state.battleRuntime?.participants.A.additionalTactics)
      .toContainEqual(expect.objectContaining({
        instanceId: target,
        faceUp: true,
      }));
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'tactic_revealed',
      actor: 'A',
      payload: expect.objectContaining({
        instanceId: target,
        lateAdditionalTactic: true,
      }),
    }));
  });

  test('Liberation grants its bonus only in a real Counterattack', () => {
    let counterattack = startBattle('A');
    const liberation = injectHand(
      counterattack,
      'A',
      V070_LIBERATION_ID,
      'counterattack',
    );
    counterattack = revealGambits(counterattack, liberation);
    expect(counterattack.battleRuntime?.participants.A.tacticLimit).toBe(2);

    let ordinaryAttack = startBattle('B');
    const inactive = injectHand(
      ordinaryAttack,
      'A',
      V070_LIBERATION_ID,
      'ordinary',
    );
    ordinaryAttack = revealGambits(ordinaryAttack, inactive);
    expect(ordinaryAttack.battleRuntime?.participants.A.tacticLimit).toBe(1);
    expect(ordinaryAttack.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_condition_not_met',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: inactive,
        sourceCardId: V070_LIBERATION_ID,
      }),
    }));
  });

  test('Reinforcements Gambit waits until Tactics reveal and its late Tactic must use the card it drew', () => {
    let state = startBattle('B');
    const reinforcements = injectHand(
      state,
      'A',
      V070_REINFORCEMENTS_ID,
      'reinforcements-gambit',
    );
    state = revealGambits(state, reinforcements);
    makeReserveEligible(state, 'A');

    const reserveBefore = [
      ...state.battleRuntime!.participants.A.reserve,
    ];
    expect(
      state.battleRuntime
        ?.pendingLateAdditionalTacticBattleRevealChoice,
    ).toBeFalsy();

    // Make every possible next draw Tactic-eligible while preserving identity.
    for (const instanceId of state.players.A.zones.drawPile) {
      state.cardInstances[instanceId].cardId = 'neutral-rallying-cry';
    }

    state = revealNormalTactics(state);

    const pending =
      state.battleRuntime?.pendingLateAdditionalTacticBattleRevealChoice;
    expect(pending).toEqual(expect.objectContaining({
      owner: 'A',
      sourceInstanceId: reinforcements,
      sourceCardId: V070_REINFORCEMENTS_ID,
    }));
    expect(pending?.candidateInstanceIds).toHaveLength(1);
    const [drawn] = pending!.candidateInstanceIds;
    expect(reserveBefore).not.toContain(drawn);
    expect(state.battleRuntime?.participants.A.reserve).toContain(drawn);

    if (reserveBefore.length > 0) {
      expect(pending?.candidateInstanceIds)
        .not.toContain(reserveBefore[0]);
    }
  });

  test('a late Reinforcements can chain into another late grant without reopening normal Tactics', () => {
    let state = startBattle('B');
    state = revealGambits(state);
    const reserve = makeReserveEligible(state, 'A');
    const reinforcements = reserve[0];
    state.cardInstances[reinforcements].cardId =
      V070_REINFORCEMENTS_ID;

    for (const instanceId of state.players.A.zones.drawPile) {
      state.cardInstances[instanceId].cardId = V070_INVASION_ID;
    }

    state = revealNormalTactics(state, reinforcements);
    const first =
      state.battleRuntime?.pendingLateAdditionalTacticBattleRevealChoice;
    expect(first?.sourceCardId).toBe(V070_REINFORCEMENTS_ID);
    expect(first?.candidateInstanceIds).toHaveLength(1);
    const invasion = first!.candidateInstanceIds[0];

    state = reduceV070BattleAction(state, {
      type: 'resolve_late_additional_tactic',
      playerId: 'A',
      cardInstanceId: invasion,
    });

    const second =
      state.battleRuntime?.pendingLateAdditionalTacticBattleRevealChoice;
    expect(second).toEqual(expect.objectContaining({
      owner: 'A',
      sourceInstanceId: invasion,
      sourceCardId: V070_INVASION_ID,
    }));
    expect(state.battleRuntime?.stage).toBe('outcome');

    state = reduceV070BattleAction(state, {
      type: 'resolve_late_additional_tactic',
      playerId: 'A',
    });
    expect(
      state.battleRuntime?.pendingLateAdditionalTacticBattleRevealChoice,
    ).toBeNull();
  });
});
