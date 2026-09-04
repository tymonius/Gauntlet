import type {
  BoardSpaceState,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
  TerritoryOverlayKind,
  TerritoryOverlayState,
} from '../types/v06';

const LEGACY_RUINS_OVERLAY_CARDS = new Set([
  'neutral-siege-weaponry',
]);

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

export function isRuinsOverlay(overlay?: TerritoryOverlayState): boolean {
  return Boolean(overlay && (
    overlay.kind === 'ruins'
    || (!overlay.kind && LEGACY_RUINS_OVERLAY_CARDS.has(overlay.cardId))
  ));
}

export function placeTerritoryOverlay(
  space: BoardSpaceState,
  cardId: string,
  owner: PlayerID,
  options: { faceUp?: boolean; kind?: TerritoryOverlayKind } = {},
): TerritoryOverlayState {
  if (space.kind !== 'territory') throw new Error('Territory Overlays can be placed only on Territories.');
  const overlay: TerritoryOverlayState = {
    cardId,
    owner,
    faceUp: options.faceUp ?? true,
  };
  if (options.kind) overlay.kind = options.kind;
  space.overlays ??= [];
  space.overlays.push(overlay);
  return overlay;
}

/**
 * Places one physical card as the Territory's sole Ruins Overlay. Existing
 * Ruins are removed even when dormant beneath another Overlay, because a
 * Territory cannot be doubly ruined.
 */
export function placeRuinsOverlay(
  game: GameState,
  space: BoardSpaceState,
  cardId: string,
  owner: PlayerID,
): { overlay: TerritoryOverlayState; replaced: TerritoryOverlayState[] } {
  if (space.kind !== 'territory') throw new Error('Ruins can be placed only on Territories.');
  const replaced: TerritoryOverlayState[] = [];
  const retained: TerritoryOverlayState[] = [];
  for (const overlay of space.overlays ?? []) {
    if (!isRuinsOverlay(overlay)) {
      retained.push(overlay);
      continue;
    }
    replaced.push(overlay);
    game.players[overlay.owner]?.zones.graveyard.push(overlay.cardId);
    publicLog(
      game,
      owner,
      'territory_ruins_replaced',
      `${overlay.cardId} entered its owner's Graveyard when new Ruins were placed on ${space.id}.`,
      {
        spaceId: space.id,
        removedCardId: overlay.cardId,
        removedOwner: overlay.owner,
        replacementCardId: cardId,
        replacementOwner: owner,
      },
    );
  }
  space.overlays = retained.length > 0 ? retained : undefined;
  return {
    overlay: placeTerritoryOverlay(space, cardId, owner, { kind: 'ruins' }),
    replaced,
  };
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
