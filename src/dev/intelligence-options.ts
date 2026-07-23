import { intelligenceCardsById, intelligenceMissionCardIds } from '../cards';
import type { GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state/actions';
import { specialOperationIntelCost, specialOperationReady } from '../state/intelligence-missions';

export interface IntelligenceGuidedOption {
  label: string;
  action: AppStateAction;
}

export function buildIntelligenceMissionOptions(game: GameState, playerId: PlayerID): IntelligenceGuidedOption[] {
  const player = game.players[playerId];
  if (!player?.intelligence || player.factionId !== 'intelligence') return [];
  if (game.phase !== 'action_after_movement' || game.activePlayer !== playerId || game.priorityPlayer !== playerId) return [];
  if (player.actionsRemaining < 1 || player.hasPlayedActionThisTurn || player.hasPlayedBattleThisTurn) return [];

  const options: IntelligenceGuidedOption[] = [];
  const mission = player.intelligence.activeMission;
  const operation = player.intelligence.specialOperation;

  if (mission) {
    const card = intelligenceCardsById.get(mission.cardId)!;
    if (mission.startedTurn < game.turn && mission.requirementSatisfied) options.push({ label: `Complete Mission: ${card.name}`, action: { type: 'complete_intelligence_mission', playerId } });
    if ((player.resources?.intel?.value ?? 0) >= card.cost) options.push({ label: `Abort Mission: ${card.name} (${card.cost} Intel)`, action: { type: 'abort_intelligence_mission', playerId } });
    return options;
  }

  if (operation) {
    const card = intelligenceCardsById.get(operation.cardId)!;
    const cost = specialOperationIntelCost(game, operation.cardId);
    if (operation.requirementSatisfied && specialOperationReady(game, playerId) && (player.resources?.intel?.value ?? 0) >= cost) {
      options.push({ label: `Complete Special Operation: ${card.name} (${cost} Intel)`, action: { type: 'complete_special_operation', playerId } });
    }
    return options;
  }

  const missionCards = player.zones.hand.filter((cardId) => intelligenceMissionCardIds.has(cardId));
  const specialReady = specialOperationReady(game, playerId);
  for (const cardId of missionCards) {
    const card = intelligenceCardsById.get(cardId)!;
    options.push({ label: `Start Mission: ${card.name}`, action: { type: 'start_intelligence_mission', playerId, cardId, kind: 'normal' } });
    if (specialReady) options.push({ label: `Start Special Operation: ${card.name}`, action: { type: 'start_intelligence_mission', playerId, cardId, kind: 'special_operation' } });
  }
  return options;
}
