import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  isV070AssetActive,
  turnV070AssetFaceDownUntilPlayerNextTurn,
} from './asset-face-state';
import { placeV070OverlayFromHand } from './overlays';

const militaryA = 'military-general-forward-doctrine';
const militaryB = 'military-commandant-holdfast';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'disrupted-supply-lines',
    seed: 'disrupted-supply-lines-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: militaryA },
      B: { name: 'Bravo', starterDeckId: militaryB },
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
  return state;
}

function inject(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  zone: 'hand' | 'assetBank',
  suffix: string,
): string {
  const instanceId = `dsl-${playerId}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner: playerId,
  };
  state.players[playerId].zones[zone].push(instanceId);
  return instanceId;
}

function putAAtDisruptedSupplyLines(): V070GameState {
  const state = readyGame();
  const position = state.players.A.position!;
  const territory = state.board[position]!;
  territory.territoryId = 'territory-disrupted-supply-lines';
  territory.blank = false;
  territory.occupant = 'A';
  return state;
}

describe('v0.7.0 Disrupted Supply Lines Territory', () => {
  test('with multiple Assets, the player must choose exactly one active Asset before continuing', () => {
    let state = putAAtDisruptedSupplyLines();
    const chosen = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'chosen',
    );
    const inactive = inject(
      state,
      'A',
      'neutral-fortifications',
      'assetBank',
      'inactive',
    );

    expect(() => reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'A',
    })).toThrow(/Choose the active Asset for Disrupted Supply Lines/);

    state = reduceV070TurnAction(state, {
      type: 'choose_disrupted_supply_lines_active_asset',
      playerId: 'A',
      assetInstanceId: chosen,
    });

    expect(isV070AssetActive(state, chosen)).toBe(true);
    expect(isV070AssetActive(state, inactive)).toBe(false);
    expect(state.disruptedSupplyLinesSelections.A).toMatchObject({
      activeAssetInstanceId: chosen,
      territoryInstanceId: state.board[state.players.A.position!]!
        .territoryInstanceId,
    });

    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'A',
    });
    expect(state.turnState?.phase).toBe('draw');
  });

  test('with zero or one Asset, no choice is required and the sole Asset stays active', () => {
    let state = putAAtDisruptedSupplyLines();
    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'A',
    });
    expect(state.turnState?.phase).toBe('draw');

    state = putAAtDisruptedSupplyLines();
    const only = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'only',
    );
    expect(isV070AssetActive(state, only)).toBe(true);
    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'A',
    });
    expect(state.turnState?.phase).toBe('draw');
  });

  test('face-down Assets do not consume the one active-Asset choice', () => {
    let state = putAAtDisruptedSupplyLines();
    const active = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'face-up',
    );
    const faceDown = inject(
      state,
      'A',
      'neutral-fortifications',
      'assetBank',
      'face-down',
    );
    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: faceDown,
      changedBy: 'B',
      restoreAtPlayer: 'B',
      reason: 'Disrupted Supply Lines test',
    });

    expect(isV070AssetActive(state, active)).toBe(true);
    expect(isV070AssetActive(state, faceDown)).toBe(false);
    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'A',
    });
    expect(state.turnState?.phase).toBe('draw');
  });

  test('an exposed Overlay supersedes the printed restriction', () => {
    let state = putAAtDisruptedSupplyLines();
    const first = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'first',
    );
    const second = inject(
      state,
      'A',
      'neutral-fortifications',
      'assetBank',
      'second',
    );
    const overlay = inject(
      state,
      'A',
      'mystics-circle-of-bones',
      'hand',
      'overlay',
    );
    placeV070OverlayFromHand(
      state,
      'A',
      overlay,
      state.players.A.position!,
      'Disrupted Supply Lines test',
    );

    expect(isV070AssetActive(state, first)).toBe(true);
    expect(isV070AssetActive(state, second)).toBe(true);
    state = reduceV070TurnAction(state, {
      type: 'resolve_capture',
      playerId: 'A',
    });
    expect(state.turnState?.phase).toBe('draw');
  });

  test('entering a battle here pauses the battle until the entering player chooses an Asset', () => {
    let state = readyGame();
    state.players.A.position = 2;
    state.players.B.position = 3;
    for (const territory of state.board) territory.occupant = null;
    state.board[2]!.occupant = 'A';
    state.board[2]!.blank = true;
    state.board[3]!.occupant = 'B';
    state.board[3]!.territoryId = 'territory-disrupted-supply-lines';
    state.board[3]!.blank = false;

    const chosen = inject(
      state,
      'A',
      'neutral-counterintelligence',
      'assetBank',
      'battle-chosen',
    );
    const inactive = inject(
      state,
      'A',
      'neutral-fortifications',
      'assetBank',
      'battle-inactive',
    );

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

    expect(() => reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    })).toThrow(/Choose each required active Asset/);

    state = reduceV070BattleAction(state, {
      type: 'choose_disrupted_supply_lines_active_asset',
      playerId: 'A',
      assetInstanceId: chosen,
    });
    expect(isV070AssetActive(state, chosen)).toBe(true);
    expect(isV070AssetActive(state, inactive)).toBe(false);

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });
});
