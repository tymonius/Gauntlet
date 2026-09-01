import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  InquisitionPenanceBattleQueueEntry,
  PlayerID,
} from '../types/v06';
import type { ResolveInquisitionChoiceAction } from './actions';
import { GameActionError } from './reducer';
import { gainFactionResource } from './resources';

export const PENANCE = 'inquisition-penance';

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
  if (!opponent) throw new GameActionError('Penance requires an opponent.');
  return opponent.id;
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

export function applyPenanceAction(game: GameState, inquisitorId: PlayerID, cardId: CardID): boolean {
  if (cardId !== PENANCE) return false;
  if (game.players[inquisitorId]?.factionId !== 'inquisition') {
    throw new GameActionError('Only an Inquisition player can use Penance.');
  }
  const opponent = opponentId(game, inquisitorId);
  game.pendingInquisitionChoice = {
    kind: 'penance_action',
    playerId: opponent,
    inquisitorId,
    handOptions: [...game.players[opponent].zones.hand],
    options: ['sacrifice', 'conviction'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = opponent;
  publicLog(
    game,
    inquisitorId,
    'inquisition_penance_action_opened',
    `${game.players[inquisitorId].name} demanded Penance from ${game.players[opponent].name}.`,
  );
  return true;
}

function activePenance(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === PENANCE && !card.canceled && !card.negated && !card.virtual);
}

function activePenanceCount(participant: BattleState['attacker']): number {
  return (activePenance(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activePenance).length;
}

function otherPostRevealWindowBlocks(game: GameState): boolean {
  return Boolean(
    game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.militaryChoiceQueue?.length
    || game.militaryTimingChoiceQueue?.length
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.financierChoiceQueue?.length
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

export function queuePenanceBattleEffects(game: GameState): number {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice') return 0;
  const marker = 'inquisition_penance_queued';
  if (battle.effectsResolved.includes(marker) || otherPostRevealWindowBlocks(game)) return 0;

  battle.effectsResolved.push(marker);
  const queue = game.inquisitionPenanceQueue ?? [];
  let queued = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const inquisitor = game.players[participant.playerId];
    if (inquisitor?.factionId !== 'inquisition' || !inquisitor.inquisition) continue;
    const opponent = participant.playerId === battle.attacker.playerId
      ? battle.defender.playerId
      : battle.attacker.playerId;
    const count = activePenanceCount(participant);
    for (let index = 0; index < count; index += 1) {
      queue.push({
        id: `${battle.id}:penance:${participant.playerId}:${index}`,
        battleId: battle.id,
        inquisitorId: participant.playerId,
        opponentId: opponent,
      });
      queued += 1;
    }
  }
  game.inquisitionPenanceQueue = queue.length > 0 ? queue : undefined;
  return queued;
}

function pendingWindowBlocks(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || otherPostRevealWindowBlocks(game),
  );
}

function shiftQueue(game: GameState, queueId: string): void {
  const queue = game.inquisitionPenanceQueue;
  if (!queue?.length || queue[0].id !== queueId) {
    throw new GameActionError('The pending Penance effect is no longer first in its queue.');
  }
  queue.shift();
  if (queue.length === 0) game.inquisitionPenanceQueue = undefined;
}

export function openNextPenanceChoice(game: GameState): boolean {
  if (pendingWindowBlocks(game)) return false;
  const effect: InquisitionPenanceBattleQueueEntry | undefined = game.inquisitionPenanceQueue?.[0];
  if (!effect) return false;
  if (game.battle?.id !== effect.battleId || game.battle.stage !== 'dice') {
    shiftQueue(game, effect.id);
    return openNextPenanceChoice(game);
  }
  game.pendingInquisitionChoice = {
    kind: 'penance_battle',
    playerId: effect.opponentId,
    inquisitorId: effect.inquisitorId,
    battleId: effect.battleId,
    queueId: effect.id,
    handOptions: [...game.players[effect.opponentId].zones.hand],
    options: ['sacrifice', 'bonus'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = effect.opponentId;
  publicLog(
    game,
    effect.inquisitorId,
    'inquisition_penance_battle_opened',
    `${game.players[effect.inquisitorId].name} demanded Penance before the battle roll.`,
    { battleId: effect.battleId },
  );
  return true;
}

export function isPenanceChoice(kind: unknown): kind is 'penance_action' | 'penance_battle' {
  return kind === 'penance_action' || kind === 'penance_battle';
}

function sacrificeHandCard(
  game: GameState,
  playerId: PlayerID,
  eligibleCards: CardID[],
  cardId: CardID,
): void {
  if (!eligibleCards.includes(cardId) || !removeOne(game.players[playerId].zones.hand, cardId)) {
    throw new GameActionError('Choose a card that remains in your hand for Penance.');
  }
  game.players[playerId].zones.graveyard.push(cardId);
}

function addBattleBonus(game: GameState, pending: Extract<NonNullable<GameState['pendingInquisitionChoice']>, { kind: 'penance_battle' }>): void {
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId || battle.stage !== 'dice') {
    throw new GameActionError('The Penance battle bonus is no longer available.');
  }
  const participant = battle.attacker.playerId === pending.inquisitorId ? battle.attacker : battle.defender;
  participant.modifiers += 1;
  battle.resolvedModifiers ??= [];
  battle.resolvedModifiers.push({
    playerId: pending.inquisitorId,
    source: PENANCE,
    amount: 1,
    reason: 'Opponent declined to sacrifice a card for Penance.',
  });
}

export function resolvePenanceChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending
    || (pending.kind !== 'penance_action' && pending.kind !== 'penance_battle')
    || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Penance choice.`);
  }

  let resolution: 'sacrifice' | 'concede';
  if (action.choice === 'sacrifice') {
    sacrificeHandCard(game, pending.playerId, pending.handOptions, action.cardId);
    resolution = 'sacrifice';
  } else if (pending.kind === 'penance_action' && action.choice === 'conviction') {
    gainFactionResource(game, pending.inquisitorId, 'conviction', 1, 'Penance Action was refused.');
    resolution = 'concede';
  } else if (pending.kind === 'penance_battle' && action.choice === 'bonus') {
    addBattleBonus(game, pending);
    resolution = 'concede';
  } else {
    throw new GameActionError('Choose an available Penance response.');
  }

  const resumePriority = pending.resumePriorityPlayer;
  if (pending.kind === 'penance_battle') shiftQueue(game, pending.queueId);
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;

  publicLog(
    game,
    pending.inquisitorId,
    'inquisition_penance_resolved',
    resolution === 'sacrifice'
      ? `${game.players[pending.playerId].name} placed one card from hand in their Graveyard for Penance.`
      : `${game.players[pending.playerId].name} refused to sacrifice a card for Penance.`,
    { kind: pending.kind, battleId: pending.kind === 'penance_battle' ? pending.battleId : undefined, resolution },
  );
  privateLog(
    game,
    pending.playerId,
    'inquisition_penance_resolved_private',
    resolution === 'sacrifice'
      ? `You placed ${action.cardId} in your Graveyard for Penance.`
      : 'You accepted the alternative Penance consequence.',
    { kind: pending.kind, resolution, cardId: resolution === 'sacrifice' ? action.cardId : undefined },
  );

  queuePenanceBattleEffects(game);
  openNextPenanceChoice(game);
}
