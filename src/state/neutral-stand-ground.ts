import type {
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PendingMilitaryChoice,
  PlayerID,
} from '../types/v06';
import type {
  ResolveBattleAction,
  ResolveMilitaryChoiceAction,
  ResolveNeutralChoiceAction,
} from './actions';
import { faceUpAssetCopies, reconcileFaceDownAssets } from './asset-facing';
import { bankedAssetUseAllowed } from './banked-assets';
import { recordBankedAssetUse } from './intelligence-mission-triggers';

export const STAND_GROUND = 'neutral-stand-ground';
const STAND_GROUND_BATTLE_RESOLUTION = 'neutral_stand_ground_battle';

type StandGroundResolution = {
  deferredBattleAction?: ResolveBattleAction;
  deferredMilitaryAction?: ResolveMilitaryChoiceAction;
};

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

function activeStandGround(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === STAND_GROUND
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeBattleCopyCount(battle: BattleState, playerId: PlayerID): number {
  const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
  return (activeStandGround(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeStandGround).length;
}

function recentSeditionSuppressedCopies(game: GameState, playerId: PlayerID): number {
  return game.recentBattleResult?.seditionInactiveAssets?.[playerId]
    ?.filter((cardId) => cardId === STAND_GROUND).length ?? 0;
}

export function activeStandGroundAssetCopies(game: GameState, playerId: PlayerID): number {
  if (!bankedAssetUseAllowed(game, playerId)) return 0;
  if (!game.battle && game.recentBattleResult?.bankedAssetUseProhibitedFor?.includes(playerId)) return 0;
  const player = game.players[playerId];
  if (!player) return 0;
  const suppressed = game.battle
    ? game.battle.seditionInactiveAssets?.[playerId]
      ?.filter((cardId) => cardId === STAND_GROUND).length ?? 0
    : recentSeditionSuppressedCopies(game, playerId);
  return Math.max(0, faceUpAssetCopies(player, STAND_GROUND) - suppressed);
}

export function consumeStandGroundAsset(game: GameState, playerId: PlayerID, battleId: string): void {
  if (activeStandGroundAssetCopies(game, playerId) < 1) {
    throw new Error(`${game.players[playerId].name} has no active Stand Ground Asset to use.`);
  }
  const player = game.players[playerId];
  if (!removeOne(player.zones.assetBank, STAND_GROUND)) {
    throw new Error('Stand Ground is no longer in the Asset Bank.');
  }
  player.zones.discard.push(STAND_GROUND);
  reconcileFaceDownAssets(player);
  recordBankedAssetUse(game, playerId, battleId, STAND_GROUND);
  appendPublicLog(
    game,
    playerId,
    'neutral_stand_ground_used',
    `${player.name} discarded Stand Ground and ignored an opposing card effect’s movement.`,
    { battleId },
  );
}

export function applyStandGroundBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(STAND_GROUND_BATTLE_RESOLUTION)) return;

  const count = activeBattleCopyCount(battle, battle.defender.playerId);
  if (count > 0) {
    battle.defender.advantage = (battle.defender.advantage ?? 0) + count;
    appendPublicLog(
      game,
      battle.defender.playerId,
      'neutral_stand_ground_battle_advantage',
      `${game.players[battle.defender.playerId].name} gained ${count} advantage from Stand Ground while defending.`,
      { battleId: battle.id, copies: count },
    );
  }
  battle.effectsResolved.push(STAND_GROUND_BATTLE_RESOLUTION);
}

function retreatExtraCapacity(game: GameState, battle: BattleState, loser: PlayerID): number {
  const location = game.board.spaces.find((space) => space.id === battle.location);
  const attackerOrigin = game.board.spaces.find((space) => space.id === battle.attackerOrigin);
  if (!location || !attackerOrigin) return 0;
  const directionFromAttacker = location.index > attackerOrigin.index ? 1 : -1;
  const loserIsAttacker = loser === battle.attacker.playerId;
  let retreatIndex: number;
  if (loserIsAttacker) retreatIndex = attackerOrigin.index;
  else {
    const base = game.board.spaces.find((space) => space.index === location.index + directionFromAttacker);
    if (!base || base.occupant) return 0;
    retreatIndex = base.index;
  }

  const extraDirection = loserIsAttacker ? -directionFromAttacker : directionFromAttacker;
  let capacity = 0;
  while (true) {
    const next = game.board.spaces.find((space) => space.index === retreatIndex + extraDirection);
    if (!next || next.occupant) break;
    capacity += 1;
    retreatIndex = next.index;
  }
  return capacity;
}

