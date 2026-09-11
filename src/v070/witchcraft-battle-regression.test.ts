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
import { V070_WITCHCRAFT_ID } from './witchcraft-battle';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'witchcraft-regression',
    seed: 'witchcraft-regression-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'military-commandant-holdfast' },
      B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
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
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
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
    type: 'resolve_capture', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset', playerId: 'A',
  });
}

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `witchcraft-regression-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function revealGambit(
  state: V070GameState,
  gambitInstanceId: string,
): V070GameState {
  state.players.A.zones.hand.push(gambitInstanceId);
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: gambitInstanceId,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
}

function revealWitchcraftTactic(
  state: V070GameState,
  suffix: string,
): { state: V070GameState; witchcraft: string } {
  const witchcraft = injectCard(state, 'A', V070_WITCHCRAFT_ID, suffix);
  state.battleRuntime!.participants.A.reserve.push(witchcraft);
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'A', cardInstanceId: witchcraft,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics', playerId: 'A',
  });
  return { state, witchcraft };
}

describe('v0.7.0 Witchcraft battle integration regressions', () => {
  test('hands off to a downstream choice opened by the repeated effect', () => {
    let state = startBattle();
    const sedition = injectCard(state, 'A', 'neutral-sedition', 'sedition');
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
    state.players.B.zones.assetBank.push(firstAsset, secondAsset);

    state = revealGambit(state, sedition);
    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('sedition');
    state = reduceV070BattleAction(state, {
      type: 'resolve_sedition_battle',
      playerId: 'B',
      targetInstanceId: firstAsset,
    });
    expect(isV070AssetActive(state, firstAsset)).toBe(false);
    expect(isV070AssetActive(state, secondAsset)).toBe(true);

    ({ state } = revealWitchcraftTactic(state, 'repeat-sedition'));
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'witchcraft',
        owner: 'A',
        candidateInstanceIds: expect.arrayContaining([sedition]),
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_witchcraft_battle',
      playerId: 'A',
      targetInstanceId: sedition,
    });

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'sedition',
        owner: 'A',
        opponent: 'B',
        sourceInstanceId: sedition,
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    })).toThrow(/Sedition/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_sedition_battle',
      playerId: 'B',
      targetInstanceId: secondAsset,
    });
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070AssetActive(state, secondAsset)).toBe(false);
  });

  test('revalidates the selected physical source against live battle state', () => {
    let state = startBattle();
    const recruits = injectCard(
      state,
      'A',
      'neutral-new-recruits',
      'live-target',
    );
    state = revealGambit(state, recruits);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);

    ({ state } = revealWitchcraftTactic(state, 'live-revalidation'));
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'witchcraft',
        candidateInstanceIds: [recruits],
      }),
    );

    // Model the originally eligible physical source leaving the battle before
    // the Witchcraft controller submits the pending selection.
    state.battleRuntime!.participants.A.gambit = null;

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_witchcraft_battle',
      playerId: 'A',
      targetInstanceId: recruits,
    })).toThrow(/can no longer apply/i);
    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('witchcraft');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
  });
});
