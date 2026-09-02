import { removeCapturedEncampments } from '../cards';
import type {
  BattlePlayedCard,
  BattleState,
  BoardSpaceState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { effectiveAssetBankLimit, removeBlockadesAfterControlChange } from './diplomat-persistent';
import { activeBankedAssetCopies, bankedAssetUseAllowed } from './intelligence-subversion-battle';
import { GameActionError } from './reducer';
import {
  captureTerritoryControllerSnapshot,
  removeCaptureSensitiveOverlaysAfterControlChange,
} from './territory-overlays';

export const ASSIMILATION = 'neutral-assimilation';

interface AssimilationResolutionState {
  battleId: string;
  attackerId: PlayerID;
  spaceId: SpaceID;
  actionEffect: boolean;
  battleEffect: boolean;
  battleDrawCopies: number;
}

interface PendingAssimilationAssetChoice {
  kind: 'assimilation_asset';
  playerId: PlayerID;
  battleId: string;
  spaceId: SpaceID;
  options: ['pass', 'use'];
  resumePriorityPlayer?: PlayerID;
}

function resolutionState(game: GameState): AssimilationResolutionState | undefined {
  return game.neutralAssimilationBattleResolution as AssimilationResolutionState | undefined;
}

function pendingChoice(game: GameState): PendingAssimilationAssetChoice | undefined {
  const pending = game.pendingNeutralChoice as unknown as PendingAssimilationAssetChoice | undefined;
  return pending?.kind === 'assimilation_asset' ? pending : undefined;
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

function activeAssimilation(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === ASSIMILATION
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function attackerBattleCopies(battle: BattleState): BattlePlayedCard[] {
  return [battle.attacker.handCommit, ...battle.attacker.battleDrawPlayed]
    .filter(activeAssimilation);
}

function qualifyingEnemyTerritoryWin(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): BoardSpaceState | undefined {
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (winnerId !== battle.attacker.playerId
    || !space
    || space.kind !== 'territory'
    || !space.territoryId
    || !controllerBeforeBattle
    || controllerBeforeBattle === battle.attacker.playerId) return undefined;
  return space;
}

function activeActionCopies(game: GameState, battle: BattleState): number {
  const playerId = battle.attacker.playerId;
  if (battle.bankedAssetUseProhibited?.includes(playerId) || !bankedAssetUseAllowed(game, playerId)) return 0;
  const seditionSuppressed = battle.seditionInactiveAssets?.[playerId]
    ?.filter((cardId) => cardId === ASSIMILATION).length ?? 0;
  return Math.max(0, activeBankedAssetCopies(game, playerId, ASSIMILATION) - seditionSuppressed);
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

function moveBattleDrawCopiesToGraveyard(
  game: GameState,
  playerId: PlayerID,
  count: number,
): void {
  const player = game.players[playerId];
  for (let index = 0; index < count; index += 1) {
    if (!removeOne(player.zones.discard, ASSIMILATION)) {
      throw new GameActionError('Assimilation could not find its Battle Hand cleanup copy.');
    }
    player.zones.graveyard.push(ASSIMILATION);
  }
}

/**
 * Records a qualifying attacker win. Counterworks and other queued Overlay
 * placement windows finish before Assimilation replaces occupation with capture.
 */
export function queueAssimilationAfterBattle(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): boolean {
  const space = qualifyingEnemyTerritoryWin(game, battle, controllerBeforeBattle, winnerId);
  if (!space) return false;

  const battleCopies = attackerBattleCopies(battle);
  const actionCopies = activeActionCopies(game, battle);
  if (battleCopies.length === 0 && actionCopies === 0) return false;

  game.neutralAssimilationBattleResolution = {
    battleId: battle.id,
    attackerId: battle.attacker.playerId,
    spaceId: space.id,
    actionEffect: battleCopies.length === 0 && actionCopies > 0,
    battleEffect: battleCopies.length > 0,
    battleDrawCopies: battleCopies.filter((card) => card.origin === 'battle_draw').length,
  } as AssimilationResolutionState;
  return true;
}

/** Completes the queued aftermath once Overlay placement choices are settled. */
export function continueAssimilationBattleResolution(game: GameState): boolean {
  const pending = resolutionState(game);
  if (!pending) return false;
  if (game.neutralCounterworksOverlayQueue?.some((request) => request.battleId === pending.battleId)) return false;
  if (game.pendingNeutralChoice?.kind === 'counterworks_asset') return false;

  const space = game.board.spaces.find((candidate) => candidate.id === pending.spaceId);
  if (!space || space.kind !== 'territory' || space.occupant !== pending.attackerId) {
    game.neutralAssimilationBattleResolution = undefined;
    return false;
  }

  if (pending.battleEffect) {
    const captured = captureImmediately(game, space, pending.attackerId);
    if (captured) {
      moveBattleDrawCopiesToGraveyard(game, pending.attackerId, pending.battleDrawCopies);
      appendPublicLog(
        game,
        pending.attackerId,
        'neutral_assimilation_battle',
        `${game.players[pending.attackerId].name}'s Battle Assimilation entered the Graveyard after the capture resolved.`,
        { battleId: pending.battleId, battleDrawCopies: pending.battleDrawCopies },
      );
    }
    game.neutralAssimilationBattleResolution = undefined;
    return captured;
  }

  if (!pending.actionEffect || activeBankedAssetCopies(game, pending.attackerId, ASSIMILATION) < 1) {
    game.neutralAssimilationBattleResolution = undefined;
    return false;
  }

  game.pendingNeutralChoice = {
    kind: 'assimilation_asset',
    playerId: pending.attackerId,
    battleId: pending.battleId,
    spaceId: pending.spaceId,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  } as unknown as GameState['pendingNeutralChoice'];
  game.priorityPlayer = pending.attackerId;
  return false;
}

export function resolveAssimilationChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = pendingChoice(game);
  const resolution = resolutionState(game);
  if (!pending || pending.playerId !== action.playerId || !resolution || resolution.battleId !== pending.battleId) {
    throw new GameActionError(`${action.playerId} has no pending Assimilation choice.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to put Assimilation in the Graveyard and capture immediately.');
  }

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;

  if (action.choice === 'pass') {
    game.neutralAssimilationBattleResolution = undefined;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_assimilation_asset_passed',
      `${game.players[action.playerId].name} kept their banked Assimilation after the battle.`,
      { battleId: pending.battleId, spaceId: pending.spaceId },
    );
    return;
  }

  const player = game.players[action.playerId];
  const space = game.board.spaces.find((candidate) => candidate.id === pending.spaceId);
  if (!space || activeBankedAssetCopies(game, action.playerId, ASSIMILATION) < 1
    || !removeOne(player.zones.assetBank, ASSIMILATION)) {
    throw new GameActionError('Assimilation is no longer an active banked Asset.');
  }
  if (!captureImmediately(game, space, action.playerId)) {
    throw new GameActionError('The Territory can no longer be captured with Assimilation.');
  }
  player.zones.graveyard.push(ASSIMILATION);
  game.neutralAssimilationBattleResolution = undefined;
  appendPublicLog(
    game,
    action.playerId,
    'neutral_assimilation_asset_used',
    `${player.name} put Assimilation in the Graveyard after winning and captured the Territory immediately.`,
    { battleId: pending.battleId, spaceId: pending.spaceId },
  );
}
