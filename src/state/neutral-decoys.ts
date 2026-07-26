import type {
  CardID,
  DecoysAssetExit,
  DecoysAssetQueueEntry,
  DecoysAssetZone,
  DecoysSourceLocation,
  GameEvent,
  GameState,
  PlayerID,
} from '../types';
import type { ResolveNeutralChoiceAction } from './actions';
import { bankedAssetUseAllowed } from './intelligence-subversion-battle';
import { DECOYS } from './neutral-decoys-battle';
import { GameActionError } from './reducer';

interface PlayerAssetSnapshot {
  assetBank: CardID[];
  hand: CardID[];
  discard: CardID[];
  graveyard: CardID[];
  removed: CardID[];
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
  const zones = game.players[playerId].zones;
  return {
    assetBank: [...zones.assetBank],
    hand: [...zones.hand],
    discard: [...zones.discard],
    graveyard: [...zones.graveyard],
    removed: [...zones.removed],
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

  return missing.map((cardId, index) => {
    const destination = EXIT_DESTINATIONS.find((zone) => removeOne(additions[zone], cardId));
    return {
      exitId: `${entrySeed}-exit-${index + 1}`,
      cardId,
      destination,
    };
  });
}

function decoySources(
  exits: DecoysAssetExit[],
  before: PlayerAssetSnapshot,
  after: PlayerAssetSnapshot,
  entrySeed: string,
): DecoysSourceLocation[] {
  const beforeCount = before.assetBank.filter((cardId) => cardId === DECOYS).length;
  const remainingCount = Math.min(
    beforeCount,
    after.assetBank.filter((cardId) => cardId === DECOYS).length,
  );
  const sources: DecoysSourceLocation[] = Array.from({ length: remainingCount }, (_, index) => ({
    sourceId: `${entrySeed}-decoy-bank-${index + 1}`,
    zone: 'asset_bank' as const,
  }));
  for (const exit of exits.filter((candidate) => candidate.cardId === DECOYS && candidate.destination)) {
    sources.push({
      sourceId: `${entrySeed}-decoy-exit-${sources.length + 1}`,
      zone: exit.destination!,
    });
  }
  return sources;
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
    if (player.id === sourcePlayerId || !bankedAssetUseAllowed(game, player.id)) continue;
    const prior = before[player.id];
    if (!prior || !prior.assetBank.includes(DECOYS)) continue;
    const entrySeed = `${game.id}-decoys-${game.turn}-${queue.length + 1}`;
    const after = snapshotFor(game, player.id);
    const exits = locateAssetExits(prior, after, entrySeed);
    const affectedAssets = exits.filter((exit) => exit.cardId !== DECOYS);
    const sources = decoySources(exits, prior, after, entrySeed);
    const triggersRemaining = Math.min(affectedAssets.length, sources.length);
    if (triggersRemaining < 1) continue;

    queue.push({
      id: entrySeed,
      playerId: player.id,
      sourcePlayerId,
      affectedAssets,
      decoySources: sources,
      triggersRemaining,
    });
    registered += 1;
  }

  game.neutralDecoysAssetQueue = queue.length > 0 ? queue : undefined;
  return registered;
}

function zoneCards(game: GameState, playerId: PlayerID, zone: DecoysAssetZone): CardID[] {
  const zones = game.players[playerId].zones;
  return zone === 'asset_bank' ? zones.assetBank : zones[zone];
}

function availableSources(game: GameState, entry: DecoysAssetQueueEntry): DecoysSourceLocation[] {
  const remainingByZone = new Map<DecoysAssetZone, CardID[]>();
  return entry.decoySources.filter((source) => {
    const cards = remainingByZone.get(source.zone) ?? [...zoneCards(game, entry.playerId, source.zone)];
    remainingByZone.set(source.zone, cards);
    return removeOne(cards, DECOYS);
  });
}

function availableAffectedAssets(game: GameState, entry: DecoysAssetQueueEntry): DecoysAssetExit[] {
  const remainingByZone = new Map<Exclude<DecoysAssetZone, 'asset_bank'>, CardID[]>();
  return entry.affectedAssets.filter((exit) => {
    if (!exit.destination) return true;
    const cards = remainingByZone.get(exit.destination)
      ?? [...zoneCards(game, entry.playerId, exit.destination)];
    remainingByZone.set(exit.destination, cards);
    return removeOne(cards, exit.cardId);
  });
}

function trimQueue(game: GameState): void {
  const retained = (game.neutralDecoysAssetQueue ?? []).filter((entry) => {
    if (!bankedAssetUseAllowed(game, entry.playerId)) return false;
    entry.decoySources = availableSources(game, entry);
    entry.affectedAssets = availableAffectedAssets(game, entry);
    entry.triggersRemaining = Math.min(
      entry.triggersRemaining,
      entry.decoySources.length,
      entry.affectedAssets.length,
    );
    return entry.triggersRemaining > 0;
  });
  game.neutralDecoysAssetQueue = retained.length > 0 ? retained : undefined;
}

export function openNextDecoysChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  trimQueue(game);
  const entry = game.neutralDecoysAssetQueue?.[0];
  if (!entry) return false;
  game.pendingNeutralChoice = {
    kind: 'decoys_asset',
    playerId: entry.playerId,
    sourcePlayerId: entry.sourcePlayerId,
    entryId: entry.id,
    assetOptions: entry.affectedAssets.map((asset) => ({ ...asset })),
    triggersRemaining: entry.triggersRemaining,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = entry.playerId;
  return true;
}

export function resolveDecoysChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
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
    appendPublicLog(
      game,
      action.playerId,
      'neutral_decoys_asset_passed',
      `${game.players[action.playerId].name} declined to replace an affected Asset with Decoys.`,
      { sourcePlayerId: pending.sourcePlayerId },
    );
  } else {
    const target = entry.affectedAssets.find((asset) => asset.exitId === action.targetKey);
    if (!target || !pending.assetOptions.some((asset) => asset.exitId === target.exitId)) {
      throw new GameActionError('Choose one affected Asset for Decoys to preserve.');
    }
    const source = availableSources(game, entry)[0];
    if (!source) throw new GameActionError('No physical Decoys copy remains available.');
    const sourceZone = zoneCards(game, entry.playerId, source.zone);
    if (!removeOne(sourceZone, DECOYS)) {
      throw new GameActionError('The selected Decoys copy is no longer available.');
    }
    const player = game.players[entry.playerId];
    if (target.destination) {
      const destination = zoneCards(game, entry.playerId, target.destination);
      if (!removeOne(destination, target.cardId)) {
        throw new GameActionError(`${target.cardId} is no longer in its destination zone.`);
      }
    }
    player.zones.discard.push(DECOYS);
    player.zones.assetBank.push(target.cardId);
    entry.decoySources = entry.decoySources.filter((candidate) => candidate.sourceId !== source.sourceId);
    entry.affectedAssets = entry.affectedAssets.filter((asset) => asset.exitId !== target.exitId);
    appendPublicLog(
      game,
      action.playerId,
      'neutral_decoys_asset_used',
      `${player.name} discarded Decoys instead of ${target.cardId}.`,
      {
        sourcePlayerId: pending.sourcePlayerId,
        protectedCardId: target.cardId,
        originalDestination: target.destination,
      },
    );
  }

  trimQueue(game);
  openNextDecoysChoice(game);
}
