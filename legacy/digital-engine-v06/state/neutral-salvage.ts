import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  SalvageBattleQueueEntry,
} from '../types/v06';
import type { PlayActionCardAction, ResolveNeutralChoiceAction } from './actions';
import { GameActionError } from './reducer';

export const SALVAGE = 'neutral-salvage';

export interface PreparedSalvageAction {
  targetCardId: CardID;
  sourceCopiesInHandBeforePlay: number;
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

function unique(cards: CardID[]): CardID[] {
  return [...new Set(cards)];
}

function activeSalvage(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === SALVAGE
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

function activeBattleCopyCount(participant: BattleParticipantState): number {
  return (activeSalvage(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeSalvage).length;
}

function availableDiscardedCandidates(
  game: GameState,
  playerId: PlayerID,
  candidates: CardID[],
): CardID[] {
  const available = [...game.players[playerId].zones.discard];
  return candidates.filter((cardId) => removeOne(available, cardId));
}

export function prepareSalvageAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedSalvageAction | undefined {
  if (action.cardId !== SALVAGE) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);
  if (!player.zones.hand.includes(SALVAGE)) {
    throw new GameActionError(`${player.name} does not have Salvage in hand.`);
  }

  const targets = action.targets ?? [];
  if (targets.length !== 1 || targets[0].kind !== 'card' || targets[0].owner !== action.playerId) {
    throw new GameActionError('Salvage requires exactly one card from your own Discard Pile.');
  }
  if (!player.zones.discard.includes(targets[0].cardId)) {
    throw new GameActionError('The chosen Salvage card is not in your Discard Pile.');
  }
  return {
    targetCardId: targets[0].cardId,
    sourceCopiesInHandBeforePlay: player.zones.hand.filter((cardId) => cardId === SALVAGE).length,
  };
}

export function applySalvageAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedSalvageAction,
): void {
  const player = game.players[playerId];
  const sourceCopiesExpectedInHand = Math.max(0, prepared.sourceCopiesInHandBeforePlay - 1);
  let sourceCopiesInHand = player.zones.hand.filter((cardId) => cardId === SALVAGE).length;
  while (sourceCopiesInHand < sourceCopiesExpectedInHand) {
    player.zones.hand.push(SALVAGE);
    sourceCopiesInHand += 1;
  }
  if (!removeOne(player.zones.discard, prepared.targetCardId)) {
    throw new GameActionError(`${prepared.targetCardId} is no longer in your Discard Pile.`);
  }
  player.zones.hand.push(prepared.targetCardId);
  game.pendingNeutralChoice = {
    kind: 'salvage_action_discard',
    playerId,
    cardOptions: unique(player.zones.hand),
    options: ['select_card'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = playerId;
  appendPublicLog(
    game,
    playerId,
    'neutral_salvage_action_return',
    `${player.name} returned ${prepared.targetCardId} from their Discard Pile to their hand with Salvage.`,
    { cardId: prepared.targetCardId },
  );
}

export function queueSalvageBattleChoices(
  game: GameState,
  battle: BattleState,
  winnerId?: PlayerID,
): number {
  if (!winnerId) return 0;
  const participant = battle.attacker.playerId === winnerId
    ? battle.attacker
    : battle.defender.playerId === winnerId
      ? battle.defender
      : undefined;
  if (!participant) return 0;
  const triggersRemaining = activeBattleCopyCount(participant);
  if (triggersRemaining < 1) return 0;

  const cardIds = availableDiscardedCandidates(game, winnerId, participant.battleDraw);
  if (cardIds.length < 1) return 0;
  game.neutralSalvageBattleQueue ??= [];
  if (game.neutralSalvageBattleQueue.some((entry) => entry.battleId === battle.id && entry.playerId === winnerId)) {
    return 0;
  }
  game.neutralSalvageBattleQueue.push({
    id: `${battle.id}:salvage:${winnerId}:${game.neutralSalvageBattleQueue.length + 1}`,
    playerId: winnerId,
    battleId: battle.id,
    cardIds,
    triggersRemaining: Math.min(triggersRemaining, cardIds.length),
  });
  return Math.min(triggersRemaining, cardIds.length);
}

function findQueueEntry(game: GameState, entryId: string): SalvageBattleQueueEntry | undefined {
  return game.neutralSalvageBattleQueue?.find((entry) => entry.id === entryId);
}

function removeQueueEntry(game: GameState, entryId: string): void {
  game.neutralSalvageBattleQueue = game.neutralSalvageBattleQueue?.filter((entry) => entry.id !== entryId);
  if (!game.neutralSalvageBattleQueue?.length) game.neutralSalvageBattleQueue = undefined;
}

export function openNextSalvageChoice(game: GameState): boolean {
  if (game.pendingNeutralChoice) return false;
  while (game.neutralSalvageBattleQueue?.length) {
    const entry = game.neutralSalvageBattleQueue[0];
    entry.cardIds = availableDiscardedCandidates(game, entry.playerId, entry.cardIds);
    if (entry.triggersRemaining < 1 || entry.cardIds.length < 1) {
      game.neutralSalvageBattleQueue.shift();
      continue;
    }
    game.pendingNeutralChoice = {
      kind: 'salvage_battle',
      playerId: entry.playerId,
      entryId: entry.id,
      battleId: entry.battleId,
      cardOptions: unique(entry.cardIds),
      triggersRemaining: Math.min(entry.triggersRemaining, entry.cardIds.length),
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = entry.playerId;
    return true;
  }
  game.neutralSalvageBattleQueue = undefined;
  return false;
}

function resolveActionDiscard(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'salvage_action_discard' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Salvage Action discard.`);
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one card from your hand to discard for Salvage.');
  }
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer in hand.`);
  }
  player.zones.discard.push(action.cardId);
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  appendPublicLog(game, action.playerId, 'neutral_salvage_action_discard', `${player.name} discarded one card after using Salvage.`);
}

function resolveBattleSelection(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'salvage_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Salvage Battle choice.`);
  }
  const entry = findQueueEntry(game, pending.entryId);
  if (!entry) throw new GameActionError('The Salvage cleanup queue is missing.');

  if (action.choice === 'pass') {
    removeQueueEntry(game, entry.id);
    game.pendingNeutralChoice = undefined;
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    appendPublicLog(game, action.playerId, 'neutral_salvage_battle_passed', `${game.players[action.playerId].name} declined Salvage during battle cleanup.`);
    return;
  }
  if (action.choice !== 'use' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one eligible unchosen Battle Hand card or pass Salvage.');
  }

  const player = game.players[action.playerId];
  if (!removeOne(player.zones.discard, action.cardId) || !removeOne(entry.cardIds, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer eligible for Salvage.`);
  }
  player.zones.hand.push(action.cardId);
  entry.triggersRemaining -= 1;
  game.pendingNeutralChoice = {
    kind: 'salvage_battle_discard',
    playerId: action.playerId,
    entryId: entry.id,
    battleId: entry.battleId,
    cardOptions: unique(player.zones.hand),
    options: ['select_card'],
    resumePriorityPlayer: pending.resumePriorityPlayer,
  };
  game.priorityPlayer = action.playerId;
  appendPublicLog(
    game,
    action.playerId,
    'neutral_salvage_battle_return',
    `${player.name} returned ${action.cardId} to their hand with Salvage during battle cleanup.`,
    { battleId: entry.battleId, cardId: action.cardId },
  );
}

function resolveBattleDiscard(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'salvage_battle_discard' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Salvage Battle discard.`);
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose one card from your hand to discard for Salvage.');
  }
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, action.cardId)) {
    throw new GameActionError(`${action.cardId} is no longer in hand.`);
  }
  player.zones.discard.push(action.cardId);
  const entry = findQueueEntry(game, pending.entryId);
  if (!entry || entry.triggersRemaining < 1 || entry.cardIds.length < 1) removeQueueEntry(game, pending.entryId);
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  appendPublicLog(game, action.playerId, 'neutral_salvage_battle_discard', `${player.name} discarded one card after using Salvage during battle cleanup.`, { battleId: pending.battleId });
}

export function resolveSalvageChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const kind = game.pendingNeutralChoice?.kind;
  if (kind === 'salvage_action_discard') resolveActionDiscard(game, action);
  else if (kind === 'salvage_battle') resolveBattleSelection(game, action);
  else resolveBattleDiscard(game, action);
}
