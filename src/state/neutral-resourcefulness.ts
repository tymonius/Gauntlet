import { v06CanonicalContent } from '../content/v06';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import { activeBankedAssetCopies } from './banked-assets';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const RESOURCEFULNESS = 'neutral-resourcefulness';
const RESOURCEFULNESS_BATTLE_RESOLUTION = 'neutral_resourcefulness_battle';
const RESOURCEFULNESS_DRAW_EVENT = 'neutral_resourcefulness_asset_draw';

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

export function cardCost(cardId: CardID): number | undefined {
  return v06CanonicalContent.cardsById.get(cardId)?.cost;
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated && !card.virtual);
}

function activeCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed].filter(active);
}

function resourcefulnessDrawUsedThisTurn(game: GameState, playerId: PlayerID): boolean {
  return game.log.some((event) => (
    event.turn === game.turn
    && event.actor === playerId
    && event.type === RESOURCEFULNESS_DRAW_EVENT
  ));
}

function mayUseResourcefulnessAsset(game: GameState, playerId: PlayerID): boolean {
  return game.activePlayer === playerId
    && !resourcefulnessDrawUsedThisTurn(game, playerId)
    && activeBankedAssetCopies(game, playerId, RESOURCEFULNESS) > 0;
}

function drawWithResourcefulness(
  game: GameState,
  playerId: PlayerID,
  sourceCardId: CardID,
  source: 'action' | 'battle',
): CardID[] {
  const player = game.players[playerId];
  const draw = drawFromDeck(player, { count: 1 });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    playerId,
    RESOURCEFULNESS_DRAW_EVENT,
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Resourcefulness after using a cost-1 card.`,
    {
      source,
      sourceCardId,
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}

export function canBankResourcefulness(game: GameState, playerId: PlayerID): boolean {
  return !game.players[playerId].zones.assetBank.includes(RESOURCEFULNESS);
}

export function requireResourcefulnessActionAllowed(game: GameState, playerId: PlayerID): void {
  if (!canBankResourcefulness(game, playerId)) {
    throw new GameActionError('You may have only one banked Resourcefulness.');
  }
}

/** Captures whether a cost-1 Action play qualifies before that Action changes the board. */
export function resourcefulnessActionTriggerEligible(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
): boolean {
  return cardCost(cardId) === 1 && mayUseResourcefulnessAsset(game, playerId);
}

export function applyResourcefulnessActionDraw(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  eligible: boolean,
): CardID[] {
  if (!eligible || resourcefulnessDrawUsedThisTurn(game, playerId)) return [];
  return drawWithResourcefulness(game, playerId, cardId, 'action');
}

/** Draws once on the controller's turn when an active cost-1 Battle card is used. */
export function applyResourcefulnessBattleAssetDraw(game: GameState): CardID[] {
  const battle = game.battle;
  const playerId = game.activePlayer;
  if (!battle || battle.stage !== 'dice' || !mayUseResourcefulnessAsset(game, playerId)) return [];
  const participant = battle.attacker.playerId === playerId
    ? battle.attacker
    : battle.defender.playerId === playerId
      ? battle.defender
      : undefined;
  if (!participant) return [];
  const source = activeCards(participant).find((card) => cardCost(card.cardId) === 1);
  if (!source) return [];
  return drawWithResourcefulness(game, playerId, source.cardId, 'battle');
}

/** Each active physical Resourcefulness copy gains advantage when accompanied by another active cost-1 card. */
export function applyResourcefulnessBattleEffects(game: GameState): number {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || battle.effectsResolved.includes(RESOURCEFULNESS_BATTLE_RESOLUTION)) return 0;
  battle.effectsResolved.push(RESOURCEFULNESS_BATTLE_RESOLUTION);

  let applied = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const cards = activeCards(participant);
    const copies = cards.filter((card) => card.cardId === RESOURCEFULNESS).length;
    if (copies < 1 || !cards.some((card) => card.cardId !== RESOURCEFULNESS && cardCost(card.cardId) === 1)) continue;
    participant.advantage = (participant.advantage ?? 0) + copies;
    applied += copies;
    appendPublicLog(
      game,
      participant.playerId,
      'neutral_resourcefulness_battle',
      `${game.players[participant.playerId].name} gained ${copies} advantage from Resourcefulness.`,
      { battleId: battle.id, copies },
    );
  }
  return applied;
}
