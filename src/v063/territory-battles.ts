import type { PlayerId, V063BattleState } from './rules';
import { retreatV063Position } from './rules';
import type { V063CardInstance } from './territories';

export const V063_POISONOUS_GAS_ID = 'territory-poisonous-gas' as const;
export const V063_GARRISON_ID = 'territory-garrison' as const;
export const V063_FIELD_HOSPITAL_ID = 'territory-field-hospital' as const;
export const V063_EXPOSED_FLANK_ID = 'territory-exposed-flank' as const;
export const V063_HIGH_GROUND_ID = 'territory-high-ground' as const;
export const V063_FORTIFIED_PASS_ID = 'territory-fortified-pass' as const;
export const V063_INSURGENCY_ID = 'territory-insurgency' as const;
export const V063_WATCHTOWER_ID = 'territory-watchtower' as const;
export const V063_OLD_BATTLEFIELD_ID = 'territory-old-battlefield' as const;
export const V063_TRAINING_GROUNDS_ID = 'territory-training-grounds' as const;
export const V063_ARENA_SPOILS_OF_WAR_ID = 'territory-arena-spoils-of-war' as const;
export const V063_ARENA_NO_QUARTER_ID = 'territory-arena-no-quarter' as const;
export const V063_ARENA_SINGLE_COMBAT_ID = 'territory-arena-single-combat' as const;
export const V063_ARENA_GRAND_MELEE_ID = 'territory-arena-grand-melee' as const;

export type V063BattleCommitmentKind = 'gambit' | 'tactic';

/** Poisonous Gas permits at most one total Gambit-or-Tactic commitment per player. */
export function v063PoisonousGasAllowsCommitment(
  existingCommitments: readonly V063BattleCommitmentKind[],
  requested: V063BattleCommitmentKind,
): boolean {
  void requested;
  return existingCommitments.length === 0;
}

export function v063PoisonousGasTacticDestination(): 'graveyard' {
  return 'graveyard';
}

export interface V063PoisonousGasPenaltyResult {
  graveyardCard: V063CardInstance | null;
}

export function resolveV063PoisonousGasNoTacticPenalty(input: {
  choseTactic: boolean;
  initialReserve: readonly V063CardInstance[];
  chosenPenaltyInstanceId?: string;
}): V063PoisonousGasPenaltyResult {
  if (input.choseTactic || input.initialReserve.length === 0) return { graveyardCard: null };
  if (!input.chosenPenaltyInstanceId) {
    throw new Error('Poisonous Gas requires one unchosen initial-Reserve card for the no-Tactic penalty, if able.');
  }
  const card = input.initialReserve.find((candidate) => candidate.instanceId === input.chosenPenaltyInstanceId);
  if (!card) throw new Error('Poisonous Gas penalty card must come from the player’s initial Reserve.');
  return { graveyardCard: card };
}

export function v063GarrisonInitialReserveBonus(controllerDefends: boolean): 0 | 1 {
  return controllerDefends ? 1 : 0;
}

export interface V063BattleClearCandidate {
  card: V063CardInstance;
  controller: PlayerId;
  destination: 'discard' | 'graveyard' | 'hand' | 'other';
}

export interface V063FieldHospitalResult {
  savedCard: V063CardInstance | null;
  destination: 'discard' | null;
}

export function resolveV063FieldHospitalSave(input: {
  territoryController: PlayerId;
  candidates: readonly V063BattleClearCandidate[];
  chosenInstanceId?: string;
}): V063FieldHospitalResult {
  if (!input.chosenInstanceId) return { savedCard: null, destination: null };
  const candidate = input.candidates.find(({ card }) => card.instanceId === input.chosenInstanceId);
  if (!candidate || candidate.controller !== input.territoryController || candidate.destination !== 'graveyard') {
    throw new Error('Field Hospital may save one battle card its Territory controller controlled that would enter their Graveyard.');
  }
  return { savedCard: candidate.card, destination: 'discard' };
}

export function v063ExposedFlankOccupierCanSetGambit(controllerCounterattacksOccupier: boolean): boolean {
  return !controllerCounterattacksOccupier;
}

