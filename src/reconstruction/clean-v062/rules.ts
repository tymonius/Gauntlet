export type PlayerId = 'A' | 'B';
export type TurnPhase = 'capture' | 'draw' | 'opening' | 'movement' | 'denouement' | 'cleanup';
export type ActionPhase = 'opening' | 'denouement';
export type MovementChoice = 'advance' | 'hold' | 'fall_back';
export type BattleStage = 'pending' | 'onset' | 'active' | 'resolved' | 'withdrawn';
export type BattleRole = 'attacker' | 'defender';

export const TURN_SEQUENCE: readonly TurnPhase[] = [
  'capture',
  'draw',
  'opening',
  'movement',
  'denouement',
  'cleanup',
] as const;

export interface TurnState {
  phase: TurnPhase;
  actionsAvailable: number;
  actionsTaken: Record<ActionPhase, number>;
  movementRemaining: number;
  movementSequenceOpen: boolean;
  pendingBattleCreated: boolean;
}

/**
 * Position uses Territory indexes 0..territoryCount-1 plus the two legal
 * beyond-Gauntlet positions: -1 at A's end and territoryCount at B's end.
 */
export type Position = number;

export interface FrontLineState {
  territoryCount: number;
  control: Record<PlayerId, number>;
  position: Record<PlayerId, Position>;
}

export interface CaptureResolution {
  state: FrontLineState;
  capturedTerritory: number | null;
}

export interface PendingBattleInput {
  territoryCount: number;
  attacker: PlayerId;
  defender: PlayerId;
  attackerOrigin: Position;
  contestedPosition: Position;
  positions: Record<PlayerId, Position>;
  defenderControlsContested: boolean;
  lastStand?: boolean;
  defensiveEdgeRemoved?: boolean;
}

export interface BattleState extends PendingBattleInput {
  stage: BattleStage;
  termsAccepted: boolean | null;
  winner: PlayerId | null;
  loser: PlayerId | null;
  occupier: PlayerId | null;
  positions: Record<PlayerId, Position>;
  completeNonResultAftermath: boolean;
  clearCommittedCards: boolean;
}

export interface BattleOutcomeInput {
  attackerTotal: number;
  defenderTotal: number;
  defenderHasDefensiveEdge: boolean;
  tiebreakRolls?: readonly [number, number][];
}

export interface BattleOutcome {
  winner: BattleRole;
  loser: BattleRole;
  method: 'total' | 'defensive_edge' | 'tiebreak_roll';
  tiebreakRounds: number;
}

export interface RunTheGauntletVictory {
  winner: PlayerId;
  route: 'last_stand';
  immediate: true;
}

export function createTurnState(additionalActions = 0): TurnState {
  return {
    phase: 'capture',
    actionsAvailable: 1 + nonnegativeInteger(additionalActions),
    actionsTaken: { opening: 0, denouement: 0 },
    movementRemaining: 1,
    movementSequenceOpen: false,
    pendingBattleCreated: false,
  };
}

export function advanceTurnPhase(state: TurnState): TurnState {
  const index = TURN_SEQUENCE.indexOf(state.phase);
  if (index < 0 || index === TURN_SEQUENCE.length - 1) return { ...state };
  const phase = TURN_SEQUENCE[index + 1];
  return {
    ...state,
    phase,
    movementSequenceOpen: phase === 'movement',
  };
}

export function grantAdditionalAction(state: TurnState, amount = 1): TurnState {
  return { ...state, actionsAvailable: state.actionsAvailable + nonnegativeInteger(amount) };
}

export function canTakeAction(state: TurnState, phase: ActionPhase = state.phase as ActionPhase): boolean {
  if (state.phase !== phase) return false;
  if (phase !== 'opening' && phase !== 'denouement') return false;
  if (state.actionsAvailable <= 0) return false;
  return state.actionsTaken[phase] === 0;
}

export function takeAction(state: TurnState): TurnState {
  if (state.phase !== 'opening' && state.phase !== 'denouement') {
    throw new Error(`Actions are not normally legal during ${state.phase}.`);
  }
  const phase = state.phase;
  if (!canTakeAction(state, phase)) throw new Error(`No legal Action remains during ${phase}.`);
  return {
    ...state,
    actionsAvailable: state.actionsAvailable - 1,
    actionsTaken: { ...state.actionsTaken, [phase]: state.actionsTaken[phase] + 1 },
  };
}

export function beginMovement(state: TurnState, additionalMovement = 0): TurnState {
  if (state.phase !== 'movement') throw new Error('Movement begins only during the Movement phase.');
  return {
    ...state,
    movementRemaining: 1 + nonnegativeInteger(additionalMovement),
    movementSequenceOpen: true,
    pendingBattleCreated: false,
  };
}

