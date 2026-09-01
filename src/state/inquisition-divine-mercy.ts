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
  InquisitionDivineMercyBattleQueueEntry,
  PlayerID,
} from '../types/v06';
import { GameActionError } from './reducer';
import { gainFactionResource } from './resources';

export const DIVINE_MERCY = 'inquisition-divine-mercy';

export interface DivineMercyActionTarget {
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
  if (!opponent) throw new GameActionError('Divine Mercy requires an opponent.');
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

export function requireDivineMercyActionTarget(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): DivineMercyActionTarget | undefined {
  if (cardId !== DIVINE_MERCY) return undefined;
  if (game.players[playerId]?.factionId !== 'inquisition') {
    throw new GameActionError('Only an Inquisition player can use Divine Mercy.');
  }
  const opponent = opponentId(game, playerId);
  if (targets?.length !== 1 || !cardTarget(targets[0])) {
    throw new GameActionError('Divine Mercy requires one card in the opponent’s Graveyard.');
  }
  const target = targets[0];
  if (target.owner !== opponent || !game.players[opponent].zones.graveyard.includes(target.cardId)) {
    throw new GameActionError('Choose a card that is currently in the opponent’s Graveyard.');
  }
  return { opponentId: opponent, cardId: target.cardId };
}

export function applyDivineMercyAction(
  game: GameState,
  inquisitorId: PlayerID,
  target: DivineMercyActionTarget | undefined,
): boolean {
  if (!target) return false;
  const opponent = game.players[target.opponentId];
  if (!removeOne(opponent.zones.graveyard, target.cardId)) {
    throw new GameActionError('The chosen Divine Mercy card is no longer in the opponent’s Graveyard.');
  }
  opponent.zones.discard.push(target.cardId);
  gainFactionResource(game, inquisitorId, 'conviction', 2, 'Divine Mercy Action.');
  publicLog(
    game,
    inquisitorId,
    'inquisition_divine_mercy_action',
    `${game.players[inquisitorId].name} moved one card from ${opponent.name}’s Graveyard to their Discard Pile and gained 2 Conviction.`,
    { cardId: target.cardId },
  );
  return true;
}

function activeDivineMercy(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === DIVINE_MERCY && !card.canceled && !card.negated && !card.virtual);
}

function activeDivineMercyCount(participant: BattleState['attacker']): number {
  return (activeDivineMercy(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeDivineMercy).length;
}

function otherPostRevealWindowBlocks(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || game.inquisitionPenanceQueue?.length
    || game.pendingMysticsChoice
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

export function queueDivineMercyBattleEffects(game: GameState): number {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice') return 0;
  const marker = 'inquisition_divine_mercy_queued';
  if (battle.effectsResolved.includes(marker) || otherPostRevealWindowBlocks(game)) return 0;

  battle.effectsResolved.push(marker);
  const queue = game.inquisitionDivineMercyQueue ?? [];
  let queued = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const inquisitor = game.players[participant.playerId];
    if (inquisitor?.factionId !== 'inquisition' || !inquisitor.inquisition) continue;
    const opponent = participant.playerId === battle.attacker.playerId
      ? battle.defender.playerId
      : battle.attacker.playerId;
    const count = activeDivineMercyCount(participant);
    for (let index = 0; index < count; index += 1) {
      queue.push({
        id: `${battle.id}:divine-mercy:${participant.playerId}:${index}`,
        battleId: battle.id,
        inquisitorId: participant.playerId,
        opponentId: opponent,
      });
      queued += 1;
    }
  }
  game.inquisitionDivineMercyQueue = queue.length > 0 ? queue : undefined;
  return queued;
}

function pendingWindowBlocks(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || game.pendingMysticsChoice
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

function shiftQueue(game: GameState, queueId: string): void {
  const queue = game.inquisitionDivineMercyQueue;
  if (!queue?.length || queue[0].id !== queueId) {
    throw new GameActionError('The pending Divine Mercy effect is no longer first in its queue.');
  }
  queue.shift();
  if (queue.length === 0) game.inquisitionDivineMercyQueue = undefined;
}

export function openNextDivineMercyChoice(game: GameState): boolean {
  if (pendingWindowBlocks(game)) return false;
  while (game.inquisitionDivineMercyQueue?.length) {
    const effect: InquisitionDivineMercyBattleQueueEntry = game.inquisitionDivineMercyQueue[0];
    if (game.battle?.id !== effect.battleId || game.battle.stage !== 'dice') {
      shiftQueue(game, effect.id);
      continue;
    }
    const graveyardOptions = [...game.players[effect.opponentId].zones.graveyard];
    if (graveyardOptions.length === 0) {
      shiftQueue(game, effect.id);
      continue;
    }
    game.pendingInquisitionChoice = {
      kind: 'divine_mercy_battle',
      playerId: effect.inquisitorId,
      opponentId: effect.opponentId,
      battleId: effect.battleId,
      queueId: effect.id,
      graveyardOptions,
      options: ['select_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = effect.inquisitorId;
    return true;
  }
  return false;
}

export function isDivineMercyChoice(kind: unknown): kind is 'divine_mercy_battle' {
  return kind === 'divine_mercy_battle';
}

export function resolveDivineMercyChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.kind !== 'divine_mercy_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Divine Mercy choice.`);
  }
  if (action.choice !== 'select_card'
    || !pending.graveyardOptions.includes(action.cardId)
    || !removeOne(game.players[pending.opponentId].zones.graveyard, action.cardId)) {
    throw new GameActionError('Choose a card that remains in the opponent’s Graveyard for Divine Mercy.');
  }

  const opponent = game.players[pending.opponentId];
  opponent.zones.discard.push(action.cardId);
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId || battle.stage !== 'dice') {
    throw new GameActionError('The Divine Mercy battle bonus is no longer available.');
  }
  const participant = battle.attacker.playerId === pending.playerId ? battle.attacker : battle.defender;
  participant.modifiers += 2;
  battle.resolvedModifiers ??= [];
  battle.resolvedModifiers.push({
    playerId: pending.playerId,
    source: DIVINE_MERCY,
    amount: 2,
    reason: 'Divine Mercy moved an opposing Graveyard card to Discard.',
  });

  const resumePriority = pending.resumePriorityPlayer;
  shiftQueue(game, pending.queueId);
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(
    game,
    pending.playerId,
    'inquisition_divine_mercy_battle',
    `${game.players[pending.playerId].name} moved one card from ${opponent.name}’s Graveyard to their Discard Pile and added +2 to their battle total.`,
    { cardId: action.cardId, battleId: pending.battleId },
  );
  openNextDivineMercyChoice(game);
}
