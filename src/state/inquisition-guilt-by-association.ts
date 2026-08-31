import { v06CanonicalContent } from '../content/v06';
import type {
  ActionCardTarget,
  ResolveInquisitionChoiceAction,
} from './actions';
import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  InquisitionGuiltByAssociationBattleQueueEntry,
  PlayerID,
} from '../types';
import { gainFactionResource } from './resources';
import { GameActionError } from './reducer';

export const GUILT_BY_ASSOCIATION = 'inquisition-guilt-by-association';

export interface GuiltByAssociationActionTarget {
  opponentId: PlayerID;
  cardId: CardID;
}

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
  if (!opponent) throw new GameActionError('Guilt by Association requires an opponent.');
  return opponent.id;
}

function cardTarget(target: ActionCardTarget | undefined): target is Extract<ActionCardTarget, { kind: 'card' }> {
  return target?.kind === 'card';
}

export function inquisitionCardTitle(cardId: CardID): string {
  return v06CanonicalContent.cardsById.get(cardId)?.name ?? cardId;
}

function uniqueCardsByTitle(cardIds: CardID[]): CardID[] {
  const titles = new Set<string>();
  const result: CardID[] = [];
  for (const cardId of cardIds) {
    const title = inquisitionCardTitle(cardId);
    if (titles.has(title)) continue;
    titles.add(title);
    result.push(cardId);
  }
  return result;
}

function removeEveryMatchingTitle(game: GameState, opponent: PlayerID, selectedCardId: CardID): CardID[] {
  const player = game.players[opponent];
  const title = inquisitionCardTitle(selectedCardId);
  const moved: CardID[] = [];
  const remaining: CardID[] = [];
  for (const cardId of player.zones.discard) {
    if (inquisitionCardTitle(cardId) === title) moved.push(cardId);
    else remaining.push(cardId);
  }
  player.zones.discard = remaining;
  player.zones.graveyard.push(...moved);
  return moved;
}

export function requireGuiltByAssociationActionTarget(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): GuiltByAssociationActionTarget | undefined {
  if (cardId !== GUILT_BY_ASSOCIATION) return undefined;
  if (game.players[playerId]?.factionId !== 'inquisition') {
    throw new GameActionError('Only an Inquisition player can use Guilt by Association.');
  }
  const opponent = opponentId(game, playerId);
  if (targets?.length !== 1 || !cardTarget(targets[0])) {
    throw new GameActionError('Guilt by Association requires one card in the opponent’s Discard Pile.');
  }
  const target = targets[0];
  if (target.owner !== opponent || !game.players[opponent].zones.discard.includes(target.cardId)) {
    throw new GameActionError('Choose a card that is currently in the opponent’s Discard Pile.');
  }
  return { opponentId: opponent, cardId: target.cardId };
}

export function applyGuiltByAssociationAction(
  game: GameState,
  inquisitorId: PlayerID,
  target: GuiltByAssociationActionTarget | undefined,
): boolean {
  if (!target) return false;
  const moved = removeEveryMatchingTitle(game, target.opponentId, target.cardId);
  publicLog(
    game,
    inquisitorId,
    'inquisition_guilt_by_association_action',
    `${game.players[inquisitorId].name} moved every ${inquisitionCardTitle(target.cardId)} in ${game.players[target.opponentId].name}’s Discard Pile to their Graveyard.`,
    { selectedCardId: target.cardId, movedCardIds: moved, title: inquisitionCardTitle(target.cardId) },
  );
  return true;
}

function activeGuiltByAssociation(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === GUILT_BY_ASSOCIATION && !card.canceled && !card.negated && !card.virtual);
}

function activeGuiltCount(participant: BattleState['attacker']): number {
  return (activeGuiltByAssociation(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeGuiltByAssociation).length;
}

function usedPhysicalCards(participant: BattleState['attacker']): CardID[] {
  const cards: CardID[] = [];
  if (participant.handCommit && !participant.handCommit.virtual) cards.push(participant.handCommit.cardId);
  cards.push(...participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => card.cardId));
  return uniqueCardsByTitle(cards);
}

