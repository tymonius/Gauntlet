import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  type V070GameState,
} from './engine';
import {
  clearV070AssetFaceState,
  faceUpV070AssetInstanceIds,
  isV070AssetFaceUp,
  restoreV070AssetsAtTurnStart,
  turnV070AssetFaceDownUntilPlayerNextTurn,
} from './asset-face-state';
import {
  discardV070AssetVoluntarily,
  effectiveV070AssetLimit,
  voluntarilyDiscardableV070AssetInstanceIds,
} from './assets';
import { associateV070Sanction } from './sanctions';
import { viewV070GameForPlayer } from './views';

function game(): V070GameState {
  const state = createV070StarterGame({
    gameId: 'asset-face-state',
    seed: 'asset-face-state-seed',
    players: {
      A: {
        name: 'A',
        starterDeckId: 'diplomats-ambassador-open-channels',
      },
      B: {
        name: 'B',
        starterDeckId: 'military-commandant-holdfast',
      },
    },
  });
  state.turnNumber = 1;
  return state;
}

function injectBanked(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `face-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.assetBank.push(instanceId);
  return instanceId;
}

describe('v0.7.0 temporary Asset face-state core', () => {
  test('Assets are face up by default and a temporary face-down override is public state', () => {
    const state = game();
    const asset = injectBanked(
      state,
      'B',
      'neutral-counterintelligence',
      'target',
    );

    expect(isV070AssetFaceUp(state, asset)).toBe(true);
    expect(faceUpV070AssetInstanceIds(state, 'B')).toContain(asset);

    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: asset,
      changedBy: 'A',
      restoreAtPlayer: 'A',
      sourceInstanceId: 'sabotage-source',
      reason: 'Sabotage',
    });

    expect(isV070AssetFaceUp(state, asset)).toBe(false);
    expect(faceUpV070AssetInstanceIds(state, 'B')).not.toContain(asset);
    expect(state.assetFaceStates).toEqual([
      {
        instanceId: asset,
        owner: 'B',
        faceUp: false,
        changedBy: 'A',
        sourceInstanceId: 'sabotage-source',
        reason: 'Sabotage',
        appliedTurn: 1,
        restoreAtPlayer: 'A',
      },
    ]);

    const view = viewV070GameForPlayer(state, 'B');
    expect(view.assetFaceStates).toEqual(state.assetFaceStates);
    expect(view.players.B.zones.assetBank).toContainEqual({
      instanceId: asset,
      cardId: 'neutral-counterintelligence',
    });

    expect(state.events.some(event =>
      event.type === 'asset_turned_face_down'
      && (event.payload as { instanceId?: string })?.instanceId === asset
      && event.visibility === 'public'
    )).toBe(true);
  });

  test('temporary face state restores only at the specified player’s later turn start', () => {
    const state = game();
    const asset = injectBanked(
      state,
      'B',
      'neutral-counterintelligence',
      'restore',
    );

    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: asset,
      changedBy: 'A',
      restoreAtPlayer: 'A',
      reason: 'Sabotage',
    });

    state.turnNumber = 2;
    expect(restoreV070AssetsAtTurnStart(state, 'B')).toEqual([]);
    expect(isV070AssetFaceUp(state, asset)).toBe(false);

    state.turnNumber = 3;
    expect(restoreV070AssetsAtTurnStart(state, 'A')).toEqual([asset]);
    expect(isV070AssetFaceUp(state, asset)).toBe(true);
    expect(state.assetFaceStates).toEqual([]);
    expect(state.events.some(event =>
      event.type === 'asset_turned_face_up'
      && (event.payload as { instanceId?: string })?.instanceId === asset
    )).toBe(true);
  });

  test('a face-down Embargo remains banked but its Asset-limit penalty is suppressed', () => {
    const state = game();
    state.players.B.controlledTerritories = ['one', 'two', 'three'];
    const embargo = injectBanked(
      state,
      'A',
      'diplomats-sanctions-embargo',
      'embargo',
    );
    associateV070Sanction(state, {
      instanceId: embargo,
      owner: 'A',
      opponent: 'B',
      kind: 'asset',
    });

    expect(effectiveV070AssetLimit(state, 'B')).toBe(2);

    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: embargo,
      changedBy: 'B',
      restoreAtPlayer: 'B',
      reason: 'test suppression',
    });

    expect(state.players.A.zones.assetBank).toContain(embargo);
    expect(effectiveV070AssetLimit(state, 'B')).toBe(3);
  });

  test('face-down Rendition no longer imposes its printed discard-first priority', () => {
    const state = game();
    const rendition = injectBanked(
      state,
      'B',
      'intelligence-extraordinary-rendition',
      'rendition',
    );
    const other = injectBanked(
      state,
      'B',
      'neutral-counterintelligence',
      'other',
    );

    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'B'))
      .toEqual([rendition]);

    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: rendition,
      changedBy: 'A',
      restoreAtPlayer: 'A',
      reason: 'test suppression',
    });

    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'B'))
      .toEqual(expect.arrayContaining([rendition, other]));
  });

  test('face-down voluntary-discard restrictions are suppressed and departure clears stale face state', () => {
    const state = game();
    const armistice = injectBanked(
      state,
      'B',
      'neutral-armistice',
      'armistice',
    );

    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'B'))
      .not.toContain(armistice);

    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: armistice,
      changedBy: 'A',
      restoreAtPlayer: 'A',
      reason: 'test suppression',
    });

    expect(voluntarilyDiscardableV070AssetInstanceIds(state, 'B'))
      .toContain(armistice);

    discardV070AssetVoluntarily(
      state,
      'B',
      armistice,
      'test face-down departure',
    );

    expect(state.players.B.zones.assetBank).not.toContain(armistice);
    expect(state.players.B.zones.discardPile).toContain(armistice);
    expect(state.assetFaceStates).toEqual([]);
  });

  test('turning a non-banked or already face-down card face down is rejected', () => {
    const state = game();
    const hand = 'face-A-hand';
    state.cardInstances[hand] = {
      instanceId: hand,
      cardId: 'neutral-rallying-cry',
      owner: 'A',
    };
    state.players.A.zones.hand.push(hand);

    expect(() => turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: hand,
      changedBy: 'B',
      restoreAtPlayer: 'B',
      reason: 'invalid',
    })).toThrow(/currently banked Asset/);

    const banked = injectBanked(
      state,
      'A',
      'neutral-counterintelligence',
      'duplicate',
    );
    turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: banked,
      changedBy: 'B',
      restoreAtPlayer: 'B',
      reason: 'first',
    });

    expect(() => turnV070AssetFaceDownUntilPlayerNextTurn(state, {
      instanceId: banked,
      changedBy: 'B',
      restoreAtPlayer: 'B',
      reason: 'second',
    })).toThrow(/already face down/);

    clearV070AssetFaceState(state, banked);
    expect(isV070AssetFaceUp(state, banked)).toBe(true);
  });
});
