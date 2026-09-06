import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  type PlayerId,
  type V070BattleOutcome,
} from './rules';
import {
  v070PrintedTerritoryEffectActive,
} from './territories';

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
    satisfiedTurn: null,
    progressFlags: [],
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


export function gainV070Intel(
  state: V070GameState,
  playerId: PlayerId,
  amount: number,
  reason: string,
): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new V070GameActionError('Intel gain must be a nonnegative integer.');
  }
  const intelligence = requireIntelligenceState(state, playerId);
  intelligence.intel += amount;
  appendV070Event(state, {
    type: 'intel_changed',
    actor: playerId,
    visibility: 'public',
    payload: {
      amount,
      balance: intelligence.intel,
      reason,
    },
  });
}

export function spendV070Intel(
  state: V070GameState,
  playerId: PlayerId,
  amount: number,
  reason: string,
): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new V070GameActionError('Intel spend must be a nonnegative integer.');
  }
  const intelligence = requireIntelligenceState(state, playerId);
  if (intelligence.intel < amount) {
    throw new V070GameActionError(
      `${reason} requires ${amount} Intel but only ${intelligence.intel} is available.`,
    );
  }
  intelligence.intel -= amount;
  appendV070Event(state, {
    type: 'intel_changed',
    actor: playerId,
    visibility: 'public',
    payload: {
      amount: -amount,
      balance: intelligence.intel,
      reason,
    },
  });
}

export function recordV070IntelligenceHandRevealForMission(
  state: V070GameState,
  actor: PlayerId,
  owner: PlayerId,
  revealedCount: number,
): void {
  if (actor === owner || revealedCount <= 0 || state.battle) return;
  const intelligence = state.players[actor]?.intelligence;
  const mission = intelligence?.activeMission;
  if (!mission || mission.startedTurn >= state.turnNumber) return;
  const cardId = state.cardInstances[mission.instanceId]?.cardId;
  if (cardId !== 'intelligence-assassins') return;
  addMissionProgressFlag(mission, 'opponent_hand_revealed_outside_battle');
}

export function recordV070IntelligenceBattleOutcomeForMission(
  state: V070GameState,
  outcome: V070BattleOutcome,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) return;

  for (const playerId of ['A', 'B'] as const) {
    const intelligence = state.players[playerId]?.intelligence;
    const mission = intelligence?.activeMission;
    if (!mission || mission.startedTurn >= state.turnNumber) continue;
    const cardId = state.cardInstances[mission.instanceId]?.cardId;
    if (!cardId) continue;

    const opponentId = otherPlayer(playerId);
    const own = runtime.participants[playerId];
    const opponent = runtime.participants[opponentId];
    const ownGambit = Boolean(own.gambit || own.additionalGambits.length);
    const opponentGambit = Boolean(
      opponent.gambit || opponent.additionalGambits.length,
    );
    const opponentTactic = Boolean(
      opponent.tactic || opponent.additionalTactics.length,
    );

    let satisfied = false;
    switch (cardId) {
      case 'intelligence-assassins':
        satisfied =
          outcome.winner === playerId
          && opponentGambit
          && mission.progressFlags.includes(
            'opponent_hand_revealed_outside_battle',
          );
        break;
      case 'intelligence-disinformation':
        satisfied =
          outcome.winner === playerId
          && opponentGambit
          && !ownGambit;
        break;
      case 'intelligence-fog-of-war':
        satisfied =
          outcome.winner === playerId
          && opponentGambit
          && opponentTactic;
        break;
      case 'intelligence-reconnaissance': {
        const territory = state.board.find(
          candidate => candidate.position === battle.contestedPosition,
        );
        satisfied =
          outcome.winner === playerId
          && battle.attacker !== playerId
          && territory?.controller === opponentId;
        break;
      }
      case 'intelligence-spies':
        satisfied =
          outcome.winner === playerId
          && mission.progressFlags.includes('early_battle_card_reveal');
        break;
      case 'intelligence-subversion':
        satisfied =
          outcome.winner === playerId
          && mission.progressFlags.includes('opponent_asset_used_in_battle')
          && !mission.progressFlags.includes('own_asset_used_in_battle');
        break;
    }

    if (satisfied) {
      markV070ActiveMissionSatisfied(
        state,
        playerId,
        `battle requirement satisfied by ${cardId}`,
      );
    }

    mission.progressFlags = mission.progressFlags.filter(
      flag => ![
        'early_battle_card_reveal',
        'opponent_asset_used_in_battle',
        'own_asset_used_in_battle',
      ].includes(flag),
    );
  }
}

