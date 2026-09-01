import { cardCanBePlayedAt, destinationForCardPlay, getCardPlayRule } from '../cards';
import { activeBattleCancellationCards } from '../effects/embargo';
import type {
  BattleCardTargetOption,
  BattleParticipantState,
  BattlePlayOption,
  BattlePlayedCard,
  BattleState,
  BoardState,
  GameEvent,
  GameState,
  LegalActionPlayOption,
  LegalNeutralAssetUseOption,
  PrivateGameView,
  PrivatePlayerView,
  PublicBattleParticipantView,
  PublicBattleView,
  PublicBoardView,
  PublicGameView,
  PublicIntelligenceState,
  PublicPlayerView,
  PlayerID,
  PlayerState,
} from '../types/v06';
import { canResolveIntelligenceAction } from './intelligence-action-cards';
import { availableBattleHandCards } from './battle-hand-restrictions';
import { confessionLegalHandCommitCards } from './inquisition-confession';
import { legalLeaderAbilitiesFor } from './leader-abilities';
import { toPublicMysticsState } from './mystics-ritual';
import { ARCANE_KNOWLEDGE, canResolveArcaneKnowledgeAction } from './neutral-arcane-knowledge';
import { BOMBARDMENT, canResolveBombardmentAction } from './neutral-bombardment';
import {
  activeCapitalPunishmentCards,
  canResolveCapitalPunishmentAction,
  CAPITAL_PUNISHMENT,
  capitalPunishmentTargetCards,
} from './neutral-capital-punishment';
import { cancellationCandidatesWithDecoysPriority } from './neutral-decoys-battle';
import { canResolveDisruptionAction, DISRUPTION } from './neutral-disruption';
import { conscriptionAssetCardCanBePlayed } from './neutral-conscription';
import { entrenchmentActionPlayProhibited } from './neutral-entrenchment';
import { canUseReinforcementsAsset, REINFORCEMENTS, reinforcementsActionOpportunityActive } from './neutral-reinforcements';
import { insurrectionActionOpportunityActive } from './neutral-insurrection';
import { liberationActionOpportunityActive } from './neutral-liberation';
import { canPlayInvasionAction, INVASION } from './neutral-invasion';
import { canResolveNewRecruitsAction, NEW_RECRUITS } from './neutral-new-recruits';
import { canBankResourcefulness, RESOURCEFULNESS } from './neutral-resourcefulness';

const visible = <T>(cards: T[]) => ({ kind: 'visible' as const, cards });
const hidden = <T>(cards: T[]) => ({ kind: 'hidden' as const, count: cards.length });

function toPublicIntelligenceState(player: PlayerState): PublicIntelligenceState | undefined {
  if (!player.intelligence) return undefined;
  const sleeperNetwork = player.intelligence.sleeperNetwork;
  return {
    activeMission: player.intelligence.activeMission ? { faceDown: true, kind: 'normal', startedTurn: player.intelligence.activeMission.startedTurn } : undefined,
    specialOperation: player.intelligence.specialOperation ? { faceDown: true, kind: 'special_operation', startedTurn: player.intelligence.specialOperation.startedTurn } : undefined,
    sleeperNetwork: sleeperNetwork ? { cardCount: sleeperNetwork.cards.length, activating: Boolean(sleeperNetwork.activation) } : undefined,
  };
}

export function toPublicPlayerView(player: PlayerState): PublicPlayerView {
  return {
    id: player.id,
    name: player.name,
    factionId: player.factionId,
    leaderName: player.leaderName,
    resources: structuredClone(player.resources),
    leaderAbilityUsage: structuredClone(player.leaderAbilityUsage),
    military: structuredClone(player.military),
    diplomats: structuredClone(player.diplomats),
    financiers: structuredClone(player.financiers),
    intelligence: toPublicIntelligenceState(player),
    mystics: toPublicMysticsState(player.mystics),
    inquisition: structuredClone(player.inquisition),
    zones: {
      deck: hidden(player.zones.deck),
      hand: hidden(player.zones.hand),
      discard: visible(player.zones.discard),
      graveyard: visible(player.zones.graveyard),
      assetBank: visible(player.zones.assetBank),
      removed: visible(player.zones.removed),
    },
    faceDownAssets: player.faceDownAssets ? [...player.faceDownAssets] : undefined,
    controlledTerritoryCount: player.controlledTerritories.length,
    controlledTerritories: player.controlledTerritories,
    occupiedSpaceId: player.occupiedSpaceId,
    actionsRemaining: player.actionsRemaining,
    movementRemaining: player.movementRemaining,
    nonBattleMovementRemaining: player.nonBattleMovementRemaining,
    advanceGuardMovementRemaining: player.advanceGuardMovementRemaining,
    invasionAdvanceMovementRemaining: player.invasionAdvanceMovementRemaining,
  };
}

