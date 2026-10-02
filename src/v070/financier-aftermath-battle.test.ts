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
  V070_CORNER_THE_MARKET_BATTLE_TEXT,
  V070_CORNER_THE_MARKET_ID,
  V070_LEVERAGED_BUYOUT_BATTLE_TEXT,
  V070_LEVERAGED_BUYOUT_ID,
  V070_MONETARY_CRISIS_BATTLE_TEXT,
  V070_MONETARY_CRISIS_ID,
  pendingV070FinancierAftermathChoice,
} from './financier-aftermath-battle';
import { v070DeedCost } from './financiers';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'financier-aftermath',
    seed: 'financier-aftermath-seed',
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
  state.players.A.financiers!.capital = 30;
  return state;
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `financier-aftermath-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function revealAsAttackerGambit(
  state: V070GameState,
  cardId: string,
  suffix: string,
): { state: V070GameState; source: string } {
  const source = inject(state, 'A', cardId, suffix);
  state.players.A.zones.hand.push(source);
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: source,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
  return { state, source };
}

function revealNoTactics(state: V070GameState): V070GameState {
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

function resolveAttackerWin(state: V070GameState): V070GameState {
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

function openAftermathControlledEffect(
  state: V070GameState,
  sourceInstanceId: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: 'A',
  });
  expect(
    state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
  ).toEqual(expect.objectContaining({
    playerId: 'A',
    candidateSourceInstanceIds: expect.arrayContaining([
      sourceInstanceId,
    ]),
  }));
  return reduceV070BattleAction(state, {
    type: 'resolve_battle_aftermath_controlled_effect',
    playerId: 'A',
    sourceInstanceId,
  });
}

describe('remaining Financier Aftermath battle cards', () => {
  test('bind exact unchanged frozen/current authority', () => {
    for (const [cardId, text] of [
      [V070_CORNER_THE_MARKET_ID, V070_CORNER_THE_MARKET_BATTLE_TEXT],
      [V070_LEVERAGED_BUYOUT_ID, V070_LEVERAGED_BUYOUT_BATTLE_TEXT],
      [V070_MONETARY_CRISIS_ID, V070_MONETARY_CRISIS_BATTLE_TEXT],
    ] as const) {
      for (const card of [
        v070CanonicalContent.cardsById.get(cardId),
        currentCanonicalContent.cardsById.get(cardId),
      ]) {
        expect(
          card?.effects.find(
            effect => effect.label === 'Gambit/Tactic',
          )?.text,
        ).toBe(text);
      }
    }
  });

  test('Corner the Market participates in shared Aftermath timing and recalculates after each purchase', () => {
    let state = startBattle();
    const revealed = revealAsAttackerGambit(
      state,
      V070_CORNER_THE_MARKET_ID,
      'corner',
    );
    state = revealNoTactics(revealed.state);
    state = resolveAttackerWin(state);
    expect(state.battleRuntime?.stage).toBe('aftermath');

    state = openAftermathControlledEffect(state, revealed.source);
    let pending = pendingV070FinancierAftermathChoice(state);
    expect(pending?.kind).toBe('corner_the_market');
    if (pending?.kind !== 'corner_the_market') {
      throw new Error('Expected Corner the Market choice.');
    }

    const first = pending.candidateTerritoryInstanceIds[0];
    const firstCost = v070DeedCost(state, 'A', first);
    const capitalBefore = state.players.A.financiers!.capital;
    state = reduceV070BattleAction(state, {
      type: 'resolve_corner_the_market_aftermath',
      playerId: 'A',
      territoryInstanceId: first,
    });
    expect(state.players.A.financiers!.capital)
      .toBe(capitalBefore - firstCost);
    expect(state.deeds.find(
      deed => deed.territoryInstanceId === first,
    )?.owner).toBe('A');

    pending = pendingV070FinancierAftermathChoice(state);
    expect(pending?.kind).toBe('corner_the_market');
    if (pending?.kind !== 'corner_the_market') {
      throw new Error('Expected continued Corner the Market choice.');
    }
    const second = pending.candidateTerritoryInstanceIds.find(
      territoryInstanceId => territoryInstanceId !== first,
    );
    expect(second).toBeDefined();
    const secondCost = v070DeedCost(state, 'A', second!);
    state = reduceV070BattleAction(state, {
      type: 'resolve_corner_the_market_aftermath',
      playerId: 'A',
      territoryInstanceId: second,
    });
    expect(state.players.A.financiers!.capital)
      .toBe(capitalBefore - firstCost - secondCost);

    state = reduceV070BattleAction(state, {
      type: 'resolve_corner_the_market_aftermath',
      playerId: 'A',
    });
    expect(pendingV070FinancierAftermathChoice(state)).toBeNull();
  });

  test('Leveraged Buyout uses another battle card as collateral and graveyards it at battle cleanup', () => {
    let state = startBattle();
    const revealed = revealAsAttackerGambit(
      state,
      V070_LEVERAGED_BUYOUT_ID,
      'leveraged',
    );
    state = revealed.state;
    const collateral = inject(
      state,
      'A',
      'military-war-crimes',
      'leveraged-collateral',
    );
    state.battleRuntime!.participants.A.reserve.push(collateral);

    state = revealNoTactics(state);
    state = resolveAttackerWin(state);
    expect(state.battleRuntime?.stage).toBe('aftermath');

    const contested = state.board.find(
      territory =>
        territory.position === state.battle!.contestedPosition,
    )!.territoryInstanceId;
    state.players.A.financiers!.capital = 0;

    state = openAftermathControlledEffect(state, revealed.source);
    const pending = pendingV070FinancierAftermathChoice(state);
    expect(pending).toEqual(expect.objectContaining({
      kind: 'leveraged_buyout',
      playerId: 'A',
      territoryInstanceId: contested,
      candidateCollateralInstanceIds:
        expect.arrayContaining([collateral]),
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_leveraged_buyout_aftermath',
      playerId: 'A',
      collateralInstanceIds: [collateral],
    });

    expect(state.deeds.find(
      deed => deed.territoryInstanceId === contested,
    )?.owner).toBe('A');
    expect(state.players.A.zones.graveyard).toContain(collateral);
    expect(state.players.A.zones.discardPile).not.toContain(collateral);
  });

  test('Monetary Crisis automatically opens the attacker Hand choice, then the defender Hand choice', () => {
    let state = startBattle();
    const revealed = revealAsAttackerGambit(
      state,
      V070_MONETARY_CRISIS_ID,
      'crisis',
    );
    state = revealNoTactics(revealed.state);

    const aCards = [
      inject(state, 'A', 'neutral-new-recruits', 'crisis-a1'),
      inject(state, 'A', 'neutral-reinforcements', 'crisis-a2'),
      inject(state, 'A', 'neutral-redemption', 'crisis-a3'),
    ];
    const bCards = [
      inject(state, 'B', 'neutral-new-recruits', 'crisis-b1'),
      inject(state, 'B', 'neutral-reinforcements', 'crisis-b2'),
      inject(state, 'B', 'neutral-redemption', 'crisis-b3'),
    ];
    state.players.A.zones.hand = [...aCards];
    state.players.B.zones.hand = [...bCards];

    state = resolveAttackerWin(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toBeNull();
    expect(pendingV070FinancierAftermathChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'monetary_crisis',
        playerId: 'A',
        candidateInstanceIds: aCards,
      }),
    );

    const bView = viewV070GameForPlayer(state, 'B');
    expect(bView.pendingFinancierAftermath).toEqual(
      expect.objectContaining({
        kind: 'monetary_crisis',
        playerId: 'A',
        candidateCount: 3,
      }),
    );
    expect(
      bView.pendingFinancierAftermath?.candidateInstanceIds,
    ).toBeUndefined();

    state = reduceV070BattleAction(state, {
      type: 'resolve_monetary_crisis_aftermath',
      playerId: 'A',
      keepInstanceId: aCards[1],
    });
    expect(state.players.A.zones.hand).toEqual([aCards[1]]);
    expect(state.players.A.zones.discardPile).toEqual(
      expect.arrayContaining([aCards[0], aCards[2]]),
    );
    expect(pendingV070FinancierAftermathChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'monetary_crisis',
        playerId: 'B',
        candidateInstanceIds: bCards,
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_monetary_crisis_aftermath',
      playerId: 'B',
      keepInstanceId: bCards[0],
    });
    expect(state.players.B.zones.hand).toEqual([bCards[0]]);
    expect(state.players.B.zones.discardPile).toEqual(
      expect.arrayContaining([bCards[1], bCards[2]]),
    );
    expect(pendingV070FinancierAftermathChoice(state)).toBeNull();
  });

  test('a losing Corner the Market is pruned before the shared Aftermath effect choice opens', () => {
    let state = startBattle();
    const revealed = revealAsAttackerGambit(
      state,
      V070_CORNER_THE_MARKET_ID,
      'corner-loss',
    );
    state = revealNoTactics(revealed.state);
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

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toBeNull();
    expect(pendingV070FinancierAftermathChoice(state)).toBeNull();
  });
});
