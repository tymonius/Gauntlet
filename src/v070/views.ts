import type { PlayerId } from './rules';
import type {
  V070GameEvent,
  V070GameState,
  V070MissionSlot,
  V070SetupStage,
} from './engine';
import { effectiveV070AssetLimit } from './assets';
import type {
  V070BattleCardCommitment,
  V070BattleRuntime,
  V070UnsupportedBattleEffect,
} from './battle-types';

export interface V070VisibleCard {
  instanceId: string;
  cardId: string;
}

export interface V070BindingView {
  hostId: string;
  owner: PlayerId;
  faceUp: boolean;
  purpose: string;
  sequence: number;
  card?: V070VisibleCard;
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
  refusedTermsContext: V070BattleRuntime['refusedTermsContext'];
  gambitOrderOverride: V070BattleRuntime['gambitOrderOverride'];
  pendingOutcome: V070BattleRuntime['pendingOutcome'];
  pendingAccursedWager: V070BattleRuntime['pendingAccursedWager'];
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

export interface V070InquisitionView {
  conviction: number;
}

export interface V070FinancierView {
  capital: number;
  treasury: V070VisibleCard[];
  financialCapacityTurn: number | null;
  financialCapacityUsedTurn: number | null;
  financierFeatureActionSpentTurn: number | null;
}

export interface V070MissionSlotView {
  set: true;
  startedTurn: number;
  card?: V070VisibleCard;
}

export interface V070IntelligenceView {
  intel: number;
  operationProgress: number;
  activeMission: V070MissionSlotView | null;
  specialOperation: V070MissionSlotView | null;
  missionControlUsedTurn: number | null;
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
  assetLimit: number;
  diplomats: V070GameState['players'][PlayerId]['diplomats'];
  inquisition: V070InquisitionView | null;
  financiers: V070FinancierView | null;
  intelligence: V070IntelligenceView | null;
}

export interface V070SpeculationView {
  instanceId: string;
  cardId: string;
  owner: PlayerId;
  territoryInstanceId: string;
  territoryPosition: number;
  territoryId: string;
  placedTurn: number;
}

export interface V070GameView {
  rulesVersion: V070GameState['rulesVersion'];
  gameId: string;
  stage: V070GameState['stage'];
  setupStage: V070SetupStage | null;
  players: Record<PlayerId, V070PlayerViewState>;
  board: V070GameState['board'];
  deeds: V070GameState['deeds'];
  activePlayer: PlayerId | null;
  turnNumber: number;
  turnState: V070GameState['turnState'];
  battle: V070GameState['battle'];
  battleRuntime: V070BattleRuntimeView | null;
  overlays: V070OverlayView[];
  speculations: V070SpeculationView[];
  accursedWagers: V070GameState['accursedWagers'];
  bindings: V070BindingView[];
  assetFaceStates: V070GameState['assetFaceStates'];
  territoryTurnRestrictions: V070GameState['territoryTurnRestrictions'];
  territoryEffectSuppressions: V070GameState['territoryEffectSuppressions'];
  sanctions: V070GameState['sanctions'];
  sanctionTriggerTurns: V070GameState['sanctionTriggerTurns'];
  pendingActionCard: V070GameState['pendingActionCard'];
  pendingActionEffectChoice: V070GameState['pendingActionEffectChoice'];
  pendingSanctionChoices: V070GameState['pendingSanctionChoices'];
  pendingAssetLimitChoice: V070GameState['pendingAssetLimitChoice'];
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
    deeds: structuredClone(state.deeds),
    activePlayer: state.activePlayer,
    turnNumber: state.turnNumber,
    turnState: state.turnState ? structuredClone(state.turnState) : null,
    battle: state.battle ? structuredClone(state.battle) : null,
    battleRuntime: state.battleRuntime
      ? viewBattleRuntime(state, state.battleRuntime, viewer)
      : null,
    overlays: viewOverlays(state),
    speculations: viewSpeculations(state),
    accursedWagers: state.accursedWagers.map(
      wager => structuredClone(wager),
    ),
    bindings: viewBindings(state, viewer),
    assetFaceStates: state.assetFaceStates.map(face => structuredClone(face)),
    territoryTurnRestrictions: state.territoryTurnRestrictions.map(
      restriction => structuredClone(restriction),
    ),
    territoryEffectSuppressions: state.territoryEffectSuppressions.map(
      suppression => structuredClone(suppression),
    ),
    sanctions: state.sanctions.map(sanction => structuredClone(sanction)),
    sanctionTriggerTurns: { ...state.sanctionTriggerTurns },
    pendingActionCard: state.pendingActionCard
      ? structuredClone(state.pendingActionCard)
      : null,
    pendingActionEffectChoice: viewPendingActionEffectChoice(state, viewer),
    pendingSanctionChoices: state.pendingSanctionChoices.map(
      choice => structuredClone(choice),
    ),
    pendingAssetLimitChoice: state.pendingAssetLimitChoice
      ? structuredClone(state.pendingAssetLimitChoice)
      : null,
    pendingTurnChoice: state.pendingTurnChoice
      ? structuredClone(state.pendingTurnChoice)
      : null,
    winner: state.winner,
    events: state.events
      .filter(event => event.visibility === 'public' || event.visibility === viewer)
      .map(event => structuredClone(event)),
  };
}