export function applyMovementChoice(
  state: TurnState,
  choice: MovementChoice,
  options: { createsPendingBattle?: boolean } = {},
): TurnState {
  if (state.phase !== 'movement' || !state.movementSequenceOpen) {
    throw new Error('No Movement sequence is currently open.');
  }
  if (choice === 'hold') {
    return { ...state, movementRemaining: 0, movementSequenceOpen: false };
  }
  if (state.movementRemaining <= 0) throw new Error('No movement remains.');
  const createsPendingBattle = Boolean(options.createsPendingBattle);
  const remaining = createsPendingBattle ? 0 : state.movementRemaining - 1;
  return {
    ...state,
    movementRemaining: remaining,
    movementSequenceOpen: !createsPendingBattle && remaining > 0,
    pendingBattleCreated: createsPendingBattle,
  };
}

export function createInitialFrontLineState(
  territoryCount = 6,
  territoriesPerPlayer = 3,
): FrontLineState {
  assertTerritoryCount(territoryCount);
  if (!Number.isInteger(territoriesPerPlayer) || territoriesPerPlayer < 1) {
    throw new Error('territoriesPerPlayer must be a positive integer.');
  }
  if (territoriesPerPlayer * 2 !== territoryCount) {
    throw new Error('Standard setup requires the two complete Territory sets to fill the Gauntlet.');
  }
  return {
    territoryCount,
    control: { A: territoriesPerPlayer, B: territoriesPerPlayer },
    position: { A: -1, B: territoryCount },
  };
}

export function validateFrontLineState(state: FrontLineState): void {
  assertTerritoryCount(state.territoryCount);
  for (const player of ['A', 'B'] as const) {
    const controlled = state.control[player];
    if (!Number.isInteger(controlled) || controlled < 0 || controlled > state.territoryCount) {
      throw new Error(`${player} has an invalid Front Line length.`);
    }
    assertExtendedPosition(state.position[player], state.territoryCount, `${player} Position`);
  }
  if (state.control.A + state.control.B > state.territoryCount) {
    throw new Error('Contiguous Front Lines cannot overlap.');
  }
}

export function controlsTerritory(state: FrontLineState, player: PlayerId, territoryIndex: number): boolean {
  validateFrontLineState(state);
  assertTerritoryIndex(territoryIndex, state.territoryCount, 'Territory');
  if (player === 'A') return territoryIndex < state.control.A;
  return territoryIndex >= state.territoryCount - state.control.B;
}

export function nextFrontLineTerritory(state: FrontLineState, player: PlayerId): number | null {
  validateFrontLineState(state);
  const index = player === 'A' ? state.control.A : state.territoryCount - state.control.B - 1;
  return index < 0 || index >= state.territoryCount ? null : index;
}

export function canAdvanceFrontLine(state: FrontLineState, player: PlayerId): boolean {
  const target = nextFrontLineTerritory(state, player);
  if (target == null) return false;
  const position = state.position[player];
  const positionSupportsCapture = player === 'A' ? position >= target : position <= target;
  return positionSupportsCapture;
}

/**
 * Advance contiguous control. If the next Territory belongs to the opponent,
 * capture transfers that Territory out of the opponent's Front Line. This is
 * essential for the normal 3-3 six-Territory setup; no neutral gap is assumed.
 */
export function advanceFrontLine(
  state: FrontLineState,
  player: PlayerId,
  amount = 1,
): FrontLineState {
  let result = cloneFrontLine(state);
  for (let step = 0; step < nonnegativeInteger(amount); step += 1) {
    if (!canAdvanceFrontLine(result, player)) break;
    const target = nextFrontLineTerritory(result, player);
    if (target == null) break;
    const opponent = otherPlayer(player);
    const transfersFromOpponent = controlsTerritory(result, opponent, target);
    result = {
      ...result,
      control: {
        ...result.control,
        [player]: result.control[player] + 1,
        [opponent]: transfersFromOpponent ? result.control[opponent] - 1 : result.control[opponent],
      },
    };
    validateFrontLineState(result);
  }
  return result;
}

export function applyNormalCapture(state: FrontLineState, player: PlayerId): CaptureResolution {
  const target = nextFrontLineTerritory(state, player);
  if (target == null || !canAdvanceFrontLine(state, player)) {
    return { state: cloneFrontLine(state), capturedTerritory: null };
  }
  return { state: advanceFrontLine(state, player, 1), capturedTerritory: target };
}

export function finalTerritoryAtOpponentEnd(player: PlayerId, territoryCount: number): number {
  assertTerritoryCount(territoryCount);
  return player === 'A' ? territoryCount - 1 : 0;
}

