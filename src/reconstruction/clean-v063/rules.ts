import {
  applyNormalCapture,
  createPendingBattle,
  createTurnState as createCleanV062TurnState,
  finalTerritoryAtOpponentEnd,
  outsideOwnEnd,
  type BattleState,
  type FrontLineState,
  type MovementChoice,
  type PlayerId,
  type TurnState,
} from '../clean-v062/rules';

export * from '../clean-v062/rules';

export const CLEAN_V063_SETUP_SEQUENCE = [
  'prepare_faction_components',
  'shuffle_deck_to_draw_pile',
  'draw_four',
  'discard_one_face_up',
  'arrange_territories',
  'form_and_reveal_gauntlet',
  'place_player_tokens',
  'determine_first_player',
] as const;

export interface OpeningSelection {
  hand: string[];
  discardPile: string[];
  drawPile: string[];
  openingDiscard: string;
}

export function resolveOpeningSelection(shuffledDeck: readonly string[], discardIndex: number): OpeningSelection {
  if (shuffledDeck.length < 4) throw new Error('Opening selection requires at least four cards in the Draw Pile.');
  if (!Number.isInteger(discardIndex) || discardIndex < 0 || discardIndex > 3) throw new Error('Opening discard must identify one of the four drawn cards.');
  const openingFour = shuffledDeck.slice(0, 4);
  const openingDiscard = openingFour[discardIndex];
  return {
    hand: openingFour.filter((_, index) => index !== discardIndex),
    discardPile: [openingDiscard],
    drawPile: shuffledDeck.slice(4),
    openingDiscard,
  };
}

export function arrangeOpeningTerritories(selected: readonly string[], arranged: readonly string[]): string[] {
  if (selected.length !== 3 || arranged.length !== 3) throw new Error('Each player must select and arrange exactly three Territories.');
  const counts = new Map<string, number>();
  for (const value of selected) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const value of arranged) counts.set(value, (counts.get(value) ?? 0) - 1);
  if (![...counts.values()].every((count) => count === 0)) throw new Error('Territory arrangement must contain exactly the three selected Territories.');
  return [...arranged];
}

export interface SetupPlacement {
  positions: Record<PlayerId, number>;
  movementOccurred: false;
  enteredTerritory: false;
}

export function placeStartingTokens(territoryCount = 6): SetupPlacement {
  assertTerritoryCount(territoryCount);
  return { positions: { A: 0, B: territoryCount - 1 }, movementOccurred: false, enteredTerritory: false };
}

export function createInitialV063FrontLineState(territoryCount = 6, territoriesPerPlayer = 3): FrontLineState {
  assertTerritoryCount(territoryCount);
  if (!Number.isInteger(territoriesPerPlayer) || territoriesPerPlayer < 1 || territoriesPerPlayer * 2 !== territoryCount) {
    throw new Error('Standard clean v0.6.3 setup requires both complete Territory sets to fill the Gauntlet.');
  }
  return { territoryCount, control: { A: territoriesPerPlayer, B: territoriesPerPlayer }, position: placeStartingTokens(territoryCount).positions };
}

export function determineFirstPlayer(rolls: Record<PlayerId, number>): PlayerId {
  assertDie(rolls.A); assertDie(rolls.B);
  if (rolls.A === rolls.B) throw new Error('Tied first-player rolls must be rerolled.');
  return rolls.A > rolls.B ? 'A' : 'B';
}

export type V063VictoryRoute = 'final_territory_capture' | 'last_stand';
export interface V063RunTheGauntletVictory { winner: PlayerId; route: V063VictoryRoute; immediate: true; }

export function victoryFromFinalTerritoryCapture(player: PlayerId): V063RunTheGauntletVictory {
  return { winner: player, route: 'final_territory_capture', immediate: true };
}

export function victoryFromLastStand(winner: PlayerId, defender: PlayerId): V063RunTheGauntletVictory | null {
  return winner === defender ? null : { winner, route: 'last_stand', immediate: true };
}

export function victoryAfterFrontLineAdvance(state: FrontLineState, player: PlayerId): V063RunTheGauntletVictory | null {
  return state.control[player] === state.territoryCount ? victoryFromFinalTerritoryCapture(player) : null;
}

