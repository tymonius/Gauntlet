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
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import {
  V070_DIVESTMENT_BATTLE_TEXT,
  V070_DIVESTMENT_ID,
  V070_LIQUIDATION_BATTLE_TEXT,
  V070_LIQUIDATION_ID,
  V070_MARGIN_LOAN_BATTLE_TEXT,
  V070_MARGIN_LOAN_ID,
} from './financier-pre-dice-battle';
import { v070FinancierCardValue } from './financiers';
import { v070BindingsForHost } from './bindings';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'financier-pre-dice',
    seed: 'financier-pre-dice-seed',
    players: {
      A: { name: 'Financier', starterDeckId: 'financiers-banker-sound-investment' },
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
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'A', value: 6 });
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'B', value: 1 });

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'choose_movement', playerId: 'A', choice: 'advance' });
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  state.players.A.financiers!.capital = 10;
  return state;
}

function inject(
  state: V070GameState,
  zone: 'hand' | 'treasury',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `financier-pre-dice-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner: 'A' };
  if (zone === 'hand') state.players.A.zones.hand.push(instanceId);
  else state.players.A.financiers!.treasury.push(instanceId);
  return instanceId;
}

function revealAsGambit(
  state: V070GameState,
  cardId: string,
  suffix: string,
): { state: V070GameState; source: string } {
  const source = inject(state, 'hand', cardId, suffix);
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

function chooseNoTactics(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  return reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
}

describe('Financier pre-dice battle cards', () => {
  test('bind exact unchanged frozen/current authority', () => {
    for (const [cardId, text] of [
      [V070_DIVESTMENT_ID, V070_DIVESTMENT_BATTLE_TEXT],
      [V070_LIQUIDATION_ID, V070_LIQUIDATION_BATTLE_TEXT],
      [V070_MARGIN_LOAN_ID, V070_MARGIN_LOAN_BATTLE_TEXT],
    ] as const) {
      for (const card of [
        v070CanonicalContent.cardsById.get(cardId),
        currentCanonicalContent.cardsById.get(cardId),
      ]) {
        expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text).toBe(text);
      }
    }
  });

  test('Divestment makes an owned Deed unowned, gains pre-divestment Deed count, then pauses for immediate Subsidize', () => {
    let state = startBattle();
    state.deeds[0].owner = 'A';
    state.deeds[1].owner = 'A';
    const territoryInstanceId = state.deeds[0].territoryInstanceId;
    ({ state } = revealAsGambit(state, V070_DIVESTMENT_ID, 'divestment'));

    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('financier_divestment');
    state = reduceV070BattleAction(state, {
      type: 'resolve_financier_divestment_battle',
      playerId: 'A',
      territoryInstanceId,
    });

    expect(state.deeds.find(deed => deed.territoryInstanceId === territoryInstanceId)?.owner).toBeNull();
    expect(state.players.A.financiers?.capital).toBe(12);
    expect(pendingV070BattleRevealChoice(state)).toEqual(expect.objectContaining({
      kind: 'financier_immediate_subsidize',
      minimumBonus: 0,
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_financier_immediate_subsidize',
      playerId: 'A',
      bonus: 1,
    });
    expect(state.players.A.financiers?.capital).toBe(11);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });

  test('Liquidation discards the chosen Treasury card, gains its value, and can immediately Subsidize', () => {
    let state = startBattle();
    const treasury = inject(state, 'treasury', 'military-war-crimes', 'liquidation-target');
    const value = v070FinancierCardValue(state, treasury);
    ({ state } = revealAsGambit(state, V070_LIQUIDATION_ID, 'liquidation'));

    state = reduceV070BattleAction(state, {
      type: 'resolve_financier_liquidation_battle',
      playerId: 'A',
      cardInstanceId: treasury,
    });
    expect(state.players.A.financiers?.treasury).not.toContain(treasury);
    expect(state.players.A.zones.discardPile).toContain(treasury);
    expect(state.players.A.financiers?.capital).toBe(10 + value);
    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('financier_immediate_subsidize');

    state = reduceV070BattleAction(state, {
      type: 'resolve_financier_immediate_subsidize',
      playerId: 'A',
      bonus: 2,
    });
    expect(state.players.A.financiers?.capital).toBe(10 + value - 3);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
  });

  test('Margin Loan binds face-up collateral, gains its value, and defaults both collateral and source after a loss', () => {
    let state = startBattle();
    const collateral = inject(state, 'hand', 'neutral-reinforcements', 'margin-collateral');
    const value = v070FinancierCardValue(state, collateral);
    const revealed = revealAsGambit(state, V070_MARGIN_LOAN_ID, 'margin-source');
    state = revealed.state;
    const source = revealed.source;

    state = reduceV070BattleAction(state, {
      type: 'resolve_financier_margin_loan_battle',
      playerId: 'A',
      cardInstanceId: collateral,
    });
    expect(state.players.A.zones.hand).not.toContain(collateral);
    expect(v070BindingsForHost(state, source)).toEqual([
      expect.objectContaining({
        cardInstanceId: collateral,
        faceUp: true,
        purpose: 'Margin Loan battle collateral',
      }),
    ]);
    expect(state.players.A.financiers?.capital).toBe(10 + value);

    state = reduceV070BattleAction(state, {
      type: 'resolve_financier_immediate_subsidize',
      playerId: 'A',
      bonus: 1,
    });
    state = chooseNoTactics(state);
    state = reduceV070BattleAction(state, { type: 'submit_battle_dice', playerId: 'A', values: [1] });
    state = reduceV070BattleAction(state, { type: 'submit_battle_dice', playerId: 'B', values: [6] });

    expect(state.battle?.loser).toBe('A');
    expect(state.players.A.zones.graveyard).toContain(collateral);
    expect(v070BindingsForHost(state, source)).toEqual([]);

    state = reduceV070BattleAction(state, { type: 'complete_aftermath', playerId: 'A' });
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.players.A.zones.discardPile).not.toContain(source);
  });

  test('Margin Loan returns collateral to Hand after a win', () => {
    let state = startBattle();
    const collateral = inject(state, 'treasury', 'neutral-reinforcements', 'margin-win-collateral');
    const revealed = revealAsGambit(state, V070_MARGIN_LOAN_ID, 'margin-win-source');
    state = revealed.state;

    state = reduceV070BattleAction(state, {
      type: 'resolve_financier_margin_loan_battle',
      playerId: 'A',
      cardInstanceId: collateral,
    });
    const immediate = pendingV070BattleRevealChoice(state);
    expect(immediate?.kind).toBe('financier_immediate_subsidize');
    if (immediate?.kind !== 'financier_immediate_subsidize') throw new Error('Expected immediate Subsidize.');

    state = reduceV070BattleAction(state, {
      type: 'resolve_financier_immediate_subsidize',
      playerId: 'A',
      bonus: immediate.minimumBonus,
    });
    state = chooseNoTactics(state);
    state = reduceV070BattleAction(state, { type: 'submit_battle_dice', playerId: 'A', values: [6] });
    state = reduceV070BattleAction(state, { type: 'submit_battle_dice', playerId: 'B', values: [1] });

    expect(state.battle?.winner).toBe('A');
    expect(state.players.A.zones.hand).toContain(collateral);
    expect(v070BindingsForHost(state, revealed.source)).toEqual([]);
  });
});