export function outsideOwnEnd(player: PlayerId, territoryCount: number): Position {
  assertTerritoryCount(territoryCount);
  return player === 'A' ? -1 : territoryCount;
}

export function outsideOpponentEnd(player: PlayerId, territoryCount: number): Position {
  return outsideOwnEnd(otherPlayer(player), territoryCount);
}

export function retreatPosition(player: PlayerId, position: Position, territoryCount: number): Position {
  assertExtendedPosition(position, territoryCount, `${player} Position`);
  if (player === 'A') return Math.max(-1, position - 1);
  return Math.min(territoryCount, position + 1);
}

export function createPendingBattle(input: PendingBattleInput): BattleState {
  if (input.attacker === input.defender) throw new Error('Attacker and defender must be different players.');
  const lastStand = Boolean(input.lastStand);
  assertExtendedPosition(input.attackerOrigin, input.territoryCount, 'attacker origin');
  assertExtendedPosition(input.contestedPosition, input.territoryCount, 'contested Position');
  assertExtendedPosition(input.positions.A, input.territoryCount, 'A Position');
  assertExtendedPosition(input.positions.B, input.territoryCount, 'B Position');
  if (!lastStand) {
    assertTerritoryIndex(input.contestedPosition, input.territoryCount, 'normal contested Position');
  } else {
    const expected = outsideOwnEnd(input.defender, input.territoryCount);
    if (input.contestedPosition !== expected) {
      throw new Error('A Last Stand is fought beyond the defender’s own end of the Gauntlet.');
    }
  }
  return {
    ...input,
    lastStand,
    defensiveEdgeRemoved: Boolean(input.defensiveEdgeRemoved),
    stage: 'pending',
    termsAccepted: null,
    winner: null,
    loser: null,
    occupier: null,
    positions: { ...input.positions },
    completeNonResultAftermath: false,
    clearCommittedCards: false,
  };
}

export function canInitiateLastStand(state: FrontLineState, attacker: PlayerId): boolean {
  validateFrontLineState(state);
  const defender = otherPlayer(attacker);
  const controlsFinalTerritory = state.control[attacker] === state.territoryCount;
  return controlsFinalTerritory
    && state.position[attacker] === finalTerritoryAtOpponentEnd(attacker, state.territoryCount)
    && state.position[defender] === outsideOwnEnd(defender, state.territoryCount);
}

export function createLastStandBattle(state: FrontLineState, attacker: PlayerId): BattleState {
  if (!canInitiateLastStand(state, attacker)) {
    throw new Error('Last Stand requires control of the opponent’s final Territory and the defender beyond the Gauntlet.');
  }
  const defender = otherPlayer(attacker);
  const contestedPosition = outsideOwnEnd(defender, state.territoryCount);
  return createPendingBattle({
    territoryCount: state.territoryCount,
    attacker,
    defender,
    attackerOrigin: state.position[attacker],
    contestedPosition,
    positions: { ...state.position, [attacker]: contestedPosition },
    defenderControlsContested: false,
    lastStand: true,
  });
}

export function defenderHasDefensiveEdge(battle: BattleState): boolean {
  return !battle.defensiveEdgeRemoved && (battle.defenderControlsContested || Boolean(battle.lastStand));
}

export function acceptTerms(
  battle: BattleState,
  withdrawingPlayers: readonly PlayerId[] = [battle.attacker],
): BattleState {
  if (battle.stage !== 'pending') throw new Error('Terms may be accepted only during a pending battle.');
  return resolveWithdrawal({ ...battle, termsAccepted: true }, withdrawingPlayers);
}

export function refuseTerms(battle: BattleState): BattleState {
  if (battle.stage !== 'pending') throw new Error('Terms may be refused only during a pending battle.');
  return beginOnset({ ...battle, termsAccepted: false });
}

export function beginOnset(battle: BattleState): BattleState {
  if (battle.stage !== 'pending') throw new Error('Onset begins only from a pending battle.');
  return { ...battle, stage: 'onset' };
}

export function beginActiveBattle(battle: BattleState): BattleState {
  if (battle.stage !== 'onset') throw new Error('The active battle begins after Onset.');
  return { ...battle, stage: 'active' };
}

