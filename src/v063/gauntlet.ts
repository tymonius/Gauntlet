import type { FrontLineState, PlayerId } from './rules';

export interface V063GauntletTerritory {
  instanceId: string;
  cardId: string;
  name: string;
  blank: boolean;
  hasDeed: true;
  deedOwner: PlayerId | null;
}

export interface V063GauntletState {
  territories: V063GauntletTerritory[];
  frontLine: FrontLineState;
}

export interface V063TerritoryInsertionResult {
  state: V063GauntletState;
  insertedIndex: number;
  playerTokenMovementOccurred: false;
  enteredTerritory: false;
}

export function createV063GauntletState(
  territories: readonly Pick<V063GauntletTerritory, 'instanceId' | 'cardId' | 'name'>[],
  frontLine: FrontLineState,
  deedOwners: Readonly<Record<string, PlayerId | null>> = {},
): V063GauntletState {
  if (territories.length !== frontLine.territoryCount) {
    throw new Error('Ordered Gauntlet Territories must match the Front Line territory count.');
  }
  const instanceIds = new Set<string>();
  const normalized = territories.map((territory) => {
    if (instanceIds.has(territory.instanceId)) {
      throw new Error(`Duplicate Territory instance in the Gauntlet: ${territory.instanceId}.`);
    }
    instanceIds.add(territory.instanceId);
    return {
      instanceId: territory.instanceId,
      cardId: territory.cardId,
      name: territory.name,
      blank: false,
      hasDeed: true as const,
      deedOwner: deedOwners[territory.instanceId] ?? null,
    };
  });
  assertFrontLineCompatible(frontLine, normalized.length);
  return {
    territories: normalized,
    frontLine: cloneFrontLine(frontLine),
  };
}

export function v063TerritoryController(
  state: V063GauntletState,
  territoryIndex: number,
): PlayerId | null {
  assertGauntletState(state);
  assertTerritoryIndex(territoryIndex, state.territories.length);
  if (territoryIndex < state.frontLine.control.A) return 'A';
  if (territoryIndex >= state.territories.length - state.frontLine.control.B) return 'B';
  return null;
}

export function v063PlayerIsOccupier(
  state: V063GauntletState,
  player: PlayerId,
  territoryIndex: number,
): boolean {
  const controller = v063TerritoryController(state, territoryIndex);
  return state.frontLine.position[player] === territoryIndex
    && controller !== null
    && controller !== player;
}

export function insertV063ControlledTerritory(
  state: V063GauntletState,
  player: PlayerId,
  insertionIndex: number,
  territory: Pick<V063GauntletTerritory, 'instanceId' | 'cardId' | 'name'> & { blank?: boolean },
): V063TerritoryInsertionResult {
  assertGauntletState(state);
  if (!Number.isInteger(insertionIndex) || insertionIndex < 0 || insertionIndex > state.territories.length) {
    throw new Error('A Territory insertion point must be between existing Gauntlet Positions.');
  }
  if (state.territories.some((existing) => existing.instanceId === territory.instanceId)) {
    throw new Error(`${territory.instanceId} is already in the Gauntlet.`);
  }

  const oldCount = state.territories.length;
  const territories = [...state.territories];
  territories.splice(insertionIndex, 0, {
    instanceId: territory.instanceId,
    cardId: territory.cardId,
    name: territory.name,
    blank: Boolean(territory.blank),
    hasDeed: true,
    deedOwner: null,
  });

  const shiftPosition = (position: number): number => position >= insertionIndex ? position + 1 : position;
  const frontLine: FrontLineState = {
    territoryCount: oldCount + 1,
    control: {
      A: state.frontLine.control.A + (player === 'A' ? 1 : 0),
      B: state.frontLine.control.B + (player === 'B' ? 1 : 0),
    },
    position: {
      A: shiftPosition(state.frontLine.position.A),
      B: shiftPosition(state.frontLine.position.B),
    },
  };
  assertFrontLineCompatible(frontLine, territories.length);

  return {
    state: { territories, frontLine },
    insertedIndex: insertionIndex,
    playerTokenMovementOccurred: false,
    enteredTerritory: false,
  };
}

export function insertV063TerritoryAtPlayerEnd(
  state: V063GauntletState,
  player: PlayerId,
  territory: Pick<V063GauntletTerritory, 'instanceId' | 'cardId' | 'name'> & { blank?: boolean },
): V063TerritoryInsertionResult {
  return insertV063ControlledTerritory(
    state,
    player,
    player === 'A' ? 0 : state.territories.length,
    territory,
  );
}

export function v063FrontLineInsertionIndex(state: V063GauntletState, player: PlayerId): number {
  assertGauntletState(state);
  return player === 'A'
    ? state.frontLine.control.A
    : state.territories.length - state.frontLine.control.B;
}

