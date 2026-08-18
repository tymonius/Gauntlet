import type { PlayerId } from './rules';
import {
  insertV063TerritoryAtFrontLine,
  insertV063TerritoryAtPlayerEnd,
  type V063GauntletState,
  type V063TerritoryInsertionResult,
} from './gauntlet';

export const V063_MANIFEST_DESTINY_ID = 'neutral-manifest-destiny' as const;
export const V063_MANIFEST_DESTINY_NAME = 'Manifest Destiny' as const;

export function v063ManifestDestinyInstanceId(player: PlayerId): string {
  return `${V063_MANIFEST_DESTINY_ID}:${player}`;
}

export interface V063ManifestDestinyZones {
  hand: string[];
  assetBank: string[];
  graveyard: string[];
}

export interface V063ManifestDestinyActionState {
  gauntlet: V063GauntletState;
  zones: V063ManifestDestinyZones;
}

export interface V063ManifestDestinyResolution {
  gauntlet: V063GauntletState;
  zones?: V063ManifestDestinyZones;
  insertedIndex: number;
  sourceDestination: 'gauntlet';
  playerTokenMovementOccurred: false;
  enteredTerritory: false;
}

/**
 * Resolve Manifest Destiny's Action from Hand. The card itself becomes the new
 * Territory, every other card in Hand goes to the Graveyard, and at least one
 * selected Asset must join them. The combined number of those sacrificed cards
 * must be at least three.
 *
 * Asset indices are used instead of card ids so duplicate Asset titles remain
 * unambiguous in deterministic replays.
 */
export function resolveV063ManifestDestinyAction(
  state: V063ManifestDestinyActionState,
  player: PlayerId,
  selectedAssetIndices: readonly number[],
): V063ManifestDestinyResolution {
  const manifestCopies = state.zones.hand.filter((cardId) => cardId === V063_MANIFEST_DESTINY_ID).length;
  if (manifestCopies !== 1) {
    throw new Error('Manifest Destiny Action requires exactly one Manifest Destiny in Hand.');
  }

  const selected = new Set<number>();
  for (const index of selectedAssetIndices) {
    if (!Number.isInteger(index) || index < 0 || index >= state.zones.assetBank.length) {
      throw new Error('Manifest Destiny selected an Asset outside the Asset Bank.');
    }
    if (selected.has(index)) throw new Error('Manifest Destiny cannot select the same Asset twice.');
    selected.add(index);
  }
  if (selected.size < 1) throw new Error('Manifest Destiny requires at least one Asset.');

  const otherHand = state.zones.hand.filter((cardId) => cardId !== V063_MANIFEST_DESTINY_ID);
  const selectedAssets = state.zones.assetBank.filter((_, index) => selected.has(index));
  if (otherHand.length + selectedAssets.length < 3) {
    throw new Error('Manifest Destiny must put at least three other cards total in the Graveyard.');
  }

  const insertion = insertManifestDestinyAtPlayerEnd(state.gauntlet, player);
  return {
    gauntlet: insertion.state,
    zones: {
      hand: [],
      assetBank: state.zones.assetBank.filter((_, index) => !selected.has(index)),
      graveyard: [...state.zones.graveyard, ...otherHand, ...selectedAssets],
    },
    insertedIndex: insertion.insertedIndex,
    sourceDestination: 'gauntlet',
    playerTokenMovementOccurred: false,
    enteredTerritory: false,
  };
}

export interface V063ManifestDestinyBattleInput {
  role: 'attacker' | 'defender';
  result: 'win' | 'loss' | 'withdrawal';
}

/**
 * Resolve Manifest Destiny's Gambit/Tactic Aftermath mode. Winning as the
 * attacker inserts the physical card at that player's Front Line as a blank,
 * controlled Territory. Its normal battle-card destination is replaced by the
 * Gauntlet.
 */
export function resolveV063ManifestDestinyBattle(
  gauntlet: V063GauntletState,
  player: PlayerId,
  input: V063ManifestDestinyBattleInput,
): V063ManifestDestinyResolution {
  if (input.role !== 'attacker' || input.result !== 'win') {
    throw new Error('Manifest Destiny battle mode requires winning as the attacker.');
  }
  const insertion = insertManifestDestinyAtFrontLine(gauntlet, player);
  return {
    gauntlet: insertion.state,
    insertedIndex: insertion.insertedIndex,
    sourceDestination: 'gauntlet',
    playerTokenMovementOccurred: false,
    enteredTerritory: false,
  };
}

function manifestDestinyTerritory(player: PlayerId): {
  instanceId: string;
  cardId: typeof V063_MANIFEST_DESTINY_ID;
  name: typeof V063_MANIFEST_DESTINY_NAME;
  blank: true;
} {
  return {
    instanceId: v063ManifestDestinyInstanceId(player),
    cardId: V063_MANIFEST_DESTINY_ID,
    name: V063_MANIFEST_DESTINY_NAME,
    blank: true,
  };
}

function insertManifestDestinyAtPlayerEnd(
  gauntlet: V063GauntletState,
  player: PlayerId,
): V063TerritoryInsertionResult {
  return insertV063TerritoryAtPlayerEnd(gauntlet, player, manifestDestinyTerritory(player));
}

function insertManifestDestinyAtFrontLine(
  gauntlet: V063GauntletState,
  player: PlayerId,
): V063TerritoryInsertionResult {
  return insertV063TerritoryAtFrontLine(gauntlet, player, manifestDestinyTerritory(player));
}
