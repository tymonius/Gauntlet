import type {
  V070GameState,
  V070OverlayAttachment,
} from './engine';
import type { PlayerId } from './rules';
import {
  placeV070OverlayFromBattle as placeV070OverlayFromBattlePrevious,
} from './overlays-pre-deferred';
import { pauseV070DeferredBattleAftermathCarrier } from './battle-aftermath';

export {
  V070_DEMILITARIZED_ZONE_ID,
  activeV070Overlay,
  activeV070OverlayAtBattleOnset,
  cardIdForV070Overlay,
  discardV070Overlay,
  expireV070TerritoryTurnRestrictions,
  graveyardV070Overlay,
  openV070StartTurnOverlayChoice,
  placeV070OverlayFromHand,
  placeV070OverlayFromPendingAction,
  registerV070DmzEntryLock,
  replaceV070CaptureWithOverlay,
  resolveV070OverlayAfterBattle,
  resolveV070OverlayCaptureEffects,
  resolveV070OverlayEntryRequirements,
  resolveV070StartTurnOverlayChoice,
  v070DmzBlocksEntryThisTurn,
  v070OverlaysAt,
  withdrawV070PlayersFromNewDemilitarizedZone,
} from './overlays-pre-deferred';

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
): V070OverlayAttachment | null {
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
