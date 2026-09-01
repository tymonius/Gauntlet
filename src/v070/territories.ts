import {
  V070GameActionError,
  appendV070Event,
  type V070BoardTerritory,
  type V070GameState,
} from './engine';
import { activeV070Overlay } from './overlays';
import {
  retreatV070Position,
  type PlayerId,
} from './rules';

export const V070_QUICKSAND_ID = 'territory-quicksand' as const;
export const V070_DIFFICULT_TERRAIN_ID =
  'territory-difficult-terrain' as const;
export const V070_RUINED_STOREHOUSE_ID =
  'territory-ruined-storehouse' as const;
export const V070_SUPPLY_DEPOT_ID = 'territory-supply-depot' as const;
export const V070_REFUGE_ID = 'territory-refuge' as const;
export const V070_COMMAND_TENT_ID = 'territory-command-tent' as const;
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
  commandTentAdditionalActions: number;
  commandTentCardActionFirst: boolean;
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

  const movementWindow =
    timing === 'movement'
    || (
      state.turnState?.phase === 'movement'
      && (
        timing === 'battle'
        || timing === 'aftermath'
        || timing === 'continuous'
      )
    );
  if (movementWindow
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
      commandTentAdditionalActions: 0,
      commandTentCardActionFirst: false,
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
      commandTentAdditionalActions: 0,
      commandTentCardActionFirst: false,
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
    commandTentAdditionalActions:
      territory.territoryId === V070_COMMAND_TENT_ID
      && territory.controller === playerId
        ? 1
        : 0,
    commandTentCardActionFirst:
      territory.territoryId === V070_COMMAND_TENT_ID
      && territory.controller === playerId,
  };
}

export function v070RuinedStorehouseDrawAvailable(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const position = state.players[playerId].position;
  if (position === null) return false;
  const territory = territoryAtV070Position(state, position);
  return Boolean(
    territory
    && territory.territoryId === V070_RUINED_STOREHOUSE_ID
    && state.players[playerId].zones.discardPile.length > 0
    && v070PrintedTerritoryEffectActive(
      state,
      territory,
      playerId,
      'draw',
    ),
  );
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


export const V070_GARRISON_ID = 'territory-garrison' as const;
export const V070_EXPOSED_FLANK_ID =
  'territory-exposed-flank' as const;
export const V070_HIGH_GROUND_ID = 'territory-high-ground' as const;
export const V070_WATCHTOWER_ID = 'territory-watchtower' as const;
export const V070_ARENA_TERRITORY_IDS = new Set([
  'territory-arena-spoils-of-war',
  'territory-arena-no-quarter',
  'territory-arena-single-combat',
  'territory-arena-grand-melee',
]);

export function applyV070CoreBattleTerritoryEffects(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || battle.lastStand) return;

  const territory = territoryAtV070Position(
    state,
    battle.contestedPosition,
  );
  if (!territory) return;
  if (!v070PrintedTerritoryEffectActive(
    state,
    territory,
    battle.attacker,
    'battle',
  )) {
    return;
  }

  runtime.activePrintedTerritoryAtOnset = {
    territoryInstanceId: territory.territoryInstanceId,
    territoryId: territory.territoryId,
  };

  const applied: string[] = [];
  if (territory.territoryId === V070_GARRISON_ID
    && territory.controller === battle.defender) {
    runtime.participants[battle.defender].reserveBonus += 1;
    applied.push('defender_reserve_plus_one');
  }

  if (territory.territoryId === V070_HIGH_GROUND_ID) {
    runtime.participants[battle.defender].advantage += 1;
    applied.push('defender_advantage');
  }

  if (territory.territoryId === V070_WATCHTOWER_ID
    && territory.controller === battle.defender) {
    runtime.gambitOrderOverride = {
      source: 'watchtower',
      firstPlayer: battle.attacker,
      secondPlayer: battle.defender,
      nextPlayer: battle.attacker,
      firstCommitmentFaceUp: true,
    };
    applied.push('attacker_gambit_first_face_up');
  }

  const counterattack =
    territory.controller === battle.attacker;
  if (territory.territoryId === V070_EXPOSED_FLANK_ID
    && counterattack) {
    runtime.gambitProhibitedPlayers.push(battle.defender);
    applied.push('occupier_gambit_prohibited_on_counterattack');
  }

  if (V070_ARENA_TERRITORY_IDS.has(territory.territoryId)) {
    state.battle = {
      ...battle,
      defensiveEdgeRemoved: true,
    };
    applied.push('defensive_edge_removed');
  }

  if (applied.length > 0) {
    appendV070Event(state, {
      type: 'territory_battle_effect_applied',
      actor: battle.attacker,
      visibility: 'public',
      payload: {
        territoryInstanceId: territory.territoryInstanceId,
        territoryPosition: territory.position,
        territoryId: territory.territoryId,
        effects: [...applied],
      },
    });
  }
}


