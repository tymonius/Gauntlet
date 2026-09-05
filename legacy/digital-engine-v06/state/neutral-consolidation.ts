import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { PlayActionCardAction } from './actions';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const CONSOLIDATION = 'neutral-consolidation';

export interface PreparedConsolidationAction {
  remainingHand: CardID[];
}

function appendPublicLog(
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

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function activeConsolidation(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === CONSOLIDATION
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (activeConsolidation(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeConsolidation).length;
}

export function playerCapturedTerritoryThisTurn(game: GameState, playerId: PlayerID): boolean {
  return game.log.some((event) => (
    event.turn === game.turn
    && event.actor === playerId
    && event.type === 'territory_captured'
  ));
}

export function prepareConsolidationAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedConsolidationAction | undefined {
  if (action.cardId !== CONSOLIDATION) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);
  if (!playerCapturedTerritoryThisTurn(game, action.playerId)) {
    throw new GameActionError('Consolidation can be played only if you captured a Territory this turn.');
  }
  const remainingHand = [...player.zones.hand];
  if (!removeOne(remainingHand, CONSOLIDATION)) {
    throw new GameActionError(`${player.name} does not have Consolidation in hand.`);
  }
  return { remainingHand };
}

export function applyConsolidationAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedConsolidationAction,
): CardID[] {
  const player = game.players[playerId];
  player.zones.hand = [...prepared.remainingHand];
  const draw = drawFromDeck(player, { count: 2 });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    playerId,
    'neutral_consolidation_action',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Consolidation.`,
    {
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}

export function applyConsolidationAfterBattle(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): CardID[] {
  if (winnerId !== battle.attacker.playerId) return [];
  if (controllerBeforeBattle !== battle.defender.playerId) return [];
  const location = game.board.spaces.find((space) => space.id === battle.location);
  if (location?.kind !== 'territory') return [];

  const count = activeCopyCount(battle.attacker);
  if (count < 1) return [];
  const player = game.players[battle.attacker.playerId];
  const draw = drawFromDeck(player, { count });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    battle.attacker.playerId,
    'neutral_consolidation_battle',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Consolidation after winning as the attacker.`,
    {
      battleId: battle.id,
      copies: count,
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}
