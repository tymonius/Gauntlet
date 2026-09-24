import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export const V070_FOG_OF_WAR_ID = 'intelligence-fog-of-war' as const;
export const CURRENT_FOG_OF_WAR_ACTION_TEXT = 'Any Territory.' as const;
export const V070_FOG_OF_WAR_OVERLAY_TEXT =
  "In the next battle here, this Territory's controller sets their Gambit and chooses their Tactics after the opponent. Discard this Overlay after that battle." as const;

function validateFogOfWarAuthority(): void {
  const frozen = v070CanonicalContent.cardsById.get(V070_FOG_OF_WAR_ID);
  const current = currentCanonicalContent.cardsById.get(V070_FOG_OF_WAR_ID);

  if (frozen?.effects.find(effect => effect.label === 'Placement')?.text
    !== CURRENT_FOG_OF_WAR_ACTION_TEXT) {
    throw new Error(
      'Fog of War Placement text drifted from frozen v0.7.0 authority.',
    );
  }
  if (current?.effects.find(effect => effect.label === 'Action')?.text
    !== CURRENT_FOG_OF_WAR_ACTION_TEXT) {
    throw new Error(
      'Fog of War Action text drifted from current gameplay authority.',
    );
  }
  if (frozen?.effects.find(effect => effect.label === 'Overlay')?.text
    !== V070_FOG_OF_WAR_OVERLAY_TEXT
    || current?.effects.find(effect => effect.label === 'Overlay')?.text
      !== V070_FOG_OF_WAR_OVERLAY_TEXT) {
    throw new Error(
      'Fog of War Overlay text drifted between frozen and current authority.',
    );
  }
}

validateFogOfWarAuthority();

export function applyV070FogOfWarOverlayAtBattleOnset(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || !runtime.activeOverlayAtOnset) return false;

  const overlay = state.overlays.find(
    candidate => candidate.instanceId === runtime.activeOverlayAtOnset,
  );
  if (!overlay
    || state.cardInstances[overlay.instanceId]?.cardId !== V070_FOG_OF_WAR_ID) {
    return false;
  }

  const territory = state.board.find(
    candidate =>
      candidate.position === battle.contestedPosition
      && candidate.territoryInstanceId === overlay.territoryInstanceId,
  );
  if (!territory) {
    throw new V070GameActionError(
      'Fog of War requires its attached Territory to remain in the Gauntlet.',
    );
  }

  const controller = territory.controller;
  if (controller !== battle.attacker && controller !== battle.defender) {
    throw new V070GameActionError(
      'Fog of War Territory controller must be a battle participant.',
    );
  }
  const opponent: PlayerId =
    controller === battle.attacker ? battle.defender : battle.attacker;

  runtime.gambitOrderOverride = {
    source: 'fog_of_war',
    firstPlayer: opponent,
    secondPlayer: controller,
    nextPlayer: opponent,
    firstCommitmentFaceUp: false,
  };
  runtime.tacticOrderOverride = {
    source: 'fog_of_war',
    firstPlayer: opponent,
    secondPlayer: controller,
    nextPlayer: opponent,
  };

  appendV070Event(state, {
    type: 'fog_of_war_battle_order_applied',
    actor: overlay.owner,
    visibility: 'public',
    payload: {
      overlayInstanceId: overlay.instanceId,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: territory.position,
      controller,
      firstPlayer: opponent,
      secondPlayer: controller,
    },
  });
  return true;
}
