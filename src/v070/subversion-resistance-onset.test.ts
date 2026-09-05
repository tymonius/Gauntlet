import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';

function readyGame(
  aStarter = 'military-general-forward-doctrine',
  bStarter = 'military-commandant-holdfast',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'subversion-resistance-onset-test',
    seed: 'subversion-resistance-onset-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: aStarter },
      B: { name: 'Bravo', starterDeckId: bStarter },
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

function counterattackBattle(
  aStarter?: string,
  bStarter?: string,
): V070GameState {
  let state = readyGame(aStarter, bStarter);
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'A';

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
    choice: 'advance',
  });
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `resistance-onset-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.assetBank.push(instanceId);
  return instanceId;
}

describe('v0.7.0 Subversion against Resistance Onset Asset', () => {
  test('pauses before a banked Resistance grants +2 Reserve, then pass applies it and resumes the original Onset action', () => {
    let state = counterattackBattle();
    const resistance = inject(state, 'B', 'neutral-resistance', 'pass-target');
    const subversion = inject(state, 'A', 'intelligence-subversion', 'pass-source');

    expect(state.battleRuntime).toBeNull();
    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('onset');
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(0);
    expect(state.battleRuntime?.pendingSubversionAssetBattle)
      .toEqual(expect.objectContaining({
        playerId: 'A',
        targetOwner: 'B',
        targetAssetInstanceId: resistance,
        effectLabel: 'Resistance',
        resistanceOnsetResumeAction: {
          type: 'proceed_from_onset',
          playerId: 'A',
        },
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });

    expect(state.players.A.zones.assetBank).toContain(subversion);
    expect(state.players.B.zones.assetBank).toContain(resistance);
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(2);
    expect(state.battleRuntime?.resistanceAssetOnsetProcessedInstanceIds)
      .toContain(resistance);
    expect(state.battleRuntime?.pendingSubversionAssetBattle).toBeNull();
    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });

  test('using Subversion negates one Resistance before its Reserve bonus and resumes the original Onset action', () => {
    let state = counterattackBattle();
    const resistance = inject(state, 'B', 'neutral-resistance', 'use-target');
    const subversion = inject(state, 'A', 'intelligence-subversion', 'use-source');

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.A.zones.assetBank).not.toContain(subversion);
    expect(state.players.A.zones.graveyard).toContain(subversion);
    expect(state.players.B.zones.assetBank).not.toContain(resistance);
    expect(state.players.B.zones.discardPile).toContain(resistance);
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(0);
    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });

  test('one Subversion can negate one of two Resistance copies while the other still applies', () => {
    let state = counterattackBattle();
    const first = inject(state, 'B', 'neutral-resistance', 'first');
    const second = inject(state, 'B', 'neutral-resistance', 'second');
    const subversion = inject(state, 'A', 'intelligence-subversion', 'single');

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    expect(state.battleRuntime?.pendingSubversionAssetBattle
      ?.targetAssetInstanceId).toBe(first);

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.B.zones.discardPile).toContain(first);
    expect(state.players.B.zones.assetBank).toContain(second);
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(2);
    expect(state.battleRuntime?.resistanceAssetOnsetProcessedInstanceIds)
      .toContain(second);
    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });

  test('multiple Resistance copies open distinct Subversion windows in bank order', () => {
    let state = counterattackBattle();
    const first = inject(state, 'B', 'neutral-resistance', 'chain-first');
    const second = inject(state, 'B', 'neutral-resistance', 'chain-second');
    const firstSubversion = inject(state, 'A', 'intelligence-subversion', 'chain-sub-1');
    const secondSubversion = inject(state, 'A', 'intelligence-subversion', 'chain-sub-2');

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    expect(state.battleRuntime?.pendingSubversionAssetBattle
      ?.targetAssetInstanceId).toBe(first);

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });

    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(2);
    expect(state.battleRuntime?.pendingSubversionAssetBattle
      ?.targetAssetInstanceId).toBe(second);
    expect(state.battleRuntime?.pendingSubversionAssetBattle
      ?.candidateSubversionInstanceIds)
      .toEqual([firstSubversion, secondSubversion]);
    expect(state.battleRuntime?.stage).toBe('onset');

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: firstSubversion,
    });

    expect(state.players.B.zones.assetBank).toContain(first);
    expect(state.players.B.zones.discardPile).toContain(second);
    expect(state.players.A.zones.graveyard).toContain(firstSubversion);
    expect(state.players.A.zones.assetBank).toContain(secondSubversion);
    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(2);
    expect(state.battleRuntime?.stage).toBe('set_gambits');
  });

  test('finishes runtime initialization before replaying an interrupted Terms offer', () => {
    let state = counterattackBattle(
      'diplomats-ambassador-open-channels',
      'military-commandant-holdfast',
    );
    const resistance = inject(state, 'B', 'neutral-resistance', 'terms-target');
    inject(state, 'A', 'intelligence-subversion', 'terms-source');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'open-channels',
    });

    expect(state.battleRuntime?.terms.stage).toBe('closed');
    expect(state.battleRuntime?.pendingSubversionAssetBattle
      ?.resistanceOnsetResumeAction)
      .toEqual({
        type: 'offer_terms',
        playerId: 'A',
        proposalId: 'open-channels',
      });

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });

    expect(state.battleRuntime?.participants.B.reserveBonus).toBe(2);
    expect(state.players.B.zones.assetBank).toContain(resistance);
    expect(state.battleRuntime?.terms.stage).toBe('response');
    expect(state.battleRuntime?.terms.offerer).toBe('A');
    expect(state.battleRuntime?.terms.proposalId).toBe('open-channels');
    expect(state.battleRuntime?.stage).toBe('onset');
  });
});
