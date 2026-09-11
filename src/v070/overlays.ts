import type { V070GameState } from './engine';
import type { PlayerId } from './rules';
import * as previous from './overlays-pre-capital-gains';
import { pauseV070DeferredBattleAftermathCarrier } from './battle-aftermath';
import { V070_CAPITAL_GAINS_ID } from './capital-gains-battle';
import { V070_EXCOMMUNICATION_ID } from './excommunication-battle';
import { V070_SUPPLIES_ID } from './supplies-battle';

export * from './overlays-pre-capital-gains';

export function placeV070OverlayFromBattle(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
  territoryPosition: number,
  source: string,
): ReturnType<typeof previous.placeV070OverlayFromBattle> {
  const cardId = state.cardInstances[instanceId]?.cardId;
  if (cardId === V070_CAPITAL_GAINS_ID
    || cardId === V070_EXCOMMUNICATION_ID
    || cardId === V070_SUPPLIES_ID) {
    pauseV070DeferredBattleAftermathCarrier(state, instanceId);
  }
  return previous.placeV070OverlayFromBattle(
    state,
    owner,
    instanceId,
    territoryPosition,
    source,
  );
}
