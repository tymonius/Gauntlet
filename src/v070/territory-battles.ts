import {
  retreatV070Position,
  type PlayerId,
} from './rules';
import type { V070TerritoryCardInstance } from './territories';

export const V070_POISONOUS_GAS_ID = 'territory-poisonous-gas' as const;
export const V070_GARRISON_ID = 'territory-garrison' as const;
export const V070_FIELD_HOSPITAL_ID = 'territory-field-hospital' as const;
export const V070_EXPOSED_FLANK_ID = 'territory-exposed-flank' as const;
export const V070_HIGH_GROUND_ID = 'territory-high-ground' as const;
export const V070_FORTIFIED_PASS_ID = 'territory-fortified-pass' as const;
export const V070_INSURGENCY_ID = 'territory-insurgency' as const;
export const V070_WATCHTOWER_ID = 'territory-watchtower' as const;
export const V070_OLD_BATTLEFIELD_ID = 'territory-old-battlefield' as const;
export const V070_TRAINING_GROUNDS_ID = 'territory-training-grounds' as const;
export const V070_ARENA_SPOILS_OF_WAR_ID =
  'territory-arena-spoils-of-war' as const;
export const V070_ARENA_NO_QUARTER_ID =
  'territory-arena-no-quarter' as const;
export const V070_ARENA_SINGLE_COMBAT_ID =
  'territory-arena-single-combat' as const;
export const V070_ARENA_GRAND_MELEE_ID =
  'territory-arena-grand-melee' as const;

export const V070_BATTLE_TERRITORY_IDS = [
  V070_POISONOUS_GAS_ID,
  V070_GARRISON_ID,
  V070_FIELD_HOSPITAL_ID,
  V070_EXPOSED_FLANK_ID,
  V070_HIGH_GROUND_ID,
  V070_FORTIFIED_PASS_ID,
  V070_INSURGENCY_ID,
  V070_WATCHTOWER_ID,
  V070_OLD_BATTLEFIELD_ID,
  V070_TRAINING_GROUNDS_ID,
  V070_ARENA_SPOILS_OF_WAR_ID,
  V070_ARENA_NO_QUARTER_ID,
  V070_ARENA_SINGLE_COMBAT_ID,
  V070_ARENA_GRAND_MELEE_ID,
] as const;

export type V070BattleCommitmentKind = 'gambit' | 'tactic';

/**
 * Poisonous Gas permits Gambits or Tactics, but not both.
 * Unlike the v0.6.3 helper, v0.7.0 does not itself impose a one-card total
 * cap; normal Gambit/Tactic limits remain authoritative within the chosen kind.
 */
export function v070PoisonousGasAllowsCommitment(
  existingCommitments: readonly V070BattleCommitmentKind[],
  requested: V070BattleCommitmentKind,
): boolean {
  return existingCommitments.every(kind => kind === requested);
}

export function v070PoisonousGasTacticDestination(): 'graveyard' {
  return 'graveyard';
}

export interface V070PoisonousGasPenaltyResult {
  graveyardCard: V070TerritoryCardInstance | null;
}

export function resolveV070PoisonousGasNoTacticPenalty(input: {
  choseTactic: boolean;
  reserve: readonly V070TerritoryCardInstance[];
  chosenPenaltyInstanceId?: string;
}): V070PoisonousGasPenaltyResult {
  if (input.choseTactic || input.reserve.length === 0) {
    return { graveyardCard: null };
  }
  if (!input.chosenPenaltyInstanceId) {
    throw new Error(
      'Poisonous Gas requires one Reserve card for the no-Tactic penalty.',
    );
  }
  const card = input.reserve.find(
    candidate => candidate.instanceId === input.chosenPenaltyInstanceId,
  );
  if (!card) {
    throw new Error(
      'Poisonous Gas penalty card must come from that player’s Reserve.',
    );
  }
  return { graveyardCard: card };
}

export function v070GarrisonInitialReserveBonus(
  controllerDefends: boolean,
): 0 | 1 {
  return controllerDefends ? 1 : 0;
}

export interface V070BattleClearCandidate {
  card: V070TerritoryCardInstance;
  owner: PlayerId;
  destination: 'discard' | 'graveyard' | 'hand' | 'other';
}

export interface V070FieldHospitalResult {
  savedCard: V070TerritoryCardInstance | null;
  destination: 'discard' | null;
}

export function resolveV070FieldHospitalSave(input: {
  territoryController: PlayerId;
  candidates: readonly V070BattleClearCandidate[];
  chosenInstanceId?: string;
}): V070FieldHospitalResult {
  if (!input.chosenInstanceId) {
    return { savedCard: null, destination: null };
  }
  const candidate = input.candidates.find(
    ({ card }) => card.instanceId === input.chosenInstanceId,
  );
  if (!candidate
    || candidate.owner !== input.territoryController
    || candidate.destination !== 'graveyard') {
    throw new Error(
      'Field Hospital may save one battle card of its controller that would enter their Graveyard.',
    );
  }
  return {
    savedCard: candidate.card,
    destination: 'discard',
  };
}

