import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  beginEffectGrantedV070Movement,
  type PlayerId,
  type V070MovementStep,
} from './rules';

/**
 * Open an explicitly authorized, effect-granted movement for a player who
 * does not own the current turn. This is a framework entrypoint, not an
 * independently playable card or a substitute for Aftermath scheduling.
 *
 * The regular movement reducer still owns position, Terrain/Overlay costs,
 * battles and Last Stand. The turn owner is never switched.
 */
export function beginV070OffTurnEffectMovement(
  state: V070GameState,
  playerId: PlayerId,
  step: V070MovementStep,
): void {
  const turn = state.turnState;
  if (state.stage !== 'playing' || !turn || !state.activePlayer) {
    throw new V070GameActionError(
      'Off-turn effect movement requires an active game turn.',
    );
  }
  if (state.activePlayer === playerId) {
    throw new V070GameActionError(
      'Off-turn effect movement requires a player other than the turn owner.',
    );
  }
  if (state.battle || state.battleRuntime) {
    throw new V070GameActionError(
      'Finish the current battle and its Aftermath before granting off-turn movement.',
    );
  }
  if (turn.movementSequenceOpen || turn.effectMovementController) {
    throw new V070GameActionError(
      'Resolve the current movement sequence before granting off-turn movement.',
    );
  }
  if (state.pendingSanctionChoices.length > 0) {
    throw new V070GameActionError(
      'Resolve the pending Sanction before granting off-turn movement.',
    );
  }
  if (!step.source.trim()) {
    throw new V070GameActionError(
      'Off-turn effect movement must record its source.',
    );
  }

  state.turnState = {
    ...beginEffectGrantedV070Movement(turn, 1, step),
    effectMovementController: playerId,
  };
  appendV070Event(state, {
    type: 'off_turn_effect_movement_started',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      turnOwner: state.activePlayer,
      source: step.source,
      choiceRestriction: step.choiceRestriction,
      battleRestriction: step.battleRestriction,
    },
  });
}
