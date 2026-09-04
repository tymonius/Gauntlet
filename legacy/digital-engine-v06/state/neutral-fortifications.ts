import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveBattleAction, ResolveNeutralChoiceAction } from './actions';
import { activeBankedAssetCopies } from './banked-assets';
import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';

export const FORTIFICATIONS = 'neutral-fortifications';
const FORTIFICATIONS_BATTLE_RESOLUTION = 'neutral_fortifications_battle';
const FORTIFICATIONS_WITHDRAWAL_WINDOW = 'neutral_fortifications_withdrawal';

export interface FortificationsResolution {
  deferredBattleAction?: ResolveBattleAction;
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

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === FORTIFICATIONS
    && !card.canceled
    && !card.negated
    && (!card.virtual || card.effectOnlyReplay),
  );
}

function activeSourceKeys(participant: BattleParticipantState): string[] {
  const keys: string[] = [];
  if (active(participant.handCommit)) keys.push('hand_commit');
  participant.battleDrawPlayed.forEach((card, index) => {
    if (active(card)) keys.push(`battle_draw:${index}`);
  });
  return keys;
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
  return origin && destination && !destination.occupant ? { origin, destination } : undefined;
}

function retreatDirection(battle: BattleState, game: GameState): -1 | 1 {
  const location = game.board.spaces.find((space) => space.id === battle.location);
  const attackerOrigin = game.board.spaces.find((space) => space.id === battle.attackerOrigin);
  if (!location || !attackerOrigin) throw new Error('Fortifications could not determine the battle line.');
  const attackerDirection = location.index > attackerOrigin.index ? 1 : -1;
  return attackerDirection as -1 | 1;
}

function updateCaptureStatus(space: GameState['board']['spaces'][number], occupant: PlayerID): void {
  if (space.kind !== 'territory' || !space.controller || !space.territoryId) return;
  if (space.controller === occupant) delete space.capturePendingBy;
  else space.capturePendingBy = occupant;
}

function moveOneAdditionalPosition(
  game: GameState,
  playerId: PlayerID,
  direction: -1 | 1,
  battleId: string,
): void {
  const movement = additionalWithdrawalDestination(game, playerId, direction);
  if (!movement) throw new Error('The additional Fortifications withdrawal destination is no longer available.');
  delete movement.origin.occupant;
  movement.destination.occupant = playerId;
  game.players[playerId].occupiedSpaceId = movement.destination.id;
  updateCaptureStatus(movement.destination, playerId);
  appendPublicLog(
    game,
    playerId,
    'neutral_fortifications_withdrawal',
    `${game.players[playerId].name} withdrew one additional position with Fortifications.`,
    { battleId, from: movement.origin.id, to: movement.destination.id },
  );
}

/** Applies the continuous Action/Asset form when a battle begins. */
export function applyFortificationsAssetBattleHandLimit(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'hand_commit') return false;
  const defenderId = battle.defender.playerId;
  if (activeBankedAssetCopies(game, defenderId, FORTIFICATIONS) < 1) return false;
  if (battle.defender.battleDrawPlayLimit >= 2) return false;
  battle.defender.battleDrawPlayLimit = 2;
  appendPublicLog(
    game,
    defenderId,
    'neutral_fortifications_asset',
    `${game.players[defenderId].name} may choose up to two cards from their Battle Hand while defending.`,
    { battleId: battle.id, battleDrawPlayLimit: 2 },
  );
  return true;
}

/** Applies each active physical Battle copy's defending +1 after reveal. */
export function applyFortificationsBattleEffects(game: GameState): boolean {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || battle.effectsResolved.includes(FORTIFICATIONS_BATTLE_RESOLUTION)) return false;
  battle.effectsResolved.push(FORTIFICATIONS_BATTLE_RESOLUTION);
  const copies = activeSourceKeys(battle.defender).length;
  if (copies < 1) return false;
  battle.defender.modifiers += copies;
  appendPublicLog(
    game,
    battle.defender.playerId,
    'neutral_fortifications_battle_bonus',
    `${game.players[battle.defender.playerId].name} gained +${copies} from Fortifications.`,
    { battleId: battle.id, copies },
  );
  return true;
}

function openNextWithdrawalChoice(
  game: GameState,
  battle: BattleState,
  playerId: PlayerID,
  sourceKeys: string[],
  direction: -1 | 1,
  action: ResolveBattleAction,
  resumePriorityPlayer?: PlayerID,
): boolean {
  if (!additionalWithdrawalDestination(game, playerId, direction)) return false;
  const remaining = [...sourceKeys];
  const sourceKey = remaining.shift();
  if (!sourceKey) return false;
  game.pendingNeutralChoice = {
    kind: 'fortifications_battle',
    playerId,
    battleId: battle.id,
    sourceKey,
    sourceKeysRemaining: remaining,
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

/** Opens after required retreat and Strategic Withdrawal, before cleanup. */
export function openFortificationsAfterRetreat(
  game: GameState,
  battle: BattleState,
  loser: PlayerID,
  action: ResolveBattleAction,
): boolean {
  const marker = `${FORTIFICATIONS_WITHDRAWAL_WINDOW}:${loser}`;
  if (battle.effectsResolved.includes(marker)) return false;
  battle.effectsResolved.push(marker);
  if (loser !== battle.defender.playerId) return false;
  if (lossOrRetreatBenefitsSuppressed(game, loser, battle.id)) return false;
  const sources = activeSourceKeys(battle.defender);
  if (sources.length < 1) return false;
  return openNextWithdrawalChoice(
    game,
    battle,
    loser,
    sources,
    retreatDirection(battle, game),
    action,
    game.priorityPlayer,
  );
}

export function resolveFortificationsChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): FortificationsResolution {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'fortifications_battle' || pending.playerId !== action.playerId) {
    throw new Error(`${action.playerId} has no pending Fortifications choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) {
    throw new Error('The Fortifications battle is no longer active.');
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new Error('Choose whether to withdraw with Fortifications or pass.');
  }

  if (action.choice === 'use') {
    moveOneAdditionalPosition(game, action.playerId, pending.retreatDirection, pending.battleId);
  } else {
    appendPublicLog(
      game,
      action.playerId,
      'neutral_fortifications_passed',
      `${game.players[action.playerId].name} declined one Fortifications withdrawal.`,
      { battleId: pending.battleId, sourceKey: pending.sourceKey },
    );
  }

  const remaining = pending.sourceKeysRemaining;
  const resume = pending.resume;
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  if (openNextWithdrawalChoice(
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
