export type PlayerId = 'A' | 'B';
export type TurnPhase = 'capture' | 'draw' | 'opening' | 'movement' | 'denouement' | 'cleanup';
export type MovementChoice = 'advance' | 'hold' | 'fall_back';

export interface TurnState {
  phase: TurnPhase;
  actionsAvailable: number;
  actionsTaken: Record<'opening' | 'denouement', number>;
  movementRemaining: number;
  movementSequenceOpen: boolean;
  pendingBattleCreated: boolean;
}

export const V063_TURN_SEQUENCE: readonly TurnPhase[] = [
  'capture',
  'draw',
  'opening',
  'movement',
  'denouement',
  'cleanup',
] as const;

export const V063_SETUP_SEQUENCE = [
  'prepare_faction_components',
  'shuffle_deck_to_draw_pile',
  'draw_four',
  'discard_one_face_up',
  'arrange_territories',
  'form_and_reveal_gauntlet',
  'place_player_tokens',
  'determine_first_player',
] as const;

export type V063SetupStep = typeof V063_SETUP_SEQUENCE[number];

export interface OpeningSelection {
  hand: string[];
  discardPile: string[];
  drawPile: string[];
  openingDiscard: string;
}

/**
 * Resolve the mandatory v0.6.3 opening selection against an already-shuffled
 * Deck. The top four cards are drawn, one is discarded face up, and the other
 * three become the opening Hand. discardIndex is the index within those four,
 * which keeps duplicate card titles unambiguous for deterministic replays.
 */
export function resolveOpeningSelection(shuffledDeck: readonly string[], discardIndex: number): OpeningSelection {
  if (shuffledDeck.length < 4) throw new Error('Opening selection requires at least four cards in the Draw Pile.');
  if (!Number.isInteger(discardIndex) || discardIndex < 0 || discardIndex > 3) {
    throw new Error('Opening discard must identify one of the four drawn cards.');
  }
  const openingFour = shuffledDeck.slice(0, 4);
  const openingDiscard = openingFour[discardIndex];
  return {
    hand: openingFour.filter((_, index) => index !== discardIndex),
    discardPile: [openingDiscard],
    drawPile: shuffledDeck.slice(4),
    openingDiscard,
  };
}

export function arrangeOpeningTerritories(
  selectedTerritories: readonly string[],
  arrangedTerritories: readonly string[],
): string[] {
  if (selectedTerritories.length !== 3 || arrangedTerritories.length !== 3) {
    throw new Error('Each player must select and arrange exactly three Territories.');
  }
  if (!sameMultiset(selectedTerritories, arrangedTerritories)) {
    throw new Error('Territory arrangement must contain exactly the three selected Territories.');
  }
  return [...arrangedTerritories];
}

export type ExtendedPosition = number;

export interface FrontLineState {
  territoryCount: number;
  control: Record<PlayerId, number>;
  position: Record<PlayerId, ExtendedPosition>;
}

export interface SetupPlacement {
  positions: Record<PlayerId, ExtendedPosition>;
  movementOccurred: false;
  enteredTerritory: false;
}

export function placeStartingTokens(territoryCount = 6): SetupPlacement {
  assertTerritoryCount(territoryCount);
  return {
    positions: { A: 0, B: territoryCount - 1 },
    movementOccurred: false,
    enteredTerritory: false,
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
    throw new Error('The standard v0.6.3 Gauntlet must contain both players’ complete Territory sets.');
  }
  return {
    territoryCount,
    control: { A: territoriesPerPlayer, B: territoriesPerPlayer },
    position: placeStartingTokens(territoryCount).positions,
  };
}

export function determineFirstPlayer(rolls: Record<PlayerId, number>): PlayerId {
  assertDie(rolls.A, 'First-player rolls');
  assertDie(rolls.B, 'First-player rolls');
  if (rolls.A === rolls.B) throw new Error('Tied first-player rolls must be rerolled.');
  return rolls.A > rolls.B ? 'A' : 'B';
}

export type RunTheGauntletRoute = 'final_territory_capture' | 'last_stand';

export interface RunTheGauntletVictory {
  winner: PlayerId;
  route: RunTheGauntletRoute;
  immediate: true;
}

export function victoryFromFinalTerritoryCapture(player: PlayerId): RunTheGauntletVictory {
  return { winner: player, route: 'final_territory_capture', immediate: true };
}

export function victoryFromLastStand(winner: PlayerId, defender: PlayerId): RunTheGauntletVictory | null {
  if (winner === defender) return null;
  return { winner, route: 'last_stand', immediate: true };
}

export interface V063CaptureResolution {
  state: FrontLineState;
  capturedTerritory: number | null;
  victory: RunTheGauntletVictory | null;
}

/**
 * During Capture, add at most the next opposing Territory immediately beyond
 * the active player's Front Line. Deep Position never skips intervening control.
 */
