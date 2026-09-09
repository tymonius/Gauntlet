import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
  type V070OverlayAttachment,
} from './engine';
import type { PlayerId } from './rules';
import * as previous from './overlays-pre-deferred';
import { pauseV070DeferredBattleAftermathCarrier } from './battle-aftermath';
import {
  isV070RuinsOverlay,
  turnV070OverlayIntoRuins,
} from './overlay-ruins';

export {
  V070_DEMILITARIZED_ZONE_ID,
  cardIdForV070Overlay,
  discardV070Overlay,
  expireV070TerritoryTurnRestrictions,
  graveyardV070Overlay,
  openV070StartTurnOverlayChoice,
  placeV070OverlayFromHand,
  placeV070OverlayFromPendingAction,
  registerV070DmzEntryLock,
  replaceV070CaptureWithOverlay,
  resolveV070OverlayEntryRequirements,
  resolveV070StartTurnOverlayChoice,
  v070DmzBlocksEntryThisTurn,
  v070OverlaysAt,
  withdrawV070PlayersFromNewDemilitarizedZone,
} from './overlays-pre-deferred';

export { isV070RuinsOverlay, turnV070OverlayIntoRuins } from './overlay-ruins';

export const V070_BOMBARDMENT_ID = 'neutral-bombardment' as const;

const V070_DEFERRED_BATTLE_AFTERMATH_IDS = new Set([
  'inquisition-accusation',
  'inquisition-act-of-faith',
  'inquisition-burning-at-the-stake',
]);

/**
 * Returns the top exposed Overlay. A Ruins Overlay has no printed Overlay
 * effect, but it remains exposed and continues to supersede the Territory
 * beneath it until it leaves play.
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
): V070OverlayAttachment {
  const cardId = state.cardInstances[instanceId]?.cardId;
  if (cardId && V070_DEFERRED_BATTLE_AFTERMATH_IDS.has(cardId)) {
    pauseV070DeferredBattleAftermathCarrier(state, instanceId);
  }

  const territory = state.board.find(item => item.position === territoryPosition);
  if (!territory) {
    throw new V070GameActionError(
      'An Overlay must be attached to a Territory in the Gauntlet.',
    );
  }

  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  const hasOverlayEffect = card?.effects.some(effect => effect.label === 'Overlay') ?? false;
  if (!card || (card.card_form !== 'Territory Overlay' && !hasOverlayEffect)) {
    throw new V070GameActionError(
      'That card is not a released Territory Overlay and has no released Overlay effect.',
    );
  }

  const overlay: V070OverlayAttachment = {
    instanceId,
    owner,
    territoryInstanceId: territory.territoryInstanceId,
    placedTurn: state.turnNumber,
    sequence: state.nextOverlaySequence,
  };
  state.nextOverlaySequence += 1;
  state.overlays.push(overlay);

  appendV070Event(state, {
    type: 'overlay_placed',
    actor: owner,
    visibility: 'public',
    payload: {
      instanceId,
      cardId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      territoryId: territory.territoryId,
      source,
      sequence: overlay.sequence,
    },
  });

  return overlay;
}

export function resolveV070OverlayCaptureEffects(
  state: V070GameState,
  territoryPosition: number,
  source: string,
): void {
  previous.resolveV070OverlayCaptureEffects(
    state,
    territoryPosition,
    source,
  );

  for (const overlay of previous.v070OverlaysAt(state, territoryPosition)) {
    if (isV070RuinsOverlay(overlay)) continue;
    if (previous.cardIdForV070Overlay(state, overlay) !== V070_BOMBARDMENT_ID) {
      continue;
    }
    turnV070OverlayIntoRuins(
      state,
      overlay.instanceId,
      `bombardment_territory_capture_without_battle (${source})`,
    );
  }
}

export function resolveV070OverlayAfterBattle(
  state: V070GameState,
  territoryPosition: number,
  activeOverlayAtOnset: string | null,
): void {
  previous.resolveV070OverlayAfterBattle(
    state,
    territoryPosition,
    activeOverlayAtOnset,
  );

  const battle = state.battle;
  if (!battle?.winner || !battle.loser) return;

  const bombardments = previous.v070OverlaysAt(state, territoryPosition)
    .filter(overlay =>
      !isV070RuinsOverlay(overlay)
      && overlay.owner === battle.attacker
      && previous.cardIdForV070Overlay(state, overlay) === V070_BOMBARDMENT_ID
    );

  for (const overlay of bombardments) {
    if (battle.winner === overlay.owner) {
      turnV070OverlayIntoRuins(
        state,
        overlay.instanceId,
        'bombardment_attack_win',
      );
    } else if (battle.loser === overlay.owner) {
      previous.graveyardV070Overlay(
        state,
        overlay.instanceId,
        'bombardment_attack_loss',
      );
    }
  }
}