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
  InquisitionAccusationQueueEntry,
  PlayerID,
} from '../types/v06';
import { gainFactionResource } from './resources';
import { GameActionError } from './reducer';

export const ACCUSATION = 'inquisition-accusation';

export interface AccusationActionTarget {
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

function privateLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'private',
    visibleTo: [actor],
  } satisfies GameEvent);
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const opponent = Object.values(game.players).find((player) => player.id !== playerId);
  if (!opponent) throw new GameActionError('Accusation requires an opponent.');
  return opponent.id;
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function cardTarget(target: ActionCardTarget | undefined): target is Extract<ActionCardTarget, { kind: 'card' }> {
  return target?.kind === 'card';
}

export function requireAccusationActionTarget(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): AccusationActionTarget | undefined {
  if (cardId !== ACCUSATION) return undefined;
  if (game.players[playerId]?.factionId !== 'inquisition') {
    throw new GameActionError('Only an Inquisition player can use Accusation.');
  }
  const opponent = opponentId(game, playerId);
  if (targets?.length !== 1 || !cardTarget(targets[0])) {
    throw new GameActionError('Accusation requires one card in the opponent’s Discard Pile.');
  }
  const target = targets[0];
  if (target.owner !== opponent || !game.players[opponent].zones.discard.includes(target.cardId)) {
    throw new GameActionError('Choose a card that is currently in the opponent’s Discard Pile.');
  }
  return { opponentId: opponent, cardId: target.cardId };
}

