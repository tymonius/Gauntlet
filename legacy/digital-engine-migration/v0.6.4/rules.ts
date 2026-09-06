import type { MovementChoice, PlayerId, TurnPhase } from '../v062/rules';
import {
  canInitiateLastStand,
  finalTerritoryAtOpponentEnd,
  outsideOwnEnd,
  resolveV063BattleOutcome,
  retreatV063Position,
  victoryFromLastStand,
  type ExtendedPosition,
  type LastStandAccessInput,
  type RunTheGauntletVictory,
  type V063BattleOutcome,
  type V063BattleOutcomeInput,
} from '../v063/rules';

export type { MovementChoice, PlayerId, TurnPhase } from '../v062/rules';
export type {
  ExtendedPosition,
  LastStandAccessInput,
  RunTheGauntletVictory,
  V063BattleOutcome as V064BattleOutcome,
  V063BattleOutcomeInput as V064BattleOutcomeInput,
} from '../v063/rules';

export const V064_TURN_SEQUENCE: readonly TurnPhase[] = [
  'capture',
  'draw',
  'opening',
  'movement',
  'denouement',
  'cleanup',
] as const;

export const V064_BATTLE_SEQUENCE = [
  'onset',
  'set_gambits',
  'form_reserves',
  'reveal_gambits',
  'choose_tactics',
  'reveal_tactics',
  'outcome',
  'aftermath',
] as const;

export type V064BattleSequenceStep = typeof V064_BATTLE_SEQUENCE[number];
export type V064BattleStage = 'onset' | 'active' | 'resolved' | 'ended';
export type V064BattleEndReason = 'withdrawal' | 'terms_accepted' | 'prevented';

export interface V064BattleOnsetInput {
  territoryCount: number;
  attacker: PlayerId;
  defender: PlayerId;
  attackerOrigin: ExtendedPosition;
  contestedPosition: ExtendedPosition;
  positions: Record<PlayerId, ExtendedPosition>;
  defenderControlsContested: boolean;
  lastStand?: boolean;
  defensiveEdgeRemoved?: boolean;
}

export interface V064BattleState extends V064BattleOnsetInput {
  lastStand: boolean;
  defensiveEdgeRemoved: boolean;
  stage: V064BattleStage;
  termsAccepted: boolean | null;
  winner: PlayerId | null;
  loser: PlayerId | null;
  occupier: PlayerId | null;
  positions: Record<PlayerId, ExtendedPosition>;
  endReason: V064BattleEndReason | null;
  completeNonResultAftermath: boolean;
  clearCommittedCards: boolean;
}

export interface V064BattleResolution {
  state: V064BattleState;
  victory: RunTheGauntletVictory | null;
}

/**
 * Onset is the first state in the v0.6.4 battle sequence. There is no separate
 * Pending Battle state. Establish the battle context here, resolve Terms first
 * when applicable, then resolve other pre-Gambit effects. Only a battle that
 * proceeds out of Onset reaches Gambits and counts as a battle that occurred.
 */
export function createV064BattleOnset(input: V064BattleOnsetInput): V064BattleState {
  if (input.attacker === input.defender) throw new Error('Attacker and defender must be different players.');
  assertTerritoryCount(input.territoryCount);
  assertTerritoryIndex(input.attackerOrigin, input.territoryCount, 'attacker origin');
  assertExtendedPosition(input.contestedPosition, input.territoryCount, 'contested Position');
  assertExtendedPosition(input.positions.A, input.territoryCount, 'A Position');
  assertExtendedPosition(input.positions.B, input.territoryCount, 'B Position');

  const lastStand = Boolean(input.lastStand);
  if (lastStand) {
    if (input.contestedPosition !== outsideOwnEnd(input.defender, input.territoryCount)) {
      throw new Error('A Last Stand is fought beyond the defender’s own end of the Gauntlet.');
    }
    if (input.attackerOrigin !== finalTerritoryAtOpponentEnd(input.attacker, input.territoryCount)) {
      throw new Error('A Last Stand attacker must Advance from the Territory at the opponent’s end.');
    }
  } else {
    assertTerritoryIndex(input.contestedPosition, input.territoryCount, 'normal contested Position');
  }

  if (input.positions[input.attacker] !== input.contestedPosition || input.positions[input.defender] !== input.contestedPosition) {
    throw new Error('Onset requires both Player Tokens at the contested Position.');
  }

  return {
    ...input,
    lastStand,
    defensiveEdgeRemoved: Boolean(input.defensiveEdgeRemoved),
    stage: 'onset',
    termsAccepted: null,
    winner: null,
    loser: null,
    occupier: null,
    positions: { ...input.positions },
    endReason: null,
    completeNonResultAftermath: false,
    clearCommittedCards: false,
  };
}

