import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import {
  isV070AssetActive,
  isV070AssetFaceUp,
} from './asset-face-state';
import { reduceV070BattleAction } from './battle-engine';
import { reduceV070TurnAction } from './turn-engine';
import { viewV070GameForPlayer } from './views';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function openingForA(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'territory-battle-advanced',
    seed: 'territory-battle-advanced-seed',
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

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  expect(state.turnState?.phase).toBe('opening');
  return state;
}

function injectBankedAsset(
  state: V070GameState,
  playerId: 'A' | 'B',
  suffix: string,
): string {
  const instanceId = `advanced-${playerId}-${suffix}-attrition`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId: 'neutral-attrition',
    owner: playerId,
  };
  state.players[playerId].zones.assetBank.push(instanceId);
  return instanceId;
}

function configureAndInitiate(
  state: V070GameState,
  territoryId: string,
  controller: 'A' | 'B',
): V070GameState {
  state.board[3].territoryId = territoryId;
  state.board[3].controller = controller;
  state.board[3].blank = false;

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

function proceedFromOnset(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  expect(state.battleRuntime?.stage).toBe('set_gambits');
  return state;
}

function formReserveAndRevealGambits(
  state: V070GameState,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  expect(state.battleRuntime?.stage).toBe('reveal_gambits');
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
  expect(state.battleRuntime?.stage).toBe('choose_tactics');
  return state;
}

describe('v0.7.0 advanced battle Territory effects', () => {
  test('Fortified Pass makes the attacker Assets inactive while its controller defends, without turning them face down', () => {
    let state = openingForA();
    const attackerAsset = injectBankedAsset(state, 'A', 'fortified');
    const defenderAsset = injectBankedAsset(state, 'B', 'fortified');
    state = configureAndInitiate(
      state,
      'territory-fortified-pass',
      'B',
    );
    state = proceedFromOnset(state);

    expect(state.battleRuntime?.assetInactivePlayers).toEqual(['A']);
    expect(isV070AssetFaceUp(state, attackerAsset)).toBe(true);
    expect(isV070AssetActive(state, attackerAsset)).toBe(false);
    expect(isV070AssetActive(state, defenderAsset)).toBe(true);

    const view = viewV070GameForPlayer(state, 'B');
    expect(view.battleRuntime?.assetInactivePlayers).toEqual(['A']);
  });

  test('Arena: Single Combat makes both players Assets inactive while keeping them face up', () => {
    let state = openingForA();
    const a = injectBankedAsset(state, 'A', 'single-combat');
    const b = injectBankedAsset(state, 'B', 'single-combat');
    state = configureAndInitiate(
      state,
      'territory-arena-single-combat',
      'B',
    );
    state = proceedFromOnset(state);

    expect(new Set(state.battleRuntime?.assetInactivePlayers))
      .toEqual(new Set(['A', 'B']));
    expect(isV070AssetFaceUp(state, a)).toBe(true);
    expect(isV070AssetFaceUp(state, b)).toBe(true);
    expect(isV070AssetActive(state, a)).toBe(false);
    expect(isV070AssetActive(state, b)).toBe(false);
    expect(state.battle?.defensiveEdgeRemoved).toBe(true);
  });

  test('Insurgency continuously deactivates the occupier Assets and Pathfinders suppression restores them during that Movement', () => {
    let state = openingForA();
    state.board[3].territoryId = 'territory-insurgency';
    state.board[3].controller = 'A';
    state.board[3].blank = false;
    const occupierAsset = injectBankedAsset(
      state,
      'B',
      'insurgency',
    );

    expect(isV070AssetActive(state, occupierAsset)).toBe(false);

    state.territoryEffectSuppressions.push({
      source: 'pathfinders',
      sourceActionInstanceId: 'test-pathfinders',
      playerId: 'A',
      territoryInstanceId: state.board[3].territoryInstanceId,
      turnNumber: state.turnNumber,
      scope: 'movement',
    });
    state = reduceV070TurnAction(state, {
      type: 'pass_opening',
      playerId: 'A',
    });

    expect(state.turnState?.phase).toBe('movement');
    expect(isV070AssetActive(state, occupierAsset)).toBe(true);
  });

  test('Arena: Grand Melee gives each player +1 Reserve and two Tactic choices, and both chosen Tactics reveal and clear normally', () => {
    let state = openingForA();
    state = configureAndInitiate(
      state,
      'territory-arena-grand-melee',
      'B',
    );
    state = proceedFromOnset(state);

    expect(state.battleRuntime?.participants.A.reserveBonus).toBe(1);
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(1);
    expect(state.battleRuntime?.participants.A.tacticLimit).toBe(2);
    expect(state.battleRuntime?.participants.B.tacticLimit).toBe(2);
    expect(state.battle?.defensiveEdgeRemoved).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });

    expect(state.battleRuntime?.participants.A.reserve).toHaveLength(4);
    expect(state.battleRuntime?.participants.B.reserve).toHaveLength(4);

    const aReserve = state.battleRuntime!.participants.A.reserve;
    state.cardInstances[aReserve[0]].cardId = 'neutral-rallying-cry';
    state.cardInstances[aReserve[1]].cardId = 'neutral-rallying-cry';

    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    const first = aReserve[0];
    const second = aReserve[1];
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: first,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    expect(state.battleRuntime?.stage).toBe('choose_tactics');

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: second,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });

    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
    expect(state.battleRuntime?.participants.A.tactic?.instanceId)
      .toBe(first);
    expect(state.battleRuntime?.participants.A.additionalTactics)
      .toEqual([expect.objectContaining({ instanceId: second })]);

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);

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

    expect(state.players.A.zones.discardPile)
      .toEqual(expect.arrayContaining([first, second]));
  });

  test('Training Grounds controller may redraw the entire Reserve before either player chooses Tactics', () => {
    let state = openingForA();
    state = configureAndInitiate(
      state,
      'territory-training-grounds',
      'B',
    );
    state = proceedFromOnset(state);
    state = formReserveAndRevealGambits(state);

    expect(state.battleRuntime?.trainingGroundsRedrawPlayer).toBe('B');
    expect(state.battleRuntime?.trainingGroundsRedrawResolved).toBe(false);
    const oldReserve = [...state.battleRuntime!.participants.B.reserve];
    expect(oldReserve).toHaveLength(3);

    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/Training Grounds/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_training_grounds_redraw',
      playerId: 'B',
      use: true,
    });

    expect(state.battleRuntime?.trainingGroundsRedrawResolved).toBe(true);
    expect(state.battleRuntime?.participants.B.reserve).toHaveLength(3);
    for (const instanceId of oldReserve) {
      expect(state.players.B.zones.discardPile).toContain(instanceId);
      expect(state.battleRuntime?.participants.B.reserve)
        .not.toContain(instanceId);
    }

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
  });

  test('Training Grounds may be declined and then uses the original Reserve', () => {
    let state = openingForA();
    state = configureAndInitiate(
      state,
      'territory-training-grounds',
      'B',
    );
    state = proceedFromOnset(state);
    state = formReserveAndRevealGambits(state);
    const reserve = [...state.battleRuntime!.participants.B.reserve];

    state = reduceV070BattleAction(state, {
      type: 'resolve_training_grounds_redraw',
      playerId: 'B',
      use: false,
    });

    expect(state.battleRuntime?.participants.B.reserve).toEqual(reserve);
    expect(state.battleRuntime?.trainingGroundsRedrawResolved).toBe(true);
  });
});
