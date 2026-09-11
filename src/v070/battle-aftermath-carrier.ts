import {
  V070GameActionError,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

/**
 * The battle core already owns shared-timing Aftermath ordering by source
 * instance. Deferred card effects use an inert placement record only as a
 * carrier into that scheduler. placeV070OverlayFromBattle intercepts these
 * source cards before Overlay validation or placement can occur.
 */
export function registerV070DeferredBattleAftermathCarrier(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceCardId: string,
  condition: 'always' | 'owner_win' = 'always',
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime) {
    throw new V070GameActionError(
      'Deferred battle Aftermath registration requires an active battle.',
    );
  }
  if (runtime.battleCardAftermathOverlayPlacements.some(
    placement => placement.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory) {
    throw new V070GameActionError(
      'Deferred battle Aftermath registration requires the contested Territory.',
    );
  }

  runtime.battleCardAftermathOverlayPlacements.push({
    sourceInstanceId,
    sourceCardId,
    owner,
    territoryInstanceId: territory.territoryInstanceId,
    condition,
  });
}
