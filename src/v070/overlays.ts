import type {
  V070GameState,
  V070OverlayAttachment,
} from './engine';
import type { PlayerId } from './rules';
import {
  placeV070OverlayFromBattle as placeV070OverlayFromBattlePrevious,
} from './overlays-pre-deferred';
import { pauseV070DeferredBattleAftermathCarrier } from './battle-aftermath';

export * from './overlays-pre-deferred';

const V070_DEFERRED_BATTLE_AFTERMATH_IDS = new Set([
  'inquisition-accusation',
  'inquisition-act-of-faith',
]);

export function placeV070OverlayFromBattle(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
  territoryPosition: number,
  source: string,
): V070OverlayAttachment {
  const cardId = state.cardInstances[instanceId]?.cardId;
  if (cardId && V070_DEFERRED_BATTLE_AFTERMATH_IDS.has(cardId)) {
    pauseV070DeferredBattleAftermathCarrier(state, instanceId);
  }

  return placeV070OverlayFromBattlePrevious(
    state,
    owner,
    instanceId,
    territoryPosition,
    source,
  );
}
