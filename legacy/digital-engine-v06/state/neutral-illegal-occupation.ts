import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import { ILLEGAL_OCCUPATION } from '../effects/asset-policy';

export {
  ILLEGAL_OCCUPATION,
  illegalOccupationSourceFor,
  illegalOccupationSuppressesBankedAssets,
} from '../effects/asset-policy';
const ILLEGAL_OCCUPATION_BATTLE_RESOLUTION = 'neutral_illegal_occupation_battle';

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === ILLEGAL_OCCUPATION
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (active(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(active).length;
}

function publicLog(
  game: GameState,
  actor: PlayerID,
  type: string,
  message: string,
  payload?: unknown,
): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'public',
  } satisfies GameEvent);
}

/**
 * The Battle form applies only while counterattacking an opposing occupier on
 * a Territory controlled by the attacker. Every active physical copy grants
 * one advantage; the suppression itself is not multiplied.
 */
export function applyIllegalOccupationBattleEffects(game: GameState): boolean {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || battle.effectsResolved.includes(ILLEGAL_OCCUPATION_BATTLE_RESOLUTION)) return false;

  battle.effectsResolved.push(ILLEGAL_OCCUPATION_BATTLE_RESOLUTION);
  const location = game.board.spaces.find((space) => space.id === battle.location);
  if (!location
    || location.kind !== 'territory'
    || location.controller !== battle.attacker.playerId
    || location.occupant !== battle.defender.playerId) return false;

  const count = activeCopyCount(battle.attacker);
  if (count < 1) return false;

  const prohibited = new Set(battle.bankedAssetUseProhibited ?? []);
  prohibited.add(battle.defender.playerId);
  battle.bankedAssetUseProhibited = [...prohibited];
  battle.attacker.advantage = (battle.attacker.advantage ?? 0) + count;
  publicLog(
    game,
    battle.attacker.playerId,
    'neutral_illegal_occupation_battle',
    `${game.players[battle.attacker.playerId].name} counterattacked with Illegal Occupation, gained ${count} advantage, and made the defender's banked Assets inactive for this battle.`,
    { battleId: battle.id, targetPlayerId: battle.defender.playerId, count },
  );
  return true;
}
