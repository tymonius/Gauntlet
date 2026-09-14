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
  V070_COURT_MARTIAL_BATTLE_TEXT,
  V070_COURT_MARTIAL_ID,
} from './court-martial-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'court-martial-test',
    seed: 'court-martial-seed',
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

function injectCourtMartial(state: V070GameState): string {
  const instanceId = 'court-martial-A-source';
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: V070_COURT_MARTIAL_ID,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

function revealCourtMartial(): {
  state: V070GameState;
  sourceInstanceId: string;
} {
  let state = startBattle();
  const sourceInstanceId = injectCourtMartial(state);

  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: sourceInstanceId,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });

  return { state, sourceInstanceId };
}

function proceedToOutcome(state: V070GameState): V070GameState {
  let next = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  next = reduceV070BattleAction(next, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  return reduceV070BattleAction(next, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

describe('v0.7.0 Court Martial battle effect', () => {
  test('binds to released authority and advertises the Gambit/Tactic effect as supported', () => {
    const card = v070CanonicalContent.cardsById.get(V070_COURT_MARTIAL_ID);
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_COURT_MARTIAL_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_COURT_MARTIAL_ID)?.expectedText)
      .toBe(V070_COURT_MARTIAL_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_COURT_MARTIAL_ID);
  });

  test('gives the opponent Disadvantage and registers one conditional additional retreat', () => {
    const { state, sourceInstanceId } = revealCourtMartial();

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.B.disadvantage).toBe(1);
    expect(state.battleRuntime?.additionalRetreatEffects).toContainEqual({
      sourceInstanceId,
      sourceCardId: V070_COURT_MARTIAL_ID,
      targetPlayer: 'B',
      steps: 1,
    });
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
  });

  test('retreats the opponent one additional Position after their normal retreat when they lose', () => {
    let { state, sourceInstanceId } = revealCourtMartial();
    state = proceedToOutcome(state);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1, 1],
    });

    expect(state.battle?.winner).toBe('A');
    expect(state.battle?.loser).toBe('B');
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_aftermath_retreat',
      actor: 'B',
      payload: expect.objectContaining({
        sourceInstanceId,
        sourceCardId: V070_COURT_MARTIAL_ID,
        loser: 'B',
        additionalRetreat: 1,
      }),
    }));
  });

  test('does not apply the additional retreat when the opponent wins', () => {
    let { state, sourceInstanceId } = revealCourtMartial();
    state = proceedToOutcome(state);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6, 6],
    });

    expect(state.battle?.winner).toBe('B');
    expect(state.events.some(event =>
      event.type === 'battle_card_aftermath_retreat'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId ===
        sourceInstanceId
    )).toBe(false);
  });
});
