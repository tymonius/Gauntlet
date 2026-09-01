import { v070CanonicalContent } from '../content/v070';

export type PlayerId = 'A' | 'B';
export type TurnPhase = 'capture' | 'draw' | 'opening' | 'movement' | 'denouement' | 'cleanup';
export type MovementChoice = 'advance' | 'hold' | 'fall_back';
export type ExtendedPosition = number;

export const V070_TURN_SEQUENCE: readonly TurnPhase[] = [
  'capture',
  'draw',
  'opening',
  'movement',
  'denouement',
  'cleanup',
] as const;

export const V070_BATTLE_SEQUENCE = [
  'onset',
  'set_gambits',
  'form_reserves',
  'reveal_gambits',
  'choose_tactics',
  'reveal_tactics',
  'outcome',
  'aftermath',
] as const;

export type V070BattleSequenceStep = typeof V070_BATTLE_SEQUENCE[number];
export type V070BattleStage = 'onset' | 'active' | 'resolved' | 'ended';
export type V070BattleEndReason = 'withdrawal' | 'terms_accepted' | 'prevented';

export interface V070BattleOnsetInput {
  territoryCount: number;
  attacker: PlayerId;
  defender: PlayerId;
  attackerOrigin: ExtendedPosition;
  contestedPosition: ExtendedPosition;
  positions: Record<PlayerId, ExtendedPosition>;
  defenderControlsContested: boolean;
  lastStand?: boolean;
  defensiveEdgeRemoved?: boolean;
  attackerGambitProhibited?: boolean;
}

export interface V070BattleState extends V070BattleOnsetInput {
  lastStand: boolean;
  defensiveEdgeRemoved: boolean;
  attackerGambitProhibited: boolean;
  stage: V070BattleStage;
  termsAccepted: boolean | null;
  winner: PlayerId | null;
  loser: PlayerId | null;
  occupier: PlayerId | null;
  positions: Record<PlayerId, ExtendedPosition>;
  endReason: V070BattleEndReason | null;
  completeNonResultAftermath: boolean;
  clearCommittedCards: boolean;
}

export interface V070BattleOutcomeInput {
  attacker: PlayerId;
  defender: PlayerId;
  attackerTotal: number;
  defenderTotal: number;
  defenderHasDefensiveEdge: boolean;
  tiebreakRolls?: readonly [number, number][];
}

export interface V070BattleOutcome {
  winner: PlayerId;
  loser: PlayerId;
  method: 'total' | 'defensive_edge' | 'tiebreak_roll';
  tiebreakRounds: number;
}

export type RunTheGauntletRoute = 'final_territory_capture' | 'last_stand';

export interface RunTheGauntletVictory {
  winner: PlayerId;
  route: RunTheGauntletRoute;
  immediate: true;
}

export interface V070BattleResolution {
  state: V070BattleState;
  victory: RunTheGauntletVictory | null;
}

export interface V070LastStandAccessInput {
  attacker: PlayerId;
  defender: PlayerId;
  territoryCount: number;
  attackerPosition: ExtendedPosition;
  defenderPosition: ExtendedPosition;
  separateMovementSequence: boolean;
  advancingBeyondOpponentEnd: boolean;
  attackerGambitProhibited?: boolean;
}

export type V070MovementSequenceSource = 'normal' | 'effect';

export type V070MovementChoiceRestriction =
  | 'any'
  | 'advance_only'
  | 'advance_required';
export type V070MovementBattleRestriction =
  | 'allowed'
  | 'prohibited'
  | 'allowed_no_gambit';

export interface V070MovementStep {
  source: string;
  choiceRestriction: V070MovementChoiceRestriction;
  battleRestriction: V070MovementBattleRestriction;
}

export interface V070GambitMandate {
  playerId: PlayerId;
  instanceId: string;
  sourceInstanceId: string;
}

export interface V070TurnState {
  phase: TurnPhase;
  actionsAvailable: number;
  actionsTaken: Record<'opening' | 'denouement', number>;
  phaseActionGrants: Record<'opening' | 'denouement', number>;
  movementRemaining: number;
  movementSequenceOpen: boolean;
  battleInitiated: boolean;
  movementSequenceSource: V070MovementSequenceSource | null;
  pendingNormalMovementSteps: V070MovementStep[];
  movementStepQueue: V070MovementStep[];
  territoryMovementBonus: number;
  denouementCardActionBlockedByTerritory: boolean;
  gambitMandates: V070GambitMandate[];
}

