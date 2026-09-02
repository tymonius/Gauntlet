import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameState,
  PlayerID,
} from '../types/v06';
import { GameActionError } from './reducer';

/**
 * Battle effects proven safe to re-enter through the shared resolution pipeline.
 *
 * This registry is deliberately explicit. Adding a card here means its Battle
 * effect has regression coverage when the physical card is used from a source
 * other than a normal hand commitment or Battle Hand selection.
 */
const replayableBattleEffectIds = new Set<CardID>([
  'card-valor',
  'card-fortifications',
  'card-attrition',
  'neutral-attrition',
  'neutral-fortifications',
  'neutral-valor',
]);

export function participantForBattle(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

export function canReplayBattleEffect(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  if (!game.battle || game.battle.stage !== 'dice') return false;
  if (!replayableBattleEffectIds.has(cardId)) return false;
  if ((cardId === 'card-fortifications' || cardId === 'neutral-fortifications')
    && game.battle.defender.playerId !== playerId) return false;
  return true;
}

export function replayableBattleEffectsIn(
  game: GameState,
  playerId: PlayerID,
  cardIds: readonly CardID[],
): CardID[] {
  return cardIds.filter((cardId) => canReplayBattleEffect(game, playerId, cardId));
}

export function addReplayedBattleCard(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
): BattlePlayedCard {
  if (!canReplayBattleEffect(game, playerId, cardId)) {
    throw new GameActionError(`${cardId} does not have a supported Battle effect that can resolve now.`);
  }
  const participant = participantForBattle(game, playerId);
  const played: BattlePlayedCard = {
    cardId,
    owner: playerId,
    origin: 'replayed',
    faceDown: false,
    canceled: false,
  };
  participant.battleDrawPlayed.push(played);
  return played;
}

export function addVirtualReplayedBattleCard(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
): BattlePlayedCard {
  const played = addReplayedBattleCard(game, playerId, cardId);
  played.virtual = true;
  played.effectOnlyReplay = true;
  return played;
}

export function supportedReplayedBattleEffectIds(): CardID[] {
  return [...replayableBattleEffectIds];
}
