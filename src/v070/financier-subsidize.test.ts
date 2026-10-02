import { describe, expect, test } from 'vitest';
import { currentCanonicalContent } from '../content/current-game';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  reduceV070BattleAction,
} from './battle-engine';
import {
  createV070BattleRuntime,
} from './battle-types';
import {
  createV070BattleOnset,
} from './rules';
import {
  v070SubsidizeBonusThisBattle,
  v070SubsidizeCost,
} from './financiers';

const militaryStarter = 'military-commandant-holdfast';
const financierStarter = 'financiers-banker-sound-investment';

function setupBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'financier-subsidize',
    seed: 'financier-subsidize-seed',
    players: {
      A: { name: 'Opponent', starterDeckId: militaryStarter },
      B: { name: 'Financier', starterDeckId: financierStarter },
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
    value: 1,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 6,
  });

  state.players.A.position = 2;
  state.players.B.position = 2;
  state.battle = createV070BattleOnset({
    territoryCount: state.board.length,
    attacker: 'B',
    defender: 'A',
    attackerOrigin: 3,
    contestedPosition: 2,
    positions: { A: 2, B: 2 },
    defenderControlsContested: true,
  });
  state.battle.stage = 'active';
  state.battleRuntime = createV070BattleRuntime();
  state.battleRuntime.stage = 'outcome';
  state.players.B.financiers!.capital = 20;

  return state;
}

describe('current Financier Subsidize battle feature', () => {
  test('binds the triangular cost table and open-ended progression to current authority', () => {
    const factionRules = currentCanonicalContent.content.faction_rules as {
      financiers?: {
        subsidize?: {
          timing?: string;
          action_cost?: number;
          costs?: Record<string, number>;
          text?: string;
        };
      };
    };
    const authority = factionRules.financiers?.subsidize;

    expect(authority).toEqual({
      timing: 'Before dice are rolled.',
      action_cost: 0,
      costs: {
        '1': 1,
        '2': 3,
        '3': 6,
        '4': 10,
      },
      text: 'Spend Capital to increase your battle total. The total cost for +N is triangular: 1 + 2 + … + N Capital.',
    });
    expect(v070SubsidizeCost(1)).toBe(1);
    expect(v070SubsidizeCost(2)).toBe(3);
    expect(v070SubsidizeCost(3)).toBe(6);
    expect(v070SubsidizeCost(4)).toBe(10);
    expect(v070SubsidizeCost(5)).toBe(15);
  });

  test('spends Capital and adds the purchased bonus to the battle total', () => {
    let state = setupBattle();

    state = reduceV070BattleAction(state, {
      type: 'use_subsidize',
      playerId: 'B',
      bonus: 3,
    });

    expect(state.players.B.financiers?.capital).toBe(14);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(3);
    expect(v070SubsidizeBonusThisBattle(state, 'B')).toBe(3);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [4],
    });

    expect(state.battleRuntime?.participants.B.battleTotal).toBe(7);
  });

  test('can increase the committed bonus before dice by paying only the triangular-cost difference', () => {
    let state = setupBattle();

    state = reduceV070BattleAction(state, {
      type: 'use_subsidize',
      playerId: 'B',
      bonus: 2,
    });
    expect(state.players.B.financiers?.capital).toBe(17);

    state = reduceV070BattleAction(state, {
      type: 'use_subsidize',
      playerId: 'B',
      bonus: 4,
    });

    expect(state.players.B.financiers?.capital).toBe(10);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(4);
    expect(v070SubsidizeBonusThisBattle(state, 'B')).toBe(4);
    expect(
      state.events.filter(event => event.type === 'subsidize_used')
        .map(event => event.payload),
    ).toEqual([
      expect.objectContaining({
        bonus: 2,
        additionalCost: 3,
        totalCost: 3,
      }),
      expect.objectContaining({
        bonus: 4,
        previousBonus: 2,
        additionalCost: 7,
        totalCost: 10,
      }),
    ]);
  });

  test('cannot reduce a committed bonus or use Subsidize after battle dice begin', () => {
    let state = setupBattle();
    state = reduceV070BattleAction(state, {
      type: 'use_subsidize',
      playerId: 'B',
      bonus: 2,
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'use_subsidize',
      playerId: 'B',
      bonus: 1,
    })).toThrow(/cannot be reduced/i);

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [4],
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'use_subsidize',
      playerId: 'B',
      bonus: 3,
    })).toThrow(/before any battle dice/i);
  });

  test('rejects a purchase whose triangular cost exceeds available Capital', () => {
    const state = setupBattle();
    state.players.B.financiers!.capital = 5;

    expect(() => reduceV070BattleAction(state, {
      type: 'use_subsidize',
      playerId: 'B',
      bonus: 3,
    })).toThrow(/requires 6 Capital/i);
  });
});
