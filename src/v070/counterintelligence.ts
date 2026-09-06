import {
  appendV070Event,
  type V070GameState,
} from './engine';
import { faceUpV070AssetInstanceIds } from './asset-face-state';
import type { PlayerId } from './rules';

export const V070_COUNTERINTELLIGENCE_ID =
  'neutral-counterintelligence' as const;

export function v070CounterintelligenceAsset(
  state: V070GameState,
  playerId: PlayerId,
): string | null {
  return faceUpV070AssetInstanceIds(state, playerId).find(
    instanceId =>
      state.cardInstances[instanceId]?.cardId
        === V070_COUNTERINTELLIGENCE_ID,
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
