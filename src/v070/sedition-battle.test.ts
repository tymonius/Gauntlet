import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import { isV070AssetActive } from './asset-face-state';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'sedition-battle',
    seed: 'sedition-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-general-forward-doctrine',
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
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `sedition-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function setGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bGambit,
  });
}

function revealGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

describe('v0.7.0 Sedition battle effect', () => {
  test('opponent chooses one face-up Asset to make inactive for the battle', () => {
    let state = startBattle();
    const sedition = injectCard(
      state,
      'A',
      'neutral-sedition',
      'gambit',
    );
    const firstAsset = injectCard(
      state,
      'B',
      'neutral-resourcefulness',
      'asset-one',
    );
    const secondAsset = injectCard(
      state,
      'B',
      'neutral-rousing-speech',
      'asset-two',
    );
    state.players.A.zones.hand.push(sedition);
    state.players.B.zones.assetBank.push(firstAsset, secondAsset);

    expect(isV070AssetActive(state, firstAsset)).toBe(true);
    expect(isV070AssetActive(state, secondAsset)).toBe(true);

    state = revealGambits(setGambits(state, sedition));

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'sedition',
        owner: 'A',
        opponent: 'B',
        sourceInstanceId: sedition,
        candidateInstanceIds: expect.arrayContaining([
          firstAsset,
          secondAsset,
        ]),
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/Sedition/);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_sedition_battle',
      playerId: 'A',
      targetInstanceId: firstAsset,
    })).toThrow(/opponent targeted by Sedition/i);

    state = reduceV070BattleAction(state, {
      type: 'resolve_sedition_battle',
      playerId: 'B',
      targetInstanceId: firstAsset,
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070AssetActive(state, firstAsset)).toBe(false);
    expect(isV070AssetActive(state, secondAsset)).toBe(true);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
  });

  test('gains +1 Battle Total immediately when the opponent has no face-up Assets', () => {
    let state = startBattle();
    const sedition = injectCard(
      state,
      'A',
      'neutral-sedition',
      'no-assets',
    );
    state.players.A.zones.hand.push(sedition);

    state = revealGambits(setGambits(state, sedition));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.events.some(event =>
      event.type === 'sedition_battle_no_asset_bonus'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId === sedition
    )).toBe(true);
  });

  test('face-down opposing Assets do not prevent the no-Asset fallback', () => {
    let state = startBattle();
    const sedition = injectCard(
      state,
      'A',
      'neutral-sedition',
      'face-down',
    );
    const faceDownAsset = injectCard(
      state,
      'B',
      'neutral-resourcefulness',
      'face-down-asset',
    );
    state.players.A.zones.hand.push(sedition);
    state.players.B.zones.assetBank.push(faceDownAsset);
    state.assetFaceStates.push({
      instanceId: faceDownAsset,
      owner: 'B',
      faceUp: false,
      changedBy: 'A',
      sourceInstanceId: null,
      reason: 'test fixture',
      appliedTurn: state.turnNumber,
      restoreAtPlayer: 'B',
    });

    state = revealGambits(setGambits(state, sedition));

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
  });

  test('works as a Tactic and blocks dice until the opponent chooses an Asset', () => {
    let state = startBattle();
    state = revealGambits(setGambits(state));

    const sedition = injectCard(
      state,
      'A',
      'neutral-sedition',
      'tactic',
    );
    const asset = injectCard(
      state,
      'B',
      'neutral-resourcefulness',
      'tactic-target',
    );
    state.battleRuntime!.participants.A.reserve.push(sedition);
    state.players.B.zones.assetBank.push(asset);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: sedition,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('sedition');
    expect(() => reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    })).toThrow(/Sedition/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_sedition_battle',
      playerId: 'B',
      targetInstanceId: asset,
    });
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070AssetActive(state, asset)).toBe(false);
  });
});
