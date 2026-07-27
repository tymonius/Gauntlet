import type { GameState } from '../types';
import type { NeutralAppStateAction } from './apply-neutral';
import { applyGameAction as applyNeutralGameAction } from './apply-neutral';
import {
  applyDisruptionAction,
  DISRUPTION,
  prepareDisruptionAction,
} from './neutral-disruption';
import {
  captureDiscardSnapshot,
  openNextRedemptionChoice,
  registerRedemptionDiscardEntries,
} from './neutral-redemption';
import type { ApplyGameActionResult } from './reducer';

/**
 * Outermost integration for Disruption's random opposing-hand discard. Keeping
 * this wrapper above the existing Neutral layer lets Redemption observe the
 * resulting opposing discard without disturbing the established faction stack.
 */
export function applyGameAction(
  game: GameState,
  action: NeutralAppStateAction,
): ApplyGameActionResult {
  if (action.type !== 'play_action_card' || action.cardId !== DISRUPTION) {
    return applyNeutralGameAction(game, action);
  }

  const prepared = prepareDisruptionAction(game, action);
  const discardBefore = captureDiscardSnapshot(game);
  const result = applyNeutralGameAction(game, action);
  applyDisruptionAction(result.state, action.playerId, prepared);
  registerRedemptionDiscardEntries(result.state, discardBefore, action.playerId);
  openNextRedemptionChoice(result.state);
  return result;
}

export type DisruptionAppStateAction = NeutralAppStateAction;
