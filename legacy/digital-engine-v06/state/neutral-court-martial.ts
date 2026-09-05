import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CourtMartialCleanupRequest,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { faceUpAssetCopies, reconcileFaceDownAssets } from './asset-facing';
import { bankedAssetUseAllowed } from './banked-assets';
import {
  fealtyPreventsOpposingCardDisadvantage,
  logFealtyDisadvantagePrevention,
} from './neutral-fealty';
import {
  activeStandGroundAssetCopies,
  consumeStandGroundAsset,
} from './neutral-stand-ground';
import { recordBankedAssetUse } from './intelligence-mission-triggers';

export const COURT_MARTIAL = 'neutral-court-martial';
const COURT_MARTIAL_BATTLE_RESOLUTION = 'neutral_court_martial_battle';

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

function removeOne(cards: string[], cardId: string): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function activeCourtMartial(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === COURT_MARTIAL
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeBattleCopyCount(participant: BattleParticipantState): number {
  return (activeCourtMartial(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeCourtMartial).length;
}

export function applyCourtMartialBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(COURT_MARTIAL_BATTLE_RESOLUTION)) return;

  for (const source of [battle.attacker, battle.defender]) {
    const copies = activeBattleCopyCount(source);
    if (copies < 1) continue;
    const target = source === battle.attacker ? battle.defender : battle.attacker;
    let applied = 0;
    for (let index = 0; index < copies; index += 1) {
      if (fealtyPreventsOpposingCardDisadvantage(game, source.playerId, target.playerId)) {
        logFealtyDisadvantagePrevention(game, source.playerId, target.playerId, 'Court Martial');
        continue;
      }
      target.disadvantage = (target.disadvantage ?? 0) + 1;
      applied += 1;
    }
    if (applied > 0) {
      appendPublicLog(
        game,
        source.playerId,
        'neutral_court_martial_battle_disadvantage',
        `${game.players[target.playerId].name} gained ${applied} disadvantage from Court Martial.`,
        { battleId: battle.id, sourcePlayerId: source.playerId, targetPlayerId: target.playerId, copies: applied },
      );
    }
  }

  battle.effectsResolved.push(COURT_MARTIAL_BATTLE_RESOLUTION);
}

function recentSuppressedCopies(game: GameState, playerId: PlayerID): number {
  return game.recentBattleResult?.seditionInactiveAssets?.[playerId]
    ?.filter((cardId) => cardId === COURT_MARTIAL).length ?? 0;
}

export function activeCourtMartialAssetCopies(game: GameState, playerId: PlayerID): number {
  if (!bankedAssetUseAllowed(game, playerId)) return 0;
  if (!game.battle && game.recentBattleResult?.bankedAssetUseProhibitedFor?.includes(playerId)) return 0;
  const player = game.players[playerId];
  if (!player) return 0;
  const suppressed = game.battle
    ? game.battle.seditionInactiveAssets?.[playerId]
      ?.filter((cardId) => cardId === COURT_MARTIAL).length ?? 0
    : recentSuppressedCopies(game, playerId);
  return Math.max(0, faceUpAssetCopies(player, COURT_MARTIAL) - suppressed);
}

function consumeCourtMartialAsset(game: GameState, playerId: PlayerID, battleId: string): void {
  if (activeCourtMartialAssetCopies(game, playerId) < 1) {
    throw new Error(`${game.players[playerId].name} has no active Court Martial Asset to use.`);
  }
  const player = game.players[playerId];
  if (!removeOne(player.zones.assetBank, COURT_MARTIAL)) {
    throw new Error('Court Martial is no longer in the Asset Bank.');
  }
  player.zones.discard.push(COURT_MARTIAL);
  reconcileFaceDownAssets(player);
  recordBankedAssetUse(game, playerId, battleId, COURT_MARTIAL);
  appendPublicLog(
    game,
    playerId,
    'neutral_court_martial_asset_used',
    `${player.name} discarded Court Martial to force an additional retreat.`,
    { battleId },
  );
}

function movementDestination(game: GameState, playerId: PlayerID, direction: -1 | 1) {
  const origin = game.board.spaces.find((space) => space.occupant === playerId);
  const destination = origin && game.board.spaces.find((space) => space.index === origin.index + direction);
  if (!origin || !destination || destination.occupant) return undefined;
  return { origin, destination };
}

function moveOneAdditionalPosition(game: GameState, request: CourtMartialCleanupRequest): boolean {
  const result = game.recentBattleResult;
  if (!result || result.battleId !== request.battleId) return false;
  const movement = movementDestination(game, request.targetPlayerId, result.retreatDirection);
  if (!movement) return false;
  delete movement.origin.occupant;
  movement.destination.occupant = request.targetPlayerId;
  game.players[request.targetPlayerId].occupiedSpaceId = movement.destination.id;
  if (movement.destination.kind === 'territory'
    && movement.destination.controller
    && movement.destination.controller !== request.targetPlayerId) {
    movement.destination.capturePendingBy = request.targetPlayerId;
  } else if (movement.destination.kind === 'territory'
    && movement.destination.controller === request.targetPlayerId) {
    delete movement.destination.capturePendingBy;
  }
  appendPublicLog(
    game,
    request.sourcePlayerId,
    'neutral_court_martial_extra_retreat',
    `${game.players[request.targetPlayerId].name} retreated one additional position because of Court Martial.`,
    {
      battleId: request.battleId,
      source: request.source,
      targetPlayerId: request.targetPlayerId,
      destinationSpaceId: movement.destination.id,
    },
  );
  return true;
}

