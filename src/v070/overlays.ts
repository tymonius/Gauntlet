import type {
  V070GameState,
  V070OverlayAttachment,
} from './engine';
import type { PlayerId } from './rules';
import * as previous from './overlays-pre-counterworks-authority';
import {
  preventV070OverlayPlacementWithCounterworks,
  v070CounterworksOverlayInactiveDuringBattle,
} from './counterworks-battle';

export * from './overlays-pre-counterworks-authority';

/**
 * Counterworks makes an Overlay's effect inactive; it does not uncover the
 * Territory beneath it. The physical top Overlay therefore remains the active
 * attachment for covering/control purposes. Battle-time Overlay effects must
 * separately honor v070CounterworksOverlayInactiveDuringBattle.
 */
export function activeV070Overlay(
  state: V070GameState,
  territoryPosition: number,
): V070OverlayAttachment | null {
  return previous.activeV070Overlay(state, territoryPosition);
}

export function activeV070OverlayAtBattleOnset(
  state: V070GameState,
  territoryPosition: number,
): string | null {
  return activeV070Overlay(state, territoryPosition)?.instanceId ?? null;
}

export function placeV070OverlayFromBattle(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
  territoryPosition: number,
  source: string,
): V070OverlayAttachment | null {
  if (preventV070OverlayPlacementWithCounterworks(
    state,
    owner,
    instanceId,
    territoryPosition,
    source,
  )) {
    return null;
  }
  return previous.placeV070OverlayFromBattle(
    state,
    owner,
    instanceId,
    territoryPosition,
    source,
  );
}

export function resolveV070OverlayAfterBattle(
  state: V070GameState,
  territoryPosition: number,
  activeOverlayAtOnset: string | null,
): void {
  previous.resolveV070OverlayAfterBattle(
    state,
    territoryPosition,
    activeOverlayAtOnset
      && v070CounterworksOverlayInactiveDuringBattle(
        state,
        activeOverlayAtOnset,
      )
      ? null
      : activeOverlayAtOnset,
  );
}
