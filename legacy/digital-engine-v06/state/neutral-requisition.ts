import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { PlayActionCardAction, ResolveNeutralChoiceAction } from './actions';
import { drawFromDeck } from './draw';
import { armisticeCanBeVoluntarilyDiscarded } from './neutral-armistice';
import { GameActionError } from './reducer';

export const REQUISITION = 'neutral-requisition';
const REQUISITION_BATTLE_RESOLUTION = 'neutral_requisition_battle';

export interface PreparedRequisitionAction {
  targetCardId: CardID;
  remainingHand: CardID[];
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

function activeRequisition(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === REQUISITION
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (activeRequisition(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeRequisition).length;
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingNeutralChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingInquisitionChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

/**
 * Validates the required Asset sacrifice before the source card leaves hand.
 * The hand snapshot removes exactly one physical Requisition copy so duplicate
 * copies remain available after the base Action-play reducer runs.
 */
export function prepareRequisitionAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedRequisitionAction | undefined {
  if (action.cardId !== REQUISITION) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);

  const targets = action.targets ?? [];
  if (targets.length !== 1 || targets[0].kind !== 'card' || targets[0].owner !== action.playerId) {
    throw new GameActionError('Requisition requires exactly one banked Asset you control.');
  }
  if (!player.zones.assetBank.includes(targets[0].cardId)) {
    throw new GameActionError('The chosen Requisition sacrifice must be in your Asset Bank.');
  }
  if (!armisticeCanBeVoluntarilyDiscarded(targets[0].cardId)) {
    throw new GameActionError('You cannot voluntarily discard Armistice to pay Requisition.');
  }

  const remainingHand = [...player.zones.hand];
  if (!removeOne(remainingHand, REQUISITION)) {
    throw new GameActionError(`${player.name} does not have Requisition in hand.`);
  }
  return { targetCardId: targets[0].cardId, remainingHand };
}

export function applyRequisitionAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedRequisitionAction,
): CardID[] {
  const player = game.players[playerId];
  player.zones.hand = [...prepared.remainingHand];
  if (!removeOne(player.zones.assetBank, prepared.targetCardId)) {
    throw new GameActionError('The chosen Requisition sacrifice is no longer banked.');
  }
  player.zones.discard.push(prepared.targetCardId);

  const draw = drawFromDeck(player, { count: 2 });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    playerId,
    'neutral_requisition_action',
    `${player.name} discarded a banked Asset and drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Requisition.`,
    {
      discardedCardId: prepared.targetCardId,
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}

/**
 * Queues one optional Asset sacrifice for each active physical Requisition
 * copy after reveal/cancellation processing has completed and before dice are
 * rolled. Inactive Assets may still be discarded as the cost: Requisition is
 * using its own Battle effect, not the sacrificed Asset's printed effect.
 */
export function queueRequisitionBattleChoices(game: GameState): number {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(REQUISITION_BATTLE_RESOLUTION)) return 0;

  const queue = game.neutralRequisitionBattleQueue ?? [];
  let queued = 0;
  for (const participant of [battle.attacker, battle.defender]) {
    const count = activeCopyCount(participant);
    const eligibleAssets = game.players[participant.playerId].zones.assetBank
      .filter(armisticeCanBeVoluntarilyDiscarded).length;
    if (count < 1 || eligibleAssets < 1) continue;
    queue.push({
      id: `${game.id}-requisition-${battle.id}-${queue.length + 1}`,
      playerId: participant.playerId,
      battleId: battle.id,
      triggersRemaining: count,
    });
    queued += count;
  }
  game.neutralRequisitionBattleQueue = queue.length > 0 ? queue : undefined;
  battle.effectsResolved.push(REQUISITION_BATTLE_RESOLUTION);
  return queued;
}

function trimQueue(game: GameState): void {
  const retained = (game.neutralRequisitionBattleQueue ?? []).filter((entry) => {
    if (!game.battle || game.battle.id !== entry.battleId || game.battle.stage !== 'dice') return false;
    const available = game.players[entry.playerId]?.zones.assetBank
      .filter(armisticeCanBeVoluntarilyDiscarded).length ?? 0;
    entry.triggersRemaining = Math.min(entry.triggersRemaining, available);
    return entry.triggersRemaining > 0;
  });
  game.neutralRequisitionBattleQueue = retained.length > 0 ? retained : undefined;
}

export function openNextRequisitionChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  trimQueue(game);
  const entry = game.neutralRequisitionBattleQueue?.[0];
  if (!entry) return false;
  const cardOptions = unique(
    game.players[entry.playerId].zones.assetBank.filter(armisticeCanBeVoluntarilyDiscarded),
  );
  if (cardOptions.length < 1) {
    entry.triggersRemaining = 0;
    trimQueue(game);
    return openNextRequisitionChoice(game);
  }

  game.pendingNeutralChoice = {
    kind: 'requisition_battle',
    playerId: entry.playerId,
    entryId: entry.id,
    battleId: entry.battleId,
    cardOptions,
    triggersRemaining: entry.triggersRemaining,
    options: ['pass', 'select_card'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = entry.playerId;
  return true;
}

export function resolveRequisitionChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'requisition_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Requisition choice.`);
  }
  const entry = game.neutralRequisitionBattleQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!entry) throw new GameActionError('The Requisition trigger is no longer pending.');
  if (!game.battle || game.battle.id !== pending.battleId || game.battle.stage !== 'dice') {
    throw new GameActionError('The Requisition battle is no longer active.');
  }

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;

  if (action.choice === 'pass') {
    entry.triggersRemaining = 0;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_requisition_battle_passed',
      `${game.players[action.playerId].name} used no more Requisition copies in this battle.`,
      { battleId: pending.battleId },
    );
  } else {
    if (action.choice !== 'select_card' || !action.cardId || !pending.cardOptions.includes(action.cardId)) {
      throw new GameActionError('Choose one banked Asset to discard for Requisition, or pass.');
    }
    const player = game.players[action.playerId];
    if (!removeOne(player.zones.assetBank, action.cardId)) {
      throw new GameActionError(`${action.cardId} is no longer in your Asset Bank.`);
    }
    player.zones.discard.push(action.cardId);
    entry.triggersRemaining -= 1;

    const participant = game.battle.attacker.playerId === action.playerId
      ? game.battle.attacker
      : game.battle.defender;
    participant.advantage = (participant.advantage ?? 0) + 1;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_requisition_battle_used',
      `${player.name} discarded a banked Asset and gained advantage with Requisition.`,
      { battleId: pending.battleId, discardedCardId: action.cardId },
    );
  }

  trimQueue(game);
  openNextRequisitionChoice(game);
}