function clearQueue(game: GameState): void {
  game.neutralCourtMartialQueue = undefined;
}

function currentRequest(game: GameState): CourtMartialCleanupRequest | undefined {
  return game.neutralCourtMartialQueue?.[0];
}

function shiftRequest(game: GameState): void {
  game.neutralCourtMartialQueue?.shift();
  if (game.neutralCourtMartialQueue?.length === 0) clearQueue(game);
}

export function queueCourtMartialCleanup(
  game: GameState,
  battle: BattleState,
  winnerId?: PlayerID,
): void {
  if (!winnerId) return;
  const result = game.recentBattleResult;
  if (!result || result.battleId !== battle.id || result.winner !== winnerId) return;
  if (!movementDestination(game, result.loser, result.retreatDirection)) return;

  const winner = battle.attacker.playerId === winnerId ? battle.attacker : battle.defender;
  const battleCopies = activeBattleCopyCount(winner);
  const assetCopies = activeCourtMartialAssetCopies(game, winnerId);
  const requests: CourtMartialCleanupRequest[] = [];
  for (let index = 0; index < battleCopies; index += 1) {
    requests.push({
      id: `${battle.id}-court-martial-battle-${index + 1}`,
      sourcePlayerId: winnerId,
      targetPlayerId: result.loser,
      battleId: battle.id,
      source: 'battle',
    });
  }
  for (let index = 0; index < assetCopies; index += 1) {
    requests.push({
      id: `${battle.id}-court-martial-asset-${index + 1}`,
      sourcePlayerId: winnerId,
      targetPlayerId: result.loser,
      battleId: battle.id,
      source: 'asset',
    });
  }
  if (requests.length > 0) game.neutralCourtMartialQueue = requests;
}

export function processCourtMartialCleanupQueue(game: GameState): void {
  if (game.pendingNeutralChoice) return;
  while (currentRequest(game)) {
    const request = currentRequest(game)!;
    const result = game.recentBattleResult;
    if (!result || result.battleId !== request.battleId || result.winner !== request.sourcePlayerId) {
      clearQueue(game);
      return;
    }
    if (!movementDestination(game, request.targetPlayerId, result.retreatDirection)) {
      clearQueue(game);
      return;
    }

    if (request.source === 'asset' && !request.assetConsumed) {
      if (activeCourtMartialAssetCopies(game, request.sourcePlayerId) < 1) {
        shiftRequest(game);
        continue;
      }
      game.pendingNeutralChoice = {
        kind: 'court_martial_asset',
        playerId: request.sourcePlayerId,
        battleId: request.battleId,
        requestId: request.id,
        targetPlayerId: request.targetPlayerId,
        options: ['pass', 'use'],
        resumePriorityPlayer: game.priorityPlayer,
      };
      game.priorityPlayer = request.sourcePlayerId;
      return;
    }

    if (activeStandGroundAssetCopies(game, request.targetPlayerId) > 0) {
      game.pendingNeutralChoice = {
        kind: 'court_martial_retreat',
        playerId: request.targetPlayerId,
        battleId: request.battleId,
        requestId: request.id,
        sourcePlayerId: request.sourcePlayerId,
        options: ['pass', 'use'],
        resumePriorityPlayer: game.priorityPlayer,
      };
      game.priorityPlayer = request.targetPlayerId;
      return;
    }

    moveOneAdditionalPosition(game, request);
    shiftRequest(game);
  }
}

export function resolveCourtMartialChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending
    || (pending.kind !== 'court_martial_asset' && pending.kind !== 'court_martial_retreat')
    || pending.playerId !== action.playerId) {
    throw new Error(`${action.playerId} has no pending Court Martial choice.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new Error('Choose whether to use the pending card or pass.');
  }
  const request = currentRequest(game);
  if (!request || request.id !== pending.requestId || request.battleId !== pending.battleId) {
    throw new Error('The pending Court Martial retreat is no longer available.');
  }
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;

  if (pending.kind === 'court_martial_asset') {
    if (action.choice === 'pass') {
      game.neutralCourtMartialQueue = game.neutralCourtMartialQueue
        ?.filter((entry) => entry.source !== 'asset');
      if (game.neutralCourtMartialQueue?.length === 0) clearQueue(game);
      return;
    }
    consumeCourtMartialAsset(game, action.playerId, pending.battleId);
    request.assetConsumed = true;
    return;
  }

  if (action.choice === 'use') {
    consumeStandGroundAsset(game, action.playerId, pending.battleId);
    shiftRequest(game);
    return;
  }
  moveOneAdditionalPosition(game, request);
  shiftRequest(game);
}
