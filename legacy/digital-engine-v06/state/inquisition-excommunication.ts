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
  InquisitionExcommunicationBattleQueueEntry,
  PlayerID,
} from '../types/v06';
import { cardValue } from './financiers';
import { gainFactionResource } from './resources';
import { GameActionError } from './reducer';

export const EXCOMMUNICATION = 'inquisition-excommunication';
export const EXCOMMUNICATION_ACTION_LIMIT = 5;
export const EXCOMMUNICATION_BATTLE_LIMIT = 3;

export interface ExcommunicationActionTarget {
  opponentId: PlayerID;
  cardIds: CardID[];
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
  if (!opponent) throw new GameActionError('Excommunication requires an opponent.');
  return opponent.id;
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function cardTarget(target: ActionCardTarget): target is Extract<ActionCardTarget, { kind: 'card' }> {
  return target.kind === 'card';
}

function multisetAvailable(zone: CardID[], selected: CardID[]): boolean {
  const remaining = [...zone];
  for (const cardId of selected) {
    if (!removeOne(remaining, cardId)) return false;
  }
  return true;
}

export function excommunicationSelectionValue(cardIds: CardID[]): number {
  return cardIds.reduce((total, cardId) => total + cardValue(cardId), 0);
}

export function legalExcommunicationSelections(cardIds: CardID[], limit: number): CardID[][] {
  const results: CardID[][] = [];
  const seen = new Set<string>();
  const selected: CardID[] = [];

  const visit = (start: number, value: number): void => {
    for (let index = start; index < cardIds.length; index += 1) {
      const cardId = cardIds[index];
      const nextValue = value + cardValue(cardId);
      if (nextValue <= value || nextValue > limit) continue;
      selected.push(cardId);
      const key = JSON.stringify(selected);
      if (!seen.has(key)) {
        seen.add(key);
        results.push([...selected]);
      }
      visit(index + 1, nextValue);
      selected.pop();
    }
  };

  visit(0, 0);
  return results;
}

function validateSelection(zone: CardID[], selected: CardID[], limit: number, label: string): void {
  if (selected.length === 0) throw new GameActionError(`${label} requires one or more cards.`);
  if (!multisetAvailable(zone, selected)) throw new GameActionError(`Choose cards that remain in the opponent’s Discard Pile for ${label}.`);
  const value = excommunicationSelectionValue(selected);
  if (value < 1 || value > limit) {
    throw new GameActionError(`${label} selected cards must have combined deckbuilding value from 1 to ${limit}.`);
  }
}

export function requireExcommunicationActionTarget(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): ExcommunicationActionTarget | undefined {
  if (cardId !== EXCOMMUNICATION) return undefined;
  if (game.players[playerId]?.factionId !== 'inquisition') {
    throw new GameActionError('Only an Inquisition player can use Excommunication.');
  }
  const opponent = opponentId(game, playerId);
  if (!targets?.length || !targets.every(cardTarget) || targets.some((target) => target.owner !== opponent)) {
    throw new GameActionError('Excommunication requires one or more cards in the opponent’s Discard Pile.');
  }
  const selected = targets.map((target) => target.cardId);
  validateSelection(game.players[opponent].zones.discard, selected, EXCOMMUNICATION_ACTION_LIMIT, 'Excommunication');
  return { opponentId: opponent, cardIds: selected };
}

function moveDiscardCardsToGraveyard(game: GameState, opponent: PlayerID, cardIds: CardID[]): void {
  const player = game.players[opponent];
  for (const cardId of cardIds) {
    if (!removeOne(player.zones.discard, cardId)) {
      throw new GameActionError('An Excommunication target is no longer in the opponent’s Discard Pile.');
    }
    player.zones.graveyard.push(cardId);
  }
}

export function applyExcommunicationAction(
  game: GameState,
  inquisitorId: PlayerID,
  target: ExcommunicationActionTarget | undefined,
): boolean {
  if (!target) return false;
  moveDiscardCardsToGraveyard(game, target.opponentId, target.cardIds);
  publicLog(
    game,
    inquisitorId,
    'inquisition_excommunication_action',
    `${game.players[inquisitorId].name} moved ${target.cardIds.length} card${target.cardIds.length === 1 ? '' : 's'} from ${game.players[target.opponentId].name}’s Discard Pile to their Graveyard.`,
    { cardIds: target.cardIds, combinedValue: excommunicationSelectionValue(target.cardIds) },
  );
  return true;
}

function activeExcommunication(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === EXCOMMUNICATION && !card.canceled && !card.negated && !card.virtual);
}

