import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export function isV070IntelligencePlayer(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  return Boolean(state.players[playerId]?.intelligence);
}

export function isV070MissionEligibleCardId(
  cardId: string,
): boolean {
  const card = v070CanonicalContent.cardsById.get(cardId);
  return Boolean(
    card
    && card.allegiance === 'Intelligence'
    && card.effects.some(effect => effect.label === 'Mission'),
  );
}

export function v070MissionEligibleHandInstanceIds(
  state: V070GameState,
  playerId: PlayerId,
  excludedInstanceIds: readonly string[] = [],
): string[] {
  if (!isV070IntelligencePlayer(state, playerId)) return [];
  const excluded = new Set(excludedInstanceIds);
  return state.players[playerId].zones.hand.filter(instanceId => {
    if (excluded.has(instanceId)) return false;
    const cardId = state.cardInstances[instanceId]?.cardId;
    return Boolean(cardId && isV070MissionEligibleCardId(cardId));
  });
}

export function startV070MissionFromHand(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
  reason: string,
): void {
  const intelligence = requireIntelligenceState(state, playerId);
  if (intelligence.activeMission) {
    throw new V070GameActionError(
      'You may have only one Active Mission.',
    );
  }
  if (intelligence.specialOperation) {
    throw new V070GameActionError(
      'You cannot start a Mission while a Special Operation is active.',
    );
  }

  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(instanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'A Mission must start from your Hand.',
    );
  }
  const cardId = state.cardInstances[instanceId]?.cardId;
  if (!cardId || !isV070MissionEligibleCardId(cardId)) {
    throw new V070GameActionError(
      'Only an eligible Intelligence card with a printed Mission requirement may become your Active Mission.',
    );
  }

  hand.splice(index, 1);
  intelligence.activeMission = {
    instanceId,
    startedTurn: state.turnNumber,
  };

  appendV070Event(state, {
    type: 'mission_started',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      startedTurn: state.turnNumber,
      faceDown: true,
      reason,
    },
  });
  appendV070Event(state, {
    type: 'mission_identity',
    actor: playerId,
    visibility: playerId,
    payload: {
      instanceId,
      cardId,
      startedTurn: state.turnNumber,
      reason,
    },
  });
}

export function returnV070ActiveMissionToHand(
  state: V070GameState,
  playerId: PlayerId,
  reason: string,
): string {
  const intelligence = requireIntelligenceState(state, playerId);
  const mission = intelligence.activeMission;
  if (!mission) {
    throw new V070GameActionError(
      'That player has no Active Mission.',
    );
  }

  intelligence.activeMission = null;
  state.players[playerId].zones.hand.push(mission.instanceId);
  const cardId = state.cardInstances[mission.instanceId]?.cardId;
  if (!cardId) {
    throw new V070GameActionError(
      'The Active Mission references an unknown card instance.',
    );
  }

  appendV070Event(state, {
    type: 'mission_returned_to_hand',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      reason,
    },
  });
  appendV070Event(state, {
    type: 'mission_returned_identity',
    actor: playerId,
    visibility: playerId,
    payload: {
      instanceId: mission.instanceId,
      cardId,
      reason,
    },
  });
  return mission.instanceId;
}

export function v070ActiveMissionCanCompleteThisTurn(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const intelligence = state.players[playerId]?.intelligence;
  return Boolean(
    intelligence?.activeMission
    && intelligence.activeMission.startedTurn < state.turnNumber,
  );
}

function requireIntelligenceState(
  state: V070GameState,
  playerId: PlayerId,
) {
  const intelligence = state.players[playerId]?.intelligence;
  if (!intelligence) {
    throw new V070GameActionError(
      `${playerId} is not using the Intelligence faction.`,
    );
  }
  return intelligence;
}