export function resolveBattleOutcome(input: BattleOutcomeInput): BattleOutcome {
  if (input.attackerTotal > input.defenderTotal) {
    return { winner: 'attacker', loser: 'defender', method: 'total', tiebreakRounds: 0 };
  }
  if (input.defenderTotal > input.attackerTotal) {
    return { winner: 'defender', loser: 'attacker', method: 'total', tiebreakRounds: 0 };
  }
  if (input.defenderHasDefensiveEdge) {
    return { winner: 'defender', loser: 'attacker', method: 'defensive_edge', tiebreakRounds: 0 };
  }
  const rolls = input.tiebreakRolls ?? [];
  for (let index = 0; index < rolls.length; index += 1) {
    const [attackerRoll, defenderRoll] = rolls[index];
    assertDie(attackerRoll);
    assertDie(defenderRoll);
    if (attackerRoll > defenderRoll) {
      return { winner: 'attacker', loser: 'defender', method: 'tiebreak_roll', tiebreakRounds: index + 1 };
    }
    if (defenderRoll > attackerRoll) {
      return { winner: 'defender', loser: 'attacker', method: 'tiebreak_roll', tiebreakRounds: index + 1 };
    }
  }
  throw new Error('A tied battle without Defensive Edge requires a decisive unmodified Tiebreak Roll.');
}

export function applyBattleOutcome(battle: BattleState, outcome: BattleOutcome): BattleState {
  if (battle.stage !== 'active' && battle.stage !== 'onset') {
    throw new Error('A battle outcome may be applied only after Onset.');
  }
  const winner = outcome.winner === 'attacker' ? battle.attacker : battle.defender;
  const loser = outcome.loser === 'attacker' ? battle.attacker : battle.defender;
  const positions = { ...battle.positions };
  positions[loser] = retreatPosition(loser, positions[loser], battle.territoryCount);
  positions[winner] = battle.contestedPosition;
  return {
    ...battle,
    stage: 'resolved',
    winner,
    loser,
    occupier: !battle.lastStand && winner === battle.attacker && battle.defenderControlsContested ? winner : null,
    positions,
    clearCommittedCards: true,
  };
}

export function victoryFromResolvedLastStand(battle: BattleState): RunTheGauntletVictory | null {
  if (battle.stage !== 'resolved' || !battle.lastStand || battle.winner !== battle.attacker) return null;
  return { winner: battle.attacker, route: 'last_stand', immediate: true };
}

export function resolveWithdrawal(
  battle: BattleState,
  withdrawingPlayers: readonly PlayerId[],
): BattleState {
  if (battle.stage === 'resolved' || battle.stage === 'withdrawn') {
    throw new Error('A completed battle cannot withdraw again.');
  }
  const withdrawing = new Set(withdrawingPlayers);
  if (withdrawing.size === 0) throw new Error('At least one player must withdraw.');
  if ([...withdrawing].some((player) => player !== battle.attacker && player !== battle.defender)) {
    throw new Error('Only the attacker or defender may withdraw from this battle.');
  }
  const afterOnset = battle.stage === 'onset' || battle.stage === 'active';
  const positions = { ...battle.positions };
  if (withdrawing.has(battle.attacker)) positions[battle.attacker] = battle.attackerOrigin;
  if (withdrawing.has(battle.defender)) {
    positions[battle.defender] = retreatPosition(battle.defender, battle.contestedPosition, battle.territoryCount);
  }
  if (!withdrawing.has(battle.attacker)) positions[battle.attacker] = battle.contestedPosition;
  if (!withdrawing.has(battle.defender)) positions[battle.defender] = battle.contestedPosition;
  const defenderOnly = withdrawing.size === 1 && withdrawing.has(battle.defender);
  return {
    ...battle,
    stage: 'withdrawn',
    winner: null,
    loser: null,
    occupier: !battle.lastStand && defenderOnly && battle.defenderControlsContested ? battle.attacker : null,
    positions,
    completeNonResultAftermath: afterOnset,
    clearCommittedCards: afterOnset,
  };
}

export function otherPlayer(player: PlayerId): PlayerId {
  return player === 'A' ? 'B' : 'A';
}

function cloneFrontLine(state: FrontLineState): FrontLineState {
  validateFrontLineState(state);
  return {
    territoryCount: state.territoryCount,
    control: { ...state.control },
    position: { ...state.position },
  };
}

function nonnegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function assertTerritoryCount(value: number): void {
  if (!Number.isInteger(value) || value < 2) throw new Error('territoryCount must be an integer of at least two.');
}

function assertTerritoryIndex(value: number, territoryCount: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value >= territoryCount) {
    throw new Error(`${label} must be a valid Territory index.`);
  }
}

function assertExtendedPosition(value: number, territoryCount: number, label: string): void {
  if (!Number.isInteger(value) || value < -1 || value > territoryCount) {
    throw new Error(`${label} must be a Territory index or one of the two beyond-Gauntlet positions.`);
  }
}

function assertDie(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error('Tiebreak Rolls must be unmodified d6 results.');
  }
}