export function openStandGroundForNoMartyrsMovement(
  game: GameState,
  battle: BattleState,
  loser: PlayerID,
  winner: PlayerID,
  action: ResolveBattleAction,
): boolean {
  const requested = battle.additionalRetreatPositions?.[loser] ?? 0;
  if (requested < 1) return false;

  battle.standGroundNoMartyrsInitialCounts ??= {};
  battle.standGroundNoMartyrsProcessedCounts ??= {};
  if (battle.standGroundNoMartyrsInitialCounts[loser] === undefined) {
    battle.standGroundNoMartyrsInitialCounts[loser] = Math.min(
      requested,
      retreatExtraCapacity(game, battle, loser),
    );
  }
  const initial = battle.standGroundNoMartyrsInitialCounts[loser] ?? 0;
  const processed = battle.standGroundNoMartyrsProcessedCounts[loser] ?? 0;
  if (processed >= initial) return false;

  if (activeStandGroundAssetCopies(game, loser) < 1) {
    battle.standGroundNoMartyrsProcessedCounts[loser] = initial;
    return false;
  }

  game.pendingNeutralChoice = {
    kind: 'stand_ground_movement',
    playerId: loser,
    sourcePlayerId: winner,
    sourceCardId: 'inquisition-no-martyrs',
    battleId: battle.id,
    movementKind: 'no_martyrs',
    triggersRemaining: initial - processed,
    options: ['pass', 'use'],
    resume: {
      kind: 'resolve_battle',
      playerId: action.playerId,
      battleCardTargets: action.battleCardTargets,
    },
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = loser;
  return true;
}

function movementDestinationOpen(game: GameState, playerId: PlayerID, direction: -1 | 1): boolean {
  const origin = game.board.spaces.find((space) => space.occupant === playerId);
  const destination = origin && game.board.spaces.find((space) => space.index === origin.index + direction);
  return Boolean(origin && destination && !destination.occupant);
}

export function openStandGroundForMilitaryMovement(
  game: GameState,
  pending: PendingMilitaryChoice,
  selected: string,
  cardId?: CardID,
): boolean {
  if (pending.kind !== 'war_crimes' && pending.kind !== 'shock_and_awe') return false;
  if (pending.kind === 'war_crimes' && selected !== 'use') return false;
  if (pending.kind === 'shock_and_awe' && selected !== 'breakthrough') return false;
  if (pending.standGroundResolved) return false;

  const result = game.recentBattleResult;
  if (!result) return false;
  const target = pending.defeatedPlayer;
  if (!movementDestinationOpen(game, target, result.retreatDirection)) {
    pending.standGroundResolved = true;
    pending.standGroundPrevented = false;
    return false;
  }
  if (activeStandGroundAssetCopies(game, target) < 1) {
    pending.standGroundResolved = true;
    pending.standGroundPrevented = false;
    return false;
  }

  game.pendingNeutralChoice = {
    kind: 'stand_ground_movement',
    playerId: target,
    sourcePlayerId: pending.playerId,
    sourceCardId: pending.sourceCardId,
    battleId: result.battleId,
    movementKind: pending.kind,
    triggersRemaining: 1,
    options: ['pass', 'use'],
    resume: {
      kind: 'resolve_military_choice',
      playerId: pending.playerId,
      choice: selected,
      cardId,
    },
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = target;
  return true;
}

export function resolveStandGroundChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): StandGroundResolution {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'stand_ground_movement' || pending.playerId !== action.playerId) {
    throw new Error(`${action.playerId} has no pending Stand Ground choice.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new Error('Choose whether to use Stand Ground or pass.');
  }

  const prevented = action.choice === 'use';
  if (prevented) consumeStandGroundAsset(game, action.playerId, pending.battleId);

  if (pending.movementKind === 'no_martyrs') {
    const battle = game.battle;
    if (!battle || battle.id !== pending.battleId) throw new Error('The battle for Stand Ground is no longer active.');
    battle.standGroundNoMartyrsProcessedCounts ??= {};
    battle.standGroundNoMartyrsProcessedCounts[action.playerId] =
      (battle.standGroundNoMartyrsProcessedCounts[action.playerId] ?? 0) + 1;
    if (prevented) {
      battle.additionalRetreatPositions ??= {};
      battle.additionalRetreatPositions[action.playerId] = Math.max(
        0,
        (battle.additionalRetreatPositions[action.playerId] ?? 0) - 1,
      );
    }
  } else {
    const military = game.pendingMilitaryChoice;
    if (!military
      || (military.kind !== 'war_crimes' && military.kind !== 'shock_and_awe')
      || military.sourceCardId !== pending.sourceCardId) {
      throw new Error('The opposing movement effect is no longer pending.');
    }
    military.standGroundResolved = true;
    military.standGroundPrevented = prevented;
  }

  const resume = pending.resume;
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;

  if (resume.kind === 'resolve_battle') {
    return {
      deferredBattleAction: {
        type: 'resolve_battle',
        playerId: resume.playerId,
        battleCardTargets: resume.battleCardTargets,
      },
    };
  }
  return {
    deferredMilitaryAction: {
      type: 'resolve_military_choice',
      playerId: resume.playerId,
      choice: resume.choice,
      cardId: resume.cardId,
    },
  };
}
