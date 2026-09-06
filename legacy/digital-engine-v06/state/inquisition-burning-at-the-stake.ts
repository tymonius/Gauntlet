import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  InquisitionBurningAtTheStakeBattleQueueEntry,
  PlayerID,
} from '../types/v06';
import type { ResolveInquisitionChoiceAction } from './actions';
import { cardValue } from './financiers';
import { HERESY } from './inquisition-heresy';
import { isArcaneCard } from './mystics-ritual';
import { gainFactionResource } from './resources';
import {
  counterintelligenceBlocksHandInspection,
  logCounterintelligenceBlock,
} from './neutral-counterintelligence';
import { GameActionError } from './reducer';

export const BURNING_AT_THE_STAKE = 'inquisition-burning-at-the-stake';

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
  if (!opponent) throw new GameActionError('Burning at the Stake requires an opponent.');
  return opponent.id;
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

export function highestValueHandOptions(hand: CardID[]): CardID[] {
  if (hand.length === 0) return [];
  const highest = Math.max(...hand.map(cardValue));
  return [...new Set(hand.filter((cardId) => cardValue(cardId) === highest))];
}

function awardNormalBattleConvictionIfEligible(
  game: GameState,
  inquisitorId: PlayerID,
  battleId: string | undefined,
): void {
  if (!battleId) return;
  const inquisition = game.players[inquisitorId].inquisition;
  if (!inquisition || inquisition.convictionBattleGainTurn === game.turn) return;
  gainFactionResource(game, inquisitorId, 'conviction', 1, `Burning at the Stake after ${battleId}.`);
  inquisition.convictionBattleGainTurn = game.turn;
}

function resolveBurningCard(
  game: GameState,
  inquisitorId: PlayerID,
  opponent: PlayerID,
  cardId: CardID,
  source: 'action' | 'battle',
  revealedHand: CardID[],
  battleId?: string,
): void {
  const hand = game.players[opponent].zones.hand;
  if (!removeOne(hand, cardId)) {
    throw new GameActionError('The chosen Burning at the Stake card is no longer in the opponent’s hand.');
  }
  game.players[opponent].zones.graveyard.push(cardId);
  if (source === 'battle') awardNormalBattleConvictionIfEligible(game, inquisitorId, battleId);
  const arcane = cardId === HERESY || isArcaneCard(cardId);
  if (arcane) {
    gainFactionResource(game, inquisitorId, 'conviction', 1, `Burning at the Stake condemned Arcane card ${cardId}.`);
  }
  publicLog(
    game,
    inquisitorId,
    'inquisition_burning_at_the_stake_resolved',
    `${game.players[inquisitorId].name} put ${cardId}, a highest-value card in ${game.players[opponent].name}’s revealed hand, into their Graveyard.`,
    { source, battleId, revealedHand, selectedCardId: cardId, arcane },
  );
}