export function applyV063Capture(state: FrontLineState, player: PlayerId): V063CaptureResolution {
  assertV063FrontLine(state);
  const opponent = otherPlayer(player);
  const target = player === 'A'
    ? state.control.A
    : state.territoryCount - state.control.B - 1;

  if (!isTerritoryIndex(target, state.territoryCount)) {
    return { state: cloneFrontLine(state), capturedTerritory: null, victory: null };
  }
  const supportsCapture = player === 'A'
    ? state.position.A >= target
    : state.position.B <= target;
  if (!supportsCapture || !controlsIndex(state, opponent, target)) {
    return { state: cloneFrontLine(state), capturedTerritory: null, victory: null };
  }

  const next: FrontLineState = {
    ...cloneFrontLine(state),
    control: {
      ...state.control,
      [player]: state.control[player] + 1,
      [opponent]: state.control[opponent] - 1,
    },
  };
  assertV063FrontLine(next);
  return {
    state: next,
    capturedTerritory: target,
    victory: next.control[player] === next.territoryCount
      ? victoryFromFinalTerritoryCapture(player)
      : null,
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

export function outsideOpponentEnd(player: PlayerId, territoryCount: number): ExtendedPosition {
  return outsideOwnEnd(otherPlayer(player), territoryCount);
}

export function retreatV063Position(
  player: PlayerId,
  position: ExtendedPosition,
  territoryCount: number,
): ExtendedPosition {
  assertExtendedPosition(position, territoryCount, `${player} Position`);
  return player === 'A'
    ? Math.max(-1, position - 1)
    : Math.min(territoryCount, position + 1);
}

export function retreatFromOwnFinalTerritoryBeyondGauntlet(
  player: PlayerId,
  position: ExtendedPosition,
  territoryCount: number,
): ExtendedPosition {
  assertTerritoryCount(territoryCount);
  const ownFinal = player === 'A' ? 0 : territoryCount - 1;
  if (position !== ownFinal) throw new Error('Edge retreat applies only from the retreating player’s own final Territory.');
  return retreatV063Position(player, position, territoryCount);
}

export function isBeyondOwnEnd(player: PlayerId, position: ExtendedPosition, territoryCount: number): boolean {
  return position === outsideOwnEnd(player, territoryCount);
}

export interface LastStandAccessInput {
  attacker: PlayerId;
  defender: PlayerId;
  territoryCount: number;
  attackerPosition: ExtendedPosition;
  defenderPosition: ExtendedPosition;
  separateMovementSequence: boolean;
  advancingBeyondOpponentEnd: boolean;
}

export function canInitiateLastStand(input: LastStandAccessInput): boolean {
  if (input.attacker === input.defender) return false;
  assertTerritoryCount(input.territoryCount);
  return input.attackerPosition === finalTerritoryAtOpponentEnd(input.attacker, input.territoryCount)
    && input.defenderPosition === outsideOwnEnd(input.defender, input.territoryCount)
    && input.separateMovementSequence
    && input.advancingBeyondOpponentEnd;
}

export type V063BattleStage = 'pending' | 'onset' | 'active' | 'resolved' | 'withdrawn';

export interface V063PendingBattleInput {
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

export interface V063BattleState extends V063PendingBattleInput {
  lastStand: boolean;
  defensiveEdgeRemoved: boolean;
  stage: V063BattleStage;
  termsAccepted: boolean | null;
  winner: PlayerId | null;
  loser: PlayerId | null;
  occupier: PlayerId | null;
  positions: Record<PlayerId, ExtendedPosition>;
  completeNonResultAftermath: boolean;
  clearCommittedCards: boolean;
}

export interface V063BattleOutcomeInput {
  attacker: PlayerId;
  defender: PlayerId;
  attackerTotal: number;
  defenderTotal: number;
  defenderHasDefensiveEdge: boolean;
  tiebreakRolls?: readonly [number, number][];
}

export interface V063BattleOutcome {
  winner: PlayerId;
  loser: PlayerId;
  method: 'total' | 'defensive_edge' | 'tiebreak_roll';
  tiebreakRounds: number;
}

export interface V063BattleResolution {
  state: V063BattleState;
  victory: RunTheGauntletVictory | null;
}

export function createV063PendingBattle(input: V063PendingBattleInput): V063BattleState {
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
    throw new Error('A pending battle requires both Player Tokens at the contested Position.');
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

export function createV063LastStandBattle(input: LastStandAccessInput): V063BattleState {
  if (!canInitiateLastStand(input)) {
    throw new Error('Last Stand requires the defender beyond their end and a separate legal Advance beyond that end.');
  }
  const contestedPosition = outsideOwnEnd(input.defender, input.territoryCount);
  return createV063PendingBattle({
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

export function defenderHasV063DefensiveEdge(battle: V063BattleState): boolean {
  return !battle.defensiveEdgeRemoved && (battle.defenderControlsContested || battle.lastStand);
}

export function beginV063Onset(battle: V063BattleState): V063BattleState {
  if (battle.stage !== 'pending') throw new Error('Onset begins only from a pending battle.');
  return { ...battle, stage: 'onset' };
}

export function beginV063ActiveBattle(battle: V063BattleState): V063BattleState {
  if (battle.stage !== 'onset') throw new Error('The active battle proceeds after Onset.');
  return { ...battle, stage: 'active' };
}

export function resolveV063BattleOutcome(input: V063BattleOutcomeInput): V063BattleOutcome {
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

export function applyV063BattleOutcome(
  battle: V063BattleState,
  outcome: V063BattleOutcome,
): V063BattleResolution {
  if (battle.stage !== 'active') throw new Error('A battle outcome may be applied only after the active battle sequence.');
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
  const state: V063BattleState = {
    ...battle,
    stage: 'resolved',
    winner: outcome.winner,
    loser: outcome.loser,
    occupier,
    positions,
    clearCommittedCards: true,
  };
  return {
    state,
    victory: battle.lastStand && attackerWon
      ? victoryFromLastStand(battle.attacker, battle.defender)
      : null,
  };
}

export function resolveV063Withdrawal(
  battle: V063BattleState,
  withdrawingPlayers: readonly PlayerId[],
): V063BattleState {
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
    stage: 'withdrawn',
    winner: null,
    loser: null,
    occupier,
    positions,
    completeNonResultAftermath: afterOnset,
    clearCommittedCards: afterOnset,
  };
}

export type MovementSequenceSource = 'normal' | 'effect';

export interface V063TurnState extends TurnState {
  movementSequenceSource: MovementSequenceSource | null;
}

export function createV063TurnState(additionalActions = 0): V063TurnState {
  return {
    phase: 'capture',
    actionsAvailable: 1 + nonnegativeInteger(additionalActions),
    actionsTaken: { opening: 0, denouement: 0 },
    movementRemaining: 0,
    movementSequenceOpen: false,
    pendingBattleCreated: false,
    movementSequenceSource: null,
  };
}

export function advanceV063TurnPhase(state: V063TurnState): V063TurnState {
  const index = V063_TURN_SEQUENCE.indexOf(state.phase);
  if (index < 0 || index === V063_TURN_SEQUENCE.length - 1) return { ...state };
  return {
    ...state,
    phase: V063_TURN_SEQUENCE[index + 1],
    movementRemaining: 0,
    movementSequenceOpen: false,
    pendingBattleCreated: false,
    movementSequenceSource: null,
  };
}

export function beginEffectGrantedMovement(state: TurnState, movement = 1): V063TurnState {
  const amount = nonnegativeInteger(movement);
  if (amount < 1) throw new Error('Effect-granted movement must grant at least one movement.');
  return {
    ...state,
    movementRemaining: amount,
    movementSequenceOpen: true,
    pendingBattleCreated: false,
    movementSequenceSource: 'effect',
  };
}

export function beginNormalV063Movement(state: TurnState, additionalMovement = 0): V063TurnState {
  if (state.phase !== 'movement') throw new Error('Normal movement begins only during the Movement phase.');
  return {
    ...state,
    movementRemaining: 1 + nonnegativeInteger(additionalMovement),
    movementSequenceOpen: true,
    pendingBattleCreated: false,
    movementSequenceSource: 'normal',
  };
}

export function applyV063MovementChoice(
  state: V063TurnState,
  choice: MovementChoice,
  options: { createsPendingBattle?: boolean } = {},
): V063TurnState {
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
  const createsPendingBattle = Boolean(options.createsPendingBattle);
  const remaining = createsPendingBattle ? 0 : state.movementRemaining - 1;
  return {
    ...state,
    movementRemaining: remaining,
    movementSequenceOpen: !createsPendingBattle && remaining > 0,
    movementSequenceSource: createsPendingBattle || remaining === 0 ? null : state.movementSequenceSource,
    pendingBattleCreated: createsPendingBattle,
  };
}

export function otherPlayer(player: PlayerId): PlayerId {
  return player === 'A' ? 'B' : 'A';
}

function controlsIndex(state: FrontLineState, player: PlayerId, index: number): boolean {
  if (player === 'A') return index >= 0 && index < state.control.A;
  return index >= state.territoryCount - state.control.B && index < state.territoryCount;
}

function assertV063FrontLine(state: FrontLineState): void {
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

function cloneFrontLine(state: FrontLineState): FrontLineState {
  return {
    territoryCount: state.territoryCount,
    control: { ...state.control },
    position: { ...state.position },
  };
}

function assertOutcomeMatchesBattle(battle: V063BattleState, outcome: V063BattleOutcome): void {
  const players = new Set([battle.attacker, battle.defender]);
  if (outcome.winner === outcome.loser || !players.has(outcome.winner) || !players.has(outcome.loser)) {
    throw new Error('Battle outcome winner and loser must match the battle participants.');
  }
}

function sameMultiset(left: readonly string[], right: readonly string[]): boolean {
  const counts = new Map<string, number>();
  for (const value of left) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const value of right) counts.set(value, (counts.get(value) ?? 0) - 1);
  return [...counts.values()].every((count) => count === 0);
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

function assertDie(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error(`${label} must be unmodified d6 results.`);
  }
}
