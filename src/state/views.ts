import type {
  BattlePlayedCard,
  BattleState,
  BoardState,
  GameEvent,
  GameState,
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
  return { faceDown: true };
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
    diceRoll: participant.diceRoll,
    modifiers: participant.modifiers,
    retreated: participant.retreated,
  };
}

export function toPublicBattleView(battle: BattleState, viewer?: PlayerID): PublicBattleView {
  return {
    id: battle.id,
    stage: battle.stage,
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    attacker: toPublicBattleParticipantView(battle.attacker, viewer),
    defender: toPublicBattleParticipantView(battle.defender, viewer),
    tieWinner: battle.tieWinner,
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
    battle: game.battle ? toPublicBattleView(game.battle) : undefined,
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
    battle: game.battle ? toPublicBattleView(game.battle, viewer) : undefined,
    log: visibleLogFor(game.log, viewer),
  };
}
