import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070BattleAction } from './battle-engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function openingForA(
  suppress = false,
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'territory-poisonous-gas',
    seed: suppress
      ? 'territory-poisonous-gas-suppressed'
      : 'territory-poisonous-gas-seed',
    players: {
      A: { name: 'Attacker', starterDeckId: militaryA },
      B: { name: 'Defender', starterDeckId: militaryB },
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
  for (const territory of state.board) territory.occupant = null;
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[2].blank = true;
  state.board[3].territoryId = 'territory-poisonous-gas';
  state.board[3].controller = 'B';
  state.board[3].blank = false;

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });

  if (suppress) {
    state.territoryEffectSuppressions.push({
      source: 'pathfinders',
      sourceActionInstanceId: 'test-pathfinders',
      playerId: 'A',
      territoryInstanceId: state.board[3].territoryInstanceId,
      turnNumber: state.turnNumber,
      scope: 'movement',
    });
  }

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
  expect(state.battleRuntime?.stage).toBe('set_gambits');
  return state;
}

function injectHandCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  suffix: string,
): string {
  const instanceId =
    `poison-${playerId}-${suffix}-neutral-rallying-cry`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: 'neutral-rallying-cry',
    owner: playerId,
  };
  state.players[playerId].zones.hand.push(instanceId);
  return instanceId;
}

function setGambitsAndFormReserve(
  state: V070GameState,
  gambits: Partial<Record<'A' | 'B', string>> = {},
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: gambits.A,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: gambits.B,
  });
  expect(state.battleRuntime?.stage).toBe('reveal_gambits');
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
  expect(state.battleRuntime?.stage).toBe('choose_tactics');
  return state;
}

function makeReserveCardTacticEligible(
  state: V070GameState,
  playerId: 'A' | 'B',
  index = 0,
): string {
  const instanceId =
    state.battleRuntime!.participants[playerId].reserve[index]!;
  state.cardInstances[instanceId]!.cardId =
    'neutral-rallying-cry';
  return instanceId;
}

function finishTacticsAndResolve(
  state: V070GameState,
  tactics: Partial<Record<'A' | 'B', string>> = {},
  winner: 'A' | 'B' = 'A',
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: tactics.A,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
    cardInstanceId: tactics.B,
  });
  expect(state.battleRuntime?.stage).toBe('reveal_tactics');

  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
  expect(state.battleRuntime?.stage).toBe('outcome');

  const aModifier = state.battleRuntime!.participants.A.battleModifier;
  const bModifier = state.battleRuntime!.participants.B.battleModifier;
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [
      winner === 'A'
        ? Math.max(2, 6 - aModifier)
        : 1,
    ],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [
      winner === 'B'
        ? Math.max(2, 6 - bModifier)
        : 1,
    ],
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return state;
}

