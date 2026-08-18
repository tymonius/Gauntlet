import type { V063CanonicalCard } from '../content/v063';
import {
  retreatV063Position,
  type FrontLineState,
  type PlayerId,
} from './rules';

export function hasInherentBankAction(card: Pick<V063CanonicalCard, 'effects'>): boolean {
  return card.effects.some((effect) => effect.label === 'Asset');
}

export function actionCostForDirectCardProcedure(input: {
  directlyPermittedByRuleOrEffect: boolean;
  expresslyUsesAction?: boolean;
}): 0 | 1 {
  if (input.expresslyUsesAction) return 1;
  return input.directlyPermittedByRuleOrEffect ? 0 : 1;
}

export type TacticSource = 'Reserve' | 'Hand' | 'specified cards' | 'stored card';

export interface AdditionalTacticPermission {
  amount: number;
  source: TacticSource;
  faceUpAfterReveal: boolean;
  reopensEarlierWindows: false;
  normalTacticDestination: true;
}

export function additionalTacticPermission(
  amount = 1,
  source: TacticSource = 'Reserve',
  afterTacticsRevealed = false,
): AdditionalTacticPermission {
  const normalized = nonnegativeInteger(amount);
  if (normalized < 1) throw new Error('An additional-Tactic permission must add at least one Tactic.');
  return {
    amount: normalized,
    source,
    faceUpAfterReveal: afterTacticsRevealed,
    reopensEarlierWindows: false,
    normalTacticDestination: true,
  };
}

export interface BoundCardState {
  cardId: string;
  owner: PlayerId;
}

/** Shared v0.6.3 default when a host card leaves play without another instruction. */
export function defaultBoundCardDestinationWhenBindingEnds(
  boundCards: readonly BoundCardState[],
): Record<PlayerId, string[]> {
  return {
    A: boundCards.filter((card) => card.owner === 'A').map((card) => card.cardId),
    B: boundCards.filter((card) => card.owner === 'B').map((card) => card.cardId),
  };
}

export interface RevealStageEffect {
  id: string;
  interferesWithAnotherRevealedCard: boolean;
}

export function orderRevealStageEffects<T extends RevealStageEffect>(effects: readonly T[]): T[] {
  return [
    ...effects.filter((effect) => effect.interferesWithAnotherRevealedCard),
    ...effects.filter((effect) => !effect.interferesWithAnotherRevealedCard),
  ];
}

// --- Invasion -------------------------------------------------------------

export type V063ActionPhase = 'opening' | 'denouement';

export interface InvasionActionEffect {
  additionalAdvance: 2;
  advanceOnly: true;
  endsOnPendingBattle: true;
}

/**
 * Invasion has no printed Opening-only play restriction in v0.6.3. The normal
 * Action system decides whether the card can be played; if its effect is active,
 * the extra movement is available only during that turn's Movement sequence.
 */
export function activateInvasionAction(_phase?: V063ActionPhase): InvasionActionEffect {
  return {
    additionalAdvance: 2,
    advanceOnly: true,
    endsOnPendingBattle: true,
  };
}

export interface BattleLimits {
  reserveLimit: number;
  tacticLimit: number;
}

export function applyInvasionBattleMode(
  limits: BattleLimits,
  role: 'attacker' | 'defender',
): BattleLimits {
  if (role !== 'attacker') return { ...limits };
  return {
    reserveLimit: limits.reserveLimit + 1,
    tacticLimit: limits.tacticLimit + 1,
  };
}

// --- Landslide ------------------------------------------------------------

export interface LandslideOverlayState {
  territoryCount: number;
  overlays: Partial<Record<number, PlayerId>>;
}

export interface LandslideResolution {
  state: LandslideOverlayState;
  position: number;
  discardedOwners: PlayerId[];
}

export function placeLandslide(
  state: LandslideOverlayState,
  owner: PlayerId,
  territoryIndex: number,
): LandslideOverlayState {
  assertTerritory(territoryIndex, state.territoryCount);
  if (state.overlays[territoryIndex]) {
    throw new Error('A Territory may have no more than one Landslide.');
  }
  return {
    ...state,
    overlays: {
      ...state.overlays,
      [territoryIndex]: owner,
    },
  };
}