export const V070_FIELD_HOSPITAL_ID =
  'territory-field-hospital' as const;
export const V070_OLD_BATTLEFIELD_ID =
  'territory-old-battlefield' as const;
export const V070_ARENA_SPOILS_OF_WAR_ID =
  'territory-arena-spoils-of-war' as const;
export const V070_ARENA_NO_QUARTER_ID =
  'territory-arena-no-quarter' as const;

export function applyV070NoQuarterAdditionalRetreat(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.activePrintedTerritoryAtOnset?.territoryId !==
      V070_ARENA_NO_QUARTER_ID
    || !battle.loser) {
    return false;
  }

  const loser = battle.loser;
  const from = battle.positions[loser];
  const to = retreatV070Position(
    loser,
    from,
    battle.territoryCount,
  );
  if (to === from) return false;

  battle.positions[loser] = to;
  appendV070Event(state, {
    type: 'territory_aftermath_retreat',
    actor: loser,
    visibility: 'public',
    payload: {
      territoryId: V070_ARENA_NO_QUARTER_ID,
      loser,
      from,
      to,
      additionalRetreat: 1,
    },
  });
  return true;
}

export function activeV070PrintedBattleTerritory(
  state: V070GameState,
): V070BoardTerritory | null {
  const snapshot =
    state.battleRuntime?.activePrintedTerritoryAtOnset;
  if (!snapshot) return null;
  return state.board.find(
    territory =>
      territory.territoryInstanceId ===
        snapshot.territoryInstanceId
      && territory.territoryId === snapshot.territoryId,
  ) ?? null;
}


export const V070_POISONOUS_GAS_ID =
  'territory-poisonous-gas' as const;
export const V070_FORTIFIED_PASS_ID =
  'territory-fortified-pass' as const;
export const V070_INSURGENCY_ID =
  'territory-insurgency' as const;
export const V070_ARENA_SINGLE_COMBAT_ID =
  'territory-arena-single-combat' as const;
export const V070_ARENA_GRAND_MELEE_ID =
  'territory-arena-grand-melee' as const;
export const V070_TRAINING_GROUNDS_ID =
  'territory-training-grounds' as const;

export function v070PlayerInOccupation(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const position = state.players[playerId].position;
  if (position === null) return false;
  const territory = territoryAtV070Position(state, position);
  return Boolean(
    territory
    && territory.controller !== playerId
    && territory.occupant === playerId,
  );
}

export function v070PlayerAssetsInactiveByContinuousTerritory(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  const position = state.players[playerId].position;
  if (position === null) return false;
  const territory = territoryAtV070Position(state, position);
  return Boolean(
    territory
    && territory.territoryId === V070_INSURGENCY_ID
    && v070PlayerInOccupation(state, playerId)
    && v070PrintedTerritoryEffectActive(
      state,
      territory,
      state.activePlayer ?? playerId,
      'continuous',
    ),
  );
}

export function applyV070AdvancedBattleTerritoryEffects(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || battle.lastStand) return;
  const territory = activeV070PrintedBattleTerritory(state);
  if (!territory) return;

  const inactive = new Set(runtime.assetInactivePlayers);
  const effects: string[] = [];

  if (territory.territoryId === V070_FORTIFIED_PASS_ID
    && territory.controller === battle.defender) {
    inactive.add(battle.attacker);
    effects.push('attacker_assets_inactive');
  }

  if (territory.territoryId === V070_ARENA_SINGLE_COMBAT_ID) {
    inactive.add(battle.attacker);
    inactive.add(battle.defender);
    effects.push('all_assets_inactive');
  }

  if (territory.territoryId === V070_ARENA_GRAND_MELEE_ID) {
    for (const playerId of [battle.attacker, battle.defender]) {
      runtime.participants[playerId].reserveBonus += 1;
      runtime.participants[playerId].tacticLimit += 1;
    }
    effects.push('each_player_reserve_plus_one');
    effects.push('each_player_tactic_plus_one');
  }

  if (territory.territoryId === V070_TRAINING_GROUNDS_ID
    && territory.controller === battle.defender) {
    runtime.trainingGroundsRedrawPlayer = battle.defender;
    effects.push('defender_may_redraw_reserve_before_tactics');
  }

  runtime.assetInactivePlayers = [...inactive];

  if (effects.length > 0) {
    appendV070Event(state, {
      type: 'territory_battle_effect_applied',
      actor: battle.attacker,
      visibility: 'public',
      payload: {
        territoryInstanceId: territory.territoryInstanceId,
        territoryPosition: territory.position,
        territoryId: territory.territoryId,
        effects,
      },
    });
  }
}
