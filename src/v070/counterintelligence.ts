import {
  appendV070Event,
  type V070GameState,
} from './engine';
import { isV070AssetUsable } from './asset-face-state';
import type { PlayerId } from './rules';

export const V070_COUNTERINTELLIGENCE_ID =
  'neutral-counterintelligence' as const;

export function v070CounterintelligenceAsset(
  state: V070GameState,
  playerId: PlayerId,
): string | null {
  return state.players[playerId].zones.assetBank.find(
    instanceId =>
      state.cardInstances[instanceId]?.cardId
        === V070_COUNTERINTELLIGENCE_ID
      && isV070AssetUsable(state, instanceId),
  ) ?? null;
}

export function preventV070OpposingHandReveal(
  state: V070GameState,
  actor: PlayerId,
  owner: PlayerId,
  purpose: string,
  sourceInstanceId?: string | null,
): boolean {
  if (actor === owner) return false;

  const counterintelligenceInstanceId =
    v070CounterintelligenceAsset(state, owner);
  if (!counterintelligenceInstanceId) return false;

  appendV070Event(state, {
    type: 'counterintelligence_prevented_reveal',
    actor: owner,
    visibility: 'public',
    payload: {
      protectedPlayer: owner,
      opposingPlayer: actor,
      purpose,
      sourceInstanceId: sourceInstanceId ?? null,
      assetInstanceId: counterintelligenceInstanceId,
      cardId: V070_COUNTERINTELLIGENCE_ID,
      zone: 'hand',
    },
  });
  return true;
}

/**
 * Counterintelligence's banked Asset prevents the entire opposing revealing
 * effect when that effect would reveal one of its controller's face-down
 * battle cards. Rules-mandated reveals do not use this path.
 */
export function preventV070OpposingBattleCardReveal(
  state: V070GameState,
  actor: PlayerId,
  owner: PlayerId,
  input: {
    purpose: string;
    sourceInstanceId?: string | null;
    targetInstanceId: string;
    role: 'gambit' | 'tactic';
  },
): boolean {
  if (actor === owner) return false;

  const counterintelligenceInstanceId =
    v070CounterintelligenceAsset(state, owner);
  if (!counterintelligenceInstanceId) return false;

  appendV070Event(state, {
    type: 'counterintelligence_prevented_reveal',
    actor: owner,
    visibility: 'public',
    payload: {
      protectedPlayer: owner,
      opposingPlayer: actor,
      purpose: input.purpose,
      sourceInstanceId: input.sourceInstanceId ?? null,
      targetInstanceId: input.targetInstanceId,
      assetInstanceId: counterintelligenceInstanceId,
      cardId: V070_COUNTERINTELLIGENCE_ID,
      zone: input.role,
    },
  });
  return true;
}
