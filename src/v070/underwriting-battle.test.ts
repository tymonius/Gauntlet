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
  V070_UNDERWRITING_BATTLE_TEXT,
  V070_UNDERWRITING_ID,
} from './underwriting-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'underwriting-battle',
    seed: 'underwriting-battle-seed',
    players: {
      A: {
        name: 'Financier',
        starterDeckId: 'financiers-banker-sound-investment',
      },
      B: {
        name: 'Opponent',
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
  state.players.A.financiers!.capital = 10;
  return state;
}

function injectUnderwriting(state: V070GameState, suffix: string): string {
  const instanceId = `underwriting-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: V070_UNDERWRITING_ID,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

function revealUnderwriting(
  state: V070GameState,
  underwriting: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: underwriting,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
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

describe('Underwriting battle effect', () => {
  test('binds exact unchanged frozen/current battle authority', () => {
    for (const card of [
      v070CanonicalContent.cardsById.get(V070_UNDERWRITING_ID),
      currentCanonicalContent.cardsById.get(V070_UNDERWRITING_ID),
    ]) {
      expect(
        card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text,
      ).toBe(V070_UNDERWRITING_BATTLE_TEXT);
    }
  });

  test('after a subsidized loss, refunds Capital equal to the purchased bonus rather than the Subsidize cost', () => {
    let state = startBattle();
    const underwriting = injectUnderwriting(state, 'loss');
    state = revealUnderwriting(state, underwriting);

    expect(state.battleRuntime?.underwritingAftermathEffects).toEqual([
      { owner: 'A', sourceInstanceId: underwriting },
    ]);

    state = reduceV070BattleAction(state, {
      type: 'use_subsidize',
      playerId: 'A',
      bonus: 2,
    });
    expect(state.players.A.financiers?.capital).toBe(7);

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

    expect(state.battle?.loser).toBe('A');
    expect(state.players.A.financiers?.capital).toBe(9);
    expect(state.battleRuntime?.underwritingAftermathEffects).toEqual([]);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'underwriting_battle_capital_gained',
      actor: 'A',
      payload: expect.objectContaining({
        amount: 2,
        subsidizeBonus: 2,
      }),
    }));
  });

  test('does not pay when the owner lost without using Subsidize', () => {
    let state = startBattle();
    const underwriting = injectUnderwriting(state, 'no-subsidize');
    state = revealUnderwriting(state, underwriting);

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

    expect(state.battle?.loser).toBe('A');
    expect(state.players.A.financiers?.capital).toBe(10);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'underwriting_battle_condition_not_met',
      payload: expect.objectContaining({
        ownerLost: true,
        subsidizeBonus: 0,
      }),
    }));
  });

  test('does not pay when the owner used Subsidize but won', () => {
    let state = startBattle();
    const underwriting = injectUnderwriting(state, 'win');
    state = revealUnderwriting(state, underwriting);
    state = reduceV070BattleAction(state, {
      type: 'use_subsidize',
      playerId: 'A',
      bonus: 2,
    });

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
    expect(state.players.A.financiers?.capital).toBe(7);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'underwriting_battle_condition_not_met',
      payload: expect.objectContaining({
        ownerLost: false,
        subsidizeBonus: 2,
      }),
    }));
  });
});
