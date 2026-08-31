import {
  appendV070Event,
  type V070GameState,
  type V070OverlayAttachment,
} from './engine';
import type { PlayerId } from './rules';

const BLOCKADE_ID = 'diplomats-sanctions-blockade';

export function openV070BlockadeChoicesForPositionChange(
  state: V070GameState,
  playerId: PlayerId,
  from: number,
  to: number,
): number {
  if (from === to) return 0;

  let opened = 0;
  opened += queueBlockadeAt(state, playerId, from, 'leave');
  opened += queueBlockadeAt(state, playerId, to, 'enter');
  return opened;
}

function queueBlockadeAt(
  state: V070GameState,
  playerId: PlayerId,
  position: number,
  movement: 'leave' | 'enter',
): number {
  const territory = state.board.find(candidate => candidate.position === position);
  if (!territory) return 0;

  const active = activeOverlayForTerritory(state, territory.territoryInstanceId);
  if (!active) return 0;
  if (state.cardInstances[active.instanceId]?.cardId !== BLOCKADE_ID) return 0;

  const sanction = state.sanctions.find(candidate =>
    candidate.instanceId === active.instanceId
    && candidate.kind === 'overlay'
    && candidate.opponent === playerId
  );
  if (!sanction) return 0;
  if (state.sanctionTriggerTurns[sanction.instanceId] === state.turnNumber) return 0;

  state.sanctionTriggerTurns[sanction.instanceId] = state.turnNumber;
  state.pendingSanctionChoices.push({
    kind: 'blockade_movement',
    playerId,
    sanctionInstanceId: sanction.instanceId,
    territoryInstanceId: territory.territoryInstanceId,
    movement,
  });

  appendV070Event(state, {
    type: 'sanction_choice_pending',
    actor: playerId,
    visibility: 'public',
    payload: {
      kind: 'blockade_movement',
      sanctionInstanceId: sanction.instanceId,
      owner: sanction.owner,
      opponent: sanction.opponent,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      movement,
      turnNumber: state.turnNumber,
    },
  });
  return 1;
}

function activeOverlayForTerritory(
  state: V070GameState,
  territoryInstanceId: string,
): V070OverlayAttachment | null {
  let active: V070OverlayAttachment | null = null;
  for (const overlay of state.overlays) {
    if (overlay.territoryInstanceId !== territoryInstanceId) continue;
    if (!active || overlay.sequence > active.sequence) active = overlay;
  }
  return active;
}
