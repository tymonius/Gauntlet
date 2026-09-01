import {
  V070GameActionError,
  appendV070Event,
  type V070BoardTerritory,
  type V070GameState,
} from './engine';
import { activeV070Overlay } from './overlays';
import type { PlayerId } from './rules';

export const V070_QUICKSAND_ID = 'territory-quicksand' as const;
export const V070_DIFFICULT_TERRAIN_ID =
  'territory-difficult-terrain' as const;
export const V070_SUPPLY_DEPOT_ID = 'territory-supply-depot' as const;
export const V070_REFUGE_ID = 'territory-refuge' as const;
export const V070_KINGS_ROAD_ID = 'territory-king-s-road' as const;
export const V070_TOLL_BRIDGE_ID = 'territory-toll-bridge' as const;

export type V070TerritoryEffectTiming =
  | 'start_turn'
  | 'draw'
  | 'opening'
  | 'movement'
  | 'battle'
  | 'aftermath'
  | 'denouement'
  | 'cleanup'
  | 'continuous';

export interface V070TurnStartTerritoryPlan {
  supplyDepotCards: number;
  kingsRoadMovementBonus: number;
  denouementCardActionBlocked: boolean;
}

export function territoryAtV070Position(
  state: V070GameState,
  position: number,
): V070BoardTerritory | null {
  return state.board.find(
    territory => territory.position === position,
  ) ?? null;
}

export function v070PrintedTerritoryEffectActive(
  state: V070GameState,
  territory: V070BoardTerritory,
  playerId: PlayerId,
  timing: V070TerritoryEffectTiming,
): boolean {
  if (territory.blank) return false;
  if (activeV070Overlay(state, territory.position)) return false;

  if (timing === 'movement'
    && state.territoryEffectSuppressions.some(suppression =>
      suppression.playerId === playerId
      && suppression.territoryInstanceId ===
        territory.territoryInstanceId
      && suppression.turnNumber === state.turnNumber
      && suppression.scope === 'movement'
    )) {
    return false;
  }
  return true;
}

export function v070TurnStartTerritoryPlan(
  state: V070GameState,
  playerId: PlayerId,
): V070TurnStartTerritoryPlan {
  const position = state.players[playerId].position;
  if (position === null) {
    return {
      supplyDepotCards: 0,
      kingsRoadMovementBonus: 0,
      denouementCardActionBlocked: false,
    };
  }

  const territory = territoryAtV070Position(state, position);
  if (!territory
    || !v070PrintedTerritoryEffectActive(
      state,
      territory,
      playerId,
      'start_turn',
    )) {
    return {
      supplyDepotCards: 0,
      kingsRoadMovementBonus: 0,
      denouementCardActionBlocked: false,
    };
  }

  return {
    supplyDepotCards:
      territory.territoryId === V070_SUPPLY_DEPOT_ID
      && territory.controller === playerId
        ? 1
        : 0,
    kingsRoadMovementBonus:
      territory.territoryId === V070_KINGS_ROAD_ID
        ? 1
        : 0,
    denouementCardActionBlocked:
      territory.territoryId === V070_DIFFICULT_TERRAIN_ID,
  };
}

export function v070QuicksandCapsMovement(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const position = state.players[playerId].position;
  if (position === null) return false;
  const territory = territoryAtV070Position(state, position);
  return Boolean(
    territory
    && territory.territoryId === V070_QUICKSAND_ID
    && v070PrintedTerritoryEffectActive(
      state,
      territory,
      playerId,
      'movement',
    ),
  );
}

export function v070DifficultTerrainEntryActive(
  state: V070GameState,
  playerId: PlayerId,
  destination: number,
): boolean {
  const territory = territoryAtV070Position(state, destination);
  return Boolean(
    territory
    && territory.territoryId === V070_DIFFICULT_TERRAIN_ID
    && v070PrintedTerritoryEffectActive(
      state,
      territory,
      playerId,
      'movement',
    ),
  );
}

export function v070TollBridgeAdvanceCostActive(
  state: V070GameState,
  playerId: PlayerId,
  origin: number,
): boolean {
  const territory = territoryAtV070Position(state, origin);
  return Boolean(
    territory
    && territory.territoryId === V070_TOLL_BRIDGE_ID
    && v070PrintedTerritoryEffectActive(
      state,
      territory,
      playerId,
      'movement',
    ),
  );
}

export function v070RefugeFallBackDrawActive(
  state: V070GameState,
  playerId: PlayerId,
  destination: number,
): boolean {
  const territory = territoryAtV070Position(state, destination);
  return Boolean(
    territory
    && territory.territoryId === V070_REFUGE_ID
    && v070PrintedTerritoryEffectActive(
      state,
      territory,
      playerId,
      'movement',
    ),
  );
}

export function payV070TollBridgeAdvanceCost(
  state: V070GameState,
  playerId: PlayerId,
  discardInstanceId?: string,
): void {
  if (!discardInstanceId) {
    throw new V070GameActionError(
      'Voluntarily Advancing from Toll Bridge requires discarding one card from Hand.',
    );
  }
  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(discardInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'The Toll Bridge Advance cost must be paid with a card from Hand.',
    );
  }
  hand.splice(index, 1);
  state.players[playerId].zones.discardPile.push(discardInstanceId);
  appendV070Event(state, {
    type: 'territory_cost_paid',
    actor: playerId,
    visibility: 'public',
    payload: {
      territoryId: V070_TOLL_BRIDGE_ID,
      purpose: 'voluntary_advance',
      discardedInstanceId: discardInstanceId,
      discardedCardId:
        state.cardInstances[discardInstanceId]?.cardId,
    },
  });
}

export function suppressV070PrintedTerritoryDuringMovement(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition: number,
  sourceActionInstanceId: string,
): void {
  const territory = territoryAtV070Position(state, territoryPosition);
  if (!territory) {
    throw new V070GameActionError(
      'Pathfinders must choose a Territory in the Gauntlet.',
    );
  }

  state.territoryEffectSuppressions =
    state.territoryEffectSuppressions.filter(suppression =>
      !(suppression.playerId === playerId
        && suppression.source === 'pathfinders'
        && suppression.turnNumber === state.turnNumber)
    );
  state.territoryEffectSuppressions.push({
    source: 'pathfinders',
    sourceActionInstanceId,
    playerId,
    territoryInstanceId: territory.territoryInstanceId,
    turnNumber: state.turnNumber,
    scope: 'movement',
  });
  appendV070Event(state, {
    type: 'territory_effect_suppressed',
    actor: playerId,
    visibility: 'public',
    payload: {
      source: 'Pathfinders',
      sourceActionInstanceId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      territoryId: territory.territoryId,
      scope: 'movement',
      turnNumber: state.turnNumber,
    },
  });
}

export function expireV070TerritoryEffectSuppressions(
  state: V070GameState,
  playerId: PlayerId,
): void {
  state.territoryEffectSuppressions =
    state.territoryEffectSuppressions.filter(suppression =>
      !(suppression.playerId === playerId
        && suppression.turnNumber <= state.turnNumber)
    );
}
