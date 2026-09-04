import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  StrategicWithdrawalBattleTargetOption,
} from '../types/v06';
import type {
  PlayActionCardAction,
  ResolveBattleAction,
  ResolveNeutralChoiceAction,
} from './actions';
import { reconcileFaceDownAssets } from './asset-facing';

export const STRATEGIC_WITHDRAWAL = 'neutral-strategic-withdrawal';
const STRATEGIC_WITHDRAWAL_WINDOW = 'neutral_strategic_withdrawal_battle_window';

export interface PreparedStrategicWithdrawalAction {
  targetCardId: CardID;
  reopenMovement: boolean;
}

export interface StrategicWithdrawalResolution {
  deferredBattleAction?: ResolveBattleAction;
}

interface UsedCardEntry {
  targetKey: string;
  card: BattlePlayedCard;
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

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === STRATEGIC_WITHDRAWAL
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function participantFor(battle: BattleState, playerId: PlayerID): BattleParticipantState {
  return battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
}

function usedCards(participant: BattleParticipantState): UsedCardEntry[] {
  const entries: UsedCardEntry[] = [];
  if (participant.handCommit && !participant.handCommit.virtual) {
    entries.push({ targetKey: 'hand_commit', card: participant.handCommit });
  }
  participant.battleDrawPlayed.forEach((card, index) => {
    if (!card.virtual) entries.push({ targetKey: `battle_draw:${index}`, card });
  });
  return entries;
}

function activeSourceKeys(participant: BattleParticipantState): string[] {
  return usedCards(participant)
    .filter((entry) => active(entry.card))
    .map((entry) => entry.targetKey);
}

function targetOptions(
  participant: BattleParticipantState,
  triggerSourceKey: string,
): StrategicWithdrawalBattleTargetOption[] {
  return usedCards(participant)
    .filter((entry) => entry.targetKey !== triggerSourceKey)
    .filter((entry) => entry.card.cleanupDestination !== 'hand')
    // A canceled hand commitment already returns to hand during ordinary cleanup.
    .filter((entry) => !(entry.targetKey === 'hand_commit' && entry.card.canceled))
    .map((entry) => ({
      targetKey: entry.targetKey,
      cardId: entry.card.cardId,
      origin: entry.card.origin,
    }));
}

function cardForTarget(participant: BattleParticipantState, targetKey: string): BattlePlayedCard | undefined {
  if (targetKey === 'hand_commit') return participant.handCommit;
  const match = /^battle_draw:(\d+)$/.exec(targetKey);
  if (!match) return undefined;
  return participant.battleDrawPlayed[Number(match[1])];
}

function currentSpace(game: GameState, playerId: PlayerID) {
  const occupied = game.players[playerId]?.occupiedSpaceId;
  return game.board.spaces.find((space) => space.id === occupied)
    ?? game.board.spaces.find((space) => space.occupant === playerId);
}

function additionalWithdrawalDestination(
  game: GameState,
  playerId: PlayerID,
  direction: -1 | 1,
) {
  const origin = currentSpace(game, playerId);
  const destination = origin && game.board.spaces.find((space) => space.index === origin.index + direction);
  return origin && destination && !destination.occupant ? destination : undefined;
}

function updateCaptureStatus(space: GameState['board']['spaces'][number], occupant: PlayerID): void {
  if (space.kind !== 'territory' || !space.controller || !space.territoryId) return;
  if (space.controller === occupant) delete space.capturePendingBy;
  else space.capturePendingBy = occupant;
}

function retreatDirection(battle: BattleState, loser: PlayerID, game: GameState): -1 | 1 {
  const location = game.board.spaces.find((space) => space.id === battle.location);
  const attackerOrigin = game.board.spaces.find((space) => space.id === battle.attackerOrigin);
  if (!location || !attackerOrigin) throw new Error('Strategic Withdrawal could not determine the battle line.');
  const attackerDirection = location.index > attackerOrigin.index ? 1 : -1;
  return (loser === battle.attacker.playerId ? -attackerDirection : attackerDirection) as -1 | 1;
}

function moveOneAdditionalPosition(
  game: GameState,
  playerId: PlayerID,
  direction: -1 | 1,
  battleId: string,
): void {
  const origin = currentSpace(game, playerId);
  const destination = additionalWithdrawalDestination(game, playerId, direction);
  if (!origin || !destination) throw new Error('The additional Strategic Withdrawal destination is no longer available.');
  origin.occupant = undefined;
  destination.occupant = playerId;
  game.players[playerId].occupiedSpaceId = destination.id;
  updateCaptureStatus(destination, playerId);
  appendPublicLog(
    game,
    playerId,
    'neutral_strategic_withdrawal_moved',
    `${game.players[playerId].name} withdrew one additional position with Strategic Withdrawal.`,
    { battleId, from: origin.id, to: destination.id },
  );
}

export function prepareStrategicWithdrawalAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedStrategicWithdrawalAction | undefined {
  if (action.cardId !== STRATEGIC_WITHDRAWAL) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new Error(`Unknown player: ${action.playerId}.`);
  const targets = action.targets ?? [];
  if (targets.length !== 1 || targets[0].kind !== 'card' || targets[0].owner !== action.playerId) {
    throw new Error('Strategic Withdrawal requires exactly one banked Asset you control.');
  }
  if (!player.zones.assetBank.includes(targets[0].cardId)) {
    throw new Error('The chosen Strategic Withdrawal Asset must be in your Asset Bank.');
  }
  return {
    targetCardId: targets[0].cardId,
    reopenMovement: game.phase === 'action_after_movement',
  };
}

export function applyStrategicWithdrawalAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedStrategicWithdrawalAction,
): void {
  const player = game.players[playerId];
  if (!removeOne(player.zones.assetBank, prepared.targetCardId)) {
    throw new Error('The chosen Strategic Withdrawal Asset is no longer banked.');
  }
  player.zones.hand.push(prepared.targetCardId);
  reconcileFaceDownAssets(player);
  player.movementRemaining += 1;
  if (prepared.reopenMovement) {
    game.phase = 'movement';
    game.priorityPlayer = playerId;
  }
  appendPublicLog(
    game,
    playerId,
    'neutral_strategic_withdrawal_action',
    `${player.name} returned a banked Asset to hand and gained one additional position of movement.`,
    {
      returnedCardId: prepared.targetCardId,
      movementRemaining: player.movementRemaining,
      reopenedMovement: prepared.reopenMovement,
    },
  );
}

