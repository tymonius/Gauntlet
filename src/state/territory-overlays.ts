import type {
  BoardSpaceState,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
  TerritoryOverlayState,
} from '../types';

export const CAPTURE_REMOVED_OVERLAYS = new Set([
  'mystics-spirit-hollow',
  'mystics-circle-of-bones',
]);

export type TerritoryControllerSnapshot = Record<SpaceID, PlayerID | undefined>;

function publicLog(
  game: GameState,
  actor: PlayerID,
  type: string,
  message: string,
  payload?: unknown,
): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'public',
  } satisfies GameEvent);
}

export function topTerritoryOverlay(space?: BoardSpaceState): TerritoryOverlayState | undefined {
  return space?.overlays?.at(-1);
}

export function placeTerritoryOverlay(
  space: BoardSpaceState,
  cardId: string,
  owner: PlayerID,
): TerritoryOverlayState {
  if (space.kind !== 'territory') throw new Error('Territory Overlays can be placed only on Territories.');
  const overlay: TerritoryOverlayState = { cardId, owner, faceUp: true };
  space.overlays ??= [];
  space.overlays.push(overlay);
  return overlay;
}

export function captureTerritoryControllerSnapshot(game: GameState): TerritoryControllerSnapshot {
  return Object.fromEntries(
    game.board.spaces
      .filter((space) => space.kind === 'territory')
      .map((space) => [space.id, space.controller]),
  );
}

export function removeCaptureSensitiveOverlaysAfterControlChange(
  game: GameState,
  before: TerritoryControllerSnapshot,
): number {
  let removedCount = 0;
  for (const space of game.board.spaces) {
    if (space.kind !== 'territory' || before[space.id] === space.controller || !space.overlays?.length) continue;

    const retained: TerritoryOverlayState[] = [];
    for (const overlay of space.overlays) {
      if (!CAPTURE_REMOVED_OVERLAYS.has(overlay.cardId)) {
        retained.push(overlay);
        continue;
      }
      const owner = game.players[overlay.owner];
      if (owner) owner.zones.graveyard.push(overlay.cardId);
      removedCount += 1;
      publicLog(
        game,
        overlay.owner,
        'territory_overlay_removed_on_capture',
        `${overlay.cardId} entered its owner's Graveyard when its Territory was captured.`,
        {
          cardId: overlay.cardId,
          owner: overlay.owner,
          spaceId: space.id,
          previousController: before[space.id],
          controller: space.controller,
        },
      );
    }
    space.overlays = retained.length ? retained : undefined;
  }
  return removedCount;
}
