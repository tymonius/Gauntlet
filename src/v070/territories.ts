import type { PlayerId } from './rules';

export const V070_QUICKSAND_ID = 'territory-quicksand' as const;
export const V070_DIFFICULT_TERRAIN_ID = 'territory-difficult-terrain' as const;
export const V070_DISRUPTED_SUPPLY_LINES_ID = 'territory-disrupted-supply-lines' as const;
export const V070_RUINED_STOREHOUSE_ID = 'territory-ruined-storehouse' as const;
export const V070_SUPPLY_DEPOT_ID = 'territory-supply-depot' as const;
export const V070_REFUGE_ID = 'territory-refuge' as const;
export const V070_COMMAND_TENT_ID = 'territory-command-tent' as const;
export const V070_MONASTERY_ID = 'territory-monastery' as const;
export const V070_KINGS_ROAD_ID = 'territory-king-s-road' as const;
export const V070_TOLL_BRIDGE_ID = 'territory-toll-bridge' as const;
export const V070_SMUGGLERS_PASS_ID = 'territory-smuggler-s-pass' as const;

export const V070_NON_BATTLE_TERRITORY_IDS = [
  V070_QUICKSAND_ID,
  V070_DIFFICULT_TERRAIN_ID,
  V070_DISRUPTED_SUPPLY_LINES_ID,
  V070_RUINED_STOREHOUSE_ID,
  V070_SUPPLY_DEPOT_ID,
  V070_REFUGE_ID,
  V070_COMMAND_TENT_ID,
  V070_MONASTERY_ID,
  V070_KINGS_ROAD_ID,
  V070_TOLL_BRIDGE_ID,
  V070_SMUGGLERS_PASS_ID,
] as const;

export interface V070QuicksandMovementRule {
  maxVoluntaryPositions: number | null;
  movementIncreaseEffectsAllowed: boolean;
  retreatAffected: false;
}

/**
 * v0.7.0 Quicksand caps voluntary Movement at one Position and suppresses
 * effects that would increase Movement only when Movement begins there.
 * Retreat is expressly unaffected.
 */
export function v070QuicksandMovementRule(
  beginsMovementHere: boolean,
): V070QuicksandMovementRule {
  return beginsMovementHere
    ? {
        maxVoluntaryPositions: 1,
        movementIncreaseEffectsAllowed: false,
        retreatAffected: false,
      }
    : {
        maxVoluntaryPositions: null,
        movementIncreaseEffectsAllowed: true,
        retreatAffected: false,
      };
}

export interface V070DifficultTerrainTurnState {
  movementEndsOnEntry: boolean;
  denouementCardActionBlocked: boolean;
}

export function v070DifficultTerrainTurnState(input: {
  beginsTurnHere: boolean;
  entersDuringTurn: boolean;
}): V070DifficultTerrainTurnState {
  return {
    movementEndsOnEntry: input.entersDuringTurn,
    denouementCardActionBlocked:
      input.beginsTurnHere || input.entersDuringTurn,
  };
}

export function v070DisruptedSupplyLinesActiveAssets(
  assetInstanceIds: readonly string[],
  playerIsHere: boolean,
  chosenActiveInstanceId?: string,
): string[] {
  if (!playerIsHere || assetInstanceIds.length <= 1) {
    return [...assetInstanceIds];
  }
  if (!chosenActiveInstanceId
    || !assetInstanceIds.includes(chosenActiveInstanceId)) {
    throw new Error(
      'Disrupted Supply Lines requires the player here to choose one active Asset.',
    );
  }
  return [chosenActiveInstanceId];
}

export interface V070RuinedStorehouseZones {
  drawPile: string[];
  discardPile: string[];
}

export interface V070RuinedStorehouseDrawResult
  extends V070RuinedStorehouseZones {
  card: string;
  source: 'discard_top';
}

export function resolveV070RuinedStorehouseReplacementDraw(
  zones: V070RuinedStorehouseZones,
  playerIsHere: boolean,
): V070RuinedStorehouseDrawResult {
  if (!playerIsHere) {
    throw new Error(
      'Ruined Storehouse replacement draw requires the player to be here.',
    );
  }
  if (zones.discardPile.length === 0) {
    throw new Error(
      'Ruined Storehouse has no top Discard Pile card to draw.',
    );
  }
  const discardPile = [...zones.discardPile];
  const card = discardPile.pop()!;
  return {
    drawPile: [...zones.drawPile],
    discardPile,
    card,
    source: 'discard_top',
  };
}

export function v070SupplyDepotStartTurnCardBonus(
  controllerStartsTurnHere: boolean,
): 0 | 1 {
  return controllerStartsTurnHere ? 1 : 0;
}

export function v070RefugeCardBonus(input: {
  arrivedOnRefuge: boolean;
  movementKind: 'fall_back' | 'withdrawal' | 'retreat' | 'other';
}): 0 | 1 {
  if (!input.arrivedOnRefuge) return 0;
  return input.movementKind === 'fall_back'
      || input.movementKind === 'withdrawal'
    ? 1
    : 0;
}

export interface V070CommandTentActionPlan {
  additionalActions: 1;
  actionsAllowedInOpening: true;
  actionsAllowedInDenouement: true;
  firstActionInOpeningMustBeCardAction: true;
  firstActionInDenouementMustBeCardAction: true;
}

export function v070CommandTentActionPlan(
  controllerStartsTurnHere: boolean,
): V070CommandTentActionPlan | null {
  if (!controllerStartsTurnHere) return null;
  return {
    additionalActions: 1,
    actionsAllowedInOpening: true,
    actionsAllowedInDenouement: true,
    firstActionInOpeningMustBeCardAction: true,
    firstActionInDenouementMustBeCardAction: true,
  };
}

