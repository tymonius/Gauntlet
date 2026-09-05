/**
 * Transitional type-only bridge for the still-active v0.6.3 migration layer.
 *
 * The executable v0.6.2 migration implementation and its tests are preserved
 * under legacy/digital-engine-migration/v0.6.2/. Do not add behavior here.
 * When the remaining v0.6.3 procedures are promoted or retired, remove this
 * bridge with their final dependency on the v0.6.2 type shapes.
 */
export type PlayerId = 'A' | 'B';
export type TurnPhase = 'capture' | 'draw' | 'opening' | 'movement' | 'denouement' | 'cleanup';
export type ActionPhase = 'opening' | 'denouement';
export type MovementChoice = 'advance' | 'hold' | 'fall_back';
export type BattleStage = 'pending' | 'onset' | 'active' | 'resolved' | 'withdrawn';

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
