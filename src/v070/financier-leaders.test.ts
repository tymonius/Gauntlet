import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { buyV070DeedWithLineOfCredit } from './financiers';

function readyGame(
  financierStarter: 'financiers-banker-sound-investment' | 'financiers-executive-hostile-expansion',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'financier-leaders-test',
    seed: 'financier-leaders-seed',
    players: {
      A: { name: 'Financier', starterDeckId: financierStarter },
      B: { name: 'Opponent', starterDeckId: 'military-commandant-holdfast' },
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
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function injectHandCard(
  state: V070GameState,
  cardId: string,
  suffix: string,
): string {
  const instanceId = `test-A-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'A',
  };
  state.players.A.zones.hand.push(instanceId);
  return instanceId;
}

function toDenouement(state: V070GameState): V070GameState {
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
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'hold',
  });
}

function executiveBattleAtOutcome(): V070GameState {
  let state = readyGame('financiers-executive-hostile-expansion');
  state.players.A.financiers!.capital = 10;
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
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [6],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [1],
  });
}

describe('v0.7.0 Financier leaders', () => {
  test('Banker Line of Credit uses one Hand card for up to half the first Deed purchase cost', () => {
    let state = readyGame('financiers-banker-sound-investment');
    state.players.A.financiers!.capital = 2;
    const collateral = injectHandCard(
      state,
      'neutral-manifest-destiny',
      'line-of-credit',
    );
    state = toDenouement(state);

    const target = state.board.find(space =>
      space.controller === 'B'
      && space.occupant !== 'A'
    )!;
    state = reduceV070TurnAction(state, {
      type: 'financier_buy_deed',
      playerId: 'A',
      territoryPosition: target.position,
      collateralInstanceId: collateral,
    });

    expect(state.deeds.find(deed =>
      deed.territoryInstanceId === target.territoryInstanceId
    )?.owner).toBe('A');
    expect(state.players.A.financiers?.capital).toBe(1);
    expect(state.players.A.zones.hand).not.toContain(collateral);
    expect(state.players.A.zones.discardPile).toContain(collateral);
    expect(state.players.A.financiers?.deedPurchaseTurn).toBe(state.turnNumber);
  });

  test('Line of Credit is unavailable after any successful Deed purchase that turn', () => {
    const state = readyGame('financiers-banker-sound-investment');
    state.players.A.financiers!.capital = 20;
    const firstTarget = state.board.find(space => space.controller === 'A')!;
    const secondTarget = state.board.find(space => space.controller === 'B')!;
    const collateral = injectHandCard(
      state,
      'neutral-manifest-destiny',
      'second-purchase',
    );

    const { buyV070Deed } = await import('./financiers');
    buyV070Deed(
      state,
      'A',
      firstTarget.territoryInstanceId,
      'first purchase test',
    );

    expect(() => buyV070DeedWithLineOfCredit(
      state,
      'A',
      secondTarget.territoryInstanceId,
      collateral,
    )).toThrow(/first Deed purchase each turn/);
  });

  test('Executive Hostile Takeover converts a qualifying attacker win into Deed ownership and Front Line control', () => {
    let state = executiveBattleAtOutcome();

    expect(state.battle?.winner).toBe('A');
    expect(state.players.A.financiers?.hostileTakeoverTurn)
      .toBe(state.turnNumber);
    expect(state.players.A.financiers?.hostileTakeoverTerritoryInstanceId)
      .toBe(state.board[3].territoryInstanceId);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.turnState?.phase).toBe('denouement');
    expect(state.players.A.position).toBe(3);
    expect(state.board[3].controller).toBe('B');

    state = reduceV070TurnAction(state, {
      type: 'financier_hostile_takeover',
      playerId: 'A',
    });

    expect(state.deeds.find(deed =>
      deed.territoryInstanceId === state.board[3].territoryInstanceId
    )?.owner).toBe('A');
    expect(state.board[3].controller).toBe('A');
    expect(state.players.A.financiers?.hostileTakeoverTurn).toBeNull();
    expect(state.players.A.financiers?.hostileTakeoverTerritoryInstanceId)
      .toBeNull();
  });
});