export function v063HighGroundDefenderHasAdvantage(battleHere: boolean): boolean {
  return battleHere;
}

export function v063FortifiedPassAttackerBankedAssetsActive(controllerDefends: boolean): boolean {
  return !controllerDefends;
}

export function v063InsurgencyOccupierBankedAssetsActive(opponentOccupiesWithoutControlling: boolean): boolean {
  return !opponentOccupiesWithoutControlling;
}

export interface V063WatchtowerGambitPlan {
  order: readonly ['attacker', 'defender'];
  attackerSetsFaceUp: true;
  defenderSetsNormally: true;
  eitherMayPass: true;
}

export function v063WatchtowerGambitPlan(controllerDefends: boolean): V063WatchtowerGambitPlan | null {
  if (!controllerDefends) return null;
  return {
    order: ['attacker', 'defender'],
    attackerSetsFaceUp: true,
    defenderSetsNormally: true,
    eitherMayPass: true,
  };
}

export interface V063ReserveAftermathOverride {
  card: V063CardInstance | null;
  destination: 'graveyard' | 'hand' | null;
}

export function resolveV063OldBattlefieldReserveOverride(input: {
  territoryController: PlayerId;
  player: PlayerId;
  unchosenReserve: readonly V063CardInstance[];
  chosenInstanceId?: string;
}): V063ReserveAftermathOverride {
  if (input.player !== input.territoryController || !input.chosenInstanceId) {
    return { card: null, destination: null };
  }
  return {
    card: requireReserveCard(input.unchosenReserve, input.chosenInstanceId, 'Old Battlefield'),
    destination: 'graveyard',
  };
}

export interface V063TrainingGroundsReplacementPlan {
  discardEntireReserve: boolean;
  discarded: readonly V063CardInstance[];
  replacementDrawCount: number;
}

export function v063TrainingGroundsReplacementPlan(input: {
  controllerDefends: boolean;
  invoke: boolean;
  initialReserve: readonly V063CardInstance[];
}): V063TrainingGroundsReplacementPlan {
  if (input.invoke && !input.controllerDefends) {
    throw new Error('Training Grounds may be invoked only when its controller defends it.');
  }
  if (!input.invoke) {
    return { discardEntireReserve: false, discarded: [], replacementDrawCount: 0 };
  }
  return {
    discardEntireReserve: true,
    discarded: [...input.initialReserve],
    replacementDrawCount: input.initialReserve.length,
  };
}

/** All four v0.6.3 Arenas remove Defensive Edge for battles fought there. */
export function applyV063ArenaDefensiveEdgeRule(battle: V063BattleState): V063BattleState {
  return { ...battle, defensiveEdgeRemoved: true };
}

export function resolveV063SpoilsOfWarReserveOverride(input: {
  winner: PlayerId;
  player: PlayerId;
  unchosenReserve: readonly V063CardInstance[];
  chosenInstanceId?: string;
}): V063ReserveAftermathOverride {
  if (input.player !== input.winner || !input.chosenInstanceId) {
    return { card: null, destination: null };
  }
  return {
    card: requireReserveCard(input.unchosenReserve, input.chosenInstanceId, 'Spoils of War'),
    destination: 'hand',
  };
}

export function resolveV063NoQuarterAdditionalRetreat(input: {
  loser: PlayerId;
  positionAfterNormalRetreat: number;
  territoryCount: number;
}): number {
  return retreatV063Position(input.loser, input.positionAfterNormalRetreat, input.territoryCount);
}

export function v063SingleCombatBankedAssetsActive(): false {
  return false;
}

export interface V063GrandMeleeBattleBonus {
  additionalInitialReserve: 1;
  additionalTactics: 1;
}

export function v063GrandMeleeBattleBonus(): V063GrandMeleeBattleBonus {
  return { additionalInitialReserve: 1, additionalTactics: 1 };
}

function requireReserveCard(
  reserve: readonly V063CardInstance[],
  instanceId: string,
  territoryName: string,
): V063CardInstance {
  const card = reserve.find((candidate) => candidate.instanceId === instanceId);
  if (!card) throw new Error(`${territoryName} choice must be an unchosen card remaining in that player’s Reserve.`);
  return card;
}