export function createV064LastStandOnset(input: LastStandAccessInput): V064BattleState {
  if (!canInitiateLastStand(input)) {
    throw new Error('Last Stand requires the defender beyond their end and a separate legal Advance beyond that end.');
  }
  const contestedPosition = outsideOwnEnd(input.defender, input.territoryCount);
  return createV064BattleOnset({
    territoryCount: input.territoryCount,
    attacker: input.attacker,
    defender: input.defender,
    attackerOrigin: input.attackerPosition,
    contestedPosition,
    positions: { A: contestedPosition, B: contestedPosition },
    defenderControlsContested: false,
    lastStand: true,
  });
}

export function defenderHasV064DefensiveEdge(battle: V064BattleState): boolean {
  return !battle.defensiveEdgeRemoved && (battle.defenderControlsContested || battle.lastStand);
}

/** Complete Onset and proceed to the Gambit step. */
export function proceedV064ToGambits(battle: V064BattleState): V064BattleState {
  if (battle.stage !== 'onset') throw new Error('A battle can proceed to Gambits only from Onset.');
  return { ...battle, stage: 'active' };
}

/**
 * End the sequence during Onset because Terms were accepted or another effect
 * prevented the battle. This is not a battle fought and has no Aftermath.
 * positions may be supplied after applying the effect that ended the sequence.
 */
export function endV064OnsetWithoutBattle(
  battle: V064BattleState,
  reason: Exclude<V064BattleEndReason, 'withdrawal'>,
  positions: Record<PlayerId, ExtendedPosition> = battle.positions,
): V064BattleState {
  if (battle.stage !== 'onset') throw new Error('Only Onset can end before a battle proceeds.');
  assertExtendedPosition(positions.A, battle.territoryCount, 'A Position');
  assertExtendedPosition(positions.B, battle.territoryCount, 'B Position');
  return {
    ...battle,
    stage: 'ended',
    termsAccepted: reason === 'terms_accepted' ? true : battle.termsAccepted,
    winner: null,
    loser: null,
    occupier: null,
    positions: { ...positions },
    endReason: reason,
    completeNonResultAftermath: false,
    clearCommittedCards: false,
  };
}

export const resolveV064BattleOutcome = resolveV063BattleOutcome as (
  input: V063BattleOutcomeInput,
) => V063BattleOutcome;

export function applyV064BattleOutcome(
  battle: V064BattleState,
  outcome: V063BattleOutcome,
): V064BattleResolution {
  if (battle.stage !== 'active') throw new Error('A battle outcome may be applied only after Onset has proceeded to Gambits.');
  assertOutcomeMatchesBattle(battle, outcome);

  const positions = { ...battle.positions };
  if (outcome.loser === battle.attacker) {
    positions[battle.attacker] = battle.attackerOrigin;
  } else {
    positions[battle.defender] = retreatV063Position(
      battle.defender,
      battle.contestedPosition,
      battle.territoryCount,
    );
  }
  positions[outcome.winner] = battle.contestedPosition;

  const attackerWon = outcome.winner === battle.attacker;
  const occupier = attackerWon
    && !battle.lastStand
    && isTerritoryIndex(battle.contestedPosition, battle.territoryCount)
    && battle.defenderControlsContested
      ? battle.attacker
      : null;

  const state: V064BattleState = {
    ...battle,
    stage: 'resolved',
    winner: outcome.winner,
    loser: outcome.loser,
    occupier,
    positions,
    endReason: null,
    clearCommittedCards: true,
  };
  return {
    state,
    victory: battle.lastStand && attackerWon
      ? victoryFromLastStand(battle.attacker, battle.defender)
      : null,
  };
}

/**
 * Withdrawal during Onset ends the sequence before a battle is fought. Once
 * Onset has completed, withdrawal is from an active battle and therefore uses
 * the normal non-result Aftermath/cleanup path.
 */
export function resolveV064Withdrawal(
  battle: V064BattleState,
  withdrawingPlayers: readonly PlayerId[],
): V064BattleState {
  if (battle.stage === 'resolved' || battle.stage === 'ended') {
    throw new Error('A completed battle sequence cannot withdraw again.');
  }
  const withdrawing = new Set(withdrawingPlayers);
  if (withdrawing.size === 0) throw new Error('At least one player must withdraw.');
  if ([...withdrawing].some(player => player !== battle.attacker && player !== battle.defender)) {
    throw new Error('Only the attacker or defender may withdraw from this battle sequence.');
  }

  const battleProceeded = battle.stage === 'active';
  const positions = { ...battle.positions };
  if (withdrawing.has(battle.attacker)) positions[battle.attacker] = battle.attackerOrigin;
  if (withdrawing.has(battle.defender)) {
    positions[battle.defender] = retreatV063Position(
      battle.defender,
      battle.contestedPosition,
      battle.territoryCount,
    );
  }
  if (!withdrawing.has(battle.attacker)) positions[battle.attacker] = battle.contestedPosition;
  if (!withdrawing.has(battle.defender)) positions[battle.defender] = battle.contestedPosition;

  const defenderOnly = withdrawing.size === 1 && withdrawing.has(battle.defender);
  const occupier = defenderOnly
    && !battle.lastStand
    && isTerritoryIndex(battle.contestedPosition, battle.territoryCount)
    && battle.defenderControlsContested
      ? battle.attacker
      : null;

  return {
    ...battle,
    stage: 'ended',
    winner: null,
    loser: null,
    occupier,
    positions,
    endReason: 'withdrawal',
    completeNonResultAftermath: battleProceeded,
    clearCommittedCards: battleProceeded,
  };
}

