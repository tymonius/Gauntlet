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
import {
  V070_HELLFIRE_BATTLE_TEXT,
  V070_HELLFIRE_ID,
} from './hellfire-battle';
import {
  gainV070Conviction,
  v070Conviction,
} from './inquisition';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'hellfire-battle',
    seed: 'hellfire-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'inquisition-grand-inquisitor-final-judgment',
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
  const instanceId = `hellfire-${owner}-${suffix}`;
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

describe('Hellfire battle effect', () => {
  test('binds exact unchanged frozen/current authority and registers the surface', () => {
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      expect(content.cardsById.get(V070_HELLFIRE_ID)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_HELLFIRE_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(V070_HELLFIRE_ID)?.expectedText)
      .toBe(V070_HELLFIRE_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_HELLFIRE_ID);
  });

  test('a Hellfire Gambit waits until Tactics reveal, then splits Conviction between Battle Total and a win-gated Aftermath burn', () => {
    let state = startBattle();
    gainV070Conviction(state, 'A', 4, 'Hellfire test setup');
    const source = injectHand(
      state,
      'A',
      V070_HELLFIRE_ID,
      'gambit',
    );

    state = revealGambits(state, source);
    expect(
      state.battleRuntime?.pendingHellfireBattleRevealChoice,
    ).toBeFalsy();

    state = revealTactics(state);
    expect(
      state.battleRuntime?.pendingHellfireBattleRevealChoice,
    ).toEqual({
      kind: 'hellfire',
      owner: 'A',
      sourceInstanceId: source,
      maximumConviction: 4,
    });

    state = reduceV070BattleAction(state, {
      type: 'resolve_hellfire_battle',
      playerId: 'A',
      battleTotalBonus: 2,
      aftermathCardCount: 1,
    });

    expect(v070Conviction(state, 'A')).toBe(1);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(state.battleRuntime?.hellfireAftermathEffects).toEqual([
      {
        owner: 'A',
        sourceInstanceId: source,
        cardCount: 1,
      },
    ]);

    const burnTarget = state.players.B.zones.drawPile[0];
    expect(burnTarget).toBeDefined();

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [2],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    expect(state.battle?.winner).toBe('A');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.B.zones.graveyard).toContain(burnTarget);
    expect(v070Conviction(state, 'A')).toBe(2);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'hellfire_aftermath_resolved',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: source,
        requestedCardCount: 1,
        graveyardedInstanceIds: [burnTarget],
      }),
    }));
  });

  test('Hellfire used as a Tactic can allocate repeated Aftermath loss and gains normal Conviction from the cards lost there', () => {
    let state = startBattle();
    gainV070Conviction(state, 'A', 2, 'Hellfire test setup');
    state = revealGambits(state);

    const hellfire =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[hellfire].cardId = V070_HELLFIRE_ID;

    state = revealTactics(state, hellfire);
    expect(
      state.battleRuntime?.pendingHellfireBattleRevealChoice,
    ).toEqual(expect.objectContaining({
      owner: 'A',
      sourceInstanceId: hellfire,
      maximumConviction: 2,
    }));

    const targets = state.players.B.zones.drawPile.slice(0, 2);
    expect(targets).toHaveLength(2);

    state = reduceV070BattleAction(state, {
      type: 'resolve_hellfire_battle',
      playerId: 'A',
      battleTotalBonus: 0,
      aftermathCardCount: 2,
    });
    expect(v070Conviction(state, 'A')).toBe(0);

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
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.B.zones.graveyard)
      .toEqual(expect.arrayContaining(targets));
    expect(v070Conviction(state, 'A')).toBe(2);
  });

  test('the delayed Hellfire allocation is discarded when its controller loses', () => {
    let state = startBattle();
    gainV070Conviction(state, 'A', 2, 'Hellfire test setup');
    const source = injectHand(
      state,
      'A',
      V070_HELLFIRE_ID,
      'losing-gambit',
    );
    state = revealGambits(state, source);
    state = revealTactics(state);
    state = reduceV070BattleAction(state, {
      type: 'resolve_hellfire_battle',
      playerId: 'A',
      battleTotalBonus: 0,
      aftermathCardCount: 2,
    });

    const drawBefore = [...state.players.B.zones.drawPile];
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });
    expect(state.battle?.winner).toBe('B');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.B.zones.drawPile).toEqual(drawBefore);
    expect(state.events.some(event =>
      event.type === 'hellfire_aftermath_resolved'
      && (event.payload as { sourceInstanceId?: string })
        .sourceInstanceId === source
    )).toBe(false);
  });
});
