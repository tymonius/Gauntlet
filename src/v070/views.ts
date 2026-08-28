import type { PlayerId } from './rules';
import type { V070GameEvent, V070GameState, V070SetupStage } from './engine';
import type {
  V070BattleCardCommitment,
  V070BattleRuntime,
  V070UnsupportedBattleEffect,
} from './battle-types';

export interface V070VisibleCard {
  instanceId: string;
  cardId: string;
}

export interface V070OverlayView {
  instanceId: string;
  cardId: string;
  owner: PlayerId;
  controller: PlayerId;
  territoryInstanceId: string;
  territoryPosition: number;
  territoryId: string;
  placedTurn: number;
  sequence: number;
  active: boolean;
}

export interface V070HiddenBattleCard {
  set: true;
  faceUp: false;
}

export type V070BattleCardView = V070VisibleCard | V070HiddenBattleCard | null | undefined;

export interface V070BattleParticipantView {
  gambit: V070BattleCardView;
  additionalGambits: V070BattleCardView[];
  reserveCount: number;
  reserve?: V070VisibleCard[];
  tactic: V070BattleCardView;
  battleModifier: number;
  advantage: number;
  disadvantage: number;
  battleDice: number[];
  selectedBattleDie: number | null;
  battleTotal: number | null;
  tiebreakRolls: number[];
}

export interface V070BattleRuntimeView {
  stage: V070BattleRuntime['stage'];
  participants: Record<PlayerId, V070BattleParticipantView>;
  terms: V070BattleRuntime['terms'];
  gambitOrderOverride: V070BattleRuntime['gambitOrderOverride'];
  pendingOutcome: V070BattleRuntime['pendingOutcome'];
  unsupportedEffects: V070UnsupportedBattleEffect[];
}

export interface V070PlayerZoneView {
  drawPileCount: number;
  handCount: number;
  hand?: V070VisibleCard[];
  discardPile: V070VisibleCard[];
  graveyard: V070VisibleCard[];
  assetBank: V070VisibleCard[];
  removed: V070VisibleCard[];
}

export interface V070PlayerViewState {
  id: PlayerId;
  name: string;
  starterDeckId: string;
  factionId: string;
  leaderId: string;
  zones: V070PlayerZoneView;
  openingSelection?: V070VisibleCard[];
  territoryCandidates?: string[];
  territoryOrder: string[] | null;
  position: number | null;
  controlledTerritories: string[];
  diplomats: V070GameState['players'][PlayerId]['diplomats'];
}

export interface V070GameView {
  rulesVersion: V070GameState['rulesVersion'];
  gameId: string;
  stage: V070GameState['stage'];
  setupStage: V070SetupStage | null;
  players: Record<PlayerId, V070PlayerViewState>;
  board: V070GameState['board'];
  activePlayer: PlayerId | null;
  turnNumber: number;
  turnState: V070GameState['turnState'];
  battle: V070GameState['battle'];
  battleRuntime: V070BattleRuntimeView | null;
  overlays: V070OverlayView[];
  territoryTurnRestrictions: V070GameState['territoryTurnRestrictions'];
  pendingTurnChoice: V070GameState['pendingTurnChoice'];
  winner: PlayerId | null;
  events: V070GameEvent[];
}

export function viewV070GameForPlayer(
  state: V070GameState,
  viewer: PlayerId,
): V070GameView {
  if (!state.players[viewer]) throw new Error(`Unknown viewer ${viewer}.`);

  return {
    rulesVersion: state.rulesVersion,
    gameId: state.gameId,
    stage: state.stage,
    setupStage: state.setup?.stage ?? null,
    players: {
      A: viewPlayer(state, 'A', viewer),
      B: viewPlayer(state, 'B', viewer),
    },
    board: structuredClone(state.board),
    activePlayer: state.activePlayer,
    turnNumber: state.turnNumber,
    turnState: state.turnState ? structuredClone(state.turnState) : null,
    battle: state.battle ? structuredClone(state.battle) : null,
    battleRuntime: state.battleRuntime
      ? viewBattleRuntime(state, state.battleRuntime, viewer)
      : null,
    overlays: viewOverlays(state),
    territoryTurnRestrictions: state.territoryTurnRestrictions.map(
      restriction => structuredClone(restriction),
    ),
    pendingTurnChoice: state.pendingTurnChoice
      ? structuredClone(state.pendingTurnChoice)
      : null,
    winner: state.winner,
    events: state.events
      .filter(event => event.visibility === 'public' || event.visibility === viewer)
      .map(event => structuredClone(event)),
  };
}

