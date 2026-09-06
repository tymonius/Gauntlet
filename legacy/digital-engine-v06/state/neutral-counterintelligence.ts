import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';

export const COUNTERINTELLIGENCE = 'neutral-counterintelligence';

export type CounterintelligenceInformationType = 'hand' | 'battle_hand' | 'face_down_battle_card';

function activeBattleCard(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === COUNTERINTELLIGENCE
    && !card.canceled
    && !card.negated,
  );
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  return undefined;
}

/**
 * Banked Counterintelligence is passive while available. Subversion's battle
 * prohibition suppresses it in the same way as other banked Asset effects.
 */
export function counterintelligenceAssetActive(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  return Boolean(
    bankedAssetCardUseAllowed(game, playerId, COUNTERINTELLIGENCE),
  );
}

/**
 * A Battle-form copy protects its controller only until the normal reveal.
 * The faceDown flag is cleared by the shared normal-reveal step, so the
 * protection expires without separate cleanup state.
 */
export function counterintelligenceBattleProtectionActive(
  game: GameState,
  playerId: PlayerID,
): boolean {
  const participant = participantFor(game, playerId);
  if (!participant) return false;
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .some((card) => activeBattleCard(card) && card.faceDown);
}

function opposingEffect(sourcePlayerId: PlayerID, targetPlayerId: PlayerID): boolean {
  return sourcePlayerId !== targetPlayerId;
}

export function counterintelligenceBlocksHandInspection(
  game: GameState,
  sourcePlayerId: PlayerID,
  targetPlayerId: PlayerID,
): boolean {
  return opposingEffect(sourcePlayerId, targetPlayerId)
    && counterintelligenceAssetActive(game, targetPlayerId);
}

export function counterintelligenceBlocksBattleHandInspection(
  game: GameState,
  sourcePlayerId: PlayerID,
  targetPlayerId: PlayerID,
): boolean {
  return opposingEffect(sourcePlayerId, targetPlayerId)
    && counterintelligenceAssetActive(game, targetPlayerId);
}

export function counterintelligenceBlocksFaceDownBattleCardInspection(
  game: GameState,
  sourcePlayerId: PlayerID,
  targetPlayerId: PlayerID,
): boolean {
  return opposingEffect(sourcePlayerId, targetPlayerId)
    && (
      counterintelligenceAssetActive(game, targetPlayerId)
      || counterintelligenceBattleProtectionActive(game, targetPlayerId)
    );
}

export function logCounterintelligenceBlock(
  game: GameState,
  sourcePlayerId: PlayerID,
  protectedPlayerId: PlayerID,
  informationType: CounterintelligenceInformationType,
  source: string,
): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor: protectedPlayerId,
    type: 'neutral_counterintelligence_blocked',
    message: `${game.players[protectedPlayerId].name}'s Counterintelligence prevented an opposing effect from inspecting hidden information.`,
    payload: { sourcePlayerId, protectedPlayerId, informationType, source },
    visibility: 'public',
  } satisfies GameEvent);
}
