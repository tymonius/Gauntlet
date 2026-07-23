import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';

const SUBVERSION = 'intelligence-subversion';
const RESOLUTION_KEY = 'intelligence_subversion_restrictions';

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated);
}

function participantUsedSubversion(participant: BattleParticipantState): boolean {
  return active(participant.handCommit) && participant.handCommit.cardId === SUBVERSION
    || participant.battleDrawPlayed.some((card) => active(card) && card.cardId === SUBVERSION);
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

export function applySubversionBattleRestrictions(game: GameState): void {
  const battle = game.battle;
  if (!battle || battle.effectsResolved.includes(RESOLUTION_KEY)) return;

  const prohibited = new Set(battle.bankedAssetUseProhibited ?? []);
  for (const participant of [battle.attacker, battle.defender]) {
    if (!participantUsedSubversion(participant)) continue;
    const opponent = participant.playerId === battle.attacker.playerId
      ? battle.defender.playerId
      : battle.attacker.playerId;
    if (prohibited.has(opponent)) continue;
    prohibited.add(opponent);
    publicLog(game, participant.playerId, opponent);
  }
  battle.bankedAssetUseProhibited = [...prohibited];
  battle.effectsResolved.push(RESOLUTION_KEY);
}
