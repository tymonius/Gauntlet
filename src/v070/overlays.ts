import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
  type V070OverlayAttachment,
} from './engine';
import {
  retreatV070Position,
  type PlayerId,
} from './rules';
import { openV070BlockadeChoicesForPositionChange } from './movement-triggers';

export const V070_DEMILITARIZED_ZONE_ID = 'diplomats-demilitarized-zone';

export function v070OverlaysAt(
  state: V070GameState,
  territoryPosition: number,
): V070OverlayAttachment[] {
  const territory = territoryAtPosition(state, territoryPosition);
  if (!territory) return [];
  return state.overlays
    .filter(overlay => overlay.territoryInstanceId === territory.territoryInstanceId)
    .sort((a, b) => a.sequence - b.sequence);
}

export function activeV070Overlay(
  state: V070GameState,
  territoryPosition: number,
): V070OverlayAttachment | null {
  const overlays = v070OverlaysAt(state, territoryPosition);
  return overlays[overlays.length - 1] ?? null;
}

export function cardIdForV070Overlay(
  state: V070GameState,
  overlay: V070OverlayAttachment,
): string {
  const cardId = state.cardInstances[overlay.instanceId]?.cardId;
  if (!cardId) throw new Error(`Unknown Overlay card instance ${overlay.instanceId}.`);
  return cardId;
}

export function placeV070OverlayFromHand(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
  territoryPosition: number,
  source: string,
): V070OverlayAttachment {
  const player = state.players[owner];
  const handIndex = player.zones.hand.indexOf(instanceId);
  if (handIndex < 0) {
    throw new V070GameActionError('That Overlay card is not in the player’s Hand.');
  }

  const overlay = attachV070Overlay(
    state,
    owner,
    instanceId,
    territoryPosition,
    source,
  );
  player.zones.hand.splice(handIndex, 1);
  return overlay;
}

export function placeV070OverlayFromPendingAction(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
  territoryPosition: number,
  source: string,
): V070OverlayAttachment {
  const pending = state.pendingActionCard;
  if (!pending
    || pending.playerId !== owner
    || pending.instanceId !== instanceId) {
    throw new V070GameActionError(
      'That Overlay card is not the player’s pending Action card.',
    );
  }

  return attachV070Overlay(
    state,
    owner,
    instanceId,
    territoryPosition,
    source,
  );
}

