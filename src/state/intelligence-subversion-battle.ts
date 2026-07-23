import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';

export const SUBVERSION_BATTLE_CARD = 'intelligence-subversion';
export const SUBVERSION_RESOLUTION_PREFIX = 'intelligence_subversion_restriction:';

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function participantUsedSubversion(participant: BattleParticipantState): boolean {
  return active(participant.handCommit) && participant.handCommit.cardId === SUBVERSION_BATTLE_CARD
    || participant.battleDrawPlayed.some((card) => active(card) && card.cardId === SUBVERSION_BATTLE_CARD);
}

function publicLog(game: GameState, actor: PlayerID, target: PlayerID): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type: 'intelligence_subversion_battle_restriction',
    message: `${game.players[actor].name} prevented ${game.players[target].name} from using banked Assets during the rest of this battle.`,
    payload: { targetPlayerId: target },
    visibility: 'public',
  } satisfies GameEvent);
}

export function bankedAssetUseAllowed(game: GameState, playerId: PlayerID): boolean {
  return !game.battle?.bankedAssetUseProhibited?.includes(playerId);
}

export function subversionRestrictionResolved(game: GameState, playerId: PlayerID): boolean {
  return game.battle?.effectsResolved.includes(`${SUBVERSION_RESOLUTION_PREFIX}${playerId}`) ?? false;
}

export function applySubversionRestrictionForPlayer(game: GameState, playerId: PlayerID): boolean {
  const battle = game.battle;
  if (!battle || subversionRestrictionResolved(game, playerId)) return false;
  if (battle.attacker.playerId !== playerId && battle.defender.playerId !== playerId) return false;

  const opponent = battle.attacker.playerId === playerId
    ? battle.defender.playerId
    : battle.attacker.playerId;
  const prohibited = new Set(battle.bankedAssetUseProhibited ?? []);
  if (!prohibited.has(opponent)) {
    prohibited.add(opponent);
    publicLog(game, playerId, opponent);
  }
  battle.bankedAssetUseProhibited = [...prohibited];
  battle.effectsResolved.push(`${SUBVERSION_RESOLUTION_PREFIX}${playerId}`);
  return true;
}

export function applyCopiedSubversionRestriction(game: GameState, playerId: PlayerID): void {
  applySubversionRestrictionForPlayer(game, playerId);
}

export function applySubversionBattleRestrictions(game: GameState): void {
  const battle = game.battle;
  if (!battle) return;
  for (const participant of [battle.attacker, battle.defender]) {
    if (participantUsedSubversion(participant)) applySubversionRestrictionForPlayer(game, participant.playerId);
  }
}