export function placeLandslideAfterBattle(
  state: LandslideOverlayState,
  owner: PlayerId,
  input: { lost: boolean; retreated: boolean; contestedPosition: number },
): LandslideOverlayState {
  if (!input.lost || !input.retreated) {
    throw new Error('Landslide Battle mode requires losing and retreating from the contested Territory.');
  }
  return placeLandslide(state, owner, input.contestedPosition);
}

/**
 * Resolve only retreat-triggered Landslides. Fall Back and withdrawal do not
 * call this procedure. Additional retreat may legally carry a player beyond
 * their own end of the Gauntlet under the v0.6.3 edge-retreat rules.
 */
export function resolveLandslideRetreatChain(
  state: LandslideOverlayState,
  retreatingPlayer: PlayerId,
  landedPosition: number,
): LandslideResolution {
  assertTerritory(landedPosition, state.territoryCount);
  const overlays = { ...state.overlays };
  const discardedOwners: PlayerId[] = [];
  let position = landedPosition;

  while (overlays[position]) {
    const owner = overlays[position] as PlayerId;
    delete overlays[position];
    discardedOwners.push(owner);
    position = retreatV063Position(retreatingPlayer, position, state.territoryCount);
  }

  return {
    state: { ...state, overlays },
    position,
    discardedOwners,
  };
}

// --- Détente --------------------------------------------------------------

export interface DetenteState {
  banked: boolean;
  lastTriggeredTurn: number | null;
}

export function bankDetente(state: DetenteState): DetenteState {
  if (state.banked) throw new Error('You may have only one banked Détente.');
  return { banked: true, lastTriggeredTurn: state.lastTriggeredTurn };
}

export function resolveDetenteAcceptance(
  state: DetenteState,
  input: { turnNumber: number; proposalWasRatifiedWhenOffered: boolean },
): { state: DetenteState; influenceGained: number } {
  if (!state.banked || !input.proposalWasRatifiedWhenOffered || state.lastTriggeredTurn === input.turnNumber) {
    return { state: { ...state }, influenceGained: 0 };
  }
  return {
    state: { ...state, lastTriggeredTurn: input.turnNumber },
    influenceGained: 1,
  };
}

// --- Compound Interest ----------------------------------------------------

export interface CompoundInterestZones {
  drawPile: string[];
  treasury: string[];
  discardPile: string[];
}

export function resolveCompoundInterest(
  zones: CompoundInterestZones,
  input: {
    banked: boolean;
    afterNormalDraw: boolean;
    reveal: boolean;
    destination?: 'treasury' | 'discard';
  },
): { zones: CompoundInterestZones; revealedCard: string | null } {
  const unchanged = cloneCompoundZones(zones);
  if (!input.banked || !input.afterNormalDraw || zones.treasury.length === 0 || !input.reveal) {
    return { zones: unchanged, revealedCard: null };
  }
  const [revealedCard, ...drawPile] = zones.drawPile;
  if (!revealedCard) return { zones: unchanged, revealedCard: null };
  if (input.destination !== 'treasury' && input.destination !== 'discard') {
    throw new Error('A revealed Compound Interest card must enter Treasury or the Discard Pile.');
  }
  return {
    zones: {
      drawPile,
      treasury: input.destination === 'treasury' ? [...zones.treasury, revealedCard] : [...zones.treasury],
      discardPile: input.destination === 'discard' ? [...zones.discardPile, revealedCard] : [...zones.discardPile],
    },
    revealedCard,
  };
}

// --- Extraordinary Rendition ---------------------------------------------

export interface ExtraordinaryRenditionBoundCard {
  id: string;
  owner: PlayerId;
  faceUp: true;
}

export interface ExtraordinaryRenditionState {
  banked: boolean;
  boundCard: ExtraordinaryRenditionBoundCard | null;
}

