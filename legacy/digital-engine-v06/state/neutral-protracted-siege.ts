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
import { activeBankedAssetCopies } from './banked-assets';
import { lossOrRetreatBenefitsSuppressed } from './inquisition-no-martyrs';
import { processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';
import { GameActionError } from './reducer';
import { topTerritoryOverlay } from './territory-overlays';

export const PROTRACTED_SIEGE = 'neutral-protracted-siege';

export interface ProtractedSiegeCaptureResume {
  capturingPlayerId: PlayerID;
  skipAssetWindowSpaceId?: SpaceID;
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

function activeProtractedSiege(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === PROTRACTED_SIEGE
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

function defenderBattleSources(battle: BattleState): BattlePlayedCard[] {
  const sources: BattlePlayedCard[] = [];
  if (activeProtractedSiege(battle.defender.handCommit)) sources.push(battle.defender.handCommit);
  sources.push(...battle.defender.battleDrawPlayed.filter(activeProtractedSiege));
  return sources;
}

function defenderLostControlledTerritoryAndRetreated(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): boolean {
  const defenderId = battle.defender.playerId;
  const result = game.recentBattleResult;
  return Boolean(
    winnerId === battle.attacker.playerId
    && controllerBeforeBattle === defenderId
    && result?.battleId === battle.id
    && result.loser === defenderId
    && result.defender === defenderId
    && game.players[defenderId]?.occupiedSpaceId !== battle.location
    && !lossOrRetreatBenefitsSuppressed(game, defenderId, battle.id)
  );
}

/** Queues every active physical Battle copy as an Overlay after normal cleanup. */
export function queueProtractedSiegeBattleOverlays(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): number {
  if (!defenderLostControlledTerritoryAndRetreated(game, battle, controllerBeforeBattle, winnerId)) return 0;
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (!space || space.kind !== 'territory') return 0;

  let queued = 0;
  for (const source of defenderBattleSources(battle)) {
    const sourceZone = source.origin === 'hand' ? 'graveyard' : 'discard';
    if (!game.players[source.owner].zones[sourceZone].includes(source.cardId)) continue;
    queueCounterworksOverlayPlacement(game, {
      kind: 'protracted_siege_battle',
      playerId: source.owner,
      cardId: source.cardId,
      spaceId: space.id,
      source: { zone: sourceZone },
      battleId: battle.id,
      captureOccupierId: battle.attacker.playerId,
    });
    queued += 1;
  }
  processCounterworksOverlayQueue(game);
  return queued;
}

function removeOverlayAt(game: GameState, space: BoardSpaceState, index: number, type: string, message: string): void {
  const overlay = space.overlays?.[index];
  if (!overlay) return;
  space.overlays!.splice(index, 1);
  if (!space.overlays!.length) space.overlays = undefined;
  game.players[overlay.owner]?.zones.graveyard.push(overlay.cardId);
  appendPublicLog(game, overlay.owner, type, message, {
    cardId: overlay.cardId,
    owner: overlay.owner,
    spaceId: space.id,
    captureDelayOccupier: overlay.captureDelayOccupier,
  });
}

/**
 * The top exposed copy delays this Capture step, then immediately enters its
 * owner's Graveyard. Dormant copies remain attached with their timers paused.
 */
export function consumeProtractedSiegeOverlayForCapture(
  game: GameState,
  space: BoardSpaceState,
  capturingPlayerId: PlayerID,
): boolean {
  const overlay = topTerritoryOverlay(space);
  if (overlay?.cardId !== PROTRACTED_SIEGE || overlay.owner === capturingPlayerId) return false;
  if (overlay.captureDelayOccupier && overlay.captureDelayOccupier !== capturingPlayerId) return false;
  const index = (space.overlays?.length ?? 1) - 1;
  removeOverlayAt(
    game,
    space,
    index,
    'neutral_protracted_siege_capture_delayed',
    `${game.players[overlay.owner].name}'s Protracted Siege delayed the capture of ${space.territoryId ?? space.id}.`,
  );
  return true;
}

export function openProtractedSiegeCaptureChoice(
  game: GameState,
  space: BoardSpaceState,
  capturingPlayerId: PlayerID,
  skipAssetWindowSpaceId?: SpaceID,
): boolean {
  if (skipAssetWindowSpaceId === space.id) return false;
  const controller = space.controller;
  if (!controller || controller === capturingPlayerId) return false;
  if (activeBankedAssetCopies(game, controller, PROTRACTED_SIEGE) < 1) return false;
  game.pendingNeutralChoice = {
    kind: 'protracted_siege_capture',
    playerId: controller,
    capturingPlayerId,
    spaceId: space.id,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = controller;
  return true;
}

function matchingOverlayIndices(
  space: BoardSpaceState,
  owner: PlayerID,
  occupier: PlayerID,
): number[] {
  const indices: number[] = [];
  for (const [index, overlay] of (space.overlays ?? []).entries()) {
    if (overlay.cardId === PROTRACTED_SIEGE
      && overlay.owner === owner
      && overlay.captureDelayOccupier === occupier) indices.push(index);
  }
  return indices;
}

/** Completes an Asset placement after Counterworks has resolved, if necessary. */
export function continueProtractedSiegeCaptureResolution(
  game: GameState,
): ProtractedSiegeCaptureResume | undefined {
  const pending = game.neutralProtractedSiegeCaptureResolution;
  if (!pending) return undefined;
  if (game.neutralCounterworksOverlayQueue?.some((request) => request.id === pending.requestId)) return undefined;
  if (game.pendingNeutralChoice?.kind === 'counterworks_asset') return undefined;

  const space = game.board.spaces.find((candidate) => candidate.id === pending.spaceId);
  const indices = space
    ? matchingOverlayIndices(space, pending.sourceOwner, pending.capturingPlayerId)
    : [];
  const placed = indices.length > pending.overlayCountBefore;
  game.neutralProtractedSiegeCaptureResolution = undefined;

  if (!placed || !space) {
    return { capturingPlayerId: pending.capturingPlayerId };
  }

  // The Asset copy was placed during the Capture step, so it has now delayed
  // that step and immediately goes to its owner's Graveyard.
  removeOverlayAt(
    game,
    space,
    indices.at(-1)!,
    'neutral_protracted_siege_asset_delayed_capture',
    `${game.players[pending.sourceOwner].name} used Protracted Siege to delay the capture of ${space.territoryId ?? space.id}.`,
  );
  return undefined;
}

export function resolveProtractedSiegeChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): ProtractedSiegeCaptureResume | undefined {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'protracted_siege_capture' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Protracted Siege choice.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to use Protracted Siege.');
  }

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  if (action.choice === 'pass') {
    appendPublicLog(
      game,
      action.playerId,
      'neutral_protracted_siege_asset_passed',
      `${game.players[action.playerId].name} did not use Protracted Siege.`,
      { spaceId: pending.spaceId, capturingPlayerId: pending.capturingPlayerId },
    );
    return {
      capturingPlayerId: pending.capturingPlayerId,
      skipAssetWindowSpaceId: pending.spaceId,
    };
  }

  const player = game.players[action.playerId];
  const space = game.board.spaces.find((candidate) => candidate.id === pending.spaceId);
  if (!space || space.kind !== 'territory') throw new GameActionError('The besieged Territory is no longer available.');
  if (activeBankedAssetCopies(game, action.playerId, PROTRACTED_SIEGE) < 1
    || !player.zones.assetBank.includes(PROTRACTED_SIEGE)) {
    throw new GameActionError('Protracted Siege is no longer an active banked Asset.');
  }

  const requestId = `${game.id}-protracted-siege-capture-${game.turn}-${pending.spaceId}`;
  game.neutralProtractedSiegeCaptureResolution = {
    capturingPlayerId: pending.capturingPlayerId,
    spaceId: pending.spaceId,
    sourceOwner: action.playerId,
    requestId,
    overlayCountBefore: matchingOverlayIndices(space, action.playerId, pending.capturingPlayerId).length,
  };
  queueCounterworksOverlayPlacement(game, {
    id: requestId,
    kind: 'protracted_siege_asset',
    playerId: action.playerId,
    cardId: PROTRACTED_SIEGE,
    spaceId: pending.spaceId,
    source: { zone: 'asset_bank' },
    captureOccupierId: pending.capturingPlayerId,
  });
  processCounterworksOverlayQueue(game);
  return continueProtractedSiegeCaptureResolution(game);
}

/** Removes all matching Battle copies whose delay is overridden by Assimilation. */
export function removeProtractedSiegeOverlaysOverriddenByAssimilation(
  game: GameState,
  space: BoardSpaceState,
  capturingPlayerId: PlayerID,
): number {
  const removeIndices: number[] = [];
  for (const [index, overlay] of (space.overlays ?? []).entries()) {
    if (overlay.cardId !== PROTRACTED_SIEGE || overlay.owner === capturingPlayerId) continue;
    if (overlay.captureDelayOccupier && overlay.captureDelayOccupier !== capturingPlayerId) continue;
    removeIndices.push(index);
  }
  for (const index of removeIndices.reverse()) {
    const overlay = space.overlays?.[index];
    if (!overlay) continue;
    removeOverlayAt(
      game,
      space,
      index,
      'neutral_protracted_siege_overridden',
      `${game.players[capturingPlayerId].name}'s Assimilation overrode ${overlay.cardId} on ${space.territoryId ?? space.id}.`,
    );
  }
  return removeIndices.length;
}

/** Printed removal conditions remain active even while the Overlay is dormant. */
export function removeAbandonedProtractedSiegeOverlays(game: GameState): number {
  let removed = 0;
  for (const space of game.board.spaces) {
    if (!space.overlays?.length) continue;
    const removeIndices: number[] = [];
    for (const [index, overlay] of space.overlays.entries()) {
      if (overlay.cardId !== PROTRACTED_SIEGE || !overlay.captureDelayOccupier) continue;
      if (space.occupant !== overlay.captureDelayOccupier) removeIndices.push(index);
    }
    for (const index of removeIndices.reverse()) {
      const overlay = space.overlays?.[index];
      if (!overlay) continue;
      removeOverlayAt(
        game,
        space,
        index,
        'neutral_protracted_siege_occupier_left',
        `${overlay.cardId} entered its owner's Graveyard after the occupier left ${space.territoryId ?? space.id}.`,
      );
      removed += 1;
    }
  }
  return removed;
}
