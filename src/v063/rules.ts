import {
  createTurnState as createV062TurnState,
  type FrontLineState,
  type MovementChoice,
  type PlayerId,
  type TurnState,
} from '../v062/rules';

export * from '../v062/rules';

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

export interface SetupPlacement {
  positions: Record<PlayerId, number>;
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
  assertDie(rolls.A);
  assertDie(rolls.B);
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
 * Capture the next contiguous Territory supported by the player's Position.
 * Unlike the older neutral-gap experiment, capturing an opposing frontier
 * Territory transfers that Territory out of the opponent's Front Line.
 */
export function applyV063Capture(state: FrontLineState, player: PlayerId): V063CaptureResolution {
  assertV063FrontLine(state);
  const opponent: PlayerId = player === 'A' ? 'B' : 'A';
  const target = player === 'A'
    ? state.control.A
    : state.territoryCount - state.control.B - 1;

  if (target < 0 || target >= state.territoryCount) {
    return { state: cloneFrontLine(state), capturedTerritory: null, victory: null };
  }
  const supportsCapture = player === 'A'
    ? state.position.A >= target
    : state.position.B <= target;
  if (!supportsCapture) {
    return { state: cloneFrontLine(state), capturedTerritory: null, victory: null };
  }

  const opponentControlsTarget = controlsIndex(state, opponent, target);
  const next: FrontLineState = {
    ...cloneFrontLine(state),
    control: {
      ...state.control,
      [player]: state.control[player] + 1,
      [opponent]: opponentControlsTarget ? state.control[opponent] - 1 : state.control[opponent],
    },
  };
  assertV063FrontLine(next);
  const won = next.control[player] === next.territoryCount;
  return {
    state: next,
    capturedTerritory: target,
    victory: won ? victoryFromFinalTerritoryCapture(player) : null,
  };
}

export type ExtendedPosition = number;

export function retreatFromOwnFinalTerritoryBeyondGauntlet(
  player: PlayerId,
  position: ExtendedPosition,
  territoryCount: number,
): ExtendedPosition {
  assertTerritoryCount(territoryCount);
  const ownFinal = player === 'A' ? 0 : territoryCount - 1;
  if (position !== ownFinal) throw new Error('Edge retreat applies only from the retreating player’s own final Territory.');
  return player === 'A' ? -1 : territoryCount;
}

export function isBeyondOwnEnd(player: PlayerId, position: ExtendedPosition, territoryCount: number): boolean {
  assertTerritoryCount(territoryCount);
  return player === 'A' ? position === -1 : position === territoryCount;
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
  const defenderFinalTerritory = input.defender === 'A' ? 0 : input.territoryCount - 1;
  return input.attackerPosition === defenderFinalTerritory
    && isBeyondOwnEnd(input.defender, input.defenderPosition, input.territoryCount)
    && input.separateMovementSequence
    && input.advancingBeyondOpponentEnd;
}

export type MovementSequenceSource = 'normal' | 'effect';

export interface V063TurnState extends TurnState {
  movementSequenceSource: MovementSequenceSource | null;
}

export function createV063TurnState(additionalActions = 0): V063TurnState {
  return { ...createV062TurnState(additionalActions), movementSequenceSource: null };
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
    movementSequenceOpen: createsPendingBattle ? false : remaining > 0,
    movementSequenceSource: createsPendingBattle || remaining === 0 ? null : state.movementSequenceSource,
    pendingBattleCreated: createsPendingBattle,
  };
}

function controlsIndex(state: FrontLineState, player: PlayerId, index: number): boolean {
  if (player === 'A') return index >= 0 && index < state.control.A;
  return index >= state.territoryCount - state.control.B && index < state.territoryCount;
}

function assertV063FrontLine(state: FrontLineState): void {
  assertTerritoryCount(state.territoryCount);
  for (const player of ['A', 'B'] as const) {
    const controlled = state.control[player];
    const position = state.position[player];
    if (!Number.isInteger(controlled) || controlled < 0 || controlled > state.territoryCount) {
      throw new Error(`${player} has an invalid Front Line length.`);
    }
    if (!Number.isInteger(position) || position < 0 || position >= state.territoryCount) {
      throw new Error(`${player} has an invalid in-Gauntlet Position.`);
    }
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

function assertTerritoryCount(value: number): void {
  if (!Number.isInteger(value) || value < 2) throw new Error('territoryCount must be an integer of at least two.');
}

function assertDie(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 6) throw new Error('First-player rolls must be d6 results.');
}