export function bankExtraordinaryRendition(
  state: ExtraordinaryRenditionState,
  opponent: PlayerId,
  opponentHand: readonly string[],
  selectedCardId: string,
): { state: ExtraordinaryRenditionState; opponentHand: string[] } {
  if (state.banked) throw new Error('You may have only one banked Extraordinary Rendition.');
  const index = opponentHand.indexOf(selectedCardId);
  if (index < 0) throw new Error('The selected card must be in the opponent’s Hand.');
  return {
    state: {
      banked: true,
      boundCard: { id: selectedCardId, owner: opponent, faceUp: true },
    },
    opponentHand: opponentHand.filter((_, cardIndex) => cardIndex !== index),
  };
}

/** Order the Assets already determined to be discarded; Rendition must go first if present. */
export function extraordinaryRenditionDiscardOrder(assetNames: readonly string[]): string[] {
  const renditions = assetNames.filter((name) => name === 'Extraordinary Rendition');
  const others = assetNames.filter((name) => name !== 'Extraordinary Rendition');
  return [...renditions, ...others];
}

export function releaseExtraordinaryRendition(
  state: ExtraordinaryRenditionState,
  discardPiles: Record<PlayerId, string[]>,
): { state: ExtraordinaryRenditionState; discardPiles: Record<PlayerId, string[]> } {
  const result = {
    state: { banked: false, boundCard: null } as ExtraordinaryRenditionState,
    discardPiles: {
      A: [...discardPiles.A],
      B: [...discardPiles.B],
    },
  };
  if (state.boundCard) result.discardPiles[state.boundCard.owner].push(state.boundCard.id);
  return result;
}

// --- Nature's Altar -------------------------------------------------------

export interface NaturesAltarOverlay {
  owner: PlayerId;
  territoryIndex: number;
}

export function placeNaturesAltarByAction(
  owner: PlayerId,
  currentPosition: number,
  territoryIndex: number,
  territoryCount: number,
): NaturesAltarOverlay {
  assertTerritory(currentPosition, territoryCount);
  assertTerritory(territoryIndex, territoryCount);
  if (Math.abs(currentPosition - territoryIndex) > 1) {
    throw new Error("Nature's Altar Action may target only the current or an adjacent Territory.");
  }
  return { owner, territoryIndex };
}

export function placeNaturesAltarAfterBattle(
  owner: PlayerId,
  input: { won: boolean; contestedPosition: number; territoryCount: number },
): NaturesAltarOverlay {
  if (!input.won) throw new Error("Nature's Altar Battle mode requires winning the battle.");
  assertTerritory(input.contestedPosition, input.territoryCount);
  return { owner, territoryIndex: input.contestedPosition };
}

/** Overlay control follows the underlying Territory, not the card's owner. */
export function canBeginRiteFromNaturesAltar(
  overlay: NaturesAltarOverlay,
  frontLine: FrontLineState,
  input: { phase: V063ActionPhase; player: PlayerId; playerPosition: number },
): boolean {
  return input.phase === 'opening'
    && input.playerPosition === overlay.territoryIndex
    && controlsV063Territory(frontLine, input.player, overlay.territoryIndex);
}

export function canCompleteAltarRiteThisTurn(
  overlay: NaturesAltarOverlay,
  frontLine: FrontLineState,
  input: { player: PlayerId; completionConditionSatisfied: boolean; completionTimingReached: boolean },
): boolean {
  return input.completionConditionSatisfied
    && input.completionTimingReached
    && controlsV063Territory(frontLine, input.player, overlay.territoryIndex);
}

// --- Martyrdom ------------------------------------------------------------

export interface MartyrdomState {
  hand: string[];
  graveyard: string[];
  conviction: number;
  opponentReserve: string[];
  opponentDiscardPile: string[];
  opponentGraveyard: string[];
  battleResult: 'loss' | 'win' | 'withdrawal';
  retreatRequired: boolean;
  occupationApplies: boolean;
  martyrdomPendingAfterClear?: boolean;
  opponentReserveDestination?: 'discard' | 'graveyard';
}

