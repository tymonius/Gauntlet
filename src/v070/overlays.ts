import type { V070GameState } from './engine';
import type { PlayerId } from './rules';
import * as previous from './overlays-pre-capital-gains';
import { pauseV070DeferredBattleAftermathCarrier } from './battle-aftermath';
import { V070_CAPITAL_GAINS_ID } from './capital-gains-battle';

export * from './overlays-pre-capital-gains';

export function placeV070OverlayFromBattle(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
  territoryPosition: number,
  source: string,
): ReturnType<typeof previous.placeV070OverlayFromBattle> {
  if (state.cardInstances[instanceId]?.cardId === V070_CAPITAL_GAINS_ID) {
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
