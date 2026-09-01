import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  InquisitionActOfFaithBattleQueueEntry,
  PlayerID,
} from '../types/v06';
import type { ResolveInquisitionChoiceAction } from './actions';
import { gainFactionResource } from './resources';
import { GameActionError } from './reducer';

export const ACT_OF_FAITH = 'inquisition-act-of-faith';

function publicLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
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

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const opponent = Object.values(game.players).find((player) => player.id !== playerId);
  if (!opponent) throw new GameActionError('Act of Faith requires an opponent.');
  return opponent.id;
}

function revealTopCards(game: GameState, opponent: PlayerID, count: number): CardID[] {
  return game.players[opponent].zones.deck.splice(0, count);
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function awardBattleConvictionIfEligible(
  game: GameState,
  inquisitorId: PlayerID,
  battleId: string | undefined,
): void {
  if (!battleId) return;
  const inquisition = game.players[inquisitorId].inquisition;
  if (!inquisition || inquisition.convictionBattleGainTurn === game.turn) return;
  gainFactionResource(game, inquisitorId, 'conviction', 1, `Act of Faith after ${battleId}.`);
  inquisition.convictionBattleGainTurn = game.turn;
}

function resolveSingleRevealedCard(
  game: GameState,
  inquisitorId: PlayerID,
  opponent: PlayerID,
  cardId: CardID,
  source: 'action' | 'battle',
  battleId?: string,
): void {
  game.players[opponent].zones.graveyard.push(cardId);
  if (source === 'battle') awardBattleConvictionIfEligible(game, inquisitorId, battleId);
  publicLog(
    game,
    inquisitorId,
    'inquisition_act_of_faith_resolved',
    `${game.players[inquisitorId].name} revealed ${cardId} from ${game.players[opponent].name}’s Draw Pile and put it in their Graveyard.`,
    { source, battleId, revealedCards: [cardId], graveyardCardId: cardId, discardedCardIds: [] },
  );
}

export function applyActOfFaithAction(game: GameState, inquisitorId: PlayerID, cardId: CardID): boolean {
  if (cardId !== ACT_OF_FAITH) return false;
  if (game.players[inquisitorId]?.factionId !== 'inquisition') {
    throw new GameActionError('Only an Inquisition player can use Act of Faith.');
  }
  const opponent = opponentId(game, inquisitorId);
  const revealedCards = revealTopCards(game, opponent, 3);
  if (revealedCards.length === 0) {
    publicLog(
      game,
      inquisitorId,
      'inquisition_act_of_faith_empty',
      `${game.players[inquisitorId].name} used Act of Faith, but ${game.players[opponent].name}’s Draw Pile was empty.`,
      { source: 'action' },
    );
    return true;
  }
  if (revealedCards.length === 1) {
    resolveSingleRevealedCard(game, inquisitorId, opponent, revealedCards[0], 'action');
    return true;
  }
  game.pendingInquisitionChoice = {
    kind: 'act_of_faith',
    playerId: inquisitorId,
    opponentId: opponent,
    source: 'action',
    revealedCards,
    options: ['select_graveyard'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = inquisitorId;
  publicLog(
    game,
    inquisitorId,
    'inquisition_act_of_faith_revealed',
    `${game.players[inquisitorId].name} revealed ${revealedCards.length} cards from ${game.players[opponent].name}’s Draw Pile with Act of Faith.`,
    { source: 'action', revealedCards },
  );
  return true;
}

function activeActOfFaith(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === ACT_OF_FAITH && !card.canceled && !card.negated && !card.virtual);
}

function activeActOfFaithCount(participant: BattleState['attacker']): number {
  return (activeActOfFaith(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeActOfFaith).length;
}

export function queueActOfFaithBattleEffects(game: GameState, battle: BattleState): number {
  if (game.recentBattleResult?.battleId !== battle.id) return 0;
  const queue = game.inquisitionActOfFaithQueue ?? [];
  let queued = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const inquisitor = game.players[participant.playerId];
    if (inquisitor?.factionId !== 'inquisition' || !inquisitor.inquisition) continue;
    const opponent = participant.playerId === battle.attacker.playerId
      ? battle.defender.playerId
      : battle.attacker.playerId;
    const count = activeActOfFaithCount(participant);
    for (let index = 0; index < count; index += 1) {
      queue.push({
        id: `${battle.id}:act-of-faith:${participant.playerId}:${index}`,
        battleId: battle.id,
        inquisitorId: participant.playerId,
        opponentId: opponent,
      });
      queued += 1;
    }
  }
  game.inquisitionActOfFaithQueue = queue.length > 0 ? queue : undefined;
  return queued;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || game.inquisitionAccusationQueue?.length
    || game.inquisitionExcommunicationQueue?.length
    || game.inquisitionGuiltByAssociationQueue?.length
    || game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

function shiftQueue(game: GameState, queueId: string): void {
  const queue = game.inquisitionActOfFaithQueue;
  if (!queue?.length || queue[0].id !== queueId) {
    throw new GameActionError('The pending Act of Faith effect is no longer first in its queue.');
  }
  queue.shift();
  if (queue.length === 0) game.inquisitionActOfFaithQueue = undefined;
}

export function openNextActOfFaithChoice(game: GameState): boolean {
  if (hasBlockingWindow(game)) return false;
  while (game.inquisitionActOfFaithQueue?.length) {
    const effect: InquisitionActOfFaithBattleQueueEntry = game.inquisitionActOfFaithQueue[0];
    const revealedCards = revealTopCards(game, effect.opponentId, 2);
    if (revealedCards.length === 0) {
      shiftQueue(game, effect.id);
      publicLog(
        game,
        effect.inquisitorId,
        'inquisition_act_of_faith_empty',
        `${game.players[effect.inquisitorId].name} resolved Act of Faith after the battle, but ${game.players[effect.opponentId].name}’s Draw Pile was empty.`,
        { source: 'battle', battleId: effect.battleId },
      );
      continue;
    }
    if (revealedCards.length === 1) {
      shiftQueue(game, effect.id);
      resolveSingleRevealedCard(
        game,
        effect.inquisitorId,
        effect.opponentId,
        revealedCards[0],
        'battle',
        effect.battleId,
      );
      continue;
    }
    game.pendingInquisitionChoice = {
      kind: 'act_of_faith',
      playerId: effect.inquisitorId,
      opponentId: effect.opponentId,
      source: 'battle',
      revealedCards,
      battleId: effect.battleId,
      queueId: effect.id,
      options: ['select_graveyard'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = effect.inquisitorId;
    publicLog(
      game,
      effect.inquisitorId,
      'inquisition_act_of_faith_revealed',
      `${game.players[effect.inquisitorId].name} revealed ${revealedCards.length} cards from ${game.players[effect.opponentId].name}’s Draw Pile with Act of Faith after the battle.`,
      { source: 'battle', battleId: effect.battleId, revealedCards },
    );
    return true;
  }
  return false;
}

export function isActOfFaithChoice(kind: unknown): kind is 'act_of_faith' {
  return kind === 'act_of_faith';
}

export function resolveActOfFaithChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.kind !== 'act_of_faith' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Act of Faith choice.`);
  }
  if (action.choice !== 'select_graveyard' || !pending.revealedCards.includes(action.cardId)) {
    throw new GameActionError('Choose one of the cards revealed by Act of Faith.');
  }

  const remaining = [...pending.revealedCards];
  if (!removeOne(remaining, action.cardId)) {
    throw new GameActionError('The chosen Act of Faith card is no longer available.');
  }
  const opponent = game.players[pending.opponentId];
  opponent.zones.graveyard.push(action.cardId);
  opponent.zones.discard.push(...remaining);
  if (pending.source === 'battle') {
    awardBattleConvictionIfEligible(game, pending.playerId, pending.battleId);
  }

  const resumePriority = pending.resumePriorityPlayer;
  if (pending.queueId) shiftQueue(game, pending.queueId);
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(
    game,
    pending.playerId,
    'inquisition_act_of_faith_resolved',
    `${game.players[pending.playerId].name} put ${action.cardId} in ${opponent.name}’s Graveyard and the other revealed cards in their Discard Pile.`,
    {
      source: pending.source,
      battleId: pending.battleId,
      revealedCards: pending.revealedCards,
      graveyardCardId: action.cardId,
      discardedCardIds: remaining,
    },
  );
  openNextActOfFaithChoice(game);
}