/** Play Martyrdom during the Aftermath before battle cards are cleared. */
export function playMartyrdomBeforeBattleCardsClear(state: MartyrdomState): MartyrdomState {
  if (state.battleResult !== 'loss') throw new Error('Martyrdom may be played only after losing a battle.');
  if (state.martyrdomPendingAfterClear) throw new Error('Martyrdom is already awaiting post-clear resolution.');
  const index = state.hand.indexOf('Martyrdom');
  if (index < 0) throw new Error('Martyrdom must be in Hand.');
  return {
    ...state,
    hand: state.hand.filter((_, cardIndex) => cardIndex !== index),
    martyrdomPendingAfterClear: true,
    opponentReserveDestination: 'graveyard',
  };
}

/** Apply Martyrdom's replacement while the shared battle-card clear is occurring. */
export function clearOpponentReserveUnderMartyrdom(state: MartyrdomState): MartyrdomState {
  if (!state.martyrdomPendingAfterClear || state.opponentReserveDestination !== 'graveyard') {
    throw new Error('Martyrdom must be played before it can replace the opponent’s Reserve destination.');
  }
  return {
    ...state,
    opponentReserve: [],
    opponentGraveyard: [...state.opponentGraveyard, ...state.opponentReserve],
  };
}

/** Resolve the printed post-clear Conviction and Martyrdom destination. */
export function completeMartyrdomAfterBattleCardsClear(state: MartyrdomState): MartyrdomState {
  if (!state.martyrdomPendingAfterClear) throw new Error('No Martyrdom is awaiting post-clear resolution.');
  if (state.opponentReserve.length > 0) throw new Error('Battle cards must be cleared before Martyrdom completes.');
  return {
    ...state,
    graveyard: [...state.graveyard, 'Martyrdom'],
    conviction: 4,
    martyrdomPendingAfterClear: false,
    opponentReserveDestination: 'discard',
  };
}

/** Compatibility helper for deterministic simulations that resolve the full sequence at once. */
export function resolveMartyrdom(
  state: MartyrdomState,
  input: { duringAftermathBeforeClear: boolean },
): MartyrdomState {
  if (!input.duringAftermathBeforeClear) {
    throw new Error('Martyrdom must be played during the Aftermath before battle cards are cleared.');
  }
  return completeMartyrdomAfterBattleCardsClear(
    clearOpponentReserveUnderMartyrdom(
      playMartyrdomBeforeBattleCardsClear(state),
    ),
  );
}

// --- Margin Loan ----------------------------------------------------------

export interface MarginLoanState {
  banked: boolean;
  collateral: string | null;
  collateralValue: number;
}

export interface MarginLoanZones {
  hand: string[];
  treasury: string[];
  discardPile: string[];
  graveyard: string[];
}

export interface MarginLoanActionResolution {
  loan: MarginLoanState;
  zones: MarginLoanZones;
  capitalGained: number;
  additionalActions: 1;
}

export function bankMarginLoan(
  zones: MarginLoanZones,
  collateralCard: string,
  collateralValue: number,
  source: 'hand' | 'treasury' = 'hand',
): MarginLoanActionResolution {
  const value = nonnegativeInteger(collateralValue);
  const sourceZone = source === 'hand' ? zones.hand : zones.treasury;
  const index = sourceZone.indexOf(collateralCard);
  if (index < 0) throw new Error(`Margin Loan collateral must be supplied from ${source === 'hand' ? 'Hand' : 'Treasury'}.`);
  return {
    loan: { banked: true, collateral: collateralCard, collateralValue: value },
    zones: {
      hand: source === 'hand' ? zones.hand.filter((_, cardIndex) => cardIndex !== index) : [...zones.hand],
      treasury: source === 'treasury' ? zones.treasury.filter((_, cardIndex) => cardIndex !== index) : [...zones.treasury],
      discardPile: [...zones.discardPile],
      graveyard: [...zones.graveyard],
    },
    capitalGained: value + 2,
    additionalActions: 1,
  };
}

export type MarginLoanChoice = 'repay' | 'default' | 'carry';

export interface MarginLoanSettlement {
  loan: MarginLoanState;
  zones: MarginLoanZones;
  capitalPaid: number;
}