export function v070ExposedFlankOccupierCanSetGambit(
  controllerCounterattacksHere: boolean,
): boolean {
  return !controllerCounterattacksHere;
}

export function v070HighGroundDefenderHasAdvantage(
  battleHere: boolean,
): boolean {
  return battleHere;
}

export function v070FortifiedPassAttackerAssetsActive(
  controllerDefends: boolean,
): boolean {
  return !controllerDefends;
}

export function v070InsurgencyPlayerAssetsActive(
  playerIsInOccupationHere: boolean,
): boolean {
  return !playerIsInOccupationHere;
}

export interface V070WatchtowerGambitPlan {
  order: readonly ['attacker', 'defender'];
  attackerSetsFaceUp: true;
  defenderSetsNormally: true;
}

export function v070WatchtowerGambitPlan(
  controllerDefends: boolean,
): V070WatchtowerGambitPlan | null {
  if (!controllerDefends) return null;
  return {
    order: ['attacker', 'defender'],
    attackerSetsFaceUp: true,
    defenderSetsNormally: true,
  };
}

export interface V070ReserveAftermathOverride {
  card: V070TerritoryCardInstance | null;
  destination: 'graveyard' | 'hand' | null;
}

export function resolveV070OldBattlefieldReserveOverride(input: {
  territoryController: PlayerId;
  player: PlayerId;
  reserve: readonly V070TerritoryCardInstance[];
  chosenInstanceId?: string;
}): V070ReserveAftermathOverride {
  if (input.player !== input.territoryController
    || !input.chosenInstanceId) {
    return {
      card: null,
      destination: null,
    };
  }
  return {
    card: requireReserveCard(
      input.reserve,
      input.chosenInstanceId,
      'Old Battlefield',
    ),
    destination: 'graveyard',
  };
}

export interface V070TrainingGroundsReplacementPlan {
  discardEntireReserve: boolean;
  discarded: readonly V070TerritoryCardInstance[];
  replacementDrawCount: number;
}

export function v070TrainingGroundsReplacementPlan(input: {
  controllerDefends: boolean;
  invoke: boolean;
  reserve: readonly V070TerritoryCardInstance[];
}): V070TrainingGroundsReplacementPlan {
  if (input.invoke && !input.controllerDefends) {
    throw new Error(
      'Training Grounds may be invoked only while its controller defends there.',
    );
  }
  if (!input.invoke) {
    return {
      discardEntireReserve: false,
      discarded: [],
      replacementDrawCount: 0,
    };
  }
  return {
    discardEntireReserve: true,
    discarded: [...input.reserve],
    replacementDrawCount: input.reserve.length,
  };
}

export function v070ArenaDefensiveEdgeApplies(
  battleHere: boolean,
): boolean {
  return !battleHere;
}

export function resolveV070SpoilsOfWarReserveOverride(input: {
  winner: PlayerId;
  player: PlayerId;
  reserve: readonly V070TerritoryCardInstance[];
  chosenInstanceId?: string;
}): V070ReserveAftermathOverride {
  if (input.player !== input.winner || !input.chosenInstanceId) {
    return {
      card: null,
      destination: null,
    };
  }
  return {
    card: requireReserveCard(
      input.reserve,
      input.chosenInstanceId,
      'Spoils of War',
    ),
    destination: 'hand',
  };
}

export function resolveV070NoQuarterAdditionalRetreat(input: {
  loser: PlayerId;
  positionAfterNormalRetreat: number;
  territoryCount: number;
}): number {
  return retreatV070Position(
    input.loser,
    input.positionAfterNormalRetreat,
    input.territoryCount,
  );
}

export function v070SingleCombatAssetsActive(
  battleHere: boolean,
): boolean {
  return !battleHere;
}

export interface V070GrandMeleeBattleBonus {
  additionalInitialReserve: 1;
  additionalTactics: 1;
}

export function v070GrandMeleeBattleBonus(
  battleHere: boolean,
): V070GrandMeleeBattleBonus | null {
  return battleHere
    ? {
        additionalInitialReserve: 1,
        additionalTactics: 1,
      }
    : null;
}

function requireReserveCard(
  reserve: readonly V070TerritoryCardInstance[],
  instanceId: string,
  territoryName: string,
): V070TerritoryCardInstance {
  const card = reserve.find(
    candidate => candidate.instanceId === instanceId,
  );
  if (!card) {
    throw new Error(
      `${territoryName} choice must be a card remaining in that player’s Reserve.`,
    );
  }
  return card;
}