export function v070MonasteryAllowsGraveyardExit(
  controllerIsHere: boolean,
): boolean {
  return !controllerIsHere;
}

export function v070MonasterySuppressesArcaneEffect(input: {
  battleHere: boolean;
  cardHasArcaneTrait: boolean;
}): boolean {
  return input.battleHere && input.cardHasArcaneTrait;
}

export function v070KingsRoadAdditionalMovement(
  startsTurnHere: boolean,
): 0 | 1 {
  return startsTurnHere ? 1 : 0;
}

export interface V070TollBridgeAdvanceResult {
  canAdvance: boolean;
  hand: string[];
  discardPile: string[];
  paidCard: string | null;
}

export function resolveV070TollBridgeAdvanceCost(input: {
  voluntaryAdvance: boolean;
  hand: readonly string[];
  discardPile: readonly string[];
  discardInstanceId?: string;
}): V070TollBridgeAdvanceResult {
  if (!input.voluntaryAdvance) {
    return {
      canAdvance: true,
      hand: [...input.hand],
      discardPile: [...input.discardPile],
      paidCard: null,
    };
  }
  if (input.hand.length === 0) {
    return {
      canAdvance: false,
      hand: [],
      discardPile: [...input.discardPile],
      paidCard: null,
    };
  }
  if (!input.discardInstanceId) {
    throw new Error(
      'Toll Bridge voluntary Advance requires choosing one Hand card to discard.',
    );
  }
  const index = input.hand.indexOf(input.discardInstanceId);
  if (index < 0) {
    throw new Error(
      'Toll Bridge voluntary Advance cost must be a card in Hand.',
    );
  }
  const hand = [...input.hand];
  const [paidCard] = hand.splice(index, 1);
  return {
    canAdvance: true,
    hand,
    discardPile: [...input.discardPile, paidCard],
    paidCard,
  };
}

export interface V070TerritoryCardInstance {
  instanceId: string;
  cardId: string;
}

export interface V070SmugglersPassStash {
  owner: PlayerId;
  card: V070TerritoryCardInstance;
}

export interface V070SmugglersPassState {
  stash: V070SmugglersPassStash | null;
}

export interface V070SmugglersPassStashResult {
  state: V070SmugglersPassState;
  hand: V070TerritoryCardInstance[];
}

export function stashV070SmugglersPassCard(input: {
  phase: 'opening' | 'denouement' | 'other';
  player: PlayerId;
  playerIsHere: boolean;
  controls: boolean;
  hand: readonly V070TerritoryCardInstance[];
  handInstanceId: string;
  state: V070SmugglersPassState;
}): V070SmugglersPassStashResult {
  if (input.phase !== 'opening' && input.phase !== 'denouement') {
    throw new Error(
      "Smuggler's Pass stash Action is legal only during Opening or Denouement.",
    );
  }
  if (!input.playerIsHere || !input.controls) {
    throw new Error(
      "Smuggler's Pass stash Action requires being here and controlling the Territory.",
    );
  }
  if (input.state.stash) {
    throw new Error(
      "Only one card may be stashed beneath Smuggler's Pass.",
    );
  }

  const index = input.hand.findIndex(
    card => card.instanceId === input.handInstanceId,
  );
  if (index < 0) {
    throw new Error(
      "Smuggler's Pass must choose a physical card in Hand.",
    );
  }
  const hand = [...input.hand];
  const [card] = hand.splice(index, 1);
  return {
    hand,
    state: {
      stash: {
        owner: input.player,
        card,
      },
    },
  };
}

export interface V070SmugglersPassUseResult {
  state: V070SmugglersPassState;
  card: V070TerritoryCardInstance;
  use: 'action' | 'gambit';
  countsAsFromHand: true;
}

export function useV070SmugglersPassStash(input: {
  player: PlayerId;
  playerIsHere: boolean;
  controls: boolean;
  state: V070SmugglersPassState;
  use: 'action' | 'gambit';
  eligible: boolean;
}): V070SmugglersPassUseResult {
  const stash = input.state.stash;
  if (!stash || stash.owner !== input.player) {
    throw new Error(
      "This player has no card stashed beneath Smuggler's Pass.",
    );
  }
  if (!input.playerIsHere || !input.controls) {
    throw new Error(
      "The stashing player must be here and control Smuggler's Pass to use the stashed card.",
    );
  }
  if (!input.eligible) {
    throw new Error(
      "The stashed card is not eligible for the requested Smuggler's Pass use.",
    );
  }
  return {
    state: { stash: null },
    card: stash.card,
    use: input.use,
    countsAsFromHand: true,
  };
}

export interface V070SmugglersPassReturnResult {
  state: V070SmugglersPassState;
  hand: V070TerritoryCardInstance[];
  returned: V070TerritoryCardInstance | null;
}

export function resolveV070SmugglersPassStartTurn(input: {
  player: PlayerId;
  controls: boolean;
  returnToHand: boolean;
  hand: readonly V070TerritoryCardInstance[];
  state: V070SmugglersPassState;
}): V070SmugglersPassReturnResult {
  const stash = input.state.stash;
  if (!stash
    || stash.owner !== input.player
    || !input.controls
    || !input.returnToHand) {
    return {
      state: input.state,
      hand: [...input.hand],
      returned: null,
    };
  }
  return {
    state: { stash: null },
    hand: [...input.hand, stash.card],
    returned: stash.card,
  };
}

export interface V070SmugglersPassControlLossResult {
  state: V070SmugglersPassState;
  discarded: V070SmugglersPassStash | null;
}

export function resolveV070SmugglersPassControlLoss(
  state: V070SmugglersPassState,
): V070SmugglersPassControlLossResult {
  return {
    state: { stash: null },
    discarded: state.stash,
  };
}