function viewOverlays(state: V070GameState): V070OverlayView[] {
  return [...state.overlays]
    .sort((a, b) => a.sequence - b.sequence)
    .map(overlay => {
      const instance = state.cardInstances[overlay.instanceId];
      if (!instance) throw new Error(`Unknown Overlay card instance ${overlay.instanceId}.`);
      const territory = state.board.find(
        candidate => candidate.territoryInstanceId === overlay.territoryInstanceId,
      );
      if (!territory) {
        throw new Error(
          `Overlay ${overlay.instanceId} is attached to missing Territory ${overlay.territoryInstanceId}.`,
        );
      }
      const activeSequence = Math.max(
        ...state.overlays
          .filter(candidate =>
            candidate.territoryInstanceId === overlay.territoryInstanceId
          )
          .map(candidate => candidate.sequence),
      );
      return {
        ...structuredClone(overlay),
        cardId: instance.cardId,
        controller: territory.controller,
        territoryPosition: territory.position,
        territoryId: territory.territoryId,
        active: overlay.sequence === activeSequence,
      };
    });
}

function viewPlayer(
  state: V070GameState,
  playerId: PlayerId,
  viewer: PlayerId,
): V070PlayerViewState {
  const player = state.players[playerId];
  const isOwner = playerId === viewer;
  const setupHidden = state.stage === 'setup';

  return {
    id: player.id,
    name: player.name,
    starterDeckId: player.starterDeckId,
    factionId: player.factionId,
    leaderId: player.leaderId,
    zones: {
      drawPileCount: player.zones.drawPile.length,
      handCount: player.zones.hand.length,
      hand: isOwner ? visibleCards(state, player.zones.hand) : undefined,
      discardPile: visibleCards(state, player.zones.discardPile),
      graveyard: visibleCards(state, player.zones.graveyard),
      assetBank: visibleCards(state, player.zones.assetBank),
      removed: visibleCards(state, player.zones.removed),
    },
    openingSelection: isOwner && player.openingSelection.length > 0
      ? visibleCards(state, player.openingSelection)
      : undefined,
    territoryCandidates: isOwner && setupHidden
      ? [...player.territoryCandidates]
      : undefined,
    territoryOrder: !setupHidden || isOwner
      ? player.territoryOrder ? [...player.territoryOrder] : null
      : null,
    position: player.position,
    controlledTerritories: [...player.controlledTerritories],
    diplomats: player.diplomats ? structuredClone(player.diplomats) : null,
  };
}

function viewBattleRuntime(
  state: V070GameState,
  runtime: V070BattleRuntime,
  viewer: PlayerId,
): V070BattleRuntimeView {
  return {
    stage: runtime.stage,
    participants: {
      A: viewBattleParticipant(state, runtime, 'A', viewer),
      B: viewBattleParticipant(state, runtime, 'B', viewer),
    },
    terms: structuredClone(runtime.terms),
    gambitOrderOverride: runtime.gambitOrderOverride
      ? structuredClone(runtime.gambitOrderOverride)
      : null,
    pendingOutcome: runtime.pendingOutcome
      ? structuredClone(runtime.pendingOutcome)
      : null,
    unsupportedEffects: runtime.unsupportedEffects.map(effect => structuredClone(effect)),
  };
}

function viewBattleParticipant(
  state: V070GameState,
  runtime: V070BattleRuntime,
  playerId: PlayerId,
  viewer: PlayerId,
): V070BattleParticipantView {
  const participant = runtime.participants[playerId];
  const owner = playerId === viewer;

  return {
    gambit: viewBattleCommitment(state, participant.gambit, owner),
    additionalGambits: participant.additionalGambits.map(commitment =>
      viewBattleCommitment(state, commitment, owner)
    ),
    reserveCount: participant.reserve.length,
    reserve: owner ? visibleCards(state, participant.reserve) : undefined,
    tactic: viewBattleCommitment(state, participant.tactic, owner),
    battleModifier: participant.battleModifier,
    advantage: participant.advantage,
    disadvantage: participant.disadvantage,
    battleDice: [...participant.battleDice],
    selectedBattleDie: participant.selectedBattleDie,
    battleTotal: participant.battleTotal,
    tiebreakRolls: [...participant.tiebreakRolls],
  };
}

function viewBattleCommitment(
  state: V070GameState,
  commitment: V070BattleCardCommitment | null | undefined,
  owner: boolean,
): V070BattleCardView {
  if (commitment === undefined || commitment === null) return commitment;

  if (!owner && !commitment.faceUp) {
    return { set: true, faceUp: false };
  }
  const instance = state.cardInstances[commitment.instanceId];
  if (!instance) throw new Error(`Unknown card instance ${commitment.instanceId}.`);
  return {
    instanceId: commitment.instanceId,
    cardId: instance.cardId,
  };
}

function visibleCards(
  state: V070GameState,
  instanceIds: readonly string[],
): V070VisibleCard[] {
  return instanceIds.map(instanceId => {
    const instance = state.cardInstances[instanceId];
    if (!instance) throw new Error(`Unknown card instance ${instanceId}.`);
    return {
      instanceId,
      cardId: instance.cardId,
    };
  });
}