export function queueGuiltByAssociationBattleEffects(game: GameState, battle: BattleState): number {
  if (game.recentBattleResult?.battleId !== battle.id) return 0;
  const queue = game.inquisitionGuiltByAssociationQueue ?? [];
  let queued = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const inquisitor = game.players[participant.playerId];
    if (inquisitor?.factionId !== 'inquisition' || !inquisitor.inquisition) continue;
    const opposingParticipant = participant.playerId === battle.attacker.playerId
      ? battle.defender
      : battle.attacker;
    const usedCardOptions = usedPhysicalCards(opposingParticipant);
    if (usedCardOptions.length === 0) continue;
    const count = activeGuiltCount(participant);
    for (let index = 0; index < count; index += 1) {
      queue.push({
        id: `${battle.id}:guilt-by-association:${participant.playerId}:${index}`,
        battleId: battle.id,
        inquisitorId: participant.playerId,
        opponentId: opposingParticipant.playerId,
        usedCardOptions,
      });
      queued += 1;
    }
  }
  game.inquisitionGuiltByAssociationQueue = queue.length > 0 ? queue : undefined;
  return queued;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || game.inquisitionAccusationQueue?.length
    || game.inquisitionExcommunicationQueue?.length
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
  const queue = game.inquisitionGuiltByAssociationQueue;
  if (!queue?.length || queue[0].id !== queueId) {
    throw new GameActionError('The pending Guilt by Association effect is no longer first in its queue.');
  }
  queue.shift();
  if (queue.length === 0) game.inquisitionGuiltByAssociationQueue = undefined;
}

export function openNextGuiltByAssociationChoice(game: GameState): boolean {
  if (hasBlockingWindow(game)) return false;
  const effect: InquisitionGuiltByAssociationBattleQueueEntry | undefined = game.inquisitionGuiltByAssociationQueue?.[0];
  if (!effect) return false;
  game.pendingInquisitionChoice = {
    kind: 'guilt_by_association_battle',
    playerId: effect.inquisitorId,
    opponentId: effect.opponentId,
    battleId: effect.battleId,
    queueId: effect.id,
    usedCardOptions: [...effect.usedCardOptions],
    options: ['select_title'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = effect.inquisitorId;
  return true;
}

export function isGuiltByAssociationChoice(kind: unknown): kind is 'guilt_by_association_battle' {
  return kind === 'guilt_by_association_battle';
}

function awardBattleConvictionIfEligible(game: GameState, inquisitorId: PlayerID, battleId: string, movedCount: number): void {
  if (movedCount === 0) return;
  const inquisition = game.players[inquisitorId].inquisition;
  if (!inquisition || inquisition.convictionBattleGainTurn === game.turn) return;
  gainFactionResource(game, inquisitorId, 'conviction', 1, `Guilt by Association after ${battleId}.`);
  inquisition.convictionBattleGainTurn = game.turn;
}

export function resolveGuiltByAssociationChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.kind !== 'guilt_by_association_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Guilt by Association choice.`);
  }
  if (action.choice !== 'select_title'
    || !pending.usedCardOptions.some((cardId) => inquisitionCardTitle(cardId) === inquisitionCardTitle(action.cardId))) {
    throw new GameActionError('Choose a card title the opponent used in that battle.');
  }

  const moved = removeEveryMatchingTitle(game, pending.opponentId, action.cardId);
  awardBattleConvictionIfEligible(game, pending.playerId, pending.battleId, moved.length);
  const resumePriority = pending.resumePriorityPlayer;
  shiftQueue(game, pending.queueId);
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(
    game,
    pending.playerId,
    'inquisition_guilt_by_association_battle',
    `${game.players[pending.playerId].name} chose ${inquisitionCardTitle(action.cardId)} after the battle and moved every matching card in ${game.players[pending.opponentId].name}’s Discard Pile to their Graveyard.`,
    { selectedCardId: action.cardId, movedCardIds: moved, battleId: pending.battleId },
  );
  openNextGuiltByAssociationChoice(game);
}
