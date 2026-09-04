import type {
  CardID,
  DecoysAssetExit,
  DecoysAssetQueueEntry,
  DecoysAssetZone,
  DecoysSourceLocation,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { reconcileFaceDownAssets } from './asset-facing';
import { activeBankedAssetCopies } from './banked-assets';
import { DECOYS } from './neutral-decoys-battle';
import { GameActionError } from './reducer';

interface PlayerAssetSnapshot {
  assetBank: CardID[];
  hand: CardID[];
  discard: CardID[];
  graveyard: CardID[];
  removed: CardID[];
  faceDownAssets: CardID[];
  activeDecoys: number;
}

export interface DecoysChoiceResolution {
  decoysFinalized: boolean;
  sourcePlayerId?: PlayerID;
  affectedPlayerId?: PlayerID;
  discardedCardIds: CardID[];
}

export type DecoysAssetSnapshot = Record<PlayerID, PlayerAssetSnapshot>;

const EXIT_DESTINATIONS: Array<Exclude<DecoysAssetZone, 'asset_bank'>> = [
  'hand',
  'discard',
  'graveyard',
  'removed',
];

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

function countCopies(cards: readonly CardID[], cardId: CardID): number {
  return cards.filter((candidate) => candidate === cardId).length;
}

function multisetDifference(after: CardID[], before: CardID[]): CardID[] {
  const remaining = [...before];
  const additions: CardID[] = [];
  for (const cardId of after) {
    const index = remaining.indexOf(cardId);
    if (index >= 0) remaining.splice(index, 1);
    else additions.push(cardId);
  }
  return additions;
}

function missingFrom(after: CardID[], before: CardID[]): CardID[] {
  return multisetDifference(before, after);
}

function snapshotFor(game: GameState, playerId: PlayerID): PlayerAssetSnapshot {
  const player = game.players[playerId];
  const zones = player.zones;
  return {
    assetBank: [...zones.assetBank],
    hand: [...zones.hand],
    discard: [...zones.discard],
    graveyard: [...zones.graveyard],
    removed: [...zones.removed],
    faceDownAssets: [...(player.faceDownAssets ?? [])],
    activeDecoys: activeBankedAssetCopies(game, playerId, DECOYS),
  };
}

export function captureDecoysAssetSnapshot(game: GameState): DecoysAssetSnapshot {
  return Object.fromEntries(
    Object.keys(game.players).map((playerId) => [playerId, snapshotFor(game, playerId)]),
  );
}

function locateAssetExits(
  before: PlayerAssetSnapshot,
  after: PlayerAssetSnapshot,
  entrySeed: string,
): DecoysAssetExit[] {
  const missing = missingFrom(after.assetBank, before.assetBank);
  const additions = Object.fromEntries(
    EXIT_DESTINATIONS.map((zone) => [zone, multisetDifference(after[zone], before[zone])]),
  ) as Record<Exclude<DecoysAssetZone, 'asset_bank'>, CardID[]>;
  const faceDownExits = new Map<CardID, number>();
  for (const cardId of new Set(missing)) {
    faceDownExits.set(cardId, Math.max(
      0,
      countCopies(before.faceDownAssets, cardId) - countCopies(after.faceDownAssets, cardId),
    ));
  }

  return missing.map((cardId, index) => {
    const destination = EXIT_DESTINATIONS.find((zone) => removeOne(additions[zone], cardId));
    const faceDownRemaining = faceDownExits.get(cardId) ?? 0;
    if (faceDownRemaining > 0) faceDownExits.set(cardId, faceDownRemaining - 1);
    return {
      exitId: `${entrySeed}-exit-${index + 1}`,
      cardId,
      destination,
      faceDown: faceDownRemaining > 0,
    };
  });
}

function decoySources(
  exits: DecoysAssetExit[],
  activeDecoys: number,
  entrySeed: string,
): DecoysSourceLocation[] {
  const exitedActiveCopies = exits
    .filter((exit) => exit.cardId === DECOYS && !exit.faceDown && exit.destination)
    .slice(0, activeDecoys);
  const sources: DecoysSourceLocation[] = exitedActiveCopies.map((exit, index) => ({
    sourceId: `${entrySeed}-decoy-exit-${index + 1}`,
    zone: 'asset_bank' as const,
    exitId: exit.exitId,
  }));
  for (let index = sources.length; index < activeDecoys; index += 1) {
    sources.push({
      sourceId: `${entrySeed}-decoy-bank-${index + 1}`,
      zone: 'asset_bank' as const,
    });
  }
  return sources;
}

function validTargets(
  sources: readonly DecoysSourceLocation[],
  targets: readonly DecoysAssetExit[],
): DecoysAssetExit[] {
  return targets.filter((target) => sources.some((source) => source.exitId !== target.exitId));
}

function maximumProtections(
  sources: readonly DecoysSourceLocation[],
  targets: readonly DecoysAssetExit[],
): number {
  let best = 0;
  const usedTargets = new Set<number>();
  function visit(sourceIndex: number, protectedCount: number): void {
    if (sourceIndex >= sources.length) {
      best = Math.max(best, protectedCount);
      return;
    }
    visit(sourceIndex + 1, protectedCount);
    for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
      if (usedTargets.has(targetIndex)) continue;
      if (sources[sourceIndex].exitId === targets[targetIndex].exitId) continue;
      usedTargets.add(targetIndex);
      visit(sourceIndex + 1, protectedCount + 1);
      usedTargets.delete(targetIndex);
    }
  }
  visit(0, 0);
  return best;
}

