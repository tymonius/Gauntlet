import type { PlayerId } from './rules';

export const V063_QUICKSAND_ID = 'territory-quicksand' as const;
export const V063_DIFFICULT_TERRAIN_ID = 'territory-difficult-terrain' as const;
export const V063_DISRUPTED_SUPPLY_LINES_ID = 'territory-disrupted-supply-lines' as const;
export const V063_RUINED_STOREHOUSE_ID = 'territory-ruined-storehouse' as const;
export const V063_SUPPLY_DEPOT_ID = 'territory-supply-depot' as const;
export const V063_REFUGE_ID = 'territory-refuge' as const;
export const V063_COMMAND_TENT_ID = 'territory-command-tent' as const;
export const V063_MONASTERY_ID = 'territory-monastery' as const;
export const V063_KINGS_ROAD_ID = 'territory-king-s-road' as const;
export const V063_TOLL_BRIDGE_ID = 'territory-toll-bridge' as const;
export const V063_SMUGGLERS_RUN_ID = 'territory-smuggler-s-pass' as const;

export interface V063QuicksandMovementRule {
  maxVoluntaryPositions: number | null;
  voluntaryFallBackAllowed: boolean;
  forcedDisplacementAffected: false;
}

/** Published v0.6.3 Quicksand applies only if Movement begins there. */
export function v063QuicksandMovementRule(beginsMovementHere: boolean): V063QuicksandMovementRule {
  return beginsMovementHere
    ? { maxVoluntaryPositions: 1, voluntaryFallBackAllowed: false, forcedDisplacementAffected: false }
    : { maxVoluntaryPositions: null, voluntaryFallBackAllowed: true, forcedDisplacementAffected: false };
}

export interface V063DifficultTerrainTurnState {
  movementEndsOnEntry: boolean;
  denouementCardActionBlocked: boolean;
}

export function v063DifficultTerrainTurnState(input: {
  beginsTurnHere: boolean;
  entersDuringTurn: boolean;
}): V063DifficultTerrainTurnState {
  return {
    movementEndsOnEntry: input.entersDuringTurn,
    denouementCardActionBlocked: input.beginsTurnHere || input.entersDuringTurn,
  };
}

/**
 * v0.6.3 uses "occupies" here. The caller supplies that rules state rather than
 * this helper broadening or repairing the published Territory text.
 */
export function v063DisruptedSupplyLinesActiveAssets(
  assetInstanceIds: readonly string[],
  occupies: boolean,
  chosenActiveInstanceId?: string,
): string[] {
  if (!occupies || assetInstanceIds.length <= 1) return [...assetInstanceIds];
  if (!chosenActiveInstanceId || !assetInstanceIds.includes(chosenActiveInstanceId)) {
    throw new Error('Disrupted Supply Lines requires the occupying player to choose one active Asset.');
  }
  return [chosenActiveInstanceId];
}

export interface V063RuinedStorehouseZones {
  drawPile: string[];
  discardPile: string[];
}

export interface V063RuinedStorehouseDrawResult extends V063RuinedStorehouseZones {
  card: string;
  source: 'discard_top';
}

/**
 * Resolve the optional replacement draw. The normal Draw-Pile draw remains the
 * shared draw procedure; this helper is used only when the player chooses the
 * Ruined Storehouse replacement.
 */
export function resolveV063RuinedStorehouseReplacementDraw(
  zones: V063RuinedStorehouseZones,
  occupies: boolean,
): V063RuinedStorehouseDrawResult {
  if (!occupies) throw new Error('Ruined Storehouse replacement draw requires occupying the Territory.');
  if (zones.discardPile.length === 0) throw new Error('Ruined Storehouse has no top Discard Pile card to draw.');
  const discardPile = [...zones.discardPile];
  const card = discardPile.pop()!;
  return {
    drawPile: [...zones.drawPile],
    discardPile,
    card,
    source: 'discard_top',
  };
}

export function v063SupplyDepotNormalDrawCount(occupies: boolean, controls: boolean): 1 | 2 {
  return occupies && controls ? 2 : 1;
}

export function v063RefugeCardBonus(input: {
  arrivedOnRefuge: boolean;
  movementKind: 'advance' | 'fall_back' | 'retreat' | 'other';
  voluntary: boolean;
}): 0 | 1 {
  return input.arrivedOnRefuge && input.movementKind === 'fall_back' && input.voluntary ? 1 : 0;
}

export interface V063CommandTentActionPlan {
  totalActions: 1 | 2;
  openingActionLimit: 1;
  denouementActionLimit: 1;
  bothActionsRestrictedToCardActionEffects: boolean;
}

export function v063CommandTentActionPlan(input: {
  beginsTurnOccupyingAndControlling: boolean;
  invokeTerritoryEffect: boolean;
}): V063CommandTentActionPlan {
  if (input.invokeTerritoryEffect && !input.beginsTurnOccupyingAndControlling) {
    throw new Error('Command Tent can be invoked only by a player who began the turn occupying and controlling it.');
  }
  if (input.beginsTurnOccupyingAndControlling && input.invokeTerritoryEffect) {
    return {
      totalActions: 2,
      openingActionLimit: 1,
      denouementActionLimit: 1,
      bothActionsRestrictedToCardActionEffects: true,
    };
  }
  return {
    totalActions: 1,
    openingActionLimit: 1,
    denouementActionLimit: 1,
    bothActionsRestrictedToCardActionEffects: false,
  };
}

