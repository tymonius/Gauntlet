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
  V070_CAPITAL_GAINS_BATTLE_TEXT,
  V070_CAPITAL_GAINS_ID,
} from './capital-gains-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'capital-gains-battle',
    seed: 'capital-gains-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'financiers-banker-sound-investment',
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

function injectCapitalGains(state: V070GameState): string {
  const instanceId = 'capital-gains-A-source';
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: V070_CAPITAL_GAINS_ID,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

function revealCapitalGains(
  state: V070GameState,
  source: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: source,
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

function finishBattle(
  state: V070GameState,
  winner: 'A' | 'B',
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [winner === 'A' ? 6 : 1],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [winner === 'B' ? 6 : 1],
  });
}

function finishControlBattleWithAWin(): V070GameState {
  let state = startBattle();
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
  return finishBattle(state, 'A');
}

describe('v0.7.0 Capital Gains battle effect', () => {
  test('binds to released authority and advertises its Gambit/Tactic effect as supported', () => {
    const card = v070CanonicalContent.cardsById.get(V070_CAPITAL_GAINS_ID);
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_CAPITAL_GAINS_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_CAPITAL_GAINS_ID)?.expectedText)
      .toBe(V070_CAPITAL_GAINS_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_CAPITAL_GAINS_ID);
  });

  test('immediately gives the opponent one Disadvantage and registers the conditional extra retreat', () => {
    let state = startBattle();
    const source = injectCapitalGains(state);
    state = revealCapitalGains(state, source);

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.B.disadvantage).toBe(1);
    expect(state.battleRuntime?.additionalRetreatEffects).toEqual(
      expect.arrayContaining([
        {
          sourceInstanceId: source,
          sourceCardId: V070_CAPITAL_GAINS_ID,
          targetPlayer: 'B',
          steps: 1,
        },
      ]),
    );
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
  });

  test('moves the opponent one additional Position after their normal retreat when they lose', () => {
    const control = finishControlBattleWithAWin();
    const normalRetreatPosition = control.battle!.positions.B;

    let state = startBattle();
    const source = injectCapitalGains(state);
    state = revealCapitalGains(state, source);
    state = finishBattle(state, 'A');

    expect(state.battle?.loser).toBe('B');
    expect(state.battle?.positions.B).not.toBe(normalRetreatPosition);
    expect(Math.abs(state.battle!.positions.B - normalRetreatPosition)).toBe(1);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'capital_gains_battle_effect_registered',
        payload: expect.objectContaining({
          sourceInstanceId: source,
          sourceCardId: V070_CAPITAL_GAINS_ID,
          opponent: 'B',
        }),
      }),
    ]));
  });

  test('does not apply the queued extra retreat when the targeted opponent wins', () => {
    let state = startBattle();
    const source = injectCapitalGains(state);
    const bPositionBeforeBattle = state.battle!.positions.B;
    state = revealCapitalGains(state, source);
    state = finishBattle(state, 'B');

    expect(state.battle?.winner).toBe('B');
    expect(state.battle?.positions.B).toBe(bPositionBeforeBattle);
    expect(state.battleRuntime?.participants.B.disadvantage).toBe(1);
  });

  test('a negated Capital Gains applies neither Disadvantage nor the additional-retreat registration', () => {
    let state = startBattle();
    const source = injectCapitalGains(state);
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: source,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });
    state.battleRuntime!.negatedBattleCardEffectInstanceIds = [source];
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.participants.B.disadvantage).toBe(0);
    expect(state.battleRuntime?.additionalRetreatEffects.some(
      effect => effect.sourceInstanceId === source,
    )).toBe(false);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'battle_card_effect_skipped_negated',
        payload: expect.objectContaining({ instanceId: source }),
      }),
    ]));
  });
});