export function toPrivatePlayerView(player: PlayerState): PrivatePlayerView {
  const publicView = toPublicPlayerView(player);
  return {
    ...publicView,
    intelligence: structuredClone(player.intelligence),
    mystics: structuredClone(player.mystics),
    inquisition: structuredClone(player.inquisition),
    zones: { ...publicView.zones, deck: hidden(player.zones.deck), hand: visible(player.zones.hand) },
    private: { deck: player.zones.deck, hand: player.zones.hand },
  };
}

export function toPublicBoardView(board: BoardState): PublicBoardView {
  return {
    layout: board.layout,
    spaces: board.spaces.map((space) => ({ ...space, territoryId: space.revealed ? space.territoryId : undefined })),
  };
}

function revealPlayedCardToViewer(played: BattlePlayedCard | undefined, viewer?: PlayerID): BattlePlayedCard | { faceDown: true } | undefined {
  if (!played || played.virtual) return undefined;
  if (!played.faceDown || played.owner === viewer) return played;
  if (viewer && played.visibleTo?.includes(viewer)) return played;
  return { faceDown: true };
}

function playedCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled && !card.virtual);
}

function battleParticipantForViewer(battle: BattleState, viewer?: PlayerID): BattleParticipantState | undefined {
  if (!viewer) return undefined;
  if (battle.attacker.playerId === viewer) return battle.attacker;
  if (battle.defender.playerId === viewer) return battle.defender;
  return undefined;
}

function validBattleCardTargetsForViewer(battle: BattleState, viewer?: PlayerID): BattleCardTargetOption[] | undefined {
  const viewerParticipant = battleParticipantForViewer(battle, viewer);
  if (!viewerParticipant) return undefined;
  if (battle.stage !== 'dice' && battle.stage !== 'resolution') return undefined;
  const opponent = viewerParticipant.playerId === battle.attacker.playerId ? battle.defender : battle.attacker;

  const cancellationOptions = activeBattleCancellationCards(viewerParticipant)
    .flatMap((source) => cancellationCandidatesWithDecoysPriority(opponent).map((target) => ({
      sourceCardId: source.cardId,
      sourceOwner: source.owner,
      sourceOrigin: source.origin,
      targetCardId: target.cardId,
      targetOwner: target.owner,
      targetOrigin: target.origin,
    })));
  const capitalPunishmentOptions = activeCapitalPunishmentCards(viewerParticipant)
    .flatMap((source) => capitalPunishmentTargetCards(opponent).map((target) => ({
      sourceCardId: source.cardId,
      sourceOwner: source.owner,
      sourceOrigin: source.origin,
      targetCardId: target.cardId,
      targetOwner: target.owner,
      targetOrigin: target.origin,
    })));
  const options = [...cancellationOptions, ...capitalPunishmentOptions];
  return options.length > 0 ? options : undefined;
}

function legalBattlePlaysForViewer(battle: BattleState, game: GameState, viewer?: PlayerID): BattlePlayOption[] | undefined {
  const participant = battleParticipantForViewer(battle, viewer);
  if (!participant || !viewer || game.priorityPlayer !== viewer) return undefined;
  if (battle.stage === 'hand_commit' && !participant.passedHandCommit && !participant.handCommit) {
    if (battle.handCommitProhibitedFor?.includes(viewer)) {
      return [{ action: 'pass_battle_hand_commit' as const }];
    }
    const legalHandCards = game.players[viewer].zones.hand.filter((cardId) => cardCanBePlayedAt(cardId, 'battle_hand_commit', 'hand'));
    return [
      ...confessionLegalHandCommitCards(game, viewer, legalHandCards).map((cardId) => ({ action: 'commit_battle_hand_card' as const, cardId, origin: 'hand' as const })),
      { action: 'pass_battle_hand_commit' as const },
    ];
  }
  if (battle.stage === 'battle_play_selection' && !participant.passedBattleDrawPlay && participant.battleDrawPlayed.length < participant.battleDrawPlayLimit) {
    return [
      ...availableBattleHandCards(battle, participant).filter((cardId) => cardCanBePlayedAt(cardId, 'battle_draw_play', 'battle_draw')).map((cardId) => ({ action: 'play_battle_draw_card' as const, cardId, origin: 'battle_draw' as const })),
      { action: 'pass_battle_draw_play' as const },
    ];
  }
  return undefined;
}

