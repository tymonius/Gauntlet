import {
  appendV070Event,
  type V070GameState,
  type V070OverlayAttachment,
} from './engine';

declare module './engine' {
  interface V070OverlayAttachment {
    /** A Ruins Overlay remains attached but has no printed Overlay effect. */
    ruined?: boolean;
  }
}

export function isV070RuinsOverlay(
  overlay: V070OverlayAttachment,
): boolean {
  return overlay.ruined === true;
}

export function turnV070OverlayIntoRuins(
  state: V070GameState,
  instanceId: string,
  reason: string,
): boolean {
  const overlay = state.overlays.find(item => item.instanceId === instanceId);
  if (!overlay || isV070RuinsOverlay(overlay)) return false;

  overlay.ruined = true;
  const territory = state.board.find(
    item => item.territoryInstanceId === overlay.territoryInstanceId,
  );

  appendV070Event(state, {
    type: 'overlay_became_ruins',
    actor: overlay.owner,
    visibility: 'public',
    payload: {
      instanceId,
      cardId: state.cardInstances[instanceId]?.cardId ?? null,
      territoryInstanceId: overlay.territoryInstanceId,
      territoryPosition: territory?.position ?? null,
      territoryId: territory?.territoryId ?? null,
      reason,
    },
  });
  return true;
}