function openNextBattleChoice(
  game: GameState,
  battle: BattleState,
  playerId: PlayerID,
  sourceKeys: string[],
  direction: -1 | 1,
  action: ResolveBattleAction,
  resumePriorityPlayer?: PlayerID,
): boolean {
  if (!additionalWithdrawalDestination(game, playerId, direction)) return false;
  const participant = participantFor(battle, playerId);
  const remaining = [...sourceKeys];
  while (remaining.length > 0) {
    const triggerSourceKey = remaining.shift()!;
    const options = targetOptions(participant, triggerSourceKey);
    if (options.length < 1) continue;
    game.pendingNeutralChoice = {
      kind: 'strategic_withdrawal_battle',
      playerId,
      battleId: battle.id,
      triggerSourceKey,
      sourceKeysRemaining: remaining,
      targetOptions: options,
      retreatDirection: direction,
      options: ['pass', 'use'],
      resume: {
        playerId: action.playerId,
        battleCardTargets: action.battleCardTargets,
      },
      resumePriorityPlayer,
    };
    game.priorityPlayer = playerId;
    return true;
  }
  return false;
}

/** Opens after the losing player has completed the battle's required retreat,
 * but before any physical battle card reaches its cleanup destination. */
export function openStrategicWithdrawalAfterRetreat(
  game: GameState,
  battle: BattleState,
  loser: PlayerID,
  action: ResolveBattleAction,
): boolean {
  const marker = `${STRATEGIC_WITHDRAWAL_WINDOW}:${loser}`;
  if (battle.effectsResolved.includes(marker)) return false;
  battle.effectsResolved.push(marker);
  if (battle.lossRetreatEffectsSuppressedFor?.includes(loser)) return false;

  const participant = participantFor(battle, loser);
  const sources = activeSourceKeys(participant);
  if (sources.length < 1) return false;
  return openNextBattleChoice(
    game,
    battle,
    loser,
    sources,
    retreatDirection(battle, loser, game),
    action,
    game.priorityPlayer,
  );
}

export function resolveStrategicWithdrawalChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): StrategicWithdrawalResolution {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'strategic_withdrawal_battle' || pending.playerId !== action.playerId) {
    throw new Error(`${action.playerId} has no pending Strategic Withdrawal choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) {
    throw new Error('The Strategic Withdrawal battle is no longer active.');
  }
  const participant = participantFor(battle, action.playerId);

  if (action.choice === 'use') {
    if (!action.targetKey || !pending.targetOptions.some((option) => option.targetKey === action.targetKey)) {
      throw new Error('Choose one other card used in the battle to return with Strategic Withdrawal.');
    }
    const target = cardForTarget(participant, action.targetKey);
    if (!target || target.virtual || target.cleanupDestination === 'hand') {
      throw new Error('The chosen Strategic Withdrawal card is no longer eligible.');
    }
    target.cleanupDestination = 'hand';
    moveOneAdditionalPosition(game, action.playerId, pending.retreatDirection, pending.battleId);
    appendPublicLog(
      game,
      action.playerId,
      'neutral_strategic_withdrawal_used',
      `${game.players[action.playerId].name} used Strategic Withdrawal and will return ${target.cardId} to hand during battle cleanup.`,
      { battleId: pending.battleId, triggerSourceKey: pending.triggerSourceKey, targetKey: action.targetKey, cardId: target.cardId },
    );
  } else if (action.choice === 'pass') {
    appendPublicLog(
      game,
      action.playerId,
      'neutral_strategic_withdrawal_passed',
      `${game.players[action.playerId].name} declined one Strategic Withdrawal effect.`,
      { battleId: pending.battleId, triggerSourceKey: pending.triggerSourceKey },
    );
  } else {
    throw new Error('Choose whether to use Strategic Withdrawal or pass.');
  }

  const remaining = pending.sourceKeysRemaining;
  const resume = pending.resume;
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;

  if (openNextBattleChoice(
    game,
    battle,
    action.playerId,
    remaining,
    pending.retreatDirection,
    {
      type: 'resolve_battle',
      playerId: resume.playerId,
      battleCardTargets: resume.battleCardTargets,
    },
    resumePriority,
  )) return {};

  return {
    deferredBattleAction: {
      type: 'resolve_battle',
      playerId: resume.playerId,
      battleCardTargets: resume.battleCardTargets,
    },
  };
}
