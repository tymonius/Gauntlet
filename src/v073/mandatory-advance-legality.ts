import type { V070GameState } from '../v070/engine';
import type { PlayerId } from '../v070/rules';
import {
  activeV070Overlay,
  cardIdForV070Overlay,
  v070DmzBlocksEntryThisTurn,
  V070_DEMILITARIZED_ZONE_ID,
} from '../v070/overlays-pre-counterworks-authority';
import { v070TollBridgeAdvanceCostActive } from '../v070/territories-core';

/**
 * Preflight only movement constraints that are intrinsically impossible to
 * satisfy from the current state. Omitting a required discard when one is
 * available is a retriable player-action error, NOT an impossible Advance.
 *
 * Actual movement still passes through the ordinary turn reducer so it owns
 * costs, occupancy, battles, and any new restrictions added later.
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

  if (destinationTerritory && v070DmzBlocksEntryThisTurn(state, destination)) {
    return 'Demilitarized Zone forbids entering that Territory this turn.';
  }

  const overlay = destinationTerritory
    ? activeV070Overlay(state, destination)
    : null;
  const dmzEntryDiscardNeeded = Boolean(
    overlay
    && cardIdForV070Overlay(state, overlay) === V070_DEMILITARIZED_ZONE_ID
    && destinationTerritory?.occupant === null,
  );
  // Mirror the existing movement reducer's Toll Bridge payment check;
  // no cost is waived by this clarification.
  const tollDiscardNeeded = Boolean(
    destinationTerritory
    && v070TollBridgeAdvanceCostActive(state, owner, position),
  );
  const requiredHandCards = Number(dmzEntryDiscardNeeded) + Number(tollDiscardNeeded);
  if (state.players[owner].zones.hand.length < requiredHandCards) {
    return 'The required Territory/Overlay entry cost cannot be paid.';
  }
  return null;
}
