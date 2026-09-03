import {
  V070GameActionError,
  appendV070Event,
  type V070AssetFaceState,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  v070DisruptedSupplyLinesAssetActive,
  v070PlayerAssetsInactiveByContinuousTerritory,
} from './territories';

export function isV070AssetFaceUp(
  state: V070GameState,
  instanceId: string,
): boolean {
  return !state.assetFaceStates.some(face => face.instanceId === instanceId);
}

export function isV070AssetActive(
  state: V070GameState,
  instanceId: string,
): boolean {
  const owner = assetOwnerInBank(state, instanceId);
  if (!owner) return false;
  if (!isV070AssetBaseActive(state, owner, instanceId)) return false;
  return !v070IllegalOccupationSuppressesPlayerAssets(
    state,
    owner,
  );
}

function isV070AssetBaseActive(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
): boolean {
  if (!isV070AssetFaceUp(state, instanceId)) return false;
  if (state.battleRuntime?.assetInactivePlayers.includes(owner)) {
    return false;
  }
  if (v070PlayerAssetsInactiveByContinuousTerritory(
    state,
    owner,
  )) {
    return false;
  }
  if (!v070DisruptedSupplyLinesAssetActive(
    state,
    owner,
    instanceId,
  )) {
    return false;
  }
  return true;
}

function v070IllegalOccupationSuppressesPlayerAssets(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const opponentId: PlayerId = playerId === 'A' ? 'B' : 'A';
  const position = state.players[playerId].position;
  if (position === null) return false;

  const territory = state.board.find(candidate =>
    candidate.position === position
  );
  if (!territory
    || territory.occupant !== playerId
    || territory.controller !== opponentId) {
    return false;
  }

  return state.players[opponentId].zones.assetBank.some(instanceId =>
    state.cardInstances[instanceId]?.cardId
      === 'neutral-illegal-occupation'
    && isV070AssetBaseActive(
      state,
      opponentId,
      instanceId,
    )
  );
}

export function faceUpV070AssetInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
): string[] {
  return state.players[playerId].zones.assetBank.filter(instanceId =>
    isV070AssetFaceUp(state, instanceId)
  );
}

export function turnV070AssetFaceDownUntilPlayerNextTurn(
  state: V070GameState,
  input: {
    instanceId: string;
    changedBy: PlayerId;
    restoreAtPlayer: PlayerId;
    sourceInstanceId?: string | null;
    reason: string;
  },
): void {
  const owner = assetOwnerInBank(state, input.instanceId);
  if (!owner) {
    throw new V070GameActionError(
      'Only a currently banked Asset can be turned face down.',
    );
  }
  if (!isV070AssetFaceUp(state, input.instanceId)) {
    throw new V070GameActionError('That Asset is already face down.');
  }

  state.assetFaceStates.push({
    instanceId: input.instanceId,
    owner,
    faceUp: false,
    changedBy: input.changedBy,
    sourceInstanceId: input.sourceInstanceId ?? null,
    reason: input.reason,
    appliedTurn: state.turnNumber,
    restoreAtPlayer: input.restoreAtPlayer,
  });

  appendV070Event(state, {
    type: 'asset_turned_face_down',
    actor: input.changedBy,
    visibility: 'public',
    payload: {
      instanceId: input.instanceId,
      cardId: state.cardInstances[input.instanceId]?.cardId,
      owner,
      reason: input.reason,
      sourceInstanceId: input.sourceInstanceId ?? null,
      appliedTurn: state.turnNumber,
      restoreAtPlayer: input.restoreAtPlayer,
    },
  });
}

export function restoreV070AssetsAtTurnStart(
  state: V070GameState,
  startingPlayer: PlayerId,
): string[] {
  const restored: string[] = [];
  const remaining: V070AssetFaceState[] = [];

  for (const face of state.assetFaceStates) {
    const due = face.restoreAtPlayer === startingPlayer
      && face.appliedTurn < state.turnNumber;
    if (!due) {
      remaining.push(face);
      continue;
    }

    const stillBanked = state.players[face.owner].zones.assetBank
      .includes(face.instanceId);
    if (stillBanked) {
      restored.push(face.instanceId);
      appendV070Event(state, {
        type: 'asset_turned_face_up',
        actor: startingPlayer,
        visibility: 'public',
        payload: {
          instanceId: face.instanceId,
          cardId: state.cardInstances[face.instanceId]?.cardId,
          owner: face.owner,
          reason: face.reason,
          sourceInstanceId: face.sourceInstanceId,
          restoredTurn: state.turnNumber,
        },
      });
    }
  }

  state.assetFaceStates = remaining;
  return restored;
}

export function clearV070AssetFaceState(
  state: V070GameState,
  instanceId: string,
): void {
  state.assetFaceStates = state.assetFaceStates.filter(
    face => face.instanceId !== instanceId,
  );
}

function assetOwnerInBank(
  state: V070GameState,
  instanceId: string,
): PlayerId | null {
  for (const playerId of ['A', 'B'] as const) {
    if (state.players[playerId].zones.assetBank.includes(instanceId)) {
      return playerId;
    }
  }
  return null;
}