export function insertV063TerritoryAtFrontLine(
  state: V063GauntletState,
  player: PlayerId,
  territory: Pick<V063GauntletTerritory, 'instanceId' | 'cardId' | 'name'> & { blank?: boolean },
): V063TerritoryInsertionResult {
  return insertV063ControlledTerritory(
    state,
    player,
    v063FrontLineInsertionIndex(state, player),
    territory,
  );
}

export function v063AssetLimit(state: V063GauntletState, player: PlayerId): number {
  assertGauntletState(state);
  return state.frontLine.control[player];
}

export function v063CapitalLimit(
  state: V063GauntletState,
  player: PlayerId,
  treasuryValues: readonly number[],
): number {
  const treasuryValue = treasuryValues.reduce((total, value) => {
    if (!Number.isFinite(value) || value < 0) throw new Error('Treasury card values must be nonnegative numbers.');
    return total + value;
  }, 0);
  return v063AssetLimit(state, player) + treasuryValue;
}

export function v063DeedsOwned(state: V063GauntletState, player: PlayerId): number {
  assertGauntletState(state);
  return state.territories.filter((territory) => territory.deedOwner === player).length;
}

export function v063DeedIncome(state: V063GauntletState, player: PlayerId): number {
  return v063DeedsOwned(state, player);
}

export function v063HasControllingInterest(state: V063GauntletState, player: PlayerId): boolean {
  assertGauntletState(state);
  return state.territories.length > 0
    && state.territories.every((territory) => territory.deedOwner === player);
}

export function v063DeedCost(
  state: V063GauntletState,
  buyer: PlayerId,
  territoryInstanceId: string,
): number {
  assertGauntletState(state);
  const territoryIndex = state.territories.findIndex((territory) => territory.instanceId === territoryInstanceId);
  if (territoryIndex < 0) throw new Error(`${territoryInstanceId} is not a Territory in the Gauntlet.`);
  const territory = state.territories[territoryIndex];
  if (territory.deedOwner === buyer) throw new Error('A Financier cannot buy a Deed they already own.');

  const base = Math.min(v063DeedsOwned(state, buyer) + 1, 6);
  const controller = v063TerritoryController(state, territoryIndex);
  const positionModifier = controller === buyer
    ? -1
    : v063PlayerIsOccupier(state, buyer, territoryIndex)
      ? 0
      : 1;
  const buyoutPremium = territory.deedOwner === null
    ? 0
    : Math.min(v063DeedsOwned(state, territory.deedOwner), 6);
  return Math.max(1, base + positionModifier + buyoutPremium);
}

export function setV063DeedOwner(
  state: V063GauntletState,
  territoryInstanceId: string,
  owner: PlayerId | null,
): V063GauntletState {
  assertGauntletState(state);
  const index = state.territories.findIndex((territory) => territory.instanceId === territoryInstanceId);
  if (index < 0) throw new Error(`${territoryInstanceId} is not a Territory in the Gauntlet.`);
  return {
    territories: state.territories.map((territory, territoryIndex) => territoryIndex === index
      ? { ...territory, deedOwner: owner }
      : { ...territory }),
    frontLine: cloneFrontLine(state.frontLine),
  };
}

function assertGauntletState(state: V063GauntletState): void {
  if (state.territories.length !== state.frontLine.territoryCount) {
    throw new Error('Gauntlet Territory ordering and Front Line territory count are out of sync.');
  }
  const instanceIds = new Set(state.territories.map((territory) => territory.instanceId));
  if (instanceIds.size !== state.territories.length) {
    throw new Error('Gauntlet Territory instance ids must be unique.');
  }
  assertFrontLineCompatible(state.frontLine, state.territories.length);
}

function assertFrontLineCompatible(frontLine: FrontLineState, territoryCount: number): void {
  if (frontLine.territoryCount !== territoryCount) {
    throw new Error('Front Line territory count does not match the ordered Gauntlet.');
  }
  if (!Number.isInteger(frontLine.control.A) || !Number.isInteger(frontLine.control.B)
    || frontLine.control.A < 0 || frontLine.control.B < 0
    || frontLine.control.A + frontLine.control.B > territoryCount) {
    throw new Error('Front Line control lengths are invalid for this Gauntlet.');
  }
  for (const player of ['A', 'B'] as const) {
    const position = frontLine.position[player];
    if (!Number.isInteger(position) || position < -1 || position > territoryCount) {
      throw new Error(`${player} has an invalid Position for this Gauntlet.`);
    }
  }
}

function assertTerritoryIndex(index: number, territoryCount: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= territoryCount) {
    throw new Error('Territory index is outside the Gauntlet.');
  }
}

function cloneFrontLine(frontLine: FrontLineState): FrontLineState {
  return {
    territoryCount: frontLine.territoryCount,
    control: { ...frontLine.control },
    position: { ...frontLine.position },
  };
}