export function recordV070IntelligenceEarlyBattleRevealForMission(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const mission = state.players[playerId]?.intelligence?.activeMission;
  if (!mission || mission.startedTurn >= state.turnNumber) return;
  if (state.cardInstances[mission.instanceId]?.cardId !== 'intelligence-spies') {
    return;
  }
  addMissionProgressFlag(mission, 'early_battle_card_reveal');
}

export function recordV070IntelligenceBattleAssetUseForMission(
  state: V070GameState,
  assetUser: PlayerId,
): void {
  if (!state.battle) return;
  for (const playerId of ['A', 'B'] as const) {
    const mission = state.players[playerId]?.intelligence?.activeMission;
    if (!mission || mission.startedTurn >= state.turnNumber) continue;
    if (state.cardInstances[mission.instanceId]?.cardId !== 'intelligence-subversion') {
      continue;
    }
    addMissionProgressFlag(
      mission,
      assetUser === playerId
        ? 'own_asset_used_in_battle'
        : 'opponent_asset_used_in_battle',
    );
  }
}

export function recordV070IntelligenceWithdrawalForMission(
  state: V070GameState,
  playerId: PlayerId,
  opposingTacticRevealed: boolean,
): void {
  if (!opposingTacticRevealed) return;
  const mission = state.players[playerId]?.intelligence?.activeMission;
  if (!mission || mission.startedTurn >= state.turnNumber) return;
  if (state.cardInstances[mission.instanceId]?.cardId !== 'intelligence-exfiltration') {
    return;
  }
  markV070ActiveMissionSatisfied(
    state,
    playerId,
    'withdrew after an opposing Tactic was revealed',
  );
}

export function markV070ActiveMissionSatisfied(
  state: V070GameState,
  playerId: PlayerId,
  reason: string,
): void {
  const intelligence = requireIntelligenceState(state, playerId);
  const mission = intelligence.activeMission;
  if (!mission || mission.startedTurn >= state.turnNumber) return;
  if (mission.satisfiedTurn !== null) return;
  mission.satisfiedTurn = state.turnNumber;
  appendV070Event(state, {
    type: 'mission_requirement_satisfied',
    actor: playerId,
    visibility: playerId,
    payload: {
      instanceId: mission.instanceId,
      cardId: state.cardInstances[mission.instanceId]?.cardId,
      satisfiedTurn: state.turnNumber,
      reason,
    },
  });
}

export interface V070CompletedMission {
  instanceId: string;
  cardId: string;
  value: number;
}

export function completeV070ActiveMission(
  state: V070GameState,
  playerId: PlayerId,
): V070CompletedMission {
  const intelligence = requireIntelligenceState(state, playerId);
  const mission = intelligence.activeMission;
  if (!mission) {
    throw new V070GameActionError('That player has no Active Mission.');
  }
  if (mission.startedTurn >= state.turnNumber) {
    throw new V070GameActionError(
      'An Active Mission cannot complete during the turn it begins.',
    );
  }
  if (mission.satisfiedTurn === null) {
    throw new V070GameActionError(
      'The Active Mission requirement has not been satisfied.',
    );
  }

  const cardId = state.cardInstances[mission.instanceId]?.cardId;
  const card = cardId ? v070CanonicalContent.cardsById.get(cardId) : undefined;
  if (!card || !isV070MissionEligibleCardId(card.id)) {
    throw new V070GameActionError(
      'The Active Mission references an invalid Mission card.',
    );
  }

  intelligence.activeMission = null;
  intelligence.operationProgress += 1;
  gainV070Intel(
    state,
    playerId,
    card.cost,
    'Completed normal Mission',
  );
  state.players[playerId].zones.discardPile.push(mission.instanceId);

  appendV070Event(state, {
    type: 'mission_completed',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: mission.instanceId,
      cardId: card.id,
      value: card.cost,
      operationProgress: intelligence.operationProgress,
    },
  });

  return {
    instanceId: mission.instanceId,
    cardId: card.id,
    value: card.cost,
  };
}