function toBattleParticipantView(participant: BattleParticipantState, viewer?: PlayerID): PublicBattleParticipantView {
  return {
    playerId: participant.playerId,
    passedHandCommit: participant.passedHandCommit,
    passedBattleDrawPlay: participant.passedBattleDrawPlay,
    handCommit: revealPlayedCardToViewer(participant.handCommit, viewer),
    battleDrawCount: participant.battleDrawCount,
    battleDrawPlayed: participant.battleDrawPlayed.filter((card) => !card.virtual).map((card) => revealPlayedCardToViewer(card, viewer)!).filter(Boolean),
    battleDrawLimit: participant.battleDrawCount,
    battleDrawPlayLimit: participant.battleDrawPlayLimit,
    advantage: participant.advantage ?? 0,
    disadvantage: participant.disadvantage ?? 0,
    diceRolls: participant.diceRolls ? [...participant.diceRolls] : undefined,
    diceRoll: participant.diceRoll,
    modifiers: participant.modifiers,
    retreated: participant.retreated,
  };
}

export function toPublicBattleView(battle: BattleState, game?: GameState): PublicBattleView {
  return {
    id: battle.id,
    stage: battle.stage,
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    attacker: toBattleParticipantView(battle.attacker),
    defender: toBattleParticipantView(battle.defender),
    tiePolicy: battle.tiePolicy,
    lastStand: battle.lastStand,
    handCommitProhibitedFor: battle.handCommitProhibitedFor ? [...battle.handCommitProhibitedFor] : undefined,
    seditionInactiveAssets: battle.seditionInactiveAssets ? structuredClone(battle.seditionInactiveAssets) : undefined,
    counterworksInactiveOverlays: battle.counterworksInactiveOverlays ? structuredClone(battle.counterworksInactiveOverlays) : undefined,
    counterworksOverlayPreventions: battle.counterworksOverlayPreventions ? structuredClone(battle.counterworksOverlayPreventions) : undefined,
    winner: battle.winner,
    loser: battle.loser,
  };
}

export function toPrivateBattleView(battle: BattleState, game: GameState, viewer: PlayerID): PublicBattleView {
  return {
    ...toPublicBattleView(battle, game),
    attacker: toBattleParticipantView(battle.attacker, viewer),
    defender: toBattleParticipantView(battle.defender, viewer),
    validBattleCardTargets: validBattleCardTargetsForViewer(battle, viewer),
    legalBattlePlays: legalBattlePlaysForViewer(battle, game, viewer),
  };
}

function legalActionPlaysForViewer(game: GameState, viewer?: PlayerID): LegalActionPlayOption[] | undefined {
  if (!viewer || game.activePlayer !== viewer || game.priorityPlayer !== viewer) return undefined;
  if (game.phase !== 'action_before_movement' && game.phase !== 'action_after_movement') return undefined;
  if (entrenchmentActionPlayProhibited(game, viewer)) return undefined;
  const player = game.players[viewer];
  const conscription = game.pendingNeutralChoice?.kind === 'conscription_action'
    && game.pendingNeutralChoice.playerId === viewer
    ? game.pendingNeutralChoice
    : undefined;
  if (conscription) {
    return player.zones.hand
      .filter((cardId) => conscription.cardOptions.includes(cardId))
      .filter(conscriptionAssetCardCanBePlayed)
      .filter((cardId) => cardId !== RESOURCEFULNESS || canBankResourcefulness(game, viewer))
      .filter((cardId, index, cards) => cards.indexOf(cardId) === index)
      .map((cardId) => ({
        action: 'play_action_card' as const,
        cardId,
        origin: 'hand' as const,
        destination: 'asset_bank' as const,
        requiresTarget: getCardPlayRule(cardId)?.requiresTarget ?? false,
      }));
  }
  const extraOpportunity = reinforcementsActionOpportunityActive(game, viewer)
    || insurrectionActionOpportunityActive(game, viewer)
    || liberationActionOpportunityActive(game, viewer);
  if (player.actionsRemaining < 1 || ((player.hasPlayedActionThisTurn || player.hasPlayedBattleThisTurn) && !extraOpportunity)) return undefined;
  return player.zones.hand
    .filter((cardId) => cardCanBePlayedAt(cardId, 'action', 'hand'))
    .filter((cardId) => canResolveIntelligenceAction(game, viewer, cardId))
    .filter((cardId) => cardId !== ARCANE_KNOWLEDGE || canResolveArcaneKnowledgeAction(game, viewer))
    .filter((cardId) => cardId !== BOMBARDMENT || canResolveBombardmentAction(game, viewer))
    .filter((cardId) => cardId !== CAPITAL_PUNISHMENT || canResolveCapitalPunishmentAction(game, viewer))
    .filter((cardId) => cardId !== DISRUPTION || canResolveDisruptionAction(game, viewer))
    .filter((cardId) => cardId !== NEW_RECRUITS || canResolveNewRecruitsAction(game, viewer))
    .filter((cardId) => cardId !== RESOURCEFULNESS || canBankResourcefulness(game, viewer))
    .filter((cardId) => cardId !== INVASION || canPlayInvasionAction(game, viewer))
    .map((cardId) => ({ action: 'play_action_card' as const, cardId, origin: 'hand' as const, destination: destinationForCardPlay(cardId, 'hand'), requiresTarget: getCardPlayRule(cardId)?.requiresTarget ?? false }));
}

