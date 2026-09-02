import type {
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import { activeBankedAssetCopies } from './banked-assets';
import { drawFromDeck } from './draw';

export const LIBERATION = 'neutral-liberation';

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

export function battleIsCounterattack(
  game: GameState,
  battle: BattleState = game.battle!,
  controllerBeforeBattle?: PlayerID,
): boolean {
  if (!battle) return false;
  const location = game.board.spaces.find((space) => space.id === battle.location);
  const controller = controllerBeforeBattle ?? location?.controller;
  return Boolean(
    location
    && location.kind === 'territory'
    && controller === battle.attacker.playerId,
  );
}

export function liberationActionOpportunityActive(
  game: GameState,
  playerId: PlayerID,
): boolean {
  const opportunity = game.neutralLiberationActionOpportunity;
  return Boolean(
    opportunity
    && opportunity.playerId === playerId
    && opportunity.turn === game.turn
    && opportunity.remaining > 0,
  );
}

export function consumeLiberationActionOpportunity(
  game: GameState,
  playerId: PlayerID,
): void {
  const opportunity = game.neutralLiberationActionOpportunity;
  if (!opportunity
    || opportunity.playerId !== playerId
    || opportunity.turn !== game.turn) return;
  opportunity.remaining -= 1;
  if (opportunity.remaining < 1) game.neutralLiberationActionOpportunity = undefined;
}

export function clearLiberationActionOpportunity(
  game: GameState,
  playerId: PlayerID,
): void {
  if (game.neutralLiberationActionOpportunity?.playerId === playerId) {
    game.neutralLiberationActionOpportunity = undefined;
  }
}

/**
 * Resolves the Action/Asset form after battle cleanup. Each active physical
 * Asset copy triggers independently.
 */
export function applyLiberationAssetAfterBattle(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): CardID[] {
  const playerId = battle.attacker.playerId;
  if (winnerId !== playerId || !battleIsCounterattack(game, battle, controllerBeforeBattle)) return [];
  if (battle.bankedAssetUseProhibited?.includes(playerId)) return [];

  const seditionSuppressed = battle.seditionInactiveAssets?.[playerId]
    ?.filter((cardId) => cardId === LIBERATION).length ?? 0;
  const copies = Math.max(
    0,
    activeBankedAssetCopies(game, playerId, LIBERATION) - seditionSuppressed,
  );
  if (copies < 1) return [];

  const player = game.players[playerId];
  const draw = drawFromDeck(player, { count: copies });
  player.zones.hand.push(...draw.drawnCards);
  player.actionsRemaining += copies;

  const existing = game.neutralLiberationActionOpportunity;
  game.neutralLiberationActionOpportunity = existing
    && existing.playerId === playerId
    && existing.turn === game.turn
    ? { ...existing, remaining: existing.remaining + copies }
    : { playerId, turn: game.turn, remaining: copies };

  appendPublicLog(
    game,
    playerId,
    'neutral_liberation_asset',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} and gained ${copies} Action${copies === 1 ? '' : 's'} and ${copies} additional Action Opportunity${copies === 1 ? '' : 's'} with Liberation after winning a counterattack.`,
    {
      battleId: battle.id,
      copies,
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}
