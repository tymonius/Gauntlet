import type { PlayerId } from './rules';
import type { V070GameEvent, V070GameState, V070PlayerState } from './engine';

export interface V070VisibleCard {
  instanceId: string;
  cardId: string;
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
}

export interface V070GameView {
  rulesVersion: V070GameState['rulesVersion'];
  gameId: string;
  stage: V070GameState['stage'];
  setupStage: V070GameState['setup'] extends null ? never : V070GameState['setup']['stage'] | null;
  players: Record<PlayerId, V070PlayerViewState>;
  board: V070GameState['board'];
  activePlayer: PlayerId | null;
  turnNumber: number;
  turnState: V070GameState['turnState'];
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
    winner: state.winner,
    events: state.events
      .filter(event => event.visibility === 'public' || event.visibility === viewer)
      .map(event => structuredClone(event)),
  };
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