function attachV070Overlay(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
  territoryPosition: number,
  source: string,
): V070OverlayAttachment {
  const territory = territoryAtPosition(state, territoryPosition);
  if (!territory) {
    throw new V070GameActionError('An Overlay must be attached to a Territory in the Gauntlet.');
  }

  const cardId = state.cardInstances[instanceId]?.cardId;
  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  if (!card || card.card_form !== 'Territory Overlay') {
    throw new V070GameActionError('That card is not a released Territory Overlay.');
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

export function discardV070Overlay(
  state: V070GameState,
  instanceId: string,
  reason: string,
): void {
  const index = state.overlays.findIndex(overlay => overlay.instanceId === instanceId);
  if (index < 0) return;

  const [overlay] = state.overlays.splice(index, 1);
  const cardId = cardIdForV070Overlay(state, overlay);
  const territory = territoryByInstanceId(state, overlay.territoryInstanceId);
  state.players[overlay.owner].zones.discardPile.push(instanceId);

  appendV070Event(state, {
    type: 'overlay_discarded',
    actor: overlay.owner,
    visibility: 'public',
    payload: {
      instanceId,
      cardId,
      territoryInstanceId: overlay.territoryInstanceId,
      territoryPosition: territory?.position ?? null,
      territoryId: territory?.territoryId ?? null,
      reason,
    },
  });
}

export function registerV070DmzEntryLock(
  state: V070GameState,
  territoryPosition: number,
  sourceInstanceId: string,
): void {
  const territory = territoryAtPosition(state, territoryPosition);
  if (!territory) {
    throw new V070GameActionError('Demilitarized Zone entry lock requires a Territory.');
  }

  state.territoryTurnRestrictions.push({
    kind: 'no_entry',
    source: 'demilitarized_zone',
    sourceInstanceId,
    territoryInstanceId: territory.territoryInstanceId,
    turnNumber: state.turnNumber,
  });

  appendV070Event(state, {
    type: 'territory_turn_restriction_added',
    visibility: 'public',
    payload: {
      kind: 'no_entry',
      source: 'demilitarized_zone',
      sourceInstanceId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      turnNumber: state.turnNumber,
    },
  });
}

export function expireV070TerritoryTurnRestrictions(
  state: V070GameState,
): void {
  state.territoryTurnRestrictions = state.territoryTurnRestrictions.filter(
    restriction => restriction.turnNumber === state.turnNumber,
  );
}

export function v070DmzBlocksEntryThisTurn(
  state: V070GameState,
  territoryPosition: number,
): boolean {
  const territory = territoryAtPosition(state, territoryPosition);
  if (!territory) return false;

  return state.territoryTurnRestrictions.some(restriction =>
    restriction.kind === 'no_entry'
    && restriction.source === 'demilitarized_zone'
    && restriction.territoryInstanceId === territory.territoryInstanceId
    && restriction.turnNumber === state.turnNumber
  );
}

export function resolveV070OverlayEntryRequirements(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition: number,
  discardInstanceId?: string,
): void {
  const territory = territoryAtPosition(state, territoryPosition);
  if (!territory) {
    if (discardInstanceId) {
      throw new V070GameActionError('No Territory Overlay entry cost applies off the Gauntlet.');
    }
    return;
  }

  if (v070DmzBlocksEntryThisTurn(state, territoryPosition)) {
    throw new V070GameActionError(
      'Neither player may enter a Demilitarized Zone during the turn it is placed.',
    );
  }

  const active = activeV070Overlay(state, territoryPosition);
  const requiresDiscard = active
    && cardIdForV070Overlay(state, active) === V070_DEMILITARIZED_ZONE_ID
    && territory.occupant === null;

  if (!requiresDiscard) {
    if (discardInstanceId) {
      throw new V070GameActionError('No Overlay entry cost requires that discard.');
    }
    return;
  }

  if (!discardInstanceId) {
    throw new V070GameActionError(
      'Entering an unoccupied Demilitarized Zone requires discarding one card from Hand.',
    );
  }

  const player = state.players[playerId];
  const handIndex = player.zones.hand.indexOf(discardInstanceId);
  if (handIndex < 0) {
    throw new V070GameActionError(
      'The Demilitarized Zone entry cost must be paid with a card from Hand.',
    );
  }

  player.zones.hand.splice(handIndex, 1);
  player.zones.discardPile.push(discardInstanceId);

  appendV070Event(state, {
    type: 'overlay_entry_cost_paid',
    actor: playerId,
    visibility: 'public',
    payload: {
      overlayInstanceId: active.instanceId,
      overlayCardId: V070_DEMILITARIZED_ZONE_ID,
      territoryPosition,
      discardedInstanceId: discardInstanceId,
      discardedCardId: state.cardInstances[discardInstanceId]?.cardId,
    },
  });
}

export function replaceV070CaptureWithOverlay(
  state: V070GameState,
  territoryPosition: number,
  capturingPlayer: PlayerId,
  source: string,
): boolean {
  const active = activeV070Overlay(state, territoryPosition);
  if (!active || cardIdForV070Overlay(state, active) !== V070_DEMILITARIZED_ZONE_ID) {
    return false;
  }

  const overlayInstanceId = active.instanceId;
  discardV070Overlay(state, overlayInstanceId, 'demilitarized_zone_capture_replacement');

  appendV070Event(state, {
    type: 'territory_capture_replaced',
    actor: capturingPlayer,
    visibility: 'public',
    payload: {
      territoryPosition,
      overlayInstanceId,
      overlayCardId: V070_DEMILITARIZED_ZONE_ID,
      source,
    },
  });
  return true;
}

export function openV070StartTurnOverlayChoice(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  if (state.pendingTurnChoice) return false;

  const position = state.players[playerId].position;
  if (position === null) return false;

  const active = activeV070Overlay(state, position);
  if (!active || cardIdForV070Overlay(state, active) !== V070_DEMILITARIZED_ZONE_ID) {
    return false;
  }

  const territory = territoryAtPosition(state, position);
  if (!territory) return false;

  state.pendingTurnChoice = {
    kind: 'demilitarized_zone_upkeep',
    playerId,
    overlayInstanceId: active.instanceId,
    territoryInstanceId: territory.territoryInstanceId,
  };

  appendV070Event(state, {
    type: 'turn_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'demilitarized_zone_upkeep',
      overlayInstanceId: active.instanceId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: position,
    },
  });
  return true;
}

export function resolveV070StartTurnOverlayChoice(
  state: V070GameState,
  playerId: PlayerId,
  choice: 'discard' | 'withdraw',
  discardInstanceId?: string,
): void {
  const pending = state.pendingTurnChoice;
  if (!pending
    || pending.kind !== 'demilitarized_zone_upkeep'
    || pending.playerId !== playerId) {
    throw new V070GameActionError('No Demilitarized Zone upkeep choice is pending.');
  }

  const territory = territoryByInstanceId(state, pending.territoryInstanceId);
  if (!territory) {
    throw new V070GameActionError('The Demilitarized Zone Territory is no longer in the Gauntlet.');
  }
  const active = activeV070Overlay(state, territory.position);
  if (!active
    || active.instanceId !== pending.overlayInstanceId
    || cardIdForV070Overlay(state, active) !== V070_DEMILITARIZED_ZONE_ID) {
    throw new V070GameActionError('The Demilitarized Zone upkeep source is no longer active.');
  }

  if (choice === 'discard') {
    if (!discardInstanceId) {
      throw new V070GameActionError('Choose one card from Hand to discard.');
    }
    const player = state.players[playerId];
    const index = player.zones.hand.indexOf(discardInstanceId);
    if (index < 0) {
      throw new V070GameActionError('Demilitarized Zone upkeep must discard from Hand.');
    }
    player.zones.hand.splice(index, 1);
    player.zones.discardPile.push(discardInstanceId);

    appendV070Event(state, {
      type: 'demilitarized_zone_upkeep_paid',
      actor: playerId,
      visibility: 'public',
      payload: {
        overlayInstanceId: active.instanceId,
        discardedInstanceId: discardInstanceId,
        discardedCardId: state.cardInstances[discardInstanceId]?.cardId,
      },
    });
  } else {
    if (discardInstanceId) {
      throw new V070GameActionError('Withdrawal does not also discard a Hand card.');
    }

    // The released DMZ uses "withdraw" outside a battle. With no attacker /
    // defender role to apply, resolve that card-specific displacement one
    // Position toward the affected player's own end.
    const from = territory.position;
    const to = retreatV070Position(playerId, from, state.board.length);
    moveV070PlayerOutsideBattle(state, playerId, from, to);

    appendV070Event(state, {
      type: 'demilitarized_zone_upkeep_withdrawal',
      actor: playerId,
      visibility: 'public',
      payload: {
        overlayInstanceId: active.instanceId,
        from,
        to,
      },
    });
  }

  state.pendingTurnChoice = null;
}

export function withdrawV070PlayersFromNewDemilitarizedZone(
  state: V070GameState,
): void {
  const battle = state.battle;
  if (!battle) throw new V070GameActionError('Demilitarized Zone Terms require the accepted battle context.');

  const positions = { ...battle.positions };
  const moved: Array<{ playerId: PlayerId; from: number; to: number }> = [];

  if (positions[battle.attacker] === battle.contestedPosition) {
    const from = positions[battle.attacker];
    positions[battle.attacker] = battle.attackerOrigin;
    moved.push({
      playerId: battle.attacker,
      from,
      to: battle.attackerOrigin,
    });
  }

  if (positions[battle.defender] === battle.contestedPosition) {
    const from = positions[battle.defender];
    const to = retreatV070Position(
      battle.defender,
      battle.contestedPosition,
      battle.territoryCount,
    );
    positions[battle.defender] = to;
    moved.push({
      playerId: battle.defender,
      from,
      to,
    });
  }

  state.battle = {
    ...battle,
    positions,
    occupier: null,
  };

  for (const movement of moved) {
    appendV070Event(state, {
      type: 'demilitarized_zone_terms_withdrawal',
      actor: movement.playerId,
      visibility: 'public',
      payload: movement,
    });
  }
}

export function activeV070OverlayAtBattleOnset(
  state: V070GameState,
  territoryPosition: number,
): string | null {
  return activeV070Overlay(state, territoryPosition)?.instanceId ?? null;
}

export function resolveV070OverlayAfterBattle(
  state: V070GameState,
  territoryPosition: number,
  activeOverlayAtOnset: string | null,
): void {
  if (!activeOverlayAtOnset) return;

  const overlay = state.overlays.find(item => item.instanceId === activeOverlayAtOnset);
  if (!overlay) return;
  const territory = territoryByInstanceId(state, overlay.territoryInstanceId);
  if (!territory || territory.position !== territoryPosition) return;
  if (cardIdForV070Overlay(state, overlay) !== V070_DEMILITARIZED_ZONE_ID) return;

  discardV070Overlay(state, activeOverlayAtOnset, 'demilitarized_zone_next_battle');
}

function territoryAtPosition(
  state: V070GameState,
  position: number,
) {
  return state.board.find(territory => territory.position === position) ?? null;
}

function territoryByInstanceId(
  state: V070GameState,
  territoryInstanceId: string,
) {
  return state.board.find(
    territory => territory.territoryInstanceId === territoryInstanceId,
  ) ?? null;
}

function moveV070PlayerOutsideBattle(
  state: V070GameState,
  playerId: PlayerId,
  from: number,
  to: number,
): void {
  const origin = state.board.find(territory => territory.position === from);
  if (origin?.occupant === playerId) origin.occupant = null;

  state.players[playerId].position = to;

  const destination = state.board.find(territory => territory.position === to);
  if (destination) {
    if (destination.occupant && destination.occupant !== playerId) {
      throw new V070GameActionError('Withdrawal cannot move through or onto the opponent.');
    }
    destination.occupant = playerId;
  }

  openV070BlockadeChoicesForPositionChange(state, playerId, from, to);
}
