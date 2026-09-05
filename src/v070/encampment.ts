import { v070CanonicalContent } from '../content/v070';
import {
  appendV070Event,
  type V070GameState,
} from './engine';
import { gainV070MilitaryCommandFromEffect } from './military';
import {
  activeV070Overlay,
  cardIdForV070Overlay,
} from './overlays';
import type { PlayerId } from './rules';

export const V070_ENCAMPMENT_ID = 'military-encampment' as const;
export const V070_ENCAMPMENT_OVERLAY_TEXT =
  "At the end of this card's owner's turn, if they occupy and control this Territory, +1 Command. When another player gains control of this Territory, put this card in its owner's Graveyard." as const;

function validateV070EncampmentAuthority(): void {
  const card = v070CanonicalContent.cardsById.get(V070_ENCAMPMENT_ID);
  const overlay = card?.effects.find(effect => effect.label === 'Overlay');
  if (!card || overlay?.text !== V070_ENCAMPMENT_OVERLAY_TEXT) {
    throw new Error('v0.7.0 Encampment Overlay text drifted from released authority.');
  }
}

validateV070EncampmentAuthority();

export function resolveV070EncampmentEndOfTurn(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  if (state.activePlayer !== playerId
    || state.turnState?.phase !== 'cleanup') {
    return false;
  }

  const position = state.players[playerId].position;
  if (!Number.isInteger(position)) return false;
  const territory = state.board.find(space => space.position === position);
  if (!territory
    || territory.occupant !== playerId
    || territory.controller !== playerId) {
    return false;
  }

  const active = activeV070Overlay(state, territory.position);
  if (!active
    || active.owner !== playerId
    || cardIdForV070Overlay(state, active) !== V070_ENCAMPMENT_ID) {
    return false;
  }

  gainV070MilitaryCommandFromEffect(
    state,
    playerId,
    1,
    'Encampment end of turn',
    active.instanceId,
  );
  appendV070Event(state, {
    type: 'encampment_end_turn_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      overlayInstanceId: active.instanceId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      command: state.players[playerId].military?.command ?? null,
    },
  });
  return true;
}