function activeExcommunicationCount(participant: BattleState['attacker']): number {
  return (activeExcommunication(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeExcommunication).length;
}

export function queueExcommunicationBattleEffects(game: GameState, battle: BattleState): number {
  if (game.recentBattleResult?.battleId !== battle.id) return 0;
  const queue = game.inquisitionExcommunicationQueue ?? [];
  let queued = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const inquisitor = game.players[participant.playerId];
    if (inquisitor?.factionId !== 'inquisition' || !inquisitor.inquisition) continue;
    const opponent = participant.playerId === battle.attacker.playerId
      ? battle.defender.playerId
      : battle.attacker.playerId;
    const count = activeExcommunicationCount(participant);
    for (let index = 0; index < count; index += 1) {
      queue.push({
        id: `${battle.id}:excommunication:${participant.playerId}:${index}`,
        battleId: battle.id,
        inquisitorId: participant.playerId,
        opponentId: opponent,
      });
      queued += 1;
    }
  }
  game.inquisitionExcommunicationQueue = queue.length > 0 ? queue : undefined;
  return queued;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || game.inquisitionAccusationQueue?.length
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
  const queue = game.inquisitionExcommunicationQueue;
  if (!queue?.length || queue[0].id !== queueId) {
    throw new GameActionError('The pending Excommunication is no longer first in its queue.');
  }
  queue.shift();
  if (queue.length === 0) game.inquisitionExcommunicationQueue = undefined;
}

export function openNextExcommunicationChoice(game: GameState): boolean {
  if (hasBlockingWindow(game)) return false;
  while (game.inquisitionExcommunicationQueue?.length) {
    const effect: InquisitionExcommunicationBattleQueueEntry = game.inquisitionExcommunicationQueue[0];
    const discardOptions = [...game.players[effect.opponentId].zones.discard];
    if (legalExcommunicationSelections(discardOptions, EXCOMMUNICATION_BATTLE_LIMIT).length === 0) {
      shiftQueue(game, effect.id);
      continue;
    }
    game.pendingInquisitionChoice = {
      kind: 'excommunication_battle',
      playerId: effect.inquisitorId,
      opponentId: effect.opponentId,
      battleId: effect.battleId,
      queueId: effect.id,
      discardOptions,
      valueLimit: EXCOMMUNICATION_BATTLE_LIMIT,
      options: ['select_cards'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = effect.inquisitorId;
    return true;
  }
  return false;
}

export function isExcommunicationChoice(kind: unknown): kind is 'excommunication_battle' {
  return kind === 'excommunication_battle';
}

function awardBattleConvictionIfEligible(game: GameState, inquisitorId: PlayerID, battleId: string): void {
  const inquisition = game.players[inquisitorId].inquisition;
  if (!inquisition || inquisition.convictionBattleGainTurn === game.turn) return;
  gainFactionResource(game, inquisitorId, 'conviction', 1, `Excommunication after ${battleId}.`);
  inquisition.convictionBattleGainTurn = game.turn;
}

export function resolveExcommunicationChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.kind !== 'excommunication_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Excommunication choice.`);
  }
  if (action.choice !== 'select_cards' || !action.cardIds) {
    throw new GameActionError('Choose one or more cards for Excommunication.');
  }
  validateSelection(
    game.players[pending.opponentId].zones.discard,
    action.cardIds,
    pending.valueLimit,
    'Battle Excommunication',
  );
  moveDiscardCardsToGraveyard(game, pending.opponentId, action.cardIds);
  awardBattleConvictionIfEligible(game, pending.playerId, pending.battleId);

  const resumePriority = pending.resumePriorityPlayer;
  shiftQueue(game, pending.queueId);
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(
    game,
    pending.playerId,
    'inquisition_excommunication_battle',
    `${game.players[pending.playerId].name} moved ${action.cardIds.length} card${action.cardIds.length === 1 ? '' : 's'} from ${game.players[pending.opponentId].name}’s Discard Pile to their Graveyard after the battle.`,
    { cardIds: action.cardIds, combinedValue: excommunicationSelectionValue(action.cardIds), battleId: pending.battleId },
  );
  openNextExcommunicationChoice(game);
}