function legalNeutralAssetUsesForViewer(game: GameState, viewer?: PlayerID): LegalNeutralAssetUseOption[] | undefined {
  if (!viewer
    || insurrectionActionOpportunityActive(game, viewer)
    || liberationActionOpportunityActive(game, viewer)
    || !canUseReinforcementsAsset(game, viewer)) return undefined;
  return [{ action: 'use_neutral_reinforcements_asset', cardId: REINFORCEMENTS }];
}

function publicLog(game: GameState): GameEvent[] {
  return game.log.filter((event) => event.visibility === 'public').map((event) => structuredClone(event));
}

function privateLog(game: GameState, viewer: PlayerID): GameEvent[] {
  return game.log
    .filter((event) => event.visibility === 'public' || (event.visibility === 'private' && event.visibleTo?.includes(viewer)))
    .map((event) => structuredClone(event));
}

function neutralChoiceIsPrivate(game: GameState): boolean {
  const kind = game.pendingNeutralChoice?.kind;
  return Boolean(
    kind?.startsWith('scouting_report_')
    || kind?.startsWith('reserves_')
    || kind?.startsWith('supplies_')
    || kind?.startsWith('tactical_planning_')
    || kind?.startsWith('conscription_')
    || kind?.startsWith('contraband_')
    || kind?.startsWith('invasion_')
    || kind === 'revolution_battle'
    || kind === 'armistice_asset'
    || kind === 'sequestration_action'
    || kind === 'rousing_speech_discard',
  );
}

export function toPublicGameView(game: GameState): PublicGameView {
  return {
    id: game.id,
    version: game.version,
    phase: game.phase,
    turn: game.turn,
    activePlayer: game.activePlayer,
    priorityPlayer: game.priorityPlayer,
    players: Object.fromEntries(Object.values(game.players).map((player) => [player.id, toPublicPlayerView(player)])),
    board: toPublicBoardView(game.board),
    battle: game.battle ? toPublicBattleView(game.battle, game) : undefined,
    neutralPathfindersSuppressions: structuredClone(game.neutralPathfindersSuppressions),
    neutralEntrenchmentActionLocks: structuredClone(game.neutralEntrenchmentActionLocks),
    neutralReinforcementsActionOpportunity: structuredClone(game.neutralReinforcementsActionOpportunity),
    neutralInsurrectionActionOpportunity: structuredClone(game.neutralInsurrectionActionOpportunity),
    neutralLiberationActionOpportunity: structuredClone(game.neutralLiberationActionOpportunity),
    neutralAssimilationConditions: structuredClone(game.neutralAssimilationConditions),
    pendingNeutralChoice: neutralChoiceIsPrivate(game) ? undefined : structuredClone(game.pendingNeutralChoice),
    pendingMilitaryChoice: game.pendingMilitaryChoice,
    pendingMilitaryTimingChoice: game.pendingMilitaryTimingChoice,
    pendingDiplomatChoice: game.pendingDiplomatChoice,
    pendingFinancierChoice: game.pendingFinancierChoice,
    pendingLeaderAbilityWindow: game.pendingLeaderAbilityWindow,
    pendingAssetBankDiscards: game.pendingAssetBankDiscards,
    log: publicLog(game),
    winner: game.winner,
  };
}

export function toPrivateGameView(game: GameState, viewer: PlayerID): PrivateGameView {
  const publicView = toPublicGameView(game);
  return {
    ...publicView,
    viewer,
    players: { ...publicView.players, [viewer]: toPrivatePlayerView(game.players[viewer]) },
    battle: game.battle ? toPrivateBattleView(game.battle, game, viewer) : undefined,
    pendingNeutralChoice: game.pendingNeutralChoice?.playerId === viewer
      ? structuredClone(game.pendingNeutralChoice)
      : publicView.pendingNeutralChoice,
    pendingIntelligenceChoice: game.pendingIntelligenceChoice?.playerId === viewer ? structuredClone(game.pendingIntelligenceChoice) : undefined,
    pendingMysticsChoice: game.pendingMysticsChoice?.playerId === viewer ? structuredClone(game.pendingMysticsChoice) : undefined,
    pendingInquisitionChoice: game.pendingInquisitionChoice?.playerId === viewer ? structuredClone(game.pendingInquisitionChoice) : undefined,
    legalActionPlays: legalActionPlaysForViewer(game, viewer),
    legalNeutralAssetUses: legalNeutralAssetUsesForViewer(game, viewer),
    legalLeaderAbilities: legalLeaderAbilitiesFor(game, viewer),
    log: privateLog(game, viewer),
  };
}