function zoneCards(game: GameState, playerId: PlayerID, zone: DecoysAssetZone): CardID[] {
  const zones = game.players[playerId].zones;
  return zone === 'asset_bank' ? zones.assetBank : zones[zone];
}

function restoreDeferredExits(
  game: GameState,
  playerId: PlayerID,
  exits: DecoysAssetExit[],
): void {
  const player = game.players[playerId];
  reconcileFaceDownAssets(player);
  for (const exit of exits) {
    if (!exit.destination) continue;
    const destination = zoneCards(game, playerId, exit.destination);
    if (!removeOne(destination, exit.cardId)) {
      throw new GameActionError(`${exit.cardId} could not be deferred for Decoys.`);
    }
    player.zones.assetBank.push(exit.cardId);
    if (exit.faceDown) {
      player.faceDownAssets = [...(player.faceDownAssets ?? []), exit.cardId];
    }
  }
  reconcileFaceDownAssets(player);
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

export function registerDecoysAssetExits(
  game: GameState,
  before: DecoysAssetSnapshot,
  sourcePlayerId: PlayerID | undefined,
): number {
  if (!sourcePlayerId) return 0;
  const queue = game.neutralDecoysAssetQueue ?? [];
  let registered = 0;

  for (const player of Object.values(game.players)) {
    if (player.id === sourcePlayerId) continue;
    const prior = before[player.id];
    if (!prior || prior.activeDecoys < 1) continue;
    const entrySeed = `${game.id}-decoys-${game.turn}-${queue.length + 1}`;
    const after = snapshotFor(game, player.id);
    const exits = locateAssetExits(prior, after, entrySeed)
      .filter((exit) => Boolean(exit.destination));
    if (exits.length < 1) continue;
    const sources = decoySources(exits, prior.activeDecoys, entrySeed);
    const triggersRemaining = maximumProtections(sources, exits);
    if (triggersRemaining < 1) continue;

    restoreDeferredExits(game, player.id, exits);
    queue.push({
      id: entrySeed,
      playerId: player.id,
      sourcePlayerId,
      affectedAssets: exits.map((exit) => ({ ...exit })),
      deferredExits: exits.map((exit) => ({ ...exit })),
      decoySources: sources,
      triggersRemaining,
    });
    registered += 1;
  }

  game.neutralDecoysAssetQueue = queue.length > 0 ? queue : undefined;
  return registered;
}

function entryProtectionCapacity(game: GameState, entry: DecoysAssetQueueEntry): number {
  const activeSources = activeBankedAssetCopies(game, entry.playerId, DECOYS);
  if (entry.decoySources.length > activeSources) {
    entry.decoySources = entry.decoySources.slice(0, activeSources);
  }
  const deferredIds = new Set(entry.deferredExits.map((exit) => exit.exitId));
  entry.affectedAssets = entry.affectedAssets.filter((exit) => deferredIds.has(exit.exitId));
  return maximumProtections(entry.decoySources, entry.affectedAssets);
}

function finalizeEntry(game: GameState, entry: DecoysAssetQueueEntry): CardID[] {
  const player = game.players[entry.playerId];
  const discardedCardIds: CardID[] = [];
  for (const exit of entry.deferredExits) {
    if (!exit.destination) continue;
    if (!removeOne(player.zones.assetBank, exit.cardId)) {
      throw new GameActionError(`${exit.cardId} could not complete its deferred Decoys exit.`);
    }
    if (exit.faceDown && player.faceDownAssets) removeOne(player.faceDownAssets, exit.cardId);
    zoneCards(game, entry.playerId, exit.destination).push(exit.cardId);
    if (exit.destination === 'discard') discardedCardIds.push(exit.cardId);
  }
  reconcileFaceDownAssets(player);
  game.neutralDecoysAssetQueue = game.neutralDecoysAssetQueue?.filter(
    (candidate) => candidate.id !== entry.id,
  );
  if (game.neutralDecoysAssetQueue?.length === 0) game.neutralDecoysAssetQueue = undefined;
  return discardedCardIds;
}

export function openNextDecoysChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  const entry = game.neutralDecoysAssetQueue?.[0];
  if (!entry) return false;
  const capacity = entryProtectionCapacity(game, entry);
  entry.triggersRemaining = Math.min(entry.triggersRemaining, capacity);
  if (entry.triggersRemaining < 1) return false;
  const assetOptions = validTargets(entry.decoySources, entry.affectedAssets);
  if (assetOptions.length < 1) return false;

  game.pendingNeutralChoice = {
    kind: 'decoys_asset',
    playerId: entry.playerId,
    sourcePlayerId: entry.sourcePlayerId,
    entryId: entry.id,
    assetOptions: assetOptions.map((asset) => ({ ...asset })),
    triggersRemaining: entry.triggersRemaining,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = entry.playerId;
  return true;
}

function removeDeferredExit(entry: DecoysAssetQueueEntry, exitId: string): void {
  entry.deferredExits = entry.deferredExits.filter((exit) => exit.exitId !== exitId);
  entry.affectedAssets = entry.affectedAssets.filter((exit) => exit.exitId !== exitId);
}

export function resolveDecoysChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): DecoysChoiceResolution {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'decoys_asset' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Decoys choice.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to use Decoys.');
  }
  const entry = game.neutralDecoysAssetQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!entry) throw new GameActionError('The Decoys replacement event is no longer pending.');

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  entry.triggersRemaining -= 1;

  if (action.choice === 'pass') {
    entry.decoySources.shift();
    appendPublicLog(
      game,
      action.playerId,
      'neutral_decoys_asset_passed',
      `${game.players[action.playerId].name} declined one Decoys replacement.`,
      { sourcePlayerId: pending.sourcePlayerId },
    );
  } else {
    const target = entry.affectedAssets.find((asset) => asset.exitId === action.targetKey);
    if (!target || !pending.assetOptions.some((asset) => asset.exitId === target.exitId)) {
      throw new GameActionError('Choose one affected Asset for Decoys to preserve.');
    }
    const source = entry.decoySources.find((candidate) => candidate.exitId !== target.exitId);
    if (!source) throw new GameActionError('No distinct active Decoys copy can protect that Asset.');
    const player = game.players[entry.playerId];
    if (activeBankedAssetCopies(game, entry.playerId, DECOYS) < 1
      || !removeOne(player.zones.assetBank, DECOYS)) {
      throw new GameActionError('No physical active Decoys copy remains available.');
    }
    reconcileFaceDownAssets(player);
    player.zones.discard.push(DECOYS);
    entry.decoySources = entry.decoySources.filter((candidate) => candidate.sourceId !== source.sourceId);
    if (source.exitId) removeDeferredExit(entry, source.exitId);
    removeDeferredExit(entry, target.exitId);
    appendPublicLog(
      game,
      action.playerId,
      'neutral_decoys_asset_used',
      `${player.name} discarded Decoys so ${target.cardId} remained in play.`,
      {
        sourcePlayerId: pending.sourcePlayerId,
        protectedCardId: target.cardId,
        originalDestination: target.destination,
      },
    );
  }

  const remainingCapacity = entryProtectionCapacity(game, entry);
  entry.triggersRemaining = Math.min(entry.triggersRemaining, remainingCapacity);
  if (entry.triggersRemaining > 0 && openNextDecoysChoice(game)) {
    return { decoysFinalized: false, discardedCardIds: [] };
  }

  const discardedCardIds = finalizeEntry(game, entry);
  openNextDecoysChoice(game);
  return {
    decoysFinalized: true,
    sourcePlayerId: entry.sourcePlayerId,
    affectedPlayerId: entry.playerId,
    discardedCardIds,
  };
}