export function useV070SpymasterMissionControl(
  state: V070GameState,
  playerId: PlayerId,
  instanceId: string,
): void {
  const player = state.players[playerId];
  const intelligence = requireIntelligenceState(state, playerId);
  if (player.leaderId !== 'spymaster') {
    throw new V070GameActionError(
      'Mission Control requires the Spymaster Leader.',
    );
  }
  if (intelligence.missionControlUsedTurn === state.turnNumber) {
    throw new V070GameActionError(
      'Mission Control may be used only once per turn.',
    );
  }
  if (!v070MissionEligibleHandInstanceIds(state, playerId).includes(instanceId)) {
    throw new V070GameActionError(
      'Mission Control must start an eligible normal Mission from Hand.',
    );
  }

  startV070MissionFromHand(
    state,
    playerId,
    instanceId,
    'Spymaster Mission Control',
  );
  intelligence.missionControlUsedTurn = state.turnNumber;
  appendV070Event(state, {
    type: 'mission_control_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      startedTurn: state.turnNumber,
      faceDown: true,
    },
  });
}

export function useV070RangerFieldcraft(
  state: V070GameState,
  playerId: PlayerId,
  territoryPosition: number,
): void {
  const player = state.players[playerId];
  const intelligence = requireIntelligenceState(state, playerId);
  if (player.leaderId !== 'ranger') {
    throw new V070GameActionError('Fieldcraft requires the Ranger Leader.');
  }
  if (intelligence.fieldcraftUsedTurn === state.turnNumber) {
    throw new V070GameActionError(
      'Fieldcraft may be used only once per turn.',
    );
  }
  const territory = state.board.find(
    candidate => candidate.position === territoryPosition,
  );
  if (!territory) {
    throw new V070GameActionError(
      'Fieldcraft must target a Territory in the Gauntlet.',
    );
  }

  const position = player.position;
  const battleRelevant = Boolean(
    state.battle
    && state.battle.contestedPosition === territoryPosition
    && (
      state.battle.attacker === playerId
      || state.battle.defender === playerId
    ),
  );
  const movementRelevant = Boolean(
    state.turnState?.phase === 'movement'
    && position !== null
    && Math.abs(territoryPosition - position) <= 1,
  );
  const positionRelevant = position === territoryPosition;
  if (!battleRelevant && !movementRelevant && !positionRelevant) {
    throw new V070GameActionError(
      'Fieldcraft may be used only when that printed Territory effect would affect you, your movement, or a battle involving you.',
    );
  }
  if (!v070PrintedTerritoryEffectActive(
    state,
    territory,
    playerId,
    state.battle ? 'battle' : state.turnState?.phase === 'movement'
      ? 'movement'
      : 'continuous',
  )) {
    throw new V070GameActionError(
      'That Territory has no active printed effect for Fieldcraft to ignore.',
    );
  }

  spendV070Intel(state, playerId, 1, 'Ranger Fieldcraft');
  intelligence.fieldcraftUsedTurn = state.turnNumber;
  state.territoryEffectSuppressions.push({
    source: 'fieldcraft',
    sourceActionInstanceId: 'leader:ranger:fieldcraft',
    playerId,
    territoryInstanceId: territory.territoryInstanceId,
    turnNumber: state.turnNumber,
    scope: 'turn',
  });

  appendV070Event(state, {
    type: 'territory_effect_suppressed',
    actor: playerId,
    visibility: 'public',
    payload: {
      source: 'Fieldcraft',
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      territoryId: territory.territoryId,
      scope: 'turn',
      turnNumber: state.turnNumber,
    },
  });
}

function addMissionProgressFlag(
  mission: NonNullable<ReturnType<typeof requireIntelligenceState>['activeMission']>,
  flag: string,
): void {
  if (!mission.progressFlags.includes(flag)) {
    mission.progressFlags.push(flag);
  }
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

function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
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
