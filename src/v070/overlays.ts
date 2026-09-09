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
 * Counterworks makes the chosen exposed Overlay inactive for this battle but
 * does not uncover the Territory beneath it. Callers asking for the active
 * Overlay therefore see no active Overlay effect while the physical attachment
 * remains in state.overlays.
 */
export function activeV070Overlay(
  state: V070GameState,
  territoryPosition: number,
): V070OverlayAttachment | null {
  const active = previous.activeV070Overlay(state, territoryPosition);
  if (active
    && v070CounterworksOverlayInactiveDuringBattle(state, active.instanceId)) {
    return null;
  }
  return active;
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