export type V064MovementSequenceSource = 'normal' | 'effect';

export interface V064TurnState {
  phase: TurnPhase;
  actionsAvailable: number;
  actionsTaken: Record<'opening' | 'denouement', number>;
  movementRemaining: number;
  movementSequenceOpen: boolean;
  battleInitiated: boolean;
  movementSequenceSource: V064MovementSequenceSource | null;
}

export function createV064TurnState(additionalActions = 0): V064TurnState {
  return {
    phase: 'capture',
    actionsAvailable: 1 + nonnegativeInteger(additionalActions),
    actionsTaken: { opening: 0, denouement: 0 },
    movementRemaining: 0,
    movementSequenceOpen: false,
    battleInitiated: false,
    movementSequenceSource: null,
  };
}

export function advanceV064TurnPhase(state: V064TurnState): V064TurnState {
  const index = V064_TURN_SEQUENCE.indexOf(state.phase);
  if (index < 0 || index === V064_TURN_SEQUENCE.length - 1) return { ...state };
  return {
    ...state,
    phase: V064_TURN_SEQUENCE[index + 1],
    movementRemaining: 0,
    movementSequenceOpen: false,
    battleInitiated: false,
    movementSequenceSource: null,
  };
}

export function beginEffectGrantedV064Movement(state: V064TurnState, movement = 1): V064TurnState {
  const amount = nonnegativeInteger(movement);
  if (amount < 1) throw new Error('Effect-granted movement must grant at least one movement.');
  return {
    ...state,
    movementRemaining: amount,
    movementSequenceOpen: true,
    battleInitiated: false,
    movementSequenceSource: 'effect',
  };
}

export function beginNormalV064Movement(state: V064TurnState, additionalMovement = 0): V064TurnState {
  if (state.phase !== 'movement') throw new Error('Normal movement begins only during the Movement phase.');
  return {
    ...state,
    movementRemaining: 1 + nonnegativeInteger(additionalMovement),
    movementSequenceOpen: true,
    battleInitiated: false,
    movementSequenceSource: 'normal',
  };
}

export function applyV064MovementChoice(
  state: V064TurnState,
  choice: MovementChoice,
  options: { initiatesBattle?: boolean } = {},
): V064TurnState {
  if (!state.movementSequenceOpen || !state.movementSequenceSource) {
    throw new Error('No movement sequence is currently open.');
  }
  if (state.movementSequenceSource === 'normal' && state.phase !== 'movement') {
    throw new Error('Normal movement is legal only during the Movement phase.');
  }
  if (choice === 'hold') {
    return { ...state, movementRemaining: 0, movementSequenceOpen: false, movementSequenceSource: null };
  }
  if (state.movementRemaining <= 0) throw new Error('No movement remains.');

  const initiatesBattle = Boolean(options.initiatesBattle);
  const remaining = initiatesBattle ? 0 : state.movementRemaining - 1;
  return {
    ...state,
    movementRemaining: remaining,
    movementSequenceOpen: !initiatesBattle && remaining > 0,
    movementSequenceSource: initiatesBattle || remaining === 0 ? null : state.movementSequenceSource,
    battleInitiated: initiatesBattle,
  };
}

function assertOutcomeMatchesBattle(battle: V064BattleState, outcome: V063BattleOutcome): void {
  const players = new Set([battle.attacker, battle.defender]);
  if (outcome.winner === outcome.loser || !players.has(outcome.winner) || !players.has(outcome.loser)) {
    throw new Error('Battle outcome winner and loser must match the battle participants.');
  }
}

function nonnegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function isTerritoryIndex(value: number, territoryCount: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < territoryCount;
}

function assertTerritoryIndex(value: number, territoryCount: number, label: string): void {
  if (!isTerritoryIndex(value, territoryCount)) {
    throw new Error(`${label} must be a Territory Position.`);
  }
}

function assertExtendedPosition(value: number, territoryCount: number, label: string): void {
  if (!Number.isInteger(value) || value < -1 || value > territoryCount) {
    throw new Error(`${label} must be a legal in-Gauntlet or edge-of-Gauntlet Position.`);
  }
}

function assertTerritoryCount(value: number): void {
  if (!Number.isInteger(value) || value < 2) throw new Error('territoryCount must be an integer of at least two.');
}
