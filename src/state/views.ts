import type {
  BattlePlayedCard,
  BattleState,
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
  return {
    ...toPublicPlayerView(player),
    zones: {
      ...toPublicPlayerView(player).zones,
      deck: hidden(player.zones.deck),
      hand: visible(player.zones.hand),
    },
    private: {
      deck: player.zones.deck,
      hand: player.zones.hand,
    },
  };
}

export function toPublicBoardView(board: PublicGameView['board']): PublicBoardView {
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
    attacker: toPublicBattleParticipantView(battle.attacker, viewer),
    defender: toPublicBattleParticipantView(battle.defender, viewer),
    winner: battle.winner,
    loser: battle.loser,
  };
}

function visibleLogFor(game: PublicGameView, viewer?: PlayerID) {
  return game.log.filter((event) => {
    if (event.visibility === 'public') return true;
    if (event.visibility === 'system') return viewer === undefined;
    return viewer !== undefined && event.visibleTo?.includes(viewer);
  });
}

export function toPublicGameView(game: PrivateGameView | PublicGameView): PublicGameView {
  return {
    id: game.id,
    version: game.version,
    phase: game.phase,
    turn: game.turn,
    activePlayer: game.activePlayer,
    priorityPlayer: game.priorityPlayer,
    players: Object.fromEntries(
      Object.entries(game.players).map(([id, player]) => [id, toPublicPlayerView(player as PlayerState)]),
    ),
    board: toPublicBoardView(game.board),
    battle: game.battle ? toPublicBattleView(game.battle as BattleState) : undefined,
    log: visibleLogFor(game),
    winner: game.winner,
  };
}

export function toPrivateGameView(game: PrivateGameView | PublicGameView, viewer: PlayerID): PrivateGameView {
  return {
    ...toPublicGameView(game),
    viewer,
    players: Object.fromEntries(
      Object.entries(game.players).map(([id, player]) => [
        id,
        id === viewer ? toPrivatePlayerView(player as PlayerState) : toPublicPlayerView(player as PlayerState),
      ]),
    ),
    battle: game.battle ? toPublicBattleView(game.battle as BattleState, viewer) : undefined,
    log: visibleLogFor(game, viewer),
  };
}
