import { removeCapturedEncampments } from '../cards';
import type {
  BattlePlayedCard,
  BattleState,
  BoardSpaceState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';
import { effectiveAssetBankLimit, removeBlockadesAfterControlChange } from './diplomat-persistent';
import {
  consumeProtractedSiegeOverlayForCapture,
  removeProtractedSiegeOverlaysOverriddenByAssimilation,
} from './neutral-protracted-siege';
import {
  captureTerritoryControllerSnapshot,
  removeCaptureSensitiveOverlaysAfterControlChange,
} from './territory-overlays';

export const ASSIMILATION = 'neutral-assimilation';

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

function activeAssimilation(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === ASSIMILATION
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

function attackerHasBattleAssimilation(battle: BattleState): boolean {
  return activeAssimilation(battle.attacker.handCommit)
    || battle.attacker.battleDrawPlayed.some(activeAssimilation);
}

function qualifyingEnemyTerritoryBattle(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
): BoardSpaceState | undefined {
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (!space || space.kind !== 'territory' || !space.territoryId) return undefined;
  if (!controllerBeforeBattle || controllerBeforeBattle === battle.attacker.playerId) return undefined;
  return space;
}

function activeActionConditions(game: GameState, playerId: PlayerID): NonNullable<GameState['neutralAssimilationConditions']> {
  return (game.neutralAssimilationConditions ?? []).filter((condition) => (
    condition.playerId === playerId
    && condition.turn === game.turn
    && !condition.consumedBattleId
  ));
}

export function registerAssimilationActionCondition(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  if (!player?.zones.removed.includes(ASSIMILATION)) return;
  game.neutralAssimilationConditions ??= [];
  game.neutralAssimilationConditions.push({
    playerId,
    turn: game.turn,
    sourceCardId: ASSIMILATION,
  });
  appendPublicLog(
    game,
    playerId,
    'neutral_assimilation_condition_played',
    `${player.name} prepared Assimilation for their next attack this turn.`,
  );
}

/**
 * Records a completed qualifying battle and defers the capture replacement
 * until Counterworks has finished resolving any Protracted Siege placements.
 */
export function queueAssimilationAfterBattle(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): boolean {
  const space = qualifyingEnemyTerritoryBattle(game, battle, controllerBeforeBattle);
  if (!space) return false;

  const conditions = activeActionConditions(game, battle.attacker.playerId);
  for (const condition of conditions) condition.consumedBattleId = battle.id;

  const actionEffect = conditions.length > 0;
  const battleEffect = attackerHasBattleAssimilation(battle);
  if (winnerId !== battle.attacker.playerId || (!actionEffect && !battleEffect)) return false;

  game.neutralAssimilationBattleResolution = {
    battleId: battle.id,
    attackerId: battle.attacker.playerId,
    spaceId: space.id,
    actionEffect,
    battleEffect,
  };
  return true;
}

function reconcileAssetBankDiscards(game: GameState): void {
  for (const player of Object.values(game.players)) {
    const limit = effectiveAssetBankLimit(game, player.id);
    const discardCount = Math.max(player.zones.assetBank.length - limit, 0);
    if (discardCount > 0) {
      game.pendingAssetBankDiscards ??= {};
      game.pendingAssetBankDiscards[player.id] = {
        playerId: player.id,
        limit,
        discardCount,
        options: [...player.zones.assetBank],
      };
      game.priorityPlayer = player.id;
    } else if (game.pendingAssetBankDiscards?.[player.id]) {
      delete game.pendingAssetBankDiscards[player.id];
    }
  }
  if (game.pendingAssetBankDiscards && Object.keys(game.pendingAssetBankDiscards).length === 0) {
    game.pendingAssetBankDiscards = undefined;
  }
}

function captureImmediately(game: GameState, space: BoardSpaceState, playerId: PlayerID): boolean {
  if (space.kind !== 'territory' || !space.territoryId || space.occupant !== playerId) return false;
  const previousController = space.controller;
  if (previousController === playerId) {
    delete space.capturePendingBy;
    return false;
  }

  const controllerSnapshot = captureTerritoryControllerSnapshot(game);
  if (previousController) {
    game.players[previousController].controlledTerritories = game.players[previousController].controlledTerritories
      .filter((territoryId) => territoryId !== space.territoryId);
  }
  if (!game.players[playerId].controlledTerritories.includes(space.territoryId)) {
    game.players[playerId].controlledTerritories.push(space.territoryId);
  }
  space.controller = playerId;
  delete space.capturePendingBy;

  removeCapturedEncampments(game);
  removeBlockadesAfterControlChange(game);
  removeCaptureSensitiveOverlaysAfterControlChange(game, controllerSnapshot);
  reconcileAssetBankDiscards(game);
  appendPublicLog(
    game,
    playerId,
    'neutral_assimilation_captured',
    `${game.players[playerId].name} captured ${space.territoryId} immediately with Assimilation.`,
    { spaceId: space.id, territoryId: space.territoryId, previousController },
  );
  return true;
}

/** Completes the deferred Battle aftermath once all Overlay placement choices are settled. */
export function continueAssimilationBattleResolution(game: GameState): boolean {
  const pending = game.neutralAssimilationBattleResolution;
  if (!pending) return false;
  if (game.neutralCounterworksOverlayQueue?.some((request) => request.battleId === pending.battleId)) return false;
  if (game.pendingNeutralChoice?.kind === 'counterworks_asset') return false;

  const space = game.board.spaces.find((candidate) => candidate.id === pending.spaceId);
  game.neutralAssimilationBattleResolution = undefined;
  if (!space || space.kind !== 'territory' || space.occupant !== pending.attackerId) return false;

  if (pending.battleEffect) {
    removeProtractedSiegeOverlaysOverriddenByAssimilation(game, space, pending.attackerId);
    return captureImmediately(game, space, pending.attackerId);
  }

  if (pending.actionEffect && consumeProtractedSiegeOverlayForCapture(game, space, pending.attackerId)) {
    appendPublicLog(
      game,
      pending.attackerId,
      'neutral_assimilation_delay_reduced',
      `${game.players[pending.attackerId].name}'s Assimilation reduced the capture delay by one round.`,
      { battleId: pending.battleId, spaceId: pending.spaceId },
    );
    return true;
  }

  return pending.actionEffect ? captureImmediately(game, space, pending.attackerId) : false;
}

/** Discards every Action-condition copy belonging to the player whose turn ended. */
export function expireAssimilationConditions(game: GameState, endingPlayerId: PlayerID): number {
  const conditions = game.neutralAssimilationConditions ?? [];
  const expired = conditions.filter((condition) => condition.playerId === endingPlayerId);
  if (expired.length < 1) return 0;

  const player = game.players[endingPlayerId];
  let moved = 0;
  for (const condition of expired) {
    if (removeOne(player.zones.removed, condition.sourceCardId)) {
      player.zones.discard.push(condition.sourceCardId);
      moved += 1;
    }
  }
  game.neutralAssimilationConditions = conditions.filter((condition) => condition.playerId !== endingPlayerId);
  if (game.neutralAssimilationConditions.length === 0) game.neutralAssimilationConditions = undefined;

  appendPublicLog(
    game,
    endingPlayerId,
    'neutral_assimilation_condition_expired',
    `${player.name}'s Assimilation condition expired at the end of the turn.`,
    { count: moved },
  );
  return moved;
}