describe('v0.7.0 Poisonous Gas Territory', () => {
  test('a player who employed a Gambit cannot also employ a Tactic', () => {
    let state = openingForA();
    const gambit = injectHandCard(state, 'A', 'gambit');
    state = setGambitsAndFormReserve(state, { A: gambit });
    const tactic = makeReserveCardTacticEligible(state, 'A');

    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: tactic,
    })).toThrow(/Gambits or Tactics, but not both/);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    expect(state.battleRuntime?.participants.A.tactic).toBeNull();
  });

  test('a player who passed Gambit may choose a Tactic, and that Tactic goes to Graveyard in Aftermath', () => {
    let state = openingForA();
    state = setGambitsAndFormReserve(state);
    const tactic = makeReserveCardTacticEligible(state, 'A');

    state = finishTacticsAndResolve(
      state,
      { A: tactic },
      'A',
    );

    // B chose no Tactic, so resolve its mandatory Reserve loss first.
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battleRuntime?.pendingPoisonousGasAftermath)
      .toEqual(expect.objectContaining({
        playerId: 'B',
      }));
    const bChoice =
      state.battleRuntime!.pendingPoisonousGasAftermath!
        .candidateInstanceIds[0]!;
    state = reduceV070BattleAction(state, {
      type: 'resolve_poisonous_gas_reserve_graveyard',
      playerId: 'B',
      cardInstanceId: bChoice,
    });

    expect(state.players.A.zones.graveyard).toContain(tactic);
    expect(state.players.A.zones.discardPile).not.toContain(tactic);
  });

  test('if both players chose no Tactic, each privately chooses one Reserve card for Graveyard before normal clearing', () => {
    let state = openingForA();
    state = setGambitsAndFormReserve(state);
    const aReserve = [
      ...state.battleRuntime!.participants.A.reserve,
    ];
    const bReserve = [
      ...state.battleRuntime!.participants.B.reserve,
    ];
    state = finishTacticsAndResolve(state, {}, 'A');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime?.pendingPoisonousGasAftermath)
      .toEqual(expect.objectContaining({
        playerId: 'A',
        remainingPlayerIds: ['B'],
      }));

    const aView = viewV070GameForPlayer(state, 'A');
    const bView = viewV070GameForPlayer(state, 'B');
    expect(
      aView.battleRuntime?.pendingPoisonousGasAftermath
        ?.candidateInstanceIds,
    ).toEqual(aReserve);
    expect(
      bView.battleRuntime?.pendingPoisonousGasAftermath
        ?.candidateInstanceIds,
    ).toBeUndefined();
    expect(
      bView.battleRuntime?.pendingPoisonousGasAftermath
        ?.candidateCount,
    ).toBe(3);

    const aChosen = aReserve[0]!;
    state = reduceV070BattleAction(state, {
      type: 'resolve_poisonous_gas_reserve_graveyard',
      playerId: 'A',
      cardInstanceId: aChosen,
    });

    expect(state.battleRuntime?.pendingPoisonousGasAftermath)
      .toEqual(expect.objectContaining({
        playerId: 'B',
        remainingPlayerIds: [],
      }));

    const bChosen = bReserve[1]!;
    state = reduceV070BattleAction(state, {
      type: 'resolve_poisonous_gas_reserve_graveyard',
      playerId: 'B',
      cardInstanceId: bChosen,
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.zones.graveyard).toContain(aChosen);
    expect(state.players.B.zones.graveyard).toContain(bChosen);
    for (const id of aReserve.filter(id => id !== aChosen)) {
      expect(state.players.A.zones.discardPile).toContain(id);
    }
    for (const id of bReserve.filter(id => id !== bChosen)) {
      expect(state.players.B.zones.discardPile).toContain(id);
    }
  });

  test('the mandatory Reserve choice is revalidated and cannot be bypassed by another Aftermath action', () => {
    let state = openingForA();
    state = setGambitsAndFormReserve(state);
    state = finishTacticsAndResolve(state);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    const pending =
      state.battleRuntime!.pendingPoisonousGasAftermath!;
    const stale = pending.candidateInstanceIds[0]!;
    const reserve =
      state.battleRuntime!.participants[pending.playerId].reserve;
    reserve.splice(reserve.indexOf(stale), 1);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_poisonous_gas_reserve_graveyard',
      playerId: pending.playerId,
      cardInstanceId: stale,
    })).toThrow(/still in that player’s Reserve/);

    expect(() => reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    })).toThrow(/pending Poisonous Gas Reserve loss/);
  });

  test('Pathfinders suppression disables Poisonous Gas role restrictions and Aftermath destinations', () => {
    let state = openingForA(true);
    const gambit = injectHandCard(state, 'A', 'suppressed-gambit');
    state = setGambitsAndFormReserve(state, { A: gambit });
    const tactic = makeReserveCardTacticEligible(state, 'A');

    state = finishTacticsAndResolve(
      state,
      { A: tactic },
      'A',
    );
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.zones.discardPile).toContain(tactic);
    expect(state.players.A.zones.graveyard).not.toContain(tactic);
    expect(state.events.some(event =>
      event.type === 'poisonous_gas_reserve_loss_pending'
    )).toBe(false);
  });
});