function viewPendingActionEffectChoice(
  state: V070GameState,
  viewer: PlayerId,
): V070GameState['pendingActionEffectChoice'] {
  const choice = state.pendingActionEffectChoice;
  if (!choice) return null;

  const visible = structuredClone(choice);
  if ((visible.kind === 'dark_omens_graveyard_target'
      || visible.kind === 'threefold_vision_distribution')
    && visible.playerId !== viewer) {
    visible.candidateInstanceIds = [];
  }
  return visible;
}

function viewSpeculations(
  state: V070GameState,
): V070SpeculationView[] {
  return state.speculations.map(speculation => {
    const instance = state.cardInstances[speculation.instanceId];
    if (!instance) {
      throw new Error(
        `Unknown Speculation card instance ${speculation.instanceId}.`,
      );
    }
    const territory = state.board.find(
      candidate =>
        candidate.territoryInstanceId === speculation.territoryInstanceId,
    );
    if (!territory) {
      throw new Error(
        `Speculation ${speculation.instanceId} tracks missing Territory ${speculation.territoryInstanceId}.`,
      );
    }
    return {
      ...structuredClone(speculation),
      cardId: instance.cardId,
      territoryPosition: territory.position,
      territoryId: territory.territoryId,
    };
  });
}

function viewBindings(
  state: V070GameState,
  viewer: PlayerId,
): V070BindingView[] {
  return [...state.bindings]
    .sort((a, b) => a.sequence - b.sequence)
    .map(binding => {
      const instance = state.cardInstances[binding.cardInstanceId];
      if (!instance) {
        throw new Error(
          `Unknown bound card instance ${binding.cardInstanceId}.`,
        );
      }

      const identityVisible = binding.faceUp || binding.owner === viewer;
      return {
        hostId: binding.hostId,
        owner: binding.owner,
        faceUp: binding.faceUp,
        purpose: binding.purpose,
        sequence: binding.sequence,
        ...(identityVisible
          ? {
              card: {
                instanceId: binding.cardInstanceId,
                cardId: instance.cardId,
              },
            }
          : {}),
      };
    });
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
    assetLimit: effectiveV070AssetLimit(state, playerId),
    diplomats: player.diplomats ? structuredClone(player.diplomats) : null,
    inquisition: player.inquisition
      ? { conviction: player.inquisition.conviction }
      : null,
    financiers: player.financiers
      ? {
          capital: player.financiers.capital,
          treasury: visibleCards(state, player.financiers.treasury),
          financialCapacityTurn: player.financiers.financialCapacityTurn,
          financialCapacityUsedTurn: player.financiers.financialCapacityUsedTurn,
          financierFeatureActionSpentTurn:
            player.financiers.financierFeatureActionSpentTurn,
        }
      : null,
    intelligence: player.intelligence
      ? {
          intel: player.intelligence.intel,
          operationProgress: player.intelligence.operationProgress,
          activeMission: viewMissionSlot(
            state,
            player.intelligence.activeMission,
            isOwner,
          ),
          specialOperation: viewMissionSlot(
            state,
            player.intelligence.specialOperation,
            isOwner,
          ),
          missionControlUsedTurn:
            player.intelligence.missionControlUsedTurn,
        }
      : null,
  };
}

function viewMissionSlot(
  state: V070GameState,
  mission: V070MissionSlot | null,
  owner: boolean,
): V070MissionSlotView | null {
  if (!mission) return null;
  const result: V070MissionSlotView = {
    set: true,
    startedTurn: mission.startedTurn,
  };
  if (owner) {
    const instance = state.cardInstances[mission.instanceId];
    if (!instance) {
      throw new Error(
        `Unknown Mission card instance ${mission.instanceId}.`,
      );
    }
    result.card = {
      instanceId: mission.instanceId,
      cardId: instance.cardId,
    };
  }
  return result;
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
    refusedTermsContext: runtime.refusedTermsContext
      ? structuredClone(runtime.refusedTermsContext)
      : null,
    gambitOrderOverride: runtime.gambitOrderOverride
      ? structuredClone(runtime.gambitOrderOverride)
      : null,
    pendingOutcome: runtime.pendingOutcome
      ? structuredClone(runtime.pendingOutcome)
      : null,
    pendingAccursedWager: runtime.pendingAccursedWager
      ? structuredClone(runtime.pendingAccursedWager)
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