export function applyAccusationAction(
  game: GameState,
  inquisitorId: PlayerID,
  target: AccusationActionTarget | undefined,
): boolean {
  if (!target) return false;
  game.pendingInquisitionChoice = {
    kind: 'accusation_destination',
    playerId: target.opponentId,
    inquisitorId,
    cardId: target.cardId,
    options: ['top_deck', 'graveyard'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = target.opponentId;
  publicLog(
    game,
    inquisitorId,
    'inquisition_accusation_opened',
    `${game.players[inquisitorId].name} accused one card in ${game.players[target.opponentId].name}’s Discard Pile.`,
    { cardId: target.cardId, source: 'action' },
  );
  return true;
}

function activeAccusation(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === ACCUSATION && !card.canceled && !card.negated && !card.virtual);
}

function activeAccusationCount(participant: BattleState['attacker']): number {
  return (activeAccusation(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeAccusation).length;
}

export function queueAccusationBattleEffects(game: GameState, battle: BattleState): number {
  if (game.recentBattleResult?.battleId !== battle.id) return 0;
  const queue = game.inquisitionAccusationQueue ?? [];
  let queued = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const inquisitor = game.players[participant.playerId];
    if (inquisitor?.factionId !== 'inquisition' || !inquisitor.inquisition) continue;
    const opponent = participant.playerId === battle.attacker.playerId
      ? battle.defender.playerId
      : battle.attacker.playerId;
    const count = activeAccusationCount(participant);
    for (let index = 0; index < count; index += 1) {
      queue.push({
        id: `${battle.id}:accusation:${participant.playerId}:${index}`,
        battleId: battle.id,
        inquisitorId: participant.playerId,
        opponentId: opponent,
      });
      queued += 1;
    }
  }
  game.inquisitionAccusationQueue = queue.length > 0 ? queue : undefined;
  return queued;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
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
  const queue = game.inquisitionAccusationQueue;
  if (!queue?.length || queue[0].id !== queueId) {
    throw new GameActionError('The pending Accusation is no longer first in its queue.');
  }
  queue.shift();
  if (queue.length === 0) game.inquisitionAccusationQueue = undefined;
}

export function openNextAccusationChoice(game: GameState): boolean {
  if (hasBlockingWindow(game)) return false;
  while (game.inquisitionAccusationQueue?.length) {
    const effect: InquisitionAccusationQueueEntry = game.inquisitionAccusationQueue[0];
    const discardOptions = [...game.players[effect.opponentId].zones.discard];
    if (discardOptions.length === 0) {
      shiftQueue(game, effect.id);
      continue;
    }
    game.pendingInquisitionChoice = {
      kind: 'accusation_select_card',
      playerId: effect.inquisitorId,
      opponentId: effect.opponentId,
      discardOptions,
      queueId: effect.id,
      battleId: effect.battleId,
      options: ['select_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = effect.inquisitorId;
    return true;
  }
  return false;
}

export function isAccusationChoice(
  kind: unknown,
): kind is 'accusation_select_card' | 'accusation_destination' {
  return kind === 'accusation_select_card' || kind === 'accusation_destination';
}

function awardBattleConvictionIfEligible(
  game: GameState,
  inquisitorId: PlayerID,
  battleId: string | undefined,
): void {
  if (!battleId) return;
  const inquisition = game.players[inquisitorId].inquisition;
  if (!inquisition || inquisition.convictionBattleGainTurn === game.turn) return;
  gainFactionResource(game, inquisitorId, 'conviction', 1, `Accusation after ${battleId}.`);
  inquisition.convictionBattleGainTurn = game.turn;
}

export function resolveAccusationChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending
    || (pending.kind !== 'accusation_select_card' && pending.kind !== 'accusation_destination')
    || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Accusation choice.`);
  }

  if (pending.kind === 'accusation_select_card') {
    if (action.choice !== 'select_card') {
      throw new GameActionError('Choose one card from the opponent’s Discard Pile for Accusation.');
    }
    if (!pending.discardOptions.includes(action.cardId)
      || !game.players[pending.opponentId].zones.discard.includes(action.cardId)) {
      throw new GameActionError('Choose a card that remains in the opponent’s Discard Pile.');
    }
    const resumePriority = pending.resumePriorityPlayer;
    game.pendingInquisitionChoice = {
      kind: 'accusation_destination',
      playerId: pending.opponentId,
      inquisitorId: pending.playerId,
      cardId: action.cardId,
      queueId: pending.queueId,
      battleId: pending.battleId,
      options: ['top_deck', 'graveyard'],
      resumePriorityPlayer: resumePriority,
    };
    game.priorityPlayer = pending.opponentId;
    publicLog(
      game,
      pending.playerId,
      'inquisition_accusation_card_selected',
      `${game.players[pending.playerId].name} selected one card from ${game.players[pending.opponentId].name}’s Discard Pile.`,
      { cardId: action.cardId, battleId: pending.battleId },
    );
    return;
  }

  if (action.choice !== 'top_deck' && action.choice !== 'graveyard') {
    throw new GameActionError('Choose whether the accused card goes on top of the Draw Pile or into the Graveyard.');
  }
  if (action.cardId !== pending.cardId) {
    throw new GameActionError('Resolve the currently accused card.');
  }
  const opponent = game.players[pending.playerId];
  if (!removeOne(opponent.zones.discard, pending.cardId)) {
    throw new GameActionError('The accused card is no longer in the Discard Pile.');
  }
  if (action.choice === 'top_deck') opponent.zones.deck.unshift(pending.cardId);
  else opponent.zones.graveyard.push(pending.cardId);

  const resumePriority = pending.resumePriorityPlayer;
  if (pending.queueId) shiftQueue(game, pending.queueId);
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;

  if (action.choice === 'graveyard') {
    awardBattleConvictionIfEligible(game, pending.inquisitorId, pending.battleId);
  }
  publicLog(
    game,
    pending.inquisitorId,
    'inquisition_accusation_resolved',
    `${opponent.name} placed the accused card ${action.choice === 'top_deck' ? 'on top of their Draw Pile' : 'in their Graveyard'}.`,
    { cardId: pending.cardId, destination: action.choice, battleId: pending.battleId },
  );
  privateLog(
    game,
    pending.playerId,
    'inquisition_accusation_resolved_private',
    `You placed ${pending.cardId} ${action.choice === 'top_deck' ? 'on top of your Draw Pile' : 'in your Graveyard'}.`,
    { cardId: pending.cardId, destination: action.choice },
  );
  openNextAccusationChoice(game);
}
