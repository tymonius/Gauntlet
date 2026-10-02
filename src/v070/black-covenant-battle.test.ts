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
  V070_BLACK_COVENANT_BATTLE_TEXT,
  V070_BLACK_COVENANT_ID,
} from './black-covenant-battle';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';

function startBattle(mystic = false): V070GameState {
  let state = createV070StarterGame({
    gameId: 'black-covenant',
    seed: 'black-covenant-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: mystic
          ? 'mystics-alchemist-first-principles'
          : 'military-general-forward-doctrine',
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
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
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

function injectHand(
  state: V070GameState,
  cardId: string,
  suffix: string,
): string {
  const instanceId = `black-covenant-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

function setBlackCovenantAsTactic(
  state: V070GameState,
): string {
  const source = state.battleRuntime!.participants.A.reserve[0];
  state.cardInstances[source].cardId = V070_BLACK_COVENANT_ID;
  return source;
}

function revealBlackCovenant(
  state: V070GameState,
  source: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: source,
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

describe('Black Covenant battle effect', () => {
  test('binds exact unchanged frozen/current authority', () => {
    for (const card of [
      v070CanonicalContent.cardsById.get(V070_BLACK_COVENANT_ID),
      currentCanonicalContent.cardsById.get(V070_BLACK_COVENANT_ID),
    ]) {
      expect(card?.trait).toBe('Arcane');
      expect(
        card?.effects.find(effect => effect.label === 'Tactic')?.text,
      ).toBe(V070_BLACK_COVENANT_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(V070_BLACK_COVENANT_ID)?.expectedText)
      .toBe(V070_BLACK_COVENANT_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_BLACK_COVENANT_ID);
  });

  test('gains Advantage and offers one face-up additional Tactic from Hand', () => {
    let state = startBattle();
    const extra = injectHand(
      state,
      'neutral-rallying-cry',
      'extra',
    );
    const source = setBlackCovenantAsTactic(state);

    state = revealBlackCovenant(state, source);

    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
    expect(
      state.battleRuntime?.pendingLateAdditionalTacticBattleRevealChoice,
    ).toEqual(expect.objectContaining({
      kind: 'late_additional_tactic',
      owner: 'A',
      sourceInstanceId: source,
      sourceCardId: V070_BLACK_COVENANT_ID,
      candidateInstanceIds: expect.arrayContaining([extra]),
      candidateZone: 'hand',
      chosenDestination: 'graveyard',
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_late_additional_tactic',
      playerId: 'A',
      cardInstanceId: extra,
    });

    expect(state.players.A.zones.hand).not.toContain(extra);
    expect(state.battleRuntime?.participants.A.additionalTactics)
      .toContainEqual(expect.objectContaining({
        instanceId: extra,
        owner: 'A',
        role: 'tactic',
        faceUp: true,
      }));
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.battleCardAftermathDestinationOverrides)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          sourceCardId: V070_BLACK_COVENANT_ID,
          playerId: 'A',
          instanceId: source,
          destination: 'graveyard',
        }),
        expect.objectContaining({
          sourceCardId: V070_BLACK_COVENANT_ID,
          playerId: 'A',
          instanceId: extra,
          destination: 'graveyard',
        }),
      ]));
    expect(state.battleRuntime?.stage).toBe('outcome');
  });

  test('both Covenant and its chosen Hand Tactic go to Graveyard in the Aftermath', () => {
    let state = startBattle();
    const extra = injectHand(
      state,
      'neutral-rallying-cry',
      'cleanup-extra',
    );
    const source = setBlackCovenantAsTactic(state);

    state = revealBlackCovenant(state, source);
    state = reduceV070BattleAction(state, {
      type: 'resolve_late_additional_tactic',
      playerId: 'A',
      cardInstanceId: extra,
    });

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6, 5],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.graveyard)
      .toEqual(expect.arrayContaining([source, extra]));
    expect(state.players.A.zones.discardPile).not.toContain(source);
    expect(state.players.A.zones.discardPile).not.toContain(extra);
  });

  test('does not open Mystic Invocation until the additional-Tactic decision completes', () => {
    let state = startBattle(true);
    const mystics = state.players.A.mystics!;
    mystics.rites.echoes.status = 'completed';
    mystics.rites.echoes.completedTurn = Math.max(
      0,
      state.turnNumber - 1,
    );
    const graveyardCandidate = 'black-covenant-invocation-graveyard';
    state.cardInstances[graveyardCandidate] = {
      instanceId: graveyardCandidate,
      cardId: 'neutral-rallying-cry',
      owner: 'A',
    };
    state.players.A.zones.graveyard.push(graveyardCandidate);

    injectHand(
      state,
      'neutral-rallying-cry',
      'invocation-extra',
    );
    const source = setBlackCovenantAsTactic(state);
    state = revealBlackCovenant(state, source);

    expect(state.players.A.mystics?.invocationPending).toBeNull();
    expect(
      state.battleRuntime?.pendingLateAdditionalTacticBattleRevealChoice,
    ).not.toBeNull();

    state = reduceV070BattleAction(state, {
      type: 'resolve_late_additional_tactic',
      playerId: 'A',
    });

    expect(state.players.A.mystics?.invocationPending)
      .toEqual(expect.objectContaining({
        sourceInstanceId: source,
        sourceCardId: V070_BLACK_COVENANT_ID,
        duringBattle: true,
      }));
  });

  test('declining the additional Tactic leaves the Hand card in place but still graveyards Black Covenant', () => {
    let state = startBattle();
    const extra = injectHand(
      state,
      'neutral-rallying-cry',
      'decline-extra',
    );
    const source = setBlackCovenantAsTactic(state);

    state = revealBlackCovenant(state, source);
    state = reduceV070BattleAction(state, {
      type: 'resolve_late_additional_tactic',
      playerId: 'A',
    });

    expect(state.players.A.zones.hand).toContain(extra);
    expect(state.battleRuntime?.participants.A.additionalTactics)
      .toHaveLength(0);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6, 5],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.players.A.zones.hand).toContain(extra);
  });
});
