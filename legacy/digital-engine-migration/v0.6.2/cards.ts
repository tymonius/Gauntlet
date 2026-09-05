import {
  controlsTerritory,
  retreatPosition,
  type ActionPhase,
  type FrontLineState,
  type PlayerId,
} from './rules';

export interface InvasionActionEffect {
  additionalAdvance: 2;
  advanceOnly: true;
  endsOnPendingBattle: true;
}

export interface BattleLimits {
  reserveLimit: number;
  tacticLimit: number;
}

export function activateInvasionAction(phase: ActionPhase): InvasionActionEffect {
  if (phase !== 'opening') throw new Error('Invasion may be played for its Action only during Opening.');
  return {
    additionalAdvance: 2,
    advanceOnly: true,
    endsOnPendingBattle: true,
  };
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
    const nextPosition = retreatPosition(retreatingPlayer, position, state.territoryCount);
    if (nextPosition === position) break;
    position = nextPosition;
  }

  return {
    state: { ...state, overlays },
    position,
    discardedOwners,
  };
}

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

export interface BoundCard {
  id: string;
  owner: PlayerId;
}

export interface ExtraordinaryRenditionState {
  banked: boolean;
  boundCard: BoundCard | null;
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
      boundCard: { id: selectedCardId, owner: opponent },
    },
    opponentHand: opponentHand.filter((_, cardIndex) => cardIndex !== index),
  };
}

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

export function canBeginRiteFromNaturesAltar(
  overlay: NaturesAltarOverlay,
  input: { phase: ActionPhase; player: PlayerId; playerPosition: number },
): boolean {
  return input.phase === 'opening'
    && input.player === overlay.owner
    && input.playerPosition === overlay.territoryIndex;
}

export function canCompleteAltarRiteThisTurn(
  overlay: NaturesAltarOverlay,
  frontLine: FrontLineState,
  input: { player: PlayerId; completionConditionSatisfied: boolean; completionTimingReached: boolean },
): boolean {
  return input.player === overlay.owner
    && input.completionConditionSatisfied
    && input.completionTimingReached
    && controlsTerritory(frontLine, input.player, overlay.territoryIndex);
}

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
}

export function resolveMartyrdom(
  state: MartyrdomState,
  input: { duringAftermathBeforeClear: boolean },
): MartyrdomState {
  if (state.battleResult !== 'loss') throw new Error('Martyrdom may be played only after losing a battle.');
  if (!input.duringAftermathBeforeClear) {
    throw new Error('Martyrdom must be played during the Aftermath before battle cards are cleared.');
  }
  const index = state.hand.indexOf('Martyrdom');
  if (index < 0) throw new Error('Martyrdom must be in Hand.');
  return {
    ...state,
    hand: state.hand.filter((_, cardIndex) => cardIndex !== index),
    graveyard: [...state.graveyard, 'Martyrdom'],
    conviction: 4,
    opponentReserve: [],
    opponentDiscardPile: [...state.opponentDiscardPile],
    opponentGraveyard: [...state.opponentGraveyard, ...state.opponentReserve],
    battleResult: 'loss',
    retreatRequired: state.retreatRequired,
    occupationApplies: state.occupationApplies,
  };
}

function cloneCompoundZones(zones: CompoundInterestZones): CompoundInterestZones {
  return {
    drawPile: [...zones.drawPile],
    treasury: [...zones.treasury],
    discardPile: [...zones.discardPile],
  };
}

function assertTerritory(territoryIndex: number, territoryCount: number): void {
  if (!Number.isInteger(territoryIndex) || territoryIndex < 0 || territoryIndex >= territoryCount) {
    throw new Error('Territory index is outside the Gauntlet.');
  }
}
