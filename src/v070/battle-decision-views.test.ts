import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  type V070GameState,
} from './engine';
import { createV070BattleRuntime } from './battle-types';
import { viewV070GameForPlayer } from './views';

function stateWithBattleRuntime(): V070GameState {
  const state = createV070StarterGame({
    gameId: 'battle-decision-view-test',
    seed: 'battle-decision-view-seed',
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
  state.battleRuntime = createV070BattleRuntime();
  return state;
}

function injectBanked(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `view-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.assetBank.push(instanceId);
  return instanceId;
}

describe('v0.7.0 battle decision player views', () => {
  test('shows the Subversion chooser physical candidates but hides them and replay internals from the opponent', () => {
    const state = stateWithBattleRuntime();
    const target = injectBanked(
      state,
      'B',
      'neutral-foothold',
      'target',
    );
    const first = injectBanked(
      state,
      'A',
      'intelligence-subversion',
      'first',
    );
    const second = injectBanked(
      state,
      'A',
      'intelligence-subversion',
      'second',
    );

    state.battleRuntime!.pendingSubversionAssetBattle = {
      playerId: 'A',
      targetOwner: 'B',
      targetAssetInstanceId: target,
      effectLabel: 'Foothold',
      candidateSubversionInstanceIds: [first, second],
      deferredAction: {
        type: 'use_foothold_asset',
        playerId: 'B',
        assetInstanceId: target,
      },
      resistanceOnsetResumeAction: {
        type: 'proceed_from_onset',
        playerId: 'B',
      },
    };

    const chooser = viewV070GameForPlayer(state, 'A');
    const opponent = viewV070GameForPlayer(state, 'B');

    expect(chooser.battleRuntime?.pendingSubversionAssetBattle).toEqual({
      playerId: 'A',
      targetOwner: 'B',
      targetAssetInstanceId: target,
      effectLabel: 'Foothold',
      candidateCount: 2,
      candidateSubversionInstanceIds: [first, second],
    });
    expect(opponent.battleRuntime?.pendingSubversionAssetBattle).toEqual({
      playerId: 'A',
      targetOwner: 'B',
      targetAssetInstanceId: target,
      effectLabel: 'Foothold',
      candidateCount: 2,
    });

    expect(chooser.battleRuntime?.pendingSubversionAssetBattle)
      .not.toHaveProperty('deferredAction');
    expect(chooser.battleRuntime?.pendingSubversionAssetBattle)
      .not.toHaveProperty('resistanceOnsetResumeAction');
    expect(opponent.battleRuntime?.pendingSubversionAssetBattle)
      .not.toHaveProperty('deferredAction');
    expect(opponent.battleRuntime?.pendingSubversionAssetBattle)
      .not.toHaveProperty('resistanceOnsetResumeAction');
  });

  test('shows Spirit Hollow candidate counts publicly but identities only to the player resolving the choice', () => {
    const state = stateWithBattleRuntime();
    state.battleRuntime!.pendingSpiritHollowAftermath = {
      playerId: 'B',
      overlayInstanceId: 'spirit-hollow-overlay',
      territoryInstanceId: 'territory-3',
      candidateHandInstanceIds: ['hand-1', 'hand-2'],
      candidateGraveyardInstanceIds: ['grave-1', 'grave-2', 'grave-3'],
    };

    const chooser = viewV070GameForPlayer(state, 'B');
    const opponent = viewV070GameForPlayer(state, 'A');

    expect(chooser.battleRuntime?.pendingSpiritHollowAftermath).toEqual({
      playerId: 'B',
      overlayInstanceId: 'spirit-hollow-overlay',
      territoryInstanceId: 'territory-3',
      candidateHandCount: 2,
      candidateGraveyardCount: 3,
      candidateHandInstanceIds: ['hand-1', 'hand-2'],
      candidateGraveyardInstanceIds: ['grave-1', 'grave-2', 'grave-3'],
    });
    expect(opponent.battleRuntime?.pendingSpiritHollowAftermath).toEqual({
      playerId: 'B',
      overlayInstanceId: 'spirit-hollow-overlay',
      territoryInstanceId: 'territory-3',
      candidateHandCount: 2,
      candidateGraveyardCount: 3,
    });
  });

  test('exposes public Foothold and battle Asset-use restriction state without leaking internal Resistance bookkeeping', () => {
    const state = stateWithBattleRuntime();
    state.battleRuntime!.footholdAssetWindowPlayer = 'B';
    state.battleRuntime!.footholdAssetWindowResolved = false;
    state.battleRuntime!.assetUseProhibitedPlayers = ['A'];
    state.battleRuntime!.resistanceAssetOnsetProcessedInstanceIds = [
      'internal-resistance-instance',
    ];

    for (const viewer of ['A', 'B'] as const) {
      const view = viewV070GameForPlayer(state, viewer);
      expect(view.battleRuntime?.footholdAssetWindowPlayer).toBe('B');
      expect(view.battleRuntime?.footholdAssetWindowResolved).toBe(false);
      expect(view.battleRuntime?.assetUseProhibitedPlayers).toEqual(['A']);
      expect(view.battleRuntime)
        .not.toHaveProperty('resistanceAssetOnsetProcessedInstanceIds');
    }
  });

  test('shows Fortifications Onset candidate identities only to the defending chooser', () => {
    const state = stateWithBattleRuntime();
    const first = injectBanked(
      state,
      'B',
      'neutral-fortifications',
      'fortifications-first',
    );
    const second = injectBanked(
      state,
      'B',
      'neutral-fortifications',
      'fortifications-second',
    );
    state.battleRuntime!.pendingFortificationsAssetOnset = {
      playerId: 'B',
      candidateAssetInstanceIds: [first, second],
    };

    const chooser = viewV070GameForPlayer(state, 'B');
    const opponent = viewV070GameForPlayer(state, 'A');

    expect(chooser.battleRuntime?.pendingFortificationsAssetOnset).toEqual({
      playerId: 'B',
      candidateCount: 2,
      candidateAssetInstanceIds: [first, second],
    });
    expect(opponent.battleRuntime?.pendingFortificationsAssetOnset).toEqual({
      playerId: 'B',
      candidateCount: 2,
    });
    expect(chooser.battleRuntime)
      .not.toHaveProperty('fortificationsScheduledEffects');
    expect(opponent.battleRuntime)
      .not.toHaveProperty('fortificationsPostTacticsProcessedSourceInstanceIds');
  });

  test('hides Fortifications post-reveal Tactic eligibility from the opponent', () => {
    const state = stateWithBattleRuntime();
    state.battleRuntime!.pendingFortificationsPostTactics = {
      playerId: 'B',
      sourceInstanceId: 'fortifications-source',
      drawnInstanceIds: ['drawn-1', 'drawn-2'],
      candidateTacticInstanceIds: ['drawn-2'],
    };

    const chooser = viewV070GameForPlayer(state, 'B');
    const opponent = viewV070GameForPlayer(state, 'A');

    expect(chooser.battleRuntime?.pendingFortificationsPostTactics).toEqual({
      playerId: 'B',
      sourceInstanceId: 'fortifications-source',
      drawnCount: 2,
      candidateCount: 1,
      candidateTacticInstanceIds: ['drawn-2'],
    });
    expect(opponent.battleRuntime?.pendingFortificationsPostTactics).toEqual({
      playerId: 'B',
      sourceInstanceId: 'fortifications-source',
      drawnCount: 2,
    });
    expect(chooser.battleRuntime)
      .not.toHaveProperty('fortificationsCaptureEffects');
    expect(opponent.battleRuntime)
      .not.toHaveProperty('fortificationsScheduledEffects');
  });
});