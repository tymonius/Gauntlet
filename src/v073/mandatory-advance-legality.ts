import type { V070GameState } from '../v070/engine';
import type { PlayerId } from '../v070/rules';

/**
 * Preflight only movement constraints that are intrinsically impossible to
 * satisfy from the current state. Omitting a required discard when one is
 * available is a retriable player-action error, NOT an impossible Advance.
 *
 * This low-level check intentionally has no runtime engine imports: the
 * normal turn reducer still owns actual movement legality, Overlay entry,
 * movement costs, Onset, and effects when a movement is performed.
 */
export function v073UnfulfillableAdvanceReason(
  state: V070GameState,
  owner: PlayerId,
): string | null {
  const position = state.players[owner].position;
  if (position === null) return 'The movement controller has no legal Position.';
  const destination = position + (owner === 'A' ? 1 : -1);
  const opponentPosition = state.players[owner === 'A' ? 'B' : 'A'].position;
  const destinationTerritory = state.board.find(t => t.position === destination);

  // Outside the opponent's end is legal only for a Last Stand against an
  // opponent actually at that extended Position.
  if (!destinationTerritory && opponentPosition !== destination) {
    return 'No legal Position exists for the mandatory Advance.';
  }

  if (destinationTerritory && state.territoryTurnRestrictions.some(restriction =>
    restriction.kind === 'no_entry'
    && restriction.source === 'demilitarized_zone'
    && restriction.territoryInstanceId === destinationTerritory.territoryInstanceId
    && restriction.turnNumber === state.turnNumber
  )) {
    return 'Demilitarized Zone forbids entering that Territory this turn.';
  }

  // Mirror activeV070Overlay's topmost Overlay rule without importing its
  // engine-dependent module (which creates a circular turn-engine import).
  const activeOverlayOn = (territoryInstanceId: string) =>
    state.overlays.filter(overlay =>
      overlay.territoryInstanceId === territoryInstanceId,
    ).reduce((active, overlay) =>
      !active || overlay.sequence > active.sequence ? overlay : active,
    null as (typeof state.overlays)[number] | null);
  const overlay = destinationTerritory
    ? activeOverlayOn(destinationTerritory.territoryInstanceId)
    : null;
  const dmzEntryDiscardNeeded = Boolean(
    overlay
    && state.cardInstances[overlay.instanceId]?.cardId === 'diplomats-demilitarized-zone'
    && destinationTerritory?.occupant === null,
  );
  // Mirror v070TollBridgeAdvanceCostActive's printed/unsuppressed condition,
  // including the overlay masking and movement-window suppression rules.
  const originTerritory = state.board.find(t => t.position === position);
  const tollDiscardNeeded = Boolean(
    destinationTerritory
    && originTerritory?.territoryId === 'territory-toll-bridge'
    && !originTerritory.blank
    && !activeOverlayOn(originTerritory.territoryInstanceId)
    && !state.territoryEffectSuppressions.some(suppression =>
      suppression.territoryInstanceId === originTerritory.territoryInstanceId
      && suppression.turnNumber === state.turnNumber
      && suppression.playerId === owner
      && (suppression.scope === 'movement' || suppression.scope === 'turn'),
    ),
  );
  const requiredHandCards = Number(dmzEntryDiscardNeeded) + Number(tollDiscardNeeded);
  if (state.players[owner].zones.hand.length < requiredHandCards) {
    return 'The required Territory/Overlay entry cost cannot be paid.';
  }
  return null;
}