export function applyV063Capture(state: FrontLineState, player: PlayerId) {
  const result = applyNormalCapture(state, player);
  return { ...result, victory: victoryAfterFrontLineAdvance(result.state, player) };
}

export function retreatFromOwnFinalTerritoryBeyondGauntlet(player: PlayerId, position: number, territoryCount: number): number {
  const ownFinal = player === 'A' ? 0 : territoryCount - 1;
  if (position !== ownFinal) throw new Error('Edge retreat applies only from the retreating player’s own final Territory.');
  return outsideOwnEnd(player, territoryCount);
}

export function isBeyondOwnEnd(player: PlayerId, position: number, territoryCount: number): boolean {
  return position === outsideOwnEnd(player, territoryCount);
}

export interface V063LastStandAccessInput {
  attacker: PlayerId;
  defender: PlayerId;
  territoryCount: number;
  attackerPosition: number;
  defenderPosition: number;
  separateMovementSequence: boolean;
  advancingBeyondOpponentEnd: boolean;
}

export function canInitiateV063LastStand(input: V063LastStandAccessInput): boolean {
  if (input.attacker === input.defender) return false;
  assertTerritoryCount(input.territoryCount);
  const defenderFinal = finalTerritoryAtOpponentEnd(input.attacker, input.territoryCount);
  return input.attackerPosition === defenderFinal
    && input.defenderPosition === outsideOwnEnd(input.defender, input.territoryCount)
    && input.separateMovementSequence
    && input.advancingBeyondOpponentEnd;
}

export function createV063LastStandBattle(input: V063LastStandAccessInput): BattleState {
  if (!canInitiateV063LastStand(input)) throw new Error('Last Stand requires the defender beyond their end and a separate legal Advance beyond that end.');
  const contestedPosition = outsideOwnEnd(input.defender, input.territoryCount);
  return createPendingBattle({
    territoryCount: input.territoryCount,
    attacker: input.attacker,
    defender: input.defender,
    attackerOrigin: input.attackerPosition,
    contestedPosition,
    positions: { [input.attacker]: contestedPosition, [input.defender]: input.defenderPosition } as Record<PlayerId, number>,
    defenderControlsContested: false,
    lastStand: true,
  });
}

export type MovementSequenceSource = 'normal' | 'effect';
export interface CleanV063TurnState extends TurnState { movementSequenceSource: MovementSequenceSource | null; }

export function createCleanV063TurnState(additionalActions = 0): CleanV063TurnState {
  return { ...createCleanV062TurnState(additionalActions), movementSequenceSource: null };
}

export function beginEffectGrantedMovement(state: TurnState, movement = 1): CleanV063TurnState {
  const amount = nonnegativeInteger(movement);
  if (amount < 1) throw new Error('Effect-granted movement must grant at least one movement.');
  return { ...state, movementRemaining: amount, movementSequenceOpen: true, pendingBattleCreated: false, movementSequenceSource: 'effect' };
}

export function beginNormalV063Movement(state: TurnState, additionalMovement = 0): CleanV063TurnState {
  if (state.phase !== 'movement') throw new Error('Normal movement begins only during the Movement phase.');
  return { ...state, movementRemaining: 1 + nonnegativeInteger(additionalMovement), movementSequenceOpen: true, pendingBattleCreated: false, movementSequenceSource: 'normal' };
}

export function applyV063MovementChoice(state: CleanV063TurnState, choice: MovementChoice, options: { createsPendingBattle?: boolean } = {}): CleanV063TurnState {
  if (!state.movementSequenceOpen || !state.movementSequenceSource) throw new Error('No movement sequence is currently open.');
  if (state.movementSequenceSource === 'normal' && state.phase !== 'movement') throw new Error('Normal movement is legal only during the Movement phase.');
  if (choice === 'hold') return { ...state, movementRemaining: 0, movementSequenceOpen: false, movementSequenceSource: null };
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

function nonnegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
function assertTerritoryCount(value: number): void {
  if (!Number.isInteger(value) || value < 2) throw new Error('territoryCount must be an integer of at least two.');
}
function assertDie(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 6) throw new Error('First-player rolls must be d6 results.');
}