export function resolveMarginLoanAfterIncome(
  loan: MarginLoanState,
  zones: MarginLoanZones,
  choice: MarginLoanChoice,
  availableCapital: number,
): MarginLoanSettlement {
  if (!loan.banked || !loan.collateral) throw new Error('Margin Loan must be banked with collateral to settle or carry.');
  const cloned = cloneZones(zones);
  if (choice === 'carry') {
    return { loan: { ...loan }, zones: cloned, capitalPaid: 0 };
  }
  if (choice === 'default') {
    return defaultMarginLoan(loan, cloned);
  }
  const payment = loan.collateralValue + 3;
  if (availableCapital < payment) throw new Error('Insufficient Capital to repay Margin Loan.');
  return {
    loan: { banked: false, collateral: null, collateralValue: 0 },
    zones: {
      hand: [...cloned.hand, loan.collateral],
      treasury: cloned.treasury,
      discardPile: [...cloned.discardPile, 'Margin Loan'],
      graveyard: cloned.graveyard,
    },
    capitalPaid: payment,
  };
}

export function removeMarginLoan(
  loan: MarginLoanState,
  zones: MarginLoanZones,
): MarginLoanSettlement {
  if (!loan.banked || !loan.collateral) throw new Error('Only a banked Margin Loan can be Removed.');
  return defaultMarginLoan(loan, cloneZones(zones));
}

export function mayDrawAtStartOfTurn(loans: readonly MarginLoanState[]): boolean {
  return !loans.some((loan) => loan.banked);
}

export interface StartTurnDrawZones {
  drawPile: string[];
  hand: string[];
}

export function resolveStartTurnDraw(
  zones: StartTurnDrawZones,
  loans: readonly MarginLoanState[] = [],
): { zones: StartTurnDrawZones; drawnCard: string | null; normalDrawOccurred: boolean } {
  const cloned = { drawPile: [...zones.drawPile], hand: [...zones.hand] };
  if (!mayDrawAtStartOfTurn(loans)) {
    return { zones: cloned, drawnCard: null, normalDrawOccurred: false };
  }
  const [drawnCard, ...drawPile] = cloned.drawPile;
  if (!drawnCard) return { zones: cloned, drawnCard: null, normalDrawOccurred: true };
  return {
    zones: { drawPile, hand: [...cloned.hand, drawnCard] },
    drawnCard,
    normalDrawOccurred: true,
  };
}

function controlsV063Territory(state: FrontLineState, player: PlayerId, territoryIndex: number): boolean {
  assertTerritory(territoryIndex, state.territoryCount);
  if (player === 'A') return territoryIndex < state.control.A;
  return territoryIndex >= state.territoryCount - state.control.B;
}

function cloneCompoundZones(zones: CompoundInterestZones): CompoundInterestZones {
  return {
    drawPile: [...zones.drawPile],
    treasury: [...zones.treasury],
    discardPile: [...zones.discardPile],
  };
}

function defaultMarginLoan(loan: MarginLoanState, zones: MarginLoanZones): MarginLoanSettlement {
  if (!loan.collateral) throw new Error('Margin Loan Default requires collateral.');
  return {
    loan: { banked: false, collateral: null, collateralValue: 0 },
    zones: {
      hand: zones.hand,
      treasury: zones.treasury,
      discardPile: zones.discardPile,
      graveyard: [...zones.graveyard, 'Margin Loan', loan.collateral],
    },
    capitalPaid: 0,
  };
}

function cloneZones(zones: MarginLoanZones): MarginLoanZones {
  return {
    hand: [...zones.hand],
    treasury: [...zones.treasury],
    discardPile: [...zones.discardPile],
    graveyard: [...zones.graveyard],
  };
}

function assertTerritory(territoryIndex: number, territoryCount: number): void {
  if (!Number.isInteger(territoryIndex) || territoryIndex < 0 || territoryIndex >= territoryCount) {
    throw new Error('Territory index is outside the Gauntlet.');
  }
}

function nonnegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}
