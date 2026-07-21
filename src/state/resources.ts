import type {
  FactionResourceKey,
  FactionResourceMap,
  FactionResourceState,
  GameEvent,
  GameState,
  PlayerID,
  PlayerState,
} from '../types';

export interface ResourceDefinition {
  key: FactionResourceKey;
  label: string;
  initial: number;
  minimum: number;
  maximum?: number;
  limitKind: FactionResourceState['limitKind'];
}

const definitionsByFaction: Readonly<Record<string, readonly ResourceDefinition[]>> = {
  military: [
    { key: 'command', label: 'Command', initial: 0, minimum: 0, maximum: 2, limitKind: 'static' },
  ],
  diplomats: [
    { key: 'influence', label: 'Influence', initial: 1, minimum: 0, maximum: 10, limitKind: 'static' },
  ],
  financiers: [
    { key: 'capital', label: 'Capital', initial: 0, minimum: 0, limitKind: 'dynamic' },
  ],
  intelligence: [
    { key: 'intel', label: 'Intel', initial: 0, minimum: 0, limitKind: 'none' },
    { key: 'operation_progress', label: 'Operation Progress', initial: 0, minimum: 0, limitKind: 'none' },
  ],
  mystics: [],
  inquisition: [
    { key: 'conviction', label: 'Conviction', initial: 0, minimum: 0, maximum: 4, limitKind: 'static' },
  ],
};

export class FactionResourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FactionResourceError';
  }
}

export function resourceDefinitionsForFaction(factionId?: string): readonly ResourceDefinition[] {
  if (!factionId) return [];
  return definitionsByFaction[factionId] ?? [];
}

export function createInitialFactionResources(factionId?: string): FactionResourceMap {
  return Object.fromEntries(resourceDefinitionsForFaction(factionId).map((definition) => [
    definition.key,
    {
      key: definition.key,
      label: definition.label,
      value: definition.initial,
      minimum: definition.minimum,
      maximum: definition.maximum,
      limitKind: definition.limitKind,
    } satisfies FactionResourceState,
  ])) as FactionResourceMap;
}

export function getFactionResource(player: PlayerState, key: FactionResourceKey): FactionResourceState {
  const resource = player.resources[key];
  if (!resource) throw new FactionResourceError(`${player.name} does not track ${key}.`);
  return resource;
}

export function hasFactionResource(player: PlayerState, key: FactionResourceKey, amount = 1): boolean {
  if (!Number.isFinite(amount) || amount < 0) return false;
  return (player.resources[key]?.value ?? 0) >= amount;
}

function normalizedValue(resource: FactionResourceState, requested: number): number {
  const aboveMinimum = Math.max(resource.minimum, requested);
  return resource.maximum === undefined ? aboveMinimum : Math.min(resource.maximum, aboveMinimum);
}

function appendResourceLog(
  game: GameState,
  playerId: PlayerID,
  resource: FactionResourceState,
  previousValue: number,
  reason?: string,
): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor: playerId,
    type: 'faction_resource_changed',
    message: `${game.players[playerId].name}'s ${resource.label} changed from ${previousValue} to ${resource.value}.`,
    payload: {
      playerId,
      resource: resource.key,
      previousValue,
      value: resource.value,
      reason,
    },
    visibility: 'public',
  } satisfies GameEvent);
}

export function setFactionResource(
  game: GameState,
  playerId: PlayerID,
  key: FactionResourceKey,
  value: number,
  reason?: string,
): number {
  if (!Number.isFinite(value)) throw new FactionResourceError('Resource value must be finite.');
  const player = game.players[playerId];
  if (!player) throw new FactionResourceError(`Unknown player: ${playerId}.`);
  const resource = getFactionResource(player, key);
  const previousValue = resource.value;
  resource.value = normalizedValue(resource, value);
  if (resource.value !== previousValue) appendResourceLog(game, playerId, resource, previousValue, reason);
  return resource.value;
}

export function gainFactionResource(
  game: GameState,
  playerId: PlayerID,
  key: FactionResourceKey,
  amount = 1,
  reason?: string,
): number {
  if (!Number.isFinite(amount) || amount < 0) throw new FactionResourceError('Resource gain must be non-negative.');
  const player = game.players[playerId];
  if (!player) throw new FactionResourceError(`Unknown player: ${playerId}.`);
  const resource = getFactionResource(player, key);
  return setFactionResource(game, playerId, key, resource.value + amount, reason);
}

export function spendFactionResource(
  game: GameState,
  playerId: PlayerID,
  key: FactionResourceKey,
  amount = 1,
  reason?: string,
): number {
  if (!Number.isFinite(amount) || amount < 0) throw new FactionResourceError('Resource cost must be non-negative.');
  const player = game.players[playerId];
  if (!player) throw new FactionResourceError(`Unknown player: ${playerId}.`);
  const resource = getFactionResource(player, key);
  if (resource.value < amount) {
    throw new FactionResourceError(`${player.name} needs ${amount} ${resource.label} but has ${resource.value}.`);
  }
  return setFactionResource(game, playerId, key, resource.value - amount, reason);
}
