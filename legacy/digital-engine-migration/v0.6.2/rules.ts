export type PlayerId = 'A' | 'B';
export type TurnPhase = 'capture' | 'draw' | 'opening' | 'movement' | 'denouement' | 'cleanup';
export type ActionPhase = 'opening' | 'denouement';
export type MovementChoice = 'advance' | 'hold' | 'fall_back';
export type BattleStage = 'pending' | 'onset' | 'active' | 'resolved' | 'withdrawn';

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

export interface FrontLineState {
  territoryCount: number;
  control: Record<PlayerId, number>;
  position: Record<PlayerId, number>;
}

export interface PendingBattleInput {
  territoryCount: number;
  attacker: PlayerId;
  defender: PlayerId;
  attackerOrigin: number;
  contestedPosition: number;
  positions: Record<PlayerId, number>;
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
  positions: Record<PlayerId, number>;
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
  winner: PlayerId;
  loser: PlayerId;
  method: 'total' | 'defensive_edge' | 'tiebreak_roll';
  tiebreakRounds: number;
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
  return {
    ...state,
    actionsAvailable: state.actionsAvailable + nonnegativeInteger(amount),
  };
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
  if (!canTakeAction(state, phase)) {
    throw new Error(`No legal Action remains during ${phase}.`);
  }
  return {
    ...state,
    actionsAvailable: state.actionsAvailable - 1,
    actionsTaken: {
      ...state.actionsTaken,
      [phase]: state.actionsTaken[phase] + 1,
    },
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
  return {
    ...state,
    movementRemaining: createsPendingBattle ? 0 : state.movementRemaining - 1,
    movementSequenceOpen: createsPendingBattle ? false : state.movementRemaining - 1 > 0,
    pendingBattleCreated: createsPendingBattle,
  };
}

export function validateFrontLineState(state: FrontLineState): void {
  if (!Number.isInteger(state.territoryCount) || state.territoryCount < 1) {
    throw new Error('territoryCount must be a positive integer.');
  }
  for (const player of ['A', 'B'] as const) {
    const controlled = state.control[player];
    const position = state.position[player];
    if (!Number.isInteger(controlled) || controlled < 0 || controlled > state.territoryCount) {
      throw new Error(`${player} has an invalid Front Line length.`);
    }
    if (!Number.isInteger(position) || position < 0 || position >= state.territoryCount) {
      throw new Error(`${player} has an invalid Position.`);
    }
  }
  if (state.control.A + state.control.B > state.territoryCount) {
    throw new Error('Contiguous Front Lines cannot overlap.');
  }
}

export function controlsTerritory(state: FrontLineState, player: PlayerId, territoryIndex: number): boolean {
  validateFrontLineState(state);
  if (player === 'A') return territoryIndex >= 0 && territoryIndex < state.control.A;
  return territoryIndex >= state.territoryCount - state.control.B && territoryIndex < state.territoryCount;
}

export function nextOpposingTerritory(state: FrontLineState, player: PlayerId): number | null {
  validateFrontLineState(state);
  const index = player === 'A'
    ? state.control.A
    : state.territoryCount - state.control.B - 1;
  if (index < 0 || index >= state.territoryCount) return null;
  if (controlsTerritory(state, otherPlayer(player), index)) return index;
  return state.control.A + state.control.B < state.territoryCount ? index : null;
}

export function canAdvanceFrontLine(state: FrontLineState, player: PlayerId): boolean {
  const target = nextOpposingTerritory(state, player);
  if (target == null) return false;
  const position = state.position[player];
  return player === 'A' ? position >= target : position <= target;
}

export function advanceFrontLine(
  state: FrontLineState,
  player: PlayerId,
  amount = 1,
): FrontLineState {
  let result = cloneFrontLine(state);
  for (let step = 0; step < nonnegativeInteger(amount); step += 1) {
    if (!canAdvanceFrontLine(result, player)) break;
    result = {
      ...result,
      control: {
        ...result.control,
        [player]: result.control[player] + 1,
      },
    };
  }
  validateFrontLineState(result);
  return result;
}

export function applyNormalCapture(state: FrontLineState, player: PlayerId): FrontLineState {
  return advanceFrontLine(state, player, 1);
}

export function createPendingBattle(input: PendingBattleInput): BattleState {
  if (input.attacker === input.defender) throw new Error('Attacker and defender must be different players.');
  assertPosition(input.attackerOrigin, input.territoryCount, 'attacker origin');
  assertPosition(input.contestedPosition, input.territoryCount, 'contested Position');
  assertPosition(input.positions.A, input.territoryCount, 'A Position');
  assertPosition(input.positions.B, input.territoryCount, 'B Position');

  return {
    ...input,
    lastStand: Boolean(input.lastStand),
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
    return { winner: 'A', loser: 'B', method: 'total', tiebreakRounds: 0 };
  }
  if (input.defenderTotal > input.attackerTotal) {
    return { winner: 'B', loser: 'A', method: 'total', tiebreakRounds: 0 };
  }
  if (input.defenderHasDefensiveEdge) {
    return { winner: 'B', loser: 'A', method: 'defensive_edge', tiebreakRounds: 0 };
  }

  const rolls = input.tiebreakRolls ?? [];
  for (let index = 0; index < rolls.length; index += 1) {
    const [attackerRoll, defenderRoll] = rolls[index];
    assertDie(attackerRoll);
    assertDie(defenderRoll);
    if (attackerRoll > defenderRoll) {
      return { winner: 'A', loser: 'B', method: 'tiebreak_roll', tiebreakRounds: index + 1 };
    }
    if (defenderRoll > attackerRoll) {
      return { winner: 'B', loser: 'A', method: 'tiebreak_roll', tiebreakRounds: index + 1 };
    }
  }
  throw new Error('A tied battle without Defensive Edge requires a decisive unmodified Tiebreak Roll.');
}

export function applyBattleOutcome(battle: BattleState, outcome: BattleOutcome): BattleState {
  if (battle.stage !== 'active' && battle.stage !== 'onset') {
    throw new Error('A battle outcome may be applied only after Onset.');
  }
  const winner = outcome.winner === 'A' ? battle.attacker : battle.defender;
  const loser = outcome.loser === 'A' ? battle.attacker : battle.defender;
  const positions = { ...battle.positions };
  positions[loser] = retreatPosition(loser, positions[loser], battle.territoryCount);
  positions[winner] = battle.contestedPosition;

  return {
    ...battle,
    stage: 'resolved',
    winner,
    loser,
    occupier: winner === battle.attacker && battle.defenderControlsContested ? winner : null,
    positions,
    clearCommittedCards: true,
  };
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
    positions[battle.defender] = retreatPosition(
      battle.defender,
      battle.contestedPosition,
      battle.territoryCount,
    );
  }
  if (!withdrawing.has(battle.attacker)) positions[battle.attacker] = battle.contestedPosition;
  if (!withdrawing.has(battle.defender)) positions[battle.defender] = battle.contestedPosition;

  const defenderOnly = withdrawing.size === 1 && withdrawing.has(battle.defender);
  return {
    ...battle,
    stage: 'withdrawn',
    winner: null,
    loser: null,
    occupier: defenderOnly && battle.defenderControlsContested ? battle.attacker : null,
    positions,
    completeNonResultAftermath: afterOnset,
    clearCommittedCards: afterOnset,
  };
}

export function retreatPosition(player: PlayerId, position: number, territoryCount: number): number {
  assertPosition(position, territoryCount, `${player} Position`);
  return player === 'A'
    ? Math.max(0, position - 1)
    : Math.min(territoryCount - 1, position + 1);
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

function assertPosition(value: number, territoryCount: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value >= territoryCount) {
    throw new Error(`${label} must be a valid Territory index.`);
  }
}

function assertDie(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error('Tiebreak Rolls must be unmodified d6 results.');
  }
}
