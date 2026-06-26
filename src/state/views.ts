import { cardCanBePlayedAt, destinationForCardPlay, getCardPlayRule } from '../cards';
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
  PrivateGameView,
  PrivatePlayerView,
  PublicBattleParticipantView,
  PublicBattleView,
  PublicBoardView,
  PublicGameView,
  PublicPlayerView,
  PlayerID,
  PlayerState,
} from '../types';

const visible = <T>(cards: T[]) => ({
  kind: 'visible' as const,
  cards,
});

const hidden = <T>(cards: T[]) => ({
  kind: 'hidden' as const,
  count: cards.length,
});

export function toPublicPlayerView(player: PlayerState): PublicPlayerView {
  return {
    id: player.id,
    name: player.name,
    zones: {
      deck: hidden(player.zones.deck),
      hand: hidden(player.zones.hand),
      discard: visible(player.zones.discard),
      graveyard: visible(player.zones.graveyard),
      assetBank: visible(player.zones.assetBank),
      conditions: visible(player.zones.conditions),
      removed: visible(player.zones.removed),
    },
    controlledTerritoryCount: player.controlledTerritories.length,
    controlledTerritories: player.controlledTerritories,
    occupiedSpaceId: player.occupiedSpaceId,
    actionsRemaining: player.actionsRemaining,
    movementRemaining: player.movementRemaining,
  };
}

export function toPrivatePlayerView(player: PlayerState): PrivatePlayerView {
  const publicView = toPublicPlayerView(player);

  return {
    ...publicView,
    zones: {
      ...publicView.zones,
      deck: hidden(player.zones.deck),
      hand: visible(player.zones.hand),
    },
    private: {
      deck: player.zones.deck,
      hand: player.zones.hand,
    },
  };
}

export function toPublicBoardView(board: BoardState): PublicBoardView {
  return {
    layout: board.layout,
    spaces: board.spaces.map((space) => ({
      ...space,
      territoryId: space.revealed ? space.territoryId : undefined,
    })),
  };
}

function revealPlayedCardToViewer(
  played: BattlePlayedCard | undefined,
  viewer?: PlayerID,
): BattlePlayedCard | { faceDown: true } | undefined {
  if (!played) return undefined;
  if (!played.faceDown || played.owner === viewer) return played;
  if (viewer && played.visibleTo?.includes(viewer)) return played;
  if (!viewer && played.visibleTo && played.visibleTo.length > 0) return { ...played, faceDown: false };
  return { faceDown: true };
}

function playedCards(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => card !== undefined && !card.canceled);
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
  const embargoCards = playedCards(viewerParticipant).filter((card) => card.cardId === 'card-embargo');
  if (embargoCards.length === 0) return undefined;

  const opposingCards = playedCards(opponent);
  if (opposingCards.length === 0) return undefined;

  return embargoCards.flatMap((source) => opposingCards.map((target) => ({
    sourceCardId: source.cardId,
    sourceOwner: source.owner,
    sourceOrigin: source.origin,
    targetCardId: target.cardId,
    targetOwner: target.owner,
    targetOrigin: target.origin,
  })));
}

function hasPendingAssetBankDiscard(game: GameState): boolean {
  return Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0;
}

function legalActionPlaysForViewer(game: GameState, viewer?: PlayerID): LegalActionPlayOption[] | undefined {
  if (!viewer) return undefined;
  if (hasPendingAssetBankDiscard(game)) return undefined;
  if (game.activePlayer !== viewer) return undefined;
  if (game.phase !== 'action_before_movement' && game.phase !== 'action_after_movement') return undefined;

  const player = game.players[viewer];
  if (!player || player.actionsRemaining < 1 || player.hasPlayedActionThisTurn || player.hasPlayedBattleThisTurn) return undefined;

  const options = player.zones.hand
    .filter((cardId) => cardCanBePlayedAt(cardId, 'action', 'hand'))
    .map((cardId): LegalActionPlayOption => ({
      action: 'play_action_card',
      cardId,
      origin: 'hand',
      destination: destinationForCardPlay(cardId, 'hand'),
      requiresTarget: getCardPlayRule(cardId)?.requiresTarget ?? false,
    }));

  return options.length > 0 ? options : undefined;
}