function openBurningChoiceOrResolve(
  game: GameState,
  inquisitorId: PlayerID,
  opponent: PlayerID,
  source: 'action' | 'battle',
  battleId?: string,
  queueId?: string,
): boolean {
  if (counterintelligenceBlocksHandInspection(game, inquisitorId, opponent)) {
    logCounterintelligenceBlock(game, inquisitorId, opponent, 'hand', 'Burning at the Stake');
    return false;
  }
  const revealedHand = [...game.players[opponent].zones.hand];
  publicLog(
    game,
    inquisitorId,
    'inquisition_burning_at_the_stake_revealed',
    `${game.players[opponent].name} revealed their hand for Burning at the Stake.`,
    { source, battleId, revealedHand },
  );
  const highestValueOptions = highestValueHandOptions(revealedHand);
  if (highestValueOptions.length === 0) return false;
  if (highestValueOptions.length === 1) {
    resolveBurningCard(
      game,
      inquisitorId,
      opponent,
      highestValueOptions[0],
      source,
      revealedHand,
      battleId,
    );
    return false;
  }
  game.pendingInquisitionChoice = {
    kind: 'burning_at_the_stake',
    playerId: inquisitorId,
    opponentId: opponent,
    source,
    revealedHand,
    highestValueOptions,
    battleId,
    queueId,
    options: ['select_highest'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = inquisitorId;
  return true;
}

export function applyBurningAtTheStakeAction(game: GameState, inquisitorId: PlayerID, cardId: CardID): boolean {
  if (cardId !== BURNING_AT_THE_STAKE) return false;
  if (game.players[inquisitorId]?.factionId !== 'inquisition') {
    throw new GameActionError('Only an Inquisition player can use Burning at the Stake.');
  }
  openBurningChoiceOrResolve(game, inquisitorId, opponentId(game, inquisitorId), 'action');
  return true;
}

function activeBurning(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === BURNING_AT_THE_STAKE && !card.canceled && !card.negated && !card.virtual);
}

function activeBurningCount(participant: BattleState['attacker']): number {
  return (activeBurning(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeBurning).length;
}

export function queueBurningAtTheStakeBattleEffects(game: GameState, battle: BattleState): number {
  const result = game.recentBattleResult;
  if (result?.battleId !== battle.id) return 0;
  const queue = game.inquisitionBurningAtTheStakeQueue ?? [];
  let queued = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const inquisitor = game.players[participant.playerId];
    if (inquisitor?.factionId !== 'inquisition' || !inquisitor.inquisition) continue;
    const opponent = participant.playerId === battle.attacker.playerId
      ? battle.defender.playerId
      : battle.attacker.playerId;
    if (result.loser !== opponent) continue;
    const count = activeBurningCount(participant);
    for (let index = 0; index < count; index += 1) {
      queue.push({
        id: `${battle.id}:burning-at-the-stake:${participant.playerId}:${index}`,
        battleId: battle.id,
        inquisitorId: participant.playerId,
        opponentId: opponent,
      });
      queued += 1;
    }
  }
  game.inquisitionBurningAtTheStakeQueue = queue.length > 0 ? queue : undefined;
  return queued;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || game.inquisitionAccusationQueue?.length
    || game.inquisitionExcommunicationQueue?.length
    || game.inquisitionGuiltByAssociationQueue?.length
    || game.inquisitionActOfFaithQueue?.length
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
  const queue = game.inquisitionBurningAtTheStakeQueue;
  if (!queue?.length || queue[0].id !== queueId) {
    throw new GameActionError('The pending Burning at the Stake effect is no longer first in its queue.');
  }
  queue.shift();
  if (queue.length === 0) game.inquisitionBurningAtTheStakeQueue = undefined;
}

export function openNextBurningAtTheStakeChoice(game: GameState): boolean {
  if (hasBlockingWindow(game)) return false;
  while (game.inquisitionBurningAtTheStakeQueue?.length) {
    const effect: InquisitionBurningAtTheStakeBattleQueueEntry = game.inquisitionBurningAtTheStakeQueue[0];
    const opened = openBurningChoiceOrResolve(
      game,
      effect.inquisitorId,
      effect.opponentId,
      'battle',
      effect.battleId,
      effect.id,
    );
    if (opened) return true;
    shiftQueue(game, effect.id);
  }
  return false;
}

export function isBurningAtTheStakeChoice(kind: unknown): kind is 'burning_at_the_stake' {
  return kind === 'burning_at_the_stake';
}

export function resolveBurningAtTheStakeChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.kind !== 'burning_at_the_stake' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Burning at the Stake choice.`);
  }
  const currentHighest = highestValueHandOptions(game.players[pending.opponentId].zones.hand);
  if (action.choice !== 'select_highest'
    || !pending.highestValueOptions.includes(action.cardId)
    || !currentHighest.includes(action.cardId)) {
    throw new GameActionError('Choose a card tied for the highest deckbuilding value in the revealed hand.');
  }

  resolveBurningCard(
    game,
    pending.playerId,
    pending.opponentId,
    action.cardId,
    pending.source,
    pending.revealedHand,
    pending.battleId,
  );
  const resumePriority = pending.resumePriorityPlayer;
  if (pending.queueId) shiftQueue(game, pending.queueId);
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  openNextBurningAtTheStakeChoice(game);
}