export function v063MonasteryAllowsGraveyardExit(controllerOccupies: boolean): boolean {
  return !controllerOccupies;
}

export function v063MonasterySuppressesArcaneEffect(input: {
  battleHere: boolean;
  cardHasArcaneTrait: boolean;
}): boolean {
  return input.battleHere && input.cardHasArcaneTrait;
}

export function v063KingsRoadAdditionalMovement(beginsTurnHere: boolean): 0 | 1 {
  return beginsTurnHere ? 1 : 0;
}

export interface V063TollBridgeAdvanceResult {
  canAdvance: boolean;
  hand: string[];
  discardPile: string[];
  paidCard: string | null;
}

export function resolveV063TollBridgeAdvanceCost(input: {
  voluntaryAdvance: boolean;
  hand: readonly string[];
  discardPile: readonly string[];
  discardIndex?: number;
}): V063TollBridgeAdvanceResult {
  if (!input.voluntaryAdvance) {
    return {
      canAdvance: true,
      hand: [...input.hand],
      discardPile: [...input.discardPile],
      paidCard: null,
    };
  }
  if (input.hand.length === 0) {
    return { canAdvance: false, hand: [], discardPile: [...input.discardPile], paidCard: null };
  }
  if (!Number.isInteger(input.discardIndex) || input.discardIndex! < 0 || input.discardIndex! >= input.hand.length) {
    throw new Error('Toll Bridge voluntary Advance requires choosing one Hand card to discard.');
  }
  const hand = [...input.hand];
  const [paidCard] = hand.splice(input.discardIndex!, 1);
  return {
    canAdvance: true,
    hand,
    discardPile: [...input.discardPile, paidCard],
    paidCard,
  };
}

export interface V063CardInstance {
  instanceId: string;
  cardId: string;
}

export interface V063SmugglersRunStash {
  owner: PlayerId;
  card: V063CardInstance;
}

export interface V063SmugglersRunState {
  stash: V063SmugglersRunStash | null;
}

export interface V063SmugglersRunStashResult {
  state: V063SmugglersRunState;
  hand: V063CardInstance[];
}

export function stashV063SmugglersRunCard(input: {
  phase: 'opening' | 'denouement' | 'other';
  player: PlayerId;
  occupies: boolean;
  controls: boolean;
  hand: readonly V063CardInstance[];
  handIndex: number;
  state: V063SmugglersRunState;
}): V063SmugglersRunStashResult {
  if (input.phase !== 'opening' && input.phase !== 'denouement') {
    throw new Error("Smuggler's Run stash Action is legal only during Opening or Denouement.");
  }
  if (!input.occupies || !input.controls) {
    throw new Error("Smuggler's Run stash Action requires occupying and controlling the Territory.");
  }
  if (input.state.stash) throw new Error("Only one card may be stashed beneath Smuggler's Run.");
  if (!Number.isInteger(input.handIndex) || input.handIndex < 0 || input.handIndex >= input.hand.length) {
    throw new Error("Smuggler's Run must choose a physical card in Hand.");
  }
  const hand = [...input.hand];
  const [card] = hand.splice(input.handIndex, 1);
  return {
    hand,
    state: { stash: { owner: input.player, card } },
  };
}

export interface V063SmugglersRunUseResult {
  state: V063SmugglersRunState;
  card: V063CardInstance;
  use: 'action' | 'gambit';
  countsAsFromHand: true;
}

export function useV063SmugglersRunStash(input: {
  player: PlayerId;
  occupies: boolean;
  controls: boolean;
  state: V063SmugglersRunState;
  use: 'action' | 'gambit';
  eligible: boolean;
}): V063SmugglersRunUseResult {
  const stash = input.state.stash;
  if (!stash || stash.owner !== input.player) throw new Error("This player has no card stashed beneath Smuggler's Run.");
  if (!input.occupies || !input.controls) {
    throw new Error("The stashing player must occupy and control Smuggler's Run to use the stashed card.");
  }
  if (!input.eligible) throw new Error("The stashed card is not eligible for the requested Smuggler's Run use.");
  return {
    state: { stash: null },
    card: stash.card,
    use: input.use,
    countsAsFromHand: true,
  };
}

export interface V063SmugglersRunReturnResult {
  state: V063SmugglersRunState;
  hand: V063CardInstance[];
  returned: V063CardInstance | null;
}

export function resolveV063SmugglersRunStartTurn(input: {
  player: PlayerId;
  controls: boolean;
  returnToHand: boolean;
  hand: readonly V063CardInstance[];
  state: V063SmugglersRunState;
}): V063SmugglersRunReturnResult {
  const stash = input.state.stash;
  if (!stash || stash.owner !== input.player || !input.controls || !input.returnToHand) {
    return { state: input.state, hand: [...input.hand], returned: null };
  }
  return {
    state: { stash: null },
    hand: [...input.hand, stash.card],
    returned: stash.card,
  };
}

export interface V063SmugglersRunControlLossResult {
  state: V063SmugglersRunState;
  discarded: V063SmugglersRunStash | null;
}

export function resolveV063SmugglersRunControlLoss(
  state: V063SmugglersRunState,
): V063SmugglersRunControlLossResult {
  return {
    state: { stash: null },
    discarded: state.stash,
  };
}
