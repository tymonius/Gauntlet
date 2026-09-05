import { v070CanonicalContent } from '../content/v070';
import {
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  activeV070Overlay,
  cardIdForV070Overlay,
  graveyardV070Overlay,
} from './overlays';
import type { PlayerId } from './rules';

export const V070_PROTRACTED_SIEGE_ID = 'neutral-protracted-siege' as const;
export const V070_PROTRACTED_SIEGE_BATTLE_TEXT =
  'In the Aftermath, if you lose while defending a Territory you control, place this Overlay there.' as const;
export const V070_PROTRACTED_SIEGE_OVERLAY_TEXT =
  'When the opponent would capture this Territory, prevent that capture, then put this card in your Graveyard. If the opposing Player Token leaves first, put this card in your Graveyard.' as const;

function validateV070ProtractedSiegeAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_PROTRACTED_SIEGE_ID);
  const battleEffect = card?.effects.find(
    effect => effect.label === 'Gambit/Tactic',
  );
  const overlayEffect = card?.effects.find(
    effect => effect.label === 'Overlay',
  );
  if (!card || battleEffect?.text !== V070_PROTRACTED_SIEGE_BATTLE_TEXT) {
    throw new Error(
      'v0.7.0 Protracted Siege Gambit/Tactic text drifted from released authority.',
    );
  }
  if (overlayEffect?.text !== V070_PROTRACTED_SIEGE_OVERLAY_TEXT) {
    throw new Error(
      'v0.7.0 Protracted Siege Overlay text drifted from released authority.',
    );
  }
}

validateV070ProtractedSiegeAuthority();

/**
 * Protracted Siege shares the generic mandatory Overlay-placement scheduler,
 * but its later outcome gate is owner-loss rather than owner-win. The battle
 * facade calls this once at the first shared Aftermath entry, before the core
 * scheduler can inspect the placement queue.
 */
export function pruneV070ProtractedSiegeAftermathPlacements(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) return;

  runtime.battleCardAftermathOverlayPlacements =
    runtime.battleCardAftermathOverlayPlacements.filter(placement =>
      placement.sourceCardId !== V070_PROTRACTED_SIEGE_ID
      || battle.loser === placement.owner
    );
}

export function preventV070CaptureWithProtractedSiege(
  state: V070GameState,
  territoryPosition: number,
  capturingPlayer: PlayerId,
  source: string,
): boolean {
  const active = activeV070Overlay(state, territoryPosition);
  if (!active
    || active.owner === capturingPlayer
    || cardIdForV070Overlay(state, active) !== V070_PROTRACTED_SIEGE_ID) {
    return false;
  }

  appendV070Event(state, {
    type: 'territory_capture_prevented',
    actor: active.owner,
    visibility: 'public',
    payload: {
      source: 'Protracted Siege',
      overlayInstanceId: active.instanceId,
      territoryPosition,
      capturingPlayer,
      attemptedBy: capturingPlayer,
      captureSource: source,
    },
  });
  graveyardV070Overlay(
    state,
    active.instanceId,
    `Protracted Siege prevented capture (${source})`,
  );
  return true;
}

export function resolveV070ProtractedSiegeDepartures(
  state: V070GameState,
  previousPositions: Record<PlayerId, number>,
  currentPositions: Record<PlayerId, number>,
): void {
  for (const playerId of ['A', 'B'] as const) {
    const from = previousPositions[playerId];
    const to = currentPositions[playerId];
    if (from === to) continue;

    const active = activeV070Overlay(state, from);
    if (!active
      || active.owner === playerId
      || cardIdForV070Overlay(state, active) !== V070_PROTRACTED_SIEGE_ID) {
      continue;
    }

    graveyardV070Overlay(
      state,
      active.instanceId,
      `Protracted Siege opposing Player Token left Position ${from}`,
    );
  }
}
