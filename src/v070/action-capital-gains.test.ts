import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  applyV070FinancierAfterCapture,
  removeV070CardFromTreasury,
} from './financiers';
import {
  reduceV070BattleAction,
} from './battle-engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const militaryStarter = 'military-commandant-holdfast';
const financierStarter = 'financiers-banker-sound-investment';

function openingForFinancierB(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'capital-gains-action',
    seed: 'capital-gains-action-seed',
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
  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'B',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'B',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function inject(
  state: V070GameState,
  cardId: string,
  zone: 'hand' | 'treasury',
  suffix: string,
): string {
  const instanceId = `test-B-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: 'B',
  };
  if (zone === 'treasury') {
    state.players.B.financiers!.treasury.push(instanceId);
  } else {
    state.players.B.zones.hand.push(instanceId);
  }
  return instanceId;
}

function advanceToCleanup(
  state: V070GameState,
  playerId: 'A' | 'B',
): V070GameState {
  if (state.turnState?.phase === 'capture') {
    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId,
    });
  }
  if (state.turnState?.phase === 'draw') {
    state = reduceV070TurnAction(state, {
      type: 'draw_turn_card',
      playerId,
    });
  }
  if (state.turnState?.phase === 'opening') {
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId,
    });
  }
  if (state.turnState?.phase === 'movement') {
    state = reduceV070TurnAction(state, {
      type: 'choose_movement',
      playerId,
      choice: 'hold',
    });
  }
  if (state.turnState?.phase === 'denouement') {
    state = reduceV070TurnAction(state, {
      type: 'pass_denouement',
      playerId,
    });
  }
  expect(state.turnState?.phase).toBe('cleanup');
  return state;
}

function completeCleanup(
  state: V070GameState,
  playerId: 'A' | 'B',
): V070GameState {
  const hand = state.players[playerId].zones.hand;
  const excess = Math.max(0, hand.length - 3);
  return reduceV070TurnAction(state, {
    type: 'complete_cleanup',
    playerId,
    discardInstanceIds: hand.slice(0, excess),
  });
}

function completeRestOfTurn(
  state: V070GameState,
  playerId: 'A' | 'B',
): V070GameState {
  return completeCleanup(advanceToCleanup(state, playerId), playerId);
}

function bindCapitalGains(
  state: V070GameState,
): {
  state: V070GameState;
  source: string;
  host: string;
} {
  const host = inject(
    state,
    'neutral-rallying-cry',
    'treasury',
    'host',
  );
  const source = inject(
    state,
    'financiers-capital-gains',
    'hand',
    'source',
  );

  state = reduceV070TurnAction(state, {
    type: 'play_action_card',
    playerId: 'B',
    cardInstanceId: source,
  });
  expect(state.pendingActionEffectChoice).toEqual({
    kind: 'capital_gains_treasury_target',
    playerId: 'B',
    sourceActionInstanceId: source,
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_capital_gains_treasury_target',
    playerId: 'B',
    targetInstanceId: host,
  });

  return { state, source, host };
}

function prepareABattleAgainstB(
  state: V070GameState,
): V070GameState {
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; });
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
  expect(state.battle).not.toBeNull();
  return state;
}

function resolveNoCardBattleWithAWinning(
  state: V070GameState,
): V070GameState {
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
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [1],
  });
  return state;
}

describe('v0.7.0 Capital Gains Action', () => {
  test('rejects before spending when Treasury is empty', () => {
    const state = openingForFinancierB();
    state.players.B.financiers!.treasury = [];
    const source = inject(
      state,
      'financiers-capital-gains',
      'hand',
      'invalid',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'play_action_card',
      playerId: 'B',
      cardInstanceId: source,
    })).toThrow(/requires at least one card in your Treasury/);

    expect(state.players.B.zones.hand).toContain(source);
    expect(state.turnState?.actionsAvailable).toBe(1);
  });

  test('binds the physical Capital Gains card face up beneath the chosen public Treasury card', () => {
    const bound = bindCapitalGains(openingForFinancierB());
    const state = bound.state;

    expect(state.players.B.financiers!.treasury).toContain(bound.host);
    expect(state.bindings).toEqual([
      expect.objectContaining({
        hostId: bound.host,
        cardInstanceId: bound.source,
        owner: 'B',
        faceUp: true,
        purpose: 'Capital Gains',
      }),
    ]);
    expect(state.players.B.zones.hand).not.toContain(bound.source);
    expect(state.players.B.zones.discardPile).not.toContain(bound.source);
    expect(state.pendingActionCard).toBeNull();

    const view = viewV070GameForPlayer(state, 'A');
    expect(view.bindings).toEqual([
      expect.objectContaining({
        hostId: bound.host,
        purpose: 'Capital Gains',
        card: {
          instanceId: bound.source,
          cardId: 'financiers-capital-gains',
        },
      }),
    ]);
  });

  test('if the Treasury host leaves before maturity, Capital Gains is discarded immediately', () => {
    const bound = bindCapitalGains(openingForFinancierB());
    const state = bound.state;

    removeV070CardFromTreasury(
      state,
      'B',
      bound.host,
      'graveyard',
      'test Treasury departure',
    );

    expect(state.players.B.financiers!.treasury).not.toContain(bound.host);
    expect(state.players.B.zones.graveyard).toContain(bound.host);
    expect(state.players.B.zones.discardPile).toContain(bound.source);
    expect(state.bindings).toEqual([]);
  });

  test('does not mature again in the same turn even if the post-Income hook is invoked directly', () => {
    const bound = bindCapitalGains(openingForFinancierB());
    const state = bound.state;
    const capitalBefore = state.players.B.financiers!.capital;

    applyV070FinancierAfterCapture(state, 'B');

    expect(state.players.B.financiers!.treasury).toContain(bound.host);
    expect(state.bindings).toHaveLength(1);
    expect(state.players.B.zones.discardPile).not.toContain(bound.source);
    expect(state.players.B.financiers!.capital).toBe(capitalBefore);
  });

  test('after income on the next owner turn, returns the host to Hand, gains its value, and discards Capital Gains before Financial Capacity is evaluated', () => {
    let bound = bindCapitalGains(openingForFinancierB());
    let state = bound.state;

    state = completeRestOfTurn(state, 'B');
    state = completeRestOfTurn(state, 'A');
    expect(state.activePlayer).toBe('B');
    expect(state.turnState?.phase).toBe('capture');

    const capitalBefore = state.players.B.financiers!.capital;
    state.deeds[0].owner = 'B';

    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'B',
    });

    expect(state.players.B.zones.hand).toContain(bound.host);
    expect(state.players.B.financiers!.treasury).not.toContain(bound.host);
    expect(state.players.B.zones.discardPile).toContain(bound.source);
    expect(state.bindings).toEqual([]);
    // +1 Income from the test Deed, then +1 from Rallying Cry's value.
    expect(state.players.B.financiers!.capital).toBe(capitalBefore + 2);

    const incomeIndex = state.events.findIndex(event =>
      event.type === 'capital_changed'
      && (event.payload as { reason?: string })?.reason ===
        'Financier Income after Capture'
    );
    const maturityIndex = state.events.findIndex(event =>
      event.type === 'capital_gains_matured'
      && (event.payload as { sourceActionInstanceId?: string })
        ?.sourceActionInstanceId === bound.source
    );
    expect(maturityIndex).toBeGreaterThan(incomeIndex);

    const capacityEvent = [...state.events].reverse().find(event =>
      event.type === 'financial_capacity_available'
      && event.actor === 'B'
      && (event.payload as { turnNumber?: number })?.turnNumber ===
        state.turnNumber
    );
    if (capacityEvent) {
      expect(
        (capacityEvent.payload as { treasuryValue?: number }).treasuryValue,
      ).toBe(0);
    }
  });

  test('losing a battle before next-turn maturity discards both the Treasury host and Capital Gains at battle outcome', () => {
    let bound = bindCapitalGains(openingForFinancierB());
    let state = completeRestOfTurn(bound.state, 'B');
    expect(state.activePlayer).toBe('A');

    state = prepareABattleAgainstB(state);
    state = resolveNoCardBattleWithAWinning(state);

    expect(state.battle).toMatchObject({
      winner: 'A',
      loser: 'B',
    });
    expect(state.players.B.financiers!.treasury).not.toContain(bound.host);
    expect(state.players.B.zones.discardPile).toEqual(
      expect.arrayContaining([bound.host, bound.source]),
    );
    expect(state.bindings).toEqual([]);

    const outcomeIndex = state.events.findIndex(event =>
      event.type === 'battle_outcome'
      && (event.payload as { loser?: string })?.loser === 'B'
    );
    const treasuryRemovalIndex = state.events.findIndex(event =>
      event.type === 'treasury_card_removed'
      && (event.payload as { instanceId?: string })?.instanceId ===
        bound.host
    );
    expect(treasuryRemovalIndex).toBeGreaterThan(outcomeIndex);
  });
});