function assertReleasedRuleContract(): void {
  const battle = v070CanonicalContent.content.battle;
  if (JSON.stringify(battle.sequence) !== JSON.stringify(V070_BATTLE_SEQUENCE)) {
    throw new Error('v0.7.0 executable battle sequence drifted from released canonical data.');
  }
  if (!battle.onset.includes('Terms first')
    || !battle.battle_fought.includes('proceeds to Gambits')
    || !battle.withdrawal.includes('Withdrawal during Onset')) {
    throw new Error('v0.7.0 executable battle procedures require the released Onset and withdrawal contract.');
  }
}

assertReleasedRuleContract();

/**
 * Movement that enters the opponent's Position establishes the battle context
 * and enters Onset immediately. There is no separate Pending Battle stage.
 */
export function createV070BattleOnset(input: V070BattleOnsetInput): V070BattleState {
  if (input.attacker === input.defender) throw new Error('Attacker and defender must be different players.');
  assertTerritoryCount(input.territoryCount);
  assertExtendedPosition(input.attackerOrigin, input.territoryCount, 'attacker origin');
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

  if (input.positions[input.attacker] !== input.contestedPosition
    || input.positions[input.defender] !== input.contestedPosition) {
    throw new Error('Onset requires both Player Tokens at the contested Position.');
  }

  return {
    ...input,
    lastStand,
    defensiveEdgeRemoved: Boolean(input.defensiveEdgeRemoved),
    attackerGambitProhibited: Boolean(input.attackerGambitProhibited),
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

export function createV070LastStandOnset(input: V070LastStandAccessInput): V070BattleState {
  if (!canInitiateV070LastStand(input)) {
    throw new Error('Last Stand requires the defender beyond their end and a separate legal Advance beyond that end.');
  }
  const contestedPosition = outsideOwnEnd(input.defender, input.territoryCount);
  return createV070BattleOnset({
    territoryCount: input.territoryCount,
    attacker: input.attacker,
    defender: input.defender,
    attackerOrigin: input.attackerPosition,
    contestedPosition,
    positions: { A: contestedPosition, B: contestedPosition },
    defenderControlsContested: false,
    lastStand: true,
    attackerGambitProhibited: Boolean(input.attackerGambitProhibited),
  });
}

export function canInitiateV070LastStand(input: V070LastStandAccessInput): boolean {
  if (input.attacker === input.defender) return false;
  assertTerritoryCount(input.territoryCount);
  return input.attackerPosition === finalTerritoryAtOpponentEnd(input.attacker, input.territoryCount)
    && input.defenderPosition === outsideOwnEnd(input.defender, input.territoryCount)
    && input.separateMovementSequence
    && input.advancingBeyondOpponentEnd;
}

export function defenderHasV070DefensiveEdge(battle: V070BattleState): boolean {
  return !battle.defensiveEdgeRemoved && (battle.defenderControlsContested || battle.lastStand);
}

/**
 * Finishing Onset means the battle has proceeded to Gambits and therefore
 * counts as a battle fought for effects that care whether a battle occurred.
 */
export function proceedV070ToGambits(battle: V070BattleState): V070BattleState {
  if (battle.stage !== 'onset') throw new Error('A battle can proceed to Gambits only from Onset.');
  return { ...battle, stage: 'active' };
}

/**
 * End the sequence during Onset. Accepted Terms normally cause the attacker to
 * withdraw and the defender to remain; callers may provide an explicit
 * positions result when the Proposal says otherwise.
 */
export function endV070OnsetWithoutBattle(
  battle: V070BattleState,
  reason: Exclude<V070BattleEndReason, 'withdrawal'>,
  positions?: Record<PlayerId, ExtendedPosition>,
): V070BattleState {
  if (battle.stage !== 'onset') throw new Error('Only Onset can end before a battle proceeds.');

  const resolvedPositions = positions
    ? { ...positions }
    : reason === 'terms_accepted'
      ? normalWithdrawalPositions(battle, new Set<PlayerId>([battle.attacker]))
      : { ...battle.positions };

  assertExtendedPosition(resolvedPositions.A, battle.territoryCount, 'A Position');
  assertExtendedPosition(resolvedPositions.B, battle.territoryCount, 'B Position');

  return {
    ...battle,
    stage: 'ended',
    termsAccepted: reason === 'terms_accepted' ? true : battle.termsAccepted,
    winner: null,
    loser: null,
    occupier: null,
    positions: resolvedPositions,
    endReason: reason,
    completeNonResultAftermath: false,
    clearCommittedCards: false,
  };
}

export function v070BattleWasFought(battle: V070BattleState): boolean {
  return battle.stage === 'active'
    || battle.stage === 'resolved'
    || (battle.stage === 'ended' && battle.completeNonResultAftermath);
}

export function resolveV070BattleOutcome(input: V070BattleOutcomeInput): V070BattleOutcome {
  if (input.attacker === input.defender) throw new Error('Attacker and defender must be different players.');

  if (input.attackerTotal > input.defenderTotal) {
    return { winner: input.attacker, loser: input.defender, method: 'total', tiebreakRounds: 0 };
  }
  if (input.defenderTotal > input.attackerTotal) {
    return { winner: input.defender, loser: input.attacker, method: 'total', tiebreakRounds: 0 };
  }
  if (input.defenderHasDefensiveEdge) {
    return { winner: input.defender, loser: input.attacker, method: 'defensive_edge', tiebreakRounds: 0 };
  }

  const rolls = input.tiebreakRolls ?? [];
  for (let index = 0; index < rolls.length; index += 1) {
    const [attackerRoll, defenderRoll] = rolls[index];
    assertDie(attackerRoll, 'Tiebreak Rolls');
    assertDie(defenderRoll, 'Tiebreak Rolls');
    if (attackerRoll > defenderRoll) {
      return { winner: input.attacker, loser: input.defender, method: 'tiebreak_roll', tiebreakRounds: index + 1 };
    }
    if (defenderRoll > attackerRoll) {
      return { winner: input.defender, loser: input.attacker, method: 'tiebreak_roll', tiebreakRounds: index + 1 };
    }
  }

  throw new Error('A tied battle without Defensive Edge requires a decisive unmodified Tiebreak Roll.');
}

export function applyV070BattleOutcome(
  battle: V070BattleState,
  outcome: V070BattleOutcome,
): V070BattleResolution {
  if (battle.stage !== 'active') {
    throw new Error('A battle outcome may be applied only after Onset has proceeded to Gambits.');
  }
  assertOutcomeMatchesBattle(battle, outcome);

  const positions = { ...battle.positions };
  if (outcome.loser === battle.attacker) {
    positions[battle.attacker] = battle.attackerOrigin;
  } else {
    positions[battle.defender] = retreatV070Position(
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

  const state: V070BattleState = {
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
      ? victoryFromV070LastStand(battle.attacker, battle.defender)
      : null,
  };
}

/**
 * Withdrawal uses the same positional procedure as retreat but has no winner
 * or loser. Onset withdrawal has no Aftermath; withdrawal after the battle has
 * proceeded to Gambits completes the remaining non-result Aftermath.
 */
export function resolveV070Withdrawal(
  battle: V070BattleState,
  withdrawingPlayers: readonly PlayerId[],
): V070BattleState {
  if (battle.stage === 'resolved' || battle.stage === 'ended') {
    throw new Error('A completed battle sequence cannot withdraw again.');
  }

  const withdrawing = new Set(withdrawingPlayers);
  if (withdrawing.size === 0) throw new Error('At least one player must withdraw.');
  if ([...withdrawing].some(player => player !== battle.attacker && player !== battle.defender)) {
    throw new Error('Only the attacker or defender may withdraw from this battle sequence.');
  }

  const battleProceeded = battle.stage === 'active';
  const positions = normalWithdrawalPositions(battle, withdrawing);
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

export function createV070TurnState(additionalActions = 0): V070TurnState {
  return {
    phase: 'capture',
    actionsAvailable: 1 + nonnegativeInteger(additionalActions),
    actionsTaken: { opening: 0, denouement: 0 },
    phaseActionGrants: { opening: 0, denouement: 0 },
    movementRemaining: 0,
    movementSequenceOpen: false,
    battleInitiated: false,
    movementSequenceSource: null,
    pendingNormalMovementSteps: [],
    movementStepQueue: [],
    territoryMovementBonus: 0,
    denouementCardActionBlockedByTerritory: false,
    gambitMandates: [],
  };
}

export function spendV070Action(state: V070TurnState): V070TurnState {
  if (state.phase !== 'opening' && state.phase !== 'denouement') {
    throw new Error('Actions may normally be taken only during Opening or Denouement.');
  }
  if (state.actionsAvailable <= 0) {
    throw new Error('No Actions remain this turn.');
  }

  const phaseLimit = 1 + state.phaseActionGrants[state.phase];
  if (state.actionsTaken[state.phase] >= phaseLimit) {
    throw new Error(
      `The Action limit for ${state.phase} has already been reached.`,
    );
  }

  return {
    ...state,
    actionsAvailable: state.actionsAvailable - 1,
    actionsTaken: {
      ...state.actionsTaken,
      [state.phase]: state.actionsTaken[state.phase] + 1,
    },
  };
}

export function grantCurrentPhaseV070Actions(
  state: V070TurnState,
  amount = 1,
): V070TurnState {
  if (state.phase !== 'opening' && state.phase !== 'denouement') {
    throw new Error(
      'Current-phase Actions may be granted only during Opening or Denouement.',
    );
  }
  const grant = nonnegativeInteger(amount);
  if (grant < 1) return { ...state };

  return {
    ...state,
    actionsAvailable: state.actionsAvailable + grant,
    phaseActionGrants: {
      ...state.phaseActionGrants,
      [state.phase]: state.phaseActionGrants[state.phase] + grant,
    },
  };
}

export function advanceV070TurnPhase(state: V070TurnState): V070TurnState {
  const index = V070_TURN_SEQUENCE.indexOf(state.phase);
  if (index < 0 || index === V070_TURN_SEQUENCE.length - 1) return { ...state };

  let actionsAvailable = state.actionsAvailable;
  let phaseActionGrants = state.phaseActionGrants;

  if (state.phase === 'opening' || state.phase === 'denouement') {
    const grants = state.phaseActionGrants[state.phase];
    const grantActionsUsed = Math.max(
      0,
      state.actionsTaken[state.phase] - 1,
    );
    const unusedGrants = Math.max(0, grants - grantActionsUsed);
    actionsAvailable = Math.max(0, actionsAvailable - unusedGrants);
    phaseActionGrants = {
      ...state.phaseActionGrants,
      [state.phase]: 0,
    };
  }

  return {
    ...state,
    phase: V070_TURN_SEQUENCE[index + 1],
    actionsAvailable,
    phaseActionGrants,
    movementRemaining: 0,
    movementSequenceOpen: false,
    battleInitiated: false,
    movementSequenceSource: null,
    pendingNormalMovementSteps:
      state.phase === 'movement' ? [] : [...state.pendingNormalMovementSteps],
    movementStepQueue: [],
  };
}

export function queueNormalV070MovementStep(
  state: V070TurnState,
  step: V070MovementStep,
): V070TurnState {
  if (state.phase !== 'opening') {
    throw new Error('Normal Movement bonuses must be queued during Opening.');
  }
  if (state.movementSequenceOpen) {
    throw new Error('Normal Movement bonuses must be queued before movement begins.');
  }
  return {
    ...state,
    pendingNormalMovementSteps: [
      ...state.pendingNormalMovementSteps,
      structuredClone(step),
    ],
  };
}

export function currentV070MovementStep(
  state: V070TurnState,
): V070MovementStep | null {
  if (!state.movementSequenceOpen || state.movementStepQueue.length === 0) {
    return null;
  }
  return structuredClone(state.movementStepQueue[0]);
}

export function beginEffectGrantedV070Movement(
  state: V070TurnState,
  movement = 1,
  options: Partial<Omit<V070MovementStep, 'source'>> & { source?: string } = {},
): V070TurnState {
  const amount = nonnegativeInteger(movement);
  if (amount < 1) throw new Error('Effect-granted movement must grant at least one movement.');

  const step: V070MovementStep = {
    source: options.source ?? 'effect',
    choiceRestriction: options.choiceRestriction ?? 'any',
    battleRestriction: options.battleRestriction ?? 'allowed',
  };
  const queue = Array.from({ length: amount }, () => structuredClone(step));

  return {
    ...state,
    movementRemaining: queue.length,
    movementSequenceOpen: true,
    battleInitiated: false,
    movementSequenceSource: 'effect',
    movementStepQueue: queue,
  };
}

export function beginNormalV070Movement(state: V070TurnState, additionalMovement = 0): V070TurnState {
  if (state.phase !== 'movement') throw new Error('Normal movement begins only during the Movement phase.');

  const unrestrictedAdditional = Array.from(
    { length: nonnegativeInteger(additionalMovement) },
    (): V070MovementStep => ({
      source: 'normal_additional',
      choiceRestriction: 'any',
      battleRestriction: 'allowed',
    }),
  );
  const queue: V070MovementStep[] = [
    {
      source: 'normal',
      choiceRestriction: 'any',
      battleRestriction: 'allowed',
    },
    ...unrestrictedAdditional,
    ...state.pendingNormalMovementSteps.map(step => structuredClone(step)),
  ];

  return {
    ...state,
    movementRemaining: queue.length,
    movementSequenceOpen: true,
    battleInitiated: false,
    movementSequenceSource: 'normal',
    pendingNormalMovementSteps: [],
    movementStepQueue: queue,
  };
}

export function endV070MovementSequence(
  state: V070TurnState,
): V070TurnState {
  return {
    ...state,
    movementRemaining: 0,
    movementSequenceOpen: false,
    movementSequenceSource: null,
    movementStepQueue: [],
  };
}

export function capV070NormalMovementToOneStep(
  state: V070TurnState,
): V070TurnState {
  if (!state.movementSequenceOpen
    || state.movementSequenceSource !== 'normal') {
    throw new Error(
      'A Territory movement cap applies only to an open normal Movement sequence.',
    );
  }
  const first = state.movementStepQueue[0];
  if (!first) return endV070MovementSequence(state);
  return {
    ...state,
    movementRemaining: 1,
    movementStepQueue: [structuredClone(first)],
  };
}

export function applyV070MovementChoice(
  state: V070TurnState,
  choice: MovementChoice,
  options: { initiatesBattle?: boolean } = {},
): V070TurnState {
  if (!state.movementSequenceOpen || !state.movementSequenceSource) {
    throw new Error('No movement sequence is currently open.');
  }
  if (state.movementSequenceSource === 'normal' && state.phase !== 'movement') {
    throw new Error('Normal movement is legal only during the Movement phase.');
  }

  const step = currentV070MovementStep(state);
  if (!step) throw new Error('An open movement sequence must have a current movement step.');

  if (choice === 'hold') {
    if (step.choiceRestriction === 'advance_required') {
      throw new Error('The current movement effect requires an Advance.');
    }
    return {
      ...state,
      movementRemaining: 0,
      movementSequenceOpen: false,
      movementSequenceSource: null,
      movementStepQueue: [],
    };
  }
  if (state.movementRemaining <= 0) throw new Error('No movement remains.');
  if ((step.choiceRestriction === 'advance_only'
      || step.choiceRestriction === 'advance_required')
    && choice !== 'advance') {
    throw new Error('The current additional movement may only be used to Advance.');
  }

  const initiatesBattle = Boolean(options.initiatesBattle);
  if (initiatesBattle && step.battleRestriction === 'prohibited') {
    throw new Error('The current additional movement cannot initiate a battle.');
  }

  const remainingQueue = initiatesBattle
    ? []
    : state.movementStepQueue.slice(1).map(item => structuredClone(item));
  const remaining = remainingQueue.length;

  return {
    ...state,
    movementRemaining: remaining,
    movementSequenceOpen: !initiatesBattle && remaining > 0,
    movementSequenceSource:
      initiatesBattle || remaining === 0 ? null : state.movementSequenceSource,
    battleInitiated: initiatesBattle,
    movementStepQueue: remainingQueue,
  };
}

export function finalTerritoryAtOpponentEnd(player: PlayerId, territoryCount: number): number {
  assertTerritoryCount(territoryCount);
  return player === 'A' ? territoryCount - 1 : 0;
}

export function outsideOwnEnd(player: PlayerId, territoryCount: number): ExtendedPosition {
  assertTerritoryCount(territoryCount);
  return player === 'A' ? -1 : territoryCount;
}

export function retreatV070Position(
  player: PlayerId,
  position: ExtendedPosition,
  territoryCount: number,
): ExtendedPosition {
  assertExtendedPosition(position, territoryCount, `${player} Position`);
  return player === 'A'
    ? Math.max(-1, position - 1)
    : Math.min(territoryCount, position + 1);
}

export function victoryFromV070LastStand(
  winner: PlayerId,
  defender: PlayerId,
): RunTheGauntletVictory | null {
  if (winner === defender) return null;
  return { winner, route: 'last_stand', immediate: true };
}

function normalWithdrawalPositions(
  battle: V070BattleState,
  withdrawing: ReadonlySet<PlayerId>,
): Record<PlayerId, ExtendedPosition> {
  const positions = { ...battle.positions };

  // The shared procedure moves the attacker first when both withdraw.
  if (withdrawing.has(battle.attacker)) positions[battle.attacker] = battle.attackerOrigin;
  if (withdrawing.has(battle.defender)) {
    positions[battle.defender] = retreatV070Position(
      battle.defender,
      battle.contestedPosition,
      battle.territoryCount,
    );
  }

  if (!withdrawing.has(battle.attacker)) positions[battle.attacker] = battle.contestedPosition;
  if (!withdrawing.has(battle.defender)) positions[battle.defender] = battle.contestedPosition;
  return positions;
}

function assertOutcomeMatchesBattle(battle: V070BattleState, outcome: V070BattleOutcome): void {
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
  if (!Number.isInteger(value) || value < 2) {
    throw new Error('territoryCount must be an integer of at least two.');
  }
}

function assertDie(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error(`${label} must be unmodified d6 results.`);
  }
}