function legalBattlePlaysForViewer(game: GameState, battle: BattleState, viewer?: PlayerID): BattlePlayOption[] | undefined {
  if (hasPendingAssetBankDiscard(game)) return undefined;
  const viewerParticipant = battleParticipantForViewer(battle, viewer);
  const player = viewer ? game.players[viewer] : undefined;
  if (!viewerParticipant || !player) return undefined;

  if (battle.stage === 'hand_commit') {
    if (viewerParticipant.passedHandCommit || viewerParticipant.handCommit) return undefined;
    return [
      ...player.zones.hand
        .filter((cardId) => cardCanBePlayedAt(cardId, 'battle_hand_commit', 'hand'))
        .map((cardId): BattlePlayOption => ({ action: 'commit_battle_hand_card', cardId, origin: 'hand' })),
      { action: 'pass_battle_hand_commit' },
    ];
  }

  if (battle.stage === 'battle_play_selection') {
    const playSlotsRemaining = Math.max(viewerParticipant.battleDrawPlayLimit - viewerParticipant.battleDrawPlayed.length, 0);
    const playableCards = playSlotsRemaining > 0
      ? viewerParticipant.battleDraw
        .filter((cardId) => cardCanBePlayedAt(cardId, 'battle_draw_play', 'battle_draw'))
        .map((cardId): BattlePlayOption => ({ action: 'play_battle_draw_card', cardId, origin: 'battle_draw' }))
      : [];

    if (viewerParticipant.passedBattleDrawPlay || playableCards.length === 0 && playSlotsRemaining === 0) return undefined;
    return [...playableCards, { action: 'pass_battle_draw_play' }];
  }

  return undefined;
}

function toPublicBattleParticipantView(
  participant: BattleState['attacker'],
  viewer?: PlayerID,
): PublicBattleParticipantView {
  return {
    playerId: participant.playerId,
    passedHandCommit: participant.passedHandCommit,
    passedBattleDrawPlay: participant.passedBattleDrawPlay,
    handCommit: revealPlayedCardToViewer(participant.handCommit, viewer),
    battleDrawCount: participant.battleDraw.length,
    battleDrawPlayed: participant.battleDrawPlayed.map((card) => revealPlayedCardToViewer(card, viewer)!),
    battleDrawLimit: participant.battleDrawCount,
    battleDrawPlayLimit: participant.battleDrawPlayLimit,
    diceRoll: participant.diceRoll,
    modifiers: participant.modifiers,
    retreated: participant.retreated,
  };
}

export function toPublicBattleView(game: GameState, battle: BattleState, viewer?: PlayerID): PublicBattleView {
  return {
    id: battle.id,
    stage: battle.stage,
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    attacker: toPublicBattleParticipantView(battle.attacker, viewer),
    defender: toPublicBattleParticipantView(battle.defender, viewer),
    tiePolicy: battle.tiePolicy,
    validBattleCardTargets: validBattleCardTargetsForViewer(battle, viewer),
    legalBattlePlays: legalBattlePlaysForViewer(game, battle, viewer),
    winner: battle.winner,
    loser: battle.loser,
  };
}

function visibleLogFor(events: GameEvent[], viewer?: PlayerID): GameEvent[] {
  return events.filter((event) => {
    if (event.visibility === 'public') return true;
    if (event.visibility === 'system') return viewer === undefined;
    return viewer !== undefined && event.visibleTo?.includes(viewer);
  });
}

export function toPublicGameView(game: GameState): PublicGameView {
  return {
    id: game.id,
    version: game.version,
    phase: game.phase,
    turn: game.turn,
    activePlayer: game.activePlayer,
    priorityPlayer: game.priorityPlayer,
    players: Object.fromEntries(
      Object.entries(game.players).map(([id, player]) => [id, toPublicPlayerView(player)]),
    ),
    board: toPublicBoardView(game.board),
    battle: game.battle ? toPublicBattleView(game, game.battle) : undefined,
    pendingAssetBankDiscards: game.pendingAssetBankDiscards,
    log: visibleLogFor(game.log),
    winner: game.winner,
  };
}

export function toPrivateGameView(game: GameState, viewer: PlayerID): PrivateGameView {
  return {
    ...toPublicGameView(game),
    viewer,
    players: Object.fromEntries(
      Object.entries(game.players).map(([id, player]) => [
        id,
        id === viewer ? toPrivatePlayerView(player) : toPublicPlayerView(player),
      ]),
    ),
    battle: game.battle ? toPublicBattleView(game, game.battle, viewer) : undefined,
    legalActionPlays: legalActionPlaysForViewer(game, viewer),
    log: visibleLogFor(game.log, viewer),
  };
}
